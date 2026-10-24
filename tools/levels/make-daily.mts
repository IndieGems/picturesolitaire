// Builds the daily pool: one proved board per calendar date, the same deal for
// every player on that date, written to src/content/levels/daily.json.
// Run: node tools/levels/make-daily.mts [--to YYYY-MM-DD] [--from YYYY-MM-DD]
//   With a pool already there, it KEEPS every board in it and appends days
//   after the last one up to --to (default: the last day of the third month
//   after the pool's last day... see TO_DEFAULT). A shipped date never changes:
//   players may already have played it.
//   --from only starts a new pool (default 2026-08-01, so an archive of "this
//   month and the two before" has boards from the first day it is shown).
// Then node tools/levels/check.mts re-proves what was written.
//
// Difficulty is mid-campaign every day (about campaign boards 11 to 19: 6 or 7
// pictures, a pair or a triple of lookalikes, a chain of 2 or 3, a careless
// player wins most of the time), with a weekly rhythm of seven board types so
// that days next to each other feel different. The weekday is the date's own
// (a date string names one weekday everywhere), not the player's clock.
//
// Pictures: each day takes the pictures used least so far in the pool, never
// one from the two days before. Each board's par line is stored ("par").
// Deterministic: the same pool file and catalogue give the same new days.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { random } from "../../src/game/rules.ts";
import { generate, hashId } from "../../src/game/levels/generate.ts";
import { alikeOf, pick, shapeOf } from "../../src/game/levels/pick.ts";
import { byId, catalogue, root, writeBoards } from "./lib.mts";
import { WEEK } from "./daily-plan.mts";

const FILE = join(root, "src/content/levels/daily.json");
const BOARD = { cols: 4, rows: 5 };

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const DAY = 86_400_000;
const parse = (d) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d ?? "")) throw new Error(`not a date: ${d}`);
  return Date.parse(d + "T00:00:00Z");
};
const fmt = (t) => new Date(t).toISOString().slice(0, 10);

const t0 = performance.now();
const pool = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")).levels : [];
const first = pool.length ? parse(pool[0].date) : parse(arg("--from") ?? "2026-08-01");
const next = pool.length ? parse(pool[pool.length - 1].date) + DAY : first;
// default end: 2027-01-31 for a new pool; else three months on
const to = parse(arg("--to") ?? (pool.length ? fmt(next + 92 * DAY) : "2027-01-31"));
if (to < next) {
  console.log(`the pool already runs to ${pool.length ? pool[pool.length - 1].date : "-"}; nothing to add`);
  process.exit(0);
}

const uses = new Map(catalogue.map((p) => [p.id, 0]));
for (const l of pool) for (const p of l.pictures) uses.set(p.id, (uses.get(p.id) ?? 0) + 1);
const levels = [...pool];
for (let t = next; t <= to; t += DAY) {
  const date = fmt(t);
  const id = `d${date}`;
  const row = WEEK[new Date(t).getUTCDay()];
  // never a picture from the two days before
  const recent = new Set(levels.slice(-2).flatMap((l) => l.pictures.map((p) => p.id)));
  let made = null;
  let pictures = null;
  // pictures of a set that found no deal count as used more, so the next pick differs
  const failed = new Map();
  for (let attempt = 0; attempt < 12 && !made; attempt++) {
    const avoid = new Map([...uses].map(([k, v]) => [k, v + (failed.get(k) ?? 0)]));
    for (const id of recent) avoid.set(id, (avoid.get(id) ?? 0) + 1000);
    pictures = pick(catalogue, { count: row.count, alike: row.alike, cards: row.cards, sizes: row.sizes, meanFamilies: true }, avoid, recent, random((hashId(id) + attempt * 104729) >>> 0));
    if (!pictures) throw new Error(`${id}: no pictures fit the day's type`);
    pictures = [...pictures].sort((a, b) => (a.id < b.id ? -1 : 1));
    const spec = { id, ...BOARD, pictures, targets: { chain: row.chain, careless: row.careless }, par: true };
    const tally = new Map();
    made = generate(spec, 1, 3000, tally);
    if (!made) for (const p of pictures) failed.set(p.id, (failed.get(p.id) ?? 0) + 2);
    if (!made) console.log(`${id}: pictures set ${attempt} found no deal (${[...tally].map(([k, v]) => `${k} ${v}`).join(", ")})`);
  }
  if (!made) throw new Error(`${id}: no deal meets the day's type; loosen it`);
  for (const p of pictures) uses.set(p.id, uses.get(p.id) + 1);
  const m = made.measures;
  levels.push({
    id,
    date,
    peek: row.peek,
    ...BOARD,
    seed: made.seed,
    pictures,
    stacks: made.deal.stacks,
    line: made.line.map((mv) => [mv.from, mv.to]),
    par: made.line.length,
    axes: {
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
    },
  });
  console.log(`${id} ${row.role} ${pictures.length} pics ${String(levels.at(-1).axes.cards).padStart(2)} cards peek ${row.peek} chain ${m.chain} careless ${(m.careless * 100).toFixed(0).padStart(3)}% par ${made.line.length}, seed ${made.seed}`);
}
writeBoards(FILE, "daily pool: one board per date, the same for every player; made by tools/levels/make-daily.mts (it only ever appends days), checked by tools/levels/check.mts; par = moves in the stored line", levels);

// ---------------------------------------------------------------- docs/daily.md
const counts = catalogue.map((p) => levels.filter((l) => l.pictures.some((q) => q.id === p.id)).length);
const byRole = WEEK.map((w, d) => {
  const ls = levels.filter((l) => l.axes.role === w.role);
  const avg = (f) => (ls.reduce((n, l) => n + f(l), 0) / Math.max(1, ls.length)).toFixed(1);
  return `| ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]} | ${w.count} | ${w.alike.join(" + ") || "none"} | ${w.sizes.join(" ")} | ${w.cards.join("-")} | ${w.peek} | ${w.chain.join("-")} | ${w.careless.map((x) => Math.round(x * 100) + "%").join("-")} | ${avg((l) => l.par)} |`;
});
const md = `# The daily puzzle

One board per calendar date, the same deal for every player on that date
(\`src/content/levels/daily.json\`, ${levels.length} days: ${levels[0].date} to ${levels.at(-1).date}).
Made by \`node tools/levels/make-daily.mts\`, which only ever appends days:
\`--to YYYY-MM-DD\` adds more. Every board is re-proved by
\`node tools/levels/check.mts\`. Do not edit by hand.

The pool starts on 1 August 2026 so that an archive of this month and the two
before it has a board for every day it can show.

Every day is mid-campaign difficulty (about campaign boards 11 to 19), with a
weekly rhythm so that days next to each other feel different. The weekday is
the date's own, the same for everyone. Each board's par is the fewest moves the
solver found.

| weekday | pictures | lookalikes | cards per picture | cards | shown | chain | careless win | mean par |
|---|---|---|---|---|---|---|---|---|
${byRole.join("\n")}

Every picture's appearances in the pool: ${Math.min(...counts)} to ${Math.max(...counts)} (mean ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}); no picture is on two boards within three days.
`;
writeFileSync(join(root, "docs/daily.md"), md);
console.log(`wrote ${FILE} (${levels.length} days, ${levels.length - pool.length} new) and docs/daily.md in ${((performance.now() - t0) / 1000).toFixed(1)} s; picture uses ${Math.min(...counts)}..${Math.max(...counts)}`);
