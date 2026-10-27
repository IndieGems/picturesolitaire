// The player's helpers as the screens see them: how many Hints, Undos and Shuffles they
// carry, what one costs, whether their Coins cover it, the spend and the purchase. The
// record is the platform's (the helpers are Arcade-held game currencies, capped at 10
// each, never in the save), read and written by Server's src/net/helpers.ts, which also
// keeps a spend that got no answer and sends it again until it lands. This file only
// puts a dev-only pretend in front of it (app.ts, __ps.stock), so the screens can be
// checked in the play-test tool, where no platform answers.
//
// Where the player's Coins are concerned the screens only ever ask "enough?": the
// Arcade's wallet is the one place the number is drawn (the platform's "No counter").

import { helpers, HELPER_CAP, type BuyAnswer, type HelperKind, type SpendAnswer } from "../net/helpers";

export type { BuyAnswer, HelperKind, SpendAnswer };
/** Board 1's travel kit, as the checker grants it (one copy, the checker's own: Server's helpers.ts). */
export { KIT } from "../net/helpers";
export const KINDS: readonly HelperKind[] = ["undo", "hint", "shuffle"];

type Pretend = { counts: Record<HelperKind, number>; prices: Record<HelperKind, number> | null; coins: number; guest: boolean };
/** The dev server's stand-in (never in a build): set by __ps.stock. */
let pretend: Pretend | null = null;
const pretendHeard = new Set<() => void>();
const said = () => {
  for (const fn of [...pretendHeard]) fn();
};

export const stock = {
  cap: HELPER_CAP,
  /** How many the player carries, as last read less the spends not yet taken (0 while unread). */
  count: (k: HelperKind): number => (pretend ? pretend.counts[k] : helpers.count(k)),
  /** The price in Coins (the game config's), or null while unread. */
  price: (k: HelperKind): number | null => (pretend ? (pretend.prices?.[k] ?? null) : helpers.price(k)),
  /** Do the player's Coins cover the price? null while unknown. */
  affordable(k: HelperKind): boolean | null {
    if (!pretend) return helpers.affordable(k);
    const p = pretend.prices?.[k];
    return p === undefined ? null : pretend.coins >= p;
  },
  /** A guest cannot buy (no Coins here): the earn line only. */
  guest: (): boolean => (pretend ? pretend.guest : helpers.guest()),
  /** One used, AFTER the board acted and only when it was not free: the count drops at once. */
  spend(k: HelperKind): Promise<SpendAnswer> {
    if (!pretend) return helpers.spend(k);
    pretend.counts[k] = Math.max(0, pretend.counts[k] - 1);
    said();
    return Promise.resolve("spent");
  },
  /** Buy one with Coins, from the Buy press; the stock is read again before it answers. */
  async buy(k: HelperKind): Promise<BuyAnswer> {
    if (!pretend) return helpers.buy(k);
    const price = pretend.prices?.[k];
    if (price === undefined) return "failed";
    if (pretend.counts[k] >= HELPER_CAP) return "full";
    if (pretend.coins < price) return "short";
    await new Promise((r) => setTimeout(r, 500));
    pretend.coins -= price;
    pretend.counts[k] += 1;
    said();
    return "ok";
  },
  /** Hear when a count, a price or the player's Coins change. Returns the unsubscribe. */
  onChange(fn: () => void): () => void {
    const off = helpers.onChange(fn);
    pretendHeard.add(fn);
    return () => {
      off();
      pretendHeard.delete(fn);
    };
  },
  /** Dev server only: pretend the platform said this (null: back to the platform's word). */
  pretend(p: Partial<Pretend> | null): void {
    if (!import.meta.env.DEV) return;
    pretend = p
      ? {
          counts: { undo: 3, hint: 3, shuffle: 3, ...pretend?.counts, ...p.counts },
          prices: p.prices === undefined ? (pretend?.prices ?? { undo: 100, hint: 150, shuffle: 250 }) : p.prices,
          coins: p.coins ?? pretend?.coins ?? 420,
          guest: p.guest ?? pretend?.guest ?? false,
        }
      : null;
    said();
  },
};
