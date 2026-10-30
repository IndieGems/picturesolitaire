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
//   - it is sent again until the checker answers, paced by src/net/pace.ts: a
//     "not now" from the platform (busy, rate limited, no answer) holds the whole
//     queue on one wait that grows (never under its retry-after, at most 5
//     minutes), nothing is asked again while the page is hidden, and the
//     connection's return sends what waited on it; a claim the function cannot
//     take yet (a board it does not know) waits alone and holds up no other;
//   - resending is safe: a board pays once, ever, and a daily result once a
//     day, whatever the device sends (the platform's state, not ours, decides);
//   - the verdict is the server's: "paid" (coins: what landed now), "kept" (a
//     real win that pays nothing new), "late" (a daily whose day had closed),
//     "refused" (not a win the rules allow: nothing paid). The device keeps no
//     "paid" flag; what a board has paid is the platform's progression
//     ("board_<id>", read with gem.me.progressions.get).
//   - a claim outlives the page: it is sent at once with keepalive (so a request
//     already started finishes after the page closes), and while it WAITS it is
//     kept in the player's own "claims" save slot (there is no browser storage:
//     AGENTS.md): offline, held by the platform, sent again after a "not now",
//     or still unanswered KEEP_AFTER_MS after it was made, and at once when the
//     page is hidden or closed or the Arcade is about to close the game. It is
//     resumed at the next start (resumeClaims, which loadProgress starts). A win
//     answered in time never touches the slot (2026-10-30, the lead: the slot's
//     two writes, three requests each, were most of a win's calls). The slot is
//     the device's word and needs no more: the checker replays every claim and
//     applies each claim id once. A claim made offline reaches the slot when the
//     connection is back.
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
import { backoff, heard, held, notNow, whenDue } from "./pace";
import { answered, hold, type HeldWin } from "./progress";
import { accept as acceptSuitcase, suitcase, type EventPack } from "./suitcase";
import { tableOf } from "./tables";
import { heardVip, vipFields, vipReady } from "./vip";

/**
 * "souvenir": the bonus board after a trip (docs/souvenirs.md), sent once its trip is stamped; no n, no date.
 * "event": one of an event's 30 levels (docs/vip.md; board "halloween-2026-04"), a VIP's, from its
 * release on: anyone else's is refused "vip_only", an unreleased one "not_released"; no n, no date.
 */
export type Lane = "campaign" | "challenge" | "daily" | "souvenir" | "event";

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
  /** Event levels only: the item hidden in this level, packed by its first win (1 held after it). A replay, or a level with no item, packs nothing. */
  packed?: { item: string; count: number };
  /** Event levels only, with `packed`: the event after it (src/net/suitcase.ts). */
  suitcase?: EventPack;
  /** Event levels only: the event's id. */
  event?: string;
  /** Platform achievements this win unlocked (release only), earlier wins' catch-ups included: by id (src/net/achievements.json), with the points credited. src/net/achievements.ts's onUnlock hears them. */
  achievements?: { id: string; points: number }[];
  /**
   * Daily only, a VIP's past day (docs/vip.md): "paid", its Coins paid now (`coins` is what landed);
   * "won_before", won already, nothing more ("event_only" is never sent now: the dailies carry no
   * event items). A past day for a player who is not VIP is refused "vip_only", and a VIP's day older
   * than the archive "too_old".
   */
  archive?: "paid" | "won_before" | "event_only";
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
/** A claim still unanswered this long after it was made is kept in the slot (most are answered in under a second). */
const KEEP_AFTER_MS = 5000;
const listeners = new Set<(v: Verdict) => void>();
let pumping = false;
let timer: number | undefined;
/** "Not now" answers in a row, across the queue (src/net/pace.ts grows the wait from it). */
let failing = 0;
/** performance.now() before which no claim is sent: the platform's "not now" holds them all. */
let pauseUntil = 0;

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
    // sent at once (keepalive: it outlives a closing page). Kept in the slot only if it has to wait:
    // now, when it cannot go at once (offline, or the platform asked for a wait), else once it is
    // still unanswered after KEEP_AFTER_MS; a page hidden or closed first keeps it at once (flushNow)
    if (!online() || held() > 0 || performance.now() < pauseUntil) void persist();
    else
      window.setTimeout(() => {
        if (queue.some((h) => h.id === id)) void persist();
      }, KEEP_AFTER_MS);
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
  // what the checker paid is outside the SDK's snapshot: the verdict's receipt says what landed
  // (helpers, Coins), so it is added to what was read, with no read of our own (helpers.credit)
  if (v.status === "paid" || v.status === "kept" || v.status === "late") helpers.credit(v.helpers ?? {}, v.coins);
  h.resolve(v);
  for (const fn of [...listeners]) fn(v);
}

/**
 * Wait, then try again. "platform": the platform said not now (busy, rate limited, or no answer
 * at all), which holds the WHOLE queue on one wait that grows with each in a row; "own": this
 * claim alone (the checker's "order", a function that failed on it); "slow": a function that does
 * not know the board yet. Every wait is src/net/pace.ts's: grown, capped at 5 minutes, and never
 * under the platform's retry-after (`err`, when it named one).
 */
function later(h: Held, how: "platform" | "own" | "slow", err?: unknown): void {
  h.tries++;
  // it waits now: keep it for a restart (an unchanged list is not written again)
  void persist();
  if (err !== undefined) heard(err);
  const now = performance.now();
  if (how === "platform") {
    pauseUntil = now + backoff(++failing, 2000);
    h.notBefore = pauseUntil;
  } else {
    h.notBefore = now + backoff(h.tries, how === "slow" ? 30_000 : 2000);
  }
}

/** The next send, while the page is shown (a hidden page asks nothing again: showing it pumps). */
function schedule(): void {
  clearTimeout(timer);
  if (!queue.length || document.visibilityState === "hidden") return;
  const next = Math.max(pauseUntil, Math.min(...queue.map((h) => h.notBefore)));
  timer = window.setTimeout(() => void pump(), Math.max(50, next - performance.now(), held()));
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
    answer = await invoke({ ...h.body, ...vipFields() }); // the dev pretend as it is now, never stored with the claim
  } catch (err) {
    if (err instanceof GemApiError) {
      // the call reached the platform: decide from its code
      if (err.retryable || err.code === "function_not_published" || err.code === "function_failed") {
        if (err.code === "function_failed" && h.tries >= 3) return settle(h, { status: "refused", lane, board, reason: "function_failed" });
        if (!leaving) console.warn(`[claims] ${lane} ${board}: ${err.code}, trying again`);
        return later(h, err.code === "function_not_published" ? "slow" : err.code === "function_failed" ? "own" : "platform", err);
      }
      console.error(`[claims] ${lane} ${board}: ${err.code}`, (err as GemFunctionError).functionMessage ?? "");
      return settle(h, { status: "refused", lane, board, reason: err.code ?? "function_error" });
    }
    // no answer at all: the connection may have gone
    suspect();
    return later(h, "platform", err);
  }
  heardVip(answer);
  const status = answer.status;
  // "order": an earlier campaign win is still on its way; it goes first, this one follows soon.
  // "platform": the checker's own calls were refused for now, which holds the queue as ours would.
  if (status === "retry") {
    if (answer.reason === "unknown_deal" || answer.reason === "config") return later(h, "slow");
    return later(h, answer.reason === "platform" ? "platform" : "own");
  }
  failing = 0;
  if (status === "paid" || status === "kept" || status === "late") {
    const items = Array.isArray(answer.items) ? answer.items.filter((i): i is string => typeof i === "string").map(tableOf) : [];
    const unlocked = (Array.isArray(answer.achievements) ? answer.achievements : [])
      .filter((a): a is { id: string; points?: unknown } => !!a && typeof a === "object" && typeof (a as { id?: unknown }).id === "string")
      .map((a) => ({ id: a.id, points: Math.max(0, Math.floor(Number(a.points) || 0)) }));
    // the server granted what this device's cached inventory cannot know: read it afresh next time
    if (status === "paid" || items.length) gem.me.inventory.refresh();
    // the events follow the server's word too (an event level's pack carries its event after it)
    let packed: { item: string; count: number } | undefined;
    let pack: EventPack | undefined;
    if (lane === "event") {
      acceptSuitcase(answer);
      const p = answer.packed as { item?: unknown; count?: unknown } | undefined;
      if (p && typeof p.item === "string") {
        packed = { item: p.item, count: Math.max(1, Math.floor(Number(p.count) || 1)) };
        pack = typeof answer.event === "string" ? suitcase.event(answer.event) : undefined;
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
      ...(pack ? { suitcase: pack } : {}),
      ...(lane === "event" && typeof answer.event === "string" ? { event: answer.event } : {}),
      ...(unlocked.length ? { achievements: unlocked } : {}),
      ...(answer.archive === "paid" || answer.archive === "won_before" || answer.archive === "event_only" ? { archive: answer.archive } : {}),
    }, answer.progress);
  }
  console.warn(`[claims] ${lane} ${board} refused: ${String(answer.reason)}`);
  // an event level refused (no longer VIP, not released): read the events again
  if (lane === "event") acceptSuitcase(answer);
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
      pauseUntil = performance.now() + backoff(++failing, 2000);
      return;
    }
    // the dev menu's pretend, kept from last time, goes with every claim (vipFields): an event
    // level sent again at the start must not go before it is restored
    await vipReady();
    for (;;) {
      const now = performance.now();
      // the platform said not now: nothing goes until its wait is over
      if (now < pauseUntil || held() > 0) break;
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
/** The list the slot holds (JSON, as persist() writes it): an unchanged list is not written again. */
let kept: string | null = null;
/** Failed writes in a row, and the one write waiting to try again (src/net/pace.ts). */
let persistFails = 0;
let persistRetry: (() => void) | null = null;
let resumeRetry: (() => void) | null = null;
/** The page is going: a request it cuts short is no fault worth a warning (keepalive sends carry on). */
let leaving = false;

/** Try writing the slot again in `ms` (one waiting write at a time; it writes the latest list). */
function persistLater(ms: number): void {
  persistRetry?.();
  persistRetry = whenDue(ms, () => {
    persistRetry = null;
    void persist();
  });
}

/**
 * Keep the unanswered claims in the player's "claims" slot (one writer; the latest list wins).
 * A list the slot holds already is not written again. A "not now" is tried again on a wait that
 * grows (src/net/pace.ts), never inline and never while the page is hidden; `closing` (the page
 * hidden, closed or about to be) tries once even while the platform asked for a wait, since there
 * may be no later for a win only this page holds.
 */
async function persist(closing = false): Promise<void> {
  if (!framed || !resumed) return;
  if (writing) {
    rewrite = true;
    return;
  }
  if (!closing && held() > 0) return persistLater(held());
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
      const text = JSON.stringify(claims);
      if (text === kept) break; // the slot holds this list already
      try {
        await gem.me.saves.put(SLOT, { v: 1, claims }, { timeoutMs: 10_000 });
        storedAny = claims.length > 0;
        kept = text;
        persistFails = 0;
      } catch (err) {
        if (leaving) break; // the page cut its own upload short; the claim itself went with keepalive
        console.warn(`[claims] could not keep the unanswered claims: ${refusalOf(err)}`);
        if (!notNow(err)) break; // a refusal will not change by asking again
        heard(err);
        if (noAnswer(err)) suspect();
        // the connection's return writes them (onOnline); otherwise once more, after a growing wait
        if (online()) persistLater(backoff(++persistFails, 5000));
        break;
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
  if (held() > 0) {
    resumeRetry?.();
    resumeRetry = whenDue(held(), () => {
      resumeRetry = null;
      void resumeClaims();
    });
    return;
  }
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
    kept = stored ? JSON.stringify(list.map((c) => ({ id: c.id, body: c.body, effect: c.effect }))) : null;
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
    heard(err);
    console.warn(`[claims] the unanswered claims could not be read: ${refusalOf(err)}`);
    resumeRetry?.();
    resumeRetry = whenDue(backoff(++resumeTries, 2000), () => {
      resumeRetry = null;
      void resumeClaims();
    });
  } finally {
    resuming = false;
  }
}

/**
 * The page is going (hidden, closed, or the Arcade is about to close it): one pass. A win never
 * sent yet goes now (keepalive outlives the page), unless the platform asked for a wait; one that
 * was tried already waits its turn, kept in the slot for the next start. The slot is written
 * once, if its list changed.
 */
function flushNow(): void {
  if (performance.now() >= pauseUntil && held() === 0) for (const h of queue) if (h.tries === 0) h.notBefore = 0;
  void pump();
  void persist(true);
}

if (framed) {
  // what was held goes out at once when the connection or the page comes back
  onOnline((up) => {
    if (!up) return;
    if (!resumed) void resumeClaims();
    // what waited on the connection goes now, though never inside a wait the platform named
    failing = 0;
    pauseUntil = performance.now() + held();
    for (const h of queue) h.notBefore = Math.min(h.notBefore, pauseUntil);
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
