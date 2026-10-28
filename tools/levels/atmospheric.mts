// THE ATMOSPHERIC SWAP (creator, 2026-10-28; AGENTS.md "Pictures are clear, close and varied"): about 1 in
// 6 to 1 in 8 of each campaign board's pictures, about one a board, are ATMOSPHERIC: a landscape, a distant
// scene, impressionistic or busier (Art's `"look": "atmospheric"` in pictures.json; the early squares of
// campaign-plan.mts CURRENT came back for it, the creator: "they failed only because ALL were like that").
// They go into the boards of clear pictures by taking a clear square's place IN PLACE: a board of squares
// deals the same from any square pictures (dealFor reads shapes only), so its deal, line, proof and
// measures are untouched. make-campaign.mts runs this last, on every board it writes.
//   - boards 1 and 2 (the guided start and the Undo lesson) take none, nor an all-long board (pace, no
//     squares); every other board shareOf(n) of its n pictures (destination window included): at least
//     `lo` (check.mts holds it), `target` where the stock allows (a trip's running count at 1 in 7);
//   - never the destination's window; the clear square displaced is the board's busiest (its busy
//     pictures become the atmospheric ones; busy 2 is allowed for those), then the one on fewest boards
//     (freed whole for the next trips), then a hash;
//   - the atmospheric picture: not flagged, no landmark, a square; no family on the board (the
//     destination's included); no word in common with any of its pictures (lib.mts sameWord, as the item
//     rule: two atmospheric pictures on a board look different); album and medium within the picker's
//     variety; on MOST_BOARDS boards at most, none on two of boards 1-DISTINCT and none back within
//     SPACING boards either side; the
//     least used first (unseen first), then a hash. Every board is first given `lo`, then `target`, then
//     (up to `hi`) one more for each busy clear square still on it.
// Re-runnable: each run first puts back the clear pictures its record (atmospheric.json) says it took,
// then assigns afresh from today's stock, so a batch of Art's goes in by re-running make-campaign.mts.
// The record's `displaced` are the clear pictures taken out, `freed` those now on no board: the stock
// trips 11 on take first (campaign-plan.mts FREED).
// Deterministic: the same boards, catalogue and flags give the same swap.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashId } from "../../src/game/levels/generate.ts";
import { byId, destById, root, sameWord, usable, wordsOf } from "./lib.mts";

export const RECORD = join(root, "tools/levels/atmospheric.json");
/** Is this catalogue picture atmospheric (Art's tag)? */
export const isAtmospheric = (p) => p?.look === "atmospheric";
/** Boards before this one (from 0) take none: the guided start and the Undo lesson. */
export const FIRST = 2;
/** How many of a board's n pictures are atmospheric: lo..hi (1 in 8 to 1 in 6, rounded, at least 1). */
export const shareOf = (n) => ({ lo: Math.max(1, Math.round(n / 8)), hi: Math.max(1, Math.round(n / 6)) });
/** A board that takes atmospheric pictures: from FIRST, and with squares (no all-long board). */
/** No atmospheric picture is on more boards than this (lead, 2026-10-28: pictures rarely repeat). */
export const MOST_BOARDS = 2;
export const takesAtmospheric = (l, i) => i >= FIRST && l.pictures.some((p) => p.cols === 2 && p.rows === 2);

export const readRecord = () => (existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, "utf8")) : { swaps: {} });

const entryOf = (id) => byId.get(id) ?? destById.get(id);
const familyOf = (id) => entryOf(id)?.family ?? id;
const isSquare = (p) => p.cols === 2 && p.rows === 2;

/**
 * The boards with the swap made (new objects only where a picture changed), the record, and a report.
 * `levels` are the boards as kept or made (their atmospheric pictures, if any, as the record left them).
 */
export function atmosphericPass(levels, { distinct, spacing }) {
  const record = readRecord();
  // 1. the clear pictures back where the record took them
  let boards = levels.map((l) => {
    const swaps = record.swaps[l.id];
    if (!swaps) return l;
    let pictures = l.pictures;
    let families = l.axes?.families;
    for (const s of swaps) {
      const k = pictures.findIndex((p) => p.id === s.atmospheric);
      if (k < 0) continue;
      pictures = pictures.map((p, j) => (j === k ? { ...p, id: s.clear } : p));
      if (families) families = families.map((f, j) => (j === k ? familyOf(s.clear) : f));
    }
    return pictures === l.pictures ? l : { ...l, pictures, ...(families ? { axes: { ...l.axes, families } } : {}) };
  });
  const stock = usable.filter((p) => isAtmospheric(p) && isSquare(p) && !p.landmark);
  const uses = new Map();
  for (const l of boards) for (const p of l.pictures) uses.set(p.id, (uses.get(p.id) ?? 0) + 1);
  const at = new Map(); // atmospheric id -> boards (from 0) it is on
  const swaps = new Map(); // board index -> [{clear, atmospheric}]
  // the targets: a trip's running count of eligible pictures at 1 in 7, each board within its share
  const target = new Map();
  let acc = 0;
  let given = 0;
  boards.forEach((l, i) => {
    if (!takesAtmospheric(l, i)) return;
    const n = l.pictures.length;
    const { lo, hi } = shareOf(n);
    acc += n;
    const t = Math.min(hi, Math.max(lo, Math.round(acc / 7) - given));
    given += t;
    target.set(i, t);
  });
  const countOn = (i) => boards[i].pictures.filter((p) => isAtmospheric(byId.get(p.id))).length;
  /** Could atmospheric `a` take the place of picture j on board i? */
  const joins = (i, j, a) => {
    const l = boards[i];
    const n = l.pictures.length;
    const others = l.pictures.filter((_, k) => k !== j).map((p) => entryOf(p.id) ?? { id: p.id });
    if (l.pictures.some((p) => p.id === a.id)) return false;
    const fam = a.family ?? a.id;
    if (others.some((q) => familyOf(q.id) === fam)) return false;
    const words = wordsOf(a);
    if (others.some((q) => wordsOf(q).some((x) => words.some((y) => sameWord(x, y))))) return false;
    if (a.album && others.filter((q) => q.album === a.album).length >= Math.ceil(n / 3)) return false;
    if (a.medium && others.filter((q) => q.medium === a.medium).length >= Math.ceil(n / 2)) return false;
    const on = at.get(a.id) ?? [];
    if (on.length >= MOST_BOARDS) return false;
    if (i < distinct && on.some((k) => k < distinct)) return false;
    if (on.some((k) => Math.abs(k - i) < spacing)) return false;
    return true;
  };
  /** One more atmospheric picture on board i, or false if none fits. */
  const swapOne = (i, busyOnly = false) => {
    const l = boards[i];
    const destId = l.destination?.id;
    const places = l.pictures
      .map((p, j) => ({ p, j, e: byId.get(p.id) }))
      .filter(({ p, e }) => isSquare(p) && p.id !== destId && e && !isAtmospheric(e) && (!busyOnly || (e.busy ?? 0) >= 1))
      .sort((x, y) => (y.e.busy ?? 0) - (x.e.busy ?? 0) || uses.get(x.p.id) - uses.get(y.p.id) || hashId(`${l.id}:${x.p.id}`) - hashId(`${l.id}:${y.p.id}`));
    const ranked = [...stock].sort((x, y) => (at.get(x.id)?.length ?? 0) - (at.get(y.id)?.length ?? 0) || hashId(`${l.id}~${x.id}`) - hashId(`${l.id}~${y.id}`));
    for (const { p, j } of places) {
      const a = ranked.find((c) => joins(i, j, c));
      if (!a) continue;
      const families = l.axes?.families ? l.axes.families.map((f, k) => (k === j ? a.family ?? a.id : f)) : undefined;
      boards[i] = { ...l, pictures: l.pictures.map((q, k) => (k === j ? { ...q, id: a.id } : q)), ...(families ? { axes: { ...l.axes, families } } : {}) };
      uses.set(p.id, uses.get(p.id) - 1);
      uses.set(a.id, (uses.get(a.id) ?? 0) + 1);
      at.set(a.id, [...(at.get(a.id) ?? []), i]);
      swaps.set(i, [...(swaps.get(i) ?? []), { clear: p.id, atmospheric: a.id }]);
      return true;
    }
    return false;
  };
  // 2. every board to its `lo`, then to its target
  const short = [];
  // and then, up to its `hi`, a board's busy clear squares give way too (its busy pictures are the atmospheric ones)
  const clearBusy = (i) => boards[i].pictures.filter((p) => p.cols === 2 && p.rows === 2 && p.id !== boards[i].destination?.id && !isAtmospheric(byId.get(p.id)) && (byId.get(p.id)?.busy ?? 0) >= 1).length;
  for (const pass of ["lo", "target", "busy"])
    for (const [i, t] of target) {
      const want = pass === "lo" ? shareOf(boards[i].pictures.length).lo : pass === "target" ? t : Math.min(shareOf(boards[i].pictures.length).hi, countOn(i) + clearBusy(i));
      while (countOn(i) < want) {
        if (!swapOne(i, pass === "busy")) {
          if (pass === "lo") short.push(boards[i].id);
          break;
        }
      }
    }
  // 3. the record, and what the next trips take first
  const out = { swaps: {} };
  for (const [i, s] of [...swaps].sort((a, b) => a[0] - b[0])) out.swaps[boards[i].id] = s;
  const displaced = [...new Set([...swaps.values()].flat().map((s) => s.clear))].sort();
  const onBoard = new Set(boards.flatMap((l) => l.pictures.map((p) => p.id)));
  const freed = displaced.filter((id) => !onBoard.has(id));
  const result = boards.map((l, i) => (JSON.stringify(l) === JSON.stringify(levels[i]) ? levels[i] : l));
  return {
    levels: result,
    record: {
      note: "tools/levels/atmospheric.mts writes this (via make-campaign.mts): the clear square each atmospheric picture took the place of, board by board; `displaced`, every clear picture taken out; `freed`, those on no campaign board now, the stock trips 11 on take first (campaign-plan.mts FREED). Do not edit by hand.",
      swaps: out.swaps,
      displaced,
      freed,
    },
    report: { stock: stock.length, placed: [...swaps.values()].flat().length, wanted: [...target.values()].reduce((a, b) => a + b, 0), short, distinctUsed: at.size, mostUses: Math.max(0, ...[...at.values()].map((v) => v.length)) },
  };
}

export const writeRecord = (record) => writeFileSync(RECORD, `${JSON.stringify(record, null, 1)}\n`);
