// The board: one level in play inside the host box the screens give it. It
// keeps the rules' state (src/game/rules.ts), takes the player's hand (drag,
// or tap a piece then tap where it goes), shows every step the rules return,
// and offers the helpers the screens' buttons call. It tells the rest of the
// game what happened through src/events.ts.
//
// Input: one finger owns a drag until it lifts; a second touch does nothing.
// A dragged piece rises clear of the fingertip, and where it hangs is where it
// lands. A press that hardly moves is a tap: tap a piece to lift it, tap any
// cell to put that card there (the nearest place the piece fits; a cell of the
// piece itself too, a short slide), tap the same card again to put it back.
// A move is never refused when the piece fits on the board.
//
// Nothing runs at rest: every animation asks src/board/pace.ts, which stops
// when the board is still.

import "./board.css";
import CATALOGUE from "../content/pictures.json";
import { emit, type GameEvents } from "../events";
import { gem, onArcadePause, onPlayerPrefs } from "../gem";
import { ensure, fileUrl, resident } from "../packs";
import { level as levelOf, levelCount, type Level } from "../game/levels.ts";
import { Game, OutOfBudget, nextMove } from "../game/solver/index.ts";
import { rescue } from "../game/shuffle.ts";
import {
  EMPTY, arrange, clampTarget, isDeadEnd, isWon, move, pieceAt, pieces, picOf, sameBoard, start,
  type Action, type Card, type Move, type Picture, type Shuffle, type State, type Step,
} from "../game/rules.ts";
import { ease, realMs, setBatterySaver, setPaused, stopAll, tween, wait, run } from "./pace.ts";
import { makeDev, type BoardDev } from "./dev.ts";
import { revealPostcard, type Reveal } from "./reveal.ts";
import { TUNING, applyTuning } from "./tuning.ts";
import {
  addRing, backImage, cellAt, drawPiece, drawRing, drawStack, edgesOf, keyOf, layout, mountDefs, nearestCell, place,
  type Art, type Geometry, type PieceView, type StackView,
} from "./view.ts";

export { levelCount };
export type { Level };
export type { BoardDev, BoardInfo, DevStep } from "./dev.ts";

export interface HelperCounts {
  undo: number;
  hint: number;
  shuffle: number;
}

export interface BoardPicture {
  id: string;
  src: string;
  cols: number;
  rows: number;
}

/** What the screens hold of an open board (agreed with the UI member). */
export interface BoardHandle {
  /**
   * The helpers (the creator, 2026-10-27: the player's own stock, which the
   * screens count and spend). Each acts at once whenever it can and returns
   * true, sending helper:undo / helper:hint / helper:shuffle { lesson } as it
   * does; false when it did nothing (busy, won, mid-drag, nothing to take
   * back, or helper:refused: no line or mix it could prove). The board keeps
   * no count. `lesson` true: the screens spend nothing for this use.
   */
  undo(): boolean;
  hint(): boolean;
  shuffle(): boolean;
  /**
   * The next use of helper `k` is a lesson's (board 2's Undo, the Shuffle
   * lesson): its event says lesson: true. One use, then it clears; null clears
   * any. The guide's Hint (guide on) is always a lesson's.
   */
  lesson(k: keyof HelperCounts | null): void;
  /**
   * Mercy help (the creator, 2026-10-27; agreed with the UI member): `n`
   * (default 1) uses of helper `k` this try pays for, not the player's stock.
   * Calls add up. Each such use's event says free: true; a use only goes
   * when the helper acts. A Restart ends them (cleared just before
   * board:restart, so grant the next try's from there), as a new board does.
   */
  grantFree(k: keyof HelperCounts, n?: number): void;
  /** Deal the same board again, at once (the screens confirm first). */
  restart(): void;
  canUndo(): boolean;
  /**
   * The tutorial's guide (agreed with the UI member). "line": a ring
   * (.guide-lit) round the piece of the next move of the level's line (the
   * solver's, off the line), then round where it goes (.guide-target) once it
   * is lifted; only that move is taken, by drag or tap-tap, and any other
   * press nudges the lit piece. "hold": the board takes no moves (the
   * helpers still act). null: normal play. While a guide is on, a Hint is a
   * lesson's (helper:hint says lesson: true).
   */
  guide(mode: "line" | "hold" | null): void;
  pictures(): BoardPicture[];
  destroy(): void;
  /**
   * The dev menu's controls (src/board/dev.ts): win now, step through the
   * proved line, endless helpers, animation speed, board info. Undefined in a
   * release build, which leaves them out altogether.
   */
  dev?: BoardDev;
}

// ---------------------------------------------------------------- the player's preferences

const reducedQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
let arcadeReduced = false;
const lessMotion = () => arcadeReduced || !!reducedQuery?.matches;
onPlayerPrefs((prefs) => {
  arcadeReduced = !!prefs.reducedMotion;
  setBatterySaver(!!prefs.recommended?.batterySaver);
});
onArcadePause((p) => setPaused(p));
document.addEventListener("visibilitychange", () => setPaused(document.visibilityState === "hidden"));

/**
 * The dev menu's endless helpers, held here for the screens (dev.endless()):
 * while on, they spend nothing. The board itself keeps no count.
 */
let endlessHelpers = false;

// The game config's `kv.board` may retune the board without a build; read once.
let tuned: Promise<void> | null = null;
function loadTuning(): void {
  tuned ??= (async () => {
    try {
      const config = await gem.gameConfig.load();
      applyTuning((config?.kv as Record<string, unknown> | undefined)?.board);
    } catch {
      // no config (unframed, or none published): the defaults stand
    }
  })();
}

/**
 * A picture's files: the full one, and Art's light board copy with its size in pixels (none yet:
 * the full). A destination's postcard is in the catalogue's own `destinations` list, with the
 * place's name.
 */
type PictureFiles = {
  id: string; file: string; board?: string; boardPx?: number[]; px?: number[];
  name?: string; title?: string; place?: string;
};
const catalogue = CATALOGUE as unknown as { pictures: PictureFiles[]; destinations?: PictureFiles[] };
const pictureFiles = new Map([...catalogue.pictures, ...(catalogue.destinations ?? [])].map((p) => [p.id, p]));
/** A picture's file is drawn over this many cells: a destination's postcard over the whole board. */
function drawnSize(l: Level, p: Picture): { cols: number; rows: number } {
  return l.destination?.id === p.id ? { cols: l.deal.cols, rows: l.deal.rows } : { cols: p.cols, rows: p.rows };
}

/**
 * How many upcoming cards a board's stacks show face up: the level's own, but
 * at least the next one while TUNING.showNext is on (the creator's trial).
 * Drawing only: the rules, the solver and the win checker never read it.
 */
function peekOf(l: Level): number {
  return TUNING.showNext ? Math.max(1, l.peek) : l.peek;
}

/**
 * True only when it is PROVED that no line of moves wins from `s` (helpers
 * aside): the solver's abstract game is a relaxation of the real one, so its
 * "lost" is certain (tools/levels/exactness.mts checks it against the real
 * rules). Out of budget proves nothing, and nothing else is ever claimed.
 */
function provedLost(s: State): boolean {
  try {
    const g = new Game(s, TUNING.stuckBudget);
    return !g.wins(g.root);
  } catch (err) {
    if (!(err instanceof OutOfBudget)) console.error("[board] the stuck check failed", err);
    return false;
  }
}

/** A picture file's width ÷ height, from the catalogue (a stand-in: its cells'). */
function aspectOf(id: string, cols: number, rows: number): number {
  const px = pictureFiles.get(id)?.px ?? pictureFiles.get(id)?.boardPx;
  return px?.length === 2 && px[0]! > 0 && px[1]! > 0 ? px[0]! / px[1]! : cols / rows;
}
const base = import.meta.env.BASE_URL;
const backUrl = `${base}art/stack-back.webp`;
/** Board copies (catalogue paths) that would not load: their full picture stands in from then on. */
const brokenCopies = new Set<string>();
/** The screen's pixel density (a phone's 2 or 3), read when a picture is chosen. */
const density = () => (typeof devicePixelRatio === "number" && devicePixelRatio > 0 ? devicePixelRatio : 1);

/**
 * A picture's files, as catalogue paths, for cards `cardPx` CSS px wide:
 * `want`, Art's board copy while it is sharp enough there
 * (TUNING.boardCopyMin of the card's device pixels), else the full picture;
 * `other`, the one to fall back on ("" when there is none). null: a picture
 * the catalogue lacks (a drawn stand-in).
 */
function choose(id: string, cols: number, rows: number, cardPx = Infinity): { want: string; other: string } | null {
  const p = pictureFiles.get(id);
  if (!p) return null;
  const per = p.board && p.boardPx?.length === 2 ? p.boardPx[0]! / cols : 0;
  const copy = p.board && per > 0 && !brokenCopies.has(p.board) ? p.board : "";
  return copy && per >= cardPx * density() * TUNING.boardCopyMin ? { want: copy, other: p.file } : { want: p.file, other: copy };
}
/**
 * The file to draw now (src/packs.ts): the one wanted once it is loaded
 * (always, in a build without packs), else the other while that one is, so
 * a card never asks for a file that is not there.
 */
function drawable(c: { want: string; other: string }): string {
  return resident(c.want) || !c.other || !resident(c.other) ? c.want : c.other;
}

/**
 * The catalogue paths of the picture files board `l` will draw in `host`
 * (its destination's postcard too), for the screens to load before it opens
 * (a packed build). A host not laid out yet (0 x 0: the screens open a board
 * hidden) counts as the window, which errs toward the full picture.
 */
export function boardFiles(l: Level, host: HTMLElement): string[] {
  const w = host.clientWidth || innerWidth || 360;
  const h = host.clientHeight || innerHeight || 640;
  const s = layout(w, h, l.deal.cols, l.deal.rows, peekOf(l)).s;
  const out = new Set<string>();
  for (const p of l.deal.pictures) {
    const { cols, rows } = drawnSize(l, p);
    const c = choose(p.id, cols, rows, s);
    if (c) out.add(c.want);
  }
  return [...out];
}

/** A drawn stand-in for a picture the catalogue lacks. */
function standIn(id: string, cols: number, rows: number): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * 10} ${rows * 10}"><defs><linearGradient id="a" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,62%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360},50%,38%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#a)"/><circle cx="${cols * 6}" cy="${rows * 4}" r="${Math.min(cols, rows) * 3}" fill="hsl(${(hue + 180) % 360},60%,80%)" opacity=".7"/><text x="50%" y="${rows * 8}" font-size="5" text-anchor="middle" fill="#fff">${id}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Fetch and decode one picture; true once it is ready to paint, false when it would not load. */
function fetchPicture(u: string, low = false): Promise<boolean> {
  const img = new Image();
  if (low) (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low";
  img.decoding = "async";
  img.src = u;
  keep.push(img);
  return img.decode().then(() => true, () => false);
}

/** Start fetching a level's pictures; resolves when they are decoded (or after `ms`). */
function preload(urls: string[], ms: number, low = false): Promise<void> {
  const all = urls.map((u) => fetchPicture(u, low));
  // a plain timer, never the frame loop: waiting on a download draws nothing
  return Promise.race([Promise.all(all).then(() => {}), new Promise<void>((r) => setTimeout(r, ms))]);
}
/** Decoded pictures stay referenced so the browser keeps them ready to paint. */
const keep: HTMLImageElement[] = [];

// ---------------------------------------------------------------- the board

/**
 * Open a board in `host`: campaign board `which` (from 1), or any board given
 * whole (a challenge or the daily deal, from src/game/levels.ts), of any size.
 * Events name the board by its campaign number, or else by its id.
 */
export function openBoard(host: HTMLElement, which: number | Level): BoardHandle {
  loadTuning();
  mountDefs();
  const lvl = typeof which === "number" ? levelOf(which) : which;
  const name = typeof which === "number" ? String(which) : which.id;
  const deal = lvl.deal;
  const pics = deal.pictures;
  /** The board's destination (a window cut from a postcard the size of the board), if it has one. */
  const dest = lvl.destination && pics.some((p) => p.id === lvl.destination!.id) ? lvl.destination : undefined;
  const destPic = dest ? pics.findIndex((p) => p.id === dest.id) : -1;
  // the copies are picked for the card size the board opens at (sharpen() picks again on a resize)
  const art: Art[] = pics.map((p, i) => ({
    url: "", ...drawnSize(lvl, p), ...(i === destPic ? { dx: dest!.crop[0], dy: dest!.crop[1] } : {}),
  }));
  if (keep.length > 120) keep.splice(0, keep.length - 60);

  // --- DOM
  const stage = document.createElement("div");
  stage.className = "bd-stage";
  const plane = document.createElement("div");
  plane.className = "bd-plane";
  const stacksEl = document.createElement("div");
  stacksEl.className = "bd-stacks";
  const slotsEl = document.createElement("div");
  slotsEl.className = "bd-slots";
  const cardsEl = document.createElement("div");
  cardsEl.className = "bd-cards";
  const fxEl = document.createElement("div");
  fxEl.className = "bd-fx";
  plane.append(stacksEl, slotsEl, cardsEl, fxEl);
  stage.append(plane);
  host.append(stage);

  const url = new URLSearchParams(location.search);
  const tilt = url.has("tilt") ? url.get("tilt") !== "0" : TUNING.tilt;
  plane.classList.toggle("tilt", tilt);

  // --- state
  /** The deal before the opening: an empty board, every card in the stacks. */
  const unopened = (): State => {
    const s = start({ ...deal, stacks: deal.stacks.map(() => []) }).state;
    return { ...s, stacks: deal.stacks.map((st) => [...st]) };
  };
  let state: State = unopened();
  /** What is on screen: the state the views show, step by step behind `state`. */
  let shown: State = state;
  let history: State[] = [];
  let actions: Action[] = [];
  /**
   * Known winning lines, newest last: the level's own from the start, and the
   * one that proved each shuffle, from just after it. Hint follows the newest
   * while the player's moves since it match it.
   */
  // a lesson's line wins from after its stored shuffle, not from the opening (which is stuck)
  const freshPlans = (): { at: number; line: Move[] }[] => (lvl.shuffle ? [] : [{ at: 0, line: lvl.line }]);
  let plans = freshPlans();
  /** Helpers whose next use is a lesson's (lesson()). */
  const lessonNext = new Set<keyof HelperCounts>();
  /** This try's free uses of each helper (grantFree), gone with a restart. */
  const freeLeft = new Map<keyof HelperCounts, number>();
  /** The opening position, which a lesson's stored shuffle is for. */
  const openingState = lvl.shuffle ? start(deal).state : null;
  let busy = 0;
  /** The dev menu is playing the board: the player's hand is held off it. */
  let driven = false;
  let won = false;
  let destroyed = false;
  let pendingRestart = false;
  /** A destination's postcard on show (src/board/reveal.ts): a tap skips it. */
  let reveal: Reveal | null = null;
  /** The destination has been revealed on this opening of the board: a repeat is the short one. */
  let revealedOnce = false;
  /** The opening deal has played: the clock may run. */
  let opened = false;
  let activeMs = 0;
  let since: number | null = null;
  /** The win, as a claim needs it, from the moment the rules say the board is won (board:solved). */
  let solved: GameEvents["board:solved"] | null = null;
  let geo: Geometry = layout(host.clientWidth || 360, host.clientHeight || 480, deal.cols, deal.rows, peekOf(lvl));
  /** The catalogue path each picture draws now ("": a stand-in). */
  const drawn: string[] = pics.map(() => "");
  /** Picture `i` draws `rel` (a catalogue path; "": its stand-in), its cards drawn again when the board is open. */
  function setArt(i: number, rel: string): void {
    drawn[i] = rel;
    const u = rel ? fileUrl(rel) : standIn(pics[i]!.id, art[i]!.cols, art[i]!.rows);
    if (art[i]!.url !== u) swapArt(art[i]!, u);
  }
  /** Picture `i`'s file for cards `cardPx` wide, of those loaded now. */
  const pick = (i: number, cardPx: number) => {
    const c = choose(pics[i]!.id, art[i]!.cols, art[i]!.rows, cardPx);
    setArt(i, c ? drawable(c) : "");
  };
  // the light copies until the box has its size (a level that shows upcoming cards draws
  // them at once); the copies are picked for the card size, and fetched, then
  pics.forEach((_, i) => pick(i, 0));
  let live: PieceView[] = [];
  const stacks: StackView[] = [];

  // --- the clock for "time" on the win card: only while the board is in view
  const clockOn = () => {
    if (since === null && !won && !solved && !reveal) since = performance.now();
  };
  const clockOff = () => {
    if (since !== null) activeMs += performance.now() - since;
    since = null;
  };
  const onScreenNow = () => host.clientWidth > 0 && host.clientHeight > 0 && document.visibilityState !== "hidden";
  const onVisible = () => (document.visibilityState === "hidden" ? clockOff() : opened && onScreenNow() && clockOn());
  document.addEventListener("visibilitychange", onVisible);

  // ---------------------------------------------------------------- layout and drawing

  function applyLayout(): void {
    plane.style.cssText = `left:${geo.left}px;top:${geo.top}px;width:${geo.width}px;height:${geo.height}px;--s:${geo.s}px`;
    if (tilt) plane.style.transform = `perspective(${Math.round(geo.height * 3.4)}px) rotateX(${TUNING.tiltDegrees}deg)`;
    for (const el of [slotsEl, cardsEl, fxEl]) el.style.cssText = `left:${geo.gridX}px;top:${geo.gridY}px`;
    stacksEl.replaceChildren();
    stacks.length = 0;
    for (let c = 0; c < geo.cols; c++) {
      const el = document.createElement("div");
      el.className = "bd-stack";
      el.style.cssText = `left:${c * (geo.s + geo.g)}px;width:${geo.s}px;height:${geo.stackH}px`;
      stacksEl.append(el);
      stacks.push({ el });
    }
    slotsEl.replaceChildren();
    for (let cell = 0; cell < geo.cols * geo.rows; cell++) {
      const el = document.createElement("div");
      el.className = "bd-cell";
      el.style.cssText = `left:${(cell % geo.cols) * (geo.s + geo.g)}px;top:${Math.floor(cell / geo.cols) * (geo.sh + geo.g)}px;width:${geo.s}px;height:${geo.sh}px;border-radius:${Math.round(geo.s * 0.14)}px`;
      slotsEl.append(el);
    }
  }

  function drawStacks(st: State, dealtSoFar?: number[]): void {
    st.stacks.forEach((stack, c) => drawStack(stacks[c]!, geo, dealtSoFar ? stack.slice(dealtSoFar[c]) : stack, peekOf(lvl), art, pics, backUrl));
  }

  /** Draw every piece of `st` afresh (a resize, a restart). */
  function redrawAll(st: State): void {
    for (const v of live) v.el.remove();
    live = [];
    for (const cells of pieces(st).list) addView(drawPiece(geo, art, cells, cells.map((c) => st.board[c]!), pics));
    drawStacks(st);
  }

  function addView(v: PieceView): PieceView {
    live.push(v);
    cardsEl.append(v.el);
    return v;
  }
  function dropView(v: PieceView): void {
    v.el.remove();
    live = live.filter((x) => x !== v);
  }
  const viewWith = (cell: number) => live.find((v) => v.cells.includes(cell));

  /**
   * Make the views match `st`'s pieces: keep a view that already shows exactly
   * a piece, draw the rest. A piece made of cards that were apart before pops
   * (correct neighbours joined); a piece that came apart says so.
   */
  function reconcile(before: State, st: State, popMerges = true): void {
    const A = pieces(before);
    const B = pieces(st);
    const keepViews = new Set<PieceView>();
    const fresh: PieceView[] = [];
    for (const cells of B.list) {
      const cards = cells.map((c) => st.board[c]!);
      const key = keyOf(cards, cells);
      const v = live.find((x) => x.key === key && !keepViews.has(x));
      if (v) {
        keepViews.add(v);
        continue;
      }
      const nv = drawPiece(geo, art, cells, cards, pics);
      keepViews.add(nv);
      fresh.push(nv);
      // joined from cards that were not all one piece before: a merge
      if (cells.length > 1 && popMerges) {
        const at = new Set(cards.map((card) => A.of[before.board.indexOf(card)] ?? -2));
        if (at.size > 1 || at.has(-1) || at.has(-2)) {
          emit("piece:merge", { pictureId: pics[picOf(cards[0]!)]!.id, size: cells.length });
          pop(nv);
        }
      }
    }
    for (const v of [...live]) if (!keepViews.has(v)) dropView(v);
    for (const v of fresh) addView(v);
    // a piece of `before` whose cards (still on the board) are now in more than one piece came apart
    for (const cells of A.list) {
      if (cells.length < 2) continue;
      const where = new Set<number>();
      for (const c of cells) {
        const at = st.board.indexOf(before.board[c]!);
        if (at >= 0) where.add(B.of[at]!);
      }
      if (where.size > 1) emit("piece:split", { pictureId: pics[picOf(before.board[cells[0]!]!)]!.id });
    }
  }

  function pop(v: PieceView): void {
    if (lessMotion()) return;
    const top = TUNING.mergePop;
    void tween(TUNING.mergePopMs, (t) => {
      if (v.el.classList.contains("whole")) return; // a finished picture: its exit has it
      v.k = t < 0.4 ? 1 + (top - 1) * ease.out(t / 0.4) : top - (top - 1) * ease.inOut((t - 0.4) / 0.6);
      place(v);
    }, { ease: ease.linear });
  }

  // ---------------------------------------------------------------- showing steps

  /** The state after one step, as the views should show it. */
  function after(st: State, step: Step): State {
    const board = [...st.board];
    let stacks2 = st.stacks;
    const slide = (ss: { card: Card; from: number; to: number }[]) => {
      for (const x of ss) board[x.from] = EMPTY;
      for (const x of ss) board[x.to] = x.card;
    };
    if (step.kind === "move") slide([...step.moved, ...step.displaced]);
    else if (step.kind === "fall") slide(step.slides);
    else if (step.kind === "shuffle") {
      for (const x of step.toStacks) board[x.cell] = EMPTY;
      slide(step.slides);
      for (const x of step.fromStacks) board[x.cell] = x.card;
      if (step.toStacks.length) {
        stacks2 = st.stacks.map((s) => [...s]);
        for (const x of step.toStacks) stacks2[x.col]![x.at] = x.card;
      }
    }
    else if (step.kind === "clear") for (const p of step.pictures) for (const c of p.cells) board[c] = EMPTY;
    else if (step.kind === "deal") {
      stacks2 = st.stacks.map((s) => [...s]);
      for (const d of step.deals) {
        board[d.to] = d.card;
        stacks2[d.col]!.shift();
      }
    }
    return { ...st, board, stacks: stacks2 };
  }

  /**
   * Move cards of `from` to the cells `dest` gives them (cards not named stay).
   * Each piece breaks into parts that move alike; a part is its own frame on
   * the way. `timing` sets each part's motion from its offset in cells.
   */
  function slideCards(
    from: State, dest: Map<Card, number>,
    timing: (dc: number, dr: number) => { ms: number; ease?: (t: number) => number; arc?: boolean },
    lifted?: PieceView | null,
    /** Each moving part as it arrives, with the cells it has come to (a fall's landing). */
    land?: (v: PieceView, cells: number[]) => void,
  ): { done: Promise<void>; firstMs: number; liftedMs: number } {
    const ps = pieces(from);
    const jobs: Promise<void>[] = [];
    let firstMs = Infinity;
    let liftedMs = 0;
    const p = geo.s + geo.g;
    const ph = geo.sh + geo.g;
    // match every piece to the view showing it BEFORE any view is moved on
    const sameCells = (a: number[], b: number[]) => a.length === b.length && a.every((c, i) => c === b[i]);
    const shownBy = ps.list.map((cells) =>
      lifted && sameCells(lifted.cells, cells) ? lifted : live.find((v) => v !== lifted && sameCells(v.cells, cells)),
    );
    ps.list.forEach((cells, pieceIndex) => {
      const offs = cells.map((c) => {
        const to = dest.get(from.board[c]!);
        return to === undefined ? 0 : to - c;
      });
      const old = shownBy[pieceIndex];
      const isLifted = !!lifted && old === lifted;
      if (!isLifted && offs.every((o) => o === 0)) return;
      // split the piece into parts that move alike and touch
      const parts: number[][] = [];
      const seen = new Set<number>();
      cells.forEach((c, i) => {
        if (seen.has(c)) return;
        const part: number[] = [];
        const todo = [c];
        seen.add(c);
        while (todo.length) {
          const x = todo.pop()!;
          part.push(x);
          for (const nb of [x - 1, x + 1, x - from.cols, x + from.cols]) {
            const j = cells.indexOf(nb);
            if (j < 0 || seen.has(nb) || offs[j] !== offs[i]) continue;
            if ((nb === x - 1 || nb === x + 1) && Math.floor(nb / from.cols) !== Math.floor(x / from.cols)) continue;
            seen.add(nb);
            todo.push(nb);
          }
        }
        parts.push(part.sort((a, b) => a - b));
      });
      let views: PieceView[];
      if (parts.length === 1 && old) views = [old];
      else {
        if (old) dropView(old);
        views = parts.map((part) => addView(drawPiece(geo, art, part, part.map((c) => from.board[c]!), pics)));
      }
      views.forEach((v, idx) => {
        const part = parts[parts.length === 1 ? 0 : idx]!;
        const off = offs[cells.indexOf(part[0]!)]!;
        const to = part.map((c) => c + off);
        const dc = (to[0]! % from.cols) - (part[0]! % from.cols);
        const dr = Math.floor(to[0]! / from.cols) - Math.floor(part[0]! / from.cols);
        const tx = v.ox + dc * p;
        const ty = v.oy + dr * ph;
        endBounce(v);
        const x0 = v.x, y0 = v.y, k0 = v.k;
        let tm = timing(dc, dr);
        if (v === lifted) {
          // the piece in hand goes the way it has left to go: short after a drag, longer after a tap
          const left = Math.hypot(tx - x0, ty - y0) / p;
          tm = { ms: Math.round(Math.min(TUNING.slideMs * 1.6, TUNING.dropMs + 90 * left)) };
          liftedMs = tm.ms;
        }
        if (off !== 0 || v === lifted) {
          firstMs = Math.min(firstMs, tm.ms);
          v.el.classList.add("moving");
          jobs.push(
            tween(tm.ms, (t) => {
              v.x = x0 + (tx - x0) * t;
              v.y = y0 + (ty - y0) * t;
              v.k = k0 + (1 - k0) * t + (tm.arc ? Math.sin(Math.PI * t) * 0.08 : 0);
              place(v);
            }, { ease: tm.ease }).then(() => {
              v.el.classList.remove("moving", "lifted");
              land?.(v, to);
            }),
          );
        }
        v.ox = tx;
        v.oy = ty;
        v.cells = to;
        v.key = keyOf(v.cards, to);
      });
    });
    return { done: Promise.all(jobs).then(() => {}), firstMs: Number.isFinite(firstMs) ? firstMs : 0, liftedMs };
  }

  /**
   * A card has come to rest after falling or being dealt: it rebounds
   * landBounce of a card and settles back over landMs, Candy Crush's (the
   * creator, 2026-10-27). Plays on under whatever comes next; a slide or a
   * pick-up of the same piece ends it (endBounce).
   */
  const bouncing = new Map<PieceView, () => void>();
  function bounce(v: PieceView): void {
    const h = TUNING.landBounce * geo.sh;
    const ms = TUNING.landMs;
    endBounce(v);
    if (!(h > 0) || !(ms > 0) || lessMotion() || destroyed) return;
    let t = 0;
    const stop = run((dt) => {
      if (!bouncing.has(v)) return false;
      t += dt;
      const p = Math.min(1, t / ms);
      // up fast, a hang, back down (Match3Mahjong's landed(), from Candy Crush's footage)
      const up = p < 0.35 ? ease.out(p / 0.35) : p < 0.6 ? 1 : 1 - ease.inOut((p - 0.6) / 0.4);
      v.y = v.oy - h * up;
      place(v);
      if (p >= 1) bouncing.delete(v);
      return p < 1;
    });
    bouncing.set(v, () => {
      stop();
      bouncing.delete(v);
      v.y = v.oy;
      place(v);
    });
  }
  function endBounce(v: PieceView): void {
    bouncing.get(v)?.();
  }

  /**
   * column:land, after a clear: each column's cards still to land in this
   * wave (the fall and the refill that follow one clear), and how many in all.
   * Set by show() at a clear step, from the steps after it.
   */
  let wave: Map<number, { cards: number; left: number }> | null = null;
  function waveFrom(steps: Step[], at: number): Map<number, { cards: number; left: number }> {
    const w = new Map<number, { cards: number; left: number }>();
    const add = (cell: number) => {
      const col = cell % geo.cols;
      const e = w.get(col) ?? { cards: 0, left: 0 };
      e.cards++;
      e.left++;
      w.set(col, e);
    };
    for (let j = at + 1; j < steps.length; j++) {
      const s = steps[j]!;
      if (s.kind === "fall") for (const x of s.slides) add(x.to);
      else if (s.kind === "deal") for (const d of s.deals) add(d.to);
      else break;
    }
    return w;
  }
  /** Cards of this wave have landed in `cells`: a column whose last card it was says so. */
  function waveLand(cells: number[]): void {
    if (!wave) return;
    for (const cell of cells) {
      const col = cell % geo.cols;
      const e = wave.get(col);
      if (!e || e.left <= 0) continue;
      if (--e.left === 0) emit("column:land", { col, cards: e.cards });
    }
  }

  /** Show `steps`, from what is on screen to `target`. */
  async function show(steps: Step[], lifted?: PieceView | null): Promise<void> {
    wave = null;
    try {
      await showSteps(steps, lifted);
    } finally {
      wave = null;
    }
  }
  async function showSteps(steps: Step[], lifted?: PieceView | null): Promise<void> {
    for (const [i, step] of steps.entries()) {
      if (destroyed) return;
      const next = after(shown, step);
      if (step.kind === "clear") wave = waveFrom(steps, i);
      else if (step.kind !== "fall" && step.kind !== "deal") wave = null;
      if (step.kind === "move") {
        const dest = new Map<Card, number>();
        for (const x of [...step.moved, ...step.displaced]) dest.set(x.card, x.to);
        const slid = slideCards(shown, dest, (dc, dr) => {
          const far = Math.hypot(dc, dr);
          return { ms: Math.round(TUNING.slideMs * Math.min(1.6, 0.7 + 0.3 * far)) };
        }, lifted);
        emit("piece:move", { cards: step.moved.length, displaced: step.displaced.length, ms: realMs(slid.liftedMs || slid.firstMs) });
        await slid.done;
        lifted = null;
      } else if (step.kind === "fall") {
        const dest = new Map(step.slides.map((x) => [x.card, x.to] as [Card, number]));
        const slid = slideCards(shown, dest, (_dc, dr) => ({ ms: Math.round(TUNING.fallMs * Math.sqrt(Math.max(1, dr))), ease: ease.fall }), null, (v, cells) => {
          bounce(v);
          waveLand(cells);
        });
        emit("cards:fall", { cards: step.slides.length, ms: realMs(slid.firstMs) });
        await slid.done;
      } else if (step.kind === "shuffle") {
        await mixCards(step, next);
      } else if (step.kind === "clear") {
        await celebrate(step.pictures);
      } else if (step.kind === "deal") {
        await dealCards(step);
      }
      reconcile(shown, next, step.kind !== "clear");
      shown = next;
    }
  }

  /**
   * A finished picture's exit, brief (the creator: the game is the finding):
   * it swells a little in a warm glow while twinkles flash over and round it,
   * holds a beat, then shrinks to nothing, and the cards fall. Every part is a
   * tuning value (completeGrowMs, completeHoldMs, completeLeaveMs); the
   * twinkles end with it, so nothing is left animating.
   */
  async function celebrate(done: { pic: number; cells: number[] }[]): Promise<void> {
    const calm = lessMotion();
    const growMs = calm ? 0 : TUNING.completeGrowMs;
    const holdMs = TUNING.completeHoldMs;
    const leaveMs = TUNING.completeLeaveMs;
    const life = growMs + holdMs + leaveMs;
    await Promise.all(done.map(async ({ pic, cells }, i) => {
      const id = pics[pic]!.id;
      const v = live.find((x) => x.cells.length === cells.length && cells.every((c) => x.cells.includes(c)));
      emit("picture:complete", { pictureId: id, cells: cells.map((c) => ({ col: c % geo.cols, row: Math.floor(c / geo.cols) })) });
      if (!v) return;
      v.el.classList.add("whole");
      if (pic === destPic) return showPostcard(v, id);
      // the glow behind it, swelling and shrinking with it
      const glow = document.createElement("div");
      glow.className = "bd-glow";
      const bx = v.ox + Math.ceil(geo.s * 0.16);
      const by = v.oy + Math.ceil(geo.s * 0.16);
      const bw = (Math.max(...cells.map((c) => c % geo.cols)) - Math.min(...cells.map((c) => c % geo.cols)) + 1) * (geo.s + geo.g) - geo.g;
      const bh = (Math.max(...cells.map((c) => Math.floor(c / geo.cols))) - Math.min(...cells.map((c) => Math.floor(c / geo.cols))) + 1) * (geo.sh + geo.g) - geo.g;
      glow.style.cssText = `left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;border-radius:${Math.round(geo.s * 0.16)}px;opacity:0`;
      cardsEl.insertBefore(glow, cardsEl.firstChild);
      // twinkles: half over the picture, half just round its edge, each a short flash
      const twinkles: Promise<void>[] = [];
      const els: HTMLElement[] = [];
      if (!calm) {
        const n = Math.max(0, Math.round(TUNING.twinkles));
        const rand = (k: number, salt: number) => (((k + 1) * 9301 + (pic + 1) * 49297 + salt * 233280) % 1000) / 1000;
        for (let k = 0; k < n; k++) {
          const tw = document.createElement("i");
          tw.className = "bd-twinkle";
          fxEl.append(tw);
          els.push(tw);
          let x: number, y: number;
          if (k % 2 === 0) {
            x = bx + bw * (0.1 + 0.8 * rand(k, 1));
            y = by + bh * (0.1 + 0.8 * rand(k, 2));
          } else {
            // on the frame's edge, a little outside it
            const side = (k >> 1) % 4;
            const u = rand(k, 3);
            const out = geo.s * 0.06 * rand(k, 4);
            x = side === 0 || side === 2 ? bx + u * bw : side === 1 ? bx + bw + out : bx - out;
            y = side === 1 || side === 3 ? by + u * bh : side === 2 ? by + bh + out : by - out;
          }
          const size = (geo.s * (0.22 + 0.2 * rand(k, 5))) / 20; // the element is 20 px
          const spin = 45 + 90 * rand(k, 6);
          const delay = (k / Math.max(1, n)) * (growMs + holdMs) * 0.9 + i * TUNING.completeStaggerMs;
          const dur = Math.max(80, Math.min(i * TUNING.completeStaggerMs + life - delay, life * 0.5));
          twinkles.push(tween(dur, (t) => {
            const a = Math.sin(Math.PI * t);
            tw.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(spin * t).toFixed(1)}deg) scale(${(size * a).toFixed(3)})`;
            tw.style.opacity = String(a);
          }, { delay, ease: ease.linear }));
        }
      }
      await wait(i * TUNING.completeStaggerMs);
      const top = calm ? 1 : TUNING.completeGrow;
      const scaleGlow = (k: number) => (glow.style.transform = `scale(${k.toFixed(4)})`);
      await tween(growMs, (t) => {
        v.k = 1 + (top - 1) * t;
        place(v);
        glow.style.opacity = String(t);
        scaleGlow(v.k);
      }, { ease: ease.out });
      glow.style.opacity = "1";
      await wait(holdMs);
      emit("picture:clear", { pictureId: id });
      const leaving = tween(leaveMs, (t) => {
        // to nothing, faster as it goes (reduced motion: a soft fade where it stands)
        v.k = calm ? 1 - 0.08 * t : top * (1 - t);
        v.el.style.opacity = String(calm ? 1 - t : t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4);
        glow.style.opacity = String(1 - t);
        scaleGlow(Math.max(0.001, v.k));
        place(v);
      }, { ease: calm ? ease.linear : ease.in });
      const gone = Promise.all([leaving, ...twinkles]).then(() => {
        glow.remove();
        for (const el of els) el.remove();
      });
      // the cards above fall for the last part of the shrink (fallLeadMs; reduced motion waits it out)
      const lead = calm ? 0 : Math.max(0, Math.min(TUNING.fallLeadMs, leaveMs));
      if (lead <= 0) {
        await gone;
        dropView(v);
        return;
      }
      await wait(leaveMs - lead);
      // it leaves the board's pieces now (the next step's views never see it) and shrinks away on its own
      live = live.filter((x) => x !== v);
      void gone.then(() => v.el.remove());
    }));
  }

  /**
   * The destination is finished: its postcard opens over the board, holds
   * while the screens show the place's name (destination:reveal), and goes
   * (destination:done); the cards fall after it. The board's clock stands
   * still meanwhile, and a tap skips to the end (onDown). The first time on
   * this opening of the board is the full reveal, a repeat (after Undo or a
   * restart) the short one; reduced motion crossfades.
   */
  async function showPostcard(v: PieceView, id: string): Promise<void> {
    const entry = pictureFiles.get(id);
    const again = revealedOnce;
    revealedOnce = true;
    const a = art[destPic]!;
    const r = revealPostcard({
      geo, layer: fxEl, piece: v, url: a.url, aspect: aspectOf(id, a.cols, a.rows), crop: dest!.crop,
      mode: lessMotion() ? "calm" : again ? "short" : "full",
      onOpen: () => emit("destination:reveal", { id, name: entry?.name ?? entry?.title ?? id, place: entry?.place ?? "", again }),
      onLeave: () => emit("picture:clear", { pictureId: id }),
    });
    reveal = r;
    clockOff();
    await r.done;
    reveal = null;
    if (destroyed) return; // destroy() said destination:done
    emit("destination:done", { id });
    dropView(v);
    if (opened && onScreenNow()) clockOn();
  }

  /**
   * Where a card sits on stack `col`'s face: its piece element's corner, and
   * its scale across and down (the face is a smaller card: the same both ways).
   */
  function onStackFace(col: number): { x: number; y: number; kx: number; ky: number } {
    const m = Math.ceil(geo.s * 0.16);
    const cx = col * (geo.s + geo.g) + geo.s / 2;
    const cy = -geo.gridY + geo.faceTop + geo.faceH / 2;
    return { x: cx - geo.s / 2 - m, y: cy - geo.sh / 2 - m, kx: geo.face / geo.s, ky: geo.faceH / geo.sh };
  }
  /**
   * The stack drawn under grid point (x, y), its top card or its edges with a
   * little slop round them; -1 for none, or for an empty stack (nothing to reach for).
   */
  function stackAt(x: number, y: number): number {
    const slop = Math.max(4, geo.g);
    const top = -geo.gridY + geo.faceTop - edgesOf(geo, 99) * geo.edge - slop;
    if (y < top || y > -geo.gridY + geo.faceTop + geo.faceH + slop) return -1;
    const col = Math.floor((x + geo.g / 2) / (geo.s + geo.g));
    if (col < 0 || col >= geo.cols || !shown.stacks[col]?.length) return -1;
    const x0 = col * (geo.s + geo.g) + (geo.s - geo.face) / 2;
    if (x < x0 - slop || x > x0 + geo.face + slop) return -1;
    // only as high as this stack's own edges reach
    return y < -geo.gridY + geo.faceTop - edgesOf(geo, shown.stacks[col]!.length) * geo.edge - slop ? -1 : col;
  }

  /** Each stack's "no" in progress (nope): its stop. */
  const noping: ((() => void) | undefined)[] = [];
  /**
   * A press on a stack (the creator: "I keep wanting to drag from the deck"):
   * a short sideways "no" shake, nothing lifted (reduced motion: a brief dim).
   * Once a press, never held: a press again starts it over. stack:nope for the
   * sound. Its own `translate` (and opacity), apart from the settle's transform.
   */
  function nope(col: number): void {
    const el = stacks[col]?.el;
    if (!el) return;
    noping[col]?.();
    emit("stack:nope", { col });
    const ms = TUNING.nopeMs;
    const calm = lessMotion();
    const amp = Math.max(2, geo.s * TUNING.nopeShake);
    let t = 0;
    const at = (p: number) => {
      const done = p >= 1;
      if (calm) el.style.opacity = done ? "" : (1 - 0.45 * Math.sin(Math.PI * p)).toFixed(3);
      else el.style.translate = done ? "" : `${(amp * Math.sin(p * Math.PI * 2 * TUNING.nopeShakes) * (1 - p)).toFixed(2)}px 0`;
    };
    if (ms <= 0) return at(1);
    noping[col] = run((dt) => {
      t += dt;
      const p = Math.min(1, t / ms);
      at(p);
      if (p >= 1) noping[col] = undefined;
      return p < 1;
    });
  }

  /** A piece placed with a scale of its own across and down (to and from a stack's face). */
  const placeXY = (v: PieceView, kx: number, ky: number) => {
    v.el.style.transform = `translate3d(${v.x.toFixed(2)}px, ${v.y.toFixed(2)}px, 0) scale(${kx.toFixed(4)}, ${ky.toFixed(4)})`;
  };

  /**
   * A card leaves stack `col` for `cell`: from the stack's face, at its size,
   * down to the cell, turning face up on the way when the level did not show
   * it (`hidden`). `leave` runs as it sets off (the stack redraws there).
   */
  function dropFromStack(col: number, card: Card, cell: number, hidden: boolean, delay: number, leave: () => void): Promise<void> {
    const v = addView(drawPiece(geo, art, [cell], [card], pics));
    const m = Math.ceil(geo.s * 0.16);
    const { x: sx, y: sy, kx: skx, ky: sky } = onStackFace(col);
    v.x = sx;
    v.y = sy;
    v.k = 1;
    v.el.style.visibility = "hidden";
    let cover: HTMLDivElement | null = null;
    if (hidden) {
      cover = document.createElement("div");
      cover.className = "bd-cover";
      cover.style.backgroundImage = backImage(backUrl);
      cover.style.cssText += `;left:${m}px;top:${m}px;width:${geo.s}px;height:${geo.sh}px;border-radius:${Math.round(geo.s * 0.14)}px`;
      v.el.append(cover);
    }
    placeXY(v, skx, sky);
    return wait(delay).then(() => {
      v.el.style.visibility = "";
      leave();
      v.el.classList.add("moving");
      return tween(TUNING.dealMs, (t) => {
        v.x = sx + (v.ox - sx) * t;
        v.y = sy + (v.oy - sy) * t;
        const kx = skx + (1 - skx) * t;
        const ky = sky + (1 - sky) * t;
        // a card the level did not show turns face up on the way
        const flip = cover ? Math.max(0.02, Math.abs(Math.cos(Math.PI * Math.min(1, t * 1.6)))) : 1;
        if (cover && t > 1 / 3.2 && cover.isConnected) cover.remove();
        placeXY(v, kx * flip, ky);
      }, { ease: ease.fall }).then(() => {
        v.el.classList.remove("moving");
        place(v);
        bounce(v);
        waveLand([cell]);
      });
    });
  }

  /** Each stack's settle in progress (settleStack): its stop. */
  const settling: ((() => void) | undefined)[] = [];
  /**
   * Stack `col` has just been drawn one card shorter: its pile, drawn where it
   * now rests, starts one edge higher (where its cards were) and drops into
   * place, quickly. A card dealt off it mid-settle starts it again from the top.
   */
  function settleStack(col: number): void {
    const el = stacks[col]?.el;
    const ms = TUNING.stackSettleMs;
    settling[col]?.();
    settling[col] = undefined;
    if (!el || ms <= 0 || lessMotion()) return;
    const from = geo.edge;
    let t = 0;
    const at = (y: number) => (el.style.transform = y ? `translate3d(0, ${y.toFixed(2)}px, 0)` : "");
    at(-from);
    settling[col] = run((dt) => {
      t += dt;
      const p = Math.min(1, t / ms);
      at(p >= 1 ? 0 : -from * (1 - ease.out(p)));
      if (p >= 1) settling[col] = undefined;
      return p < 1;
    });
  }

  /** The stacks deal, column by column from the left, one card after another. */
  async function dealCards(step: Extract<Step, { kind: "deal" }>): Promise<void> {
    const dealt = shown.stacks.map(() => 0);
    /** Cards that have left each stack so far, as the deal plays. */
    const taken = shown.stacks.map(() => 0);
    await Promise.all(step.deals.map((d, i) => {
      const hidden = dealt[d.col]!++ >= peekOf(lvl);
      return dropFromStack(d.col, d.card, d.to, hidden, i * TUNING.dealStagger, () => {
        const gone = ++taken[d.col]!;
        const left = shown.stacks[d.col]!.length - gone;
        drawStack(stacks[d.col]!, geo, shown.stacks[d.col]!.slice(gone), peekOf(lvl), art, pics, backUrl);
        if (edgesOf(geo, left) < edgesOf(geo, left + 1)) settleStack(d.col);
        emit("stack:deal", { col: d.col, left });
      });
    }));
  }

  /**
   * Shuffle: the loose cards arc to their new cells. When the board was stuck,
   * the cards trading with the stacks rise onto their stack and sink into it,
   * the stack shows its new top, and the cards it gave up drop into place.
   */
  async function mixCards(step: Extract<Step, { kind: "shuffle" }>, next: State): Promise<void> {
    // the leaving cards' views, before the slides take over their cells
    const leaving = step.toStacks.map((x) => ({ x, v: viewWith(x.cell) }));
    const dest = new Map(step.slides.map((x) => [x.card, x.to] as [Card, number]));
    const slid = slideCards(shown, dest, () => ({ ms: TUNING.shuffleMs, ease: ease.inOut, arc: true })).done;
    if (!leaving.length) return slid;
    const rise = Math.round(TUNING.shuffleMs * 0.55);
    await Promise.all(leaving.map(({ x, v }) => {
      if (!v) return Promise.resolve();
      const x0 = v.x, y0 = v.y;
      const to = onStackFace(x.col);
      v.el.classList.add("moving");
      return tween(rise, (t) => {
        v.x = x0 + (to.x - x0) * t;
        v.y = y0 + (to.y - y0) * t - Math.sin(Math.PI * t) * geo.s * 0.3;
        placeXY(v, 1 + (to.kx - 1) * t, 1 + (to.ky - 1) * t);
      }, { ease: ease.inOut }).then(() => dropView(v));
    }));
    for (const col of new Set(step.toStacks.map((x) => x.col))) drawStack(stacks[col]!, geo, next.stacks[col]!, peekOf(lvl), art, pics, backUrl);
    await Promise.all([slid, ...step.fromStacks.map((x, i) => dropFromStack(x.col, x.card, x.cell, x.at >= peekOf(lvl), i * TUNING.dealStagger, () => {}))]);
  }

  // ---------------------------------------------------------------- the hand

  interface Press {
    id: number;
    /** Where the finger went down: on screen, and in grid px. */
    x: number;
    y: number;
    gx: number;
    gy: number;
    cell: number;
    touch: boolean;
  }
  let press: Press | null = null;
  let drag: {
    id: number;
    v: PieceView;
    from: number;
    /** The pointer's offset from the picked card's centre, in grid px. */
    gx: number;
    gy: number;
    lift: number;
    liftTo: number;
    px: number;
    py: number;
    to: number;
    /** Where the press went down on screen, and the farthest the pointer has been from it (px). */
    sx: number;
    sy: number;
    moved: number;
    /** The piece was picked up by a tap before this drag. */
    wasSelected: boolean;
    /** The piece element's size (its scale is about its centre). */
    W: number;
    H: number;
    stop: () => void;
  } | null = null;
  let selected: { v: PieceView; from: number } | null = null;
  let previewed: PieceView[] = [];
  /**
   * A touch that came while the board was still playing a move out (the
   * creator, 2026-10-27, after Match3Mahjong's study of Royal Match, where a
   * player may move while tiles fall): kept, and taken as the board settles
   * (takeKept). The rules still settle each move whole; only the touch waits.
   * Where it went down, where the pointer is now, and when it lifted (null:
   * still down).
   */
  let kept: { id: number; x: number; y: number; cx: number; cy: number; touch: boolean; up: number | null } | null = null;
  const keptStale = () => !!kept && kept.up !== null && performance.now() - kept.up > TUNING.keepTapMs;

  /** A touch while the board is busy: kept for when it settles. Only the first of one wait. */
  function keepTouch(e: PointerEvent): void {
    if (kept && !keptStale()) return;
    kept = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, touch: e.pointerType !== "mouse", up: null };
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      // a pointer that is already gone
    }
  }

  /**
   * The board has settled: the kept touch becomes the press it would have
   * been on the card now under where it went down. Still down: a press (a
   * drag at once, if the finger has gone on past dragSlop). Lifted meanwhile:
   * a tap, which picks the card up, unless it lifted longer ago than
   * keepTapMs.
   */
  function takeKept(): void {
    const k = kept;
    const stale = keptStale();
    kept = null;
    if (!k || stale || busy || won || destroyed || driven || press || drag || reveal || guideMode === "hold") return;
    const g = toGrid(k.x, k.y);
    const cell = cellAt(geo, g.x, g.y);
    if (k.up !== null) return tap(cell);
    press = { id: k.id, x: k.x, y: k.y, gx: g.x, gy: g.y, cell, touch: k.touch };
    if (Math.hypot(k.cx - k.x, k.cy - k.y) >= TUNING.dragSlop) {
      onMove(new PointerEvent("pointermove", { pointerId: k.id, clientX: k.cx, clientY: k.cy, pointerType: k.touch ? "touch" : "mouse", buttons: 1 }));
    }
  }

  /** A screen point in grid px (through the tilt, when it is on). */
  function toGrid(clientX: number, clientY: number): { x: number; y: number } {
    const r = stage.getBoundingClientRect();
    let x = clientX - r.left - geo.left;
    let y = clientY - r.top - geo.top;
    if (tilt) {
      const th = (TUNING.tiltDegrees * Math.PI) / 180;
      const P = geo.height * 3.4;
      const ox = geo.width / 2;
      const oy = geo.height;
      const U = x - ox;
      const V = y - oy;
      const v = V / (Math.cos(th) + (V * Math.sin(th)) / P);
      const w = 1 - (v * Math.sin(th)) / P;
      x = U * w + ox;
      y = v + oy;
    }
    return { x: x - geo.gridX, y: y - geo.gridY };
  }

  const centre = (cell: number) => ({ x: (cell % geo.cols) * (geo.s + geo.g) + geo.s / 2, y: Math.floor(cell / geo.cols) * (geo.sh + geo.g) + geo.sh / 2 });

  function lift(v: PieceView): void {
    endBounce(v);
    v.el.classList.add("lifted");
    cardsEl.append(v.el); // on top of the others
  }

  function settleBack(v: PieceView): Promise<void> {
    const x0 = v.x, y0 = v.y, k0 = v.k;
    return tween(TUNING.dropMs, (t) => {
      v.x = x0 + (v.ox - x0) * t;
      v.y = y0 + (v.oy - y0) * t;
      v.k = k0 + (1 - k0) * t;
      place(v);
    }).then(() => v.el.classList.remove("lifted"));
  }

  function clearPreview(): void {
    for (const v of previewed) {
      v.el.classList.remove("covered");
    }
    previewed = [];
  }
  /** The pieces a move would cover make way a little. */
  function preview(from: number, to: number, except: PieceView): void {
    clearPreview();
    if (to === from) return;
    const src = pieceAt(state, from);
    const d = to - from;
    const inSrc = new Set(src);
    for (const c of src) {
      const t = c + d;
      if (inSrc.has(t)) continue;
      const v = viewWith(t);
      if (v && v !== except && !previewed.includes(v)) previewed.push(v);
    }
    for (const v of previewed) v.el.classList.add("covered");
  }

  function startDrag(p: Press, e: PointerEvent): void {
    const v = viewWith(p.cell);
    if (!v) return;
    if (guideMode && !(selected?.v === v) && !guideLets(p.cell)) return;
    const wasSelected = selected?.v === v;
    if (selected && selected.v !== v) {
      settleBack(selected.v);
      selected = null;
    } else if (selected) selected = null;
    const g = toGrid(e.clientX, e.clientY);
    const c = centre(p.cell);
    lift(v);
    // the hold is where the finger went down on the card, not where it has got to
    emit("piece:lift", { cards: v.cells.length });
    const liftTo = (p.touch ? TUNING.liftTouch : TUNING.liftMouse) * geo.sh;
    drag = {
      id: p.id, v, from: p.cell, gx: p.gx - c.x, gy: p.gy - c.y, lift: 0, liftTo, px: g.x, py: g.y, to: p.cell,
      sx: p.x, sy: p.y, moved: Math.hypot(e.clientX - p.x, e.clientY - p.y), wasSelected,
      W: parseFloat(v.el.style.width) || 0, H: parseFloat(v.el.style.height) || 0,
      // only the swell (and a lift, if one is tuned in) is animated; the following
      // is done as the pointer moves, so a finger held still draws nothing
      stop: run((dt) => {
        if (!drag) return false;
        drag.lift = Math.min(1, drag.lift + dt / 110);
        follow();
        return drag.lift < 1;
      }, false),
    };
    follow();
    if (guideMode) relight();
  }

  /** The dragged piece where the pointer is: its grab point under it, 1:1. */
  function follow(): void {
    if (!drag) return;
    const d = drag;
    const up = ease.out(d.lift);
    const k = 1 + (TUNING.dragScale - 1) * up;
    const cx = d.px - d.gx;
    const cy = d.py - d.gy - d.liftTo * up;
    const rest = centre(d.from);
    const x0 = d.v.ox + (cx - rest.x);
    const y0 = d.v.oy + (cy - rest.y);
    // the swell is about the element's centre: shift it so the point under the finger stays there
    d.v.x = x0 - (k - 1) * (d.px - (x0 + d.W / 2));
    d.v.y = y0 - (k - 1) * (d.py - d.liftTo * up - (y0 + d.H / 2));
    d.v.k = k;
    place(d.v);
    const to = clampTarget(state, d.from, nearestCell(geo, cx - geo.s / 2, cy - geo.sh / 2));
    if (to !== d.to) {
      d.to = to;
      preview(d.from, to, d.v);
    }
  }

  /** A drag that hardly moved and never left its cell was a tap: the piece is picked up, as a tap picks it. */
  function pickUp(v: PieceView, from: number): void {
    selected = { v, from };
    if (guideMode) relight();
    const x0 = v.x, y0 = v.y, k0 = v.k;
    void tween(TUNING.dropMs, (t) => {
      v.x = x0 + (v.ox - x0) * t;
      v.y = y0 + (v.oy - geo.s * 0.06 - y0) * t;
      v.k = k0 + (TUNING.liftScale - k0) * t;
      place(v);
    }, { calm: false });
  }

  function onDown(e: PointerEvent): void {
    // a hint's ghost never stands in the way: reaching for the board takes it away
    // a destination's postcard on show: a tap anywhere on the board skips to its end
    if (reveal) return void reveal.skip();
    if (driven) return;
    if (!destroyed && guideMode !== "hold") stopHint();
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const g = toGrid(e.clientX, e.clientY);
    // a reach for a stack: it says "no" (cards only ever come off it by the deal)
    const reach = won || destroyed ? -1 : stackAt(g.x, g.y);
    if (reach >= 0) nope(reach);
    if (press || drag || won || destroyed || guideMode === "hold") return;
    // the board is still playing the last move out: the touch waits for it (a reach for a stack is only a "no")
    if (busy) {
      if (reach < 0) keepTouch(e);
      return;
    }
    kept = null;
    const cell = cellAt(geo, g.x, g.y);
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, gx: g.x, gy: g.y, cell, touch: e.pointerType !== "mouse" };
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      // a pointer that is already gone
    }
  }

  function onMove(e: PointerEvent): void {
    // a kept touch (the board busy): only where it has got to, or a mouse let go outside the frame
    if (kept && e.pointerId === kept.id && kept.up === null) {
      if (e.pointerType === "mouse" && e.buttons === 0) kept.up = performance.now();
      else {
        kept.cx = e.clientX;
        kept.cy = e.clientY;
      }
      return;
    }
    // a mouse let go outside the frame: no pointerup ever came, so this is the drop
    if (e.pointerType === "mouse" && e.buttons === 0 && (drag?.id === e.pointerId || press?.id === e.pointerId)) {
      onUp(e);
      return;
    }
    if (drag && e.pointerId === drag.id) {
      const g = toGrid(e.clientX, e.clientY);
      drag.px = g.x;
      drag.py = g.y;
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
      follow();
      return;
    }
    if (!press || e.pointerId !== press.id) return;
    if (press.cell < 0 || state.board[press.cell] === EMPTY) return;
    // with a piece picked up by a tap, a press on another piece is most likely the second tap
    const slop = selected && viewWith(press.cell) !== selected.v ? TUNING.tapSlop : TUNING.dragSlop;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < slop) return;
    const p = press;
    press = null;
    startDrag(p, e);
    onMove(e);
  }

  function onUp(e: PointerEvent): void {
    // a kept touch lifted before the board settled: a tap, taken then
    if (kept && e.pointerId === kept.id && kept.up === null) {
      kept.up = performance.now();
      return;
    }
    if (drag && e.pointerId === drag.id) {
      const d = drag;
      drag = null;
      d.stop();
      clearPreview();
      const m = { from: d.from, to: d.to };
      // it hardly moved and never left its cell: a tap after all (tap-then-tap)
      if (d.to === d.from && d.moved < TUNING.tapSlop) {
        if (!d.wasSelected) {
          pickUp(d.v, d.from);
          return;
        }
        // the picked-up piece tapped again: put back
        emit("piece:cancel", {});
        void settleBack(d.v);
        if (guideMode) relight();
        return;
      }
      if (d.to !== d.from && guideTakes(m)) void play(m, d.v);
      else {
        emit("piece:cancel", {});
        const home = settleBack(d.v);
        if (guideMode) {
          relight();
          // home first, then "this one, but not there"
          if (d.to !== d.from) void home.then(() => nudge(d.v));
        }
      }
      return;
    }
    if (!press || e.pointerId !== press.id) return;
    const cell = press.cell;
    press = null;
    tap(cell);
  }

  function onCancel(e: PointerEvent): void {
    // a kept touch the browser took away while still down (lostpointercapture after a lift keeps the tap)
    if (kept && e.pointerId === kept.id && kept.up === null) kept = null;
    if (drag && e.pointerId === drag.id) {
      const d = drag;
      drag = null;
      d.stop();
      clearPreview();
      emit("piece:cancel", {});
      settleBack(d.v);
      if (guideMode) relight();
    }
    if (press && e.pointerId === press.id) press = null;
  }

  function tap(cell: number): void {
    if (busy || won) return;
    if (selected) {
      const sel = selected;
      // the same card again (or off the grid) puts it back; another card of the
      // same piece is a real move (tap-then-tap must do all that a drag can)
      if (cell < 0 || cell === sel.from) {
        selected = null;
        emit("piece:cancel", {});
        settleBack(sel.v);
        if (guideMode) relight();
        return;
      }
      const to = clampTarget(state, sel.from, cell);
      // the guide keeps the piece up after a wrong second tap, and shows where again
      if (to !== sel.from && !guideTakes({ from: sel.from, to })) {
        nudgeTarget();
        return;
      }
      selected = null;
      if (to === sel.from) {
        emit("piece:cancel", {});
        settleBack(sel.v);
        if (guideMode) relight();
        return;
      }
      void play({ from: sel.from, to }, sel.v);
      return;
    }
    if (cell < 0 || state.board[cell] === EMPTY) return;
    const v = viewWith(cell);
    if (!v) return;
    if (guideMode && !guideLets(cell)) return;
    selected = { v, from: cell };
    if (guideMode) relight();
    lift(v);
    emit("piece:lift", { cards: v.cells.length });
    const y0 = v.y;
    void tween(TUNING.dropMs, (t) => {
      v.k = 1 + (TUNING.liftScale - 1) * t;
      v.y = y0 - geo.s * 0.06 * t;
      place(v);
    }, { calm: false });
  }

  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp);
  stage.addEventListener("pointercancel", onCancel);
  stage.addEventListener("lostpointercapture", onCancel);
  // the window lost focus mid-drag (an alert, another app): put the piece back
  const onBlur = () => {
    if (drag) onCancel(new PointerEvent("pointercancel", { pointerId: drag.id }));
    press = null;
    kept = null;
  };
  addEventListener("blur", onBlur);

  // ---------------------------------------------------------------- playing

  /** Helper `k` acted: whether this use was a lesson's (lesson(), or the guide's Hint), which spends nothing. */
  function lessonUse(k: keyof HelperCounts): boolean {
    const armed = lessonNext.delete(k);
    return armed || (k === "hint" && !!guideMode);
  }
  /**
   * Helper `k` acted: whose use it was, for its event. A lesson's first; else
   * one of this try's free uses (grantFree: mercy help), if any is left; else
   * the player's own, which the screens spend.
   */
  function used(k: keyof HelperCounts): { lesson: boolean; free: boolean } {
    const lesson = lessonUse(k);
    const left = freeLeft.get(k) ?? 0;
    const free = !lesson && left > 0;
    if (free) freeLeft.set(k, left - 1);
    return { lesson, free };
  }

  function changed(): void {
    emit("board:changed", { canUndo: history.length > 0 && !won, moves: state.moves });
  }

  async function settled(): Promise<void> {
    if (pendingRestart) {
      pendingRestart = false;
      await doRestart();
      return;
    }
    changed();
    if (isWon(state) && !won) {
      won = true;
      announceIfSolved();
      emit("board:won", solved!);
    } else checkStuck();
    if (resizePending) relayout();
    if (artPending) refreshArt();
    if (guideMode) relight();
    takeKept();
  }

  /**
   * Being stuck, said the moment it is true and only when it is proved (the
   * creator, after boards 9 and 10: "I became stuck and didn't realise it for
   * a good while"): board:stuck once on the way in, board:unstuck once on the
   * way out (an Undo back past the slip, a Shuffle's rescue, a Restart). The
   * rules' dead end (a full board, no picture whole on it) is plain to see;
   * anything else is the solver's provedLost, run after each settle in a task
   * of its own, never inside a frame: under 1 ms on every shipped board
   * (35,000 positions of play measured).
   */
  let stuck = false;
  let stuckCheck: ReturnType<typeof setTimeout> | undefined;
  function setStuck(now: boolean, doomed = true): void {
    if (now === stuck) return;
    stuck = now;
    // a lesson's board opens stuck on purpose: nothing is said over the lesson
    if (lvl.lesson) return;
    if (now) emit("board:stuck", { doomed });
    else emit("board:unstuck", {});
  }
  function checkStuck(): void {
    clearTimeout(stuckCheck);
    if (won || isWon(state)) return setStuck(false);
    if (isDeadEnd(state)) return setStuck(true, false);
    const at = state;
    stuckCheck = setTimeout(() => {
      if (!destroyed && state === at) setStuck(provedLost(at));
    }, 0);
  }

  async function run2(fn: () => Promise<void>): Promise<void> {
    busy++;
    try {
      await fn();
    } catch (err) {
      console.error("[board]", err);
      // never leave the screen out of step with the rules
      shown = state;
      redrawAll(state);
    } finally {
      busy--;
    }
    if (import.meta.env.DEV && !busy && !destroyed) checkScreen();
    if (!busy && !destroyed) await settled();
  }

  /** Dev builds: the views must show exactly the rules' pieces, where the rules have them. */
  function checkScreen(): void {
    const want = pieces(state).list.map((cells) => keyOf(cells.map((c) => state.board[c]!), cells)).sort();
    const have = live.map((v) => v.key).sort();
    const sameStacksShown = shown.stacks.every((st, i) => st.length === state.stacks[i]!.length);
    if (want.join("|") !== have.join("|") || !sameStacksShown) console.error("[board] the screen is out of step with the rules", { want, have });
  }

  /**
   * The rules say the board is won: say so at once, before the finish plays,
   * so a game closed during the finish still has its win (the claim goes out
   * on this). Once per board; board:won then reports the same numbers.
   */
  function announceIfSolved(): void {
    if (solved || !isWon(state)) return;
    clockOff();
    solved = {
      level: name,
      moves: state.moves,
      ms: Math.round(activeMs),
      line: actions.map((a) => ("shuffle" in a ? { shuffle: true as const, board: [...a.board], stacks: a.stacks.map((st) => [...st]) } : { ...a })),
    };
    emit("board:solved", solved);
  }

  async function play(m: Move, lifted: PieceView): Promise<void> {
    const out = move(state, m);
    if (!out) {
      settleBack(lifted);
      return;
    }
    unlight();
    stopHint();
    history.push(state);
    actions.push(m);
    state = out.state;
    announceIfSolved();
    await run2(() => show(out.steps, lifted));
  }

  /** Show the change from what is on screen to `target` directly (undo): cards slide, come and go. */
  async function morph(target: State): Promise<void> {
    const from = shown;
    const dest = new Map<Card, number>();
    target.board.forEach((card, cell) => {
      if (card !== EMPTY) dest.set(card, cell);
    });
    // cards that go back to the stacks fly up and fade; cards that come back fade in
    const leaving = live.filter((v) => v.cards.some((c) => !dest.has(c)));
    const fades = leaving.map((v) => {
      const y0 = v.y;
      return tween(TUNING.slideMs, (t) => {
        v.y = y0 - geo.s * 0.6 * t;
        v.el.style.opacity = String(1 - t);
        place(v);
      }).then(() => dropView(v));
    });
    const stay = new Map([...dest].filter(([card]) => from.board.includes(card)));
    const onlyStaying: State = { ...from, board: from.board.map((c) => (c !== EMPTY && dest.has(c) ? c : EMPTY)) };
    // views of leaving cards are gone; slide the rest from where they are
    await Promise.all([...fades, slideCards(onlyStaying, stay, () => ({ ms: TUNING.slideMs, ease: ease.inOut })).done]);
    reconcile(onlyStaying, target, false);
    for (const v of live) {
      if (v.cards.some((c) => !from.board.includes(c))) {
        v.el.style.opacity = "0";
        void tween(TUNING.slideMs, (t) => (v.el.style.opacity = String(t)));
      }
    }
    shown = target;
    drawStacks(target);
  }

  async function doRestart(): Promise<void> {
    busy++;
    clearTimeout(stuckCheck);
    setStuck(false);
    try {
      history = [];
      actions = [];
      plans = freshPlans();
      won = false;
      solved = null;
      activeMs = 0;
      since = null;
      selected = null;
      const out = live.map((v) => tween(220, (t) => (v.el.style.opacity = String(1 - t))));
      await Promise.all(out);
      // a try's free helpers were for that try (the screens grant the next one's on board:restart)
      freeLeft.clear();
      emit("board:restart", {});
      await opening();
      if (onScreenNow()) clockOn();
    } finally {
      busy--;
    }
    changed();
    takeKept();
  }

  /** The opening deal: the stacks fill the board, left to right. */
  async function opening(): Promise<void> {
    const opened = start(deal);
    const empty = unopened();
    shown = empty;
    redrawAll(empty);
    state = opened.state;
    await show(opened.steps);
    shown = state;
  }

  // ---------------------------------------------------------------- helpers

  function onLine(): Move | null {
    const plan = plans[plans.length - 1];
    if (!plan) return null;
    const done = actions.length - plan.at;
    if (done < 0 || done >= plan.line.length) return null;
    for (let i = 0; i < done; i++) {
      const a = actions[plan.at + i]!;
      if ("shuffle" in a || a.from !== plan.line[i]!.from || a.to !== plan.line[i]!.to) return null;
    }
    return plan.line[done]!;
  }

  /**
   * A lesson's stored Shuffle, while the board is still at its opening (the
   * rescue mix otherwise): played as stored, so a change to the helper's
   * tuning never changes the lesson; its line wins from just after it.
   */
  function lessonMix(): { state: State; steps: Step[]; action: Shuffle; line: Move[] } | null {
    if (!lvl.shuffle || !openingState || !sameBoard(state, openingState)) return null;
    const out = arrange(state, lvl.shuffle);
    if (!out) {
      console.error("[board] the lesson's stored shuffle does not fit its opening");
      return null;
    }
    return { ...out, action: lvl.shuffle, line: lvl.line };
  }

  // ---------------------------------------------------------------- the guide (tutorial)

  let guideMode: "line" | "hold" | null = null;
  let litView: PieceView | null = null;
  let targetEl: HTMLDivElement | null = null;

  /** The move the guide asks for: the level's line while on it, else the solver's next. */
  function guideWants(): Move | null {
    if (guideMode !== "line" || won) return null;
    const m = onLine();
    if (m) return m;
    const n = nextMove(state, 20_000);
    return "move" in n ? n.move : null;
  }
  /** `m` does what `want` does: the same piece, by the same offset. */
  const sameMove = (m: Move, want: Move) => m.to - m.from === want.to - want.from && pieceAt(state, want.from).includes(m.from);
  /** A press on `cell` may lift its piece: no guide, or the guide's piece. */
  function guideLets(cell: number): boolean {
    if (guideMode === "hold") return false;
    const want = guideWants();
    if (!want) return true;
    if (pieceAt(state, want.from).includes(cell)) return true;
    nudge(litView);
    return false;
  }
  /** A move the guide takes (any move when no guide is on). */
  function guideTakes(m: Move): boolean {
    if (guideMode === "hold") return false;
    const want = guideWants();
    return !want || sameMove(m, want);
  }

  function unlight(): void {
    if (litView) {
      litView.el.classList.remove("guide-lit");
      litView.el.querySelector(".bd-ring")?.remove();
      litView = null;
    }
    targetEl?.remove();
    targetEl = null;
  }
  /** Light what the guide asks for now: the piece to play, or (once it is lifted) where it goes. */
  function relight(): void {
    unlight();
    if (guideMode !== "line" || busy || won || destroyed) return;
    const want = guideWants();
    if (!want) return;
    const v = viewWith(want.from);
    if (!v) return;
    const lifted = drag?.v ?? selected?.v ?? null;
    if (lifted === v) {
      const d = want.to - want.from;
      targetEl = drawRing(geo, pieceAt(state, want.from).map((c) => c + d), "bd-target guide-target");
      fxEl.append(targetEl);
    } else {
      litView = v;
      v.el.classList.add("guide-lit");
      addRing(geo, v);
    }
  }
  /** A little shake of the lit piece: "this one". */
  function nudge(v: PieceView | null): void {
    if (!v || lessMotion()) return;
    const x0 = v.x;
    void tween(340, (t) => {
      v.x = x0 + Math.sin(t * Math.PI * 4) * (1 - t) * geo.s * 0.07;
      place(v);
    }, { ease: ease.linear }).then(() => {
      v.x = x0;
      place(v);
    });
  }
  /** The target ring again: "there". */
  function nudgeTarget(): void {
    if (!targetEl) return;
    targetEl.classList.remove("again");
    void targetEl.offsetWidth; // restart its animation
    targetEl.classList.add("again");
  }

  /** The hint on screen, if any; calling it takes the ghost away at once. */
  let hintStop: (() => void) | null = null;
  const stopHint = () => hintStop?.();

  /**
   * Hint: a faint copy of the piece flies to where it should go, holds, and
   * fades. It changes nothing in the game, so it never holds the board up:
   * any press, move or helper takes it away at once (a player reaches for
   * the card it shows).
   */
  function showHint(m: Move): void {
    stopHint();
    if (!viewWith(m.from)) return;
    const cells = pieceAt(state, m.from);
    const ghost = drawPiece(geo, art, cells, cells.map((c) => state.board[c]!), pics);
    ghost.el.classList.add("ghost");
    fxEl.append(ghost.el);
    const dc = (m.to % geo.cols) - (m.from % geo.cols);
    const dr = Math.floor(m.to / geo.cols) - Math.floor(m.from / geo.cols);
    const tx = ghost.ox + dc * (geo.s + geo.g);
    const ty = ghost.oy + dr * (geo.sh + geo.g);
    const x0 = ghost.x, y0 = ghost.y;
    const T = TUNING.hintMs;
    const fly = T * 0.35;
    const hold = T * 0.75;
    let t = 0;
    let landed = false;
    let stop: () => void = () => {};
    const end = () => {
      stop();
      ghost.el.remove();
      if (hintStop === end) hintStop = null;
    };
    stop = run((dt) => {
      t += dt;
      if (t < fly) {
        const e = ease.inOut(t / fly);
        ghost.x = x0 + (tx - x0) * e;
        ghost.y = y0 + (ty - y0) * e - Math.sin(Math.PI * e) * geo.s * 0.25;
        ghost.k = 1 + 0.06 * Math.sin(Math.PI * e);
        ghost.el.style.opacity = String(0.4 + 0.5 * Math.min(1, e * 2));
        place(ghost);
      } else if (t < hold) {
        if (!landed) {
          landed = true;
          ghost.x = tx;
          ghost.y = ty;
          ghost.k = 1;
          ghost.el.style.opacity = "0.9";
          place(ghost);
        }
      } else if (t < T) ghost.el.style.opacity = String(0.9 * (1 - (t - hold) / (T - hold)));
      else {
        end();
        return false;
      }
      return true;
    });
    hintStop = end;
  }

  // ---------------------------------------------------------------- size

  /**
   * The board grew past what its copies are sharp for (a phone turned, a
   * window widened): fetch the full pictures, and swap each in once it is
   * ready, so a card never shows blank while it loads. Never back down: a
   * picture already fetched costs nothing more.
   */
  function sharpen(): void {
    pics.forEach((p, i) => {
      const c = choose(p.id, art[i]!.cols, art[i]!.rows, geo.s);
      // only ever up, from the board copy to the full picture
      if (!c || c.want === drawn[i] || drawn[i] !== pictureFiles.get(p.id)?.board) return;
      const want = c.want;
      // a packed build loads it first (src/packs.ts); without packs it is there already
      void (resident(want) ? Promise.resolve() : ensure([want], lvl.id).catch(() => {})).then(async () => {
        if (destroyed || !resident(want)) return;
        if ((await fetchPicture(fileUrl(want))) && !destroyed && drawn[i] !== want) setArt(i, want);
      });
    });
  }
  /** A picture's file changes under the drawn cards: draw them again once the board is still. */
  let artPending = false;
  function swapArt(a: Art, url: string): void {
    a.url = url;
    if (!opened) return;
    artPending = true;
    if (!busy && !drag && !selected) refreshArt();
  }
  function refreshArt(): void {
    artPending = false;
    redrawAll(shown);
    if (guideMode) relight();
  }

  let resizePending = false;
  function relayout(): void {
    resizePending = false;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    const g = layout(w, h, deal.cols, deal.rows, peekOf(lvl));
    if (g.s === geo.s && g.sh === geo.sh && g.left === geo.left && g.top === geo.top) return;
    geo = g;
    sharpen();
    stopHint();
    applyLayout();
    redrawAll(shown);
    if (guideMode) relight();
  }
  let sized: (() => void) | null = null;
  const ro = new ResizeObserver(() => {
    const onScreen = host.clientWidth > 0 && host.clientHeight > 0;
    if (sized && onScreen) {
      sized();
      sized = null;
    }
    // the screens keep a board in hand while the player is at home: its time stands still there
    if (!onScreen) clockOff();
    else if (opened && onScreenNow()) clockOn();
    if (busy || drag || selected) resizePending = true;
    else relayout();
  });
  ro.observe(host);

  // ---------------------------------------------------------------- open

  applyLayout();
  drawStacks(state);
  queueMicrotask(() => emit("board:start", { level: name }));
  changed();
  busy++;
  void (async () => {
    // the pictures and the config's tuning, together, never longer than 2.5 s
    const tuning = Promise.race([tuned, new Promise<void>((r) => setTimeout(r, 2500))]);
    // a board opened in a box not on screen yet (the screens open it, then show it) picks
    // its pictures, and deals, once the box has its size
    if (!host.clientWidth || !host.clientHeight) await new Promise<void>((r) => (sized = r));
    if (destroyed) return;
    const cardW = layout(host.clientWidth, host.clientHeight, deal.cols, deal.rows, peekOf(lvl)).s;
    // a packed build: what the board wants that the screens have not loaded (none, as a rule)
    const wanted = pics.flatMap((p, i) => choose(p.id, art[i]!.cols, art[i]!.rows, cardW)?.want ?? []);
    const missing = wanted.filter((rel) => !resident(rel));
    const ready = (missing.length ? ensure(missing, lvl.id).catch(() => {}) : Promise.resolve()).then(() => Promise.all(pics.map(async (p, i) => {
      if (destroyed) return;
      pick(i, cardW);
      if (!drawn[i] || (await fetchPicture(fileUrl(drawn[i]!)))) return;
      // Art's board copy would not load: the full picture instead, from now on
      const f = pictureFiles.get(p.id);
      if (!f || drawn[i] !== f.board) return;
      brokenCopies.add(f.board);
      if (!resident(f.file)) await ensure([f.file], lvl.id).catch(() => {});
      await fetchPicture(fileUrl(f.file));
      if (!destroyed) setArt(i, f.file);
    }))).then(() => {});
    await Promise.all([Promise.race([ready, new Promise<void>((r) => setTimeout(r, 2500))]), tuning]);
    changed();
    // hidden again while its pictures came (the player went home): deal once it is back
    if (!host.clientWidth || !host.clientHeight) await new Promise<void>((r) => (sized = r));
    if (destroyed) return;
    busy--;
    relayout();
    await run2(opening);
    opened = true;
    if (onScreenNow()) clockOn();
    // the next board's pictures, quietly, once this one is dealt
    if (typeof which === "number" && which < levelCount()) {
      // at the card size the next board will have in this box
      const next = levelOf(which + 1);
      const files = boardFiles(next, host);
      void ensure(files, next.id).catch(() => {}).then(() => preload(files.filter((rel) => resident(rel)).map((rel) => fileUrl(rel)), 10_000, true));
    }
  })();

  // Test hooks for the play-test tool (dev builds only; the build drops this).
  if (import.meta.env.DEV) {
    Object.assign(window, {
      __board: {
        state: () => state,
        busy: () => busy > 0,
        line: () => lvl.line,
        /** Where a cell's centre is on screen (through the tilt when it is on). */
        point(cell: number): { x: number; y: number } {
          const r = (slotsEl.children[cell] as HTMLElement).getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        },
      },
    });
  }

  return {
    undo() {
      stopHint();
      if (busy || won || drag || !history.length) return false;
      if (selected) {
        settleBack(selected.v);
        selected = null;
      }
      const prev = history.pop()!;
      actions.pop();
      // back past a shuffle: that shuffle's line goes (a lesson keeps none from before its shuffle)
      while (plans.length > (lvl.shuffle ? 0 : 1) && plans[plans.length - 1]!.at > actions.length) plans.pop();
      state = prev;
      emit("helper:undo", used("undo"));
      void run2(() => morph(prev));
      return true;
    },
    hint() {
      if (busy || won || drag) return false;
      // only moves of a line the real rules win from here (the solver's); never a guess
      let m = onLine();
      if (!m) {
        const next = nextMove(state, 20_000);
        if ("doomed" in next) {
          // certain: the solver's "doomed" is checked against the real rules (said already, as a rule)
          setStuck(true);
          return false;
        }
        if (!("move" in next)) {
          // no line within the budget proves nothing either way: no hint, nothing spent
          emit("helper:refused", { helper: "hint" });
          return false;
        }
        m = next.move;
        // later hints follow this line, without a search, while the player does
        const first = next.line[0];
        if (first && first.from === m.from && first.to === m.to) plans.push({ at: actions.length, line: next.line });
      }
      // the tutorial's hints are a lesson's: the screens spend nothing for them
      emit("helper:hint", used("hint"));
      changed();
      showHint(m);
      return true;
    },
    shuffle() {
      stopHint();
      if (busy || won || drag) return false;
      const out = lessonMix() ?? rescue(state);
      if (!out) {
        emit("helper:refused", { helper: "shuffle" });
        return false;
      }
      if (selected) {
        settleBack(selected.v);
        selected = null;
      }
      history.push(state);
      actions.push(out.action);
      plans.push({ at: actions.length, line: out.line });
      state = out.state;
      announceIfSolved();
      emit("helper:shuffle", used("shuffle"));
      void run2(() => show(out.steps));
      return true;
    },
    lesson(k) {
      if (k) lessonNext.add(k);
      else lessonNext.clear();
    },
    grantFree(k, n = 1) {
      const add = Math.max(0, Math.floor(n));
      if (add) freeLeft.set(k, (freeLeft.get(k) ?? 0) + add);
    },
    restart() {
      stopHint();
      // solved, the finish still playing: the win stands and the card follows
      if (solved && !won) return;
      if (busy) {
        pendingRestart = true;
        reveal?.skip(); // a postcard on show goes at once
        return;
      }
      if (drag) {
        drag.stop();
        drag = null;
        clearPreview();
      }
      void doRestart();
    },
    canUndo: () => history.length > 0 && !won,
    guide(mode) {
      guideMode = mode;
      if (mode === "hold" && selected) {
        settleBack(selected.v);
        selected = null;
      }
      relight();
    },
    // a destination is its whole postcard here (the win card shows the place, not the window)
    pictures: () => pics.map((p, i) => ({ id: p.id, src: art[i]!.url, cols: art[i]!.cols, rows: art[i]!.rows })),
    destroy() {
      stopHint();
      destroyed = true;
      clearTimeout(stuckCheck);
      // a postcard on show goes with the board; the screens' name banner with it, when it was up
      if (reveal) {
        const wasOpen = reveal.isOpen();
        reveal.close();
        if (wasOpen) emit("destination:done", { id: pics[destPic]!.id });
      }
      ro.disconnect();
      drag?.stop();
      stopAll();
      clockOff();
      document.removeEventListener("visibilitychange", onVisible);
      removeEventListener("blur", onBlur);
      stage.remove();
    },
    // the dev menu's controls; a release build drops them, dev.ts and all
    dev: import.meta.env.MODE !== "release" ? makeDev({
      level: lvl,
      name,
      moves: () => state.moves,
      played: () => (actions.some((a) => "shuffle" in a) ? null : actions.map((a) => ({ ...(a as Move) }))),
      busy: () => busy > 0 || !opened,
      won: () => won,
      finishing: () => !!solved && !won,
      closed: () => destroyed,
      async restart() {
        if (solved && !won) return false;
        while (busy && !destroyed) await new Promise((r) => setTimeout(r, 40));
        if (destroyed || (solved && !won)) return false;
        stopHint();
        if (drag) {
          drag.stop();
          drag = null;
          clearPreview();
        }
        await doRestart();
        return !destroyed;
      },
      async play(m) {
        const v = viewWith(m.from);
        if (!v || busy || won || destroyed) return false;
        if (selected) {
          settleBack(selected.v);
          selected = null;
        }
        lift(v);
        emit("piece:lift", { cards: v.cells.length });
        await play(m, v);
        return true;
      },
      ghost: (m) => showHint(m),
      hold(on) {
        driven = on;
        if (on) press = null;
      },
      setEndless(on) {
        endlessHelpers = on;
      },
      endless: () => endlessHelpers,
      hintMs: () => TUNING.hintMs,
    }) : undefined,
  };
}
