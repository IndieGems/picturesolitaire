// A mystery case's own screens (the pilot, "Murder on the Melusine"): the EVIDENCE
// BINDER and the ACCUSATION. DEV ONLY, as the case is (case.ts): the dev menu creates
// them, so a release build carries none of this.
//
//   the binder      the case's passport page: a brown folder with the case's name, open
//                   at its pages: the SUSPECTS first (their portraits, once found), then
//                   the CLUES in the case's order. A found clue opens full size with its
//                   sentence under it, so a clock, the photo's date stamp or running ink
//                   can be read; one not found yet is a blank with its number.
//   the accusation  after board 15 (or the dev menu's "Accuse now"): "Who killed Oskar
//                   Brandt?" (the four portraits), then "Which picture proves it?" (the
//                   clues found; each opens full size, with "This proves it" under it).
//   the verdict     the culprit with the gold proof: "Case closed!" and the gold stamp
//                   lands; with an accepted proof: "Solved!"; anything else: "Not quite."
//                   Then the detective explains, four lines, each with its pictures, and
//                   Done. Never a dead end: Back is always there, and the case is done.
//
// `case:verdict` { right, gold } goes out as the verdict shows; the gold stamp lands
// 0.76 s after it, on Audio's thump. Less motion: it fades in, there by the same moment.
//
// The game draws a clue's own writing (the photo's "10:25 PM" date stamp) over its
// picture, here and on the board's postcard (drawStamp, given to the board by the dev
// menu). A clue whose picture Art has not made yet stands in as a numbered card with its
// label, drawn here.
//
// The two screens are a layer over the app's (z 25: over the board and its cards, under
// the full-size view and the gear), with the standard's top row: the title on the left,
// Back then the gear at the right end. Their words: the case's own from its file, the
// rest from the locale files (case.*).

import "./case.css";
import { ICONS } from "./icons";
import { t } from "./i18n";
import { emit } from "../events";
import { sharpCopy, type Copy, type Picture } from "./catalogue";
import { createViewer } from "./viewer";
import { keepFitted } from "./fit";
import { clueImage, clueName, clueOf, foundClues, isFound, judge, settle, theCase, verdictLine, type Clue, type Suspect, type Verdict } from "./case";

/** The gold stamp starts down at this, after case:verdict, and lands LAND_MS later: 0.76 s, Audio's thump. */
const STAMP_DROP_AT_MS = 460;
const LAND_MS = 300;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function btn(cls: string, press: string, label: string, glyph = ""): HTMLButtonElement {
  const b = el("button", `btn ${cls}`);
  b.type = "button";
  b.dataset.press = press;
  if (glyph) b.innerHTML = glyph;
  if (label && cls.includes("round")) b.setAttribute("aria-label", label);
  else if (label) b.append(el("span", "", label));
  return b;
}

const lessMotion = () => document.documentElement.classList.contains("less-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A clue's own writing, over its picture: `box` lies on the picture's whole extent and
 * sizes the writing in its own units (container-type), so it lands on the same spot at any
 * size (the binder's thumb, the full-size view, the board's postcard).
 */
export function drawStamp(box: HTMLElement, id: string): void {
  const s = clueOf(id)?.stamp;
  if (!s) return;
  box.style.containerType = "size";
  const mark = el("span", "case-datestamp", s.text);
  mark.style.right = `${s.right * 100}%`;
  mark.style.bottom = `${s.bottom * 100}%`;
  box.append(mark);
}

/** A stand-in for a clue Art has not drawn yet: a sepia card with its number and label. */
function standIn(c: Clue): string {
  const esc = (x: string) => x.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">` +
    `<rect width="300" height="400" fill="#e9dcc4"/><rect x="14" y="14" width="272" height="372" rx="14" fill="none" stroke="#a88f6a" stroke-width="4" stroke-dasharray="14 10"/>` +
    `<text x="150" y="190" font-family="Georgia, serif" font-size="96" font-weight="700" fill="#8c7350" text-anchor="middle">${c.n}</text>` +
    `<text x="150" y="250" font-family="Georgia, serif" font-size="22" fill="#6e5a3c" text-anchor="middle">${esc(c.label)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The clue as a picture for the full-size view: Art's, or the stand-in. */
function asPicture(c: Clue): { p: Picture; standIn: boolean } {
  const img = clueImage(c);
  if (img) return { p: img, standIn: false };
  return { p: { id: c.id, album: "", title: c.label, file: "", thumb: "", board: null, copies: [], cols: 4, rows: 4 }, standIn: true };
}

/** Each clue picture waiting for its size, and the copy it draws (as albums.ts: only ever up to a bigger one). */
const sizing = new WeakMap<Element, { img: HTMLImageElement; p: Picture; copy?: Copy }>();
const sizes = new ResizeObserver((entries) => {
  for (const e of entries) {
    const it = sizing.get(e.target);
    const { width, height } = e.contentRect;
    if (!it || !width || !height) continue;
    const { copy, url } = sharpCopy(it.p, width, height);
    if (it.copy && copy.w * copy.h <= it.copy.w * it.copy.h) continue;
    it.copy = copy;
    it.img.src = url;
  }
});

type Nav = {
  /** The app's column: the layer goes in it. */
  app: HTMLElement;
  /** Done: home. */
  home(): void;
};

export function createCaseScreens(nav: Nav) {
  const viewer = createViewer();
  nav.app.append(viewer.element);

  const pill = el("div", "top-pill glass");
  // a long title (the case's name) wraps, then steps down, never cut off (fit.ts)
  keepFitted(pill);
  const back = btn("round top-back", "case.back", t("case.back"), ICONS.back);
  const scroll = el("div", "scroll");
  const foot = el("div", "case-foot");
  const layer = el("section", "screen menu-screen case-layer");
  layer.hidden = true;
  layer.append(pill, back, scroll, foot);
  nav.app.append(layer);

  /** What Back does now (a step back in the accusation, or close). */
  let onBack: () => void = close;
  back.addEventListener("click", () => onBack());
  let timers: number[] = [];

  function close(): void {
    for (const id of timers) clearTimeout(id);
    timers = [];
    layer.hidden = true;
    viewer.close();
  }

  function up(title: string): void {
    for (const id of timers) clearTimeout(id);
    timers = [];
    pill.textContent = title;
    foot.replaceChildren();
    foot.hidden = true;
    for (const c of scroll.querySelectorAll(".pc-card")) sizes.unobserve(c);
    layer.hidden = false;
    scroll.scrollTop = 0;
  }

  /** A clue as a postcard: its picture (or stand-in), its stamp drawn over it, its label under it. */
  function clueCard(c: Clue, tap: (() => void) | null, words?: string[]): HTMLElement {
    const pc = el(tap ? "button" : "div", tap ? "pc visited" : "pc");
    const { p, standIn: stand } = asPicture(c);
    pc.style.setProperty("--c", String(p.cols));
    pc.style.setProperty("--r", String(p.rows));
    const card = el("span", "pc-card");
    const img = el("img");
    img.alt = "";
    img.draggable = false;
    img.decoding = "async";
    if (stand) img.src = standIn(c);
    else {
      sizing.set(card, { img, p });
      sizes.observe(card);
    }
    const deco = el("span", "case-deco");
    drawStamp(deco, c.id);
    card.append(img, deco);
    pc.append(card);
    for (const [i, w] of (words ?? [clueName(c)]).entries()) pc.append(el(i ? "span" : "b", i ? "pc-place" : "pc-name", w));
    if (tap) {
      (pc as HTMLButtonElement).type = "button";
      pc.dataset.press = "case.clue";
      pc.setAttribute("aria-label", clueName(c));
      pc.addEventListener("click", tap);
    }
    return pc;
  }

  /** Not found yet: a blank, its number on it. */
  function blank(c: Clue): HTMLElement {
    const pc = el("div", "pc locked");
    pc.setAttribute("role", "img");
    pc.setAttribute("aria-label", t("case.notFound", { n: c.n }));
    const card = el("span", "pc-card");
    card.append(el("span", "pc-n", String(c.n)));
    pc.append(card);
    return pc;
  }

  /** A clue full size, its sentence under it (and, choosing a proof, "This proves it"). */
  function look(c: Clue, choose?: () => void): void {
    const { p, standIn: stand } = asPicture(c);
    const card = scroll.querySelector<HTMLImageElement>(`[data-clue="${c.id}"] img`);
    viewer.open(p, stand ? standIn(c) : card?.currentSrc || card?.src || undefined, {
      ...(c.words ? { caption: c.words } : {}),
      decorate: (box) => drawStamp(box, c.id),
      ...(stand ? { still: true } : {}),
      ...(choose ? { action: { label: t("case.choose"), press: "case.choose", go: choose } } : {}),
    });
  }

  const portraits = () => theCase.suspects.map((s) => ({ s, c: clueOf(s.portrait)! }));
  const evidence = () => theCase.clues.filter((c) => !theCase.suspects.some((s) => s.portrait === c.id));

  // ---------- the binder ----------

  let page = 0;

  function binder(): void {
    up(t("case.binder"));
    onBack = close;
    const book = el("div", "pp-book case-book");
    book.append(el("div", "pp-brand", theCase.title));
    // Art's cover of the case (the ship at dusk), once there is one
    const cover = el("img", "case-cover");
    cover.alt = "";
    cover.addEventListener("error", () => cover.remove(), { once: true });
    cover.src = `${import.meta.env.BASE_URL}art/cases/${theCase.id}-cover.webp`;
    if (page === 0) book.append(cover);
    const sheet = el("section", "pp-page");
    const head = el("div", "pp-head case-head");
    const titles = el("div", "pp-titles");
    const grid = el("div", page === 0 ? "pp-grid case-suspects" : "pp-grid");
    if (page === 0) {
      const found = portraits().filter(({ c }) => isFound(c.n)).length;
      titles.append(el("h2", "pp-trip", t("case.suspects")), el("span", "pp-count", t("case.count", { done: found, all: theCase.suspects.length })));
      for (const { s, c } of portraits()) {
        const card = isFound(c.n) ? clueCard(c, () => look(c), [s.name, s.who]) : blank(c);
        card.dataset.clue = c.id;
        grid.append(card);
      }
    } else {
      const list = evidence();
      const found = list.filter((c) => isFound(c.n)).length;
      titles.append(el("h2", "pp-trip", t("case.clues")), el("span", "pp-count", t("case.count", { done: found, all: list.length })));
      for (const c of list) {
        const card = isFound(c.n) ? clueCard(c, () => look(c)) : blank(c);
        card.dataset.clue = c.id;
        grid.append(card);
      }
    }
    head.append(titles);
    sheet.append(head, grid);
    book.append(sheet);
    // the two pages: ‹ Suspects | Clues ›
    const prev = btn("round pp-prev", "case.prev", t("case.suspects"), ICONS.chevron);
    const next = btn("round pp-next", "case.next", t("case.clues"), ICONS.chevron);
    prev.disabled = page === 0;
    next.disabled = page === 1;
    prev.classList.toggle("resting", prev.disabled);
    next.classList.toggle("resting", next.disabled);
    prev.addEventListener("click", () => turn(0));
    next.addEventListener("click", () => turn(1));
    const turnRow = el("div", "pp-turn");
    turnRow.append(prev, el("span", "pp-where glass", page === 0 ? t("case.suspects") : t("case.clues")), next);
    // a swipe across the page turns it
    let down: { x: number; y: number } | null = null;
    sheet.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY }));
    sheet.addEventListener("pointerup", (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      down = null;
      if (Math.abs(dx) >= 56 && Math.abs(dx) > Math.abs(dy) * 1.5) turn(dx < 0 ? 1 : 0);
    });
    scroll.replaceChildren(book, turnRow);
    // every clue found: the accusation, from here too
    if (foundClues().length === theCase.clues.length) {
      const accuseBtn = btn("amber case-go", "case.accuse", t("case.accuse"));
      accuseBtn.addEventListener("click", () => accuse());
      foot.append(accuseBtn);
      foot.hidden = false;
    }
  }

  function turn(to: number): void {
    if (to === page) return;
    page = to;
    binder();
  }

  // ---------- the accusation ----------

  function accuse(): void {
    up(theCase.title);
    onBack = close;
    const card = el("div", "card case-card");
    card.append(el("h2", "", theCase.question));
    const grid = el("div", "pp-grid case-suspects");
    for (const { s, c } of portraits()) {
      const pick = clueCard(c, () => prove(s), [s.name, s.who]);
      pick.dataset.clue = c.id;
      pick.dataset.press = "case.suspect";
      pick.setAttribute("aria-label", `${s.name}, ${s.who}`);
      grid.append(pick);
    }
    card.append(grid);
    scroll.replaceChildren(card);
  }

  function prove(s: Suspect): void {
    up(theCase.title);
    onBack = accuse;
    const card = el("div", "card case-card");
    const who = el("div", "case-accused glass");
    const change = btn("", "case.change", t("case.change"));
    change.addEventListener("click", accuse);
    who.append(el("span", "", t("case.youAccuse", { name: s.name })), change);
    card.append(who, el("h2", "", theCase.proofQuestion));
    const grid = el("div", "pp-grid");
    for (const c of foundClues()) {
      const choose = () => verdict(s, c);
      const tile = clueCard(c, () => look(c, choose));
      tile.dataset.clue = c.id;
      grid.append(tile);
    }
    card.append(grid);
    scroll.replaceChildren(card);
  }

  // ---------- the verdict ----------

  function verdict(s: Suspect, proof: Clue): void {
    const v: Verdict = judge(s.id, proof.id);
    settle(v);
    up(theCase.title);
    onBack = close;
    const card = el("div", `card case-card case-verdict ${v}`);
    const heading = el("h2", "", t(v === "gold" ? "case.closed" : v === "solved" ? "case.solved" : "case.wrong"));
    // the gold stamp comes down on the file, over its heading (Art's, or a gold ring with its words)
    const spot = el("div", "case-stamp-spot");
    if (v === "gold") card.append(spot);
    card.append(heading, el("p", "case-line", verdictLine(v, s.id)));
    if (v === "gold") {
      const stamp = el("div", "case-stamp");
      stamp.setAttribute("role", "img");
      stamp.setAttribute("aria-label", t("case.closedStamp"));
      const img = el("img");
      img.alt = "";
      img.addEventListener("error", () => {
        stamp.classList.add("drawn");
        stamp.replaceChildren(el("b", "", t("case.closedStamp")));
      }, { once: true });
      img.src = `${import.meta.env.BASE_URL}art/stamps/stamp-${theCase.id}.webp`;
      stamp.append(img);
      stamp.style.animationDelay = `${STAMP_DROP_AT_MS}ms`;
      stamp.classList.add(lessMotion() ? "fading" : "landing");
      spot.append(stamp);
      if (!lessMotion())
        timers.push(window.setTimeout(() => {
          for (const [i, at] of [[-8, 20], [104, 12], [96, 96], [2, 98]].entries()) {
            const tw = el("i", "twinkle");
            tw.style.cssText = `left:${at[0]}%;top:${at[1]}%;--s:${22 + (i % 2) * 6}px;animation-delay:${i * 0.05}s`;
            stamp.append(tw);
          }
        }, STAMP_DROP_AT_MS + LAND_MS));
    }
    // the detective explains, a line at a time, each with its pictures
    card.append(el("h3", "case-how", t("case.how")));
    const why = el("ol", "case-why");
    for (const line of theCase.explanation) {
      const li = el("li");
      li.append(el("span", "case-why-text", line.text));
      const pics = el("div", "case-why-pics");
      for (const id of line.pictures) {
        const c = clueOf(id);
        if (!c) continue;
        const tile = clueCard(c, () => look(c), []);
        tile.dataset.clue = c.id;
        pics.append(tile);
      }
      li.append(pics);
      why.append(li);
    }
    card.append(why);
    const done = btn("amber case-go", "case.done", t("case.done"));
    done.addEventListener("click", () => {
      close();
      nav.home();
    });
    card.append(done);
    scroll.replaceChildren(card);
    emit("case:verdict", { right: v !== "wrong", gold: v === "gold" }); // Audio's resolve, its thump on the stamp
  }

  return {
    /** The binder, at the suspects' page (or the page it was left at). */
    binder,
    /** The accusation, from its first question. */
    accuse,
    close,
    isOpen: () => !layer.hidden,
  };
}
