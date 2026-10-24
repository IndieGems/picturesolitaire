// Builds the challenge route from its plan (tools/levels/challenge-plan.mts):
// picks each board's pictures (evenly across the route), generates a deal
// that meets every axis, proves it, finds its par line, and writes
//   src/content/levels/challenge.json   the boards, each with its par line and "par"
//   docs/challenge.md                   the table of axes, for the reader
// Run: node tools/levels/make-challenge.mts
// Deterministic: the same plan and catalogue give the same route. Then
// node tools/levels/check.mts re-proves what was written.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { balance, catalogue, famName, lookalikes, makeBoard, pickAll, root, usesOf, writeBoards } from "./lib.mts";
import { PLAN } from "./challenge-plan.mts";

const t0 = performance.now();
/** A wide par search: the route is made once, offline (about 1-40 s a board). */
const PAR = { width: 600, perKey: 24, ways: 80 };

const chosen = balance(PLAN, pickAll(PLAN, (i) => 0x5eed00 + i * 7919));
const uses = usesOf(chosen);
const levels = PLAN.map((row, i) =>
  makeBoard(PLAN, i, chosen, uses, {
    id: `ch${String(i + 1).padStart(2, "0")}`,
    cols: row.board[0],
    rows: row.board[1],
    reseedOf: (i, attempt) => 0xc4a11e + i * 7919 + attempt * 104729,
    par: PAR,
    tries: 4000,
    extra: true,
    vary: true,
  }),
);
writeBoards(join(root, "src/content/levels/challenge.json"), "challenge route; made by tools/levels/make-challenge.mts, checked by tools/levels/check.mts; par = moves in the stored line", levels);

// ---------------------------------------------------------------- docs/challenge.md
const counts = catalogue.map((p) => levels.filter((l) => l.pictures.some((q) => q.id === p.id)).length);
const rows = levels.map((l, i) => {
  const a = l.axes;
  return `| ${i + 1} | ${a.role} | ${l.cols}x${l.rows} | ${l.pictures.length} | ${lookalikes(l)} | ${a.sizes.join(" ")} | ${a.shapes.join(" ")} | ${a.cards} (${a.waiting}) | ${a.peek} | ${a.chain} | ${a.bigWait} | ${a.orderTraps} | ${Math.round(a.careless * 100)}% | ${l.par} |`;
});
const md = `# The challenge route

What each of the ${levels.length} challenge boards asks of the player, axis by
axis. Made by \`node tools/levels/make-challenge.mts\` from the plan in
\`tools/levels/challenge-plan.mts\`; every board's line is re-proved by
\`node tools/levels/check.mts\`. Do not edit this table by hand: change the plan
and run the maker. The relaxed campaign is in [levels.md](levels.md).

The route uses the deeper rules on purpose: big pictures that have to wait
while small ones are cleared to make room for them, and clear order that
matters. Each board's par is the fewest moves the solver found (its stored
line); a sharp player may beat it.

- **Board**: columns x rows.
- **Lookalikes, cards per picture, shapes, cards (waiting), shown, chain, careless win**: as in [levels.md](levels.md).
- **Big waits**: how many pictures must be cleared before the longest-waiting big picture (6 or 9 cards) can be finished, on the best line there is.
- **Order traps**: how many times every winning line meets a finished-able picture that must not be finished yet, or not in that place.
- **Par**: moves in the stored line (no undo, hint or shuffle).

| # | role | board | pictures | lookalikes | cards per picture | shapes | cards (waiting) | shown | chain | big waits | order traps | careless win | par |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}

Every picture's appearances across the route: ${Math.min(...counts)} to ${Math.max(...counts)} (mean ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}).

| picture | boards |
|---|---|
${catalogue.map((p) => `| ${p.id} (${p.cols}x${p.rows}, ${famName(p.family)}) | ${levels.map((l, i) => (l.pictures.some((q) => q.id === p.id) ? i + 1 : null)).filter(Boolean).join(", ")} |`).join("\n")}
`;
writeFileSync(join(root, "docs/challenge.md"), md);
console.log(`wrote src/content/levels/challenge.json (${levels.length} boards) and docs/challenge.md in ${((performance.now() - t0) / 1000).toFixed(1)} s; picture uses ${Math.min(...counts)}..${Math.max(...counts)}`);
