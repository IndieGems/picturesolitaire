// Home, as the travel game's front page (the creator, 2026-10-26: "change the home screen
// to match the travel aspect more"):
//
//   the title     Art's drawn wordmark (wordmark.ts)
//   itinerary     the trip the player is on, as a travel card: its name and "Stop 4 of 15",
//                 then its stops on a dotted path, five to a row, snaking down. A stop
//                 visited shows its postcard (the trip's passport pack, src/packs.ts); the
//                 next one pulses, with only its board number (its place is the board's
//                 reveal, never shown ahead); a hard or super hard board carries its tag
//                 (marks.ts); the last stop holds the trip's stamp, a faint outline until
//                 the trip is done
//                 A stamped trip's Souvenir still to play (souvenirs.ts) sits at the head's right
//                 end, its sticker and "Souvenir": a button on the information (docs/souvenirs.md)
//   Next stop     the amber button, with the board number under it
//   the dock      Daily (daily.ts), the passport (a booklet, with its count of stamps), the month's
//                 event (suitcase.ts: the Daily Suitcase, or the next one before it starts; in the
//                 challenge route's old place, the creator, 2026-10-27: the route's code stays,
//                 unreached from home) and, once the first board is done, the Shop (home-shop.ts:
//                 helpers, one or a pack of 3), as up to four tiles
//
// Every board won: the itinerary shows the trip of the board Play goes round to, every stop
// visited and the stamp earned, and the button says Play again.
//
// The itinerary is information (flat frosted glass, no lip, no shadow); the stops are drawn
// on it and take no touch. Only the buttons are buttons (the two materials, style.css).
//
// HOME APPEARS WHOLE (the creator, 2026-10-26, as Untangled does): the first screen waits
// for its pictures (the wordmark, the booklet and the visited stops' postcards, and the
// player's table behind it: tables.ts, tableChoiceRead), at most a moment (app.ts, startApp),
// then shows anyway; a picture that comes later fades in where its place already was, so
// nothing moves.

import { gem } from "../gem";
import { level as campaignLevel, levelCount } from "../game/levels";
import { campaignNext, progress } from "../net/progress";
import { ensureTrip, fileUrl, resident } from "../packs";
import { t } from "./i18n";
import { ICONS } from "./icons";
import { markOf, markTag, markWords } from "./marks";
import { stampUrl } from "./passport";
import { currentTrip, placesOf, tripDone, tripName, tripOf, trips, type Place, type Trip } from "./trips";
import { WORDMARK } from "./wordmark";

/** Home's own pictures besides the wordmark: Art's, in public/art. */
const ART = {
  /** The passport booklet on the Passport tile. */
  booklet: `${import.meta.env.BASE_URL}art/passport-booklet.webp`,
  /** The satchel on the Shop tile. */
  satchel: `${import.meta.env.BASE_URL}art/shop-satchel.webp`,
};

/** Stops to a row of the route. */
const PER_ROW = 5;

type Nav = {
  /** Next stop (or Play again): the board nextBoard() names. */
  play(): void;
  passport(): void;
  shop(): void;
};

type Parts = {
  /** home's note of a win from last time (app.ts), in the top row */
  note: HTMLElement;
  /** the month's event tile (suitcase.ts), hidden while there is no event to show */
  event: HTMLElement;
  /** the day's board's button (daily.ts), hidden until the day's board is known */
  daily: HTMLElement;
  /** a stamped trip's Souvenir still to play (souvenirs.ts), in the itinerary's head; hidden while there is none */
  souvenir: HTMLElement;
  /** Is the Shop on home (the first board done, so the helpers are known)? */
  shopShown(): boolean;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function glyph(svg: string): Node {
  const tpl = document.createElement("template");
  tpl.innerHTML = svg;
  return tpl.content.firstChild!;
}

/**
 * The Arcade is there, and its record of the player's progress has not landed yet. Only then
 * does home hold back the board: with no Arcade at all (a plain tab, the play-test tool), what
 * this page holds is all there is, board 1 on a fresh device.
 */
export const awaitingRecord = (): boolean => gem.frame.currentState === "connected" && !progress().known;

/** Every board of the campaign won once: its position is past the last (Play then goes round). */
export const allDone = (): boolean => campaignNext() > levelCount();

/**
 * The board Next stop opens: the campaign's next, or, every board won, the boards again in
 * order, keyed on the campaign wins the record keeps (the lead, 2026-10-25): no save of its own.
 */
export function nextBoard(): number {
  return allDone() ? (progress().campaign.won % levelCount()) + 1 : campaignNext();
}

/** A picture asked for once, decoded; the same promise every time (a failure settles too). */
const warmed = new Map<string, Promise<void>>();
function warm(url: string): Promise<void> {
  let p = warmed.get(url);
  if (!p) {
    const img = new Image();
    img.src = url;
    warmed.set(url, (p = img.decode().catch(() => undefined)));
  }
  return p;
}

export function createHome(nav: Nav, parts: Parts) {
  // ---- the title ----
  const wordmark = el("img", "wordmark");
  Object.assign(wordmark, { src: WORDMARK.small, alt: t("game.title"), width: 840, height: 420, draggable: false, decoding: "async" });
  const source = el("source");
  Object.assign(source, { media: WORDMARK.bigWhere, srcset: WORDMARK.big, width: 1400, height: 700 });
  const picture = el("picture");
  picture.append(source, wordmark);
  const title = el("h1");
  title.append(picture);

  // ---- the itinerary ----
  const itinerary = el("div", "itinerary glass");
  itinerary.setAttribute("role", "group");
  const head = el("div", "itinerary-head");
  const plane = glyph(ICONS.plane);
  const tripLine = el("b", "itinerary-trip");
  const countLine = el("span", "itinerary-count");
  const words = el("span", "itinerary-words");
  words.append(tripLine, countLine);
  head.append(plane, words, parts.souvenir);
  const route = el("div", "tr-route");
  route.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  path.classList.add("tr-path");
  const stops = el("ol", "tr-stops");
  route.append(path, stops);
  itinerary.append(head, route);

  // ---- Next stop ----
  const playWords = el("b", "", t("home.nextStop"));
  const playBoard = el("small");
  const playText = el("span", "words");
  playText.append(playWords, playBoard);
  const play = el("button", "btn amber play");
  play.type = "button";
  play.dataset.press = "home.play";
  play.append(glyph(ICONS.plane), playText);
  play.addEventListener("click", () => nav.play());

  // ---- the dock: Daily, the passport, the challenge route ----
  const bookletBox = el("span", "booklet");
  bookletBox.append(bookletImg(ART.booklet));
  const stampsLine = el("small");
  const passport = el("button", "btn tile-btn passport");
  passport.type = "button";
  passport.dataset.press = "home.passport";
  passport.append(bookletBox, el("span", "label", t("home.passport")), stampsLine);
  passport.addEventListener("click", () => nav.passport());
  // the Shop: Art's satchel, the Hint's magnifier peeking out
  const shopArt = el("span", "booklet");
  shopArt.append(bookletImg(ART.satchel));
  const shop = el("button", "btn tile-btn shop");
  shop.type = "button";
  shop.dataset.press = "home.shop";
  shop.append(shopArt, el("span", "label", t("home.shop")), el("small", "", t("home.shopLine")));
  shop.hidden = true;
  shop.addEventListener("click", () => nav.shop());
  parts.daily.classList.add("tile-btn");
  const dock = el("div", "dock");
  parts.event.classList.add("tile-btn");
  dock.append(parts.daily, passport, parts.event, shop);

  const screen = el("section", "screen home");
  screen.setAttribute("aria-label", t("game.title"));
  screen.append(parts.note, title, itinerary, play, dock);

  // a tablet's big column: home grows with it (style.css, --k), up to 1.7, never past what fits its height
  new ResizeObserver(() => {
    const w = screen.clientWidth;
    const h = screen.clientHeight;
    if (!w || !h) return;
    const k = Math.max(1, Math.min(1.7, w / 400, (h - 200) / 680));
    screen.style.setProperty("--k", k.toFixed(3));
  }).observe(screen);
  // the dotted path follows the stops wherever the layout puts them
  new ResizeObserver(() => drawPath()).observe(route);

  /** The visited stops' postcards of the route drawn now, decoding (home appears whole once they are in). */
  let pictures: Promise<void>[] = [];
  /** Which stop the path has reached (an index into the route's stops), for drawing it. */
  let reached = -1;

  function bookletImg(url: string): HTMLImageElement {
    const img = el("img");
    Object.assign(img, { src: url, alt: "", draggable: false, decoding: "async" });
    return img;
  }

  /** A visited stop's postcard, small: from the trip's pack once it is in, faded in when it lands. */
  function postcard(p: Place, tr: Trip): HTMLImageElement {
    const img = el("img");
    img.alt = "";
    img.draggable = false;
    const d = p.dest!;
    const put = () => {
      img.src = fileUrl(d.thumb);
      return img.decode().then(
        () => img.classList.add("in"),
        () => img.classList.add("in"),
      );
    };
    if (resident(d.thumb)) pictures.push(put());
    else pictures.push(ensureTrip(tr.id).then(put, () => undefined));
    return img;
  }

  /** One stop: its pin (the postcard, the board number, or the trip's stamp) and any hard tag. */
  function stop(p: Place, tr: Trip, k: number, last: boolean, next: number | null): HTMLElement {
    const row = Math.floor(k / PER_ROW);
    const col = row % 2 === 0 ? k % PER_ROW : PER_ROW - 1 - (k % PER_ROW);
    const state = p.won ? "visited" : !p.exists ? "soon" : p.board === next ? "next" : "ahead";
    const li = el("li", `tr-stop ${state}`);
    li.style.gridRow = String(row + 1);
    li.style.gridColumn = String(col + 1);
    if (p.board === next) li.classList.add("here");
    const pin = el("span", "tr-pin");
    // (while the record is on its way, `next` is null: bare stops, no numbers, so none of them change)
    if (p.won && p.dest) pin.append(postcard(p, tr));
    else if (!p.won && next !== null) pin.append(el("span", "n", String(p.board)));
    // the trip's stamp at its last stop: earned, Art's stamp over the postcard; else its faint outline
    if (last && next !== null) {
      li.classList.add("last");
      if (tripDone(tr)) {
        const s = el("img", "stamp");
        Object.assign(s, { src: stampUrl(tr), alt: "", draggable: false });
        s.addEventListener("error", () => s.remove(), { once: true });
        li.classList.add("earned");
        li.append(s);
      } else {
        const ghost = el("i", "ghost");
        // absolute: a relative address ("./" in a build) in a CSS url() would be read from the stylesheet's folder
        ghost.style.setProperty("--stamp", `url("${new URL(stampUrl(tr), location.href).href}")`);
        pin.prepend(ghost);
      }
    }
    li.prepend(pin);
    const m = p.id ? markOf({ id: p.id }) : null;
    if (m) li.append(markTag(m, true));
    return li;
  }

  /** The dotted path through the stops' middles, turning at the end of each row; walked to the next stop. */
  function drawPath(): void {
    const pins = [...stops.querySelectorAll<HTMLElement>(".tr-pin")];
    const box = route.getBoundingClientRect();
    if (!pins.length || !box.width) return path.replaceChildren();
    const at = pins.map((p) => {
      const r = p.getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top, r: r.width / 2 };
    });
    path.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    const NS = "http://www.w3.org/2000/svg";
    const segs: SVGPathElement[] = [];
    for (let k = 0; k + 1 < at.length; k++) {
      const a = at[k]!;
      const b = at[k + 1]!;
      let d: string;
      if (Math.abs(a.y - b.y) < 1) d = `M${a.x} ${a.y} L${b.x} ${b.y}`;
      else {
        // a row's end: a loop out past the stop and back in under it
        const out = Math.sign(a.x - box.width / 2) * Math.max(a.r * 1.35, 16);
        d = `M${a.x} ${a.y} C${a.x + out} ${a.y} ${b.x + out} ${b.y} ${b.x} ${b.y}`;
      }
      const s = document.createElementNS(NS, "path");
      s.setAttribute("d", d);
      s.setAttribute("class", k < reached ? "walked" : "ahead");
      segs.push(s);
    }
    path.replaceChildren(...segs);
  }

  /** Draw home as the record says now. */
  function draw(): void {
    const waiting = awaitingRecord();
    const done = !waiting && allDone();
    const next = waiting ? null : nextBoard();
    // the trip on the itinerary: the one the player is on; every board won, the one Play goes round to
    const tr = waiting ? currentTrip() : done ? (tripOf(next!) ?? trips[trips.length - 1]) : currentTrip();
    pictures = [];
    if (!tr) {
      itinerary.hidden = true;
    } else {
      itinerary.hidden = false;
      const places = placesOf(tr);
      const at = places.findIndex((p) => p.board === next);
      reached = waiting ? -1 : done ? places.length - 1 : at;
      tripLine.textContent = waiting ? " " : tripName(tr);
      countLine.textContent = waiting
        ? " "
        : done
          ? t("home.allDone")
          : t("home.stop", { n: at + 1, all: places.length });
      itinerary.setAttribute("aria-label", waiting ? "" : `${tripLine.textContent}: ${countLine.textContent}`);
      itinerary.classList.toggle("waiting", waiting);
      stops.replaceChildren(...places.map((p, k) => stop(p, tr, k, k === places.length - 1, waiting ? null : next)));
      stops.style.gridTemplateRows = `repeat(${Math.ceil(places.length / PER_ROW)}, auto)`;
      requestAnimationFrame(drawPath);
    }
    // Next stop, and the board it opens (never the place: that is the board's reveal)
    playWords.textContent = t(done ? "home.again" : "home.nextStop");
    const m = next ? markOf(campaignLevel(next)) : null;
    playBoard.textContent = next ? (m ? t("home.boardMarked", { n: next, mark: markWords(m) }) : t("home.board", { n: next })) : t("home.board", { n: "–" });
    play.setAttribute("aria-label", `${playWords.textContent}: ${playBoard.textContent}`);
    // the passport's stamps so far
    const stamped = trips.filter(tripDone).length;
    stampsLine.textContent = t("home.stamps", { count: stamped });
    passport.setAttribute("aria-label", `${t("home.passport")}: ${stampsLine.textContent}`);
    shop.hidden = !parts.shopShown();
  }

  /** The press is answered at once while the board's pictures come ("Opening…"), and put back after. */
  function opening(on: boolean): void {
    if (on) {
      play.setAttribute("aria-busy", "true");
      playWords.textContent = t("home.opening");
    } else {
      play.removeAttribute("aria-busy");
      playWords.textContent = t(allDone() && !awaitingRecord() ? "home.again" : "home.nextStop");
    }
  }

  /** Home's own pictures, asked for once; settles once they are decoded. */
  let art: Promise<unknown> | null = null;
  const warmArt = () => (art ??= Promise.all([wordmark.decode().catch(() => undefined), warm(ART.booklet), warm(ART.satchel)]));

  return {
    screen,
    draw,
    opening,
    /** Ask for home's own pictures now (the boot does, beside the save), so they arrive during its wait. */
    warmArt,
    /** Settles once home's pictures are in: its own and the route's postcards, as drawn last. */
    whole: (): Promise<unknown> => Promise.all([warmArt(), ...pictures]),
  };
}
