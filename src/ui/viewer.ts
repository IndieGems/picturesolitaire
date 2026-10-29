// One restored picture, full screen, to look at closely: pinch or double-tap
// to zoom, drag to look around, the mouse wheel on a desktop. Only the picture
// zooms: the stage takes every touch itself (touch-action: none), so the page
// never does (src/ui/browser.ts refuses iOS's own pinch as well).
//
// Nothing runs while nobody touches it: each move sets one transform, with no
// animation loop (the game standard, "Nothing runs at rest").
//
// Its top row is every screen's: the picture's title on the left, Back (which
// closes it) and the gear at the right end. To a keyboard it is a dialog
// (dialogs.ts): the focus moves to its Back, Escape closes it, and the focus
// goes back to the picture it was opened from.
//
// It shows the copy already on screen at once (the win card's, the album's thumb),
// stretched, and swaps in the full picture once it has loaded and decoded: only
// this view ever fetches a full picture (the creator, 2026-10-25). In a built game
// that picture is in its board's full-picture pack (src/packs.ts): `board` names it.
//
// The win card's copy (app.ts) also
// closes on a single tap while the picture is not zoomed in (`tapToClose`): a
// look, then back to the card.

import { ICONS } from "./icons";
import { liveAttr, t } from "./i18n";
import { pictureTitle, pictureUrl, type Picture } from "./catalogue";
import { ensure, resident } from "../packs";
import { screenChanged } from "./browser";
import { pictureAspect } from "./cards";
import { closed, opened } from "./dialogs";

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 320;
const TAP_SLOP = 12;

export interface Viewer {
  element: HTMLElement;
  /**
   * Show `p` big: `shown` is the address of the copy already on screen, drawn until the full one
   * lands; `board` is the board whose packs hold its full picture (a built game).
   */
  open(p: Picture, shown?: string, board?: string): void;
  close(): void;
  isOpen(): boolean;
}

export function createViewer(options: { tapToClose?: boolean } = {}): Viewer {
  const element = document.createElement("div");
  element.className = "viewer";
  element.hidden = true;
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "true");

  const title = document.createElement("div");
  title.className = "top-pill glass";
  const back = document.createElement("button");
  back.type = "button";
  back.className = "btn round top-back";
  back.dataset.press = "viewer.close";
  back.innerHTML = ICONS.back;
  liveAttr(back, "aria-label", "viewer.close");

  const stage = document.createElement("div");
  stage.className = "viewer-stage";
  const zoom = document.createElement("div");
  zoom.className = "viewer-zoom";
  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;
  img.decoding = "async";
  zoom.append(img);
  stage.append(zoom);
  element.append(title, back, stage);

  let aspect = 1; // width / height: cols cards across, rows down, in the board's card shape (cards.ts)
  let s = 1;
  let tx = 0;
  let ty = 0;
  /** The picture's box inside the stage at zoom 1 (fitted whole, centred). */
  let fit = { x: 0, y: 0, w: 0, h: 0 };
  let W = 0;
  let H = 0;

  function layout(): void {
    W = stage.clientWidth;
    H = stage.clientHeight;
    if (!W || !H) return;
    const pad = 12;
    const w = Math.min(W - pad * 2, (H - pad * 2) * aspect);
    const h = w / aspect;
    fit = { x: (W - w) / 2, y: (H - h) / 2, w, h };
    zoom.style.width = `${W}px`;
    zoom.style.height = `${H}px`;
    Object.assign(img.style, { left: `${fit.x}px`, top: `${fit.y}px`, width: `${w}px`, height: `${h}px` });
    apply();
  }

  /** Keep the picture on screen: centred while it is smaller than the stage, edge to edge once bigger. */
  function clampAxis(t: number, at: number, size: number, room: number): number {
    const shown = size * s;
    if (shown <= room) return (room - shown) / 2 - at * s;
    return Math.min(-at * s, Math.max(room - (at + size) * s, t));
  }

  function apply(): void {
    tx = clampAxis(tx, fit.x, fit.w, W);
    ty = clampAxis(ty, fit.y, fit.h, H);
    zoom.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  }

  /** Zoom to `next` keeping the point (px, py) of the stage where it is. */
  function zoomAt(px: number, py: number, next: number): void {
    const n = Math.min(MAX_ZOOM, Math.max(1, next));
    tx = px - ((px - tx) * n) / s;
    ty = py - ((py - ty) * n) / s;
    s = n;
    apply();
  }

  // ---- touch and mouse ----
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: { d: number; s: number; cx: number; cy: number } | null = null;
  let pan: { x: number; y: number } | null = null;
  let downAt = { x: 0, y: 0, time: 0 };
  let moved = false;
  let lastTap = { x: 0, y: 0, time: -Infinity };
  /** A single tap's close, held back a double tap's time in case it was the first of two. */
  let closeTimer: number | undefined;

  const local = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const two = () => [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];

  function startPinch(): void {
    const [a, b] = two();
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    // the picture's own point under the fingers' middle, at zoom s
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s, cx: (cx - tx) / s, cy: (cy - ty) / s };
    pan = null;
  }

  stage.addEventListener("pointerdown", (e) => {
    clearTimeout(closeTimer);
    stage.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) {
      pan = p;
      moved = false;
      downAt = { ...p, time: e.timeStamp };
    } else if (pointers.size === 2) {
      moved = true;
      startPinch();
    }
  });

  stage.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (Math.hypot(p.x - downAt.x, p.y - downAt.y) > TAP_SLOP) moved = true;
    if (pinch && pointers.size >= 2) {
      const [a, b] = two();
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      s = Math.min(MAX_ZOOM, Math.max(1, (pinch.s * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d));
      tx = cx - pinch.cx * s;
      ty = cy - pinch.cy * s;
      apply();
    } else if (pan) {
      tx += p.x - pan.x;
      ty += p.y - pan.y;
      pan = p;
      apply();
    }
  });

  function lift(e: PointerEvent): void {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size === 1) {
      pinch = null;
      pan = [...pointers.values()][0]!;
      return;
    }
    if (pointers.size > 0) return;
    pinch = null;
    pan = null;
    if (e.type !== "pointerup" || moved) return;
    // a tap: a second one soon after, near the first, zooms in there (or back out)
    const p = local(e);
    if (e.timeStamp - lastTap.time < DOUBLE_TAP_MS && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < TAP_SLOP * 3) {
      zoomAt(p.x, p.y, s > 1.05 ? 1 : DOUBLE_TAP_ZOOM);
      lastTap = { x: 0, y: 0, time: -Infinity };
    } else {
      lastTap = { ...p, time: e.timeStamp };
      if (options.tapToClose && s <= 1.05) closeTimer = window.setTimeout(close, DOUBLE_TAP_MS);
    }
  }
  stage.addEventListener("pointerup", lift);
  stage.addEventListener("pointercancel", lift);

  // the mouse wheel on a desktop (and a trackpad's pinch, which arrives as ctrl + wheel): the picture, never the page
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    },
    { passive: false },
  );

  new ResizeObserver(layout).observe(stage);

  /** Counts each open, so a full picture landing after its viewer moved on is dropped. */
  let opening = 0;

  function close(): void {
    clearTimeout(closeTimer);
    opening++;
    if (element.hidden) return;
    element.hidden = true;
    img.removeAttribute("src");
    pointers.clear();
    closed(element);
    screenChanged();
  }
  back.addEventListener("click", close);

  return {
    element,
    open(p, shown, board) {
      aspect = pictureAspect(p.cols, p.rows);
      title.textContent = pictureTitle(p);
      const at = ++opening;
      img.src = shown || (resident(p.file) ? pictureUrl(p) : "");
      const swap = () => {
        const full = pictureUrl(p);
        if (at !== opening || full === img.src) return;
        const big = new Image();
        big.src = full;
        // decoded first, so the swap is the same frame; a failure keeps the copy on screen
        big.decode().then(
          () => at === opening && (img.src = full),
          () => {},
        );
      };
      // the full picture: at once where it is a plain file (or already loaded), else from its board's pack
      if (resident(p.file)) swap();
      else if (board) void ensure([p.file], board, { full: true }).then(swap, () => {});
      s = 1;
      tx = 0;
      ty = 0;
      lastTap = { x: 0, y: 0, time: -Infinity };
      element.hidden = false;
      opened(element, close);
      screenChanged();
      layout();
    },
    close,
    isOpen: () => !element.hidden,
  };
}
