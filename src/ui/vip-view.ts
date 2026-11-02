// THE PLAYER'S VIP, as the screens see it (docs/vip.md): whether this player is a Gem Arcade VIP member,
// and word when that changes. The answer is the server's (Server's src/net/vip.ts): "not VIP" until it
// lands; on dev the dev menu's "Pretend I'm VIP" changes it (kept in the player's settings, so it holds
// across reloads and devices). Every screen that differs for a VIP draws the non-VIP way until then, and
// follows each change while it is up (onVip): a door opens the moment VIP arrives, and locks when it ends.
//
// A NON-VIP MEETS LOCKED DOORS, never a hidden feature (the creator, 2026-10-30, after Untangled): the
// daily archive's entry and the event's tile wear a padlock and a gold "VIP" tag, and a tap opens a
// screen of what is inside (vip-door.ts). Cosmetics says the same in a banner (cosmetics.ts), only while
// VIP lends the Cosmetics (VIP_WEARS_ALL, below: off since 2026-11-02).
//
// GET VIP, ONE BUTTON for the door's screen and the Cosmetics banner (vipButton; the Arcade sells VIP
// from 2026-11-01, gem-web#4375; the SDK's docs/arcade-and-store.md §4 and §8-§11):
//   - it shows only where the Arcade can draw its own VIP sheet (gem.store.showOfferAvailable) and the
//     VIP pass is in this player's offers (gem.store.offers()), read once the bridge is up and again on
//     each resume (shown again, the Arcade's pause lifted), after the sheet answers and after a sign-in;
//     never on a timer. A read with no reliable answer keeps what was drawn;
//   - a guest (offers: sign_in_required) gets "Sign in to get VIP" instead (gem.account.requestSignIn),
//     the closing saves started first, as the Arcade may take the page away to sign in;
//   - each press calls the Arcade in its own turn, nothing awaited before it, or the Arcade refuses it;
//   - it says what it opens, never a price, and the game never writes the pass's perks: the Arcade's
//     sheet says what VIP is, in the player's language, sale and all;
//   - declined (closed, or busy: the Arcade's back-off) shows nothing and never asks again by itself;
//   - ok, or unavailable/error (the outcome is unknown: they may have paid), asks the server again
//     (recheckVip). NOTHING HERE OPENS A DOOR: only the server's word does (isVip, onVipChange).
// A VIP never sees it: the doors are for players who are not, and the Cosmetics banner (while it shows)
// says "yours".
// Outside a release build, ?vipsale shows Get VIP (?vipsale=signin, the guest's) so its words can be
// seen where no Arcade answers; its press only logs.

import { gem, onArcadePause } from "../gem";
import { isVip, onVipChange, recheckVip } from "../net/vip";
import { held } from "../net/pace";
import { closingSave } from "./guide-save";
import { flushChoices } from "./choices";
import { t } from "./i18n";

/** The Arcade Store's VIP pass, 30 days (gem-web#4375, 2026-11-01). */
const VIP_SKU = "vip_pass_30d";

type Sale = "no" | "offer" | "sign_in";
const RELEASE = import.meta.env.MODE === "release";

/** Outside a release build, ?vipsale (or =signin): the button shows, so its words can be seen; a press only logs. */
let forced: Sale | null = (() => {
  if (RELEASE) return null;
  const v = new URLSearchParams(location.search).get("vipsale");
  return v === null ? null : v === "signin" ? "sign_in" : "offer";
})();
/** VIP here, as last read: on offer, on offer once this guest signs in, or not. */
let sale: Sale = "no";
let reading: Promise<void> | null = null;
const saleListeners = new Set<() => void>();

/** This player is a VIP, by the server's last word (false until it lands). */
export const vipNow = (): boolean => isVip();

/**
 * THE ONE SWITCH for VIP lending the Cosmetics (docs/vip.md perk 5): with it on, a VIP wears any
 * table and plays any soundtrack the shop sells without owning it (tables.ts, tracks.ts), Cosmetics
 * marks what is owned and what is lent ("Owned", "With VIP"), offers "Keep it" on a lent one and shows
 * its VIP banner, and the VIP door lists it among the perks (vip-door.ts). The creator turned it OFF on
 * 2026-11-02 ("remove the fact that VIP member can use all cosmetics at anytime ... keep it in case we
 * go back to it"): a VIP is then treated exactly as anyone in Cosmetics, and a borrowed choice falls
 * back to the latest one they own (else the default) at the next boot or VIP read. True brings back
 * docs/vip.md perk 5 as it was; its words (cosmetics.vipBanner, cosmetics.vipYours, cosmetics.withVip,
 * vip.perk.cosmetics) stay in every locale, unused while it is off.
 */
export const VIP_WEARS_ALL: boolean = false;

/** Does VIP lend this player the shop's tables and tracks now? Only with the switch on, and only for a VIP. */
export const vipLends = (): boolean => VIP_WEARS_ALL && vipNow();

/** Hear when vipNow() or the Get VIP button may have changed. Returns the unsubscribe. */
export function onVip(fn: () => void): () => void {
  saleListeners.add(fn);
  const off = onVipChange(() => fn());
  return () => {
    saleListeners.delete(fn);
    off();
  };
}

const saleNow = (): Sale => (vipNow() ? "no" : (forced ?? sale));

/**
 * The one Get VIP button (the door's screen, the Cosmetics banner), or null where VIP cannot be had
 * from here. `cls` places it. Draw it again on onVip.
 */
export function vipButton(cls: string): HTMLButtonElement | null {
  const now = saleNow();
  if (now === "no") return null;
  const b = document.createElement("button");
  b.type = "button";
  b.className = `btn amber ${cls}`;
  b.dataset.press = now === "offer" ? "vip.get" : "vip.signIn";
  b.textContent = t(now === "offer" ? "vip.get" : "vip.signIn");
  b.addEventListener("click", () => (now === "offer" ? getVip() : signIn()));
  return b;
}

/** Get VIP's press: the Arcade's own VIP sheet, in this turn. */
function getVip(): void {
  if (forced) return void console.info("[vip] Get VIP pressed (?vipsale: nothing opened)");
  void gem.store.showOffer(VIP_SKU).then(({ outcome, reason }) => {
    if (outcome !== "ok") console.info(`[vip] the VIP sheet: ${outcome}${reason ? ` (${reason})` : ""}`);
    // paid (or pending), or nobody knows: the server is asked; it alone opens a door
    if (outcome === "ok" || reason === "error") recheckVip();
    // closed, or the Arcade's back-off: nothing, and never asked again by itself; anything else
    // (not on sale here any more, a sign-in wanted, the store off): what the button should be now
    if (outcome !== "declined") void readOffer();
  });
}

/** A guest's press: the closing saves go out first, then the Arcade's sign-in, in this turn. */
function signIn(): void {
  if (forced) return void console.info("[vip] Sign in to get VIP pressed (?vipsale: nothing opened)");
  const before = gem.identity?.playerId;
  closingSave();
  flushChoices();
  void gem.account.requestSignIn().then(({ outcome }) => {
    if (outcome !== "signed_in") return; // declined or unavailable: carry on, and say nothing
    // another account, with saves of its own: start again under it, as the Arcade does when it takes
    // the page away to sign in (the SDK's player-sign-in.md §2; Untangled's store.ts signIn)
    if (gem.identity?.playerId !== before) return location.reload();
    recheckVip();
    void readOffer();
  });
}

function setSale(next: Sale): void {
  if (next === sale) return;
  sale = next;
  for (const fn of [...saleListeners]) fn();
}

/** Is the VIP pass on offer to this player, here? One read at a time; never while the platform asked everyone to wait. */
function readOffer(): Promise<void> {
  reading ??= (async () => {
    try {
      if (!gem.store.showOfferAvailable) return setSale("no");
      if (held() > 0) return; // what was drawn stands; the next resume asks
      const r = await gem.store.offers();
      if (r.outcome === "ok") setSale(r.offers.some((o) => o.skuId === VIP_SKU) ? "offer" : "no");
      else if (r.reason === "sign_in_required") setSale("sign_in");
      else if (r.reason !== "error") setSale("no"); // store_off, unsupported: not here
      // error: no reliable answer, so what was drawn stands until the next resume
    } finally {
      reading = null;
    }
  })();
  return reading;
}

// once the bridge is up (showOfferAvailable is false until then), and again on each resume
void gem.awaitBridge(10_000).then(() => readOffer(), () => undefined);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void readOffer();
});
onArcadePause((paused) => {
  if (!paused) void readOffer();
});
// a purchase can settle after its answer, or while the game was not running
gem.store.onSettled(() => recheckVip());

/** Outside a release build: show Get VIP (true), the guest's Sign in ("signin"), or follow the Arcade again (false). */
export function forceVipSale(on: boolean | "signin"): void {
  if (RELEASE) return;
  forced = on === "signin" ? "sign_in" : on ? "offer" : null;
  for (const fn of [...saleListeners]) fn();
}
