// THE GOLD "VIP" TAG, and what VIP gives in this game (docs/vip.md). VIP locks nothing (the creator, 2026-11-10:
// "no VIP gates"): every event, past event and the daily archive are open to everyone, and VIP gives better
// rewards instead: +50% on every Coins reward, which the Arcade applies itself as it pays (SDK 24), and double on
// every helper reward, the day's gift and the welcome gift (the config's bonuses, which the checker's recipes run:
// the creator, 2026-11-12). The tag marks what VIP gives (vipPerks, home's VIP screen and the VIP welcome card) and
// a member's own (member: no padlock).
//
// WHAT VIP WOULD ADD TO A REWARD is never worked out here: a win card asks gem.gameConfig.preview and offers it
// before the claim (win-upsell.ts), and shows what landed from the receipt (the standard's "VIP: gate on the pass
// in config, never multiply in code, and upsell before the grant"; the creator, 2026-11-11). The gifts' sizes are
// the preview's too (vipGiftSizes): never a figure of ours, and none said where it says none.
// Calm: no shake, glint or countdown on these, whatever the badge on home does.

import { ICONS } from "./icons";
import { locale, t } from "./i18n";
import { vipCoinsExtra } from "./vip-view";
import { coinIcon } from "./coin";
import { helperPic } from "./helper-shop";
import { previewVipGifts } from "../net/vip";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/**
 * The gold "VIP" tag: with its padlock where it shows a player who is not a VIP what VIP gives; `member`,
 * without, where VIP is the player's own (the creator, 2026-11-02: "keep VIP visible so they know the things
 * they are getting for what they paid for"). Information, never a button of its own.
 */
export function vipTag(cls = "", member = false): HTMLElement {
  const tag = el("span", ["vip-tag", member ? "member" : "", cls].filter(Boolean).join(" "));
  tag.setAttribute("aria-hidden", "true");
  if (!member) {
    const lock = el("span", "vip-lock");
    lock.innerHTML = ICONS.lock;
    tag.append(lock);
  }
  tag.append(el("span", "", t("vip.tag")));
  return tag;
}

/**
 * "50%" in the player's language (fr "50 %", tr "%50"): how much more VIP pays in Coins, from its offer's earn
 * multiplier (vip-view.ts vipCoinsExtra, the Arcade's own figure); null until the offers say, or where VIP is
 * not sold, and the line then says "More Coins" with no figure (never a copy of ours).
 */
export function vipCoinsPct(): string | null {
  const extra = vipCoinsExtra();
  return extra ? new Intl.NumberFormat(locale(), { style: "percent", maximumFractionDigits: 0 }).format(extra) : null;
}

// ---------------------------------------------------------------- VIP's gifts' sizes, from the preview
/** VIP's two gifts here, in helpers in all (null: the preview has not said). */
export type GiftSizes = { readonly daily: number | null; readonly welcome: number | null };
let sizes: GiftSizes = { daily: null, welcome: null };
let asking = false;
let askedAt = -Infinity;
/** A preview that could not say is asked again no sooner than this (each screen that says the gifts asks). */
const ASK_AGAIN_MS = 60_000;
const sizeListeners = new Set<() => void>();

/** Ask Server's previewVipGifts, once a session where it has said both, else again after ASK_AGAIN_MS. */
function askSizes(): void {
  if (asking || (sizes.daily !== null && sizes.welcome !== null) || performance.now() - askedAt < ASK_AGAIN_MS) return;
  asking = true;
  askedAt = performance.now();
  previewVipGifts()
    .then((s) => {
      // a figure once said stands where a later preview cannot say
      const next = { daily: s.daily ?? sizes.daily, welcome: s.welcome ?? sizes.welcome };
      if (next.daily === sizes.daily && next.welcome === sizes.welcome) return;
      sizes = next;
      for (const fn of [...sizeListeners]) fn();
    })
    .catch(() => undefined)
    .finally(() => (asking = false));
}

/**
 * VIP's daily gift and welcome gift here, in helpers in all, as the platform's preview says (Server's
 * previewVipGifts: the config's bonus grants, never a figure of ours); null where it has not said. Asks if need be:
 * hear the answer with onVipGiftSizes.
 */
export function vipGiftSizes(): GiftSizes {
  askSizes();
  return sizes;
}

/** Hear the gifts' sizes change (draw again). Returns the unsubscribe. */
export function onVipGiftSizes(fn: () => void): () => void {
  sizeListeners.add(fn);
  return () => void sizeListeners.delete(fn);
}

/**
 * A gift's line: with its size where the preview gave one (`counted`, a plural key), the line with no figure where
 * it gave none (`plain`), and no line at all where the preview says the gift gives nothing (0).
 */
export function giftWords(size: number | null, counted: string, plain: string): string | null {
  if (size === null) return t(plain);
  return size > 0 ? t(counted, { count: size }) : null;
}

/**
 * What VIP gives in this game, as home's VIP screen lists it for a member (vip-about.ts; the boarding pass
 * says the same in its own words, vipPassLines), the best first (the creator, 2026-11-10): 50% more Coins on
 * every reward, double helpers on every helper reward, the day's gift and the welcome gift. Ours to say; the
 * Arcade's own perks are its sheet's. Information (glass): the Coins' figure is the Arcade's offer's, the
 * gifts' sizes the preview's (vipGiftSizes).
 */
export function vipPerks(): HTMLElement {
  const box = el("div", "vip-perks glass");
  box.append(el("b", "vip-perks-head", t("vip.perks")));
  const list = el("ul");
  const gifts = vipGiftSizes();
  const rows: Array<[Node, string | null]> = [
    [coinIcon(32, false), ((pct) => (pct ? t("vip.perk.coins", { pct }) : t("vip.perk.coinsMore")))(vipCoinsPct())],
    [helperPic("undo", 3), t("vip.perk.helpers")],
    [helperPic("hint"), giftWords(gifts.daily, "vip.perk.daily", "vip.perk.dailyMore")],
    [helperPic("shuffle", 3), giftWords(gifts.welcome, "vip.perk.welcome", "vip.perk.welcomeMore")],
  ];
  for (const [pic, words] of rows) {
    if (words === null) continue;
    const li = el("li");
    const p = el("span", "vip-perk-pic");
    p.setAttribute("aria-hidden", "true");
    p.append(pic);
    li.append(p, el("span", "", words));
    list.append(li);
  }
  box.append(list);
  return box;
}
