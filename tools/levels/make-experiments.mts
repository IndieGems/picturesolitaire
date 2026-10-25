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
import { random } from "../../src/game/rules.ts";
import { hashId } from "../../src/game/levels/generate.ts";
import { pick } from "../../src/game/levels/pick.ts";
import { dealBoard, destinationOf, destPicture, flaggedOn, readBoards, root, specOf, tallyText, usable, withDestination, writeBoards } from "./lib.mts";
import { CURRENT, DISTINCT } from "./campaign-plan.mts";

const FILE = join(root, "src/content/levels/experiments.json");
const CAMPAIGN = join(root, "src/content/levels/campaign.json");

const shapes = (spec) => Object.entries(spec).flatMap(([shape, n]) => Array(n).fill(shape));

/**
 * One row a board, as a campaign plan row (campaign-plan.mts has the columns),
 * plus `name` (the dev menu's label) and `apart` (take no picture that is on
 * campaign boards 1-DISTINCT, so the creator does not meet it twice).
 * `destination` (a postcard's id) adds it to the `count` library pictures as
 * a 2x2, with `crop` its window where the catalogue entry has none
 * (lib.mts destinationOf).
 */
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
const onCampaign = new Set(readBoards(CAMPAIGN).slice(0, DISTINCT).flatMap((l) => l.pictures.map((p) => p.id)));

const levels = EXPERIMENTS.map((row, i) => {
  const kept = old.find((l) => l.id === row.id);
  const bad = kept ? flaggedOn(kept.pictures) : [];
  const dest = row.destination ? destinationOf(row.destination, row.crop) : undefined;
  // peek is no part of the deal, and nor is a destination's crop (the window only says which part
  // of the postcard the cards show), so a kept board takes its row's peek and crop with its deal unchanged
  if (kept && !bad.length && !remake.has(row.id) && kept.destination?.id === dest?.id) {
    const peeked = kept.peek === row.peek ? kept : { ...kept, peek: row.peek, axes: { ...kept.axes, peek: row.peek } };
    return dest ? withDestination(peeked, dest) : peeked;
  }
  if (bad.length) console.log(`${row.id}: uses flagged ${bad.join(", ")}; re-dealing it`);
  const pool = row.apart ? usable.filter((p) => !onCampaign.has(p.id)) : usable;
  // calm first, then fewest boards it is on in the campaign
  const cost = new Map(pool.map((p) => [p.id, (p.busy ?? 0) * 2 + (onCampaign.has(p.id) ? 1 : 0)]));
  for (let attempt = 0; attempt < 12; attempt++) {
    const picked = pick(pool, specOf(row), cost, new Set(), random((hashId(row.id) + attempt * 104729) >>> 0));
    const pictures = picked && dest ? [...picked, destPicture(dest.id)] : picked;
    if (!pictures) throw new Error(`${row.id}: no pictures fit its row (${pool.filter((p) => row.sizes.includes(p.cols * p.rows)).length} of its sizes${row.apart ? " not on campaign boards 1-" + DISTINCT : ""}); the library needs more`);
    const { board, tally } = dealBoard(row, pictures, { id: row.id, cols: row.board[0], rows: row.board[1], tries: 3000, safeFirstMove: true });
    if (board) return withDestination({ ...board, name: row.name }, dest);
    for (const p of pictures) cost.set(p.id, cost.get(p.id) + 2);
    console.log(`${row.id}: pictures set ${attempt} found no deal (${tallyText(tally)})`);
  }
  throw new Error(`${row.id}: no deal meets its row; loosen it`);
});
// keep the phrase "creator's dev menu only" in the note: tools/no-dev-menu.mjs fails a release build that holds it (UI, 068d37d)
writeBoards(OUT, "experiment boards, for the creator's dev menu only (practice; never in a release build, not paid by the win checker); made by tools/levels/make-experiments.mts, checked by tools/levels/check.mts", levels);
console.log(`wrote ${OUT} (${levels.length} boards)`);
