// WHAT A REWARD WOULD GIVE, BEFORE IT IS WON: the platform's own preview (SDK 24,
// gem.gameConfig.preview), over the config targets the win checker pays from. Never an amount or a
// multiplier of ours (the creator, 2026-11-12: "never copy amounts from the config into code"): the
// preview figures this player's payout (a VIP's Coins include the Arcade's +50%, in its breakdown;
// a VIP's helpers the config's bonus, `eligible`) and what a pass on sale would add (`upsells`), and
// the platform retunes both without a release of the game (the game standard, "VIP: gate on the pass
// in config, never multiply in code"). What actually landed is the verdict's (src/net/claims.ts:
// `earned` from the receipt, `helpers` and `bonuses` from the recipes' receipts).
//
//   previewWin(t)          what a held win would give (claims.ts holdWin): { coins, helpers, upsell },
//                          or null unframed, on a PreviewError, or when nothing would be given
//   previewKit()           the kit for this player (board 1's end): its helpers, a VIP's bonus included
//   helperRecipes(w)       the helper recipes a win will run (claims.ts targetsOf): the kit, a hard
//                          board's or a trip's last board's, the daily's by weekday
//   previewRecipe(id)      one recipe's preview, or null (src/net/vip.ts: VIP's gifts)
//   helpersOf(p, all)      a recipe preview's helpers: its base, and its bonuses (all, or the eligible)
//   eventItemCoins()       an event item found, the unboosted figure (the preview's `base`); null until read
//   rewardsKnown(), onRewardsChange(fn)   the figures have been read; hear them land (returns the unsubscribe)
//   loadRewards()          read them (once a session; again on a wait that grows if it fails). Any
//                          getter above starts it too.
//
// THE TARGETS (the checker's, functions/checker): a board's first win moves its progression
// "board_<id>" to complete (on_complete: Level 1 has two grants); an event item found adds 1 to the
// finds progression (on_add); today's daily completes the daily (on_complete); a past day adds 1 to
// the archive (on_add). Then the checker runs the win's helper rewards, recipes of the config's
// rewards catalog (src/net/helper-ids.json `rewards`), each a base and a VIP bonus of its own.
// Unframed (a plain tab, the play-test tool) there is no config: every figure is null.

import type { ConfigPreview, PassUpsell, PlatformGrantPreview, PreviewTarget } from "@indiegems/gem-web-sdk/sdk";
import { campaign } from "virtual:ps-content";
import TRIPS from "../content/levels/trips.json";
import { gem } from "../gem";
import IDS from "./helper-ids.json";
import { helperOfCurrency, type HelperKind } from "./helpers";
import { refusalOf } from "./no-answer";
import { backoff, heard, notNow, whenDue } from "./pace";
import SUITCASE from "./suitcase-ids.json";

/** The daily's progression and the archive's (functions/checker/src/lib.rs DAILY_ID, ARCHIVE_ID). */
export const DAILY_ID = "6d1f3b0e-8a52-4c7e-9f14-2b6e0d9a7c31";
export const ARCHIVE_ID = "795d5832-be77-44b1-a949-6ae8ec1c629d";

const framed = ((): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true;
  }
})();

/** Each board progression's id, by slug ("board_<id>"), from the channel's config. */
let boards: Map<string, string> | null = null;
let item: number | null = null;
let loading: Promise<void> | null = null;
let tries = 0;
let retry: (() => void) | null = null;
const listeners = new Set<() => void>();

/** The preview of one target, or null: unframed, or the platform could not preview it (PreviewError). */
async function previewOf(target: PreviewTarget): Promise<ConfigPreview | null> {
  try {
    return await gem.gameConfig.preview(target);
  } catch (err) {
    console.warn(`[rewards] no preview of ${JSON.stringify(target)}: ${refusalOf(err)}`);
    return null;
  }
}

async function read(): Promise<void> {
  try {
    await gem.awaitIdentity(10_000);
  } catch {
    return later();
  }
  try {
    const config = await gem.gameConfig.load();
    const next = new Map<string, string>();
    for (const p of config?.progressions ?? []) if (p.slug?.startsWith("board_") && p.id) next.set(p.slug, p.id);
    boards = next;
    tries = 0;
    // an item found, as the platform figures it: its unboosted payout
    const found = await previewOf({ progression: SUITCASE.finds.id, add: 1 });
    const base = found?.platformGrants[0]?.base;
    item = typeof base === "number" && base > 0 ? Math.floor(base) : null;
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

/** An event item found, unboosted (the preview's base); null until read. */
export const eventItemCoins = (): number | null => (ask(), item);
/** The config's figures have been read this session. */
export const rewardsKnown = (): boolean => boards !== null;

/** Hear the figures land. Returns the unsubscribe. */
export function onRewardsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

// ------------------------------------------------------------------ the helper rewards

const KINDS: readonly HelperKind[] = ["hint", "undo", "shuffle"];
const zero = (): Record<HelperKind, number> => ({ hint: 0, undo: 0, shuffle: 0 });

/** The campaign boards whose first win gives a reward, as the checker's build reckons them (functions/checker/build.rs): a trip's last board "stamp", else a hard or super board "hard". */
const GIFTS: ReadonlyMap<string, "hard" | "stamp"> = (() => {
  const last = new Set((TRIPS.trips as { to: number }[]).map((t) => t.to));
  const m = new Map<string, "hard" | "stamp">();
  campaign.boards.forEach((b, i) => {
    if (last.has(i + 1)) m.set(b.id, "stamp");
    else if (b.mark === "hard" || b.mark === "super") m.set(b.id, "hard");
  });
  return m;
})();

/** The day of a date's week, Monday 0 .. Sunday 6 (the config's weekday recipes are Monday first). */
export function weekdayIndex(date: string): number | null {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  const sunday0 = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return Number.isFinite(sunday0) ? (sunday0 + 6) % 7 : null;
}

/** What a win will run of the helper rewards: each recipe's id (helper-ids.json `rewards`). */
export function helperRecipes(w: { lane: string; board: string; first: boolean; kit?: boolean; date?: string }): string[] {
  const out: string[] = [];
  if (w.first && w.lane === "campaign") {
    const g = GIFTS.get(w.board);
    if (g) out.push(IDS.rewards[g].id);
  }
  if (w.first && w.lane === "daily" && w.date) {
    const i = weekdayIndex(w.date);
    const r = i === null ? undefined : IDS.rewards.daily[i];
    if (r) out.push(r.id);
  }
  if (w.kit) out.push(IDS.rewards.kit.id);
  return out;
}

/** One recipe's preview (by id), or null: unframed, or it could not be previewed. */
export async function previewRecipe(id: string): Promise<ConfigPreview | null> {
  if (!framed) return null;
  return previewOf({ recipe: id });
}

/** A recipe preview's helpers: its base grants, and its bonuses' (every one with `all`, else those `eligible` for this player). */
export function helpersOf(p: ConfigPreview, all = false): Record<HelperKind, number> {
  const out = zero();
  const add = (grants: readonly { kind: string; currencyId?: string; amount?: number }[]): void => {
    for (const g of grants) {
      if (g.kind !== "currency" || !g.currencyId) continue;
      const k = helperOfCurrency(g.currencyId);
      if (k) out[k] += Math.max(0, Math.floor(Number(g.amount) || 0));
    }
  };
  add(p.grants);
  for (const b of p.bonuses) if (all || b.eligible === true) add(b.grants);
  return out;
}

/** The kit for this player (board 1's end): its helpers, a VIP's bonus included; null when it cannot be previewed. */
export async function previewKit(): Promise<Record<HelperKind, number> | null> {
  const p = await previewRecipe(IDS.rewards.kit.id);
  return p ? helpersOf(p) : null;
}

// ------------------------------------------------------------------ a held win

/** What a held win would give (claims.ts holdWin): its Coins grants, the helpers it gives, and the one upsell. */
export interface WinPreview {
  /** Each Coins grant the claim would pay this player: `base` unboosted, `total` theirs, `breakdown` a pass's part. */
  coins: PlatformGrantPreview[];
  /** The helpers it would give THIS player (each reward's base and the bonuses that apply to them), all three kinds; null when a reward could not be previewed. The verdict says what landed. */
  helpers: Record<HelperKind, number> | null;
  /** What a pass on sale would add (the first upsell, merged across the claim's targets and rewards), or null: offer none. */
  upsell: PassUpsell | null;
}

/** What a win would move, as claims.ts works it out from progress() before it holds the win. */
export interface WinTargets {
  /** The board's own progression completes: its first win ("board_<id>" by slug). */
  board?: string;
  /** An event level's item not held yet: one more found. */
  item?: boolean;
  /** Today's daily, its first win of the day. */
  today?: boolean;
  /** A past day from the archive, never won. */
  pastDay?: boolean;
  /** The helper rewards it will run (helperRecipes): their recipes' ids. */
  recipes?: string[];
}

/** Merge the first upsell of each target's preview into one: the same pass, its grants and bonuses together. */
function merged(previews: ConfigPreview[]): PassUpsell | null {
  const ups = previews.map((p) => p.upsells[0]).filter((u): u is PassUpsell => !!u);
  const first = ups[0];
  if (!first) return null;
  const same = ups.filter((u) => u.pass === first.pass);
  return { ...first, platformGrants: same.flatMap((u) => u.platformGrants), bonuses: same.flatMap((u) => u.bonuses) };
}

/** The preview of a held win; null unframed, when nothing would be given, or when a Coins target cannot be previewed. */
export async function previewWin(t: WinTargets): Promise<WinPreview | null> {
  if (!framed) return null;
  await loadRewards();
  const targets: PreviewTarget[] = [];
  if (t.board) {
    const id = boards?.get(`board_${t.board}`);
    if (!id) return null; // this channel's config does not pay the board (or could not be read)
    targets.push({ progression: id });
  }
  if (t.item) targets.push({ progression: SUITCASE.finds.id, add: 1 });
  if (t.today) targets.push({ progression: DAILY_ID });
  if (t.pastDay) targets.push({ progression: ARCHIVE_ID, add: 1 });
  const recipes = t.recipes ?? [];
  if (!targets.length && !recipes.length) return null;
  const [paying, rewards] = await Promise.all([Promise.all(targets.map(previewOf)), Promise.all(recipes.map((id) => previewOf({ recipe: id })))]);
  if (paying.some((p) => p === null)) return null;
  const all = paying as ConfigPreview[];
  const coins = all.flatMap((p) => p.platformGrants);
  let helpers: Record<HelperKind, number> | null = recipes.length ? zero() : null;
  for (const p of rewards) {
    if (!p || !helpers) {
      helpers = null;
      continue;
    }
    const h = helpersOf(p);
    for (const k of KINDS) helpers[k] += h[k];
  }
  if (!coins.length && !(helpers && KINDS.some((k) => helpers![k] > 0))) return null;
  const known = rewards.filter((p): p is ConfigPreview => !!p);
  return { coins, helpers: helpers ?? (recipes.length ? null : zero()), upsell: merged([...all, ...known]) };
}
