// HELD WINS (src/net/claims.ts): which one is sent next, and which the "claims" slot keeps for a
// restart. Pure, so tools/server/held-wins-check.mts runs it in Node.
//
// Sent oldest first, and a campaign win, or a Souvenir (it opens with its trip's stamp, a campaign
// win), waits while an earlier campaign win is held (nextToSend).
//
// The slot holds every unanswered win up to KEEP_BYTES. Past that, the wins that strand least go
// first, so that nothing kept can be stranded by one that went:
//   1. dailies, oldest date first: each stands alone, and the checker takes only today's and
//      yesterday's (an older one is refused "wrong_day" whatever happens);
//   2. then the newest win of the others. The campaign is ORDERED: the checker answers "order"
//      (retry) to a win ahead of the next position until the earlier win arrives, so dropping an
//      early one would leave every later one retrying forever and never paying. Dropping newest
//      first keeps the campaign wins a prefix in play order: the player replays from the first
//      one dropped. Challenge wins stand alone (each board pays itself; the route opens a board
//      after a cleared one, and a cleared board stays open), so newest first costs them nothing.
// Until 2026-10-25 the slot kept the newest 20, which drops the OLDEST: Untangled lost a pack's
// levels 75-86 that way on 2026-10-18, and with them every later level's pay
// (yarn/docs/checker-outage-2026-10-18.md).

/** The held win to send now: the oldest that is due, but never a campaign win or a Souvenir behind an earlier held campaign win. */
export function nextToSend<T extends { lane: string; notBefore: number }>(queue: readonly T[], now: number): T | undefined {
  let campaignAhead = false;
  for (const h of queue) {
    const behind = (h.lane === "campaign" || h.lane === "souvenir") && campaignAhead;
    if (h.lane === "campaign") campaignAhead = true;
    if (!behind && h.notBefore <= now) return h;
  }
  return undefined;
}

/** The "claims" slot's ceiling: game config, save_schemas, claims.max_size_bytes. */
export const SLOT_BYTES = 131_072;
/** What the kept list may take of it, with room to spare. */
export const KEEP_BYTES = 120 * 1024;

/** A held win as the slot keeps it (src/net/claims.ts). */
export interface KeptClaim {
  id: string;
  body: Record<string, unknown>;
  effect: { lane: string; date?: string; n?: number };
}

const utf8 = new TextEncoder();
const bytes = (v: unknown): number => utf8.encode(JSON.stringify(v)).length;

/** The slot's document for these claims (what claims.ts puts). */
export const slotDoc = <T extends KeptClaim>(claims: T[]): { v: 1; claims: T[] } => ({ v: 1, claims });

/** The size of the slot's document for these claims, in bytes. */
export const slotBytes = (claims: KeptClaim[]): number => bytes(slotDoc(claims));

/**
 * The claims to keep, in the order given (oldest first), within `budget` bytes of the slot's
 * document. All of them when they fit.
 */
export function trimHeld<T extends KeptClaim>(claims: T[], budget = KEEP_BYTES): T[] {
  let size = slotBytes(claims);
  if (size <= budget) return claims;
  const age = new Map(claims.map((c, i) => [c, i]));
  const dailies = claims
    .filter((c) => c.effect.lane === "daily")
    .sort((a, b) => String(a.effect.date ?? "").localeCompare(String(b.effect.date ?? "")) || age.get(a)! - age.get(b)!);
  const others = claims.filter((c) => c.effect.lane !== "daily").reverse();
  const drop = new Set<T>();
  for (const c of [...dailies, ...others]) {
    if (size <= budget) break;
    drop.add(c);
    // the claim and the comma that joined it to the list
    size -= bytes(c) + 1;
  }
  const kept = claims.filter((c) => !drop.has(c));
  // the arithmetic is exact for JSON, but the slot's limit is not a thing to be wrong about
  while (kept.length && slotBytes(kept) > budget) kept.pop();
  return kept;
}
