// THE GEMS BUNDLES OF HELPERS (the creator, 2026-11-01), as rows in home's shop (home-shop.ts) and on
// the panel a player meets when out of a helper on a board (helper-shop.ts, createRunOut):
//
//   Starter Kit (once per player) 200 Gems, 5 of each; Small 100 Gems, 2 Hints, 1 Undo, 1 Shuffle;
//   Medium 200 Gems, 3 of each; Large 500 Gems, 8 of each (Server's src/net/helpers.ts and the config:
//   nothing of it is written here but the order they come in).
//
// Each row: Art's picture (art/bundle-<slug>.webp), the bundle's name (the Starter Kit tagged "One time
// only", first, until it is bought) and its contents in words, and one button: its Gems price exactly as
// the config gives it, with the Arcade's Gem (coin.ts gemIcon). Information is glass; only the price is a
// button. The player's Gems are never drawn: the Arcade's wallet shows them, and the Arcade's own sheet
// confirms the spend in its words and price.
//
//   - A bundle that would pass the cap (HELPER_CAP, src/net/helper-ids.json) is LEFT OUT, never a faded
//     Buy; one line says why ("Use some Undos first to make room for the other bundles. You can carry
//     20 of each."), its number the cap's.
//   - A row shows only once the config has priced it on this channel, and none where the Arcade cannot
//     draw its purchase sheet (a TV, an older Arcade); the Starter Kit only once the platform has said
//     it is still the player's to buy.
//   - The press calls the Arcade in its own turn (stock.buyBundle, nothing awaited first). declined (the
//     sheet closed, the Arcade's back-off) shows nothing; unknown (they may have paid) shows nothing but
//     the stock as re-read; the new stock shows as soon as it lands (the shop redraws on stock.onChange).

import { locale, t } from "./i18n";
import { gemPriceTag } from "./coin";
import { el, type HelperKind } from "./helper-shop";
import type { Bundle, BundleAnswer, BundleSlug } from "./stock";

/** What the rows read and do (stock.ts, over Server's helpers.ts). */
export interface BundleShop {
  /** The bundles on sale to this player here, now, in order (priced, the sheet drawable, the kit while theirs to buy). */
  bundles(): Bundle[];
  /** The helpers a bundle would carry past the cap (empty: it fits). */
  bundleFits(slug: BundleSlug): HelperKind[];
  /** The most of one helper a player can carry. */
  cap: number;
}

/** The order the contents are said in (the board's buttons'). */
const KINDS: readonly HelperKind[] = ["hint", "undo", "shuffle"];

/** Art's picture of a bundle (public/art/bundle-<slug>.webp, 192 px). */
export function bundlePic(slug: BundleSlug): HTMLImageElement {
  const img = document.createElement("img");
  img.src = `${import.meta.env.BASE_URL}art/bundle-${slug}.webp`;
  img.alt = "";
  img.className = "helper-pic";
  img.draggable = false;
  img.decoding = "async";
  return img;
}

/** A bundle's contents in words: "3 of each", or "2 Hints, 1 Undo and 1 Shuffle". */
export function contentsWords(c: Record<HelperKind, number>): string {
  const ns = KINDS.map((k) => c[k]);
  if (ns.every((n) => n === ns[0])) return t("bundle.each", { count: ns[0] });
  const parts = KINDS.filter((k) => c[k] > 0).map((k) => t(`bundle.n.${k}`, { count: c[k] }));
  return new Intl.ListFormat(locale(), { style: "long", type: "conjunction" }).format(parts);
}

/** "Undos", "Undos and Hints": the helpers named in a line. */
const helperList = (kinds: HelperKind[]): string =>
  new Intl.ListFormat(locale(), { style: "long", type: "conjunction" }).format(kinds.map((k) => t(`bundle.many.${k}`)));

/** A bundle answer in the shop's own words (nothing where nothing is to be said). */
export function bundleWords(answer: BundleAnswer, b: Bundle | undefined): { text: string; good: boolean } | null {
  if (answer === "ok" && b) return { text: t("bundle.got", { contents: contentsWords(b.contents) }), good: true };
  if (answer === "short") return { text: t("bundle.short"), good: false };
  if (answer === "failed") return { text: t("shop.failed"), good: false };
  // declined (closed, the Arcade's back-off), unknown (the stock re-read says it), full and gone (the
  // row goes, and the room line says why): nothing
  return null;
}

/**
 * The bundles section's rows (those that fit) and its room line (those left out), for `shop`. `press`
 * runs in the Buy button's own click, with nothing awaited before the Arcade is asked.
 */
export function bundleRows(shop: BundleShop, press: (b: Bundle, button: HTMLButtonElement) => void, compact = false): { rows: HTMLElement[]; room: HTMLElement | null } {
  const rows: HTMLElement[] = [];
  const blocked = new Set<HelperKind>();
  let left = 0;
  const all = shop.bundles();
  for (const b of all) {
    const over = shop.bundleFits(b.slug);
    if (over.length) {
      left++;
      for (const k of over) blocked.add(k);
      continue;
    }
    rows.push(row(b, press, compact));
  }
  let room: HTMLElement | null = null;
  if (left) {
    room = el("p", "bundle-room");
    const kinds = KINDS.filter((k) => blocked.has(k));
    room.textContent = t(rows.length ? "bundle.noRoomSome" : "bundle.noRoomAll", { helpers: helperList(kinds), cap: shop.cap });
  }
  return { rows, room };
}

function row(b: Bundle, press: (b: Bundle, button: HTMLButtonElement) => void, compact: boolean): HTMLElement {
  const item = el("section", `shop-item bundle-item glass${b.once ? " once" : ""}${compact ? " compact" : ""}`);
  item.dataset.bundle = b.slug;
  const pic = el("span", "item-pic");
  pic.append(bundlePic(b.slug));
  pic.setAttribute("aria-hidden", "true");
  const words = el("div", "item-words");
  const name = el("b", "", t(`bundle.${b.slug}`));
  words.append(name);
  if (b.once) words.append(el("span", "bundle-once", t("bundle.once")));
  words.append(el("span", "item-have", contentsWords(b.contents)));
  const buy = el("button", "btn shop-buy bundle-buy");
  buy.type = "button";
  buy.dataset.press = `bundle.buy.${b.slug}`;
  const label = el("span", "buy-words");
  // the price as the config gives it, with the Arcade's Gem; read aloud in full
  if (b.gems !== null) {
    label.append(gemPriceTag(b.gems));
    buy.setAttribute("aria-label", t("bundle.buyAria", { name: t(`bundle.${b.slug}`), price: `${b.gems.toLocaleString(locale())} ${t("gems.name")}` }));
  }
  buy.append(label);
  buy.addEventListener("click", () => press(b, buy));
  item.append(pic, words, buy);
  return item;
}

/** The Buy button while its purchase is out: "Buying…", not pressable; given back its price after. */
export function buyingBundle(button: HTMLButtonElement): () => void {
  const words = button.querySelector(".buy-words");
  const was = words ? [...words.childNodes] : [];
  button.setAttribute("aria-busy", "true");
  button.disabled = true;
  if (words) words.textContent = t("shop.buying");
  return () => {
    button.removeAttribute("aria-busy");
    button.disabled = false;
    if (words) words.replaceChildren(...was);
  };
}
