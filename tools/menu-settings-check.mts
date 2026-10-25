// Holds the game's list in the Arcade's Gem menu (src/menu-settings-list.ts) to the
// rules, at its fullest (every table a choice can hold):
//
//   node tools/menu-settings-check.mts        (in `npm run build` and `build:release`)
//
// - eight settings or fewer (the most the menu lists);
// - no mute and no vibration (the Arcade's quick row has its own: the game standard,
//   "A game's settings are its own"), and never the creator's Developer row;
// - ids of 1 to 40 of A-Z a-z 0-9 _ -, unique; a choice of two to four options holding
//   its value; a slider's value inside its range.

import { readFileSync } from "node:fs";
import { MENU_MAX, menuSettings } from "../src/menu-settings-list.ts";

// the rows' real names (English: the other locales are written at release)
const en = JSON.parse(readFileSync(new URL("../locales/en.json", import.meta.url), "utf8")) as Record<string, string>;
const labels = { volume: en["settings.volume"]!, table: en["settings.table"]! };

const fullest = menuSettings({
  volume: 73,
  table: "table-b",
  tables: ["a", "b", "c", "d"].map((x) => ({ id: `table-${x}`, label: `Table ${x}` })),
  labels,
});
const fewest = menuSettings({ volume: 100, table: "table-a", tables: [{ id: "table-a", label: "Table a" }], labels });

const wrong: string[] = [];
for (const [name, list] of [
  ["fullest", fullest],
  ["fewest", fewest],
] as const) {
  if (list.length > MENU_MAX) wrong.push(`${name}: ${list.length} settings, more than ${MENU_MAX}`);
  const ids = new Set<string>();
  for (const s of list) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(s.id)) wrong.push(`${name}: id "${s.id}" is not 1 to 40 of A-Z a-z 0-9 _ -`);
    if (ids.has(s.id)) wrong.push(`${name}: id "${s.id}" twice`);
    ids.add(s.id);
    if (/mute|sound|vibrat|haptic|dev/i.test(`${s.id} ${s.label}`)) wrong.push(`${name}: "${s.id}" (${s.label}) is a mute, a vibration or the dev menu: the Arcade's own, or never a setting`);
    if (s.kind === "choice" && (s.options.length < 2 || s.options.length > 4 || !s.options.some((o) => o.id === s.value)))
      wrong.push(`${name}: choice "${s.id}" needs two to four options, one of them its value`);
    if (s.kind === "slider" && (s.value < (s.min ?? 0) || s.value > (s.max ?? 100))) wrong.push(`${name}: slider "${s.id}" is outside its range`);
  }
}
if (!fullest.some((s) => s.id === "table")) wrong.push("fullest: the Table choice is missing");
if (fewest.some((s) => s.id === "table")) wrong.push("fewest: a Table choice with only one table");

if (wrong.length) {
  console.error(`menu-settings: the Arcade's menu list breaks its rules:\n  ${wrong.join("\n  ")}`);
  process.exit(1);
}
console.log(`menu-settings: ${fullest.length} setting(s) at most (${fullest.map((s) => s.id).join(", ")}), no mute or vibration`);
