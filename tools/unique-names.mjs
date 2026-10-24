// Fails the build when two files in the output share a file name, in any folders.
// The Gem platform rejects a build bundle with duplicate file names, folders
// included (pictures/thumbs/x.webp beside pictures/food/x.webp is a clash), so the
// art names every file uniquely (x-thumb.webp, autumn-study-table.webp ...).
//
//   node tools/unique-names.mjs [dir]      (default: dist)
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.argv[2] ?? "dist";
const seen = new Map(); // lower-cased name -> paths

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else {
      const key = e.name.toLowerCase();
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(relative(root, p).replaceAll("\\", "/"));
    }
  }
}

walk(root);
const clashes = [...seen.values()].filter((paths) => paths.length > 1);
if (clashes.length) {
  console.error(`unique-names: ${clashes.length} file name(s) used more than once in ${root}/ (the platform refuses the build):`);
  for (const paths of clashes) console.error("  " + paths.join("  vs  "));
  process.exit(1);
}
console.log(`unique-names: ${seen.size} files in ${root}/, every name unique`);
