// Mercy help, said on the board (tries.ts): a try that starts with free Hints says so in a small
// line over the helper row, its arrow on Hint: "A free Hint for this try." (or "2 free Hints
// ..."). Information, glass, taking no touch; it goes by itself after a few seconds, or at the
// player's first touch, and the Hint button's own badge keeps saying it (app.ts, drawHelpers).
// The same look as the Hint nudge's one-time line (hint-nudge.ts).

import { t } from "./i18n";

/** How long the line stays (ms), unless a touch takes it first. */
const STAY_MS = 4500;

export function createMercyNote(d: { hint: HTMLElement; layer: HTMLElement }) {
  const note = document.createElement("div");
  note.className = "hint-tip mercy-note glass";
  note.setAttribute("role", "status");
  note.hidden = true;
  d.layer.append(note);
  let timer = 0;

  function hide(): void {
    clearTimeout(timer);
    if (note.hidden || note.classList.contains("leaving")) return;
    note.classList.add("leaving");
    timer = window.setTimeout(() => {
      note.hidden = true;
      note.classList.remove("leaving");
    }, 250);
  }

  document.addEventListener("pointerdown", () => hide(), true);

  return {
    /** Say that this try starts with `n` free Hints. */
    show(n: number): void {
      clearTimeout(timer);
      note.textContent = t("board.mercy", { count: n });
      note.classList.remove("leaving");
      note.hidden = false;
      requestAnimationFrame(() => {
        const l = d.layer.getBoundingClientRect();
        const b = d.hint.getBoundingClientRect();
        const r = note.getBoundingClientRect();
        if (!b.width) return;
        note.style.setProperty("--arrow-x", `${Math.round(Math.min(r.width - 24, Math.max(24, b.left + b.width / 2 - r.left)))}px`);
        note.style.bottom = `${Math.round(l.bottom - b.top + 14)}px`;
      });
      timer = window.setTimeout(hide, STAY_MS);
    },
    /** Gone at once (the board closed). */
    clear(): void {
      clearTimeout(timer);
      note.hidden = true;
      note.classList.remove("leaving");
    },
  };
}
