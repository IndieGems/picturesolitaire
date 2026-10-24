// Builds the daily pool: one proved board per calendar date, the same deal for
// every player on that date, written to src/content/levels/daily.json.
// Run: node tools/levels/make-daily.mts [--to YYYY-MM-DD] [--redeal-from YYYY-MM-DD] [--from YYYY-MM-DD]
//   It KEEPS every day already in the pool, re-deals any day that uses a
//   flagged picture (picture-flags.json; lib.mts), and appends days after the
//   last one up to --to (default: none for a pool that exists).
//   --redeal-from DATE makes every day from DATE on again (up to the pool's
//   last day, or --to), e.g. to bring pictures new to the catalogue in. It
//   refuses a DATE that some player may already have reached (any date up to
//   today in the furthest-ahead time zone, UTC+14): a played day never changes.
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
// Pictures: each new day takes the pictures furthest behind an even share
// (lib.mts catchUp: the least used, such as pictures new to the catalogue,
// come in steadily over the days being made), never one on a board within two
// days either side. Each board's par line is stored ("par").
// Deterministic: the same pool file, catalogue and flags give the same new days.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { random } from "../../src/game/rules.ts";
import { hashId } from "../../src/game/levels/generate.ts";
import { pick } from "../../src/game/levels/pick.ts";
import { catchUp, dealBoard, flaggedOn, onSchedule, root, swapSets, tallyText, usable, usesOf, writeBoards } from "./lib.mts";
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
const shipped = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")).levels : [];
const redealFrom = arg("--redeal-from");
if (redealFrom) {
  // the latest date anywhere in the world right now: UTC+14
  const reached = fmt(Date.now() + 14 * 3600_000);
  if (parse(redealFrom) <= parse(reached)) throw new Error(`--redeal-from ${redealFrom}: some players are already on ${reached}; a played day never changes. Pick a later date.`);
}
const pool = redealFrom ? shipped.filter((l) => l.date < redealFrom) : shipped;
const first = pool.length ? parse(pool[0].date) : parse(arg("--from") ?? "2026-08-01");
const next = pool.length ? parse(pool[pool.length - 1].date) + DAY : first;
// default end: the pool's own last day (2027-01-31 for a new pool)
const to = parse(arg("--to") ?? (shipped.length ? shipped[shipped.length - 1].date : "2027-01-31"));

const levels = [...pool];
const uses = usesOf(levels.map((l) => l.pictures));
/** Pictures within two days either side of day k, which day k never takes. */
const around = (k) => new Set([k - 2, k - 1, k + 1, k + 2].flatMap((j) => levels[j]?.pictures.map((p) => p.id) ?? []));

/**
 * A proved board for day k (levels[k], kept or new) of `date`: from each of
 * `sets` first, then picked, with `weigh` the uses the picker ranks by.
 */
function makeDay(k, date, sets, weigh) {
  const id = `d${date}`;
  const row = WEEK[new Date(parse(date)).getUTCDay()];
  const recent = around(k);
  const opts = { id, date, ...BOARD, par: true, tries: 3000 };
  for (const [n, set] of sets.entries()) {
    const { board, tally } = dealBoard(row, set, opts);
    if (board) return board;
    console.log(`${id}: swapped set ${n} found no deal (${tallyText(tally)})`);
  }
  // pictures of a set that found no deal count as used more, so the next pick differs
  const failed = new Map();
  for (let attempt = 0; attempt < 12; attempt++) {
    const avoid = new Map([...weigh()].map(([k, v]) => [k, v + (failed.get(k) ?? 0)]));
    for (const p of recent) avoid.set(p, (avoid.get(p) ?? 0) + 1000);
    const pictures = pick(usable, { count: row.count, alike: row.alike, cards: row.cards, sizes: row.sizes, vary: row.vary, busyMost: row.busyMost, meanFamilies: true }, avoid, recent, random((hashId(id) + attempt * 104729) >>> 0));
    if (!pictures) throw new Error(`${id}: no pictures fit the day's type`);
    const { board, tally } = dealBoard(row, pictures, opts);
    if (board) return board;
    for (const p of pictures) failed.set(p.id, (failed.get(p.id) ?? 0) + 2);
    console.log(`${id}: pictures set ${attempt} found no deal (${tallyText(tally)})`);
  }
  throw new Error(`${id}: no deal meets the day's type; loosen it`);
}

// 1. kept days that use a flagged picture: as few pictures changed as can be
levels.forEach((l, k) => {
  const bad = flaggedOn(l.pictures);
  if (!bad.length) return;
  console.log(`${l.id}: uses flagged ${bad.join(", ")}; re-dealing it`);
  for (const p of l.pictures) uses.set(p.id, uses.get(p.id) - 1);
  const row = WEEK[new Date(parse(l.date)).getUTCDay()];
  const recent = around(k);
  const sets = swapSets({ count: row.count, alike: row.alike, cards: row.cards, sizes: row.sizes, vary: row.vary, busyMost: row.busyMost }, l.pictures, uses, (id) => (recent.has(id) ? 1000 : 0));
  levels[k] = makeDay(k, l.date, sets, () => uses);
  for (const p of levels[k].pictures) uses.set(p.id, uses.get(p.id) + 1);
});

// 2. new days, the least-used pictures caught up over all of them
const days = [];
for (let t = next; t <= to; t += DAY) days.push(fmt(t));
const slots = days.reduce((n, d) => n + WEEK[new Date(parse(d)).getUTCDay()].count, 0);
const plan0 = catchUp(uses, slots);
let done = 0;
for (const date of days) {
  const board = makeDay(levels.length, date, [], () => onSchedule(uses, plan0, done / slots));
  levels.push(board);
  for (const p of board.pictures) uses.set(p.id, uses.get(p.id) + 1);
  done += board.pictures.length;
}
if (!days.length && levels.every((l, k) => l === shipped[k]) && levels.length === shipped.length) {
  console.log(`the pool runs to ${shipped.at(-1)?.date ?? "-"} and uses no flagged picture; nothing to do (--to adds days)`);
  process.exit(0);
}
writeBoards(FILE, "daily pool: one board per date, the same for every player; made by tools/levels/make-daily.mts (it keeps every day it has, re-dealing only a day with a flagged picture), checked by tools/levels/check.mts; par = moves in the stored line", levels);

// ---------------------------------------------------------------- docs/daily.md
const counts = usable.map((p) => levels.filter((l) => l.pictures.some((q) => q.id === p.id)).length);
const byRole = WEEK.map((w, d) => {
  const ls = levels.filter((l) => l.axes.role === w.role);
  const avg = (f) => (ls.reduce((n, l) => n + f(l), 0) / Math.max(1, ls.length)).toFixed(1);
  return `| ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]} | ${w.count} | ${w.alike.join(" + ") || "none"} | ${w.sizes.join(" ")} | ${w.cards.join("-")} | ${w.peek} | ${w.chain.join("-")} | ${w.careless.map((x) => Math.round(x * 100) + "%").join("-")} | ${avg((l) => l.par)} |`;
});
const md = `# The daily puzzle

One board per calendar date, the same deal for every player on that date
(\`src/content/levels/daily.json\`, ${levels.length} days: ${levels[0].date} to ${levels.at(-1).date}).
Made by \`node tools/levels/make-daily.mts\`, which keeps every day it has
(re-dealing only a day that uses a flagged picture): \`--to YYYY-MM-DD\` adds
days. Every board is re-proved by
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
