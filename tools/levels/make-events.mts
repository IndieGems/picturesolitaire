// Builds the VIP EVENTS (creator, 2026-10-30; docs/vip.md; events.mts): for each event of
// tools/levels/events-plan.json, its 30 levels of its own, written to src/content/levels/event-levels.json
// (ids "<event id>-NN", the event's id in `event`, its mark on a hard one, and on its 10 item levels the
// item's `item`: {"id"}, the id one of its own 2x2 pictures), and the events' details to
// src/content/levels/events.json (v3: theme, table, release, the 30 level ids, the 10 items and the level
// each hides on). Shape agreed with Server (2026-10-30), who compiles both into the win checker.
// Run: node tools/levels/make-events.mts
//   It KEEPS every level already made whose row is unchanged, mending it IN PLACE (a square or long
//   picture of the same shape takes a picture's spot, so the deal, line and par stay): a flagged or
//   no-longer-usable picture gives way; the plan's item for the level goes on (in the spot of a picture
//   its stored line finishes neither first nor last), is changed, or comes off; a picture clashing with
//   the item gives way. A level not made yet, or whose row changed, is dealt afresh.
//   Pictures (events.mts): clear, current, no landmark, none flagged, moved off or marked to redraw, the
//   least used across every other level first (so pictures on no level come in first), none twice within an event; the
//   row's picture rules (one a family, varied, nothing busy 2, at most one or two busy).
// Deterministic: the same plan, catalogue and level files give the same levels. Then check.mts proves them.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { random } from "../../src/game/rules.ts";
import { hashId } from "../../src/game/levels/generate.ts";
import { fits, pick } from "../../src/game/levels/pick.ts";
import { byId, catalogue, clearOrder, dealBoard, familyOf, isFlower, itemById, itemClash, MOVED_OFF, readBoards, reserveLandmarks, root, tallyText, usable, usesOf, writeBoards } from "./lib.mts";
import { CURRENT } from "./campaign-plan.mts";
import { isAtmospheric } from "./atmospheric.mts";
import { drawItemLevels, EVENT_LEVELS, EVENT_MARKS, EVENT_MAY_TRAP, eventOf, levelId, PLAN, PLAN_FILE, planProblem, ROWS } from "./events.mts";

export const EVENTS_FILE = join(root, "src/content/levels/events.json");
export const LEVELS_FILE = join(root, "src/content/levels/event-levels.json");
/** The level files that are no boards, or are this maker's own. */
const NOT_OTHERS = new Set(["trips.json", "events.json", "event-levels.json"]);

/** The events file's text, one event a few lines so a diff shows what moved. */
export function eventsText(plan = PLAN) {
  const body = plan
    .map(eventOf)
    .map((r) => {
      const { levels, items, ...head } = r;
      return `    { ${Object.entries(head).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")},\n      "levels": ${JSON.stringify(levels)},\n      "items": ${JSON.stringify(items)} }`;
    })
    .join(",\n");
  return `{\n  "v": 3,\n  "note": "the VIP events (docs/vip.md): each a pack of 30 levels of its own (src/content/levels/event-levels.json), in release order; each its theme, prize table, release date (VIPs play it any time from then; it never closes), its levels in play order and its 10 items in slot order, each with the one level it hides on. Made by tools/levels/make-events.mts from tools/levels/events-plan.json, checked by tools/levels/check.mts",\n  "events": [\n${body}\n  ]\n}\n`;
}

/** The board with its event (and mark) right after its peek, and its item (if any) right after its size. */
function shaped(board, event, mark, itemId) {
  const out = {};
  for (const [key, v] of Object.entries(board)) {
    if (key === "event" || key === "mark" || key === "item") continue;
    out[key] = v;
    if (key === "peek") {
      out.event = event;
      if (mark) out.mark = mark;
    }
    if (key === "rows" && itemId) out.item = { id: itemId };
  }
  return out;
}

function main() {
  const t0 = performance.now();
  // an event with no item levels yet takes its seeded draw, written into the plan (so a reader sees them,
  // and a later change of the draw's rules moves no shipped item)
  const undrawn = PLAN.filter((p) => !p.itemLevels);
  if (undrawn.length) {
    const file = JSON.parse(readFileSync(PLAN_FILE, "utf8"));
    for (const p of undrawn) {
      p.itemLevels = drawItemLevels(p.id);
      file.events.find((e) => e.id === p.id).itemLevels = p.itemLevels;
      console.log(`${p.id}: items on levels ${p.itemLevels.join(", ")} (its seeded draw, written into events-plan.json)`);
    }
    writeFileSync(PLAN_FILE, JSON.stringify(file, null, 1).replace(/\[\n\s+("item|\d)/g, "[$1").replace(/(",|\d,)\n\s+(?=["\d])/g, "$1 ").replace(/("|\d)\n\s+\]/g, "$1]") + "\n");
  }
  const problem = planProblem();
  if (problem) throw new Error(`events-plan.json: ${problem}`);
  // landmarks wait for their trips' destinations (lib.mts): none on an event level
  reserveLandmarks();
  const dir = join(root, "src/content/levels");
  const others = readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !NOT_OTHERS.has(f))
    .flatMap((f) => readBoards(join(dir, f)));
  const shipped = new Map(readBoards(LEVELS_FILE).map((l) => [l.id, l]));
  /** Every picture's uses across every level, every event level already made included (each one's own
   * taken off while it is made again or mended): the least used go first. */
  const uses = usesOf([...others, ...shipped.values()].map((l) => l.pictures));
  const use = (id) => uses.get(id) ?? 0;
  /** The pictures an event level may keep: clear, current, usable (no landmark, none flagged), none Art moved off. */
  const POOL = usable.filter((p) => !isAtmospheric(p) && !CURRENT.has(p.id) && !MOVED_OFF.has(p.id));
  const allowed = new Set(POOL.map((p) => p.id));
  // and the ones it may take afresh: none the creator marked to redraw (src/content/picture-redraws.json;
  // Art's to-do list: a redraw keeps its id, so one already on a level stays)
  const redrawFile = join(root, "src/content/picture-redraws.json");
  const redraw = new Set(Object.entries(existsSync(redrawFile) ? JSON.parse(readFileSync(redrawFile, "utf8")).pictures ?? {} : {}).filter(([, v]) => v?.redraw).map(([id]) => id));
  const FRESH = POOL.filter((p) => !redraw.has(p.id));
  const levels = [];
  const notes = [];

  for (const p of PLAN) {
    /** This event's pictures so far: none twice within an event. */
    const inEvent = new Set();
    for (let k = 0; k < EVENT_LEVELS; k++) {
      const id = levelId(p.id, k);
      const row = ROWS[k];
      const [cols, rows] = row.board;
      const at = p.itemLevels.indexOf(k + 1);
      const it = at >= 0 && p.items[at] ? itemById.get(p.items[at]) : null;
      const mark = EVENT_MARKS[row.role];
      const n = row.count - (it ? 1 : 0);
      const size = row.sizes[0];
      const spec = { count: n, alike: [], cards: [n * size, n * size], sizes: row.sizes, vary: true, busyMost: row.busyMost, liveMost: row.liveMost, meanFamilies: true };
      const clash = (c) => it && itemClash(it, c) !== null;
      const lib = (q) => byId.get(q.id) ?? q;

      let l = shipped.get(id);
      if (l) for (const q of l.pictures) uses.set(q.id, use(q.id) - 1);
      const same = l && l.axes?.role === row.role && l.cols === cols && l.rows === rows && l.pictures.length === row.count;
      if (same) {
        // KEPT: mended in place
        let pictures = l.pictures;
        const have = l.item?.id;
        const swapOut = (j, why) => {
          const was = pictures[j];
          const othersOn = pictures.filter((_, i) => i !== j && pictures[i].id !== it?.id);
          const swap = FRESH.filter((c) => c.cols === was.cols && c.rows === was.rows && !inEvent.has(c.id) && !pictures.some((q) => q.id === c.id) && !clash(c) && fits(catalogue, spec, [...othersOn, { id: c.id, cols: c.cols, rows: c.rows }]))
            .sort((a, b) => isFlower(a) - isFlower(b) || use(a.id) - use(b.id) || hashId(`${id}~${a.id}`) - hashId(`${id}~${b.id}`))[0];
          if (!swap) throw new Error(`${id}: no picture of its shape can take ${was.id}'s place (${why})`);
          notes.push(`${id}: ${was.id} -> ${swap.id} in place (${why}); the deal and line unchanged`);
          pictures = pictures.map((q, i) => (i === j ? { id: swap.id, cols: was.cols, rows: was.rows } : q));
        };
        // the item: on, changed or off, in place
        if ((it?.id ?? undefined) !== have) {
          let j = have ? pictures.findIndex((q) => q.id === have) : -1;
          if (it) {
            if (j < 0)
              j = clearOrder(l)
                .slice(1, -1)
                .sort((a, b) => Number(clash(lib(pictures[b]))) - Number(clash(lib(pictures[a]))) || use(pictures[b].id) - use(pictures[a].id) || hashId(`${id}~${pictures[a].id}`) - hashId(`${id}~${pictures[b].id}`))[0];
            notes.push(`${id}: ${pictures[j].id} -> item ${it.id} (${it.title}) in place; the deal and line unchanged`);
            pictures = pictures.map((q, i) => (i === j ? { id: it.id, cols: 2, rows: 2 } : q));
          } else swapOut(j, `item ${have} is no longer the level's`);
        }
        // a flagged, moved-off or otherwise unusable picture, one twice in the event, or one clashing with the item
        for (let j = 0; j < pictures.length; j++) {
          const q = pictures[j];
          if (it && q.id === it.id) continue;
          const why = !allowed.has(q.id) ? "no longer usable here (flagged, moved off or a landmark)" : inEvent.has(q.id) ? "already in the event" : clash(lib(q)) ? `${itemClash(it, lib(q))} in common with item ${it.id}` : null;
          if (why) swapOut(j, why);
        }
        if (pictures !== l.pictures) l = { ...l, pictures, axes: { ...l.axes, families: pictures.map((q) => familyOf(q.id)) } };
        l = shaped(l, p.id, mark, it?.id);
      } else {
        // DEALT afresh: pictures picked, a deal on the row's targets (a safe start unless the row may trap).
        // A deal reads the pictures' shapes only (generate.ts dealFor), so another set of pictures deals
        // the same: a row that finds no deal searches further seeds instead, SEEDS at a time
        const pool = FRESH.filter((c) => row.sizes.includes(c.cols * c.rows) && !inEvent.has(c.id) && !clash(c));
        const avoid = new Map(pool.map((c) => [c.id, use(c.id)]));
        const picked = pick(pool, spec, avoid, new Set(), random(hashId(id) >>> 0));
        if (!picked) throw new Error(`${id}: no pictures fit the level's row${it ? ` beside item ${it.id}` : ""}`);
        const pictures = it ? [...picked, { id: it.id, cols: 2, rows: 2 }] : picked;
        const SEEDS = 4000;
        l = null;
        let from = 1;
        for (let round = 0; round < 60 && !l && from < 12 * SEEDS; round++) {
          const { board, tally } = dealBoard(row, pictures, { id, cols, rows, par: true, tries: SEEDS, safeFirstMove: !EVENT_MAY_TRAP.has(row.role), from });
          if (!board) {
            console.log(`${id}: seeds ${from} to ${from + SEEDS - 1} found no deal (${tallyText(tally)})`);
            from += SEEDS;
            continue;
          }
          if (it) {
            // the item opens mid-level: its stored line finishes it neither first nor last
            const order = clearOrder(board);
            const atClear = order.indexOf(board.pictures.findIndex((q) => q.id === it.id));
            if (!(atClear > 0 && atClear < order.length - 1)) {
              from = board.seed + 1;
              continue;
            }
          }
          l = shaped(board, p.id, mark, it?.id);
        }
        if (!l) throw new Error(`${id}: no deal meets the level's row${it ? " with its item mid-line" : ""}; loosen it`);
      }
      for (const q of l.pictures) {
        uses.set(q.id, use(q.id) + 1);
        inEvent.add(q.id);
      }
      levels.push(l);
    }
  }
  writeBoards(LEVELS_FILE, "VIP event levels: each event's 30 levels of its own (docs/vip.md); made by tools/levels/make-events.mts (it keeps every level it has, mending one in place), checked by tools/levels/check.mts; par = moves in the stored line", levels);
  writeFileSync(EVENTS_FILE, eventsText());
  for (const n of notes) console.log(n);
  const made = levels.filter((l) => !shipped.has(l.id)).length;
  console.log(`wrote ${LEVELS_FILE} (${levels.length} levels, ${made} new) and ${EVENTS_FILE} (${PLAN.length} events: ${PLAN.map((p) => `${p.id} from ${p.release}, ${p.items.length} items`).join("; ")}) in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
