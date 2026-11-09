// THE WIDE LAYOUT (the creator's pick, 2026-11-09, of the PC mockups in design/pc-mockups/: (a), the side
// columns, with (b)'s wide win card). A window at least 1000 x 600 CSS px and at least 5:4 wide is laid
// out for itself, under html.wide (wide.css): the table across the whole window; a level's board centred
// at full height, the trip and its postcards on its left, the tools on its right as labelled buttons;
// home's places to go in a sidebar beside the trip and Next stop; the win card wide, every picture of the
// level big; the cards centred over the dimmed window; every other screen's column centred over the
// table, its top row across the window (the title clear of the Arcade's Gem corner, Back top right).
//
// No phone reaches it, held either way (the largest are about 930 x 430): below it every screen is drawn
// exactly as before, and nothing in this file or wide.css touches it. A tablet held sideways and a TV do
// reach it, by touch or a remote, so nothing in it depends on a hover and every target stays 44 px or
// more; hover states, tooltips and key hints show only where the pointer hovers ((hover: hover) and
// (pointer: fine), wide.css). The keys themselves are keys.ts's, in any layout.
//
// The Arcade letterboxes a portrait-only game into a 9:16 column, so the game is handed a wide window only
// once its store page declares it plays both ways (the lead's, on dev): until then this never switches on
// inside the Arcade, only in a wide browser tab.

import "./wide.css";

/** The window shape the wide layout is for (the lead's brief: wide, landscape and tall enough). */
export const WIDE_QUERY = "(min-width: 1000px) and (min-height: 600px) and (min-aspect-ratio: 5/4)";

const query = typeof matchMedia === "function" ? matchMedia(WIDE_QUERY) : null;
const heard = new Set<(wide: boolean) => void>();

/** Is the window laid out wide now? */
export const isWide = (): boolean => !!query?.matches;

function apply(): void {
  const root = document.documentElement;
  const on = isWide();
  // only when it changes: top-row.ts hears every write to the class attribute
  if (root.classList.contains("wide") !== on) root.classList.toggle("wide", on);
  for (const fn of heard) fn(on);
}
query?.addEventListener("change", apply);
apply();

/** Hear the layout switch between wide and the column (a window resized, a tablet turned). */
export function onWide(fn: (wide: boolean) => void): void {
  heard.add(fn);
}
