// Builds the staged lesson boards (lead, 2026-10-27: helpers become the
// player's own stock, so Shuffle is taught once, for sure, on a practice board
// after board 3; UI runs the steps, Gameplay loads the file):
//   src/content/levels/lessons.json
// The Shuffle lesson (`lesson: "shuffle"`): a tiny board that opens STUCK, a
// dead end (every picture is missing a card, so none can ever be finished),
// rescued by one FIXED shuffle, the same every time, after which a handful of
// moves win. Stored as an ordinary deal (dealFor deals its stacks from id and
// seed) plus:
//   shuffle   the Shuffle action (rules.ts) for the opening: what the Shuffle
//             helper (shuffle.ts rescue) chooses there, stored so a later
//             change to the helper's tuning never changes the lesson
//   line      the moves AFTER the shuffle (the shortest par.ts finds), so the
//             lesson replays as [shuffle, ...line]
// check.mts proves it: the opening a dead end the solver calls doomed, the
// shuffle playable, shuffle + line a win. Practice only: no lane of the win
// checker, no Coins, no mark.
// Run: node tools/levels/make-lessons.mts [--out FILE]
// Deterministic: the same rows and catalogue give the same boards.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { join } from "node:path";
import { arrange, isDeadEnd, isWon, joinCount, replay, start } from "../../src/game/rules.ts";
import { rescue } from "../../src/game/shuffle.ts";
import { solveFrom } from "../../src/game/solver/index.ts";
import { parLine } from "../../src/game/solver/par.ts";
import { dealFor } from "../../src/game/levels/generate.ts";
import { byId, flags, LESSON_MOVES, root, writeBoards } from "./lib.mts";

const FILE = join(root, "src/content/levels/lessons.json");

export const LESSONS = [
  // Shuffle (lead, 2026-10-27): 4 columns (a campaign board's card size) by 2 rows, three clear squares
  // in three colours and styles, none on boards 1-15 (none on any board: pictures that gave way to postcards)
  { id: "l-shuffle", lesson: "shuffle", name: "Shuffle", cols: 4, rows: 2, pictures: ["gecko", "ice-cream-van", "persimmons"] },
];

function makeShuffleLesson(row) {
  const pictures = row.pictures.map((id) => {
    const c = byId.get(id);
    if (!c) throw new Error(`${row.id}: no picture ${id} in the catalogue`);
    if (flags.has(id)) throw new Error(`${row.id}: ${id} is flagged`);
    return { id, cols: c.cols, rows: c.rows };
  });
  let best = null;
  for (let seed = 1; seed <= 3000; seed++) {
    const deal = dealFor({ id: row.id, cols: row.cols, rows: row.rows, pictures, targets: {} }, seed);
    const s = start(deal).state;
    // stuck for sure, and plainly: the board full, nothing joined, every picture missing a card
    if (s.cleared.length || joinCount(s) > 0 || !isDeadEnd(s)) continue;
    if (!("doomed" in solveFrom(s))) continue;
    const r = rescue(s);
    // one card in from the stacks reads best; the mix itself finishes nothing (the player does)
    if (!r || r.swapped !== 1 || r.state.cleared.length) continue;
    const after = { cols: deal.cols, rows: deal.rows, pictures: deal.pictures, stacks: r.state.stacks, board: r.state.board, seed: deal.seed };
    const par = parLine(after);
    if (!par || par.moves.length < 3 || par.moves.length > LESSON_MOVES) continue;
    const won = isWon(replay(deal, [r.action, ...par.moves]));
    if (!won || !arrange(s, r.action)) continue;
    if (!best || par.moves.length < best.line.length) best = { seed, deal, shuffle: r.action, line: par.moves };
  }
  if (!best) throw new Error(`${row.id}: no seed gives a stuck opening that one shuffle rescues in ${LESSON_MOVES} moves; change its pictures or board`);
  const { seed, deal, shuffle, line } = best;
  return { id: row.id, lesson: row.lesson, name: row.name, peek: 0, cols: deal.cols, rows: deal.rows, seed, pictures: deal.pictures, stacks: deal.stacks, shuffle: { shuffle: true, board: shuffle.board, stacks: shuffle.stacks }, line: line.map((m) => [m.from, m.to]) };
}

const outAt = process.argv.indexOf("--out");
const OUT = outAt > 0 ? process.argv[outAt + 1] : FILE;
const levels = LESSONS.map((row) => {
  if (row.lesson !== "shuffle") throw new Error(`${row.id}: no maker for lesson ${row.lesson}`);
  const l = makeShuffleLesson(row);
  console.log(`${l.id}: seed ${l.seed}, opens stuck, the shuffle swaps one card in, then ${l.line.length} moves win`);
  return l;
});
writeBoards(OUT, "staged lesson boards (practice: shown by the guided steps, never paid, no lane of the win checker); made by tools/levels/make-lessons.mts, checked by tools/levels/check.mts", levels);
console.log(`wrote ${OUT} (${levels.length} boards)`);
