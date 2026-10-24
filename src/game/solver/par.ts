// THE PAR LINE: the shortest winning line the solver can find, in real moves,
// for a board's optional par. Pure and deterministic; run offline (by the
// level makers), never while a player waits.
//
// A beam search over the exact abstract game (abstract.ts). Every abstract
// step deals a card or clears a picture, so (cards dealt + pictures cleared)
// grows along any line and the positions fall into layers. Layer by layer, the
// most promising real states are kept (moves so far plus half the loose cards
// on the board; at most `width` per layer, `perKey` per abstract position, so
// the beam stays varied); each is carried on by every
// winning step, in each way the realiser knows (realise.ts), and the results
// land in later layers. What reaches the won layer cheapest is the par line.
//
// It is the solver's best, not a proof of the best: a player may find a
// shorter line. Measured on the 30 campaign boards: the stored lines total 676
// moves; this finds 565 at width 12, 506 at the default 160 (about 0.6 s a
// board) and 494 at 600, so the default is within a few per cent of what a far
// wider search finds. The answer is never longer than the solver's own line
// (solveDeal), and it is replayed on the real rules before it is returned.

import { isWon, pieces, replay, start, type Deal, type Move, type State } from "../rules.ts";
import { Game, OutOfBudget, type Step } from "./abstract.ts";
import { solveDeal, type Line } from "./index.ts";
import { realisations } from "./realise.ts";

export interface ParOptions {
  /** Real states kept per layer. */
  width?: number;
  /** Real states kept per abstract position. */
  perKey?: number;
  /** Ways tried per step (the cheapest first). */
  ways?: number;
}

interface Entry {
  s: State;
  g: number;
  /** g plus a guess at the moves still to come (loose cards on the board, halved: a swap can place two). */
  f: number;
  key: number;
  prev: Entry | null;
  seg: Move[];
  step: Step | null;
}

const popcount = (m: number) => {
  let n = 0;
  for (; m; m &= m - 1) n++;
  return n;
};

/** Cards on the board not joined to any other. */
const loose = (s: State) => {
  const ps = pieces(s);
  let n = 0;
  for (const p of ps.list) if (p.length === 1) n++;
  return n;
};
/** Weight of the loose cards in the ranking (0.5 measured best on the campaign: 0, 0.5, 0.75, 1 and 2 tried). */
const H = 0.5;

/** Board cells and stack sizes: two states alike in these play the same from here. */
const sig = (s: State) => `${s.board.join(",")}|${s.stacks.map((st) => st.length).join(",")}`;

/**
 * The par line of a deal: the fewest real moves the solver finds to win it
 * with no helpers. Null when the deal is not proved winnable (out of budget,
 * or lost): such a deal never ships.
 */
export function parLine(deal: Deal, opts: ParOptions = {}): Line | null {
  const width = opts.width ?? 160;
  const perKey = opts.perKey ?? 8;
  const waysPer = opts.ways ?? 30;
  const base = solveDeal(deal);
  if (!("win" in base)) return null;
  const s0 = start(deal).state;
  const game = new Game(s0);
  let best: Entry | null = null;
  try {
    const level = (key: number) => {
      const n = game.decode(key);
      return n.ptr.reduce((a, b) => a + b, 0) + popcount(n.mask);
    };
    const layers: Entry[][] = [];
    const put = (e: Entry) => {
      const L = level(e.key);
      (layers[L] ??= []).push(e);
    };
    put({ s: s0, g: 0, f: 0, key: game.key(game.root), prev: null, seg: [], step: null });
    for (let L = 0; L < layers.length; L++) {
      const here = layers[L];
      if (!here) continue;
      layers[L] = [];
      // the cheapest, one per real state, at most perKey per abstract position
      here.sort((a, b) => a.f - b.f || a.g - b.g);
      const seen = new Set<string>();
      const perPos = new Map<number, number>();
      const kept: Entry[] = [];
      for (const e of here) {
        if (kept.length >= width) break;
        const k = sig(e.s);
        if (seen.has(k)) continue;
        if ((perPos.get(e.key) ?? 0) >= perKey) continue;
        seen.add(k);
        perPos.set(e.key, (perPos.get(e.key) ?? 0) + 1);
        kept.push(e);
      }
      for (const e of kept) {
        if (isWon(e.s)) {
          if (!best || e.g < best.g) best = e;
          continue;
        }
        if (best && e.g >= best.g) continue;
        for (const o of game.winning(game.nodeOf(e.s))) {
          let tried = 0;
          const done = new Set<string>();
          // shallow ways first; a step with none is tried after one rearranging move
          for (const deep of [false, true]) {
            if (deep && tried) break;
            for (const r of realisations(e.s, o.step, deep)) {
              const n = game.nodeOf(r.state);
              const k = game.key(n);
              if (!game.wins(n, k)) continue;
              const rs = sig(r.state);
              if (done.has(rs)) continue;
              done.add(rs);
              put({ s: r.state, g: e.g + r.moves.length, f: e.g + r.moves.length + H * loose(r.state), key: k, prev: e, seg: r.moves, step: o.step });
              if (++tried >= waysPer) break;
            }
          }
        }
      }
    }
  } catch (err) {
    if (!(err instanceof OutOfBudget)) throw err;
    best = null;
  }
  if (!best || best.g >= base.win.moves.length) return base.win;
  const moves: Move[] = [];
  const steps: Step[] = [];
  for (let e: Entry | null = best; e && e.prev; e = e.prev) {
    moves.unshift(...e.seg);
    steps.unshift(e.step!);
  }
  if (!isWon(replay(deal, moves))) throw new Error("par: a line did not replay to a win");
  return { moves, steps };
}
