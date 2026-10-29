// THE HINT NUDGE (the creator, 2026-10-27; AGENTS.md): on a hard board a player can
// believe they are stuck when they are not, and that nothing can help. Hint can: it sees
// the cards still hidden in the stacks and points at a move that still wins. So, on a hard
// or super hard campaign board:
//
//   after a pause    no move for TUNING.idleMs (about 8 s) and the board not stuck: the
//                    Hint button glows, a few gentle pulses, then rests. Once per pause:
//                    it waits for the player's next move (board:changed) and a fresh pause.
//   the first time   for a player, a small line by the Hint button too: "Can't tell where
//                    to match? Hint can see what's coming." It fades by itself or on a
//                    touch, and is never shown again (the guide save, beside the lessons).
//
// A touch anywhere stops the glow and the line, and starts the pause over. Never during the
// guide, a lesson, the creator's practice or the stuck notice (app.ts says when: `quiet`).
// Less motion: a steady ring for a moment instead of pulses. It takes no touch itself, and
// Hint's spend is as ever: with none left the button still glows, and a tap opens the
// run-out panel.

import { on } from "../events";
import { liveText } from "./i18n";
import { learnt, lessonSeen } from "./guide-save";

/** The nudge's tuning. */
export const TUNING = {
  /** No move for this long (ms) on a hard board, and Hint glows. */
  idleMs: 8000,
  /** Less motion: how long the steady ring stays (ms). */
  steadyMs: 2600,
  /** The one-time line's stay (ms), unless a touch takes it first. */
  tipMs: 5000,
};

/** The flag of the one-time line in the guide save (guide-save.ts, `lessons`). */
const TIP_SEEN = "hintTip";

type Deps = {
  /** The Hint button. */
  hint: HTMLElement;
  /** Where the one-time line goes (the board screen, positioned). */
  layer: HTMLElement;
  /** Is this a board that nudges right now: a hard campaign board in play, nothing else going on? */
  allowed: () => boolean;
};

const lessMotion = () => document.documentElement.classList.contains("less-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createHintNudge(d: Deps) {
  const tip = document.createElement("div");
  tip.className = "hint-tip glass";
  tip.setAttribute("role", "status");
  tip.hidden = true;
  liveText(tip, "board.hintTip");
  d.layer.append(tip);

  let timer = 0;
  let tipTimer = 0;
  let steadyTimer = 0;
  /** Waiting through a pause (no glow yet since the last move). */
  let armed = false;

  function stop(): void {
    clearTimeout(steadyTimer);
    d.hint.classList.remove("nudge", "steady");
    clearTimeout(tipTimer);
    if (!tip.hidden && !tip.classList.contains("leaving")) {
      tip.classList.add("leaving");
      tipTimer = window.setTimeout(() => {
        tip.hidden = true;
        tip.classList.remove("leaving");
      }, 250);
    }
  }

  /** A fresh pause: the wait starts over (after a move, a touch, a new board). */
  function rearm(): void {
    clearTimeout(timer);
    armed = true;
    timer = window.setTimeout(fire, TUNING.idleMs);
  }

  function fire(): void {
    if (!armed) return;
    armed = false; // once per pause: the next move arms it again
    if (!d.allowed() || document.visibilityState !== "visible") return;
    d.hint.classList.remove("nudge", "steady");
    void d.hint.offsetWidth; // the pulses start over
    d.hint.classList.add("nudge");
    if (lessMotion()) {
      d.hint.classList.add("steady");
      steadyTimer = window.setTimeout(() => d.hint.classList.remove("nudge", "steady"), TUNING.steadyMs);
    }
    if (!lessonSeen(TIP_SEEN)) showTip();
  }

  /** The one-time line, over the helper row, its arrow on Hint. */
  function showTip(): void {
    learnt(TIP_SEEN);
    tip.classList.remove("leaving");
    tip.hidden = false;
    requestAnimationFrame(() => {
      const l = d.layer.getBoundingClientRect();
      const b = d.hint.getBoundingClientRect();
      const n = tip.getBoundingClientRect();
      tip.style.setProperty("--arrow-x", `${Math.round(Math.min(n.width - 24, Math.max(24, b.left + b.width / 2 - n.left)))}px`);
      tip.style.bottom = `${Math.round(l.bottom - b.top + 14)}px`;
    });
    clearTimeout(tipTimer);
    tipTimer = window.setTimeout(stop, TUNING.tipMs);
  }

  // the pulses rest once they are done
  d.hint.addEventListener("animationend", () => {
    if (!d.hint.classList.contains("steady")) d.hint.classList.remove("nudge");
  });
  // a move (or an undo, a shuffle, a new deal): the glow goes, and a fresh pause begins
  on("board:changed", () => {
    stop();
    rearm();
  });
  // a touch anywhere: the glow and the line go, and the pause starts over
  document.addEventListener(
    "pointerdown",
    () => {
      const was = d.hint.classList.contains("nudge") || !tip.hidden;
      stop();
      if (armed || was) rearm();
    },
    true,
  );
  for (const type of ["board:stuck", "board:solved", "board:won"] as const)
    on(type, () => {
      armed = false;
      clearTimeout(timer);
      stop();
    });

  return {
    /** A board opened (or the player left it): nothing up, and the wait starts on the next move. */
    reset(): void {
      armed = false;
      clearTimeout(timer);
      stop();
      tip.hidden = true;
      tip.classList.remove("leaving");
    },
  };
}
