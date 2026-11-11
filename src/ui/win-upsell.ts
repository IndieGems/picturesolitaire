// A WIN'S REWARD BEFORE IT IS PAID, AND VIP OFFERED ON IT (the creator, 2026-11-11: offer VIP on every win,
// before the reward is paid; the game standard's "VIP: gate on the pass in config, never multiply in code, and
// upsell before the grant"; the SDK's inventory-and-catalogs.md "Offering VIP before a reward: the upsell", every
// rule a must, and "Showing a payout before and after: preview and fromReceipt").
//
// A win's claim is HELD (Server's claims.ts holdWin) while its card shows what it would pay, from the platform's
// preview (this player's figures: a VIP's include the Arcade's +50%), and, where the preview has an upsell, offers
// it in place of the card's main action:
//
//     [lock] With VIP, you'd also get      [coin] +20   [hint] +1
//     [ Get VIP ]   [ Continue ]
//
//   - Get VIP and Continue at EQUAL weight: the same button material and size, side by side; neither is the
//     default (Enter presses neither: keys.ts presses a card's .next, which waits hidden), the larger or the
//     brighter (the amber main action comes back only once the offer is answered).
//   - Continue sends the claim. Get VIP opens the Arcade's sheet for the upsell's own pass (vip-view.ts openPass:
//     upsell.pass straight to showPass) and sends the claim once the sheet settles: a pass bought there is held
//     by then (showPass answers ok only once a fresh read shows it), so the claim pays its extra. Paid but not
//     held yet (Ask to Buy, a slow payment): the claim goes without it, and the card says VIP starts once it is
//     confirmed.
//   - Then the card's main action is back in its place, with the focus if the offer had it (the doc's example:
//     focus goes back to where the reward moment started).
//   - At most once per reward moment (app.ts: once answered, never again for that win).
//   - No price and no countdown; the lock an icon and words; upsell.name and the preview's numbers only, never
//     a figure of ours, and never the pass's slug written here.
//   - Never on Level 1's guided finish (nothing leaves the guided start: it is claimed at once).
//
// AFTER THE CLAIM the card shows what landed, from the receipt (the verdict's `earned`, gem.earnings.fromReceipt:
// the same shape as the preview), and a VIP's part of it from its breakdown, as information (coinsOf, passPart).

import type { PassUpsell, PlatformGrantPreview, PreviewGrant } from "@indiegems/gem-web-sdk/sdk";
import type { Verdict } from "../net/claims";
import { helperOfCurrency, type HelperKind } from "../net/helpers";
import { ICONS } from "./icons";
import { coinIcon } from "./coin";
import { helperPic } from "./helper-shop";
import { locale, t } from "./i18n";
import { openPass } from "./vip-view";

/** The Arcade's Coins (its currency slug). */
const COINS = "ARCADE_TICKETS";

/** A grant in Coins (a grant that names no currency is the game's only platform one, Coins). */
const inCoins = (g: { currencySlug?: string }): boolean => g.currencySlug === undefined || g.currencySlug === COINS;

/** Coins in all, as the platform figures them (a preview's or a receipt's), and of them what a held pass added (a VIP's part, for show). */
export function coinsOf(grants: readonly PlatformGrantPreview[] | undefined): { total: number; pass: number } | null {
  if (!grants) return null;
  let total = 0;
  let pass = 0;
  for (const g of grants) {
    if (!inCoins(g)) continue;
    total += Math.max(0, Math.floor(g.total));
    for (const b of g.breakdown) if (b.source === "pass") pass += Math.max(0, Math.floor(b.amount));
  }
  return { total, pass };
}

/** What landed, from the receipt (Server's verdict `earned`, from gem.earnings.fromReceipt); undefined where the verdict has none (an older checker, a receipt not read in time). */
export const earnedOf = (v: Verdict): readonly PlatformGrantPreview[] | undefined => ("earned" in v ? v.earned : undefined);

type Extra = { pic: HTMLElement; n: number; words: string };

/** What the upsell would add, as the card can say it: its Coins, and each helper its bonuses give; rolls and anything else, never what they would land on. */
function extrasOf(up: PassUpsell): Extra[] {
  const out: Extra[] = [];
  const coins = up.platformGrants.filter(inCoins).reduce((sum, g) => sum + Math.max(0, Math.floor(g.extra)), 0);
  if (coins > 0) out.push({ pic: coinIcon(24, false), n: coins, words: t("win.coins", { count: coins }) });
  const tools = new Map<HelperKind, number>();
  for (const b of up.bonuses)
    for (const g of b.grants as readonly PreviewGrant[]) {
      if (g.kind !== "currency") continue;
      const k = helperOfCurrency(g.currencyId);
      if (k && g.amount > 0) tools.set(k, (tools.get(k) ?? 0) + Math.floor(g.amount));
    }
  for (const [k, n] of tools) out.push({ pic: helperPic(k), n, words: t(`win.gift.${k}`, { count: n }) });
  return out;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/**
 * Offer `up` on a win card, in place of its main action `main` (hidden until the offer is answered), and
 * `send` the claim once it is. False where there is nothing the card can say it adds: no offer, and the
 * caller sends the claim itself.
 */
export function offerUpsell(main: HTMLElement, up: PassUpsell, send: () => void): boolean {
  const extras = extrasOf(up);
  if (!extras.length) return false;
  const panel = el("div", "upsell glass");
  panel.setAttribute("role", "group");
  const head = el("p", "up-head");
  head.id = `up-head-${Math.random().toString(36).slice(2, 8)}`;
  panel.setAttribute("aria-labelledby", head.id);
  // the lock: an icon AND words, never colour alone
  const lock = el("span", "up-lock");
  lock.setAttribute("aria-hidden", "true");
  lock.innerHTML = ICONS.lock;
  head.append(lock, el("span", "", t("upsell.head", { name: up.name })));
  const row = el("div", "up-extras");
  for (const x of extras) {
    const item = el("span", "up-extra");
    item.setAttribute("role", "img");
    item.setAttribute("aria-label", x.words);
    x.pic.setAttribute("aria-hidden", "true");
    const n = el("b", "", `+${x.n.toLocaleString(locale())}`);
    n.setAttribute("aria-hidden", "true");
    item.append(x.pic, n);
    row.append(item);
  }
  // the two choices: the same button, the same size, neither amber, neither first in weight
  const choices = el("div", "up-choices");
  const get = el("button", "btn up-choice up-get");
  const later = el("button", "btn up-choice up-continue");
  wordsOf(get, t("upsell.get", { name: up.name }));
  wordsOf(later, t("upsell.continue"));
  for (const b of [get, later]) b.type = "button";
  get.dataset.press = "upsell.get";
  later.dataset.press = "upsell.continue";
  choices.append(get, later);
  panel.append(head, row, choices);

  let answered = false;
  /** The offer answered: the claim goes, and the card's main action is back in its place (the focus with it). */
  const done = (note?: string) => {
    send();
    const had = panel.contains(document.activeElement);
    const status = note ? el("p", "up-note", note) : null;
    if (status) status.setAttribute("role", "status");
    panel.replaceWith(...(status ? [status] : []));
    main.hidden = false;
    if (had) main.focus({ preventScroll: true });
  };
  later.addEventListener("click", () => {
    if (answered) return;
    answered = true;
    done();
  });
  get.addEventListener("click", () => {
    if (answered) return;
    answered = true;
    // the Arcade's sheet covers the game while it is open; once it closes, focus is back on Get VIP (openPass), and
    // goes on to the main action as it takes the offer's place
    void openPass(up.pass, get).then((r) => {
      // paid, but not held yet (Ask to Buy, a payment still settling): this win goes without it, and says so
      const paidNotHeld = !!r && !r.held && (r.outcome === "ok" || r.reason === "pending");
      done(paidNotHeld ? t("upsell.pending", { name: up.name }) : undefined);
    });
  });
  main.hidden = true;
  main.before(panel);
  fitChoices([get, later]);
  return true;
}

/** A button's words, each unbreakable (a long word wraps whole to its own line, never mid-word), and said as one label. */
function wordsOf(b: HTMLButtonElement, words: string): void {
  b.setAttribute("aria-label", words);
  for (const w of words.split(/\s+/).filter(Boolean)) {
    const s = el("span", "up-word", w);
    s.setAttribute("aria-hidden", "true");
    b.append(s, " ");
  }
}

/** The smallest the two choices' words go (never under the 12 px floor, with room to spare). */
const LEAST_PX = 14;

/**
 * Every word of both choices on one line within its button (ru "Продолжить" broke mid-word at 18 px in a 121 px
 * button on a 360 px phone): both step down together, a pixel at a time, so they keep EQUAL weight.
 */
function fitChoices(buttons: HTMLButtonElement[]): void {
  const over = () =>
    buttons.some((b) => {
      const cs = getComputedStyle(b);
      const room = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return [...b.querySelectorAll<HTMLElement>(".up-word")].some((w) => w.offsetWidth > room + 0.5);
    });
  let px = parseFloat(getComputedStyle(buttons[0]!).fontSize);
  while (px > LEAST_PX && over()) {
    px -= 1;
    for (const b of buttons) b.style.fontSize = `${px}px`;
  }
}
