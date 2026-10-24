// THE ABSTRACT GAME the solver reasons over (src/game/solver/). Pure and
// deterministic, like the rules it abstracts (src/game/rules.ts).
//
// Where cards sit does not matter, only which cards are on the board:
//
// - A column whose stack still holds cards is always full (every gap refills),
//   so on such a column only WHICH cards are there counts: any lone card swaps
//   with any other card, and a correctly joined group of a picture can be slid
//   onto its own cells in one move (realise.ts).
// - A column whose stack is empty is OPEN. Its cards rest at the bottom and can
//   be moved to any other open column with room, so only the TOTAL number of
//   cards in open columns counts ("open").
//
// So a position is (ptr, mask): how many cards each stack has dealt since the
// root position, and which pictures are cleared. Everything else follows: the
// cards on the board are the root's plus those dealt, minus the cleared
// pictures; and open = cards on board - rows * (columns whose stack is not
// empty). That makes the whole space a few thousand positions on a 4 x 5
// board (about ten thousand on 5 x 6), small enough to search completely.
// (A budget exists anyway; running out of it is reported as `unknown`, never
// as doomed.)
//
// Two kinds of step:
//
// - CLEAR picture p (cols pc x rows pr) over columns c0..c0+pc-1: allowed when
//   all of p is on the board and the open columns among those can each be built
//   up to pr cards (open >= pr * open columns in the span). p is assembled at the
//   bottom, cleared; its open columns lose pr cards; its other columns each deal
//   min(pr, cards left) from their stacks.
// - DRAW from column c (its stack not empty): allowed while some open column has
//   room. A card of c moves into that room, and c's stack deals one.
//
// Every step either deals a card or clears a picture, so the positions form a
// DAG and a memoised depth-first search decides them all.
//
// What the abstraction gives up, and why it is still safe: any real move
// either changes nothing abstract (a rearrangement), deals (a draw), or
// clears, and assembling a picture higher than the bottom, or clearing two at
// once, never reaches a position the steps above cannot. So every real line is
// an abstract line, and a DOOMED answer is sound: the real board is lost too.
// The reverse can fail, rarely: the abstract game ignores where dealt cards
// land, so when a clear deals cards that finish another picture on their own
// (two halves of a 2x1 dealt side by side into the top row, say), the real
// board clears it at once while the abstract game counts that clear as
// optional. A WINNING answer is therefore only a strong guess (1 position in
// ~360 random 4 x 5 positions disagreed); the solver (index.ts) trusts it only
// once the realiser has carried a line out and the real rules replayed it.
// The measures (metrics.ts) are taken on this abstract game and share its
// rare optimism. The realiser (realise.ts) turns each step into real moves,
// and every line the solver hands out is replayed on the real rules before it
// is trusted.

import { EMPTY, picOf, type State } from "../rules.ts";

export type Step =
  /** Clear `pic` with its left edge on column `col`; `alts`: other left columns reaching the same position. */
  | { kind: "clear"; pic: number; col: number; alts?: number[] }
  | { kind: "draw"; col: number };

/** An abstract position: cards dealt from each stack since the root, and the cleared pictures. */
export interface Node {
  ptr: number[];
  mask: number;
}

export interface Option {
  step: Step;
  next: Node;
  key: number;
}

export class OutOfBudget extends Error {
  constructor() {
    super("the abstract search ran out of budget");
  }
}

export class Game {
  readonly W: number;
  readonly H: number;
  readonly nP: number;
  /** Each picture's size in cards, columns and rows. */
  readonly size: number[];
  readonly pcols: number[];
  readonly prows: number[];
  /** Cards left in each stack at the root. */
  readonly len: number[];
  /** The picture of each card left in each stack at the root, in dealing order. */
  readonly stackPic: number[][];
  /** Cards of each picture on the board at the root. */
  readonly on0: number[];
  /** Cards on the board at the root. */
  readonly board0: number;
  /** Pictures already cleared at the root. */
  readonly mask0: number;
  readonly all: number;
  /** key = mask + sum(ptr[c] * mult[c]). */
  private readonly mult: number[];
  /** Win (1) or doomed (0), by key: filled lazily by `wins`. */
  private readonly memo = new Map<number, number>();
  /** Positions decided so far (the budget counts these). */
  visited = 0;
  budget: number;

  constructor(root: State, budget = 2_000_000) {
    this.W = root.cols;
    this.H = root.rows;
    this.nP = root.pictures.length;
    if (this.nP > 30) throw new Error("too many pictures for the abstract key");
    this.size = root.pictures.map((p) => p.cols * p.rows);
    this.pcols = root.pictures.map((p) => p.cols);
    this.prows = root.pictures.map((p) => p.rows);
    this.len = root.stacks.map((st) => st.length);
    this.stackPic = root.stacks.map((st) => st.map(picOf));
    this.on0 = new Array<number>(this.nP).fill(0);
    let n = 0;
    for (const c of root.board) {
      if (c === EMPTY) continue;
      this.on0[picOf(c)]!++;
      n++;
    }
    this.board0 = n;
    let mask = 0;
    for (const p of root.cleared) mask |= 1 << p;
    this.mask0 = mask;
    this.all = this.nP === 30 ? 0x3fffffff : (1 << this.nP) - 1;
    this.mult = [];
    let m = 2 ** this.nP;
    for (let c = 0; c < this.W; c++) {
      this.mult.push(m);
      m *= this.len[c]! + 1;
    }
    if (m > Number.MAX_SAFE_INTEGER) throw new Error("board too big for the abstract key");
    this.budget = budget;
  }

  get root(): Node {
    return { ptr: new Array<number>(this.W).fill(0), mask: this.mask0 };
  }

  key(n: Node): number {
    let k = n.mask;
    for (let c = 0; c < this.W; c++) k += n.ptr[c]! * this.mult[c]!;
    return k;
  }

  decode(key: number): Node {
    const mask = key % 2 ** this.nP;
    let rest = (key - mask) / 2 ** this.nP;
    const ptr: number[] = [];
    for (let c = 0; c < this.W; c++) {
      const r = this.len[c]! + 1;
      ptr.push(rest % r);
      rest = Math.floor(rest / r);
    }
    return { ptr, mask };
  }

  /** The abstract position of a real state reached from the root. */
  nodeOf(s: State): Node {
    let mask = 0;
    for (const p of s.cleared) mask |= 1 << p;
    return { ptr: s.stacks.map((st, c) => this.len[c]! - st.length), mask };
  }

  isOpen(n: Node, c: number): boolean {
    return n.ptr[c] === this.len[c];
  }

  /** Cards of each picture on the board (0 for a cleared one). */
  on(n: Node): number[] {
    const on = [...this.on0];
    for (let c = 0; c < this.W; c++) {
      const pics = this.stackPic[c]!;
      for (let k = 0; k < n.ptr[c]!; k++) on[pics[k]!]!++;
    }
    for (let p = 0; p < this.nP; p++) if (n.mask & (1 << p)) on[p] = 0;
    return on;
  }

  /** Cards in open columns. */
  open(n: Node): number {
    let cards = this.board0;
    for (let c = 0; c < this.W; c++) cards += n.ptr[c]!;
    for (let p = 0; p < this.nP; p++) if (n.mask & (1 << p) && !(this.mask0 & (1 << p))) cards -= this.size[p]!;
    let full = 0;
    for (let c = 0; c < this.W; c++) if (!this.isOpen(n, c)) full++;
    return cards - this.H * full;
  }

  /** Empty cells on the board (all in open columns). */
  room(n: Node): number {
    let openCols = 0;
    for (let c = 0; c < this.W; c++) if (this.isOpen(n, c)) openCols++;
    return this.H * openCols - this.open(n);
  }

  isWon(n: Node): boolean {
    return n.mask === this.all;
  }

  /** Every step from `n`, one per distinct resulting position: clears first, then draws. */
  options(n: Node): Option[] {
    const out: Option[] = [];
    const seen = new Map<number, Option>();
    const on = this.on(n);
    const open = this.open(n);
    for (let p = 0; p < this.nP; p++) {
      if (n.mask & (1 << p) || on[p] !== this.size[p]) continue;
      const pc = this.pcols[p]!;
      const pr = this.prows[p]!;
      if (pr > this.H || pc > this.W) continue;
      for (let c0 = 0; c0 + pc <= this.W; c0++) {
        let openT = 0;
        for (let c = c0; c < c0 + pc; c++) if (this.isOpen(n, c)) openT++;
        if (open < pr * openT) continue;
        const ptr = [...n.ptr];
        for (let c = c0; c < c0 + pc; c++) if (!this.isOpen(n, c)) ptr[c] = Math.min(this.len[c]!, ptr[c]! + pr);
        const next = { ptr, mask: n.mask | (1 << p) };
        const key = this.key(next);
        const same = seen.get(key);
        if (same) {
          if (same.step.kind === "clear") (same.step.alts ??= []).push(c0);
          continue;
        }
        const o: Option = { step: { kind: "clear", pic: p, col: c0 }, next, key };
        seen.set(key, o);
        out.push(o);
      }
    }
    if (this.room(n) > 0) {
      for (let c = 0; c < this.W; c++) {
        if (this.isOpen(n, c)) continue;
        const ptr = [...n.ptr];
        ptr[c]!++;
        const next = { ptr, mask: n.mask };
        out.push({ step: { kind: "draw", col: c }, next, key: this.key(next) });
      }
    }
    return out;
  }

  /** Is `n` winning in the abstract game? Doomed is sound; winning is confirmed only by a realised line. Throws OutOfBudget past the budget (which proves nothing). */
  wins(n: Node, key = this.key(n)): boolean {
    const known = this.memo.get(key);
    if (known !== undefined) return known === 1;
    if (this.isWon(n)) {
      this.memo.set(key, 1);
      return true;
    }
    if (++this.visited > this.budget) throw new OutOfBudget();
    let win = false;
    for (const o of this.options(n)) {
      if (this.wins(o.next, o.key)) {
        win = true;
        break;
      }
    }
    this.memo.set(key, win ? 1 : 0);
    return win;
  }

  /** The options from `n` that keep the board winnable. */
  winning(n: Node): Option[] {
    return this.options(n).filter((o) => this.wins(o.next, o.key));
  }
}
