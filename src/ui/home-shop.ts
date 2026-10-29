// HOME'S SHOP (the creator, 2026-10-27, from Match3Mahjong: "a shop on home too"): a small
// card over home, opened from its Shop button, where a player stocks up before a hard board
// rather than only when one runs out mid-board (helper-shop.ts, the run-out panel).
//
//   "Shop", then one glass row per helper: Art's picture, its name and how many the player
//   carries ("You have 3"), and two price buttons, one ("1 for 150 ◉") and a pack of 3
//   ("3 for 400 ◉"). Under them, one plain line when a button is greyed: "Not enough
//   Coins yet", or that there is no room ("You're already carrying the most Hints you can
//   (10)", "Room for 2 more Hints"); and after a purchase, what came ("+3 Hints"). One line
//   at the foot: "Hard boards and trips also give free tools."
//
// Greyed buttons stay pressable and answer in words (the lead: "an unaffordable item stays
// listed"; "a full stock refuses plainly"). A purchase goes through the platform, one at a
// time; the counts come back from it (stock.onChange redraws). The player's Coins are never
// drawn: the Arcade's wallet is the one place they show. Information is glass; only the
// prices are buttons. The corner key closes it, as Escape does.

import { t } from "./i18n";
import { closed, cornerKey, opened } from "./dialogs";
import { buyFrom, el, helperPic, priceButton, refusalWords, type BuyAnswer, type HelperKind, type Pack, type Shop } from "./helper-shop";
import { shopStats } from "./board-stats";

/** The rows, in the order of the board's helper buttons. */
const ORDER: readonly HelperKind[] = ["undo", "hint", "shuffle"];

export function createHomeShop(shop: Shop) {
  const veil = el("div", "veil shop home-shop");
  veil.hidden = true;
  veil.setAttribute("role", "dialog");
  veil.setAttribute("aria-modal", "true");
  veil.setAttribute("aria-labelledby", "home-shop-title");

  let busy = false;
  /** The last answer per row, said until the next draw that is not its own. */
  const said: Partial<Record<HelperKind, { text: string; good: boolean }>> = {};

  function close(): void {
    if (veil.hidden) return;
    veil.hidden = true;
    closed(veil);
    for (const k of ORDER) delete said[k];
  }

  /** Why a row's button is greyed, in words (nothing when neither is). */
  function standing(k: HelperKind): string {
    if (!shop.fits(k, 1)) return t(`shop.full.${k}`, { cap: shop.cap });
    if (shop.affordable(k, 1) === false || (shop.price(k, 3) !== null && shop.affordable(k, 3) === false)) return t("shop.short");
    if (shop.price(k, 3) !== null && !shop.fits(k, 3)) return t(`shop.room.${k}`, { count: shop.cap - shop.count(k) });
    return "";
  }

  function row(k: HelperKind): HTMLElement {
    const item = el("section", "shop-item glass");
    item.dataset.kind = k;
    const pic = el("span", "item-pic");
    pic.append(helperPic(k));
    pic.setAttribute("aria-hidden", "true");
    const words = el("div", "item-words");
    const n = shop.count(k);
    words.append(el("b", "", t(`board.${k}`)), el("span", "item-have", t("shop.have", { count: n })));
    const buys = el("div", "item-buys");
    for (const pack of [1, 3] as Pack[]) {
      if (pack === 3 && shop.price(k, 3) === null && shop.price(k, 1) !== null) continue;
      const b = priceButton(shop, k, pack, pack === 3 ? "pack" : "one", true);
      b.addEventListener("click", () => void press(b, k, pack));
      buys.append(b);
    }
    const line = el("p", "item-say");
    line.setAttribute("role", "status");
    const last = said[k];
    line.textContent = last?.text ?? standing(k);
    line.classList.toggle("good", !!last?.good);
    item.append(pic, words, buys, line);
    return item;
  }

  function draw(): void {
    const card = el("div", "card shop-card home-shop-card");
    const head = el("h2", "", t("shop.title"));
    head.id = "home-shop-title";
    card.append(cornerKey("close", t("shop.close"), "shop.close", close), head, ...ORDER.map(row), el("p", "shop-earn", t("shop.earn")));
    // keep the focus on the button pressed across the redraw
    const focused = (document.activeElement as HTMLElement | null)?.dataset?.press;
    veil.replaceChildren(card);
    if (focused) card.querySelector<HTMLElement>(`[data-press="${focused}"]`)?.focus();
  }

  async function press(b: HTMLButtonElement, k: HelperKind, pack: Pack): Promise<void> {
    if (busy) return;
    busy = true;
    for (const x of ORDER) delete said[x];
    const answer: BuyAnswer = await buyFrom(shop, b, k, pack, "home");
    busy = false;
    if (veil.hidden) return;
    said[k] = answer === "ok" ? { text: t(`shop.got.${k}`, { count: pack }), good: true } : { text: refusalWords(shop, k, pack, answer), good: false };
    draw();
    if (answer === "ok") {
      const pic = veil.querySelector<HTMLElement>(`.shop-item[data-kind="${k}"] .item-pic`);
      pic?.classList.add("grew");
    }
  }

  return {
    element: veil,
    open(): void {
      busy = false;
      for (const k of ORDER) delete said[k];
      draw();
      veil.hidden = false;
      opened(veil, close);
      shopStats.opened("home");
    },
    close,
    isOpen: (): boolean => !veil.hidden,
    /** A count, a price or the Coins changed while it is up: drawn again (never mid-purchase). */
    redraw(): void {
      if (!veil.hidden && !busy) draw();
    },
  };
}
