// THE EVENTS on screen (docs/vip.md, the creator, 2026-10-30): VIP content packs, each 30 levels of its own
// with 10 travel items hidden one per level; finding all 10 wins the event's table. A VIP plays any released
// event at any time. The record is the platform's (suitcase-data.ts, over Server's module):
//
//   the strip       home, just above the dock (the creator's pick, 2026-10-30): Art's closed suitcase, a
//                   bold "Event!" and "Now playing: Haunted Holiday!" (the creator's words; where that will
//                   not fit on its line, measured as the top row's title is, "Haunted Holiday!"), and under
//                   it "4 of 10 found · 12 of 30 levels"; a tap opens the newest event's page. For a player
//                   who is not a VIP it wears the padlock and gold VIP tag and opens the locked door's
//                   screen (vip-door.ts): the event's suitcase and prize table.
//   the event page  a screen of its own: "Event!" and "Now playing: Haunted Holiday!" (a past one's "Past
//                   event"), the 10-slot suitcase (each item's picture once found, its outline while
//                   missing), "Play level 13" (the first level not won yet, the page's main action), then
//                   the past events as a row of cards, close under it so they are seen (the creator could
//                   not find them at the page's foot), and "Coming soon: Ski Trip · Nov 1"; then the 30
//                   levels as a grid (won ones ticked; a level hiding an item wears a small suitcase until
//                   it is found, then the item itself; hard ones say so), how it works and the prize. Every
//                   level is open: tapping one plays it, and its win card comes back here. A past event
//                   keeps its progress and stays winnable; the newest released is the one now playing.
//   the preview     an event announced but not released yet (only while none is out): its suitcase in
//                   outline, when it opens, how it works and its prize; nothing to play yet.
//   the win card    an event level's first win packs its item: once the checker's verdict says so, the
//                   item's picture flies into a small suitcase on the card, and the line says "Bran Castle
//                   packed! 5 of 10". Decoration only: it takes no touch and never holds the card's buttons.
//   the board       the item's picture finished on a level's first win: item-found.ts's moment.
//
// No item is shown before it is found: a missing slot is the item's outline and name. Information is glass;
// only what a press answers is a button.

import { emit } from "../events";
import { liveAttr, locale, named, t } from "./i18n";
import { ICONS } from "./icons";
import { eventDoor, eventShown, onEventShown } from "./event-switch";
import { EVENT_LEVELS, scheduledEvent, suitcases, type EventItem, type EventPack, type SuitItem } from "./suitcase-data";
import { onProgress } from "../net/progress";
import { loadEventLevels } from "../game/levels";
import { vipTag, type VipDoor } from "./vip-door";
import { BUILT_IN_TABLE, knownTable, thumbOf } from "./tables";
import { shortDate } from "./format";
import { markTag } from "./marks";
import { loadItems, suitcaseItem } from "./catalogue";
import { ensureSuitcase, fileUrl } from "../packs";
import type { HelperKind } from "./stock";

type Nav = {
  home(): void;
  /** Show the event screen (the app's screen switch). */
  show(): void;
  /** Play level `level` of event `event` (app.ts: its board; its win card comes back to this event's page). */
  playLevel(event: string, level: string): void;
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

/** A title or a label starts with a capital, whatever the language writes it with. */
const capital = (s: string): string => s.charAt(0).toLocaleUpperCase(locale()) + s.slice(1);
/** An event's theme in the player's language (the locale's names list), else its English. */
export const themeName = (e: { id: string; theme: string }): string => named(`suitcase.${e.id}.theme`, e.theme);
/** The event's title: its theme ("Haunted Holiday"). */
export const eventTitle = (e: { id: string; theme: string }): string => capital(themeName(e));
/** An item's name in the player's language, else its English. */
export const itemName = (it: { id: string; title: string }): string => named(`picture.${it.id}`, it.title);
const prizeTableName = (prize: EventPack["prize"], english: string): string => named(`table.${prize.table}`, english);
/** "4 of 10 found · 12 of 30 levels". */
export const progressLine = (e: EventPack): string =>
  `${t("case.foundOf", { found: e.found, all: e.items.length })} · ${t("case.levelsOf", { won: suitcases.wonCount(e), count: e.levels.length || EVENT_LEVELS })}`;

/**
 * An item's picture. Art's cut-out (the object alone, on transparency) once there is one: itself when
 * found, darkened to its outline when missing. Without a cut-out (Art's stand-ins): the board copy
 * when found, a dashed outline with its first letter when missing. No art at all: a stand-in tile.
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

/** The table every player has (tables.ts, the manifest's default: Sunny Day): never an event's prize. */
const DEFAULT_TABLE = BUILT_IN_TABLE;

/** Art's suitcases (public/art, transparent): open from above (its teal lining plain across the middle), closed, and small. */
const ART = {
  open: new URL(`${import.meta.env.BASE_URL}art/suitcase-open.webp`, location.href).href,
  closed: `${import.meta.env.BASE_URL}art/suitcase-closed.webp`,
  small: `${import.meta.env.BASE_URL}art/suitcase-closed-small.webp`,
};

/** The helpers a prize pays, as small icons with their count (information). */
function prizeTools(prize: EventPack["prize"]): HTMLElement {
  const tools = el("span", "prize-tools");
  for (const k of ["hint", "undo", "shuffle"] as HelperKind[]) {
    const n = prize.helpers[k];
    if (!n) continue;
    const tool = el("span", "tool");
    tool.innerHTML = ICONS[k];
    tool.append(el("span", "", `×${n}`));
    tool.setAttribute("aria-label", t(`win.gift.${k}`, { count: n }));
    tools.append(tool);
  }
  return tools;
}

/** A full suitcase's prize on the win card: the event's table (if it landed) and its helpers. */
function fullPrize(prize: EventPack["prize"], table: boolean): HTMLElement {
  const row = el("span", "case-full");
  const art = table && prize.table !== DEFAULT_TABLE ? knownTable(prize.table) : undefined;
  if (art) {
    const img = el("img");
    Object.assign(img, { src: thumbOf(art), alt: "", draggable: false, decoding: "async" });
    row.append(img, el("span", "full-table", t("case.tableName", { table: prizeTableName(prize, prize.tableTitle ?? art.title) })));
  }
  for (const tool of [...prizeTools(prize).children]) row.append(tool);
  return row;
}

/** A closed suitcase, Art's: the small one (a level's mark, the win card), or the strip's and the list's. */
export function miniCase(cls = "", big = false): HTMLElement {
  const c = el("img", `mini-case${cls ? ` ${cls}` : ""}`);
  Object.assign(c, { src: big ? ART.closed : ART.small, alt: "", draggable: false, decoding: "async" });
  c.setAttribute("aria-hidden", "true");
  return c;
}

/** "Level 13" plus what the level holds, for a level button's name. */
function levelLabel(n: number, won: boolean, item: EventItem | null): string {
  if (item?.found) return t("case.levelFound", { n, item: itemName(item) });
  if (won) return t("case.levelWon", { n });
  if (item) return t("case.levelItem", { n });
  return t("board.level", { level: n });
}

export function createSuitcase(nav: Nav) {
  // ---- home's strip, above the dock: the newest event, a tap opens its page ----
  const tileTag = el("span", "strip-event", t("case.eventTag"));
  const tileName = el("b", "strip-name");
  const tileHead = el("span", "strip-head");
  tileHead.append(tileTag, tileName);
  const tileLine = el("small", "strip-line");
  const stripWords = el("span", "strip-words");
  stripWords.append(tileHead, tileLine);
  /** The strip's name in full ("Now playing: Haunted Holiday!") and short ("Haunted Holiday!"). */
  let names = { full: "", short: "" };
  /**
   * The full name where it fits on its one line, else the short one (which may wrap: never cut off).
   * Measured, never guessed, as the top row's title is: at each draw, resize and change of the words.
   */
  const fitName = (): void => {
    tileName.classList.remove("short");
    tileName.textContent = names.full;
    if (!tile.isConnected || tile.hidden || !tileName.clientWidth) return;
    if (tileName.scrollWidth > tileName.clientWidth + 1) {
      tileName.textContent = names.short;
      tileName.classList.add("short");
    }
  };
  const caseArt = el("span", "strip-art");
  caseArt.append(miniCase("", true));
  const lock = vipTag("strip-tag");
  const tile = el("button", "btn event-strip");
  tile.type = "button";
  tile.dataset.press = "home.event";
  tile.hidden = true;
  tile.append(caseArt, stripWords, lock);
  new ResizeObserver(() => fitName()).observe(tile);
  tile.addEventListener("click", () => {
    if (eventShown()) return open();
    // not a VIP: the locked door, with the event's suitcase and prize
    const sch = scheduledEvent();
    if (!sch) return;
    const e = sch.e;
    const art = e.table ? knownTable(e.table) : undefined;
    nav.door({
      kind: "event",
      title: eventTitle(e),
      headline: sch.released ? t("case.nowPlaying", { theme: themeName(e) }) : t("case.comingSoonName", { theme: themeName(e) }),
      art: ART.closed,
      ...(art ? { table: { name: prizeTableName({ table: e.table, helpers: {} }, e.tableTitle ?? art.title), thumb: thumbOf(art) } } : {}),
      levels: e.levels?.length || EVENT_LEVELS,
      items: e.items.length,
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

  /** The event on show: null is the newest (or, with none out, the next one's preview); else an event's id. */
  let viewing: string | null = null;
  /** Each level's mark (hard, super), from Gameplay's loader once it is in. */
  const marks = new Map<string, "hard" | "super">();
  let marksAsked = false;

  back.addEventListener("click", () => {
    // another event's page goes back to the newest's; the newest's goes home
    if (viewing && viewing !== suitcases.newest()?.id) {
      viewing = null;
      draw();
      scroll.scrollTop = 0;
    } else nav.home();
  });

  const shown = (): EventPack | null => (viewing ? suitcases.get(viewing) : suitcases.newest());
  /** The next event to open, while none is out (a VIP's preview). */
  const nextUp = (): { id: string; theme: string; release: string } | null => (suitcases.newest() ? null : (suitcases.upcoming()[0] ?? null));

  function slots(e: { items: EventItem[] }): HTMLElement {
    const grid = el("div", "case-slots");
    grid.setAttribute("role", "list");
    for (const it of e.items) {
      const missing = !it.found;
      const slot = el("div", `slot${missing ? " missing" : ""}`);
      slot.setAttribute("role", "listitem");
      slot.dataset.item = it.id;
      slot.append(itemPic(it, missing), el("span", "slot-name", itemName(it)));
      slot.setAttribute("aria-label", `${itemName(it)}: ${t(missing ? "case.missing" : "case.packed")}`);
      grid.append(slot);
    }
    return grid;
  }

  /** The page's main action: the first level not won yet; with all won, a line that says so. */
  function playNext(e: EventPack): HTMLElement {
    const box = el("div", "case-play");
    const i = e.levels.findIndex((id) => !suitcases.won(id));
    if (i < 0) {
      box.append(el("p", "case-later glass", t("case.allWon")));
      return box;
    }
    const b = el("button", "btn amber case-daily");
    b.type = "button";
    b.dataset.press = "case.playLevel";
    b.textContent = t("case.playLevel", { n: i + 1 });
    b.addEventListener("click", () => nav.playLevel(e.id, e.levels[i]!));
    box.append(b);
    return box;
  }

  /** The event's 30 levels, a grid of buttons in play order: won ones ticked, an item's level marked. */
  function levelGrid(e: EventPack): HTMLElement {
    const box = el("section", "case-levels");
    const head = el("h2", "", t("case.levels"));
    const grid = el("div", "case-level-grid");
    e.levels.forEach((id, i) => {
      const n = i + 1;
      const won = suitcases.won(id);
      const item = suitcases.itemOn(e, id);
      const mark = marks.get(id);
      const b = el("button", `btn case-level${won ? " done" : ""}${item ? " has-item" : ""}${mark ? ` ${mark}` : ""}`);
      b.type = "button";
      b.dataset.press = "case.level";
      b.dataset.level = id;
      b.append(el("b", "n", String(n)));
      if (mark) b.append(markTag(mark, true));
      if (item) {
        const badge = el("span", `lv-item${item.found ? " found" : ""}`);
        badge.append(item.found ? itemPic(item, false) : miniCase());
        b.append(badge);
      }
      if (won) b.insertAdjacentHTML("beforeend", `<svg class="tick" viewBox="0 0 40 32" aria-hidden="true"><path d="M5 17l10 10L36 4"/></svg>`);
      b.setAttribute("aria-label", `${levelLabel(n, won, item)}${mark ? `, ${markTag(mark).textContent}` : ""}`);
      b.addEventListener("click", () => nav.playLevel(e.id, id));
      grid.append(b);
    });
    box.append(head, grid);
    return box;
  }

  /** How it works: short steps, information only. */
  function howItWorks(e: { items: EventItem[]; levels: string[]; prize: EventPack["prize"] }): HTMLElement {
    const box = el("section", "case-how glass");
    const head = el("h2", "", t("case.how.title"));
    head.id = "case-how-title";
    box.setAttribute("aria-labelledby", head.id);
    const own = e.prize.table !== DEFAULT_TABLE;
    const table = own ? prizeTableName(e.prize, e.prize.tableTitle ?? knownTable(e.prize.table)?.title ?? "") : "";
    const count = e.items.length;
    const steps = el("ol");
    for (const line of [
      t("case.how.levels", { count: e.levels.length || EVENT_LEVELS }),
      t("case.how.items", { count }),
      table ? t("case.how.prizeTable", { count, table }) : t("case.how.prizeHelpers", { count }),
      t("case.how.keep"),
    ])
      steps.append(el("li", "", line));
    box.append(head, steps);
    return box;
  }

  function prize(e: { items: EventItem[]; prize: EventPack["prize"]; paid: boolean }): HTMLElement {
    const box = el("div", `case-prize glass${e.paid ? " won" : ""}`);
    // an event whose table Art has not made yet names the built-in one (Server's): its prize is the helpers alone
    const own = e.prize.table !== DEFAULT_TABLE;
    const art = own ? knownTable(e.prize.table) : undefined;
    const pic = el("span", "prize-table");
    if (art) {
      const img = el("img");
      Object.assign(img, { src: thumbOf(art), alt: "", draggable: false, decoding: "async" });
      pic.append(img);
    }
    pic.setAttribute("aria-hidden", "true");
    const words = el("div", "prize-words");
    words.append(el("b", "", e.paid ? t("case.prizeWon") : t("case.prizeHead", { count: e.items.length })));
    words.append(el("span", "", own ? t("case.prizeTable", { table: prizeTableName(e.prize, e.prize.tableTitle ?? art?.title ?? "") }) : t("case.prizeHelpers")));
    words.append(prizeTools(e.prize));
    if (e.paid && own) words.append(el("span", "prize-note", t("case.prizeWhere")));
    if (art) box.append(pic);
    box.append(words);
    return box;
  }

  /** The page's head: "Event!" and "Now playing: Haunted Holiday!", a past one's "Past event" and its name, the next one's "Coming soon". */
  function hero(tag: string, words: string, past = false): HTMLElement {
    const box = el("div", `case-hero${past ? " past" : ""}`);
    box.append(el("span", "case-hero-tag", tag), el("h2", "", words));
    return box;
  }

  /** The past events (every released one but the newest), each a card to its page with how far the player is. */
  function pastRow(): HTMLElement | null {
    const newest = suitcases.newest()?.id;
    const list = suitcases.list().filter((e) => e.id !== newest);
    if (!list.length) return null;
    const box = el("div", "case-shelf");
    box.append(el("h2", "", t("case.shelf")));
    const row = el("div", "shelf-row");
    for (const e of list) {
      const b = el("button", `btn shelf-case${e.complete ? " full" : ""}`);
      b.type = "button";
      b.dataset.press = "case.shelf";
      b.append(
        miniCase("", true),
        el("b", "", themeName(e)),
        el("small", "", t("case.foundOf", { found: e.found, all: e.items.length })),
        el("small", "", t("case.levelsOf", { won: suitcases.wonCount(e), count: e.levels.length || EVENT_LEVELS })),
      );
      b.setAttribute("aria-label", `${eventTitle(e)}: ${progressLine(e)}`);
      b.addEventListener("click", () => open(e.id));
      row.append(b);
    }
    box.append(row);
    return box;
  }

  /** The next event to come, on its own line (information): "Coming soon: Ski Trip · Nov 1". */
  function comingSoon(except: string | null): HTMLElement | null {
    const u = suitcases.upcoming().find((x) => x.id !== except);
    return u ? el("p", "case-soon glass", t("case.comingSoon", { theme: themeName(u), date: shortDate(u.release) })) : null;
  }

  function draw(): void {
    drawTile();
    if (screen.hidden) return;
    const e = shown();
    const next = !e && !viewing ? nextUp() : null;
    pill.textContent = t("case.name");
    if (!e && !next) {
      scroll.replaceChildren(el("p", "case-empty", t("case.none")));
      return;
    }
    const parts: (HTMLElement | null)[] = [];
    // Art's open suitcase round the slots, its plain lining stretched to fit them (a 9-slice, style.css)
    const suitcase = el("div", "case");
    suitcase.style.setProperty("--case-art", `url("${ART.open}")`);
    const wrap = el("div", "case-wrap");
    wrap.append(suitcase);
    if (e) {
      // the newest released is the one now playing; any other is a past event, still winnable
      const past = e.id !== suitcases.newest()?.id;
      const status = el("p", "case-status glass");
      status.append(el("b", "", t("case.foundOf", { found: e.found, all: e.items.length })), " · ", el("span", "", t("case.levelsOf", { won: suitcases.wonCount(e), count: e.levels.length || EVENT_LEVELS })));
      suitcase.append(slots(e));
      const head = past ? hero(t("case.pastEvent"), eventTitle(e), true) : hero(t("case.eventTag"), t("case.nowPlaying", { theme: themeName(e) }));
      // the past events and the next one close under the suitcase, where a phone shows them: on the newest's page
      parts.push(head, status, wrap, playNext(e), ...(past ? [] : [pastRow(), comingSoon(null)]), levelGrid(e), howItWorks(e), prize(e));
    } else if (next) {
      // an event to come, with none out yet: its suitcase in outline, when it opens, how it works, its prize
      const data = scheduledFor(next.id);
      const status = el("p", "case-status glass");
      status.append(el("b", "", t("case.starts", { date: shortDate(next.release) })), " · ", el("span", "", t("case.previewWhy")));
      const items: EventItem[] = (data?.items ?? []).map((it) => ({ id: it.id, title: it.title, level: null, found: false }));
      suitcase.append(slots({ items }));
      const preview = { items, levels: data?.levels ?? [], paid: false, prize: { table: data?.table ?? DEFAULT_TABLE, ...(data?.tableTitle ? { tableTitle: data.tableTitle } : {}), helpers: {} } };
      parts.push(hero(t("case.eventTag"), t("case.comingSoonName", { theme: themeName(next) })), status, wrap, howItWorks(preview), prize(preview), comingSoon(next.id));
    }
    scroll.replaceChildren(...parts.filter((p): p is HTMLElement => !!p));
  }

  /** Levels' schedule entry for event `id` (a preview's items and prize). */
  const scheduledFor = (id: string) => {
    const sch = scheduledEvent();
    return sch?.e.id === id ? sch.e : null;
  };

  /**
   * Home's strip: "Event · Haunted Holiday" and how far the player is (or when the next one opens). A VIP's
   * is the platform's newest event; anyone else's is Levels' schedule, locked.
   */
  function drawTile(): void {
    const vip = eventShown();
    const e = vip ? suitcases.newest() : null;
    const up = vip && !e ? nextUp() : null;
    const sch = vip ? null : scheduledEvent();
    tile.hidden = !eventDoor() || (vip ? !e && !up : !sch);
    lock.hidden = vip;
    tile.classList.toggle("locked", !vip);
    tileTag.textContent = t("case.eventTag");
    if (e) {
      names = { full: t("case.nowPlaying", { theme: themeName(e) }), short: t("case.themeBang", { theme: themeName(e) }) };
      tileLine.textContent = progressLine(e);
      tile.setAttribute("aria-label", t("case.tileAria", { theme: themeName(e) }));
    } else if (up) {
      names = { full: t("case.comingSoonName", { theme: themeName(up) }), short: themeName(up) };
      tileLine.textContent = t("case.starts", { date: shortDate(up.release) });
      tile.setAttribute("aria-label", t("case.tileAria", { theme: themeName(up) }));
    } else if (sch) {
      const theme = themeName(sch.e);
      names = sch.released ? { full: t("case.nowPlaying", { theme }), short: t("case.themeBang", { theme }) } : { full: t("case.comingSoonName", { theme }), short: theme };
      tileLine.textContent = sch.released
        ? t("case.lockedLine", { count: sch.e.levels?.length || EVENT_LEVELS, items: sch.e.items.length })
        : t("case.starts", { date: shortDate(sch.e.release ?? sch.e.start ?? "") });
      tile.setAttribute("aria-label", t("case.tileLockedAria", { theme }));
    }
    fitName();
  }

  /** Open an event's page: the newest (or the next one's preview, with none out), or event `id`. */
  function open(id: string | null = null): void {
    viewing = id && id !== suitcases.newest()?.id ? id : null;
    screen.hidden = false;
    nav.show();
    suitcases.refresh();
    draw();
    scroll.scrollTop = 0;
    // the event's items (their names and pictures) and, in a built game, its pack; the levels' marks
    // (Gameplay's loader, the first time a page opens): drawn again once they are in
    const e = shown() ?? nextUp();
    if (e) void Promise.all([loadItems(e.id), ensureSuitcase(e.id)]).then(() => !screen.hidden && draw(), () => undefined);
    if (!marksAsked) {
      marksAsked = true;
      void loadEventLevels().then(
        (all) => {
          for (const l of all) if (l.mark) marks.set(l.id, l.mark);
          if (!screen.hidden) draw();
        },
        () => (marksAsked = false), // ask again on the next open
      );
    }
  }

  suitcases.onChange(() => draw());
  // VIP came or went: the strip locks or opens; a VIP's page up when VIP ends goes home
  onEventShown(() => {
    if (!screen.hidden && !eventShown()) return nav.home();
    draw();
  });
  // a level won: its tick, and the next level to play
  onProgress(() => {
    if (!screen.hidden) draw();
    else drawTile();
  });
  drawTile();

  return {
    screen,
    /** Home's strip. */
    tile,
    open,
    /** The page an event level's win card goes back to. */
    openEvent: (id: string) => open(id),
    /** Load the newest event's items ahead, once home is whole, so its page opens with them. */
    warm(): void {
      const e = suitcases.newest() ?? nextUp();
      if (e) void loadItems(e.id).catch(() => undefined);
    },
    /** Redraw (the record or the words changed). */
    redraw: draw,
    /** Leave the screen (another screen is showing). */
    leave(): void {
      viewing = null;
    },
  };
}

/**
 * The win card's moment (an event level's first win, once the checker says it packed `item`): a small
 * suitcase in the card's line, the item's picture flying into it from `url` (the board's copy, from
 * suitcase:item), else its own picture in the card's gallery, else Art's; and the line saying what came.
 * Takes no touch, holds nothing.
 */
export function packedOnCard(
  line: HTMLElement,
  item: SuitItem,
  url: string,
  packed: number,
  all: number,
  /** The 10th: the event, whether its table landed with the prize (else the helpers alone are said), and the prize. */
  full: { event: string; table: boolean; prize?: EventPack["prize"] } | null = null,
): void {
  const mini = miniCase("on-card");
  const words = el("span", "packed-words", t("case.packedCard", { item: itemName(item), count: packed, all }));
  line.replaceChildren(mini, words);
  line.classList.add("packed");
  // the 10th: the prize under the line (the table, if it landed, and the helpers), its place kept from
  // the start so nothing on the card moves when it shows
  const prizeRow = full?.prize ? fullPrize(full.prize, full.table) : null;
  if (prizeRow) line.append(prizeRow);
  /** It has landed: the latch (Audio's), and the full suitcase's word when this was the 10th. */
  const landed = () => {
    mini.classList.add("bump");
    emit("suitcase:packed", { id: item.id, count: 1 });
    if (full) {
      // with the prize row under it, the words are short: the row says the table and the helpers
      words.textContent = prizeRow ? t("case.fullShort") : t(full.table ? "case.fullCard" : "case.fullHelpers");
      prizeRow?.classList.add("shown");
      emit("suitcase:full", { month: full.event });
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
