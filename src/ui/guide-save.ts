// What only the screens remember: how far the first board's guide got (which
// step the player has seen, and whether its finish card has shown), and which of
// the later lessons (lessons.ts: Undo on board 2, Shuffle before board 4) the
// player has done, and the one-time notes ("big" and "biggest": the first 5x5 and
// 6x6 boards' banners, app.ts; "hintTip": hint-nudge.ts), and the campaign boards'
// tries (tries.ts: the analytics' attempt, mercy help's stuck tries). Kept in the
// player's "campaign" save slot (declared in the game config), never in browser
// storage.
//
// The player's PROGRESS is not here: where they are in the campaign, the boards
// won, the challenge bests, the daily results and the pictures restored are the
// server's record, written only by the win checker (src/net/progress.ts). This
// slot once held them too; whatever an older build wrote is left exactly as it
// was, for the checker to take in once, and never written again.
//
// The game standard's rules for a save ("All player data lives in the CLOUD"):
// the first screen never waits on it, a failed read is tried again until it
// lands, no write leaves before the account's copy has been read and merged (the
// guide only moves forward), a write that fails is sent again on a timer, and the
// page hidden or closed gets one try. Unframed (a plain tab) it lives for the page.
//
// HOW OFTEN IT CALLS (the lead, 2026-10-29, after QA saw board 1's guide save 5
// times in 12 s, and a failed write asked again every 5 s, flat, forever: the
// pattern that throttled the office's shared network address that afternoon; the
// platform's budget is per address, a save is about three requests). Like the
// board in hand's slot (src/game/in-hand.ts) and every loop on src/net/pace.ts:
//   - changes are gathered: a write goes once nothing more has changed for
//     PACE.settleMs, or once the oldest change waiting is PACE.gatherMaxMs old, so
//     the guide's steps, a lesson and a board's tries go together;
//   - at most one write in PACE.gapMs, and whatever asks (the read included) at
//     most PACE.windowTries calls in any minute; one call at a time, ever (a change
//     made while one is out waits for it, then for its turn);
//   - a failure waits pace.ts's backoff (from PACE.readFirstMs or writeFirstMs,
//     doubling to its 5-minute cap), never shorter than a retry-after or 429 any
//     of the game's calls heard, which holds this slot too (the budget is the
//     address's); a refusal no retry changes stops the slot for the session;
//   - nothing while the page is hidden or the Arcade has the game paused, but one
//     try as it hides, pauses or closes (if something is unsaved, no call is out,
//     and the address is not held); the next waits for the page to be shown;
//   - the connection back: a failed call is tried again then, 30 s after the last
//     at the soonest.
//   - the guided first board (guide.ts holdForGuide): its steps and its tries wait for
//     its end (the finish card, or the player leaving the board), so the board writes
//     once, not mid-board and again after the win (Server, 2026-10-30, from QA's call
//     log: two writes, six requests); hiding, pausing or closing still gets its one
//     try, and the hold gives way after PACE.guideHoldMs whatever happens.
// Worst case, a refusing platform: about 4 calls in the first minute, then one in
// 5 minutes; a healthy one with the guide played fast: one write at its end.

import { GemApiError } from "@indiegems/gem-web-sdk/sdk";
import { gem, onArcadePause, onWillTerminate } from "../gem";
import { noAnswer, refusalOf } from "../net/no-answer";
import { backoff, heard, held, notNow, whenDue } from "../net/pace";
import { onOnline, suspect } from "./online";

const SLOT = "campaign";

/**
 * How often the slot may be called. Limits that keep a shared network address clear of the
 * platform's rate limit, not game tuning: they stay in code.
 */
const PACE = {
  /** A change waits until nothing more has changed for this long ... */
  settleMs: 4000,
  /** ... or until the oldest change waiting is this old, whichever is sooner. */
  gatherMaxMs: 30_000,
  /** At most one write in this long (the closing try aside). */
  gapMs: 20_000,
  /** Whatever asks (the read, a write, a closing try): at most `windowTries` calls in any `windowMs`. */
  windowMs: 60_000,
  windowTries: 4,
  /** A failure's first wait, doubled by pace.ts for each one more in a row, up to its cap. */
  readFirstMs: 2000,
  writeFirstMs: 5000,
  /** One call's budget; a closing try's. */
  timeoutMs: 10_000,
  closingMs: 3000,
  /** The connection back: a failed call goes again at once, if the last went at least this long ago. */
  onlineGapMs: 30_000,
  /** The guided board's hold gives way after this long (a player idle mid-guide is still saved). */
  guideHoldMs: 180_000,
};

/**
 * A campaign board's tries (tries.ts): `boards`, the tries started at each board since its last
 * win (the analytics' `attempt`); `mercy`, the newest board's tries that ended stuck (mercy help).
 */
export type Tries = { boards: Record<string, number>; mercy: { n: number; stuck: number } | null };

/** The slot as stored: the guide's step, the lessons done, the tries, and anything an older build left in it (kept as it is). */
type Stored = { v: 1; guide: number; lessons?: string[]; tries?: Tries; [older: string]: unknown };

let state: Stored = { v: 1, guide: 0 };
const listeners = new Set<() => void>();
const framed = window.self !== window.top;

let landed!: () => void;
/** Resolves once the account's copy has been read (or there is none to read). */
export const guideSaveRead: Promise<void> = new Promise((r) => (landed = r));

const count = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);

/** Steps of the first board's guide done (guide.ts). */
export const guideStep = (): number => state.guide;

const names = (x: unknown): string[] => (Array.isArray(x) ? x.filter((n): n is string => typeof n === "string") : []);

/** Has the player done this lesson (lessons.ts)? */
export const lessonSeen = (name: string): boolean => names(state.lessons).includes(name);

/** A lesson done: never shown again, on any device; saved with the next write. */
export function learnt(name: string): void {
  if (lessonSeen(name)) return;
  state = { ...state, lessons: [...names(state.lessons), name] };
  changed();
  mark();
}

/** A tries record as stored, or an empty one; anything malformed reads as nothing. */
function triesOf(x: unknown): Tries {
  const o = (x && typeof x === "object" ? x : {}) as { boards?: unknown; mercy?: unknown };
  const boards: Record<string, number> = {};
  if (o.boards && typeof o.boards === "object") for (const [k, v] of Object.entries(o.boards)) if (/^\d+$/.test(k) && count(v) > 0) boards[k] = count(v);
  const m = o.mercy as { n?: unknown; stuck?: unknown } | null | undefined;
  const mercy = m && count(m.n) > 0 && count(m.stuck) > 0 ? { n: count(m.n), stuck: count(m.stuck) } : null;
  return { boards, mercy };
}

/** The tries as they stand (a copy). */
export const savedTries = (): Tries => triesOf(state.tries);

/** Keep the tries (tries.ts); saved with the next write. Only the 30 newest boards are kept: the slot has a ceiling. */
export function keepTries(next: Tries): void {
  const keys = Object.keys(next.boards).sort((a, b) => Number(b) - Number(a)).slice(0, 30);
  state = { ...state, tries: { boards: Object.fromEntries(keys.map((k) => [k, next.boards[k]!])), mercy: next.mercy } };
  triesTouched = true;
  mark();
}
/** This session changed the tries before the account's copy landed: this device's are the newer. */
let triesTouched = false;

/** The guide's steps done: moves only forward; saved with the next write. */
export function guided(step: number): void {
  if (step <= state.guide) return;
  state = { ...state, guide: step };
  changed();
  mark();
}

/** The guided board is under way: no write before this (0: none held). */
let holdUntil = 0;
/**
 * The guided first board started (true) or ended (false: its finish card, the player leaving it): while
 * it is under way its steps and tries wait, and are written once at its end (or as the page hides).
 */
export function holdForGuide(on: boolean): void {
  holdUntil = on ? Date.now() + PACE.guideHoldMs : 0;
  if (!on) pump();
}

/** Hear when the guide's step changes (the account's copy landed). Returns the unsubscribe. */
export function onGuideSave(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
function changed(): void {
  for (const fn of [...listeners]) fn();
}

// ---------------------------------------------------------------- the slot's loop

/** loadGuideSave has run. */
let started = false;
/** The account's copy has been read (or there was none, or none could be). */
let read = false;
/** Refused for good (no such slot here, a malformed record): no call more this session. */
let off = false;
/** Something changed since the last write: since when, and the newest change. */
let dirty = false;
let firstChange = 0;
let lastChange = 0;
/** The record as last written or read (JSON): the same again is never sent. */
let written: string | undefined;
/** A call is out. */
let busy = false;
let paused = false;
/** This hide (or pause) has had its one closing try. */
let closed = false;
/** When the calls in the last window started; when the last call and the last write did. */
const recent: number[] = [];
let lastCall = 0;
let lastWrite = 0;
/** Failures in a row, and no call before this (the backoff, never shorter than the address's hold). */
let failures = 0;
let notBefore = 0;
/** The one pending wake-up (pace.ts's whenDue) and when it is due. */
let cancelWake: (() => void) | null = null;
let wakeAt = Infinity;

function mark(): void {
  const now = Date.now();
  if (!dirty) firstChange = now;
  lastChange = now;
  dirty = true;
  pump();
}

function want(): "read" | "write" | null {
  if (!started || !framed || off) return null;
  if (!read) return "read";
  return dirty ? "write" : null;
}

/** The window's oldest call still in it drops out; is there room for one more? */
function room(now: number): number {
  while (recent.length && recent[0]! <= now - PACE.windowMs) recent.shift();
  return recent.length < PACE.windowTries ? now : recent[0]! + PACE.windowMs;
}

/** The earliest the next call may start: the backoff, the address's hold, the window, and for a write its gathering and spacing. */
function earliest(kind: "read" | "write", now: number): number {
  const at = Math.max(notBefore, now + held(), room(now));
  if (kind === "read") return at;
  return Math.max(at, Math.min(lastChange + PACE.settleMs, firstChange + PACE.gatherMaxMs), lastWrite + PACE.gapMs, holdUntil);
}

/** Make the next call if one is wanted and may go now; else wait for when it may (one wake-up at a time). */
function pump(): void {
  const kind = want();
  if (!kind || busy || paused) return; // a call's end, and the pause's, call pump() again
  const now = Date.now();
  const at = earliest(kind, now);
  // whenDue waits while the page is hidden, and for the address's hold
  if (at > now || document.visibilityState === "hidden") return wake(at);
  cancelWake?.();
  cancelWake = null;
  wakeAt = Infinity;
  void (kind === "read" ? readSlot() : write(PACE.timeoutMs));
}

function wake(at: number): void {
  if (cancelWake && wakeAt <= at) return;
  cancelWake?.();
  wakeAt = at;
  cancelWake = whenDue(at - Date.now(), () => {
    cancelWake = null;
    wakeAt = Infinity;
    pump();
  });
}

function noteCall(): void {
  lastCall = Date.now();
  recent.push(lastCall);
}

function succeeded(): void {
  failures = 0;
  notBefore = 0;
}

/** A "not now": the next call waits the backoff, never shorter than the hold any of the game's calls heard. */
function failed(err: unknown, firstMs: number, what: string): void {
  heard(err); // a retry-after (or a bare 429) holds every loop of the game's, not only this one
  if (noAnswer(err)) suspect();
  failures++;
  notBefore = Date.now() + backoff(failures, firstMs);
  console.warn(`[guide-save] the campaign save could not be ${what} (${failures} in a row, next in ${Math.round((notBefore - Date.now()) / 1000)} s): ${refusalOf(err)}`);
}

async function readSlot(): Promise<void> {
  busy = true;
  try {
    await gem.awaitIdentity(PACE.timeoutMs);
    noteCall();
    let got: Record<string, unknown> | null = null;
    try {
      got = await gem.me.saves.get<Record<string, unknown>>(SLOT, { timeoutMs: PACE.timeoutMs });
    } catch (err) {
      // not_found on a read is a new player
      if (!(err instanceof GemApiError && err.reason === "not_found")) throw err;
    }
    // everything an older build left stays as it was; the guide only moves forward
    // lessons only add up too: this device's done this session, and the account's
    if (got && typeof got === "object") {
      const lessons = [...new Set([...names(got.lessons), ...names(state.lessons)])];
      // the tries: the account's, unless this session already moved them (then this device's, the newer)
      const tries = triesTouched ? state.tries : got.tries;
      state = { ...got, v: 1, guide: Math.max(state.guide, count(got.guide)), ...(lessons.length ? { lessons } : {}), ...(tries ? { tries: triesOf(tries) } : {}) };
    }
    // nothing changed here meanwhile: what was read is what the account holds
    if (!dirty) written = JSON.stringify(state);
    succeeded();
    finishRead();
  } catch (err) {
    if (notNow(err)) failed(err, PACE.readFirstMs, "read");
    else {
      // refused for good: never read, so never written over unseen; the screens stop waiting
      console.warn(`[guide-save] the campaign save was refused: ${refusalOf(err)}`);
      off = true;
      finishRead();
    }
  } finally {
    busy = false;
  }
  pump();
}

function finishRead(): void {
  read = true;
  landed();
  changed();
}

/** One write of the slot as it stands now (nothing, if that is what was last written). */
async function write(timeoutMs: number): Promise<void> {
  const text = JSON.stringify(state);
  const since = firstChange;
  dirty = false;
  if (text === written) return;
  busy = true;
  noteCall();
  lastWrite = lastCall;
  try {
    await gem.me.saves.put(SLOT, JSON.parse(text) as Stored, { timeoutMs });
    written = text;
    succeeded();
  } catch (err) {
    if (notNow(err)) {
      failed(err, PACE.writeFirstMs, "written");
      // still to be saved, as old as it was (a change made meanwhile is newer)
      firstChange = dirty ? Math.min(firstChange, since) : since;
      dirty = true;
    } else {
      console.warn(`[guide-save] the campaign save was refused: ${refusalOf(err)}`);
      off = true;
    }
  } finally {
    busy = false;
  }
  pump();
}

/**
 * The page hides, the Arcade pauses the game or is about to close it: one try now, if something
 * is unsaved, no call is out, and the address is neither held nor out of room. There may be no
 * later; if there is, the next waits for the page to be shown.
 */
function closing(timeoutMs: number): void {
  if (!started || !framed || off || !read || busy || !dirty || closed) return;
  const now = Date.now();
  if (held() > 0 || room(now) > now) return;
  closed = true;
  void write(timeoutMs);
}

/** Start reading. Call once, at boot. */
export function loadGuideSave(): void {
  if (started) return;
  started = true;
  if (!framed) {
    read = true;
    landed();
    return;
  }
  pump();
  onOnline((up) => {
    if (!up || !failures || busy || Date.now() - lastCall < PACE.onlineGapMs) return;
    notBefore = Math.min(notBefore, Date.now());
    pump();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") closing(PACE.closingMs);
    else {
      closed = false;
      pump();
    }
  });
  addEventListener("pagehide", () => closing(PACE.closingMs));
  onArcadePause((p) => {
    paused = p;
    if (p) closing(PACE.closingMs);
    else {
      closed = false;
      pump();
    }
  });
  onWillTerminate((graceMs) => closing(Math.max(1000, graceMs - 500)));
}

/** Wait for the account's copy, at most `ms`; true if it landed. */
export function waitForGuideSave(ms: number): Promise<boolean> {
  if (read) return Promise.resolve(true);
  return Promise.race([guideSaveRead.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), ms))]);
}
