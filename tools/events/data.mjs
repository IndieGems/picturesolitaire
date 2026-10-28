// Events: the data behind the page (server.mjs serves it at /api/data). Kept in a module of its own so
// that server.mjs loads it afresh whenever this file changes: a fix here shows on the next reload of the
// page, with no restart of the process the Editor started. What it reads is listed in server.mjs.

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
export const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export async function data(today) {
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
      if (m.prize.table === id) ways.push({ kind: "event", month: m.month, text: `Prize for the full ${m.theme} suitcase`, label: m.month });
    if (t?.souvenir)
      ways.push({ kind: "souvenir", text: `Not owned or chosen: the ${tripName.get(t.souvenir) ?? t.souvenir} Souvenir board is played on it` });
    if (net && !["onboarding", "suitcase", "none"].includes(net.award)) ways.push({ kind: "other", text: `Granted by: ${net.award}` });
    if (!ways.length)
      ways.push({
        kind: "none",
        // award "none" (src/net/tables.json): an uploaded table no month awards any more, its item kept
        text: net?.award === "none" || t ? "Kept, not awarded: no prize grants it now" : "Not given out yet: no prize grants it",
      });
    return ways;
  };
  for (const net of netTables.tables ?? []) {
    if (net.award !== "suitcase") continue;
    const m = months.find((x) => x.month === net.month);
    if (m && m.prize.table !== net.slug)
      problems.push(`The server's table list (src/net/tables.json) still pays ${net.title ?? net.slug} for ${net.month}'s suitcase, but its prize is now ${m.prize.title ?? m.prize.table}: Server's make-config brings it in line.`);
  }
  if (ids.builtInTable && months.some((m) => m.prize.table === ids.builtInTable))
    problems.push(`${months.filter((m) => m.prize.table === ids.builtInTable).map((m) => m.month).join(", ")}: the prize table is ${ids.builtInTable}, which src/net/suitcase-ids.json still calls every player's built-in table, so the win checker pays only the helpers for it until Server makes it an item.`);
  if (ids.builtInTable && art.default && ids.builtInTable !== art.default)
    problems.push(`The game's default table (public/art/tables/tables.json) is ${art.default}, but the win checker's built-in table (src/net/suitcase-ids.json) is ${ids.builtInTable}: UI switches the default once that table is drawn.`);
  const tables = [];
  for (const t of art.tables ?? []) tables.push({ id: t.id, title: t.title, thumb: await served(t.thumb), base: t.base ?? null, drawn: true, how: how(t.id, t) });
  for (const m of months)
    if (m.prize.table && !artTable.has(m.prize.table) && !tables.some((t) => t.id === m.prize.table))
      tables.push({ id: m.prize.table, title: m.prize.title, thumb: null, drawn: false, note: m.prize.note, how: how(m.prize.table, null) });
  for (const id of netTable.keys())
    if (!tables.some((t) => t.id === id)) tables.push({ id, title: netTable.get(id).title, thumb: null, drawn: false, how: how(id, null) });

  return { today, live, next, months, tables, defaultTable: art.default ?? null, spares: ids.spares ?? null, problems };
}
