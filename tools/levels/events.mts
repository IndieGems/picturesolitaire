// THE EVENTS (creator, 2026-10-30; docs/vip.md, docs/daily-suitcase.md): the Daily Suitcase as two-week
// events, for VIP members only. An event runs EVENT_DAYS days from its start, has about 7 items (Art's
// item pictures, 2x2), and each daily board of its days hides that day's item as one of its pictures.
// Which events run, and when, is tools/levels/events-plan.json: one entry per event, so back-to-back
// events, gaps between them or none at all are a plan edit with no code change (the cadence is the
// creator's call). The schedule (which item on which day) is the same for every player, seeded by the
// event's id alone, so every device and the server agree on it:
//   - each item comes up as evenly as the days share out, at least twice (7 items: exactly twice);
//   - SPREAD (Levels' rule, 2026-10-30, for the lead's "no item with both its days in the first or last
//     three"): every item at least once in each week (days 1-7 and 8-14), so a player who plays either
//     week whole sees them all; an item's showings at least APART days apart; and the second week is not
//     the first in the same order.
// make-events.mts writes src/content/levels/events.json from the plan; make-daily.mts places each day's
// item on its board (in place on a day already dealt: the item takes a picture's spot, so the deal and
// its line stay); check.mts proves both (eventProblem, the file equal to what make-events writes, and
// every daily's item equal to its day's).
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { random } from "../../src/game/rules.ts";
import { hashId } from "../../src/game/levels/generate.ts";
import { eventThemeOf, itemById, root, themeOf } from "./lib.mts";

/** Days in an event. */
export const EVENT_DAYS = 14;
/** A week of an event: every item comes up at least once in each. */
export const WEEK = 7;
/** An item's showings are at least this many days apart. */
export const APART = 4;
/** Items an event may have ("about 7", each at least twice in 14 days). */
export const ITEMS_MIN = 5;
export const ITEMS_MAX = 7;

export const PLAN_FILE = join(root, "tools/levels/events-plan.json");
/** The plan: [{ id, start, items: [item ids, slot order], month? }], `month` naming Art's monthly theme a reused set takes. */
export const PLAN = JSON.parse(readFileSync(PLAN_FILE, "utf8")).events;

const DAY = 86_400_000;
/** `date` ("YYYY-MM-DD") plus `n` days. */
export const addDays = (date: string, n: number) => new Date(Date.parse(date + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);

/** Why `days` (an item id per day of the event, in order) breaks the schedule's rules, or null. */
export function eventProblem(ids: readonly string[], days: readonly string[]): string | null {
  if (ids.length < ITEMS_MIN || ids.length > ITEMS_MAX) return `${ids.length} items; an event has ${ITEMS_MIN} to ${ITEMS_MAX}`;
  if (new Set(ids).size !== ids.length) return "an item listed twice";
  if (days.length !== EVENT_DAYS) return `${days.length} days, an event has ${EVENT_DAYS}`;
  const at = new Map(ids.map((id) => [id, [] as number[]]));
  for (const [d, id] of days.entries()) {
    if (!at.has(id)) return `day ${d + 1}: ${id} is not one of the event's items`;
    at.get(id)!.push(d);
  }
  const lo = Math.max(2, Math.floor(EVENT_DAYS / ids.length));
  const hi = Math.ceil(EVENT_DAYS / ids.length);
  for (const [id, ds] of at) {
    if (ds.length < lo || ds.length > hi) return `${id} comes up ${ds.length} times (${lo === hi ? lo : `${lo} to ${hi}`})`;
    if (!ds.some((d) => d < WEEK) || !ds.some((d) => d >= WEEK)) return `${id}: not in both weeks (days ${ds.map((d) => d + 1).join(", ")})`;
    for (let k = 1; k < ds.length; k++) if (ds[k]! - ds[k - 1]! < APART) return `${id}: back after ${ds[k]! - ds[k - 1]!} days (days ${ds[k - 1]! + 1} and ${ds[k]! + 1}), under ${APART}`;
  }
  if (days.slice(0, WEEK).join() === days.slice(WEEK, 2 * WEEK).join()) return "the second week repeats the first in the same order";
  return null;
}

/** The event's schedule: an item id per day, in order. Deterministic from the event's id and items alone. */
export function scheduleOf(id: string, ids: readonly string[]): string[] {
  const rnd = random(hashId(`event-${id}`));
  const n = ids.length;
  // the days shared out as evenly as they go; which items take a day more is the event's draw
  const order = [...ids];
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    [order[k], order[j]] = [order[j]!, order[k]!];
  }
  const counts = new Map(order.map((it, k) => [it, Math.floor(EVENT_DAYS / n) + (k < EVENT_DAYS % n ? 1 : 0)]));
  // day by day, an item drawn among those not shown within APART days, weighted by the square of its
  // showings left (so the first week shows each once before any comes back); a draw that runs into a
  // corner, or breaks a rule, starts again
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const left = new Map(counts);
    const last = new Map<string, number>();
    const days: string[] = [];
    for (let d = 0; d < EVENT_DAYS; d++) {
      const free = [...left].filter(([it, k]) => k > 0 && (last.get(it) === undefined || d - last.get(it)! >= APART));
      if (!free.length) break;
      let r = rnd() * free.reduce((t, [, k]) => t + k * k, 0);
      const [it] = free.find(([, k]) => (r -= k * k) < 0) ?? free.at(-1)!;
      left.set(it, left.get(it)! - 1);
      last.set(it, d);
      days.push(it);
    }
    if (days.length === EVENT_DAYS && !eventProblem(ids, days)) return days;
  }
  throw new Error(`event ${id}: no schedule meets the rules`);
}

/**
 * The events file's record for plan entry `p`: its theme and table (Art's `events` entry for its id, or
 * the monthly theme `month` names, for a set of items drawn for a month), its items in plan order with
 * their titles, and its days. A stand-in ("standIn": true) while Art's theme or any item picture is
 * missing or a stand-in; the ids never change, so Art's pictures replace a stand-in with no deal moving.
 */
export function eventOf(p) {
  const theme = eventThemeOf.get(p.id) ?? (p.month ? themeOf.get(p.month) : undefined);
  const items = p.items.map((id, k) => ({ id, title: itemById.get(id)?.title ?? `Item ${k + 1}` }));
  const standIn = !theme || p.items.some((id) => !itemById.has(id) || itemById.get(id).standin);
  const plan = scheduleOf(p.id, p.items);
  const days = Object.fromEntries(plan.map((id, d) => [addDays(p.start, d), id]));
  const name = theme?.theme ?? "Stand-in";
  return { id: p.id, ...(standIn ? { standIn: true } : {}), theme: name, table: theme?.table ?? null, tableTitle: theme?.tableTitle ?? `${name} table`, start: p.start, end: addDays(p.start, EVENT_DAYS - 1), items, days };
}

/** Why the plan's events cannot all run (out of order, overlapping, an item in two), or null. */
export function planProblem(plan = PLAN): string | null {
  const seen = new Map<string, string>();
  const ids = new Set<string>();
  for (const [k, p] of plan.entries()) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id ?? "")) return `event ${k + 1}: id ${JSON.stringify(p.id)} is not lower-case words joined by hyphens`;
    if (ids.has(p.id)) return `event ${p.id} is planned twice`;
    ids.add(p.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.start ?? "")) return `${p.id}: start ${JSON.stringify(p.start)} is not a date`;
    const prev = plan[k - 1];
    if (prev && p.start <= addDays(prev.start, EVENT_DAYS - 1)) return `${p.id} starts ${p.start}, before ${prev.id} ends (${addDays(prev.start, EVENT_DAYS - 1)}): events run in start order and never overlap`;
    for (const id of p.items ?? []) {
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

/** The day's item id of every date in a planned event. */
export function itemsByDay(plan = PLAN): Map<string, string> {
  const problem = planProblem(plan);
  if (problem) throw new Error(`events-plan.json: ${problem}`);
  return new Map(plan.flatMap((p) => Object.entries(eventOf(p).days)));
}
