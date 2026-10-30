// The first board teaches the game by playing it (the game standard, "A new
// player's first minutes"). Four steps on campaign board 1, each the next move
// of the board's own winning line, one thing lit and one short line at a time:
//
//   1  Drag the glowing card to join its match.     done when two cards join
//   2  Finish the picture to restore it.             done when the picture leaves
//   3  Now tap the glowing card, then its spot.      done when that move lands
//   4  Stuck? Tap Hint to see a good move.           done when Hint is pressed
//
// then free play to the end of the board, which ends on the guide's milestone
// card (app.ts) in place of the usual win card.
//
// The board lights the move and takes only it (its guide mode, the gameplay
// member's: "line" lights the next move of the line and accepts only that,
// "hold" takes no moves). Everything outside what the step asks for is
// shaded, deaf to keys, and a tap on it only nudges the note. ON THE BOARD
// TOO (the creator, 2026-10-30: the lit card was hard to find on the calm blue
// panel): while a board step is up the board host wears "guiding", and
// style.css dims every other card, the stacks and the panel under a dark
// scrim, leaving the lit card (and, once it is held, it and the cards where it
// goes: "guide-near") at full brightness, its ring a warm gold. Filters only,
// nothing laid over the cards: they still drag and tap. The guide wears
// colours the game uses nowhere else (style.css, --guide-*): it is the guide
// speaking, not a label of the game.
//
// Which step the player has seen lives in the screens' own cloud save
// (guide-save.ts); whether the guided start is DONE is the server's word
// (src/net/progress.ts, guideDone: campaign board 1 won). It decides only once
// both have been read (a few seconds at most), and a player who finished never
// sees it again on another device.

import { on } from "../events";
import { t } from "./i18n";
import { guideDone, waitForProgress } from "../net/progress";
import { guideStep, guided, waitForGuideSave } from "./guide-save";

export type GuideMode = "line" | "hold" | null;

/** The steps, in order; each is done by a board event. */
const STEPS = [
  { text: "guide.join", board: "line", done: "piece:merge" },
  { text: "guide.finish", board: "line", done: "picture:clear" },
  { text: "guide.tap", board: "line", done: "piece:move" },
  { text: "guide.hint", board: "hold", done: "helper:hint" },
] as const;
/** The save's guide count once every step is done; one more once the finish card has shown. */
export const GUIDE_STEPS = STEPS.length;
export const GUIDE_FINISHED = GUIDE_STEPS + 1;

type Deps = {
  /** The app's column, which the guide's layer covers. */
  app: HTMLElement;
  /** The board's box: open to the player during a board step. */
  host: HTMLElement;
  /** The Hint button: open during the Hint step. */
  hint: HTMLElement;
  /** Everything else a key or a tap could reach while a step is up. */
  others: () => HTMLElement[];
  /** Put the board in (or out of) its guide mode. */
  setBoard: (mode: GuideMode) => void;
  /** Is campaign board 1 still the board on screen? */
  stillHere: () => boolean;
};

export function createGuide(d: Deps) {
  const layer = document.createElement("div");
  layer.className = "guide-layer";
  layer.hidden = true;
  const shades = [0, 1, 2, 3].map(() => {
    const s = document.createElement("div");
    s.className = "guide-shade";
    layer.append(s);
    return s;
  });
  // a round hole over a button: the shade around it, without the square corners the four shades leave
  const round = document.createElement("div");
  round.className = "guide-hole";
  layer.append(round);
  const ring = document.createElement("div");
  ring.className = "guide-ring";
  const note = document.createElement("div");
  note.className = "guide-note";
  note.setAttribute("role", "status");
  note.setAttribute("aria-live", "polite");
  const words = document.createElement("span");
  const arrow = document.createElement("i");
  arrow.className = "arrow";
  arrow.setAttribute("aria-hidden", "true");
  note.append(words, arrow);
  layer.append(ring, note);
  d.app.append(layer);

  let step = -1;
  let off: (() => void) | null = null;
  /** The card the board lit last: once it is held, the board lights where it goes instead, and it stays bright. */
  let lastLit: Element | null = null;
  let deafened: HTMLElement[] = [];
  /** Run once every step is done, until the board is won (the finish card). */
  let finishOwed = false;
  /** A replay from the dev menu (practice): the steps and the finish as ever, the save left alone. */
  let practice = false;

  // a tap on anything the step did not ask for: the note gives a little hop
  for (const s of shades)
    s.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      note.classList.remove("nudge");
      void note.offsetWidth;
      note.classList.add("nudge");
    });
  layer.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).classList.contains("guide-shade")) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  /** The open part of the screen: the board for a board step, the Hint button for the Hint step. */
  function hole(): DOMRect {
    return (STEPS[step]!.board === "hold" ? d.hint : d.host).getBoundingClientRect();
  }

  function layout(): void {
    if (step < 0) return;
    const a = d.app.getBoundingClientRect();
    const r = hole();
    const pad = STEPS[step]!.board === "hold" ? 10 : 0;
    const x0 = r.left - a.left - pad, y0 = r.top - a.top - pad, x1 = r.right - a.left + pad, y1 = r.bottom - a.top + pad;
    const W = a.width, H = a.height;
    const set = (el: HTMLElement, x: number, y: number, w: number, h: number) =>
      Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${Math.max(0, w)}px`, height: `${Math.max(0, h)}px` });
    set(shades[0]!, 0, 0, W, y0); // above
    set(shades[1]!, 0, y1, W, H - y1); // below
    set(shades[2]!, 0, y0, x0, y1 - y0); // left
    set(shades[3]!, x1, y0, W - x1, y1 - y0); // right
    ring.hidden = round.hidden = STEPS[step]!.board !== "hold";
    keepBright();
    if (!ring.hidden) {
      set(ring, x0, y0, x1 - x0, y1 - y0);
      set(round, x0, y0, x1 - x0, y1 - y0);
    }
    placeNote(a, r);
  }

  /**
   * The note sits over the helper row, clear of the board; if what it points at is
   * down there, it goes over the top row instead. On the Hint step it stands just
   * above Hint, its arrow on the button.
   */
  function placeNote(a: DOMRect, r: DOMRect): void {
    note.classList.remove("top", "over");
    note.style.removeProperty("--arrow-x");
    if (STEPS[step]!.board === "hold") {
      note.classList.add("over");
      note.style.bottom = `${a.bottom - r.top + 22}px`;
      const n = note.getBoundingClientRect();
      note.style.setProperty("--arrow-x", `${Math.min(n.width - 28, Math.max(28, r.left + r.width / 2 - n.left))}px`);
      return;
    }
    note.style.removeProperty("bottom");
    const lit = d.host.querySelector(".guide-target") ?? d.host.querySelector(".guide-lit");
    if (!lit) return;
    const l = lit.getBoundingClientRect();
    const n = note.getBoundingClientRect();
    if (l.bottom > n.top - 8 && l.top < n.bottom + 8) note.classList.add("top");
  }

  /**
   * On a board step: the card held (lit a moment ago) and the cards where it goes keep their brightness
   * under the scrim ("guide-near"); everything else dims (style.css, .board-host.guiding).
   */
  function keepBright(): void {
    const board = step >= 0 && STEPS[step]!.board === "line";
    d.host.classList.toggle("guiding", board);
    const lit = d.host.querySelector(".guide-lit");
    if (lit) lastLit = lit;
    const target = board ? d.host.querySelector(".guide-target") : null;
    const t = target?.getBoundingClientRect();
    for (const p of d.host.querySelectorAll<HTMLElement>(".bd-piece")) {
      let near = false;
      if (t && !lit) {
        if (p === lastLit) near = true;
        else {
          const r = p.getBoundingClientRect();
          // a card the target ring covers (more than a sliver of it)
          const w = Math.min(r.right, t.right) - Math.max(r.left, t.left);
          const h = Math.min(r.bottom, t.bottom) - Math.max(r.top, t.top);
          near = w > r.width * 0.4 && h > r.height * 0.4;
        }
      }
      p.classList.toggle("guide-near", near);
    }
  }

  const relayout = () => requestAnimationFrame(layout);
  new ResizeObserver(relayout).observe(d.app);
  // the lit thing moves to the target once its card is lifted
  on("piece:lift", relayout);
  on("piece:cancel", relayout);
  on("board:changed", relayout);

  function deafen(): void {
    hear();
    const open = STEPS[step]!.board === "hold" ? d.hint : null;
    deafened = d.others().filter((el) => el !== open && !el.inert);
    for (const el of deafened) el.inert = true;
  }
  function hear(): void {
    for (const el of deafened) el.inert = false;
    deafened = [];
  }

  function show(i: number): void {
    off?.();
    step = i;
    const s = STEPS[i]!;
    words.textContent = t(s.text);
    d.setBoard(s.board);
    deafen();
    layer.hidden = false;
    layer.classList.toggle("holding", s.board === "hold");
    relayout();
    off = on(s.done, () => {
      off?.();
      off = null;
      if (!practice) guided(i + 1);
      if (i + 1 < STEPS.length) show(i + 1);
      else {
        finishOwed = true;
        end();
      }
    });
  }

  /** Take the guide down (every step done, or the player left the board). */
  function end(): void {
    off?.();
    off = null;
    step = -1;
    lastLit = null;
    keepBright();
    layer.hidden = true;
    hear();
    d.setBoard(null);
  }

  return {
    /**
     * Campaign board 1 just opened, fresh. Once the save is read (a few seconds at
     * most, then the device's copy decides), start from the first step if the
     * player has not finished the guide, and has not won a board before it existed.
     */
    async offer(): Promise<void> {
      end();
      finishOwed = false;
      practice = false;
      await Promise.all([waitForGuideSave(3000), waitForProgress(3000)]);
      if (!d.stillHere()) return;
      // board 1 already won (the server's word): nothing to teach, and no finish owed
      if (guideDone()) return;
      // every step seen before, the board not yet won: its win still ends on the finish card
      if (guideStep() >= GUIDE_STEPS) {
        finishOwed = true;
        return;
      }
      show(0);
    },
    /**
     * The dev menu's replay (practice): from the first step at once, whatever the save
     * says, and nothing saved, the finish card included.
     */
    async practise(): Promise<void> {
      end();
      finishOwed = false;
      practice = true;
      // the board lays itself out first
      await new Promise((r) => requestAnimationFrame(r));
      if (practice && d.stillHere()) show(0);
    },
    /** The player left board 1 or it closed: the guide goes, and starts again with the board. */
    cancel(): void {
      end();
      finishOwed = false;
      practice = false;
    },
    /** Is a step up right now? */
    active: () => step >= 0,
    /** Lay the guide out again (the board lit something new). */
    refresh: relayout,
    /** Should this win end on the guide's milestone card? (Asked once, at the win.) */
    takeFinish(): boolean {
      if (!finishOwed) return false;
      finishOwed = false;
      if (!practice) guided(GUIDE_FINISHED);
      return true;
    },
  };
}
