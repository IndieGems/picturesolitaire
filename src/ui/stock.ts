// The player's helpers as the screens see them: how many Hints, Undos and Shuffles they
// carry, what one (or a pack of 3) costs, whether their Coins cover it, the spend and the
// purchase. The record is the platform's (the helpers are Arcade-held game currencies,
// capped at 10 each, never in the save), read and written by Server's src/net/helpers.ts,
// which also keeps a spend that got no answer and sends it again until it lands. This file
// only puts a dev-only pretend in front of it (app.ts, __ps.stock), so the screens can be
// checked in the play-test tool, where no platform answers.
//
// Where the player's Coins are concerned the screens only ever ask "enough?": the
// Arcade's wallet is the one place the number is drawn (the platform's "No counter").
// Nothing here says who is a guest: a guest can hold Coins (QA, 0.41.0, a test guest),
// so "no Coins" is no sign of one (who can challenge a friend: src/net/friends.ts).

import { helpers, HELPER_CAP, type BuyAnswer, type HelperKind, type Pack, type SpendAnswer } from "../net/helpers";

export type { BuyAnswer, HelperKind, Pack, SpendAnswer };
/** Board 1's travel kit, as the checker grants it (one copy, the checker's own: Server's helpers.ts). */
export { KIT, dailyHelper } from "../net/helpers";
export const KINDS: readonly HelperKind[] = ["undo", "hint", "shuffle"];
export const PACKS: readonly Pack[] = [1, 3];

type Prices = Record<Pack, Record<HelperKind, number>>;
type Pretend = { counts: Record<HelperKind, number>; prices: Prices | null; coins: number };
/** The dev server's stand-in (never in a build): set by __ps.stock. */
let pretend: Pretend | null = null;
const pretendHeard = new Set<() => void>();
const said = () => {
  for (const fn of [...pretendHeard]) fn();
};
/** The config's prices as they stand (Server's config v28): what the pretend charges unless told otherwise. */
const PRETEND_PRICES: Prices = { 1: { undo: 100, hint: 150, shuffle: 250 }, 3: { undo: 270, hint: 400, shuffle: 675 } };

export const stock = {
  cap: HELPER_CAP,
  /** How many the player carries, as last read less the spends not yet taken (0 while unread). */
  count: (k: HelperKind): number => (pretend ? pretend.counts[k] : helpers.count(k)),
  /** One (or a pack) would still fit under the cap. */
  fits: (k: HelperKind, pack: Pack = 1): boolean => stock.count(k) + pack <= HELPER_CAP,
  /** The price in Coins of one or a pack of 3 (the game config's), or null while unread or not sold. */
  price: (k: HelperKind, pack: Pack = 1): number | null => (pretend ? (pretend.prices?.[pack][k] ?? null) : helpers.price(k, pack)),
  /** Do the player's Coins cover the price? null while unknown. */
  affordable(k: HelperKind, pack: Pack = 1): boolean | null {
    if (!pretend) return helpers.affordable(k, pack);
    const p = pretend.prices?.[pack][k];
    return p === undefined ? null : pretend.coins >= p;
  },
  /** One used, AFTER the board acted and only when it was not free: the count drops at once. */
  spend(k: HelperKind): Promise<SpendAnswer> {
    if (!pretend) return helpers.spend(k);
    pretend.counts[k] = Math.max(0, pretend.counts[k] - 1);
    said();
    return Promise.resolve("spent");
  },
  /** Buy one or a pack of 3 with Coins, from the Buy press; the stock is read again before it answers. */
  async buy(k: HelperKind, pack: Pack = 1): Promise<BuyAnswer> {
    if (!pretend) return helpers.buy(k, pack);
    const price = pretend.prices?.[pack][k];
    if (price === undefined) return "failed";
    if (!stock.fits(k, pack)) return "full";
    await new Promise((r) => setTimeout(r, 500));
    if (pretend.coins < price) return "short";
    pretend.coins -= price;
    pretend.counts[k] += pack;
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
  pretend(p: (Omit<Partial<Pretend>, "counts"> & { counts?: Partial<Record<HelperKind, number>> }) | null): void {
    if (!import.meta.env.DEV) return;
    pretend = p
      ? {
          counts: { undo: 3, hint: 3, shuffle: 3, ...pretend?.counts, ...p.counts },
          prices: p.prices === undefined ? (pretend?.prices ?? PRETEND_PRICES) : p.prices,
          coins: p.coins ?? pretend?.coins ?? 420,
        }
      : null;
    said();
  },
};
