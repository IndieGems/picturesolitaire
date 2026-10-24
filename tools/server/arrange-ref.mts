// The Shuffle helper's arrangement check, as agreed with the gameplay member
// (2026-10-24) and as the win checker ports it (functions/checker/src/rules.rs,
// `arrange`). A STAND-IN: once src/game/rules.ts exports its own `arrange`,
// tools/server/vectors.mts uses that one and this file only documents the rule.
//
// A shuffle action carries the arrangement straight after the mix, before the
// board settles: { shuffle: true, board, stacks }. It is legal when:
//   a. the board keeps its length, there are as many stacks, each keeps its length;
//   b. every cell that is not a loose card (empty, or in a joined piece) is
//      unchanged, and every loose cell still holds a card;
//   c. a stack place whose card changed now holds a card that was loose on the
//      board, and at most 4 places changed (RESCUE.maxSwaps);
//   d. the loose cells and the stacks hold the same cards before and after, each once;
//   e. something changed.
// Then the state is {...s, board, stacks, shuffles + 1}, settled.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { EMPTY, pieces, settle } from "../../src/game/rules.ts";

export const MAX_SWAPS = 4;

export function arrangeRef(s, a) {
  const { board, stacks } = a;
  if (!Array.isArray(board) || !Array.isArray(stacks)) return null;
  if (board.length !== s.board.length || stacks.length !== s.stacks.length) return null;
  if (stacks.some((st, i) => !Array.isArray(st) || st.length !== s.stacks[i].length)) return null;
  const loose = pieces(s).list.filter((p) => p.length === 1).map((p) => p[0]);
  const isLoose = new Set(loose);
  for (let c = 0; c < board.length; c++) {
    if (isLoose.has(c)) {
      if (board[c] === EMPTY) return null;
    } else if (board[c] !== s.board[c]) return null;
  }
  const looseCards = new Set(loose.map((c) => s.board[c]));
  let swapped = 0;
  for (let col = 0; col < stacks.length; col++)
    for (let at = 0; at < stacks[col].length; at++)
      if (stacks[col][at] !== s.stacks[col][at]) {
        if (!looseCards.has(stacks[col][at])) return null;
        swapped++;
      }
  if (swapped > MAX_SWAPS) return null;
  const before = [...loose.map((c) => s.board[c]), ...s.stacks.flat()].sort((x, y) => x - y);
  const after = [...loose.map((c) => board[c]), ...stacks.flat()].sort((x, y) => x - y);
  if (before.length !== after.length || before.some((c, i) => c !== after[i])) return null;
  if (after.some((c, i) => i > 0 && after[i - 1] === c)) return null;
  if (swapped === 0 && loose.every((c) => board[c] === s.board[c])) return null;
  const steps = [];
  const state = settle({ ...s, board: [...board], stacks: stacks.map((st) => [...st]), shuffles: s.shuffles + 1 }, steps);
  return { state, steps };
}
