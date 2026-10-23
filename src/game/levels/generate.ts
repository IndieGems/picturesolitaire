// THE DEAL GENERATOR. Pure and deterministic: the same spec and seed give the
// same deal on every device (integer arithmetic and the rules' seeded random
// only), so a level, or the daily deal, is the same board for everyone.
//
// A spec names the board, the pictures and the targets on each axis. The deal
// for a seed is a seeded shuffle of the pictures' cards into the stacks: the
// first `rows` cards of every stack are the opening board, the rest are dealt
// out to the stacks unevenly, so columns run dry at different times. A deal is
// kept only when:
//   - nothing is joined or finished when it opens (the player does all of it),
//     and the opening is not already a dead end;
//   - the solver proves it winnable with no helpers and the real rules replay
//     its line to a win (a search that runs out proves nothing: rejected);
//   - each measure (src/game/solver/metrics.ts) is inside its target range.
// The generator tries seeds in order from a starting seed and keeps the first
// deal that passes, so a level is (spec, seed), and its data is checked against
// a fresh deal from the same pair (tools/levels/check.mts).

import { cardsOf, isDeadEnd, joinCount, random, start, type Deal, type Move, type Picture } from "../rules.ts";
import { Game, solveDeal, type Step } from "../solver/index.ts";
import { along, careless, chain, chainOf, traps } from "../solver/metrics.ts";

export type Range = [min: number, max: number];

export interface Targets {
  /** The chain of clears that depend on one another (metrics.ts). */
  chain?: Range;
  /** The careless player's chance of winning, 0..1. */
  careless?: Range;
  /** Steps of the winning line with a choice that dooms the board. */
  traps?: Range;
}

export interface Spec {
  /** The level's id: it seeds the deal, with the seed. */
  id: string;
  cols: number;
  rows: number;
  pictures: Picture[];
  targets: Targets;
}

export interface Measures {
  chain: number;
  careless: number;
  traps: number;
  /** The chain of the stored line itself (>= chain). */
  lineChain: number;
  /** Cards waiting in the stacks when the board opens. */
  waiting: number;
  /** Cards in each stack, opening included. */
  stacks: number[];
}

export interface Made {
  seed: number;
  deal: Deal;
  line: Move[];
  steps: Step[];
  measures: Measures;
}

/** FNV-1a: a level id as a 32-bit number. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The deal for `spec` and `seed`: the same on every device. */
export function dealFor(spec: Spec, seed: number): Deal {
  const rnd = random((hashId(spec.id) ^ Math.imul(seed, 0x9e3779b1)) >>> 0);
  const cards = spec.pictures.flatMap((_, p) => cardsOf(spec.pictures, p));
  for (let k = cards.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    [cards[k], cards[j]] = [cards[j]!, cards[k]!];
  }
  const stacks: number[][] = Array.from({ length: spec.cols }, () => []);
  const opening = Math.min(spec.cols * spec.rows, cards.length);
  cards.slice(0, opening).forEach((card, k) => stacks[k % spec.cols]!.push(card));
  for (const card of cards.slice(opening)) stacks[Math.floor(rnd() * spec.cols)]!.push(card);
  return { cols: spec.cols, rows: spec.rows, pictures: spec.pictures.map((p) => ({ ...p })), stacks, seed };
}

const inside = (v: number, r?: Range) => !r || (v >= r[0] - 1e-9 && v <= r[1] + 1e-9);

/** Why a deal was turned down, for the generator's tally. */
export type Verdict = "joined" | "dead" | "lost" | "careless" | "chain" | "unproven" | "traps" | "kept";

/** Measure one deal and keep it if it meets the spec; else say why not. */
export function judge(spec: Spec, deal: Deal): Made | Verdict {
  const s = start(deal).state;
  if (s.cleared.length || joinCount(s) > 0) return "joined";
  if (isDeadEnd(s)) return "dead";
  const game = new Game(s);
  if (!game.wins(game.root)) return "lost";
  const cl = careless(game);
  if (!inside(cl, spec.targets.careless)) return "careless";
  const ch = chain(game);
  if (ch === null || !inside(ch, spec.targets.chain)) return "chain";
  const a = solveDeal(deal);
  if (!("win" in a)) return "unproven";
  const tr = traps(game, along(game, deal, a.win.moves));
  if (!inside(tr, spec.targets.traps)) return "traps";
  return {
    seed: deal.seed,
    deal,
    line: a.win.moves,
    steps: a.win.steps,
    measures: {
      chain: ch,
      careless: cl,
      traps: tr,
      lineChain: chainOf(game, a.win.steps),
      waiting: Math.max(0, deal.stacks.reduce((n, st) => n + st.length, 0) - deal.cols * deal.rows),
      stacks: deal.stacks.map((st) => st.length),
    },
  };
}

/**
 * The first deal from seed `from` on that meets the spec, with its winning
 * line and measures; null after `tries` seeds (the spec asks too much).
 */
export function generate(spec: Spec, from = 1, tries = 4000, tally?: Map<Verdict, number>): Made | null {
  for (let seed = from; seed < from + tries; seed++) {
    const v = judge(spec, dealFor(spec, seed));
    if (typeof v !== "string") {
      tally?.set("kept", (tally.get("kept") ?? 0) + 1);
      return v;
    }
    tally?.set(v, (tally.get(v) ?? 0) + 1);
  }
  return null;
}
