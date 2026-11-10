// THE GOLD "VIP" TAG, and what VIP gives in this game (docs/vip.md). Since 2026-11-10 (the creator: "no VIP
// gates") VIP locks nothing: every event, past event and the daily archive are open to everyone, and VIP gives
// better rewards instead. So the tag no longer marks a door; it marks what VIP gives (vipPerks, home's VIP
// screen and the VIP welcome card), and a member's own (member: no padlock).

import { ICONS } from "./icons";
import { locale, t } from "./i18n";
import { VIP_WEARS_ALL } from "./vip-view";
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

/** How much more a VIP's Coins rewards pay (the checker's rule: Server's src/net/vip.ts, vipExtraCoins). */
const VIP_COINS_RATE = 0.5;

/** "50%" in the player's language (fr "50 %", tr "%50"): the VIP extra on every Coins reward. */
export const vipCoinsPct = (): string => new Intl.NumberFormat(locale(), { style: "percent", maximumFractionDigits: 0 }).format(VIP_COINS_RATE);

/**
 * What VIP gives in this game, as home's VIP screen lists it for a member (vip-about.ts; the boarding pass
 * says the same in its own words, vipPassLines), the best first (the creator, 2026-11-10): 50% more Coins on
 * every reward, double helpers on every helper reward, the day's gift and the welcome gift; and the Cosmetics
 * only while VIP lends them (vip-view.ts VIP_WEARS_ALL: off since 2026-11-02, so four rows). Ours to say; the
 * Arcade's own perks are its sheet's. Information (glass), its numbers the checker's (src/net/vip.ts, from
 * helper-ids.json).
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
    [coinIcon(32, false), t("vip.perk.coins", { pct: vipCoinsPct() })],
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
