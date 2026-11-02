// THE VIP WELCOME'S TRIAL LOOKS (the creator, 2026-11-02: "if a VIP member comes from another game, not having ever
// played ours with the VIP tag, lets give them a welcome card telling them what they'll get with VIP in our game.
// Show it to me first"): two takes on the moment the checker pays a membership's welcome gift (vip-gifts.ts, the
// one seam that already decides it: once a membership, again after a lapse, so a member who brought VIP from
// elsewhere meets it on their first visit). Outside a release build only: vip-gifts.ts loads this file behind
// import.meta.env.MODE, so a release build carries none of it. Once the creator picks, the pick moves into
// vip-gifts.ts and this file goes.
//
//   A  Merged     the welcome gift's card becomes "Welcome, VIP!": what VIP gives here, best first, on the pass's
//                 paper with its stamps (vip-about.ts vipPassLines), then "Here's your welcome gift:" and the eight
//                 helpers landing, as now. One card, one button.
//   B  Separate   a "Welcome, VIP!" card of its own first, the same lines, with "Show me the events!" (the event's
//                 page; the gift waits for home) and a quieter "Later" (the gift card, at once).
//
// Only what the game gives, no price, never "free", nothing of the Arcade's own perks, no other game named; the
// helpers counted from the checker's receipt alone (the gift card's own). Information is glass and paper.

import "./vip-welcome-looks.css";
import { t } from "./i18n";
import { vipTag } from "./vip-door";
import { vipPassLines } from "./vip-about";

/** The looks, for the dev menu. */
export const WELCOME_LOOKS: readonly { id: string; name: string }[] = [
  { id: "a", name: "A: Merged" },
  { id: "b", name: "B: Separate" },
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** What VIP gives here, best first, on the pass's paper: "Here's what VIP gives you in Picture Passport!" and its stamps. */
export function welcomePerks(): HTMLElement {
  const box = el("div", "vw-perks");
  box.append(el("p", "vw-line", t("vip.welcome.line")), vipPassLines(false));
  return box;
}

/** A: the welcome gift's card as "Welcome, VIP!", its perks over the gift. */
export function mergeInto(card: HTMLElement, head: HTMLElement, sub: HTMLElement): void {
  card.classList.add("vw-merged");
  head.textContent = t("vip.welcome.title");
  sub.textContent = t("vip.welcome.gift");
  sub.classList.add("vw-gift-head");
  card.insertBefore(welcomePerks(), sub);
}

/** B: "Welcome, VIP!" on a card of its own, the events its way on, "Later" the gift's. */
export function introCard(events: () => void, later: () => void): HTMLElement {
  const card = el("div", "card vip-gift-card welcome vw-intro");
  const rays = el("div", "vg-rays");
  rays.setAttribute("aria-hidden", "true");
  const head = el("h2", "vg-title", t("vip.welcome.title"));
  head.id = "vip-gift-title";
  const go = el("button", "btn amber next vw-go", t("vip.welcome.events"));
  go.type = "button";
  go.dataset.press = "vipWelcome.events";
  go.addEventListener("click", events);
  const not = el("button", "btn vw-later", t("vip.welcome.later"));
  not.type = "button";
  not.dataset.press = "vipWelcome.later";
  not.addEventListener("click", later);
  card.append(rays, vipTag("big", true), head, welcomePerks(), go, not);
  return card;
}
