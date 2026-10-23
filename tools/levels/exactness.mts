// Checks that the solver's abstract game (src/game/solver/abstract.ts) is EXACT:
// on small boards, where every real position can be enumerated, a deal is
// winnable on the real rules exactly when the abstract game says so, and every
// line the solver returns replays to a win.
// Run: node tools/levels/exactness.mts [deals=300]   (exit code 0 = all agree)
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { allMoves, isWon, move, random, replay, start, type Deal, type Picture } from "../../src/game/rules.ts";
import { Game, solveDeal } from "../../src/game/solver/index.ts";

const SHAPES = [[1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [2, 3], [3, 2]];
const N = Number(process.argv[2] ?? 300);
const rnd = random(20261023);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;

/** Is a won board reachable on the real rules? null if too many positions to tell. */
function realWinnable(deal: Deal, cap = 300_000): boolean | null {
  const s0 = start(deal).state;
  const key = (s) => s.board.join(",") + "|" + s.stacks.map((st) => st.length).join(",");
  const seen = new Set([key(s0)]);
  const todo = [s0];
  while (todo.length) {
    const s = todo.pop()!;
    if (isWon(s)) return true;
    for (const m of allMoves(s)) {
      const out = move(s, m);
      if (!out) continue;
      const k = key(out.state);
      if (seen.has(k)) continue;
      if (seen.size >= cap) return null;
      seen.add(k);
      todo.push(out.state);
    }
  }
  return false;
}

let agree = 0, skipped = 0, wins = 0, bad = 0;
for (let i = 0; i < N; i++) {
  const cols = pick([2, 3, 3]);
  const rows = pick([2, 3, 3]);
  const pictures: Picture[] = [];
  let cards = 0;
  const want = cols * rows + Math.floor(rnd() * (cols * 2 + 1)) - 1;
  while (cards < want && pictures.length < 6) {
    const [pc, pr] = pick(SHAPES.filter(([c, r]) => c <= cols && r <= rows));
    pictures.push({ id: `p${pictures.length}`, cols: pc, rows: pr });
    cards += pc * pr;
  }
  const pool = pictures.flatMap((p, k) => Array.from({ length: p.cols * p.rows }, (_, j) => k * 32 + j));
  for (let k = pool.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  const stacks = Array.from({ length: cols }, () => []);
  pool.forEach((c, k) => (k < cols * rows ? stacks[k % cols] : stacks[Math.floor(rnd() * cols)]).push(c));
  const deal: Deal = { cols, rows, pictures, stacks, seed: i };
  const g = new Game(start(deal).state);
  const abs = g.wins(g.root);
  const real = realWinnable(deal);
  if (real === null) { skipped++; continue; }
  if (real !== abs) {
    bad++;
    console.error(`DISAGREE deal ${i}: real ${real}, abstract ${abs}\n`, JSON.stringify(deal));
    process.exitCode = 1;
    continue;
  }
  agree++;
  if (abs) {
    wins++;
    const a = solveDeal(deal);
    if (!("win" in a)) {
      console.error(`NO LINE for winnable deal ${i}: ${JSON.stringify(a)}\n`, JSON.stringify(deal));
      process.exitCode = 1;
    } else if (!isWon(replay(deal, a.win.moves))) {
      console.error(`BAD LINE deal ${i}`);
      process.exitCode = 1;
    }
  }
}
console.log(`${agree} deals agree (${wins} winnable), ${bad} disagree, ${skipped} too big to enumerate`);
