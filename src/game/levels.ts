// The campaign's boards, as data: src/game/campaign.json, written by
// tools/make-campaign.mts (to be replaced by the level-design member's
// generator). Each level is a deal (src/game/rules.ts), how many upcoming
// cards its stacks show, and a known winning line with no helpers, which the
// Hint helper follows while the player is on it.

import CAMPAIGN from "./campaign.json";
import type { Deal, Move, Picture } from "./rules.ts";

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

interface Stored {
  id: string;
  peek: number;
  cols: number;
  rows: number;
  seed: number;
  pictures: Picture[];
  stacks: number[][];
  line: [number, number][];
}

const LEVELS: Level[] = (CAMPAIGN.levels as Stored[]).map((l, i) => ({
  id: l.id,
  number: i + 1,
  peek: Math.max(0, Math.min(2, l.peek)) as 0 | 1 | 2,
  deal: { cols: l.cols, rows: l.rows, pictures: l.pictures, stacks: l.stacks, seed: l.seed },
  line: l.line.map(([from, to]) => ({ from, to })),
}));

/** How many boards the campaign has. */
export function levelCount(): number {
  return LEVELS.length;
}

/** Board `n` (from 1); past the end, the campaign goes round again. */
export function level(n: number): Level {
  const i = (((Math.floor(n) - 1) % LEVELS.length) + LEVELS.length) % LEVELS.length;
  return LEVELS[i]!;
}
