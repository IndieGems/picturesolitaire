// Which version of a board a claim was played on: FNV-1a (32-bit) of the deal's
// canonical text, as 8 lowercase hex. The win checker computes the same
// (functions/checker/src/claim.rs, deal_hash) over the deals compiled into it,
// so a claim from a build whose board the function does not know yet is told
// "retry" rather than refused. tools/server/check.mts proves the two agree.
//
//   cols x rows ; picture:cols x rows,... ; stack cards joined by "," and stacks by "/" ; seed

import type { Deal } from "../game/rules.ts";

export function dealHash(d: Pick<Deal, "cols" | "rows" | "pictures" | "stacks" | "seed">): string {
  const pictures = d.pictures.map((p) => `${p.id}:${p.cols}x${p.rows}`).join(",");
  const stacks = d.stacks.map((s) => s.join(",")).join("/");
  const text = `${d.cols}x${d.rows};${pictures};${stacks};${d.seed >>> 0}`;
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(text)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}
