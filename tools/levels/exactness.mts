// Checks the solver's abstract game (src/game/solver/abstract.ts) against the
// real rules on small boards, where every real position can be enumerated:
//   - at each deal's opening, the abstract verdict and the real one agree, and
//     every line the solver returns replays to a win;
//   - at EVERY position reachable in play (sampled on bigger graphs), an
//     abstract "doomed" is never said of a position the real rules can still
//     win (that is what lets the game say "can't be won"), and Hint's answer
//     (nextMove) is right: its line wins, its "doomed" is really lost.
//     Abstract "winning" where the real board is lost is counted, not failed:
//     it is the known rare case (abstract.ts), and nothing trusts it unproved.
// Run: node tools/levels/exactness.mts [deals=300]   (exit code 0 = all agree)
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { allMoves, isWon, move, random, replay, start, type Deal, type Picture } from "../../src/game/rules.ts";
import { Game, nextMove, solveDeal } from "../../src/game/solver/index.ts";

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

/** Every real position reachable from the deal, each with whether the real rules can still win it; null if too many. */
function realGraph(deal: Deal, cap = 60_000) {
  const s0 = start(deal).state;
  const key = (s) => s.board.join(",") + "|" + s.stacks.map((st) => st.length).join(",") + "|" + s.cleared.slice().sort().join(",");
  const states = new Map([[key(s0), { s: s0, next: [], win: isWon(s0) }]]);
  const todo = [key(s0)];
  while (todo.length) {
    const k = todo.pop()!;
    const node = states.get(k);
    for (const m of allMoves(node.s)) {
      const out = move(node.s, m);
      if (!out) continue;
      const k2 = key(out.state);
      node.next.push(k2);
      if (states.has(k2)) continue;
      if (states.size >= cap) return null;
      states.set(k2, { s: out.state, next: [], win: isWon(out.state) });
      todo.push(k2);
    }
  }
  // a position can be won if some move leads to one that can
  for (let changed = true; changed; ) {
    changed = false;
    for (const node of states.values()) if (!node.win && node.next.some((k) => states.get(k).win)) (node.win = true), (changed = true);
  }
  return [...states.values()];
}

let positions = 0, unsound = 0, optimistic = 0, hintBad = 0;
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
  const graph = realGraph(deal);
  if (graph) {
    // up to 150 positions a deal, spread through the graph
    const step = Math.max(1, Math.floor(graph.length / 150));
    for (let j = 0; j < graph.length; j += step) {
      const { s, win } = graph[j];
      if (isWon(s)) continue;
      positions++;
      const g2 = new Game(s);
      const a = g2.wins(g2.root);
      if (!a && win) {
        unsound++;
        console.error(`UNSOUND doomed, deal ${i}: ${JSON.stringify(s)}`);
        process.exitCode = 1;
      }
      if (a && !win) optimistic++;
      const h = nextMove(s);
      if ("doomed" in h && win) hintBad++;
      if ("move" in h) {
        let t = s;
        for (const m of h.line) t = move(t, m)?.state ?? t;
        if (!isWon(t)) hintBad++;
      }
      if (hintBad) process.exitCode = 1;
    }
  }
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
console.log(`${positions} positions in play: ${unsound} doomed but winnable (must be 0), ${optimistic} winning but lost (the known rare case), ${hintBad} wrong hints (must be 0)`);
