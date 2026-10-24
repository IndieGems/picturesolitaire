// Builds the relaxed campaign from its plan (tools/levels/campaign-plan.mts):
// keeps every board already in campaign.json, re-deals any that uses a flagged
// picture, and for each plan row past the end picks the pictures (evenly
// across the campaign), generates a deal that meets every axis, proves it
// (lib.mts, route), and writes
//   src/content/levels/campaign.json   the boards, each with its winning line
//   docs/levels.md                     the table of axes, for the reader
// Run: node tools/levels/make-campaign.mts [--fresh] [--repair-only] [--out FILE]
//   --fresh        remake every board from the plan, ignoring the file (a
//                  board a player has won keeps its id and pays no more)
//   --repair-only  re-deal flagged boards only; add no plan rows (redeal.mts)
//   --redeal 1,2,3 re-deal these boards afresh from the plan; keep every other
//                  board (and add no plan rows)
//   --out FILE     write the boards there instead, and no docs (for trials)
//   PICKS_ONLY=1   pick the pictures and report their spacing; no deals
// Pictures follow the plan's shape ramp and SPACING (campaign-plan.mts).
// Deterministic: the same file, plan, catalogue and flags give the same campaign. Then
// node tools/levels/check.mts re-proves what was written.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { catalogue, famName, flags, lookalikes, readBoards, root, route, spacingOf, usable, writeBoards } from "./lib.mts";
import { BOARD, PLAN, PLAN_TAG, SPACING } from "./campaign-plan.mts";

const t0 = performance.now();

const has = (f) => process.argv.includes(f);
const outAt = process.argv.indexOf("--out");
const FILE = join(root, "src/content/levels/campaign.json");
const OUT = outAt > 0 ? process.argv[outAt + 1] : FILE;
const old = has("--fresh") ? [] : readBoards(FILE);
const shipped = readBoards(FILE);
const fileTag = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")).plan : undefined;
const redealAt = process.argv.indexOf("--redeal");
const redeal = new Set(redealAt > 0 ? process.argv[redealAt + 1].split(",").map((n) => Number(n) - 1) : []);
const adding = PLAN.length > old.length && !has("--repair-only") && !redeal.size;
if (adding && old.length && fileTag !== PLAN_TAG) {
  console.error(`campaign.json was made from another plan (${fileTag ?? "before plans were named"}), not ${PLAN_TAG}: remake it with --fresh, or re-deal flagged boards only with --repair-only`);
  process.exit(1);
}
// a repaired file keeps its plan's name (none, for one from before names)
const tag = adding || !old.length ? PLAN_TAG : fileTag;
const made = route(PLAN, old, {
  spacing: SPACING,
  repairOnly: has("--repair-only") || redeal.size > 0,
  redeal,
  seedOf: (i) => 0xc0ffee + i * 7919,
  optsOf: (i) => ({
    id: `c${String(i + 1).padStart(2, "0")}`,
    cols: PLAN[i].board?.[0] ?? BOARD.cols,
    rows: PLAN[i].board?.[1] ?? BOARD.rows,
    reseedOf: (i, attempt) => 0xbadcafe + i * 7919 + attempt * 104729,
    // the relaxed campaign's rule: a safe start (AGENTS.md)
    safeFirstMove: true,
  }),
});
if (made.picks) {
  const sp = spacingOf(made.picks, SPACING);
  const sizes = made.picks.map((set) => set.map((q) => q.cols * q.rows).join(""));
  console.log(`picks only: ${made.picks.length} boards; a picture comes back after ${sp.shortest} boards at the soonest (median ${sp.median}); ${sp.short} of ${sp.gaps} returns are sooner than ${SPACING}`);
  console.log(sizes.map((z, i) => `${i + 1}:${z}`).join(" "));
  process.exit(0);
}
const levels = made;
// the first board hosts the guided start (UI's onboarding plays its line)
if (shipped[0] && JSON.stringify(levels[0]) !== JSON.stringify(shipped[0])) console.warn("!! c01 changed: tell UI to re-check the guided start's steps");
const sp = spacingOf(levels.map((l) => l.pictures), SPACING);
console.log(`spacing: a picture comes back after ${sp.shortest} boards at the soonest (median ${sp.median}); ${sp.short} of ${sp.gaps} returns are sooner than ${SPACING}`);
writeBoards(OUT, "relaxed campaign; made by tools/levels/make-campaign.mts, checked by tools/levels/check.mts", levels, tag ? { plan: tag } : {});

if (OUT !== FILE) process.exit(0);
// ---------------------------------------------------------------- docs/levels.md
const counts = usable.map((p) => levels.filter((l) => l.pictures.some((q) => q.id === p.id)).length);
const rows = levels.map((l, i) => {
  const a = l.axes;
  return `| ${i + 1} | ${a.role} | ${l.pictures.length} | ${lookalikes(l)} | ${a.sizes.join(" ")} | ${a.shapes.join(" ")} | ${l.cols}x${l.rows} | ${a.cards} (${a.waiting}) | ${a.peek} | ${a.chain} | ${Math.round(a.careless * 100)}% | ${a.traps} | ${a.lineMoves} |`;
});
const md = `# The relaxed campaign

What each of the ${levels.length} boards asks of the player, axis by axis. Made by
\`node tools/levels/make-campaign.mts\` from the plan in
\`tools/levels/campaign-plan.mts\`; every board's winning line is re-proved by
\`node tools/levels/check.mts\`. Do not edit this table by hand: change the plan
and run the maker. The challenge route is in [challenge.md](challenge.md), the
daily puzzle in [daily.md](daily.md).

- **Lookalikes**: pictures from the same family (they share colours and subjects).
- **Cards per picture**: the pieces each picture is cut into.
- **Cards (waiting)**: all the board's cards; in brackets, those still in the stacks when it opens (a 4x5 board holds 20, a 4x6 board 24).
- **Shown**: upcoming cards each stack shows.
- **Chain**: the longest run of clears that depend on one another that no winning line avoids (1: every picture can be finished from the opening deal).
- **Careless win**: the chance a player who never plans ahead still wins (always finishing whatever picture is ready, wherever).
- **Traps**: steps of the winning line where another choice would make the board unwinnable.
- **Line**: moves in the stored winning line (no undo, hint or shuffle).

| # | role | pictures | lookalikes | cards per picture | shapes | board | cards (waiting) | shown | chain | careless win | traps | line |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}

Every picture's appearances across the ${levels.length} boards: ${Math.min(...counts)} to ${Math.max(...counts)} (mean ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}). A picture comes back ${sp.shortest} boards later at the soonest (median ${sp.median}; the aim is ${SPACING} or more, and ${sp.short} of ${sp.gaps} returns are sooner).

| picture | boards |
|---|---|
${catalogue.map((p) => `| ${p.id} (${p.cols}x${p.rows}, ${famName(p.family)})${flags.has(p.id) ? " FLAGGED: don't use" : ""} | ${levels.map((l, i) => (l.pictures.some((q) => q.id === p.id) ? i + 1 : null)).filter(Boolean).join(", ")} |`).join("\n")}
`;
writeFileSync(join(root, "docs/levels.md"), md);
console.log(`wrote src/content/levels/campaign.json (${levels.length} boards) and docs/levels.md in ${((performance.now() - t0) / 1000).toFixed(1)} s; picture uses ${Math.min(...counts)}..${Math.max(...counts)}`);
