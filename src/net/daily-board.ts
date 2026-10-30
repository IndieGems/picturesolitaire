// THE DAY'S FRIENDS BOARD, for the Daily page (src/ui/daily.ts, UI's): the player and their friends
// on one day's daily, fewest moves first, a tie to whoever finished first (the creator, 2026-10-30).
//
//   dailyBoard()                today's board: { date, final, rows, me, friendsPlayed, sample }
//   dailyBoard({ daysBack: 1 }) yesterday's (0 to 400 days back)
//   dailyBoard({ par })         the day's par, so the dev channel's sample moves look like the board's
//
// Every score on it is the server's. The win checker (functions/checker, daily_win) posts the player's
// FIRST verified win of the day as the day's run (one run id per player per date), and nothing else:
// a replay with fewer moves changes nothing (the platform keeps every run as a row and has no "best
// of", so a second run would be a second row of the same player), practice and a VIP's past day post
// nothing, and the client never can. The time on a row is the game's own clock, which the checker only
// bounds: show it if you like, it never decides a place.
//
// Reading it (docs: leaderboards.md, "Friends"): gem.leaderboards.friends("daily") is the platform's
// own ranking of the player and their accepted friends, re-rendered at most every 5 minutes per
// viewer. So:
//   - Call it when the Daily page opens, never on a timer. A second call before the platform's next
//     rendering answers from what this file holds, with no request; one read in flight at a time.
//   - A player who has just won may not be on that rendering yet: when their row is missing and the
//     server's record says they won that day, today or yesterday (src/net/progress.ts), their own run is read exactly
//     (gem.leaderboards.mine) and placed among the friends, after any friend on the same moves (an
//     earlier finish wins the tie).
//   - Never while the platform asked us to wait (src/net/pace.ts), nor more than once per open.
//   - null: no answer (offline, refused, or held). Say so and let the next open ask again.
//
// SAMPLE PLAYERS, the dev channel only (and a plain tab, the play-test tool, in a non-release build):
// while no friend has played the day, the board is filled with made-up friends, seeded by the date so
// they hold still, with `sample: true` on the board and on each of their rows, so the creator can judge
// the page with something on it. The player's own real row is placed among them. Never on test or
// release, and never in a release build (MODE "release"): there the empty state is the real one.

import { text, type PlayerText } from "@indiegems/gem-web-sdk/sdk";
import { gem } from "../gem";
import { suspect } from "../ui/online";
import { currentDaily, DAILY_BOARD } from "./daily";
import { noAnswer, refusalOf } from "./no-answer";
import { heard, held } from "./pace";
import { dailyResult } from "./progress";

export interface BoardRow {
  /** The place among the player and their friends, 1 first. */
  rank: number;
  /** The name as plain text, for textContent; "" for an anonymous row (a deleted player keeps their place). */
  name: string;
  /** The platform's name, for anything richer than plain text. Absent on a sample or anonymous row. */
  displayName?: PlayerText;
  discriminator?: string;
  /** Absent on a sample or anonymous row. */
  playerId?: string;
  /** The portrait: pass it through the SDK's platformIconUrl before an <img>. Absent on a sample row. */
  avatarIconUrl?: string;
  /** The player's own row. */
  isViewer: boolean;
  moves: number;
  /** The game's own clock for the win (ms): shown, never ranked. */
  timeMs: number;
  /** A made-up friend (the dev channel's sample, above). */
  sample?: true;
}

export interface DailyBoard {
  /** "YYYY-MM-DD": the board's date, the platform's (the player's own day). */
  date: string;
  /** False while results can still arrive (a day's board stays open about 50 hours across time zones): say "so far". */
  final: boolean;
  /** Everyone on the board, in order: the player (if they played) and their friends who played. */
  rows: BoardRow[];
  /** The player's own row (also in rows), or null: not played that day, or their run is not on the board (a late finish after the day closed). */
  me: BoardRow | null;
  /** Any friend (not the player, not a sample) has played the day. */
  friendsPlayed: boolean;
  /** The rows include sample friends: label them as samples. */
  sample: boolean;
}

type Options = { daysBack?: number; par?: number };

/** Framed by the platform: another origin's frame (as src/net/vip.ts). The play-test tool's same-origin frame is a plain tab here, and gets the sample. */
const framed = ((): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true;
  }
})();
const CAN_SAMPLE = import.meta.env.MODE !== "release";
/** The platform re-renders a viewer's friends board at most this often; until then a read answers the same. */
const FALLBACK_CADENCE_S = 300;

type Held = { key: string; board: DailyBoard; until: number; played: boolean };
const kept = new Map<number, Held>();
const reading = new Map<number, Promise<DailyBoard | null>>();

/** The day's board among the player's friends. See the head of this file. */
export function dailyBoard(opts: Options = {}): Promise<DailyBoard | null> {
  const back = Math.max(0, Math.min(400, Math.floor(opts.daysBack ?? 0)));
  if (!framed) {
    // a plain tab: no platform, so no board, but a non-release build shows the sample
    return Promise.resolve(CAN_SAMPLE ? withSamples(empty(dateBack(back)), opts.par) : null);
  }
  const was = reading.get(back);
  if (was) return was;
  const p = read(back, opts.par).finally(() => reading.delete(back));
  reading.set(back, p);
  return p;
}

const empty = (date: string): DailyBoard => ({ date, final: false, rows: [], me: null, friendsPlayed: false, sample: false });

/** The date `back` days before the player's today, as this game last heard it (a guess unframed). */
function dateBack(back: number): string {
  const d = currentDaily().date;
  if (!back) return d;
  const t = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) - back));
  return t.toISOString().slice(0, 10);
}

/** Unix seconds or ms, as ms. */
const asMs = (t: number): number => (t < 1e12 ? t * 1000 : t);

async function read(back: number, par: number | undefined): Promise<DailyBoard | null> {
  const id = await gem.awaitIdentity(10_000).catch(() => null);
  if (!id) return null;
  const key = `${id.playerId}/${id.channel}`;
  const sampling = CAN_SAMPLE && id.channel === "dev";
  const have = kept.get(back);
  const fresh = have && have.key === key && Date.now() < have.until;
  // the player won since this was read, and their row is not on it: read it again (their own run, at least)
  const playedNow = !!have && !!dailyResult(have.board.date);
  if (fresh && !(playedNow && !have.played)) return have.board;
  if (held() > 0) return have && have.key === key ? have.board : null;

  const period = back ? { periodsBack: back } : {};
  try {
    const lb = await gem.leaderboards.friends(DAILY_BOARD, period);
    const date = lb.period?.localDate ?? dateBack(back);
    let rows = lb.entries.map(rowOf);
    let me = rows.find((r) => r.isViewer) ?? null;
    const played = !!dailyResult(date);
    // only today's and yesterday's wins post a run (a VIP's older day from the archive posts none)
    if (!me && played && back <= 1) {
      // their win may be newer than this rendering: their own run, exactly
      const own = await gem.leaderboards.mine(DAILY_BOARD, { ...period, limit: 1 });
      const best = own.personalBest;
      if (best?.stats && typeof best.stats.moves === "number") {
        me = { rank: 0, name: "", isViewer: true, moves: best.stats.moves, timeMs: best.stats.time_ms ?? 0 };
        rows = placed(rows, me);
      }
    }
    let board: DailyBoard = {
      date,
      final: lb.period?.final ?? false,
      rows,
      me,
      friendsPlayed: rows.some((r) => !r.isViewer),
      sample: false,
    };
    if (sampling && !board.friendsPlayed) board = withSamples(board, par);
    const cadence = lb.updateFrequencySeconds ?? FALLBACK_CADENCE_S;
    const next = lb.generatedAt ? asMs(lb.generatedAt) + cadence * 1000 : Date.now() + cadence * 1000;
    // never hold one past its own cadence, and never less than a minute (a clock that disagrees)
    const until = Math.max(Date.now() + 60_000, Math.min(next, Date.now() + cadence * 1000));
    kept.set(back, { key, board, until, played: !!me });
    return board;
  } catch (err) {
    if (noAnswer(err)) suspect();
    heard(err);
    console.warn(`[daily-board] could not be read: ${refusalOf(err)}`);
    return have && have.key === key ? have.board : null;
  }
}

function rowOf(e: Awaited<ReturnType<typeof gem.leaderboards.friends>>["entries"][number]): BoardRow {
  return {
    rank: e.rank,
    name: e.displayName ? text.toPlain(e.displayName) : "",
    ...(e.displayName ? { displayName: e.displayName } : {}),
    ...(e.discriminator ? { discriminator: e.discriminator } : {}),
    ...(e.playerId ? { playerId: e.playerId } : {}),
    ...(e.avatarIconUrl ? { avatarIconUrl: e.avatarIconUrl } : {}),
    isViewer: e.isViewer === true,
    moves: e.stats?.moves ?? 0,
    timeMs: e.stats?.time_ms ?? 0,
  };
}

/** `me` placed among `rows` (already in order): after every row on the same moves or fewer, ranks renumbered. */
function placed(rows: BoardRow[], me: BoardRow): BoardRow[] {
  const others = rows.filter((r) => !r.isViewer);
  let at = 0;
  while (at < others.length && others[at]!.moves <= me.moves) at++;
  const all = [...others.slice(0, at), me, ...others.slice(at)];
  return all.map((r, i) => {
    r.rank = i + 1;
    return r;
  });
}

// ---------------------------------------------------------------- the dev channel's sample friends

const NAMES = [
  "Jamal", "Keisha", "Priya", "Tomás", "Grace", "Darnell", "Imani", "Kofi", "Lena", "Andre",
  "Mei", "Aaliyah", "Marcus", "Sofia", "Tariq", "Nadia", "DeShawn", "Hana", "Malik", "Rosa",
];

/** A small seeded generator (mulberry32): the same date, the same friends. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withSamples(board: DailyBoard, par = 20): DailyBoard {
  let h = 2166136261;
  for (const c of board.date) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rnd = seeded(h);
  const names = [...NAMES];
  const n = 5 + Math.floor(rnd() * 5); // 5 to 9 friends
  const made: BoardRow[] = [];
  for (let i = 0; i < n; i++) {
    const name = names.splice(Math.floor(rnd() * names.length), 1)[0]!;
    // most near par, a few well over it
    const over = rnd() < 0.25 ? 0 : Math.floor(rnd() * rnd() * 14);
    const moves = Math.max(1, Math.round(par) + over);
    made.push({
      rank: 0,
      name,
      discriminator: String(1000 + Math.floor(rnd() * 9000)),
      isViewer: false,
      moves,
      timeMs: Math.round(moves * (2500 + rnd() * 4000)),
      sample: true,
    });
  }
  made.sort((a, b) => a.moves - b.moves);
  let rows = made.map((r, i) => ({ ...r, rank: i + 1 }));
  if (board.me) rows = placed(rows, { ...board.me });
  return { ...board, rows, me: rows.find((r) => r.isViewer) ?? null, sample: true };
}
