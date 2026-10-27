// RUN-OUT: a helper tapped with none left opens this small panel over the board (the
// creator, 2026-10-27, after the mahjong-solitaire game's "none left" panel):
//
//   signed in   "Out of Hints", the helper's glyph, its price as the big button
//               ("1 Hint · 150 Coins"), greyed when the player's Coins do not cover it,
//               and one line on earning more; the corner key closes it. The player's
//               Coins themselves are never drawn here: the Arcade's wallet is the one
//               place they show (the platform's "No counter" rule).
//   a guest     no price (a guest cannot buy): only "Earn more on hard boards and trips."
//
// The price is the game config's (Server's helpers.ts reads it), one price everywhere,
// never written here. Buying goes through the platform: the button says "Buying…", then
// the stock is read again. Bought: the panel closes and the helper is used at once (the
// player tapped it to use it). Refused: said plainly on the panel (not enough Coins, or
// already carrying the most), and the panel stays; no answer at all: "try again" (a
// purchase is never retried by itself).
//
// It is a card like the others (dialogs.ts): the focus goes in, Escape closes it, and its
// corner key is the way out. Information is glass; only the price is a button.

import { t } from "./i18n";
import { ICONS } from "./icons";
import { closed, cornerKey, opened } from "./dialogs";

export type HelperKind = "undo" | "hint" | "shuffle";

/** What buying answered: bought, not enough Coins, already at the cap, or no answer. */
export type BuyAnswer = "ok" | "short" | "full" | "failed";

/** What the panel reads and does (Server's helpers.ts, through app.ts). */
export interface Shop {
  /** The price in Coins, or null while the config is not read yet. */
  price(k: HelperKind): number | null;
  /** Do the player's Coins cover the price? null while unknown (only for greying the button). */
  affordable(k: HelperKind): boolean | null;
  /** A guest cannot buy: no price is shown. */
  guest(): boolean;
  /** The most of one helper a player can carry. */
  cap: number;
  /** Buy one; the stock is read again before it answers. */
  buy(k: HelperKind): Promise<BuyAnswer>;
}

const GLYPH: Record<HelperKind, string> = { undo: ICONS.undo, hint: ICONS.hint, shuffle: ICONS.shuffle };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function createRunOut(shop: Shop, bought: (k: HelperKind) => void) {
  const veil = el("div", "veil shop");
  veil.hidden = true;
  veil.setAttribute("role", "dialog");
  veil.setAttribute("aria-modal", "true");

  let kind: HelperKind = "hint";
  let busy = false;

  function close(): void {
    if (veil.hidden) return;
    veil.hidden = true;
    closed(veil);
  }

  /** The panel's plain line after a refusal (or nothing). */
  const say = el("p", "shop-say");
  say.setAttribute("role", "status");

  function draw(): void {
    const head = el("h2", "", t(`shop.out.${kind}`));
    const glyph = el("div", "shop-glyph");
    glyph.innerHTML = GLYPH[kind];
    glyph.setAttribute("aria-hidden", "true");
    const card = el("div", "card shop-card");
    card.append(cornerKey("close", t("shop.close"), "shop.close", close), head, glyph);
    if (shop.guest()) {
      // a guest cannot buy: where more come from, and nothing else
      card.append(el("p", "shop-earn", t("shop.earn")));
    } else {
      const price = shop.price(kind);
      const buy = el("button", "btn amber next shop-buy");
      buy.type = "button";
      buy.dataset.press = `shop.buy.${kind}`;
      buy.append(el("span", "", price === null ? t(`shop.buyWait.${kind}`) : t(`shop.buy.${kind}`, { price })));
      buy.disabled = price === null;
      // greyed when the Coins do not cover it, still pressable: the answer then says so plainly
      buy.classList.toggle("short", shop.affordable(kind) === false);
      buy.addEventListener("click", () => void press(buy));
      card.append(buy, el("p", "shop-earn small", t("shop.earnToo")));
    }
    say.textContent = "";
    card.append(say);
    veil.replaceChildren(card);
  }

  async function press(btn: HTMLButtonElement): Promise<void> {
    if (busy) return;
    busy = true;
    btn.setAttribute("aria-busy", "true");
    btn.disabled = true;
    const label = btn.querySelector("span");
    const was = label?.textContent ?? "";
    if (label) label.textContent = t("shop.buying");
    say.textContent = "";
    const answer = await shop.buy(kind).catch((): BuyAnswer => "failed");
    busy = false;
    if (veil.hidden) return;
    if (answer === "ok") {
      close();
      bought(kind);
      return;
    }
    // refused or unanswered: said plainly, the panel redrawn with what is true now
    draw();
    say.textContent =
      answer === "short"
        ? t("shop.short")
        : answer === "full"
          ? t(`shop.full.${kind}`, { cap: shop.cap })
          : t("shop.failed");
    if (label && answer === "failed") label.textContent = was;
  }

  return {
    element: veil,
    /** Open for helper `k`, which has none left. */
    open(k: HelperKind): void {
      kind = k;
      busy = false;
      draw();
      veil.hidden = false;
      opened(veil, close);
    },
    close,
    /** Is it up? */
    isOpen: (): boolean => !veil.hidden,
    /** The Coins or the price changed while it is up: drawn again (never mid-purchase). */
    redraw(): void {
      if (!veil.hidden && !busy) draw();
    },
  };
}
