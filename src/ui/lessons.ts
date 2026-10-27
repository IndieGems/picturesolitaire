// Two short lessons after the first board's guide, each once per player, each free
// (the creator, 2026-10-27, with the helpers becoming the player's own stock):
//
//   UNDO     campaign board 2, the first time: after the player's first move, Undo is
//            lit and the board waits: "Changed your mind? Tap Undo." That Undo is free
//            (board.lesson("undo"), the gameplay member's), and then play goes on.
//   SHUFFLE  after board 3's win, on the way to board 4: a short practice board (the
//            level designer's, staged to open stuck), played on the board as ever but
//            with no claim, no Coins and no progress. As it opens stuck, Shuffle is lit:
//            "Stuck? Shuffle mixes in a way out." That Shuffle is free; a few moves
//            finish it, and its card goes on to board 4 (app.ts).
//
// Both wear the guide's look (style.css, .guide-*: the guide speaking, not a label of
// the game): everything but the lit button shaded, the board taking no moves, a tap
// elsewhere giving the note a hop. Neither starts before board 1's guide is done (the
// server's word, guideDone), nor for a player who has seen it (the screens' cloud save,
// guide-save.ts, read first, a few seconds at most). No Arcade break inside one (app.ts,
// signalBreak asks inLesson()).

import { on } from "../events";
import { t } from "./i18n";
import { guideDone, waitForProgress } from "../net/progress";
import { lessonSeen, learnt, waitForGuideSave } from "./guide-save";
import type { GuideMode } from "./guide";

export type LessonName = "undo" | "shuffle";

const TEXT: Record<LessonName, string> = { undo: "lesson.undo", shuffle: "lesson.shuffle" };
/** The Shuffle lesson's board is dealt and seen a moment before its Shuffle is lit. */
const SHUFFLE_AFTER_MS = 900;
/** The board event that ends each lesson: its helper used. */
const DONE: Record<LessonName, "helper:undo" | "helper:shuffle"> = { undo: "helper:undo", shuffle: "helper:shuffle" };

type Deps = {
  /** The app's column, which the lesson's layer covers. */
  app: HTMLElement;
  /** The lit button of each lesson. */
  button: (name: LessonName) => HTMLElement;
  /** Everything else a key or a tap could reach while a lesson is up. */
  others: () => HTMLElement[];
  /** Hold the board (no moves) or let it go (the board's guide mode). */
  setBoard: (mode: GuideMode) => void;
  /** Make the board's next use of this helper free (board.lesson, the gameplay member's). */
  free: (name: LessonName) => void;
  /** Is the board this lesson belongs to still the one in play? */
  stillHere: (name: LessonName) => boolean;
};

export function createLessons(d: Deps) {
  const layer = document.createElement("div");
  layer.className = "guide-layer holding lesson-layer";
  layer.hidden = true;
  const shades = [0, 1, 2, 3].map(() => {
    const s = document.createElement("div");
    s.className = "guide-shade";
    layer.append(s);
    return s;
  });
  const round = document.createElement("div");
  round.className = "guide-hole";
  const ring = document.createElement("div");
  ring.className = "guide-ring";
  const note = document.createElement("div");
  note.className = "guide-note over";
  note.setAttribute("role", "status");
  note.setAttribute("aria-live", "polite");
  const words = document.createElement("span");
  const arrow = document.createElement("i");
  arrow.className = "arrow";
  arrow.setAttribute("aria-hidden", "true");
  note.append(words, arrow);
  layer.append(round, ring, note);
  d.app.append(layer);

  /** The lesson up now (its button lit), if any. */
  let up: LessonName | null = null;
  /** A lesson under way: from its board opening until its helper is used (or the board goes). */
  let pending: LessonName | null = null;
  let offs: Array<() => void> = [];
  let deafened: HTMLElement[] = [];

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

  function layout(): void {
    if (!up) return;
    const a = d.app.getBoundingClientRect();
    const r = d.button(up).getBoundingClientRect();
    const pad = 10;
    const x0 = r.left - a.left - pad, y0 = r.top - a.top - pad, x1 = r.right - a.left + pad, y1 = r.bottom - a.top + pad;
    const W = a.width, H = a.height;
    const set = (el: HTMLElement, x: number, y: number, w: number, h: number) =>
      Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${Math.max(0, w)}px`, height: `${Math.max(0, h)}px` });
    set(shades[0]!, 0, 0, W, y0);
    set(shades[1]!, 0, y1, W, H - y1);
    set(shades[2]!, 0, y0, x0, y1 - y0);
    set(shades[3]!, x1, y0, W - x1, y1 - y0);
    set(ring, x0, y0, x1 - x0, y1 - y0);
    set(round, x0, y0, x1 - x0, y1 - y0);
    // the note just above the button, its arrow on it
    note.style.bottom = `${a.bottom - r.top + 22}px`;
    const n = note.getBoundingClientRect();
    note.style.setProperty("--arrow-x", `${Math.min(n.width - 28, Math.max(28, r.left + r.width / 2 - n.left))}px`);
  }
  const relayout = () => requestAnimationFrame(layout);
  new ResizeObserver(relayout).observe(d.app);

  function hear(): void {
    for (const el of deafened) el.inert = false;
    deafened = [];
  }

  /** Light `name`'s button and hold the board until it is used. */
  function show(name: LessonName): void {
    up = name;
    words.textContent = t(TEXT[name]);
    d.setBoard("hold");
    d.free(name);
    hear();
    const open = d.button(name);
    deafened = d.others().filter((el) => el !== open && !el.inert);
    for (const el of deafened) el.inert = true;
    layer.hidden = false;
    relayout();
  }

  /** Take the lesson down; `learnt`: its helper was used, so it is never shown again. */
  function end(done: boolean): void {
    for (const off of offs) off();
    offs = [];
    const was = pending;
    pending = null;
    up = null;
    layer.hidden = true;
    hear();
    d.setBoard(null);
    if (done && was) learnt(was);
  }

  /** Will `name` be taught? Once the save and the record are read (a few seconds at most). */
  async function owed(name: LessonName): Promise<boolean> {
    await Promise.all([waitForGuideSave(3000), waitForProgress(3000)]);
    return guideDone() && !lessonSeen(name);
  }

  return {
    /**
     * Campaign board 2 just opened, fresh, and not won before: once the player's first move
     * lands, Undo is lit, the board held, and that Undo is free.
     */
    async offerUndo(): Promise<void> {
      end(false);
      pending = "undo";
      if (!(await owed("undo")) || pending !== "undo" || !d.stillHere("undo")) {
        if (pending === "undo") pending = null;
        return;
      }
      offs.push(
        on("piece:move", () => {
          for (const off of offs) off();
          offs = [on(DONE.undo, () => end(true))];
          // after the move's own slide, so the lit button and the note never sit over a card in flight
          window.setTimeout(() => pending === "undo" && d.stillHere("undo") && show("undo"), 350);
        }),
      );
    },
    /** Should the way to board 4 go through the Shuffle lesson first? (By board 4 the save and the record are read.) */
    shuffleOwed: (): boolean => guideDone() && !lessonSeen("shuffle"),
    /**
     * The Shuffle lesson's board just opened, staged stuck (it never says so: the gameplay
     * member's board keeps board:stuck off it): once it has been dealt, Shuffle is lit, the
     * board held, and that Shuffle is free; then free play to its finish.
     */
    startShuffle(): void {
      end(false);
      pending = "shuffle";
      offs.push(on(DONE.shuffle, () => end(true)));
      window.setTimeout(() => {
        if (pending === "shuffle" && !up && d.stillHere("shuffle")) show("shuffle");
      }, SHUFFLE_AFTER_MS);
    },
    /** The player left the board, or it closed: the lesson goes (and comes again with its board). */
    cancel: () => end(false),
    /** Is a lesson under way (its board in play, lit or waiting for the first move)? No Arcade break then. */
    active: (): boolean => pending !== null,
    /** The lesson whose button is lit now, if any (its use is free: nothing is spent). */
    lit: (): LessonName | null => up,
  };
}
