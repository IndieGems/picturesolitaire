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
//   - a claim outlives the page: until it is answered it is kept in the
//     player's own "claims" save slot (there is no browser storage: AGENTS.md),
//     sent at once when the page is hidden or closed or the Arcade is about to
//     close the game, and resumed at the next start (resumeClaims, which
//     loadProgress starts). The slot is the device's word and needs no more:
//     the checker replays every claim and applies each claim id once. A claim
//     made offline reaches the slot when the connection is back.
//   - held wins go oldest first, and a campaign win waits while an earlier one
//     is held: the checker answers "order" to a win ahead of the next position.
//     This session sends every win it holds; the slot keeps as many as fit,
//     and past that drops only wins that strand nothing (src/net/held-wins.ts).
//
// Unframed (a plain tab) there is no platform: the claim resolves "unframed"
// at once, after a local replay that warns in the console if the line would
// not verify.

import { GemApiError, type GemFunctionError } from "@indiegems/gem-web-sdk/sdk";
import { gem, onWillTerminate } from "../gem";
import { isWon, replay, type Action, type Deal } from "../game/rules";
import { onOnline, online, suspect } from "../ui/online";
import { dealHash } from "./deal-hash";
import { nextToSend, trimHeld } from "./held-wins";
import { helpers, type Gift, type HelperKind } from "./helpers";
import { noAnswer, refusalOf } from "./no-answer";
import { answered, hold, type HeldWin } from "./progress";
import { accept as acceptSuitcase, suitcase, type Suitcase } from "./suitcase";
import { tableOf } from "./tables";

/** "souvenir": the bonus board after a trip (docs/souvenirs.md), sent once its trip is stamped; no n, no date. */
export type Lane = "campaign" | "challenge" | "daily" | "souvenir";

export interface WinClaim {
  lane: Lane;
  /** The board's id: "c05", "ch03", "d2026-10-24", "s1". */
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
  /** Helpers that LANDED now, after the cap's clamp (src/net/helpers.ts): 0s when none were given. */
  helpers?: Record<HelperKind, number>;
  /** What they were given for: the kit (board 1's end, or the next win of a player past it), a hard board's first win, a trip's last board, the daily puzzle's first win of the day, a full Daily Suitcase (its helpers are in `helpers` too). */
  gifts?: Gift[];
  /** Daily only: the day's suitcase item this win packed, and the copies held after it. Only on the day's first win: a replay or a late finish packs nothing. */
  packed?: { item: string; count: number };
  /** Daily only, with `packed`: the month's suitcase after it (src/net/suitcase.ts). */
  suitcase?: Suitcase;
  /** Daily only: the date, the time the board shows, whether the result is on the day's board, whether it is this player's first of the day. */
  date?: string;
  ms?: number;
  recorded?: boolean;
  first?: boolean;
}

export type Verdict = (
  | ({ status: "paid" } & Answered)
  | ({ status: "kept" } & Answered)
  | ({ status: "late" } & Answered)
  | { status: "refused"; lane: Lane; board: string; reason: string }
  | { status: "unframed"; lane: Lane; board: string }
) & {
  /** True for a claim an earlier session left unanswered, sent again at this start (resumeClaims). */
  resumed?: true;
};

interface Held {
  /** The claim's own id: the checker applies a claim to the progress record once, however often it is sent. */
  id: string;
  lane: Lane;
  board: string;
  /** What it changes in progress() while it waits (kept with it, for a restart). */
  effect: HeldWin;
  /** Left unanswered by an earlier session (resumeClaims). */
  resumed?: true;
  body: Record<string, unknown>;
  resolve: (v: Verdict) => void;
  tries: number;
  /** performance.now() before which it is not sent again. */
  notBefore: number;
}

const framed = window.self !== window.top;
/** Every unanswered win, oldest first; none is dropped while the page lives. */
const queue: Held[] = [];
/** The save slot unanswered claims are kept in (game config, save_schemas). */
const SLOT = "claims";
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
  const effect: HeldWin = {
    lane: claim.lane,
    board: claim.board,
    ...(claim.n !== undefined ? { n: claim.n } : {}),
    moves: claim.line.filter((a) => !("shuffle" in a)).length,
    ms: Math.max(0, Math.round(claim.ms)),
    ...(claim.date ? { date: claim.date } : {}),
    pictures: claim.deal.pictures.map((p) => p.id),
  };
  hold(id, effect);
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
    queue.push({ id, lane: claim.lane, board: claim.board, effect, body, resolve, tries: 0, notBefore: 0 });
    // kept first, sent at once: neither waits for the other, since waiting for the
    // save (three round trips) would only widen the window in which a closing page loses the win
    void persist();
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

function settle(h: Held, answer: Verdict, record: unknown = null): void {
  queue.splice(queue.indexOf(h), 1);
  void persist();
  const v: Verdict = h.resumed ? { ...answer, resumed: true } : answer;
  // the server's word replaces the held win (a refusal just drops it)
  answered(h.id, record, v.status === "refused");
  // a gift the checker paid is outside the SDK's snapshot: read the stock again
  if (v.status !== "refused" && v.status !== "unframed") void helpers.refresh();
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

/**
 * Call the checker so the request outlives the page: "keepalive" lets the
 * browser finish a request already started when the page is closed or
 * reloaded (at most 64 KiB in flight; a claim is a few KB). The answer is lost
 * with the page then, but the checker has acted, and the copy kept in the
 * "claims" slot is sent again at the next start, where it changes nothing twice.
 * The same call gem.functions.invoke makes, which offers no keepalive.
 */
async function invoke(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  const res = await gem.client.postBytes("/v1/functions/invoke", bytes, undefined, { keepalive: bytes.length < 60_000 });
  return JSON.parse(new TextDecoder().decode(res.bytes)) as Record<string, unknown>;
}

async function send(h: Held): Promise<void> {
  const { lane, board } = h;
  let answer: Record<string, unknown>;
  try {
    answer = await invoke(h.body);
  } catch (err) {
    if (err instanceof GemApiError) {
      // the call reached the platform: decide from its code
      if (err.retryable || err.code === "function_not_published" || err.code === "function_failed") {
        if (err.code === "function_failed" && h.tries >= 3) return settle(h, { status: "refused", lane, board, reason: "function_failed" });
        if (!leaving) console.warn(`[claims] ${lane} ${board}: ${err.code}, trying again`);
        return later(h, err.code === "function_not_published");
      }
      console.error(`[claims] ${lane} ${board}: ${err.code}`, (err as GemFunctionError).functionMessage ?? "");
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
    // the Daily Suitcase follows the server's word too (a pack carries the month after it)
    let packed: { item: string; count: number } | undefined;
    let month: Suitcase | undefined;
    if (lane === "daily") {
      acceptSuitcase(answer);
      const p = answer.packed as { item?: unknown; count?: unknown } | undefined;
      if (p && typeof p.item === "string") {
        packed = { item: p.item, count: Math.max(1, Math.floor(Number(p.count) || 1)) };
        month = suitcase.current() ?? undefined;
      }
    }
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
      helpers: landedOf(answer.helpers),
      gifts: Array.isArray(answer.gifts) ? answer.gifts.filter((g): g is Gift => g === "kit" || g === "hard" || g === "stamp" || g === "daily" || g === "suitcase") : [],
      ...(packed ? { packed } : {}),
      ...(month ? { suitcase: month } : {}),
    }, answer.progress);
  }
  console.warn(`[claims] ${lane} ${board} refused: ${String(answer.reason)}`);
  return settle(h, { status: "refused", lane, board, reason: String(answer.reason ?? "unknown") });
}

/** The helpers a verdict says landed, as whole numbers (0 for any it leaves out). */
function landedOf(x: unknown): Record<HelperKind, number> {
  const h = (x && typeof x === "object" ? x : {}) as Partial<Record<HelperKind, unknown>>;
  const n = (v: unknown): number => Math.max(0, Math.floor(Number(v) || 0));
  return { hint: n(h.hint), undo: n(h.undo), shuffle: n(h.shuffle) };
}

/** Send what is due, one claim at a time (a player's calls are budgeted per minute). */
async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  clearTimeout(timer);
  try {
    if (!online()) return;
    // the bridge and the player first: anything sent before them is dropped
    try {
      await gem.awaitIdentity(10_000);
    } catch {
      for (const h of queue) later(h);
      return;
    }
    for (;;) {
      const now = performance.now();
      // oldest first; a campaign win behind an earlier held one would only be answered "order"
      const due = nextToSend(queue, now);
      if (!due || !online()) break;
      await send(due);
    }
  } finally {
    pumping = false;
    schedule();
  }
}

// ---------------------------------------------------------------- outliving the page

/** The stored claims have been read this session: until then nothing is written over them. */
let resumed = false;
let resuming = false;
let resumeTries = 0;
/** The slot may hold claims (so an empty list is worth writing). */
let storedAny = false;
let writing = false;
let rewrite = false;
/** The held count last warned about as more than the slot keeps. */
let trimmedWarned = 0;
/** The page is going: a request it cuts short is no fault worth a warning (keepalive sends carry on). */
let leaving = false;

/** Keep the unanswered claims in the player's "claims" slot (one writer; the latest list wins). */
async function persist(): Promise<void> {
  if (!framed || !resumed) return;
  if (writing) {
    rewrite = true;
    return;
  }
  writing = true;
  try {
    do {
      rewrite = false;
      const all = queue.map((h) => ({ id: h.id, body: h.body, effect: h.effect }));
      const claims = trimHeld(all);
      if (claims.length < all.length && trimmedWarned !== all.length) {
        trimmedWarned = all.length;
        console.warn(`[claims] ${all.length} wins waiting: the ${claims.length} that fit are kept for a restart (all are sent while the game is open)`);
      }
      if (!claims.length && !storedAny) break;
      try {
        await gem.me.saves.put(SLOT, { v: 1, claims }, { timeoutMs: 10_000 });
        storedAny = claims.length > 0;
      } catch (err) {
        if (leaving) break; // the page cut its own upload short; the claim itself went with keepalive
        console.warn(`[claims] could not keep the unanswered claims: ${refusalOf(err)}`);
        if (!noAnswer(err)) break; // a refusal will not change by asking again
        suspect();
        rewrite = true;
        if (!online()) break; // the connection's return writes them (onOnline)
        await new Promise((r) => setTimeout(r, 3000));
      }
    } while (rewrite);
  } finally {
    writing = false;
  }
}

/** Is this a claim as persist() keeps it? */
function storedClaim(x: unknown): x is { id: string; body: Record<string, unknown>; effect: HeldWin } {
  const c = x as { id?: unknown; body?: { lane?: unknown; board?: unknown }; effect?: { pictures?: unknown } } | null;
  return !!c && typeof c.id === "string" && !!c.body && typeof c.body.lane === "string" && typeof c.body.board === "string" && !!c.effect && Array.isArray(c.effect.pictures);
}

/**
 * Send again the claims a previous session left unanswered (kept in the
 * "claims" slot). Started by loadProgress(); safe to call more than once.
 * They show in progress() at once, and their verdicts reach onVerdict.
 */
export async function resumeClaims(): Promise<void> {
  if (!framed || resumed || resuming) return;
  resuming = true;
  try {
    await gem.awaitIdentity(10_000);
    let stored: { claims?: unknown[] } | null = null;
    try {
      stored = await gem.me.saves.get<{ claims?: unknown[] }>(SLOT, { timeoutMs: 10_000 });
    } catch (err) {
      if (noAnswer(err) || (err as { reason?: string }).reason !== "not_found") throw err;
    }
    const list = Array.isArray(stored?.claims) ? stored.claims.filter(storedClaim) : [];
    // older than anything won since this start: ahead of it in the queue, in the order kept
    const older: Held[] = [];
    for (const c of list) {
      if (queue.some((h) => h.id === c.id)) continue;
      hold(c.id, c.effect);
      older.push({ id: c.id, lane: c.body.lane as Lane, board: String(c.body.board), effect: c.effect, resumed: true, body: c.body, resolve: () => {}, tries: 0, notBefore: 0 });
    }
    queue.unshift(...older);
    if (list.length) console.info(`[claims] sending again ${list.length} win(s) from last time`);
    storedAny = list.length > 0;
    resumed = true;
    void persist(); // the merged list: claims made before the read are kept too
    void pump();
  } catch (err) {
    if (noAnswer(err)) suspect();
    console.warn(`[claims] the unanswered claims could not be read: ${refusalOf(err)}`);
    window.setTimeout(() => void resumeClaims(), Math.min(30_000, 2000 * 2 ** resumeTries++));
  } finally {
    resuming = false;
  }
}

/** The page is going (hidden, closed, or the Arcade is about to close it): send and keep everything now. */
function flushNow(): void {
  for (const h of queue) h.notBefore = 0;
  void pump();
  void persist();
}

if (framed) {
  // what was held goes out at once when the connection or the page comes back
  onOnline((up) => {
    if (!up) return;
    if (!resumed) void resumeClaims();
    for (const h of queue) h.notBefore = 0;
    void pump();
    void persist();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void pump();
    else {
      clearTimeout(timer);
      if (queue.length) flushNow();
    }
  });
  addEventListener("pagehide", () => {
    if (queue.length) flushNow();
    leaving = true;
  });
  addEventListener("pageshow", () => {
    leaving = false;
  });
  onWillTerminate(() => {
    if (queue.length) flushNow();
  });
}
