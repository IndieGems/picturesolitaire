// The player's helpers as the screens see them: how many Hints, Undos and Shuffles they
// carry, what one (or the pack) costs, whether their Coins cover it, the spend and the
// purchase, and the bundles, in Coins too (bundle-rows.ts). The record is the platform's (the helpers are
// Arcade-held game currencies, each capped by its max_balance in the game config, never in the
// save), read and written by Server's src/net/helpers.ts,
// which also keeps a spend that got no answer and sends it again until it lands. This file
// only puts a dev-only pretend in front of it (app.ts, __ps.stock), so the screens can be
// checked in the play-test tool, where no platform answers.
//
// EVERY FIGURE IS THE CONFIG'S (the creator, 2026-11-12: "never copy amounts from the config into
// code"): the cap, what the single and the pack grant, a bundle's contents and once-only, every
// price, all read by Server's helpers.ts. Until the config is read they are unknown, and an unknown
// figure offers nothing: no price, no bundle. The cap reads as no cap at all (Infinity) meanwhile,
// so no line ever says something is full: and with no price and no bundle, none can be.
//
// Where the player's Coins are concerned the screens only ever ask "enough?": the
// Arcade's wallet is the one place the number is drawn (the platform's "No counter").
// Nothing here says who is a guest: a guest can hold Coins (QA, 0.41.0, a test guest),
// so "no Coins" is no sign of one (who can challenge a friend: src/net/friends.ts).

import { helpers, type Bundle, type BundleAnswer, type BundleSlug, type Buy, type BuyAnswer, type HelperKind, type SpendAnswer } from "../net/helpers";
import { shopStats, type ShopWhere } from "./board-stats";

export type { Bundle, BundleAnswer, BundleSlug, BuyAnswer, HelperKind, SpendAnswer };
/**
 * The screens' names of a helper's two buys: 1 the single, 3 the pack (helper-shop.ts). NAMES, never
 * counts: what each grants is the config's (stock.size). The words "3 Hints" and the pack's art are
 * UI's (locales, public/art/helper-*-3.webp).
 */
export type Pack = 1 | 3;
export const KINDS: readonly HelperKind[] = ["undo", "hint", "shuffle"];
export const PACKS: readonly Pack[] = [1, 3];
const buyOf = (p: Pack): Buy => (p === 3 ? "pack" : "one");

type Prices = Record<Pack, Record<HelperKind, number>>;
/**
 * SAMPLE FIGURES for the dev server's pretend (__ps.stock, the play-test tool's, which has no config):
 * made up to try the screens with, NOT the config's, and deliberately unlike them. import.meta.env.DEV
 * is false in every build, so this is null there and none of it is in a build:test or a build:release.
 */
const SAMPLE = import.meta.env.DEV
  ? {
      cap: 12,
      size: { 1: 1, 3: 3 } as Record<Pack, number>,
      prices: { 1: { undo: 90, hint: 120, shuffle: 210 }, 3: { undo: 240, hint: 330, shuffle: 560 } } as Prices,
      bundles: [
        { slug: "starter", contents: { hint: 2, undo: 2, shuffle: 2 }, coins: 900, once: true },
        { slug: "small", contents: { hint: 1, undo: 1, shuffle: 1 }, coins: 400, once: false },
        { slug: "medium", contents: { hint: 2, undo: 3, shuffle: 2 }, coins: 800, once: false },
        { slug: "large", contents: { hint: 6, undo: 6, shuffle: 6 }, coins: 1500, once: false },
      ] as Bundle[],
    }
  : null;

/** `kitGone`: the Starter Kit was bought; `bundle`: what a bundle's purchase answers (ok, by default). */
type Pretend = { counts: Record<HelperKind, number>; prices: Prices | null; coins: number; kitGone: boolean; bundle: BundleAnswer };
/** The dev server's stand-in (never in a build): set by __ps.stock. */
let pretend: Pretend | null = null;
const pretendHeard = new Set<() => void>();
const said = () => {
  for (const fn of [...pretendHeard]) fn();
};
/** The pretend is on, with its samples (the dev server only). */
const sampling = (): typeof SAMPLE => (pretend ? SAMPLE : null);

/** The purchase itself: the platform's, or the pretend's. */
async function buyNow(k: HelperKind, pack: Pack): Promise<BuyAnswer> {
  const s = sampling();
  if (!pretend || !s) return helpers.buy(k, buyOf(pack));
  const price = pretend.prices?.[pack][k];
  if (price === undefined) return "failed";
  if (!stock.fits(k, pack)) return "full";
  await new Promise((r) => setTimeout(r, 500));
  if (pretend.coins < price) return "short";
  pretend.coins -= price;
  pretend.counts[k] += s.size[pack];
  said();
  return "ok";
}

/** The stand-in's bundle purchase: the answer it was told to give, else short of Coins, else the bundle added (the kit once). */
async function pretendBundle(b: Bundle): Promise<BundleAnswer> {
  const p = pretend!;
  if (b.once && p.kitGone) return "gone";
  if (stock.bundleFits(b.slug).length) return "full";
  await new Promise((r) => setTimeout(r, 500));
  if (p.bundle !== "ok") return p.bundle;
  if (b.coins === null) return "failed";
  if (p.coins < b.coins) return "short";
  p.coins -= b.coins;
  for (const k of KINDS) p.counts[k] += b.contents[k];
  if (b.once) p.kitGone = true;
  said();
  return "ok";
}
const bundleOf = (slug: BundleSlug): Bundle | undefined => (sampling()?.bundles ?? helpers.bundles()).find((b) => b.slug === slug);

export const stock = {
  /**
   * The most of one helper a player can carry: the config's (each currency's max_balance), read live.
   * Infinity (no cap known) until the config is read: nothing then counts as full, and since nothing is
   * on sale either (no price, no bundle), no line can say "full" or "room for".
   */
  get cap(): number {
    return sampling()?.cap ?? helpers.cap() ?? Infinity;
  },
  /** How many the player carries, as last read less the spends not yet taken (0 while unread). */
  count: (k: HelperKind): number => (pretend ? pretend.counts[k] : helpers.count(k)),
  /** What the single (1) or the pack (3) grants, the config's; null while unknown. */
  size: (k: HelperKind, pack: Pack = 1): number | null => sampling()?.size[pack] ?? helpers.size(k, buyOf(pack)),
  /** The single, or the pack, would still fit under the cap. False only when that is known (then it has a price too). */
  fits(k: HelperKind, pack: Pack = 1): boolean {
    const n = stock.size(k, pack);
    return n === null || stock.count(k) + n <= stock.cap;
  },
  /** The price in Coins of the single or the pack (the game config's), or null while any figure of it is unknown, or not sold. */
  price: (k: HelperKind, pack: Pack = 1): number | null => (pretend ? (pretend.prices?.[pack][k] ?? null) : helpers.price(k, buyOf(pack))),
  /** Do the player's Coins cover the price? null while unknown. */
  affordable(k: HelperKind, pack: Pack = 1): boolean | null {
    if (!pretend) return helpers.affordable(k, buyOf(pack));
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
  /**
   * Buy the single or the pack with Coins, from the Buy press in shop `where`; the stock is read again
   * before it answers. A purchase the platform took is counted then (helper_bought, board-stats.ts),
   * at the price it was offered at.
   */
  async buy(k: HelperKind, pack: Pack = 1, where?: ShopWhere): Promise<BuyAnswer> {
    const price = stock.price(k, pack);
    const answer = await buyNow(k, pack);
    if (answer === "ok" && where) shopStats.bought(where, k, pack, price);
    return answer;
  },
  /**
   * The bundles on sale to this player now, in order: every figure from this channel's config, and a
   * limited one (the Starter Kit) only once the platform has said it is still theirs to buy (unknown:
   * left out until onChange says). None until the config is read.
   */
  bundles(): Bundle[] {
    const s = sampling();
    if (s) return s.bundles.filter((b) => !b.once || !pretend!.kitGone);
    return helpers.bundles().filter((b) => b.coins !== null && helpers.bundleOpen(b.slug) === true);
  },
  /** Do the player's Coins cover bundle `slug`? null while unknown (only for greying its button). */
  bundleAffordable(slug: BundleSlug): boolean | null {
    if (!pretend) return helpers.bundleAffordable(slug);
    const price = bundleOf(slug)?.coins ?? null;
    return price === null ? null : pretend.coins >= price;
  },
  /** The helpers bundle `slug` would carry past the cap, with what is carried now (empty: it fits). */
  bundleFits(slug: BundleSlug): HelperKind[] {
    if (!pretend) return helpers.fitsBundle(slug);
    const b = bundleOf(slug);
    return b ? KINDS.filter((k) => b.contents[k] > 0 && stock.count(k) + b.contents[k] > stock.cap) : [];
  },
  /**
   * Buy bundle `slug` for Coins from shop `where`. Call it in the Buy press's own turn: the Arcade is
   * asked first thing, nothing awaited before it (Server's helpers.buyBundle: the Arcade's sheet where it
   * draws one, else a direct Coins purchase; short of Coins it answers "short" and opens nothing). A
   * purchase taken is counted (helper_bought: helper "all", pack its slug, price its Coins).
   */
  buyBundle(slug: BundleSlug, where?: ShopWhere): Promise<BundleAnswer> {
    const b = bundleOf(slug);
    const asked = pretend && b ? pretendBundle(b) : helpers.buyBundle(slug);
    return asked.then((answer) => {
      if (answer === "ok" && where && b) shopStats.bundleBought(where, slug, b.coins);
      return answer;
    });
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
  /** Dev server only: pretend the platform said this, with the samples' figures (null: back to the platform's word). */
  pretend(p: (Omit<Partial<Pretend>, "counts"> & { counts?: Partial<Record<HelperKind, number>> }) | null): void {
    if (!import.meta.env.DEV || !SAMPLE) return;
    pretend = p
      ? {
          counts: { undo: 3, hint: 3, shuffle: 3, ...pretend?.counts, ...p.counts },
          prices: p.prices === undefined ? (pretend?.prices ?? SAMPLE.prices) : p.prices,
          coins: p.coins ?? pretend?.coins ?? 420,
          kitGone: p.kitGone ?? pretend?.kitGone ?? false,
          bundle: p.bundle ?? pretend?.bundle ?? "ok",
        }
      : null;
    said();
  },
};
