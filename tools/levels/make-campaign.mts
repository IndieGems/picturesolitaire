// Builds the relaxed campaign from its plan (tools/levels/campaign-plan.mts):
// picks each board's pictures (evenly across the campaign), generates a deal
// that meets every axis, proves it, and writes
//   src/content/levels/campaign.json   the boards, each with its winning line
//   docs/levels.md                     the table of axes, for the reader
// Run: node tools/levels/make-campaign.mts
// Deterministic: the same plan and catalogue give the same campaign. Then
// node tools/levels/check.mts re-proves what was written.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { random } from "../../src/game/rules.ts";
import { generate } from "../../src/game/levels/generate.ts";
import { alikeOf, fits, pick, shapeOf } from "../../src/game/levels/pick.ts";
import { BOARD, PLAN } from "./campaign-plan.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogue = JSON.parse(readFileSync(join(root, "src/content/pictures.json"), "utf8")).pictures;
const byId = new Map(catalogue.map((p) => [p.id, p]));

const t0 = performance.now();
const specOf = (row) => ({ count: row.count, alike: row.alike, cards: row.cards, sizes: row.sizes, must: row.must, most: row.most });

// 1. each board's pictures, least-used first, board by board
const chosen = [];
{
  const uses = new Map<string, number>();
  let recent = new Set<string>();
  PLAN.forEach((row, i) => {
    const pictures = pick(catalogue, specOf(row), uses, recent, random(0xc0ffee + i * 7919));
    if (!pictures) throw new Error(`board ${i + 1}: no pictures fit the plan`);
    for (const q of pictures) uses.set(q.id, (uses.get(q.id) ?? 0) + 1);
    recent = new Set(pictures.map((q) => q.id));
    chosen.push(pictures);
  });
}

// 2. even them out: swap a picture of a board for another that still fits the
// board's plan, while that brings the picture counts closer together and keeps
// the same picture off boards next to each other
const usesOf = () => {
  const u = new Map(catalogue.map((q) => [q.id, 0]));
  for (const set of chosen) for (const q of set) u.set(q.id, u.get(q.id) + 1);
  return u;
};
const near = (i, id) => [i - 1, i + 1].filter((k) => chosen[k]?.some((q) => q.id === id)).length * 3 + [i - 2, i + 2].filter((k) => chosen[k]?.some((q) => q.id === id)).length;
for (let sweep = 0; sweep < 60; sweep++) {
  let better = false;
  for (let i = 0; i < chosen.length; i++) {
    for (let j = 0; j < chosen[i].length; j++) {
      const u = usesOf();
      const out = chosen[i][j];
      for (const cand of catalogue) {
        if (chosen[i].some((q) => q.id === cand.id)) continue;
        const set = chosen[i].map((q, k) => (k === j ? { id: cand.id, cols: cand.cols, rows: cand.rows } : q));
        if (!fits(catalogue, specOf(PLAN[i]), set)) continue;
        // change in the spread of counts, and in neighbours sharing a picture
        const a = u.get(out.id), b = u.get(cand.id);
        const spread = ((a - 1) ** 2 + (b + 1) ** 2) - (a ** 2 + b ** 2);
        const delta = spread + near(i, cand.id) - near(i, out.id);
        if (delta < 0) {
          chosen[i] = set;
          better = true;
          break;
        }
      }
    }
  }
  if (!better) break;
}

// 3. a deal for each board that meets its targets, proved
const levels = [];
const uses = usesOf();
PLAN.forEach((row, i) => {
  const id = `c${String(i + 1).padStart(2, "0")}`;
  let pictures = chosen[i];
  for (let attempt = 0; attempt < 12; attempt++) {
    if (attempt > 0) {
      // this set of pictures yields no deal on target: pick another set for the board
      for (const q of chosen[i]) uses.set(q.id, uses.get(q.id) - 1);
      pictures = pick(catalogue, specOf(row), uses, new Set([...(chosen[i - 1] ?? []), ...(chosen[i + 1] ?? [])].map((q) => q.id)), random(0xbadcafe + i * 7919 + attempt * 104729));
      if (!pictures) throw new Error(`${id}: no pictures fit the plan`);
      chosen[i] = pictures;
      for (const q of pictures) uses.set(q.id, uses.get(q.id) + 1);
    }
    // the deal is shuffled from the pictures in a fixed order, so it does not hang on how they were picked
    pictures = [...pictures].sort((a, b) => (a.id < b.id ? -1 : 1));
    const spec = { id, ...BOARD, pictures, targets: { chain: row.chain, careless: row.careless } };
    const tally = new Map();
    const made = generate(spec, 1, 3000, tally);
    if (!made) {
      console.log(`${id}: pictures set ${attempt} found no deal (${[...tally].map(([k, v]) => `${k} ${v}`).join(", ")})`);
      continue;
    }
    const m = made.measures;
    const axes = {
      role: row.role,
      alike: alikeOf(catalogue, pictures),
      families: pictures.map((p) => byId.get(p.id).family),
      sizes: pictures.map((p) => p.cols * p.rows),
      shapes: [...new Set(pictures.map(shapeOf))].sort(),
      cards: pictures.reduce((n, p) => n + p.cols * p.rows, 0),
      waiting: m.waiting,
      stacks: m.stacks,
      peek: row.peek,
      chain: m.chain,
      careless: Math.round(m.careless * 1000) / 1000,
      traps: m.traps,
      lineMoves: made.line.length,
      lineSteps: made.steps.length,
    };
    levels.push({ id, peek: row.peek, cols: BOARD.cols, rows: BOARD.rows, seed: made.seed, pictures, stacks: made.deal.stacks, line: made.line.map((mv) => [mv.from, mv.to]), axes });
    console.log(`${id} ${row.role.padEnd(6)} ${pictures.length} pics ${String(axes.cards).padStart(2)} cards (${String(m.waiting).padStart(2)} waiting) alike ${JSON.stringify(axes.alike).padEnd(7)} peek ${row.peek} chain ${m.chain} careless ${(m.careless * 100).toFixed(0).padStart(3)}% traps ${m.traps} line ${made.line.length} moves, seed ${made.seed}`);
    return;
  }
  throw new Error(`${id}: no deal meets the plan; loosen its row`);
});

mkdirSync(join(root, "src/content/levels"), { recursive: true });
const json = JSON.stringify({ v: 2, board: "relaxed campaign; made by tools/levels/make-campaign.mts, checked by tools/levels/check.mts", levels })
  .replace(/\{"id":"c/g, '\n{"id":"c')
  .replace(/\]\}$/, "\n]}");
writeFileSync(join(root, "src/content/levels/campaign.json"), json + "\n");

// ---------------------------------------------------------------- docs/levels.md
const counts = catalogue.map((p) => levels.filter((l) => l.pictures.some((q) => q.id === p.id)).length);
const famName = (f) => f.replace(/-/g, " ");
const lookalikes = (l) => {
  const n = new Map();
  for (const f of l.axes.families) n.set(f, (n.get(f) ?? 0) + 1);
  const groups = [...n].filter(([, k]) => k > 1).sort((a, b) => b[1] - a[1]);
  return groups.length ? groups.map(([f, k]) => `${k} ${famName(f)}`).join(", ") : "none";
};
const rows = levels.map((l, i) => {
  const a = l.axes;
  return `| ${i + 1} | ${a.role} | ${l.pictures.length} | ${lookalikes(l)} | ${a.sizes.join(" ")} | ${a.shapes.join(" ")} | ${l.cols}x${l.rows} | ${a.cards} (${a.waiting}) | ${a.peek} | ${a.chain} | ${Math.round(a.careless * 100)}% | ${a.traps} | ${a.lineMoves} |`;
});
const md = `# The relaxed campaign

What each of the 30 boards asks of the player, axis by axis. Made by
\`node tools/levels/make-campaign.mts\` from the plan in
\`tools/levels/campaign-plan.mts\`; every board's winning line is re-proved by
\`node tools/levels/check.mts\`. Do not edit this table by hand: change the plan
and run the maker.

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
