// WHAT A REWARD PAYS, BEFORE IT IS WON: the base Coins of each first win, from the channel's own game
// config (the platform's figures, the one copy: tools/server/make-config.mts writes them, the win
// checker pays through them). For the previews UI shows, the VIP extra's above all (the creator,
// 2026-11-10: +50% Coins for a VIP, src/net/vip.ts vipExtraCoins). What actually landed is always
// the verdict's (src/net/claims.ts), never this: a board already won, or a day already won, pays
// nothing, VIP or not, so show a preview only for a reward not yet won.
//
//   baseCoins(lane, board)        the Coins a board's first win pays, all its grants (Level 1: 200,
//                                 its onboarding prize and First Steps' prize); null until read, or
//                                 for a board that pays none. `lane` "daily": the day's (any date)
//   grants(lane, board)           the same, grant by grant (Level 1: [100, 100]); null until read
//   vipExtraForBoard(lane, board) the VIP extra on it, each grant's own (Level 1: 50 + 50); null until read
//   dailyCoins(), pastDayCoins(), eventItemCoins()   the daily's first win of the day, a past day's
//                                 first win (the archive), an event item found; null until read
//   rewardsKnown(), onRewardsChange(fn)   the config has been read; hear it land (returns the unsubscribe)
//   loadRewards()                 read it (once a session; again on a wait that grows if it fails).
//                                 Any getter above starts it too.
//
// The helper rewards' sizes are src/net/helpers.ts's (KIT, HARD_GIFT, STAMP_GIFT, dailyHelper(date):
// one of that helper), and their VIP doubling src/net/vip.ts's vipHelpers. Unframed (a plain tab, the
// play-test tool) there is no config: every figure is null.

import { gem } from "../gem";
import { refusalOf } from "./no-answer";
import { backoff, heard, notNow, whenDue } from "./pace";
import SUITCASE from "./suitcase-ids.json";
import { vipExtraCoins } from "./vip";

/** The daily's progression and the archive's (functions/checker/src/lib.rs DAILY_ID, ARCHIVE_ID). */
const DAILY_ID = "6d1f3b0e-8a52-4c7e-9f14-2b6e0d9a7c31";
const ARCHIVE_ID = "795d5832-be77-44b1-a949-6ae8ec1c629d";
const COINS = "ARCADE_TICKETS";

const framed = ((): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true;
  }
})();

/** Each board progression's Coins grants (by slug "board_<id>"), the daily's, a past day's and an item's. */
let boards: Map<string, number[]> | null = null;
let daily: number | null = null;
let pastDay: number | null = null;
let item: number | null = null;
let loading: Promise<void> | null = null;
let tries = 0;
let retry: (() => void) | null = null;
const listeners = new Set<() => void>();

type Grant = { mode?: string; amount?: number | null; per_unit?: number | null; target?: { platform_currency_slug?: string | null } };
const coinsOf = (grants: readonly Grant[] | undefined, mode: "on_complete" | "on_add"): number[] =>
  (grants ?? [])
    .filter((g) => g.mode === mode && g.target?.platform_currency_slug === COINS)
    .map((g) => Math.max(0, Math.floor(Number(mode === "on_add" ? g.per_unit : g.amount) || 0)))
    .filter((n) => n > 0);

async function read(): Promise<void> {
  try {
    await gem.awaitIdentity(10_000);
  } catch {
    return later();
  }
  try {
    const config = await gem.gameConfig.load();
    const next = new Map<string, number[]>();
    for (const p of config?.progressions ?? []) {
      const grants = (p.config as { platform_grants?: Grant[] } | undefined)?.platform_grants;
      if (p.slug?.startsWith("board_")) next.set(p.slug, coinsOf(grants, "on_complete"));
      if (p.id === DAILY_ID) daily = coinsOf(grants, "on_complete").reduce((a, n) => a + n, 0) || null;
      if (p.id === ARCHIVE_ID) pastDay = coinsOf(grants, "on_add")[0] ?? null;
      if (p.id === SUITCASE.finds.id) item = coinsOf(grants, "on_add")[0] ?? null;
    }
    boards = next;
    tries = 0;
    for (const fn of [...listeners]) fn();
  } catch (err) {
    heard(err);
    console.warn(`[rewards] the config could not be read: ${refusalOf(err)}`);
    if (notNow(err)) later();
  }
}

function later(): void {
  retry?.();
  retry = whenDue(backoff(++tries, 5000), () => {
    retry = null;
    loading = null;
    void loadRewards();
  });
}

/** Read the config's figures, once a session (the getters start it). */
export function loadRewards(): Promise<void> {
  if (!framed) return Promise.resolve();
  loading ??= read();
  return loading;
}

const ask = (): void => {
  if (!boards) void loadRewards();
};

/** A board's first win, grant by grant ("daily": the day's); null until read, or for a board that pays none. */
export function grants(lane: string, board: string): number[] | null {
  ask();
  if (lane === "daily") return daily === null ? null : [daily];
  const g = boards?.get(`board_${board}`);
  return g && g.length ? [...g] : null;
}

/** A board's first win in all ("daily": the day's); null until read, or for a board that pays none. */
export function baseCoins(lane: string, board: string): number | null {
  const g = grants(lane, board);
  return g ? g.reduce((a, n) => a + n, 0) : null;
}

/** The VIP extra on a board's first win: each grant's own ceil(base / 2), added (Level 1: 50 + 50). */
export function vipExtraForBoard(lane: string, board: string): number | null {
  const g = grants(lane, board);
  return g ? g.reduce((a, n) => a + vipExtraCoins(n), 0) : null;
}

/** The daily's first win of the day. */
export const dailyCoins = (): number | null => (ask(), daily);
/** A past day's first win, from the archive. */
export const pastDayCoins = (): number | null => (ask(), pastDay);
/** An event item found. */
export const eventItemCoins = (): number | null => (ask(), item);
/** The config's figures have been read this session. */
export const rewardsKnown = (): boolean => boards !== null;

/** Hear the figures land. Returns the unsubscribe. */
export function onRewardsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
