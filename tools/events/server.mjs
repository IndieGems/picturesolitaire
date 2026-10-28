// Events: the creator's view of every monthly event (the Daily Suitcase, docs/daily-suitcase.md),
// its ten pieces and its prize, and of every table and how a player gets it, in the Editor's rail
// (creator, 2026-10-28: "make an editor that shows all of the events, their pieces and rewards").
// Read-only. Plain Node, no packages of its own; it never loads the game's code.
//
// Started by the Gem host from gem-game.json (process "eventstool"): the host ASSIGNS the port in
// EVENTS_PORT, and this prints `EVENTS_PORT <port>` once it is listening, the ready line the
// manifest waits for. It binds the literal 127.0.0.1 (never `localhost`, which can resolve to IPv6
// only). Run by hand without EVENTS_PORT it takes any free port and prints that.
//
// It watches nothing: every request reads the files again, so a reload of the page shows what Art,
// Levels and Server have changed since.
//
//   GET  /                     the page (index.html, app.js, style.css beside this file)
//   GET  /api/data[?today=D]   the months, their pieces, prizes and the tables; `today` (YYYY-MM-DD)
//                              previews another day's live/next marks (default: this machine's date)
//   GET  /pictures/<path>      the game's picture files (public/pictures/)
//   GET  /art/<path>           the game's art (public/art/: the tables)
//
// Where it reads (every month is the union of the first four, the later ones winning):
//   docs/daily-suitcase.md             the twelve approved themes: items and table (the months with no
//                                      plan yet, e.g. 2027-07 on)
//   tools/art/items-plan.json          Art's plan: each item's slot and title, each month's table
//   src/content/levels/suitcases.json  Levels' schedule: each day's item (and `standIn` months)
//   src/content/pictures.json `items`  the item pictures; `standin: true` borrows a library picture
//   src/content/levels/daily.json      each day's board, to confirm it deals the scheduled item
//   src/net/suitcase-ids.json          `prize`: the helpers a full suitcase pays (the win checker's own
//                                      source, functions/checker/build.rs); `builtInTable`
//   src/net/tables.json                the tables that are items: which prize grants each
//   public/art/tables/tables.json      the tables drawn: picture, name, the default; `souvenir: tN`
//   src/content/levels/trips.json      the trips' names (a Souvenir's table)
//   src/content/levels/campaign.json   board numbers (the onboarding prize's board)

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

async function readText(rel, problems) {
  try {
    return await fs.readFile(path.join(projectRoot, rel), "utf8");
  } catch {
    problems.push(`${rel} could not be read just now; reload in a moment.`);
    return "";
  }
}

/** A public/ file's change time (0 when it is not there), so a replaced picture redraws (?v=). */
async function version(rel) {
  try {
    const s = await fs.stat(path.join(publicDir, ...rel.split("/")));
    return s.isFile() ? Math.floor(s.mtimeMs) : 0;
  } catch {
    return 0;
  }
}

/** The page's address of a public/ file, or null when it is not there. */
async function served(rel) {
  if (!rel) return null;
  const v = await version(rel);
  return v ? `/${rel}?v=${v}` : null;
}

/** The approved themes' table in docs/daily-suitcase.md: | 2026-11 | Ski Trip | a, b, ... | `table-x`: words | */
function docMonths(text) {
  const out = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\|\s*(\d{4}-\d{2})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*`(table-[a-z0-9-]+)`:?\s*([^|]*?)\s*\|\s*$/.exec(line);
    if (m) out.set(m[1], { theme: m[2], items: m[3].split(/\s*,\s*/), table: m[4], tableNote: m[5] || null });
  }
  return out;
}

const pad = (n) => String(n).padStart(2, "0");
const daysIn = (month) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
/** The first day of the month before: Art makes each month's art a month ahead (TODO.md). */
const dueBy = (month) => {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12-01` : `${y}-${pad(m - 1)}-01`;
};
/** "table-safari-camp" -> "Safari Camp", for a table planned in the doc only. */
const titleOf = (id) => id.replace(/^table-/, "").split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function data(today) {
  const problems = [];
  const [doc, plan, schedule, catalogue, daily, ids, netTables, art, trips, campaign] = await Promise.all([
    readText("docs/daily-suitcase.md", problems),
    readJson("tools/art/items-plan.json", { items: [], suitcases: [] }, problems),
    readJson("src/content/levels/suitcases.json", { months: [] }, problems),
    readJson("src/content/pictures.json", { items: [] }, problems),
    readJson("src/content/levels/daily.json", { levels: [] }, problems),
    readJson("src/net/suitcase-ids.json", {}, problems),
    readJson("src/net/tables.json", { tables: [] }, problems),
    readJson("public/art/tables/tables.json", { tables: [] }, problems),
    readJson("src/content/levels/trips.json", { trips: [] }, problems),
    readJson("src/content/levels/campaign.json", { levels: [] }, problems),
  ]);
  const fromDoc = docMonths(doc);
  const planMonth = new Map((plan.suitcases ?? []).map((s) => [s.month, s]));
  const planItem = new Map((plan.items ?? []).map((i) => [i.id, i]));
  const sched = new Map((schedule.months ?? []).map((s) => [s.month, s]));
  const catItem = new Map((catalogue.items ?? []).map((i) => [i.id, i]));
  const libraryByFile = new Map((catalogue.pictures ?? []).map((q) => [q.file, q]));
  const dayBoard = new Map((daily.levels ?? []).filter((l) => l.date).map((l) => [l.date, l]));
  const artTable = new Map((art.tables ?? []).map((t) => [t.id, t]));
  const netTable = new Map((netTables.tables ?? []).map((t) => [t.slug, t]));
  const prize = ids.prize ?? null;
  if (!prize) problems.push("src/net/suitcase-ids.json has no `prize`: the helpers a full suitcase pays are unknown.");

  const monthIds = [...new Set([...fromDoc.keys(), ...planMonth.keys(), ...sched.keys()])].sort();
  const months = [];
  for (const month of monthIds) {
    const d = fromDoc.get(month);
    const p = planMonth.get(month);
    const s = sched.get(month);
    const n = daysIn(month);
    const start = `${month}-01`;
    const end = `${month}-${pad(n)}`;
    const when = today < start ? "upcoming" : today > end ? "ended" : "live";
    const days = s?.days ?? {};
    const sItems = new Map((s?.items ?? []).map((i) => [i.id, i]));

    const items = [];
    for (let slot = 1; slot <= 10; slot++) {
      const id = `item-${month}-${pad(slot)}`;
      const c = catItem.get(id);
      const title = sItems.get(id)?.title ?? planItem.get(id)?.title ?? c?.title ?? d?.items[slot - 1] ?? null;
      const board = c ? c.board ?? c.file : null;
      const thumb = await served(board);
      const full = c ? await served(c.file) : null;
      const kind = !c ? "none" : c.standin ? "standin" : thumb ? "ready" : "missing";
      if (c && !thumb) problems.push(`${month} slot ${slot} (${title}): the picture ${board} is not in public/.`);
      const dates = Object.entries(days)
        .filter(([, v]) => v === id)
        .map(([k]) => k)
        .sort();
      items.push({ id, slot, title, kind, thumb, full, medium: c?.medium ?? planItem.get(id)?.medium ?? null, borrowed: c?.standin ? libraryByFile.get(c.file)?.title ?? c.file.replace(/^pictures\//, "") : null, dates });
    }

    // the schedule against the boards: every day of a scheduled month has its item, on its board
    let scheduled = 0;
    const offBoard = [];
    if (s) {
      for (let k = 1; k <= n; k++) {
        const date = `${month}-${pad(k)}`;
        const it = days[date];
        if (!it) {
          problems.push(`${month}: ${date} has no item in the schedule.`);
          continue;
        }
        scheduled++;
        const b = dayBoard.get(date);
        if (!b) offBoard.push(`${date} (no daily board)`);
        else if (b.item?.id !== it) offBoard.push(`${date} (its board deals ${b.item?.id ?? "no item"})`);
      }
      if (offBoard.length) problems.push(`${month}: the daily board does not deal the scheduled item on ${offBoard.join(", ")}.`);
    }

    const tableId = s?.table ?? p?.table ?? d?.table ?? null;
    const drawn = tableId ? artTable.get(tableId) : null;
    const tableTitle = drawn?.title ?? s?.tableTitle ?? p?.tableTitle ?? (tableId ? titleOf(tableId) : null);
    const builtIn = tableId && tableId === ids.builtInTable;
    const counts = { ready: 0, standin: 0, none: 0, missing: 0 };
    for (const it of items) counts[it.kind]++;
    const art =
      counts.ready === 10 && (drawn || builtIn) ? "ready" : counts.ready === 10 ? "table-missing" : counts.standin ? "standin" : counts.ready ? "partial" : "none";
    months.push({
      month,
      start,
      end,
      days: n,
      theme: s?.theme ?? p?.theme ?? d?.theme ?? null,
      when,
      art,
      counts,
      due: dueBy(month),
      scheduled,
      standInMonth: Boolean(s?.standIn),
      items,
      prize: {
        table: tableId,
        title: tableTitle,
        note: d?.tableNote ?? null,
        thumb: drawn ? await served(drawn.thumb) : null,
        drawn: Boolean(drawn),
        builtIn: Boolean(builtIn),
        item: Boolean(tableId && netTable.has(tableId)),
        helpers: prize,
      },
    });
  }
  const live = months.find((m) => m.when === "live")?.month ?? null;
  const next = months.find((m) => m.when === "upcoming")?.month ?? null;

  // the tables: every one drawn, then the prizes not drawn yet
  const tripName = new Map((trips.trips ?? []).map((t) => [t.id, t.name]));
  const boardNo = new Map((campaign.levels ?? []).map((l, i) => [l.id, i + 1]));
  const how = (id, t) => {
    const ways = [];
    if (id === art.default) ways.push({ kind: "default", text: "Every player's from the start (the default table)" });
    const net = netTable.get(id);
    if (net?.award === "onboarding") {
      const no = boardNo.get(net.board);
      ways.push({ kind: "onboarding", text: `Prize for winning the guided first board${no ? ` (board ${no})` : ""}${net.coins ? `, with ${net.coins} Coins` : ""}` });
    }
    for (const m of months)
      if (m.prize.table === id) ways.push({ kind: "event", month: m.month, text: `Prize for a full suitcase: ${m.theme}`, label: m.month });
    if (t?.souvenir)
      ways.push({ kind: "souvenir", text: `Not owned or chosen: the ${tripName.get(t.souvenir) ?? t.souvenir} Souvenir board is played on it` });
    if (net && net.award !== "onboarding" && net.award !== "suitcase") ways.push({ kind: "other", text: `Granted by: ${net.award}` });
    if (!ways.length) ways.push({ kind: "none", text: "Not given out yet: no prize grants it" });
    return ways;
  };
  const tables = [];
  for (const t of art.tables ?? []) tables.push({ id: t.id, title: t.title, thumb: await served(t.thumb), base: t.base ?? null, drawn: true, how: how(t.id, t) });
  for (const m of months)
    if (m.prize.table && !artTable.has(m.prize.table) && !tables.some((t) => t.id === m.prize.table))
      tables.push({ id: m.prize.table, title: m.prize.title, thumb: null, drawn: false, note: m.prize.note, how: how(m.prize.table, null) });
  for (const id of netTable.keys())
    if (!tables.some((t) => t.id === id)) tables.push({ id, title: netTable.get(id).title, thumb: null, drawn: false, how: how(id, null) });

  return { today, live, next, months, tables, defaultTable: art.default ?? null, spares: ids.spares ?? null, problems };
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
