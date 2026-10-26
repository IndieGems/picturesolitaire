// Fails the build when a picture's light copies are missing, the wrong size or too heavy.
// "A picture ships at the size it is drawn" (creator, 2026-10-25): the board draws
// <id>-board.webp (240 x 320 px a card), the Albums screen <id>-thumb.webp, and only the
// enlarged view fetches the full picture. tools/art/pictures.py makes all three; keep the
// numbers here in step with BOARD_CELL, BOARD_BUDGET, THUMB_LONG and THUMB_BUDGET there.
//
//   node tools/art/check-copies.mjs [dir]      (default: public; dist works too)
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? "public";
const BOARD_CELL = [240, 320];
const BOARD_BUDGET = 28 * 1024; // a card
const THUMB_LONG = 320;
const THUMB_BUDGET = 24 * 1024;
const DEST_THUMB_W = 300; // a destination's passport tile (DEST_THUMB_W, DEST_THUMB_BUDGET in pictures.py)
const DEST_THUMB_BUDGET = 32 * 1024;

/** A WebP's pixel size, from its header (lossy VP8, lossless VP8L or extended VP8X). */
function webpSize(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const kind = buf.toString("ascii", 12, 16);
  if (kind === "VP8 ") return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (kind === "VP8L") {
    const b = buf.readUInt32LE(21);
    return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1];
  }
  if (kind === "VP8X") return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1];
  return null;
}

const catalogue = JSON.parse(readFileSync("src/content/pictures.json", "utf8"));
const bad = [];
let boardBytes = 0;

/** A board copy: there, cols x rows cards of BOARD_CELL, as the catalogue says, and within budget. */
function check(p, rel, boardPx, what) {
  let buf;
  try {
    buf = readFileSync(join(root, rel));
  } catch {
    bad.push(`${p.id}: no ${what} (${rel})`);
    return;
  }
  const size = webpSize(buf);
  const cells = p.cols * p.rows;
  const want = [p.cols * BOARD_CELL[0], p.rows * BOARD_CELL[1]];
  boardBytes += buf.length;
  if (String(size) !== String(want)) bad.push(`${p.id}: ${what} is ${size}, not ${want}`);
  if (String(boardPx) !== String(want)) bad.push(`${p.id}: catalogue boardPx is ${boardPx}, not ${want}`);
  if (buf.length > BOARD_BUDGET * cells) bad.push(`${p.id}: ${what} is ${Math.round(buf.length / 1024)} KB, over ${(BOARD_BUDGET * cells) / 1024} KB`);
}
for (const p of catalogue.pictures) {
  const read = (rel, what) => {
    try {
      const buf = readFileSync(join(root, rel));
      return { size: webpSize(buf), bytes: statSync(join(root, rel)).size };
    } catch {
      bad.push(`${p.id}: no ${what} (${rel})`);
      return null;
    }
  };
  if (!p.board) {
    bad.push(`${p.id}: no "board" in the catalogue`);
    continue;
  }
  read(p.file, "full picture");
  check(p, p.board, p.boardPx, "board copy");
  // Library pictures ship no thumb (2026-10-26: the Albums screen is gone, and the build's file cap).
  if (p.thumb) bad.push(`${p.id}: lists a thumb; library pictures ship none (python tools/art/pictures.py catalogue)`);
}
// A trip's postcards (the catalogue's `destinations`): a whole board's picture, its board copy and
// a passport thumb; the window that plays (2x2, or 2x1 / 1x2 on an all-long board) must lie on it,
// and no id may also be a library picture.
const ids = new Set(catalogue.pictures.map((p) => p.id));
for (const d of catalogue.destinations ?? []) {
  if (ids.has(d.id)) bad.push(`${d.id}: a destination with a library picture's id`);
  const [c, r] = d.crop ?? [];
  const [w, h] = d.window ?? [];
  const shape = `${w}x${h}`;
  if (!["2x2", "2x1", "1x2"].includes(shape)) bad.push(`${d.id}: window ${d.window} is not 2x2, 2x1 or 1x2`);
  else if (!(c >= 0 && r >= 0 && c + w <= d.cols && r + h <= d.rows)) bad.push(`${d.id}: crop ${d.crop} puts its ${shape} window off its ${d.cols}x${d.rows} cards`);
  check(d, d.board, d.boardPx, "board copy");
  // The passport's tile: DEST_THUMB_W px wide at the postcard's aspect.
  const tw = [DEST_THUMB_W, Math.round((DEST_THUMB_W * d.rows * 4) / (d.cols * 3))];
  try {
    const buf = readFileSync(join(root, d.thumb));
    if (String(webpSize(buf)) !== String(tw) || String(d.thumbPx) !== String(tw)) bad.push(`${d.id}: thumb is ${webpSize(buf)} (catalogue ${d.thumbPx}), not ${tw}`);
    const tb = Math.floor((DEST_THUMB_BUDGET * tw[1]) / 400); // pro rata for a taller postcard
    if (buf.length > tb) bad.push(`${d.id}: thumb is ${Math.round(buf.length / 1024)} KB, over ${Math.round(tb / 1024)} KB`);
  } catch {
    bad.push(`${d.id}: no thumb (${d.thumb})`);
  }
  try {
    readFileSync(join(root, d.file));
  } catch {
    bad.push(`${d.id}: no full picture (${d.file})`);
  }
}
if (bad.length) {
  console.error(`check-copies: ${bad.length} problem(s); remake them with python tools/art/pictures.py boards / thumbs, then catalogue:`);
  for (const b of bad) console.error("  " + b);
  process.exit(1);
}
console.log(`check-copies: ${catalogue.pictures.length} pictures, ${(catalogue.destinations ?? []).length} destinations, board copies ${Math.round(boardBytes / 1024)} KB in all`);
