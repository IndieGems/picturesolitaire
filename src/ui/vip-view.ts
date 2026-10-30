// THE PLAYER'S VIP, as the screens see it (docs/vip.md): whether this player is a Gem Arcade VIP member,
// and word when that changes. The answer is the server's (Server's src/net/vip.ts): "not VIP" until it
// lands, and on release and test until the platform can say who holds VIP; on dev the dev menu's
// "Pretend I'm VIP" changes it (kept in the player's settings, so it holds across reloads and devices).
// Every screen that differs for a VIP draws the non-VIP way until then, and again when it changes.
//
// A NON-VIP MEETS LOCKED DOORS, never a hidden feature (the creator, 2026-10-30, after Untangled): the
// daily archive's entry and the event's tile wear a padlock and a gold "VIP" tag, and a tap opens a
// screen of what is inside (vip-door.ts), with "VIP is coming soon" where How to get VIP will be.
// No button sells VIP yet: the platform cannot both sell it to a game and tell the game who holds it
// (gem-development#2119), and a buyer must never stay locked out. When both land, canGetVip() says so
// and getVip() opens the Arcade's VIP card (gem.store.showOffer), first thing in the press.

import { isVip, onVipChange } from "../net/vip";

/** This player is a VIP, by the server's last word (false until it lands). */
export const vipNow = (): boolean => isVip();

/** Hear when vipNow() may have changed. Returns the unsubscribe. */
export function onVip(fn: () => void): () => void {
  return onVipChange(() => fn());
}

/** Can this player get VIP from here? Not yet (gem-development#2119): the door says it is coming soon. */
export const canGetVip = (): boolean => false;

/** How to get VIP's press: the Arcade's VIP card opens here, once canGetVip() can be true. */
export function getVip(): void {}
