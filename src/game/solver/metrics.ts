// What a deal asks of the player, measured on the exact abstract game
// (abstract.ts). The generator tunes deals on these, each on its own axis.
//
// - CARELESS: the chance that a player who never plans ahead still wins. At
//   each position they clear some finished picture if there is one (any, at any
//   place), else draw from any stack, each choice equally likely. Exact, not
//   sampled. 1 means nothing can go wrong; 0.3 means most careless games die.
// - TRAPS: along the stored winning line, how many of its steps had another
//   choice that dooms the board. Relief boards have few.
// - CHAIN: the longest run of clears that depend on one another that the
//   player cannot avoid. A clear depends on an earlier one when one of its
//   cards only reached the board because of it: the earlier clear dealt it, or
//   made the room that a draw brought it in through. A picture whose cards are
//   all in the opening deal has depth 1; one that needs a depth-1 clear first
//   has depth 2; and so on. A deal's chain is the smallest, over every winning
//   line, of that line's deepest clear. 1 means every picture can be finished
//   from the opening alone.
// - WAIT (the challenge route's "big pictures need room"): for each picture,
//   the fewest other clears any winning line makes before it. The board opens
//   full, so a picture not wholly in the opening deal waits for at least one;
//   a big picture whose cards sit deep in the stacks waits for several small
//   ones to make room for it.
// - ORDER TRAPS (the challenge route's "clear order matters"): positions
//   where finishing some ready picture (or finishing it at the wrong place)
//   would doom the board. `orderTraps` counts them along one line;
//   `unavoidable` gives the fewest that ANY winning line passes, a measure
//   of the deal whichever way the player goes.

import { move, start, type Deal, type Move } from "../rules.ts";
import type { Game, Node, Step } from "./abstract.ts";

/** The careless player's chance of winning from the root. */
export function careless(game: Game): number {
  const memo = new Map<number, number>();
  const f = (n: Node, key: number): number => {
    const known = memo.get(key);
    if (known !== undefined) return known;
    let v: number;
    if (game.isWon(n)) v = 1;
    else {
      const opts = game.options(n);
      const clears = opts.filter((o) => o.step.kind === "clear");
      const pool = clears.length ? clears : opts;
      v = pool.length ? pool.reduce((sum, o) => sum + f(o.next, o.key), 0) / pool.length : 0;
    }
    memo.set(key, v);
    return v;
  };
  const r = game.root;
  return f(r, game.key(r));
}

/**
 * How many positions along a line (the abstract positions it passes through,
 * in order, as `along` lists them) offered a choice that dooms the board.
 */
export function traps(game: Game, nodes: readonly Node[]): number {
  let count = 0;
  for (const n of nodes) {
    if (game.isWon(n)) continue;
    if (game.options(n).some((o) => !game.wins(o.next, o.key))) count++;
  }
  return count;
}

/** How many positions along a line offered a CLEAR that dooms the board. */
export function orderTraps(game: Game, nodes: readonly Node[]): number {
  let count = 0;
  for (const n of nodes) {
    if (game.isWon(n)) continue;
    if (game.options(n).some((o) => o.step.kind === "clear" && !game.wins(o.next, o.key))) count++;
  }
  return count;
}

/**
 * The fewest positions with a dooming choice that any winning line passes:
 * any choice ("any", as `traps` counts) or a clear ("clear", as
 * `orderTraps` counts). Over the abstract steps, one position at a time.
 */
export function unavoidable(game: Game, kind: "any" | "clear"): number {
  const memo = new Map<number, number>();
  const f = (n: Node, k: number): number => {
    if (game.isWon(n)) return 0;
    const known = memo.get(k);
    if (known !== undefined) return known;
    const opts = game.options(n);
    const trap = opts.some((o) => (kind === "any" || o.step.kind === "clear") && !game.wins(o.next, o.key)) ? 1 : 0;
    let best = Infinity;
    for (const o of opts) if (game.wins(o.next, o.key)) best = Math.min(best, f(o.next, o.key));
    memo.set(k, trap + best);
    return trap + best;
  };
  const r = game.root;
  return f(r, game.key(r));
}

/**
 * Per picture, the fewest other clears any winning line makes before it
 * clears (see the top of this file). Every step deals a card or clears a
 * picture, so (cards dealt + pictures cleared) orders the positions; taking
 * them in that order, each one's fewest clears so far is final when it is
 * reached.
 */
export function wait(game: Game): number[] {
  const out = new Array<number>(game.nP).fill(Infinity);
  const level = (n: Node) => {
    let v = 0;
    for (const p of n.ptr) v += p;
    for (let m = n.mask; m; m &= m - 1) v++;
    return v;
  };
  const r = game.root;
  const layers: Map<number, { n: Node; d: number }>[] = [];
  const reach = (n: Node, k: number, d: number) => {
    const L = (layers[level(n)] ??= new Map());
    const known = L.get(k);
    if (!known || d < known.d) L.set(k, { n, d });
  };
  reach(r, game.key(r), 0);
  for (let i = 0; i < layers.length; i++) {
    for (const { n, d } of layers[i]?.values() ?? []) {
      for (const o of game.winning(n)) {
        if (o.step.kind === "clear") {
          out[o.step.pic] = Math.min(out[o.step.pic]!, d);
          reach(o.next, o.key, d + 1);
        } else reach(o.next, o.key, d);
      }
    }
  }
  return out;
}

/** The abstract positions a real line passes through from the deal, each once, in order. */
export function along(game: Game, deal: Deal, line: readonly Move[]): Node[] {
  let s = start(deal).state;
  const nodes = [game.nodeOf(s)];
  let last = game.key(nodes[0]!);
  for (const m of line) {
    const out = move(s, m);
    if (!out) throw new Error("metrics: a move of the line does nothing");
    s = out.state;
    const n = game.nodeOf(s);
    const k = game.key(n);
    if (k !== last) nodes.push(n);
    last = k;
  }
  return nodes;
}

const same = (a: Step, b: Step) =>
  a.kind === b.kind && a.col === b.col && (a.kind === "draw" || (b.kind === "clear" && a.pic === b.pic));

interface Ext {
  n: Node;
  /** Per picture: the deepest arrival among its cards on the board (0 = the opening deal). */
  depth: number[];
  /** Empty cells, counted by the depth of the clear that opened them. */
  room: number[];
}

/**
 * The deal's chain (see the top of this file), or null past `cap` positions
 * (then it proves nothing about the chain; the generator rejects the deal).
 * Asked as "is there a winning line whose clears all have depth <= D?" for
 * D = 1, 2, ...: the first yes is the chain. Each question prunes every
 * position where some picture already needs a deeper clear, which keeps the
 * search small even on a 5 x 6 board.
 */
export function chain(game: Game, cap = 300_000): number | null {
  try {
    for (let D = 1; D <= game.nP; D++) if (chainAtMost(game, D, cap)) return D;
    return null;
  } catch (err) {
    if (err instanceof CapReached) return null;
    throw err;
  }
}

/** Is there a winning line whose every clear has depth <= D? Throws CapReached past `cap` positions. */
function chainAtMost(game: Game, D: number, cap: number): boolean {
  const P = game.nP;
  const memo = new Map<string, boolean>();
  let visits = 0;
  const keyOf = (e: Ext, k: number) => `${k}|${e.depth.join(",")}|${e.room.join(",")}`;

  function g(e: Ext, k: number): boolean {
    if (game.isWon(e.n)) return true;
    // a picture with a card that arrived at depth D can only clear deeper than D
    for (let p = 0; p < P; p++) if (!(e.n.mask & (1 << p)) && e.depth[p]! >= D) return false;
    const mk = keyOf(e, k);
    const known = memo.get(mk);
    if (known !== undefined) return known;
    if (++visits > cap) throw new CapReached();
    let ok = false;
    for (const o of game.options(e.n)) {
      if (ok) break;
      if (!game.wins(o.next, o.key)) continue;
      if (o.step.kind === "clear") {
        const p = o.step.pic;
        const d = 1 + e.depth[p]!;
        if (d > D) continue;
        const depth = [...e.depth];
        depth[p] = 0;
        const room = grow(e.room, d);
        const pc = game.pcols[p]!;
        const pr = game.prows[p]!;
        for (let c = o.step.col; c < o.step.col + pc; c++) {
          if (game.isOpen(e.n, c)) {
            room[d]! += pr;
            continue;
          }
          const from = e.n.ptr[c]!;
          const to = o.next.ptr[c]!;
          for (let j = from; j < to; j++) {
            const q = game.stackPic[c]![j]!;
            depth[q] = Math.max(depth[q]!, d);
          }
          if (to === game.len[c]) room[d]! += pr - (to - from);
        }
        ok = g({ n: o.next, depth, room: trim(room) }, o.key);
      } else {
        const c = o.step.col;
        const q = game.stackPic[c]![e.n.ptr[c]!]!;
        // the drawn card comes in through room opened at some depth: try each depth there is
        for (let t = 0; t < e.room.length && !ok; t++) {
          if (!e.room[t]) continue;
          const room = [...e.room];
          room[t]!--;
          const depth = [...e.depth];
          depth[q] = Math.max(depth[q]!, t);
          ok = g({ n: o.next, depth, room: trim(room) }, o.key);
        }
      }
    }
    memo.set(mk, ok);
    return ok;
  }

  const r = game.root;
  const room0 = game.room(r);
  return g({ n: r, depth: new Array<number>(P).fill(0), room: room0 ? [room0] : [] }, game.key(r));
}

class CapReached extends Error {}

const grow = (room: number[], d: number) => {
  const out = [...room];
  while (out.length <= d) out.push(0);
  return out;
};
const trim = (room: number[]) => {
  let n = room.length;
  while (n && !room[n - 1]) n--;
  return n === room.length ? room : room.slice(0, n);
};

/** The chain of one given line (from the root), with each draw using the shallowest room. */
export function chainOf(game: Game, steps: readonly Step[]): number {
  let n = game.root;
  const depth = new Array<number>(game.nP).fill(0);
  let room: number[] = game.room(n) ? [game.room(n)] : [];
  let deepest = 0;
  for (const step of steps) {
    const o = game.options(n).find((o) => same(o.step, step));
    if (!o) throw new Error("metrics: a step that is not an option");
    if (step.kind === "clear") {
      const p = step.pic;
      const d = 1 + depth[p]!;
      deepest = Math.max(deepest, d);
      depth[p] = 0;
      room = grow(room, d);
      for (let c = step.col; c < step.col + game.pcols[p]!; c++) {
        if (game.isOpen(n, c)) {
          room[d]! += game.prows[p]!;
          continue;
        }
        const from = n.ptr[c]!;
        const to = o.next.ptr[c]!;
        for (let j = from; j < to; j++) depth[game.stackPic[c]![j]!] = Math.max(depth[game.stackPic[c]![j]!]!, d);
        if (to === game.len[c]) room[d]! += game.prows[p]! - (to - from);
      }
    } else {
      const t = room.findIndex((x) => x > 0);
      room[t]!--;
      const q = game.stackPic[step.col]![n.ptr[step.col]!]!;
      depth[q] = Math.max(depth[q]!, t);
    }
    n = o.next;
  }
  return deepest;
}
