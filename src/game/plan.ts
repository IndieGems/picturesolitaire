// A planner over the rules (src/game/rules.ts): finds a way to win from any
// state, without helpers, and says the next move along it. It proves the first
// campaign deals winnable (tools/make-campaign.mts) and drives the Hint helper.
// Pure and deterministic, like the rules.
//
// It plans over an ABSTRACT state, because where cards sit on a full board
// does not matter: any card can be swapped anywhere (a lone card dropped on a
// piece breaks off just the card it covers). What matters is which cards are
// on the board and which are still in the stacks:
//
// - A column whose stack still holds cards is always full (the board refills
//   it). Only columns with an empty stack, "open" columns, can have gaps, and
//   their cards can be shuffled between them freely, so only their total
//   counts.
// - CLEAR picture P at columns c..c+P.cols-1: possible when all of P is on the
//   board and the open columns among those hold P.rows cards each (P is built
//   at the bottom). Those columns each lose P.rows cards and refill from their
//   own stacks.
// - DRAW from column A: while an open column has room, moving a lone card of A
//   into it makes A's stack deal one.
//
// A depth-first search over those, remembering dead states, finds a line; the
// line is then carried out move by move on the real board (`nextMove`).

import { EMPTY, allMoves, joinCount, move, picOf, pieces, sizeOf, type Move, type State } from "./rules.ts";

export type Step = { kind: "clear"; pic: number; col: number } | { kind: "draw"; col: number };

export type Plan =
  /** A way to win, as abstract steps from this state. */
  | { win: Step[] }
  /** The search covered every possibility: this board cannot be won from here. */
  | { doomed: true }
  /** The search ran out of budget before deciding. Proves nothing. */
  | { unknown: true };

interface Node {
  ptr: number[];
  open: number;
  mask: number;
  on: number[];
}

class OutOfBudget extends Error {}

/** Search for a winning line from `s`. `budget` caps the states visited. */
export function plan(s: State, budget = 250_000): Plan {
  const H = s.rows;
  const W = s.cols;
  const P = s.pictures;
  const all = (1 << P.length) - 1;
  const len = s.stacks.map((st) => st.length);
  const isOpen = (n: Node, c: number) => n.ptr[c] === len[c];
  const height = (c: number) => {
    let h = 0;
    for (let r = 0; r < H; r++) if (s.board[r * W + c] !== EMPTY) h++;
    return h;
  };

  const on = new Array<number>(P.length).fill(0);
  for (const c of s.board) if (c !== EMPTY) on[picOf(c)]!++;
  let mask = 0;
  for (const p of s.cleared) mask |= 1 << p;
  let open = 0;
  for (let c = 0; c < W; c++) if (len[c] === 0) open += height(c);
  const root: Node = { ptr: new Array(W).fill(0), open, mask, on };

  const dead = new Set<string>();
  let nodes = 0;
  const key = (n: Node) => `${n.ptr.join(",")}|${n.open}|${n.mask}`;

  const deal = (n: Node, c: number, k: number) => {
    for (let j = 0; j < k; j++) n.on[picOf(s.stacks[c]![n.ptr[c]! + j]!)]!++;
    n.ptr[c]! += k;
  };

  function options(n: Node): [Step, Node][] {
    const out: [Step, Node][] = [];
    const seen = new Set<string>();
    for (let pic = 0; pic < P.length; pic++) {
      if (n.mask & (1 << pic) || n.on[pic] !== sizeOf(P, pic)) continue;
      const { cols: pc, rows: pr } = P[pic]!;
      for (let c0 = 0; c0 + pc <= W; c0++) {
        let openT = 0;
        for (let c = c0; c < c0 + pc; c++) if (isOpen(n, c)) openT++;
        if (n.open < pr * openT) continue;
        const m: Node = { ptr: [...n.ptr], open: n.open - pr * openT, mask: n.mask | (1 << pic), on: [...n.on] };
        m.on[pic] = 0;
        for (let c = c0; c < c0 + pc; c++) {
          if (isOpen(n, c)) continue;
          const k = Math.min(pr, len[c]! - n.ptr[c]!);
          deal(m, c, k);
          if (m.ptr[c] === len[c]) m.open += H - pr + k;
        }
        const k = key(m);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push([{ kind: "clear", pic, col: c0 }, m]);
      }
    }
    let openCols = 0;
    for (let c = 0; c < W; c++) if (isOpen(n, c)) openCols++;
    if (n.open < H * openCols) {
      const draws: [Step, Node, number][] = [];
      for (let c = 0; c < W; c++) {
        if (isOpen(n, c)) continue;
        const m: Node = { ptr: [...n.ptr], open: n.open + 1, mask: n.mask, on: [...n.on] };
        const card = s.stacks[c]![n.ptr[c]!]!;
        deal(m, c, 1);
        if (m.ptr[c] === len[c]) m.open += H;
        // draw first what brings a picture closest to whole
        const pic = picOf(card);
        draws.push([{ kind: "draw", col: c }, m, sizeOf(P, pic) - m.on[pic]!]);
      }
      draws.sort((a, b) => a[2] - b[2]);
      for (const [st, m] of draws) out.push([st, m]);
    }
    return out;
  }

  function search(n: Node, line: Step[]): boolean {
    if (n.mask === all) return true;
    const k = key(n);
    if (dead.has(k)) return false;
    if (++nodes > budget) throw new OutOfBudget();
    for (const [st, m] of options(n)) {
      line.push(st);
      if (search(m, line)) return true;
      line.pop();
    }
    dead.add(k);
    return false;
  }

  const line: Step[] = [];
  try {
    return search(root, line) ? { win: line } : { doomed: true };
  } catch (err) {
    if (err instanceof OutOfBudget) return { unknown: true };
    throw err;
  }
}

// ---------------------------------------------------------------- carrying a step out
//
// A step is carried out by trying every real move and keeping the one that
// gets furthest toward it, without changing anything the plan depends on (no
// stack deals unless the step is that draw, no other picture clears). Each
// move must make progress, so carrying a step out always ends.

/** The next real move toward `step`, or null if this planner cannot see one. */
export function realise(s: State, step: Step): Move | null {
  const W = s.cols;
  const H = s.rows;
  const lengths = s.stacks.map((st) => st.length);
  const loose = (t: State) => pieces(t).list.filter((p) => p.length === 1).length;
  const height = (t: State, c: number) => {
    let h = 0;
    for (let r = 0; r < H; r++) if (t.board[r * W + c] !== EMPTY) h++;
    return h;
  };
  const sameStacks = (t: State, except = -1) =>
    t.stacks.every((st, c) => st.length === lengths[c]! - (c === except ? 1 : 0));

  // Score a result, or return null if it breaks the plan.
  let score: (t: State) => number | null;
  if (step.kind === "draw") {
    score = (t) => {
      if (t.cleared.length !== s.cleared.length) return null;
      if (sameStacks(t, step.col)) return 1000 + joinCount(t);
      return sameStacks(t) ? 0 : null;
    };
  } else {
    const { cols: pc, rows: pr } = s.pictures[step.pic]!;
    const target = (x: number, y: number) => (H - pr + y) * W + step.col + x;
    score = (t) => {
      if (t.cleared.length === s.cleared.length + 1 && t.cleared.at(-1) === step.pic) {
        return sameStacks(t) || t.stacks.every((st, c) => st.length <= lengths[c]!) ? 1e6 : null;
      }
      if (t.cleared.length !== s.cleared.length || !sameStacks(t)) return null;
      // cards of the picture on their own cells, and the open columns under it filled to its height
      let placed = 0;
      for (let y = 0; y < pr; y++) for (let x = 0; x < pc; x++) if (t.board[target(x, y)] === step.pic * 32 + y * pc + x) placed++;
      let level = 0;
      for (let c = step.col; c < step.col + pc; c++) level += lengths[c] === 0 ? Math.min(height(t, c), pr) : pr;
      return placed * 100 + level * 10;
    };
  }

  const now = score(s) ?? 0;
  const nowLoose = loose(s);
  let best: Move | null = null;
  let bestScore = now;
  let bestTie = -Infinity;
  let prep: Move | null = null;
  let prepLoose = nowLoose;
  for (const m of allMoves(s)) {
    const out = move(s, m);
    if (!out) continue;
    const v = score(out.state);
    if (v === null) continue;
    // among equal scores, the move that keeps the most joins (the least disturbance)
    const tie = joinCount(out.state);
    if (v > bestScore || (v === bestScore && v > now && tie > bestTie)) {
      best = m;
      bestScore = v;
      bestTie = tie;
    } else if (v === now && !best) {
      // no progress, but frees a card that a later move can use
      const l = loose(out.state);
      if (l > prepLoose) {
        prep = m;
        prepLoose = l;
      }
    }
  }
  return best ?? prep;
}

/** The next move along a winning line from `s`, if the planner can find one. */
export function nextMove(s: State, budget?: number): { move: Move } | { doomed: true } | { unknown: true } {
  const p = plan(s, budget);
  if (!("win" in p)) return p;
  const step = p.win[0];
  if (!step) return { unknown: true };
  const m = realise(s, step);
  return m ? { move: m } : { unknown: true };
}

/**
 * Play a whole winning line from `s` with no helpers, move by move on the
 * real rules. Null if the planner can't finish (a deal it cannot prove).
 */
export function solve(s: State, maxMoves = 400): Move[] | null {
  const line: Move[] = [];
  for (let i = 0; i < maxMoves; i++) {
    if (s.board.every((c) => c === EMPTY) && s.stacks.every((st) => st.length === 0)) return line;
    const next = nextMove(s);
    if (!("move" in next)) return null;
    const out = move(s, next.move);
    if (!out) return null;
    line.push(next.move);
    s = out.state;
  }
  return null;
}
