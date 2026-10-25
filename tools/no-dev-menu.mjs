// Fails a release build that still carries any of the creator's dev menu.
//
//   node tools/no-dev-menu.mjs dist        (the last step of `npm run build:release`)
//
// The dev menu (src/ui/dev-menu.ts and .css) and the board's dev controls
// (src/board/dev.ts) sit behind `import.meta.env.MODE !== "release"`, so
// `vite build --mode release` leaves them out (the game standard: "Debug code is
// removed at build time, not hidden at run time"). This looks through every
// built file, names and contents, for what they would leave behind: the menu's
// name, the board's dev calls (Gameplay keeps the names winNow and
// setEndless for this), and the experiment boards, which only the menu loads
// (the note at the top of src/content/levels/experiments.json). `npm run build` keeps the menu on purpose (the Editor's
// Play and the Pit): never run this on it.

import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const dir = process.argv[2] ?? "dist";
const MARKS = ["dev-menu", "winNow", "setEndless", "__BUILD_INFO__", "creator's dev menu only"];
const TEXT = new Set([".js", ".mjs", ".css", ".html", ".json", ".map", ".txt", ".svg"]);

const found = [];
let files = 0;
function walk(d) {
  for (const entry of readdirSync(d, { withFileTypes: true })) {
    const path = join(d, entry.name);
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    files++;
    const name = relative(dir, path).replaceAll("\\", "/");
    for (const m of MARKS) if (name.includes(m)) found.push(`${name}: its name has "${m}"`);
    if (!TEXT.has(extname(entry.name).toLowerCase())) continue;
    const text = readFileSync(path, "utf8");
    for (const m of MARKS) if (text.includes(m)) found.push(`${name}: has "${m}"`);
  }
}

try {
  walk(dir);
} catch (err) {
  console.error(`no-dev-menu: cannot read ${dir}: ${err.message}`);
  process.exit(2);
}
if (found.length) {
  console.error(`no-dev-menu: this release build still carries dev menu code:\n  ${found.join("\n  ")}`);
  console.error("Gate it behind import.meta.env.MODE !== \"release\" (inline, not an imported constant).");
  process.exit(1);
}
console.log(`no-dev-menu: no dev menu in ${dir} (${files} files checked)`);
