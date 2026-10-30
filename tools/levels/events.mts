// THE EVENTS (creator, 2026-10-30; docs/vip.md): each event is a VIP content pack of EVENT_LEVELS levels of
// its own, never the dailies, with ITEMS items hidden one in each of ITEMS of its levels. A VIP plays any
// event any time from its `release` date on; old events stay playable (the archive). Which events exist,
// from when, and their items: tools/levels/events-plan.json, one entry per event (the cadence is the
// creator's: a plan edit, no code change).
//   - THE CURVE (Levels, 2026-10-30; docs/difficulty-curve.md "The events"): ROWS, the same 30 for every
//     event: a gentle sawtooth of relief, builds and a bite, two all-long change-of-pace levels, every
//     square level from 7 on 4x5, and a hard mark near the end (25, 30); readable and a safe start
//     unless marked, a marked level careful (as the campaign's).
//   - THE ITEMS: item k of the plan (slot order) hides on level ITEM_AT[k] (every third: 2, 5, ... 29),
//     a 2x2 picture of that level, finished neither first nor last on the stored line, nothing beside it
//     of its family or sharing a word with it (lib.mts itemClash).
//   - THE PICTURES: library pictures only (the creator), clear (no atmospheric one), current (none from
//     before the clear ones), no landmark, none flagged and none Art moved off; on no other level first
//     (the least used), and none twice within an event.
// make-events.mts writes the pack's boards to src/content/levels/event-levels.json and the events'
// details to src/content/levels/events.json (shape agreed with Server, 2026-10-30, who compiles both into
// the win checker); check.mts proves both.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CAREFUL, READABLE } from "../../src/game/solver/metrics.ts";
import { eventThemeOf, itemById, root, themeOf } from "./lib.mts";

/** Levels in an event. */
export const EVENT_LEVELS = 30;
/** Items an event hides, one a level. */
export const ITEMS = 10;
/** The levels (from 0) that hide the items, in item order: every third, 2, 5, ... 29 as players count. */
export const ITEM_AT = Array.from({ length: ITEMS }, (_, k) => 1 + 3 * k);
/** A level's id: "<event id>-NN". */
export const levelId = (eventId: string, k: number) => `${eventId}-${String(k + 1).padStart(2, "0")}`;

const ANY = [1, 99];
const sq = (n, board = [4, 5]) => ({ count: n, alike: [], sizes: [4], cards: [n * 4, n * 4], board });
const long = (n) => ({ count: n, alike: [], sizes: [2], cards: [n * 2, n * 2], board: [4, 4] });
/**
 * The 30 levels' rows (campaign-plan.mts columns): relief (careless 85% or more), build, bite, hard. On
 * 4x4, 5 or 6 squares are always won carelessly and 7 sometimes not; 4x5 takes about two more for the
 * same bite (docs/difficulty-curve.md survey; a first try at 6 squares for 75-95% found no deal: always
 * 100%). Peek 0 everywhere; the dial is the picture count.
 */
export const ROWS = [
  /*  1 */ { role: "relief", ...sq(5, [4, 4]), careless: [0.85, 1] },
  /*  2 */ { role: "build",  ...sq(6, [4, 4]), careless: [0.85, 1] },
  /*  3 */ { role: "bite",   ...sq(7, [4, 4]), careless: [0.55, 0.75] },
  /*  4 */ { role: "relief", ...sq(5, [4, 4]), careless: [0.85, 1] },
  /*  5 */ { role: "build",  ...sq(7, [4, 4]), careless: [0.65, 0.85] },
  /*  6 */ { role: "pace",   ...long(10), careless: [0.85, 1] },
  /*  7 */ { role: "build",  ...sq(9), careless: [0.7, 0.85] },
  /*  8 */ { role: "bite",   ...sq(10), careless: [0.55, 0.7] },
  /*  9 */ { role: "relief", ...sq(8), careless: [0.85, 1] },
  /* 10 */ { role: "build",  ...sq(9), careless: [0.7, 0.85] },
  /* 11 */ { role: "bite",   ...sq(10), careless: [0.55, 0.7] },
  /* 12 */ { role: "relief", ...sq(8), careless: [0.85, 1] },
  /* 13 */ { role: "build",  ...sq(10), careless: [0.6, 0.75] },
  /* 14 */ { role: "bite",   ...sq(10), careless: [0.5, 0.65] },
  /* 15 */ { role: "pace",   ...long(12), careless: [0.85, 1] },
  /* 16 */ { role: "build",  ...sq(10), careless: [0.6, 0.75] },
  /* 17 */ { role: "bite",   ...sq(11), careless: [0.45, 0.6] },
  /* 18 */ { role: "relief", ...sq(8), careless: [0.85, 1] },
  /* 19 */ { role: "build",  ...sq(10), careless: [0.6, 0.75] },
  /* 20 */ { role: "bite",   ...sq(11), careless: [0.45, 0.6] },
  /* 21 */ { role: "relief", ...sq(9), careless: [0.8, 1] },
  /* 22 */ { role: "build",  ...sq(10), careless: [0.55, 0.7] },
  /* 23 */ { role: "bite",   ...sq(11), careless: [0.45, 0.6] },
  /* 24 */ { role: "relief", ...sq(9), careless: [0.8, 1] },
  /* 25 */ { role: "hard",   ...sq(11), careless: [0.3, 0.5], traps: [0, 3] },
  /* 26 */ { role: "relief", ...sq(9), careless: [0.8, 1] },
  /* 27 */ { role: "build",  ...sq(10), careless: [0.55, 0.7] },
  /* 28 */ { role: "bite",   ...sq(11), careless: [0.4, 0.55] },
  /* 29 */ { role: "build",  ...sq(10), careless: [0.55, 0.7] },
  /* 30 */ { role: "hard",   ...sq(13, [5, 5]), careless: [0.25, 0.4], traps: [0, 3] },
];
/** The roles that may trap from the first move, and the mark players see on them (as the campaign's). */
export const EVENT_MAY_TRAP = new Set(["hard"]);
export const EVENT_MARKS = { hard: "hard" };
for (const row of ROWS)
  Object.assign(row, {
    peek: 0,
    chain: ANY,
    vary: true,
    busyMost: 0,
    liveMost: row.role === "pace" ? undefined : row.count >= 8 ? 2 : 1,
    reader: EVENT_MAY_TRAP.has(row.role) ? [CAREFUL, 1] : [READABLE, 1],
  });
if (ROWS.length !== EVENT_LEVELS) throw new Error(`events.mts: ${ROWS.length} rows, an event has ${EVENT_LEVELS}`);
for (const k of ITEM_AT) if (ROWS[k].sizes.join() !== "4") throw new Error(`events.mts: level ${k + 1} hides an item, so it is a board of squares`);

export const PLAN_FILE = join(root, "tools/levels/events-plan.json");
/** The plan: [{ id, release, items: [item ids, slot order], month? }], `month` naming Art's monthly theme a set drawn for a month takes. */
export const PLAN = JSON.parse(readFileSync(PLAN_FILE, "utf8")).events;

/**
 * The events file's record for plan entry `p`: its theme and table (Art's `events` entry for its id, or
 * the monthly theme `month` names), its release, its levels and its items with their titles and levels.
 * A stand-in ("standIn": true) while Art's theme or any item picture is missing or a stand-in, or it has
 * fewer than ITEMS items (a release build fails on one: check.mts).
 */
export function eventOf(p) {
  const theme = eventThemeOf.get(p.id) ?? (p.month ? themeOf.get(p.month) : undefined);
  const items = p.items.map((id, k) => ({ id, title: itemById.get(id)?.title ?? `Item ${k + 1}`, level: levelId(p.id, ITEM_AT[k]) }));
  const standIn = !theme || p.items.length < ITEMS || p.items.some((id) => !itemById.has(id) || itemById.get(id).standin);
  const name = theme?.theme ?? "Stand-in";
  return {
    id: p.id,
    ...(standIn ? { standIn: true } : {}),
    theme: name,
    table: theme?.table ?? null,
    tableTitle: theme?.tableTitle ?? `${name} table`,
    release: p.release,
    levels: Array.from({ length: EVENT_LEVELS }, (_, k) => levelId(p.id, k)),
    items,
  };
}

/** Why the plan's events cannot all run (out of order, an item in two, too many items), or null. */
export function planProblem(plan = PLAN): string | null {
  const seen = new Map<string, string>();
  const ids = new Set<string>();
  for (const [k, p] of plan.entries()) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id ?? "")) return `event ${k + 1}: id ${JSON.stringify(p.id)} is not lower-case words joined by hyphens`;
    if (ids.has(p.id)) return `event ${p.id} is planned twice`;
    ids.add(p.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.release ?? "")) return `${p.id}: release ${JSON.stringify(p.release)} is not a date`;
    if (plan[k - 1] && p.release < plan[k - 1].release) return `${p.id} is released ${p.release}, before ${plan[k - 1].id} (${plan[k - 1].release}): events run in release order`;
    if (!Array.isArray(p.items) || p.items.length > ITEMS) return `${p.id}: ${p.items?.length ?? 0} items, an event has ${ITEMS}`;
    for (const id of p.items) {
      const it = itemById.get(id);
      if (!it) return `${p.id}: item ${id} is not in the catalogue's items (Art: pictures.json items)`;
      if (it.cols !== 2 || it.rows !== 2) return `${p.id}: item ${id} is ${it.cols}x${it.rows}, an item is 2x2`;
      // an item's id is its inventory item's for good (Server: uuid5 "suitcase:item:<id>"), so one event's only
      if (seen.has(id)) return `item ${id} is in both ${seen.get(id)} and ${p.id}; an item belongs to one event`;
      seen.set(id, p.id);
    }
  }
  return null;
}
