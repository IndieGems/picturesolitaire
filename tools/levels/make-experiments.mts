// Builds the experiment boards: trial boards that ONLY the creator's dev menu
// loads (practice: no claim, no Coins, no progress; never in a release build,
// which drops the dev menu). They are proved like every other board
// (check.mts reads every file in src/content/levels, safe start included),
// but the win checker does not pay them: they are no lane of it
// (functions/checker/build.rs LANES), so a change here needs no server rebuild.
//   src/content/levels/experiments.json   the boards, each with its winning line and "name"
// Run: node tools/levels/make-experiments.mts [--fresh] [--remake x01,x02] [--out FILE]
//   It KEEPS every board already in the file, re-dealing only one that uses a
//   flagged picture (picture-flags.json) or is named by --remake; --fresh
//   remakes them all. A row past the file's end is made. --out FILE writes
//   the boards there instead (for trials; PICTURES=<file> reads a trial catalogue).
// Deterministic: the same file, rows, catalogue and flags give the same boards.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { join } from "node:path";
import { readBoards, root, writeBoards } from "./lib.mts";
import { CURRENT } from "./campaign-plan.mts";
import { makeExtras } from "./extras.mts";

const FILE = join(root, "src/content/levels/experiments.json");

const shapes = (spec) => Object.entries(spec).flatMap(([shape, n]) => Array(n).fill(shape));

/** One row a board (extras.mts has the columns); `name` is the dev menu's label. */
export const EXPERIMENTS = [
  // x01 (lead, 2026-10-25): only long pictures, tall 1x2 and wide 2x1 mixed, on the early campaign's
  // 4x4 board, relaxed with a safe start. All-domino boards are easy at any count (a trial: chain 2,
  // careless win 100% from 9 to 12 pictures), so it holds the most: 12, 8 waiting.
  // Art's long pictures (2026-10-25) are 7 tall and 8 wide not on campaign boards 1-13; three of the
  // tall ones are a little busy (busy 1), so a few may come in, but none busy 2, and none from before the clear pictures (CURRENT).
  { id: "x01", name: "Long pictures only (tall and wide)", role: "experiment", board: [4, 4], count: 12, alike: [], sizes: [2], cards: [24, 24], must: shapes({ "1x2": 6, "2x1": 6 }), peek: 0, chain: [1, 3], careless: [0.9, 1], apart: true, vary: true, busyMost: 0, old: CURRENT, oldMost: 0 },
  // x02 (lead, 2026-10-25: the game becomes a travelogue): Art's test destination, the Grand Canyon,
  // for Gameplay's reveal: its 2x2 window and four clear squares, a relief board's five pictures, so
  // it is easy (careless win 85-100%) and starts safe. Nothing from campaign boards 1-13. The crop is
  // Art's, in the catalogue entry ([2,2], the bottom-right quarter: the lit cliff and the river's bend).
  { id: "x02", name: "A destination: the Grand Canyon", role: "experiment", board: [4, 4], destination: "dest-grand-canyon", count: 4, alike: [], sizes: [4], cards: [16, 16], peek: 0, chain: [1, 3], careless: [0.85, 1], apart: true, vary: true, busyMost: 0, liveMost: 0, old: CURRENT, oldMost: 0 },
];

const has = (f) => process.argv.includes(f);
const at = process.argv.indexOf("--remake");
const remake = new Set(at > 0 ? process.argv[at + 1].split(",") : []);
const outAt = process.argv.indexOf("--out");
const OUT = outAt > 0 ? process.argv[outAt + 1] : FILE;
const old = has("--fresh") ? [] : readBoards(FILE);
const levels = makeExtras(EXPERIMENTS, old, remake);
// keep the phrase "creator's dev menu only" in the note: tools/no-dev-menu.mjs fails a release build that holds it (UI, 068d37d)
writeBoards(OUT, "experiment boards, for the creator's dev menu only (practice; never in a release build, not paid by the win checker); made by tools/levels/make-experiments.mts, checked by tools/levels/check.mts", levels);
console.log(`wrote ${OUT} (${levels.length} boards)`);
