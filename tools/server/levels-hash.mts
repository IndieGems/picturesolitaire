// The level data's fingerprint, as the win checker computes it when it is built
// (functions/checker/build.rs, canon.rs levels_hash): FNV-1a (32-bit) of the
// lines "lane/id/dealHash" for every board in src/content/levels/{campaign,
// challenge,daily}.json, sorted, joined by "\n". tools/server/check.mts proves
// the two agree.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dealHash } from "../../src/net/deal-hash.ts";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const LANES = ["campaign", "challenge", "daily"];

export function levelsHash(): string {
  const lines = [];
  for (const lane of LANES) {
    const f = join(root, "src/content/levels", `${lane}.json`);
    if (!existsSync(f)) continue;
    for (const l of JSON.parse(readFileSync(f, "utf8")).levels) lines.push(`${lane}/${l.id}/${dealHash(l)}`);
  }
  lines.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(lines.join("\n"))) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}
