// The daily pool's board types, one per weekday (0 = Sunday), all
// mid-campaign difficulty (about campaign boards 11 to 19). The weekday is the
// date's own, the same for every player. tools/levels/make-daily.mts reads it.
// Columns as in campaign-plan.mts. Changing a row changes only days made after
// the change: shipped days never move. Since 2026-10-24 (AGENTS.md, "pictures
// are clear, close and varied") no day pairs look-alikes: one picture a
// family, varied subjects and styles, at most one busy picture. Every stack
// shows card backs (peek 0, creator, 2026-10-25): peek is no part of a deal, so
// every day kept its deal and line, played days included, when it went to 0.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { READABLE } from "../../src/game/solver/metrics.ts";

export const WEEK = [
  /* Sun */ { role: "sun", count: 6, alike: [],     sizes: [2, 4, 6, 9], cards: [29, 31], peek: 0, chain: [2, 3], careless: [0.7, 0.95] },
  /* Mon */ { role: "mon", count: 6, alike: [],     sizes: [2, 4, 6],    cards: [24, 26], peek: 0, chain: [2, 3], careless: [0.8, 1] },
  /* Tue */ { role: "tue", count: 6, alike: [],     sizes: [2, 4, 6],    cards: [28, 30], peek: 0, chain: [2, 3], careless: [0.7, 0.95] },
  /* Wed */ { role: "wed", count: 6, alike: [],     sizes: [2, 4, 6, 9], cards: [28, 30], peek: 0, chain: [3, 3], careless: [0.65, 0.9] },
  /* Thu */ { role: "thu", count: 7, alike: [],     sizes: [2, 4, 6],    cards: [26, 28], peek: 0, chain: [2, 3], careless: [0.7, 0.95] },
  /* Fri */ { role: "fri", count: 6, alike: [],     sizes: [4, 6, 9],    cards: [29, 31], peek: 0, chain: [3, 3], careless: [0.6, 0.9] },
  /* Sat */ { role: "sat", count: 7, alike: [],     sizes: [2, 4, 6],    cards: [27, 29], peek: 0, chain: [2, 3], careless: [0.65, 0.9] },
];


for (const row of WEEK) Object.assign(row, { vary: true, busyMost: 1 });

/**
 * THE DAILY SUITCASE (creator, 2026-10-27; docs/daily-suitcase.md): from SUITCASE_FROM, every day is made
 * under today's rules and hides the day's item (suitcase.mts) as one of its pictures, so SUITCASE_WEEK
 * replaces WEEK for those days (make-daily.mts --redeal-from 2026-11-01; the days before stay as played):
 *   - a 4x5 board of squares only (AGENTS.md: all 2x2 or all long, and the item is a 2x2); `count`
 *     includes the item;
 *   - READABLE, as an unmarked campaign board: a player who draws by the face-up cards wins 85% or more
 *     (metrics.ts READER); 8 or 9 squares at these careless targets nearly always are, 10 almost never
 *     (survey, 2026-10-27: docs/daily.md);
 *   - a safe start (no first move or first clear dooms it), current pictures only (none from before the
 *     clear ones, no landmark, none of trips 9 and 10's new ones or spares), no lookalikes, varied, nothing
 *     busy 2 and at most one busy picture;
 *   - the item opens mid-board on the stored line: never its first clear, never its last.
 * The weekly rhythm stays: gentle Monday and Thursday, the week's bite on Friday.
 */
export const SUITCASE_FROM = "2026-11-01";
const ANY = [1, 99];
const sq = (n) => ({ count: n, alike: [], sizes: [4], cards: [n * 4, n * 4], peek: 0, chain: ANY });
export const SUITCASE_WEEK = [
  /* Sun */ { role: "s-sun", ...sq(9), careless: [0.7, 0.95] },
  /* Mon */ { role: "s-mon", ...sq(8), careless: [0.85, 1] },
  /* Tue */ { role: "s-tue", ...sq(9), careless: [0.75, 0.95] },
  /* Wed */ { role: "s-wed", ...sq(9), careless: [0.7, 0.9] },
  /* Thu */ { role: "s-thu", ...sq(8), careless: [0.8, 0.97] },
  /* Fri */ { role: "s-fri", ...sq(9), careless: [0.65, 0.9] },
  /* Sat */ { role: "s-sat", ...sq(9), careless: [0.7, 0.95] },
];
for (const row of SUITCASE_WEEK) Object.assign(row, { vary: true, busyMost: 0, liveMost: 1, reader: [READABLE, 1] });

/** The row a date's board is made from. */
export const rowOn = (date) => (date >= SUITCASE_FROM ? SUITCASE_WEEK : WEEK)[new Date(Date.parse(date + "T00:00:00Z")).getUTCDay()];

/** For tools that read every plan the same way. */
export const PLAN = WEEK;
