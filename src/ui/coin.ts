// THE COIN: the Arcade's own Coins icon, as the SDK ships it (brand-art.md), on every price and
// every amount just paid (the creator, 2026-10-27, from Match3Mahjong: in place of the word
// "Coins" on a price). Drawn as it is: scaled, never tinted, greyed, outlined or redrawn, so a
// greyed price greys its words and its button, never the coin. It is the icon (the 20 or the 32
// rendition, for a box up to 24 or 40 CSS px), never the hero.
//
// The word is not lost: the icon's alt is "Coins", so a screen reader hears "150 Coins", and a
// sentence that names a price ("You need 150 Coins.") draws the number and the icon where its
// {{price}} stands (sayPrice).

import c20x1 from "@indiegems/gem-web-sdk/brand/ticket-icon-20-1x.png";
import c20x15 from "@indiegems/gem-web-sdk/brand/ticket-icon-20-1.5x.png";
import c20x2 from "@indiegems/gem-web-sdk/brand/ticket-icon-20-2x.png";
import c20x3 from "@indiegems/gem-web-sdk/brand/ticket-icon-20-3x.png";
import c32x1 from "@indiegems/gem-web-sdk/brand/ticket-icon-32-1x.png";
import c32x15 from "@indiegems/gem-web-sdk/brand/ticket-icon-32-1.5x.png";
import c32x2 from "@indiegems/gem-web-sdk/brand/ticket-icon-32-2x.png";
import c32x3 from "@indiegems/gem-web-sdk/brand/ticket-icon-32-3x.png";
import { locale, t } from "./i18n";

/**
 * The Coins icon in a `px` box (16 to 40). `named`: its alt says "Coins" (beside a bare number);
 * otherwise it is decoration, the words beside it saying Coins already.
 */
export function coinIcon(px = 20, named = true, cls = ""): HTMLImageElement {
  const img = document.createElement("img");
  const big = px > 24;
  const [a, b, c, d] = big ? [c32x1, c32x15, c32x2, c32x3] : [c20x1, c20x15, c20x2, c20x3];
  const w = big ? 32 : 20;
  img.src = a;
  img.srcset = `${a} ${w}w, ${b} ${w * 1.5}w, ${c} ${w * 2}w, ${d} ${w * 3}w`;
  img.sizes = `${px}px`;
  img.width = px;
  img.height = px;
  img.alt = named ? t("coins.name") : "";
  img.className = cls ? `coin-icon ${cls}` : "coin-icon";
  img.draggable = false;
  img.decoding = "async";
  return img;
}

/** A price: the number, then the coin ("150 ◉"), read aloud as "150 Coins". */
export function priceTag(price: number, px = 20): HTMLElement {
  const tag = document.createElement("span");
  tag.className = "price-tag";
  tag.append(document.createTextNode(price.toLocaleString(locale())), coinIcon(px));
  return tag;
}

/** Marks where a sentence's {{price}} stands, so the tag can take its place. */
const SLOT = "\u0001";

/** A sentence with a price in it (`key` has {{price}}), as nodes: its words, and the price as a tag. */
export function sayPrice(key: string, price: number, opts: Record<string, unknown> = {}, px = 20): Node[] {
  const text = t(key, { ...opts, price: SLOT });
  const out: Node[] = [];
  text.split(SLOT).forEach((part, i) => {
    if (i > 0) out.push(priceTag(price, px));
    if (part) out.push(document.createTextNode(part));
  });
  return out;
}
