// THE BOARD IN HAND, KEPT FOR THE NEXT SESSION (GSR-014; the creator chose "Yes, offer to
// resume"). The Arcade keeps a parked game for about five minutes; past that it ends the
// session, and a board in play was lost with it (wins were kept already: src/net/claims.ts).
// So the board in hand is kept in the player's "resume" save slot (config v42, one record;
// presentation state, never progress: no server code decides anything from it).
//
// What is kept: which play it is (a campaign board, the day's daily, a challenge, a
// Souvenir, a VIP event's level), the level's id and its deal's hash (src/net/deal-hash.ts), and the board's own
// record (BoardHandle.kept(): every action from the deal, shuffles with the mix they made,
// the time shown, the hint lines proved, the try's unused free helpers). A resumed board
// replays that line from the deal (openBoard's resume), so its win claims the complete
// line, which the checker replays from the deal and pays once like any win; the helpers
// used before the break were spent from the Arcade then, and nothing here counts them.
//
// The slot mirrors the board the screens keep (keepInHand). It empties itself when there is
// nothing to carry on: a win (from the moment the rules say so), a Restart, a board not
// played yet, another board opened in its place; and dropInHand() for the screens' own
// reasons (a daily whose day has gone, a kept board that no longer fits). Back to home keeps
// it, as the screens keep the board in hand (the lead, 2026-10-29: a session that ends on
// home loses nothing either). Never written before this session's read has landed, so a
// board kept last time is never written over unseen.
//
// HOW OFTEN IT CALLS (the lead, 2026-10-29: this slot's retries helped throttle the office's
// shared address for an hour. The platform allows 120 save calls a minute per network
// address, a whole office or household shares one, and a save is three requests):
//   - while a board is played, at most one save every three minutes (the lead, 2026-10-30, from
//     QA's call log: once a minute was most of the game's calls during play; the closing saves
//     below are the ones that matter, this is their safety net), and only when the board changed;
//     a change first waits PACE.settleMs, so a board won quickly is never saved mid-play;
//   - at once when it matters: the page hides, the Arcade pauses the game or is about to
//     close it (one try each, only if the board or its clock moved), Back to home, a win, a
//     board let go;
//   - whatever asks, one call at a time (a change made while one is out waits for it to
//     end, then for its turn: never a second put queued behind a pending one) and never
//     more than PACE.windowTries calls in any minute, the read included;
//   - any failure (a refusal that may pass, a 429, a timeout, no answer) waits: 30 s, doubling
//     to 10 minutes, or as long as the platform's retry-after says if that is longer (a wait
//     any of the game's calls heard holds this slot too: src/net/pace.ts, Server's). After
//     PACE.failStop failures in a row it stops; a later change to the board buys one more try
//     at the spacing reached, and so does the connection coming back (30 s after the last call);
//   - nothing is tried while the page is hidden or the game paused, but the one closing try.
// The SDK itself sends the first of a save's three requests up to three times (on a 429, a
// 5xx or no answer, waiting as long as the platform asks, up to a minute); the save's own
// timeout cuts that wait short, so one try is at most five requests, and only one is out.
// Since SDK 16.2 it also spaces one slot's writes 5 s apart; the closing saves and Back pass
// `teardown`, which skips that spacing, so they still go at once (the rest are minutes apart).
//
// WHEN TWO DEVICES DISAGREE (SDK 16.2: a save that would replace one this session has not seen
// is refused as save_conflict; the lead, 2026-11-01). The slot holds ONE board, the one the next
// session offers, so the one to keep is the board the player touched last: each record carries
// `at`, when it was last played on the device that wrote it. On a conflict the slot is read
// again and the newer board stays; ours is written at once, conditioned on what was just read.
// Theirs stays when it is newer, and this board writes again only once it is played again here
// (its clock running on an unwatched screen is not play). Why not one side always:
//   - ours always: a save held back on a device left open (the three-minute spacing, a retry)
//     lands late and replaces the board the player went on to play on their phone;
//   - theirs always: the closing save is the one that matters, and it is the one most often
//     refused (phone, then tablet, then back to the phone for a few moves): the moves the player
//     made last would be lost, with no later try.
// A closing save (or Back) made within PACE.settleMs of a move here replaces whatever is stored
// (`overwrite`): another device's timed save waits that long after its first move, so nothing it
// wrote can be newer, and a closing save gets no second try. A slot emptied elsewhere carries no
// time, so a board here counts as newer: at worst a board won on the other device is offered
// again, never a board lost. The player changing (signing in) is a conflict too: the slot is
// read again for the new player before anything is written to it. A refused or failed read is
// never "no board": nothing is written until a read lands (SDK load_failed included).
//
// The screens' part (UI's, src/ui/app.ts): read keptBoard() once at boot (cap the wait, as
// for any save) and offer the board when it fits() the level as loaded; open it with
// openBoard(host, level, { resume: kept, freeAllowed }) and call keepInHand(board, play,
// level) for every board that may be carried on (never practice, a lesson, the dev menu
// or a friend's one-off); dropInHand() where the board in hand is let go. Back is heard from
// the button's own press (ui:press "board.back"), so the screens need nothing for it.

import { GemApiError, GemSaveError } from "@indiegems/gem-web-sdk/sdk";
import { gem, onArcadePause, onWillTerminate } from "../gem";
import { on } from "../events";
import { dealHash } from "../net/deal-hash.ts";
import { refusalOf } from "../net/no-answer.ts";
import { heard, held } from "../net/pace.ts";
import { onOnline } from "../ui/online.ts";
import type { BoardHandle, BoardKept } from "../board/index.ts";
import type { Level } from "./levels.ts";

const SLOT = "resume";

/**
 * How often the slot may be called. Limits that keep a shared network address clear of the
 * platform's rate limit, not game tuning: they stay in code, where a config value can never
 * raise them.
 */
const PACE = {
  /** While a board is played: at most one save in this long (the safety net behind the closing saves). */
  playGapMs: 180_000,
  /** A change waits this long before its save (a board won sooner is never saved mid-play). */
  settleMs: 20_000,
  /** Whatever asks: at most `windowTries` calls (the read, a save, a delete) in any `windowMs`. */
  windowMs: 60_000,
  windowTries: 4,
  /** A failure waits this long before the next try, doubling each time, up to `failCapMs`. */
  failFirstMs: 30_000,
  failCapMs: 600_000,
  /** Failures in a row before it stops until the board changes again. */
  failStop: 5,
  /** One try's budget, the SDK's own retries inside it included. */
  timeoutMs: 10_000,
  /** A closing try's budget (the page hides, the Arcade pauses the game). */
  closingMs: 4000,
  /** A closing try with no move since the last save goes only if the clock moved this much. */
  clockMs: 10_000,
};

/** Which play a kept board is: what the screens need to open it again. */
export type KeptPlay =
  | { kind: "campaign"; level: number }
  | { kind: "daily"; date: string }
  | { kind: "challenge"; id: string }
  | { kind: "souvenir"; trip: string }
  /** A VIP event's level (docs/vip.md), by its id ("halloween-2026-13"; levels.ts loadEventLevel). */
  | { kind: "event"; id: string };

/** The record in the slot. */
export interface InHand extends BoardKept {
  v: 1;
  play: KeptPlay;
  /** The level's id ("c27", "d2026-11-03", "s1", "ch16", "halloween-2026-13"). */
  id: string;
  /** dealHash of the deal it was started on. */
  deal: string;
  /**
   * When the player last played it, on the device that wrote it (epoch ms, that device's clock):
   * after a save conflict, the newer of two boards is kept. Absent in records written before
   * SDK 16.2 (counted as oldest), and never compared when nothing else changed.
   */
  at?: number;
}

/** Is `kept` a board of `level` as the game has it now (the same id and deal)? A re-deal shipped since: no. */
export function fits(kept: InHand, level: Level): boolean {
  return kept.id === level.id && kept.deal === dealHash(level.deal);
}

/** A record as stored, checked field by field (an older build's, or an edited one). */
function asRecord(x: unknown): InHand | null {
  const r = x as Partial<InHand> | null;
  const p = r?.play as Partial<Record<string, unknown>> | undefined;
  const playOk =
    !!p &&
    ((p.kind === "campaign" && Number.isInteger(p.level) && (p.level as number) >= 1) ||
      (p.kind === "daily" && typeof p.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) ||
      (p.kind === "challenge" && typeof p.id === "string") ||
      (p.kind === "souvenir" && typeof p.trip === "string") ||
      (p.kind === "event" && typeof p.id === "string"));
  if (!r || r.v !== 1 || !playOk || typeof r.id !== "string" || typeof r.deal !== "string" || !Array.isArray(r.line) || !r.line.length) return null;
  return {
    v: 1,
    play: r.play!,
    id: r.id,
    deal: r.deal,
    line: r.line,
    ms: Number.isFinite(r.ms) ? Math.max(0, r.ms!) : 0,
    plans: Array.isArray(r.plans) ? r.plans : [],
    free: r.free && typeof r.free === "object" ? r.free : {},
    ...(Number.isFinite(r.at) ? { at: r.at } : {}),
  };
}

/** A record as text without its `at`, to tell whether the board itself changed (null: the slot is empty). */
function textOf(r: InHand | null): string {
  if (!r) return "null";
  const { at: _at, ...board } = r;
  return JSON.stringify(board);
}

/** The calls this file makes (the dev-only test seam swaps in a stand-in). */
type Store = {
  get(key: string, o: { timeoutMs: number }): Promise<unknown>;
  put(key: string, value: InHand, o: { timeoutMs: number; teardown: boolean; overwrite: boolean }): Promise<unknown>;
  delete(key: string, signal?: AbortSignal): Promise<void>;
};
let store: Store = {
  get: (key, o) => gem.me.saves.get(key, o),
  put: (key, value, o) => gem.me.saves.put(key, value, o),
  delete: (key, signal) => gem.me.saves.delete(key, signal),
};
let identity = (): Promise<unknown> => gem.awaitIdentity(10_000);
/** The signed-in player now (null before identity, and unframed). */
let who = (): string | null => gem.identity?.playerId ?? null;
let framed = window.self !== window.top;

// ---------------------------------------------------------------- state

/** The slot's record once read; undefined until then. */
let stored: InHand | null | undefined;
let reading: Promise<InHand | null> | null = null;
let settleRead: ((r: InHand | null) => void) | null = null;

/**
 * What the slot mirrors: the board the screens keep, or "dropped" (let go,
 * or refused for good); null until the screens say either this session, and
 * the slot is left as it was read (a board kept last time waits to be offered).
 */
let current: { board: BoardHandle; play: KeptPlay; id: string; deal: string } | "dropped" | null = null;
/** What the slot holds as far as this session knows: the record last written or read (textOf; "null": empty). */
let written: string | undefined;
/** The player the slot was last read for (who()). */
let readAs: string | null = null;

/** The board changed since the last save; since when. */
let dirty = false;
let dirtySince = 0;
/** When the player last did anything here (a record's `at`). */
let lastPlay = 0;
/** What waits is to go without the play spacing (a win, Back, a board let go). */
let urgent = false;
/** The next save is a final one (Back): it skips the SDK's spacing (`teardown`). */
let finalNext = false;
/** The slot must be read again before anything is written (a save conflict, load_failed, another player). */
let reread = false;
/** Conflicts in a row (from the second, each waits the backoff, so two writers never ping-pong). */
let conflicts = 0;
/** Another device's newer board was left in the slot: only play here writes ours again, never its clock alone. */
let yielded = false;
/** The board last saved (or left to another device's newer one), and its clock then: what the closing save measures from. */
let base: { board: BoardHandle | null; ms: number } = { board: null, ms: 0 };
/** A call is out. */
let busy = false;
/** When the calls in the last window started. */
const recent: number[] = [];
let lastCall = 0;
/** Failures in a row, and no try before this (the backoff, or the platform's retry-after). */
let failures = 0;
let notBefore = 0;
/** Stopped after PACE.failStop failures, until the board changes or the connection comes back. */
let stopped = false;
/** The slot is refused for good on this channel (not declared, malformed): nothing more this session. */
let off = false;
let paused = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let timerAt = Infinity;

// ---------------------------------------------------------------- what the screens call

/**
 * The board kept last time, once this session's read has landed (tried
 * again on the backoff below until it does); null when there is none, or
 * outside the Arcade. Cap the wait: a screen never waits on it.
 */
export function keptBoard(): Promise<InHand | null> {
  if (stored !== undefined) return Promise.resolve(stored);
  if (!reading) {
    reading = new Promise((r) => (settleRead = r));
    if (!framed || off) finishRead(null);
    else pump();
  }
  return reading;
}

/**
 * Keep `board` (opened for `play`, of `level`) from now on: the slot follows
 * it as it is played, until it is won, restarted, replaced or dropped.
 */
export function keepInHand(board: BoardHandle, play: KeptPlay, level: Level): void {
  current = { board, play, id: level.id, deal: dealHash(level.deal) };
  changed();
}

/** Let the board kept go: the slot empties (a daily whose day has gone, a kept board that no longer fits). */
export function dropInHand(): void {
  current = "dropped";
  changed(true);
}

// ---------------------------------------------------------------- when to call

/** The board changed (`now`: a win, Back, a board let go: no play spacing). A change after a stop buys one try. */
function changed(now = false): void {
  if (!dirty) dirtySince = Date.now();
  dirty = true;
  lastPlay = Date.now();
  yielded = false;
  if (now) urgent = true;
  stopped = false;
  pump();
}

/** The record for the board kept now; null when there is nothing to carry on. */
function recordNow(): InHand | null {
  if (!current || current === "dropped") return null;
  const k = current.board.kept();
  return k ? { v: 1, play: current.play, id: current.id, deal: current.deal, ...k } : null;
}

/** What the next call is for, if one is wanted. */
function want(): "read" | "write" | null {
  if (!framed || off) return null;
  if (stored === undefined) return reading ? "read" : null;
  if (reread) return "read";
  return current && dirty ? "write" : null;
}

/**
 * The earliest any call may start: after this slot's backoff and the address's hold (a
 * retry-after any of the game's calls heard, src/net/pace.ts: the budget is the address's,
 * so a 429 on a claim holds this too), with room in the window.
 */
function gate(now: number): number {
  while (recent.length && recent[0]! <= now - PACE.windowMs) recent.shift();
  return Math.max(notBefore, now + held(), recent.length < PACE.windowTries ? now : recent[0]! + PACE.windowMs);
}

/** The earliest the next call may start: the gate, and for a save at the play pace its spacing. */
function earliest(kind: "read" | "write", now: number): number {
  const at = gate(now);
  return kind === "write" && !urgent ? Math.max(at, lastCall + PACE.playGapMs, dirtySince + PACE.settleMs) : at;
}

/** Make the next call if one is wanted and may go now; else wait for the time it may (one timer). */
function pump(): void {
  const kind = want();
  if (!kind || busy || stopped) return;
  const now = Date.now();
  const at = earliest(kind, now);
  if (at > now) return arm(at);
  // never while hidden or paused: coming back calls pump()
  if (document.visibilityState === "hidden" || paused) return;
  void (kind === "read" ? read() : write(PACE.timeoutMs));
}

function arm(at: number): void {
  if (timer !== undefined && timerAt <= at) return;
  clearTimeout(timer);
  timerAt = at;
  timer = setTimeout(() => {
    timer = undefined;
    timerAt = Infinity;
    pump();
  }, at - Date.now());
}

/**
 * The page hides, the Arcade pauses the game or is about to close it: one try now, if the
 * board or its clock moved since the last save and a call may go at all (none out, no
 * backoff, room in the window). There may be no later; if there is, it waits as any save.
 * While the slot waits to be read again (a conflict), only a save that may replace it goes.
 */
function closing(timeoutMs: number): void {
  if (!framed || off || stored === undefined || !current || busy || stopped) return;
  if (reread && !justPlayed()) return;
  if (!dirty && !clockMoved()) return;
  if (gate(Date.now()) > Date.now()) return;
  void write(timeoutMs, true);
}

/** The board in hand's clock moved PACE.clockMs since it was last saved (never after another device's board was kept). */
function clockMoved(): boolean {
  if (!current || current === "dropped" || yielded) return false;
  const k = current.board.kept();
  if (!k) return false;
  return current.board !== base.board || k.ms - base.ms >= PACE.clockMs;
}

/**
 * The player played here within PACE.settleMs: no other device's save can be newer (its timed
 * save waits that long after its first move), so a final save may replace what is stored.
 */
const justPlayed = (): boolean => lastPlay > 0 && Date.now() - lastPlay < PACE.settleMs;

/** Remember the board in hand and its clock as saved now (or as left to a newer board elsewhere). */
function saved(rec: InHand | null): void {
  base = { board: current && current !== "dropped" ? current.board : null, ms: rec?.ms ?? 0 };
}

function noteCall(): void {
  lastCall = Date.now();
  recent.push(lastCall);
}

/**
 * A refusal no retry changes: the record is too large or malformed, or the slot is not
 * declared on this channel. Anything else (rate_limited, unavailable, a session that
 * ended mid-save, storage's own GemSaveError, no answer at all) is a failure, tried later.
 */
const forGood = (err: unknown): err is GemApiError =>
  err instanceof GemApiError && (err.reason === "too_large" || err.reason === "invalid" || err.reason === "not_found");

/** A failure: the next try waits the backoff (or the platform's retry-after), and after PACE.failStop of them, a change. */
function failed(err: unknown): void {
  heard(err); // a retry-after (or a bare 429) holds every loop of the game's, not only this one
  failures++;
  const backoff = Math.min(PACE.failCapMs, PACE.failFirstMs * 2 ** (failures - 1));
  const asked = err instanceof GemApiError && err.retryAfterSeconds ? err.retryAfterSeconds * 1000 : 0;
  notBefore = Date.now() + Math.max(backoff, asked);
  if (failures >= PACE.failStop) stopped = true;
}

// ---------------------------------------------------------------- the calls

/**
 * A refusal that means "read the slot again first" (SDK 16.2): the stored save changed since this
 * session read or wrote it (another device or tab), the player changed while the write waited, or
 * the slot's last load failed. Never worth resending as it stands.
 */
const mustReread = (err: unknown): boolean =>
  err instanceof GemSaveError && (err.reason === "save_conflict" || err.reason === "load_failed");

/**
 * Read the slot: once at boot, for the screens (keptBoard), and again after a conflict. Any
 * failure (a timeout, a 429, storage's leg, load_failed) is never "no board": it is tried again
 * on the backoff, and nothing is written until a read lands.
 */
async function read(): Promise<void> {
  busy = true;
  noteCall();
  let got: InHand | null | undefined;
  try {
    await identity();
    let raw: unknown = null;
    try {
      raw = await store.get(SLOT, { timeoutMs: PACE.timeoutMs });
    } catch (err) {
      if (!(err instanceof GemApiError) || err.reason !== "not_found") throw err;
    }
    got = asRecord(raw);
    readAs = who();
    failures = 0;
    notBefore = 0;
  } catch (err) {
    console.warn(`[in-hand] the kept board could not be read: ${refusalOf(err)}`);
    failed(err);
  } finally {
    busy = false;
  }
  if (got === undefined) pump();
  else if (stored === undefined) finishRead(got);
  else resolve(got);
}

function finishRead(r: InHand | null): void {
  stored = r;
  written = textOf(r);
  settleRead?.(r);
  settleRead = null;
  // what the screens kept or dropped meanwhile goes now, at its own pace
  pump();
}

/**
 * After a conflict, the slot read again holds `theirs`: the board the player touched last stays
 * (WHEN TWO DEVICES DISAGREE, above). The screens hear nothing: the board on screen plays on.
 */
function resolve(theirs: InHand | null): void {
  reread = false;
  written = textOf(theirs);
  const mine = recordNow();
  if (textOf(mine) === written) {
    dirty = urgent = false;
    conflicts = 0;
    saved(mine);
  } else if ((theirs?.at ?? 0) > lastPlay) {
    // theirs is newer: it stays, and this board is saved again only once it is played here again
    dirty = urgent = false;
    yielded = true;
    conflicts = 0;
    saved(mine);
  } else {
    // ours is newer (or the slot was emptied elsewhere, which carries no time): written at once,
    // conditioned on what was just read
    if (!dirty) dirtySince = Date.now();
    dirty = urgent = true;
  }
  pump();
}

/**
 * One save (or, with nothing to carry on, one delete) of the board kept now. `final`: a closing
 * save, which skips the SDK's spacing (as does Back's, finalNext), and, right after play here,
 * replaces whatever is stored.
 */
async function write(timeoutMs: number, final = false): Promise<void> {
  const last = final || finalNext;
  finalNext = false;
  // the player changed since the slot was read (a sign-in): theirs is read before anything is written to it
  const player = who();
  if (player !== null && player !== readAs) {
    reread = true;
    return pump();
  }
  const rec = recordNow();
  const text = textOf(rec);
  const wasUrgent = urgent;
  dirty = false;
  urgent = false;
  if (text === written) {
    saved(rec);
    return pump();
  }
  const overwrite = last && justPlayed();
  busy = true;
  noteCall();
  // a delete takes no budget of its own: its signal is cut at the same one (a controller, not
  // AbortSignal.timeout, which older iPhones lack). A delete is never conditional (the SDK's).
  const cut = new AbortController();
  const cutTimer = setTimeout(() => cut.abort(new DOMException(`the delete did not finish within ${timeoutMs}ms`, "TimeoutError")), timeoutMs);
  try {
    if (rec) await store.put(SLOT, { ...rec, at: lastPlay }, { timeoutMs, teardown: last, overwrite });
    else await store.delete(SLOT, cut.signal);
    written = text;
    saved(rec);
    reread = false;
    conflicts = 0;
    failures = 0;
    notBefore = 0;
  } catch (err) {
    console.warn(`[in-hand] the board in hand could not be kept: ${err instanceof GemSaveError ? err.reason : refusalOf(err)}`);
    if (mustReread(err)) {
      // read the slot again, then the newer board stays; a second conflict in a row waits the backoff
      reread = true;
      if (++conflicts > 1) failed(err);
      if (!dirty) dirtySince = Date.now();
      dirty = true;
      urgent ||= wasUrgent;
    } else if (forGood(err)) {
      if (err.reason !== "too_large") off = true; // no such slot here, or a call it takes for malformed: never again this session
      else if (rec) {
        // too large to keep: keep nothing more of this board, which stays winnable fresh, and
        // empty the slot of any older record of it (its own call, after this one)
        current = "dropped";
        if (!dirty) dirtySince = Date.now();
        dirty = urgent = true;
      } else written = text;
    } else {
      failed(err);
      if (!dirty) dirtySince = Date.now();
      dirty = true;
      urgent ||= wasUrgent;
    }
  } finally {
    clearTimeout(cutTimer);
    busy = false;
  }
  pump();
}

// ---------------------------------------------------------------- listening

function onPause(p: boolean): void {
  paused = p;
  if (p) closing(PACE.closingMs);
  else pump();
}

function listen(): void {
  // a move or a Hint (board:changed), a board dealt, a Restart: at the play pace
  for (const type of ["board:changed", "board:start", "board:restart"] as const) on(type, () => changed());
  // a win is final the moment the rules say so (its claim goes out on this): nothing to carry on
  on("board:solved", () => changed(true));
  // Back to home (heard on the way down, before the screen changes): the board in hand, kept now
  on("ui:press", ({ id }) => {
    if (id !== "board.back") return;
    finalNext = true; // a session may end on home: this one skips the SDK's spacing (teardown)
    changed(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") closing(PACE.closingMs);
    else pump();
  });
  addEventListener("pagehide", () => closing(PACE.closingMs));
  onArcadePause(onPause);
  onWillTerminate((graceMs) => closing(Math.max(1000, graceMs - 500)));
  // the connection is back: one try now (30 s after the last call at the soonest), at its pace
  onOnline((up) => {
    if (!up || !failures || busy || Date.now() - lastCall < PACE.failFirstMs) return;
    notBefore = Math.min(notBefore, Date.now());
    stopped = false;
    pump();
  });
}

if (framed) listen();

/**
 * Dev builds only (tools/playtest.mts runs unframed, with no player): stand in for the
 * platform with `store` (and the player with `who`), every PACE time scaled by `scale`, to
 * check the pacing and the conflicts above.
 */
export const __inHandTest = import.meta.env.DEV
  ? {
      install(o: { store: Store; scale: number; who?: () => string | null }): void {
        store = o.store;
        identity = async () => {};
        if (o.who) who = o.who;
        const pace = PACE as Record<string, number>;
        for (const k of Object.keys(pace)) if (k.endsWith("Ms")) pace[k] = pace[k]! * o.scale;
        if (!framed) {
          framed = true;
          listen();
        }
      },
      pause: onPause,
      GemApiError,
      GemSaveError,
      state: () => ({ busy, failures, notBefore, stopped, dirty, urgent, off, written, reread, conflicts, yielded, lastPlay, recent: [...recent] }),
    }
  : undefined;
