// The destination's name banner (the travelogue, the creator 2026-10-25): every board
// has one destination, a real place whose crop plays as an ordinary picture. When it is
// finished and the board unfolds it into a full-board postcard (gameplay's), the place's
// name shows at the top of the board, big, with where it is on a smaller line under it
// ("Grand Canyon" / "Arizona, USA"), and a few sparkles go off round it in the board's
// own twinkle (board.css, .bd-twinkle: a soft amber point with a white four-pointed glint).
//
//   destination:reveal { id, name, place, again }   the postcard is open: show it (app.ts)
//   destination:done { id }                         the postcard has gone: so does this
//
// The postcard holds about 1.5 s, so the banner arrives in half a second and its sparkles
// are over within the hold. A destination finished again (after Undo or Restart: `again`,
// a shorter hold of about 0.7 s) shows its name again, quietly, with no sparkles. A reveal
// and a done in the same moment (the player tapped through the unfolding) show nothing.
//
// It is information (the standard's two materials): frosted glass, flat, with no lip and
// no shadow, and it takes no touch, so a tap meant for the postcard is never caught. The
// sparkles play once as it arrives and stop: nothing runs while it simply stands there.
// Less motion (the Arcade's setting or the device's): it fades in and out where it stands,
// with no sparkles.
//
// Its words are the player's to read in their language: destination.<id>.name and
// destination.<id>.place in the locale files once a translation has them, else the English
// the event carries. A long name ("World's Largest Ball of Twine") wraps to two balanced
// lines, then steps down in size, never under 12 px and never cut off.

import { destinationName, destinationPlace } from "./catalogue";

export interface Destination {
  id: string;
  name: string;
  place: string;
  /** Finished before on this board: shown quietly, with no sparkles. */
  again?: boolean;
}

export interface DestinationBanner {
  element: HTMLElement;
  /** Show `d` over the top of `over` (the board's box), replacing whatever it showed. */
  show(d: Destination, over: HTMLElement): void;
  /** Take it away (a short fade); nothing if it is not up. */
  hide(): void;
  /** Gone at once, with no fade (the board was left). */
  clear(): void;
  isShown(): boolean;
}

/** The sparkles round the glass (and two over it): where (in % of the glass), how big (px, the board's own
 * twinkles are 18 to 34 on a phone) and when (s after it arrives; each lasts 0.8 s, all over within the hold). */
const TWINKLES: readonly { x: number; y: number; s: number; at: number }[] = [
  { x: -2, y: 28, s: 34, at: 0.18 },
  { x: 82, y: 26, s: 22, at: 0.24 },
  { x: 50, y: -12, s: 36, at: 0.28 },
  { x: 102, y: 62, s: 34, at: 0.36 },
  { x: 10, y: -8, s: 26, at: 0.4 },
  { x: 70, y: 106, s: 28, at: 0.5 },
  { x: 20, y: 70, s: 22, at: 0.56 },
  { x: 30, y: 104, s: 24, at: 0.62 },
  { x: 92, y: -6, s: 26, at: 0.7 },
];

/** How long the fade out lasts (style.css, dest-out). */
const LEAVE_MS = 260;
/** A done this soon after its reveal was the player tapping through: gone at once, never seen. */
const SAME_MOMENT_MS = 120;
/** The biggest the name is drawn, and the smallest it may step down to. */
const MIN_PX = 12;

export function createDestinationBanner(): DestinationBanner {
  const element = document.createElement("div");
  element.className = "dest-banner";
  element.hidden = true;
  element.setAttribute("role", "status");
  element.setAttribute("aria-live", "polite");

  const glass = document.createElement("div");
  glass.className = "dest-glass glass";
  const name = document.createElement("b");
  name.className = "dest-name";
  const place = document.createElement("span");
  place.className = "dest-place";
  glass.append(name, place);
  element.append(glass);
  for (const w of TWINKLES) {
    const tw = document.createElement("i");
    tw.className = "twinkle";
    tw.setAttribute("aria-hidden", "true");
    tw.style.cssText = `left:${w.x}%;top:${w.y}%;--s:${w.s}px;animation-delay:${w.at}s`;
    element.append(tw);
  }

  let host: HTMLElement | null = null;
  let leaving = 0;
  let shownAt = 0;

  /** Over the middle of the board's box, at its top; never wider than the box. */
  function position(): void {
    if (!host || element.hidden) return;
    const parent = element.offsetParent as HTMLElement | null;
    if (!parent) return;
    const a = host.getBoundingClientRect();
    const b = parent.getBoundingClientRect();
    element.style.left = `${Math.round(a.left - b.left + a.width / 2)}px`;
    element.style.top = `${Math.round(a.top - b.top + 10)}px`;
    element.style.setProperty("--room", `${Math.floor(a.width - 24)}px`);
    fitName();
  }

  /** Two lines at most at the name's own size, else smaller, never under MIN_PX or cut off. */
  function fitName(): void {
    name.style.removeProperty("font-size");
    let size = parseFloat(getComputedStyle(name).fontSize);
    const lineH = () => parseFloat(getComputedStyle(name).lineHeight) || size * 1.1;
    const fits = () => name.scrollWidth <= name.clientWidth + 1 && name.offsetHeight <= lineH() * 2 + 2;
    while (!fits() && size > MIN_PX) {
      size = Math.max(MIN_PX, size - 1);
      name.style.fontSize = `${size}px`;
    }
  }

  const sizes = new ResizeObserver(() => requestAnimationFrame(position));

  function clear(): void {
    clearTimeout(leaving);
    leaving = 0;
    element.hidden = true;
    element.classList.remove("leaving");
    if (host) sizes.unobserve(host);
    host = null;
  }

  return {
    element,
    show(d, over) {
      clear();
      host = over;
      name.textContent = destinationName(d.id, d.name);
      place.textContent = destinationPlace(d.id, d.place);
      place.hidden = !place.textContent;
      element.classList.toggle("again", d.again === true);
      shownAt = performance.now();
      element.hidden = false; // shown again, so its arrival and the sparkles start over
      position();
      sizes.observe(over);
    },
    hide() {
      if (element.hidden || leaving) return;
      if (performance.now() - shownAt < SAME_MOMENT_MS) return clear();
      element.classList.add("leaving");
      leaving = window.setTimeout(clear, LEAVE_MS);
    },
    clear,
    isShown: () => !element.hidden && !leaving,
  };
}
