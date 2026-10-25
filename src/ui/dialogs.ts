// Every card the game lays over a screen (the win card, the restart card, the
// "No connection" card, a picture seen big) is a dialog to a keyboard too (the
// lead, 2026-10-25, after Untangled's src/cards.ts):
//
// - as it opens, the focus moves into it: onto its main button (`.next`), else its
//   first; and it is named by its heading;
// - Escape does what the card's own way out does (the restart card's "Keep
//   playing", the picture's Back), and nothing on a card with no way out but its
//   buttons (the win card) or none at all (No connection);
// - as it closes, the focus goes back where it was, if that is still there to take it.
//
// The gear's screen and the dev menu are <dialog>s shown modal: the browser does
// all three for them, and Escape here leaves them to it. Focus rings are the
// stylesheet's (:focus-visible), shown for a keyboard only.

type Entry = { el: HTMLElement; back: HTMLElement | null; escape?: () => void };
/** The cards open now, the last opened last. */
const open: Entry[] = [];
let heads = 0;

const FIRST = "button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])";

function focusIn(el: HTMLElement): void {
  if (!el.isConnected || el.hidden || el.contains(document.activeElement)) return;
  const target = el.querySelector<HTMLElement>(".next:not([disabled])") ?? el.querySelector<HTMLElement>(FIRST);
  target?.focus({ preventScroll: true });
}

/**
 * `el` has just been shown (or drawn again while up): the focus goes into it, and
 * Escape now runs `escape` (none: Escape does nothing while it is the top card).
 */
export function opened(el: HTMLElement, escape?: () => void): void {
  if (!el.hasAttribute("aria-label")) {
    const head = el.querySelector<HTMLElement>("h2, .top-pill");
    if (head) {
      head.id ||= `card-head-${++heads}`;
      el.setAttribute("aria-labelledby", head.id);
    }
  }
  const known = open.find((e) => e.el === el);
  if (known) known.escape = escape;
  else {
    const a = document.activeElement;
    open.push({ el, back: a instanceof HTMLElement && a !== document.body && !el.contains(a) ? a : null, escape });
  }
  // after the card's own code has run
  queueMicrotask(() => focusIn(el));
}

/** `el` has just been hidden: the focus goes back to where it was when it opened. */
export function closed(el: HTMLElement): void {
  const i = open.findIndex((e) => e.el === el);
  if (i < 0) return;
  const [entry] = open.splice(i, 1);
  // only when the focus was in the card, or went with it; a card closed under another leaves it be
  const a = document.activeElement;
  if (a && a !== document.body && !el.contains(a)) return;
  const back = entry?.back;
  if (back?.isConnected && !back.closest("[hidden], [inert]") && back.getClientRects().length) back.focus({ preventScroll: true });
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || e.defaultPrevented || document.querySelector("dialog[open]")) return;
  const top = open[open.length - 1];
  if (!top) return;
  e.preventDefault();
  top.escape?.();
});
