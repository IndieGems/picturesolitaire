// What the level makers share (make-campaign.mts, make-challenge.mts,
// make-daily.mts): picking each board's pictures evenly, evening the picks
// out, generating and proving a deal per board, and writing the boards file.
// Deterministic: the same plan, seeds, catalogue and flags give the same boards.
//
// A SHIPPED BOARD IS KEPT. The makers read the boards file and keep every board
// in it; they make only plan rows past its end, and re-deal only the boards
// that use a picture the creator flagged "don't use" (picture-flags.json).
// So adding boards or flagging a picture leaves every other board
// byte-identical. To remake a file from scratch, delete it first.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { random } from "../../src/game/rules.ts";
import { generate } from "../../src/game/levels/generate.ts";
import { alikeOf, fits, pick, shapeOf } from "../../src/game/levels/pick.ts";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const catalogue = JSON.parse(readFileSync(join(root, "src/content/pictures.json"), "utf8")).pictures;
export const byId = new Map(catalogue.map((p) => [p.id, p]));

// ---------------------------------------------------------------- flagged pictures
/**
 * The pictures the creator flagged "don't use", from the Picture Library
 * editor's file (agreed with UI):
 *   {"v":1,"pictures":{"<catalogue id>":{"flagged":true,"note":"...","date":"YYYY-MM-DD"}}}
 * Only flagged === true counts (un-flagging keeps the entry with false); no
 * file flags nothing. check.mts fails any board that uses one.
 */
export const FLAGS = join(root, "src/content/picture-flags.json");
export function readFlags(file = FLAGS): Map<string, { note?: string; date?: string }> {
  const out = new Map();
  if (!existsSync(file)) return out;
  for (const [id, f] of Object.entries(JSON.parse(readFileSync(file, "utf8")).pictures ?? {})) if (f?.flagged === true) out.set(id, f);
  return out;
}
/** PICTURE_FLAGS=<file> reads another flags file (for trying the makers out). */
export const flags = readFlags(process.env.PICTURE_FLAGS ?? FLAGS);
/** The pictures a maker may put on a board: the catalogue less the flagged ones, in catalogue order. */
export const usable = catalogue.filter((p) => !flags.has(p.id));
export const flaggedOn = (pictures) => pictures.map((p) => p.id).filter((id) => flags.has(id));

/** The boards in a boards file, [] if there is none. */
export const readBoards = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).levels : []);

export const specOf = (row) => ({ count: row.count, alike: row.alike, cards: row.cards, sizes: row.sizes, must: row.must, most: row.most });

export const usesOf = (chosen) => {
  const u = new Map(catalogue.map((q) => [q.id, 0]));
  for (const set of chosen) for (const q of set ?? []) u.set(q.id, (u.get(q.id) ?? 0) + 1);
  return u;
};

// ---------------------------------------------------------------- evening the library out
/**
 * How many more boards each usable picture should be on over the next `slots`
 * picture slots for every picture to end on the same count ("water-filling"
 * from `uses`): the least-used, such as pictures new to the catalogue, get the
 * most. Read with onSchedule().
 */
export function catchUp(uses, slots) {
  const start = new Map(usable.map((p) => [p.id, uses.get(p.id) ?? 0]));
  const s = [...start.values()].sort((a, b) => a - b);
  let level = s[0] ?? 0;
  for (let k = 1, sum = 0; k <= s.length; k++) {
    sum += s[k - 1];
    level = (slots + sum) / k;
    if (k === s.length || level <= s[k]) break;
  }
  return { start, extra: new Map([...start].map(([id, v]) => [id, Math.max(0, level - v)])) };
}

/**
 * The uses a picker should rank by when `progress` (0..1) of a catch-up is
 * done: a picture's uses less where its catch-up schedule says it should be by
 * now, so the least-used pictures come in steadily over the whole run of
 * boards instead of all at its start. Pictures that started level are ranked
 * by their plain uses (a run from scratch picks exactly as without it).
 */
export function onSchedule(uses, plan, progress) {
  const minS = Math.min(...plan.start.values());
  const minE = Math.min(...plan.extra.values());
  const w = new Map(uses);
  for (const [id, s] of plan.start) w.set(id, (uses.get(id) ?? 0) - (s - minS) - (plan.extra.get(id) - minE) * progress);
  const low = Math.min(0, ...w.values());
  if (low < 0) for (const [id, v] of w) w.set(id, v - low);
  return w;
}

/**
 * Pictures for boards `from`.. of the plan (chosen[0..from-1] are the boards
 * kept), least-used first and caught up on schedule; `seedOf(i)` seeds board
 * i's pick. Fills `chosen` in place.
 */
export function pickFrom(plan, chosen, from, seedOf) {
  const uses = usesOf(chosen.slice(0, from));
  const slots = plan.slice(from).reduce((n, r) => n + r.count, 0);
  const plan0 = catchUp(uses, slots);
  let done = 0;
  for (let i = from; i < plan.length; i++) {
    const recent = new Set((chosen[i - 1] ?? []).map((q) => q.id));
    const pictures = pick(usable, specOf(plan[i]), onSchedule(uses, plan0, done / Math.max(1, slots)), recent, random(seedOf(i)));
    if (!pictures) throw new Error(`board ${i + 1}: no pictures fit the plan${flags.size ? " (flagged pictures are left out)" : ""}`);
    for (const q of pictures) uses.set(q.id, (uses.get(q.id) ?? 0) + 1);
    chosen[i] = pictures;
    done += plan[i].count;
  }
  return chosen;
}

/** How near picture `id` is to board i: 3 for each board beside it that has it, 1 for each two away. */
export const nearOf = (chosen) => (i, id) =>
  [i - 1, i + 1].filter((k) => chosen[k]?.some((q) => q.id === id)).length * 3 + [i - 2, i + 2].filter((k) => chosen[k]?.some((q) => q.id === id)).length;

/**
 * Even the picks of boards `from`.. out: swap a picture of a board for another
 * that still fits the board's plan, while that brings the picture counts
 * (every board's) closer together and keeps the same picture off boards next
 * to each other.
 */
export function balance(plan, chosen, from = 0) {
  const near = nearOf(chosen);
  for (let sweep = 0; sweep < 60; sweep++) {
    let better = false;
    for (let i = from; i < chosen.length; i++) {
      for (let j = 0; j < chosen[i].length; j++) {
        const u = usesOf(chosen);
        const out = chosen[i][j];
        for (const cand of usable) {
          if (chosen[i].some((q) => q.id === cand.id)) continue;
          const set = chosen[i].map((q, k) => (k === j ? { id: cand.id, cols: cand.cols, rows: cand.rows } : q));
          if (!fits(catalogue, specOf(plan[i]), set)) continue;
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
  return chosen;
}

/**
 * Picture sets for a board that uses flagged pictures, best first: the
 * board's other pictures kept, each flagged one swapped for a usable picture
 * so that the set still fits `spec` (least used first, then furthest from
 * the boards beside it, by `near`; a picture `near` puts at 1000 or more is
 * never taken). At most `max` sets; [] if no swap fits, and the maker then
 * picks the board afresh.
 */
export function swapSets(spec, pictures, uses, near, max = 6) {
  const out = [];
  const go = (set) => {
    if (out.length >= max) return;
    const j = set.findIndex((q) => flags.has(q.id));
    if (j < 0) return void out.push(set);
    const cands = usable
      .filter((c) => !set.some((q) => q.id === c.id) && near(c.id) < 1000)
      .map((c) => ({ c, set: set.map((q, k) => (k === j ? { id: c.id, cols: c.cols, rows: c.rows } : q)) }))
      .filter((x) => fits(catalogue, spec, x.set))
      .sort((a, b) => (uses.get(a.c.id) ?? 0) + near(a.c.id) - ((uses.get(b.c.id) ?? 0) + near(b.c.id)) || (a.c.id < b.c.id ? -1 : 1))
      .slice(0, 3);
    for (const x of cands) go(x.set);
  };
  go(pictures);
  return out;
}

// ---------------------------------------------------------------- one board
/**
 * Generate and prove a deal for one set of pictures, on target on every axis
 * of the plan's row: the board's record for the boards file, or null (with
 * the tally of why not) when `tries` seeds find none.
 */
export function dealBoard(row, pictures, { id, date, cols, rows, par, tries = 3000, extra, safeFirstMove = false }) {
  // the deal is shuffled from the pictures in a fixed order, so it does not hang on how they were picked
  pictures = [...pictures].sort((a, b) => (a.id < b.id ? -1 : 1));
  const targets = { chain: row.chain, careless: row.careless, bigWait: row.bigWait, orderTraps: row.orderTraps };
  const spec = { id, cols, rows, pictures, targets, par, safeFirstMove };
  const tally = new Map();
  const made = generate(spec, 1, tries, tally);
  if (!made) return { board: null, tally };
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
    ...(extra ? { bigWait: m.bigWait, orderTraps: m.orderTraps, lineOrderTraps: m.lineOrderTraps } : {}),
    lineMoves: made.line.length,
    lineSteps: made.steps.length,
  };
  const board = { id, ...(date ? { date } : {}), peek: row.peek, cols, rows, seed: made.seed, pictures, stacks: made.deal.stacks, line: made.line.map((mv) => [mv.from, mv.to]) };
  if (par) board.par = made.line.length;
  board.axes = axes;
  const extraNote = extra ? ` bigWait ${m.bigWait} orderTraps ${m.orderTraps}` : "";
  console.log(`${id} ${String(row.role).padEnd(6)} ${cols}x${rows} ${pictures.length} pics ${String(axes.cards).padStart(2)} cards (${String(m.waiting).padStart(2)} waiting) alike ${JSON.stringify(axes.alike).padEnd(7)} peek ${row.peek} chain ${m.chain} careless ${(m.careless * 100).toFixed(0).padStart(3)}% traps ${m.traps}${extraNote} line ${made.line.length} moves, seed ${made.seed}`);
  return { board, tally };
}

export const tallyText = (tally) => [...tally].map(([k, v]) => `${k} ${v}`).join(", ");

/**
 * A proved deal for board i of the plan, on target on every axis: from each
 * set in `first` in turn (default: the pictures chosen for it), else from
 * another set of pictures picked with `reseedOf(i, attempt)` (the plan's row
 * decides the rest). Updates `chosen` and `uses`. Returns the board's record.
 */
export function makeBoard(plan, i, chosen, uses, opts) {
  const { id, reseedOf, attempts = 12, vary = false, first } = opts;
  const row = plan[i];
  const take = (set) => {
    for (const q of chosen[i] ?? []) uses.set(q.id, uses.get(q.id) - 1);
    chosen[i] = set;
    for (const q of set) uses.set(q.id, (uses.get(q.id) ?? 0) + 1);
  };
  // with `vary`, pictures of sets that found no deal count as used more, so the next pick differs
  const failed = new Map<string, number>();
  const sets = first ?? (chosen[i] ? [chosen[i]] : []);
  for (let attempt = 0; attempt < sets.length + attempts - 1; attempt++) {
    if (attempt < sets.length) take(sets[attempt]);
    else {
      // these pictures yield no deal on target: pick another set for the board
      const own = chosen[i] ?? [];
      for (const q of own) uses.set(q.id, uses.get(q.id) - 1);
      const seen = vary ? new Map([...uses].map(([k, v]) => [k, v + (failed.get(k) ?? 0)])) : uses;
      const pictures = pick(usable, specOf(row), seen, new Set([...(chosen[i - 1] ?? []), ...(chosen[i + 1] ?? [])].map((q) => q.id)), random(reseedOf(i, attempt - sets.length + 1)));
      for (const q of own) uses.set(q.id, uses.get(q.id) + 1);
      if (!pictures) throw new Error(`${id}: no pictures fit the plan${flags.size ? " (flagged pictures are left out)" : ""}`);
      take(pictures);
    }
    const { board, tally } = dealBoard(row, chosen[i], opts);
    if (board) return board;
    for (const q of chosen[i]) failed.set(q.id, (failed.get(q.id) ?? 0) + 1);
    console.log(`${id}: pictures set ${attempt} found no deal (${tallyText(tally)})`);
  }
  throw new Error(`${id}: no deal meets the plan; loosen its row`);
}

/**
 * The boards of a route: keep the boards already made (`old`), re-deal those
 * that use a flagged picture (same id and place in the plan, as few pictures
 * changed as can be), and make the plan's rows past the end. `optsOf(i)` gives
 * makeBoard's options for board i; `seedOf(i)` seeds a new board's pick.
 */
export function route(plan, old, { optsOf, seedOf }) {
  if (old.length > plan.length) throw new Error(`the file has ${old.length} boards, the plan ${plan.length}`);
  const chosen = old.map((b) => b.pictures);
  const levels = [...old];
  const uses = usesOf(chosen);
  const near = nearOf(chosen);
  old.forEach((b, i) => {
    const bad = flaggedOn(b.pictures);
    if (!bad.length) return;
    console.log(`${b.id}: uses flagged ${bad.join(", ")}; re-dealing it`);
    for (const q of b.pictures) uses.set(q.id, uses.get(q.id) - 1);
    chosen[i] = null;
    // no swap that fits: makeBoard picks the board afresh
    levels[i] = makeBoard(plan, i, chosen, uses, { ...optsOf(i), first: swapSets(specOf(plan[i]), b.pictures, uses, (id) => near(i, id)) });
  });
  if (plan.length > old.length) {
    pickFrom(plan, chosen, old.length, seedOf);
    balance(plan, chosen, old.length);
    const u = usesOf(chosen);
    for (let i = old.length; i < plan.length; i++) levels[i] = makeBoard(plan, i, chosen, u, optsOf(i));
  }
  return levels;
}

/** Write a boards file: one board a line, so a diff shows which boards changed. */
export function writeBoards(file, note, levels, extra = {}) {
  mkdirSync(dirname(file), { recursive: true });
  const json = JSON.stringify({ v: 2, board: note, ...extra, levels })
    .replace(/\{"id":"([^"]+)","(peek|date)":/g, '\n{"id":"$1","$2":')
    .replace(/\]\}$/, "\n]}");
  writeFileSync(file, json + "\n");
}

export const famName = (f) => f.replace(/-/g, " ");
export const lookalikes = (l) => {
  const n = new Map();
  for (const f of l.axes.families) n.set(f, (n.get(f) ?? 0) + 1);
  const groups = [...n].filter(([, k]) => k > 1).sort((a, b) => b[1] - a[1]);
  return groups.length ? groups.map(([f, k]) => `${k} ${famName(f)}`).join(", ") : "none";
};
