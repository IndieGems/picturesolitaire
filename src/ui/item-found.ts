// THE DAY'S ITEM, FOUND (the creator, 2026-10-27: "it can lift off the board and it gets a little
// bigger, with a starburst behind it and a big 'Hot Water Bottle!', then that shrinks into the
// suitcase or something. Just needs a fun animation"). When the day's suitcase item picture is
// finished on the board (Gameplay's suitcase:item; app.ts takes the board's piece with takeItem()):
//
//      0 ms   Art's cut-out of the item lifts from the picture's place to the board screen's middle,
//             growing past its size and settling (350 ms, 1.2x peak); the starburst fades in behind it
//             and turns slowly; a few twinkles
//    150 ms   its name, big, pops in under it ("Hot-water bottle!"), and a small line: "Packed when
//             you win today's puzzle"
//    950 ms   a small closed suitcase (Art's) pops in near the top
//   1100 ms   the item shrinks and flies into it; the name and the starburst fade
//  ~1450 ms   it touches: the suitcase bounces (suitcase:stowed, Audio's latch), then fades; all gone
//             by ~1900 ms
//
// A tap anywhere skips to the end (stowed at once, skipped: true, a 150 ms fade). Less motion: the
// item and its name fade in where the middle is, hold, fade out (stowed at 1400 ms); no flight, no
// spin, no twinkles. It takes no touch but the skip, which is captured before the board sees it,
// so the tap that skips moves nothing; the board never waits on it: the cards fall underneath, and
// the player moves once it is done.

import { emit } from "../events";
import { t } from "./i18n";

const ART = {
  /** Art's starburst (public/art/item-starburst.webp); until it is in, a CSS stand-in (style.css). */
  burst: `${import.meta.env.BASE_URL}art/item-starburst.webp`,
  caseSmall: `${import.meta.env.BASE_URL}art/suitcase-closed-small.webp`,
};

/** The moment's timings (ms from its start). */
export const TIMING = { lift: 350, settle: 450, name: 150, suitcase: 950, fly: 1100, touch: 1450, fade: 1700, end: 1900, quickEnd: 1400 };

const lessMotion = () => document.documentElement.classList.contains("less-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export type ItemFound = {
  id: string;
  title: string;
  /** Art's cut-out (the object alone, on transparency), else the board's copy of the picture. */
  src: string;
  /** Is `src` a cut-out (drawn whole), or a picture (drawn as a framed card)? */
  cutout: boolean;
  /** Where the picture was on screen as it finished (viewport px). */
  from: { x: number; y: number; w: number; h: number };
};

/** Play the moment over `layer` (the board screen). Resolves when it is over (played out or skipped). */
export function playItemFound(layer: HTMLElement, item: ItemFound): Promise<void> {
  const stage = el("div", "item-found");
  stage.setAttribute("role", "status");
  stage.setAttribute("aria-live", "polite");
  const burst = el("div", "if-burst");
  burst.setAttribute("aria-hidden", "true");
  // Art's starburst once it has loaded (a CSS stand-in until then: never a broken image)
  const probe = new Image();
  probe.onload = () => {
    burst.style.setProperty("--burst", `url("${new URL(ART.burst, location.href).href}")`);
    burst.classList.add("art");
  };
  probe.src = ART.burst;
  const pic = el("img", `if-item${item.cutout ? " cutout" : " card"}`);
  Object.assign(pic, { src: item.src, alt: "", draggable: false });
  const words = el("div", "if-words");
  words.append(el("b", "if-name", t("case.foundName", { item: item.title })), el("span", "if-line", t("case.foundLine")));
  const mini = el("img", "if-case");
  Object.assign(mini, { src: ART.caseSmall, alt: "", draggable: false });
  stage.append(burst, pic, words, mini);
  layer.append(stage);

  const less = lessMotion();
  if (!less)
    for (const [x, y, s, at] of [[-32, -30, 30, 0.12], [34, -36, 24, 0.2], [-40, 18, 22, 0.3], [38, 24, 28, 0.38], [0, -48, 26, 0.5]] as const) {
      const tw = el("i", "twinkle");
      tw.setAttribute("aria-hidden", "true");
      tw.style.cssText = `left:calc(50% + ${x}vmin);top:calc(var(--mid) + ${y}vmin);--s:${s}px;animation-delay:${at}s`;
      stage.append(tw);
    }

  const anims: Animation[] = [];
  let done!: () => void;
  const over = new Promise<void>((r) => (done = r));
  let stowed = false;
  let finished = false;
  const stow = (skipped: boolean) => {
    if (stowed) return;
    stowed = true;
    emit("suitcase:stowed", { id: item.id, skipped });
  };
  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const finish = () => {
    if (finished) return;
    finished = true;
    for (const tm of timers) clearTimeout(tm);
    removeEventListener("pointerdown", skip, true);
    stage.remove();
    done();
  };
  /** A tap anywhere: everything goes into the suitcase at once (the tap moves nothing on the board). */
  const skip = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    for (const a of anims) a.cancel();
    stow(true);
    stage.classList.add("skipping");
    for (const tm of timers) clearTimeout(tm);
    timers.length = 0;
    later(160, finish);
  };
  addEventListener("pointerdown", skip, true);

  // where it goes: the middle of the board screen, a little above the centre (room for the name)
  requestAnimationFrame(() => {
    const L = layer.getBoundingClientRect();
    const size = Math.min(L.width * 0.46, L.height * 0.3, 220);
    const mid = { x: L.left + L.width / 2, y: L.top + L.height * 0.42 };
    stage.style.setProperty("--mid", `${Math.round(mid.y - L.top)}px`);
    stage.style.setProperty("--size", `${Math.round(size)}px`);
    // the item starts where the picture was: its box, in the stage's frame
    const f = item.from;
    const fx = f.x + f.w / 2 - mid.x;
    const fy = f.y + f.h / 2 - mid.y;
    const fs = Math.max(0.2, Math.min(f.w, f.h) / size);
    // the small suitcase sits under the top row (style.css, .if-case): its middle
    const mr = mini.getBoundingClientRect();
    const caseBox = mr.width ? { x: mr.left + mr.width / 2, y: mr.top + mr.height / 2 } : { x: L.left + L.width / 2, y: L.top + 110 };

    if (less) {
      anims.push(stage.animate([{ opacity: 0 }, { opacity: 1, offset: 200 / TIMING.quickEnd }, { opacity: 1, offset: 1100 / TIMING.quickEnd }, { opacity: 0 }], { duration: TIMING.quickEnd, fill: "both" }));
      later(TIMING.quickEnd, () => {
        stow(false);
        finish();
      });
      return;
    }

    // the starburst: in, a slow turn, out with the flight
    anims.push(
      burst.animate(
        [
          { opacity: 0, transform: "translate(-50%, -50%) scale(0.4) rotate(0deg)", easing: "ease-out" },
          { opacity: 1, transform: "translate(-50%, -50%) scale(1) rotate(25deg)", offset: 0.25 },
          { opacity: 1, transform: "translate(-50%, -50%) scale(1.05) rotate(60deg)", offset: 0.75, easing: "ease-in" },
          { opacity: 0, transform: "translate(-50%, -50%) scale(0.6) rotate(80deg)" },
        ],
        // the timing is the keyframes' own (an animation-wide easing would bend the whole timeline)
        { duration: TIMING.touch - 50, fill: "both" },
      ),
    );
    // the item: lift and grow (overshoot), hold, then shrink into the suitcase
    const dx = caseBox.x - mid.x;
    const dy = caseBox.y - mid.y;
    const end = 34 / size;
    anims.push(
      pic.animate(
        [
          { transform: `translate(-50%, -50%) translate(${fx}px, ${fy}px) scale(${fs})`, opacity: 1, offset: 0, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" },
          { transform: "translate(-50%, -50%) scale(1.2)", offset: TIMING.lift / TIMING.touch, easing: "ease-in-out" },
          { transform: "translate(-50%, -50%) scale(1)", offset: TIMING.settle / TIMING.touch },
          { transform: "translate(-50%, -50%) scale(1)", offset: TIMING.fly / TIMING.touch, easing: "cubic-bezier(0.5, 0, 0.75, 0)" },
          { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${end})`, opacity: 0.9 },
        ],
        { duration: TIMING.touch, fill: "both" },
      ),
    );
    // the name: pops in, holds, goes as the item flies
    anims.push(
      words.animate(
        [
          { opacity: 0, transform: "translate(-50%, 0) scale(0.6)", easing: "ease-out" },
          { opacity: 1, transform: "translate(-50%, 0) scale(1.08)", offset: 0.55 },
          { opacity: 1, transform: "translate(-50%, 0) scale(1)", offset: 0.75 },
          { opacity: 1, transform: "translate(-50%, 0) scale(1)" },
        ],
        { duration: 400, delay: TIMING.name, fill: "both" },
      ),
      words.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: TIMING.fly, fill: "forwards" }),
    );
    // the suitcase: pops in near the top, bounces as the item lands, then fades
    anims.push(
      mini.animate(
        [
          { opacity: 0, transform: "translate(-50%, 0) scale(0.5)", easing: "ease-out" },
          { opacity: 1, transform: "translate(-50%, 0) scale(1.1)", offset: 0.6 },
          { opacity: 1, transform: "translate(-50%, 0) scale(1)" },
        ],
        { duration: 220, delay: TIMING.suitcase, fill: "both" },
      ),
    );
    later(TIMING.touch, () => {
      stow(false);
      pic.style.visibility = "hidden";
      anims.push(
        mini.animate(
          [
            { transform: "translate(-50%, 0) scale(1)" },
            { transform: "translate(-50%, 0) scale(1.28) rotate(-6deg)", offset: 0.35 },
            { transform: "translate(-50%, 0) scale(0.94) rotate(3deg)", offset: 0.7 },
            { transform: "translate(-50%, 0) scale(1)" },
          ],
          { duration: TIMING.fade - TIMING.touch, easing: "ease-out" },
        ),
      );
    });
    later(TIMING.fade, () => anims.push(stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: TIMING.end - TIMING.fade, fill: "forwards" })));
    later(TIMING.end, finish);
  });
  return over;
}
