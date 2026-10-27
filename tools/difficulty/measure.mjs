// The Difficulty editor's measures, taken on the game's own rules and solver (Node runs the .ts
// files directly). Read-only: nothing here writes, and nothing the win checker reads comes from here.
//
//   opening(level)   the board as it opens (cards in place) and each stack's waiting cards in order
//   careless(level)  the careless player's chance (metrics.ts), when the level data does not store it
//   reader(level)    the chance of a player who READS THE FACE-UP CARDS (the stacks' next card,
//                    as the board shows it on the creator's trial): like the careless player it
//                    finishes a picture whenever it can (any one), but when it must draw it takes
//                    the column whose face-up card is of the picture furthest along on the board;
//                    ties count as a coin toss. It never does worse than the careless player. A
//                    board where it wins no more often is one where looking does not help: what
//                    decides it is the hidden cards behind (Levels, 2026-10-27, on the creator's
//                    "rigged" feeling on boards 18-20). (Choosing WHICH picture to finish by the
//                    face-up cards was tried too: a fixed rule there is wrong every time on some
//                    boards, 0% on board 13, which says more about the rule than the board.)
//   safeStart(level) no first move leaves the board stuck, and no picture finishable at the
//                    opening dooms it if finished first (generate.ts; AGENTS.md "a safe start")
// Every one is exact on the abstract game (solver/abstract.ts), a few milliseconds a board.

import { start } from "../../src/game/rules.ts";
import { Game } from "../../src/game/solver/index.ts";
import { careless as carelessOf } from "../../src/game/solver/metrics.ts";
import { deadFirstMoves, doomingFirstClears } from "../../src/game/levels/generate.ts";

const dealOf = (l) => ({ cols: l.cols, rows: l.rows, pictures: l.pictures, stacks: l.stacks, seed: l.seed });

export function opening(l) {
  const s = start(dealOf(l)).state;
  return { cols: s.cols, rows: s.rows, board: s.board, stacks: s.stacks };
}

export function careless(l) {
  return carelessOf(new Game(start(dealOf(l)).state));
}

export function reader(l, depth = 1) {
  const g = new Game(start(dealOf(l)).state);
  /** Cards of each picture on the board at node n (-1: cleared). */
  const onOf = (n) => {
    const on = [...g.on0];
    n.ptr.forEach((k, c) => {
      for (let j = 0; j < k; j++) on[g.stackPic[c][j]]++;
    });
    for (let p = 0; p < g.nP; p++) if (n.mask & (1 << p)) on[p] = -1;
    return on;
  };
  /** How far along on the board a card's picture is, counting the card: 0 when none of it is there. */
  const worth = (on, p) => (on[p] > 0 ? (on[p] + 1) / g.size[p] : 0);
  /** The face-up cards a step brings down (the first `depth` of each column it deals from). */
  const seen = (n, step) => {
    const cols = step.kind === "clear" ? Array.from({ length: g.pcols[step.pic] }, (_, k) => step.col + k) : [step.col];
    const deals = step.kind === "clear" ? g.prows[step.pic] : 1;
    const out = [];
    for (const c of cols) for (let d = 0; d < Math.min(deals, depth); d++) if (n.ptr[c] + d < g.len[c]) out.push(g.stackPic[c][n.ptr[c] + d]);
    return step.kind === "clear" ? out.filter((p) => p !== step.pic) : out;
  };
  const memo = new Map();
  const f = (n, key) => {
    const known = memo.get(key);
    if (known !== undefined) return known;
    let v;
    if (g.isWon(n)) v = 1;
    else {
      const opts = g.options(n);
      const clears = opts.filter((o) => o.step.kind === "clear");
      let pool = clears.length ? clears : opts;
      if (!clears.length && pool.length > 1) {
        const on = onOf(n);
        const score = (o) => seen(n, o.step).reduce((s, p) => s + worth(on, p), 0);
        const best = Math.max(...pool.map(score));
        pool = pool.filter((o) => score(o) === best);
      }
      v = pool.length ? pool.reduce((sum, o) => sum + f(o.next, o.key), 0) / pool.length : 0;
    }
    memo.set(key, v);
    return v;
  };
  return f(g.root, g.key(g.root));
}

export function safeStart(l) {
  const deal = dealOf(l);
  const dead = deadFirstMoves(deal).length;
  const doom = doomingFirstClears(new Game(start(deal).state)).length;
  return { safe: !dead && !doom, deadFirstMoves: dead, doomingFirstClears: doom };
}
