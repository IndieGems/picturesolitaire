// THE TRIP BESIDE THE BOARD (the wide layout, wide.ts; the creator's pick, 2026-11-09, mockup (a)): on a
// campaign level, the column left of the board holds the level's trip as home shows it (itinerary.ts, the
// level in play as its pulsing stop) and, under it, its postcards: how many are found, the last one found,
// and the one this level holds, a dashed blank with its number until it is won (its place is the board's
// reveal, never shown ahead). Information only: flat frosted glass, nothing to press. Hidden in the column
// layout (style.css) and on every other kind of board (a daily, an event's level, a Souvenir, a friend's
// board, a lesson): the board then sits alone between the tools and an empty side. In the column it draws
// nothing at all (no pictures fetched for it): only once the window is wide, and again as it turns wide.

import { ensureTrip, resident } from "../packs";
import { copyUrl, destinationName, destinationPlace, sharpCopy, type Copy, type Destination } from "./catalogue";
import { liveText, t } from "./i18n";
import { createItinerary } from "./itinerary";
import { isWide, onWide } from "./wide";
import { placesOf, tripOf, type Place, type Trip } from "./trips";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** A postcard's picture: the sharpest copy loaded for the size it is drawn at, as the passport picks it. */
const sizing = new WeakMap<Element, { img: HTMLImageElement; d: Destination; tr: Trip; copy?: Copy; asked?: boolean }>();
const sizes = new ResizeObserver((entries) => {
  for (const e of entries) {
    const it = sizing.get(e.target);
    const { width, height } = e.contentRect;
    if (!it || !width || !height) continue;
    let { copy, url } = sharpCopy(it.d, width, height);
    if (!resident(copy.file)) {
      const thumb = it.d.copies.find((c) => c.file === it.d.thumb);
      if (!thumb || !resident(thumb.file)) {
        // the trip's pack is not in yet: ask for it, and look again once it is (once: a pack that came
        // without it leaves the card blank rather than asking forever)
        if (it.asked) continue;
        it.asked = true;
        void ensureTrip(it.tr.id).then(() => {
          sizes.unobserve(e.target);
          sizes.observe(e.target);
        }, () => undefined);
        continue;
      }
      copy = thumb;
      url = copyUrl(thumb);
    }
    if (it.copy && copy.w * copy.h <= it.copy.w * it.copy.h) continue;
    it.copy = copy;
    it.img.src = url;
  }
});

/** One postcard, as the passport draws it: found, its picture and its name; not yet, a blank with its number. */
function postcard(p: Place, tr: Trip): HTMLElement {
  const pc = el("figure", `pc ${p.won && p.dest ? "found" : "locked"}`);
  pc.style.setProperty("--c", String(p.cols));
  pc.style.setProperty("--r", String(p.rows));
  const card = el("span", "pc-card");
  pc.append(card);
  if (!p.won || !p.dest) {
    card.append(el("span", "pc-n", String(p.board)));
    return pc;
  }
  const d = p.dest;
  const img = el("img");
  img.alt = "";
  img.draggable = false;
  img.decoding = "async";
  card.append(img);
  sizing.set(card, { img, d, tr });
  sizes.observe(card);
  const place = destinationPlace(d.id, d.place);
  pc.append(el("figcaption", "pc-name", destinationName(d.id, d.title)), ...(place ? [el("span", "pc-place", place)] : []));
  return pc;
}

export function createTripSide() {
  let level: number | null = null;
  const itin = createItinerary({ redraw: () => draw() });
  const count = el("span", "ts-count");
  const cards = el("div", "ts-cards");
  const postcards = el("section", "ts-postcards glass");
  postcards.append(el("div", "ts-head"), cards);
  postcards.firstElementChild!.append(liveText(el("h3"), "wide.postcards"), count);
  const aside = el("aside", "trip-side");
  aside.append(itin.element, postcards);
  itin.observe();
  onWide((wide) => wide && draw());

  function draw(): void {
    if (!isWide()) return;
    const tr = level === null ? undefined : tripOf(level);
    aside.classList.toggle("empty", !tr);
    if (!tr || level === null) return;
    itin.draw(tr, level, false, false);
    const places = placesOf(tr);
    const found = places.filter((p) => p.won).length;
    count.textContent = t("wide.found", { found, all: places.length });
    // the last postcard found before this level, and this level's own
    const here = places.find((p) => p.board === level);
    const before = places.filter((p) => p.won && p.dest && p.board !== level).pop();
    for (const c of cards.querySelectorAll(".pc-card")) sizes.unobserve(c);
    cards.replaceChildren(...[before, here].filter((p): p is Place => !!p).map((p) => postcard(p, tr)));
  }

  return {
    element: aside,
    /** The board opened is campaign level `n` (null: some other kind of board). */
    show(n: number | null): void {
      level = n;
      draw();
    },
    /** Draw again (a win landed, the language changed). */
    redraw: draw,
  };
}
