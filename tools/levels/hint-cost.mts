// What Hint costs, and that every hint is safe. Run: node tools/levels/hint-cost.mts [positions per board=60]
// For each shipped board (campaign, challenge, and the first 30 dailies), a
// player who follows a hint half the time and otherwise plays any move
// reaches positions; at each, nextMove (src/game/solver/index.ts) is timed,
// and its answer is checked: a move's line must play to a won board on the
// real rules. Prints the time per board size and how often each answer came.
// Exit code 0 = every line won.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { allMoves, isWon, move, random, start } from "../../src/game/rules.ts";
import { nextMove } from "../../src/game/solver/index.ts";
import { root } from "./lib.mts";

const PER = Number(process.argv[2] ?? 60);
const read = (f) => JSON.parse(readFileSync(join(root, "src/content/levels", f), "utf8")).levels;
const boards = [...read("campaign.json"), ...read("challenge.json"), ...read("daily.json").slice(0, 30)];
const rnd = random(424242);
const bySize = new Map();
const answers = { move: 0, doomed: 0, unknown: 0 };
let badLines = 0;
for (const l of boards) {
  const deal = { cols: l.cols, rows: l.rows, pictures: l.pictures, stacks: l.stacks, seed: l.seed };
  let s = start(deal).state;
  for (let k = 0; k < PER; k++) {
    if (isWon(s)) s = start(deal).state;
    const t0 = performance.now();
    const a = nextMove(s, 20_000);
    const ms = performance.now() - t0;
    const size = `${l.cols}x${l.rows}`;
    if (!bySize.has(size)) bySize.set(size, []);
    bySize.get(size).push(ms);
    const kind = "move" in a ? "move" : "doomed" in a ? "doomed" : "unknown";
    answers[kind]++;
    if ("move" in a) {
      let t = s;
      for (const m of a.line) t = move(t, m)?.state ?? t;
      if (!isWon(t)) badLines++;
    }
    // half the time take the hint, else any move; a doomed or stuck board starts again
    const ms2 = allMoves(s);
    const m = "move" in a && rnd() < 0.5 ? a.move : ms2[Math.floor(rnd() * ms2.length)];
    const out = m && move(s, m);
    s = out && kind !== "doomed" ? out.state : start(deal).state;
  }
}
const q = (arr) => {
  const a = [...arr].sort((x, y) => x - y);
  return [0.5, 0.9, 0.99, 1].map((f) => a[Math.min(a.length - 1, Math.floor(a.length * f))].toFixed(1)).join(" / ");
};
for (const [size, ms] of [...bySize].sort()) console.log(`${size}: ${ms.length} positions, ms p50 / p90 / p99 / max: ${q(ms)}`);
console.log(`answers: ${JSON.stringify(answers)}; lines that did not win: ${badLines}`);
process.exitCode = badLines ? 1 : 0;
