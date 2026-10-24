// THE SOLVER: proves a deal winnable with no helpers and hands out the winning
// line, as moves the real rules replay to a win. Also the Hint helper's next
// move from any position. Pure and deterministic.
//
// It searches the abstract game completely (abstract.ts), then carries the
// line out step by step on the real rules (realise.ts), backtracking to
// another winning step if a step cannot be carried out. A line is only ever
// returned after the real rules have played it to a win, and that line is the
// proof: an abstract "winning" alone is not (abstract.ts says why).
//
// The three answers, and what they mean:
//   { win }      a line that the real rules replay to a win;
//   { doomed }   the abstract game is lost from here, so no real line exists;
//   { unknown }  the search ran out of budget, or no winning abstract line
//                could be carried out (rarely, because the real board is lost
//                after all). PROVES NOTHING: a generator rejects such a deal,
//                it never calls it unwinnable.

import { isWon, replay, start, type Deal, type Move, type State } from "../rules.ts";
import { Game, OutOfBudget, type Option, type Step } from "./abstract.ts";
import { realise, type Realised } from "./realise.ts";

export { Game, OutOfBudget } from "./abstract.ts";
export type { Node, Option, Step } from "./abstract.ts";

export interface Line {
  /** The real moves, from the position given to a won board. */
  moves: Move[];
  /** The abstract steps they carry out, in order (one clear or draw each). */
  steps: Step[];
}

export type Answer = { win: Line } | { doomed: true } | { unknown: true };

/** Options from the position, best first for a player to follow: clears, then draws. */
function ranked(game: Game, s: State): Option[] {
  const opts = game.winning(game.nodeOf(s));
  const clears = opts.filter((o) => o.step.kind === "clear");
  return clears.length ? [...clears, ...opts.filter((o) => o.step.kind === "draw")] : opts;
}

/**
 * How hard to try, in order: STRICT takes only the planned position, else any
 * result that is still winning (a refill that finishes another picture by
 * chance, say); DEEP also tries one rearranging move first, which costs a few
 * hundred trial moves, so it comes last.
 */
const PASSES = [
  { strict: true, deep: false },
  { strict: false, deep: false },
  { strict: true, deep: true },
  { strict: false, deep: true },
];
type Pass = (typeof PASSES)[number];

/** Carry `o` out on `s`, the cheapest way this pass allows. */
function carry(game: Game, s: State, o: Option, pass: Pass): Realised | null {
  return realise(
    s,
    o.step,
    (t) => {
      const n = game.nodeOf(t);
      const k = game.key(n);
      return pass.strict ? k === o.key : game.wins(n, k);
    },
    pass.deep,
    !pass.strict,
  );
}

/** The winning steps this pass can carry out now, best first: clears, then fewest moves. */
function bestStep(game: Game, s: State, pass: Pass): { o: Option; r: Realised }[] {
  const out: { o: Option; r: Realised }[] = [];
  for (const o of ranked(game, s)) {
    const r = carry(game, s, o, pass);
    if (r) out.push({ o, r });
  }
  // clears first (stable), then by moves needed
  out.sort((a, b) => {
    const ka = a.o.step.kind === "clear" ? 0 : 1;
    const kb = b.o.step.kind === "clear" ? 0 : 1;
    return ka - kb || a.r.moves.length - b.r.moves.length;
  });
  return out;
}

/** A whole winning line from `s` (a state reached from `game`'s root), or null. */
function lineFrom(game: Game, s: State, tries = { left: 2000 }): Line | null {
  if (isWon(s)) return { moves: [], steps: [] };
  if (!game.wins(game.nodeOf(s))) return null;
  for (const pass of PASSES) {
    for (const { o, r } of bestStep(game, s, pass)) {
      if (--tries.left < 0) return null;
      const rest = lineFrom(game, r.state, tries);
      if (rest) return { moves: [...r.moves, ...rest.moves], steps: [o.step, ...rest.steps] };
    }
  }
  return null;
}

/** Solve from a position: a winning line, doomed, or unknown (proves nothing). */
export function solveFrom(s: State, budget?: number): Answer {
  const game = new Game(s, budget);
  try {
    if (!game.wins(game.root)) return { doomed: true };
    const line = lineFrom(game, s);
    return line ? { win: line } : { unknown: true };
  } catch (err) {
    if (err instanceof OutOfBudget) return { unknown: true };
    throw err;
  }
}

/**
 * Solve a deal from its opening, and check the line on the real rules: it is
 * returned only if `replay` plays it from the deal to a won board.
 */
export function solveDeal(deal: Deal, budget?: number): Answer {
  const a = solveFrom(start(deal).state, budget);
  if ("win" in a && !isWon(replay(deal, a.win.moves))) throw new Error("solver: a line did not replay to a win");
  return a;
}

/**
 * The Hint helper's answer from `s`:
 *   { move, line }  the first move of `line`, a whole line that the real rules
 *                   play from `s` to a won board (each step was played on them
 *                   as it was found), so a hint never leads off a win. Follow
 *                   `line` for later hints while the player stays on it.
 *   { doomed }      CERTAIN: no line wins from here (the abstract game is a
 *                   relaxation of the real one, abstract.ts), so "can't be won
 *                   now: Undo or Restart" is true.
 *   { unknown }     no line found within the budget: proves nothing either way,
 *                   so say "no hint found", never "can't be won".
 * `budget` caps the abstract positions visited. Measured by
 * tools/levels/hint-cost.mts on 4,800 positions of play over every shipped
 * board: 4x5 median 0.6 ms, max 6 ms; 5x6 median 6 ms, max 23 ms; every line
 * won. tools/levels/exactness.mts checks "doomed" against the real rules at
 * every position of small boards (25,000 positions, none wrong).
 */
export function nextMove(s: State, budget = 200_000): { move: Move; line: Move[] } | { doomed: true } | { unknown: true } {
  if (isWon(s)) return { unknown: true };
  const game = new Game(s, budget);
  try {
    if (!game.wins(game.root)) return { doomed: true };
    const line = lineFrom(game, s);
    return line && line.moves.length ? { move: line.moves[0]!, line: line.moves } : { unknown: true };
  } catch (err) {
    if (err instanceof OutOfBudget) return { unknown: true };
    throw err;
  }
}
