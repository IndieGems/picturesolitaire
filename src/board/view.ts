// What the board looks like: its layout in the host box, the cards and merged
// pieces (one SVG each: frame, lip and the picture, clipped to the window),
// the stacks, and the effects layer. No rules and no input here.
//
// Tech choice: DOM elements moved by CSS transforms, one inline SVG per piece.
// The pictures stay crisp at any size (the browser scales the image once per
// element, not every frame), a merged piece of any shape is one path, and at
// rest nothing is drawn at all: a still board costs no frames.

import { EMPTY, colOf, rowOf, xyOf, type Card, type Picture, type State } from "../game/rules.ts";
import { box, inset, loops, path } from "./shape.ts";
import { TUNING } from "./tuning.ts";

export interface Art {
  /** The picture's address, by index into the deal's pictures. */
  url: string;
  cols: number;
  rows: number;
  /**
   * A window into a bigger picture (a destination's postcard, `cols` x `rows`
   * the whole board): the cell of it the picture's top-left card shows.
   */
  dx?: number;
  dy?: number;
}

export interface Geometry {
  cols: number;
  rows: number;
  /** A card's width and height (portrait: TUNING.cardAspect) and the gutter, in CSS px. */
  s: number;
  sh: number;
  g: number;
  /** The grid's top-left in the plane. */
  gridX: number;
  gridY: number;
  /** The whole board (stacks + grid), in CSS px, and where it sits in the host. */
  width: number;
  height: number;
  left: number;
  top: number;
  /**
   * The stacks' row: its height, a stack's face (its top card: width, height)
   * and that face's top in the row, near the row's floor: the room above it is
   * for the cards waiting under it.
   */
  stackH: number;
  face: number;
  faceH: number;
  faceTop: number;
  /** How far the second upcoming card fans out above the first (a level that shows two). */
  fan: number;
  /**
   * The cards waiting under a stack's top card, face down, each `edge` px
   * higher than the one in front of it (whole device pixels), so only its top
   * edge shows: one edge a card, up to `edges` of them (what fits above the face).
   */
  edge: number;
  edges: number;
}

/**
 * The stacks' row, as fractions of a card: roomy, and compact for a short box
 * (a small phone on a tall board). `face` is of a card's width (a portrait
 * face, so its height is the same share of a card's height); the rest of its
 * height. Either row grows, if it must, to hold the face, the most edges
 * (TUNING.stackEdge x stackEdges) above it and FACE_FLOOR under it.
 */
const ROOMY = { row: 1.18, gap: 0.2, face: 0.8, fan: 0.2 };
const COMPACT = { row: 0.8, gap: 0.1, face: 0.62, fan: 0.09 };
/** Under a stack's face, in the row: a sliver, the row's gap does the parting. */
const FACE_FLOOR = 0.02;
/** Cards smaller than this (CSS px) with the roomy stacks: use the compact ones. */
const COMPACT_BELOW = 56;
const dpr = () => (typeof devicePixelRatio === "number" && devicePixelRatio > 0 ? devicePixelRatio : 1);

/**
 * The largest a card is drawn: a desktop with a mouse keeps the board at a
 * comfortable size in its letterbox (maxCard); on a touch screen the board
 * grows to fill its box (maxCardTouch), so a big tablet is not left 70% full.
 */
const coarse = typeof matchMedia === "function" ? matchMedia("(pointer: coarse)") : null;
const cardCap = () => (coarse?.matches ? TUNING.maxCardTouch : TUNING.maxCard);

/** A card's width ÷ height, from the tuning (kept sane against a bad config value). */
export const cardAspect = () => (Number.isFinite(TUNING.cardAspect) ? Math.min(2, Math.max(0.4, TUNING.cardAspect)) : 0.75);

/**
 * Fit the stacks and the grid, with portrait cards (TUNING.cardAspect), inside
 * a host of w x h. The stacks' row is the same whether the level shows its
 * next card or only backs (`_peek`), so the switch never resizes the board.
 */
export function layout(w: number, h: number, cols: number, rows: number, _peek = 0): Geometry {
  return TUNING.flat ? layoutFlat(w, h, cols, rows) : layoutFramed(w, h, cols, rows);
}

/** The flat look's gap between cards, in whole CSS px. */
const hairline = () => Math.max(1, Math.round(Number.isFinite(TUNING.hairline) ? TUNING.hairline : 4));

/**
 * A card's corner radius at `s` px wide: the flat look's small one (TUNING.corner,
 * at least 3 px), or the frosted frame's. Board, stacks, rings and glow alike.
 */
export const radiusOf = (s: number): number => (TUNING.flat ? Math.max(3, s * TUNING.corner) : s * 0.14);

/**
 * The flat look: the grid as wide as the box allows less sidePad each side,
 * hairline gaps, and each stack a full card on top of its column (its face
 * the next card, the cards under it an edge each above it), flatStackGap of a
 * card's height over the grid. Cards as big as the width or the height allow.
 */
function layoutFlat(w: number, h: number, cols: number, rows: number): Geometry {
  const pad = Math.max(0, TUNING.sidePad);
  const g = hairline();
  const A = cardAspect();
  const most = Math.max(0, Math.round(TUNING.stackEdges));
  const step = Math.max(0, TUNING.stackEdge);
  const least = Math.max(1, TUNING.stackEdgeMin);
  const gap = Math.max(0, TUNING.flatStackGap);
  const vpad = 6;
  // in card heights: the rows, the stack's face, its gap and its edges (each at least `least` px)
  const avail = h - 2 * vpad - (rows - 1) * g;
  let shH = avail / (rows + 1 + gap + most * step);
  if (most && shH * step < least) shH = (avail - most * least) / (rows + 1 + gap);
  const byW = (w - 2 * pad - (cols - 1) * g) / cols;
  const s = Math.max(24, Math.floor(Math.min(byW, shH * A, cardCap())));
  const sh = Math.round(s / A);
  const k = dpr();
  const edge = Math.max(least, Math.round(sh * step * k) / k);
  const stackH = sh + Math.ceil(most * edge);
  const gridY = stackH + Math.max(4, Math.round(sh * gap));
  const width = cols * s + (cols - 1) * g;
  const height = gridY + rows * sh + (rows - 1) * g;
  return {
    cols, rows, s, sh, g,
    gridX: 0, gridY,
    width, height,
    left: Math.round((w - width) / 2),
    top: Math.max(0, Math.round((h - height) / 2)),
    stackH,
    face: s,
    faceH: sh,
    faceTop: stackH - sh,
    fan: Math.round(sh * 0.2),
    edge,
    edges: Math.min(most, Math.floor((stackH - sh + 0.001) / edge)),
  };
}

function layoutFramed(w: number, h: number, cols: number, rows: number): Geometry {
  const pad = Math.max(10, Math.min(18, w * 0.035));
  const G = TUNING.gutter;
  const A = cardAspect();
  const unitsW = cols + (cols - 1) * G;
  const cap = cardCap();
  const most = Math.max(0, Math.round(TUNING.stackEdges));
  const step = Math.max(0, TUNING.stackEdge);
  // a row holds its face, the most edges above it and the sliver under it
  const fit = (st: typeof ROOMY) => ({ ...st, row: Math.max(st.row, st.face + most * step + FACE_FLOOR) });
  // in card widths: the stacks' row and the rows are card heights (1/A widths), the gutters widths
  const size = (st: typeof ROOMY) => Math.floor(Math.min((w - 2 * pad) / unitsW, (h - 2 * 6) / ((st.row + st.gap + rows) / A + (rows - 1) * G), cap));
  const roomy = fit({ ...ROOMY, row: TUNING.stackRow, gap: TUNING.stackGap });
  const compact = fit({ ...COMPACT, row: TUNING.stackRow * (COMPACT.row / ROOMY.row) });
  // the roomy stacks, unless the box is so short that cards would come out small
  let st = size(roomy) < COMPACT_BELOW && size(compact) > size(roomy) ? compact : roomy;
  let s = Math.max(24, size(st));
  // small cards (a 6x6 board on a short phone): the edges' least width, not their share
  // of a card, sets their room, so the row grows by those few px to keep every edge
  const least = most * Math.max(1, TUNING.stackEdgeMin) + 1;
  for (let pass = 0; pass < 3; pass++) {
    const h0 = Math.round(s / A);
    if ((st.row - st.face - FACE_FLOOR) * h0 >= least) break;
    st = { ...st, row: st.face + FACE_FLOOR + (least + 1) / h0 };
    s = Math.max(24, size(st));
  }
  const sh = Math.round(s / A);
  const g = Math.max(3, Math.round(s * G));
  const width = cols * s + (cols - 1) * g;
  const gridY = Math.round(sh * (st.row + st.gap));
  const height = gridY + rows * sh + (rows - 1) * g;
  const stackH = Math.round(sh * st.row);
  const face = Math.round(s * st.face);
  const faceH = Math.round(face / A);
  // the face sits near the row's floor; the edges stack up from it
  const faceTop = Math.max(0, stackH - faceH - Math.round(sh * FACE_FLOOR));
  // an edge in whole device pixels, so every edge of a pile is the same: as
  // tuned, or thinner if rounding up would leave the most edges no room
  const k = dpr();
  const fits = most ? Math.floor((faceTop / most) * k) / k : Infinity;
  const edge = Math.max(Math.max(1, TUNING.stackEdgeMin), Math.min(Math.round(sh * step * k) / k, fits));
  return {
    cols, rows, s, sh, g,
    gridX: 0, gridY,
    width, height,
    left: Math.round((w - width) / 2),
    top: Math.max(0, Math.round((h - height) / 2)),
    stackH,
    face,
    faceH,
    faceTop,
    fan: Math.round(sh * st.fan),
    edge,
    edges: Math.min(most, Math.floor(faceTop / edge)),
  };
}

// ---------------------------------------------------------------- shared SVG defs

const SVGNS = "http://www.w3.org/2000/svg";
let defsMounted = false;
let clipId = 0;

/** The gradients every frame shares, once per page. */
export function mountDefs(): void {
  if (defsMounted) return;
  defsMounted = true;
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  svg.innerHTML = `<defs>
    <linearGradient id="bd-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9eef5"/><stop offset="1" stop-color="#b0bac8"/></linearGradient>
    <linearGradient id="bd-lip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d6979"/><stop offset="1" stop-color="#343d4a"/></linearGradient>
    <linearGradient id="bd-hi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f7fb" stop-opacity="1"/><stop offset="0.18" stop-color="#f4f7fb" stop-opacity="0"/></linearGradient>
  </defs>`;
  document.body.append(svg);
}

// ---------------------------------------------------------------- cards and pieces

export interface PieceView {
  el: HTMLDivElement;
  /** The cards it shows and the cells it shows them on (its resting place). */
  cards: Card[];
  cells: number[];
  key: string;
  /** Its resting top-left in grid px; `x`, `y`, `k` its transform now. */
  ox: number;
  oy: number;
  x: number;
  y: number;
  k: number;
}

export const keyOf = (cards: readonly Card[], cells: readonly number[]) => `${cards.join(".")}@${cells.join(".")}`;

/**
 * One card or merged piece, drawn on its cells: one frame around the whole
 * outline, the picture continuous inside it. `cells` are board cells; `cards`
 * the card on each.
 */
export function drawPiece(geo: Geometry, art: Art[], cells: readonly number[], cards: readonly Card[], pictures: readonly Picture[]): PieceView {
  const { s, sh, g } = geo;
  const xy = cells.map((c) => [c % geo.cols, (c / geo.cols) | 0] as [number, number]);
  const b = box(xy, s, g, sh);
  const m = Math.ceil(s * 0.16);
  const el = svgCard(xy, cards[0]!, cells[0]!, geo.cols, s, sh, g, art, pictures, b, m);
  const v: PieceView = {
    el, cards: [...cards], cells: [...cells], key: keyOf(cards, cells),
    ox: b.x - m, oy: b.y - m, x: b.x - m, y: b.y - m, k: 1,
  };
  place(v);
  return v;
}

/** A single card face, `size` px wide and `sizeH` tall, at the top-left of its own element (a stack's upcoming card). */
export function drawFace(size: number, sizeH: number, card: Card, art: Art[], pictures: readonly Picture[]): HTMLDivElement {
  const g = TUNING.flat ? hairline() : Math.max(2, Math.round(size * TUNING.gutter));
  const b = box([[0, 0]], size, g, sizeH);
  const m = Math.ceil(size * 0.16);
  const el = svgCard([[0, 0]], card, 0, 1, size, sizeH, g, art, pictures, b, m);
  el.style.transform = `translate(${-m}px, ${-m}px)`;
  return el;
}

function svgCard(
  xy: [number, number][], card0: Card, cell0: number, cols: number, s: number, sh: number, g: number,
  art: Art[], pictures: readonly Picture[], b: { x: number; y: number; w: number; h: number }, m: number,
): HTMLDivElement {
  const L = loops(xy, s, g, sh);
  const flat = TUNING.flat;
  // the frame (tools/art/chrome-spec.md): the picture's window sits `rim` inside
  // the outline, its corners concentric with the outline's. Flat: the window is
  // the outline itself, and a thin light edge is stroked just inside it
  const rim = flat ? 0 : Math.max(TUNING.frameMin, s * TUNING.frame);
  const R = radiusOf(s);
  const outer = path(L, R, R);
  const inner = flat ? outer : path(inset(L, rim), Math.max(1, R - rim), R + rim);
  const pic = card0 >> 5;
  const a = art[pic]!;
  const [x0, y0] = xyOf(pictures, card0);
  const c0 = cell0 % cols;
  const r0 = (cell0 / cols) | 0;
  // the whole picture's window (half a gutter round its cells), here placed so
  // this piece's cells show their part of it; the picture is centre-cropped to
  // the window from its own pixel size (slice: object-fit cover), so one drawn
  // for square cells still looks right on portrait ones
  const imgX = (c0 - x0 - (a.dx ?? 0)) * (s + g) - g / 2;
  const imgY = (r0 - y0 - (a.dy ?? 0)) * (sh + g) - g / 2;
  const id = `bd-clip-${++clipId}`;
  const W = b.w + 2 * m;
  const H = b.h + 2 * m;
  const el = document.createElement("div");
  el.className = "bd-piece";
  el.style.width = `${W}px`;
  el.style.height = `${H}px`;
  const image = `<image href="${a.url}" x="${imgX.toFixed(2)}" y="${imgY.toFixed(2)}" width="${(a.cols * (s + g)).toFixed(2)}" height="${(a.rows * (sh + g)).toFixed(2)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
  if (flat) {
    // one picture inside one edge, however many cards: a plain card under it until it loads
    const e = Math.max(0.5, TUNING.edgePx);
    const line = path(inset(L, e / 2), Math.max(0.5, R - e / 2), R + e / 2);
    el.innerHTML =
      `<svg xmlns="${SVGNS}" width="${W}" height="${H}" viewBox="${b.x - m} ${b.y - m} ${W} ${H}">` +
      `<defs><clipPath id="${id}"><path d="${outer}"/></clipPath></defs>` +
      `<path class="bd-body" d="${outer}" fill="#dfe6ee"/>` + image +
      `<path class="bd-line" d="${line}" stroke-width="${e}"/>` +
      `</svg>`;
    return el;
  }
  el.innerHTML =
    `<svg xmlns="${SVGNS}" width="${W}" height="${H}" viewBox="${b.x - m} ${b.y - m} ${W} ${H}">` +
    `<defs><clipPath id="${id}"><path d="${inner}"/></clipPath></defs>` +
    `<g class="bd-body"><path d="${outer}" transform="translate(0 ${(s * 0.035).toFixed(2)})" fill="url(#bd-lip)"/>` +
    `<path d="${outer}" fill="url(#bd-rim)"/>` +
    `<path d="${outer}" fill="none" stroke="url(#bd-hi)" stroke-width="1.2"/></g>` +
    image +
    `<path d="${inner}" fill="none" stroke="#8b97a8" stroke-width="1"/>` +
    `</svg>`;
  return el;
}

/**
 * The guide's ring round `cells`: the piece's own rounded outline, a little
 * outside its frame, stroked in var(--guide-ring) (the screens set it). A path
 * in grid px, so it can go inside a piece's own svg and travel with it.
 */
export function ringPath(geo: Geometry, cells: readonly number[]): SVGPathElement {
  const { s, sh, g } = geo;
  const xy = cells.map((c) => [c % geo.cols, (c / geo.cols) | 0] as [number, number]);
  const out = Math.max(2, s * 0.06);
  const p = document.createElementNS(SVGNS, "path");
  const R = radiusOf(s);
  p.setAttribute("d", path(inset(loops(xy, s, g, sh), -out), R + out, Math.max(1, R - out)));
  p.setAttribute("class", "bd-ring");
  p.setAttribute("stroke-width", Math.max(3, s * 0.065).toFixed(2));
  return p;
}

/**
 * Put the guide's ring on piece `v`. A piece's svg keeps the coordinates of
 * the cells it was drawn on; when it has moved or fallen since, only its
 * element's transform says so. So the ring, built on the piece's cells now,
 * is shifted back into the svg's own coordinates (same shape, so it fits).
 */
export function addRing(geo: Geometry, v: PieceView): void {
  const svg = v.el.querySelector("svg");
  if (!svg) return;
  const ring = ringPath(geo, v.cells);
  const vb = svg.viewBox.baseVal;
  const b = box(v.cells.map((c) => [c % geo.cols, (c / geo.cols) | 0] as [number, number]), geo.s, geo.g, geo.sh);
  const m = Math.ceil(geo.s * 0.16);
  const dx = vb.x - (b.x - m);
  const dy = vb.y - (b.y - m);
  if (dx || dy) ring.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
  svg.append(ring);
}

/** The guide's ring on its own, round the cells where a piece should go. */
export function drawRing(geo: Geometry, cells: readonly number[], className: string): HTMLDivElement {
  const { s, sh, g } = geo;
  const b = box(cells.map((c) => [c % geo.cols, (c / geo.cols) | 0] as [number, number]), s, g, sh);
  const m = Math.ceil(s * 0.16);
  const W = b.w + 2 * m;
  const H = b.h + 2 * m;
  const el = document.createElement("div");
  el.className = className;
  el.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform:translate3d(${b.x - m}px, ${b.y - m}px, 0)`;
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));
  svg.setAttribute("viewBox", `${b.x - m} ${b.y - m} ${W} ${H}`);
  svg.style.display = "block";
  svg.style.overflow = "visible";
  svg.append(ringPath(geo, cells));
  el.append(svg);
  return el;
}

/** Put the piece where its x, y and scale say. */
export function place(v: PieceView): void {
  v.el.style.transform = `translate3d(${v.x.toFixed(2)}px, ${v.y.toFixed(2)}px, 0) scale(${v.k.toFixed(4)})`;
}

/** The board's pieces in `s`, grouped as the rules group them. */
export function piecesOf(s: State, list: number[][]): { cells: number[]; cards: Card[] }[] {
  return list.map((cells) => ({ cells, cards: cells.map((c) => s.board[c]!) }));
}

// ---------------------------------------------------------------- the stacks

export interface StackView {
  el: HTMLDivElement;
}

/**
 * A face-down card's look: the table's own card back when the screens set
 * --stack-back on :root (an absolute url(...)), else `fallback`. A CSS
 * background, so a new table shows at once, with nothing to call.
 */
export function backImage(fallback: string): string {
  return `var(--stack-back, url("${fallback}"))`;
}

/**
 * How many of a stack's `n` cards show as edges above its top card: one a
 * card under the top one, up to what fits (geo.edges).
 */
export const edgesOf = (geo: Geometry, n: number): number => Math.max(0, Math.min(geo.edges, n - 1));

/**
 * Draw one stack: its top card on the face, face up when the level shows it
 * (peek; a second one fanned above it), else the table's back; and under it
 * the cards still waiting, face down, each an edge higher than the one in
 * front of it, so only their top edges show, like a deck seen from the front:
 * one edge a card (edgesOf). An empty stack keeps its dashed slot.
 */
export function drawStack(
  sv: StackView, geo: Geometry, stack: readonly Card[], peek: number, art: Art[], pictures: readonly Picture[], backUrl: string,
): void {
  const { face, faceH, faceTop, s, fan } = geo;
  sv.el.replaceChildren();
  const x0 = Math.round((s - face) / 2);
  const radius = `${Math.round(TUNING.flat ? radiusOf(face) : face * 0.16)}px`;
  if (!stack.length) {
    const slot = document.createElement("div");
    slot.className = "bd-slot";
    slot.style.cssText = `left:${x0}px;top:${faceTop}px;width:${face}px;height:${faceH}px;border-radius:${radius}`;
    sv.el.append(slot);
    return;
  }
  const back = (top: number, className: string) => {
    const el = document.createElement("div");
    el.className = className;
    el.style.cssText = `left:${x0}px;top:${top.toFixed(2)}px;width:${face}px;height:${faceH}px;border-radius:${radius}`;
    el.style.backgroundImage = backImage(backUrl);
    sv.el.append(el);
  };
  // the waiting cards, the furthest first (each nearer one covers all but its top edge)
  for (let i = edgesOf(geo, stack.length); i >= 1; i--) back(faceTop - i * geo.edge, "bd-back bd-edge");
  const shown = Math.min(peek, stack.length);
  if (!shown) return back(faceTop, "bd-back");
  // the level's upcoming cards, face up: the next on the face, the one after it fanned behind
  for (let i = shown - 1; i >= 0; i--) {
    const f = drawFace(face, faceH, stack[i]!, art, pictures);
    f.classList.add("bd-peek");
    const wrap = document.createElement("div");
    wrap.className = "bd-peek-at";
    wrap.style.cssText = `left:${x0}px;top:${i === 0 ? faceTop : faceTop - fan}px;width:${face}px;height:${faceH}px`;
    if (i > 0) wrap.style.filter = "brightness(0.82)";
    wrap.append(f);
    sv.el.append(wrap);
  }
}

// ---------------------------------------------------------------- cells

export function cellRect(geo: Geometry, cell: number): { x: number; y: number } {
  return { x: colOf(geo, cell) * (geo.s + geo.g), y: rowOf(geo, cell) * (geo.sh + geo.g) };
}

/** The cell under a grid point (px), or -1 off the grid. */
export function cellAt(geo: Geometry, x: number, y: number): number {
  const c = Math.floor((x + geo.g / 2) / (geo.s + geo.g));
  const r = Math.floor((y + geo.g / 2) / (geo.sh + geo.g));
  if (c < 0 || c >= geo.cols || r < 0 || r >= geo.rows) return -1;
  return r * geo.cols + c;
}

/** The nearest cell to a grid point, clamped to the grid. */
export function nearestCell(geo: Geometry, x: number, y: number): number {
  const c = Math.max(0, Math.min(geo.cols - 1, Math.round(x / (geo.s + geo.g))));
  const r = Math.max(0, Math.min(geo.rows - 1, Math.round(y / (geo.sh + geo.g))));
  return r * geo.cols + c;
}

export { EMPTY };
