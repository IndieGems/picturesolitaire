// Builds the daily pool: one proved board per calendar date, the same deal for
// every player on that date, written to src/content/levels/daily.json.
// Run: node tools/levels/make-daily.mts [--to YYYY-MM-DD] [--redeal-from YYYY-MM-DD] [--days D1,D2,... [--played]] [--from YYYY-MM-DD] [--out FILE]
//   It KEEPS every day already in the pool, re-deals any day that uses a
//   flagged picture (picture-flags.json; lib.mts), and appends days after the
//   last one up to --to (default: none for a pool that exists).
//   --redeal-from DATE makes every day from DATE on again (up to the pool's
//   last day, or --to), e.g. to bring pictures new to the catalogue in. It
//   refuses a DATE that some player may already have reached (any date up to
//   today in the furthest-ahead time zone, UTC+14): a played day never changes.
//   --days D1,D2,... re-deals just those days of the pool, in place, under
//   their row's rules (daily-plan.mts rowOn), every other day byte for byte as
//   it was; no picture of theirs is on a board within three days either side.
//   A day some player may have reached needs --played as well (the creator's
//   call: creator, 2026-10-28, for 28-31 October; Server keeps the old deal's
//   version, so a win on it still pays).
//   --out FILE writes the pool there instead, and no docs (for trials).
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
import { fits, pick } from "../../src/game/levels/pick.ts";
import { byId, catalogue, catchUp, clearOrder, dealBoard, flaggedOn, itemById, itemClash, onSchedule, REMAKES, remadeInPlace, reserveLandmarks, root, swapSets, tallyText, usable, usesOf, writeBoards } from "./lib.mts";
import { RULES_FROM, rowOn, SUITCASE_FROM, SUITCASE_WEEK, WEEK } from "./daily-plan.mts";
import { CURRENT, LAST_BEFORE_T9, SPARES } from "./campaign-plan.mts";
import { schedule } from "./suitcase.mts";
import { fewerAtmospheric, isAtmospheric } from "./atmospheric.mts";

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
// landmarks wait for their trips' destinations (lib.mts): none on a day made from SUITCASE_FROM
reserveLandmarks();
/**
 * The pictures a day from SUITCASE_FROM may take (daily-plan.mts): squares of today's rules (none from
 * before the clear pictures, no landmark: usable after reserveLandmarks), none of trips 9 and 10's new
 * pictures or of the spares they show first (campaign-plan.mts), so those stay new to the campaign.
 */
const at = new Map(catalogue.map((p, k) => [p.id, k]));
const lastKept = at.get(LAST_BEFORE_T9);
// and never an atmospheric one (creator, 2026-10-29: at most one a level; atmospheric.mts): a daily's are all clear
const CLEAR = usable.filter((p) => !isAtmospheric(p));
const CURRENT_SQUARES = CLEAR.filter((p) => p.cols === 2 && p.rows === 2 && !CURRENT.has(p.id) && !SPARES.has(p.id) && at.get(p.id) <= lastKept);
/** The day's item (suitcase.mts schedule), from SUITCASE_FROM. */
const itemOn = (date) => {
  if (date < SUITCASE_FROM) return null;
  const id = schedule(date.slice(0, 7))[Number(date.slice(8)) - 1];
  const it = itemById.get(id);
  if (!it) throw new Error(`${date}: the day's item ${id} is not in the catalogue's items (Art: pictures.json items)`);
  if (it.cols !== 2 || it.rows !== 2) throw new Error(`${date}: item ${id} is ${it.cols}x${it.rows}, an item is 2x2`);
  return it;
};
/** A picture the day's item rules out (lib.mts itemClash): its lookalike, the picture a stand-in borrows, a word in common. */
const clashes = (it, p) => itemClash(it, p) !== null;
const shipped = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")).levels : [];
const redealFrom = arg("--redeal-from");
if (redealFrom) {
  // the latest date anywhere in the world right now: UTC+14
  const reached = fmt(Date.now() + 14 * 3600_000);
  if (parse(redealFrom) <= parse(reached)) throw new Error(`--redeal-from ${redealFrom}: some players are already on ${reached}; a played day never changes. Pick a later date.`);
}
// peek is no part of the deal (dealFor), so a kept day takes its weekday's peek with its deal and line unchanged
const withPeek = (l) => {
  const peek = rowOn(l.date).peek;
  return l.peek === peek ? l : { ...l, peek, ...(l.axes ? { axes: { ...l.axes, peek } } : {}) };
};
const pool = (redealFrom ? shipped.filter((l) => l.date < redealFrom) : shipped).map(withPeek);
const first = pool.length ? parse(pool[0].date) : parse(arg("--from") ?? "2026-08-01");
const next = pool.length ? parse(pool[pool.length - 1].date) + DAY : first;
// default end: the pool's own last day (2027-01-31 for a new pool)
const to = parse(arg("--to") ?? (shipped.length ? shipped[shipped.length - 1].date : "2027-01-31"));

const levels = [...pool];
const uses = usesOf(levels.map((l) => l.pictures));
/** Pictures within `span` days (two unless said) either side of day k, which day k never takes. */
const around = (k, span = 2) => new Set(Array.from({ length: span * 2 + 1 }, (_, d) => k - span + d).filter((j) => j !== k).flatMap((j) => levels[j]?.pictures.map((p) => p.id) ?? []));

/**
 * A proved board for day k (levels[k], kept or new) of `date`: from each of
 * `sets` first, then picked, with `weigh` the uses the picker ranks by.
 */
function makeDay(k, date, sets, weigh, span = 2) {
  const id = `d${date}`;
  const row = rowOn(date);
  if (date >= RULES_FROM) return makeSuitcaseDay(k, date, row, weigh, span);
  const recent = around(k, span);
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
    const pictures = pick(CLEAR, { count: row.count, alike: row.alike, cards: row.cards, sizes: row.sizes, vary: row.vary, busyMost: row.busyMost, meanFamilies: true }, avoid, recent, random((hashId(id) + attempt * 104729) >>> 0));
    if (!pictures) throw new Error(`${id}: no pictures fit the day's type`);
    const { board, tally } = dealBoard(row, pictures, opts);
    if (board) return board;
    for (const p of pictures) failed.set(p.id, (failed.get(p.id) ?? 0) + 2);
    console.log(`${id}: pictures set ${attempt} found no deal (${tallyText(tally)})`);
  }
  throw new Error(`${id}: no deal meets the day's type; loosen it`);
}

/**
 * A day from RULES_FROM (daily-plan.mts SUITCASE_WEEK): from SUITCASE_FROM the day's item and count - 1
 * pictures picked from CURRENT_SQUARES, a deal on the row's targets with a safe start, whose stored line
 * finishes the item neither first nor last (the next seed otherwise); the board records the item right
 * after its size. Before SUITCASE_FROM (28-31 October) the same with no item: count pictures picked.
 */
function makeSuitcaseDay(k, date, row, weigh, span = 2) {
  const id = `d${date}`;
  const it = itemOn(date);
  const recent = around(k, span);
  const n = row.count - (it ? 1 : 0);
  const pool = it ? CURRENT_SQUARES.filter((p) => !clashes(it, p)) : CURRENT_SQUARES;
  const spec = { count: n, alike: [], cards: [n * 4, n * 4], sizes: [4], vary: true, busyMost: row.busyMost, liveMost: row.liveMost, meanFamilies: true };
  const failed = new Map();
  for (let attempt = 0; attempt < 12; attempt++) {
    const avoid = new Map([...weigh()].map(([q, v]) => [q, v + (failed.get(q) ?? 0)]));
    for (const p of recent) avoid.set(p, (avoid.get(p) ?? 0) + 1000);
    const picked = pick(pool, spec, avoid, recent, random((hashId(id) + attempt * 104729) >>> 0));
    if (!picked) throw new Error(`${id}: no pictures fit the day's type${it ? ` beside item ${it.id}` : ""}`);
    const pictures = it ? [...picked, { id: it.id, cols: 2, rows: 2 }] : picked;
    // seeds on from 1, stepping past a deal whose line finishes the item first or last
    let from = 1;
    for (let tries = 0; tries < 40; tries++) {
      const { board, tally } = dealBoard(row, pictures, { id, date, ...BOARD, par: true, tries: 3000, safeFirstMove: true, from });
      if (!board) {
        console.log(`${id}: pictures set ${attempt} found no deal (${tallyText(tally)})`);
        break;
      }
      if (!it) return board;
      const order = clearOrder(board);
      const atClear = order.indexOf(board.pictures.findIndex((p) => p.id === it.id));
      if (atClear > 0 && atClear < order.length - 1) return withItem(board, it.id);
      from = board.seed + 1;
    }
    for (const p of picked) failed.set(p.id, (failed.get(p.id) ?? 0) + 2);
  }
  throw new Error(`${id}: no deal meets the day's type${it ? " with its item mid-line" : ""}; loosen it`);
}
/** The board with its item record right after its size (as a campaign board's destination). */
function withItem(board, itemId) {
  const out = {};
  for (const [key, v] of Object.entries(board)) {
    if (key === "item") continue;
    out[key] = v;
    if (key === "rows") out.item = { id: itemId };
  }
  return out;
}

// 1. kept days that use a flagged picture: its remake in its place, else as few pictures changed as can be
levels.forEach((l, k) => {
  const bad = flaggedOn(l.pictures);
  if (!bad.length) return;
  // a remake of the same shape takes its old picture's place: the day's deal, line and par unchanged
  const same = remadeInPlace(l);
  if (same) {
    console.log(`${l.id}: ${bad.map((id) => `${id} -> ${REMAKES.get(id)}`).join(", ")} in place; the deal and line unchanged`);
    for (const p of l.pictures) uses.set(p.id, uses.get(p.id) - 1);
    for (const p of same.pictures) uses.set(p.id, (uses.get(p.id) ?? 0) + 1);
    levels[k] = same;
    return;
  }
  console.log(`${l.id}: uses flagged ${bad.join(", ")}; re-dealing it`);
  for (const p of l.pictures) uses.set(p.id, uses.get(p.id) - 1);
  const row = rowOn(l.date);
  const recent = around(k);
  const sets = swapSets({ count: row.count, alike: row.alike, cards: row.cards, sizes: row.sizes, vary: row.vary, busyMost: row.busyMost }, l.pictures, uses, (id) => (recent.has(id) ? 1000 : 0));
  levels[k] = makeDay(k, l.date, sets, () => uses);
  for (const p of levels[k].pictures) uses.set(p.id, uses.get(p.id) + 1);
});

// 1b. kept suitcase days whose item now clashes with one of their pictures (Art's real item, with its
// own words, replacing a stand-in after the day was made): that picture gives way IN PLACE to another
// square of today's rules that clashes with nothing, the least used first. A board of squares deals
// the same from any square pictures (dealFor reads shapes only), so the deal, line and measures stay
// as they were; check.mts re-proves the day
levels.forEach((l, k) => {
  if (!l.item) return;
  const it = itemById.get(l.item.id);
  if (!it) throw new Error(`${l.id}: item ${l.item.id} is not in the catalogue's items`);
  const row = rowOn(l.date);
  const spec = { count: row.count - 1, alike: [], cards: [(row.count - 1) * 4, (row.count - 1) * 4], sizes: [4], vary: true, busyMost: row.busyMost, liveMost: row.liveMost };
  let pictures = l.pictures;
  for (const [j, p] of l.pictures.entries()) {
    if (p.id === it.id || !itemClash(it, byId.get(p.id) ?? p)) continue;
    // a day some player may have reached never changes (as --redeal-from): Art's item must fit it instead
    if (l.date <= fmt(Date.now() + 14 * 3600_000)) throw new Error(`${l.id}: ${p.id} clashes with item ${it.id} (${itemClash(it, byId.get(p.id) ?? p)}), and the day may be played already; change the item, not the day`);
    const near = around(k);
    const others = pictures.filter((q) => q.id !== it.id && q.id !== p.id);
    const swap = CURRENT_SQUARES.filter((c) => !clashes(it, c) && !near.has(c.id) && !pictures.some((q) => q.id === c.id) && fits(catalogue, spec, [...others, { id: c.id, cols: 2, rows: 2 }]))
      .sort((a, b) => (uses.get(a.id) ?? 0) - (uses.get(b.id) ?? 0) || (a.id < b.id ? -1 : 1))[0];
    if (!swap) throw new Error(`${l.id}: ${p.id} clashes with item ${it.id} (${itemClash(it, byId.get(p.id) ?? p)}) and no square can take its place`);
    console.log(`${l.id}: ${p.id} -> ${swap.id} in place (${itemClash(it, byId.get(p.id) ?? p)} in common with item ${it.id}, ${it.title}); the deal and line unchanged`);
    pictures = pictures.map((q, i) => (i === j ? { id: swap.id, cols: 2, rows: 2 } : q));
    uses.set(p.id, uses.get(p.id) - 1);
    uses.set(swap.id, (uses.get(swap.id) ?? 0) + 1);
  }
  if (pictures !== l.pictures) levels[k] = { ...l, pictures, ...(l.axes?.families ? { axes: { ...l.axes, families: pictures.map((q) => (byId.get(q.id) ?? itemById.get(q.id))?.family ?? q.id) } } : {}) };
});

// 1c. --days: just those days re-dealt in place under their row's rules, all of them cleared first so
// their old pictures count for nothing; none of the new pictures is on a board within three days
const redays = (arg("--days") ?? "").split(",").filter(Boolean);
if (redays.length) {
  const reached = fmt(Date.now() + 14 * 3600_000);
  const played = redays.filter((d) => parse(d) <= parse(reached));
  if (played.length && !process.argv.includes("--played")) throw new Error(`--days: ${played.join(", ")} may be played already (UTC+14 is on ${reached}); a played day changes only on the creator's word: add --played`);
  const ks = redays.map((d) => {
    const k = levels.findIndex((l) => l.date === d);
    if (k < 0) throw new Error(`--days: ${d} is not in the pool`);
    return k;
  });
  for (const k of ks) {
    for (const p of levels[k].pictures) uses.set(p.id, uses.get(p.id) - 1);
    levels[k] = { ...levels[k], pictures: [] };
  }
  for (const k of ks) {
    levels[k] = makeDay(k, levels[k].date, [], () => uses, 3);
    for (const p of levels[k].pictures) uses.set(p.id, (uses.get(p.id) ?? 0) + 1);
    console.log(`${levels[k].id}: re-dealt as ${levels[k].axes.role}, ${levels[k].pictures.length} pictures (${levels[k].pictures.map((p) => p.id).join(", ")}), careless ${levels[k].axes.careless}`);
  }
}

// at most one atmospheric picture a day (creator, 2026-10-29; atmospheric.mts fewerAtmospheric): the extras
// give way IN PLACE to clear pictures, the deal, line and par unchanged; none on a board within three days
// either side, none the day's item rules out, and a day from RULES_FROM takes only its own rules' squares.
// The played days (1 August to 27 October) too, on the creator's word ("Fix them too", 2026-10-29); Server
// keeps each old version, so a win on it still pays
{
  const near = (k, id) => levels.slice(Math.max(0, k - 3), k + 4).some((l) => l.pictures.some((q) => q.id === id));
  const ownRules = new Set(CURRENT_SQUARES.map((p) => p.id));
  const fewer = fewerAtmospheric(levels, {
    allowed: (k, r) => {
      const it = levels[k].item && itemById.get(levels[k].item.id);
      return !near(k, r.id) && !(it && clashes(it, r)) && (levels[k].date < RULES_FROM || ownRules.has(r.id));
    },
  });
  if (fewer.short.length) throw new Error(`no clear picture fits in place of ${fewer.short.join(", ")}`);
  fewer.levels.forEach((l, k) => {
    if (l === levels[k]) return;
    for (const q of levels[k].pictures) uses.set(q.id, uses.get(q.id) - 1);
    for (const q of l.pictures) uses.set(q.id, (uses.get(q.id) ?? 0) + 1);
    levels[k] = l;
  });
  for (const w of fewer.swaps) console.log(`${w.level}: ${w.atmospheric} -> ${w.clear} in place (at most one atmospheric a level); the deal and line unchanged`);
}

// 2. new days, the least-used pictures caught up over all of them
const days = [];
for (let t = next; t <= to; t += DAY) days.push(fmt(t));
const slots = days.reduce((n, d) => n + rowOn(d).count, 0);
const plan0 = catchUp(uses, slots);
let done = 0;
for (const date of days) {
  const board = makeDay(levels.length, date, [], () => onSchedule(uses, plan0, done / slots));
  levels.push(board);
  for (const p of board.pictures) uses.set(p.id, uses.get(p.id) + 1);
  done += board.pictures.length;
}
if (!days.length && levels.every((l, k) => l === shipped[k]) && levels.length === shipped.length) {
  console.log(`the pool runs to ${shipped.at(-1)?.date ?? "-"}, uses no flagged picture and no item clashes; nothing to do (--to adds days)`);
  process.exit(0);
}
writeBoards(arg("--out") ?? FILE, "daily pool: one board per date, the same for every player; made by tools/levels/make-daily.mts (it keeps every day it has, re-dealing only a day with a flagged picture), checked by tools/levels/check.mts; par = moves in the stored line", levels);

if (arg("--out")) process.exit(0);
// ---------------------------------------------------------------- docs/daily.md
const counts = usable.map((p) => levels.filter((l) => l.pictures.some((q) => q.id === p.id)).length);
const NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const tableOf = (week) =>
  week.map((w, d) => {
    const ls = levels.filter((l) => l.axes.role === w.role);
    const avg = (f) => (ls.reduce((n, l) => n + f(l), 0) / Math.max(1, ls.length)).toFixed(1);
    const careless = ls.length ? `${Math.round(Math.min(...ls.map((l) => l.axes.careless)) * 100)}-${Math.round(Math.max(...ls.map((l) => l.axes.careless)) * 100)}%` : "-";
    return `| ${NAMES[d]} | ${w.count} | ${w.alike.join(" + ") || "none"} | ${w.sizes.join(" ")} | ${w.cards.join("-")} | ${w.peek} | ${w.chain[1] >= 99 ? "any" : w.chain.join("-")} | ${w.careless.map((x) => Math.round(x * 100) + "%").join("-")} | ${careless} | ${avg((l) => l.par)} |`;
  });
const head = "| weekday | pictures | lookalikes | cards per picture | cards | shown | chain | careless win, target | careless win, dealt | mean par |\n|---|---|---|---|---|---|---|---|---|---|";
const firstSuitcase = levels.find((l) => l.date >= SUITCASE_FROM);
const md = `# The daily puzzle

One board per calendar date, the same deal for every player on that date
(\`src/content/levels/daily.json\`, ${levels.length} days: ${levels[0].date} to ${levels.at(-1).date}).
Made by \`node tools/levels/make-daily.mts\`, which keeps every day it has
(re-dealing only a day that uses a flagged picture): \`--to YYYY-MM-DD\` adds
days. Every board is re-proved by
\`node tools/levels/check.mts\`. Do not edit by hand.

The pool starts on 1 August 2026 so that an archive of this month and the two
before it has a board for every day it can show. Every day has a weekly rhythm,
so that days next to each other feel different. The weekday is the date's own,
the same for everyone. Each board's par is the fewest moves the solver found.

## Until ${fmt(parse(RULES_FROM) - DAY)}

Mid-campaign difficulty (about campaign boards 11 to 19), pictures of mixed sizes.
The last four days of October, 28 to 31, were re-dealt on 2026-10-28 (creator,
playing that day's old-style board) under the rules of the next section,
without an item, as the event starts on ${SUITCASE_FROM}; the next section's
table counts them too.

${head}
${tableOf(WEEK).join("\n")}
${firstSuitcase ? `
## From ${SUITCASE_FROM}: the Daily Suitcase

Each board hides the day's item (\`src/content/levels/suitcases.json\`;
[daily-suitcase.md](daily-suitcase.md)) as one of its squares, finished like
any picture; the stored line finishes it neither first nor last. Made under
today's rules: a 4x5 board of squares only, readable (a player who draws by the
face-up cards wins 85% or more), a safe start, current pictures only (no
landmark, none from before the clear pictures, none of trips 9 and 10's new
ones), no lookalikes, nothing busy 2 and at most one busy picture. The
pictures count includes the item. A survey of 4x5 square deals (2026-10-27,
200 seeds each): 8 or 9 squares at these targets are nearly always readable,
10 almost never.

The data (agreed with Gameplay, UI, Server and Art): a day's board carries
\`"item": { "id": "item-YYYY-MM-NN" }\` right after its size, the id one of its
own 2x2 pictures, whose files are in pictures.json \`items\`. The month's theme,
table, ten items and the item of each day are in \`suitcases.json\`
(\`node tools/levels/make-suitcases.mts\`, run before this maker). Each item comes
up 2 to 4 times a month, none has all its days within a week, and none comes
back within 3 days (\`tools/levels/suitcase.mts\`, seeded by the month alone).

${head}
${tableOf(SUITCASE_WEEK).join("\n")}
` : ""}
Every picture's appearances in the pool: ${Math.min(...counts)} to ${Math.max(...counts)} (mean ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}); no picture is on two boards within three days.
`;
writeFileSync(join(root, "docs/daily.md"), md);
console.log(`wrote ${FILE} (${levels.length} days, ${levels.length - pool.length} new) and docs/daily.md in ${((performance.now() - t0) / 1000).toFixed(1)} s; picture uses ${Math.min(...counts)}..${Math.max(...counts)}`);
