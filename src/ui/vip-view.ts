// THE PLAYER'S VIP, as the screens see it (docs/vip.md): whether this player is a Gem Arcade VIP member,
// and word when that changes. The answer is the server's (Server's src/net/vip.ts): "not VIP" until it
// lands. Every screen that differs for a VIP draws the non-VIP way until then, and follows each change
// while it is up (onVip). FOR SHOW ONLY: what VIP adds to a reward is the Arcade's, applied as it pays and
// asked of gem.gameConfig.preview (win-upsell.ts), never worked out here (the standard's "VIP: gate on the
// pass in config, never multiply in code").
//
// VIP LOCKS NOTHING (the creator, 2026-11-10: "no VIP gates"): the events, the past events and the daily
// archive are everyone's. Cosmetics shows a VIP banner only while VIP lends the Cosmetics (VIP_WEARS_ALL,
// below: off since 2026-11-02).
//
// GET VIP, ONE BUTTON for home's VIP screen and the Cosmetics banner (vipButton; the SDK's
// docs/arcade-and-store.md §8, §10 and "A pass, by its slug: showPass"):
//   - it shows only where the Arcade can draw its own sheet (gem.store.showOfferAvailable) and its offers
//     hold the pass that raises Coins (offers(): kind "pass" with a Coins earn multiplier). The pass's slug
//     comes from that offer, never written here; read once the bridge is up and again on each resume (shown
//     again, the Arcade's pause lifted) and after the sheet answers, never on a timer. A read with no
//     reliable answer keeps what was drawn;
//   - a guest sees it too (SDK 24: the Arcade takes a guest through sign-up, then back to the sheet), the
//     closing saves started first (gem.player.isGuest), as the Arcade may take the page away to sign up.
//     An older Arcade that answers a guest sign_in_required: no button;
//   - each press calls the Arcade at once (openPass); it says what it opens, never a price, and the game
//     never writes the pass's perks: the Arcade's sheet says what VIP is, in the player's language;
//   - declined or cancelled (closed, or another Arcade sheet open) shows nothing and never asks again by
//     itself; ok, pending, or unavailable/error (the outcome is unknown: they may have paid), asks the server
//     again (recheckVip). NOTHING HERE MAKES A VIP: only the server's word does (isVip, onVipChange);
//   - focus goes back to the button that opened the sheet when it closes.
// A VIP never sees it: the VIP screen shows a member their perks instead, and the Cosmetics banner (while it
// shows) says "yours". Outside a release build, ?vipsale shows Get VIP so its words can be seen where no
// Arcade answers; its press only logs.

import type { ArcadeOffer, ShowPassOutcome } from "@indiegems/gem-web-sdk/sdk";
import { gem, onArcadePause } from "../gem";
import { isVip, onVipChange, recheckVip } from "../net/vip";
import { held } from "../net/pace";
import { closingSave } from "./guide-save";
import { flushChoices } from "./choices";
import { t } from "./i18n";

/** The Arcade's Coins (its currency slug): the pass whose offer raises them is VIP. */
const COINS = "ARCADE_TICKETS";
/** A multiplier in basis points: 10,000 is ×1. */
const BP = 10_000;

type Sale = "no" | "offer";
const RELEASE = import.meta.env.MODE === "release";

/** Outside a release build, ?vipsale: the button shows, so its words can be seen; a press only logs. */
let forced = !RELEASE && new URLSearchParams(location.search).has("vipsale");
/** VIP here, as last read: on offer, or not. */
let sale: Sale = "no";
/** The pass on offer that raises Coins, as the Arcade's offers last said: its slug, and how much more it pays (0.5: +50%). */
let pass: { slug: string; extra: number } | null = null;
let reading: Promise<void> | null = null;
const saleListeners = new Set<() => void>();

/** This player is a VIP, by the server's last word (false until it lands). */
export const vipNow = (): boolean => isVip();

/**
 * THE ONE SWITCH for VIP lending the Cosmetics (docs/vip.md perk 5): with it on, a VIP wears any
 * table and plays any soundtrack the shop sells without owning it (tables.ts, tracks.ts), Cosmetics
 * marks what is owned and what is lent ("Owned", "With VIP"), offers "Keep it" on a lent one and shows
 * its VIP banner, and the VIP screen lists it among the perks (vip-tag.ts vipPerks). The creator turned it OFF on
 * 2026-11-02 ("remove the fact that VIP member can use all cosmetics at anytime ... keep it in case we
 * go back to it"): a VIP is then treated exactly as anyone in Cosmetics, and a borrowed choice falls
 * back to the latest one they own (else the default) at the next boot or VIP read. True brings back
 * docs/vip.md perk 5 as it was; its words (cosmetics.vipBanner, cosmetics.vipYours, cosmetics.withVip,
 * vip.perk.cosmetics) stay in every locale, unused while it is off.
 */
export const VIP_WEARS_ALL: boolean = false;

/** Does VIP lend this player the shop's tables and tracks now? Only with the switch on, and only for a VIP. */
export const vipLends = (): boolean => VIP_WEARS_ALL && vipNow();

/** The VIP pass's slug, from the Arcade's offers (null until they say, or where it is not sold): for show, never a reward. */
export const vipPassSlug = (): string | null => pass?.slug ?? null;

/** How much more VIP pays in Coins, from its offer's earn multiplier (0.5 for +50%); null until the offers say. */
export const vipCoinsExtra = (): number | null => pass?.extra ?? null;

/** Hear when vipNow(), the Get VIP button or the pass's offer may have changed. Returns the unsubscribe. */
export function onVip(fn: () => void): () => void {
  saleListeners.add(fn);
  const off = onVipChange(() => fn());
  return () => {
    saleListeners.delete(fn);
    off();
  };
}

const saleNow = (): Sale => (vipNow() ? "no" : forced ? "offer" : sale);

/**
 * The one Get VIP button (home's VIP screen, the Cosmetics banner), or null where VIP cannot be had
 * from here. `cls` places it. Draw it again on onVip.
 */
export function vipButton(cls: string): HTMLButtonElement | null {
  if (saleNow() === "no") return null;
  const b = document.createElement("button");
  b.type = "button";
  b.className = `btn amber ${cls}`;
  b.dataset.press = "vip.get";
  b.textContent = t("vip.get");
  b.addEventListener("click", () => {
    if (forced) return void console.info("[vip] Get VIP pressed (?vipsale: nothing opened)");
    if (pass) void openPass(pass.slug, b);
  });
  return b;
}

/**
 * The Arcade's own sheet for pass `slug` (gem.store.showPass), in this turn: the closing saves first for a
 * guest, whom the Arcade signs up before the sheet; then the server is asked again where they may have
 * paid, and focus goes back to `from`. Its answer, or null where the call itself failed. The one way any
 * screen opens a pass (the VIP screen's Get VIP; a win card's upsell, with the upsell's own `pass`).
 */
export async function openPass(slug: string, from?: HTMLElement | null): Promise<ShowPassOutcome | null> {
  const before = gem.identity?.playerId;
  if (gem.player?.isGuest) {
    closingSave();
    flushChoices();
  }
  let r: ShowPassOutcome | null = null;
  try {
    r = await gem.store.showPass(slug);
  } catch (err) {
    console.warn("[vip] the pass's sheet failed:", err);
  }
  // signed up or in as another account, with saves of its own: start again under it, as the Arcade does when
  // it takes the page away (the SDK's player-sign-in.md §2)
  const now = gem.identity?.playerId;
  if (before && now && now !== before) {
    location.reload();
    return r;
  }
  if (r) {
    if (r.outcome !== "ok") console.info(`[vip] the pass's sheet: ${r.outcome}${r.reason ? ` (${r.reason})` : ""}`);
    // paid (held, or pending), or nobody knows: the server is asked; it alone says who is VIP
    if (r.outcome === "ok" || r.reason === "pending" || r.reason === "error") recheckVip();
    // not on sale here any more, or the store gone: what the button should be now
    if (r.outcome === "unavailable") void readOffer();
  }
  if (from?.isConnected) from.focus({ preventScroll: true });
  return r;
}

function setSale(next: Sale, offer: ArcadeOffer | null): void {
  const was = pass;
  const bp = offer?.earnMultipliers?.find((m) => m.currencySlug === COINS)?.multiplierBp;
  pass = offer?.pass && bp ? { slug: offer.pass, extra: Math.max(0, bp - BP) / BP } : null;
  if (next === sale && was?.slug === pass?.slug && was?.extra === pass?.extra) return;
  sale = next;
  for (const fn of [...saleListeners]) fn();
}

/** The Arcade's pass that raises Coins (VIP), among the offers; its slug is the offer's own, never ours. */
const coinsPass = (offers: readonly ArcadeOffer[]): ArcadeOffer | null =>
  offers.find((o) => o.kind === "pass" && !!o.pass && (o.earnMultipliers ?? []).some((m) => m.currencySlug === COINS && m.multiplierBp > BP)) ?? null;

/** Is the VIP pass on offer to this player, here? One read at a time; never while the platform asked everyone to wait. */
function readOffer(): Promise<void> {
  reading ??= (async () => {
    try {
      if (!gem.store.showOfferAvailable) return setSale("no", null);
      if (held() > 0) return; // what was drawn stands; the next resume asks
      const r = await gem.store.offers();
      if (r.outcome === "ok") {
        const offer = coinsPass(r.offers);
        setSale(offer ? "offer" : "no", offer);
      } else if (r.reason !== "error") setSale("no", null); // store_off, unsupported, an older Arcade's sign_in_required: not here
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

/** Outside a release build: show Get VIP (true), or follow the Arcade again (false). */
export function forceVipSale(on: boolean): void {
  if (RELEASE) return;
  forced = on;
  for (const fn of [...saleListeners]) fn();
}
