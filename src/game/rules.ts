// THE RULES of picture solitaire, and nothing else: no DOM, no clock, no
// unseeded randomness. Every function here is pure: it returns a new state and
// never changes the one it was given. So a state can be kept for Undo,
// serialised with JSON.stringify, compared, and a list of actions replayed from
// the deal to the same end on any machine. The board (src/board/) draws what
// these functions return; the solver and the deal generator build on them.
//
// The creator's rulings (AGENTS.md, "Rulings"), as this file carries them:
//
// - CARDS ARE SQUARE CELLS. A picture of cols x rows cells is cut into one card
//   per cell. A card is a number: picture index * 32 + (y * picture.cols + x).
// - MERGES ARE DERIVED, NEVER STORED. Two side-by-side cards are joined when
//   they are of the same picture and sit exactly as they do in it. A PIECE is a
//   connected group of joined cards (`pieces`); pieces split and rejoin by
//   themselves as cards move. A piece holding all of its picture is COMPLETE.
// - MOVES ARE NEVER REFUSED when the moved piece fits on the board (`move`).
//   The piece under the card picked up travels by d = to - from. The cards it
//   covers go to where it came from, shifted back by the move: for each covered
//   cell c outside the source, follow c-d, c-2d, ... until it leaves the
//   destination; that cell, vacated by the piece, receives c's card. It is a
//   bijection from covered to vacated cells, so a covered piece moves whole
//   when the vacated shape allows it, and only its covered part when the move
//   covers just part of it.
// - GRAVITY IS PER COLUMN AND IGNORES MERGES: a card rests on the card below or
//   on the floor, and the unsupported part of a piece breaks off and falls.
// - AFTER EVERY CHANGE THE BOARD SETTLES (`settle`): cards fall; any complete
//   picture clears (all at once, then cards fall again); only when nothing
//   more falls or clears do the stacks refill the gaps, column by column, left
//   to right; a picture completed by falling or refilling clears in turn.
// - THE BOARD IS WON when the board and the stacks are empty (`isWon`).
//
// Rows count from the top (row 0) down; a cell is row * cols + col.

export const EMPTY = -1;
/** One cell of one picture: picture index * 32 + (y * picture.cols + x). */
export type Card = number;
/** A picture's place in the deal: its catalogue id and its size in cards. */
export interface Picture {
  id: string;
  cols: number;
  rows: number;
}

/** A deal: everything a board starts from. Plain data, as levels store it. */
export interface Deal {
  /** The board's size in cells. */
  cols: number;
  rows: number;
  /** The pictures in play; a card names its picture by index into this list. */
  pictures: Picture[];
  /**
   * One stack per column, dealt from index 0. A board with no `board` starts
   * empty and the opening deal fills every column from its own stack.
   */
  stacks: Card[][];
  /** Cards already on the board at the start, row-major from the top-left, EMPTY where none. */
  board?: Card[];
  /** Seeds the Shuffle helper, so a shuffle replays the same. */
  seed: number;
}

export interface State {
  cols: number;
  rows: number;
  pictures: Picture[];
  /** cols * rows cells, row-major from the top-left; EMPTY where no card is. */
  board: Card[];
  /** One stack per column; [0] is dealt next. */
  stacks: Card[][];
  /** Pictures cleared so far, by index, in the order they left. */
  cleared: number[];
  /** Moves made (a shuffle is not a move). */
  moves: number;
  /** Shuffles used, so the next one is seeded differently. */
  shuffles: number;
  seed: number;
}

/** Pick up the piece under `from` and put that card down on `to`. */
export interface Move {
  from: number;
  to: number;
}
/**
 * The Shuffle helper, as played: the board and stacks it arranged, straight
 * after the mix and before the board settles. src/game/shuffle.ts (`rescue`)
 * chooses it with the solver; `arrange` checks and plays it with no solver, so
 * a replay (and the server's win checker) needs none.
 */
export interface Shuffle {
  shuffle: true;
  board: Card[];
  stacks: Card[][];
}
/** What a replay is made of: moves, and the Shuffle helper. */
export type Action = Move | Shuffle;
/** The most stack places one shuffle may change (`arrange`). */
export const MAX_SWAPS = 4;

/** One card going from one cell to another. */
export interface Slide {
  card: Card;
  from: number;
  to: number;
}

/** A card trading between the board's `cell` and place `at` (0: dealt next) of stack `col`. */
export interface StackSwap {
  card: Card;
  col: number;
  at: number;
  cell: number;
}

/** What happened, in order, so the board can show it. */
export type Step =
  /** The piece moved (`moved`) and the cards it covered went back (`displaced`). */
  | { kind: "move"; moved: Slide[]; displaced: Slide[] }
  /** Cards fell straight down into the gaps under them. */
  | { kind: "fall"; slides: Slide[] }
  /** Complete pictures, shown whole and then taken off the board. */
  | { kind: "clear"; pictures: { pic: number; cells: number[] }[] }
  /** The stacks dealt, in this order (left to right): each card drops from above its column into `to`. */
  | { kind: "deal"; deals: { col: number; card: Card; to: number }[] }
  /**
   * The Shuffle helper (src/game/shuffle.ts): loose cards traded places
   * (`slides`); when the board was stuck, some also traded with stack cards:
   * `toStacks` left the board for a stack, `fromStacks` came out onto it.
   */
  | { kind: "shuffle"; slides: Slide[]; toStacks: StackSwap[]; fromStacks: StackSwap[] };

export interface Outcome {
  state: State;
  steps: Step[];
}

// ---------------------------------------------------------------- cards

export const picOf = (card: Card): number => card >> 5;

export function cardOf(pictures: readonly Picture[], pic: number, x: number, y: number): Card {
  return pic * 32 + y * pictures[pic]!.cols + x;
}

/** Where the card sits in its picture, in cells. */
export function xyOf(pictures: readonly Picture[], card: Card): [number, number] {
  const cols = pictures[card >> 5]!.cols;
  const i = card & 31;
  return [i % cols, (i / cols) | 0];
}

/** Every card of a picture, row by row. */
export function cardsOf(pictures: readonly Picture[], pic: number): Card[] {
  const p = pictures[pic]!;
  const out: Card[] = [];
  for (let i = 0; i < p.cols * p.rows; i++) out.push(pic * 32 + i);
  return out;
}

export const sizeOf = (pictures: readonly Picture[], pic: number): number => pictures[pic]!.cols * pictures[pic]!.rows;

// ---------------------------------------------------------------- cells

export const colOf = (s: { cols: number }, cell: number): number => cell % s.cols;
export const rowOf = (s: { cols: number }, cell: number): number => (cell / s.cols) | 0;

// ---------------------------------------------------------------- start

/** The state a deal starts in, after the opening deal has settled. */
export function start(deal: Deal): Outcome {
  if (deal.pictures.some((p) => p.cols * p.rows > 32)) throw new Error("a picture has more than 32 cards");
  const s: State = {
    cols: deal.cols,
    rows: deal.rows,
    pictures: deal.pictures.map((p) => ({ ...p })),
    board: deal.board ? [...deal.board] : new Array(deal.cols * deal.rows).fill(EMPTY),
    stacks: deal.stacks.map((st) => [...st]),
    cleared: [],
    moves: 0,
    shuffles: 0,
    seed: deal.seed >>> 0,
  };
  const steps: Step[] = [];
  return { state: settle(s, steps), steps };
}

// ---------------------------------------------------------------- joins and pieces

/** Are the cards in cells a and b joined (side by side, as in their picture)? */
export function joined(s: State, a: number, b: number): boolean {
  if (a > b) [a, b] = [b, a];
  const ca = s.board[a]!;
  const cb = s.board[b]!;
  if (ca === EMPTY || cb === EMPTY || picOf(ca) !== picOf(cb)) return false;
  const [ax, ay] = xyOf(s.pictures, ca);
  const [bx, by] = xyOf(s.pictures, cb);
  if (b === a + 1 && colOf(s, a) < s.cols - 1) return bx === ax + 1 && by === ay;
  if (b === a + s.cols) return bx === ax && by === ay + 1;
  return false;
}

export interface Pieces {
  /** The piece index of each cell, -1 where the cell is empty. */
  of: number[];
  /** Each piece's cells, in reading order; pieces in reading order of their first cell. */
  list: number[][];
}

/** The pieces on the board: cards grouped by their joins. */
export function pieces(s: State): Pieces {
  const n = s.board.length;
  const of = new Array<number>(n).fill(-1);
  const list: number[][] = [];
  for (let start = 0; start < n; start++) {
    if (s.board[start] === EMPTY || of[start] !== -1) continue;
    const id = list.length;
    const cells: number[] = [];
    const todo = [start];
    of[start] = id;
    while (todo.length) {
      const c = todo.pop()!;
      cells.push(c);
      const col = colOf(s, c);
      for (const nb of [col > 0 ? c - 1 : -1, col < s.cols - 1 ? c + 1 : -1, c - s.cols, c + s.cols]) {
        if (nb < 0 || nb >= n || of[nb] !== -1 || !joined(s, c, nb)) continue;
        of[nb] = id;
        todo.push(nb);
      }
    }
    list.push(cells.sort((a, b) => a - b));
  }
  return { of, list };
}

/** The cells of the piece under `cell` (empty if the cell is). */
export function pieceAt(s: State, cell: number): number[] {
  if (s.board[cell] === EMPTY) return [];
  const p = pieces(s);
  return p.list[p.of[cell]!]!;
}

/** How many joined pairs are on the board (the solver and Shuffle score with it). */
export function joinCount(s: State): number {
  let n = 0;
  for (let c = 0; c < s.board.length; c++) {
    if (colOf(s, c) < s.cols - 1 && joined(s, c, c + 1)) n++;
    if (c + s.cols < s.board.length && joined(s, c, c + s.cols)) n++;
  }
  return n;
}

// ---------------------------------------------------------------- moves

/** Does the piece in `cells` still lie on the board when moved by (dc, dr)? */
export function fits(s: State, cells: readonly number[], dc: number, dr: number): boolean {
  for (const c of cells) {
    const col = colOf(s, c) + dc;
    const row = rowOf(s, c) + dr;
    if (col < 0 || col >= s.cols || row < 0 || row >= s.rows) return false;
  }
  return true;
}

/**
 * The nearest landing cell for the card at `from` such that its whole piece
 * fits on the board when that card lands there. Used by tap-then-tap and by a
 * drag past the board's edge, so a move is never refused for being off the
 * edge. Returns `to` itself when it already fits.
 */
export function clampTarget(s: State, from: number, to: number): number {
  const cells = pieceAt(s, from);
  if (!cells.length) return from;
  let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
  for (const c of cells) {
    minC = Math.min(minC, colOf(s, c));
    maxC = Math.max(maxC, colOf(s, c));
    minR = Math.min(minR, rowOf(s, c));
    maxR = Math.max(maxR, rowOf(s, c));
  }
  const fc = colOf(s, from);
  const fr = rowOf(s, from);
  const dc = Math.max(-minC, Math.min(s.cols - 1 - maxC, colOf(s, to) - fc));
  const dr = Math.max(-minR, Math.min(s.rows - 1 - maxR, rowOf(s, to) - fr));
  return (fr + dr) * s.cols + fc + dc;
}

/**
 * Make a move: the piece under `from` travels so that card lands on `to`.
 * Returns null only when nothing would happen or the piece would leave the
 * board: there is no card at `from`, `to` is `from`, or the piece does not fit.
 */
export function move(s: State, m: Move): Outcome | null {
  const n = s.board.length;
  if (m.from < 0 || m.from >= n || m.to < 0 || m.to >= n || m.from === m.to) return null;
  if (s.board[m.from] === EMPTY) return null;
  const src = pieceAt(s, m.from);
  const dc = colOf(s, m.to) - colOf(s, m.from);
  const dr = rowOf(s, m.to) - rowOf(s, m.from);
  if (!fits(s, src, dc, dr)) return null;
  const d = dr * s.cols + dc;
  const inSrc = new Set(src);
  const dst = src.map((c) => c + d);
  const inDst = new Set(dst);

  const board = [...s.board];
  const moved: Slide[] = [];
  const displaced: Slide[] = [];
  // The covered cards go back: each to the vacated cell its chain ends on.
  for (const c of dst) {
    if (inSrc.has(c)) continue;
    let v = c - d;
    while (inDst.has(v)) v -= d;
    board[v] = s.board[c]!;
    if (s.board[c] !== EMPTY) displaced.push({ card: s.board[c]!, from: c, to: v });
  }
  for (const c of src) {
    board[c + d] = s.board[c]!;
    moved.push({ card: s.board[c]!, from: c, to: c + d });
  }

  const steps: Step[] = [{ kind: "move", moved, displaced }];
  const next = settle({ ...s, board, moves: s.moves + 1 }, steps);
  return { state: next, steps };
}

/** Every move that does something: each piece, by each offset that keeps it on the board. */
export function allMoves(s: State): Move[] {
  const out: Move[] = [];
  for (const cells of pieces(s).list) {
    const from = cells[0]!;
    for (let to = 0; to < s.board.length; to++) {
      if (to === from) continue;
      if (fits(s, cells, colOf(s, to) - colOf(s, from), rowOf(s, to) - rowOf(s, from))) out.push({ from, to });
    }
  }
  return out;
}

// ---------------------------------------------------------------- settling

/** Fall, clear, refill, until the board is still. Pushes what happened onto `steps`. */
export function settle(s: State, steps: Step[]): State {
  for (let guard = 0; guard < 10_000; guard++) {
    const fell = fall(s);
    if (fell.slides.length) {
      steps.push({ kind: "fall", slides: fell.slides });
      s = fell.state;
    }
    const done = complete(s);
    if (done.length) {
      const board = [...s.board];
      for (const p of done) for (const c of p.cells) board[c] = EMPTY;
      steps.push({ kind: "clear", pictures: done });
      s = { ...s, board, cleared: [...s.cleared, ...done.map((p) => p.pic)] };
      continue;
    }
    const dealt = deal(s);
    if (dealt.deals.length) {
      steps.push({ kind: "deal", deals: dealt.deals });
      s = dealt.state;
      continue;
    }
    return s;
  }
  throw new Error("the board never settled");
}

/** Every card drops straight down its column onto the card below or the floor. */
function fall(s: State): { state: State; slides: Slide[] } {
  const board = [...s.board];
  const slides: Slide[] = [];
  for (let col = 0; col < s.cols; col++) {
    let land = s.rows - 1; // the lowest row not yet filled
    for (let row = s.rows - 1; row >= 0; row--) {
      const cell = row * s.cols + col;
      const card = s.board[cell]!;
      if (card === EMPTY) continue;
      if (row !== land) {
        const to = land * s.cols + col;
        board[to] = card;
        board[cell] = EMPTY;
        slides.push({ card, from: cell, to });
      }
      land--;
    }
  }
  return { state: slides.length ? { ...s, board } : s, slides };
}

/** The complete pictures on the board, in reading order. */
function complete(s: State): { pic: number; cells: number[] }[] {
  const out: { pic: number; cells: number[] }[] = [];
  for (const cells of pieces(s).list) {
    const pic = picOf(s.board[cells[0]!]!);
    if (cells.length === sizeOf(s.pictures, pic)) out.push({ pic, cells });
  }
  return out;
}

/** Each stack fills its own column's gaps, column by column from the left. Assumes the board has fallen. */
function deal(s: State): { state: State; deals: { col: number; card: Card; to: number }[] } {
  let board: Card[] | null = null;
  let stacks: Card[][] | null = null;
  const deals: { col: number; card: Card; to: number }[] = [];
  for (let col = 0; col < s.cols; col++) {
    let gap = 0;
    while (gap < s.rows && s.board[gap * s.cols + col] === EMPTY) gap++;
    let taken = 0;
    const stack = s.stacks[col]!;
    while (gap > 0 && taken < stack.length) {
      board ??= [...s.board];
      stacks ??= s.stacks.map((st) => [...st]);
      const card = stack[taken++]!;
      const to = (gap - 1) * s.cols + col;
      board[to] = card;
      deals.push({ col, card, to });
      gap--;
    }
    if (taken && stacks) stacks[col] = stack.slice(taken);
  }
  return { state: board ? { ...s, board, stacks: stacks! } : s, deals };
}

// ---------------------------------------------------------------- the end

/** The board and the stacks are empty: every picture is restored. */
export function isWon(s: State): boolean {
  return s.board.every((c) => c === EMPTY) && s.stacks.every((st) => st.length === 0);
}

/** How many cards of each picture are on the board now. */
export function onBoard(s: State): number[] {
  const n = new Array<number>(s.pictures.length).fill(0);
  for (const c of s.board) if (c !== EMPTY) n[picOf(c)]!++;
  return n;
}

/**
 * A dead end: the board is full and no picture has all its cards on it, so no
 * picture can ever be finished and no card can ever leave or arrive. Undo or
 * Restart are the only ways on. (A board can also be doomed long before this:
 * that is the solver's to say.)
 */
export function isDeadEnd(s: State): boolean {
  if (isWon(s) || s.board.includes(EMPTY)) return false;
  const n = onBoard(s);
  return !n.some((count, pic) => count > 0 && count === sizeOf(s.pictures, pic));
}

// ---------------------------------------------------------------- randomness

/** A small seeded random source (mulberry32): the same seed gives the same numbers. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- replay

/**
 * Play a Shuffle: check its arrangement is one the helper may make, then
 * settle it. Null when it is not:
 *   a. the board and every stack keep their sizes;
 *   b. only LOOSE cells (holding a card joined to no neighbour, judged before
 *      the shuffle) change, and each still holds a card;
 *   c. a stack place that changed now holds a card that was loose, so stack
 *      cards never reorder among themselves; at most MAX_SWAPS places change;
 *   d. the loose cards and the stack cards are the same cards as before;
 *   e. something changed.
 * Whether the board was stuck, and whether the mix can be won, are the
 * solver's to judge (src/game/shuffle.ts); this checks only what any player's
 * shuffle must keep.
 */
export function arrange(s: State, a: Shuffle): Outcome | null {
  const { board: nb, stacks: ns } = a;
  if (!Array.isArray(nb) || !Array.isArray(ns)) return null;
  if (nb.length !== s.board.length || ns.length !== s.stacks.length) return null;
  if (ns.some((st, c) => !Array.isArray(st) || st.length !== s.stacks[c]!.length)) return null;
  const ps = pieces(s);
  const isLoose = (cell: number) => s.board[cell] !== EMPTY && ps.list[ps.of[cell]!]!.length === 1;
  const before = new Map<Card, { cell: number } | { col: number; at: number }>();
  for (let c = 0; c < nb.length; c++) {
    if (isLoose(c)) {
      if (nb[c] === EMPTY || !Number.isInteger(nb[c])) return null;
      before.set(s.board[c]!, { cell: c });
    } else if (nb[c] !== s.board[c]) return null;
  }
  s.stacks.forEach((st, col) => st.forEach((card, at) => before.set(card, { col, at })));
  const slides: Slide[] = [];
  const toStacks: StackSwap[] = [];
  const fromStacks: StackSwap[] = [];
  const seen = new Set<Card>();
  for (let c = 0; c < nb.length; c++) {
    if (!isLoose(c)) continue;
    const card = nb[c]!;
    const was = before.get(card);
    if (!was || seen.has(card)) return null;
    seen.add(card);
    if ("cell" in was) {
      if (was.cell !== c) slides.push({ card, from: was.cell, to: c });
    } else fromStacks.push({ card, col: was.col, at: was.at, cell: c });
  }
  let changed = 0;
  for (let col = 0; col < ns.length; col++) {
    for (let at = 0; at < ns[col]!.length; at++) {
      const card = ns[col]![at]!;
      if (card === s.stacks[col]![at]) {
        if (seen.has(card)) return null;
        seen.add(card);
        continue;
      }
      const was = before.get(card);
      if (!was || !("cell" in was) || seen.has(card)) return null;
      seen.add(card);
      toStacks.push({ card, col, at, cell: was.cell });
      changed++;
    }
  }
  if (changed > MAX_SWAPS || seen.size !== before.size) return null;
  if (!slides.length && !toStacks.length) return null;
  const steps: Step[] = [{ kind: "shuffle", slides, toStacks, fromStacks }];
  const next = settle({ ...s, board: [...nb], stacks: ns.map((st) => [...st]), shuffles: s.shuffles + 1 }, steps);
  return { state: next, steps };
}

/** Apply one action; null if it does nothing or is not allowed (the replay is then wrong). */
export function act(s: State, a: Action): Outcome | null {
  return "shuffle" in a ? arrange(s, a) : move(s, a);
}

/** Play `actions` from the deal. Throws on an action that does nothing. */
export function replay(deal: Deal, actions: readonly Action[]): State {
  let s = start(deal).state;
  actions.forEach((a, i) => {
    const out = act(s, a);
    if (!out) throw new Error(`action ${i} (${JSON.stringify(a)}) does nothing`);
    s = out.state;
  });
  return s;
}

/** Two states show the same board and stacks (moves and helper counts aside). */
export function sameBoard(a: State, b: State): boolean {
  return (
    a.board.length === b.board.length &&
    a.board.every((c, i) => c === b.board[i]) &&
    a.stacks.every((st, i) => st.length === b.stacks[i]!.length && st.every((c, j) => c === b.stacks[i]![j]))
  );
}
