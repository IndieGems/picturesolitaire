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
import { emit } from "../events";
import { gem, onArcadePause, onPlayerPrefs } from "../gem";
import { level as levelOf, levelCount } from "../game/levels.ts";
import { nextMove } from "../game/plan.ts";
import {
  EMPTY, allMoves, clampTarget, isDeadEnd, isWon, joinCount, move, pieceAt, pieces, picOf, shuffle as shuffleRule, start,
  type Action, type Card, type Move, type State, type Step,
} from "../game/rules.ts";
import { ease, setBatterySaver, setPaused, stopAll, tween, wait, run } from "./pace.ts";
import { TUNING, applyTuning } from "./tuning.ts";
import {
  cellAt, drawPiece, drawStack, keyOf, layout, mountDefs, nearestCell, place,
  type Art, type Geometry, type PieceView, type StackView,
} from "./view.ts";

export { levelCount };

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
  undo(): void;
  hint(): void;
  shuffle(): void;
  /** Deal the same board again, at once (the screens confirm first). */
  restart(): void;
  helpers(): HelperCounts;
  canUndo(): boolean;
  pictures(): BoardPicture[];
  destroy(): void;
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

const pictureFile = new Map(CATALOGUE.pictures.map((p) => [p.id, p.file]));
const base = import.meta.env.BASE_URL;
const backUrl = `${base}art/stack-back.webp`;

/** The picture's address, or a drawn stand-in for a picture the catalogue lacks. */
function urlOf(id: string, cols: number, rows: number): string {
  const file = pictureFile.get(id);
  if (file) return `${base}${file}`;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * 10} ${rows * 10}"><defs><linearGradient id="a" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,62%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360},50%,38%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#a)"/><circle cx="${cols * 6}" cy="${rows * 4}" r="${Math.min(cols, rows) * 3}" fill="hsl(${(hue + 180) % 360},60%,80%)" opacity=".7"/><text x="50%" y="${rows * 8}" font-size="5" text-anchor="middle" fill="#fff">${id}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Start fetching a level's pictures; resolves when they are decoded (or after `ms`). */
function preload(urls: string[], ms: number, low = false): Promise<void> {
  const all = urls.map((u) => {
    const img = new Image();
    if (low) (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low";
    img.decoding = "async";
    img.src = u;
    keep.push(img);
    return img.decode().catch(() => {});
  });
  // a plain timer, never the frame loop: waiting on a download draws nothing
  return Promise.race([Promise.all(all).then(() => {}), new Promise<void>((r) => setTimeout(r, ms))]);
}
/** Decoded pictures stay referenced so the browser keeps them ready to paint. */
const keep: HTMLImageElement[] = [];

// ---------------------------------------------------------------- the board

export function openBoard(host: HTMLElement, n: number): BoardHandle {
  loadTuning();
  mountDefs();
  const lvl = levelOf(n);
  const deal = lvl.deal;
  const pics = deal.pictures;
  const art: Art[] = pics.map((p) => ({ url: urlOf(p.id, p.cols, p.rows), cols: p.cols, rows: p.rows }));
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
  let helpers: HelperCounts = { ...TUNING.helpers };
  let busy = 0;
  let won = false;
  let destroyed = false;
  let pendingRestart = false;
  let activeMs = 0;
  let since: number | null = null;
  let geo: Geometry = layout(host.clientWidth || 360, host.clientHeight || 480, deal.cols, deal.rows);
  let live: PieceView[] = [];
  const stacks: StackView[] = [];

  // --- the clock for "time" on the win card: only while the board is in view
  const clockOn = () => {
    if (since === null && !won) since = performance.now();
  };
  const clockOff = () => {
    if (since !== null) activeMs += performance.now() - since;
    since = null;
  };
  const onVisible = () => (document.visibilityState === "hidden" ? clockOff() : clockOn());
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
      el.style.cssText = `left:${c * (geo.s + geo.g)}px;width:${geo.s}px;height:${Math.round(geo.s * TUNING.stackRow)}px`;
      stacksEl.append(el);
      stacks.push({ el });
    }
    slotsEl.replaceChildren();
    for (let cell = 0; cell < geo.cols * geo.rows; cell++) {
      const el = document.createElement("div");
      el.className = "bd-cell";
      el.style.cssText = `left:${(cell % geo.cols) * (geo.s + geo.g)}px;top:${Math.floor(cell / geo.cols) * (geo.s + geo.g)}px;width:${geo.s}px;height:${geo.s}px;border-radius:${Math.round(geo.s * 0.14)}px`;
      slotsEl.append(el);
    }
  }

  function drawStacks(st: State, dealtSoFar?: number[]): void {
    st.stacks.forEach((stack, c) => drawStack(stacks[c]!, geo, dealtSoFar ? stack.slice(dealtSoFar[c]) : stack, lvl.peek, art, pics, backUrl));
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
    else if (step.kind === "fall" || step.kind === "shuffle") slide(step.slides);
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
  async function slideCards(
    from: State, dest: Map<Card, number>,
    timing: (dc: number, dr: number) => { ms: number; ease?: (t: number) => number; arc?: boolean },
    lifted?: PieceView | null,
  ): Promise<void> {
    const ps = pieces(from);
    const jobs: Promise<void>[] = [];
    const p = geo.s + geo.g;
    for (const cells of ps.list) {
      const offs = cells.map((c) => {
        const to = dest.get(from.board[c]!);
        return to === undefined ? 0 : to - c;
      });
      const isLifted = lifted && lifted.cells.length === cells.length && lifted.cells.every((c, i) => c === cells[i]);
      if (!isLifted && offs.every((o) => o === 0)) continue;
      const old = isLifted ? lifted! : live.find((v) => v.cells.length === cells.length && v.cells.every((c, i) => c === cells[i]));
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
        const ty = v.oy + dr * p;
        const x0 = v.x, y0 = v.y, k0 = v.k;
        const tm = timing(dc, dr);
        if (off !== 0 || v === lifted) {
          v.el.classList.add("moving");
          jobs.push(
            tween(tm.ms, (t) => {
              v.x = x0 + (tx - x0) * t;
              v.y = y0 + (ty - y0) * t;
              v.k = k0 + (1 - k0) * t + (tm.arc ? Math.sin(Math.PI * t) * 0.08 : 0);
              place(v);
            }, { ease: tm.ease }).then(() => v.el.classList.remove("moving", "lifted")),
          );
        }
        v.ox = tx;
        v.oy = ty;
        v.cells = to;
        v.key = keyOf(v.cards, to);
      });
    }
    await Promise.all(jobs);
  }

  /** Show `steps`, from what is on screen to `target`. */
  async function show(steps: Step[], lifted?: PieceView | null): Promise<void> {
    for (const step of steps) {
      if (destroyed) return;
      const next = after(shown, step);
      if (step.kind === "move") {
        const dest = new Map<Card, number>();
        for (const x of [...step.moved, ...step.displaced]) dest.set(x.card, x.to);
        emit("piece:move", { cards: step.moved.length, displaced: step.displaced.length });
        await slideCards(shown, dest, (dc, dr) => {
          const far = Math.hypot(dc, dr);
          return { ms: Math.round(TUNING.slideMs * Math.min(1.6, 0.7 + 0.3 * far)) };
        }, lifted);
        lifted = null;
      } else if (step.kind === "fall") {
        const dest = new Map(step.slides.map((x) => [x.card, x.to] as [Card, number]));
        emit("cards:fall", { cards: step.slides.length });
        await slideCards(shown, dest, (_dc, dr) => ({ ms: Math.round(TUNING.fallMs * Math.sqrt(Math.max(1, dr))), ease: ease.fall }));
      } else if (step.kind === "shuffle") {
        const dest = new Map(step.slides.map((x) => [x.card, x.to] as [Card, number]));
        await slideCards(shown, dest, () => ({ ms: TUNING.shuffleMs, ease: ease.inOut, arc: true }));
      } else if (step.kind === "clear") {
        await celebrate(step.pictures);
      } else if (step.kind === "deal") {
        await dealCards(step);
      }
      reconcile(shown, next, step.kind !== "clear");
      shown = next;
    }
  }

  /** A finished picture: whole for a beat, a warm glow and sparks, then it leaves. */
  async function celebrate(done: { pic: number; cells: number[] }[]): Promise<void> {
    const calm = lessMotion();
    await Promise.all(done.map(async ({ pic, cells }, i) => {
      const id = pics[pic]!.id;
      const v = live.find((x) => x.cells.length === cells.length && cells.every((c) => x.cells.includes(c)));
      emit("picture:complete", { pictureId: id, cells: cells.map((c) => ({ col: c % geo.cols, row: Math.floor(c / geo.cols) })) });
      if (!v) return;
      v.el.classList.add("whole");
      // the glow behind it
      const glow = document.createElement("div");
      glow.className = "bd-glow";
      const bx = v.ox + Math.ceil(geo.s * 0.16);
      const by = v.oy + Math.ceil(geo.s * 0.16);
      const bw = (Math.max(...cells.map((c) => c % geo.cols)) - Math.min(...cells.map((c) => c % geo.cols)) + 1) * (geo.s + geo.g) - geo.g;
      const bh = (Math.max(...cells.map((c) => Math.floor(c / geo.cols))) - Math.min(...cells.map((c) => Math.floor(c / geo.cols))) + 1) * (geo.s + geo.g) - geo.g;
      glow.style.cssText = `left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;border-radius:${Math.round(geo.s * 0.16)}px;opacity:0`;
      cardsEl.insertBefore(glow, cardsEl.firstChild);
      const sparks: HTMLElement[] = [];
      if (!calm) {
        for (let k = 0; k < 18; k++) {
          const sp = document.createElement("i");
          sp.className = k % 3 ? "bd-spark" : "bd-spark white";
          fxEl.append(sp);
          sparks.push(sp);
        }
      }
      await wait(i * 120);
      const top = calm ? 1 : 1.05;
      const hold = TUNING.completeHoldMs;
      await Promise.all([
        tween(hold * 0.35, (t) => {
          v.k = 1 + (top - 1) * t;
          place(v);
          glow.style.opacity = String(t);
        }, { ease: ease.back }),
        ...sparks.map((sp, k) => {
          // from the frame's edge, outward
          const side = k % 4;
          const u = ((k * 37) % 100) / 100;
          const sx = side === 0 ? bx + u * bw : side === 1 ? bx + bw : side === 2 ? bx + u * bw : bx;
          const sy = side === 0 ? by : side === 1 ? by + u * bh : side === 2 ? by + bh : by + u * bh;
          const cx = bx + bw / 2, cy = by + bh / 2;
          const d = Math.hypot(sx - cx, sy - cy) || 1;
          const reach = geo.s * (0.45 + ((k * 53) % 40) / 100);
          const ex = sx + ((sx - cx) / d) * reach;
          const ey = sy + ((sy - cy) / d) * reach;
          return tween(hold * 0.7, (t) => {
            sp.style.transform = `translate(${sx + (ex - sx) * t}px, ${sy + (ey - sy) * t}px) scale(${1 - t * 0.6})`;
            sp.style.opacity = String(t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8);
          }, { delay: (k % 6) * 30 });
        }),
      ]);
      await wait(hold * 0.4);
      emit("picture:clear", { pictureId: id });
      const y0 = v.y;
      await tween(TUNING.completeLeaveMs, (t) => {
        v.k = top - (calm ? 0.1 : 0.25) * t;
        v.y = y0 - (calm ? 0 : geo.s * 0.35 * t);
        v.el.style.opacity = String(1 - t);
        glow.style.opacity = String(1 - t);
        place(v);
      }, { ease: ease.inOut });
      glow.remove();
      for (const sp of sparks) sp.remove();
      dropView(v);
    }));
  }

  /** The stacks deal, column by column from the left, one card after another. */
  async function dealCards(step: Extract<Step, { kind: "deal" }>): Promise<void> {
    const dealt = shown.stacks.map(() => 0);
    /** Cards that have left each stack so far, as the deal plays. */
    const taken = shown.stacks.map(() => 0);
    const p = geo.s + geo.g;
    const jobs = step.deals.map((d, i) => {
      const nth = dealt[d.col]!++;
      const hidden = nth >= lvl.peek;
      const v = addView(drawPiece(geo, art, [d.to], [d.card], pics));
      const m = Math.ceil(geo.s * 0.16);
      const W = geo.s + 2 * m;
      // start: on the stack's face, at its size
      const fcx = d.col * p + geo.s / 2;
      const fcy = -geo.gridY + geo.faceTop + geo.face / 2;
      const sx = fcx - W / 2;
      const sy = fcy - W / 2;
      const sk = geo.face / geo.s;
      v.x = sx;
      v.y = sy;
      v.k = sk;
      v.el.style.visibility = "hidden";
      let cover: HTMLImageElement | null = null;
      if (hidden) {
        cover = document.createElement("img");
        cover.className = "bd-cover";
        cover.src = backUrl;
        cover.alt = "";
        cover.style.cssText = `left:${m}px;top:${m}px;width:${geo.s}px;height:${geo.s}px;border-radius:${Math.round(geo.s * 0.14)}px`;
        v.el.append(cover);
      }
      place(v);
      const delay = i * TUNING.dealStagger;
      return wait(delay).then(() => {
        v.el.style.visibility = "";
        const gone = ++taken[d.col]!;
        drawStack(stacks[d.col]!, geo, shown.stacks[d.col]!.slice(gone), lvl.peek, art, pics, backUrl);
        emit("stack:deal", { col: d.col, left: shown.stacks[d.col]!.length - gone });
        v.el.classList.add("moving");
        return tween(TUNING.dealMs, (t) => {
          v.x = sx + (v.ox - sx) * t;
          v.y = sy + (v.oy - sy) * t;
          v.k = sk + (1 - sk) * t;
          if (cover) {
            // a card the level did not show turns face up on the way
            const flip = Math.abs(Math.cos(Math.PI * Math.min(1, t * 1.6)));
            v.el.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) scale(${v.k * Math.max(0.02, flip)}, ${v.k})`;
            if (t > 1 / 3.2 && cover.isConnected) cover.remove();
            return;
          }
          place(v);
        }, { ease: ease.fall }).then(() => {
          v.el.classList.remove("moving");
          place(v);
        });
      });
    });
    await Promise.all(jobs);
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
    stop: () => void;
  } | null = null;
  let selected: { v: PieceView; from: number } | null = null;
  let previewed: PieceView[] = [];

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

  const centre = (cell: number) => ({ x: (cell % geo.cols) * (geo.s + geo.g) + geo.s / 2, y: Math.floor(cell / geo.cols) * (geo.s + geo.g) + geo.s / 2 });

  function lift(v: PieceView): void {
    v.el.classList.add("lifted");
    cardsEl.append(v.el); // on top of the others
  }

  function settleBack(v: PieceView): void {
    const x0 = v.x, y0 = v.y, k0 = v.k;
    void tween(TUNING.dropMs, (t) => {
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
    if (selected && selected.v !== v) {
      settleBack(selected.v);
      selected = null;
    } else if (selected) selected = null;
    const g = toGrid(e.clientX, e.clientY);
    const c = centre(p.cell);
    lift(v);
    // the hold is where the finger went down on the card, not where it has got to
    emit("piece:lift", { cards: v.cells.length });
    const liftTo = (p.touch ? TUNING.liftTouch : TUNING.liftMouse) * geo.s;
    drag = {
      id: p.id, v, from: p.cell, gx: p.gx - c.x, gy: p.gy - c.y, lift: 0, liftTo, px: g.x, py: g.y, to: p.cell,
      stop: run((dt) => {
        if (!drag) return false;
        drag.lift = Math.min(1, drag.lift + dt / 110);
        const cx = drag.px - drag.gx;
        const cy = drag.py - drag.gy - drag.liftTo * ease.out(drag.lift);
        const rest = centre(drag.from);
        drag.v.x = drag.v.ox + (cx - rest.x);
        drag.v.y = drag.v.oy + (cy - rest.y);
        drag.v.k = 1 + (TUNING.liftScale - 1) * ease.out(drag.lift);
        place(drag.v);
        const to = clampTarget(state, drag.from, nearestCell(geo, cx - geo.s / 2, cy - geo.s / 2));
        if (to !== drag.to) {
          drag.to = to;
          preview(drag.from, to, drag.v);
        }
        return true;
      }, false),
    };
  }

  function onDown(e: PointerEvent): void {
    if (press || drag || busy || won || destroyed) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const g = toGrid(e.clientX, e.clientY);
    const cell = cellAt(geo, g.x, g.y);
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, gx: g.x, gy: g.y, cell, touch: e.pointerType !== "mouse" };
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      // a pointer that is already gone
    }
  }

  function onMove(e: PointerEvent): void {
    if (drag && e.pointerId === drag.id) {
      const g = toGrid(e.clientX, e.clientY);
      drag.px = g.x;
      drag.py = g.y;
      return;
    }
    if (!press || e.pointerId !== press.id) return;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < TUNING.dragSlop) return;
    if (press.cell < 0 || state.board[press.cell] === EMPTY) return;
    const p = press;
    press = null;
    startDrag(p, e);
    onMove(e);
  }

  function onUp(e: PointerEvent): void {
    if (drag && e.pointerId === drag.id) {
      const d = drag;
      drag = null;
      d.stop();
      clearPreview();
      if (d.to !== d.from) void play({ from: d.from, to: d.to }, d.v);
      else {
        emit("piece:cancel", {});
        settleBack(d.v);
      }
      return;
    }
    if (!press || e.pointerId !== press.id) return;
    const cell = press.cell;
    press = null;
    tap(cell);
  }

  function onCancel(e: PointerEvent): void {
    if (drag && e.pointerId === drag.id) {
      const d = drag;
      drag = null;
      d.stop();
      clearPreview();
      emit("piece:cancel", {});
      settleBack(d.v);
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
        return;
      }
      selected = null;
      const to = clampTarget(state, sel.from, cell);
      if (to === sel.from) {
        emit("piece:cancel", {});
        settleBack(sel.v);
        return;
      }
      void play({ from: sel.from, to }, sel.v);
      return;
    }
    if (cell < 0 || state.board[cell] === EMPTY) return;
    const v = viewWith(cell);
    if (!v) return;
    selected = { v, from: cell };
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

  // ---------------------------------------------------------------- playing

  function changed(): void {
    emit("board:changed", { canUndo: history.length > 0 && !won, helpers: { ...helpers } });
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
      clockOff();
      emit("board:won", { level: String(n), moves: state.moves, ms: Math.round(activeMs) });
    } else if (isDeadEnd(state)) {
      emit("board:stuck", { doomed: false });
    }
    if (resizePending) relayout();
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

  async function play(m: Move, lifted: PieceView): Promise<void> {
    const out = move(state, m);
    if (!out) {
      settleBack(lifted);
      return;
    }
    clockOn();
    history.push(state);
    actions.push(m);
    state = out.state;
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
    await Promise.all([...fades, slideCards(onlyStaying, stay, () => ({ ms: TUNING.slideMs, ease: ease.inOut }))]);
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
    try {
      history = [];
      actions = [];
      helpers = { ...TUNING.helpers };
      won = false;
      activeMs = 0;
      since = null;
      selected = null;
      const out = live.map((v) => tween(220, (t) => (v.el.style.opacity = String(1 - t))));
      await Promise.all(out);
      emit("board:restart", {});
      await opening();
    } finally {
      busy--;
    }
    changed();
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
    if (actions.length >= lvl.line.length) return null;
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i]!;
      if ("shuffle" in a || a.from !== lvl.line[i]!.from || a.to !== lvl.line[i]!.to) return null;
    }
    return lvl.line[actions.length]!;
  }

  function greedy(): Move | null {
    let best: Move | null = null;
    let score = joinCount(state);
    for (const m of allMoves(state)) {
      const out = move(state, m);
      if (!out) continue;
      const v = joinCount(out.state) + out.state.cleared.length * 100;
      if (v > score) {
        score = v;
        best = m;
      }
    }
    return best;
  }

  async function showHint(m: Move): Promise<void> {
    const v = viewWith(m.from);
    if (!v) return;
    const cells = pieceAt(state, m.from);
    const ghost = drawPiece(geo, art, cells, cells.map((c) => state.board[c]!), pics);
    ghost.el.classList.add("ghost");
    fxEl.append(ghost.el);
    const p = geo.s + geo.g;
    const dc = (m.to % geo.cols) - (m.from % geo.cols);
    const dr = Math.floor(m.to / geo.cols) - Math.floor(m.from / geo.cols);
    const tx = ghost.ox + dc * p;
    const ty = ghost.oy + dr * p;
    const x0 = ghost.x, y0 = ghost.y;
    const T = TUNING.hintMs;
    await tween(T * 0.35, (t) => {
      ghost.x = x0 + (tx - x0) * t;
      ghost.y = y0 + (ty - y0) * t - Math.sin(Math.PI * t) * geo.s * 0.25;
      ghost.k = 1 + 0.06 * Math.sin(Math.PI * t);
      ghost.el.style.opacity = String(0.4 + 0.5 * Math.min(1, t * 2));
      place(ghost);
    }, { ease: ease.inOut });
    await wait(T * 0.4);
    await tween(T * 0.25, (t) => (ghost.el.style.opacity = String(0.9 * (1 - t))));
    ghost.el.remove();
  }

  // ---------------------------------------------------------------- size

  let resizePending = false;
  function relayout(): void {
    resizePending = false;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    const g = layout(w, h, deal.cols, deal.rows);
    if (g.s === geo.s && g.left === geo.left && g.top === geo.top) return;
    geo = g;
    applyLayout();
    redrawAll(shown);
  }
  const ro = new ResizeObserver(() => {
    if (busy || drag || selected) resizePending = true;
    else relayout();
  });
  ro.observe(host);

  // ---------------------------------------------------------------- open

  applyLayout();
  drawStacks(state);
  queueMicrotask(() => emit("board:start", { level: String(n) }));
  changed();
  busy++;
  void (async () => {
    await preload(art.map((a) => a.url), 2500);
    if (destroyed) return;
    busy--;
    await run2(opening);
    clockOn();
    // the next board's pictures, quietly, once this one is dealt
    if (n < levelCount()) void preload(levelOf(n + 1).deal.pictures.map((p) => urlOf(p.id, p.cols, p.rows)), 10_000, true);
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
      if (busy || won || drag || !history.length || helpers.undo <= 0) return;
      if (selected) {
        settleBack(selected.v);
        selected = null;
      }
      helpers = { ...helpers, undo: helpers.undo - 1 };
      const prev = history.pop()!;
      actions.pop();
      state = prev;
      emit("helper:undo", { left: helpers.undo });
      void run2(() => morph(prev));
    },
    hint() {
      if (busy || won || drag || helpers.hint <= 0) return;
      let m = onLine();
      if (!m) {
        const next = nextMove(state, 20_000);
        if ("doomed" in next) {
          emit("board:stuck", { doomed: true });
          return;
        }
        m = "move" in next ? next.move : greedy();
      }
      if (!m) return;
      helpers = { ...helpers, hint: helpers.hint - 1 };
      emit("helper:hint", { left: helpers.hint });
      void run2(() => showHint(m!));
    },
    shuffle() {
      if (busy || won || drag || helpers.shuffle <= 0) return;
      const out = shuffleRule(state);
      if (!out) return;
      if (selected) {
        settleBack(selected.v);
        selected = null;
      }
      helpers = { ...helpers, shuffle: helpers.shuffle - 1 };
      history.push(state);
      actions.push({ shuffle: true });
      state = out.state;
      emit("helper:shuffle", { left: helpers.shuffle });
      void run2(() => show(out.steps));
    },
    restart() {
      if (busy) {
        pendingRestart = true;
        return;
      }
      if (drag) {
        drag.stop();
        drag = null;
        clearPreview();
      }
      void doRestart();
    },
    helpers: () => ({ ...helpers }),
    canUndo: () => history.length > 0 && !won,
    pictures: () => pics.map((p, i) => ({ id: p.id, src: art[i]!.url, cols: p.cols, rows: p.rows })),
    destroy() {
      destroyed = true;
      ro.disconnect();
      drag?.stop();
      stopAll();
      clockOff();
      document.removeEventListener("visibilitychange", onVisible);
      stage.remove();
    },
  };
}
