// THE DAILY SUITCASE on screen (docs/daily-suitcase.md; the creator, 2026-10-27): the monthly event
// the daily puzzle fills. Its record is the platform's (suitcase-data.ts, over Server's module):
//
//   the banner      home's top row, glass: "November: Ski Trip" over "12 days left", a tap opens
//                   the suitcase. Information that leads somewhere (the lead's brief), so glass and
//                   not a raised button, with a chevron saying it opens.
//   the suitcase    a screen of its own, from the banner or the Daily tile: the month's 10 slots,
//                   each the item's picture once packed (with "×2", "×3" for spare copies) or its
//                   outline while missing; then the swap (tap a missing item; 3 spares, of any
//                   items, swap for it, checked on the server), the prize (the month's table and a
//                   few helpers, paid once by the platform), today's daily (Play, or its results),
//                   and the shelf.
//   the shelf       past months, each a closed suitcase with how many were packed; a tap opens it
//                   to look at, never to finish (no swap, no daily).
//   the win card    the day's first daily win packs the day's item: once the checker's verdict says
//                   so, the item's picture flies into a small suitcase on the card, and the line
//                   says "Goggles packed! 8 of 10". Decoration only: it takes no touch and never
//                   holds the card's buttons.
//   the board       the item's picture finished on a first daily of the day: one line, taking no
//                   touch, "Goggles found! It goes in your suitcase when you win."
//
// No item is ever shown before its day: the slots show what the player holds, and a missing slot is
// the item's outline and name (the month's 10 are the theme, known from the 1st; which one comes on
// which day is not). Information is glass; only what a press answers is a button.

import { emit } from "../events";
import { t } from "./i18n";
import { ICONS } from "./icons";
import { held, spares, suitcases, SWAP_COST, type SuitItem, type Suitcase, type SwapAnswer } from "./suitcase-data";
import { knownTable, thumbOf } from "./tables";
import { suitcaseItem } from "./catalogue";
import { ensureSuitcase, fileUrl } from "../packs";
import type { HelperKind } from "./stock";

type Nav = {
  home(): void;
  /** Show the suitcase screen (the app's screen switch). */
  show(): void;
  /** Today's daily: play it, or its results once done; null while the day's board is unknown. */
  daily(): { done: boolean; go(): void } | null;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** "November" for "2026-11" (the player's own month, in the game's language). */
export function monthName(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y ?? 2026, (mo ?? 1) - 1, 1)));
}
/** "November: Ski Trip". */
export const eventTitle = (s: Suitcase): string => t("case.title", { month: monthName(s.month), theme: s.theme });

/**
 * An item's picture. Art's cut-out (the object alone, on transparency) once there is one: itself when
 * packed, darkened to its outline when missing. Without a cut-out (Art's stand-ins): the board copy
 * when packed, a dashed outline with its first letter when missing. No art at all: a stand-in tile.
 */
function itemPic(it: SuitItem, missing: boolean): HTMLElement {
  const box = el("span", `item-pic${missing ? " missing" : ""}`);
  const art = suitcaseItem(it.id);
  const src = it.pic ?? (art ? fileUrl(art.cutout ?? art.picture) : null);
  const cutout = !!(it.pic || art?.cutout);
  if (src && (cutout || !missing)) {
    if (cutout) box.classList.add("cutout");
    const img = el("img");
    Object.assign(img, { src, alt: "", draggable: false, decoding: "async" });
    box.append(img);
  } else {
    box.classList.add("stand-in");
    box.dataset.hue = String([...it.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7));
    box.style.setProperty("--hue", box.dataset.hue);
    box.append(el("span", "", it.title.slice(0, 1).toUpperCase()));
  }
  box.setAttribute("aria-hidden", "true");
  return box;
}

/** The table every player has (public/art/tables/tables.json's default): never a month's prize. */
const DEFAULT_TABLE = "table-winter-dusk";

/** Art's suitcases (public/art, transparent): open from above (its teal lining plain across the middle), closed, and small. */
const ART = {
  open: new URL(`${import.meta.env.BASE_URL}art/suitcase-open.webp`, location.href).href,
  closed: `${import.meta.env.BASE_URL}art/suitcase-closed.webp`,
  small: `${import.meta.env.BASE_URL}art/suitcase-closed-small.webp`,
};

/** A closed suitcase, Art's: the small one (the banner, the win card), or the shelf's. */
export function miniCase(cls = "", big = false): HTMLElement {
  const c = el("img", `mini-case${cls ? ` ${cls}` : ""}`);
  Object.assign(c, { src: big ? ART.closed : ART.small, alt: "", draggable: false, decoding: "async" });
  c.setAttribute("aria-hidden", "true");
  return c;
}

export function createSuitcase(nav: Nav) {
  // ---- home's banner: in the top row, glass, a tap opens the suitcase ----
  const bannerTitle = el("b");
  const bannerLeft = el("span");
  const bannerWords = el("span", "words");
  bannerWords.append(bannerTitle, bannerLeft);
  const banner = el("button", "top-pill glass event-banner");
  banner.type = "button";
  banner.dataset.press = "home.event";
  banner.hidden = true;
  const chev = el("span", "chev");
  chev.innerHTML = ICONS.chevron;
  chev.setAttribute("aria-hidden", "true");
  banner.append(miniCase(), bannerWords, chev);
  banner.addEventListener("click", () => open());

  // ---- the screen ----
  const pill = el("div", "top-pill glass");
  const back = el("button", "btn round top-back");
  back.type = "button";
  back.dataset.press = "case.back";
  back.innerHTML = ICONS.back;
  back.setAttribute("aria-label", t("case.back"));
  const scroll = el("div", "scroll case-scroll");
  const screen = el("section", "screen menu-screen suitcase-screen");
  screen.hidden = true;
  screen.append(pill, back, scroll);

  /** The month on show: null is this month's; a month id is a shelf suitcase. */
  let viewing: string | null = null;
  /** The missing item picked to swap for. */
  let picked: string | null = null;
  let swapping = false;
  let said = "";

  back.addEventListener("click", () => {
    if (viewing) {
      viewing = null;
      picked = null;
      draw();
      scroll.scrollTop = 0;
    } else nav.home();
  });

  const shown = (): Suitcase | null => (viewing ? (suitcases.past().find((s) => s.month === viewing) ?? null) : suitcases.current());

  function slots(s: Suitcase, open: boolean): HTMLElement {
    const grid = el("div", "case-slots");
    grid.setAttribute("role", "list");
    for (const it of s.items) {
      const n = s.counts[it.id] ?? 0;
      const missing = n <= 0;
      // a missing item is a button while it can be swapped for (this month's, and spares enough to say so)
      const pickable = open && missing;
      const slot = el(pickable ? "button" : "div", `slot${missing ? " missing" : ""}${picked === it.id ? " picked" : ""}`) as HTMLElement;
      slot.setAttribute("role", "listitem");
      if (pickable) {
        (slot as HTMLButtonElement).type = "button";
        slot.dataset.press = "case.pick";
        slot.setAttribute("aria-pressed", String(picked === it.id));
        slot.addEventListener("click", () => {
          picked = picked === it.id ? null : it.id;
          said = "";
          draw();
        });
      }
      slot.append(itemPic(it, missing), el("span", "slot-name", it.title));
      if (n > 1) slot.append(el("span", "slot-count", t("case.count", { count: n })));
      slot.setAttribute(
        "aria-label",
        missing ? `${it.title}: ${t("case.missing")}` : n > 1 ? `${it.title}: ${t("case.copies", { count: n })}` : `${it.title}: ${t("case.packed")}`,
      );
      grid.append(slot);
    }
    return grid;
  }

  function swapPanel(s: Suitcase): HTMLElement {
    const box = el("div", "case-swap glass");
    const have = spares(s);
    const head = el("p", "swap-head");
    head.append(el("b", "", t("case.spares", { count: have })), el("span", "", t("case.swapWhy", { count: SWAP_COST })));
    box.append(head);
    const it = picked ? s.items.find((x) => x.id === picked) : undefined;
    if (it && have >= SWAP_COST) {
      const b = el("button", "btn amber case-swap-btn");
      b.type = "button";
      b.dataset.press = "case.swap";
      b.textContent = t("case.swapFor", { count: SWAP_COST, item: it.title });
      b.addEventListener("click", () => void swap(b, it));
      box.append(b);
    } else {
      box.append(el("p", "swap-line", have >= SWAP_COST ? t("case.pickOne") : t("case.needSpares", { count: SWAP_COST, have })));
    }
    const line = el("p", "swap-say");
    line.setAttribute("role", "status");
    line.textContent = said;
    box.append(line);
    return box;
  }

  async function swap(b: HTMLButtonElement, it: SuitItem): Promise<void> {
    if (swapping) return;
    swapping = true;
    b.disabled = true;
    b.setAttribute("aria-busy", "true");
    b.textContent = t("case.swapping");
    const answer: SwapAnswer = await suitcases.swap(it.id).catch((): SwapAnswer => "failed");
    swapping = false;
    picked = answer === "ok" ? null : picked;
    said = answer === "ok" ? t("case.swapped", { item: it.title }) : t(`case.refused.${answer}`);
    // the swap that brought the 10th: the prize lands with it (Server pays, and says so once; the sting is Audio's)
    const now = suitcases.current();
    const prize = answer === "ok" ? suitcases.lastPrize() : null;
    if (answer === "ok" && (prize || now?.complete)) {
      // the table is said only once the platform holds it for the player (Server's `paid`: the month's table held)
      const table = !!now?.paid && now.prize.table !== DEFAULT_TABLE;
      said = t(table ? "case.swappedFull" : "case.swappedFullPlain", { item: it.title });
      emit("suitcase:full", { month: prize?.month ?? now?.month ?? "" });
    }
    draw();
    if (answer === "ok") screen.querySelector(`.slot[aria-label^="${CSS.escape(it.title)}"]`)?.classList.add("arrived");
  }

  function prize(s: Suitcase): HTMLElement {
    const box = el("div", `case-prize glass${s.paid ? " won" : ""}`);
    // a month whose table Art has not made yet names the built-in one (Server's): its prize is the helpers alone
    const own = s.prize.table !== DEFAULT_TABLE;
    const art = own ? knownTable(s.prize.table) : undefined;
    const pic = el("span", "prize-table");
    if (art) {
      const img = el("img");
      Object.assign(img, { src: thumbOf(art), alt: "", draggable: false, decoding: "async" });
      pic.append(img);
    }
    pic.setAttribute("aria-hidden", "true");
    const words = el("div", "prize-words");
    words.append(el("b", "", s.paid ? t("case.prizeWon") : t("case.prizeHead", { count: s.items.length })));
    words.append(el("span", "", own ? t("case.prizeTable", { table: s.prize.tableTitle ?? art?.title ?? "" }) : t("case.prizeHelpers")));
    const tools = el("span", "prize-tools");
    for (const k of ["hint", "undo", "shuffle"] as HelperKind[]) {
      const n = s.prize.helpers[k];
      if (!n) continue;
      const tool = el("span", "tool");
      tool.innerHTML = ICONS[k];
      tool.append(el("span", "", `×${n}`));
      tool.setAttribute("aria-label", t(`win.gift.${k}`, { count: n }));
      tools.append(tool);
    }
    words.append(tools);
    if (s.paid && own) words.append(el("span", "prize-note", t("case.prizeWhere")));
    if (art) box.append(pic);
    box.append(words);
    return box;
  }

  function shelf(): HTMLElement | null {
    const past = suitcases.past().slice(0, 12);
    if (!past.length) return null;
    const box = el("div", "case-shelf");
    box.append(el("h2", "", t("case.shelf")));
    const row = el("div", "shelf-row");
    for (const s of past) {
      const b = el("button", `btn shelf-case${s.complete ? " full" : ""}`);
      b.type = "button";
      b.dataset.press = "case.shelf";
      b.append(miniCase("", true), el("b", "", monthName(s.month)), el("span", "", s.theme), el("small", "", t("case.packedOf", { count: held(s), all: s.items.length })));
      b.setAttribute("aria-label", `${eventTitle(s)}: ${t("case.packedOf", { count: held(s), all: s.items.length })}`);
      b.addEventListener("click", () => open(s.month));
      row.append(b);
    }
    box.append(row);
    return box;
  }

  function draw(): void {
    drawBanner();
    if (screen.hidden) return;
    const s = shown();
    if (!s) {
      pill.textContent = t("case.name");
      scroll.replaceChildren(el("p", "case-empty", t("case.none")));
      return;
    }
    const open = !viewing && s.daysLeft > 0;
    pill.textContent = eventTitle(s);
    const status = el("p", "case-status glass");
    status.append(
      el("b", "", t("case.packedOf", { count: held(s), all: s.items.length })),
      " · ",
      el("span", "", open ? t("case.daysLeft", { count: s.daysLeft }) : t("case.closed")),
    );
    const parts: (HTMLElement | null)[] = [status];
    // Art's open suitcase round the slots, its plain lining stretched to fit them (a 9-slice, style.css)
    const suitcase = el("div", "case");
    suitcase.style.setProperty("--case-art", `url("${ART.open}")`);
    suitcase.append(slots(s, open && !s.complete));
    const wrap = el("div", "case-wrap");
    wrap.append(suitcase);
    parts.push(wrap);
    if (open && !s.complete) parts.push(swapPanel(s));
    parts.push(prize(s));
    if (!viewing) {
      const d = nav.daily();
      if (d) {
        // the screen's one amber button: the swap's, while one is picked, else today's daily
        const b = el("button", `btn ${d.done || picked ? "" : "amber "}case-daily`);
        b.type = "button";
        b.dataset.press = d.done ? "case.results" : "case.play";
        b.textContent = d.done ? t("case.results") : t("case.play");
        b.addEventListener("click", () => d.go());
        parts.push(b);
      }
      parts.push(shelf());
    }
    scroll.replaceChildren(...parts.filter((p): p is HTMLElement => !!p));
  }

  function drawBanner(): void {
    const s = suitcases.current();
    banner.hidden = !s;
    if (!s) return;
    bannerTitle.textContent = eventTitle(s);
    bannerLeft.textContent = s.complete ? t("case.bannerDone") : t("case.daysLeft", { count: s.daysLeft });
    banner.setAttribute("aria-label", `${eventTitle(s)}, ${bannerLeft.textContent}. ${t("case.open")}`);
  }

  function open(month: string | null = null): void {
    viewing = month;
    picked = null;
    said = "";
    screen.hidden = false;
    nav.show();
    draw();
    scroll.scrollTop = 0;
    // a built game's item pictures come in the month's own pack: drawn again once it is in
    const s = shown();
    if (s) void ensureSuitcase(s.month).then(() => !screen.hidden && !swapping && draw(), () => undefined);
  }

  suitcases.onChange(() => {
    if (!swapping) draw();
  });
  drawBanner();

  return {
    screen,
    banner,
    open,
    /** Redraw (the day's board or result changed). */
    redraw: draw,
    /** Leave the screen (another screen is showing). */
    leave(): void {
      viewing = null;
      picked = null;
    },
  };
}

/**
 * The win card's moment (the day's first daily win, once the checker says it packed `item`): a small
 * suitcase in the card's line, the item's picture flying into it from `from` (the board's copy,
 * suitcase:item's url, else Art's), and the line saying what came. Takes no touch, holds nothing.
 */
export function packedOnCard(
  line: HTMLElement,
  item: SuitItem,
  url: string,
  count: number,
  packed: number,
  all: number,
  /** The 10th: the month, and whether its table landed with the prize (else the helpers alone are said). */
  full: { month: string; table: boolean } | null = null,
): void {
  const mini = miniCase("on-card");
  // a new item says how full the suitcase is; a spare copy says how many of it there are now
  const words = el("span", "packed-words", count > 1 ? t("case.packedAgain", { item: item.title, count }) : t("case.packedCard", { item: item.title, count: packed, all }));
  line.replaceChildren(mini, words);
  line.classList.add("packed");
  /** It has landed: the latch (Audio's), and the full suitcase's word when this was the 10th. */
  const landed = () => {
    mini.classList.add("bump");
    emit("suitcase:packed", { id: item.id, count });
    if (full) {
      words.textContent = t(full.table ? "case.fullCard" : "case.fullHelpers");
      emit("suitcase:full", { month: full.month });
    }
  };
  // it takes off from its own picture in the card's gallery (the item and its picture share an id), else the card's middle
  const card = line.closest(".card");
  const own = card?.querySelector<HTMLElement>(`[data-pic="${CSS.escape(item.id)}"]`) ?? null;
  const src = url || own?.querySelector("img")?.currentSrc || item.pic || "";
  const less = document.documentElement.classList.contains("less-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!src || less) {
    landed();
    return;
  }
  requestAnimationFrame(() => {
    const c = card?.getBoundingClientRect();
    const m = mini.getBoundingClientRect();
    if (!c || !m.width) return landed();
    const ghost = el("img", "item-flight");
    Object.assign(ghost, { src, alt: "", draggable: false });
    const size = 74;
    const o = own?.getBoundingClientRect();
    const x0 = o?.width ? o.left + o.width / 2 - size / 2 : c.left + c.width / 2 - size / 2;
    const y0 = o?.width ? o.top + o.height / 2 - size / 2 : c.top + c.height * 0.36 - size / 2;
    ghost.style.left = `${x0}px`;
    ghost.style.top = `${y0}px`;
    document.body.append(ghost);
    const dx = m.left + m.width / 2 - (x0 + size / 2);
    const dy = m.top + m.height / 2 - (y0 + size / 2);
    const anim = ghost.animate(
      [
        { transform: "translate(0, 0) scale(0.4) rotate(-8deg)", opacity: 0 },
        { transform: "translate(0, -18px) scale(1.08) rotate(0deg)", opacity: 1, offset: 0.25 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.3) rotate(10deg)`, opacity: 1, offset: 0.9 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0 },
      ],
      { duration: 1100, delay: 350, easing: "cubic-bezier(0.45, 0, 0.3, 1)", fill: "both" },
    );
    anim.onfinish = anim.oncancel = () => {
      ghost.remove();
      landed();
    };
  });
}
