// THE HELPER STOCK: Hint, Undo and Shuffle, the player's own, carried from board to
// board (creator, 2026-10-27; AGENTS.md). The game's one door to it, for play and the
// screens. The stock is the platform's (three game currencies, at most 10 each,
// gem-backend-game-config.yaml): this module reads it, takes uses from it and buys
// for it, and never adds to it. Gifts are paid by the win checker (functions/checker,
// pay.rs), whose verdict says what landed; the count is read again after every answer.
//
//   count(k) > 0?  act  spend(k)   a use is taken AFTER the act, so Undo stays instant:
//                                  the count drops at once and the platform takes it behind,
//                                  one at a time. No answer: kept and sent again (from the
//                                  "spends" slot after a restart too), never dropped. "none":
//                                  the platform had none left (spent on another device); the
//                                  count is read again and the act stands.
//   buy(k, pack)                   one, or a pack of 3, for Coins: the platform's direct
//                                  purchase (no sheet: call it from the press). One that would
//                                  pass the cap is refused before anything is charged (fits).
//                                  Never retried by itself.
//   price(k), affordable(k)        the price is the config's alone. The player's Coins are
//                                  read only to grey a button: the Arcade's wallet is the one
//                                  place they are shown ("No counter", platform rules).
//
// Unframed (the play-test tool) there is no platform: 3 of each, for this page only.
// Dev-menu practice and the lessons never spend.

import { gem } from "../gem";
import { onOnline } from "../ui/online";
import IDS from "./helper-ids.json";
import { noAnswer, refusalOf } from "./no-answer";

export type HelperKind = "hint" | "undo" | "shuffle";
export type SpendAnswer = "spent" | "held" | "none";
export type BuyAnswer = "ok" | "short" | "full" | "failed";
export type Gift = "kit" | "hard" | "stamp" | "daily" | "suitcase";
/** One helper, or a pack of 3. */
export type Pack = 1 | 3;

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
let coins: number | null = null;
let known = !framed;
let sending = false;
let tries = 0;
let timer: number | undefined;
/** The "spends" slot holds owed uses (written only when one had to wait, and cleared after). */
let stored = false;
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

async function readPrices(): Promise<void> {
  try {
    const config = await gem.gameConfig.load();
    const recipes = config?.catalogs.find((c) => c.id === IDS.catalog)?.recipes ?? [];
    for (const k of KINDS) {
      for (const [pack, id] of [[1, IDS.kinds[k].buy], [3, IDS.kinds[k].buy3]] as const) {
        prices[pack][k] = recipes.find((x) => x.id === id)?.platform_prices?.[0]?.price ?? null;
      }
    }
  } catch (err) {
    console.warn(`[helpers] the prices could not be read: ${refusalOf(err)}`);
  }
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

/** Read the stock again (after a checker answer, a buy, a resume). */
async function refresh(fresh = true): Promise<void> {
  if (!framed) return;
  await Promise.all([readStock(fresh), readCoins()]);
  changed();
}

// ------------------------------------------------------------------ spending

const count = (k: HelperKind): number => Math.max(0, stock[k] - owed.filter((o) => o === k).length);

/** Keep the owed uses for a restart, or clear them (only once something had to wait). */
async function keep(): Promise<void> {
  if (!framed || (!owed.length && !stored)) return;
  const doc = { v: 1, owed: Object.fromEntries(KINDS.map((k) => [k, owed.filter((o) => o === k).length])), total: { ...stock } };
  try {
    await gem.me.saves.put(SLOT, doc, { timeoutMs: 10_000 });
    stored = owed.length > 0;
  } catch (err) {
    console.warn(`[helpers] the unsent uses could not be kept: ${refusalOf(err)}`);
  }
}

function answer(kind: HelperKind, a: SpendAnswer): void {
  const i = waiting.findIndex((w) => w.kind === kind);
  if (i >= 0) waiting.splice(i, 1)[0]!.answer(a);
}

/** Send the owed uses, one at a time, oldest first. */
async function pump(): Promise<void> {
  if (sending || !owed.length) return;
  sending = true;
  clearTimeout(timer);
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
        if (!noAnswer(err)) {
          // the platform's word: none left (or no such use). The act stands; the count is read again.
          console.warn(`[helpers] a ${kind} use was refused: ${refusalOf(err)}`);
          owed.shift();
          await readStock(true);
          answer(kind, "none");
          changed();
          continue;
        }
        // no answer: it may have landed. A total one lower says it did; otherwise send it again.
        if ((await readStock(true)) && stock[kind] <= before - 1) {
          owed.shift();
          answer(kind, "spent");
          continue;
        }
        answer(kind, "held");
        void keep();
        timer = window.setTimeout(() => void pump(), Math.min(30_000, 2000 * 2 ** tries++));
        return;
      }
    }
    void keep();
  } finally {
    sending = false;
    changed();
  }
}

/** After a restart: uses an earlier session could not send, less any that landed since. */
async function resume(): Promise<void> {
  let doc: { owed?: Partial<Record<HelperKind, number>>; total?: Partial<Record<HelperKind, number>> } | null = null;
  try {
    doc = await gem.me.saves.get(SLOT, { timeoutMs: 10_000 });
  } catch (err) {
    if (noAnswer(err) || (err as { reason?: string; code?: string }).reason !== "not_found") console.warn(`[helpers] the unsent uses could not be read: ${refusalOf(err)}`);
    return;
  }
  if (!doc?.owed) return;
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
  /** Buy one or a pack of 3 for Coins (call from the Buy press). The stock is read again before it answers. */
  async buy(k: HelperKind, pack: Pack = 1): Promise<BuyAnswer> {
    if (!framed) return "failed";
    if (!helpers.fits(k, pack)) return "full";
    try {
      const recipe = pack === 3 ? IDS.kinds[k].buy3 : IDS.kinds[k].buy;
      await gem.me.mutations.purchase({ kind: "recipe", catalogId: IDS.catalog, targetId: recipe, quantity: 1, payment: { kind: "platform_currency", currencySlug: COINS } });
      await refresh();
      return "ok";
    } catch (err) {
      const code = (err as { code?: string }).code;
      console.warn(`[helpers] buying a ${k} answered: ${refusalOf(err)}`);
      await refresh();
      if (code === "insufficient_funds") return "short";
      if (!noAnswer(err) && !helpers.fits(k, pack)) return "full";
      return "failed";
    }
  },
  /** Read the stock again. The game need not call it: every checker answer, the boot and a resume do. */
  refresh: (): Promise<void> => refresh(),
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
  await resume();
  onOnline((up) => {
    if (!up) return;
    tries = 0;
    if (!known) void refresh(false);
    void pump();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void keep();
    else void refresh();
  });
}
