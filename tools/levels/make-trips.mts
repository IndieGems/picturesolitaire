// Writes the campaign's trips (campaign-plan.mts TRIPS) to
// src/content/levels/trips.json, for the passport and home (UI):
//   {"v":1,"note":"...","trips":[{"id":"t1","name":"Travel America","from":1,"to":15}, ...]}
// from/to are board numbers as players count them (1-based, both included).
// Run: node tools/levels/make-trips.mts   (then node tools/levels/check.mts)
// The trips are no lane of the win checker (tools/server/levels-hash.mts), so
// a change here needs no server rebuild.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./lib.mts";
import { TRIPS } from "./campaign-plan.mts";

const FILE = join(root, "src/content/levels/trips.json");
const json =
  JSON.stringify({ v: 1, note: "the campaign's trips, boards from-to (1-based); made by tools/levels/make-trips.mts from campaign-plan.mts TRIPS, checked by tools/levels/check.mts", trips: TRIPS })
    .replace(/\{"id":"t/g, '\n{"id":"t')
    .replace(/\]\}$/, "\n]}") + "\n";
if (existsSync(FILE) && readFileSync(FILE, "utf8").replace(/\r\n/g, "\n") === json) console.log(`${FILE} is up to date`);
else {
  writeFileSync(FILE, json);
  console.log(`wrote ${FILE} (${TRIPS.length} trips)`);
}
