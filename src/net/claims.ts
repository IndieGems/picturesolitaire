// WIN CLAIMS: the game tells the win checker (functions/checker, the game's
// serverless function) that a board was won, and follows its word. The checker
// replays the line on the rules against its own copy of the deal and, for a
// real win, pays that board's Coins (once per board, ever) or records the
// daily. Nothing here pays, unlocks or counts anything itself.
//
//   const verdict = claimWin({ lane, board, deal, line, ms, date });  // never block the win card on it
//   ... verdict.then((v) => cueCoins(v, coinElement));                 // Coins fly only on "paid"
//
// The game standard's rules for it ("When the server pays, the device follows
// its word"; "Every game is played online"):
//   - nothing played is dropped for want of a connection: a claim made offline,
//     or before the Arcade's bridge is up, is held and sent once it is;
//   - it is sent again until the checker answers, with a backoff, and at once
//     when the connection comes back or the page is shown again; one claim
//     waiting on a retry never holds up the others;
//   - resending is safe: a board pays once, ever, and a daily result once a
//     day, whatever the device sends (the platform's state, not ours, decides);
//   - the verdict is the server's: "paid" (coins: what landed now), "kept" (a
//     real win that pays nothing new), "late" (a daily whose day had closed),
//     "refused" (not a win the rules allow: nothing paid). The device keeps no
//     "paid" flag; what a board has paid is the platform's progression
//     ("board_<id>", read with gem.me.progressions.get).
// Held claims live for this session only: there is no browser storage
// (AGENTS.md), and a claim cannot be saved to the cloud while offline anyway.
//
// Unframed (a plain tab) there is no platform: the claim resolves "unframed"
// at once, after a local replay that warns in the console if the line would
// not verify.

import { GemFunctionError } from "@indiegems/gem-web-sdk/sdk";
import { gem } from "../gem";
import { isWon, replay, type Action, type Deal } from "../game/rules";
import { onOnline, online, suspect } from "../ui/online";
import { dealHash } from "./deal-hash";
import { answered, hold } from "./progress";
import { tableOf } from "./tables";

export type Lane = "campaign" | "challenge" | "daily";

export interface WinClaim {
  lane: Lane;
  /** The board's id: "c05", "ch03", "d2026-10-24". */
  board: string;
  /** The deal the board was played from (the level's), to tell the checker which version it was. */
  deal: Deal;
  /** The line as board:won gives it: the actions as played, undone ones removed. */
  line: Action[];
  /** board:won's time, in ms. */
  ms: number;
  /** The daily's date, the platform's periodLocalDate (src/net/daily.ts, today()). Daily only. */
  date?: string;
  /** Campaign only: the position played, the number passed to level(n) (from 1; past the last board it goes round). */
  n?: number;
}

interface Answered {
  lane: Lane;
  board: string;
  /** Moves in the line, counted by the server. */
  moves: number;
  /** Coins this win paid now (0 on "kept" and "late"). */
  coins: number;
  /** Items this win granted now, by slug: the onboarding keepsake table, on campaign board 1 (src/net/tables.ts). */
  items?: string[];
  /** Daily only: the date, the time the board shows, whether the result is on the day's board, whether it is this player's first of the day. */
  date?: string;
  ms?: number;
  recorded?: boolean;
  first?: boolean;
}

export type Verdict =
  | ({ status: "paid" } & Answered)
  | ({ status: "kept" } & Answered)
  | ({ status: "late" } & Answered)
  | { status: "refused"; lane: Lane; board: string; reason: string }
  | { status: "unframed"; lane: Lane; board: string };

interface Held {
  /** The claim's own id: the checker applies a claim to the progress record once, however often it is sent. */
  id: string;
  claim: WinClaim;
  body: Record<string, unknown>;
  resolve: (v: Verdict) => void;
  tries: number;
  /** performance.now() before which it is not sent again. */
  notBefore: number;
}

const framed = window.self !== window.top;
const queue: Held[] = [];
const listeners = new Set<(v: Verdict) => void>();
let pumping = false;
let timer: number | undefined;

/** Hear every verdict as it lands (for a HUD, analytics). Returns the unsubscribe. */
export function onVerdict(fn: (v: Verdict) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** How many claims are waiting for an answer. */
export const pendingClaims = (): number => queue.length;

/** Send a won board to the checker. Resolves once the server has answered (it may be a while offline). */
export function claimWin(claim: WinClaim): Promise<Verdict> {
  const id = crypto.randomUUID();
  // shown at once: src/net/progress.ts applies the win until the checker answers
  hold(id, {
    lane: claim.lane,
    board: claim.board,
    ...(claim.n !== undefined ? { n: claim.n } : {}),
    moves: claim.line.filter((a) => !("shuffle" in a)).length,
    ms: Math.max(0, Math.round(claim.ms)),
    ...(claim.date ? { date: claim.date } : {}),
    pictures: claim.deal.pictures.map((p) => p.id),
  });
  if (!framed) {
    let wins = false;
    try {
      wins = isWon(replay(claim.deal, claim.line));
    } catch {
      /* an action that does nothing */
    }
    if (!wins) console.warn(`[claims] ${claim.lane} ${claim.board}: this line would not verify`, claim.line);
    const v: Verdict = { status: "unframed", lane: claim.lane, board: claim.board };
    answered(id, null, !wins);
    for (const fn of [...listeners]) fn(v);
    return Promise.resolve(v);
  }
  const body: Record<string, unknown> = {
    v: 1,
    id,
    lane: claim.lane,
    board: claim.board,
    deal: dealHash(claim.deal),
    line: claim.line,
    ms: Math.max(0, Math.round(claim.ms)),
  };
  if (claim.date) body.date = claim.date;
  if (claim.n !== undefined) body.n = claim.n;
  return new Promise((resolve) => {
    queue.push({ id, claim, body, resolve, tries: 0, notBefore: 0 });
    void pump();
  });
}

/**
 * Fly a paid verdict's Coins from `from` (the coin on the win card) into the
 * Arcade's wallet. Does nothing for any other verdict, or when the Arcade will
 * not show it (then nothing is drawn in its place). True when it was cued.
 */
export function cueCoins(v: Verdict, from?: Element | null): boolean {
  if (v.status !== "paid" || v.coins <= 0) return false;
  const box = from?.getBoundingClientRect();
  return gem.cueReward({
    currencySlug: "ARCADE_TICKETS",
    expected: v.coins,
    ...(box ? { origin: { x: box.left + box.width / 2, y: box.top + box.height / 2 } } : {}),
  });
}

function settle(h: Held, v: Verdict, record: unknown = null): void {
  queue.splice(queue.indexOf(h), 1);
  // the server's word replaces the held win (a refusal just drops it)
  answered(h.id, record, v.status === "refused");
  h.resolve(v);
  for (const fn of [...listeners]) fn(v);
}

/** Wait, then try again: soon for a busy platform, slowly for a function that does not know the board yet. */
function later(h: Held, slow = false): void {
  h.tries++;
  const base = slow ? 30_000 : 2000;
  h.notBefore = performance.now() + Math.min(slow ? 300_000 : 60_000, base * 2 ** Math.min(h.tries - 1, 6));
}

function schedule(): void {
  clearTimeout(timer);
  if (!queue.length || document.visibilityState === "hidden") return;
  const next = Math.min(...queue.map((h) => h.notBefore));
  timer = window.setTimeout(() => void pump(), Math.max(50, next - performance.now()));
}

async function send(h: Held): Promise<void> {
  const { lane, board } = h.claim;
  let answer: Record<string, unknown>;
  try {
    answer = (await gem.functions.invoke(h.body)).json() as Record<string, unknown>;
  } catch (err) {
    if (err instanceof GemFunctionError) {
      // the call reached the platform: decide from its code
      if (err.retryable || err.code === "function_not_published" || err.code === "function_failed") {
        if (err.code === "function_failed" && h.tries >= 3) return settle(h, { status: "refused", lane, board, reason: "function_failed" });
        console.warn(`[claims] ${lane} ${board}: ${err.code}, trying again`);
        return later(h, err.code === "function_not_published");
      }
      console.error(`[claims] ${lane} ${board}: ${err.code}`, err.functionMessage ?? "");
      return settle(h, { status: "refused", lane, board, reason: err.code ?? "function_error" });
    }
    // no answer at all: the connection may have gone
    suspect();
    return later(h);
  }
  const status = answer.status;
  // "order": an earlier campaign win is still on its way; it goes first, this one follows soon
  if (status === "retry") return later(h, answer.reason === "unknown_deal" || answer.reason === "config");
  if (status === "paid" || status === "kept" || status === "late") {
    const items = Array.isArray(answer.items) ? answer.items.filter((i): i is string => typeof i === "string").map(tableOf) : [];
    // the server granted what this device's cached inventory cannot know: read it afresh next time
    if (status === "paid" || items.length) gem.me.inventory.refresh();
    return settle(h, {
      status,
      lane,
      board,
      moves: Number(answer.moves) || 0,
      coins: Number(answer.coins) || 0,
      ...(items.length ? { items } : {}),
      ...(typeof answer.date === "string" ? { date: answer.date } : {}),
      ...(typeof answer.ms === "number" ? { ms: answer.ms } : {}),
      ...(typeof answer.recorded === "boolean" ? { recorded: answer.recorded } : {}),
      ...(typeof answer.first === "boolean" ? { first: answer.first } : {}),
    }, answer.progress);
  }
  console.warn(`[claims] ${lane} ${board} refused: ${String(answer.reason)}`);
  return settle(h, { status: "refused", lane, board, reason: String(answer.reason ?? "unknown") });
}

/** Send what is due, one claim at a time (a player's calls are budgeted per minute). */
async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  clearTimeout(timer);
  try {
    if (!online() || document.visibilityState === "hidden") return;
    // the bridge and the player first: anything sent before them is dropped
    try {
      await gem.awaitIdentity(10_000);
    } catch {
      for (const h of queue) later(h);
      return;
    }
    for (;;) {
      const now = performance.now();
      const due = queue.find((h) => h.notBefore <= now);
      if (!due || !online()) break;
      await send(due);
    }
  } finally {
    pumping = false;
    schedule();
  }
}

if (framed) {
  // what was held goes out at once when the connection or the page comes back
  onOnline((up) => {
    if (!up) return;
    for (const h of queue) h.notBefore = 0;
    void pump();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void pump();
    else clearTimeout(timer);
  });
}
