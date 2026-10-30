// Events: the data behind the page (server.mjs serves it at /api/data). Kept in a module of its own so
// that server.mjs loads it afresh whenever this file changes: a fix here shows on the next reload of the
// page, with no restart of the process the Editor started. What it reads is listed in server.mjs.
// Since 2026-10-30 the events are two weeks each, for VIP members (docs/vip.md): Levels' events.json
// lists them, and the approved monthly themes of docs/daily-suitcase.md wait there for a date.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..", "..");
const publicDir = path.join(projectRoot, "public");

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
function docThemes(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\|\s*(\d{4}-\d{2})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*`(table-[a-z0-9-]+)`:?\s*([^|]*?)\s*\|\s*$/.exec(line);
    if (m) out.push({ month: m[1], theme: m[2], items: m[3].split(/\s*,\s*/), table: m[4], tableNote: m[5] || null });
  }
  return out;
}

const pad = (n) => String(n).padStart(2, "0");
/** The first day of the month before `date`'s: Art makes an event's art a month ahead (TODO.md). */
const dueBy = (date) => {
  const [y, m] = date.split("-").map(Number);
  return m === 1 ? `${y - 1}-12-01` : `${y}-${pad(m - 1)}-01`;
};
/** "table-safari-camp" -> "Safari Camp", for a table planned in the doc only. */
const titleOf = (id) => id.replace(/^table-/, "").split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
export const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export async function data(today) {
  const problems = [];
  const [doc, schedule, catalogue, daily, ids, netTables, art, trips, campaign] = await Promise.all([
    readText("docs/daily-suitcase.md", problems),
    readJson("src/content/levels/events.json", { events: [] }, problems),
    readJson("src/content/pictures.json", { items: [] }, problems),
    readJson("src/content/levels/daily.json", { levels: [] }, problems),
    readJson("src/net/suitcase-ids.json", {}, problems),
    readJson("src/net/tables.json", { tables: [] }, problems),
    readJson("public/art/tables/tables.json", { tables: [] }, problems),
    readJson("src/content/levels/trips.json", { trips: [] }, problems),
    readJson("src/content/levels/campaign.json", { levels: [] }, problems),
  ]);
  const themes = docThemes(doc);
  const docTheme = new Map(themes.map((t) => [t.table, t]));
  const catItem = new Map((catalogue.items ?? []).map((i) => [i.id, i]));
  const libraryByFile = new Map((catalogue.pictures ?? []).map((q) => [q.file, q]));
  const dayBoard = new Map((daily.levels ?? []).filter((l) => l.date).map((l) => [l.date, l]));
  const artTable = new Map((art.tables ?? []).map((t) => [t.id, t]));
  const netTable = new Map((netTables.tables ?? []).map((t) => [t.slug, t]));
  const prize = ids.prize ?? null;
  if (!prize) problems.push("src/net/suitcase-ids.json has no `prize`: the helpers a full suitcase pays are unknown.");

  const events = [];
  for (const e of schedule.events ?? []) {
    const when = today < e.start ? "upcoming" : today > e.end ? "ended" : "live";
    const days = e.days ?? {};
    const items = [];
    for (const [k, { id, title }] of (e.items ?? []).entries()) {
      const c = catItem.get(id);
      const board = c ? c.board ?? c.file : null;
      const thumb = await served(board);
      const full = c ? await served(c.file) : null;
      const kind = !c ? "none" : c.standin ? "standin" : thumb ? "ready" : "missing";
      if (c && !thumb) problems.push(`${e.theme}, item ${k + 1} (${title}): the picture ${board} is not in public/.`);
      const dates = Object.entries(days)
        .filter(([, v]) => v === id)
        .map(([d]) => d)
        .sort();
      items.push({ id, slot: k + 1, title, kind, thumb, full, medium: c?.medium ?? null, borrowed: c?.standin ? libraryByFile.get(c.file)?.title ?? c.file.replace(/^pictures\//, "") : null, dates });
    }

    // the schedule against the boards: every day of the event has its item, on its board
    const offBoard = [];
    for (const [date, it] of Object.entries(days)) {
      const b = dayBoard.get(date);
      if (!b) offBoard.push(`${date} (no daily board)`);
      else if (b.item?.id !== it) offBoard.push(`${date} (its board deals ${b.item?.id ?? "no item"})`);
    }
    if (offBoard.length) problems.push(`${e.theme}: the daily board does not deal the scheduled item on ${offBoard.join(", ")}.`);

    const tableId = e.table ?? null;
    const drawn = tableId ? artTable.get(tableId) : null;
    const builtIn = tableId && tableId === ids.builtInTable;
    const counts = { ready: 0, standin: 0, none: 0, missing: 0 };
    for (const it of items) counts[it.kind]++;
    const all = items.length;
    const art = counts.ready === all && (drawn || builtIn) ? "ready" : counts.ready === all ? "table-missing" : counts.standin ? "standin" : counts.ready ? "partial" : "none";
    events.push({
      key: e.id,
      theme: e.theme,
      start: e.start,
      end: e.end,
      days: Object.keys(days).length,
      when,
      art,
      counts,
      due: dueBy(e.start),
      scheduled: Object.keys(days).length - offBoard.length,
      standIn: Boolean(e.standIn),
      items,
      prize: {
        table: tableId,
        title: drawn?.title ?? e.tableTitle ?? (tableId ? titleOf(tableId) : null),
        note: docTheme.get(tableId)?.tableNote ?? null,
        thumb: drawn ? await served(drawn.thumb) : null,
        drawn: Boolean(drawn),
        builtIn: Boolean(builtIn),
        item: Boolean(tableId && netTable.has(tableId)),
        helpers: prize,
      },
    });
  }
  const live = events.find((m) => m.when === "live")?.key ?? null;
  const next = events.find((m) => m.when === "upcoming")?.key ?? null;
  // the approved monthly themes no event uses yet: each waits for a date (the cadence is the creator's)
  const used = new Set(events.map((e) => e.theme));
  const waiting = themes.filter((t) => !used.has(t.theme)).map((t) => ({ theme: t.theme, table: t.table, items: t.items.length }));

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
    if (net?.award === "shop") ways.push({ kind: "other", text: `Sold in Cosmetics${net.price ? ` for ${net.price} Coins` : ""}` });
    for (const m of events) if (m.prize.table === id) ways.push({ kind: "event", key: m.key, start: m.start, text: `Prize for the full ${m.theme} suitcase` });
    if (t?.souvenir) ways.push({ kind: "souvenir", text: `Not owned or chosen: the ${tripName.get(t.souvenir) ?? t.souvenir} Souvenir board is played on it` });
    if (net && !["onboarding", "suitcase", "none", "shop"].includes(net.award)) ways.push({ kind: "other", text: `Granted by: ${net.award}` });
    if (!ways.length)
      ways.push({
        kind: "none",
        // award "none" (src/net/tables.json): an uploaded table no event awards any more, its item kept
        text: net?.award === "none" || t ? "Kept, not awarded: no prize grants it now" : "Not given out yet: no prize grants it",
      });
    return ways;
  };
  if (ids.builtInTable && events.some((m) => m.prize.table === ids.builtInTable))
    problems.push(`${events.filter((m) => m.prize.table === ids.builtInTable).map((m) => m.theme).join(", ")}: the prize table is ${ids.builtInTable}, which src/net/suitcase-ids.json still calls every player's built-in table, so the win checker pays only the helpers for it until Server makes it an item.`);
  if (ids.builtInTable && art.default && ids.builtInTable !== art.default)
    problems.push(`The game's default table (public/art/tables/tables.json) is ${art.default}, but the win checker's built-in table (src/net/suitcase-ids.json) is ${ids.builtInTable}: UI switches the default once that table is drawn.`);
  const tables = [];
  for (const t of art.tables ?? []) tables.push({ id: t.id, title: t.title, thumb: await served(t.thumb), base: t.base ?? null, drawn: true, how: how(t.id, t) });
  for (const m of events)
    if (m.prize.table && !artTable.has(m.prize.table) && !tables.some((t) => t.id === m.prize.table))
      tables.push({ id: m.prize.table, title: m.prize.title, thumb: null, drawn: false, note: m.prize.note, how: how(m.prize.table, null) });
  for (const id of netTable.keys()) if (!tables.some((t) => t.id === id)) tables.push({ id, title: netTable.get(id).title, thumb: null, drawn: false, how: how(id, null) });

  return { today, live, next, events, waiting, tables, defaultTable: art.default ?? null, spares: ids.spares ?? null, problems };
}
