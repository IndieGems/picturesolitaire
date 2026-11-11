// WHAT A REWARD WOULD PAY, BEFORE IT IS WON: the platform's own preview (SDK 24,
// gem.gameConfig.preview), over the config targets the win checker pays from. Never an amount or a
// multiplier of ours: the preview figures this player's payout (a VIP's includes the Arcade's +50%,
// in its breakdown) and what a pass on sale would add (`upsells`), and the platform retunes both
// without a release of the game (the game standard, "VIP: gate on the pass in config, never multiply
// in code"). What actually landed is the verdict's (src/net/claims.ts `earned`, from the receipt).
//
//   previewWin(t)          what a held win would pay (claims.ts holdWin): { coins, helpers, upsell },
//                          or null unframed, on a PreviewError, or when nothing would pay
//   eventItemCoins()       an event item found, the unboosted figure (the preview's `base`); null until read
//   rewardsKnown(), onRewardsChange(fn)   the figures have been read; hear them land (returns the unsubscribe)
//   loadRewards()          read them (once a session; again on a wait that grows if it fails). Any
//                          getter above starts it too.
//
// THE TARGETS (the checker's, functions/checker): a board's first win moves its progression
// "board_<id>" to complete (on_complete: Level 1 has two grants); an event item found adds 1 to the
// finds progression (on_add); today's daily completes the daily (on_complete); a past day adds 1 to
// the archive (on_add). The helpers a win gives come from the checker's own figures until the config
// carries them as recipes with VIP bonuses (docs/vip.md, "Planned"): `helpers` is null meanwhile.
// Unframed (a plain tab, the play-test tool) there is no config: every figure is null.

import type { ConfigPreview, PassUpsell, PlatformGrantPreview, PreviewTarget } from "@indiegems/gem-web-sdk/sdk";
import { gem } from "../gem";
import type { HelperKind } from "./helpers";
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

/** What a held win would pay (claims.ts holdWin): its Coins grants, the helpers it gives, and the one upsell. */
export interface WinPreview {
  /** Each Coins grant the claim would pay this player: `base` unboosted, `total` theirs, `breakdown` a pass's part. */
  coins: PlatformGrantPreview[];
  /** The helpers it would give: null until the config carries them (docs/vip.md, "Planned"); the verdict says what landed. */
  helpers: Record<HelperKind, number> | null;
  /** What a pass on sale would add (the first upsell, merged across the claim's targets), or null: offer none. */
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
}

/** Merge the first upsell of each target's preview into one: the same pass, its grants and bonuses together. */
function merged(previews: ConfigPreview[]): PassUpsell | null {
  const ups = previews.map((p) => p.upsells[0]).filter((u): u is PassUpsell => !!u);
  const first = ups[0];
  if (!first) return null;
  const same = ups.filter((u) => u.pass === first.pass);
  return { ...first, platformGrants: same.flatMap((u) => u.platformGrants), bonuses: same.flatMap((u) => u.bonuses) };
}

/** The preview of a held win; null unframed, when nothing would pay, or when a target cannot be previewed. */
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
  if (!targets.length) return null;
  const previews = await Promise.all(targets.map(previewOf));
  if (previews.some((p) => p === null)) return null;
  const all = previews as ConfigPreview[];
  const coins = all.flatMap((p) => p.platformGrants);
  if (!coins.length) return null;
  return { coins, helpers: null, upsell: merged(all) };
}
