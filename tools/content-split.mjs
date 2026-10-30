// The game's content, split at BUILD time so the first screen downloads only what it shows
// (creator, 2026-10-28: "it should load very quickly… then load the rest smartly in the
// background as needed"). The sources stay exactly as they are: src/content/pictures.json (Art's)
// and src/content/levels/*.json (Levels'), which Levels' tools, Art's packs and Server's checker
// read whole. Only the game reads them through this plugin, as one small module and many chunks:
//
//   import { campaign, daily, ... } from "virtual:ps-content"     (src/content-split.d.ts types it)
//
//   campaign.count, campaign.boards   every campaign board's skeleton, sync: id, trip, cols, rows,
//                                     destination id, mark (home's mark, the itinerary, the passport)
//   campaign.trips[<trip id>]()       the trip's boards as stored, { levels, from }
//   daily.first, daily.weeks[<Monday>]()  the daily pool by week, Monday to Sunday by UTC date (the
//                                     same weeks as Art's daily packs), { levels, start }: start is
//                                     the week's first index in the whole pool
//   souvenirs(), challenge(), lessons(), experiments()   each lane as stored, { levels }
//   items[<yyyy-mm>]()                a month's Daily Suitcase items (its screen's ten slots)
//   library()                         the whole picture list (the albums, the dev menu)
//   catalogue                         the catalogue's small lists, sync: albums, suitcases, souvenirs
//
// Every chunk REGISTERS THE PICTURES ITS BOARDS DEAL as it is evaluated (src/content.ts,
// addCatalogue): a board's pictures, its destination, its suitcase item, its Souvenir pictures. So
// once a chunk has resolved, its boards can be drawn, and nothing else needs to know the split.
// In the dev loop the same modules are served; a change to a source file reloads the page.

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/\\/g, "/");
const SRC = {
  pictures: `${ROOT}src/content/pictures.json`,
  trips: `${ROOT}src/content/levels/trips.json`,
  campaign: `${ROOT}src/content/levels/campaign.json`,
  daily: `${ROOT}src/content/levels/daily.json`,
  souvenirs: `${ROOT}src/content/levels/souvenirs.json`,
  challenge: `${ROOT}src/content/levels/challenge.json`,
  lessons: `${ROOT}src/content/levels/lessons.json`,
  experiments: `${ROOT}src/content/levels/experiments.json`,
  events: `${ROOT}src/content/levels/events.json`,
};
const STORE = `${ROOT}src/content.ts`;
const ID = "virtual:ps-content";
// The interface's glyphs (Art's public/art/ui/icon-*.svg) as data URLs in the game's script, so home's
// buttons never wait for 20 small files (QA, 0.47.0: the gear was blank ~0.7 s after home on 4G).
// src/ui/icons.ts reads them: import GLYPHS from "virtual:ps-icons" ({ gear: "data:image/svg+xml,..." }).
const ICONS_ID = "virtual:ps-icons";
const ICON_DIR = `${ROOT}public/art/ui/`;
// The boot line in every language ("Loading Picture Passport…", and its failure), taken from each
// locales/<lang>.json, so the boot entry (src/main.ts) says it in the player's language without
// fetching a whole word list before the Arcade's handshake: import BOOT from "virtual:ps-boot-words"
// ({ de: { "boot.loading": "...", "boot.failed": "...", "game.title": "..." } }).
const BOOT_ID = "virtual:ps-boot-words";
const LOCALE_DIR = `${ROOT}locales/`;
const BOOT_KEYS = ["boot.loading", "boot.failed", "game.title"];
const LANES =["souvenirs", "challenge", "lessons", "experiments"];

/** A daily's week: the Monday on or before its date (yyyy-mm-dd, UTC), as tools/art/packs.mjs names it. */
function weekOf(date) {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "other";
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * The catalogue fields the game reads (src/ui/catalogue.ts, src/board/index.ts): the rest of an
 * entry (palette, subjects, family, busy, medium...) is Art's and Levels' notes for choosing
 * pictures, read only by tools from pictures.json itself, so a chunk leaves it out.
 */
const GAME_FIELDS = ["id", "file", "board", "boardPx", "px", "thumb", "thumbPx", "title", "name", "place", "cols", "rows", "album", "month", "cutout"];
/**
 * A suitcase item's group, the key its screen loads it by (catalogue.ts loadItems): the two-week event whose
 * items list holds it (Levels' src/content/levels/events.json; the VIP events, docs/vip.md), else Art's
 * `event`, else its month (an item no event deals any more). Filled as the content is read.
 */
const itemGroup = new Map();
const groupOf = (it) => itemGroup.get(it.id) ?? it.event ?? it.month ?? it.id.slice(5, 12);
const slim = (e) => {
  const out = Object.fromEntries(GAME_FIELDS.filter((k) => e[k] !== undefined).map((k) => [k, e[k]]));
  // an item carries its group as its `month`, the field the game's catalogue groups by
  if (typeof e.id === "string" && e.id.startsWith("item-")) out.month = groupOf(e);
  return out;
};
/** A level's notes for the level designer, shown only by the dev menu: a release build leaves them out. */
const NOTES = ["axes", "plan"];

/** Data as a module expression: JSON.parse of a string parses faster than the same object literal. */
const literal = (data) => `JSON.parse(${JSON.stringify(JSON.stringify(data))})`;

export function contentSplit() {
  /** Read once per build (and again after a source changes, in the dev loop). */
  let content = null;
  /** A release build (`vite build --mode release`): Levels' experiment boards are the dev menu's alone. */
  let release = false;
  const read = () => {
    if (content) return content;
    const json = (k) => {
      const data = JSON.parse(readFileSync(SRC[k], "utf8"));
      // a release build: each level without its designer's notes (the dev menu's board info alone shows them)
      if (release && Array.isArray(data.levels))
        data.levels = data.levels.map((l) => Object.fromEntries(Object.entries(l).filter(([k]) => !NOTES.includes(k))));
      if (release) for (const k of NOTES) delete data[k];
      return data;
    };
    const pictures = json("pictures");
    const kinds = ["pictures", "destinations", "items", "souvenirPictures"];
    /** id -> [kind, entry] across the catalogue's lists. */
    const byId = new Map();
    for (const kind of kinds) for (const e of pictures[kind] ?? []) byId.set(e.id, [kind, e]);
    /** The catalogue part that boards `levels` deal: their pictures, destinations and items. */
    const partFor = (levels, extra = []) => {
      const part = {};
      const seen = new Set();
      const take = (id) => {
        if (!id || seen.has(id)) return;
        seen.add(id);
        const hit = byId.get(id);
        if (hit) (part[hit[0]] ??= []).push(slim(hit[1]));
      };
      for (const l of levels) {
        for (const p of l.pictures ?? []) take(p.id);
        take(l.destination?.id);
        take(l.item?.id);
      }
      for (const id of extra) take(id);
      return part;
    };

    const trips = json("trips").trips;
    const campaign = json("campaign").levels;
    const tripOf = (n) => trips.find((t) => n >= t.from && n <= t.to)?.id ?? "rest";
    const boards = campaign.map((l, i) => {
      const b = { id: l.id, trip: tripOf(i + 1), cols: l.cols, rows: l.rows };
      if (l.destination?.id) b.destination = l.destination.id;
      if (l.mark === "hard" || l.mark === "super") b.mark = l.mark;
      return b;
    });
    /** trip id -> { levels, from } */
    const tripChunks = new Map();
    campaign.forEach((l, i) => {
      const id = boards[i].trip;
      const c = tripChunks.get(id) ?? tripChunks.set(id, { levels: [], from: i + 1 }).get(id);
      c.levels.push(l);
    });

    const pool = json("daily").levels;
    /** Monday -> { levels, start } */
    const weeks = new Map();
    pool.forEach((l, i) => {
      const w = weekOf(l.date ?? /^d(\d{4}-\d{2}-\d{2})/.exec(l.id)?.[1] ?? "");
      const c = weeks.get(w) ?? weeks.set(w, { levels: [], start: i }).get(w);
      c.levels.push(l);
    });

    const lanes = Object.fromEntries(LANES.map((k) => [k, json(k)]));
    /** an event's id (or an old month) -> its items */
    itemGroup.clear();
    for (const ev of JSON.parse(readFileSync(SRC.events, "utf8")).events ?? []) for (const it of ev.items ?? []) itemGroup.set(it.id, ev.id);
    const months = new Map();
    for (const it of pictures.items ?? []) {
      const m = groupOf(it);
      (months.get(m) ?? months.set(m, []).get(m)).push(it);
    }

    content = {
      index: {
        boards,
        trips: [...tripChunks.keys()],
        first: pool[0]?.date ?? null,
        weeks: [...weeks.keys()],
        months: [...months.keys()],
        catalogue: { albums: pictures.albums ?? [], suitcases: pictures.suitcases ?? [], souvenirs: pictures.souvenirs ?? [] },
      },
      chunk: (name) => {
        const [kind, key] = name.split(":");
        if (kind === "trip") {
          const c = tripChunks.get(key);
          return c && { data: { levels: c.levels, from: c.from }, part: partFor(c.levels) };
        }
        if (kind === "daily") {
          const c = weeks.get(key);
          return c && { data: { levels: c.levels, start: c.start }, part: partFor(c.levels) };
        }
        if (kind === "items") {
          const list = months.get(key);
          return list && { data: { items: list.map((i) => i.id) }, part: { items: list.map(slim) } };
        }
        if (kind === "library") {
          return { data: {}, part: Object.fromEntries(kinds.map((k) => [k, (pictures[k] ?? []).map(slim)])) };
        }
        if (LANES.includes(kind)) {
          const levels = lanes[kind].levels ?? [];
          // a Souvenir board deals its trip's own pictures (souvenirPictures), listed by id like any
          return { data: lanes[kind], part: partFor(levels) };
        }
        return null;
      },
    };
    return content;
  };

  // Module names: the index, and one per chunk. A chunk's file is named after its last part
  // ("trip-t1-<hash>.js"), unique in the build (tools/unique-names.mjs).
  const chunkId = (kind, key) => `${ID}/${kind}${key ? `-${key}` : ""}`;
  const parse = (id) => {
    const m = /^\0virtual:ps-content\/(trip|daily|items|library|souvenirs|challenge|lessons|experiments)(?:-(.+))?$/.exec(id);
    return m && `${m[1]}:${m[2] ?? ""}`;
  };

  return {
    name: "ps-content-split",
    configResolved(config) {
      release = config.mode === "release";
    },
    resolveId(id) {
      if (id === ID || id.startsWith(`${ID}/`) || id === ICONS_ID || id === BOOT_ID) return `\0${id}`;
      return null;
    },
    load(id) {
      if (id === `\0${BOOT_ID}`) {
        const words = {};
        // a word list per language: <lang>.json (never names-, titles- or anything not a language's)
        for (const f of readdirSync(LOCALE_DIR).filter((f) => /^[a-z]{2}(-[A-Za-z]+)?\.json$/.test(f)).sort()) {
          this.addWatchFile(LOCALE_DIR + f);
          const all = JSON.parse(readFileSync(LOCALE_DIR + f, "utf8"));
          words[f.slice(0, -5)] = Object.fromEntries(BOOT_KEYS.filter((k) => typeof all[k] === "string").map((k) => [k, all[k]]));
        }
        return `export default ${JSON.stringify(words)};`;
      }
      if (id === `\0${ICONS_ID}`) {
        const glyphs = {};
        for (const f of readdirSync(ICON_DIR).filter((f) => /^icon-.+\.svg$/.test(f)).sort()) {
          this.addWatchFile(ICON_DIR + f);
          glyphs[f.slice(5, -4)] = `data:image/svg+xml,${encodeURIComponent(readFileSync(ICON_DIR + f, "utf8").trim())}`;
        }
        return `export default ${JSON.stringify(glyphs)};`;
      }
      if (!id.startsWith(`\0${ID}`)) return null;
      for (const file of Object.values(SRC)) this.addWatchFile(file);
      const c = read();
      if (id === `\0${ID}`) {
        const loaders = (kind, keys) =>
          `{${keys.map((k) => `${JSON.stringify(k)}: () => import(${JSON.stringify(chunkId(kind, k))}).then((m) => m.default)`).join(",")}}`;
        const lane = (k) => `() => import(${JSON.stringify(chunkId(k))}).then((m) => m.default)`;
        const { boards, trips, first, weeks, months, catalogue } = c.index;
        return [
          `export const campaign = { count: ${boards.length}, boards: ${literal(boards)}, trips: ${loaders("trip", trips)} };`,
          `export const daily = { first: ${JSON.stringify(first)}, weeks: ${loaders("daily", weeks)} };`,
          `export const items = ${loaders("items", months)};`,
          // a release build carries no experiment board (tools/no-dev-menu.mjs fails one that does)
          ...LANES.map((k) => `export const ${k} = ${release && k === "experiments" ? "() => Promise.resolve({ levels: [] })" : lane(k)};`),
          `export const library = ${lane("library")};`,
          `export const catalogue = ${literal(catalogue)};`,
        ].join("\n");
      }
      const name = parse(id);
      const chunk = name && c.chunk(name);
      if (!chunk) return `export default null;`;
      return [
        `import { addCatalogue } from ${JSON.stringify(STORE)};`,
        `addCatalogue(${literal(chunk.part)});`,
        `export default ${literal(chunk.data)};`,
      ].join("\n");
    },
    // the dev loop: a regenerated level file or catalogue reloads the page with the new split
    handleHotUpdate({ file, server }) {
      if (!Object.values(SRC).includes(file.replace(/\\/g, "/"))) return;
      content = null;
      for (const mod of server.moduleGraph.idToModuleMap.values())
        if (mod.id?.startsWith(`\0${ID}`)) server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: "full-reload" });
      return [];
    },
  };
}
