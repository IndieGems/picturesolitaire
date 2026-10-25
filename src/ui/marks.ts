// Hard and super hard boards, marked for the player (the creator, 2026-10-25: "yes,
// mark hard and super hard boards for players", as Royal Match does). Which boards
// are marked is the level designer's: a campaign board's own `mark` field in
// src/content/levels/campaign.json, "hard" or "super", absent on the rest (and on
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

import CAMPAIGN from "../content/levels/campaign.json";
import { t } from "./i18n";

export type Mark = "hard" | "super";

const stored = new Map<string, Mark>();
for (const l of CAMPAIGN.levels as unknown as { id: string; mark?: unknown }[])
  if (l.mark === "hard" || l.mark === "super") stored.set(l.id, l.mark);

/** Marks shown for checking the screens before the level files carry them (dev server only, app.ts `__ps.marks`); never saved. */
const pretended = new Map<string, Mark | null>();

/** The mark of a campaign board (by its id: "c07"), or null. */
export function markOf(board: { id: string }): Mark | null {
  return pretended.has(board.id) ? pretended.get(board.id)! : (stored.get(board.id) ?? null);
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
