// Choosing a board's pictures from the catalogue (src/content/pictures.json),
// on the axes that are about the pictures themselves: how many, how alike
// (lookalike families), how many cards each, and which shapes. Pure and
// deterministic from the random source it is given.
//
// LOOKALIKES: the catalogue groups its pictures into families of four that
// share colours and subjects on purpose (warm dusks, pink blooms...). `alike`
// lists the family groups a board holds: [] is all different families, [2] one
// pair from one family, [3, 2] a triple from one and a pair from another. Every
// other picture comes from a family of its own on that board.
//
// EVENNESS: across a campaign every picture should come round about as often
// as any other, so the picker takes the least-used pictures it can, and avoids
// those on the board just before.

import type { Picture } from "../rules.ts";
import type { Range } from "./generate.ts";

export interface CataloguePicture {
  id: string;
  cols: number;
  rows: number;
  family: string;
}

export interface PickSpec {
  /** How many pictures. */
  count: number;
  /** Family groups, largest first: [3, 2] is a triple and a pair of lookalikes. */
  alike: number[];
  /** Total cards on the board, all pictures together. */
  cards: Range;
  /** Cards a picture may have (2 for 2x1, 4 for 2x2, 6 for 3x2, 9 for 3x3). */
  sizes: number[];
  /** Shapes ("3x3", "2x3"...) that must be on the board, one picture each (["3x3", "3x3"]: both). */
  must?: string[];
  /** At most this many pictures of a size, by cards: { 9: 1 } is one 3x3 at most (the default). */
  most?: Record<number, number>;
}

export const shapeOf = (p: { cols: number; rows: number }) => `${p.cols}x${p.rows}`;

/**
 * The pictures for one board, or null if none of `tries` attempts fits.
 * `uses` counts how often each picture has been on a board so far; `recent`
 * are the pictures of the board before.
 */
export function pick(
  catalogue: readonly CataloguePicture[],
  spec: PickSpec,
  uses: ReadonlyMap<string, number>,
  recent: ReadonlySet<string>,
  rnd: () => number,
  tries = 400,
): Picture[] | null {
  const groups = [...spec.alike].sort((a, b) => b - a);
  const singles = spec.count - groups.reduce((n, g) => n + g, 0);
  if (singles < 0) throw new Error("pick: more lookalikes than pictures");
  const eligible = catalogue.filter((p) => spec.sizes.includes(p.cols * p.rows));
  const families = [...new Set(eligible.map((p) => p.family))];
  const use = (p: CataloguePicture) => (uses.get(p.id) ?? 0) + (recent.has(p.id) ? 1.5 : 0);
  // later tries wander further from the least-used pictures
  let noise = 0.9;
  const cost = (p: CataloguePicture) => use(p) + rnd() * noise;
  const size = (p: CataloguePicture) => p.cols * p.rows;
  const minSize = Math.min(...spec.sizes);
  const maxSize = Math.max(...spec.sizes);

  let best: { set: CataloguePicture[]; score: number } | null = null;
  for (let t = 0; t < tries; t++) {
    noise = 0.9 + t * 0.02;
    const chosen: CataloguePicture[] = [];
    const usedFam = new Set<string>();
    // a family per group, the cheapest-to-use first (with some randomness)
    const famOrder = families
      .map((f) => ({ f, c: eligible.filter((p) => p.family === f).reduce((n, p) => n + use(p), 0) + rnd() * noise * 4 }))
      .sort((a, b) => a.c - b.c)
      .map((x) => x.f);
    let ok = true;
    // a picture with a required shape decides its family, for a group or as a single
    // (two required pictures of one family, such as both 3x3s, must be a group)
    const must = [...(spec.must ?? [])];
    const forced = new Map<string, CataloguePicture[]>();
    const taken = new Set<CataloguePicture>();
    for (const shape of must) {
      const cands = eligible.filter((p) => shapeOf(p) === shape && !taken.has(p) && (!forced.has(p.family) || !eligible.some((q) => shapeOf(q) === shape && !taken.has(q) && !forced.has(q.family))));
      if (!cands.length) {
        ok = false;
        break;
      }
      const p = cands.map((p) => ({ p, c: cost(p) })).sort((a, b) => a.c - b.c)[0]!.p;
      taken.add(p);
      forced.set(p.family, [...(forced.get(p.family) ?? []), p]);
    }
    if (!ok) continue;
    const forcedFams = [...forced.keys()];
    const fitsGroup = (f: string, g: number) => !usedFam.has(f) && eligible.filter((p) => p.family === f).length >= g && (forced.get(f)?.length ?? 0) <= g;
    for (const g of groups) {
      // a family holding two required pictures takes a group; sometimes a required picture's family is this group
      const coin = rnd() < 0.5;
      const fam =
        forcedFams.find((f) => forced.get(f)!.length > 1 && fitsGroup(f, g)) ??
        (coin ? forcedFams.find((f) => fitsGroup(f, g)) : undefined) ??
        famOrder.find((f) => !forced.has(f) && fitsGroup(f, g));
      if (!fam) {
        ok = false;
        break;
      }
      usedFam.add(fam);
      const members = eligible.filter((p) => p.family === fam);
      const pinned = forced.get(fam) ?? [];
      const rest = members
        .filter((p) => !pinned.includes(p))
        .map((p) => ({ p, c: cost(p) }))
        .sort((a, b) => a.c - b.c)
        .map((x) => x.p);
      chosen.push(...pinned, ...rest.slice(0, g - pinned.length));
    }
    if (!ok) continue;
    // required pictures not in a group come in as singles
    let left = singles;
    for (const [fam, ps] of forced) {
      if (usedFam.has(fam)) continue;
      if (ps.length > 1 || left-- <= 0) {
        ok = false;
        break;
      }
      usedFam.add(fam);
      chosen.push(ps[0]!);
    }
    if (!ok) continue;
    for (; left > 0; left--) {
      // only sizes that still let the board's total land in range
      const total = chosen.reduce((n, p) => n + size(p), 0);
      const cands = eligible.filter(
        (p) =>
          !usedFam.has(p.family) &&
          total + size(p) + (left - 1) * minSize <= spec.cards[1] &&
          total + size(p) + (left - 1) * maxSize >= spec.cards[0],
      );
      if (!cands.length) {
        ok = false;
        break;
      }
      const p = cands.map((p) => ({ p, c: cost(p) })).sort((a, b) => a.c - b.c)[0]!.p;
      usedFam.add(p.family);
      chosen.push(p);
    }
    if (!ok) continue;
    if (!fits(catalogue, spec, chosen)) continue;
    const score = chosen.reduce((n, p) => n + (use(p) + 1) ** 2, 0);
    if (!best || score < best.score) best = { set: chosen, score };
  }
  return best ? best.set.map((p) => ({ id: p.id, cols: p.cols, rows: p.rows })) : null;
}

/** The family groups a set of pictures makes, largest first ([] when all differ). */
export function alikeOf(catalogue: readonly CataloguePicture[], pictures: readonly { id: string }[]): number[] {
  const fam = new Map(catalogue.map((p) => [p.id, p.family]));
  const n = new Map<string, number>();
  for (const p of pictures) n.set(fam.get(p.id)!, (n.get(fam.get(p.id)!) ?? 0) + 1);
  return [...n.values()].filter((k) => k > 1).sort((a, b) => b - a);
}

/** Does this set of pictures meet the spec on every picture axis? */
export function fits(catalogue: readonly CataloguePicture[], spec: PickSpec, pictures: readonly { id: string; cols: number; rows: number }[]): boolean {
  if (pictures.length !== spec.count || new Set(pictures.map((p) => p.id)).size !== pictures.length) return false;
  const want = [...spec.alike].sort((a, b) => b - a);
  const got = alikeOf(catalogue, pictures);
  if (want.length !== got.length || want.some((g, i) => g !== got[i])) return false;
  const cards = pictures.reduce((n, p) => n + p.cols * p.rows, 0);
  if (cards < spec.cards[0] || cards > spec.cards[1]) return false;
  if (!pictures.every((p) => spec.sizes.includes(p.cols * p.rows))) return false;
  const most = { 9: 1, ...spec.most };
  for (const [size, max] of Object.entries(most)) if (pictures.filter((p) => p.cols * p.rows === +size).length > max) return false;
  const shapes = pictures.map(shapeOf);
  for (const m of spec.must ?? []) {
    const i = shapes.indexOf(m);
    if (i < 0) return false;
    shapes.splice(i, 1);
  }
  return true;
}
