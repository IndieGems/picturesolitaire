// THE BUILD'S CHECK that the win checker knows every board this build ships.
// Run by `npm run build`; exit code 1 stops the build.
//
// The win checker (functions/checker, the game's serverless function) has the
// level files compiled into it. A game build whose boards it does not know gets
// "retry" for every win on them, and pays nothing, until someone uploads a new
// checker. So: functions/checker/data/levels-stamp.json records the level data
// the uploaded checker was built with (tools/server/upload.mts writes it, after
// asking the uploaded function itself), and this check compares it with
// src/content/levels as it is now. No network: it reads the committed stamp.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { levelsHash, root } from "./levels-hash.mts";

const STAMP = join(root, "functions/checker/data/levels-stamp.json");
const now = levelsHash();
const stamp = existsSync(STAMP) ? JSON.parse(readFileSync(STAMP, "utf8")) : null;

if (stamp?.levels === now) {
  console.log(`levels-check: the win checker on ${stamp.channel} (function ${stamp.function}) knows these boards (${now})`);
} else {
  console.error(
    [
      "",
      "levels-check: STOP. The level files (src/content/levels) changed since the win checker was last uploaded.",
      `  boards in this build: ${now}; boards the uploaded checker knows: ${stamp?.levels ?? "none recorded"}${stamp ? ` (function ${stamp.function} on ${stamp.channel})` : ""}.`,
      "  Wins on the changed boards would pay nothing until the checker is updated. To update it (needs Rust; the server member's job):",
      "    node tools/server/build.mts              # archive the boards, prove the rules agree, build the function",
      "    node tools/server/upload.mts <version>   # upload it to dev, confirm it, write the stamp",
      "    commit functions/checker/data/ (the archive and the stamp)",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
