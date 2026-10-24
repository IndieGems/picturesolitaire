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
}

export interface Geometry {
  cols: number;
  rows: number;
  /** Card size and gutter, in CSS px. */
  s: number;
  g: number;
  /** The grid's top-left in the plane. */
  gridX: number;
  gridY: number;
  /** The whole board (stacks + grid), in CSS px, and where it sits in the host. */
  width: number;
  height: number;
  left: number;
  top: number;
  /** The stacks' row: its height, a stack's face (its top card) and that face's top in the row. */
  stackH: number;
  face: number;
  faceTop: number;
  /** How far the second upcoming card fans out above the first, and the most layers a pile shows. */
  fan: number;
  layers: number;
}

/** The stacks' row, as fractions of a card: roomy, and compact for a short box (a phone held sideways). */
const ROOMY = { row: 1.18, gap: 0.2, face: 0.8, top: 0.22, fan: 0.2, layers: 6 };
const COMPACT = { row: 0.8, gap: 0.1, face: 0.62, top: 0.1, fan: 0.09, layers: 3 };
/** Cards smaller than this (CSS px) with the roomy stacks: use the compact ones. */
const COMPACT_BELOW = 56;

/**
 * The largest a card is drawn: a desktop with a mouse keeps the board at a
 * comfortable size in its letterbox (maxCard); on a touch screen the board
 * grows to fill its box (maxCardTouch), so a big tablet is not left 70% full.
 */
const coarse = typeof matchMedia === "function" ? matchMedia("(pointer: coarse)") : null;
const cardCap = () => (coarse?.matches ? TUNING.maxCardTouch : TUNING.maxCard);

/** Fit the stacks and the grid, with square cards, inside a host of w x h. */
export function layout(w: number, h: number, cols: number, rows: number): Geometry {
  const pad = Math.max(10, Math.min(18, w * 0.035));
  const G = TUNING.gutter;
  const unitsW = cols + (cols - 1) * G;
  const cap = cardCap();
  const size = (st: typeof ROOMY) => Math.floor(Math.min((w - 2 * pad) / unitsW, (h - 2 * 6) / (st.row + st.gap + rows + (rows - 1) * G), cap));
  // the roomy stacks, unless the box is so short (a phone held sideways) that cards would come out small
  const st = size(ROOMY) < COMPACT_BELOW && size(COMPACT) > size(ROOMY) ? { ...COMPACT, row: TUNING.stackRow * (COMPACT.row / ROOMY.row) } : { ...ROOMY, row: TUNING.stackRow, gap: TUNING.stackGap };
  const s = Math.max(24, size(st));
  const g = Math.max(3, Math.round(s * G));
  const width = cols * s + (cols - 1) * g;
  const gridY = Math.round(s * (st.row + st.gap));
  const height = gridY + rows * s + (rows - 1) * g;
  return {
    cols, rows, s, g,
    gridX: 0, gridY,
    width, height,
    left: Math.round((w - width) / 2),
    top: Math.max(0, Math.round((h - height) / 2)),
    stackH: Math.round(s * st.row),
    face: Math.round(s * st.face),
    faceTop: Math.round(s * st.top),
    fan: Math.round(s * st.fan),
    layers: st.layers,
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
  const { s, g } = geo;
  const xy = cells.map((c) => [c % geo.cols, (c / geo.cols) | 0] as [number, number]);
  const b = box(xy, s, g);
  const m = Math.ceil(s * 0.16);
  const el = svgCard(xy, cards[0]!, cells[0]!, geo.cols, s, g, art, pictures, b, m);
  const v: PieceView = {
    el, cards: [...cards], cells: [...cells], key: keyOf(cards, cells),
    ox: b.x - m, oy: b.y - m, x: b.x - m, y: b.y - m, k: 1,
  };
  place(v);
  return v;
}

/** A single card face, `size` px square, at the top-left of its own element (a stack's upcoming card). */
export function drawFace(size: number, card: Card, art: Art[], pictures: readonly Picture[]): HTMLDivElement {
  const g = Math.max(2, Math.round(size * TUNING.gutter));
  const b = box([[0, 0]], size, g);
  const m = Math.ceil(size * 0.16);
  const el = svgCard([[0, 0]], card, 0, 1, size, g, art, pictures, b, m);
  el.style.transform = `translate(${-m}px, ${-m}px)`;
  return el;
}

function svgCard(
  xy: [number, number][], card0: Card, cell0: number, cols: number, s: number, g: number,
  art: Art[], pictures: readonly Picture[], b: { x: number; y: number; w: number; h: number }, m: number,
): HTMLDivElement {
  const L = loops(xy, s, g);
  // the frame (tools/art/chrome-spec.md): the picture's window sits `rim` inside
  // the outline, its corners concentric with the outline's
  const rim = Math.max(TUNING.frameMin, s * TUNING.frame);
  const R = s * 0.14;
  const outer = path(L, R, R);
  const inner = path(inset(L, rim), Math.max(1, R - rim), R + rim);
  const pic = card0 >> 5;
  const a = art[pic]!;
  const [x0, y0] = xyOf(pictures, card0);
  const c0 = cell0 % cols;
  const r0 = (cell0 / cols) | 0;
  const imgX = (c0 - x0) * (s + g) - g / 2;
  const imgY = (r0 - y0) * (s + g) - g / 2;
  const id = `bd-clip-${++clipId}`;
  const W = b.w + 2 * m;
  const H = b.h + 2 * m;
  const el = document.createElement("div");
  el.className = "bd-piece";
  el.style.width = `${W}px`;
  el.style.height = `${H}px`;
  el.innerHTML =
    `<svg xmlns="${SVGNS}" width="${W}" height="${H}" viewBox="${b.x - m} ${b.y - m} ${W} ${H}">` +
    `<defs><clipPath id="${id}"><path d="${inner}"/></clipPath></defs>` +
    `<g class="bd-body"><path d="${outer}" transform="translate(0 ${(s * 0.035).toFixed(2)})" fill="url(#bd-lip)"/>` +
    `<path d="${outer}" fill="url(#bd-rim)"/>` +
    `<path d="${outer}" fill="none" stroke="url(#bd-hi)" stroke-width="1.2"/></g>` +
    `<image href="${a.url}" x="${imgX.toFixed(2)}" y="${imgY.toFixed(2)}" width="${(a.cols * (s + g)).toFixed(2)}" height="${(a.rows * (s + g)).toFixed(2)}" preserveAspectRatio="none" clip-path="url(#${id})"/>` +
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
  const { s, g } = geo;
  const xy = cells.map((c) => [c % geo.cols, (c / geo.cols) | 0] as [number, number]);
  const out = Math.max(2, s * 0.06);
  const p = document.createElementNS(SVGNS, "path");
  p.setAttribute("d", path(inset(loops(xy, s, g), -out), s * 0.14 + out, Math.max(1, s * 0.14 - out)));
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
  const b = box(v.cells.map((c) => [c % geo.cols, (c / geo.cols) | 0] as [number, number]), geo.s, geo.g);
  const m = Math.ceil(geo.s * 0.16);
  const dx = vb.x - (b.x - m);
  const dy = vb.y - (b.y - m);
  if (dx || dy) ring.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
  svg.append(ring);
}

/** The guide's ring on its own, round the cells where a piece should go. */
export function drawRing(geo: Geometry, cells: readonly number[], className: string): HTMLDivElement {
  const { s, g } = geo;
  const b = box(cells.map((c) => [c % geo.cols, (c / geo.cols) | 0] as [number, number]), s, g);
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

/** Draw one stack: its pile (as many layers as it has cards, up to the layout's most) and the upcoming cards the level shows. */
/**
 * A face-down card's look: the table's own card back when the screens set
 * --stack-back on :root (an absolute url(...)), else `fallback`. A CSS
 * background, so a new table shows at once, with nothing to call.
 */
export function backImage(fallback: string): string {
  return `var(--stack-back, url("${fallback}"))`;
}

export function drawStack(
  sv: StackView, geo: Geometry, stack: readonly Card[], peek: number, art: Art[], pictures: readonly Picture[], backUrl: string,
): void {
  const { face, faceTop, s, fan } = geo;
  sv.el.replaceChildren();
  const x0 = Math.round((s - face) / 2);
  if (!stack.length) {
    const slot = document.createElement("div");
    slot.className = "bd-slot";
    slot.style.cssText = `left:${x0}px;top:${faceTop}px;width:${face}px;height:${face}px;border-radius:${Math.round(face * 0.16)}px`;
    sv.el.append(slot);
    return;
  }
  const step = Math.max(2, Math.round(face * 0.035));
  const layers = Math.min(geo.layers, stack.length);
  for (let i = layers - 1; i >= 0; i--) {
    const back = document.createElement("div");
    back.className = i ? "bd-back under" : "bd-back";
    back.style.cssText = `left:${x0}px;top:${faceTop + i * step}px;width:${face}px;height:${face}px;${i ? `filter:brightness(${(1 - i * 0.1).toFixed(2)})` : ""}`;
    back.style.backgroundImage = backImage(backUrl);
    sv.el.append(back);
  }
  // the level's upcoming cards, face up: the next on the pile, the one after it fanned behind
  const shown = Math.min(peek, stack.length);
  for (let i = shown - 1; i >= 0; i--) {
    const f = drawFace(face, stack[i]!, art, pictures);
    f.classList.add("bd-peek");
    const wrap = document.createElement("div");
    wrap.className = "bd-peek-at";
    wrap.style.cssText = `left:${x0}px;top:${i === 0 ? faceTop : faceTop - fan}px;width:${face}px;height:${face}px`;
    if (i > 0) wrap.style.filter = "brightness(0.82)";
    wrap.append(f);
    sv.el.append(wrap);
  }
}

// ---------------------------------------------------------------- cells

export function cellRect(geo: Geometry, cell: number): { x: number; y: number } {
  return { x: colOf(geo, cell) * (geo.s + geo.g), y: rowOf(geo, cell) * (geo.s + geo.g) };
}

/** The cell under a grid point (px), or -1 off the grid. */
export function cellAt(geo: Geometry, x: number, y: number): number {
  const p = geo.s + geo.g;
  const c = Math.floor((x + geo.g / 2) / p);
  const r = Math.floor((y + geo.g / 2) / p);
  if (c < 0 || c >= geo.cols || r < 0 || r >= geo.rows) return -1;
  return r * geo.cols + c;
}

/** The nearest cell to a grid point, clamped to the grid. */
export function nearestCell(geo: Geometry, x: number, y: number): number {
  const p = geo.s + geo.g;
  const c = Math.max(0, Math.min(geo.cols - 1, Math.round(x / p)));
  const r = Math.max(0, Math.min(geo.rows - 1, Math.round(y / p)));
  return r * geo.cols + c;
}

export { EMPTY };
