// The Difficulty editor's worker thread: everything that loads the game's sources (the rules, the
// solver, the level plans) runs here, in a module graph of its own, never in the server. Node keeps
// a module that failed to load failed for the life of its graph, so a load caught mid-edit (an
// agent halfway through changing the solver) would otherwise break the editor until it restarted.
// The server (server.mjs) throws a worker away when a call fails or the sources change, and the next
// request starts a fresh one: a break clears on the next reload.
//
// Messages in: { id, op, args }; out: { id, result } or { id, error }.
//   measures(levels)      [{ careless, reader, safe, deadFirstMoves, doomingFirstClears }] a board
//   opening(level)        the board as it opens and each stack's waiting cards
//   targets(lane, levels) each board's careless-win target [lo, hi] (or null), from its plan

import { parentPort } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

// loaded on demand, so a failure is an answer to a call, not a dead worker
let measure = null;
const load = async () => (measure ??= await import("./measure.mjs"));
const plan = (rel) => import(pathToFileURL(path.join(root, rel)).href);

const ops = {
  async measures(levels) {
    const m = await load();
    return levels.map((l) => {
      const c = typeof l.axes?.careless === "number" ? l.axes.careless : m.careless(l);
      return { careless: c, reader: m.reader(l), ...m.safeStart(l) };
    });
  },
  async opening(level) {
    return (await load()).opening(level);
  },
  async targets(lane, levels) {
    if (lane === "campaign") {
      const { PLAN } = await plan("tools/levels/campaign-plan.mts");
      return levels.map((_, i) => PLAN[i]?.careless ?? null);
    }
    if (lane === "challenge") {
      const { PLAN } = await plan("tools/levels/challenge-plan.mts");
      return levels.map((_, i) => PLAN[i]?.careless ?? null);
    }
    const { WEEK } = await plan("tools/levels/daily-plan.mts");
    return levels.map((l) => WEEK.find((r) => r.role === l.axes?.role)?.careless ?? null);
  },
};

parentPort.on("message", async ({ id, op, args }) => {
  try {
    parentPort.postMessage({ id, result: await ops[op](...args) });
  } catch (e) {
    parentPort.postMessage({ id, error: e?.message ?? String(e) });
  }
});
