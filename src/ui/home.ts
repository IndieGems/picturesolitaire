// Home, as the travel game's front page (the creator, 2026-10-26: "change the home screen
// to match the travel aspect more"):
//
//   the title     Art's drawn wordmark (wordmark.ts); at its right, once the first board is done, the
//                 round gold VIP badge (vip-about.ts: what VIP gives, here and across the Gem Arcade;
//                 the creator, 2026-11-02), the wordmark kept centred with a badge's room each side
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
//   the event     a strip just above the dock (suitcase.ts: the two-week VIP event, or the next one
//                 before it starts; locked, with the VIP tag, for a player who is not a VIP): the
//                 creator's pick, 2026-10-30, since five tiles do not fit across a phone
//   the dock      Daily (daily.ts: the Daily page, today's puzzle, the past days and today's
//                 friends), the passport (a booklet, with its count of stamps) and, once the first
//                 board is done, the Shop
//                 (home-shop.ts: helpers, one or a pack of 3) and Cosmetics (cosmetics.ts: tables and
//                 soundtracks; the creator, 2026-10-29), as up to four tiles
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
import { levelCount } from "../game/levels";
import { campaignNext, progress } from "../net/progress";
import { liveText, t } from "./i18n";
import { ICONS } from "./icons";
import { createItinerary, warm } from "./itinerary";
import { markAt, markWords } from "./marks";
import { currentTrip, tripDone, tripOf, trips } from "./trips";
import { WORDMARK } from "./wordmark";

/** Home's own pictures besides the wordmark: Art's, in public/art. */
const ART = {
  /** The passport booklet on the Passport tile. */
  booklet: `${import.meta.env.BASE_URL}art/passport-booklet.webp`,
  /** The satchel on the Shop tile. */
  satchel: `${import.meta.env.BASE_URL}art/shop-satchel.webp`,
  /** The gramophone and the rolled poster on the Cosmetics tile. */
  cosmetics: `${import.meta.env.BASE_URL}art/cosmetics-tile.webp`,
};

type Nav = {
  /** Next stop (or Play again): the board nextBoard() names. */
  play(): void;
  passport(): void;
  shop(): void;
  cosmetics(): void;
};

type Parts = {
  /** home's note of a win from last time (app.ts), in the top row */
  note: HTMLElement;
  /** the event's strip (suitcase.ts), above the dock, hidden while there is no event to show */
  event: HTMLElement;
  /** the day's board's button (daily.ts), hidden until the day's board is known */
  daily: HTMLElement;
  /** a stamped trip's Souvenir still to play (souvenirs.ts), in the itinerary's head; hidden while there is none */
  souvenir: HTMLElement;
  /** Is the Shop on home (the first board done, so the helpers are known)? */
  shopShown(): boolean;
  /** the VIP badge (vip-about.ts), beside the title */
  vipBadge: HTMLElement;
  /** Show the VIP badge or not: with the Shop, past the guided start. */
  vipShown(on: boolean): void;
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

export { warmTripStamp } from "./itinerary";

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
  // the VIP badge at the title's right (vip-about.ts; the creator, 2026-11-02), once the first board is done:
  // the row keeps the wordmark centred, a badge's width of room on each side while the badge shows
  const titleRow = el("div", "home-title");
  titleRow.append(title, parts.vipBadge);

  // ---- the itinerary (itinerary.ts), a stamped trip's Souvenir at its head's right end ----
  const itin = createItinerary({ extra: parts.souvenir, redraw: () => draw() });
  const itinerary = itin.element;

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
  passport.append(bookletBox, liveText(el("span", "label"), "home.passport"), stampsLine);
  passport.addEventListener("click", () => nav.passport());
  // the Shop: Art's satchel, the Hint's magnifier peeking out
  const shopArt = el("span", "booklet");
  shopArt.append(bookletImg(ART.satchel));
  const shop = el("button", "btn tile-btn shop");
  shop.type = "button";
  shop.dataset.press = "home.shop";
  shop.append(shopArt, liveText(el("span", "label"), "home.shop"), liveText(el("small"), "home.shopLine"));
  shop.hidden = true;
  shop.addEventListener("click", () => nav.shop());
  // Cosmetics: Art's gramophone and rolled travel poster; shown with the Shop
  const cosmeticsArt = el("span", "booklet");
  cosmeticsArt.append(bookletImg(ART.cosmetics));
  const cosmetics = el("button", "btn tile-btn cosmetics");
  cosmetics.type = "button";
  cosmetics.dataset.press = "home.cosmetics";
  cosmetics.append(cosmeticsArt, liveText(el("span", "label"), "home.cosmetics"), liveText(el("small"), "home.cosmeticsLine"));
  cosmetics.hidden = true;
  cosmetics.addEventListener("click", () => nav.cosmetics());
  parts.daily.classList.add("tile-btn");
  const dock = el("div", "dock");
  dock.append(parts.daily, passport, shop, cosmetics);

  const screen = el("section", "screen home");
  screen.setAttribute("aria-label", t("game.title"));
  // the event and the dock together (style.css: nothing of their own in the column, display: contents;
  // the wide layout's sidebar, wide.css)
  const side = el("div", "home-side");
  side.append(parts.event, dock);
  screen.append(parts.note, titleRow, itinerary, play, side);

  // a tablet's big column: home grows with it (style.css, --k), up to 1.7, never past what fits its height
  new ResizeObserver(() => {
    const w = screen.clientWidth;
    const h = screen.clientHeight;
    if (!w || !h) return;
    const k = Math.max(1, Math.min(1.7, w / 400, (h - 200) / 680));
    screen.style.setProperty("--k", k.toFixed(3));
  }).observe(screen);
  // the itinerary's own: its path and its head, after home's --k as ever
  itin.observe();

  function bookletImg(url: string): HTMLImageElement {
    const img = el("img");
    Object.assign(img, { src: url, alt: "", draggable: false, decoding: "async" });
    return img;
  }

  /** Draw home as the record says now. */
  function draw(): void {
    const waiting = awaitingRecord();
    const done = !waiting && allDone();
    const next = waiting ? null : nextBoard();
    // the trip on the itinerary: the one the player is on; every board won, the one Play goes round to
    const tr = waiting ? currentTrip() : done ? (tripOf(next!) ?? trips[trips.length - 1]) : currentTrip();
    itin.draw(tr, next, waiting, done);
    // Next stop, and the board it opens (never the place: that is the board's reveal)
    playWords.textContent = t(done ? "home.again" : "home.nextStop");
    const m = next ? markAt(next) : null;
    playBoard.textContent = next ? (m ? t("home.boardMarked", { n: next, mark: markWords(m) }) : t("home.board", { n: next })) : t("home.board", { n: "–" });
    play.setAttribute("aria-label", `${playWords.textContent}: ${playBoard.textContent}`);
    // the passport's stamps so far
    const stamped = trips.filter(tripDone).length;
    stampsLine.textContent = t("home.stamps", { count: stamped });
    passport.setAttribute("aria-label", `${t("home.passport")}: ${stampsLine.textContent}`);
    shop.hidden = !parts.shopShown();
    cosmetics.hidden = !parts.shopShown();
    parts.vipShown(parts.shopShown());
    titleRow.classList.toggle("with-badge", parts.shopShown());
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
  const warmArt = () => (art ??= Promise.all([wordmark.decode().catch(() => undefined), warm(ART.booklet), warm(ART.satchel), warm(ART.cosmetics)]));

  return {
    screen,
    draw,
    opening,
    /** Ask for home's own pictures now (the boot does, beside the save), so they arrive during its wait. */
    warmArt,
    /** Settles once home's pictures are in: its own and the route's postcards, as drawn last. */
    whole: (): Promise<unknown> => Promise.all([warmArt(), ...itin.pictures()]),
  };
}
