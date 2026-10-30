// Events: the creator's view of every VIP event (the Daily Suitcase, two weeks each since 2026-10-30:
// docs/vip.md, docs/daily-suitcase.md), its items and its prize, and of every table and how a player gets
// it, in the Editor's rail (creator, 2026-10-28: "make an editor that shows all of the events, their
// pieces and rewards"). Read-only. Plain Node, no packages of its own; it never loads the game's code.
//
// Started by the Gem host from gem-game.json (process "eventstool"): the host ASSIGNS the port in
// EVENTS_PORT, and this prints `EVENTS_PORT <port>` once it is listening, the ready line the
// manifest waits for. It binds the literal 127.0.0.1 (never `localhost`, which can resolve to IPv6
// only). Run by hand without EVENTS_PORT it takes any free port and prints that.
//
// It watches nothing: every request reads the files again, so a reload of the page shows what Art,
// Levels and Server have changed since. The data code is data.mjs, imported afresh when it changes.
//
//   GET  /                     the page (index.html, app.js, style.css beside this file)
//   GET  /api/data[?today=D]   the events, their items, prizes and the tables; `today` (YYYY-MM-DD)
//                              previews another day's live/next marks (default: this machine's date)
//   GET  /pictures/<path>      the game's picture files (public/pictures/)
//   GET  /art/<path>           the game's art (public/art/: the tables)
//
// Where it reads:
//   src/content/levels/events.json     Levels' schedule: each event's theme, table, items and each day's item
//   src/content/pictures.json `items`  the item pictures; `standin: true` borrows a library picture
//   src/content/levels/daily.json      each day's board, to confirm it deals the scheduled item
//   docs/daily-suitcase.md             the approved themes: those no event uses yet wait for a date
//   src/net/suitcase-ids.json          `prize`: the helpers a full suitcase pays (the win checker's own
//                                      source, functions/checker/build.rs); `spares`; `builtInTable`
//   src/net/tables.json                the tables that are items, and how each is granted
//   public/art/tables/tables.json      the tables drawn: picture, name, the default; `souvenir: tN`
//   src/content/levels/trips.json      the trips' names (a Souvenir's table)
//   src/content/levels/campaign.json   board numbers (the onboarding prize's board)

import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

/** data.mjs, imported afresh when it has changed since the last request (its change time in the URL). */
const DATA = path.join(here, "data.mjs");
async function dataModule() {
  const v = Math.floor((await fs.stat(DATA)).mtimeMs);
  return import(`${pathToFileURL(DATA).href}?v=${v}`);
}

let port = Number(process.env.EVENTS_PORT) || 0;

const server = createServer(async (req, res) => {
  try {
    // only this machine's own address, by name: a page elsewhere cannot reach it by DNS tricks
    const host = String(req.headers.host ?? "");
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return send(res, 403, { error: "wrong host" });
    if (req.method !== "GET") return send(res, 405, { error: "read-only" });
    const url = new URL(req.url ?? "/", `http://${host}`);
    const route = url.pathname;
    if (PAGE[route]) return sendFile(req, res, path.join(here, PAGE[route]));
    if (route === "/api/data") {
      const asked = url.searchParams.get("today");
      const { data, localToday } = await dataModule();
      return send(res, 200, await data(asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : localToday()));
    }
    if (route === "/fonts/fredoka-latin.woff2") return sendFile(req, res, path.join(publicDir, "fonts", "fredoka-latin.woff2"));
    const file = route.startsWith("/pictures/") ? under("pictures", route, "/pictures/") : route.startsWith("/art/") ? under("art", route, "/art/") : null;
    if (file) return sendFile(req, res, file);
    send(res, 404, { error: "not found" });
  } catch (e) {
    console.error("[events]", e);
    send(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(port, "127.0.0.1", () => {
  port = server.address().port;
  console.log(`EVENTS_PORT ${port}`);
});
