// Hard and super hard boards, marked for the player (the creator, 2026-10-25: "yes,
// mark hard and super hard boards for players", as Royal Match does). Which boards
// are marked is the level designer's: a campaign board's own `mark` field in
// src/content/levels/campaign.json (read here from the build's skeleton of it), "hard" or
// "super", absent on the rest (and on
// every challenge and daily board). The screens only show it:
//
//   home        the next board's line over Play: "Level 7" and a "Hard board" tag
//   opening     a banner over the board for about a second (app.ts, showMarkBanner),
//               never in the way: it takes no touch, so the first move is never held
//   top row     a "Hard" tag by the board number
//   win card    "Hard board beaten!"
//
// Every tag is information (the standard's two materials): flat tinted glass, no lip
// and no shadow, warm red-coral for hard, deep purple for super hard (style.css,
// --mark-hard and --mark-super, both 4.7:1 or more under white text).

import { campaign, type BoardSkeleton } from "virtual:ps-content";
import { t } from "./i18n";

export type Mark = "hard" | "super";

const stored = new Map<string, Mark>();
// from the campaign's skeleton (tools/content-split.mjs), so a mark is known before its trip loads
for (const b of campaign.boards) if (b.mark) stored.set(b.id, b.mark);

/** Marks shown for checking the screens before the level files carry them (dev server only, app.ts `__ps.marks`); never saved. */
const pretended = new Map<string, Mark | null>();

/** The mark of a campaign board (by its id: "c07"), or null. */
export function markOf(board: { id: string }): Mark | null {
  return pretended.has(board.id) ? pretended.get(board.id)! : (stored.get(board.id) ?? null);
}

/**
 * Campaign board `n`'s skeleton (from 1, going round past the last, as level(n)): its id, trip, size and
 * mark, always here, its trip loaded or not.
 */
export function boardAt(n: number): BoardSkeleton | undefined {
  const count = campaign.boards.length;
  return count ? campaign.boards[(((Math.floor(n) - 1) % count) + count) % count] : undefined;
}

/** The mark of campaign board `n` (from 1, going round past the last, as level(n)), loaded or not. */
export function markAt(n: number): Mark | null {
  const b = boardAt(n);
  return b ? markOf(b) : null;
}

/** Dev server only: show these boards as marked (null: unmarked), on top of the file's own marks. */
export function pretendMarks(marks: Record<string, Mark | null>): void {
  for (const [id, m] of Object.entries(marks)) pretended.set(id, m);
}

/** The mark's words: "Hard board" in full, "Hard" where it sits by the board number. */
export function markWords(m: Mark, short = false): string {
  return t(short ? (m === "hard" ? "mark.hardShort" : "mark.superShort") : m === "hard" ? "mark.hard" : "mark.super");
}

/** The mark as a small tag, inside a line of information (home's line, the top row, the dev menu). */
export function markTag(m: Mark, short = false): HTMLElement {
  const tag = document.createElement("span");
  tag.className = `mark-tag ${m}`;
  tag.textContent = markWords(m, short);
  return tag;
}
