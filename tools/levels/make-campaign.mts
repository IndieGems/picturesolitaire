// Builds the relaxed campaign from its plan (tools/levels/campaign-plan.mts):
// keeps every board already in campaign.json, re-deals any that uses a flagged
// picture, and for each plan row past the end picks the pictures (evenly
// across the campaign), generates a deal that meets every axis, proves it
// (lib.mts, route), and writes
//   src/content/levels/campaign.json   the boards, each with its winning line
//   docs/levels.md                     the table of axes, for the reader
// Run: node tools/levels/make-campaign.mts [--fresh] [--repair-only] [--out FILE] [--old FILE]
//   --fresh        remake every board from the plan, ignoring the file (a
//                  board a player has won keeps its id and pays no more)
//   --keep N       keep the file's first N boards, remake the rest from the plan
//                  (e.g. --keep 3 once boards 1-3 are signed off)
//   --repair-only  re-deal flagged boards only; add no plan rows (redeal.mts)
//   --redeal 1,2,3 re-deal these boards afresh from the plan; keep every other
//                  board (and add no plan rows)
//   --reseat 1,2,3 re-deal these boards with exactly their own pictures and
//                  destination, on their rows' targets (e.g. made readable)
//   --rows N       make the plan's first N rows only (e.g. while the library
//                  cannot fill the rest yet)
//   --out FILE     write the boards there instead, and no docs (for trials)
//   --old FILE     start from the boards in FILE instead of campaign.json (a
//                  staged trial: e.g. a second pass that swaps new boards' postcards in)
//   PICKS_ONLY=1   pick the pictures and report their spacing; no deals
// Pictures follow the plan's rows (shapes, keep lists) and its no-repeat rule
// (DISTINCT, SPACING; campaign-plan.mts), which every board it makes keeps.
// A kept board takes its row's peek (peek is no part of the deal).
// Deterministic: the same file, plan, catalogue and flags give the same campaign. Then
// node tools/levels/check.mts re-proves what was written.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { catalogue, destById, famName, flags, lookalikes, readBoards, reserveLandmarks, root, route, spacingOf, usable, writeBoards } from "./lib.mts";
import { BOARD, DISTINCT, MARKS, PLAN as FULL, PLAN_TAG, SPACING, TRIPS } from "./campaign-plan.mts";

const t0 = performance.now();
// landmarks are saved for future trips' destinations: none on a campaign board (lib.mts)
reserveLandmarks();

const has = (f) => process.argv.includes(f);
const rowsAt = process.argv.indexOf("--rows");
const PLAN = rowsAt > 0 ? FULL.slice(0, Number(process.argv[rowsAt + 1])) : FULL;
const outAt = process.argv.indexOf("--out");
const SHIPPED = join(root, "src/content/levels/campaign.json");
const oldAt = process.argv.indexOf("--old");
const FILE = oldAt > 0 ? process.argv[oldAt + 1] : SHIPPED;
const OUT = outAt > 0 ? process.argv[outAt + 1] : SHIPPED;
const keepAt = process.argv.indexOf("--keep");
const old = has("--fresh") ? [] : keepAt > 0 ? readBoards(FILE).slice(0, Number(process.argv[keepAt + 1])) : readBoards(FILE);
const shipped = readBoards(SHIPPED);
const fileTag = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")).plan : undefined;
const redealAt = process.argv.indexOf("--redeal");
const redeal = new Set(redealAt > 0 ? process.argv[redealAt + 1].split(",").map((n) => Number(n) - 1) : []);
const reseatAt = process.argv.indexOf("--reseat");
const reseat = new Set(reseatAt > 0 ? process.argv[reseatAt + 1].split(",").map((n) => Number(n) - 1) : []);
const adding = PLAN.length > old.length && !has("--repair-only") && !redeal.size && !reseat.size;
if (adding && old.length && fileTag !== PLAN_TAG && keepAt < 0) {
  console.error(`campaign.json was made from another plan (${fileTag ?? "before plans were named"}), not ${PLAN_TAG}: remake it with --fresh, or re-deal flagged boards only with --repair-only`);
  process.exit(1);
}
// a repaired file keeps its plan's name (none, for one from before names)
const tag = adding || !old.length ? PLAN_TAG : fileTag;
const made = route(PLAN, old, {
  spacing: SPACING,
  distinct: DISTINCT,
  repairOnly: has("--repair-only") || redeal.size > 0 || reseat.size > 0,
  redeal,
  reseat,
  landmarks: true,
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
// the mark players see (MARKS, by the row's role), right after peek so the file's line breaks hold
const withMark = (l, row) => {
  const { mark: _, ...rest } = l;
  const mark = MARKS[row.role];
  if (!mark) return rest;
  const out = {};
  for (const [k, v] of Object.entries(rest)) {
    out[k] = v;
    if (k === "peek") out.mark = mark;
  }
  return out;
};
const levels = made.map((l, i) => withMark(l, PLAN[i]));
// the first board hosts the guided start (UI's onboarding plays its line)
if (shipped[0] && JSON.stringify(levels[0]) !== JSON.stringify(shipped[0])) console.warn("!! c01 changed: tell UI to re-check the guided start's steps");
const sp = spacingOf(levels.map((l) => l.pictures), SPACING);
console.log(`spacing: a picture comes back after ${sp.shortest} boards at the soonest (median ${sp.median}); ${sp.short} of ${sp.gaps} returns are sooner than ${SPACING}`);
writeBoards(OUT, "relaxed campaign; made by tools/levels/make-campaign.mts, checked by tools/levels/check.mts", levels, tag ? { plan: tag } : {});

if (OUT !== SHIPPED) process.exit(0);
// ---------------------------------------------------------------- docs/levels.md
const counts = usable.map((p) => levels.filter((l) => l.pictures.some((q) => q.id === p.id)).length);
const rows = levels.map((l, i) => {
  const a = l.axes;
  const place = l.destination ? (destById.get(l.destination.id)?.name ?? l.destination.id) : "-";
  return `| ${i + 1} | ${place} | ${a.role}${l.mark ? ` (marked ${l.mark})` : ""} | ${l.pictures.length} | ${lookalikes(l)} | ${a.sizes.join(" ")} | ${a.shapes.join(" ")} | ${l.cols}x${l.rows} | ${a.cards} (${a.waiting}) | ${a.peek} | ${a.chain} | ${Math.round(a.careless * 100)}% | ${a.traps} | ${a.lineMoves} |`;
});
const md = `# The relaxed campaign

What each of the ${levels.length} boards asks of the player, axis by axis. Made by
\`node tools/levels/make-campaign.mts\` from the plan in
\`tools/levels/campaign-plan.mts\`; every board's winning line is re-proved by
\`node tools/levels/check.mts\`. Do not edit this table by hand: change the plan
and run the maker. The challenge route is in [challenge.md](challenge.md), the
daily puzzle in [daily.md](daily.md).

- **Destination**: the board's real place (lead, 2026-10-25: the game is a travelogue), a postcard the size of the board of which one window plays as an ordinary picture and unfolds into the whole postcard when finished. It took the place of one of the board's pictures, at the same spot and shape, so the deal and every measure below are as they were. The trips: ${TRIPS.map((t) => `${t.name} (${t.from}-${t.to})`).join(", ")}.
- **Role**: the board's place in the sawtooth ([difficulty-curve.md](difficulty-curve.md)): teach, bite (the first hard-for-a-beginner board), build, relief, hard, peak, super (super hard), pace (all long pictures, a change of pace). Every board but hard, peak and super starts safe: no first move or first clear dooms it. Players see a mark on hard and peak boards ("hard") and super ones ("super").
- **Lookalikes**: pictures from the same family (they share colours and subjects).
- **Cards per picture**: the pieces each picture is cut into.
- **Cards (waiting)**: all the board's cards; in brackets, those still in the stacks when it opens (a 4x5 board holds 20, a 4x6 board 24).
- **Shown**: upcoming cards each stack shows (0, card backs, on every board since 2026-10-25).
- **Chain**: the longest run of clears that depend on one another that no winning line avoids (1: every picture can be finished from the opening deal).
- **Careless win**: the chance a player who never plans ahead still wins (always finishing whatever picture is ready, wherever, else drawing from any stack). It never sees a stack's next card: every draw and every place is a blind, even choice.
- **Traps**: steps of the winning line where another choice would make the board unwinnable.
- **Line**: moves in the stored winning line (no undo, hint or shuffle).

| # | destination | role | pictures | lookalikes | cards per picture | shapes | board | cards (waiting) | shown | chain | careless win | traps | line |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}

Every picture's appearances across the ${levels.length} boards: ${Math.min(...counts)} to ${Math.max(...counts)} (mean ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}). A picture comes back ${sp.shortest} boards later at the soonest (median ${sp.median}). Every board made since 2026-10-25 keeps the rule: no picture on two of boards 1-${DISTINCT}, none back within ${SPACING} boards; ${sp.short} of ${sp.gaps} returns are sooner than ${SPACING}, on boards kept from before it.

| picture | boards |
|---|---|
${catalogue.map((p) => `| ${p.id} (${p.cols}x${p.rows}, ${famName(p.family)})${flags.has(p.id) ? " FLAGGED: don't use" : ""} | ${levels.map((l, i) => (l.pictures.some((q) => q.id === p.id) ? i + 1 : null)).filter(Boolean).join(", ")} |`).join("\n")}
`;
writeFileSync(join(root, "docs/levels.md"), md);
console.log(`wrote src/content/levels/campaign.json (${levels.length} boards) and docs/levels.md in ${((performance.now() - t0) / 1000).toFixed(1)} s; picture uses ${Math.min(...counts)}..${Math.max(...counts)}`);
