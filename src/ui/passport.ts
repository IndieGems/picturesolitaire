// The passport (the travelogue, the creator 2026-10-25): it replaces the albums. Every
// place the player has visited, as a small postcard, one page per trip, in order:
//
//   the cover   the game's name in gold on a navy cover, the open page under it
//   a page      the trip's name, how many of its places are visited, the trip's stamp
//               once every board of it is won (an empty dashed ring until then), and
//               its places: a visited one as its postcard, with its name and where it
//               is; one not visited yet as a blank card with its board number
//   a postcard  tapped, it opens big (viewer.ts), the only place the full picture is fetched
//   pages       ‹ and › under the book, or a swipe across the page
//
// What is visited and stamped follows from the server's record of the boards won
// (trips.ts); nothing is saved here.
//
// THE STAMP MOMENT: the first win of a trip's last board ends its win card on "Stamp
// your passport" (app.ts), which opens the passport at that trip's page, and the stamp
// thuds down with a little sparkle; `trip:stamp` goes out as it lands, for its sound.
// Then one amber button carries on (the next trip's first board, or home). Less motion:
// the stamp fades in, with no thud and no sparkle.
//
// Its top row is every screen's: the title on the left, Back then the gear at the right
// end. The stamp is a placeholder drawn in CSS (the trip's name in an inked ring) until
// Art draws one per trip.

import { ICONS } from "./icons";
import { t } from "./i18n";
import { emit } from "../events";
import { destinationName, destinationPlace, sharpCopy, type Copy, type Destination } from "./catalogue";
import { createViewer } from "./viewer";
import { currentTrip, placesOf, tripById, tripCount, tripDone, tripName, trips, type Place, type Trip } from "./trips";

type Nav = {
  /** Back: to home. */
  home(): void;
  /** Show the passport's screen. */
  show(): void;
};

/** What the stamp moment's button does once the stamp is down. */
export interface AfterStamp {
  label: string;
  /** Its glyph, before the label (after it with `trailing`: an arrow on). */
  icon: Node;
  trailing?: boolean;
  press: string;
  go(): void;
}

/** When the stamp starts down after the page is up, and when it lands (style.css, pp-stamp-land). */
const STAMP_AT_MS = 550;
const LAND_MS = 300;
/** When the button to carry on comes, after it lands. */
const CARRY_ON_MS = 650;
/** A swipe across the page this long, mostly sideways, turns it. */
const SWIPE_PX = 56;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function roundButton(cls: string, press: string, label: string, glyph: string): HTMLButtonElement {
  const b = el("button", `btn round ${cls}`);
  b.type = "button";
  b.dataset.press = press;
  b.innerHTML = glyph;
  b.setAttribute("aria-label", label);
  return b;
}

const lessMotion = () => document.documentElement.classList.contains("less-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Each postcard waiting for its size, and the copy it draws now (as albums.ts: only ever up to a bigger one). */
const sizing = new WeakMap<Element, { img: HTMLImageElement; d: Destination; copy?: Copy }>();
const cardSizes = new ResizeObserver((entries) => {
  for (const e of entries) {
    const it = sizing.get(e.target);
    const { width, height } = e.contentRect;
    if (!it || !width || !height) continue;
    const { copy, url } = sharpCopy(it.d, width, height);
    if (it.copy && copy.w * copy.h <= it.copy.w * it.copy.h) continue;
    it.copy = copy;
    it.img.src = url;
  }
});

/** The placeholder stamp: the trip's name in an inked double ring, a star over and under it. */
function stampOf(tr: Trip): HTMLElement {
  const s = el("div", "pp-stamp");
  s.setAttribute("role", "img");
  s.setAttribute("aria-label", t("passport.stamped", { trip: tripName(tr) }));
  s.append(el("i", "star"), el("b", "", tripName(tr)), el("i", "star"));
  return s;
}

export function createPassport(nav: Nav) {
  const pill = el("div", "top-pill glass", t("passport.title"));
  const back = roundButton("top-back", "passport.back", t("passport.back"), ICONS.back);

  // the book: the cover's gold title over the open page
  const book = el("div", "pp-book");
  const brand = el("div", "pp-brand", t("game.title"));
  const page = el("section", "pp-page");
  book.append(brand, page);

  // turning the pages
  const prev = roundButton("pp-prev", "passport.prev", t("passport.prev"), ICONS.chevron);
  const next = roundButton("pp-next", "passport.next", t("passport.next"), ICONS.chevron);
  const where = el("span", "pp-where glass");
  const turn = el("div", "pp-turn");
  turn.append(prev, where, next);

  // the stamp moment's way on, under the book
  const foot = el("div", "pp-foot");
  foot.hidden = true;

  const scroll = el("div", "scroll");
  scroll.append(book, turn);
  const screen = el("section", "screen menu-screen passport-screen");
  screen.hidden = true;
  screen.setAttribute("aria-label", t("passport.title"));
  screen.append(pill, back, scroll, foot);

  const viewer = createViewer();

  let at = 0; // the page open: an index into trips
  /** The trip whose stamp is about to land: its page shows the empty ring until then. */
  let landing: string | null = null;
  let timers: number[] = [];
  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers = timers.filter((x) => x !== id);
      fn();
    }, ms);
    timers.push(id);
  };

  function postcard(p: Place, tr: Trip): HTMLElement {
    // not visited yet (or not made yet): a blank card, its board number on it
    if (!p.won) {
      const pc = el("div", "pc locked");
      pc.setAttribute("role", "img");
      pc.setAttribute("aria-label", t("passport.locked", { n: p.board }));
      const card = el("span", "pc-card");
      card.append(el("span", "pc-n", String(p.board)));
      pc.append(card);
      return pc;
    }
    // visited, its postcard not drawn yet (the board names no destination yet): a postcard to come
    if (!p.dest) {
      const pc = el("div", "pc soon");
      pc.append(el("span", "pc-card"), el("b", "pc-name", t("passport.board", { n: p.board })), el("span", "pc-place", tripName(tr)));
      return pc;
    }
    const d = p.dest;
    const name = destinationName(d.id, d.title);
    const place = destinationPlace(d.id, d.place);
    const pc = el("button", "pc visited");
    pc.type = "button";
    pc.dataset.press = "passport.place";
    pc.setAttribute("aria-label", place ? `${name}, ${place}` : name);
    const card = el("span", "pc-card");
    const img = el("img");
    img.alt = "";
    img.draggable = false;
    img.decoding = "async";
    card.append(img);
    sizing.set(card, { img, d });
    cardSizes.observe(card);
    pc.append(card, el("b", "pc-name", name));
    if (place) pc.append(el("span", "pc-place", place));
    // seen big from the copy on screen, the full postcard swapped in once it lands (viewer.ts)
    pc.addEventListener("click", () => viewer.open(d, img.currentSrc || img.src));
    return pc;
  }

  function draw(): void {
    const tr = trips[at];
    for (const c of page.querySelectorAll(".pc-card")) cardSizes.unobserve(c);
    if (!tr) return void page.replaceChildren();
    const { done, all } = tripCount(tr);
    const head = el("div", "pp-head");
    const titles = el("div", "pp-titles");
    titles.append(el("h2", "pp-trip", tripName(tr)), el("span", "pp-count", t("passport.count", { done, all })));
    const spot = el("div", "pp-spot");
    if (tripDone(tr) && landing !== tr.id) spot.append(stampOf(tr));
    head.append(titles, spot);
    const grid = el("div", "pp-grid");
    for (const p of placesOf(tr)) grid.append(postcard(p, tr));
    page.replaceChildren(head, grid);
    page.setAttribute("aria-label", tripName(tr));
    where.textContent = t("passport.page", { n: at + 1, all: trips.length });
    prev.disabled = at === 0;
    next.disabled = at >= trips.length - 1;
    turn.hidden = trips.length < 2;
  }

  function turnTo(i: number): void {
    if (i < 0 || i >= trips.length || i === at || landing) return;
    const forward = i > at;
    at = i;
    draw();
    scroll.scrollTop = 0;
    if (!lessMotion()) {
      page.classList.remove("from-left", "from-right");
      void page.offsetWidth; // the class again starts the slide over
      page.classList.add(forward ? "from-right" : "from-left");
    }
  }
  // a slide or a thud plays once: its class goes when it ends, so another never starts it over
  page.addEventListener("animationend", (e) => e.target === page && page.classList.remove("from-left", "from-right", "thud"));
  prev.addEventListener("click", () => turnTo(at - 1));
  next.addEventListener("click", () => turnTo(at + 1));
  // a swipe across the page turns it (the page scrolls up and down as ever: touch-action pan-y)
  let down: { x: number; y: number; id: number } | null = null;
  page.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY, id: e.pointerId }));
  page.addEventListener("pointerup", (e) => {
    if (!down || down.id !== e.pointerId) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    down = null;
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) turnTo(at + (dx < 0 ? 1 : -1));
  });
  page.addEventListener("pointercancel", () => (down = null));

  /** Any stamp moment under way ends now, its stamp drawn where it belongs. */
  function settle(): void {
    for (const id of timers) clearTimeout(id);
    timers = [];
    const was = landing;
    landing = null;
    page.classList.remove("thud");
    if (was) draw();
  }

  back.addEventListener("click", () => {
    settle();
    foot.hidden = true;
    nav.home();
  });

  function open(trip?: Trip): void {
    settle();
    foot.hidden = true;
    const tr = trip ?? currentTrip();
    at = Math.max(0, tr ? trips.indexOf(tr) : 0);
    draw();
    scroll.scrollTop = 0;
    nav.show();
  }

  /** The stamp lands on the open page: the thud, the sparkle, its sound, then the way on. */
  function land(tr: Trip, after: AfterStamp): void {
    landing = null;
    const spot = page.querySelector(".pp-spot");
    if (!spot) return;
    const stamp = stampOf(tr);
    const calm = lessMotion();
    stamp.classList.add(calm ? "fading" : "landing");
    spot.replaceChildren(stamp);
    later(calm ? 0 : LAND_MS, () => {
      emit("trip:stamp", { trip: tr.id }); // Audio's thud under it
      if (calm) return;
      page.classList.add("thud");
      spot.append(...sparkles());
      later(400, () => page.classList.remove("thud"));
    });
    later((calm ? 0 : LAND_MS) + CARRY_ON_MS, () => {
      const b = el("button", "btn amber pp-on");
      b.type = "button";
      b.dataset.press = after.press;
      const words = el("span", "", after.label);
      if (after.trailing) b.append(words, after.icon);
      else b.append(after.icon, words);
      b.addEventListener("click", () => {
        foot.hidden = true;
        after.go();
      });
      foot.replaceChildren(b);
      foot.hidden = false;
    });
  }

  return {
    screen,
    viewer: viewer.element,
    /** Open at a trip's page (the one the player is on when none is named). */
    open,
    /**
     * The stamp moment: open at `tripId`'s page and stamp it, once. `after` is the button that
     * carries on once the stamp is down.
     */
    stamp(tripId: string, after: AfterStamp): void {
      const tr = tripById(tripId);
      if (!tr) return void after.go();
      settle();
      landing = tr.id;
      foot.hidden = true;
      at = trips.indexOf(tr);
      draw();
      scroll.scrollTop = 0;
      nav.show();
      later(STAMP_AT_MS, () => land(tr, after));
    },
    /** The record changed (a board won, the account's copy landed): redraw the page up, unless a stamp is landing on it. */
    redraw(): void {
      if (!screen.hidden && !landing && !timers.length) draw();
    },
    /** Leaving the passport some other way (the board, the Arcade): any stamp moment ends where it is. */
    leave(): void {
      settle();
      foot.hidden = true;
      viewer.close();
    },
    closeViewer: viewer.close,
  };
}

/** The little sparkle round a landed stamp: the board's twinkle (style.css, .twinkle), a few at once. */
function sparkles(): HTMLElement[] {
  const at = [
    { x: -6, y: 18, s: 26, d: 0 },
    { x: 104, y: 10, s: 22, d: 0.08 },
    { x: 96, y: 96, s: 28, d: 0.04 },
    { x: 4, y: 100, s: 20, d: 0.12 },
    { x: 50, y: -10, s: 18, d: 0.16 },
  ];
  return at.map((w) => {
    const tw = el("i", "twinkle");
    tw.setAttribute("aria-hidden", "true");
    tw.style.cssText = `left:${w.x}%;top:${w.y}%;--s:${w.s}px;animation-delay:${w.d}s`;
    return tw;
  });
}
