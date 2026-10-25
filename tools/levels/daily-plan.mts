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

/** For tools that read every plan the same way. */
export const PLAN = WEEK;
