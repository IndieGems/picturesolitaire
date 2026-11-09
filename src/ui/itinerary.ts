// A TRIP AS A TRAVEL CARD (the itinerary): its name and "Stop 4 of 15", then its stops on a dotted path,
// five to a row, snaking down. A stop visited shows its postcard (the trip's passport pack, src/packs.ts);
// the next one pulses, with only its board number (its place is the board's reveal, never shown ahead); a
// hard or super hard board carries its tag (marks.ts); the last stop holds the trip's stamp, a faint
// outline until the trip is done.
//
// Home draws one (home.ts), with a stamped trip's Souvenir at its head's right end; the wide layout's level
// screen draws another beside the board (trip-side.ts), the level in play as its next stop. It is
// information (flat frosted glass, no lip, no shadow); the stops are drawn on it and take no touch.

import { ensureTrip, fileUrl, resident } from "../packs";
import { t } from "./i18n";
import { ICONS } from "./icons";
import { markOf, markTag } from "./marks";
import { stampUrl } from "./passport";
import { loadTripOf, placesOf, tripDone, tripName, type Place, type Trip } from "./trips";

/** Stops to a row of the route. */
const PER_ROW = 5;

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
 * A picture asked for once, decoded; the same promise every time (a failure settles too). `cors`: as
 * a CSS mask asks for it (the stamp's outline, style.css .ghost), in CORS mode, which a plain image's
 * copy does not serve, so the warm-up must ask the same way or the file comes twice (QA, 0.51.0).
 */
const warmed = new Map<string, Promise<void>>();
export function warm(url: string, cors = false): Promise<void> {
  const key = cors ? `cors ${url}` : url;
  let p = warmed.get(key);
  if (!p) {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.src = url;
    warmed.set(key, (p = img.decode().catch(() => undefined)));
  }
  return p;
}
/** Trip `tr`'s stamp as its last stop draws it: Art's picture once earned (an <img>), else its outline (a CSS mask). */
const warmStamp = (tr: Trip): Promise<void> => warm(new URL(stampUrl(tr), location.href).href, !tripDone(tr));

/**
 * Ask for trip `tr`'s stamp now (home's last stop draws it, and home waits for it): the boot knows the
 * trip from the record before the trip's boards arrive, so the two come together (QA, 0.49.0: asked
 * for only once they had, it held home ~0.2 s on 4G).
 */
export function warmTripStamp(tr: Trip): void {
  void warmStamp(tr);
}

/**
 * An itinerary card. `extra`: something of the owner's at its head's right end (home's Souvenir tile);
 * `redraw`: the trip's postcards came in after a draw that had to leave them out, so the owner draws again.
 * `observe()` starts its own resize watching (home calls it where it always did, after its own).
 */
export function createItinerary(o: { extra?: HTMLElement; redraw(): void }) {
  const itinerary = el("div", "itinerary glass");
  itinerary.setAttribute("role", "group");
  const head = el("div", "itinerary-head");
  const plane = glyph(ICONS.plane);
  const tripLine = el("b", "itinerary-trip");
  const countLine = el("span", "itinerary-count");
  const words = el("span", "itinerary-words");
  words.append(tripLine, countLine);
  head.append(plane, words, ...(o.extra ? [o.extra] : []));
  const route = el("div", "tr-route");
  route.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  path.classList.add("tr-path");
  const stops = el("ol", "tr-stops");
  route.append(path, stops);
  itinerary.append(head, route);
  /**
   * The trip's name on its one line in the head, above the stub's tear: a size smaller where it will not
   * fit ("Путешествие по Америке", "Wielka Brytania i Irlandia"); still too long, it wraps between words and
   * the head grows, the tear's notches moving down with it. The head grows too where its words are taller
   * than it for any other reason ("Остановка 1 из 15" on two lines beside a Souvenir, under a short phone's
   * shorter head: style.css), never letting a line sit on the tear. Measured, never guessed, at each draw
   * and resize.
   */
  const fitTrip = (): void => {
    tripLine.classList.remove("long", "wrap");
    itinerary.classList.remove("grown");
    itinerary.style.removeProperty("--tear");
    if (itinerary.hidden || !tripLine.clientWidth) return;
    const over = () => tripLine.scrollWidth > tripLine.clientWidth + 1;
    if (over()) {
      tripLine.classList.add("long");
      if (over()) tripLine.classList.add("wrap");
    }
    if (!tripLine.classList.contains("wrap") && words.scrollHeight <= head.clientHeight) return;
    itinerary.classList.add("grown");
    itinerary.style.setProperty("--tear", `${Math.ceil(head.scrollHeight)}px`);
  };

  /** The visited stops' postcards of the route drawn now, decoding (home appears whole once they are in). */
  let pictures: Promise<void>[] = [];
  /** Which stop the path has reached (an index into the route's stops), for drawing it. */
  let reached = -1;

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
    // the route's two edge columns: a mark too wide for its stop stays inside the card (style.css)
    if (col === 0) li.classList.add("edge-l");
    if (col === PER_ROW - 1) li.classList.add("edge-r");
    if (p.board === next) li.classList.add("here");
    const pin = el("span", "tr-pin");
    // (while the record is on its way, `next` is null: bare stops, no numbers, so none of them change)
    if (p.won && p.dest) pin.append(postcard(p, tr));
    else if (!p.won && next !== null) pin.append(el("span", "n", String(p.board)));
    // the trip's stamp at its last stop: earned, Art's stamp over the postcard; else its faint outline
    if (last && next !== null) {
      li.classList.add("last");
      // home appears with it (QA, 0.47.0: on 4G the outline came ~0.7 s after home)
      pictures.push(warmStamp(tr));
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

  /** Watch its own size: the dotted path follows the stops wherever the layout puts them, the head its words. */
  function observe(): void {
    new ResizeObserver(() => drawPath()).observe(route);
    new ResizeObserver(() => fitTrip()).observe(head);
    // and when its words change size (a Souvenir arriving beside them wraps the count): the head never measures stale
    new ResizeObserver(() => fitTrip()).observe(words);
  }

  /**
   * Trip `tr` (none: the card hides), `next` the stop that pulses (null while the record is on its way:
   * `waiting`, bare stops and no words); `done`, every board of the campaign won: "All done".
   */
  function draw(tr: Trip | undefined, next: number | null, waiting: boolean, done: boolean): void {
    pictures = [];
    if (!tr) {
      itinerary.hidden = true;
      return;
    }
    itinerary.hidden = false;
    const places = placesOf(tr);
    // the trip's postcards come with its boards (a trip at a time): drawn again once they are in
    if (places.some((p) => p.coming)) void loadTripOf(tr).then((came) => came && o.redraw());
    const at = places.findIndex((p) => p.board === next);
    reached = waiting ? -1 : done ? places.length - 1 : at;
    tripLine.textContent = waiting ? " " : tripName(tr);
    countLine.textContent = waiting
      ? " "
      : done
        ? t("home.allDone")
        : t("home.stop", { n: at + 1, all: places.length });
    itinerary.setAttribute("aria-label", waiting ? "" : `${tripLine.textContent}: ${countLine.textContent}`);
    fitTrip();
    itinerary.classList.toggle("waiting", waiting);
    stops.replaceChildren(...places.map((p, k) => stop(p, tr, k, k === places.length - 1, waiting ? null : next)));
    stops.style.gridTemplateRows = `repeat(${Math.ceil(places.length / PER_ROW)}, auto)`;
    requestAnimationFrame(drawPath);
  }

  return {
    element: itinerary,
    observe,
    draw,
    /** The visited stops' postcards of the route drawn last, decoding. */
    pictures: (): Promise<void>[] => pictures,
  };
}
