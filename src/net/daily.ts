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
//   - unframed (a plain tab) the device's date stands in, guessed.
// The board for the date is the levels member's rule: loadDaily(date) in
// src/game/levels.ts. Never send periodStartAt or periodEndsAt to anyone:
// they give the player's time zone away.

import { gem } from "../gem";
import { onOnline, suspect } from "../ui/online";

/** The daily challenge's slug and id in the game config (functions/checker/src/lib.rs has the same). */
export const DAILY_SLUG = "daily_picture";
const DAILY_ID = "6d1f3b0e-8a52-4c7e-9f14-2b6e0d9a7c31";
/** The day's results board in the game config: fewest moves, then the quicker time. */
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
  return known ?? guess();
}

async function read(): Promise<DailyToday | null> {
  try {
    const id = await gem.awaitIdentity(10_000);
    const list = await gem.challenges.list();
    const c = list.find((x) => x.slug === DAILY_SLUG || x.id === DAILY_ID);
    if (!c?.periodLocalDate) return null; // this channel's config has no daily (yet)
    const next = { date: c.periodLocalDate, endsAt: c.periodEndsAt * 1000, guessed: false, key: `${id.playerId}/${id.channel}` };
    const was = known;
    known = next;
    clearTimeout(timer);
    // read again when the day ends here, never sooner than a minute
    timer = window.setTimeout(() => void refresh(), Math.max(60_000, next.endsAt - Date.now()));
    if (!was || was.date !== next.date || was.guessed !== next.guessed || was.key !== next.key) {
      for (const fn of [...changes]) fn(next);
    }
    return next;
  } catch (err) {
    suspect();
    console.warn("[daily] the day could not be read", err);
    return null;
  } finally {
    reading = null;
  }
}

function refresh(): Promise<DailyToday | null> {
  reading ??= read();
  return reading;
}

/** Today's daily date for this player. Framed, waits up to `waitMs` for the platform, then answers with a guess. */
export async function today(waitMs = 1000): Promise<DailyToday> {
  if (!framed) return guess();
  if (known && (known.endsAt === null || Date.now() < known.endsAt)) return known;
  const asked = refresh();
  const got = await Promise.race([asked, new Promise<null>((r) => setTimeout(() => r(null), waitMs))]);
  return got ?? known ?? guess();
}

/** The day's results among the player's friends (and themselves): `daysBack` 0 is today, 1 yesterday. */
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
