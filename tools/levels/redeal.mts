// Re-deals every shipped board that uses a picture the creator flagged "don't
// use" (src/content/picture-flags.json), in the campaign, the challenge route,
// the daily pool, the dev menu's experiment boards and the VIP events' levels, and keeps every other
// board byte-identical; then
// re-proves every board. One command:
//   node tools/levels/redeal.mts
// Each maker keeps the boards it has and mends only the flagged ones: first IN
// PLACE, the deal, line and par unchanged (Art's remake, lib.mts REMAKES, else a
// clear picture of the same shape the level's rules allow: lib.mts
// swappedInPlace, make-daily.mts on a board of squares), and only where none
// fits re-dealt, in the same place in its plan with as few pictures changed as
// can be (lib.mts, route and swapSets). Then commit the level files and ask Server to rebuild
// the win checker (functions/checker), which holds a copy of every board.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { root } from "./lib.mts";

// --repair-only: flagged boards only, never a plan row not made yet
for (const [maker, ...args] of [["make-campaign.mts", "--repair-only"], ["make-challenge.mts", "--repair-only"], ["make-daily.mts"], ["make-experiments.mts"], ["make-events.mts"], ["check.mts"]]) {
  console.log(`\n== ${maker}`);
  execFileSync(process.execPath, [join(root, "tools/levels", maker), ...args], { stdio: "inherit" });
}
