// Builds the relaxed campaign from its plan (tools/levels/campaign-plan.mts):
// picks each board's pictures (evenly across the campaign), generates a deal
// that meets every axis, proves it, and writes
//   src/content/levels/campaign.json   the boards, each with its winning line
//   docs/levels.md                     the table of axes, for the reader
// Run: node tools/levels/make-campaign.mts
// Deterministic: the same plan and catalogue give the same campaign. Then
// node tools/levels/check.mts re-proves what was written.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { balance, catalogue, famName, lookalikes, makeBoard, pickAll, root, usesOf, writeBoards } from "./lib.mts";
import { BOARD, PLAN } from "./campaign-plan.mts";

const t0 = performance.now();

// 1. each board's pictures, least-used first; 2. evened out
const chosen = balance(PLAN, pickAll(PLAN, (i) => 0xc0ffee + i * 7919));

// 3. a deal for each board that meets its targets, proved
const uses = usesOf(chosen);
const levels = PLAN.map((row, i) =>
  makeBoard(PLAN, i, chosen, uses, {
    id: `c${String(i + 1).padStart(2, "0")}`,
    ...BOARD,
    reseedOf: (i, attempt) => 0xbadcafe + i * 7919 + attempt * 104729,
  }),
);
writeBoards(join(root, "src/content/levels/campaign.json"), "relaxed campaign; made by tools/levels/make-campaign.mts, checked by tools/levels/check.mts", levels);

// ---------------------------------------------------------------- docs/levels.md
const counts = catalogue.map((p) => levels.filter((l) => l.pictures.some((q) => q.id === p.id)).length);
const rows = levels.map((l, i) => {
  const a = l.axes;
  return `| ${i + 1} | ${a.role} | ${l.pictures.length} | ${lookalikes(l)} | ${a.sizes.join(" ")} | ${a.shapes.join(" ")} | ${l.cols}x${l.rows} | ${a.cards} (${a.waiting}) | ${a.peek} | ${a.chain} | ${Math.round(a.careless * 100)}% | ${a.traps} | ${a.lineMoves} |`;
});
const md = `# The relaxed campaign

What each of the 30 boards asks of the player, axis by axis. Made by
\`node tools/levels/make-campaign.mts\` from the plan in
\`tools/levels/campaign-plan.mts\`; every board's winning line is re-proved by
\`node tools/levels/check.mts\`. Do not edit this table by hand: change the plan
and run the maker. The challenge route is in [challenge.md](challenge.md), the
daily puzzle in [daily.md](daily.md).

- **Lookalikes**: pictures from the same family (they share colours and subjects).
- **Cards per picture**: the pieces each picture is cut into.
- **Cards (waiting)**: all the board's cards; in brackets, those still in the stacks when it opens (the board holds 20).
- **Shown**: upcoming cards each stack shows.
- **Chain**: the longest run of clears that depend on one another that no winning line avoids (1: every picture can be finished from the opening deal).
- **Careless win**: the chance a player who never plans ahead still wins (always finishing whatever picture is ready, wherever).
- **Traps**: steps of the winning line where another choice would make the board unwinnable.
- **Line**: moves in the stored winning line (no undo, hint or shuffle).

| # | role | pictures | lookalikes | cards per picture | shapes | board | cards (waiting) | shown | chain | careless win | traps | line |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}

Every picture's appearances across the 30 boards: ${Math.min(...counts)} to ${Math.max(...counts)} (mean ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}).

| picture | boards |
|---|---|
${catalogue.map((p) => `| ${p.id} (${p.cols}x${p.rows}, ${famName(p.family)}) | ${levels.map((l, i) => (l.pictures.some((q) => q.id === p.id) ? i + 1 : null)).filter(Boolean).join(", ")} |`).join("\n")}
`;
writeFileSync(join(root, "docs/levels.md"), md);
console.log(`wrote src/content/levels/campaign.json (${levels.length} boards) and docs/levels.md in ${((performance.now() - t0) / 1000).toFixed(1)} s; picture uses ${Math.min(...counts)}..${Math.max(...counts)}`);
