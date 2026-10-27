// The Daily Suitcase's schedule (creator, 2026-10-27; docs/daily-suitcase.md): each month a themed
// suitcase of ITEMS items, and each daily board of the month hides that day's item as one of its 2x2
// pictures. The schedule (which item on which day) is the same for every player, set for the whole month
// in advance and seeded by the month alone, so every device and the server agree on it:
//   - each item comes up 2 to 4 times (the month's days shared out as evenly as they go: 3 each in a
//     30-day month, one item 4 in a 31-day month, two items 2 in February);
//   - SPREAD: no item has all its days within one week (its first and last at least WEEK days apart),
//     and no item comes back within GAP days (no "goggles" on Monday and again on Wednesday).
// make-suitcases.mts writes it to src/content/levels/suitcases.json, make-daily.mts places each day's item
// on its board, and check.mts proves both (scheduleProblem, and the file equal to schedule()).
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { random } from "../../src/game/rules.ts";
import { hashId } from "../../src/game/levels/generate.ts";

/** Items in a month's suitcase. */
export const ITEMS = 10;
/** The first month with a suitcase: the daily boards from its first day carry an item. */
export const FIRST_MONTH = "2026-11";
/** An item's days span at least this many days (first to last), so none has all its days in one week. */
export const WEEK = 7;
/** An item's showings are at least this many days apart. */
export const GAP = 3;

/** Item `slot` (1..ITEMS) of `month` ("YYYY-MM"): the id of its picture, its item and its slot, all one (agreed with Gameplay, UI, Server and Art). */
export const itemId = (month: string, slot: number) => `item-${month}-${String(slot).padStart(2, "0")}`;

/** Days in `month` ("YYYY-MM"). */
export const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** The month after `month`. */
export const nextMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

/** The month's dates, "YYYY-MM-DD", in order. */
export const datesOf = (month: string) => Array.from({ length: daysIn(month) }, (_, k) => `${month}-${String(k + 1).padStart(2, "0")}`);

/** Why `days` (an item id per day of `month`, in order) breaks the schedule's rules, or null. */
export function scheduleProblem(month: string, days: readonly string[]): string | null {
  if (days.length !== daysIn(month)) return `${days.length} days, the month has ${daysIn(month)}`;
  const ids = Array.from({ length: ITEMS }, (_, k) => itemId(month, k + 1));
  const at = new Map(ids.map((id) => [id, [] as number[]]));
  for (const [d, id] of days.entries()) {
    if (!at.has(id)) return `day ${d + 1}: ${id} is not one of the month's ${ITEMS} items`;
    at.get(id)!.push(d);
  }
  for (const [id, ds] of at) {
    if (ds.length < 2 || ds.length > 4) return `${id} comes up ${ds.length} times (2 to 4)`;
    if (ds.at(-1)! - ds[0]! < WEEK) return `${id}: all its days within one week (days ${ds.map((d) => d + 1).join(", ")})`;
    for (let k = 1; k < ds.length; k++) if (ds[k]! - ds[k - 1]! < GAP) return `${id}: back after ${ds[k]! - ds[k - 1]!} days (days ${ds[k - 1]! + 1} and ${ds[k]! + 1}), under ${GAP}`;
  }
  return null;
}

/** The month's schedule: an item id per day, in order. Deterministic from the month alone. */
export function schedule(month: string): string[] {
  const n = daysIn(month);
  const rnd = random(hashId(`suitcase-${month}`));
  // the days shared out as evenly as they go; which items take a day more is the month's draw
  const order = Array.from({ length: ITEMS }, (_, k) => k + 1);
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    [order[k], order[j]] = [order[j]!, order[k]!];
  }
  const counts = new Map(order.map((slot, k) => [slot, Math.floor(n / ITEMS) + (k < n % ITEMS ? 1 : 0)]));
  // day by day, an item drawn among those not shown within GAP days, weighted by the square of its
  // showings left (so none is left to crowd the month's end, and no cycle repeats in order); a draw that
  // runs into a corner, or breaks a rule, starts again
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const left = new Map(counts);
    const last = new Map<number, number>();
    const days: string[] = [];
    for (let d = 0; d < n; d++) {
      const free = [...left].filter(([slot, k]) => k > 0 && (last.get(slot) === undefined || d - last.get(slot)! >= GAP));
      if (!free.length) break;
      let r = rnd() * free.reduce((t, [, k]) => t + k * k, 0);
      const [slot] = free.find(([, k]) => (r -= k * k) < 0) ?? free.at(-1)!;
      left.set(slot, left.get(slot)! - 1);
      last.set(slot, d);
      days.push(itemId(month, slot));
    }
    if (days.length === n && !scheduleProblem(month, days)) return days;
  }
  throw new Error(`suitcase ${month}: no schedule meets the rules`);
}
