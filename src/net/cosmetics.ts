// THE COSMETICS SCREEN'S DOOR TO THE PLATFORM (the creator, 2026-10-29; the screen is UI's, this
// door was agreed with UI). The shop tables (src/net/tables.json, award "shop") and the
// soundtracks (src/net/tracks.json) are each bought ONCE for Coins, through the game config's
// "cosmetics" catalog (written by tools/server/make-config.mts): one offer per item, slug
// "buy-<item slug>". The event tables (the suitcase's, Winter Market, the onboarding keepsake)
// have no offer, so nothing here can sell one.
//
// A BUY CHARGES ONCE AND GRANTS ONCE (the inventory-and-catalogs skill): like a helper's
// (src/net/helpers.ts) it goes through the ARCADE'S purchase sheet (gem.purchases.request) wherever
// the Arcade can draw one: since 2026-11-04 the platform refuses a website guest's direct Coins
// spend (403 guest_upgrade_required), and the sheet shows a guest its own sign-up card instead.
// Only without a sheet (a TV, an older Arcade) is it the direct platform order. Either way the
// server debits the Coins and grants the item in one step, reversing the debit if the grant fails.
// Each offer may be used once per player, ever (max_uses 1), and the item stacks to 1: a second
// buy, a double press, or a resend after an unanswered one is refused before any Coins move. This
// file never resends: a buy with no answer reads the bag, and says "ok" only if the item is there.
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

/** Framed by the platform: another origin's frame (as src/net/helpers.ts). The play-test tool's frame is this page's own origin, with no platform behind it, so it plays as a plain tab and asks nothing. */
const framed = ((): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true; // another origin: a platform frame
  }
})();
const COINS = "ARCADE_TICKETS";
const CATALOG = "cosmetics";
const offerSlug = (slug: string): string => `buy-${slug}`;

export type CosmeticKind = "table" | "track";
/**
 * ok: bought (or already bought and now known); owned: it was already the player's, nothing charged;
 * short: not enough Coins; failed: not now; declined: the Arcade's sheet closed, a guest shown its
 * sign-up card, or any other refusal (say nothing); unknown: the sheet gave no reliable answer and
 * the bag, read again, does not hold it (say nothing, never ask again by itself).
 */
export type BuyAnswer = "ok" | "owned" | "short" | "failed" | "declined" | "unknown";

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

/**
 * A buy on the Arcade's sheet (cosmetics.buy): the Arcade confirms the spend in its own words, and
 * shows a guest its sign-up card, then brings them back. ok: owned, the bag and the Coins read
 * again. declined: nothing said (closed, a guest, a refusal), but for not enough Coins and already
 * owned. unavailable or a failed call: the bag says ("unknown" if it does not hold it).
 */
async function buyOnSheet(slug: string, recipe: string, catalog: string): Promise<BuyAnswer> {
  let res: { outcome: string; reason?: string };
  try {
    res = await gem.purchases.request({ kind: "recipe", catalogId: catalog, targetId: recipe, currencySlug: COINS, quantity: 1 });
  } catch (err) {
    // the call itself failed (no bridge): nobody knows, so the bag says
    console.warn(`[cosmetics] buying ${slug}: ${refusalOf(err)}`);
    return (await holdsNow(slug)) ? "ok" : "unknown";
  }
  const reason = res.reason ?? "";
  if (res.outcome === "ok") {
    // the platform confirmed: owned from now on, whatever an older read says
    boughtNow(slug);
    gem.me.inventory.refresh();
    void readCoins().then(changed);
    return "ok";
  }
  if (res.outcome === "unavailable") {
    console.warn(`[cosmetics] buying ${slug}: no reliable answer (${reason || "none"}); the bag was read again`);
    return (await holdsNow(slug)) ? "ok" : "unknown";
  }
  if (reason === "cancelled" || reason === "busy") return "declined";
  console.warn(`[cosmetics] buying ${slug} was declined: ${reason || "no reason"}`);
  if (reason === "insufficient_funds") {
    void readCoins().then(changed);
    return "short";
  }
  if (reason === "recipe_max_uses_exceeded" || reason === "item_max_stack_exceeded") {
    // bought before (another device, or a buy whose answer was lost): nothing was charged now
    boughtNow(slug);
    return "owned";
  }
  if (reason === "price_mismatch" || reason === "config_version_stale" || reason === "not_purchasable") {
    // the catalog moved; nothing was charged. Read it again at the next open.
    catalogId = null;
    offers.clear();
  }
  return "declined";
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
        // no identity yet (a play token refused or still on its way): nothing is asked, and the
        // next open asks again. SDK 16.1.0's gameConfig.load() with no identity throws a TypeError
        // (an empty game id in its path; QA 2026-10-30 finding 4), so it is never asked so.
        return;
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
    if (gem.frame?.parentSupports("purchases")) {
      // on the Arcade's sheet, asked first thing in the press, nothing awaited before it (a Buy on a
      // stale screen for an item already owned is refused before any charge: "owned")
      buying = true;
      try {
        return await buyOnSheet(slug, offer.recipe, catalogId);
      } finally {
        buying = false;
        changed();
      }
    }
    // the direct order, only where the Arcade cannot draw its sheet
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
