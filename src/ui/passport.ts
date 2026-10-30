// The passport (the travelogue, the creator 2026-10-25): it replaces the albums. Every
// place the player has visited, as a small postcard, one page per trip, in order:
//
//   the cover   the game's name in gold on a navy cover, the open page under it
//   a page      the trip's name, how many of its places are visited, the trip's stamp
//               once every board of it is won (an empty dashed ring until then), and
//               its places: a visited one as its postcard, with its name and where it
//               is; one not visited yet as a blank card with its board number
//   a postcard  tapped, it opens big (viewer.ts), the only place the full picture is fetched
//   pages       ‹ and › at the top of the page, over the trip's title (never a scroll away;
//               QA, 2026-10-26), or a swipe across the page
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
// SOUVENIRS (docs/souvenirs.md, 2026-10-28): a stamped trip with a Souvenir (souvenirs.ts) shows it on
// its page: "Play the Souvenir" under the trip's name until it is won, then its sticker, stuck on the
// page by the stamp. The stamp moment's way on offers it too, beside Next trip (still the main
// action). THE STICKER MOMENT: a Souvenir's first win ends its card on "Add the sticker" (app.ts),
// which opens its trip's page; the sticker presses down onto it beside the stamp, and
// `souvenir:sticker` goes out at the touch, for its sound (agreed with Audio: the page still for
// 550 ms, then 300 ms down, the way on 650 ms after). Less motion: it fades in, the sound with it.
//
// Its top row is every screen's: the title on the left, Back then the gear at the right
// end. A trip's stamp is Art's drawing, public/art/stamps/stamp-<trip id>.webp (300 px
// square, drawn upright; the page tilts it); a trip with none yet, or one that does not
// load, gets an inked ring with the trip's name, drawn in CSS. A postcard keeps its own
// shape: a 4x5 board's is taller than a 4x4's.

import { ICONS } from "./icons";
import { liveAttr, liveText, t } from "./i18n";
import { emit } from "../events";
import { copyUrl, destinationName, destinationPlace, sharpCopy, type Copy, type Destination } from "./catalogue";
import { createViewer } from "./viewer";
import { ensureTrip, resident } from "../packs";
import { currentTrip, loadTripOf, placesOf, tripById, tripCount, tripDone, tripName, tripPlace, trips, type Place, type Trip } from "./trips";
import { souvenirOf, souvenirOpen, souvenirWon, souvenirWords, stickerReady, stickerUrl } from "./souvenirs";

type Nav = {
  /** Back: to home. */
  home(): void;
  /** Show the passport's screen. */
  show(): void;
  /** Play trip `trip`'s Souvenir (its page's button, or the stamp moment's). */
  souvenir(trip: string): void;
};

/** What the stamp moment's button does once the stamp is down. */
export interface AfterStamp {
  label: string;
  /** Its glyph, before the label (after it with `trailing`: an arrow on). */
  icon: Node;
  trailing?: boolean;
  press: string;
  go(): void;
  /** Also offer the trip's Souvenir beside it (the stamp moment), when it has one still to play. */
  souvenir?: boolean;
  /** The moment is over: the stamp (or sticker) is down and the way on is up (app.ts: an unlock card waits for it). */
  landed?: () => void;
}

/** When the stamp starts down after the page is up, and when it lands (style.css, pp-stamp-land). */
const STAMP_AT_MS = 550;
/** The longest the stamp waits for its drawing to load (then the ring stands in, or it pops in late). */
const STAMP_WAIT_MS = 1500;
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
    // the sharp copy where it is loaded (a built game's passport pack holds the passport copy), else that
    let { copy, url } = sharpCopy(it.d, width, height);
    if (!resident(copy.file)) {
      const thumb = it.d.copies.find((c) => c.file === it.d.thumb);
      if (!thumb || !resident(thumb.file)) continue;
      copy = thumb;
      url = copyUrl(thumb);
    }
    if (it.copy && copy.w * copy.h <= it.copy.w * it.copy.h) continue;
    it.copy = copy;
    it.img.src = url;
  }
});

/** Art's stamp for a trip (home draws it too, at the route's last stop). */
export const stampUrl = (tr: Trip) => `${import.meta.env.BASE_URL}art/stamps/stamp-${tr.id}.webp`;

/** Load and decode a trip's stamp ahead of the moment it lands (a failure resolves too: the ring stands in). */
function stampReady(tr: Trip): Promise<void> {
  const img = new Image();
  img.src = stampUrl(tr);
  return img.decode().catch(() => undefined);
}

/** A trip's stamp: Art's drawing, or (none yet, or it does not load) the trip's name in an inked double ring. */
function stampOf(tr: Trip): HTMLElement {
  const s = el("div", "pp-stamp art");
  s.setAttribute("role", "img");
  s.setAttribute("aria-label", t("passport.stamped", { trip: tripName(tr) }));
  const img = el("img");
  img.alt = "";
  img.draggable = false;
  img.addEventListener("error", () => {
    s.classList.remove("art");
    s.replaceChildren(el("i", "star"), el("b", "", tripName(tr)), el("i", "star"));
  }, { once: true });
  img.src = stampUrl(tr);
  s.append(img);
  return s;
}

export function createPassport(nav: Nav) {
  const pill = liveText(el("div", "top-pill glass"), "passport.title");
  const back = liveAttr(roundButton("top-back", "passport.back", "", ICONS.back), "aria-label", "passport.back");

  // the book: the cover's gold title over the open page
  const book = el("div", "pp-book");
  const brand = el("div", "pp-brand", t("game.title"));
  const page = el("section", "pp-page");
  book.append(brand, page);
  // what turns with the page (its title, stamp and postcards): the keys above it stay put
  const content = el("div", "pp-content");

  // turning the pages
  const prev = liveAttr(roundButton("pp-prev", "passport.prev", "", ICONS.chevron), "aria-label", "passport.prev");
  const next = liveAttr(roundButton("pp-next", "passport.next", "", ICONS.chevron), "aria-label", "passport.next");
  const where = el("span", "pp-where glass");
  const turn = el("div", "pp-turn");
  turn.append(prev, where, next);
  page.append(turn, content);

  // the stamp moment's way on, under the book
  const foot = el("div", "pp-foot");
  foot.hidden = true;

  const scroll = el("div", "scroll");
  scroll.append(book);
  const screen = el("section", "screen menu-screen passport-screen");
  screen.hidden = true;
  liveAttr(screen, "aria-label", "passport.title");
  screen.append(pill, back, scroll, foot);

  const viewer = createViewer();

  let at = 0; // the page open: an index into trips
  /** The trip whose stamp is about to land: its page shows the empty ring until then. */
  let landing: string | null = null;
  /** The trip whose Souvenir sticker is about to land: its page shows none until then. */
  let sticking: string | null = null;
  let timers: number[] = [];
  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers = timers.filter((x) => x !== id);
      fn();
    }, ms);
    timers.push(id);
  };

  /** The postcard's shape: its board's, in cards (style.css draws it in the card's aspect). */
  function shape(pc: HTMLElement, p: Place): void {
    pc.style.setProperty("--c", String(p.cols));
    pc.style.setProperty("--r", String(p.rows));
  }

  function postcard(p: Place, tr: Trip): HTMLElement {
    // not visited yet (or not made yet): a blank card, its board number on it
    if (!p.won) {
      const pc = el("div", "pc locked");
      shape(pc, p);
      pc.setAttribute("role", "img");
      pc.setAttribute("aria-label", t("passport.locked", { n: p.board }));
      const card = el("span", "pc-card");
      card.append(el("span", "pc-n", String(p.board)));
      pc.append(card);
      return pc;
    }
    // visited, its postcard coming with its trip's boards (a moment, the page then drawn again): the
    // card alone, so no words are read that change under the player
    if (!p.dest && p.coming) {
      const pc = el("div", "pc soon");
      shape(pc, p);
      pc.append(el("span", "pc-card"));
      return pc;
    }
    // visited, its postcard not drawn yet (the board names no destination yet): a postcard to come
    if (!p.dest) {
      const pc = el("div", "pc soon");
      shape(pc, p);
      pc.append(el("span", "pc-card"), el("b", "pc-name", t("passport.board", { n: p.board })), el("span", "pc-place", tripPlace(tr)));
      return pc;
    }
    const d = p.dest;
    const name = destinationName(d.id, d.title);
    const place = destinationPlace(d.id, d.place);
    const pc = el("button", "pc visited");
    shape(pc, p);
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
    pc.addEventListener("click", () => viewer.open(d, img.currentSrc || img.src, p.id ?? undefined));
    return pc;
  }

  function draw(): void {
    const tr = trips[at];
    for (const c of page.querySelectorAll(".pc-card")) cardSizes.unobserve(c);
    if (!tr) return void content.replaceChildren();
    const { done, all } = tripCount(tr);
    const head = el("div", "pp-head");
    const titles = el("div", "pp-titles");
    titles.append(el("h2", "pp-trip", tripName(tr)), el("span", "pp-count", t("passport.count", { done, all })));
    const spot = el("div", "pp-spot");
    if (tripDone(tr) && landing !== tr.id) spot.append(stampOf(tr));
    // its Souvenir, once the trip is stamped: the sticker when won (unless it is about to land), else the way to play it
    const sv = landing !== tr.id && souvenirOpen(tr.id) ? souvenirOf(tr.id) : null;
    if (sv && souvenirWon(sv.board.id)) {
      if (sticking !== tr.id) spot.append(stickerOf(tr));
    } else if (sv) {
      const b = el("button", "btn pp-souvenir");
      b.type = "button";
      b.dataset.press = "passport.souvenir";
      const img = el("img", "sv-sticker");
      img.alt = "";
      img.draggable = false;
      void stickerReady(sv.art).then((src) => (img.src = src));
      b.append(img, el("span", "", t("souvenir.play")));
      b.setAttribute("aria-label", t("souvenir.playAria", { theme: souvenirWords(tr.id).theme }));
      b.addEventListener("click", () => nav.souvenir(tr.id));
      titles.append(b);
    }
    head.append(titles, spot);
    const grid = el("div", "pp-grid");
    const places = placesOf(tr);
    // the page's postcards come with its trip's boards (a trip at a time): the page is drawn again once
    // they are in, if it is still the one open and nothing is landing on it
    if (places.some((p) => p.coming))
      void loadTripOf(tr).then((came) => {
        if (came && trips[at] === tr && !landing && !sticking) draw();
      });
    for (const p of places) grid.append(postcard(p, tr));
    // a built game: the trip's passport copies come in one pack; each postcard picks its picture again
    // once it is in (observing a card anew reports its size), the page itself left as it is
    if (places.some((p) => p.won && p.dest && !resident(p.dest.thumb)))
      void ensureTrip(tr.id).then(
        () => {
          for (const c of grid.querySelectorAll(".pc-card")) {
            cardSizes.unobserve(c);
            cardSizes.observe(c);
          }
        },
        () => {},
      );
    content.replaceChildren(head, grid);
    page.setAttribute("aria-label", tripName(tr));
    where.textContent = t("passport.page", { n: at + 1, all: trips.length });
    prev.disabled = at === 0;
    next.disabled = at >= trips.length - 1;
    turn.hidden = trips.length < 2;
  }

  function turnTo(i: number): void {
    if (i < 0 || i >= trips.length || i === at || landing || sticking) return;
    const forward = i > at;
    at = i;
    draw();
    scroll.scrollTop = 0;
    if (!lessMotion()) {
      content.classList.remove("from-left", "from-right");
      void content.offsetWidth; // the class again starts the slide over
      content.classList.add(forward ? "from-right" : "from-left");
    }
  }
  // a slide or a thud plays once: its class goes when it ends, so another never starts it over
  content.addEventListener("animationend", (e) => e.target === content && content.classList.remove("from-left", "from-right"));
  page.addEventListener("animationend", (e) => e.target === page && page.classList.remove("thud"));
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
    const was = landing ?? sticking;
    landing = null;
    sticking = null;
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
      const sv = after.souvenir && souvenirOpen(tr.id) ? souvenirOf(tr.id) : null;
      wayOn(after, sv && !souvenirWon(sv.board.id) ? tr.id : null);
    });
  }

  /** The moment's way on, under the book: one amber button; with a Souvenir to play, "Play the Souvenir" before it. */
  function wayOn(after: AfterStamp, souvenir: string | null): void {
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
    const kids: HTMLElement[] = [b];
    const art = souvenir ? souvenirOf(souvenir)?.art : undefined;
    if (souvenir && art) {
      const sv = el("button", "btn pp-on-souvenir");
      sv.type = "button";
      sv.dataset.press = "passport.souvenirAfterStamp";
      const img = el("img", "sv-sticker");
      img.alt = "";
      img.draggable = false;
      void stickerReady(art).then((src) => (img.src = src));
      sv.append(img, el("span", "", t("souvenir.play")));
      sv.setAttribute("aria-label", t("souvenir.playAria", { theme: souvenirWords(souvenir).theme }));
      sv.addEventListener("click", () => {
        foot.hidden = true;
        nav.souvenir(souvenir);
      });
      kids.unshift(sv);
    }
    foot.classList.toggle("two", kids.length > 1);
    foot.replaceChildren(...kids);
    foot.hidden = false;
    after.landed?.();
  }

  /** A trip's Souvenir sticker, stuck on its page by the stamp. */
  function stickerOf(tr: Trip): HTMLElement {
    const sv = souvenirOf(tr.id);
    const box = el("div", "pp-sticker");
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", t("souvenir.stickerAria", { theme: souvenirWords(tr.id).theme }));
    const img = el("img");
    img.alt = "";
    img.draggable = false;
    if (sv) {
      img.src = stickerUrl(sv.art);
      void stickerReady(sv.art).then((src) => {
        if (img.src !== src) img.src = src;
      });
    }
    box.append(img);
    return box;
  }

  /** The sticker presses down onto the open page: its sound at the touch, a twinkle, then the way on. */
  function stick(tr: Trip, after: AfterStamp): void {
    sticking = null;
    const spot = page.querySelector(".pp-spot");
    if (!spot) return;
    const sticker = stickerOf(tr);
    const calm = lessMotion();
    sticker.classList.add(calm ? "fading" : "sticking");
    spot.append(sticker);
    later(calm ? 0 : LAND_MS, () => {
      emit("souvenir:sticker", { trip: tr.id }); // Audio's press and sparkle under it
      if (calm) return;
      spot.append(...sparkles());
    });
    later((calm ? 0 : LAND_MS) + CARRY_ON_MS, () => wayOn(after, null));
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
      // it lands once the page has been seen a moment and its drawing is ready (a slow one is not waited on long)
      const ready = Promise.race([stampReady(tr), new Promise<void>((r) => setTimeout(r, STAMP_WAIT_MS))]);
      later(STAMP_AT_MS, () => void ready.then(() => landing === tr.id && land(tr, after)));
    },
    /**
     * The sticker moment: open at `tripId`'s page and press its Souvenir's sticker on, once. `after`
     * is the button that carries on once it is down.
     */
    sticker(tripId: string, after: AfterStamp): void {
      const tr = tripById(tripId);
      const sv = souvenirOf(tripId);
      if (!tr || !sv) return void after.go();
      settle();
      sticking = tr.id;
      foot.hidden = true;
      at = trips.indexOf(tr);
      draw();
      scroll.scrollTop = 0;
      nav.show();
      const ready = Promise.race([
        stickerReady(sv.art).then((src) => {
          const img = new Image();
          img.src = src;
          return img.decode().catch(() => undefined);
        }),
        new Promise<void>((r) => setTimeout(r, STAMP_WAIT_MS)),
      ]);
      later(STAMP_AT_MS, () => void ready.then(() => sticking === tr.id && stick(tr, after)));
    },
    /** The record changed (a board won, the account's copy landed): redraw the page up, unless a stamp or sticker is landing on it. */
    redraw(): void {
      if (!screen.hidden && !landing && !sticking && !timers.length) draw();
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
