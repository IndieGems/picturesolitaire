// Re-proves every shipped board. Run: node tools/levels/check.mts [file ...]
// (default: every .json in src/content/levels). Exit code 0 = every board passes.
//
// For each board:
//   - its pictures are in the catalogue at the same size, and the stacks hold
//     every card of every picture exactly once;
//   - DETERMINISM: the generator deals exactly these stacks from the board's
//     id and seed (src/game/levels/generate.ts, dealFor), so the same id and
//     seed give the same deal on every device;
//   - the opening has nothing joined or finished and is not a dead end;
//   - PROOF: the stored line, moves only (no undo, hint or shuffle), replays on
//     the real rules (src/game/rules.ts) to a won board;
//   - the solver agrees the deal is winnable (exact, not a timed guess), and the
//     axes stored with the board are what the deal measures;
//   - a board with a par: the par is the stored line's length (so the par is
//     always reachable, by that line);
//   - a daily board: its id is "d" + its date, and dates run one a day;
//   - no board uses a picture the creator flagged "don't use"
//     (src/content/picture-flags.json; node tools/levels/redeal.mts re-deals them);
//   - the relaxed campaign (campaign.json) and the dev menu's experiment
//     boards (experiments.json): a safe start (AGENTS.md): every
//     picture finishable from the opening can be finished first without
//     dooming the board, and no single move from the opening leaves it stuck.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cardsOf, isDeadEnd, isWon, joinCount, replay, start } from "../../src/game/rules.ts";
import { Game } from "../../src/game/solver/index.ts";
import { along, careless, chain, orderTraps, traps, unavoidable, wait } from "../../src/game/solver/metrics.ts";
import { BIG, dealFor, deadFirstMoves, doomingFirstClears } from "../../src/game/levels/generate.ts";
import { flags } from "./lib.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogue = new Map(JSON.parse(readFileSync(join(root, "src/content/pictures.json"), "utf8")).pictures.map((p) => [p.id, p]));
const files = process.argv.slice(2);
const dir = join(root, "src/content/levels");
if (!files.length) for (const f of readdirSync(dir).sort()) if (f.endsWith(".json")) files.push(join(dir, f));

let boards = 0;
let failed = 0;
const flaggedUses = [];
for (const id of flags.keys()) if (!catalogue.has(id)) console.warn(`picture-flags.json flags ${id}, which is not in the catalogue`);
for (const file of files) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const ids = new Set();
  let lastDate = null;
  for (const l of data.levels) {
    boards++;
    const problems = [];
    const fail = (msg) => problems.push(msg);
    try {
      if (ids.has(l.id)) fail("id used twice");
      ids.add(l.id);
      if (![0, 1, 2].includes(l.peek)) fail(`peek ${l.peek}`);
      if (l.par !== undefined && l.par !== l.line.length) fail(`par ${l.par} but the line has ${l.line.length} moves`);
      if (l.date !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(l.date) || l.id !== `d${l.date}`) fail(`date ${l.date} and id ${l.id} do not match`);
        const next = lastDate && new Date(Date.parse(lastDate + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
        if (lastDate && l.date !== next) fail(`date ${l.date} does not follow ${lastDate}`);
        lastDate = l.date;
      }
      for (const p of l.pictures) {
        if (flags.has(p.id)) {
          const note = flags.get(p.id).note;
          fail(`uses flagged picture ${p.id}`);
          flaggedUses.push({ board: l.id, line: `board ${l.id} uses flagged picture ${p.id}${note ? ` ("${note}")` : ""}` });
        }
        const c = catalogue.get(p.id);
        if (!c) fail(`no picture ${p.id} in the catalogue`);
        else if (c.cols !== p.cols || c.rows !== p.rows) fail(`${p.id} is ${c.cols}x${c.rows} in the catalogue, ${p.cols}x${p.rows} here`);
      }
      const want = l.pictures.flatMap((_, i) => cardsOf(l.pictures, i)).sort((a, b) => a - b);
      const have = l.stacks.flat().sort((a, b) => a - b);
      if (want.join() !== have.join()) fail("the stacks do not hold every card exactly once");
      const deal = { cols: l.cols, rows: l.rows, pictures: l.pictures, stacks: l.stacks, seed: l.seed };
      const again = dealFor({ id: l.id, cols: l.cols, rows: l.rows, pictures: l.pictures, targets: {} }, l.seed);
      if (JSON.stringify(again.stacks) !== JSON.stringify(l.stacks)) fail("the generator does not deal these stacks from this id and seed");
      const s = start(deal).state;
      if (s.cleared.length || joinCount(s) > 0) fail("something is joined or finished at the opening");
      if (isDeadEnd(s)) fail("the opening is a dead end");
      if (file.endsWith("campaign.json") || file.endsWith("experiments.json")) {
        const dead = deadFirstMoves(deal);
        if (dead.length) fail(`${dead.length} first move(s) leave the board stuck, e.g. ${dead[0].from} to ${dead[0].to}`);
        const g0 = new Game(s);
        const doom = doomingFirstClears(g0);
        if (doom.length) fail(`finishing ${doom.map((st) => `${l.pictures[st.pic].id} at column ${st.col}`).join(", ")} first dooms the board`);
      }
      const line = l.line.map(([from, to]) => ({ from, to }));
      let won = false;
      try {
        won = isWon(replay(deal, line));
      } catch (err) {
        fail(`the line breaks: ${err.message}`);
      }
      if (!won) fail("the line does not win");
      const game = new Game(s);
      if (!game.wins(game.root)) fail("the solver says the deal cannot be won");
      if (l.axes && won) {
        const a = l.axes;
        const ch = chain(game);
        const cl = Math.round(careless(game) * 1000) / 1000;
        const tr = traps(game, along(game, deal, line));
        if (a.chain !== ch) fail(`chain is ${ch}, the data says ${a.chain}`);
        if (Math.abs(a.careless - cl) > 0.001) fail(`careless win is ${cl}, the data says ${a.careless}`);
        if (a.traps !== tr) fail(`traps are ${tr}, the data says ${a.traps}`);
        if (a.peek !== l.peek) fail("axes.peek differs from peek");
        if (a.lineMoves !== l.line.length) fail("axes.lineMoves differs from the line");
        if (a.bigWait !== undefined) {
          const w = wait(game);
          const bw = Math.max(0, ...l.pictures.map((p, i) => (p.cols * p.rows >= BIG ? w[i] : 0)));
          if (a.bigWait !== bw) fail(`big wait is ${bw}, the data says ${a.bigWait}`);
        }
        if (a.orderTraps !== undefined && a.orderTraps !== unavoidable(game, "clear")) fail(`order traps are ${unavoidable(game, "clear")}, the data says ${a.orderTraps}`);
        if (a.lineOrderTraps !== undefined && a.lineOrderTraps !== orderTraps(game, along(game, deal, line))) fail("line order traps differ");
      }
    } catch (err) {
      fail(`check crashed: ${err.stack}`);
    }
    if (problems.length) {
      failed++;
      console.error(`FAIL ${l.id}: ${problems.join("; ")}`);
    }
  }
}
if (flaggedUses.length)
  console.error(
    `\nPictures flagged "don't use" are on ${new Set(flaggedUses.map((u) => u.board)).size} board(s):\n  ${flaggedUses.map((u) => u.line).join("\n  ")}\n` +
      `Re-deal them, keeping every other board as it is: node tools/levels/redeal.mts\n`,
  );
console.log(failed ? `${failed} of ${boards} boards FAILED` : `all ${boards} boards proved: each line wins on the real rules with no helpers`);
process.exitCode = failed ? 1 : 0;
