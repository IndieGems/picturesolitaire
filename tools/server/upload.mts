// Uploads the built win checker to the DEV channel, asks the uploaded function
// which level data it carries, and records that in
// functions/checker/data/levels-stamp.json, which `npm run build` checks
// (tools/server/levels-check.mts). Build it first: node tools/server/build.mts.
//
//   node tools/server/upload.mts <version>      e.g. 0.1.3 (a version is used once per game)
//
// Dev only. Test and release are promoted by hand, on a person's word:
//   gemctl function promote <version> --channel test
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { levelsHash, root } from "./levels-hash.mts";

const version = process.argv[2];
if (!version || !/^[A-Za-z0-9._-]{1,64}$/.test(version)) {
  console.error("usage: node tools/server/upload.mts <version>");
  process.exit(2);
}
const component = join(root, "functions/checker/target/wasm32-unknown-unknown/release/checker.component.wasm");
const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8" });
  if (r.error) throw r.error;
  return r;
};
const commit = sh("git", ["rev-parse", "--short", "HEAD"]).stdout.trim();
const dirty = sh("git", ["status", "--porcelain", "--", "functions/checker", "src/content/levels"]).stdout.trim() ? "+changes" : "";

const up = sh("gemctl", ["function", "upload", "--file", component, "--version", version, "--channel", "dev", "--description", `commit ${commit}${dirty}: win checker`]);
process.stdout.write(up.stdout);
if (up.status !== 0) {
  process.stderr.write(up.stderr);
  process.exit(up.status ?? 1);
}

// ask the uploaded function what it was built with
const asked = sh("gemctl", ["function", "invoke", "--channel", "dev", "--data", '{"v":1,"what":"levels"}']);
const line = asked.stdout.split("\n").find((l) => l.startsWith("output:"));
let levels = null;
try {
  levels = JSON.parse(JSON.parse(line.slice("output:".length).trim())).levels;
} catch {
  console.error(`upload: the uploaded function did not say which boards it knows:\n${asked.stdout}${asked.stderr}`);
  process.exit(1);
}
const now = levelsHash();
if (levels !== now) {
  console.error(`upload: the uploaded function knows boards ${levels}, but src/content/levels is ${now}: rebuild (node tools/server/build.mts) and upload again`);
  process.exit(1);
}
writeFileSync(join(root, "functions/checker/data/levels-stamp.json"), JSON.stringify({ levels, function: version, channel: "dev", commit: commit + dirty }, null, 2) + "\n");
console.log(`upload: function ${version} on dev knows these boards (${levels}); stamp written. Commit functions/checker/data.`);
