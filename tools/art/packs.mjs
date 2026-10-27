// Packs the built game's pictures, so the build stays far under the platform's 2,000-file cap
// (2026-10-26: 1,856 files at trip 4; each trip adds ~120 pictures and 15 postcards).
//
//   node tools/art/packs.mjs <dist>            write <dist>/packs/, then remove <dist>/pictures/
//   node tools/art/packs.mjs <dist> --dry      report what it would write, change nothing
//
// Every board in every lane is dealt ahead of time (src/content/levels/*.json), so the build knows
// which pictures each board shows. It writes, with each board's postcard first (UI: the most
// tapped, and the shortest read when a host ignores Range):
//   b-<board id>.bin    per board: the board copies its board, postcard reveal and win card draw.
//                       Fetched whole, one request instead of ~10.
//   f-<board id>.bin    per board: the full pictures, only for the enlarged view, which asks for
//                       one picture with an HTTP Range request (src/packs.ts copes without).
//   b-daily-<yyyy-mm>.bin    the daily's board copies, per month (lead, 2026-10-26).
//   f-daily.bin, f-challenge.bin     those lanes' full pictures, one pack each (no repeats).
//   p-<trip id>.bin     per trip (src/content/levels/trips.json): its postcards' passport copies.
// A picture on no board is not shipped. public/ and the dev server are untouched: they serve the
// separate files, and the play-test tool, the Picture Library and Trips & Cases keep using them.
//
// A pack (UI's format, src/packs.ts reads it): a little-endian uint32 JSON length, the JSON
// {"files":[{"path","offset","length","type"}]} (path as the catalogue names it, offset counted
// from the end of the JSON), then the files end to end, byte for byte as in public/.
// <dist>/packs/index.json: {"boards":{<board id>:{"b":<pack>,"f":<pack>}},"trips":{<trip id>:<pack>}}.
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
const byId = new Map([...catalogue.pictures, ...(catalogue.destinations ?? [])].map((p) => [p.id, p]));
// lessons: the staged lesson boards, such as the Shuffle lesson after board 3 (Levels, 2026-10-27).
const LANES = ["campaign", "challenge", "daily", "experiments", "lessons"];
// The daily packs per month (lead, 2026-10-26): a day's board fetches its month's pack once.
// The daily's and the challenge route's full pictures are one pack each (lead, 2026-10-26: the
// enlarged view reads one picture by Range anyway, and per-board copies of the same ~40 pictures
// cost ~90 MB of build).
const SHARED_FULL = new Set(["daily", "challenge"]);
const packKey = (lane, id) => (lane === "daily" ? `daily-${/^d(\d{4}-\d{2})/.exec(id)?.[1] ?? "other"}` : id);

const problems = [];
const packs = new Map(); // name -> ordered catalogue paths (duplicates dropped on write)
const add = (name, rel) => (packs.get(name) ?? packs.set(name, []).get(name)).push(rel);
const index = { boards: {}, trips: {} };
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
    const b = `b-${packKey(lane, level.id)}`;
    const f = SHARED_FULL.has(lane) ? `f-${lane}` : `f-${packKey(lane, level.id)}`;
    for (const id of ids) {
      const p = byId.get(id);
      if (!p) {
        problems.push(`${lane} ${level.id}: no picture ${id} in the catalogue`);
        continue;
      }
      add(b, p.board ?? p.file);
      add(f, p.file);
    }
    index.boards[level.id] = { b, f };
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

const TYPES = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg" };
let count = 0;
let bytes = 0;
const shipped = new Set();
const outDir = join(dist, "packs");
if (!dry) mkdirSync(outDir, { recursive: true });
for (const [name, paths] of packs) {
  const files = [];
  const blobs = [];
  let at = 0;
  for (const rel of [...new Set(paths)]) {
    let buf;
    try {
      buf = readFileSync(join(dist, ...rel.split("/")));
    } catch {
      problems.push(`${name}: ${rel} is not in ${dist}`);
      continue;
    }
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
  if (!dry) writeFileSync(join(outDir, `${name}.bin`), pack);
}
if (problems.length) {
  console.error(`packs: ${problems.length} problem(s):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
if (!dry) {
  writeFileSync(join(outDir, "index.json"), JSON.stringify(index));
  let loose = false;
  try {
    loose = statSync(join(dist, "pictures")).isDirectory();
  } catch {
    /* already gone */
  }
  if (loose) rmSync(join(dist, "pictures"), { recursive: true, force: true });
}
console.log(
  `packs: ${count} packs + index.json, ${Math.round(bytes / 1048576)} MB, for ${Object.keys(index.boards).length} boards and ${trips.length} trips; ` +
    `${shipped.size} picture files packed${dry ? " (dry run, nothing written)" : `, ${dist}/pictures removed`}`,
);
