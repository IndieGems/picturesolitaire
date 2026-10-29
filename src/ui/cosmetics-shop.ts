// What the Cosmetics screen (cosmetics.ts) reads and does about buying: the prices, whether the
// player's Coins cover one, and the purchase. The record is the platform's, read and written by
// Server's src/net/cosmetics.ts (the price is the game config's alone; a buy is the platform's
// direct order, charged once and granted once, never resent). This file only counts a purchase
// the platform took (cosmetic_bought) and puts a dev-only pretend in front of it (app.ts,
// __ps.cosmetics), so the screen can be checked in the play-test tool, where no platform answers.
//
// The player's Coins are never drawn: the Arcade's wallet is the one place they show (the
// platform's "No counter"). The screens only ever ask "enough?", to grey a price button that stays
// pressable and answers in words.

import { cosmetics, FOR_SALE, type BuyAnswer, type CosmeticKind } from "../net/cosmetics";
import { TABLES } from "../net/tables";
import { TRACKS } from "../net/tracks";
import { cosmeticStats } from "./board-stats";
import { pretendOwnedTables } from "./tables";
import { pretendOwnedTracks } from "./tracks";

export type { BuyAnswer, CosmeticKind };

type Pretend = { coins: number; prices: Map<string, number>; owned: Set<string>; fail: boolean };
/** The dev server's stand-in (never in a build): set by __ps.cosmetics. */
let pretend: Pretend | null = null;
const heard = new Set<() => void>();
const said = (): void => {
  for (const fn of [...heard]) fn();
};

/** The prices the config is written with (Server's tables.json and tracks.json): what the pretend charges. */
const LISTED = new Map<string, number>([
  ...TABLES.filter((x) => x.award === "shop" && typeof x.price === "number").map((x) => [x.slug, x.price!] as [string, number]),
  ...TRACKS.map((x) => [x.slug, x.price] as [string, number]),
]);

/** The pretend's owned items, told to the table and track lists (the screen and the choosers read them there). */
function tell(): void {
  if (!pretend) {
    pretendOwnedTables(null);
    pretendOwnedTracks(null);
    return;
  }
  const tables = new Set(TABLES.map((x) => x.slug));
  pretendOwnedTables([...pretend.owned].filter((s) => tables.has(s)));
  pretendOwnedTracks([...pretend.owned].filter((s) => !tables.has(s)));
}

async function buyNow(slug: string): Promise<BuyAnswer> {
  if (!pretend) return cosmetics.buy(slug);
  await new Promise((r) => setTimeout(r, 600));
  if (pretend.fail) return "failed";
  if (pretend.owned.has(slug)) return "owned";
  const price = pretend.prices.get(slug);
  if (price === undefined) return "failed";
  if (pretend.coins < price) return "short";
  pretend.coins -= price;
  pretend.owned.add(slug);
  tell();
  said();
  return "ok";
}

export const shop = {
  /** As the screen opens: the prices (once a session) and the Coins (each time). */
  load: (): Promise<void> => (pretend ? Promise.resolve() : cosmetics.load()),
  /** The Coins price, the game config's; null while unread (or not for sale). */
  price: (slug: string): number | null => (pretend ? (pretend.prices.get(slug) ?? null) : cosmetics.price(slug)),
  /** Do the player's Coins cover it? null while unknown (for greying a button only). */
  affordable(slug: string): boolean | null {
    if (!pretend) return cosmetics.affordable(slug);
    const p = pretend.prices.get(slug);
    return p === undefined ? null : pretend.coins >= p;
  },
  /**
   * Buy `slug` with Coins, from its Buy press. "ok" once the platform took it (and the shared read
   * already says it is owned): counted then (cosmetic_bought), at the price it was offered at.
   */
  async buy(kind: CosmeticKind, slug: string): Promise<BuyAnswer> {
    const price = shop.price(slug);
    const answer = await buyNow(slug).catch((): BuyAnswer => "failed");
    if (answer === "ok") cosmeticStats.bought(kind, slug, price);
    return answer;
  },
  /** Hear when a price, the Coins or what was bought change. Returns the unsubscribe. */
  onChange(fn: () => void): () => void {
    heard.add(fn);
    const off = cosmetics.onChange(fn);
    return () => {
      heard.delete(fn);
      off();
    };
  },
};

/**
 * Dev server only (app.ts, __ps.cosmetics): play the Cosmetics screen without the platform. `coins`
 * (default 3000), the items `owned` (slugs, tables and tracks; the default table and track are every
 * player's anyway), `prices` over the listed ones, and `fail` to answer every buy "not now". null:
 * the platform's word again.
 */
export function pretendCosmetics(p: { coins?: number; owned?: string[]; prices?: Record<string, number>; fail?: boolean } | null): void {
  if (!import.meta.env.DEV) return;
  pretend = p
    ? {
        coins: p.coins ?? 3000,
        prices: new Map([...LISTED, ...Object.entries(p.prices ?? {})]),
        owned: new Set(p.owned ?? []),
        fail: !!p.fail,
      }
    : null;
  tell();
  said();
}

/** Dev server only: the pretend's state, for checks. */
export const pretendState = (): { coins: number; owned: string[] } | null =>
  pretend ? { coins: pretend.coins, owned: [...pretend.owned] } : null;

/** Every item for sale, in the screen's order (Server's list). */
export { FOR_SALE };
