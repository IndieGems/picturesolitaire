// The page behaving like a game rather than a web page: the script half of
// what index.html's base styles do with touch-action and user-select. Imported
// by the boot entry (src/main.ts), so it holds from the first frame: a pinch
// during loading must not zoom the page either. No imports: the boot chunk
// stays the bridge and this. (Untangled's src/browser.ts, docs/mobile.md.)

const editable = (t: EventTarget | null) => t instanceof Element && t.closest("input, textarea, [contenteditable]") !== null;

// A long press (Android) or right click opens the browser's menu ("Save image",
// "Copy") over the game, a picture's most of all.
document.addEventListener("contextmenu", (e) => {
  if (!editable(e.target)) e.preventDefault();
});

// Dragging a picture drags a ghost of it off the page (desktop).
document.addEventListener("dragstart", (e) => e.preventDefault());

// A selection started anyway (a double click on some desktop browsers).
document.addEventListener("selectstart", (e) => {
  if (!editable(e.target)) e.preventDefault();
});

// iOS Safari pinch-zooms whatever the viewport tag says; its own gesture
// events are the handle that still works.
for (const type of ["gesturestart", "gesturechange", "gestureend"])
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });

// Ghost taps: a quick double tap on a button that swaps the screen lands its
// second tap on whatever the NEW screen has in that spot (Next, then the next
// board's Undo). Taps this soon after a screen change are dropped, never longer
// than 300 ms, and never on the first screen at start-up, which follows no tap.
// Script clicks (the check tools' `.click()`) are never trusted events, so they pass.
const GHOST_MS = 300;
let swappedAt = -Infinity;
/** Call whenever a new screen or card replaces the old one. */
export function screenChanged(): void {
  swappedAt = performance.now();
}
/** The first screen at start-up: no tap swapped it in, so nothing is held back. */
export function firstScreen(): void {
  swappedAt = -Infinity;
}
document.addEventListener(
  "click",
  (e) => {
    if (e.isTrusted && performance.now() - swappedAt < GHOST_MS) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true,
);
