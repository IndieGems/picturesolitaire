// Builds the experiment boards: trial boards that ONLY the creator's dev menu
// loads (practice: no claim, no Coins, no progress; never in a release build,
// which drops the dev menu). They are proved like every other board
// (check.mts reads every file in src/content/levels, safe start included),
// but the win checker does not pay them: they are no lane of it
// (functions/checker/build.rs LANES), so a change here needs no server rebuild.
//   src/content/levels/experiments.json   the boards, each with its winning line and "name"
// Run: node tools/levels/make-experiments.mts [--fresh] [--remake x01,x02]
//   It KEEPS every board already in the file, re-dealing only one that uses a
//   flagged picture (picture-flags.json) or is named by --remake; --fresh
//   remakes them all. A row past the file's end is made.
// Deterministic: the same file, rows, catalogue and flags give the same boards.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { join } from "node:path";
import { random } from "../../src/game/rules.ts";
import { hashId } from "../../src/game/levels/generate.ts";
import { pick } from "../../src/game/levels/pick.ts";
import { dealBoard, flaggedOn, readBoards, root, specOf, tallyText, usable, writeBoards } from "./lib.mts";
import { DISTINCT } from "./campaign-plan.mts";

const FILE = join(root, "src/content/levels/experiments.json");
const CAMPAIGN = join(root, "src/content/levels/campaign.json");

const shapes = (spec) => Object.entries(spec).flatMap(([shape, n]) => Array(n).fill(shape));

/**
 * One row a board, as a campaign plan row (campaign-plan.mts has the columns),
 * plus `name` (the dev menu's label) and `apart` (take no picture that is on
 * campaign boards 1-DISTINCT, so the creator does not meet it twice).
 */
export const EXPERIMENTS = [
  // x01 (lead, 2026-10-25): only long pictures, tall 1x2 and wide 2x1 mixed, on the early campaign's
  // 4x4 board, relaxed with a safe start. All-domino boards are easy at any count (a trial: chain 2,
  // careless win 100% from 9 to 12 pictures), so it holds the most: 12, 8 waiting.
  // PROVISIONAL until Art's long pictures land: the library has 6 tall and 5 wide from 8 families, most
  // of them busy, so for now 10 (5 + 5) with two look-alike pairs, not kept apart, any busy and no
  // variety; then: name without "stand-in", count 12, alike [], must 6 + 6, apart: true, vary: true,
  // busyMost: 1, and --remake x01.
  { id: "x01", name: "Long pictures only (stand-in pictures)", role: "experiment", board: [4, 4], count: 10, alike: [2, 2], sizes: [2], cards: [20, 20], must: shapes({ "1x2": 5, "2x1": 5 }), peek: 2, chain: [1, 3], careless: [0.9, 1], apart: false },
];

const has = (f) => process.argv.includes(f);
const at = process.argv.indexOf("--remake");
const remake = new Set(at > 0 ? process.argv[at + 1].split(",") : []);
const old = has("--fresh") ? [] : readBoards(FILE);
const onCampaign = new Set(readBoards(CAMPAIGN).slice(0, DISTINCT).flatMap((l) => l.pictures.map((p) => p.id)));

const levels = EXPERIMENTS.map((row, i) => {
  const kept = old.find((l) => l.id === row.id);
  const bad = kept ? flaggedOn(kept.pictures) : [];
  if (kept && !bad.length && !remake.has(row.id)) return kept;
  if (bad.length) console.log(`${row.id}: uses flagged ${bad.join(", ")}; re-dealing it`);
  const pool = row.apart ? usable.filter((p) => !onCampaign.has(p.id)) : usable;
  // calm first, then fewest boards it is on in the campaign
  const cost = new Map(pool.map((p) => [p.id, (p.busy ?? 0) * 2 + (onCampaign.has(p.id) ? 1 : 0)]));
  for (let attempt = 0; attempt < 12; attempt++) {
    const pictures = pick(pool, specOf(row), cost, new Set(), random((hashId(row.id) + attempt * 104729) >>> 0));
    if (!pictures) throw new Error(`${row.id}: no pictures fit its row (${pool.filter((p) => row.sizes.includes(p.cols * p.rows)).length} of its sizes${row.apart ? " not on campaign boards 1-" + DISTINCT : ""}); the library needs more`);
    const { board, tally } = dealBoard(row, pictures, { id: row.id, cols: row.board[0], rows: row.board[1], tries: 3000, safeFirstMove: true });
    if (board) return { ...board, name: row.name };
    for (const p of pictures) cost.set(p.id, cost.get(p.id) + 2);
    console.log(`${row.id}: pictures set ${attempt} found no deal (${tallyText(tally)})`);
  }
  throw new Error(`${row.id}: no deal meets its row; loosen it`);
});
// keep the phrase "creator's dev menu only" in the note: tools/no-dev-menu.mjs fails a release build that holds it (UI, 068d37d)
writeBoards(FILE, "experiment boards, for the creator's dev menu only (practice; never in a release build, not paid by the win checker); made by tools/levels/make-experiments.mts, checked by tools/levels/check.mts", levels);
console.log(`wrote ${FILE} (${levels.length} boards)`);
