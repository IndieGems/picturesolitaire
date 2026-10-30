// Writes the VIP events (creator, 2026-10-30; docs/vip.md, docs/daily-suitcase.md) to
// src/content/levels/events.json: for each event of tools/levels/events-plan.json, in start order, its
// theme and table (Art's), its items in slot order with their titles (Art's `items`), its first and last
// day and its schedule, an item per day (events.mts scheduleOf: seeded by the event's id alone, so it is
// the same every run). Agreed with Server (2026-10-30), who compiles it into the win checker: events
// never overlap, each runs 14 consecutive days, an item id belongs to one event for good.
// Run it before make-daily.mts, which places each day's item. check.mts holds the file to this.
// Run: node tools/levels/make-events.mts
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { root } from "./lib.mts";
import { eventOf, PLAN, planProblem } from "./events.mts";

export const EVENTS = join(root, "src/content/levels/events.json");

/** The file's text for the plan's events, one event's days on a line of their own so a diff shows what moved. */
export function eventsText(plan = PLAN) {
  const body = plan
    .map(eventOf)
    .map((r) => {
      const { days, items, ...head } = r;
      return `    { ${Object.entries(head).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")},\n      "items": ${JSON.stringify(items)},\n      "days": ${JSON.stringify(days)} }`;
    })
    .join(",\n");
  return `{\n  "v": 2,\n  "note": "the VIP events (the Daily Suitcase, two weeks each): in start order, never overlapping; each its theme, table, items in slot order and the item of each of its 14 days (the same for every player; never shown before its day's board opens). A daily in no event has no item. Made by tools/levels/make-events.mts from tools/levels/events-plan.json, checked by tools/levels/check.mts",\n  "events": [\n${body}\n  ]\n}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problem = planProblem();
  if (problem) throw new Error(`events-plan.json: ${problem}`);
  writeFileSync(EVENTS, eventsText());
  const stand = PLAN.map(eventOf).filter((e) => e.standIn);
  console.log(`wrote ${EVENTS}: ${PLAN.length} events${PLAN.length ? `, ${PLAN.map((p) => `${p.id} from ${p.start}`).join(", ")}` : ""}${stand.length ? `; stand-ins: ${stand.map((e) => e.id).join(", ")}` : ""}`);
}
