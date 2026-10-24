// The campaign's boards, as the board reads them. The data is the level-design
// member's: src/content/levels/campaign.json, made by tools/levels/ and
// re-proved by `node tools/levels/check.mts`. Each level is a deal
// (src/game/rules.ts), how many upcoming cards its stacks show, and a known
// winning line with no helpers, which the Hint helper follows while the player
// is on it. Other fields there (axes: how hard the board is, and why) are the
// level designer's notes; the board ignores them.

import CAMPAIGN from "../content/levels/campaign.json";
import type { Deal, Move, Picture } from "./rules.ts";
import { dailyFor } from "./levels/daily.ts";

export interface Level {
  /** "c01" ... */
  id: string;
  /** 1-based place in the campaign. */
  number: number;
  /** How many upcoming cards each stack shows face up: 0, 1 or 2. */
  peek: 0 | 1 | 2;
  deal: Deal;
  /** A winning line from the deal, with no helpers. */
  line: Move[];
}

/** A board as the level files store it (any size: the board fits it to its box). */
export interface Stored {
  id: string;
  peek: number;
  cols: number;
  rows: number;
  seed: number;
  pictures: Picture[];
  stacks: number[][];
  line: number[][];
}

/** A stored board as the board plays it; `number` is its place in its list, from 1. */
export function toLevel(l: Stored, number: number): Level {
  return {
    id: l.id,
    number,
    peek: Math.max(0, Math.min(2, l.peek)) as 0 | 1 | 2,
    deal: { cols: l.cols, rows: l.rows, pictures: l.pictures, stacks: l.stacks, seed: l.seed },
    line: l.line.map(([from, to]) => ({ from: from!, to: to! })),
  };
}

const LEVELS: Level[] = (CAMPAIGN.levels as Stored[]).map((l, i) => toLevel(l, i + 1));

// ---------------------------------------------------------------- challenge route and daily

/** A board with a par: the number of moves in the solver's best line. */
export type Challenge = Level & { par: number };
/** A date's daily board ("YYYY-MM-DD", the player's own date from the platform). */
export type Daily = Challenge & { date: string };

type StoredPar = Stored & { par: number };
/** A daily as stored: its date, and other fields (the level designer's notes) the board ignores. */
type StoredDaily = StoredPar & { date: string; [field: string]: unknown };

let challenges: Promise<Challenge[]> | null = null;
/**
 * The challenge route (src/content/levels/challenge.json), in unlock order.
 * Fetched apart from the boot, on the first ask, then kept; [] if it cannot
 * be loaded.
 */
export function loadChallenges(): Promise<Challenge[]> {
  challenges ??= import("../content/levels/challenge.json")
    .then((m) => (m.default.levels as StoredPar[]).map((l, i) => ({ ...toLevel(l, i + 1), par: l.par })))
    .catch((err: unknown) => {
      console.warn("[levels] the challenge route did not load", err);
      challenges = null; // ask again next time
      return [];
    });
  return challenges;
}

let dailyPool: Promise<{ levels: StoredDaily[] } | null> | null = null;
/**
 * The daily board for `date`, or null when the pool has none for it (before
 * its first day, after its last). The pool (src/content/levels/daily.json) is
 * fetched apart from the boot, on the first ask; which board is a date's is
 * the levels member's rule (dailyFor), which the server's win checker mirrors.
 */
export async function loadDaily(date: string): Promise<Daily | null> {
  dailyPool ??= import("../content/levels/daily.json")
    .then((m) => m.default as unknown as { levels: StoredDaily[] })
    .catch((err: unknown) => {
      console.warn("[levels] the daily boards did not load", err);
      dailyPool = null;
      return null;
    });
  const pool = await dailyPool;
  const b = pool && dailyFor(pool, date);
  if (!b) return null;
  return { ...toLevel(b, pool.levels.indexOf(b) + 1), par: b.par, date: b.date };
}

/** How many boards the campaign has. */
export function levelCount(): number {
  return LEVELS.length;
}

/** Board `n` (from 1); past the end, the campaign goes round again. */
export function level(n: number): Level {
  const i = (((Math.floor(n) - 1) % LEVELS.length) + LEVELS.length) % LEVELS.length;
  return LEVELS[i]!;
}
