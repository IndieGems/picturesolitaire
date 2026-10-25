// A destination's reveal (the travelogue, creator 2026-10-25): each board may
// have one destination, a real place shown as a postcard the size of the
// whole board, played as an ordinary picture that is a window cut from it.
// When that picture is finished it does not leave quickly like the others:
//
//   1. the finished piece slides to where its window sits in the postcard,
//      laid over the board's grid (a window at col c, row r covers cells
//      c.., r..);
//   2. the postcard unfolds round it, first sideways (the window's rows), then
//      up and down (the full width), each flap swinging out from behind on
//      its hinge, until the whole picture covers the board, framed like one
//      big card; it holds there while the screens show the place's name;
//   3. it fades away, and the board goes on (the cleared cards fall and the
//      stacks refill after it).
//
// Reduced motion, and a repeat on the same opening of the board, crossfade
// the postcard in and out where the piece stands instead. One animation job
// drives it all from one clock, so a tap (skip) jumps straight to the end and
// a pause holds it like every other board animation. Every time is TUNING's
// (revealSlideMs ...).

import { ease, run } from "./pace.ts";
import { TUNING } from "./tuning.ts";
import { place, type Geometry, type PieceView } from "./view.ts";

export interface Reveal {
  /** Resolves when the postcard has gone (played out, skipped or closed). */
  done: Promise<void>;
  /** Jump to the end: the postcard gone, onOpen and onLeave called if they had not been. */
  skip(): void;
  /** The board closed: take the postcard away and call nothing more. */
  close(): void;
  /** The postcard has been fully open (onOpen was called). */
  isOpen(): boolean;
}

export interface RevealOptions {
  geo: Geometry;
  /** The layer over the cards, its corner at the grid's top-left. */
  layer: HTMLElement;
  /** The finished piece, on its own cells. */
  piece: PieceView;
  /** The postcard's address (what the window's cards draw). */
  url: string;
  /** The postcard file's width ÷ height (it is centre-cropped to the board, as the cards are). */
  aspect: number;
  /** The window's top-left cell on the board (col, row). */
  crop: [number, number];
  mode: "full" | "calm" | "short";
  /** The postcard is fully open (the screens show the name now). */
  onOpen(): void;
  /** The postcard starts to leave. */
  onLeave(): void;
}

type Rect = { x0: number; y0: number; x1: number; y1: number };

export function revealPostcard(o: RevealOptions): Reveal {
  const { geo, piece: v } = o;
  const px = geo.s + geo.g;
  const py = geo.sh + geo.g;
  const W = geo.cols * px - geo.g;
  const H = geo.rows * py - geo.g;
  const R = Math.round(geo.s * 0.14);
  const rim = Math.max(TUNING.frameMin, geo.s * TUNING.frame);

  // the picture as the cards draw it: its box reaches half a gutter past the
  // grid on every side, and the file is centre-cropped to that box (slice)
  const IW = geo.cols * px;
  const IH = geo.rows * py;
  const a = o.aspect > 0 ? o.aspect : IW / IH;
  const dw = IW / IH > a ? IW : IH * a;
  const dh = IW / IH > a ? IW / a : IH;
  const ix = -geo.g / 2 + (IW - dw) / 2;
  const iy = -geo.g / 2 + (IH - dh) / 2;

  // the window's cells on the board, and its edges (the hinges): half a gutter outside its cards
  const cols0 = v.cells.map((c) => c % geo.cols);
  const rows0 = v.cells.map((c) => Math.floor(c / geo.cols));
  const cw = Math.max(...cols0) - Math.min(...cols0) + 1;
  const ch = Math.max(...rows0) - Math.min(...rows0) + 1;
  const [cc, cr] = o.crop;
  const clampX = (x: number) => Math.max(0, Math.min(W, Math.round(x)));
  const clampY = (y: number) => Math.max(0, Math.min(H, Math.round(y)));
  const xL = clampX(cc * px - geo.g / 2);
  const xR = clampX((cc + cw) * px - geo.g / 2);
  const yT = clampY(cr * py - geo.g / 2);
  const yB = clampY((cr + ch) * py - geo.g / 2);

  // --- the postcard: its panels (the window, and the flaps round it), the whole of it, its frame
  const card = document.createElement("div");
  card.className = "bd-postcard";
  card.style.cssText = `width:${W}px;height:${H}px;perspective:${Math.round(Math.max(W, H) * 2.2)}px;` +
    `perspective-origin:${(xL + xR) / 2}px ${(yT + yB) / 2}px;transform-origin:${W / 2}px ${H / 2}px;opacity:0`;
  const panel = (r: Rect, origin: string): HTMLDivElement => {
    const el = document.createElement("div");
    el.className = "bd-flap";
    const corner = (x: number, y: number) => (x === 0 || x === W) && (y === 0 || y === H);
    el.style.cssText =
      `left:${r.x0}px;top:${r.y0}px;width:${r.x1 - r.x0}px;height:${r.y1 - r.y0}px;transform-origin:${origin};` +
      `background-image:url("${o.url.replace(/"/g, "%22")}");background-size:${dw.toFixed(2)}px ${dh.toFixed(2)}px;` +
      `background-position:${(ix - r.x0).toFixed(2)}px ${(iy - r.y0).toFixed(2)}px;` +
      `border-radius:${corner(r.x0, r.y0) ? R : 0}px ${corner(r.x1, r.y0) ? R : 0}px ${corner(r.x1, r.y1) ? R : 0}px ${corner(r.x0, r.y1) ? R : 0}px`;
    card.append(el);
    return el;
  };
  const some = (r: Rect) => r.x1 > r.x0 && r.y1 > r.y0;
  const centre = panel({ x0: xL, y0: yT, x1: xR, y1: yB }, "50% 50%");
  type Flap = { el: HTMLDivElement; turn: (deg: number) => string };
  const flaps = (list: [Rect, string, (deg: number) => string][]): Flap[] =>
    list.filter(([r]) => some(r)).map(([r, origin, turn]) => ({ el: panel(r, origin), turn }));
  // sideways first, along the window's rows; then up and down, the full width.
  // Each comes from behind its hinge (90 degrees, edge on) to flat.
  const sideways = flaps([
    [{ x0: 0, y0: yT, x1: xL, y1: yB }, "100% 50%", (d) => `rotateY(${-d}deg)`],
    [{ x0: xR, y0: yT, x1: W, y1: yB }, "0% 50%", (d) => `rotateY(${d}deg)`],
  ]);
  const upDown = flaps([
    [{ x0: 0, y0: 0, x1: W, y1: yT }, "50% 100%", (d) => `rotateX(${d}deg)`],
    [{ x0: 0, y0: yB, x1: W, y1: H }, "50% 0%", (d) => `rotateX(${-d}deg)`],
  ]);
  // the whole postcard in one piece, for once it is open (no seams between flaps)
  const whole = panel({ x0: 0, y0: 0, x1: W, y1: H }, "50% 50%");
  whole.style.visibility = "hidden";
  const frame = document.createElement("div");
  frame.className = "bd-postcard-rim";
  frame.style.cssText = `border-radius:${R}px;opacity:0;box-shadow:` +
    `inset 0 0 0 ${rim.toFixed(1)}px #e3e9f1, inset 0 0 0 ${(rim + 1).toFixed(1)}px #8b97a8,` +
    `0 ${(geo.s * 0.035).toFixed(1)}px 0 #4a5564, 0 ${(geo.s * 0.07).toFixed(1)}px ${(geo.s * 0.12).toFixed(1)}px rgba(8,14,22,0.5)`;
  card.append(frame);
  o.layer.append(card);

  // --- the timeline, in board ms
  const crossfade = o.mode !== "full";
  const from = { x: v.x, y: v.y };
  const to = { x: v.x + (cc - Math.min(...cols0)) * px, y: v.y + (cr - Math.min(...rows0)) * py };
  const travels = Math.hypot(to.x - from.x, to.y - from.y) > 0.5;
  const S = crossfade || !travels ? 0 : TUNING.revealSlideMs;
  const U = crossfade ? TUNING.revealFadeMs : TUNING.revealUnfoldMs;
  const open = S + U;
  const hold = o.mode === "short" ? TUNING.revealShortHoldMs : TUNING.revealHoldMs;
  const leave = crossfade ? TUNING.revealFadeMs : TUNING.revealLeaveMs;
  const end = open + hold + leave;
  const span = (t: number, t0: number, ms: number) => (ms <= 0 ? (t >= t0 ? 1 : 0) : Math.max(0, Math.min(1, (t - t0) / ms)));

  if (crossfade) {
    for (const f of [...sideways, ...upDown]) f.el.style.transform = f.turn(0);
  } else {
    for (const f of [...sideways, ...upDown]) {
      f.el.style.transform = f.turn(90);
      f.el.style.setProperty("--shade", "0.5");
    }
    v.el.classList.add("lifted");
  }

  let t = 0;
  let opened = false;
  let left = false;
  let ended = false;
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));

  const unfold = (list: Flap[], p: number) => {
    const d = 90 * (1 - ease.out(p));
    for (const f of list) {
      f.el.style.transform = f.turn(d);
      f.el.style.setProperty("--shade", (0.5 * Math.sin((d * Math.PI) / 180)).toFixed(3));
    }
  };

  function draw(): void {
    if (crossfade) {
      const inP = span(t, 0, U);
      const outP = span(t, open + hold, leave);
      card.style.opacity = String(inP * (1 - outP));
      frame.style.opacity = "1";
      v.el.style.opacity = String(1 - inP);
    } else {
      // 1. the piece slides to its window's place, rising a little on the way
      const sp = span(t, 0, S);
      const e = ease.inOut(sp);
      v.x = from.x + (to.x - from.x) * e;
      v.y = from.y + (to.y - from.y) * e;
      v.k = 1 + 0.05 * Math.sin(Math.PI * sp);
      place(v);
      if (t < S) return;
      // 2. the window shows over the piece, and the flaps swing out from behind it
      card.style.opacity = "1";
      centre.style.opacity = String(span(t, S, U * 0.15));
      v.el.style.opacity = t >= S + U * 0.15 ? "0" : "1";
      unfold(sideways, span(t, S, U * 0.55));
      unfold(upDown, span(t, S + U * 0.45, U * 0.55));
      frame.style.opacity = String(ease.inOut(span(t, S + U * 0.7, U * 0.3)));
      // 3. it leaves: fading, settling back a little
      const lp = span(t, open + hold, leave);
      card.style.opacity = String(1 - ease.in(lp));
      card.style.transform = lp > 0 ? `scale(${(1 - 0.03 * ease.out(lp)).toFixed(4)})` : "";
    }
    if (t >= open && !opened) {
      // open: one picture now, no seams between flaps
      whole.style.visibility = "";
      for (const f of [centre, ...sideways.map((x) => x.el), ...upDown.map((x) => x.el)]) f.style.visibility = "hidden";
      opened = true;
      o.onOpen();
    }
    if (t >= open + hold && !left) {
      left = true;
      o.onLeave();
    }
  }

  function finish(call: boolean): void {
    if (ended) return;
    ended = true;
    stop();
    if (call && !opened) {
      opened = true;
      o.onOpen();
    }
    if (call && !left) {
      left = true;
      o.onLeave();
    }
    card.remove();
    v.el.style.opacity = "0";
    resolve();
  }

  draw();
  const stop = run((dt) => {
    t += dt;
    if (t >= end) {
      finish(true);
      return false;
    }
    draw();
    return true;
  });

  return {
    done,
    skip: () => finish(true),
    close: () => finish(false),
    isOpen: () => opened,
  };
}
