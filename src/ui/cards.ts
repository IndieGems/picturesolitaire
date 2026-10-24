// A card's shape on every screen around the board (the win card's pictures, the albums, the
// viewer, home's stacks): the board's own tuning value, TUNING.cardAspect in src/board/tuning.ts
// (a card's width ÷ height; portrait 3:4 by the creator's ruling in AGENTS.md). Read at draw time,
// so the game config's override reaches these screens as it reaches the board.
//
// A picture of cols × rows cards is cols·aspect : rows. Pictures made for square cards are
// centre-cropped to that window (object-fit: cover), as the board crops them.

import { TUNING } from "../board/tuning";

/** A card's width ÷ height (0.75: portrait 3:4). */
export function cardAspect(): number {
  const a = (TUNING as { cardAspect?: unknown }).cardAspect;
  return typeof a === "number" && Number.isFinite(a) ? Math.min(2, Math.max(0.4, a)) : 0.75;
}

/** A picture's width ÷ height: cols cards across, rows down. */
export function pictureAspect(cols: number, rows: number): number {
  return (cols * cardAspect()) / Math.max(1, rows);
}

/** Hand the card's shape to the stylesheet (--card-aspect) for what is drawn next. */
export function syncCardAspect(): void {
  document.documentElement.style.setProperty("--card-aspect", String(cardAspect()));
}
