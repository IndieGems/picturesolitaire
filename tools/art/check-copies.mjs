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
  const cells = p.cols * p.rows;
  const want = [p.cols * BOARD_CELL[0], p.rows * BOARD_CELL[1]];
  const board = read(p.board, "board copy");
  if (board) {
    boardBytes += board.bytes;
    if (String(board.size) !== String(want)) bad.push(`${p.id}: board copy is ${board.size}, not ${want}`);
    if (String(p.boardPx) !== String(want)) bad.push(`${p.id}: catalogue boardPx is ${p.boardPx}, not ${want}`);
    if (board.bytes > BOARD_BUDGET * cells)
      bad.push(`${p.id}: board copy is ${Math.round(board.bytes / 1024)} KB, over ${(BOARD_BUDGET * cells) / 1024} KB`);
  }
  const thumb = read(p.thumb, "thumb");
  if (thumb) {
    if (!thumb.size || Math.max(...thumb.size) !== THUMB_LONG) bad.push(`${p.id}: thumb is ${thumb.size}, not ${THUMB_LONG} px long`);
    if (thumb.bytes > THUMB_BUDGET) bad.push(`${p.id}: thumb is ${Math.round(thumb.bytes / 1024)} KB, over ${THUMB_BUDGET / 1024} KB`);
  }
}
if (bad.length) {
  console.error(`check-copies: ${bad.length} problem(s); remake them with python tools/art/pictures.py boards / thumbs, then catalogue:`);
  for (const b of bad) console.error("  " + b);
  process.exit(1);
}
console.log(`check-copies: ${catalogue.pictures.length} pictures, board copies ${Math.round(boardBytes / 1024)} KB in all`);
