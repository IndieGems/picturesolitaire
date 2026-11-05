// THE HELPER STOCK: Hint, Undo and Shuffle, the player's own, carried from board to
// board (creator, 2026-10-27; AGENTS.md). The game's one door to it, for play and the
// screens. The stock is the platform's (three game currencies, at most 10 each,
// gem-backend-game-config.yaml): this module reads it, takes uses from it and buys
// for it, and never adds to it. Gifts are paid by the win checker (functions/checker,
// pay.rs), whose verdict says what landed; the count is read again after every answer.
//
//   count(k) > 0?  act  spend(k)   a use is taken AFTER the act, so Undo stays instant:
//                                  the count drops at once and the platform takes it behind,
//                                  one at a time. No answer, or the platform's "not now"
//                                  (rate_limited, unavailable): kept and sent again on a wait
//                                  that grows (src/net/pace.ts; never while hidden), and from the
//                                  "spends" slot after a restart too (resume: a slot read only
//                                  late sends nothing again, so no use is taken twice). "none":
//                                  the platform had none left (spent on another device); the
//                                  count is read again and the act stands.
//   buy(k, pack)                   one, or a pack of 3, for Coins, through the ARCADE'S purchase
//                                  sheet (gem.purchases.request) wherever it can draw one: since
//                                  2026-11-04 the platform refuses a website guest's direct Coins
//                                  spend (403 guest_upgrade_required), and the sheet shows a guest
//                                  the Arcade's own sign-up card instead. Only where there is no
//                                  sheet (a TV, an older Arcade) is it the direct purchase. One
//                                  that would pass the cap is refused before anything is asked
//                                  (fits). Never retried by itself.
//   price(k), affordable(k)        the price is the config's alone. The player's Coins are
//                                  read only to grey a button: the Arcade's wallet is the one
//                                  place they are shown ("No counter", platform rules).
//   bundles(), fitsBundle(slug),   THE GEMS BUNDLES (the creator, 2026-11-01): all three helpers
//   starterOpen(), buyBundle(slug) at once, for Gems, through the ARCADE'S purchase sheet
//                                  (gem.purchases.request: the Arcade confirms a Gems spend in its
//                                  own words and price, from the press). A bundle any of whose
//                                  grants would pass the cap is never asked for (fitsBundle), and
//                                  the platform refuses each grant at the cap too (overflow: fail).
//                                  The Starter Kit sells once per player, ever: whether it still
//                                  can is the platform's count of its uses (recipeUsage), never a
//                                  flag of ours. bundlesOffered(): the Arcade can draw the sheet.
//
// Unframed (the play-test tool) there is no platform: 3 of each, for this page only.
// Dev-menu practice and the lessons never spend.

import { gem } from "../gem";
import { onOnline } from "../ui/online";
import IDS from "./helper-ids.json";
import { noAnswer, refusalOf } from "./no-answer";
import { backoff, heard, held, needsLoad, notNow, whenDue } from "./pace";

export type HelperKind = "hint" | "undo" | "shuffle";
export type SpendAnswer = "spent" | "held" | "none";
/**
 * A Coins purchase: "ok" (bought; the stock was read again); "short" (not enough Coins); "full" (no
 * room under the cap); "failed" (the direct purchase refused, or no answer to it); "declined" (the
 * Arcade's sheet closed, a guest shown its sign-up card, or any other refusal: say nothing);
 * "unknown" (the sheet gave no reliable answer: the stock was read again, so draw from it, and never
 * ask again by itself).
 */
export type BuyAnswer = "ok" | "short" | "full" | "failed" | "declined" | "unknown";
export type Gift = "kit" | "hard" | "stamp" | "daily" | "suitcase";
/** One helper, or a pack of 3. */
export type Pack = 1 | 3;
/** A Gems bundle (src/net/helper-ids.json `bundles`; its recipe is `buy-starter-kit`, `buy-bundle-<slug>`). */
export type BundleSlug = "starter" | "small" | "medium" | "large";
export interface Bundle {
  slug: BundleSlug;
  /** What it grants of each helper. */
  contents: Readonly<Record<HelperKind, number>>;
  /** Its Gems price, from the game config; null until read. */
  gems: number | null;
  /** Sold once per player, ever (the Starter Kit). */
  once: boolean;
}
/**
 * A bundle's purchase (agreed with UI, 2026-11-01): "ok" (the platform confirmed it; the stock was
 * read again); "declined" (the player closed the sheet, a guest was shown the Arcade's sign-up
 * card, another Arcade sheet was open, or any other refusal: show nothing, never ask again by
 * itself); "short" (not enough
 * Gems: say so in the shop's own words, never a top-up); "full" (a grant would pass the cap:
 * nothing asked or charged); "gone" (the Starter Kit was bought before); "unknown" (no reliable
 * answer: the player may have paid; the stock was read again, so redraw from it, and never ask
 * again by itself); "failed" (no such bundle: nothing asked).
 */
export type BundleAnswer = "ok" | "declined" | "short" | "full" | "gone" | "unknown" | "failed";

const KINDS: readonly HelperKind[] = ["hint", "undo", "shuffle"];
/** The most of one helper a player can hold (each currency's max_balance). */
export const HELPER_CAP: number = IDS.cap;
/** Board 1's kit, once ever: what its finish card promises (the checker pays the same file's numbers). */
export const KIT: Readonly<Record<HelperKind, number>> = IDS.kit.gift;
/** A hard or super campaign board's first win. */
export const HARD_GIFT: Readonly<Record<HelperKind, number>> = IDS.hard;
/** A trip's last board (the passport stamp), instead of the hard gift. */
export const STAMP_GIFT: Readonly<Record<HelperKind, number>> = IDS.stamp;
/** The helper the daily puzzle's first win pays on a date ("YYYY-MM-DD", the player's own: src/net/daily.ts), by weekday; the checker pays the same. */
export function dailyHelper(date: string): HelperKind {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).getUTCDay();
  return IDS.daily[Number.isFinite(weekday) ? weekday : 0] as HelperKind;
}

const COINS = "ARCADE_TICKETS";
const SLOT = "spends";
/** Framed by the platform: another origin's frame. The play-test tool's frame is this page's own origin, with no platform behind it, so it plays as a plain tab. */
const framed = ((): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true; // another origin: a platform frame
  }
})();
const zero = (): Record<HelperKind, number> => ({ hint: 0, undo: 0, shuffle: 0 });

/** The platform's last-read totals (uses not yet taken are still in them). */
const stock: Record<HelperKind, number> = framed ? zero() : { hint: 3, undo: 3, shuffle: 3 };
/** Uses made and not yet taken by the platform, oldest kind first. */
const owed: HelperKind[] = [];
/** Each owed use's caller, answered once it settles (or "held" at its first failure). */
const waiting: { kind: HelperKind; answer: (a: SpendAnswer) => void }[] = [];
/** Coins prices, of one and of a pack of 3. */
const prices: Record<Pack, Record<HelperKind, number | null>> = { 1: { hint: null, undo: null, shuffle: null }, 3: { hint: null, undo: null, shuffle: null } };
/** The Gems bundles, in shop order, and each one's Gems price (null until read). */
type BundleIds = { name: BundleSlug; slug: string; id: string; grants: Record<HelperKind, number>; once: boolean; gemsUnframed: number };
const BUNDLES = (IDS as unknown as { bundles: BundleIds[] }).bundles;
const bundleOf = (slug: BundleSlug): BundleIds | undefined => BUNDLES.find((b) => b.name === slug);
/** Unframed (the play-test tool, no config): the stand-in prices, held to the config by tools/server/helpers-check.mts. */
const bundlePrice = new Map<BundleSlug, number>(framed ? [] : BUNDLES.map((b) => [b.name, b.gemsUnframed]));
/** The platform's id of Gems (`gemctl platform config`), to pick a bundle's Gems price. */
const GEMS_ID = "00000000-0000-0000-0000-000000000002";
/** The Starter Kit's uses, the platform's count (recipeUsage); null until read. Read once a session, and again after a try at it. */
let starterUses: number | null = null;
let usageReading = false;
let usageTries = 0;
let usageRetry: (() => void) | null = null;
let bundleBuying = false;
/** The prices are read (once a session); the waiting ask again while not, and how many failed in a row. */
let pricesRead = false;
let priceRetry: (() => void) | null = null;
let priceTries = 0;
let coins: number | null = null;
let known = !framed;
let sending = false;
let tries = 0;
/** The one send waiting to try again (src/net/pace.ts). */
let retry: (() => void) | null = null;
/** The "spends" slot holds owed uses (written only when one had to wait, and cleared after). */
let stored = false;
/** What the slot holds (JSON): an unchanged list is not written again. */
let keptDoc: string | null = null;
/** The last stock read, and the one out now with another asked behind it: a burst of verdicts reads once or twice. */
let lastRead = 0;
let refreshing: Promise<void> | null = null;
let refreshAgain = false;
const listeners = new Set<() => void>();
const changed = (): void => {
  for (const fn of [...listeners]) fn();
};

// ------------------------------------------------------------------ reading

async function readStock(fresh: boolean): Promise<boolean> {
  try {
    // the SDK's snapshot hears only of its own writes: a gift the checker paid needs a fresh read
    if (fresh) gem.me.inventory.refresh();
    const totals = await Promise.all(KINDS.map((k) => gem.me.currencies.get(IDS.kinds[k].currency)));
    // null: never held any (a player before their kit), which is none to use
    KINDS.forEach((k, i) => (stock[k] = Math.max(0, totals[i]!.total ?? 0)));
    known = true;
    return true;
  } catch (err) {
    console.warn(`[helpers] the stock could not be read: ${refusalOf(err)}`);
    return false;
  }
}

/**
 * The prices, once a session. With no identity yet (a play token refused or still on its way) they
 * are not known yet: nothing is asked, and they are asked again on a wait that grows
 * (src/net/pace.ts), quietly. (SDK 16.1.0's gameConfig.load() asked with no identity builds its
 * path from an empty game id and throws a TypeError, QA 2026-10-30 finding 4: never ask it so.)
 */
async function readPrices(): Promise<void> {
  if (pricesRead) return;
  try {
    await gem.awaitIdentity(10_000);
  } catch {
    return pricesLater();
  }
  try {
    const config = await gem.gameConfig.load();
    const recipes = config?.catalogs.find((c) => c.id === IDS.catalog)?.recipes ?? [];
    for (const k of KINDS) {
      for (const [pack, id] of [[1, IDS.kinds[k].buy], [3, IDS.kinds[k].buy3]] as const) {
        prices[pack][k] = recipes.find((x) => x.id === id)?.platform_prices?.[0]?.price ?? null;
      }
    }
    for (const b of BUNDLES) {
      const all = recipes.find((x) => x.id === b.id)?.platform_prices ?? [];
      const p = (all.find((x) => x.platform_currency_id === GEMS_ID) ?? (all.length === 1 ? all[0] : undefined))?.price;
      if (typeof p === "number") bundlePrice.set(b.name, p);
      else bundlePrice.delete(b.name); // not on sale on this channel's config: no price, so no row
    }
    pricesRead = true;
    priceTries = 0;
  } catch (err) {
    heard(err);
    console.warn(`[helpers] the prices could not be read: ${refusalOf(err)}`);
    if (notNow(err)) pricesLater();
  }
}

/** Ask for the prices again in a while (one waiting ask at a time), and say so when they land. */
function pricesLater(): void {
  priceRetry?.();
  priceRetry = whenDue(backoff(++priceTries, 5000), () => {
    priceRetry = null;
    void readPrices().then(() => pricesRead && changed());
  });
}

async function readCoins(): Promise<void> {
  try {
    const all = await gem.platform.currencies.get();
    const c = all.find((x) => x.slug === COINS);
    // null: the wallet listed no Coins, which says nothing about who the player is. A guest can
    // hold Coins (QA, 0.41.0: a test guest did), though a win pays a guest none (pay.rs).
    coins = c ? c.balance : null;
  } catch (err) {
    coins = null;
    console.warn(`[helpers] the Coins could not be read: ${refusalOf(err)}`);
  }
}

/**
 * The Starter Kit's uses, the platform's count (recipeUsage), one read at a time. Asked the first
 * time a screen wants to know (bundleOpen), and after a try at the kit; a read that fails is
 * unknown (null stays), and is asked again on a wait that grows (src/net/pace.ts).
 */
async function readUsage(): Promise<void> {
  const kit = BUNDLES.find((b) => b.once);
  if (!framed || !kit || usageReading) return;
  if (held() > 0) return usageLater(held());
  usageReading = true;
  try {
    const u = await gem.me.mutations.recipeUsage(kit.id);
    starterUses = Math.max(0, u?.useCount ?? 0); // null: never used
    usageTries = 0;
    changed();
  } catch (err) {
    heard(err);
    console.warn(`[helpers] the Starter Kit's uses could not be read: ${refusalOf(err)}`);
    usageLater(backoff(++usageTries, 5000));
  } finally {
    usageReading = false;
  }
}

function usageLater(ms: number): void {
  usageRetry?.();
  usageRetry = whenDue(ms, () => {
    usageRetry = null;
    void readUsage();
  });
}

/** The helpers of a bundle that would pass the cap with what is held now (empty: it fits). */
function overCap(b: BundleIds): HelperKind[] {
  return KINDS.filter((k) => (b.grants[k] ?? 0) > 0 && count(k) + b.grants[k] > HELPER_CAP);
}

/** Read the stock again (after a checker answer, a buy, a resume): one read at a time, and one more behind it at most. */
function refresh(fresh = true): Promise<void> {
  if (!framed) return Promise.resolve();
  if (refreshing) {
    refreshAgain = true;
    return refreshing;
  }
  refreshing = (async () => {
    try {
      do {
        refreshAgain = false;
        lastRead = Date.now();
        await Promise.all([readStock(fresh), readCoins()]);
        changed();
      } while (refreshAgain && held() === 0);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// ------------------------------------------------------------------ spending

const count = (k: HelperKind): number => Math.max(0, stock[k] - owed.filter((o) => o === k).length);

/**
 * Keep the owed uses for a restart, or clear them (only once something had to wait). Never before
 * this session has read the slot (resume): what an earlier session left is not written over unseen.
 * `closing` (the page hidden): skip the SDK's spacing between writes.
 *
 * A conflict (another device or tab wrote the slot since it was read) is REPLACED with this device's
 * list (`overwrite`), never merged: the slot is one device's outbox of uses, and a use is a
 * purchase the platform does not dedupe, so taking in another device's uses would spend them
 * twice (that device is sending them itself). Replacing them costs at most a use the player keeps.
 */
async function keep(closing = false): Promise<void> {
  if (!framed || !slotRead || (!owed.length && !stored)) return;
  const doc = { v: 1, owed: Object.fromEntries(KINDS.map((k) => [k, owed.filter((o) => o === k).length])), total: { ...stock } };
  const text = JSON.stringify(doc.owed);
  if (text === keptDoc) return; // the slot holds these already
  const put = (overwrite: boolean) => gem.me.saves.put(SLOT, doc, { timeoutMs: 10_000, ...(closing ? { teardown: true } : {}), ...(overwrite ? { overwrite: true } : {}) });
  try {
    try {
      await put(false);
    } catch (err) {
      if ((err as { reason?: string }).reason !== "save_conflict") throw err;
      await put(true);
    }
    stored = owed.length > 0;
    keptDoc = text;
  } catch (err) {
    heard(err);
    console.warn(`[helpers] the unsent uses could not be kept: ${refusalOf(err)}`);
    // this session's read of the slot failed after all (SDK: load_failed): read it again, then keep
    if (needsLoad(err)) {
      slotRead = false;
      resumeLater();
    }
  }
}

function answer(kind: HelperKind, a: SpendAnswer): void {
  const i = waiting.findIndex((w) => w.kind === kind);
  if (i >= 0) waiting.splice(i, 1)[0]!.answer(a);
}

/** Send the owed uses, one at a time, oldest first. */
async function pump(): Promise<void> {
  if (sending || !owed.length) return;
  if (held() > 0) return pumpLater(held());
  sending = true;
  retry?.();
  retry = null;
  try {
    while (owed.length) {
      const kind = owed[0]!;
      const before = stock[kind];
      try {
        await gem.me.mutations.purchase({ kind: "recipe", catalogId: IDS.catalog, targetId: IDS.kinds[kind].use, payment: { kind: "configured" } });
        owed.shift();
        stock[kind] = Math.max(0, stock[kind] - 1);
        tries = 0;
        answer(kind, "spent");
      } catch (err) {
        if (!notNow(err)) {
          // the platform's word: none left (or no such use). The act stands; the count is read again.
          console.warn(`[helpers] a ${kind} use was refused: ${refusalOf(err)}`);
          owed.shift();
          await readStock(true);
          answer(kind, "none");
          changed();
          continue;
        }
        heard(err);
        // no answer: it may have landed. A total one lower says it did; otherwise send it again.
        // (A "not now" refusal says it did not run: nothing to read.)
        if (noAnswer(err) && (await readStock(true)) && stock[kind] <= before - 1) {
          owed.shift();
          answer(kind, "spent");
          continue;
        }
        answer(kind, "held");
        void keep();
        pumpLater(backoff(++tries, 2000));
        return;
      }
    }
    void keep();
  } finally {
    sending = false;
    changed();
  }
}

/** Send again in `ms`, while the page is shown (one waiting send at a time). */
function pumpLater(ms: number): void {
  retry?.();
  retry = whenDue(ms, () => {
    retry = null;
    void pump();
  });
}

/** The "spends" slot has been read this session (keep() writes only after), the reads that failed in a row, and the one waiting. */
let slotRead = false;
let resumeTries = 0;
let resumeRetry: (() => void) | null = null;
/** The boot read of the slot failed at least once: a later read takes in nothing (below). */
let resumedLate = false;

/** Read the slot again in a while (src/net/pace.ts): a read that failed is unknown, never empty. */
function resumeLater(): void {
  resumedLate = true;
  resumeRetry?.();
  resumeRetry = whenDue(backoff(++resumeTries, 5000), () => {
    resumeRetry = null;
    void resume();
  });
}

/**
 * After a restart: uses an earlier session could not send, less any that landed since (a total
 * lower than the one kept). Read at boot; a read that fails is tried again later, and keep() writes
 * nothing over the slot until one succeeds. A read that succeeds only on a later try takes in no
 * uses: the stock has moved since boot (gifts, buys, this session's own uses), so what landed
 * cannot be told apart, and sending a use twice would take a helper the player has; skipping one
 * leaves it theirs. The slot is then written over with this session's list.
 */
async function resume(): Promise<void> {
  if (slotRead) return;
  let doc: { owed?: Partial<Record<HelperKind, number>>; total?: Partial<Record<HelperKind, number>> } | null = null;
  try {
    doc = await gem.me.saves.get(SLOT, { timeoutMs: 10_000 });
  } catch (err) {
    if (noAnswer(err) || (err as { reason?: string; code?: string }).reason !== "not_found") {
      heard(err);
      console.warn(`[helpers] the unsent uses could not be read: ${refusalOf(err)}`);
      return resumeLater();
    }
  }
  slotRead = true;
  resumeTries = 0;
  if (resumedLate) {
    if (doc?.owed) {
      keptDoc = JSON.stringify(doc.owed);
      stored = true;
      console.info("[helpers] the unsent uses of an earlier session were read late: not sent again (the stock moved since)");
    }
    void keep();
    return;
  }
  if (!doc?.owed) {
    void keep(); // uses made while it was read
    return;
  }
  keptDoc = JSON.stringify(doc.owed);
  for (const k of KINDS) {
    const n = Math.max(0, Math.floor(Number(doc.owed[k]) || 0));
    if (!n) continue;
    stored = true;
    // a use that landed after the slot was written shows as a lower total
    const landed = Math.max(0, (Number(doc.total?.[k]) || 0) - stock[k]);
    for (let i = landed; i < n; i++) owed.push(k);
  }
  changed();
  void pump();
}

/** The catalog moved (nothing was charged): read the prices again for the next try. */
function pricesMoved(): void {
  pricesRead = false;
  gem.gameConfig.refresh();
  void readPrices().then(() => changed());
}

/**
 * A Coins purchase on the Arcade's sheet (helpers.buy): the Arcade confirms the spend in its own
 * words, and shows a guest its sign-up card, then brings them back. ok: the stock is read again (the
 * SDK's cache dropped first) and only then answered. declined: back to the game with nothing said
 * (closed, a guest, a refusal), but for not enough Coins and no room, which the shop says in its own
 * words. unavailable or a failed call: the stock is read again ("unknown"), never asked again.
 */
async function buyOnSheet(k: HelperKind, pack: Pack, recipe: string): Promise<BuyAnswer> {
  let res: { outcome: string; reason?: string };
  try {
    res = await gem.purchases.request({ kind: "recipe", catalogId: IDS.catalog, targetId: recipe, currencySlug: COINS, quantity: 1 });
  } catch (err) {
    // the call itself failed (no bridge): nobody knows, so read what landed
    console.warn(`[helpers] buying a ${k}: ${refusalOf(err)}`);
    await refresh();
    return "unknown";
  }
  const reason = res.reason ?? "";
  if (res.outcome === "declined" && (reason === "cancelled" || reason === "busy")) return "declined";
  // anything else the platform answered may have moved the stock or the Coins
  await refresh();
  if (res.outcome === "ok") return "ok";
  if (res.outcome === "unavailable") {
    console.warn(`[helpers] buying a ${k}: no reliable answer (${reason || "none"}); the stock was read again`);
    return "unknown";
  }
  console.warn(`[helpers] buying a ${k} was declined: ${reason || "no reason"}`);
  if (reason === "insufficient_funds") return "short";
  if (reason === "item_max_stack_exceeded" || !helpers.fits(k, pack)) return "full";
  if (reason === "price_mismatch" || reason === "config_version_stale" || reason === "not_purchasable") pricesMoved();
  return "declined";
}

// ------------------------------------------------------------------ the door

export const helpers = {
  /** The last-read stock, less uses not yet taken; 0 until read. */
  count,
  /** The first read has landed this session. */
  known: (): boolean => known,
  full: (k: HelperKind): boolean => count(k) >= HELPER_CAP,
  /** One, or a pack, would still fit under the cap. */
  fits: (k: HelperKind, pack: Pack = 1): boolean => count(k) + pack <= HELPER_CAP,
  /** Call AFTER the act (the screens check count(k) > 0 first). The count drops at once. */
  spend(k: HelperKind): Promise<SpendAnswer> {
    if (!framed) {
      stock[k] = Math.max(0, stock[k] - 1);
      changed();
      return Promise.resolve("spent");
    }
    owed.push(k);
    changed();
    const p = new Promise<SpendAnswer>((answer) => waiting.push({ kind: k, answer }));
    void pump();
    return p;
  },
  /** The Coins price of one or a pack of 3, from the game config; null until read (or no such pack). */
  price: (k: HelperKind, pack: Pack = 1): number | null => prices[pack][k],
  /** The player's Coins cover the price; null while unknown. For greying a button only. */
  affordable: (k: HelperKind, pack: Pack = 1): boolean | null => {
    const p = prices[pack][k];
    return coins === null || p === null ? null : coins >= p;
  },
  /**
   * Buy one or a pack of 3 for Coins (call from the Buy press): on the Arcade's sheet where it can
   * draw one (buyOnSheet), else the direct purchase. The stock is read again before it answers.
   */
  async buy(k: HelperKind, pack: Pack = 1): Promise<BuyAnswer> {
    if (!framed) return "failed";
    if (!helpers.fits(k, pack)) return "full";
    const recipe = pack === 3 ? IDS.kinds[k].buy3 : IDS.kinds[k].buy;
    // the ask goes first, nothing awaited before it
    if (gem.frame?.parentSupports("purchases")) return buyOnSheet(k, pack, recipe);
    try {
      await gem.me.mutations.purchase({ kind: "recipe", catalogId: IDS.catalog, targetId: recipe, quantity: 1, payment: { kind: "platform_currency", currencySlug: COINS } });
      await refresh();
      return "ok";
    } catch (err) {
      const code = (err as { code?: string }).code;
      console.warn(`[helpers] buying a ${k} answered: ${refusalOf(err)}`);
      await refresh();
      // a guest (SDK 21.1.0): the SDK has handed the buy to the Arcade, which offers them an account; say nothing
      if (code === "guest_upgrade_required") return "declined";
      if (code === "insufficient_funds") return "short";
      if (!noAnswer(err) && !helpers.fits(k, pack)) return "full";
      return "failed";
    }
  },
  /** The Gems bundles, in the order to show (Starter Kit, Small, Medium, Large). */
  bundles: (): Bundle[] =>
    BUNDLES.map((b) => ({ slug: b.name, contents: { ...b.grants }, gems: bundlePrice.get(b.name) ?? null, once: b.once })),
  /**
   * Can this bundle be bought (the platform's word): the Starter Kit only while its uses are 0,
   * null while not known yet (the first ask reads it, and onChange says when it lands); every
   * other bundle, always true.
   */
  bundleOpen(slug: BundleSlug): boolean | null {
    const b = bundleOf(slug);
    if (!b) return false;
    if (!b.once) return true;
    if (!framed) return starterUses === null || starterUses < 1;
    if (starterUses === null) void readUsage();
    return starterUses === null ? null : starterUses < 1;
  },
  /** The helpers this bundle would take past HELPER_CAP, with what is held now (empty: it fits). */
  fitsBundle: (slug: BundleSlug): HelperKind[] => {
    const b = bundleOf(slug);
    return b ? overCap(b) : [];
  },
  /** The Arcade can draw its purchase sheet here: without it, show no bundle row. */
  bundlesOffered: (): boolean => !framed || !!gem.frame?.parentSupports("purchases"),
  /**
   * Buy a bundle for Gems, through the Arcade's purchase sheet (it confirms the spend in its own
   * words and price, and shows a guest its sign-up card). Call it from the Buy press, nothing
   * awaited first. A bundle that would pass the cap, a Starter Kit had already,
   * or a second buy while one is open is answered at once, with nothing asked. The stock (and
   * for the kit its uses) is read again before any answer the platform gave, through the same
   * paced reads as a Coins buy. Never retried by itself.
   */
  buyBundle(slug: BundleSlug): Promise<BundleAnswer> {
    const b = bundleOf(slug);
    if (!b) return Promise.resolve("failed");
    if (overCap(b).length) return Promise.resolve("full");
    if (b.once && starterUses !== null && starterUses >= 1) return Promise.resolve("gone");
    if (!framed) {
      // the stand-in (the play-test tool): the stock grows on this page only
      for (const k of KINDS) stock[k] += b.grants[k] ?? 0;
      if (b.once) starterUses = 1;
      changed();
      return Promise.resolve("ok");
    }
    if (bundleBuying) return Promise.resolve("declined");
    bundleBuying = true;
    // asked first thing in the press, so the sheet opens at once (SDK 20 needs no press for it)
    let asked: Promise<{ outcome: string; reason?: string }>;
    try {
      asked = gem.purchases.request({ kind: "recipe", catalogId: IDS.catalog, targetId: b.id, currencySlug: "GEMS", quantity: 1 });
    } catch (err) {
      asked = Promise.reject(err);
    }
    return asked
      .then(async (res): Promise<BundleAnswer> => {
        const reason = res.reason ?? "";
        if (res.outcome === "declined" && (reason === "cancelled" || reason === "busy")) return "declined";
        // anything the platform answered may have moved the stock (an unknown, a refusal at the cap)
        await refresh();
        if (b.once) await readUsage();
        if (res.outcome === "ok") return "ok";
        if (res.outcome === "unavailable") {
          console.warn(`[helpers] buying the ${slug} bundle: no reliable answer (${reason || "none"}); the stock was read again`);
          return "unknown";
        }
        console.warn(`[helpers] buying the ${slug} bundle was declined: ${reason || "no reason"}`);
        if (reason === "insufficient_funds") return "short";
        if (reason === "recipe_max_uses_exceeded" || reason === "already_owned") return "gone";
        if (reason === "price_mismatch" || reason === "config_version_stale" || reason === "not_purchasable") pricesMoved();
        // any other refusal (a guest shown the Arcade's sign-up card among them): nothing said
        return overCap(b).length ? "full" : "declined";
      })
      .catch(async (err): Promise<BundleAnswer> => {
        // the call itself failed (no bridge): unknown, so read what landed
        console.warn(`[helpers] buying the ${slug} bundle: ${refusalOf(err)}`);
        await refresh();
        if (b.once) await readUsage();
        return "unknown";
      })
      .finally(() => {
        bundleBuying = false;
      });
  },
  /** Read the stock again. The game need not call it: the boot, a resume, a buy and a page shown again do. */
  refresh: (): Promise<void> => refresh(),
  /**
   * A checker verdict's receipt (claims.ts): what landed of each helper (after the cap's clamp) and
   * the Coins it paid, added to what was last read, with no read of our own (the platform's own
   * word; the lead, 2026-10-30: a read after every win was two calls each). Before the first read
   * there is nothing to add to: it reads instead.
   */
  credit(landed: Partial<Record<HelperKind, number>>, coinsPaid: number): void {
    if (!framed) return;
    if (!known) {
      void refresh();
      return;
    }
    let any = false;
    for (const k of KINDS) {
      const n = Math.max(0, Math.floor(Number(landed[k]) || 0));
      if (n) {
        stock[k] += n;
        any = true;
      }
    }
    if (coinsPaid > 0 && coins !== null) {
      coins += coinsPaid;
      any = true;
    }
    if (any) changed();
  },
  /** Hear any change of counts, prices or what can be bought. Returns the unsubscribe. */
  onChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};

/** Start: read the stock, the prices and the Coins, and send what an earlier session left. Call once, at boot. */
export async function loadHelpers(): Promise<void> {
  if (!framed) return;
  try {
    await gem.awaitIdentity(10_000);
  } catch {
    // no identity yet: the reads below fail and are tried again on the connection's return
  }
  await Promise.all([readStock(false), readPrices(), readCoins()]);
  changed();
  // a purchase finished after its call had answered (SDK 21.1.0: a guest who made an account on the
  // Arcade's offer and bought there, maybe after a reload): the SDK confirmed it and refreshed gem.me;
  // read the stock and the Coins so the shops and the board's counts show it
  gem.purchases.onSettled(() => void refresh());
  await resume();
  onOnline((up) => {
    if (!up) return;
    tries = 0;
    if (!known) void refresh(false);
    void pump();
  });
  // hidden: keep what waits (once; an unchanged list is not written again). Shown again: read the
  // stock, unless it was read in the last 15 s or the platform asked for a wait (src/net/pace.ts)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void keep(true);
    else if (Date.now() - lastRead > 15_000 && held() === 0) void refresh();
  });
}
