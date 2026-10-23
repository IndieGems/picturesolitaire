// Deals the first campaign levels and proves each one winnable without helpers.
// Run: node tools/make-campaign.mts   -> writes src/game/campaign.json
//
// A stand-in for the level-design member's generator: each level below names
// its pictures, how many cards show on the stacks, and a seed. The deal is a
// seeded shuffle of all the level's cards into the four stacks (the opening
// deal fills the board from them). A deal is kept only when:
//   - nothing is joined or finished when it opens (the player does all of it),
//   - the planner (src/game/plan.ts) finds a whole winning line, and that line,
//     replayed on the real rules, wins (it is stored with the level);
//   - a careless player wins it about as often as the level asks (`forgiving`):
//     random abstract playouts, clearing any whole picture anywhere.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cardsOf, isDeadEnd, isWon, joinCount, random, replay, start, type Deal, type Picture } from "../src/game/rules.ts";
import { solve } from "../src/game/plan.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogue = JSON.parse(readFileSync(join(root, "src/content/pictures.json"), "utf8"));
const byId = new Map(catalogue.pictures.map((p) => [p.id, p]));

const COLS = 4;
const ROWS = 5;

// The first eight: small and unlike pictures first, then more cards in the
// stacks, look-alike families side by side, and less shown on the stacks.
// `forgiving`: the share of careless playouts that should still win [min, max].
const LEVELS = [
  { pictures: ["berry-cake", "hydrangeas", "lemon-tart"], peek: 2, forgiving: [1, 1] },
  { pictures: ["lantern-child", "wheat-farm", "cherry-bowl", "blue-domes"], peek: 2, forgiving: [1, 1] },
  { pictures: ["poppy-sunset", "dusk-harbour", "market-greens", "tea-terraces", "green-alley"], peek: 2, forgiving: [0.8, 1] },
  { pictures: ["peony-jug", "berry-cake", "rose-hat", "lilac-bouquet", "figs-grapes", "wisteria-door"], peek: 2, forgiving: [0.7, 1] },
  { pictures: ["maple-path", "harvest-table", "apple-orchard", "ivy-lane", "candle-oranges", "poppy-sunset", "dune-caravan"], peek: 1, forgiving: [0.6, 1] },
  { pictures: ["lemon-coast", "lemon-tart", "canal-bicycle", "sunflower-vase", "bread-table", "wheat-walk"], peek: 1, forgiving: [0.5, 1] },
  { pictures: ["venice-canal", "lantern-market", "lantern-child", "lake-village", "blue-domes", "wave-coast", "net-mender"], peek: 1, forgiving: [0.4, 1] },
  { pictures: ["dusk-harbour", "dune-caravan", "poppy-sunset", "candle-oranges", "blossom-lane", "peony-jug", "berry-cake", "rose-hat"], peek: 0, forgiving: [0.3, 1] },
];

/** The share of careless playouts that win: at each turn a random clear (anywhere) or draw. */
function forgiveness(deal: Deal, tries = 300, seed = 1): number {
  // Abstract, like the planner: which cards are on the board, which still in the stacks.
  const P = deal.pictures;
  const len = deal.stacks.map((s) => Math.max(0, s.length - ROWS));
  const base = start(deal).state;
  const rnd = random(seed);
  let wins = 0;
  for (let t = 0; t < tries; t++) {
    const ptr = new Array(COLS).fill(0);
    const on = new Array(P.length).fill(0);
    for (const c of base.board) if (c >= 0) on[c >> 5]++;
    let open = 0;
    for (let c = 0; c < COLS; c++) if (len[c] === 0) open += base.board.filter((x, i) => x >= 0 && i % COLS === c).length;
    let left = P.length;
    const cleared = new Set();
    for (;;) {
      if (left === 0) { wins++; break; }
      const isOpen = (c) => ptr[c] === base.stacks[c].length;
      const moves = [];
      for (let p = 0; p < P.length; p++) {
        if (cleared.has(p) || on[p] !== P[p].cols * P[p].rows) continue;
        for (let c0 = 0; c0 + P[p].cols <= COLS; c0++) {
          let openT = 0;
          for (let c = c0; c < c0 + P[p].cols; c++) if (isOpen(c)) openT++;
          if (open >= P[p].rows * openT) moves.push(["clear", p, c0]);
        }
      }
      let openCols = 0;
      for (let c = 0; c < COLS; c++) if (isOpen(c)) openCols++;
      if (!moves.length && open < ROWS * openCols) for (let c = 0; c < COLS; c++) if (!isOpen(c)) moves.push(["draw", c]);
      if (!moves.length) break;
      const m = moves[Math.floor(rnd() * moves.length)];
      if (m[0] === "draw") {
        on[base.stacks[m[1]][ptr[m[1]]] >> 5]++;
        ptr[m[1]]++;
        open++;
        if (isOpen(m[1])) open += ROWS;
      } else {
        const [, p, c0] = m;
        const { cols: pc, rows: pr } = P[p];
        cleared.add(p);
        left--;
        on[p] = 0;
        for (let c = c0; c < c0 + pc; c++) {
          if (isOpen(c)) { open -= pr; continue; }
          const k = Math.min(pr, base.stacks[c].length - ptr[c]);
          for (let j = 0; j < k; j++) on[base.stacks[c][ptr[c] + j] >> 5]++;
          ptr[c] += k;
          if (isOpen(c)) open += ROWS - pr + k;
        }
      }
    }
  }
  return wins / tries;
}

const levels = [];
LEVELS.forEach((spec, i) => {
  const pictures: Picture[] = spec.pictures.map((id) => {
    const p = byId.get(id);
    if (!p) throw new Error(`no picture ${id} in the catalogue`);
    return { id, cols: p.cols, rows: p.rows };
  });
  const cards = pictures.flatMap((_, pic) => cardsOf(pictures, pic));
  if (cards.length < COLS * 2) throw new Error(`level ${i + 1}: too few cards`);
  for (let seed = (i + 1) * 1000; seed < (i + 1) * 1000 + 999; seed++) {
    const rnd = random(seed);
    const pool = [...cards];
    for (let k = pool.length - 1; k > 0; k--) {
      const j = Math.floor(rnd() * (k + 1));
      [pool[k], pool[j]] = [pool[j], pool[k]];
    }
    // the board's cards first (one row at a time, so columns stay level), the rest uneven
    const onBoard = Math.min(COLS * ROWS, pool.length);
    const stacks = Array.from({ length: COLS }, () => []);
    pool.slice(0, onBoard).forEach((card, k) => stacks[k % COLS].push(card));
    for (const card of pool.slice(onBoard)) stacks[Math.floor(rnd() * COLS)].push(card);
    const deal: Deal = { cols: COLS, rows: ROWS, pictures, stacks, seed };
    const opened = start(deal);
    if (opened.state.cleared.length || joinCount(opened.state) > 0 || isDeadEnd(opened.state)) continue;
    const f = forgiveness(deal);
    if (f < spec.forgiving[0] || f > spec.forgiving[1]) continue;
    const line = solve(opened.state);
    if (!line) continue;
    if (!isWon(replay(deal, line))) throw new Error(`level ${i + 1}: the line does not replay to a win`);
    const id = `c${String(i + 1).padStart(2, "0")}`;
    levels.push({ id, peek: spec.peek, cols: COLS, rows: ROWS, seed, pictures, stacks, line: line.map((m) => [m.from, m.to]) });
    console.log(`${id}: ${pictures.length} pictures, ${cards.length} cards (${cards.length - onBoard} waiting), peek ${spec.peek}, careless win ${(f * 100).toFixed(0)}%, line ${line.length} moves, seed ${seed}`);
    return;
  }
  throw new Error(`level ${i + 1}: no deal found that fits`);
});

writeFileSync(join(root, "src/game/campaign.json"), JSON.stringify({ v: 1, levels }, null, 0).replace(/\{"id"/g, '\n{"id"') + "\n");
console.log(`wrote src/game/campaign.json (${levels.length} levels)`);
