// THE SHUFFLE HELPER: a rescue mix (creator's ruling, AGENTS.md, 2026-10-23).
// Pure and deterministic like the rules: the same state gives the same mix on
// every machine, so a replay of moves and shuffles reproduces the game.
//
// The loose cards (those joined to no other) trade places; joined pieces never
// move. When the board is STUCK (a dead end, or the solver finds no way to win
// from here), some loose cards also trade places with cards in the stacks, so
// the board gets cards it could not reach. Every mix is settled with the real
// rules and kept only when the solver PROVES it winnable (src/game/solver/, the
// levels member's: `solveFrom` returning a line the real rules replay to a
// win); a search that runs out proves nothing and the mix is passed over.
//
// The candidates come in a fixed order from random(seed, shuffles used):
//   1. loose cards only (never on a dead end, where they cannot help);
//   2. when stuck: m = 1, 2, ... loose cards swapped with m stack cards (each
//      takes the other's place, so every column keeps its count and a column
//      whose stack holds cards stays full), then the loose cards mixed.
// The first proved candidate is the shuffle. None proved: Shuffle refuses
// (null) and the helper is not spent.
//
// What this returns carries its `action`: the arrangement it chose, which the
// board records. The rules play that action with `arrange` and no solver, so a
// replay, and the server's win checker, never search.
//
// The numbers below decide which mix is offered, the same on every device for
// the same position (the solver counts positions, not time). A recorded game
// never depends on them: its shuffle actions carry the mix itself.

import { MAX_SWAPS, arrange, isDeadEnd, isWon, pieces, random, type Move, type Outcome, type Shuffle, type State } from "./rules.ts";
import { solveFrom } from "./solver/index.ts";

export const RESCUE = {
  /** Positions the solver may visit to prove one candidate (it counts positions, not time). */
  budget: 20_000,
  /** Mixes of the loose cards alone. */
  looseTries: 8,
  /** Mixes for each number of stack cards swapped in. */
  swapTries: 6,
  /** The most stack cards one shuffle swaps in (the rules allow MAX_SWAPS). */
  maxSwaps: MAX_SWAPS,
} as const;

/** A shuffle: the action to record and replay, what it did, and the winning line that proved it (empty when the mix itself won). */
export interface Rescue extends Outcome {
  action: Shuffle;
  line: Move[];
  /** How many stack cards were swapped in (0: the loose cards only). */
  swapped: number;
}

/** The Shuffle helper: a winnable mix, or null when none is found (the helper is then not spent). */
export function rescue(s: State): Rescue | null {
  const loose = pieces(s)
    .list.filter((p) => p.length === 1)
    .map((p) => p[0]!)
    .sort((a, b) => a - b);
  if (!loose.length) return null;
  const dead = isDeadEnd(s);
  const stuck = dead || "doomed" in solveFrom(s, RESCUE.budget);
  const slots: { col: number; at: number }[] = [];
  s.stacks.forEach((st, col) => st.forEach((_c, at) => slots.push({ col, at })));

  const plan: number[] = [];
  if (!dead && loose.length >= 2) for (let t = 0; t < RESCUE.looseTries; t++) plan.push(0);
  if (stuck) {
    const most = Math.min(RESCUE.maxSwaps, loose.length, slots.length);
    for (let m = 1; m <= most; m++) for (let t = 0; t < RESCUE.swapTries; t++) plan.push(m);
  }

  const rnd = random((s.seed ^ Math.imul(s.shuffles + 1, 0x9e3779b9)) >>> 0);
  for (const m of plan) {
    const action = candidate(s, loose, slots, m, rnd);
    const out = action && arrange(s, action);
    if (!out) continue;
    if (isWon(out.state)) return { ...out, action, line: [], swapped: m };
    const a = solveFrom(out.state, RESCUE.budget);
    if ("win" in a) return { ...out, action, line: a.win.moves, swapped: m };
  }
  return null;
}

/** `n` distinct picks from `from`, by a partial seeded shuffle. */
function pick<T>(from: readonly T[], n: number, rnd: () => number): T[] {
  const a = [...from];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rnd() * (a.length - i));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.slice(0, n);
}

/** One mix: `m` loose cards trade places with stack cards, then the loose cells get a seeded order. */
function candidate(s: State, loose: readonly number[], slots: readonly { col: number; at: number }[], m: number, rnd: () => number): Shuffle | null {
  const outCells = pick(loose, m, rnd);
  const inSlots = pick(slots, m, rnd);
  const stacks = s.stacks.map((st) => [...st]);
  const pool: number[] = [];
  outCells.forEach((cell, i) => {
    const { col, at } = inSlots[i]!;
    pool.push(stacks[col]![at]!);
    stacks[col]![at] = s.board[cell]!;
  });
  for (const cell of loose) if (!outCells.includes(cell)) pool.push(s.board[cell]!);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const board = [...s.board];
  loose.forEach((cell, i) => (board[cell] = pool[i]!));
  if (m === 0 && loose.every((cell) => board[cell] === s.board[cell])) return null;
  return { shuffle: true, board, stacks };
}
