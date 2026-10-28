// Builds the SOUVENIRS (creator, 2026-10-28; docs/souvenirs.md): an optional themed bonus board after each
// trip, like the gift shop on the way out, written to src/content/levels/souvenirs.json with id "s" + the
// trip's number ("t3" -> "s3") and the trip's id in `trip`, right after the board's size (agreed with
// Server and UI). Run: node tools/levels/make-souvenirs.mts [--stand-ins --out FILE]
//   Each trip whose Souvenir has its pictures (Art's pictures.json `souvenirPictures`, each with
//   `souvenir`: its trip's id, never in the library) gets one board dealt from exactly those pictures:
//   ALL LONG (tall 1x2 and wide 2x1 mixed) on SOUVENIR_BOARD, at relief difficulty (SOUVENIR: readable,
//   a safe start, a careless win of 85% or more). A board already made whose pictures are unchanged is
//   KEPT; a trip whose pictures changed is dealt again; a trip with none has no board yet.
//   --stand-ins (trials only: it needs --out, and check.mts fails a Souvenir that deals any picture not
//   its own, so stand-ins never ship): each trip takes 12 long library pictures instead.
// Pictures: the look-alike rule is waived (a Souvenir is one style and one theme on purpose); Art keeps
// the cards apart with bold, distinct background colours (`bg`, never two alike on a board: check.mts)
// and subjects of different shapes.
// Deterministic: the same pictures give the same board. Then node tools/levels/check.mts proves it.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { hashId } from "../../src/game/levels/generate.ts";
import { READABLE } from "../../src/game/solver/metrics.ts";
import { dealBoard, familyOf, readBoards, root, souvenirPictures, tallyText, usable, writeBoards } from "./lib.mts";
import { TRIPS } from "./campaign-plan.mts";

/** A Souvenir's row: relief difficulty, as an unmarked campaign board (readable, a safe start). */
export const SOUVENIR = { role: "souvenir", peek: 0, chain: [1, 99], careless: [0.85, 1], reader: [READABLE, 1] };
/** Its board: the size of the pace boards' (12 long pictures, 24 cards, 8 waiting at the start). */
export const SOUVENIR_BOARD = { cols: 4, rows: 4 };
/** A Souvenir's pictures: 12 is Art's count (10 opens with only 4 cards waiting); 10 to 14 deal. */
export const SOUVENIR_COUNT = [10, 14];
/** The Souvenir board of trip `tripId` ("t3" -> "s3"). */
export const souvenirId = (tripId) => `s${tripId.slice(1)}`;
/** A trip's own Souvenir pictures (Art's), in catalogue order. */
export const souvenirOf = (tripId) => souvenirPictures.filter((p) => p.souvenir === tripId);

const FILE = join(root, "src/content/levels/souvenirs.json");

/** The board with its trip right after its size (as a daily's item). */
function withTrip(board, trip) {
  const out = {};
  for (const [key, v] of Object.entries(board)) {
    if (key === "trip") continue;
    out[key] = v;
    if (key === "rows") out.trip = trip;
  }
  return out;
}

/** Trials only: 12 long library pictures for a trip, 6 tall and 6 wide, the trip's own draw. */
function standIns(tripId) {
  const draw = (cols, rows) =>
    usable
      .filter((p) => p.cols === cols && p.rows === rows)
      .sort((a, b) => hashId(`${tripId}:${a.id}`) - hashId(`${tripId}:${b.id}`))
      .slice(0, 6);
  return [...draw(1, 2), ...draw(2, 1)];
}

function main() {
  const has = (f) => process.argv.includes(f);
  const outAt = process.argv.indexOf("--out");
  const OUT = outAt > 0 ? process.argv[outAt + 1] : FILE;
  const stand = has("--stand-ins");
  if (stand && OUT === FILE) throw new Error("--stand-ins is for trials: give --out FILE (stand-ins never ship)");
  const t0 = performance.now();
  const shipped = existsSync(FILE) ? readBoards(FILE) : [];
  const levels = [];
  for (const trip of TRIPS) {
    const id = souvenirId(trip.id);
    const own = stand ? standIns(trip.id) : souvenirOf(trip.id);
    if (!own.length) continue;
    if (own.length < SOUVENIR_COUNT[0] || own.length > SOUVENIR_COUNT[1]) throw new Error(`${id} (${trip.name}): ${own.length} pictures, a Souvenir takes ${SOUVENIR_COUNT.join(" to ")}`);
    const bad = own.filter((p) => p.cols * p.rows !== 2);
    if (bad.length) throw new Error(`${id} (${trip.name}): ${bad.map((p) => `${p.id} is ${p.cols}x${p.rows}`).join(", ")}; a Souvenir is all long pictures`);
    const pictures = own.map((p) => ({ id: p.id, cols: p.cols, rows: p.rows }));
    const key = (ps) => JSON.stringify([...ps].map((p) => [p.id, p.cols, p.rows]).sort());
    const kept = shipped.find((l) => l.id === id);
    if (kept && !stand && key(kept.pictures) === key(pictures)) {
      levels.push(kept);
      continue;
    }
    const { board, tally } = dealBoard(SOUVENIR, pictures, { id, ...SOUVENIR_BOARD, tries: 80000, safeFirstMove: true });
    if (!board) throw new Error(`${id} (${trip.name}): no deal of its pictures meets the Souvenir's row (${tallyText(tally)})`);
    // the look-alike rule is waived and a Souvenir's pictures have no families: each its own (familyOf)
    board.axes = { ...board.axes, alike: [], families: pictures.map((p) => familyOf(p.id)) };
    levels.push(withTrip(board, trip.id));
  }
  writeBoards(OUT, "Souvenirs: an optional themed bonus board after each trip (docs/souvenirs.md); made by tools/levels/make-souvenirs.mts, checked by tools/levels/check.mts", levels);
  console.log(`wrote ${OUT} (${levels.length} Souvenir${levels.length === 1 ? "" : "s"}: ${levels.map((l) => l.id).join(", ") || "none yet"}${stand ? ", STAND-INS" : ""}) in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
