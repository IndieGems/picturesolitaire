// Packs the built game's pictures, so the build stays far under the platform's 2,000-file cap
// (2026-10-26: 1,856 files at trip 4; each trip adds ~120 pictures and 15 postcards) and its
// 1 GiB size cap (lead, 2026-10-27: 618 MB at 0.31.0, most of it the same pictures in many packs).
//
//   node tools/art/packs.mjs <dist>            write <dist>/packs/, then remove <dist>/pictures/
//   node tools/art/packs.mjs <dist> --dry      report what it would write, change nothing
//
// Every board in every lane is dealt ahead of time (src/content/levels/*.json), so the build knows
// which pictures each board shows. It writes:
//   b-<board id>.bin       per board: the board copies its board, postcard reveal and win card draw,
//                          its postcard first (UI: the most tapped, and the shortest read when a host
//                          ignores Range). Fetched whole, one request instead of ~10. A picture on
//                          several boards has a board copy in each board's pack: that keeps a board's
//                          first load to one small request (board copies are ~65 KB).
//   b-daily-w<yyyy-mm-dd>.bin   the daily's board copies, per week (Monday to Sunday, named by its
//                          Monday; lead, 2026-10-27: a host that ignores Range then streams a few MB
//                          at most, not a month's ~12 MB). Read by Range.
//   full-<nnn>.bin         every full picture ONCE (lead, 2026-10-27: they were stored once per
//                          board, ~160 MB of repeats), in chunks of at most ~2 MB, filled in the
//                          order players meet them (campaign by board, the lessons, the challenge
//                          route, the dailies by date, the dev menu's experiments). Only the
//                          enlarged view reads them, one picture at a time by Range, so a host that
//                          ignores Range streams one chunk at most.
//   p-<trip id>.bin        per trip (src/content/levels/trips.json): its postcards' passport copies,
//                          and its Souvenir's sticker (docs/souvenirs.md).
//   b-s<n>.bin             a Souvenir board's copies (src/content/levels/souvenirs.json), like any board.
//   s-<event id>.bin       per VIP event (src/content/levels/events.json, docs/vip.md): its 10 item
//                          cut-outs, for its suitcase screen (s-halloween-2026); an item in no event keeps
//                          its month's pack, s-<yyyy-mm>.bin, as the monthly suitcase had.
// A picture on no board is not shipped. public/ and the dev server are untouched: they serve the
// separate files, and the play-test tool, the Picture Library and Trips & Cases keep using them.
//
// A pack (UI's format, src/packs.ts reads it): a little-endian uint32 JSON length, the JSON
// {"files":[{"path","offset","length","type"}]} (path as the catalogue names it, offset counted
// from the end of the JSON), then the files end to end, byte for byte as in public/.
// <dist>/packs/index.json, read at boot (so kept small):
//   {"boards":{<board id>:{"b":<pack>}},     each board's board copies
//    "trips":{<trip id>:<pack>},             each trip's passport copies
//    "suitcases":{<event id>:<pack>}}        each event's item cut-outs (ensureSuitcase(<event id>))
// <dist>/packs/full-index.json, read only when the enlarged view first opens (UI, 2026-10-28: the
// list of every full picture was ~60 KB of the boot's 74 KB index):
//   {"full":{<full chunk>:[<path>,...]}}     where each full picture is (each path in one chunk)
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = process.argv[2];
const dry = process.argv.includes("--dry");
if (!dist) {
  console.error("usage: node tools/art/packs.mjs <dist> [--dry]");
  process.exit(2);
}
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const catalogue = read("src/content/pictures.json");
// The Daily Suitcase's items (docs/daily-suitcase.md) are dealt on daily boards like any picture.
// Souvenir pictures (docs/souvenirs.md) are dealt only on their trip's Souvenir board.
const byId = new Map([...catalogue.pictures, ...(catalogue.destinations ?? []), ...(catalogue.items ?? []), ...(catalogue.souvenirPictures ?? [])].map((p) => [p.id, p]));
// In the order players meet them, which is the order full pictures fill their chunks.
// lessons: the staged lesson boards, such as the Shuffle lesson after board 3 (Levels, 2026-10-27).
// souvenirs: each trip's Souvenir board, s1..s10, played after its stamp (Gameplay, 2026-10-28).
const LANES = ["campaign", "lessons", "souvenirs", "challenge", "daily", "experiments"];
/** A full chunk closes before it would pass this (the biggest full picture is ~1 MB). */
const CHUNK = 2 * 1024 * 1024;

/** A daily's week: the Monday on or before its date (yyyy-mm-dd, UTC). */
function weekOf(date) {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "other";
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
const dailyDate = (level) => level.date ?? /^d(\d{4}-\d{2}-\d{2})/.exec(level.id)?.[1] ?? "";

const problems = [];
const packs = new Map(); // name -> ordered catalogue paths (duplicates dropped on write)
const add = (name, rel) => (packs.get(name) ?? packs.set(name, []).get(name)).push(rel);
const index = { boards: {}, full: {}, trips: {}, suitcases: {} };
/** Full pictures in the order players first meet them. */
const fullOrder = [];
const fullSeen = new Set();
/** Each board's own pictures, for the report. */
const boardFiles = new Map();
for (const lane of LANES) {
  const file = `src/content/levels/${lane}.json`;
  if (!existsSync(file)) continue;
  for (const level of read(file).levels ?? []) {
    const ids = [];
    if (level.destination?.id) ids.push(level.destination.id); // the postcard first
    for (const p of level.pictures ?? []) {
      const id = typeof p === "string" ? p : p.id;
      if (!ids.includes(id)) ids.push(id);
    }
    const b = lane === "daily" ? `b-daily-w${weekOf(dailyDate(level))}` : `b-${level.id}`;
    const mine = [];
    for (const id of ids) {
      const p = byId.get(id);
      if (!p) {
        problems.push(`${lane} ${level.id}: no picture ${id} in the catalogue`);
        continue;
      }
      add(b, p.board ?? p.file);
      mine.push(p.board ?? p.file);
      if (!fullSeen.has(p.file)) {
        fullSeen.add(p.file);
        fullOrder.push(p.file);
      }
    }
    index.boards[level.id] = { b };
    boardFiles.set(level.id, { lane, b, files: mine });
  }
}
const trips = existsSync("src/content/levels/trips.json") ? (read("src/content/levels/trips.json").trips ?? []) : [];
const campaign = existsSync("src/content/levels/campaign.json") ? (read("src/content/levels/campaign.json").levels ?? []) : [];
for (const t of trips) {
  const name = `p-${t.id}`;
  for (let n = t.from; n <= t.to; n++) {
    const d = byId.get(campaign[n - 1]?.destination?.id ?? "");
    if (d?.thumb) add(name, d.thumb);
  }
  index.trips[t.id] = name;
}
// Each trip's Souvenir sticker shows on its passport page, so it rides in the trip's pack.
for (const sv of catalogue.souvenirs ?? []) {
  if (sv.sticker && index.trips[sv.trip]) add(index.trips[sv.trip], sv.sticker);
}

// An event's suitcase screen shows all its items at once: one pack an event, s-<event id>, of each
// item's cut-out (the object on transparency, for its slot and its silhouette), or its board copy
// while it is still a stand-in. The key is the events.json event whose items list holds the item
// (UI, 2026-10-30: Ski Trip and Winter Market reuse 7 of their month's items), else the item's own
// `event`, else its month (an item in no event, as the monthly suitcase had).
const eventOf = new Map();
for (const ev of read("src/content/levels/events.json").events ?? []) {
  for (const it of ev.items ?? []) eventOf.set(it.id, ev.id);
}
for (const it of catalogue.items ?? []) {
  const key = eventOf.get(it.id) ?? it.event ?? it.month;
  const name = `s-${key}`;
  add(name, it.cutout ?? it.board ?? it.file);
  index.suitcases[key] = name;
}

const bufs = new Map(); // catalogue path -> bytes, read once
function bytesOf(rel, name) {
  let buf = bufs.get(rel);
  if (buf) return buf;
  try {
    buf = readFileSync(join(dist, ...rel.split("/")));
  } catch {
    problems.push(`${name}: ${rel} is not in ${dist}`);
    return null;
  }
  bufs.set(rel, buf);
  return buf;
}

// The full chunks: each full picture once, in the order players meet them.
let chunk = null;
let chunkBytes = 0;
for (const rel of fullOrder) {
  const buf = bytesOf(rel, "full");
  if (!buf) continue;
  if (!chunk || (chunkBytes && chunkBytes + buf.length > CHUNK)) {
    chunk = `full-${String(Object.keys(index.full).length + 1).padStart(3, "0")}`;
    index.full[chunk] = [];
    chunkBytes = 0;
  }
  add(chunk, rel);
  index.full[chunk].push(rel);
  chunkBytes += buf.length;
}

const TYPES = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg" };
let count = 0;
let bytes = 0;
const shipped = new Set();
const sizes = new Map(); // pack -> bytes
const ends = new Map(); // pack -> path -> its last byte + 1, from the pack's start
const outDir = join(dist, "packs");
if (!dry) mkdirSync(outDir, { recursive: true });
for (const [name, paths] of packs) {
  const files = [];
  const blobs = [];
  let at = 0;
  for (const rel of [...new Set(paths)]) {
    const buf = bytesOf(rel, name);
    if (!buf) continue;
    files.push({ path: rel, offset: at, length: buf.length, type: TYPES[rel.slice(rel.lastIndexOf("."))] ?? "application/octet-stream" });
    blobs.push(buf);
    at += buf.length;
    shipped.add(rel);
  }
  const json = Buffer.from(JSON.stringify({ files }), "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(json.length, 0);
  const pack = Buffer.concat([len, json, ...blobs]);
  count++;
  bytes += pack.length;
  sizes.set(name, pack.length);
  ends.set(name, new Map(files.map((f) => [f.path, 4 + json.length + f.offset + f.length])));
  if (!dry) writeFileSync(join(outDir, `${name}.bin`), pack);
}
if (problems.length) {
  console.error(`packs: ${problems.length} problem(s):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
const { full, ...boot } = index;
const indexJson = JSON.stringify(boot);
const fullJson = JSON.stringify({ full });
if (!dry) {
  writeFileSync(join(outDir, "index.json"), indexJson);
  writeFileSync(join(outDir, "full-index.json"), fullJson);
  let loose = false;
  try {
    loose = statSync(join(dist, "pictures")).isDirectory();
  } catch {
    /* already gone */
  }
  if (loose) rmSync(join(dist, "pictures"), { recursive: true, force: true });
}

// What a board costs to open, the worst of each lane: with Range, its own board copies; where a
// host ignores Range, its pack streamed up to its last board copy. The enlarged view adds one full
// picture: a chunk streamed up to it at most.
const MB = (n) => `${(n / 1048576).toFixed(1)} MB`;
const worst = {};
for (const [id, { lane, b, files }] of boardFiles) {
  const own = files.reduce((s, f) => s + (bufs.get(f)?.length ?? 0), 0);
  const stream = Math.max(...files.map((f) => ends.get(b)?.get(f) ?? 0));
  const w = (worst[lane] ??= { own: [0, ""], stream: [0, ""] });
  if (own > w.own[0]) w.own = [own, id];
  if (stream > w.stream[0]) w.stream = [stream, id];
}
const fullMax = Math.max(0, ...Object.keys(index.full).map((n) => sizes.get(n) ?? 0));
console.log(
  `packs: ${count} packs + index.json (${Math.round(indexJson.length / 1024)} KB) + full-index.json (${Math.round(fullJson.length / 1024)} KB), ${Math.round(bytes / 1048576)} MB, for ${Object.keys(index.boards).length} boards and ${trips.length} trips; ` +
    `${shipped.size} picture files packed, each full picture once in ${Object.keys(index.full).length} chunks${dry ? " (dry run, nothing written)" : `, ${dist}/pictures removed`}`,
);
for (const [lane, w] of Object.entries(worst))
  console.log(`  worst ${lane} board: ${MB(w.own[0])} of board copies (${w.own[1]}); ${MB(w.stream[0])} where a host ignores Range (${w.stream[1]})`);
console.log(`  the enlarged view: one full picture, ${MB(fullMax)} at most where a host ignores Range (the biggest chunk)`);
