// THE EVENT on screen (docs/vip.md: two weeks, for VIPs only; docs/daily-suitcase.md): the event the
// daily puzzle fills. Its record is the platform's (suitcase-data.ts, over Server's module):
//
//   the strip       home, just above the dock (the creator's pick, 2026-10-30: five tiles do not fit
//                   across a phone): Art's closed suitcase, "Event · Ski Trip", and its days left or
//                   when it starts. It opens the suitcase. For a player who is not a VIP it wears the
//                   padlock and gold VIP tag, and opens the locked door's screen (vip-door.ts) with the
//                   event's suitcase and prize table, never the suitcase itself.
//   the suitcase    a screen of its own, from the strip: the event's 7 or so slots (each item turns
//                   up twice in its 14 dailies),
//                   each the item's picture once packed (with "×2", "×3" for spare copies) or its
//                   outline while missing; under them today's daily, "Play the Daily Puzzle!" (the
//                   creator, 2026-10-28: the event has no puzzles of its own, the daily is how items
//                   come, so the page says so where a phone shows it), or once won its results and
//                   "Come back tomorrow"; then the swap (tap a missing item; 3 spares, of any items,
//                   swap for it, checked on the server; with no spares, only once one is tapped), how
//                   it works (four short steps, glass), the prize (the month's table and a few
//                   helpers, paid once by the platform), and the shelf.
//   the archive     past events, newest first (Halloween's first), each a closed suitcase with how
//                   many were packed; a tap opens it: its suitcase (the swap open, 2 spares), its prize,
//                   and its 14 days, each a button that plays that day's board (won ones ticked): a VIP
//                   can still fill it (the server packs a past day's item with no window, and pays a
//                   past day's Coins only inside the daily archive's).
//   the preview     before the event: the next month's suitcase, every slot an outline, when it
//                   starts, how it works and its prize; no play (nothing packs yet) and no swap.
//   the win card    the day's first daily win packs the day's item: once the checker's verdict says
//                   so, the item's picture flies into a small suitcase on the card, and the line
//                   says "Goggles packed! 8 of 10". Decoration only: it takes no touch and never
//                   holds the card's buttons.
//   the board       the item's picture finished on a first daily of the day: item-found.ts's moment.
//
// ON HOLD (the creator, 2026-10-29): behind one switch (event-switch.ts). While it is off, suitcase-data.ts
// reports no month, so the tile stays hidden and nothing here reaches a player; the dev menu's preview
// still opens the screen for the creator.
//
// No item is ever shown before its day: the slots show what the player holds, and a missing slot is
// the item's outline and name (the month's 10 are the theme, known from the 1st; which one comes on
// which day is not). Information is glass; only what a press answers is a button.

import { emit } from "../events";
import { liveAttr, locale, named, t } from "./i18n";
import { ICONS } from "./icons";
import { eventDoor, eventShown, onEventShown } from "./event-switch";
import { eventLength, held, scheduledEvent, spares, suitcases, SWAP_COST, type SuitItem, type Suitcase, type SwapAnswer } from "./suitcase-data";
import { currentDaily } from "../net/daily";
import { dailyResult, onProgress } from "../net/progress";
import { vipTag, type VipDoor } from "./vip-door";
import { BUILT_IN_TABLE, knownTable, thumbOf } from "./tables";
import { shortDate } from "./format";

/** `viewing` for the next event's preview (before it starts). */
const UPCOMING = "upcoming";
import { loadItems, suitcaseItem } from "./catalogue";
import { ensureSuitcase, fileUrl } from "../packs";
import type { HelperKind } from "./stock";

type Nav = {
  home(): void;
  /** Show the suitcase screen (the app's screen switch). */
  show(): void;
  /** Today's daily: play it, or its results once done; null while the day's board is unknown. */
  daily(): { done: boolean; go(): void } | null;
  /** The creator's event preview: open the next event puzzle, in practice (app.ts). */
  playEvent(): void;
  /** A past event's day: play its daily (app.ts: its board, its win card's way back is this event). */
  playDay(date: string, event: string): void;
  /** A player who is not a VIP pressed the strip: the locked door's screen. */
  door(d: VipDoor): void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const lessMotion = () => document.documentElement.classList.contains("less-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;

/** "November" for "2026-11" (the player's own month, in the game's language). */
export function monthName(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Intl.DateTimeFormat(locale(), { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y ?? 2026, (mo ?? 1) - 1, 1)));
}
/** A title or a label starts with a capital, whatever the language writes a month with ("ноябрь: …" reads "Ноябрь: …"). */
const capital = (s: string): string => s.charAt(0).toLocaleUpperCase(locale()) + s.slice(1);
/** "November: Ski Trip". */
/** The event's title: its theme ("Ski Trip"); an event is two weeks now, not a month (docs/vip.md). */
export const eventTitle = (s: Suitcase): string => capital(themeName(s));
/** An item's name, a month's theme and a prize table's name in the player's language (the locale's names list), else their English. */
export const itemName = (it: { id: string; title: string }): string => named(`picture.${it.id}`, it.title);
export const themeName = (s: { month: string; theme: string }): string => named(`suitcase.${s.month}.theme`, s.theme);
const prizeTableName = (prize: Suitcase["prize"], english: string): string => named(`table.${prize.table}`, english);

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
    box.append(el("span", "", itemName(it).slice(0, 1).toUpperCase()));
  }
  box.setAttribute("aria-hidden", "true");
  return box;
}

/** The table every player has (tables.ts, the manifest's default: Sunny Day): never a month's prize. */
const DEFAULT_TABLE = BUILT_IN_TABLE;

/** Art's suitcases (public/art, transparent): open from above (its teal lining plain across the middle), closed, and small. */
const ART = {
  open: new URL(`${import.meta.env.BASE_URL}art/suitcase-open.webp`, location.href).href,
  closed: `${import.meta.env.BASE_URL}art/suitcase-closed.webp`,
  small: `${import.meta.env.BASE_URL}art/suitcase-closed-small.webp`,
};

/** A full suitcase's prize on the win card: the month's table (if it landed) and its helpers. */
function fullPrize(prize: Suitcase["prize"], table: boolean): HTMLElement {
  const row = el("span", "case-full");
  const art = table && prize.table !== DEFAULT_TABLE ? knownTable(prize.table) : undefined;
  if (art) {
    const img = el("img");
    Object.assign(img, { src: thumbOf(art), alt: "", draggable: false, decoding: "async" });
    row.append(img, el("span", "full-table", t("case.tableName", { table: prizeTableName(prize, prize.tableTitle ?? art.title) })));
  }
  for (const k of ["hint", "undo", "shuffle"] as HelperKind[]) {
    const n = prize.helpers[k];
    if (!n) continue;
    const tool = el("span", "tool");
    tool.innerHTML = ICONS[k];
    tool.append(el("span", "", `×${n}`));
    tool.setAttribute("aria-label", t(`win.gift.${k}`, { count: n }));
    row.append(tool);
  }
  return row;
}

/** A closed suitcase, Art's: the small one (the banner, the win card), or the shelf's. */
export function miniCase(cls = "", big = false): HTMLElement {
  const c = el("img", `mini-case${cls ? ` ${cls}` : ""}`);
  Object.assign(c, { src: big ? ART.closed : ART.small, alt: "", draggable: false, decoding: "async" });
  c.setAttribute("aria-hidden", "true");
  return c;
}

export function createSuitcase(nav: Nav) {
  // ---- home's strip, above the dock: the event (or the next one), a tap opens the suitcase ----
  const tileName = el("b", "strip-name");
  const tileLine = el("small", "strip-line");
  const stripWords = el("span", "strip-words");
  stripWords.append(tileName, tileLine);
  const caseArt = el("span", "strip-art");
  caseArt.append(miniCase("", true));
  const lock = vipTag("strip-tag");
  const tile = el("button", "btn event-strip");
  tile.type = "button";
  tile.dataset.press = "home.event";
  tile.hidden = true;
  tile.append(caseArt, stripWords, lock);
  tile.addEventListener("click", () => {
    if (eventShown()) return open();
    // not a VIP: the locked door, with the event's suitcase and prize
    const next = scheduledEvent();
    if (!next) return;
    const art = next.e.table ? knownTable(next.e.table) : undefined;
    nav.door({
      kind: "event",
      title: themeName({ month: next.e.id, theme: next.e.theme }),
      art: ART.closed,
      ...(art ? { table: { name: prizeTableName({ table: next.e.table, helpers: {} }, next.e.tableTitle ?? art.title), thumb: thumbOf(art) } } : {}),
      days: eventLength(next.e),
    });
  });

  // ---- the screen ----
  const pill = el("div", "top-pill glass");
  const back = el("button", "btn round top-back");
  back.type = "button";
  back.dataset.press = "case.back";
  back.innerHTML = ICONS.back;
  liveAttr(back, "aria-label", "case.back");
  const scroll = el("div", "scroll case-scroll");
  const screen = el("section", "screen menu-screen suitcase-screen");
  screen.hidden = true;
  screen.append(pill, back, scroll);

  /** The month on show: null is this month's; a month id is a shelf suitcase; UPCOMING the next event's preview. */
  let viewing: string | null = null;
  /** The missing item picked to swap for. */
  let picked: string | null = null;
  let swapping = false;
  let said = "";

  back.addEventListener("click", () => {
    if (viewing && viewing !== UPCOMING) {
      viewing = null;
      picked = null;
      draw();
      scroll.scrollTop = 0;
    } else nav.home();
  });

  /** The day's date on the platform's calendar (a guess until it lands). */
  const today = () => currentDaily().date;
  /** Days left in a running event, today included, from Levels' schedule (a non-VIP's strip). */
  const daysLeftOf = (end: string): number => Math.max(0, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86_400_000) + 1);
  const shown = (): Suitcase | null =>
    viewing === UPCOMING ? (suitcases.upcoming()?.s ?? null) : viewing ? (suitcases.past().find((s) => s.month === viewing) ?? null) : suitcases.current();

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
          // the swap sits under the play button: bring its button into view
          if (picked) screen.querySelector(".case-swap")?.scrollIntoView({ block: "nearest", behavior: lessMotion() ? "auto" : "smooth" });
        });
      }
      slot.append(itemPic(it, missing), el("span", "slot-name", itemName(it)));
      if (n > 1) slot.append(el("span", "slot-count", t("case.count", { count: n })));
      slot.setAttribute(
        "aria-label",
        missing ? `${itemName(it)}: ${t("case.missing")}` : n > 1 ? `${itemName(it)}: ${t("case.copies", { count: n })}` : `${itemName(it)}: ${t("case.packed")}`,
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
      b.textContent = t("case.swapFor", { count: SWAP_COST, item: itemName(it) });
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
    const on = shown();
    const answer: SwapAnswer = await suitcases.swap(it.id, viewing && viewing !== UPCOMING ? (on?.id ?? viewing) : undefined).catch((): SwapAnswer => "failed");
    swapping = false;
    picked = answer === "ok" ? null : picked;
    said = answer === "ok" ? t("case.swapped", { item: itemName(it) }) : t(`case.refused.${answer}`);
    // the swap that brought the last: the prize lands with it (Server pays, and says so once; the sting is Audio's)
    const now = shown();
    const prize = answer === "ok" ? suitcases.lastPrize() : null;
    if (answer === "ok" && (prize || now?.complete)) {
      // the table is said only once the platform holds it for the player (Server's `paid`: the month's table held)
      const table = !!now?.paid && now.prize.table !== DEFAULT_TABLE;
      said = t(table ? "case.swappedFull" : "case.swappedFullPlain", { item: itemName(it) });
      emit("suitcase:full", { month: prize?.month ?? now?.month ?? "" });
    }
    draw();
    if (answer === "ok") screen.querySelector(`.slot[aria-label^="${CSS.escape(itemName(it))}"]`)?.classList.add("arrived");
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
    words.append(el("span", "", own ? t("case.prizeTable", { table: prizeTableName(s.prize, s.prize.tableTitle ?? art?.title ?? "") }) : t("case.prizeHelpers")));
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

  /**
   * Today's daily, under the suitcase: "Play the Daily Puzzle!", the screen's amber button (the swap's
   * takes the amber while an item is picked); once today's is won, its results and when the next item
   * comes. The creator's event preview plays its next event puzzle under the same words, in practice.
   */
  function play(s: Suitcase): HTMLElement | null {
    const box = el("div", "case-play");
    if (suitcases.previewing()) {
      const b = el("button", `btn ${picked ? "" : "amber "}case-daily case-event`);
      b.type = "button";
      b.dataset.press = "case.playEvent";
      b.textContent = t("case.play");
      b.addEventListener("click", () => nav.playEvent());
      box.append(b, el("p", "case-note", t("case.previewNote")));
      return box;
    }
    const d = nav.daily();
    if (!d) return null;
    const b = el("button", `btn ${d.done || picked ? "" : "amber "}case-daily`);
    b.type = "button";
    b.dataset.press = d.done ? "case.results" : "case.play";
    b.textContent = d.done ? t("case.results") : t("case.play");
    b.addEventListener("click", () => d.go());
    box.append(b);
    // the month's last day has no tomorrow for this suitcase
    if (d.done) box.append(el("p", "case-later glass", s.daysLeft > 1 ? t("case.tomorrow") : t("case.lastDay")));
    return box;
  }

  /** A past event's 14 days, each a button that plays its board (won: ticked), in date order. */
  function pastDays(s: Suitcase): HTMLElement | null {
    const days = s.days ? Object.keys(s.days).sort() : [];
    if (!days.length) return null;
    const box = el("section", "case-days");
    const head = el("h2", "", t("case.pastDays"));
    const grid = el("div", "case-day-grid");
    const fmt = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", timeZone: "UTC" });
    for (const date of days) {
      const won = !!dailyResult(date);
      const b = el("button", `btn case-day${won ? " done" : ""}`);
      b.type = "button";
      b.dataset.press = "case.day";
      const [y, m, d] = date.split("-").map(Number);
      const label = fmt.format(new Date(Date.UTC(y!, m! - 1, d!)));
      b.append(el("span", "n", label));
      if (won) b.insertAdjacentHTML("beforeend", `<svg class="tick" viewBox="0 0 40 32" aria-hidden="true"><path d="M5 17l10 10L36 4"/></svg>`);
      b.setAttribute("aria-label", t(won ? "case.dayDone" : "case.day", { day: label }));
      b.addEventListener("click", () => nav.playDay(date, s.id ?? s.month));
      grid.append(b);
    }
    box.append(head, grid);
    return box;
  }

  /** How it works: four short steps, information only (the creator, 2026-10-28). */
  function howItWorks(s: Suitcase): HTMLElement {
    const box = el("section", "case-how glass");
    const head = el("h2", "", t("case.how.title"));
    head.id = "case-how-title";
    box.setAttribute("aria-labelledby", head.id);
    const own = s.prize.table !== DEFAULT_TABLE;
    const table = own ? prizeTableName(s.prize, s.prize.tableTitle ?? knownTable(s.prize.table)?.title ?? "") : "";
    const steps = el("ol");
    for (const line of [
      t("case.how.play"),
      t("case.how.hides"),
      t("case.how.swap", { count: SWAP_COST }),
      table ? t("case.how.prizeTable", { count: s.items.length, table }) : t("case.how.prizeHelpers", { count: s.items.length }),
    ])
      steps.append(el("li", "", line));
    box.append(head, steps);
    return box;
  }

  function shelf(): HTMLElement | null {
    const past = suitcases.past().slice(0, 12);
    if (!past.length) return null;
    const box = el("div", "case-shelf");
    box.append(el("h2", "", t("case.shelf")));
    const row = el("div", "shelf-row");
    const fmt = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", timeZone: "UTC" });
    for (const s of past) {
      const b = el("button", `btn shelf-case${s.complete ? " full" : ""}`);
      b.type = "button";
      b.dataset.press = "case.shelf";
      const when = s.start ? fmt.format(new Date(`${s.start}T00:00:00Z`)) : "";
      b.append(miniCase("", true), el("b", "", themeName(s)), el("span", "", when), el("small", "", t("case.packedOf", { count: held(s), all: s.items.length })));
      b.setAttribute("aria-label", `${eventTitle(s)}: ${t("case.packedOf", { count: held(s), all: s.items.length })}`);
      b.addEventListener("click", () => open(s.month));
      row.append(b);
    }
    box.append(row);
    return box;
  }

  function draw(): void {
    drawTile();
    if (screen.hidden) return;
    // the event began (or a preview was switched off) while its preview was up: this month's now
    if (viewing === UPCOMING && suitcases.current()) viewing = null;
    const s = shown();
    if (!s) {
      pill.textContent = t("case.name");
      scroll.replaceChildren(el("p", "case-empty", t("case.none")));
      return;
    }
    // the running event's, or a past one's (a VIP can still fill it: its days and the swap stay open)
    const past = !!viewing && viewing !== UPCOMING;
    const open = past || (!viewing && s.daysLeft > 0);
    pill.textContent = eventTitle(s);
    const status = el("p", "case-status glass");
    const next = viewing === UPCOMING ? suitcases.upcoming() : null;
    if (next) status.append(el("b", "", t("case.starts", { date: shortDate(next.starts) })), " · ", el("span", "", t("case.previewWhy")));
    else
      status.append(
        el("b", "", t("case.packedOf", { count: held(s), all: s.items.length })),
        " · ",
        el("span", "", past ? t("case.ended") : open ? t("case.daysLeftOf", { count: s.daysLeft, all: eventLength(s) }) : t("case.closed")),
      );
    const parts: (HTMLElement | null)[] = [status];
    // Art's open suitcase round the slots, its plain lining stretched to fit them (a 9-slice, style.css)
    const suitcase = el("div", "case");
    suitcase.style.setProperty("--case-art", `url("${ART.open}")`);
    suitcase.append(slots(s, open && !s.complete));
    const wrap = el("div", "case-wrap");
    wrap.append(suitcase);
    parts.push(wrap);
    // this month's (or the creator's preview of it, its puzzles in practice: the creator, 2026-10-27,
    // "let me play those puzzles and go through the whole process"): today's daily, under the suitcase
    if (!viewing) parts.push(play(s));
    // a past event: its 14 days, each playable
    if (past) parts.push(pastDays(s));
    // the swap, close under the slots it picks from; with no spares it waits for a pick (how it works,
    // next, says what spares are), so a new player reads how it works straight under the button
    if (open && !s.complete && (picked || spares(s) > 0)) parts.push(swapPanel(s));
    // how it works: this month's and the next one's preview, never a shelf month
    if (!viewing || viewing === UPCOMING) parts.push(howItWorks(s));
    parts.push(prize(s));
    if (!viewing && !suitcases.previewing()) parts.push(shelf());
    scroll.replaceChildren(...parts.filter((p): p is HTMLElement => !!p));
  }

  /**
   * Home's strip: "Event · Ski Trip", its days left (or when it starts). A VIP's is the platform's event
   * (or the next one's preview); anyone else's is Levels' schedule, locked.
   */
  function drawTile(): void {
    const vip = eventShown();
    const s = vip ? (suitcases.current() ?? suitcases.upcoming()?.s ?? null) : null;
    const sch = vip ? null : scheduledEvent();
    tile.hidden = !eventDoor() || (vip ? !s : !sch);
    lock.hidden = vip;
    tile.classList.toggle("locked", !vip);
    if (vip && s) {
      const up = !suitcases.current() ? suitcases.upcoming() : null;
      tileName.textContent = t("case.strip", { theme: themeName(s) });
      tileLine.textContent = up ? t("case.starts", { date: shortDate(up.starts) }) : t("case.daysLeft", { count: s.daysLeft });
      tile.setAttribute("aria-label", t("case.tileAria", { theme: themeName(s) }));
    } else if (sch) {
      const theme = themeName({ month: sch.e.id, theme: sch.e.theme });
      tileName.textContent = t("case.strip", { theme });
      tileLine.textContent = sch.running ? t("case.daysLeft", { count: daysLeftOf(sch.e.end) }) : t("case.starts", { date: shortDate(sch.e.start) });
      tile.setAttribute("aria-label", t("case.tileLockedAria", { theme }));
    }
  }

  /** Open the suitcase: this month's; before the event, the next one's preview; or a shelf month. */
  function open(month: string | null = null): void {
    viewing = month ?? (suitcases.current() ? null : suitcases.upcoming() ? UPCOMING : null);
    picked = null;
    said = "";
    screen.hidden = false;
    nav.show();
    draw();
    scroll.scrollTop = 0;
    // the month's items (their names and pictures, a chunk of their own, usually in since home was
    // whole: warm) and, in a built game, its pack: drawn again once they are in
    const s = shown();
    if (s) void Promise.all([loadItems(s.month), ensureSuitcase(s.month)]).then(() => !screen.hidden && !swapping && draw(), () => undefined);
  }

  suitcases.onChange(() => {
    if (!swapping) draw();
  });
  // VIP came or went: the strip locks or opens; a VIP's screen up when VIP ends goes home
  onEventShown(() => {
    if (!screen.hidden && !eventShown()) return nav.home();
    draw();
  });
  // a past day won: its tick
  onProgress(() => {
    if (!screen.hidden && viewing && viewing !== UPCOMING) draw();
  });
  drawTile();

  return {
    screen,
    /** Home's dock tile. */
    tile,
    open,
    /** Load this month's items (or the next event's) ahead, once home is whole, so the screen opens with them. */
    warm(): void {
      const s = suitcases.current() ?? suitcases.upcoming()?.s ?? null;
      if (s) void loadItems(s.month).catch(() => undefined);
    },
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
  /** The 10th: the month, whether its table landed with the prize (else the helpers alone are said), and the prize. */
  full: { month: string; table: boolean; prize?: Suitcase["prize"] } | null = null,
): void {
  const mini = miniCase("on-card");
  // a new item says how full the suitcase is; a spare copy says how many of it there are now
  const words = el("span", "packed-words", count > 1 ? t("case.packedAgain", { item: itemName(item), count }) : t("case.packedCard", { item: itemName(item), count: packed, all }));
  line.replaceChildren(mini, words);
  line.classList.add("packed");
  // the 10th: the prize under the line (the table, if it landed, and the helpers), its place kept from
  // the start so nothing on the card moves when it shows
  const prizeRow = full?.prize ? fullPrize(full.prize, full.table) : null;
  if (prizeRow) line.append(prizeRow);
  /** It has landed: the latch (Audio's), and the full suitcase's word when this was the 10th. */
  const landed = () => {
    mini.classList.add("bump");
    emit("suitcase:packed", { id: item.id, count });
    if (full) {
      // with the prize row under it, the words are short: the row says the table and the helpers
      words.textContent = prizeRow ? t("case.fullShort") : t(full.table ? "case.fullCard" : "case.fullHelpers");
      prizeRow?.classList.add("shown");
      emit("suitcase:full", { month: full.month });
    }
  };
  // it takes off from its own picture in the card's gallery (the item and its picture share an id), else the card's middle
  const card = line.closest(".card");
  const own = card?.querySelector<HTMLElement>(`[data-pic="${CSS.escape(item.id)}"]`) ?? null;
  const src = url || own?.querySelector("img")?.currentSrc || item.pic || "";
  if (!src || lessMotion()) {
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
