// The Difficulty editor's measures, taken on the game's own rules and solver (Node runs the .ts
// files directly). Read-only: nothing here writes, and nothing the win checker reads comes from here.
//
//   opening(level)   the board as it opens (cards in place) and each stack's waiting cards in order
//   careless(level)  the careless player's chance (metrics.ts), when the level data does not store it
//   reader(level)    the chance of a player who draws by the face-up cards (metrics.ts READER,
//                    the measure the makers and check.mts hold unmarked boards to: READABLE)
//   safeStart(level) no first move leaves the board stuck, and no picture finishable at the
//                    opening dooms it if finished first (generate.ts; AGENTS.md "a safe start")
// Every one is exact on the abstract game (solver/abstract.ts), a few milliseconds a board.

import { start } from "../../src/game/rules.ts";
import { Game } from "../../src/game/solver/index.ts";
import { careless as carelessOf, reader as readerOf } from "../../src/game/solver/metrics.ts";
import { deadFirstMoves, doomingFirstClears } from "../../src/game/levels/generate.ts";

const dealOf = (l) => ({ cols: l.cols, rows: l.rows, pictures: l.pictures, stacks: l.stacks, seed: l.seed });

export function opening(l) {
  const s = start(dealOf(l)).state;
  return { cols: s.cols, rows: s.rows, board: s.board, stacks: s.stacks };
}

export function careless(l) {
  return carelessOf(new Game(start(dealOf(l)).state));
}

export function reader(l) {
  return readerOf(new Game(start(dealOf(l)).state));
}

export function safeStart(l) {
  const deal = dealOf(l);
  const dead = deadFirstMoves(deal).length;
  const doom = doomingFirstClears(new Game(start(deal).state)).length;
  return { safe: !dead && !doom, deadFirstMoves: dead, doomingFirstClears: doom };
}
