// THE SERVER CHECK: proves the win checker (functions/checker, a Rust
// serverless function) plays by exactly the rules the game plays by.
//
//   node tools/server/check.mts [--games N] [--seed S]     exit code 0 = they agree
//
// 1. tools/server/vectors.mts plays every shipped board's line and N random
//    games on src/game/rules.ts, and writes every state and some claims;
// 2. the Rust port replays them (functions/checker/tests/vectors.rs) and must
//    reach every state, and give every claim the expected verdict;
// 3. the progress record's rules (functions/checker/tests/progress.rs);
// 4. what a win pays (tests/pay.rs), the achievements' counters (tests/count.rs), and the Daily Suitcase (tests/suitcase.rs): on hold, so a
//    daily win grants none of its items, a swap and a prize are shut, and the switch is off.
// Run it after any change to src/game/rules.ts, the Shuffle helper, the level
// files, or functions/checker/src. Needs Rust (cargo) for this machine.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import "./gentle.mts";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const scratch = mkdtempSync(join(tmpdir(), "picture-mend-vectors-"));
const vectors = join(scratch, "vectors.json");
let code = 1;
try {
  const ts = spawnSync(process.execPath, [join(root, "tools/server/vectors.mts"), vectors, ...process.argv.slice(2)], { stdio: "inherit" });
  if (ts.status !== 0) throw new Error("the TypeScript side could not write the vectors");
  const rust = spawnSync(
    "cargo",
    ["test", "--release", "--quiet", "--manifest-path", join(root, "functions/checker/Cargo.toml"), "--test", "vectors", "--test", "progress", "--test", "pay", "--test", "suitcase", "--test", "count", "--test", "vip", "--", "--nocapture"],
    { stdio: "inherit", env: { ...process.env, VECTORS: vectors } },
  );
  if (rust.error) throw rust.error;
  code = rust.status ?? 1;
  console.log(code === 0 ? "server check: the Rust rules agree with rules.ts on every vector" : "server check: FAILED");
} catch (err) {
  console.error(`server check: ${err.message}`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
process.exit(code);
