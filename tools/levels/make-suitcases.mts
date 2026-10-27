// Writes the Daily Suitcase's months (creator, 2026-10-27; docs/daily-suitcase.md) to
// src/content/levels/suitcases.json: for each month from suitcase.mts FIRST_MONTH to the month of the
// daily pool's last day (or --to YYYY-MM), its theme and table (Art's `suitcases` in pictures.json),
// its ten items in slot order with their titles (Art's `items`), and its schedule, an item per day
// (suitcase.mts schedule: seeded by the month alone, so it is the same every run). A month Art has not
// themed yet is a stand-in ("standIn": true, theme "Stand-in", titles "Item 1".."Item 10"), and so is an
// item with no picture yet; the ids never change, so Art's entries replace a stand-in with no deal moving.
// Run it before make-daily.mts, which places each day's item. check.mts holds the file to this.
// Run: node tools/levels/make-suitcases.mts [--to YYYY-MM]
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { itemById, root, themeOf } from "./lib.mts";
import { datesOf, FIRST_MONTH, ITEMS, itemId, nextMonth, schedule } from "./suitcase.mts";

export const SUITCASES = join(root, "src/content/levels/suitcases.json");

/** The months file's record for `month`, from the catalogue and the schedule. */
export function monthOf(month) {
  const theme = themeOf.get(month);
  const list = Array.from({ length: ITEMS }, (_, k) => {
    const id = itemId(month, k + 1);
    return { id, title: itemById.get(id)?.title ?? `Item ${k + 1}` };
  });
  // Art marks a stand-in item "standin": true until its real picture lands
  const standIn = !theme || list.some((it) => !itemById.has(it.id) || itemById.get(it.id).standin);
  const plan = schedule(month);
  const days = Object.fromEntries(datesOf(month).map((d, k) => [d, plan[k]]));
  const name = theme?.theme ?? "Stand-in";
  // the table's title in Settings (Server, UI): Art's, else the theme's
  return { month, ...(standIn ? { standIn: true } : {}), theme: name, table: theme?.table ?? null, tableTitle: theme?.tableTitle ?? `${name} table`, items: list, days };
}

/** The months from FIRST_MONTH through `last` ("YYYY-MM"). */
export const monthsTo = (last) => {
  const out = [];
  for (let m = FIRST_MONTH; m <= last; m = nextMonth(m)) out.push(m);
  return out;
};

/** The file's text for those months, one month's days on a line of their own so a diff shows what moved. */
export function suitcasesText(months) {
  const rec = months.map(monthOf);
  const body = rec
    .map((r) => {
      const { days, items, ...head } = r;
      return `    { ${Object.entries(head).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")},\n      "items": ${JSON.stringify(items)},\n      "days": ${JSON.stringify(days)} }`;
    })
    .join(",\n");
  return `{\n  "v": 1,\n  "note": "the Daily Suitcase's months: theme, table, the ten items in slot order and the item of each day (the same for every player; never shown before its day's board opens); made by tools/levels/make-suitcases.mts, checked by tools/levels/check.mts",\n  "months": [\n${body}\n  ]\n}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const at = process.argv.indexOf("--to");
  const daily = JSON.parse(readFileSync(join(root, "src/content/levels/daily.json"), "utf8")).levels;
  const last = at > 0 ? process.argv[at + 1] : daily.at(-1).date.slice(0, 7);
  const months = monthsTo(last);
  writeFileSync(SUITCASES, suitcasesText(months));
  const stand = months.filter((m) => monthOf(m).standIn);
  console.log(`wrote ${SUITCASES}: ${months.length} months, ${months[0]} to ${months.at(-1)}${stand.length ? `; stand-ins (no theme or item pictures from Art yet): ${stand.join(", ")}` : ""}`);
}
