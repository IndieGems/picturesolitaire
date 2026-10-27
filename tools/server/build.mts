// Builds the win checker (functions/checker) for the platform:
//   1. archives every board version in src/content/levels into
//      functions/checker/data/archive.json (never removes one), so a player on
//      an older build, whose board was dealt differently since, still verifies;
//   2. proves the Rust rules agree with rules.ts (tools/server/check.mts);
//   3. cargo build for wasm32-unknown-unknown, then gemctl function package.
//
//   node tools/server/build.mts [--skip-check]
//
// Then upload it (dev only from here; test and release are a person's call):
//   gemctl function upload --file functions/checker/target/wasm32-unknown-unknown/release/checker.component.wasm \
//     --version <v> --channel dev --description "commit <sha>"
// Rebuild and upload whenever the level files change, BEFORE the game build that
// carries them: a board the function does not know answers "retry".
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dealHash } from "../../src/net/deal-hash.ts";
import { levelsDirty } from "./levels-hash.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const crate = join(root, "functions/checker");
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
};

// 0. only committed level files: the levels member may be mid-edit, and a deal
//    that never ships should not be built into the checker
const dirty = levelsDirty();
if (dirty && !process.argv.includes("--allow-dirty")) {
  console.error(`build: the level files have uncommitted changes:\n${dirty}\nBuild from what the levels member committed (ask them), or pass --allow-dirty to build these anyway.`);
  process.exit(1);
}

// 1. the archive
const file = join(crate, "data/archive.json");
const archive = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { deals: [] };
// each version keeps its own winning line, so the agreement check can prove an
// older version still verifies (tools/server/vectors.mts); the function ignores it
const byKey = new Map(archive.deals.map((d) => [`${d.lane}/${d.id}/${dealHash(d)}`, d]));
let added = 0;
for (const lane of ["campaign", "challenge", "daily"]) {
  const f = join(root, "src/content/levels", `${lane}.json`);
  if (!existsSync(f)) continue;
  for (const l of JSON.parse(readFileSync(f, "utf8")).levels) {
    const d = { lane, id: l.id, cols: l.cols, rows: l.rows, seed: l.seed, pictures: l.pictures.map(({ id, cols, rows }) => ({ id, cols, rows })), stacks: l.stacks, ...(l.board ? { board: l.board } : {}) };
    const key = `${lane}/${l.id}/${dealHash(d)}`;
    const old = byKey.get(key);
    if (old) {
      old.line ??= l.line;
      continue;
    }
    archive.deals.push({ ...d, line: l.line });
    byKey.set(key, d);
    added++;
  }
}
writeFileSync(file, JSON.stringify(archive, null, 0).replace(/\},\{"lane"/g, '},\n{"lane"') + "\n");
console.log(`archive: ${archive.deals.length} board versions (${added} new)`);

// 2. the agreement check
run(process.execPath, [join(root, "tools/server/helpers-check.mts")]);
if (!process.argv.includes("--skip-check")) run(process.execPath, [join(root, "tools/server/check.mts")]);

// 3. build and package
run("cargo", ["build", "--release", "--target", "wasm32-unknown-unknown", "--manifest-path", join(crate, "Cargo.toml")]);
run("gemctl", ["function", "package", join(crate, "target/wasm32-unknown-unknown/release/checker.wasm")]);
