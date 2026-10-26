// Trips: the creator's view of every trip's postcards, in the Editor's rail. Read-only. Plain
// Node, no packages of its own.
//
// Started by the Gem host from gem-game.json (process "trips"): the host ASSIGNS the port in
// TRIPS_PORT, and this prints `TRIPS_PORT <port>` once it is listening, the ready line
// the manifest waits for. It binds the literal 127.0.0.1 (never `localhost`, which can resolve to
// IPv6 only). Run by hand without TRIPS_PORT it takes any free port and prints that.
//
// It watches nothing: every request reads the files again, so a reload of the page shows what Art,
// Levels and UI have changed since.
//
//   GET  /                the page (index.html, app.js, style.css beside this file)
//   GET  /api/data        the trips with each board's postcard
//   GET  /pictures/<path> the game's picture files (public/pictures/)
//   GET  /art/<path>      the game's art (public/art/: trip stamps)
//
// Where it reads:
//   src/content/levels/trips.json      the trips, in order, and their boards (1-based, campaign)
//   src/content/levels/campaign.json   each board's destination { id, crop }
//   src/content/pictures.json          "destinations": name, place, tag, medium, window, files
//   public/art/stamps/stamp-<id>.webp  a trip's stamp

import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..", "..");
const publicDir = path.join(projectRoot, "public");

const PAGE = { "/": "index.html", "/index.html": "index.html", "/app.js": "app.js", "/style.css": "style.css" };
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};

/** A JSON file, or the fallback with a note when it is missing or caught mid-save. */
async function readJson(rel, fallback, problems) {
  try {
    return JSON.parse(await fs.readFile(path.join(projectRoot, rel), "utf8"));
  } catch (e) {
    problems.push(e.code === "ENOENT" ? `${rel} is not there yet.` : `${rel} could not be read just now (someone may be saving it); reload in a moment.`);
    return fallback;
  }
}

async function exists(rel) {
  try {
    return (await fs.stat(path.join(publicDir, ...rel.split("/")))).isFile();
  } catch {
    return false;
  }
}

/** A file's change time, so a replaced picture redraws (?v=). */
async function version(rel) {
  try {
    return Math.floor((await fs.stat(path.join(publicDir, ...rel.split("/")))).mtimeMs);
  } catch {
    return 0;
  }
}

/** What the page draws for one postcard. */
async function picture(d, crop) {
  if (!d) return null;
  const v = await version(d.file);
  return {
    id: d.id,
    name: d.name ?? null,
    place: d.place ?? null,
    tag: d.tag ?? null,
    medium: d.medium ?? null,
    cols: d.cols,
    rows: d.rows,
    window: d.window ?? [2, 2],
    crop: crop ?? d.crop ?? [0, 0],
    // the small passport copy for the grid (300 px wide), the full picture when tapped
    thumb: `/pictures/${(d.thumb ?? d.board ?? d.file).replace(/^pictures\//, "")}?v=${v}`,
    full: `/pictures/${d.file.replace(/^pictures\//, "")}?v=${v}`,
  };
}

async function data() {
  const problems = [];
  const catalogue = await readJson("src/content/pictures.json", { destinations: [] }, problems);
  const byId = new Map((catalogue.destinations ?? []).map((d) => [d.id, d]));
  const trips = await readJson("src/content/levels/trips.json", { trips: [] }, problems);
  const campaign = await readJson("src/content/levels/campaign.json", { levels: [] }, problems);
  const levels = campaign.levels ?? [];

  const tripsOut = [];
  for (const t of trips.trips ?? []) {
    const boards = [];
    for (let n = t.from; n <= t.to; n++) {
      const level = levels[n - 1];
      const dest = level?.destination;
      const d = dest ? byId.get(dest.id) : null;
      if (dest && !d) problems.push(`Board ${n} names the postcard ${dest.id}, which the picture catalogue does not have.`);
      boards.push({ n, level: level?.id ?? null, picture: await picture(d, dest?.crop) });
    }
    const stamp = `art/stamps/stamp-${t.id}.webp`;
    tripsOut.push({ id: t.id, name: t.name, from: t.from, to: t.to, stamp: (await exists(stamp)) ? `/${stamp}?v=${await version(stamp)}` : null, boards });
  }

  return { trips: tripsOut, problems };
}

function send(res, status, body, type = "application/json; charset=utf-8", extra = {}) {
  const out = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-cache", ...extra });
  res.end(out);
}

async function sendFile(req, res, file) {
  let s;
  try {
    s = await fs.stat(file);
    if (!s.isFile()) throw new Error("not a file");
  } catch {
    return send(res, 404, { error: "not found" });
  }
  const etag = `"${s.size.toString(36)}-${Math.floor(s.mtimeMs).toString(36)}"`;
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, { ETag: etag, "Cache-Control": "no-cache" });
    return res.end();
  }
  send(res, 200, await fs.readFile(file), TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream", { ETag: etag });
}

/** A file under one of public/'s folders, never outside it. */
function under(dir, route, prefix) {
  const base = path.join(publicDir, dir);
  const file = path.resolve(base, decodeURIComponent(route.slice(prefix.length)));
  return file.startsWith(base + path.sep) ? file : null;
}

let port = Number(process.env.TRIPS_PORT) || 0;

const server = createServer(async (req, res) => {
  try {
    // only this machine's own address, by name: a page elsewhere cannot reach it by DNS tricks
    const host = String(req.headers.host ?? "");
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return send(res, 403, { error: "wrong host" });
    if (req.method !== "GET") return send(res, 405, { error: "read-only" });
    const route = new URL(req.url ?? "/", `http://${host}`).pathname;
    if (PAGE[route]) return sendFile(req, res, path.join(here, PAGE[route]));
    if (route === "/api/data") return send(res, 200, await data());
    if (route === "/fonts/fredoka-latin.woff2") return sendFile(req, res, path.join(publicDir, "fonts", "fredoka-latin.woff2"));
    const file = route.startsWith("/pictures/") ? under("pictures", route, "/pictures/") : route.startsWith("/art/") ? under("art", route, "/art/") : null;
    if (file) return sendFile(req, res, file);
    send(res, 404, { error: "not found" });
  } catch (e) {
    console.error("[trips]", e);
    send(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(port, "127.0.0.1", () => {
  port = server.address().port;
  console.log(`TRIPS_PORT ${port}`);
});
