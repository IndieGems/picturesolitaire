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
import { random, replay } from "../../src/game/rules.ts";
import { generate } from "../../src/game/levels/generate.ts";
import { alikeOf, fits, pick, shapeOf } from "../../src/game/levels/pick.ts";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
/** PICTURES=<file> reads another catalogue (for trying a library out; never for shipping). */
const CATALOGUE = JSON.parse(readFileSync(process.env.PICTURES ?? join(root, "src/content/pictures.json"), "utf8"));
/**
 * DESTINATIONS (lead, 2026-10-25: the game is a travelogue): a board may have
 * one, a real place's postcard the size of the board, of which a crop window
 * plays as an ordinary picture. Art's catalogue holds them either in a list of
 * their own (`destinations`) or as `pictures` entries marked
 * "destination": true; both are read here, and NEITHER IS EVER DEALT AS A
 * LIBRARY PICTURE: `catalogue` (and so `usable`) leaves them out.
 */
export const destinations = [...(CATALOGUE.destinations ?? []), ...CATALOGUE.pictures.filter((p) => p.destination)];
export const destById = new Map(destinations.map((d) => [d.id, d]));
export const catalogue = CATALOGUE.pictures.filter((p) => !p.destination);
export const byId = new Map(catalogue.map((p) => [p.id, p]));

/**
 * A board's destination record: {"id", "crop": [col, row]}, the crop window's
 * top-left cell on the postcard, in the board's cells. The crop is Art's when
 * the catalogue entry has one (check.mts holds the board to it), else the
 * maker row's. The window plays as an ordinary picture of its shape
 * (destPicture: Art's `window`, [w, h] in cards, 2x2 on a board of squares,
 * 2x1 or 1x2 on an all-long one): the rules, solver and checker see nothing else.
 */
export function destinationOf(id, crop) {
  const d = destById.get(id);
  if (!d) throw new Error(`no destination ${id} in the catalogue`);
  const c = d.crop ?? crop;
  if (!c) throw new Error(`destination ${id}: no crop in the catalogue or the row`);
  return { id, crop: [...c] };
}
/** The destination's picture on the board: its crop window. */
export function destPicture(id) {
  const [cols, rows] = destById.get(id)?.window ?? [2, 2];
  return { id, cols, rows };
}
/** A picture's lookalike family, a postcard's included (Art gives a postcard its lookalike's). */
export const familyOf = (id) => (byId.get(id) ?? destById.get(id))?.family ?? id;

/**
 * A kept board given its row's destination IN PLACE (lead, 2026-10-25): the
 * postcard's window takes the spot of the row's `drop` picture in the board's
 * list, at the same shape, so the deal, line, par and every measure stay as
 * they are (dealFor deals by list position and shape; check.mts re-proves
 * it). A board that has its destination already takes only the crop. Throws
 * when the shapes differ (pick another drop).
 */
/**
 * A kept board with each landmark on it swapped IN PLACE for a usable picture
 * of the same shape (so the deal, line and measures stay as they are): unseen
 * first (spacedCost), calm before busy, never one the no-repeat rule bans on
 * board i, and only where the board still meets its row's picture rules (fits).
 */
export function swappedInPlace(b, i, chosen, row, rule) {
  if (!b.pictures.some((p) => isLandmark(p.id))) return b;
  const all = [...catalogue, ...destinations];
  const spec = { ...specOf(row), keep: undefined };
  const banned = rule ? bannedOn(chosen, i, rule) : new Set();
  const seen = rule ? spacedCost(chosen, i, rule.spacing) : new Map();
  const costOf = (r) => (seen.get(r.id) ?? 0) + (r.busy ?? 0);
  const pictures = [...b.pictures];
  for (const [k, p] of b.pictures.entries()) {
    if (!isLandmark(p.id)) continue;
    const cands = usable
      .filter((r) => r.cols === p.cols && r.rows === p.rows && !banned.has(r.id) && !pictures.some((q) => q.id === r.id))
      .sort((a, c) => costOf(a) - costOf(c) || (a.id < c.id ? -1 : 1));
    const r = cands.find((r) => fits(all, spec, pictures.map((q, j) => (j === k ? { id: r.id, cols: r.cols, rows: r.rows } : q))));
    if (!r) throw new Error(`${b.id}: no picture can take landmark ${p.id}'s place within the board's rules`);
    pictures[k] = { id: r.id, cols: r.cols, rows: r.rows };
  }
  return { ...b, pictures, ...(b.axes?.families ? { axes: { ...b.axes, families: pictures.map((q) => familyOf(q.id)) } } : {}) };
}

/** The board's pictures (indices) in the order its stored line finishes them. */
export function clearOrder(b) {
  const deal = { cols: b.cols, rows: b.rows, pictures: b.pictures, stacks: b.stacks, seed: b.seed };
  const order = [];
  for (let m = 1; m <= b.line.length; m++) for (const c of replay(deal, b.line.slice(0, m).map(([from, to]) => ({ from, to }))).cleared) if (!order.includes(c)) order.push(c);
  return order;
}

export function destinedInPlace(b, row) {
  if (!row?.destination) return b;
  const dest = destinationOf(row.destination, row.crop);
  if (b.destination?.id === dest.id) return withDestination(b, dest);
  const k = b.pictures.findIndex((p) => p.id === row.drop);
  if (k < 0) throw new Error(`${b.id}: the row drops ${row.drop}, which is not on the board`);
  const w = destPicture(dest.id);
  if (w.cols !== b.pictures[k].cols || w.rows !== b.pictures[k].rows) throw new Error(`${b.id}: ${dest.id}'s window is ${w.cols}x${w.rows}, ${row.drop} is ${b.pictures[k].cols}x${b.pictures[k].rows}; drop a picture of the window's shape`);
  const pictures = b.pictures.map((p, i) => (i === k ? w : p));
  return withDestination({ ...b, pictures, ...(b.axes?.families ? { axes: { ...b.axes, families: pictures.map((p) => familyOf(p.id)) } } : {}) }, dest);
}
/** The board with its destination record right after its size (one key order in every file). */
export function withDestination(board, dest) {
  const out = {};
  for (const [k, v] of Object.entries(board)) {
    if (k === "destination") continue;
    out[k] = v;
    if (k === "rows" && dest) out.destination = dest;
  }
  return out;
}

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
/**
 * Remakes (Art, 2026-10-25: the people pictures whose faces all tilt and smile
 * the same way, AGENTS.md "People never look AI-made"): when the old picture
 * is flagged, a board that used it takes its remake first, where it fits
 * (swapSets), so each board changes by that one picture.
 */
export const REMAKES = new Map([
  ["chef", "wok-chef"],
  ["cowboy", "fence-cowboy"],
  ["painter", "plein-air"],
  ["apple-orchard", "apple-ladder"],
  ["yellow-raincoat", "lobster-pot"],
  ["bubbles", "dandelion-wish"],
  ["greenhouse", "carrot-harvest"],
  ["canal-bicycle", "towpath-cyclist"],
  ["blue-headscarf", "book-reader"],
]);
/** A row's kept pictures, a flagged one's remake in its place (none flagged: the row's own list). */
export const keepOf = (row) => row.keep?.map((id) => (flags.has(id) && REMAKES.has(id) ? REMAKES.get(id) : id));
/** PICTURE_FLAGS=<file> reads another flags file (for trying the makers out). */
export const flags = readFlags(process.env.PICTURE_FLAGS ?? FLAGS);
/** The pictures a maker may put on a board: the catalogue less the flagged ones, in catalogue order. */
export let usable = catalogue.filter((p) => !flags.has(p.id));

/**
 * LANDMARKS (lead, 2026-10-25): an everyday picture of a real named landmark
 * (Art's "landmark": true) is saved for a future trip's destinations, so the
 * campaign keeps them all off its boards (check.mts). reserveLandmarks() takes
 * them out of `usable` for this run, which every picker here reads, and
 * route's `landmarks` swaps any on a kept board in place (swappedInPlace).
 */
export const isLandmark = (id) => !!byId.get(id)?.landmark;
export function reserveLandmarks() {
  usable = usable.filter((p) => !p.landmark);
}
export const flaggedOn = (pictures) => pictures.map((p) => p.id).filter((id) => flags.has(id));

/**
 * A kept board whose flagged pictures all have a remake of the same shape
 * (REMAKES), each remake in its old picture's place in the list: the deal, the
 * line, the par and every measure are unchanged (a card names its picture by
 * its place in the list, and the shapes in each place are the same), so only
 * the picture changes. null if a flagged picture has no such remake (the
 * maker then swaps it for another picture and deals the board again).
 */
export function remadeInPlace(b) {
  const ids = new Set(b.pictures.map((p) => p.id));
  const fams = new Set(b.pictures.map((p) => byId.get(p.id)?.family));
  const pictures = b.pictures.map((p) => {
    if (!flags.has(p.id)) return p;
    const r = byId.get(REMAKES.get(p.id));
    if (!r || flags.has(r.id) || ids.has(r.id) || fams.has(r.family) || r.cols !== p.cols || r.rows !== p.rows) return null;
    return { id: r.id, cols: r.cols, rows: r.rows };
  });
  if (pictures.includes(null)) return null;
  return { ...b, pictures, ...(b.axes?.families ? { axes: { ...b.axes, families: pictures.map((p) => byId.get(p.id).family) } } : {}) };
}

/** The boards in a boards file, [] if there is none. */
export const readBoards = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).levels : []);

export const specOf = (row) => ({ count: row.count, alike: row.alike, cards: row.cards, sizes: row.sizes, must: row.must, most: row.most, bigMost: row.bigMost, vary: row.vary, busyMost: row.busyMost, liveMost: row.liveMost, old: row.old, oldMost: row.oldMost, keep: keepOf(row) });

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

// ---------------------------------------------------------------- spacing
// SPACING (creator, 2026-10-24): in a route played in order (the campaign), a
// picture should not come back within `spacing` boards, and a picture the
// player has not met yet comes first. The picker ranks by spacedCost, and
// balanceSpaced then swaps pictures to lengthen the shortest gaps.

// PICTURES RARELY REPEAT (creator, 2026-10-25; AGENTS.md), a hard rule over
// the soft ranking above: no picture on two of the first `distinct` boards,
// and none back within `spacing` boards anywhere. A maker never puts a banned
// picture on a board it makes; when the library is too small for a board it
// stops and says so (more pictures are the answer, not a softer rule).

/** The pictures board i may not take: those on another board fewer than `spacing` boards away, and, for one of the first `distinct` boards, those on any other of them. */
export function bannedOn(chosen, i, { spacing, distinct = 0 }) {
  const out = new Set();
  chosen.forEach((set, k) => {
    if (k === i || !set) return;
    if (Math.abs(k - i) < spacing || (i < distinct && k < distinct)) for (const q of set) out.add(q.id);
  });
  return out;
}

/** The usable pictures board i may take under the rule (all of them with no rule). */
const catalogueAt = new Map(catalogue.map((p, k) => [p.id, k]));
/**
 * The pictures board i may take: the no-repeat rule's (bannedOn), and with the
 * row's `newFrom` (a catalogue id) only that picture and those after it in the
 * catalogue: a batch Art appended (lead, 2026-10-26: every picture on boards
 * 31-60 is from the creator's new batch, new to the player).
 */
const poolOn = (chosen, i, rule, row?) => {
  const from = row?.newFrom ? catalogueAt.get(row.newFrom) : undefined;
  if (row?.newFrom && from === undefined) throw new Error(`board ${i + 1}: newFrom ${row.newFrom} is not in the catalogue`);
  // newTo (the next batch's first id) not in the catalogue yet: that batch is not in, so nothing is cut
  const to = row?.newTo ? catalogueAt.get(row.newTo) ?? Infinity : Infinity;
  if (!rule && from === undefined) return usable;
  const banned = rule ? bannedOn(chosen, i, rule) : new Set();
  return usable.filter((p) => !banned.has(p.id) && (from === undefined || catalogueAt.get(p.id) >= from) && catalogueAt.get(p.id) < to);
};

/** Why a board under the rule found no pictures: how many of each size it may still take. */
const shortText = (plan, chosen, i, rule) => {
  const pool = poolOn(chosen, i, rule, plan[i]);
  const by = (n) => pool.filter((p) => p.cols * p.rows === n).length;
  return `board ${i + 1}: no pictures fit its plan row among those not on a board within ${rule.spacing}${i < rule.distinct ? ` or on boards 1-${rule.distinct}` : ""}${plan[i].newFrom ? ` and in the batch from ${plan[i].newFrom} on` : ""} (it may take ${plan[i].sizes.map((n) => `${by(n)} of ${n} cards`).join(", ")}); the library needs more pictures${flags.size ? " (flagged pictures are left out)" : ""}`;
};

/** Where each picture was last before board i, from boards 0..i-1. */
const lastSeen = (chosen, i) => {
  const last = new Map();
  for (let k = 0; k < i; k++) for (const q of chosen[k] ?? []) last.set(q.id, k);
  return last;
};

/** The picker's cost of each usable picture on board i: 0 never met, then the longer unseen the cheaper. */
export function spacedCost(chosen, i, spacing) {
  const last = lastSeen(chosen, i);
  const uses = usesOf(chosen.slice(0, i));
  return new Map(usable.map((p) => [p.id, last.has(p.id) ? 1 + Math.max(0, spacing - (i - last.get(p.id))) * 4 + uses.get(p.id) * 0.25 : 0]));
}

/** The boards each picture is on, in order. */
const boardsOf = (chosen) => {
  const at = new Map();
  chosen.forEach((set, k) => set?.forEach((q) => at.set(q.id, [...(at.get(q.id) ?? []), k])));
  return at;
};

/** How badly a picture's boards break the spacing: the square of each gap's shortfall, and a little for being used often. */
const gapCost = (list, spacing) => {
  let c = 0.1 * list.length ** 2;
  for (let k = 1; k < list.length; k++) c += Math.max(0, spacing - (list[k] - list[k - 1])) ** 2;
  return c;
};

/** The gaps between a picture's boards, every picture's, for the reader: shortest and how many fall short. */
export function spacingOf(chosen, spacing) {
  const gaps = [...boardsOf(chosen).values()].flatMap((l) => l.slice(1).map((k, j) => k - l[j]));
  gaps.sort((a, b) => a - b);
  return { shortest: gaps[0] ?? null, median: gaps[gaps.length >> 1] ?? null, short: gaps.filter((g) => g < spacing).length, gaps: gaps.length };
}

/**
 * Lengthen the short gaps of boards `from`..: swap a picture of a board for
 * another that still fits the board's plan, while that lowers the spacing
 * cost of the two pictures (gapCost).
 */
export function balanceSpaced(plan, chosen, from, spacing, rule?) {
  for (let sweep = 0; sweep < 40; sweep++) {
    let better = false;
    for (let i = from; i < chosen.length; i++) {
      for (let j = 0; j < chosen[i].length; j++) {
        const at = boardsOf(chosen);
        const out = chosen[i][j];
        if (keepOf(plan[i])?.includes(out.id)) continue;
        const outNow = at.get(out.id);
        const outCost = gapCost(outNow, spacing) - gapCost(outNow.filter((k) => k !== i), spacing);
        for (const cand of poolOn(chosen, i, rule, plan[i])) {
          if (chosen[i].some((q) => q.id === cand.id)) continue;
          const set = chosen[i].map((q, k) => (k === j ? { id: cand.id, cols: cand.cols, rows: cand.rows } : q));
          if (!fits(catalogue, specOf(plan[i]), set)) continue;
          const cNow = at.get(cand.id) ?? [];
          const candCost = gapCost([...cNow, i].sort((a, b) => a - b), spacing) - gapCost(cNow, spacing);
          if (candCost - outCost < -1e-9) {
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
 * Pictures for boards `from`.. of the plan (chosen[0..from-1] are the boards
 * kept): with `spacing`, by spacedCost (unmet first, then the longest
 * unseen); else least-used first and caught up on schedule. With `rule`
 * (bannedOn), only from the pictures the rule lets the board take.
 * `seedOf(i)` seeds board i's pick. Fills `chosen` in place.
 */
export function pickFrom(plan, chosen, from, seedOf, spacing?, rule?) {
  const uses = usesOf(chosen.slice(0, from));
  const slots = plan.slice(from).reduce((n, r) => n + r.count, 0);
  const plan0 = catchUp(uses, slots);
  let done = 0;
  for (let i = from; i < plan.length; i++) {
    const recent = new Set((chosen[i - 1] ?? []).map((q) => q.id));
    const base = spacing ? spacedCost(chosen, i, spacing) : onSchedule(uses, plan0, done / Math.max(1, slots));
    // a picture the row limits (old) stands in only where the others run out; calm a little before busy
    const cost = new Map([...base].map(([id, v]) => [id, v + (plan[i].old?.has(id) && plan[i].oldMost ? 3 : 0) + ((byId.get(id)?.busy ?? 0) >= 1 ? 0.5 : 0)]));
    // strong costs leave the picker little room; when no set fits, soften them before giving up
    let pictures = null;
    const pool = poolOn(chosen, i, rule, plan[i]);
    for (const k of [1, 0.5, 0.25, 0]) {
      pictures = pick(pool, specOf(plan[i]), k === 1 ? cost : new Map([...cost].map(([id, v]) => [id, v * k])), recent, random(seedOf(i)));
      if (pictures) break;
    }
    if (!pictures) throw new Error(rule ? shortText(plan, chosen, i, rule) : `board ${i + 1}: no pictures fit the plan${flags.size ? " (flagged pictures are left out)" : ""}`);
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
const remakeFirst = (old, a, b) => (REMAKES.get(old) === a ? -1 : 0) - (REMAKES.get(old) === b ? -1 : 0);
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
      .sort((a, b) => remakeFirst(set[j].id, a.c.id, b.c.id) || (uses.get(a.c.id) ?? 0) + near(a.c.id) - ((uses.get(b.c.id) ?? 0) + near(b.c.id)) || (a.c.id < b.c.id ? -1 : 1))
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
export function dealBoard(row, pictures, { id, date, cols, rows, par, tries = 3000, extra, safeFirstMove = false, from = 1 }) {
  // the deal is shuffled from the pictures in a fixed order, so it does not hang on how they were picked
  pictures = [...pictures].sort((a, b) => (a.id < b.id ? -1 : 1));
  const targets = { chain: row.chain, careless: row.careless, traps: row.traps, bigWait: row.bigWait, orderTraps: row.orderTraps };
  const spec = { id, cols, rows, pictures, targets, par, safeFirstMove };
  const tally = new Map();
  const made = generate(spec, from, tries, tally);
  if (!made) return { board: null, tally };
  const m = made.measures;
  const axes = {
    role: row.role,
    alike: alikeOf(catalogue, pictures),
    families: pictures.map((p) => familyOf(p.id)),
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
  // `poolOf(i)`: the pictures a re-pick may take (the no-repeat rule), else every usable one
  const { id, reseedOf, attempts = 12, vary = false, first, seenOf, poolOf } = opts;
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
      // `seenOf(i)`: the costs a re-pick ranks by (spacing), else the uses
      const base = seenOf ? seenOf(i) : uses;
      const seen = vary ? new Map([...base].map(([k, v]) => [k, v + (failed.get(k) ?? 0)])) : base;
      const pictures = pick(poolOf ? poolOf(i) : usable, specOf(row), seen, new Set([...(chosen[i - 1] ?? []), ...(chosen[i + 1] ?? [])].map((q) => q.id)), random(reseedOf(i, attempt - sets.length + 1)));
      for (const q of own) uses.set(q.id, uses.get(q.id) + 1);
      if (!pictures) throw new Error(`${id}: no other pictures fit the plan${poolOf ? " under the no-repeat rule (the library needs more pictures)" : ""}${flags.size ? " (flagged pictures are left out)" : ""}`);
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
 * Re-deal board i, which has a destination (lead, 2026-10-27: hard boards and
 * finales grown to 5x5): it KEEPS its library pictures and its destination,
 * whose window joins the deal as an ordinary picture (no drop: the window is
 * dealt from the start, at the catalogue's crop), and takes the row's count
 * with new pictures, only from catalogue id `row.addFrom` on (a batch nobody
 * has met) and only those the no-repeat rule allows. A set that finds no deal
 * on the row's targets gives way to other new pictures; the kept ones stay.
 */
function redealDestined(plan, i, b, chosen, uses, rule, opts, seed) {
  const row = plan[i];
  const dest = destinationOf(row.destination, row.crop);
  const w = destPicture(dest.id);
  const keep = b.pictures.filter((p) => p.id !== dest.id && !destById.has(p.id) && !flags.has(p.id)).map((p) => p.id);
  if (!row.addFrom) throw new Error(`${b.id}: re-dealing a board with a destination needs the row's addFrom (the batch its new pictures come from)`);
  // never a lookalike of the postcard (check.mts): Art gives a postcard its lookalike's family
  const fam = destById.get(dest.id)?.family ?? dest.id;
  const fresh = poolOn(chosen, i, rule, { newFrom: row.addFrom }).filter((p) => (p.family ?? p.id) !== fam);
  const pool = [...keep.map((id) => byId.get(id)), ...fresh.filter((p) => !keep.includes(p.id))];
  const n = row.count - 1;
  const spec = { ...specOf(row), count: n, cards: [n * 4, n * 4], keep };
  if (n - keep.length < 0) throw new Error(`${b.id}: keeps ${keep.length} pictures, more than its row's ${row.count} less the window`);
  const base = rule ? spacedCost(chosen, i, rule.spacing) : uses;
  const failed = new Map();
  console.log(`${b.id}: re-dealing it at ${opts.cols}x${opts.rows}, keeping its ${keep.length} pictures and ${dest.id}, ${n - keep.length} new from ${row.addFrom} on`);
  for (let attempt = 0; attempt < 12; attempt++) {
    const cost = new Map(pool.map((p) => [p.id, (base.get(p.id) ?? 0) + (p.busy ?? 0) * 2 + (failed.get(p.id) ?? 0)]));
    const set = pick(pool, spec, cost, new Set(), random((seed + attempt * 104729) >>> 0));
    if (!set) throw new Error(`${b.id}: no new pictures fit its row with the ones it keeps (${fresh.length} new from ${row.addFrom} the no-repeat rule allows); the batch needs more`);
    const pictures = [...set, w];
    // the postcard opens mid-board on the proved line, as on every destined board (never its first
    // or last clear): a deal that clears it first or last gives way to the next seed
    let { board, tally } = dealBoard(row, pictures, opts);
    for (let again = 0; board && again < 20; again++) {
      const order = clearOrder(board), at = order.indexOf(board.pictures.findIndex((p) => p.id === dest.id));
      if (at > 0 && at < order.length - 1) break;
      console.log(`${b.id}: the postcard is the ${at ? "last" : "first"} clear on seed ${board.seed}'s line; the next seed`);
      ({ board, tally } = dealBoard(row, pictures, { ...opts, from: board.seed + 1, tries: 3000 - board.seed }));
    }
    if (board) {
      for (const q of pictures) uses.set(q.id, (uses.get(q.id) ?? 0) + 1);
      chosen[i] = pictures;
      return withDestination(board, dest);
    }
    for (const q of set) if (!keep.includes(q.id)) failed.set(q.id, (failed.get(q.id) ?? 0) + 3);
    console.log(`${b.id}: pictures set ${attempt} found no deal (${tallyText(tally)})`);
  }
  throw new Error(`${b.id}: no deal meets its row with the pictures it keeps; loosen the row`);
}

/**
 * The boards of a route: keep the boards already made (`old`), re-deal those
 * that use a flagged picture (same id and place in the plan, as few pictures
 * changed as can be), and make the plan's rows past the end. `optsOf(i)` gives
 * makeBoard's options for board i; `seedOf(i)` seeds a new board's pick.
 */
export function route(plan, old, { optsOf, seedOf, spacing, distinct = 0, repairOnly = false, redeal = new Set(), landmarks = false }) {
  if (old.length > plan.length) throw new Error(`the file has ${old.length} boards, the plan ${plan.length}`);
  const chosen = old.map((b) => b.pictures);
  // peek is no part of the deal (dealFor), so a kept board takes its row's peek with its deal and line
  // unchanged (2026-10-25: every stack shows card backs, peek 0); check.mts re-proves it
  const levels = old.map((b, i) => (plan[i] && b.peek !== plan[i].peek ? { ...b, peek: plan[i].peek, ...(b.axes ? { axes: { ...b.axes, peek: plan[i].peek } } : {}) } : b));
  // a row's destination goes in at its dropped picture's spot, before the flagged pictures are seen to
  // (a dropped picture may be one of them): the deal and line unchanged (destinedInPlace)
  levels.forEach((b, i) => {
    const d = destinedInPlace(b, plan[i]);
    if (d === b) return;
    if (b.destination?.id !== d.destination.id) console.log(`${b.id}: ${d.destination.id} in place of ${plan[i].drop}; the deal and line unchanged`);
    levels[i] = d;
    chosen[i] = d.pictures;
  });
  // with spacing, the no-repeat rule holds on every board this makes (bannedOn)
  const rule = spacing ? { spacing, distinct } : undefined;
  // then the landmarks left on kept boards (the campaign's; reserveLandmarks), each in place
  if (landmarks)
    levels.forEach((b, i) => {
      const d = swappedInPlace(b, i, chosen, plan[i] ?? {}, rule);
      if (d === b) return;
      console.log(`${b.id}: ${b.pictures.map((p, k) => (p.id !== d.pictures[k].id ? `${p.id} -> ${d.pictures[k].id}` : "")).filter(Boolean).join(", ")} in place (landmarks wait for their trips); the deal and line unchanged`);
      levels[i] = d;
      chosen[i] = d.pictures;
    });
  const uses = usesOf(chosen);
  const poolOf = rule ? (i) => poolOn(chosen, i, rule, plan[i]) : undefined;
  // with spacing, a swap's nearness is the gap it would make (1000: the rule bans it)
  const near = spacing
    ? (i, id) => (bannedOn(chosen, i, rule).has(id) ? 1000 : 0) + chosen.reduce((n, set, k) => n + (k !== i && set?.some((q) => q.id === id) ? Math.max(0, spacing - Math.abs(k - i)) : 0), 0)
    : nearOf(chosen);
  const seenOf = spacing ? (i) => spacedCost(chosen, i, spacing) : undefined;
  old.forEach((_, i) => {
    const b = levels[i];
    const bad = flaggedOn(b.pictures);
    if (!bad.length) return;
    const same = remadeInPlace(levels[i]);
    if (same) {
      console.log(`${b.id}: ${bad.map((id) => `${id} -> ${REMAKES.get(id)}`).join(", ")} in place; the deal and line unchanged`);
      for (const q of b.pictures) uses.set(q.id, uses.get(q.id) - 1);
      for (const q of same.pictures) uses.set(q.id, (uses.get(q.id) ?? 0) + 1);
      chosen[i] = same.pictures;
      levels[i] = same;
      return;
    }
    if (plan[i]?.destination) throw new Error(`${b.id}: uses flagged ${bad.join(", ")}, and the makers cannot re-deal a board with a destination yet; drop the flagged picture for it, or swap it by hand in the plan`);
    console.log(`${b.id}: uses flagged ${bad.join(", ")}; re-dealing it`);
    for (const q of b.pictures) uses.set(q.id, uses.get(q.id) - 1);
    chosen[i] = null;
    // no swap that fits: makeBoard picks the board afresh
    levels[i] = makeBoard(plan, i, chosen, uses, { ...optsOf(i), seenOf, poolOf, first: swapSets(specOf(plan[i]), b.pictures, uses, (id) => near(i, id)) });
  });
  // boards asked for by number (from 0): picked afresh from the plan's row, every other board kept;
  // their old pictures are let go first, so they bind none of the boards being re-dealt
  const again = [...redeal].sort((a, b) => a - b);
  for (const i of again) {
    if (!old[i]) throw new Error(`board ${i + 1} is not in the file`);
    for (const q of old[i].pictures) uses.set(q.id, uses.get(q.id) - 1);
    chosen[i] = null;
  }
  for (const i of again) {
    if (plan[i].destination) {
      levels[i] = redealDestined(plan, i, old[i], chosen, uses, rule, optsOf(i), seedOf(i));
      continue;
    }
    console.log(`${old[i].id}: re-dealing it from the plan`);
    // with spacing: unseen first, then the longest unseen (spacedCost), and nothing the rule bans;
    // without: not near it. Then calm before busy, and new before a picture the row limits (old)
    const base = spacing ? spacedCost(chosen, i, spacing) : new Map(usable.map((p) => [p.id, near(i, p.id)]));
    // (with liveMost, a row's cap spreads the lively pictures: a strong lean against busy 1 would only
    // save them all for the last board, which then cannot be filled; busy 1 does not lean at all)
    const lean = (b) => (plan[i].liveMost !== undefined ? [0, 0, 4][b] : b * 2);
    const cost = new Map(usable.map((p) => [p.id, base.get(p.id) + lean(p.busy ?? 0) + (plan[i].old?.has(p.id) ? 2 : 0)]));
    const recent = new Set([...(chosen[i - 1] ?? []), ...(chosen[i + 1] ?? [])].map((q) => q.id));
    const set = pick(poolOf ? poolOf(i) : usable, specOf(plan[i]), cost, recent, random(seedOf(i)));
    if (!set) throw new Error(rule ? shortText(plan, chosen, i, rule) : `${old[i].id}: no pictures fit the plan${flags.size ? " (flagged pictures are left out)" : ""}`);
    levels[i] = makeBoard(plan, i, chosen, uses, { ...optsOf(i), seenOf: spacing ? () => cost : undefined, poolOf, first: [set] });
  }
  if (plan.length > old.length && !repairOnly) {
    // a row's kept pictures (keep) are its own from the start, so no board before it takes them
    for (let i = old.length; i < plan.length; i++) if (plan[i].keep) chosen[i] = keepOf(plan[i]).filter((id) => byId.has(id) && !flags.has(id)).map((id) => ({ id, cols: byId.get(id).cols, rows: byId.get(id).rows }));
    pickFrom(plan, chosen, old.length, seedOf, spacing, rule);
    if (spacing) balanceSpaced(plan, chosen, old.length, spacing, rule);
    else balance(plan, chosen, old.length);
    if (process.env.PICKS_ONLY) return { picks: chosen };
    const u = usesOf(chosen);
    for (let i = old.length; i < plan.length; i++) levels[i] = makeBoard(plan, i, chosen, u, { ...optsOf(i), seenOf, poolOf });
  }
  return levels;
}

/** The most moves a lesson board may take after its staged helper (make-lessons.mts; check.mts holds it). */
export const LESSON_MOVES = 8;

/** Write a boards file: one board a line, so a diff shows which boards changed. */
export function writeBoards(file, note, levels, extra = {}) {
  mkdirSync(dirname(file), { recursive: true });
  const json = JSON.stringify({ v: 2, board: note, ...extra, levels })
    .replace(/\{"id":"([^"]+)","(peek|date)":/g, '\n{"id":"$1","$2":')
    .replace(/\]\}$/, "\n]}");
  // unchanged (git may have checked it out with CRLF): leave it, so the level files stay clean
  if (existsSync(file) && readFileSync(file, "utf8").replace(/\r\n/g, "\n") === json + "\n") return;
  writeFileSync(file, json + "\n");
}

export const famName = (f) => f.replace(/-/g, " ");
export const lookalikes = (l) => {
  const n = new Map();
  for (const f of l.axes.families) n.set(f, (n.get(f) ?? 0) + 1);
  const groups = [...n].filter(([, k]) => k > 1).sort((a, b) => b[1] - a[1]);
  return groups.length ? groups.map(([f, k]) => `${k} ${famName(f)}`).join(", ") : "none";
};
