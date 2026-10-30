// THE PLAYER'S VIP, as the screens see it (docs/vip.md): whether this player is a Gem Arcade VIP member,
// and word when that changes. The answer is the server's (Server's src/net/vip.ts): "not VIP" until it
// lands, and on release and test until the platform can say who holds VIP; on dev the dev menu's
// "Pretend I'm VIP" changes it (kept in the player's settings, so it holds across reloads and devices).
// Every screen that differs for a VIP draws the non-VIP way until then, and again when it changes.
//
// A NON-VIP MEETS LOCKED DOORS, never a hidden feature (the creator, 2026-10-30, after Untangled): the
// daily archive's entry and the event's tile wear a padlock and a gold "VIP" tag, and a tap opens a
// screen of what is inside (vip-door.ts), with "VIP is coming soon" where How to get VIP will be.
// Cosmetics says the same in a banner: VIP members wear every table and soundtrack (cosmetics.ts).
//
// HOW TO GET VIP, one switch for all three (the two doors and the Cosmetics banner): canGetVip() is false
// until the platform can both sell VIP to a game and tell the game who holds it (gem-development#2119),
// because a buyer must never stay locked out. When both land:
//   1. set VIP_SKU to the Arcade Store's VIP pass;
//   2. canGetVip() is then true while that SKU is in gem.store.offers() for this player (read once the
//      bridge is up and again on coming back to the page, never on a timer: arcade-and-store.md §8) and
//      they are not a VIP already;
//   3. getVip() opens the Arcade's sheet for it, first thing in the player's press (§4). The installed
//      SDK's call is gem.store.purchase(sku); docs/vip.md names gem.store.showOffer (SDK 17), which is
//      the one to use once the SDK is upgraded. The button says what it opens, never a price.
// Outside a release build, ?vipsale shows the button so its words can be seen; its press only logs.

import { gem } from "../gem";
import { isVip, onVipChange } from "../net/vip";

/** The Arcade Store's VIP pass: empty until the platform sells VIP to games (gem-development#2119). */
const VIP_SKU = "";

/** Outside a release build, ?vipsale: the button shows, so its words can be seen; a press only logs. */
let forcedSale = import.meta.env.MODE !== "release" && new URLSearchParams(location.search).has("vipsale");
/** VIP_SKU is in this player's offers, as last read. */
let offered = false;
const saleListeners = new Set<() => void>();

/** This player is a VIP, by the server's last word (false until it lands). */
export const vipNow = (): boolean => isVip();

/** Hear when vipNow() or canGetVip() may have changed. Returns the unsubscribe. */
export function onVip(fn: () => void): () => void {
  saleListeners.add(fn);
  const off = onVipChange(() => fn());
  return () => {
    saleListeners.delete(fn);
    off();
  };
}

/** Can this player get VIP from here? Not until the platform sells it to games (above). */
export const canGetVip = (): boolean => forcedSale || (!!VIP_SKU && offered && !vipNow());

/** How to get VIP's press: the Arcade's sheet for the VIP pass. Call it from the press itself. */
export function getVip(): void {
  if (!VIP_SKU) {
    if (forcedSale) console.info("[vip] Get VIP pressed: no VIP pass to open yet (gem-development#2119)");
    return;
  }
  void gem.store.purchase(VIP_SKU).then((r) => {
    // ok: VIP arrives through the server's word (onVip); declined: back to the screen quietly, never asked
    // again unprompted; unavailable/error: the outcome is unknown, so nothing says "not bought"
    if (r.outcome !== "ok") console.info(`[vip] the VIP sheet: ${r.outcome}${r.reason ? ` (${r.reason})` : ""}`);
    void readOffer();
  });
}

function setSale(next: boolean): void {
  if (next === offered) return;
  offered = next;
  for (const fn of saleListeners) fn();
}

/** Is the VIP pass on offer to this player, here? Nothing is asked while there is no pass to look for. */
async function readOffer(): Promise<void> {
  if (!VIP_SKU || !gem.store.available) return setSale(false);
  const r = await gem.store.offers();
  setSale(r.outcome === "ok" && r.offers.some((o) => o.skuId === VIP_SKU));
}

if (VIP_SKU) {
  // once the bridge is up (store.available is false until then), and again on coming back to the page
  void gem.awaitBridge(10_000).then(readOffer, () => undefined);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void readOffer();
  });
}

/** Outside a release build: show the Get VIP button (true), or follow the platform again (false). */
export function forceVipSale(on: boolean): void {
  if (import.meta.env.MODE === "release") return;
  forcedSale = on;
  for (const fn of saleListeners) fn();
}
