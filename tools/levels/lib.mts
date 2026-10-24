// What the level makers share (make-campaign.mts, make-challenge.mts,
// make-daily.mts): picking each board's pictures evenly, evening the picks
// out, generating and proving a deal per board, and writing the boards file.
// Deterministic: the same plan, seeds and catalogue give the same boards.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { random } from "../../src/game/rules.ts";
import { generate } from "../../src/game/levels/generate.ts";
import { alikeOf, fits, pick, shapeOf } from "../../src/game/levels/pick.ts";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const catalogue = JSON.parse(readFileSync(join(root, "src/content/pictures.json"), "utf8")).pictures;
export const byId = new Map(catalogue.map((p) => [p.id, p]));

export const specOf = (row) => ({ count: row.count, alike: row.alike, cards: row.cards, sizes: row.sizes, must: row.must, most: row.most });

/** Each board's pictures, least-used first, board by board; `seedOf(i)` seeds board i's pick. */
export function pickAll(plan, seedOf) {
  const chosen = [];
  const uses = new Map<string, number>();
  let recent = new Set<string>();
  plan.forEach((row, i) => {
    const pictures = pick(catalogue, specOf(row), uses, recent, random(seedOf(i)));
    if (!pictures) throw new Error(`board ${i + 1}: no pictures fit the plan`);
    for (const q of pictures) uses.set(q.id, (uses.get(q.id) ?? 0) + 1);
    recent = new Set(pictures.map((q) => q.id));
    chosen.push(pictures);
  });
  return chosen;
}

export const usesOf = (chosen) => {
  const u = new Map(catalogue.map((q) => [q.id, 0]));
  for (const set of chosen) for (const q of set) u.set(q.id, u.get(q.id) + 1);
  return u;
};

/**
 * Even the picks out: swap a picture of a board for another that still fits
 * the board's plan, while that brings the picture counts closer together and
 * keeps the same picture off boards next to each other.
 */
export function balance(plan, chosen) {
  const near = (i, id) => [i - 1, i + 1].filter((k) => chosen[k]?.some((q) => q.id === id)).length * 3 + [i - 2, i + 2].filter((k) => chosen[k]?.some((q) => q.id === id)).length;
  for (let sweep = 0; sweep < 60; sweep++) {
    let better = false;
    for (let i = 0; i < chosen.length; i++) {
      for (let j = 0; j < chosen[i].length; j++) {
        const u = usesOf(chosen);
        const out = chosen[i][j];
        for (const cand of catalogue) {
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
 * A proved deal for board i of the plan, on target on every axis: from the
 * pictures chosen for it, else from another set of pictures picked with
 * `reseedOf(i, attempt)` (the plan's row decides the rest). Updates `chosen`
 * and `uses`. Returns the board's record for the boards file.
 */
export function makeBoard(plan, i, chosen, uses, { id, cols, rows, reseedOf, par, tries = 3000, attempts = 12, extra, vary = false, safeFirstMove = false }) {
  const row = plan[i];
  let pictures = chosen[i];
  // with `vary`, pictures of sets that found no deal count as used more, so the next pick differs
  const failed = new Map<string, number>();
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      // this set of pictures yields no deal on target: pick another set for the board
      for (const q of chosen[i]) uses.set(q.id, uses.get(q.id) - 1);
      const seen = vary ? new Map([...uses].map(([k, v]) => [k, v + (failed.get(k) ?? 0)])) : uses;
      pictures = pick(catalogue, specOf(row), seen, new Set([...(chosen[i - 1] ?? []), ...(chosen[i + 1] ?? [])].map((q) => q.id)), random(reseedOf(i, attempt)));
      if (!pictures) throw new Error(`${id}: no pictures fit the plan`);
      chosen[i] = pictures;
      for (const q of pictures) uses.set(q.id, uses.get(q.id) + 1);
    }
    // the deal is shuffled from the pictures in a fixed order, so it does not hang on how they were picked
    pictures = [...pictures].sort((a, b) => (a.id < b.id ? -1 : 1));
    const targets = { chain: row.chain, careless: row.careless, bigWait: row.bigWait, orderTraps: row.orderTraps };
    const spec = { id, cols, rows, pictures, targets, par, safeFirstMove };
    const tally = new Map();
    const made = generate(spec, 1, tries, tally);
    if (!made) {
      for (const q of pictures) failed.set(q.id, (failed.get(q.id) ?? 0) + 1);
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
      ...(extra ? { bigWait: m.bigWait, orderTraps: m.orderTraps, lineOrderTraps: m.lineOrderTraps } : {}),
      lineMoves: made.line.length,
      lineSteps: made.steps.length,
    };
    const board = { id, peek: row.peek, cols, rows, seed: made.seed, pictures, stacks: made.deal.stacks, line: made.line.map((mv) => [mv.from, mv.to]) };
    if (par) board.par = made.line.length;
    board.axes = axes;
    const extraNote = extra ? ` bigWait ${m.bigWait} orderTraps ${m.orderTraps}` : "";
    console.log(`${id} ${String(row.role).padEnd(6)} ${cols}x${rows} ${pictures.length} pics ${String(axes.cards).padStart(2)} cards (${String(m.waiting).padStart(2)} waiting) alike ${JSON.stringify(axes.alike).padEnd(7)} peek ${row.peek} chain ${m.chain} careless ${(m.careless * 100).toFixed(0).padStart(3)}% traps ${m.traps}${extraNote} line ${made.line.length} moves, seed ${made.seed}`);
    return board;
  }
  throw new Error(`${id}: no deal meets the plan; loosen its row`);
}

/** Write a boards file: one board a line, so a diff shows which boards changed. */
export function writeBoards(file, note, levels, extra = {}) {
  mkdirSync(dirname(file), { recursive: true });
  const json = JSON.stringify({ v: 2, board: note, ...extra, levels })
    .replace(/\{"id":"([^"]+)","peek":/g, '\n{"id":"$1","peek":')
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
