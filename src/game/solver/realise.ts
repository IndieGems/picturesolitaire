// Turning one abstract step (abstract.ts) into real moves on the real rules
// (src/game/rules.ts). Pure and deterministic.
//
// CLEAR picture p over columns c0..: first every open column under p is built
// up to p's height by moving loose cards across from other open columns; then p
// is assembled on its target cells (the bottom rows, or any rows when every
// column under it is full) one card at a time: the card that belongs on target
// t is moved onto t. A lone card there is a plain swap; a card already joined to
// others of p brings that whole correct group onto its own targets in one move.
// Either way a card already on its target never moves again (the move only
// covers targets of cards not yet placed, and only vacates cells holding them),
// so the picture is finished in at most pc * pr moves and clears in place.
//
// DRAW from column c: a loose card of c is moved onto the lowest empty cell of
// an open column, and c's stack deals one into the gap.
//
// Every move is played on the real rules as it is chosen. A step whose moves
// would clear or deal anything it should not is dropped (the caller then tries
// another way, or another step), so what comes out is exactly what the rules do.

import { EMPTY, allMoves, joinCount, move, pieces, type Move, type State } from "../rules.ts";
import type { Step } from "./abstract.ts";

export interface Realised {
  moves: Move[];
  state: State;
}

const height = (s: State, c: number): number => {
  let h = 0;
  for (let r = s.rows - 1; r >= 0; r--) {
    if (s.board[r * s.cols + c] === EMPTY) break;
    h++;
  }
  return h;
};

const isOpen = (s: State, c: number) => s.stacks[c]!.length === 0;

/** Cells holding a card joined to no other. */
function loneCells(s: State): boolean[] {
  const ps = pieces(s);
  return ps.of.map((id) => id >= 0 && ps.list[id]!.length === 1);
}

const sameStacks = (a: State, b: State) => a.stacks.every((st, c) => st.length === b.stacks[c]!.length);

/**
 * Move one card from a donor open column onto the lowest empty cell of open
 * column `to`, with nothing cleared or dealt. Null if no loose card can go.
 */
function transfer(s: State, donors: number[], to: number): Realised | null {
  const lone = loneCells(s);
  const e = (s.rows - 1 - height(s, to)) * s.cols + to;
  for (const d of donors) {
    const h = height(s, d);
    // top card first: nothing above it falls
    for (let r = s.rows - h; r < s.rows; r++) {
      const x = r * s.cols + d;
      if (!lone[x]) continue;
      const out = move(s, { from: x, to: e });
      if (!out) continue;
      const t = out.state;
      if (t.cleared.length !== s.cleared.length || !sameStacks(s, t)) continue;
      if (height(t, to) !== height(s, to) + 1) continue;
      return { moves: [{ from: x, to: e }], state: t };
    }
  }
  return null;
}

/**
 * Assemble picture `pic` with its top-left card at (c0, r0) and let it clear.
 * Null if the open columns under it cannot be built up, or a move would clear
 * or deal anything before the picture itself.
 */
function clearAt(s: State, pic: number, c0: number, r0: number, loose: boolean): Realised | null {
  const { cols: pc, rows: pr } = s.pictures[pic]!;
  const W = s.cols;
  const moves: Move[] = [];
  const cleared = s.cleared.length;
  // 1. build up the open columns under the picture
  for (let c = c0; c < c0 + pc; c++) {
    if (!isOpen(s, c)) continue;
    while (height(s, c) < s.rows - r0) {
      const donors: number[] = [];
      for (let d = 0; d < W; d++) {
        if (!isOpen(s, d)) continue;
        const inSpan = d >= c0 && d < c0 + pc;
        if (inSpan ? height(s, d) > s.rows - r0 : height(s, d) > 0) donors.push(d);
      }
      const t = transfer(s, donors, c);
      if (!t) return null;
      moves.push(...t.moves);
      s = t.state;
    }
  }
  // 2. put each card of the picture on its target. Of the moves that bring a
  // card home (or send a card of the picture that sits on another's target to
  // its own), take the one that leaves the most cards placed: a swap of two
  // cards sitting on each other's targets places both at once.
  const base = pic * 32;
  const n = pc * pr;
  const target = (i: number) => (r0 + ((i / pc) | 0)) * W + c0 + (i % pc);
  const placed = (t: State) => {
    let k = 0;
    for (let i = 0; i < n; i++) if (t.board[target(i)] === base + i) k++;
    return k;
  };
  for (let guard = 0; guard <= n + (loose ? 6 : 0); guard++) {
    if (s.cleared.includes(pic)) return { moves, state: s };
    if (!loose && s.cleared.length > cleared) return null;
    const now = placed(s);
    let best: { m: Move; t: State; v: number } | null = null;
    for (let i = 0; i < n; i++) {
      const t = target(i);
      if (s.board[t] === base + i) continue;
      const from = s.board.indexOf(base + i);
      if (from < 0) return null;
      const tries: Move[] = [{ from, to: t }];
      // what sits on t is a card of the picture: sending it to where this card is may place both
      if (s.board[t] !== EMPTY && s.board[t]! >> 5 === pic) tries.push({ from: t, to: from });
      for (const m of tries) {
        const out = move(s, m);
        if (!out) continue;
        const done = out.state.cleared.includes(pic);
        // strictly, nothing else may clear or deal on the way; loosely it may (the caller judges the result)
        if (!done && !loose && (out.state.cleared.length !== cleared || !sameStacks(s, out.state))) continue;
        const v = done ? Infinity : placed(out.state);
        if (v > now && (!best || v > best.v)) best = { m, t: out.state, v };
      }
    }
    if (!best) return null;
    moves.push(best.m);
    s = best.t;
  }
  return s.cleared.includes(pic) ? { moves, state: s } : null;
}

/** Every way to carry out `step` that this realiser knows, cheapest first, as a lazy list. */
function* ways(s: State, step: Step, loose: boolean): Generator<Realised> {
  if (step.kind === "clear") {
    const { cols: pc, rows: pr } = s.pictures[step.pic]!;
    // at the bottom (open columns are built up to it), or higher where every
    // column under it is already tall enough; at every left column that
    // reaches the same position
    const found: Realised[] = [];
    for (const c0 of [step.col, ...(step.alts ?? [])]) {
      for (let r0 = s.rows - pr; r0 >= 0; r0--) {
        let tall = true;
        for (let c = c0; c < c0 + pc; c++) if (isOpen(s, c) && height(s, c) < s.rows - r0) tall = false;
        if (r0 !== s.rows - pr && !tall) continue;
        const r = clearAt(s, step.pic, c0, r0, loose);
        if (r) found.push(r);
      }
    }
    found.sort((a, b) => a.moves.length - b.moves.length);
    yield* found;
    return;
  }
  // a draw: a loose card of the column onto the room of an open column
  const lone = loneCells(s);
  const c = step.col;
  for (let to = 0; to < s.cols; to++) {
    if (!isOpen(s, to) || height(s, to) >= s.rows) continue;
    const e = (s.rows - 1 - height(s, to)) * s.cols + to;
    for (let r = 0; r < s.rows; r++) {
      const x = r * s.cols + c;
      if (!lone[x]) continue;
      const out = move(s, { from: x, to: e });
      if (!out) continue;
      const t = out.state;
      if (t.stacks[c]!.length !== s.stacks[c]!.length - 1) continue;
      if (t.stacks.some((st, k) => k !== c && st.length !== s.stacks[k]!.length)) continue;
      yield { moves: [{ from: x, to: e }], state: t };
    }
  }
}

/**
 * Every way this realiser knows to carry out `step` (strict ways, then loose
 * ones), cheapest first within each; with `deep`, then each after one
 * rearranging move. The par search (par.ts) picks among them; results may
 * repeat, and the caller judges each one.
 */
export function* realisations(s: State, step: Step, deep = false): Generator<Realised> {
  yield* ways(s, step, false);
  yield* ways(s, step, true);
  if (!deep) return;
  for (const { m, t } of preps(s)) {
    for (const r of ways(t, step, true)) yield { moves: [m, ...r.moves], state: r.state };
  }
}

/** Rearranging moves (nothing cleared or dealt), those that break the fewest joins first. */
function preps(s: State): { m: Move; t: State }[] {
  const out: { m: Move; t: State; j: number }[] = [];
  for (const m of allMoves(s)) {
    const o = move(s, m);
    if (!o) continue;
    const t = o.state;
    if (t.cleared.length !== s.cleared.length || !sameStacks(s, t)) continue;
    out.push({ m, t, j: joinCount(t) });
  }
  return out.sort((a, b) => b.j - a.j);
}

/**
 * Carry out `step` on the real board: the cheapest way whose result `accept`
 * takes. With `loose`, other pictures may clear (and stacks deal) on the way.
 * With `deep`, when no direct way works, one rearranging move first (a
 * move that clears and deals nothing) is tried, which unjoins a stuck card or
 * moves an accidental join away; that costs a few hundred trial moves, so
 * callers try every step shallow before any deep. Null if none of that works.
 */
export function realise(s: State, step: Step, accept: (t: State) => boolean, deep = true, loose = false): Realised | null {
  for (const r of ways(s, step, loose)) if (accept(r.state)) return r;
  if (!deep) return null;
  // one rearranging move, then the direct ways
  for (const { m, t } of preps(s)) {
    for (const r of ways(t, step, loose)) if (accept(r.state)) return { moves: [m, ...r.moves], state: r.state };
  }
  return null;
}
