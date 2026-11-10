// THE GOLD "VIP" TAG, and what VIP gives in this game (docs/vip.md). Since 2026-11-10 (the creator: "no VIP
// gates") VIP locks nothing: every event, past event and the daily archive are open to everyone, and VIP gives
// better rewards instead: +50% on every Coins reward, double on every helper reward (Server's src/net/vip.ts,
// the win checker pays it). So the tag no longer marks a door; it marks what VIP gives (vipPerks, home's VIP
// screen and the VIP welcome card), a member's own (member: no padlock), and every reward (vipRewardTag).
//
// THE TAG BESIDE EVERY REWARD (vipRewardTag; the creator, 2026-11-10): wherever a Coins reward or a helper
// reward is shown, before it is won (the event page's items) and as it lands (each win card's chip, the
// guide's finish card, home's "Your last win counted", an event item's "packed!" line, the event's finish
// card), the gold tag beside it: "VIP +20" by Coins, "VIP ×2" by helpers.
//   - not VIP: the padlock, and the tag is a BUTTON in the button material (the gold face raised on its lip,
//     a 44 px hit area) opening the game's own VIP screen, the boarding pass with Get VIP (the creator's pick,
//     not the Arcade's sheet at once); its figure what VIP would add.
//   - VIP: the tick, flat information (no button look), its figure what the checker says landed.
//   - VIP unknown (the server has not said, or the claim's read failed): a plain tag with no icon, as
//     information, so neither answer is claimed.
//   - LEVEL 1'S FINISH CARD (the guide's milestone) takes `still`: the same gold and padlock as information,
//     never a button (the creator's pick A, 2026-11-10): nothing leaves the guided start, as home's VIP badge
//     and the Shop appear only once Level 1 is done.
// Calm: no shake, glint or countdown on these, whatever the badge on home does.

import { ICONS } from "./icons";
import { locale, t } from "./i18n";
import { VIP_WEARS_ALL } from "./vip-view";
import { coinIcon } from "./coin";
import { helperPic } from "./helper-shop";
import { isVip, pretending, vipExtraCoins, vipKnown, VIP_DAILY_SIZE, VIP_HELPER_FACTOR, VIP_WELCOME_SIZE } from "../net/vip";

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

/** How much more a VIP's Coins rewards pay (the checker's rule, src/net/vip-extra.json, through vipExtraCoins): 0.5. */
const VIP_COINS_RATE = vipExtraCoins(100) / 100;

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

// ---------------------------------------------------------------- the tag beside a reward

/** Whose a reward's VIP figure is: a VIP's ("yes"), not ("no"), or nobody knows yet ("unknown"). */
export type VipSide = "yes" | "no" | "unknown";

/** This player's VIP as the screens know it now, for a reward not yet won: the server's word, unknown until it lands (the dev menu's Pretend is known: it holds). */
export const vipSide = (): VipSide => (!vipKnown() && !pretending() ? "unknown" : isVip() ? "yes" : "no");

let openVip: (() => void) | null = null;
/** What a non-VIP's tag opens (app.ts: home's VIP screen, its boarding pass). */
export function onVipTagPress(open: () => void): void {
  openVip = open;
}

/**
 * The VIP tag beside a reward (the head of this file): `coins`, the VIP extra on it ("VIP +20"), or the helpers'
 * doubling ("VIP ×2"); `side`, whose. `still`: information even for a player who is not VIP (Level 1's
 * finish card). Null for Coins of 0: nothing to say.
 */
export function vipRewardTag(what: { coins: number } | { helpers: true }, side: VipSide, o: { still?: boolean; cls?: string } = {}): HTMLElement | null {
  const coins = "coins" in what;
  if (coins && !(what.coins > 0)) return null;
  const n = coins ? Math.round(what.coins).toLocaleString(locale()) : VIP_HELPER_FACTOR.toLocaleString(locale());
  const words = el("span", "vr-words", t(coins ? "vip.reward.coins" : "vip.reward.helpers", { n }));
  const cls = ["vip-reward", side === "yes" ? "member" : side === "no" ? "locked" : "unsure", o.cls ?? ""].filter(Boolean).join(" ");
  // read aloud: a VIP's says what came, anyone else's what VIP would give
  // the Coin lines are plurals ("1 more Coin", Polish "o 2 monety", "o 5 monet"): the count picks the form, {{n}} shows it
  const said = t(
    side === "yes" ? (coins ? "vip.reward.gotCoins" : "vip.reward.gotHelpers") : coins ? "vip.reward.withCoins" : "vip.reward.withHelpers",
    coins ? { n, count: Math.round(what.coins) } : { n },
  );
  const glyph = (name: "lock" | "check") => {
    const g = el("span", "vr-ico");
    g.innerHTML = ICONS[name];
    return g;
  };
  if (side === "no" && !o.still && openVip) {
    const b = el("button", `btn ${cls}`);
    b.type = "button";
    b.dataset.press = coins ? "vip.tag.coins" : "vip.tag.helpers";
    b.setAttribute("aria-label", `${said}. ${t("home.vip")}`);
    b.append(glyph("lock"), words);
    b.addEventListener("click", (e) => {
      // the tag, never what it sits on (a win card's chip, a line)
      e.stopPropagation();
      openVip?.();
    });
    return b;
  }
  const tag = el("span", cls);
  tag.setAttribute("role", "img");
  tag.setAttribute("aria-label", said);
  if (side !== "unknown") tag.append(glyph(side === "yes" ? "check" : "lock"));
  tag.append(words);
  return tag;
}
