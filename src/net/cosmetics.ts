// THE COSMETICS SCREEN'S DOOR TO THE PLATFORM (the creator, 2026-10-29; the screen is UI's, this
// door was agreed with UI). The shop tables (src/net/tables.json, award "shop") and the
// soundtracks (src/net/tracks.json) are each bought ONCE for Coins, through the game config's
// "cosmetics" catalog (written by tools/server/make-config.mts): one offer per item, slug
// "buy-<item slug>". The event tables (the suitcase's, Winter Market, the onboarding keepsake)
// have no offer, so nothing here can sell one.
//
// A BUY CHARGES ONCE AND GRANTS ONCE (the inventory-and-catalogs skill): it is the same direct
// platform order as a helper's (src/net/helpers.ts), which debits the Coins and grants the item
// in one step on the server, reversing the debit if the grant fails. Each offer may be used once
// per player, ever (max_uses 1), and the item stacks to 1: a second buy, a double press, or a
// resend after an unanswered one is refused before any Coins move. This file never resends: a
// buy with no answer reads the bag, and says "ok" only if the item is there.
//
// No Coins balance is ever drawn (the Arcade's wallet is the only one): the Coins are read
// only to grey a price button, which stays pressable and answers in words.
//
// Calls: load() when the screen opens (the prices once a session, the Coins each time); buy()
// from the Buy press only; nothing else asks the platform, and nothing while it asked for a
// wait (src/net/pace.ts). What the player owns is src/net/keepsake.ts's one shared read.

import { GemApiError, PurchaseRefusal } from "@indiegems/gem-web-sdk/sdk";
import { gem } from "../gem";
import { suspect } from "../ui/online";
import { boughtNow, ownsTable, rereadOwned } from "./keepsake";
import { refusalOf } from "./no-answer";
import { heard, held } from "./pace";
import { TABLES } from "./tables";
import { TRACKS } from "./tracks";

const framed = window.self !== window.top;
const COINS = "ARCADE_TICKETS";
const CATALOG = "cosmetics";
const offerSlug = (slug: string): string => `buy-${slug}`;

export type CosmeticKind = "table" | "track";
/** ok: bought (or already bought and now known); owned: it was already the player's, nothing charged; short: not enough Coins; failed: not now. */
export type BuyAnswer = "ok" | "owned" | "short" | "failed";

/** Every item for sale, in the screen's order: the shop tables, then the soundtracks. */
export const FOR_SALE: readonly { slug: string; kind: CosmeticKind; title: string }[] = [
  ...TABLES.filter((t) => t.award === "shop").map((t) => ({ slug: t.slug, kind: "table" as const, title: t.title })),
  ...TRACKS.map((t) => ({ slug: t.slug, kind: "track" as const, title: t.title })),
];

let catalogId: string | null = null;
/** Each item's offer and its Coins price, as the game config has them. */
const offers = new Map<string, { recipe: string; price: number }>();
let coins: number | null = null;
let loading: Promise<void> | null = null;
let buying = false;
const listeners = new Set<() => void>();

function changed(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch (err) {
      console.warn("[cosmetics] a listener failed:", err);
    }
  }
}

async function readOffers(): Promise<void> {
  if (catalogId) return;
  try {
    const config = await gem.gameConfig.load();
    const catalog = config?.catalogs.find((c) => c.slug === CATALOG);
    if (!catalog) {
      console.warn("[cosmetics] the game config has no cosmetics catalog");
      return;
    }
    for (const item of FOR_SALE) {
      const r = catalog.recipes.find((x) => x.slug === offerSlug(item.slug));
      const price = r?.platform_prices?.[0]?.price;
      if (r && typeof price === "number") offers.set(item.slug, { recipe: r.id, price });
    }
    catalogId = catalog.id;
  } catch (err) {
    console.warn(`[cosmetics] the prices could not be read: ${refusalOf(err)}`);
  }
}

async function readCoins(): Promise<void> {
  try {
    const c = (await gem.platform.currencies.get()).find((x) => x.slug === COINS);
    coins = c ? c.balance : null;
  } catch (err) {
    heard(err);
    coins = null;
    console.warn(`[cosmetics] the Coins could not be read: ${refusalOf(err)}`);
  }
}

/** The platform refused (it answered), as opposed to no answer at all. */
const answered = (err: unknown): boolean => err instanceof GemApiError || err instanceof PurchaseRefusal;
const codeOf = (err: unknown): string | undefined => (err instanceof GemApiError ? (err.code ?? err.reason) : err instanceof PurchaseRefusal ? err.code : undefined);

/** Read the bag afresh (the SDK's cache dropped first) and say whether it holds `slug`. */
async function holdsNow(slug: string): Promise<boolean> {
  gem.me.inventory.refresh();
  return (await rereadOwned()).has(slug);
}

export const cosmetics = {
  /**
   * Call when the screen opens: the prices (once a session, from the game config) and the Coins
   * (each time; for greying only). One read at a time; nothing while the platform asked for a wait.
   */
  load(): Promise<void> {
    if (!framed) return Promise.resolve();
    if (loading) return loading;
    if (held() > 0) return Promise.resolve();
    loading = (async () => {
      try {
        await gem.awaitIdentity(10_000);
      } catch {
        // no identity yet: the reads below fail and the next open asks again
      }
      await Promise.all([readOffers(), readCoins()]);
      changed();
    })().finally(() => {
      loading = null;
    });
    return loading;
  },
  /** The item's Coins price from the game config; null until read, unframed, or when it is not for sale. */
  price: (slug: string): number | null => offers.get(slug)?.price ?? null,
  /** The player's Coins cover the price; null while unknown. For greying a button only: never draw the Coins. */
  affordable(slug: string): boolean | null {
    const p = offers.get(slug)?.price;
    return coins === null || p === undefined ? null : coins >= p;
  },
  /**
   * Buy one item for Coins: call from the Buy press only. By the time it answers "ok", the shared
   * read (ownedTables / ownedTracks) says the item is owned. Never resent; one buy at a time.
   */
  async buy(slug: string): Promise<BuyAnswer> {
    if (!framed || buying || held() > 0) return "failed";
    const offer = offers.get(slug);
    if (!offer || !catalogId) return "failed";
    if (await ownsTable(slug)) return "owned"; // the one shared read holds tables and tracks alike
    buying = true;
    try {
      await gem.me.mutations.purchase({ kind: "recipe", catalogId, targetId: offer.recipe, quantity: 1, payment: { kind: "platform_currency", currencySlug: COINS } });
      // the platform confirmed: owned from now on, whatever an older read says
      boughtNow(slug);
      if (coins !== null) coins -= offer.price;
      return "ok";
    } catch (err) {
      heard(err);
      console.warn(`[cosmetics] buying ${slug} answered: ${refusalOf(err)}`);
      if (!answered(err)) {
        // no answer proves nothing: it may have landed. Never sent again; the bag says.
        suspect();
        return (await holdsNow(slug)) ? "ok" : "failed";
      }
      const code = codeOf(err);
      if (code === "insufficient_funds") {
        void readCoins().then(changed);
        return "short";
      }
      if (code === "recipe_max_uses_exceeded" || code === "item_max_stack_exceeded") {
        // bought before (another device, or a buy whose answer was lost): nothing was charged now
        boughtNow(slug);
        return "owned";
      }
      if (code === "price_mismatch" || code === "config_version_stale" || code === "not_purchasable") {
        // the catalog moved; nothing was charged. Read it again at the next open.
        catalogId = null;
        offers.clear();
      }
      return "failed";
    } finally {
      buying = false;
      changed();
    }
  },
  /** Hear any change of prices, Coins or what was bought. Returns the unsubscribe. */
  onChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};
