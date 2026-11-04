// RUN-OUT: a helper tapped with none left opens this small panel over the board (the
// creator, 2026-10-27, after the mahjong-solitaire game's "none left" panel):
//
//   "Out of Hints", the helper's picture, then two buttons: one ("1 Hint · 150 ◉", the
//   main action, amber) and a pack of 3 at a small saving ("3 Hints · 400 ◉"; the
//   creator, 2026-10-27, from Match3Mahjong), each greyed when the player's Coins do not
//   cover it, and one line: "Hard boards and trips also give free tools.", led by "You
//   need 150 ◉." when they fall short. The corner key closes it. The player's Coins
//   themselves are never drawn here: the Arcade's wallet is the one place they show (the
//   platform's "No counter" rule). One wording for everyone: the game cannot tell a guest
//   from a player with no Coins (a guest reads as 0 Coins), so a guest sees the same
//   panel, greyed (the lead, 2026-10-27).
//
// Prices are the game config's (Server's helpers.ts reads them), one price everywhere,
// never written here, and shown with the Arcade's own Coin (coin.ts). The pack's button
// is left out while the config sells no pack. Buying goes through the Arcade's purchase
// sheet (2026-11-04; Server's helpers.ts): the button says "Buying…" while it is up, then
// the stock is read again. Bought: the panel closes and the helper is used at once (the
// player tapped it to use it). Not enough Coins, or no room under the cap: said plainly on
// the panel, which stays. The sheet closed, or a guest shown the Arcade's sign-up card:
// nothing said. No reliable answer: nothing said, the panel drawn from the stock as read
// again (bought after all: the helper is used). A purchase is never retried by itself.
//
// Under them, "Or get a bundle": the Gems bundles that fit (bundle-rows.ts, the creator,
// 2026-11-01), each with its Gems price; one bought closes the panel and uses the helper at once,
// as a Coins buy does. One that would pass the cap is left out, with one line saying why.
//
// It is a card like the others (dialogs.ts): the focus goes in, Escape closes it, and its
// corner key is the way out. Information is glass; only the prices are buttons.
//
// The pieces both shops use (the run-out and home's, home-shop.ts) are here too: the
// helpers' pictures and a price button that buys.

import { locale, t } from "./i18n";
import { closed, cornerKey, opened } from "./dialogs";
import { sayPrice } from "./coin";
import { shopStats, type ShopWhere } from "./board-stats";
import { bundleRows, bundleWords, buyingBundle } from "./bundle-rows";
import type { Bundle, BundleAnswer, BundleSlug } from "./stock";

export type HelperKind = "undo" | "hint" | "shuffle";
export type Pack = 1 | 3;

/**
 * What buying answered: bought, not enough Coins, no room under the cap, or no answer (failed); on
 * the Arcade's sheet also declined (closed, a guest shown the Arcade's sign-up card, any refusal) and
 * unknown (no reliable answer; the stock was read again), both said nowhere.
 */
export type BuyAnswer = "ok" | "short" | "full" | "failed" | "declined" | "unknown";

/** What the shops read and do (stock.ts, over Server's helpers.ts). */
export interface Shop {
  /** How many the player carries now. */
  count(k: HelperKind): number;
  /** The price in Coins of one or a pack, or null while the config is not read (or sells no such pack). */
  price(k: HelperKind, pack?: Pack): number | null;
  /** Do the player's Coins cover it? null while unknown (only for greying a button). */
  affordable(k: HelperKind, pack?: Pack): boolean | null;
  /** One, or a pack, still fits under the cap. */
  fits(k: HelperKind, pack?: Pack): boolean;
  /** The most of one helper a player can carry. */
  cap: number;
  /** Buy one or a pack from shop `where`; the stock is read again before it answers (a purchase taken is counted: helper_bought). */
  buy(k: HelperKind, pack?: Pack, where?: ShopWhere): Promise<BuyAnswer>;
  /** The Gems bundles on sale here now, in order (bundle-rows.ts). */
  bundles(): Bundle[];
  /** The helpers a bundle would carry past the cap (empty: it fits). */
  bundleFits(slug: BundleSlug): HelperKind[];
  /** Buy a bundle for Gems, in the press's own turn (the Arcade's sheet). */
  buyBundle(slug: BundleSlug, where?: ShopWhere): Promise<BundleAnswer>;
}

/** Art's pictures of each helper, one and a pack of 3 (public/art/helper-*.webp, 192 px). */
export function helperPic(k: HelperKind, pack: Pack = 1): HTMLImageElement {
  const img = document.createElement("img");
  img.src = `${import.meta.env.BASE_URL}art/helper-${k}${pack === 3 ? "-3" : ""}.webp`;
  img.alt = "";
  img.className = "helper-pic";
  img.draggable = false;
  img.decoding = "async";
  return img;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/**
 * A price button that buys: "1 Hint · 150 ◉" (or "3 Hints · 400 ◉"), "…" while the price is
 * unread, greyed (still pressable, the answer then says why) when the Coins fall short or the
 * pack would not fit. `press` runs the purchase; the button shows "Buying…" meanwhile.
 */
export function priceButton(shop: Shop, k: HelperKind, pack: Pack, cls: string, brief = false): HTMLButtonElement {
  const price = shop.price(k, pack);
  const b = el("button", `btn ${cls} shop-buy`);
  b.type = "button";
  const key = `shop.buy${pack === 3 ? "3" : ""}`;
  b.dataset.press = `${key}.${k}`;
  const words = el("span", "buy-words");
  // brief (home's shop, whose row names the helper): "3 for 675 ◉", said in full to a screen reader
  if (price === null) words.textContent = brief ? t("shop.forWait", { count: pack }) : t(`${key}Wait.${k}`);
  else words.append(...sayPrice(brief ? "shop.for" : `${key}.${k}`, price, { count: pack }));
  if (brief && price !== null) b.setAttribute("aria-label", t(`${key}.${k}`, { price: `${price.toLocaleString(locale())} ${t("coins.unit", { count: price })}` }));
  b.append(words);
  b.disabled = price === null;
  b.classList.toggle("short", price !== null && (shop.affordable(k, pack) === false || !shop.fits(k, pack)));
  return b;
}

/** Runs a purchase from its button in shop `where`: "Buying…" while it goes, then the answer. One at a time. */
export async function buyFrom(shop: Shop, b: HTMLButtonElement, k: HelperKind, pack: Pack, where: ShopWhere): Promise<BuyAnswer> {
  b.setAttribute("aria-busy", "true");
  b.disabled = true;
  const words = b.querySelector(".buy-words");
  const was = words ? [...words.childNodes] : [];
  if (words) words.textContent = t("shop.buying");
  const answer = await shop.buy(k, pack, where).catch((): BuyAnswer => "failed");
  b.removeAttribute("aria-busy");
  b.disabled = false;
  if (words) words.replaceChildren(...was);
  return answer;
}

/** A refusal in plain words (nothing for a purchase that went through). */
export function refusalWords(shop: Shop, k: HelperKind, pack: Pack, answer: BuyAnswer): string {
  if (answer === "short") return t("shop.short");
  if (answer === "full") return pack === 3 && shop.fits(k, 1) ? t(`shop.room.${k}`, { count: shop.cap - shop.count(k) }) : t(`shop.full.${k}`, { cap: shop.cap });
  if (answer === "failed") return t("shop.failed");
  return "";
}

export function createRunOut(shop: Shop, bought: (k: HelperKind) => void) {
  const veil = el("div", "veil shop");
  veil.hidden = true;
  veil.setAttribute("role", "dialog");
  veil.setAttribute("aria-modal", "true");

  let kind: HelperKind = "hint";
  let busy = false;
  /** The last purchase answered "not enough Coins" (the line says so even before the Coins are read again). */
  let wasShort = false;

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
    glyph.append(helperPic(kind));
    glyph.setAttribute("aria-hidden", "true");
    const card = el("div", "card shop-card");
    card.append(cornerKey("close", t("shop.close"), "shop.close", close), head, glyph);
    const one = priceButton(shop, kind, 1, "amber next");
    one.addEventListener("click", () => void press(one, 1));
    const buttons = el("div", "shop-buys");
    buttons.append(one);
    // the pack, while the config sells one (its price read, or the single's still unread)
    if (shop.price(kind, 3) !== null || shop.price(kind, 1) === null) {
      const three = priceButton(shop, kind, 3, "pack");
      three.addEventListener("click", () => void press(three, 3));
      buttons.append(three);
    }
    const price = shop.price(kind, 1);
    const short = price !== null && (wasShort || shop.affordable(kind, 1) === false);
    const earn = el("p", "shop-earn");
    if (short && price !== null) earn.append(...sayPrice("shop.need", price), " ");
    earn.append(t("shop.earn"));
    card.append(buttons, earn);
    // the Gems bundles that fit, compact, under the Coins
    const { rows, room } = bundleRows(shop, pressBundle, true);
    if (rows.length || room) {
      const list = el("div", "bundle-list");
      list.append(el("h3", "bundle-head", t("bundle.or")), ...rows, ...(room ? [room] : []));
      card.append(list);
    }
    say.textContent = "";
    card.append(say);
    veil.replaceChildren(card);
  }

  /** A bundle's Buy: the Arcade's sheet, asked first thing in the press; bought, the helper is used at once. */
  function pressBundle(b: Bundle, button: HTMLButtonElement): void {
    if (busy) return;
    busy = true;
    say.textContent = "";
    const asked = shop.buyBundle(b.slug, "run_out");
    const back = buyingBundle(button);
    void asked
      .catch((): BundleAnswer => "unknown")
      .then((answer) => {
        busy = false;
        back();
        if (veil.hidden) return;
        // bought, or an outcome nobody knows whose re-read stock shows the helper came: used at once
        if (answer === "ok" || (answer === "unknown" && shop.count(kind) > 0)) {
          close();
          bought(kind);
          return;
        }
        // nothing to say for a closed sheet or an unknown outcome: the panel is drawn from the stock as read
        draw();
        say.textContent = bundleWords(answer, b)?.text ?? "";
      });
  }

  async function press(btn: HTMLButtonElement, pack: Pack): Promise<void> {
    if (busy) return;
    busy = true;
    say.textContent = "";
    const answer = await buyFrom(shop, btn, kind, pack, "run_out");
    busy = false;
    if (veil.hidden) return;
    // bought, or an outcome nobody knows whose re-read stock shows the helper came (it opened at none)
    if (answer === "ok" || (answer === "unknown" && shop.count(kind) > 0)) {
      close();
      bought(kind);
      return;
    }
    // refused or unanswered: said plainly, the panel redrawn with what is true now
    wasShort = answer === "short" && pack === 1;
    draw();
    // the single's shortfall is the line under the buttons already; anything else is said here
    say.textContent = answer === "short" && pack === 1 ? "" : refusalWords(shop, kind, pack, answer);
  }

  return {
    element: veil,
    /** Open for helper `k`, which has none left. */
    open(k: HelperKind): void {
      kind = k;
      busy = false;
      wasShort = false;
      draw();
      veil.hidden = false;
      opened(veil, close);
      shopStats.opened("run_out");
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
