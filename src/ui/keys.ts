// THE KEYS (the lead's brief with the wide layout, 2026-11-09), in every layout, for a keyboard:
//
//   Z (and Ctrl+Z, Cmd+Z on a Mac)  Undo        H  Hint        S  Shuffle        R  Restart
//   Esc     Back, or the card on top's own way out (that one is dialogs.ts's, unchanged)
//   Enter   the main action: the card on top's (its .next), else home's Next stop
//
// Each key PRESSES ITS BUTTON, so it does exactly what a click does, with the same gating: nothing while
// the button is hidden, disabled or inert (the guided start and the lessons make the others inert), or
// while a card is up over it; a helper with none left opens the run-out panel; R after a move asks first
// (the restart card), and before one there is nothing to lose. A key held down presses once (auto-repeat
// is ignored, so holding H never spends two Hints); with Ctrl, Alt or Meta held a key does nothing (Ctrl+R
// still reloads) except Ctrl+Z; nothing while typing in a field, or while a <dialog> is open (the settings,
// the dev menu: the browser's own Esc closes those).
//
// Enter and Space never press again a button the POINTER left focused (QA, 2026-11-09): Chrome keeps
// the focus on a clicked button, and a card gives it back to its opener as it closes (dialogs.ts, the
// <dialog>s natively), so Enter after a click on Hint spent a second Hint from the player's own stock,
// and Enter after closing Settings with Esc opened it again. Only a focus the keyboard moved (Tab, until
// the next pointer press) keeps the browser's own Enter and Space, so a player tabbing to a button still
// presses it; anywhere else Enter is the main action and Space nothing.
//
// The keys' hints (the chips on the wide layout's buttons, the tooltips over the column's) show only where
// the pointer hovers (wide.css). Enter and Esc are named in the player's language (locales, keys.*), as
// CSS strings on :root (--key-enter, --key-esc) for the chips drawn there; the letters are the letters.

import { onLocaleChange, t } from "./i18n";

export type Tool = "undo" | "hint" | "shuffle" | "restart";
/** Each tool's key, as its chip shows it. */
export const TOOL_KEYS: Record<Tool, string> = { undo: "Z", hint: "H", shuffle: "S", restart: "R" };
const BY_KEY: Record<string, Tool> = { z: "undo", h: "hint", s: "shuffle", r: "restart" };

const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Can a click reach it now: there, shown, not disabled and not inert. */
function pressable(el: HTMLElement | null | undefined): el is HTMLElement {
  if (!el || !el.isConnected || (el as HTMLButtonElement).disabled) return false;
  if (el.closest("[hidden], [inert]") || !el.getClientRects().length) return false;
  return getComputedStyle(el).visibility !== "hidden";
}

/** Press it as a click would, the button sinking a moment as under a finger. */
function press(el: HTMLElement): void {
  el.classList.add("pressed");
  setTimeout(() => el.classList.remove("pressed"), 120);
  el.click();
}

/** What Enter or Space would press (the browser's activation), were the focus on it. */
const CONTROL =
  "button, a[href], summary, [role=button], [role=switch], [role=tab], [role=menuitem], input[type=checkbox], input[type=radio], input[type=button], input[type=submit], input[type=reset]";

// Tab hands the focus to the keyboard until the pointer is pressed again; each focus that arrives
// meanwhile (the Tab's own, a card's or a <dialog>'s moving it after a key) is the keyboard's.
let keyboardLed = false;
let keyFocused: EventTarget | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("keydown", (e) => e.key === "Tab" && (keyboardLed = true), true);
  document.addEventListener("pointerdown", () => (keyboardLed = false), true);
  document.addEventListener("focusin", (e) => (keyFocused = keyboardLed ? e.target : null), true);
}

/** The focused control, when the pointer left it focused (not the keyboard): Enter or Space must not press it. */
function pointerFocused(): HTMLElement | null {
  const a = document.activeElement;
  return a instanceof HTMLElement && a !== document.body && a !== keyFocused && a.matches(CONTROL) ? a : null;
}

const typing = (el: Element | null): boolean =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable);

/** The card on top: the shown veil (or a picture seen big, or the VIP screen up over a card) drawn highest (z-index, then the later in the page). */
function topCard(root: ParentNode): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestZ = -Infinity;
  for (const v of root.querySelectorAll<HTMLElement>(".veil, .viewer, .screen.over")) {
    if (v.hidden || !v.getClientRects().length) continue;
    const z = Number.parseInt(getComputedStyle(v).zIndex, 10) || 0;
    if (z >= bestZ) {
      best = v;
      bestZ = z;
    }
  }
  return best;
}

/** Name Enter and Esc for the chips (wide.css), in the player's language. */
function nameKeys(): void {
  const root = document.documentElement.style;
  root.setProperty("--key-enter", JSON.stringify(t("keys.enter")));
  root.setProperty("--key-esc", JSON.stringify(t("keys.esc")));
}

export function watchKeys(o: {
  /** The app's root: the screens and cards under it. */
  root: HTMLElement;
  /** The board's tool buttons, while a board is the screen; null on any other. */
  tools(): Record<Tool, HTMLElement> | null;
  /** Home's main action (Next stop), while home is the screen. */
  main(): HTMLElement | null;
}): void {
  nameKeys();
  onLocaleChange(nameKeys);
  // Space presses on its release: stopped there too, for a control the pointer left focused
  document.addEventListener("keyup", (e) => {
    if (e.key === " " && pointerFocused()) e.preventDefault();
  });
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.isComposing) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    // not the browser's press of a control the pointer left focused, held down or not, in a <dialog> too
    if ((key === "Enter" || key === " ") && pointerFocused()) {
      e.preventDefault();
      if (key === " ") return;
    }
    if (e.repeat) return;
    if (typing(document.activeElement) || document.querySelector("dialog[open]")) return;
    const held = e.ctrlKey || e.altKey || e.metaKey;
    const undoChord = key === "z" && !e.altKey && !e.shiftKey && (mac ? e.metaKey !== e.ctrlKey : e.ctrlKey && !e.metaKey);
    if (held && !undoChord) return;
    const card = topCard(o.root);

    if (key === "Escape") {
      // a card's Escape is dialogs.ts's (it would have taken the key); with none up, the screen's Back
      if (card) return;
      const back = [...o.root.querySelectorAll<HTMLElement>(":scope > .screen:not([hidden]) .top-back")].find(pressable);
      if (!back) return;
      e.preventDefault();
      press(back);
      return;
    }

    if (key === "Enter") {
      // what the keyboard focused answers Enter itself (the browser presses a button tabbed to)
      const a = document.activeElement;
      if (a && a !== document.body && a === keyFocused) return;
      const main = card ? card.querySelector<HTMLElement>(".next") : o.main();
      if (!pressable(main)) return;
      e.preventDefault();
      press(main);
      return;
    }

    const tool = BY_KEY[key];
    if (!tool || card) return;
    const btn = o.tools()?.[tool];
    if (!pressable(btn)) return;
    e.preventDefault();
    press(btn);
  });
}
