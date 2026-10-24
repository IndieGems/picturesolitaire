// The campaign: which board the player plays next, every picture they have
// restored (what the albums show), the fewest moves on each challenge board,
// and how far the first board's guide got. Kept in the CLOUD, in the
// player's "campaign" save slot (declared in the game config, save_schemas),
// never in browser storage (AGENTS.md: every build runs on a new web address).
//
// The game standard's rules for it ("All player data lives in the CLOUD"):
//   - the first screen never waits for the read more than about a second;
//     until it lands, home shows the defaults, and a Play pressed meanwhile
//     waits a little longer for it (startLevel), then plays on the defaults;
//   - a failed read is tried again, with a backoff, and at once when the
//     connection comes back or the page is shown again: writes wait for it,
//     so a read given up on would mean nothing of the session is ever saved;
//   - no write leaves the device before the account's copy is read, and the
//     two are merged (the furthest level wins), so a board won during the
//     first seconds never writes this device's defaults over real progress;
//   - writes are debounced, sent again on a timer when they fail, and flushed
//     when the page is hidden or closed.
//
// Unframed (a plain tab) there is no player: progress lives for the session.

import { gem, onWillTerminate } from "../gem";
import { onOnline, suspect } from "./online";

const SLOT = "campaign";

export interface Campaign {
  v: 1;
  /** The board to play next, from 1. */
  level: number;
  /** Boards won, in all (a replayed board counts again). */
  won: number;
  /** Every picture restored, by catalogue id, each once (src/content/pictures.json). */
  restored: string[];
  /**
   * The challenge route: the fewest moves the player cleared each board in, by
   * board id. A board with a number here is cleared, which opens the next one.
   */
  best: Record<string, number>;
  /** Steps of the first board's guide done (guide.ts); it only moves forward. */
  guide: number;
  /**
   * The daily puzzle: the player's first finish on their latest daily date (the
   * platform's date, src/net/daily.ts), so Home can say "done" at once. The
   * day's results board is the server's; this is only the device's note of it.
   */
  daily: DailyResult | null;
}

export interface DailyResult {
  /** "YYYY-MM-DD", the platform's date for the player's day. */
  date: string;
  moves: number;
  ms: number;
}

const fresh = (): Campaign => ({ v: 1, level: 1, won: 0, restored: [], best: {}, guide: 0, daily: null });

function dailyOf(x: unknown): DailyResult | null {
  const d = x as DailyResult | null;
  return d && typeof d === "object" && typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? { date: d.date, moves: count(d.moves), ms: count(d.ms) } : null;
}

let state: Campaign = fresh();
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
export const cloudRead: Promise<void> = new Promise((r) => (landed = r));

/** Where the player is: read-only, call `won()` to move on. */
export function campaign(): Readonly<Campaign> {
  return state;
}

/** Hear when the campaign changes (the cloud copy landed, a board was won). Returns the unsubscribe. */
export function onCampaign(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

function changed(): void {
  for (const fn of [...listeners]) fn();
}

function valid(x: unknown): x is Campaign {
  const c = x as Campaign | null;
  return !!c && typeof c === "object" && Number.isInteger(c.level) && c.level >= 1;
}

const count = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);

/** Two copies of the save as one: the furthest level, every picture, the fewer moves on each challenge. */
function merge(a: Campaign, b: Campaign): Campaign {
  const restored = [...new Set([...(a.restored ?? []), ...(Array.isArray(b.restored) ? b.restored.filter((id) => typeof id === "string") : [])])];
  const best: Record<string, number> = { ...a.best };
  if (b.best && typeof b.best === "object")
    for (const [id, moves] of Object.entries(b.best))
      if (count(moves) > 0) best[id] = id in best ? Math.min(best[id]!, count(moves)) : count(moves);
  return {
    v: 1,
    level: Math.max(a.level, b.level),
    won: Math.max(count(a.won), count(b.won)),
    restored,
    best,
    guide: Math.max(count(a.guide), count(b.guide)),
    // the later day; on the same day, the copy already here (the first finish)
    daily: ((x, y) => (!x ? y : !y ? x : y.date > x.date ? y : x))(dailyOf(a.daily), dailyOf(b.daily)),
  };
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
    const got = await gem.me.saves.get<Campaign>(SLOT, { timeoutMs: 10_000 });
    if (valid(got)) state = merge(state, got);
    finishRead();
  } catch (err) {
    if (refusal(err)) {
      // not_found on a read is a new player (or a slot not declared on this channel yet)
      if ((err as { code?: string }).code !== "not_found") console.warn("[campaign] read refused:", err);
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
      console.warn("[campaign] save refused:", err);
      return;
    }
    // no answer: keep it, and send it again on a timer, not only at the next change
    suspect();
    dirty = true;
    clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => void push(), 5000);
  }
}

/** A board was won: the next one is the player's to play (a replay of an earlier board moves nothing). Saved now. */
export function won(level: number): void {
  state = { ...state, level: Math.max(state.level, level + 1), won: state.won + 1 };
  changed();
  schedulePush();
}

/**
 * A picture was restored (it left the board whole). Kept at once, saved with
 * the board's end (won) or when the page is left: one write per board, not
 * one per picture.
 */
export function restore(pictureId: string): void {
  if (state.restored.includes(pictureId)) return;
  state = { ...state, restored: [...state.restored, pictureId] };
  dirty = true;
  changed();
}

/** Pictures shown as restored for checking the albums by hand (dev server only); never saved. */
const pretended = new Set<string>();

/**
 * A challenge board was cleared in `moves` (any number: there is no fail, and
 * going over par still clears it). Keeps the fewer moves; saved now. Says
 * whether it was the first clear and whether it beat the best before.
 */
export function cleared(id: string, moves: number): { first: boolean; better: boolean } {
  const before = state.best[id];
  const first = before === undefined;
  const better = !first && moves < before;
  if (first || better) {
    state = { ...state, best: { ...state.best, [id]: moves } };
    changed();
  }
  schedulePush();
  return { first, better };
}

/** The fewest moves the player cleared this challenge board in, if they have. */
export function bestOf(id: string): number | undefined {
  return state.best[id];
}

/**
 * The daily board of `date` was finished. Only the day's first finish is kept (and
 * only it counts on the day's board); says whether this was it. Saved now.
 */
export function playedDaily(date: string, moves: number, ms: number): boolean {
  if (state.daily && state.daily.date >= date) return false;
  state = { ...state, daily: { date, moves, ms: Math.round(ms) } };
  changed();
  schedulePush();
  return true;
}

/** The player's first finish on the daily of `date`, if they have one. */
export function dailyResult(date: string): DailyResult | null {
  return state.daily?.date === date ? state.daily : null;
}

/** The guide's steps done: moves only forward, saved now. */
export function guided(step: number): void {
  if (step <= state.guide) return;
  state = { ...state, guide: step };
  changed();
  schedulePush();
}

/** Has the player restored this picture? */
export function isRestored(pictureId: string): boolean {
  return state.restored.includes(pictureId) || pretended.has(pictureId);
}

/** Checking the albums by hand: show these pictures as restored, for this page only. */
export function pretendRestored(ids: string[]): void {
  for (const id of ids) pretended.add(id);
  changed();
}

/** Start reading. Call once, at boot. */
export function loadCampaign(): void {
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
export function waitForCloud(ms: number): Promise<boolean> {
  if (read) return Promise.resolve(true);
  return Promise.race([cloudRead.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), ms))]);
}
