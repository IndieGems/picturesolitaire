// Difficulty: the creator's view of how hard every board is, in the Editor's rail (creator,
// 2026-10-27: "an editor that shows the difficulty of each level so I can see the ebb and flow").
// Read-only. Plain Node, no packages of its own; the measures run the game's own rules and
// solver (measure.mjs).
//
// Started by the Gem host from gem-game.json (process "difficulty"): the host ASSIGNS the port
// in DIFFICULTY_PORT, and this prints `DIFFICULTY_PORT <port>` once it is listening, the ready
// line the manifest waits for. It binds the literal 127.0.0.1 (never `localhost`, which can
// resolve to IPv6 only). Run by hand without DIFFICULTY_PORT it takes any free port.
//
// It watches nothing: every request reads the level files again (measures are cached by the
// board's content, so a re-dealt board is measured afresh), so a reload shows what changed.
//
// It never loads the game's code itself. The measures and the level plans run in a worker thread
// (measure-worker.mjs) with a module graph of its own: Node keeps a module that failed to load
// failed for the life of its graph, so a load caught while someone is mid-edit would otherwise stick
// until a restart (2026-10-27: every lane answered 503 for good). The worker is thrown away when a
// call fails and when the game's sources or the plans change (their newest change time), and the
// next request starts a fresh one; the measures cache, kept here, empties with it.
//
//   GET /                     the page (index.html, app.js, style.css beside this file)
//   GET /api/lane?lane=L      every board of lane L (campaign | challenge | daily), with its numbers
//   GET /api/board?lane=L&id= one board: its numbers, its pictures and its opening (cards and stacks)
//   GET /pictures/<path>      the game's picture files (public/pictures/)
//   GET /fonts/<file>         the game's fonts (public/fonts/)
//
// Where it reads:
//   src/content/levels/{campaign,challenge,daily}.json   the boards (proved data: tools/levels)
//   src/content/levels/trips.json                         the campaign's trips
//   src/content/pictures.json                             picture and postcard files and names
//   tools/levels/{campaign,challenge,daily}-plan.mts      each board's careless-win target

import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const PAGE = { "/": "index.html", "/index.html": "index.html", "/app.js": "app.js", "/style.css": "style.css" };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const LANES = { campaign: "Campaign", challenge: "Challenge route", daily: "Daily" };

async function readJson(rel) {
  return JSON.parse(await fs.readFile(path.join(root, rel), "utf8"));
}

// ------------------------------------------------------------------ the measuring worker

/** What the worker loads: when any of it changes, a fresh worker (and fresh measures). */
const SOURCES = [path.join(root, "src", "game"), path.join(root, "tools", "levels"), path.join(here, "measure.mjs"), path.join(here, "measure-worker.mjs")];
/** The newest change time among the sources (a few dozen files: cheap on every call). */
async function sourcesStamp() {
  let latest = 0;
  const walk = async (p) => {
    const st = await fs.stat(p).catch(() => null);
    if (!st) return;
    if (!st.isDirectory()) latest = Math.max(latest, st.mtimeMs);
    else for (const e of await fs.readdir(p)) await walk(path.join(p, e));
  };
  for (const p of SOURCES) await walk(p);
  return latest;
}

/** Measures by board content: a board re-dealt under the same id is measured again. */
const cache = new Map();
const keyOf = (l) => `${l.cols}x${l.rows}|${l.seed}|${JSON.stringify(l.stacks)}`;

let worker = null;
let workerStamp = 0;
let seq = 0;
const pending = new Map();

function spawn() {
  const w = new Worker(new URL("./measure-worker.mjs", import.meta.url));
  w.on("message", ({ id, result, error }) => {
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    clearTimeout(p.timer);
    if (error) p.reject(new Error(error));
    else p.resolve(result);
  });
  w.on("error", (e) => retire(w, e));
  w.on("exit", (code) => retire(w, new Error(`the measuring worker stopped (${code})`)));
  return w;
}

/** Throw worker w away: its calls fail, and the next call starts a fresh worker. */
function retire(w, err) {
  if (worker === w) worker = null;
  for (const [id, p] of pending) {
    if (p.w !== w) continue;
    pending.delete(id);
    clearTimeout(p.timer);
    p.reject(err);
  }
  w.terminate().catch(() => {});
}

/** Run op in the worker: a fresh one when the sources changed since it started or the last call failed. */
async function call(op, ...args) {
  const stamp = await sourcesStamp();
  if (stamp !== workerStamp) {
    if (worker) retire(worker, new Error("the game's sources changed"));
    cache.clear();
    workerStamp = stamp;
  }
  worker ??= spawn();
  const w = worker;
  const id = ++seq;
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => retire(w, new Error("a measure took over two minutes")), 120_000);
      pending.set(id, { resolve, reject, timer, w });
      w.postMessage({ id, op, args });
    });
  } catch (e) {
    // most likely a source caught mid-edit: this worker's module graph may stay broken, so drop it
    if (worker === w) retire(w, e);
    throw e;
  }
}

/** Each board's careless-win target [lo, hi], from its plan (in the worker: the plans load the solver). */
const targets = (lane, levels) => call("targets", lane, levels.map((l) => ({ axes: { role: l.axes?.role } })));

/** The measures of these boards: the cached ones, and the rest from the worker in one call. */
async function measuresOf(levels) {
  const missing = levels.filter((l) => !cache.has(keyOf(l)));
  if (missing.length) {
    const got = await call("measures", missing);
    missing.forEach((l, k) => cache.set(keyOf(l), got[k]));
  }
  return levels.map((l) => cache.get(keyOf(l)));
}

const pct = (x) => Math.round(x * 1000) / 10;

async function lane(name) {
  const levels = (await readJson(`src/content/levels/${name}.json`)).levels;
  const cat = await readJson("src/content/pictures.json");
  const dests = new Map((cat.destinations ?? []).map((d) => [d.id, d]));
  // the targets first: that call is where a change in the sources empties the cache
  const tgt = await targets(name, levels);
  const all = await measuresOf(levels);
  const trips = name === "campaign" ? (await readJson("src/content/levels/trips.json")).trips : [];
  const boards = levels.map((l, i) => {
    const m = all[i];
    const long = l.pictures.every((p) => p.cols * p.rows === 2);
    const d = l.destination ? dests.get(l.destination.id) : null;
    return {
      n: i + 1,
      id: l.id,
      label: name === "daily" ? l.date : d?.name ?? null,
      role: l.axes?.role ?? null,
      mark: l.mark ?? null,
      cols: l.cols,
      rows: l.rows,
      long,
      pictures: l.pictures.length,
      cards: l.axes?.cards ?? l.pictures.reduce((n, p) => n + p.cols * p.rows, 0),
      waiting: l.axes?.waiting ?? null,
      careless: pct(m.careless),
      reader: pct(m.reader),
      traps: l.axes?.traps ?? null,
      chain: l.axes?.chain ?? null,
      moves: l.line.length,
      par: l.par ?? null,
      safe: m.safe,
      target: tgt[i] ? [pct(tgt[i][0]), pct(tgt[i][1])] : null,
      trip: trips.find((t) => i + 1 >= t.from && i + 1 <= t.to)?.id ?? null,
    };
  });
  return { lane: name, title: LANES[name], boards, trips };
}

async function board(name, id) {
  const levels = (await readJson(`src/content/levels/${name}.json`)).levels;
  const l = levels.find((x) => x.id === id);
  if (!l) return null;
  const cat = await readJson("src/content/pictures.json");
  const byId = new Map(cat.pictures.map((p) => [p.id, p]));
  const dests = new Map((cat.destinations ?? []).map((d) => [d.id, d]));
  const all = (await lane(name)).boards;
  const pictures = l.pictures.map((p) => {
    const d = dests.get(p.id);
    if (d && l.destination?.id === p.id) {
      // the window: cells crop..crop+size of the postcard's own grid
      return { id: p.id, title: d.name, cols: p.cols, rows: p.rows, img: d.board ?? d.file, grid: [d.cols, d.rows], at: l.destination.crop, postcard: true };
    }
    const c = byId.get(p.id);
    return { id: p.id, title: c?.title ?? p.id, cols: p.cols, rows: p.rows, img: c?.board ?? c?.file ?? null, grid: [p.cols, p.rows], at: [0, 0], busy: c?.busy ?? 0, medium: c?.medium ?? null };
  });
  const d = l.destination ? dests.get(l.destination.id) : null;
  return { ...all.find((b) => b.id === id), destination: d ? { id: d.id, name: d.name, place: d.place ?? null } : null, picturesOn: pictures, opening: await call("opening", l) };
}

async function file(res, abs, base) {
  const rel = path.relative(base, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return send(res, 404, "not here");
  try {
    const body = await fs.readFile(abs);
    res.writeHead(200, { "content-type": TYPES[path.extname(abs).toLowerCase()] ?? "application/octet-stream", "cache-control": "no-cache" });
    res.end(body);
  } catch {
    send(res, 404, "not here");
  }
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-cache" });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  try {
    if (PAGE[url.pathname]) return await file(res, path.join(here, PAGE[url.pathname]), here);
    if (url.pathname === "/api/lane" || url.pathname === "/api/board") {
      const name = url.searchParams.get("lane") ?? "campaign";
      if (!LANES[name]) return send(res, 400, "no such lane");
      const out = url.pathname === "/api/lane" ? await lane(name) : await board(name, url.searchParams.get("id") ?? "");
      if (!out) return send(res, 404, "no such board");
      return send(res, 200, JSON.stringify(out), "application/json; charset=utf-8");
    }
    if (url.pathname.startsWith("/pictures/")) {
      const base = path.join(root, "public", "pictures");
      return await file(res, path.join(base, ...decodeURIComponent(url.pathname.slice(10)).split("/")), base);
    }
    if (url.pathname.startsWith("/fonts/")) {
      const base = path.join(root, "public", "fonts");
      return await file(res, path.join(base, decodeURIComponent(url.pathname.slice(7))), base);
    }
    send(res, 404, "not here");
  } catch (e) {
    // a level file caught mid-save, most likely: say so, and a reload will do
    send(res, 503, JSON.stringify({ error: `Could not read the boards just now (${e.message}); reload in a moment.` }), "application/json; charset=utf-8");
  }
});

const port = Number(process.env.DIFFICULTY_PORT ?? 0);
server.listen(port, "127.0.0.1", () => console.log(`DIFFICULTY_PORT ${server.address().port}`));
