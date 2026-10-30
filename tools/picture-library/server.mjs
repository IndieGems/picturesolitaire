// The Picture Library: the creator's view of every puzzle picture, in the Editor's rail.
// Plain Node, no packages of its own.
//
// Started by the Gem host from gem-game.json (process "pictures"): the host ASSIGNS the port in
// PICTURES_PORT, and this prints `PICTURES_PORT <port>` once it is listening, the ready line the
// manifest waits for. It binds the literal 127.0.0.1 (never `localhost`, which can resolve to IPv6
// only). Run by hand without PICTURES_PORT it takes any free port and prints that.
//
// It watches nothing: every request reads what it needs from disk, so pictures Art adds to
// src/content/pictures.json, and boards Levels re-deals, show without a restart. The page asks
// for /api/stamp every few seconds and reloads the library when it changes.
//
//   GET  /                   the page (index.html, app.js, style.css beside this file)
//   GET  /api/library        the catalogue, each picture with where it is used and its flag
//   GET  /api/stamp          a fingerprint of the files the library is made from
//   PUT  /api/flag           { id, flagged, note } -> src/content/picture-flags.json
//   PUT  /api/redraw         { id, redraw, note }  -> src/content/picture-redraws.json
//   GET  /pictures/<path>    the game's picture files (public/pictures/), thumbs included
//
// src/content/picture-flags.json is { v: 1, pictures: { <id>: { flagged, note, date } } }, the
// shape the Levels member's board makers and build check read. Flagging never deletes a
// picture or a board; unflagging keeps the entry with flagged: false (and its note), so what was
// said stays readable. The Levels member's build check refuses pictures with flagged: true.
//
// src/content/picture-redraws.json is { v: 1, pictures: { <id>: { redraw, note, date } } }: the
// creator's "Redraw cleaner" marks (2026-10-30), Art's to-do list of pictures to redraw in the flat,
// smooth style. Separate from the flag on purpose: a picture marked for redraw stays in the game and
// never fails a build. Unmarking keeps the entry with redraw: false, as a flag does.
//
// Writes (both files) are serialised, read-modify-write against the file as it is on disk now, and
// atomic (temp file + rename). Neither write ever touches the other's file.

import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..", "..");
const contentDir = path.join(projectRoot, "src", "content");
const picturesFile = path.join(contentDir, "pictures.json");
// Art's plan, which the catalogue is written from: the families' own titles are there
const planFile = path.join(projectRoot, "tools", "art", "pictures-plan.json");
// a card's shape: the board's default (TUNING.cardAspect), then the game config's board JSON over it
const tuningFile = path.join(projectRoot, "src", "board", "tuning.ts");
const configFile = path.join(projectRoot, "gem-backend-game-config.yaml");
const flagsFile = path.join(contentDir, "picture-flags.json");
const redrawsFile = path.join(contentDir, "picture-redraws.json");
const LANES = ["campaign", "challenge", "daily"];
const levelFile = (lane) => path.join(contentDir, "levels", `${lane}.json`);
const publicDir = path.join(projectRoot, "public");
const picturesDir = path.join(publicDir, "pictures");

const PAGE = { "/": "index.html", "/index.html": "index.html", "/app.js": "app.js", "/style.css": "style.css" };
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
};
const NOTE_MAX = 200;

class BadRequest extends Error {}

// ---------------------------------------------------------------------------
// Reading the project's files. A JSON file caught mid-write (Art adding pictures, Levels
// re-dealing) keeps its last good reading, and the page says so instead of going blank.

const lastGood = new Map();

async function readJson(file, fallback) {
  let text;
  try {
    text = await fs.readFile(file, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return { data: fallback, problem: null };
    throw e;
  }
  try {
    const data = JSON.parse(text);
    lastGood.set(file, data);
    return { data, problem: null };
  } catch {
    const kept = lastGood.get(file);
    const name = path.relative(projectRoot, file).replaceAll("\\", "/");
    return { data: kept ?? fallback, problem: `${name} could not be read just now (someone may be saving it); ${kept ? "showing the last good copy" : "it is left out"}.` };
  }
}

/** A file's change time (a version for its URL, so a replaced picture redraws), or 0 when it is not there. */
async function changed(file) {
  try {
    const s = file && (await fs.stat(file));
    return s && s.isFile() ? Math.floor(s.mtimeMs) : 0;
  } catch {
    return 0;
  }
}

/** The picture files sit under public/: a catalogue path is relative to it. */
const publicPath = (rel) => (typeof rel === "string" && rel ? path.join(publicDir, ...rel.split("/")) : null);

/**
 * A card's width ÷ height, as the board reads it: the default in src/board/tuning.ts, unless the
 * game config's board JSON (gem-backend-game-config.yaml) sets "cardAspect". 1 before there was one.
 */
async function cardAspect() {
  const read = (f) => fs.readFile(f, "utf8").catch(() => "");
  const [tuning, config] = await Promise.all([read(tuningFile), read(configFile)]);
  const fromConfig = /"cardAspect"\s*:\s*([0-9]*\.?[0-9]+)/.exec(config);
  const fromTuning = /\bcardAspect\s*:\s*([0-9]*\.?[0-9]+)/.exec(tuning);
  const a = Number((fromConfig ?? fromTuning)?.[1]);
  return a >= 0.3 && a <= 3 ? a : 1;
}

/** Today on this machine, as the daily boards date themselves (YYYY-MM-DD). */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function library() {
  const problems = [];
  const cat = await readJson(picturesFile, { albums: [], pictures: [] });
  if (cat.problem) problems.push(cat.problem);
  const flagFile = await readJson(flagsFile, {});
  if (flagFile.problem) problems.push(flagFile.problem);
  const flags = flagMap(flagFile.data);
  const redrawFile = await readJson(redrawsFile, {});
  if (redrawFile.problem) problems.push(redrawFile.problem);
  const redraws = flagMap(redrawFile.data);

  // where each picture is used: board ids per lane, in the order the lane plays them
  const used = new Map();
  const boards = {};
  const now = today();
  for (const lane of LANES) {
    const file = await readJson(levelFile(lane), { levels: [] });
    if (file.problem) problems.push(file.problem);
    const levels = Array.isArray(file.data?.levels) ? file.data.levels : [];
    boards[lane] = levels.length;
    levels.forEach((lvl, i) => {
      for (const p of Array.isArray(lvl?.pictures) ? lvl.pictures : []) {
        if (!p?.id) continue;
        if (!used.has(p.id)) used.set(p.id, { campaign: [], challenge: [], daily: [] });
        const list = used.get(p.id)[lane];
        // a picture is in a board once, however the board deals it
        if (list.some((b) => b.n === i + 1)) continue;
        list.push(lane === "daily" ? { n: i + 1, id: lvl.id, date: lvl.date, ahead: typeof lvl.date === "string" && lvl.date >= now } : { n: i + 1, id: lvl.id });
      }
    });
  }

  const albums = Array.isArray(cat.data?.albums) ? cat.data.albums : [];
  const raw = Array.isArray(cat.data?.pictures) ? cat.data.pictures : [];
  const pictures = await Promise.all(
    raw
      .filter((p) => p && typeof p.id === "string")
      .map(async (p) => {
        const flag = flags[p.id];
        const rd = redraws[p.id];
        const u = used.get(p.id) ?? { campaign: [], challenge: [], daily: [] };
        const [fileV, thumbV] = await Promise.all([changed(publicPath(p.file)), changed(publicPath(p.thumb))]);
        return {
          ...p,
          fileV,
          thumbV,
          used: u,
          usedTotal: u.campaign.length + u.challenge.length + u.daily.length,
          flag: flag && typeof flag === "object" ? { flagged: flag.flagged === true, note: String(flag.note ?? ""), date: String(flag.date ?? "") } : null,
          redraw: rd && typeof rd === "object" ? { redraw: rd.redraw === true, note: String(rd.note ?? ""), date: String(rd.date ?? "") } : null,
        };
      }),
  );
  const plan = await readJson(planFile, {});
  const familyTitles = {};
  for (const [id, f] of Object.entries(plan.data?.families ?? {})) if (typeof f?.title === "string") familyTitles[id] = f.title;
  return { albums, pictures, boards, familyTitles, cardAspect: await cardAspect(), today: now, problems };
}

/** A fingerprint of every file the library is made from: the page reloads when it changes. */
async function stamp() {
  const files = [picturesFile, flagsFile, redrawsFile, planFile, tuningFile, configFile, ...LANES.map(levelFile)];
  const parts = await Promise.all(
    files.map(async (f) => {
      try {
        const s = await fs.stat(f);
        return `${s.size}:${s.mtimeMs}`;
      } catch {
        return "-";
      }
    }),
  );
  // a new or replaced thumb changes its folder's listing time
  try {
    const s = await fs.stat(path.join(picturesDir, "thumbs"));
    parts.push(String(s.mtimeMs));
  } catch {
    parts.push("-");
  }
  return parts.join("|");
}

/** The flags (or the redraw marks) by id, from the file's { v, pictures } (an empty or odd file holds nothing). */
function flagMap(data) {
  const map = data && typeof data === "object" ? data.pictures : null;
  return map && typeof map === "object" && !Array.isArray(map) ? map : {};
}

// ---------------------------------------------------------------------------
// Writing a flag: one write at a time, against the file as it is now.

let writing = Promise.resolve();

function setFlag(body) {
  const run = writing.then(async () => {
    if (!body || typeof body !== "object") throw new BadRequest("send { id, flagged, note }");
    const { id, flagged } = body;
    if (typeof id !== "string" || !id) throw new BadRequest("which picture? (id)");
    if (typeof flagged !== "boolean") throw new BadRequest("flagged must be true or false");
    const note = String(body.note ?? "").replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);
    const cat = await readJson(picturesFile, { pictures: [] });
    const known = (cat.data?.pictures ?? []).some((p) => p?.id === id);
    if (!known) throw new BadRequest(`no picture "${id}" in the catalogue`);

    let flags = {};
    try {
      flags = { ...flagMap(JSON.parse(await fs.readFile(flagsFile, "utf8"))) };
    } catch (e) {
      // a missing file starts empty; an unreadable one is never written over
      if (e.code !== "ENOENT") throw new Error("src/content/picture-flags.json could not be read, so nothing was changed");
    }
    flags[id] = { flagged, note, date: today() };
    const sorted = Object.fromEntries(Object.keys(flags).sort().map((k) => [k, flags[k]]));
    await writeAtomic(flagsFile, `${JSON.stringify({ v: 1, pictures: sorted }, null, 2)}\n`);
    return flags[id];
  });
  writing = run.catch(() => undefined);
  return run;
}

/** Mark a picture to be redrawn cleaner, or unmark it: the same care as a flag, in its own file. */
function setRedraw(body) {
  const run = writing.then(async () => {
    if (!body || typeof body !== "object") throw new BadRequest("send { id, redraw, note }");
    const { id, redraw } = body;
    if (typeof id !== "string" || !id) throw new BadRequest("which picture? (id)");
    if (typeof redraw !== "boolean") throw new BadRequest("redraw must be true or false");
    const note = String(body.note ?? "").replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);
    const cat = await readJson(picturesFile, { pictures: [] });
    const known = (cat.data?.pictures ?? []).some((p) => p?.id === id);
    if (!known) throw new BadRequest(`no picture "${id}" in the catalogue`);

    let marks = {};
    try {
      marks = { ...flagMap(JSON.parse(await fs.readFile(redrawsFile, "utf8"))) };
    } catch (e) {
      // a missing file starts empty; an unreadable one is never written over
      if (e.code !== "ENOENT") throw new Error("src/content/picture-redraws.json could not be read, so nothing was changed");
    }
    marks[id] = { redraw, note, date: today() };
    const sorted = Object.fromEntries(Object.keys(marks).sort().map((k) => [k, marks[k]]));
    await writeAtomic(redrawsFile, `${JSON.stringify({ v: 1, pictures: sorted }, null, 2)}\n`);
    return marks[id];
  });
  writing = run.catch(() => undefined);
  return run;
}

async function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, text, "utf8");
  // Windows can refuse the rename for a moment while another process has the file open
  for (let tries = 0; ; tries++) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (e) {
      if (tries >= 8 || !["EPERM", "EBUSY", "EACCES"].includes(e.code)) {
        await fs.rm(tmp, { force: true });
        throw e;
      }
      await new Promise((r) => setTimeout(r, 60 * (tries + 1)));
    }
  }
}

// ---------------------------------------------------------------------------
// The server.

function send(res, status, body, type = "application/json; charset=utf-8", extra = {}) {
  const data = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-cache", ...extra });
  res.end(data);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 16_384) throw new BadRequest("too large");
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new BadRequest("not JSON");
  }
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
  const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  send(res, 200, await fs.readFile(file), type, { ETag: etag });
}

let port = Number(process.env.PICTURES_PORT) || 0;

const server = createServer(async (req, res) => {
  try {
    // only this machine's own address, by name: a page elsewhere cannot reach the API by DNS tricks
    const host = String(req.headers.host ?? "");
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return send(res, 403, { error: "wrong host" });
    const url = new URL(req.url ?? "/", `http://${host}`);
    const route = url.pathname;

    if (req.method === "GET" && PAGE[route]) return sendFile(req, res, path.join(here, PAGE[route]));
    if (req.method === "GET" && route === "/api/library") return send(res, 200, await library());
    if (req.method === "GET" && route === "/api/stamp") return send(res, 200, { stamp: await stamp() });
    if (req.method === "PUT" && route === "/api/flag") {
      // JSON only: a form posted from another page cannot send this without a preflight we never answer
      if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) return send(res, 415, { error: "send JSON" });
      return send(res, 200, { ok: true, flag: await setFlag(await readBody(req)) });
    }
    if (req.method === "PUT" && route === "/api/redraw") {
      if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) return send(res, 415, { error: "send JSON" });
      return send(res, 200, { ok: true, redraw: await setRedraw(await readBody(req)) });
    }
    // the game's own rounded font, so the library reads like the game
    if (req.method === "GET" && route === "/fonts/fredoka-latin.woff2") return sendFile(req, res, path.join(publicDir, "fonts", "fredoka-latin.woff2"));
    if (req.method === "GET" && route.startsWith("/pictures/")) {
      const rel = decodeURIComponent(route.slice("/pictures/".length));
      const file = path.resolve(picturesDir, rel);
      if (!file.startsWith(picturesDir + path.sep)) return send(res, 404, { error: "not found" });
      return sendFile(req, res, file);
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    if (e instanceof BadRequest) return send(res, 400, { error: e.message });
    console.error("[picture-library]", e);
    send(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(port, "127.0.0.1", () => {
  port = server.address().port;
  console.log(`PICTURES_PORT ${port}`);
});
