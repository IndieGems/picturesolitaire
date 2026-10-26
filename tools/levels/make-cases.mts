// Builds the Traveling Detective's case boards (lead, 2026-10-25: the mystery
// has its own home button): src/content/levels/cases.json, every case's
// boards in story order, each with "case": {id, name, n} and its clue picture
// as its destination (the trips' field; docs/mystery-pilot.md). They ship in
// release builds, but pay no Coins and make no claim: no lane of the win
// checker (tools/server/levels-hash.mts), so a change needs no server rebuild.
// Proved by check.mts like every board, safe start included.
// Run: node tools/levels/make-cases.mts [--remake mel01,...] [--out FILE]
//   It KEEPS every board in the file (extras.mts); a new file starts from the
//   case boards the dev menu's experiments had, so their deals carry over.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { readBoards, root, writeBoards } from "./lib.mts";
import { CURRENT } from "./campaign-plan.mts";
import { makeExtras } from "./extras.mts";

const FILE = join(root, "src/content/levels/cases.json");

export const CASES = [
  // Murder on the Melusine (lead, 2026-10-25; the pilot): case board N carries clue picture mel-0N.
  // Easy, as the story leads: a relief board's 5 pictures on 4x4, careless win 85-100%, a safe start;
  // the clue finishes mid-board.
  ...Array.from({ length: 15 }, (_, k) => {
    const n = String(k + 1).padStart(2, "0");
    return { id: `mel${n}`, name: `Melusine ${k + 1}`, case: { id: "melusine", name: "Murder on the Melusine", n: k + 1 }, role: "case", board: [4, 4], destination: `mel-${n}`, drop: "mid", count: 5, alike: [], sizes: [4], cards: [20, 20], peek: 0, chain: [1, 3], careless: [0.85, 1], vary: true, busyMost: 0, liveMost: 0, old: CURRENT, oldMost: 0 };
  }),
];

const at = process.argv.indexOf("--remake");
const remake = new Set(at > 0 ? process.argv[at + 1].split(",") : []);
const outAt = process.argv.indexOf("--out");
const OUT = outAt > 0 ? process.argv[outAt + 1] : FILE;
const old = existsSync(FILE) ? readBoards(FILE) : readBoards(join(root, "src/content/levels/experiments.json")).filter((l) => l.case);
const levels = makeExtras(CASES, old, remake);
writeBoards(OUT, "the Traveling Detective's case boards, every case in story order (case.n); no Coins, no claims; made by tools/levels/make-cases.mts, checked by tools/levels/check.mts", levels);
console.log(`wrote ${OUT} (${levels.length} boards)`);
