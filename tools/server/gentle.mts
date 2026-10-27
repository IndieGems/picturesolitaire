// The machine is shared by every project's task force (AGENTS.md, creator 2026-10-27):
// a CPU-heavy run goes at below-normal priority and at most two processes. Imported
// FIRST by tools/server/build.mts and check.mts: this process drops to below normal,
// which every process it starts inherits (cargo, rustc, the vector generator), and
// cargo builds with 2 jobs and runs tests on 2 threads unless told otherwise.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { constants, setPriority } from "node:os";

try {
  setPriority(constants.priority.PRIORITY_BELOW_NORMAL);
} catch {
  // not allowed here: run at the priority we were given
}
process.env.CARGO_BUILD_JOBS ??= "2";
process.env.RUST_TEST_THREADS ??= "2";
