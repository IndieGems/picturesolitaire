// THE HELPER STOCK: Hint, Undo and Shuffle, the player's own, carried from board to
// board (creator, 2026-10-27; AGENTS.md). The game's one door to it, for play and the
// screens. The stock is the platform's (three game currencies, each capped by its
// max_balance, gem-backend-game-config.yaml): this module reads it, takes uses from it and
// buys for it, and never adds to it. Gifts are paid by the win checker (functions/checker,
// pay.rs), whose verdict says what landed; the count is read again after every answer.
//
// EVERY FIGURE OF THE SHOP IS THE CONFIG'S, never this file's (the creator, 2026-11-12: "never
// copy amounts from the config into code"; ECON-08): each helper's cap (its currency's
// max_balance), what each buy grants (its recipe's currency_grant: the single, the pack), each
// bundle's contents (its recipe's grants) and limit (max_uses), and every price, all read in the
// one gem.gameConfig.load() of a session (readConfig). Until that read lands a figure is unknown,
// and AN UNKNOWN FIGURE OFFERS NOTHING: a buy whose size, cap or price is unknown has no price, and
// a bundle whose contents, price or caps are unknown is not listed. Never a guessed number.
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
//   buy(k, buy)                    the single or the pack, for Coins, through the ARCADE'S purchase
//                                  sheet (gem.purchases.request) wherever it can draw one: since
//                                  2026-11-04 the platform refuses a website guest's direct Coins
//                                  spend (403 guest_upgrade_required), and the sheet shows a guest
//                                  the Arcade's own sign-up card instead. Only where there is no
//                                  sheet (a TV, an older Arcade) is it the direct purchase. One
//                                  that would pass the cap is refused before anything is asked
//                                  (fits). Never retried by itself.
//   cap(k), size(k, buy)           the config's cap and what a buy grants; null while unknown.
//   price(k), affordable(k)        the price is the config's alone. The player's Coins are
//                                  read only to grey a button: the Arcade's wallet is the one
//                                  place they are shown ("No counter", platform rules).
//   bundles(), fitsBundle(slug),   THE BUNDLES (the creator, 2026-11-01): all three helpers at
//   bundleOpen(slug),              once, for Coins since 2026-11-10 (the creator: no Gems in the
//   bundleAffordable(slug),        Arcade, 100 Gems became 500 Coins), by the SAME route as a Coins
//   buyBundle(slug)                pack (pay(): the Arcade's sheet, else the direct purchase). A
//                                  bundle any of whose grants would pass the cap is never asked for
//                                  (fitsBundle), and the platform refuses each grant at the cap too
//                                  (overflow: fail). The Starter Kit sells once per player, ever:
//                                  whether it still can is the platform's count of its uses
//                                  (recipeUsage) against its recipe's max_uses, never a flag of
//                                  ours. Its recipe is the one sold for Gems before, so a kit
//                                  bought then still counts its use.
//
// Unframed there is no platform and no config, so nothing is on sale. The dev server's page (the
// play-test tool) gets a SAMPLE stock to try the board's helpers with (SAMPLE_STOCK, in no build);
// the shops' sample figures are the screens' pretend (src/ui/stock.ts). Dev-menu practice and the
// lessons never spend.

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
/**
 * Which of a helper's two buy recipes (src/net/helper-ids.json `buy`, `buy3`): the single or the pack. A
 * NAME, never a count: what each grants is its recipe's, the config's (size()).
 */
export type Buy = "one" | "pack";
/** A bundle (src/net/helper-ids.json `bundles`; its recipe is `buy-starter-kit`, `buy-bundle-<slug>`). */
export type BundleSlug = "starter" | "small" | "medium" | "large";
export interface Bundle {
  slug: BundleSlug;
  /** What it grants of each helper: its recipe's grants, the config's. */
  contents: Readonly<Record<HelperKind, number>>;
  /** Its Coins price, the config's (a listed bundle always has one). */
  coins: number | null;
  /** Sold once per player, ever: its recipe's max_uses is 1 (the Starter Kit). */
  once: boolean;
}
/**
 * A bundle's purchase (agreed with UI, 2026-11-01): "ok" (the platform confirmed it; the stock was
 * read again); "declined" (the player closed the sheet, a guest was shown the Arcade's sign-up
 * card, another Arcade sheet was open, or any other refusal: show nothing, never ask again by
 * itself); "short" (not enough
 * Coins: say so in the shop's own words, never a top-up); "full" (a grant would pass the cap:
 * nothing asked or charged); "gone" (the Starter Kit was bought before); "unknown" (no reliable
 * answer: the player may have paid; the stock was read again, so redraw from it, and never ask
 * again by itself); "failed" (no such bundle, nothing asked; or, where there is no sheet, the direct
 * purchase refused or unanswered: the stock was read again).
 */
export type BundleAnswer = "ok" | "declined" | "short" | "full" | "gone" | "unknown" | "failed";

const KINDS: readonly HelperKind[] = ["hint", "undo", "shuffle"];
// What a reward gives (the kit, a hard board's first win, a trip's last board, the daily's) is the
// config's alone (docs/vip.md; the creator, 2026-11-12): src/net/rewards.ts previews it (previewKit,
// previewWin), and a verdict says what landed. No figure of it is in the game's code.
/**
 * A helper by its game currency's id (a preview's or an upsell's `{ kind: "currency", currencyId }`),
 * or null for any other currency: so a screen can draw "+1 Hint" with its icon and name no ids.
 */
export function helperOfCurrency(currencyId: string): HelperKind | null {
  return KINDS.find((k) => IDS.kinds[k].currency === currencyId) ?? null;
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
const nulls = (): Record<HelperKind, number | null> => ({ hint: null, undo: null, shuffle: null });

/**
 * A SAMPLE stock for the dev server's unframed page (the play-test tool, with no platform behind it), to
 * try the board's helpers with: made up, not any figure of the config's. import.meta.env.DEV is false in
 * every build, so no build carries it (a built game, unframed, holds none).
 */
const SAMPLE_STOCK: Readonly<Record<HelperKind, number>> | null = import.meta.env.DEV ? { hint: 3, undo: 3, shuffle: 3 } : null;
/** The platform's last-read totals (uses not yet taken are still in them). */
const stock: Record<HelperKind, number> = !framed && SAMPLE_STOCK ? { ...SAMPLE_STOCK } : zero();
/** Uses made and not yet taken by the platform, oldest kind first. */
const owed: HelperKind[] = [];
/** Each owed use's caller, answered once it settles (or "held" at its first failure). */
const waiting: { kind: HelperKind; answer: (a: SpendAnswer) => void }[] = [];
// THE CONFIG'S FIGURES (readConfig): each null until read, and null when the config does not say.
/** Each helper's cap: its currency's max_balance. */
let caps = nulls();
/** What each buy grants of its helper: its recipe's one currency_grant. */
let sizes: Record<Buy, Record<HelperKind, number | null>> = { one: nulls(), pack: nulls() };
/** Each buy's Coins price. */
let prices: Record<Buy, Record<HelperKind, number | null>> = { one: nulls(), pack: nulls() };
/** The bundles' ids, in shop order (helper-ids.json holds ids only). */
type BundleIds = { name: BundleSlug; slug: string; id: string };
const BUNDLES = (IDS as unknown as { bundles: BundleIds[] }).bundles;
const bundleOf = (slug: BundleSlug): BundleIds | undefined => BUNDLES.find((b) => b.name === slug);
/** A bundle's figures, the config's: what its recipe grants of each helper, its Coins price, its max_uses (null: no limit). */
interface BundleFigures {
  contents: Record<HelperKind, number>;
  coins: number;
  maxUses: number | null;
}
/** The bundles whose figures the config gave in full (helpers only, and a Coins price). */
let bundleFigures = new Map<BundleSlug, BundleFigures>();
/**
 * The platform's id of Coins (`gemctl platform config`), to pick a Coins price: a channel whose config
 * prices a recipe otherwise (a bundle before config 64) shows no row, never another currency's number as
 * Coins.
 */
const COINS_ID = "00000000-0000-0000-0000-000000000006";
/** Each limited bundle's uses (the Starter Kit's), the platform's count (recipeUsage); absent until read. Read once a session, and again after a try at it. */
const uses = new Map<BundleSlug, number>();
let usageReading = false;
let usageTries = 0;
let usageRetry: (() => void) | null = null;
let bundleBuying = false;
/** The config is read (once a session); the waiting ask again while not, and how many failed in a row. */
let configRead = false;
let configRetry: (() => void) | null = null;
let configTries = 0;
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

/** A whole number above 0, or null. */
const positive = (x: unknown): number | null => (typeof x === "number" && Number.isInteger(x) && x > 0 ? x : null);
type Recipe = { grants?: readonly unknown[] | null; platform_prices?: readonly { platform_currency_id?: string; price?: number }[]; max_uses?: number | null };
/** A recipe's Coins price (its price in the platform's Coins, never another currency's), or null. */
const coinsPrice = (r: Recipe | undefined): number | null => positive(r?.platform_prices?.find((x) => x.platform_currency_id === COINS_ID)?.price);
/**
 * What a recipe grants of each helper (its currency_grants, by the helpers' currency ids), or null when
 * it grants anything else too or nothing at all: a row could not say what it gives.
 */
function helpersIn(r: Recipe | undefined): Record<HelperKind, number> | null {
  const out = zero();
  let any = false;
  for (const g of r?.grants ?? []) {
    const op = g as { type?: string; currency_id?: string; amount?: unknown };
    const k = op.type === "currency_grant" ? KINDS.find((x) => IDS.kinds[x].currency === op.currency_id) : undefined;
    const n = positive(op.amount);
    if (!k || n === null) return null;
    out[k] += n;
    any = true;
  }
  return any ? out : null;
}

/**
 * THE SHOP'S FIGURES, all the config's, once a session: each helper's cap, what each buy grants and
 * costs, and each bundle's contents, Coins price and limit. Each is set only from a read that landed:
 * a read that fails leaves the last one (none, before the first: nothing on sale). With no identity yet
 * (a play token refused or still on its way) nothing is asked, and it is asked again on a wait that grows
 * (src/net/pace.ts), quietly. (SDK 16.1.0's gameConfig.load() asked with no identity builds its path from
 * an empty game id and throws a TypeError, QA 2026-10-30 finding 4: never ask it so.)
 */
async function readConfig(): Promise<void> {
  if (configRead) return;
  try {
    await gem.awaitIdentity(10_000);
  } catch {
    return configLater();
  }
  try {
    const config = await gem.gameConfig.load();
    const recipes: Recipe[] = (config?.catalogs.find((c) => c.id === IDS.catalog)?.recipes ?? []) as Recipe[];
    const recipe = (id: string): Recipe | undefined => recipes.find((x) => (x as { id?: string }).id === id);
    const nextCaps = nulls();
    const nextSizes: typeof sizes = { one: nulls(), pack: nulls() };
    const nextPrices: typeof prices = { one: nulls(), pack: nulls() };
    for (const k of KINDS) {
      nextCaps[k] = positive(config?.currency(IDS.kinds[k].currency)?.max_balance);
      for (const [buy, id] of [["one", IDS.kinds[k].buy], ["pack", IDS.kinds[k].buy3]] as const) {
        const r = recipe(id);
        const g = helpersIn(r);
        // a buy says "N Hints": it grants its own helper and nothing else
        nextSizes[buy][k] = g && KINDS.every((x) => x === k || g[x] === 0) ? g[k] : null;
        nextPrices[buy][k] = coinsPrice(r);
      }
    }
    const nextBundles = new Map<BundleSlug, BundleFigures>();
    for (const b of BUNDLES) {
      const r = recipe(b.id);
      const contents = helpersIn(r);
      const price = coinsPrice(r);
      // not on sale on this channel's config, or it grants more than helpers: no row
      if (contents && price !== null) nextBundles.set(b.name, { contents, coins: price, maxUses: positive(r?.max_uses) });
    }
    caps = nextCaps;
    sizes = nextSizes;
    prices = nextPrices;
    bundleFigures = nextBundles;
    configRead = true;
    configTries = 0;
  } catch (err) {
    heard(err);
    console.warn(`[helpers] the shop's figures could not be read: ${refusalOf(err)}`);
    if (notNow(err)) configLater();
  }
}

/** Ask for the config again in a while (one waiting ask at a time), and say so when it lands. */
function configLater(): void {
  configRetry?.();
  configRetry = whenDue(backoff(++configTries, 5000), () => {
    configRetry = null;
    void readConfig().then(() => configRead && changed());
  });
}

/** Buy `b` of helper k, with every figure it needs known: what it grants, the cap, the Coins price. null: not offered. */
function offer(k: HelperKind, b: Buy): { size: number; cap: number; price: number } | null {
  const size = sizes[b][k];
  const cap = caps[k];
  const price = prices[b][k];
  return size === null || cap === null || price === null ? null : { size, cap, price };
}

/** `n` more of helper k would pass its cap. False while the cap is unknown: nothing is known to pass it. */
const passes = (k: HelperKind, n: number): boolean => {
  const c = caps[k];
  return c !== null && count(k) + n > c;
};

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
 * The limited bundles' uses (the Starter Kit's: its recipe's max_uses, the config's), the platform's
 * count (recipeUsage), one read at a time. Asked the first time a screen wants to know (bundleOpen),
 * and after a try at one; a read that fails is unknown (nothing kept), and is asked again on a wait that
 * grows (src/net/pace.ts).
 */
async function readUsage(): Promise<void> {
  const limited = BUNDLES.filter((b) => bundleFigures.get(b.name)?.maxUses != null);
  if (!framed || !limited.length || usageReading) return;
  if (held() > 0) return usageLater(held());
  usageReading = true;
  try {
    for (const b of limited) {
      const u = await gem.me.mutations.recipeUsage(b.id);
      uses.set(b.name, Math.max(0, u?.useCount ?? 0)); // null: never used
    }
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

/** The helpers of a bundle that would pass the cap with what is held now (empty: it fits, or its figures are unknown). */
function overCap(slug: BundleSlug): HelperKind[] {
  const f = bundleFigures.get(slug);
  return f ? KINDS.filter((k) => f.contents[k] > 0 && passes(k, f.contents[k])) : [];
}

/** The bundle's figures, when it can be offered: the config gave them, and the cap of every helper in it. */
function bundleOffer(slug: BundleSlug): BundleFigures | null {
  const f = bundleFigures.get(slug);
  return f && KINDS.every((k) => f.contents[k] === 0 || caps[k] !== null) ? f : null;
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

/** The catalog moved (nothing was charged): read the config again for the next try (the last figures stand until it lands). */
function configMoved(): void {
  configRead = false;
  gem.gameConfig.refresh();
  void readConfig().then(() => changed());
}

/** What one Coins purchase came to, by either route (pay). */
interface Paid {
  /**
   * ok (bought); closed (the sheet closed or was busy, or a guest was handed to the Arcade's sign-up:
   * nothing happened, say nothing); unknown (the sheet gave no reliable answer); refused (the
   * platform's no: `reason` is its code); lost (the direct purchase got no answer: it may have landed).
   */
  outcome: "ok" | "closed" | "unknown" | "refused" | "lost";
  reason: string;
  /** It went the direct way (no sheet here). */
  direct: boolean;
}

/**
 * ONE COINS PURCHASE of a helpers recipe (a single, a pack of 3 or a bundle), the one route for them
 * all. Call it first thing in the press, nothing awaited before it. On the Arcade's sheet wherever it
 * can draw one: the Arcade confirms the spend in its own words, and shows a guest its sign-up card,
 * then brings them back (since 2026-11-04 the platform refuses a website guest's direct Coins spend,
 * 403 guest_upgrade_required). Only where there is no sheet (a TV, an older Arcade) is it the direct
 * purchase. After any answer but a closed sheet, the stock and the Coins are read again (the SDK's
 * cache dropped first) before it answers. A moved catalog (nothing charged) reads the prices again
 * for the next try. Never retried by itself.
 */
async function pay(recipe: string, what: string): Promise<Paid> {
  const moved = (reason: string): void => {
    if (reason === "price_mismatch" || reason === "config_version_stale" || reason === "not_purchasable") configMoved();
  };
  if (gem.frame?.parentSupports("purchases")) {
    let res: { outcome: string; reason?: string };
    try {
      res = await gem.purchases.request({ kind: "recipe", catalogId: IDS.catalog, targetId: recipe, currencySlug: COINS, quantity: 1 });
    } catch (err) {
      // the call itself failed (no bridge): nobody knows, so read what landed
      console.warn(`[helpers] buying ${what}: ${refusalOf(err)}`);
      await refresh();
      return { outcome: "unknown", reason: "", direct: false };
    }
    const reason = res.reason ?? "";
    if (res.outcome === "declined" && (reason === "cancelled" || reason === "busy")) return { outcome: "closed", reason, direct: false };
    // anything else the platform answered may have moved the stock or the Coins
    await refresh();
    if (res.outcome === "ok") return { outcome: "ok", reason, direct: false };
    if (res.outcome === "unavailable") {
      console.warn(`[helpers] buying ${what}: no reliable answer (${reason || "none"}); the stock was read again`);
      return { outcome: "unknown", reason, direct: false };
    }
    console.warn(`[helpers] buying ${what} was declined: ${reason || "no reason"}`);
    moved(reason);
    return { outcome: "refused", reason, direct: false };
  }
  try {
    await gem.me.mutations.purchase({ kind: "recipe", catalogId: IDS.catalog, targetId: recipe, quantity: 1, payment: { kind: "platform_currency", currencySlug: COINS } });
    await refresh();
    return { outcome: "ok", reason: "", direct: true };
  } catch (err) {
    const code = (err as { code?: string }).code ?? "";
    console.warn(`[helpers] buying ${what} answered: ${refusalOf(err)}`);
    await refresh();
    // a guest (SDK 21.1.0): the SDK has handed the buy to the Arcade, which offers them an account
    if (code === "guest_upgrade_required") return { outcome: "closed", reason: code, direct: true };
    if (noAnswer(err)) return { outcome: "lost", reason: code, direct: true };
    moved(code);
    return { outcome: "refused", reason: code, direct: true };
  }
}

// ------------------------------------------------------------------ the door

export const helpers = {
  /** The last-read stock, less uses not yet taken; 0 until read. */
  count,
  /** The first read has landed this session. */
  known: (): boolean => known,
  /** At the cap (the config's): false while the cap is unknown. */
  full: (k: HelperKind): boolean => passes(k, 1),
  /**
   * The cap of helper k, the config's (its currency's max_balance); with no k, the one cap all three
   * share. null while unknown (or, with no k, if they differ).
   */
  cap(k?: HelperKind): number | null {
    if (k) return caps[k];
    const all = KINDS.map((x) => caps[x]);
    return all.every((c) => c !== null && c === all[0]) ? all[0]! : null;
  },
  /** What buy `b` of helper k grants, the config's (its recipe's grant); null while unknown. */
  size: (k: HelperKind, b: Buy = "one"): number | null => sizes[b][k],
  /** Buy `b` would not pass the cap. False only when that is known: true while the cap or the size is unknown (and then it has no price). */
  fits: (k: HelperKind, b: Buy = "one"): boolean => {
    const n = sizes[b][k];
    return n === null || !passes(k, n);
  },
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
  /**
   * The Coins price of buy `b` of helper k, the config's: null until read, or while what it grants or the
   * cap is unknown (an unknown figure offers nothing), or when the config sells no such buy.
   */
  price: (k: HelperKind, b: Buy = "one"): number | null => offer(k, b)?.price ?? null,
  /** The player's Coins cover the price; null while unknown. For greying a button only. */
  affordable: (k: HelperKind, b: Buy = "one"): boolean | null => {
    const p = offer(k, b)?.price ?? null;
    return coins === null || p === null ? null : coins >= p;
  },
  /**
   * Buy the single or the pack for Coins (call from the Buy press, nothing awaited first): pay(), the
   * Arcade's sheet where it can draw one, else the direct purchase. The stock is read again before it
   * answers. Not enough Coins is "short" by either route, never a top-up. One with a figure unknown
   * (it has no price either) is "failed", with nothing asked.
   */
  async buy(k: HelperKind, b: Buy = "one"): Promise<BuyAnswer> {
    if (!framed) return "failed";
    const o = offer(k, b);
    if (!o) return "failed";
    if (count(k) + o.size > o.cap) return "full";
    const r = await pay(b === "pack" ? IDS.kinds[k].buy3 : IDS.kinds[k].buy, b === "pack" ? `the pack of ${k}s` : `a ${k}`);
    if (r.outcome === "ok") return "ok";
    if (r.outcome === "closed") return "declined";
    if (r.outcome === "unknown") return "unknown";
    if (r.outcome === "lost") return "failed";
    if (r.reason === "insufficient_funds") return "short";
    // the cap was known to ask (offer): a "full" can always say it
    if (r.reason === "item_max_stack_exceeded" || !helpers.fits(k, b)) return "full";
    return r.direct ? "failed" : "declined";
  },
  /**
   * The bundles that can be offered, in the order to show (Starter Kit, Small, Medium, Large): each with
   * its contents, Coins price and limit from the config, and the cap of every helper in it known. None
   * until the config is read.
   */
  bundles: (): Bundle[] =>
    BUNDLES.flatMap((b) => {
      const f = bundleOffer(b.name);
      return f ? [{ slug: b.name, contents: { ...f.contents }, coins: f.coins, once: f.maxUses === 1 }] : [];
    }),
  /** The player's Coins cover this bundle; null while either is unknown. For greying a row only: it stays pressable. */
  bundleAffordable: (slug: BundleSlug): boolean | null => {
    const p = bundleOffer(slug)?.coins;
    return coins === null || p === undefined ? null : coins >= p;
  },
  /**
   * Can this bundle be bought (the platform's word): one with a limit (its recipe's max_uses: the Starter
   * Kit's) only while its uses are below it, null while not known yet (the first ask reads it, and
   * onChange says when it lands); one with none, true; one that cannot be offered, false.
   */
  bundleOpen(slug: BundleSlug): boolean | null {
    const f = bundleOffer(slug);
    if (!f) return false;
    if (f.maxUses === null) return true;
    if (!framed) return false;
    const n = uses.get(slug);
    if (n === undefined) void readUsage();
    return n === undefined ? null : n < f.maxUses;
  },
  /** The helpers this bundle would take past the cap, with what is held now (empty: it fits). */
  fitsBundle: (slug: BundleSlug): HelperKind[] => overCap(slug),
  /**
   * Buy a bundle for Coins, by the same route as a pack (pay(): the Arcade's sheet, which confirms the
   * spend in its own words and price and shows a guest its sign-up card, else the direct purchase).
   * Call it from the Buy press, nothing awaited first. A bundle that would pass the cap, a Starter
   * Kit had already, or a second buy while one is open is answered at once, with nothing asked. The
   * stock (and for the kit its uses) is read again before any answer the platform gave. Never retried
   * by itself.
   */
  buyBundle(slug: BundleSlug): Promise<BundleAnswer> {
    const b = bundleOf(slug);
    const f = bundleOffer(slug);
    // no such bundle, or one that cannot be offered (a figure unknown; unframed, none can): nothing asked
    if (!b || !f || !framed) return Promise.resolve("failed");
    if (overCap(slug).length) return Promise.resolve("full");
    const used = uses.get(slug);
    if (f.maxUses !== null && used !== undefined && used >= f.maxUses) return Promise.resolve("gone");
    if (bundleBuying) return Promise.resolve("declined");
    bundleBuying = true;
    // pay() asks first thing, so the sheet opens in the press's own turn
    return pay(b.id, `the ${slug} bundle`)
      .then(async (r): Promise<BundleAnswer> => {
        if (r.outcome === "closed") return "declined";
        // anything the platform answered may have moved the kit's uses too (pay() read the stock)
        if (f.maxUses !== null) await readUsage();
        if (r.outcome === "ok") return "ok";
        // no reliable answer, or a direct purchase that got none: the player may have paid
        if (r.outcome === "unknown" || r.outcome === "lost") return "unknown";
        if (r.reason === "insufficient_funds") return "short";
        if (r.reason === "recipe_max_uses_exceeded" || r.reason === "already_owned") return "gone";
        if (overCap(slug).length) return "full";
        // any other refusal: on the sheet, nothing said (a guest shown the Arcade's sign-up card among
        // them); the direct purchase refused
        return r.direct ? "failed" : "declined";
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
  await Promise.all([readStock(false), readConfig(), readCoins()]);
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
