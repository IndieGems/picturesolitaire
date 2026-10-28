// FRIEND CHALLENGES (the creator, 2026-10-28; docs/friend-challenges.md), after WordSnakes'
// src/friends.ts. Everything here is the platform's own: the friend graph never leaves it.
//
// - A friend challenge: after a trip board or a daily, "I finished board 62 of Picture Passport in
//   35 moves. Can you beat it?" goes to a friend's Arcade inbox. The template in the game config
//   (friend_challenge_templates: beat_board {board, moves, helpers}, beat_daily {date, moves,
//   helpers}, Server's) writes the words; the Arcade confirms with the player and sends. Its Play
//   opens the game on THAT board for the friend, as a one-off (app.ts): no claim, no progress.
// - A link for anyone, on Gem Arcade or not: the Arcade's own share where it offers one, else the
//   game's own link to the phone's share sheet, or copied. Its query is the template's params
//   (board or date, moves, helpers), so a link and a challenge open the same way. It names the
//   board and the moves, never a player.
// - The launch: launchedChallenge() at start (the platform's lookup of `gemChallenge`), else the
//   link's own query. Every param is read back defensively: the template constrained it when it
//   was sent, but the config may have changed since, and a link's query is anybody's.
// - markAnswered: once the one-off is won, the player's own record of it (it tells the sender
//   nothing); a relaunch reuses the launch, so the same challenge comes back, answered.
// - friend_action (analytics, Server's declaration): { action, kind }, both dimensions, so both
//   strings, every time.
//
// Rules that are not optional (the SDK's friends.md): challenge() only from a player's press, one
// ask per press, never retried, not even on `unavailable` or `rate_limited`; share.request()
// synchronously from the press. No name in any param, ever: the sender is the platform's `from`.

import { FriendChallengeError, platformIconUrl, text, type PlayerText } from "@indiegems/gem-web-sdk/sdk";
import { gem } from "../gem";
import { gem as declared } from "../../package.json";

/** The templates' keys in the game config. */
const BOARD_TEMPLATE = "beat_board";
const DAILY_TEMPLATE = "beat_daily";

/** What a challenge or a link is about: a campaign board by the number players read, or the daily of a date. */
export type Target = { board: number } | { date: string };
/** A board, and the count to beat on it: the moves, and the helpers used (said, never compared). */
export type Dare = Target & { moves: number; helpers: number };

export const targetKind = (t: Target): "board" | "daily" => ("board" in t ? "board" : "daily");

export interface FriendRow {
  playerId: string;
  name: string | null;
  tag: string | null;
  avatar: string | null;
}

const plain = (t: PlayerText | undefined | null) => (t ? text.toPlain(t) : null);

/** Can a challenge be sent from here: the Arcade offers it (false anywhere else, a local host included). */
export const challengesOffered = (): boolean => !!gem.frame?.parentSupports("friendChallenges");

/** The player's friends, every page (the Arcade's own order: newest friendship first; at most 1000). */
export async function listFriends(): Promise<FriendRow[]> {
  const out: FriendRow[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const res = await gem.friends.list({ limit: 200, ...(cursor ? { cursor } : {}) });
    for (const f of res.friends)
      out.push({ playerId: f.playerId, name: plain(f.displayName), tag: f.discriminator ?? null, avatar: platformIconUrl(f.avatarIconUrl) ?? null });
    if (!res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return out;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

/** The template's params for a dare: in range, integers, and never a name. */
function params(d: Dare): Record<string, string | number> {
  const count = { moves: clamp(d.moves, 1, 999), helpers: clamp(d.helpers, 0, 999) };
  return "board" in d ? { board: clamp(d.board, 1, 999), ...count } : { date: d.date, ...count };
}

/** What the Arcade answered: sent; not sent (closed, refused, unavailable); too many for now; or a mistake of ours. */
export type Sent = "sent" | "not_sent" | "later" | "failed";

/** Send a friend the dare. ONLY from the player's press, once per press, never retried. */
export async function challengeFriend(playerId: string, d: Dare): Promise<Sent> {
  try {
    const { outcome } = await gem.friends.challenge({ playerId, template: "board" in d ? BOARD_TEMPLATE : DAILY_TEMPLATE, params: params(d) });
    return outcome === "accepted" ? "sent" : "not_sent";
  } catch (err) {
    if (err instanceof FriendChallengeError && err.reason === "rate_limited") return "later";
    console.warn("[friends] challenge refused:", err);
    return "failed";
  }
}

/** How a link was handed on: the Arcade's share (it says nothing back), the phone's sheet, the clipboard, or not. */
export type Shared = "arcade" | "shared" | "copied" | "cancelled" | "failed";

/** The dare as a link's query: the template's params, as strings. */
const query = (d: Dare): Record<string, string> => Object.fromEntries(Object.entries(params(d)).map(([k, v]) => [k, String(v)]));

/**
 * The game's Arcade page, opening straight into it (the SDK's getting-started: `/games/<id>?play=1`), at
 * the dare. It opens only once the game is released: before, the Arcade has no public page for it.
 */
export function gameLink(d: Dare): string | null {
  const id = gem.identity?.gameId ?? declared.gameId;
  if (!id) return null;
  const url = new URL(`https://gemarcade.com/games/${encodeURIComponent(id)}`);
  url.search = new URLSearchParams({ play: "1", ...query(d) }).toString();
  return url.href;
}

/**
 * Hand anyone a link to the dare, `line` before it: the Arcade's share where it offers one (its link
 * unfurls with the game's card, and its words are its own), else the game's own link to the phone's
 * share sheet, or the clipboard where there is none (a PC). Call it straight from the press, before
 * any await: the Arcade and the share sheet both want the press.
 */
export async function shareDare(d: Dare, line: string): Promise<Shared> {
  if (gem.share.available) {
    try {
      gem.share.request({ params: query(d) });
      return "arcade";
    } catch (err) {
      console.warn("[friends] the Arcade's share refused:", err);
    }
  }
  const link = gameLink(d);
  if (!link) return "failed";
  const words = `${line}\n${link}`;
  // in a frame the sheet may be refused by the frame's policy; asking anyway would spend the press the copy needs
  const policy = document as Document & { permissionsPolicy?: { allowsFeature(f: string): boolean }; featurePolicy?: { allowsFeature(f: string): boolean } };
  const sheet = typeof navigator.share === "function" && ((policy.permissionsPolicy ?? policy.featurePolicy)?.allowsFeature("web-share") ?? true);
  if (sheet) {
    try {
      await navigator.share({ text: words });
      return "shared";
    } catch (err) {
      // closing the sheet is the player's choice, not a failure: no copy on top of it
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }
  return (await copyText(words)) ? "copied" : "failed";
}

/** Put text on the clipboard; false when the browser will not (a frame often refuses the clipboard API). */
async function copyText(words: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(words);
    return true;
  } catch {
    /* refused: the old way */
  }
  try {
    const area = document.createElement("textarea");
    area.value = words;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;left:0;top:0;opacity:0;font-size:16px"; // 16px: iOS zooms onto a smaller box
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, words.length);
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** What this launch was opened with: a friend's challenge (who sent it, the platform's word), or a shared link. */
export type Launch =
  | { kind: "challenge"; id: string; dare: Dare; from: string | null; fromId: string | null; answered: boolean }
  | { kind: "shared"; dare: Dare };

const int = (v: unknown, lo: number, hi: number): number | null => {
  const n = typeof v === "string" && /^\d{1,4}$/.test(v) ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};
/** A real calendar date "YYYY-MM-DD", no earlier than the template's first. */
const date = (v: unknown): string | null => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || v < "2026-08-01") return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : null;
};

/**
 * The dare in a challenge's params (its template says which kind) or a link's query (it names a
 * board or a date, never both), or null when any part of it is not one.
 */
function readDare(get: (k: string) => unknown, template?: string): Dare | null {
  const moves = int(get("moves"), 1, 999);
  if (moves === null) return null;
  // helpers are only said, never compared: a missing or odd one is read as none
  const helpers = int(get("helpers"), 0, 999) ?? 0;
  const board = template === DAILY_TEMPLATE ? null : int(get("board"), 1, 999);
  const day = template === BOARD_TEMPLATE ? null : date(get("date"));
  if (template === undefined && get("board") != null && get("date") != null) return null;
  if (board !== null) return { board, moves, helpers };
  if (day !== null) return { date: day, moves, helpers };
  return null;
}

/** The challenge or link this launch carried, once (the platform's lookup; a link's query where it found none). */
let launch: Promise<Launch | null> | null = null;
export function launchLink(): Promise<Launch | null> {
  launch ??= (async (): Promise<Launch | null> => {
    try {
      const c = await gem.friends.launchedChallenge();
      if (c && (c.template === BOARD_TEMPLATE || c.template === DAILY_TEMPLATE)) {
        const p = c.params as Record<string, unknown>;
        const dare = readDare((k) => p[k], c.template);
        if (dare)
          return { kind: "challenge", id: c.id, dare, from: plain(c.from?.displayName), fromId: c.from?.playerId ?? null, answered: c.answeredAt !== undefined };
      }
    } catch (err) {
      console.info("[friends] launched challenge unread:", err);
    }
    const q = new URLSearchParams(location.search);
    const dare = readDare((k) => q.get(k));
    return dare ? { kind: "shared", dare } : null;
  })();
  return launch;
}

/** The challenge was played (its one-off won): the player's own record of it, idempotent; it tells the sender nothing. */
export function markAnswered(id: string): void {
  void gem.friends.markAnswered(id).catch((err: unknown) => console.info("[friends] not marked answered:", err));
}

/** friend_action's actions (Server's declaration in the game config). */
export type FriendAction =
  | "shared"
  | "challenge_sent"
  | "challenge_not_sent"
  | "opened_challenge"
  | "opened_share"
  | "challenge_won"
  | "challenge_lost"
  | "challenge_tied";

/** The last friend_action events, for the dev server's checks (never in a build). */
export const recentFriendActions: { action: FriendAction; kind: string }[] = [];

/** One friend_action: both dimensions, both strings (the SDK files a string as a dimension). */
export function friendAction(action: FriendAction, t: Target): void {
  const kind = targetKind(t);
  gem.analytics.track("friend_action", { action, kind });
  if (import.meta.env.DEV) {
    recentFriendActions.push({ action, kind });
    if (recentFriendActions.length > 20) recentFriendActions.shift();
  }
}
