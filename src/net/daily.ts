// THE DAILY PUZZLE's date and standings, from the platform. The UI draws the
// screens; this file only says which day it is for this player, and what the
// day's board shows.
//
// The game standard ("Dailies run on the player's own day, and only the
// platform knows it"): the day is the platform's periodLocalDate for the
// "daily_picture" challenge (game config: a daily on the player's own local
// day), never the device clock's.
//   - today() asks gem.challenges.list(), cached per player and channel until
//     the period ends, and read again then (a timer of at least 60 s) and on
//     coming back to the page after it;
//   - framed, the first ask waits about a second at most, then answers with a
//     GUESS (the device's own date, `guessed: true`) and calls onDailyChange
//     when the platform's date lands. A result played on a guess is still
//     sent with it: the win checker says whether it was the player's day.
//   - unframed (a plain tab) the device's date stands in, guessed;
//   - a read that fails is asked again on a wait that grows (src/net/pace.ts: never under the
//     platform's retry-after, at most 5 minutes, never while hidden); until then today()
//     answers with what it knows, or the guess, without asking.
// The board for the date is the levels member's rule: loadDaily(date) in
// src/game/levels.ts. Never send periodStartAt or periodEndsAt to anyone:
// they give the player's time zone away.

import { gem } from "../gem";
import { onOnline, suspect } from "../ui/online";
import { noAnswer, refusalOf } from "./no-answer";
import { backoff, heard, held, whenDue } from "./pace";

/** The daily challenge's slug and id in the game config (functions/checker/src/lib.rs has the same). */
export const DAILY_SLUG = "daily_picture";
const DAILY_ID = "6d1f3b0e-8a52-4c7e-9f14-2b6e0d9a7c31";
/** The day's results board in the game config: fewest moves, a tie to whoever finished first (the earlier run). */
export const DAILY_BOARD = "daily";

export interface DailyToday {
  /** "YYYY-MM-DD": the player's own date for the daily. */
  date: string;
  /** When this day ends for the player (ms since the epoch), or null on a guess. */
  endsAt: number | null;
  /** True when this is the device's guess, not yet the platform's word. */
  guessed: boolean;
}

export interface DailyRow {
  rank: number;
  /** The player's name as the platform gives it (render with the SDK's text.toPlain); absent for an anonymous row. */
  displayName?: unknown;
  discriminator?: string;
  playerId?: string;
  /** The viewer's own row (friends board only). */
  isViewer: boolean;
  moves: number;
  timeMs: number;
}

export interface DailyStandings {
  date?: string;
  /** False while results can still arrive (a day's board stays open about 50 hours across time zones): say "so far". */
  final: boolean;
  rows: DailyRow[];
}

const framed = window.self !== window.top;
const changes = new Set<(d: DailyToday) => void>();
let known: (DailyToday & { key: string }) | null = null;
let reading: Promise<DailyToday | null> | null = null;
let timer: number | undefined;
/** Failed reads in a row; no read before `notBefore` (Date.now()); the one read waiting to try again. */
let fails = 0;
let notBefore = 0;
let again: (() => void) | null = null;

function guess(): DailyToday {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, endsAt: null, guessed: true };
}

/** Hear when the day changes, or the platform's date replaces a guess. Returns the unsubscribe. */
export function onDailyChange(fn: (d: DailyToday) => void): () => void {
  changes.add(fn);
  return () => void changes.delete(fn);
}

/** The day as last known, without asking (a guess until the platform has answered). */
export function currentDaily(): DailyToday {
  return known ? plain(known) : guess();
}

const plain = (d: DailyToday): DailyToday => ({ date: d.date, endsAt: d.endsAt, guessed: d.guessed });

async function read(): Promise<DailyToday | null> {
  try {
    const id = await gem.awaitIdentity(10_000);
    const list = await gem.challenges.list();
    const c = list.find((x) => x.slug === DAILY_SLUG || x.id === DAILY_ID);
    if (!c?.periodLocalDate) return null; // this channel's config has no daily (yet)
    fails = 0;
    const next = { date: c.periodLocalDate, endsAt: c.periodEndsAt * 1000, guessed: false, key: `${id.playerId}/${id.channel}` };
    const was = known;
    known = next;
    clearTimeout(timer);
    // read again when the day ends here, never sooner than a minute
    timer = window.setTimeout(() => void refresh(), Math.max(60_000, next.endsAt - Date.now()));
    if (!was || was.date !== next.date || was.guessed !== next.guessed || was.key !== next.key) {
      for (const fn of [...changes]) fn(plain(next));
    }
    return plain(next);
  } catch (err) {
    if (noAnswer(err)) suspect();
    heard(err);
    console.warn(`[daily] the day could not be read: ${refusalOf(err)}`);
    const wait = backoff(++fails, 5000);
    notBefore = Date.now() + wait;
    again?.();
    again = whenDue(wait, () => {
      again = null;
      void refresh();
    });
    return null;
  } finally {
    reading = null;
  }
}

function refresh(): Promise<DailyToday | null> {
  // inside a wait (a failed read's, or the platform's): answer without asking
  if (!reading && (Date.now() < notBefore || held() > 0)) return Promise.resolve(null);
  reading ??= read();
  return reading;
}

/** Today's daily date for this player. Framed, waits up to `waitMs` for the platform, then answers with a guess. */
export async function today(waitMs = 1000): Promise<DailyToday> {
  if (!framed) return guess();
  if (known && (known.endsAt === null || Date.now() < known.endsAt)) return plain(known);
  const asked = refresh();
  const got = await Promise.race([asked, new Promise<null>((r) => setTimeout(() => r(null), waitMs))]);
  return got ?? (known ? plain(known) : guess());
}

/**
 * The day's results among the player's friends (and themselves): `daysBack` 0 is today, 1 yesterday.
 * Unpaced, for the results screen written before the Daily page: new code reads dailyBoard()
 * (src/net/daily-board.ts), which holds the board until the platform's next rendering.
 */
export async function standings(daysBack = 0): Promise<DailyStandings> {
  return rowsOf(await gem.leaderboards.friends(DAILY_BOARD, daysBack ? { periodsBack: daysBack } : {}));
}

/** The day's results among everyone (the top of the board). */
export async function everyone(daysBack = 0): Promise<DailyStandings> {
  return rowsOf(await gem.leaderboards.get(DAILY_BOARD, daysBack ? { periodsBack: daysBack } : {}));
}

function rowsOf(board: Awaited<ReturnType<typeof gem.leaderboards.get>>): DailyStandings {
  return {
    ...(board.period?.localDate ? { date: board.period.localDate } : {}),
    final: board.period?.final ?? false,
    rows: board.entries.map((e) => ({
      rank: e.rank,
      ...(e.displayName ? { displayName: e.displayName } : {}),
      ...(e.discriminator ? { discriminator: e.discriminator } : {}),
      ...(e.playerId ? { playerId: e.playerId } : {}),
      isViewer: e.isViewer === true,
      moves: e.stats?.moves ?? 0,
      timeMs: e.stats?.time_ms ?? 0,
    })),
  };
}

if (framed) {
  onOnline((up) => {
    if (up && (!known || known.guessed)) void refresh();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && known?.endsAt && Date.now() >= known.endsAt) void refresh();
  });
}

// ---------------------------------------------------------------- the archive (VIP, docs/vip.md)

/** A "YYYY-MM-DD" date `n` days after `date` (n may be negative), in the calendar alone. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y!, m! - 1, d! + n));
  return t.toISOString().slice(0, 10);
}

/**
 * The archive of past dailies for a player whose date is `today` (the game standard: this month and
 * the two before, counted in the player's own months): from the 1st of the month two before, to
 * yesterday. The win checker pays a VIP's past day inside it, with a day of slack (the window of
 * the day before also counts), and nothing older (functions/checker/src/vip.rs, archive_start).
 */
export function archiveWindow(today: string): { first: string; last: string } {
  const [y, m] = today.split("-").map(Number);
  const back = new Date(Date.UTC(y!, m! - 1 - 2, 1));
  return { first: back.toISOString().slice(0, 10), last: addDays(today, -1) };
}

/** The archive's days for this player now, or null while the date is only the device's guess. */
export function archiveDays(): { first: string; last: string } | null {
  const d = currentDaily();
  return d.guessed ? null : archiveWindow(d.date);
}
