// SWAP-IN: a batch of Art's new pictures goes into levels that are already made, one picture a level,
// each IN PLACE of a clear picture of its shape, so every level keeps its deal, line, par and measures
// (dealFor deals by list position and shape; check.mts re-proves it). First batch: the 60 pen-and-ink
// pictures (creator, 2026-10-29, via the lead and Art b8c92e6): the campaign 1-150 and the challenge
// route, no daily (check.mts keeps pictures new to the catalogue out of them).
// Run: node tools/levels/swap-in.mts <batch> [--after <id>] [--medium <medium>] [--dry]
//      node tools/levels/swap-in.mts <batch> --pairs <file> [--dry]   (PAIRS, below)
//   <batch>       the batch's name in the record (ink)
//   --after ID    the batch: catalogue pictures after ID that are on no level and not flagged ...
//   --medium M    ... and of that medium (ink); at least one of the two
//   --dry         say what it would do, write nothing
// Then node tools/levels/make-campaign.mts and make-challenge.mts (they keep every level and rewrite
// their docs), and node tools/levels/check.mts.
//
// Where they go: each lane takes its share of the batch by how many levels it has that can take one
// (campaign: from board 3, the guided start and the Undo lesson take none, nor an all-long board without
// the shape), at evenly spaced levels; a level no picture fits passes its turn to the next one. The
// pictures go in a hash order, so subjects mix along the route.
// What gives way, on each level: a clear picture of the shape, never the destination's window, an
// atmospheric one, a people picture (lead, 2026-10-29: those wait for the people swap, one for one) or
// one of the early pictures (campaign-plan.mts CURRENT); one on no other campaign board first (so it is
// freed for trip 11 on), then the busiest, then a hash. The new picture has no
// family or word in common with the level's other pictures (destination and atmospheric ones included),
// is within the row's caps on lively and busy pictures (on the challenge route, which has no rows to hold
// them, no busier than what it replaces),
// keeps its album within a third and its medium within half of the level, and leaves any atmospheric
// picture on the level within those too (so atmospheric.mts keeps it on a re-run); on a campaign board
// the row's picture rules hold as well (lib.mts fitsBeside, which also keeps the row's old pictures).
// PAIRS (creator, 2026-10-29: the people swap; Art's tools/art/people-swaps.json, `swaps` of {old, new}):
// each old picture gives way to its new one, of the same shape, on every campaign and challenge level it
// is on (a daily keeps it: check.mts keeps pictures new to the catalogue out of the dailies from
// RULES_FROM), so its levels and their spacing are the old one's. A pair is skipped whole where the new
// picture is flagged or not the old one's shape; on one level, where the new one has a family or word in
// common with the level's other pictures, would put a second atmospheric picture on it, or misses the
// level's picture rules (lib.mts fitsBeside where the level meets its row, else looseFits), but for a
// brought-back picture of trips 9 and 10 giving way, which lowers that level's minimum (lead). The olds stay
// in the library, and are no preferred stock for trip 11 (they are the framings the swap moved off).
// The record, tools/levels/swap-ins.json: each batch's swaps, `displaced` and `freed` (displaced and on
// no campaign board now), which campaign-plan.mts FREED adds to trip 11's stock. Deterministic.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashId } from "../../src/game/levels/generate.ts";
import { byId, catalogue, destById, destinations, fitsBeside, flags, looseFits, root, sameWord, specOf, wordsOf, writeBoards } from "./lib.mts";
import { CURRENT, PLAN } from "./campaign-plan.mts";
import { isAtmospheric } from "./atmospheric.mts";

const arg = (name) => {
  const k = process.argv.indexOf(name);
  return k > 0 ? process.argv[k + 1] : undefined;
};
const batch = process.argv[2];
const after = arg("--after");
const medium = arg("--medium");
const pairsFile = arg("--pairs");
const dry = process.argv.includes("--dry");
if (!batch || batch.startsWith("--") || !(after || medium || pairsFile)) throw new Error("usage: node tools/levels/swap-in.mts <batch> [--after <id>] [--medium <medium>] | --pairs <file> [--dry]");

const dir = join(root, "src/content/levels");
const RECORD = join(root, "tools/levels/swap-ins.json");
const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
const campaignData = read("campaign.json");
const challengeData = read("challenge.json");
// the challenge route first: it has fewer places that can take one
const lanes = [
  { name: "challenge", file: "challenge.json", data: challengeData, levels: challengeData.levels.map((l) => l), first: 0, row: () => null },
  { name: "campaign", file: "campaign.json", data: campaignData, levels: campaignData.levels.map((l) => l), first: 2, row: (i) => PLAN[i] },
];
const onLevels = new Set(["campaign.json", "challenge.json", "daily.json", "experiments.json", "lessons.json", "souvenirs.json"].flatMap((f) => (existsSync(join(dir, f)) ? read(f).levels.flatMap((l) => l.pictures.map((p) => p.id)) : [])));
const entryOf = (id) => byId.get(id) ?? destById.get(id) ?? { id };
const fam = (e) => e.family ?? e.id;
const all = [...catalogue, ...destinations];
if (pairsFile) {
  swapPairs();
  process.exit(0);
}
const at = after ? catalogue.findIndex((p) => p.id === after) : -1;
if (after && at < 0) throw new Error(`--after ${after}: no such picture in the catalogue`);
const pictures = catalogue.slice(at + 1).filter((p) => (!medium || p.medium === medium) && !flags.has(p.id) && !onLevels.has(p.id) && !p.landmark && !isAtmospheric(p));
if (!pictures.length) throw new Error("no picture of the batch is off every level: nothing to swap in");
const batchIds = new Set(pictures.map((p) => p.id));
const order = [...pictures].sort((a, b) => hashId(`${batch}:${a.id}`) - hashId(`${batch}:${b.id}`));

const campaignUses = new Map();
for (const l of campaignData.levels) for (const p of l.pictures) campaignUses.set(p.id, (campaignUses.get(p.id) ?? 0) + 1);
const shapes = new Set(pictures.map((p) => `${p.cols}x${p.rows}`));

/** The places on level l that may give way, best first. */
function places(l) {
  return l.pictures
    .map((p, j) => ({ p, j, e: byId.get(p.id) }))
    .filter(({ p, e }) => e && shapes.has(`${p.cols}x${p.rows}`) && p.id !== l.destination?.id && !isAtmospheric(e) && e.album !== "people" && !CURRENT.has(p.id) && !batchIds.has(p.id))
    .sort((x, y) => ((campaignUses.get(x.p.id) ?? 0) > 1) - ((campaignUses.get(y.p.id) ?? 0) > 1) || (y.e.busy ?? 0) - (x.e.busy ?? 0) || hashId(`${l.id}:${x.p.id}`) - hashId(`${l.id}:${y.p.id}`));
}

/** Level l with picture r in place j, or null if a rule says no. */
function tryOn(lane, i, l, j, r) {
  const p = l.pictures[j];
  const e = byId.get(p.id);
  const row = lane.row(i);
  // no busier than what it replaces, where no row's caps say how lively the level may be (the challenge route)
  if (r.cols !== p.cols || r.rows !== p.rows || (!row && (r.busy ?? 0) > (e.busy ?? 0))) return null;
  const next = l.pictures.map((q, k) => (k === j ? { ...q, id: r.id } : q));
  const others = next.filter((_, k) => k !== j).map((q) => entryOf(q.id));
  const n = next.length;
  if (others.some((q) => fam(q) === fam(r))) return null;
  const words = wordsOf(r);
  if (others.some((q) => wordsOf(q).some((x) => words.some((y) => sameWord(x, y))))) return null;
  const within = (c) => {
    const rest = next.filter((q) => q.id !== c.id).map((q) => entryOf(q.id));
    return !(c.album && rest.filter((q) => q.album === c.album).length >= Math.ceil(n / 3)) && !(c.medium && rest.filter((q) => q.medium === c.medium).length >= Math.ceil(n / 2));
  };
  if (!within(r)) return null;
  // an atmospheric picture on the level keeps within its album and medium share where r adds to them
  // (a legacy level may be over already: only r's own album or medium counts against it)
  for (const q of next) {
    const a = byId.get(q.id);
    if (isAtmospheric(a) && (a.album === r.album || a.medium === r.medium) && !within(a)) return null;
  }
  if (row && !fitsBeside(all, { ...specOf(row), keep: undefined }, next, r)) return null;
  const families = l.axes?.families ? l.axes.families.map((f, k) => (k === j ? fam(r) : f)) : undefined;
  return { ...l, pictures: next, ...(families ? { axes: { ...l.axes, families } } : {}) };
}

// each lane's share, by the levels that can take one
const eligible = lanes.map((lane) => lane.levels.map((l, i) => i).filter((i) => i >= lane.first && places(lane.levels[i]).length));
const total = eligible.reduce((n, e) => n + e.length, 0);
const shares = eligible.map((e) => Math.round((pictures.length * e.length) / total));
shares[1] += pictures.length - shares.reduce((a, b) => a + b, 0);
const left = [...order];
const swaps = [];
lanes.forEach((lane, li) => {
  const el = eligible[li];
  const want = Math.min(shares[li], el.length);
  const targets = Array.from({ length: want }, (_, k) => Math.floor(((k + 0.5) * el.length) / want));
  const used = new Set();
  let placed = 0;
  for (const t of targets) {
    // this level, else the next free one after it (then before it)
    const tries = [...el.slice(t), ...el.slice(0, t).reverse()].filter((i) => !used.has(i));
    let done = false;
    for (const i of tries) {
      const l = lane.levels[i];
      // the first picture in the hash order that fits
      let best = null;
      for (const r of left) {
        for (const { j } of places(l)) {
          const next = tryOn(lane, i, l, j, r);
          if (next) {
            best = { r, j, next };
            break;
          }
        }
        if (best) break;
      }
      if (!best) continue;
      swaps.push({ lane: lane.name, level: l.id, clear: l.pictures[best.j].id, picture: best.r.id });
      lane.levels[i] = best.next;
      left.splice(left.indexOf(best.r), 1);
      used.add(i);
      done = true;
      break;
    }
    if (done) placed++;
  }
  console.log(`${lane.name}: ${placed} of ${want} placed, on ${eligible[li].length} levels that could take one`);
});
// any left over: the campaign's next free levels
for (const r of [...left]) {
  const lane = lanes[1];
  const taken = new Set(swaps.filter((s) => s.lane === "campaign").map((s) => s.level));
  for (const i of eligible[1]) {
    const l = lane.levels[i];
    if (taken.has(l.id)) continue;
    const j = places(l).map((x) => x.j).find((j) => tryOn(lane, i, l, j, r));
    if (j === undefined) continue;
    swaps.push({ lane: "campaign", level: l.id, clear: l.pictures[j].id, picture: r.id });
    lane.levels[i] = tryOn(lane, i, l, j, r);
    left.splice(left.indexOf(r), 1);
    break;
  }
}
if (left.length) throw new Error(`no level takes ${left.map((p) => p.id).join(", ")}`);

for (const s of swaps) console.log(`${s.level}: ${s.clear} -> ${s.picture} in place; the deal and line unchanged`);
const nowOn = new Set(lanes[1].levels.flatMap((l) => l.pictures.map((p) => p.id)));
const displaced = [...new Set(swaps.map((s) => s.clear))].sort();
const freed = displaced.filter((id) => !nowOn.has(id));
console.log(`${swaps.length} swapped in (${lanes.map((ln) => `${ln.name} ${swaps.filter((s) => s.lane === ln.name).length}`).join(", ")}); ${displaced.length} displaced, ${freed.length} freed for trip 11 on`);
if (dry) process.exit(0);

for (const lane of lanes) {
  const { v, board, levels, ...extra } = lane.data;
  writeBoards(join(dir, lane.file), board, lane.levels, extra);
}
const record = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, "utf8")) : { batches: {} };
record.note = "tools/levels/swap-in.mts writes this: each batch of new pictures swapped into made levels in place, the clear picture each took the place of, `displaced`, and `freed` (displaced and on no campaign board then), which campaign-plan.mts FREED adds to trip 11's stock. Do not edit by hand.";
record.batches[batch] = { ...(after ? { after } : {}), ...(medium ? { medium } : {}), swaps: swaps.map(({ lane, level, clear, picture }) => ({ lane, level, clear, picture })), displaced, freed };
writeFileSync(RECORD, `${JSON.stringify({ note: record.note, batches: record.batches }, null, 1)}\n`);
console.log(`wrote ${lanes.map((l) => l.file).join(" and ")} and tools/levels/swap-ins.json`);

/** PAIRS (the header): each old picture's new one in its place on the campaign and the challenge route. */
function swapPairs() {
  const pairs = JSON.parse(readFileSync(join(root, pairsFile), "utf8")).swaps;
  const swaps = [];
  const skipped = [];
  /** Brought-back pictures each level has given way so far (its row's oldLeast is that much lower). */
  const backGone = new Map();
  for (const { old, new: id } of pairs) {
    const o = byId.get(old);
    const r = byId.get(id);
    if (!o || !r) {
      skipped.push({ old, new: id, why: `${!o ? old : id} is not in the catalogue` });
      continue;
    }
    if (flags.has(id) || r.landmark || r.cols !== o.cols || r.rows !== o.rows) {
      skipped.push({ old, new: id, why: flags.has(id) ? `${id} is flagged` : r.landmark ? `${id} is a landmark` : `${id} is ${r.cols}x${r.rows}, ${old} ${o.cols}x${o.rows}` });
      continue;
    }
    for (const lane of lanes) {
      lane.levels.forEach((l, i) => {
        const j = l.pictures.findIndex((p) => p.id === old);
        if (j < 0) return;
        if (l.pictures.some((p) => p.id === id)) return skipped.push({ level: l.id, old, new: id, why: `${id} is on it already` });
        const next = l.pictures.map((q, k) => (k === j ? { ...q, id } : q));
        const others = next.filter((_, k) => k !== j).map((q) => entryOf(q.id));
        const words = wordsOf(r);
        if (others.some((q) => fam(q) === fam(r) || wordsOf(q).some((x) => words.some((y) => sameWord(x, y))))) return skipped.push({ level: l.id, old, new: id, why: "a family or word in common with the level" });
        if (isAtmospheric(r) && others.some((q) => isAtmospheric(q))) return skipped.push({ level: l.id, old, new: id, why: "a second atmospheric picture" });
        const row = lane.row(i);
        // a brought-back picture (trips 9 and 10: the row's `old`, at least `oldLeast`) given way to a pair's
        // new one lowers that level's minimum by one (lead, 2026-10-29, for the people swap: people variety
        // and fewer repeats come first)
        const backOut = row?.old ? (backGone.get(l.id) ?? 0) + (row.old.has(old) ? 1 : 0) : 0;
        const spec = row && { ...specOf(row), keep: undefined, ...(row.oldLeast !== undefined ? { oldLeast: row.oldLeast - backOut } : {}) };
        const ok = row && fitsBeside(all, { ...spec, ...(row.oldLeast !== undefined ? { oldLeast: row.oldLeast - (backGone.get(l.id) ?? 0) } : {}) }, l.pictures, o) ? fitsBeside(all, spec, next, r) : looseFits(l.pictures, j, r);
        if (!ok) return skipped.push({ level: l.id, old, new: id, why: "the level's picture rules" });
        const families = l.axes?.families ? l.axes.families.map((f, k) => (k === j ? fam(r) : f)) : undefined;
        lane.levels[i] = { ...l, pictures: next, ...(families ? { axes: { ...l.axes, families } } : {}) };
        swaps.push({ lane: lane.name, level: l.id, clear: old, picture: id, ...(row?.old?.has(old) ? { broughtBack: true } : {}) });
        if (row?.old?.has(old)) backGone.set(l.id, (backGone.get(l.id) ?? 0) + 1);
      });
    }
  }
  for (const s of swaps) console.log(`${s.level}: ${s.clear} -> ${s.picture} in place; the deal and line unchanged`);
  for (const k of skipped) console.log(`skipped ${k.level ? `${k.level}: ` : ""}${k.old} -> ${k.new}: ${k.why}`);
  const levelsChanged = new Set(swaps.map((s) => s.level));
  if (backGone.size) console.log(`brought-back pictures given way (each level's minimum lowered by as many): ${[...backGone].map(([lv, n]) => `${lv} by ${n}`).join(", ")}`);
  console.log(`${swaps.length} swaps on ${levelsChanged.size} levels (${lanes.map((ln) => `${ln.name} ${new Set(swaps.filter((s) => s.lane === ln.name).map((s) => s.level)).size}`).join(", ")}); ${skipped.length} skipped`);
  if (dry) return;
  for (const lane of lanes) {
    const { v, board, levels, ...extra } = lane.data;
    writeBoards(join(dir, lane.file), board, lane.levels, extra);
  }
  const record = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, "utf8")) : { batches: {} };
  record.batches[batch] = { pairs: pairsFile, swaps, skipped, displaced: [...new Set(swaps.map((s) => s.clear))].sort(), freed: [] };
  writeFileSync(RECORD, `${JSON.stringify({ note: record.note, batches: record.batches }, null, 1)}\n`);
  console.log(`wrote ${lanes.map((l) => l.file).join(" and ")} and tools/levels/swap-ins.json`);
}
