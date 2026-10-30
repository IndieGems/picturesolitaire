// A GEM ARCADE VIP'S HELPERS (docs/vip.md, perk 1; the creator, 2026-10-30): Hint, Undo and Shuffle
// cost a VIP nothing and never run out, so after each use its button RESTS a moment, so it can't be
// pressed again and again: Hint and Shuffle about 10 s, Undo about 1 s (undoing several moves in a
// row is ordinary play), the board's tuning (vipRest*Ms, the config can retune them).
//
// The look is Untangled's VIP hint (the lead, 2026-10-30: the Arcade's games should feel alike,
// ../yarn/src/main.ts coolSweep), in this game's materials (style.css):
//   ready     the button as ever, its count badge saying "VIP" in place of a count
//   resting   a shadow over the button, swept round from 12 o'clock like a clock hand, uncovering
//             it as the rest runs out, and the badge counting down ("VIP 8s"); a short rest
//             (Undo's) is the sweep alone. It takes no press. Reduced motion: the shadow stands
//             still and lifts at the end, the seconds counting down. Then a long rest's small pop.
// The sweep is two half-planes, each clipped to its half of the button, turned about its centre
// (transform only); script turns them by the clock, so the Arcade's pause (html.paused, which stops
// CSS animations) cannot put it out of step with the seconds.
//
// The rest starts once the board says the helper ACTED (helper:*), so a Hint that found no line or a
// Shuffle with no better mix rests nothing, and the guide's and a lesson's free presses never rest
// (those boards teach with their own free presses, for VIP and everyone alike). It is the button's
// only: no move on the board waits for it, so it never stands between a player and a win, and the
// stuck notice still lights Shuffle while it rests (its countdown shows on it). Nobody but a VIP has
// a rest, and their stock is left as it was for when VIP ends. Who is VIP is the server's word
// (src/net/vip.ts). app.ts only calls in from its helper functions.

import "./helper-cooldown.css";
import { TUNING } from "../board/tuning";
import { isVip, onVipChange } from "../net/vip";
import { t } from "./i18n";
import { KINDS, type HelperKind } from "./stock";

type Buttons = Record<HelperKind, { btn: HTMLButtonElement; badge: HTMLElement }>;
type Deps = {
  /** The helper buttons, as app.ts made them (count badge and all). */
  buttons: Buttons;
  /** This board takes a VIP's helpers: not the guided first board, not a lesson's (they teach with free presses). */
  here(): boolean;
  /** There is a move to take back (board:changed): Undo rests faded until there is, VIP or not. */
  canUndo(): boolean;
  /** A rest ended, or VIP came or went: the buttons and the stuck notice are drawn again. */
  redraw(): void;
};

const restOf = (k: HelperKind): number =>
  Math.max(0, k === "undo" ? TUNING.vipRestUndoMs : k === "hint" ? TUNING.vipRestHintMs : TUNING.vipRestShuffleMs);
const lessMotion = (): boolean => document.documentElement.classList.contains("less-motion");

export function createHelperRest(d: Deps) {
  /** When each button's rest ends (performance.now()), and how long it was; 0: ready. */
  const until: Record<HelperKind, number> = { hint: 0, undo: 0, shuffle: 0 };
  const span: Record<HelperKind, number> = { hint: 1, undo: 1, shuffle: 1 };
  /** The seconds each badge last said, so its words change once a second, not every frame. */
  const said: Partial<Record<HelperKind, number>> = {};
  /** Each button's shadow: its two half-planes, right then left. */
  const sweeps = {} as Record<HelperKind, { el: HTMLElement; right: HTMLElement; left: HTMLElement }>;
  for (const k of KINDS) {
    const { btn, badge } = d.buttons[k];
    const el = document.createElement("span");
    el.className = "rest-sweep";
    el.setAttribute("aria-hidden", "true");
    const half = (side: string): HTMLElement => {
      const h = el.appendChild(document.createElement("span"));
      h.className = `half ${side}`;
      return h.appendChild(document.createElement("i"));
    };
    const right = half("right");
    const left = half("left");
    // under the badge, so the badge stays readable on top of the shadow
    btn.insertBefore(el, badge);
    sweeps[k] = { el, right, left };
  }
  let raf = 0;

  const vip = (): boolean => isVip() && d.here();
  const left = (k: HelperKind, now = performance.now()): number => Math.max(0, until[k] - now);

  /** The shadow turned to where the rest stands (0: all covered, 1: all uncovered). */
  function turn(k: HelperKind, p: number): void {
    const s = sweeps[k];
    const at = lessMotion() ? 0 : Math.min(1, Math.max(0, p));
    s.right.style.transform = `rotate(${Math.min(at, 0.5) * 360}deg)`;
    s.left.style.transform = `rotate(${Math.max(0, at - 0.5) * 360}deg)`;
  }

  function tick(): void {
    raf = 0;
    const now = performance.now();
    let any = false;
    for (const k of KINDS) {
      if (!until[k]) continue;
      const ms = left(k, now);
      if (ms <= 0) {
        until[k] = 0;
        done(k);
        continue;
      }
      any = true;
      turn(k, 1 - ms / span[k]);
      if (Math.ceil(ms / 1000) !== said[k]) draw(k);
    }
    if (any) raf = requestAnimationFrame(tick);
  }

  /** A rest ended: the button comes back, a long rest's with a small pop (Undo's, a blink long, quietly). */
  function done(k: HelperKind): void {
    const { btn } = d.buttons[k];
    btn.classList.remove("ready");
    if (span[k] >= TUNING.vipRestCountMs) {
      void btn.offsetWidth;
      btn.classList.add("ready");
    }
    d.redraw();
  }

  /**
   * One button as a VIP's: "VIP", or resting under its shadow with the seconds left. False when the
   * player is not a VIP here: app.ts draws its count as ever (what this put on it taken off first).
   */
  function draw(k: HelperKind): boolean {
    const { btn, badge } = d.buttons[k];
    if (!vip()) {
      btn.classList.remove("vip", "cooling", "ready");
      btn.removeAttribute("aria-disabled");
      delete said[k];
      return false;
    }
    const ms = left(k);
    const cooling = ms > 0;
    const secs = Math.ceil(ms / 1000);
    btn.classList.add("vip");
    btn.classList.remove("free", "gifted", "out", "grew");
    btn.classList.toggle("cooling", cooling);
    btn.classList.toggle("resting", k === "undo" && !cooling && !d.canUndo());
    if (cooling) btn.setAttribute("aria-disabled", "true");
    else btn.removeAttribute("aria-disabled");
    const words = [h("span", "vip-word", t("board.helperVip"))];
    if (cooling && span[k] >= TUNING.vipRestCountMs) words.push(h("span", "vip-wait", t("board.helperWait", { seconds: secs })));
    badge.replaceChildren(...words);
    said[k] = cooling ? secs : undefined;
    btn.setAttribute("aria-label", `${t(`board.${k}`)}, ${t(cooling ? "board.helperWaitAria" : "board.helperVipAria")}`);
    return true;
  }

  // VIP came or went (the server's word, or the dev menu's pretend): a VIP's rests end with it
  onVipChange((on) => {
    if (!on) for (const k of KINDS) until[k] = 0;
    d.redraw();
  });

  return {
    /** The player is a VIP on this board: helpers free and unlimited, each resting after use. */
    vip,
    draw,
    /** This button is resting: a press does nothing. */
    resting: (k: HelperKind): boolean => vip() && left(k) > 0,
    /** A VIP's helper acted: its button rests from now. */
    used(k: HelperKind): void {
      const ms = restOf(k);
      if (ms <= 0) return;
      span[k] = ms;
      until[k] = performance.now() + ms;
      d.buttons[k].btn.classList.remove("ready");
      turn(k, 0);
      draw(k);
      if (!raf) raf = requestAnimationFrame(tick);
    },
    /** How long each button has left to rest, in ms (the dev server's checks). */
    left: (): Record<HelperKind, number> => ({ hint: left("hint"), undo: left("undo"), shuffle: left("shuffle") }),
  };
}

function h(tag: string, cls: string, text: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = cls;
  el.textContent = text;
  return el;
}

export type HelperRest = ReturnType<typeof createHelperRest>;
