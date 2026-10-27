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
// the first screen never waits on it, a failed read is tried again with a
// backoff (and at once when the connection or the page comes back), no write
// leaves before the account's copy has been read and merged (the guide only
// moves forward), and a write that fails is sent again on a timer and flushed
// when the page is hidden or closed. Unframed (a plain tab) it lives for the page.

import { gem, onWillTerminate } from "../gem";
import { onOnline, suspect } from "./online";

const SLOT = "campaign";

/**
 * A campaign board's tries (tries.ts): `boards`, the tries started at each board since its last
 * win (the analytics' `attempt`); `mercy`, the newest board's tries that ended stuck (mercy help).
 */
export type Tries = { boards: Record<string, number>; mercy: { n: number; stuck: number } | null };

/** The slot as stored: the guide's step, the lessons done, the tries, and anything an older build left in it (kept as it is). */
type Stored = { v: 1; guide: number; lessons?: string[]; tries?: Tries; [older: string]: unknown };

let state: Stored = { v: 1, guide: 0 };
let read = false;
let dirty = false;
let pushTimer: number | undefined;
let retryTimer: number | undefined;
let readTries = 0;
let reading = false;
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

/** A lesson done: never shown again, on any device; saved now. */
export function learnt(name: string): void {
  if (lessonSeen(name)) return;
  state = { ...state, lessons: [...names(state.lessons), name] };
  changed();
  schedulePush();
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

/** Keep the tries (tries.ts); saved now. Only the 30 newest boards are kept: the slot has a ceiling. */
export function keepTries(next: Tries): void {
  const keys = Object.keys(next.boards).sort((a, b) => Number(b) - Number(a)).slice(0, 30);
  state = { ...state, tries: { boards: Object.fromEntries(keys.map((k) => [k, next.boards[k]!])), mercy: next.mercy } };
  triesTouched = true;
  schedulePush();
}
/** This session changed the tries before the account's copy landed: this device's are the newer. */
let triesTouched = false;

/** Hear when the guide's step changes (the account's copy landed). Returns the unsubscribe. */
export function onGuideSave(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
function changed(): void {
  for (const fn of [...listeners]) fn();
}

/** A refusal is an answer: the platform is there, and asking again will not change it. */
function refusal(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return typeof code === "string" && ["not_found", "invalid", "too_large", "forbidden"].includes(code);
}

async function readCloud(): Promise<void> {
  if (read || reading) return;
  reading = true;
  clearTimeout(retryTimer);
  try {
    await gem.awaitIdentity(10_000);
    const got = await gem.me.saves.get<Record<string, unknown>>(SLOT, { timeoutMs: 10_000 });
    // everything an older build left stays as it was; the guide only moves forward
    // lessons only add up too: this device's done this session, and the account's
    if (got && typeof got === "object") {
      const lessons = [...new Set([...names(got.lessons), ...names(state.lessons)])];
      // the tries: the account's, unless this session already moved them (then this device's, the newer)
      const tries = triesTouched ? state.tries : got.tries;
      state = { ...got, v: 1, guide: Math.max(state.guide, count(got.guide)), ...(lessons.length ? { lessons } : {}), ...(tries ? { tries: triesOf(tries) } : {}) };
    }
    finishRead();
  } catch (err) {
    if (refusal(err)) {
      // not_found on a read is a new player
      if ((err as { code?: string }).code !== "not_found") console.warn("[guide-save] read refused:", err);
      finishRead();
    } else {
      suspect();
      const wait = Math.min(30_000, 2000 * 2 ** readTries++);
      retryTimer = window.setTimeout(() => void readCloud(), wait);
    }
  } finally {
    reading = false;
  }
}

function finishRead(): void {
  read = true;
  landed();
  changed();
  if (dirty) schedulePush(0);
}

function schedulePush(ms = 800): void {
  dirty = true;
  if (!read || !framed) return;
  clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => void push(), ms);
}

async function push(timeoutMs = 10_000): Promise<void> {
  if (!dirty || !read) return;
  dirty = false;
  try {
    await gem.me.saves.put(SLOT, state, { timeoutMs });
  } catch (err) {
    if (refusal(err)) {
      console.warn("[guide-save] save refused:", err);
      return;
    }
    // no answer: keep it, and send it again on a timer, not only at the next change
    suspect();
    dirty = true;
    clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => void push(), 5000);
  }
}

/** The guide's steps done: moves only forward, saved now. */
export function guided(step: number): void {
  if (step <= state.guide) return;
  state = { ...state, guide: step };
  changed();
  schedulePush();
}

/** Start reading. Call once, at boot. */
export function loadGuideSave(): void {
  if (!framed) {
    read = true;
    landed();
    return;
  }
  void readCloud();
  onOnline((up) => {
    if (!up) return;
    if (!read) void readCloud();
    else if (dirty) void push();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !read) void readCloud();
    if (document.visibilityState === "hidden" && dirty) void push(3000);
  });
  addEventListener("pagehide", () => {
    if (dirty) void push(2000);
  });
  onWillTerminate((graceMs) => {
    if (dirty) void push(Math.max(1000, graceMs - 500));
  });
}

/** Wait for the account's copy, at most `ms`; true if it landed. */
export function waitForGuideSave(ms: number): Promise<boolean> {
  if (read) return Promise.resolve(true);
  return Promise.race([guideSaveRead.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), ms))]);
}
