// THE GOLD "VIP" TAG, and what VIP gives in this game (docs/vip.md). VIP locks nothing (the creator, 2026-11-10:
// "no VIP gates"): every event, past event and the daily archive are open to everyone, and VIP gives better
// rewards instead: +50% on every Coins reward, which the Arcade applies itself as it pays (SDK 24), and double on
// every helper reward, the day's gift and the welcome gift (Server's checker pays those). The tag marks what VIP
// gives (vipPerks, home's VIP screen and the VIP welcome card) and a member's own (member: no padlock).
//
// WHAT VIP WOULD ADD TO A REWARD is never worked out here: a win card asks gem.gameConfig.preview and offers it
// before the claim (win-upsell.ts), and shows what landed from the receipt (the standard's "VIP: gate on the pass
// in config, never multiply in code, and upsell before the grant"; the creator, 2026-11-11).
// Calm: no shake, glint or countdown on these, whatever the badge on home does.

import { ICONS } from "./icons";
import { locale, t } from "./i18n";
import { VIP_WEARS_ALL, vipCoinsExtra } from "./vip-view";
import { coinIcon } from "./coin";
import { helperPic } from "./helper-shop";
import { VIP_DAILY_SIZE, VIP_WELCOME_SIZE } from "../net/vip";

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

/**
 * What VIP gives in this game, as home's VIP screen lists it for a member (vip-about.ts; the boarding pass
 * says the same in its own words, vipPassLines), the best first (the creator, 2026-11-10): 50% more Coins on
 * every reward, double helpers on every helper reward, the day's gift and the welcome gift; and the Cosmetics
 * only while VIP lends them (vip-view.ts VIP_WEARS_ALL: off since 2026-11-02, so four rows). Ours to say; the
 * Arcade's own perks are its sheet's. Information (glass): the Coins' figure is the Arcade's offer's, the
 * gifts' sizes the checker's (src/net/vip.ts, from helper-ids.json).
 */
export function vipPerks(): HTMLElement {
  const box = el("div", "vip-perks glass");
  box.append(el("b", "vip-perks-head", t("vip.perks")));
  const list = el("ul");
  const art = (src: string) => {
    const img = el("img");
    Object.assign(img, { src: `${import.meta.env.BASE_URL}art/${src}`, alt: "", draggable: false, decoding: "async" });
    return img;
  };
  const rows: Array<[Node, string]> = [
    [coinIcon(32, false), ((pct) => (pct ? t("vip.perk.coins", { pct }) : t("vip.perk.coinsMore")))(vipCoinsPct())],
    [helperPic("undo", 3), t("vip.perk.helpers")],
    [helperPic("hint"), t("vip.perk.daily", { count: VIP_DAILY_SIZE })],
    [helperPic("shuffle", 3), t("vip.perk.welcome", { count: VIP_WELCOME_SIZE })],
    ...(VIP_WEARS_ALL ? ([[art("cosmetics-tile.webp"), t("vip.perk.cosmetics")]] as Array<[Node, string]>) : []),
  ];
  for (const [pic, words] of rows) {
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
