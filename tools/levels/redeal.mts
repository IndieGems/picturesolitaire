// Re-deals every shipped board that uses a picture the creator flagged "don't
// use" (src/content/picture-flags.json), in the campaign, the challenge route
// and the daily pool, and keeps every other board byte-identical; then
// re-proves every board. One command:
//   node tools/levels/redeal.mts
// Each maker keeps the boards it has and re-deals only the flagged ones, in the
// same place in its plan with as few pictures changed as can be (lib.mts,
// route and swapSets). Then commit the level files and ask Server to rebuild
// the win checker (functions/checker), which holds a copy of every board.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { root } from "./lib.mts";

// --repair-only: flagged boards only, never a plan row not made yet
for (const [maker, ...args] of [["make-campaign.mts", "--repair-only"], ["make-challenge.mts", "--repair-only"], ["make-daily.mts"], ["check.mts"]]) {
  console.log(`\n== ${maker}`);
  execFileSync(process.execPath, [join(root, "tools/levels", maker), ...args], { stdio: "inherit" });
}
