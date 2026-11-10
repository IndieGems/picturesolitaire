// THE EVENTS on screen (docs/vip.md, the creator, 2026-10-30): content packs, each 30 levels of its own
// with 10 travel items hidden one per level; finding all 10 wins the event's table. Any player plays any
// released event at any time (open to everyone since 2026-11-10, the creator: "no VIP gates"; they were a
// VIP's until then). The record is the platform's (suitcase-data.ts, over Server's module):
//
//   the strip       home, just above the dock (the creator's pick, 2026-10-30): Art's closed suitcase, a
//                   bold "Event!" and "Now playing: Haunted Holiday!" (the creator's words; where that will
//                   not fit on its line, measured as the top row's title is, "Haunted Holiday!"), and under
//                   it "4 of 10 found · 12 of 30 levels"; a tap opens the newest event's page.
//   the event page  a screen of its own, laid out for a new player (the creator's pick, 2026-11-10: the old page
//                   made "very little sense to a new person"). Two tabs at the top switch the whole page:
//                   This event (home's strip opens it): "Coming soon: Grand Train Journey · Nov 15" (none, no
//                   line), the event's name ("Ski Trip!"), "2 of 10 found" over the 10-slot suitcase (each
//                   item's picture once found, its outline while missing), "Play level 3", the page's one action,
//                   then "Your progress: 2 of 30" over the 30 levels in play order, information only (won ones
//                   ticked; nothing tells which levels hide an item until one is won: then it wears a small
//                   suitcase, the creator, 2026-10-30, "lets not show which puzzles carry the suitcases"; the
//                   next one lit; hard ones say so), how it works and the prize. An event is played IN ORDER
//                   (the creator, 2026-11-10): Play is always the lowest level not won yet, and no level can be
//                   picked (the checker refuses one out of order, "out_of_order"). With all 30 won: "Event
//                   complete!" in Play's place. Past events: a card for each (its name, X of 10 found, Y of 30
//                   levels), or "No past events yet"; a card opens that event's page, the same but with no tabs
//                   and no Coming soon, under its "Past event" tag, and its Back goes back to the tab. A past
//                   event keeps its progress and stays winnable; the newest released is the one now playing.
//   the preview     an event announced but not released yet (only while none is out): This event's page shows
//                   its suitcase in outline, when it opens, how it works and its prize; nothing to play yet.
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
import { eventShown, onEventShown } from "./event-switch";
import { EVENT_ITEM_COINS, EVENT_LEVELS, scheduledEvent, suitcases, type EventItem, type EventPack, type SuitItem } from "./suitcase-data";
import { coinIcon } from "./coin";
import { eventStamp } from "./passport";
import { onProgress } from "../net/progress";
import { loadEventLevels } from "../game/levels";
import { BUILT_IN_TABLE, knownTable, thumbOf } from "./tables";
import { shortDate } from "./format";
import { markTag } from "./marks";
import { loadItems, suitcaseItem } from "./catalogue";
import { ensureSuitcase, fileUrl, resident } from "../packs";
import { vipRewardTag, vipSide } from "./vip-tag";
import { onVip } from "./vip-view";
import { vipExtraCoins } from "../net/vip";
import { eventItemCoins, onRewardsChange } from "../net/rewards";

type Nav = {
  home(): void;
  /** Show the event screen (the app's screen switch). */
  show(): void;
  /** Play level `level` of event `event` (app.ts: its board; its win card comes back to this event's page). */
  playLevel(event: string, level: string): void;
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
const prizeTableName = (prize: Prize, english: string): string => named(`table.${prize.table}`, english);

/**
 * The suitcase's packing list (style.css .case-slots; the creator, 2026-11-02): its names at 13 px, or all at
 * 12 px (`tight`) when one of them would not fit its place at 13, a word wider than its box or more than two
 * lines. Never smaller: a name still too wide at 12 says so (`data-over`, for the checks).
 */
function fitList(grid: HTMLElement): void {
  const names = [...grid.querySelectorAll<HTMLElement>(".slot-name")];
  const over = (n: HTMLElement) => n.scrollWidth > n.clientWidth + 0.5 || n.getBoundingClientRect().height > parseFloat(getComputedStyle(n).lineHeight) * 2 + 1;
  grid.classList.remove("tight");
  if (names.some(over)) grid.classList.add("tight");
  for (const n of names) n.toggleAttribute("data-over", over(n));
}
/** "4 of 10 found · 12 of 30 levels". */
export const progressLine = (e: EventPack): string =>
  `${t("case.foundOf", { found: e.found, all: e.items.length })} · ${t("case.levelsOf", { won: suitcases.wonCount(e), count: e.levels.length || EVENT_LEVELS })}`;

/**
 * An item's picture. Art's cut-out (the object alone, on transparency) once there is one: itself when
 * found, darkened to its outline when missing. Without a cut-out (Art's stand-ins): the board copy
 * when found, a dashed outline with its first letter when missing. No art at all: a stand-in tile.
 * A built game's file not in yet (the event's pack is on its way, src/packs.ts): an empty slot, and
 * the page is drawn again once it lands (never the plain path, which a built game does not serve).
 */
function itemPic(it: SuitItem, missing: boolean): HTMLElement {
  const box = el("span", `item-pic${missing ? " missing" : ""}`);
  const art = suitcaseItem(it.id);
  const file = art ? (art.cutout ?? art.picture) : null;
  if (!it.pic && file && !resident(file)) {
    box.setAttribute("aria-hidden", "true");
    return box;
  }
  const src = it.pic ?? (file ? fileUrl(file) : null);
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

/** An event's prize as the screens read it: its table (the stamp is the event's own; the Coins come with its items). */
type Prize = { table: string; tableTitle?: string };

/** The table every player has (tables.ts, the manifest's default: Sunny Day): never an event's prize. */
const DEFAULT_TABLE = BUILT_IN_TABLE;

/** Art's suitcases (public/art, transparent): open from above (its teal lining plain across the middle), closed, and small. */
const ART = {
  open: new URL(`${import.meta.env.BASE_URL}art/suitcase-open.webp`, location.href).href,
  closed: `${import.meta.env.BASE_URL}art/suitcase-closed.webp`,
  small: `${import.meta.env.BASE_URL}art/suitcase-closed-small.webp`,
};

/**
 * What one item found pays: the channel's config (Server's rewards.ts) and nothing else, so null (and nothing said)
 * until it is read. Never a figure of the game's own: the creator retunes it in the config (three times on 2026-11-10)
 * and a built-in copy would say the old one. Only the dev menu's stand-in events, unframed, say the stand-in's.
 */
const itemCoins = (): number | null => eventItemCoins() ?? (suitcases.pretending() ? EVENT_ITEM_COINS : null);

/** VIP's tag on what an item pays (vip-tag.ts), before it is won: while some of `e`'s items are still to find. */
function itemTag(e: { items: { found?: boolean }[] }): HTMLElement | null {
  const coins = itemCoins();
  if (coins === null || (e.items.length && e.items.every((i) => i.found))) return null;
  return vipRewardTag({ coins: vipExtraCoins(coins) }, vipSide());
}

/** A closed suitcase, Art's: the small one (a level's mark, the win card), or the strip's and the list's. */
export function miniCase(cls = "", big = false): HTMLElement {
  const c = el("img", `mini-case${cls ? ` ${cls}` : ""}`);
  Object.assign(c, { src: big ? ART.closed : ART.small, alt: "", draggable: false, decoding: "async" });
  c.setAttribute("aria-hidden", "true");
  return c;
}

/** "Level 13" plus what it gave, or that it is next, for a level's name: never whether a level not won yet hides an item. */
function levelLabel(n: number, won: boolean, found: EventItem | null, next: boolean): string {
  if (found) return t("case.levelFound", { n, item: itemName(found) });
  if (won) return t("case.levelWon", { n });
  if (next) return t("case.levelNext", { n });
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
  const tile = el("button", "btn event-strip");
  tile.type = "button";
  tile.dataset.press = "home.event";
  tile.hidden = true;
  tile.append(caseArt, stripWords);
  new ResizeObserver(() => fitName()).observe(tile);
  tile.addEventListener("click", () => open());

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

  /** The tab on show: This event (the newest, or the next one's preview) or Past events. */
  let tab: "now" | "past" = "now";
  /** A past event's own page (from the Past events tab, or its level's win card): its id; null for the tabs. */
  let viewing: string | null = null;
  /** Each level's mark (hard, super), from Gameplay's loader once it is in. */
  const marks = new Map<string, "hard" | "super">();
  let marksAsked = false;

  back.addEventListener("click", () => {
    // a past event's page goes back to the Past events tab; the tabs go home
    if (viewing) {
      viewing = null;
      tab = "past";
      draw();
      scroll.scrollTop = 0;
    } else nav.home();
  });

  // the two tabs over the page, switching the whole of it (the passport's tabs, the shown one pressed in)
  const tabs = el("div", "pp-tabs case-tabs");
  tabs.setAttribute("role", "tablist");
  const tabButton = (which: "now" | "past") => {
    const b = el("button", "btn pp-tab");
    b.type = "button";
    b.dataset.press = `case.tab.${which}`;
    b.setAttribute("role", "tab");
    b.addEventListener("click", () => {
      if (tab === which) return;
      tab = which;
      draw();
      scroll.scrollTop = 0;
    });
    return b;
  };
  const nowTab = tabButton("now");
  const pastTab = tabButton("past");
  tabs.append(nowTab, pastTab);
  function drawTabs(): HTMLElement {
    for (const [b, which] of [[nowTab, "now"], [pastTab, "past"]] as const) {
      b.textContent = t(`case.tab.${which}`);
      b.classList.toggle("pressed", tab === which);
      b.setAttribute("aria-selected", String(tab === which));
    }
    return tabs;
  }

  /** The events before the newest (every released one but it), newest first. */
  const pastEvents = (): EventPack[] => {
    const newest = suitcases.newest()?.id;
    return suitcases.list().filter((e) => e.id !== newest);
  };
  /** The next event to open, while none is out (its preview). */
  const nextUp = (): { id: string; theme: string; release: string } | null => (suitcases.newest() ? null : (suitcases.upcoming()[0] ?? null));
  /** The level to play next: the lowest one not won yet (the creator, 2026-11-10: an event is played in order). -1 when all are. */
  const nextLevel = (e: EventPack): number => e.levels.findIndex((id) => !suitcases.won(id));

  function slots(e: { items: EventItem[] }): HTMLElement {
    const grid = el("div", "case-slots");
    grid.setAttribute("role", "list");
    // the packing list: two columns read down, the names fitted
    grid.style.gridTemplateRows = `repeat(${Math.ceil(e.items.length / 2)}, auto)`;
    new ResizeObserver(() => fitList(grid)).observe(grid);
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

  /** The page's one action: "Play level 3", the lowest level not won yet; with all won, "Event complete!". */
  function playNext(e: EventPack): HTMLElement {
    const box = el("div", "case-play");
    const i = nextLevel(e);
    if (i < 0) {
      // the event finish card's own words, "Event complete!" (event-finish.ts)
      box.append(el("p", "case-later glass", t("finish.title")));
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

  /**
   * "Your progress: 2 of 30" and the event's levels in play order, as information (flat, nothing to tap: the
   * levels are played in order, by Play): won ones ticked, a won level that hid an item its small suitcase,
   * the next one lit, hard ones their tag.
   */
  function progress(e: EventPack): HTMLElement {
    const box = el("section", "case-levels");
    const all = e.levels.length || EVENT_LEVELS;
    const head = el("h2", "", t("case.progress", { won: suitcases.wonCount(e), count: all }));
    head.id = `case-progress-${e.id}`;
    box.setAttribute("aria-labelledby", head.id);
    const grid = el("div", "case-level-grid");
    grid.setAttribute("role", "list");
    const next = nextLevel(e);
    e.levels.forEach((id, i) => {
      const n = i + 1;
      const won = suitcases.won(id);
      // which levels hide an item is a secret until each is won: only then its suitcase (the creator)
      const hid = suitcases.itemOn(e, id);
      const found = hid && (hid.found || won) ? hid : null;
      const mark = marks.get(id);
      const sq = el("div", `case-level${won ? " done" : ""}${i === next ? " next" : ""}${found ? " has-item" : ""}${mark ? ` ${mark}` : ""}`);
      sq.setAttribute("role", "listitem");
      sq.dataset.level = id;
      sq.append(el("b", "n", String(n)));
      if (mark) sq.append(markTag(mark, true));
      if (found) {
        const badge = el("span", "lv-item");
        badge.append(miniCase());
        sq.append(badge);
      }
      if (won) sq.insertAdjacentHTML("beforeend", `<svg class="tick" viewBox="0 0 40 32" aria-hidden="true"><path d="M5 17l10 10L36 4"/></svg>`);
      sq.setAttribute("aria-label", `${levelLabel(n, won, found, i === next)}${mark ? `, ${markTag(mark).textContent}` : ""}`);
      grid.append(sq);
    });
    box.append(head, grid);
    return box;
  }

  /** How it works: short steps, information only. */
  function howItWorks(e: { items: EventItem[]; levels: string[]; prize: Prize }): HTMLElement {
    const box = el("section", "case-how glass");
    const head = el("h2", "", t("case.how.title"));
    head.id = "case-how-title";
    box.setAttribute("aria-labelledby", head.id);
    const own = e.prize.table !== DEFAULT_TABLE;
    const table = own ? prizeTableName(e.prize, e.prize.tableTitle ?? knownTable(e.prize.table)?.title ?? "") : "";
    const count = e.items.length;
    const steps = el("ol");
    // what each item pays, once the config has said (no line until then)
    const coins = itemCoins();
    const coinsLine = coins === null ? null : el("li", "", t("case.how.coins", { count: coins }));
    // VIP's tag on what each item pays, while some are still to find (before it is won: vip-tag.ts)
    const tag = itemTag(e);
    if (coinsLine && tag) coinsLine.append(" ", tag);
    for (const line of [
      t("case.how.levels", { count: e.levels.length || EVENT_LEVELS }),
      t("case.how.items", { count }),
      table ? t("case.how.prizeTable", { count, table }) : t("case.how.prizeStamp", { count }),
      coinsLine,
      t("case.how.keep"),
    ])
      if (line) steps.append(typeof line === "string" ? el("li", "", line) : line);
    box.append(head, steps);
    return box;
  }

  /**
   * The prize (docs/vip.md): the event's table and its Passport stamp, for finding all 10, and the Coins
   * its items pay as they are found ("N Coins for every item found", N the config's figure: no row until it is read).
   */
  function prize(e: { id: string; theme: string; items: EventItem[]; prize: Prize; paid: boolean }): HTMLElement {
    const box = el("div", `case-prize glass${e.paid ? " won" : ""}`);
    box.append(el("b", "prize-head", e.paid ? t("case.prizeWon") : t("case.prizeHead", { count: e.items.length })));
    const rows = el("div", "prize-rows");
    // the table (an event whose table Art has not made yet names the built-in one: no table row)
    const own = e.prize.table !== DEFAULT_TABLE;
    const art = own ? knownTable(e.prize.table) : undefined;
    if (own) {
      const row = el("div", "prize-row");
      const pic = el("span", "prize-table");
      pic.setAttribute("aria-hidden", "true");
      if (art) {
        const img = el("img");
        Object.assign(img, { src: thumbOf(art), alt: "", draggable: false, decoding: "async" });
        pic.append(img);
      }
      row.append(pic, el("span", "", t("case.prizeTable", { table: prizeTableName(e.prize, e.prize.tableTitle ?? art?.title ?? "") })));
      rows.append(row);
    }
    // the stamp: Art's once won, its dashed outline until then
    const stampRow = el("div", "prize-row");
    const stamp = e.paid ? eventStamp(e.id, eventTitle(e)) : el("span", "prize-stamp-ring");
    stamp.classList.add("prize-stamp");
    stamp.setAttribute("aria-hidden", "true");
    stampRow.append(stamp, el("span", "", t("case.prizeStamp")));
    rows.append(stampRow);
    // the Coins: with each item found, while some are still to find. Once all are, nothing: the platform's suitcase
    // keeps no receipt of what each find paid (a guest's paid none), so "500 Coins found" would be made up (QA, 2026-11-02)
    const each = itemCoins();
    if (each !== null && !(e.items.length && e.items.every((i) => i.found))) {
      const coinRow = el("div", "prize-row prize-coins");
      const words = el("span", "", t("case.prizeCoinsEach", { count: each }));
      coinRow.append(el("span", "prize-coin", ""), words);
      coinRow.firstElementChild!.append(coinIcon(28));
      const tag = itemTag(e);
      if (tag) words.append(" ", tag);
      rows.append(coinRow);
    }
    box.append(rows);
    if (e.paid && own) box.append(el("span", "prize-note", t("case.prizeWhere")));
    return box;
  }

  /** The page's head: the event's name ("Ski Trip!"); a past one's under its quiet "Past event" tag; the next one's "Coming soon". */
  function hero(tag: string | null, words: string, past = false): HTMLElement {
    const box = el("div", `case-hero${past ? " past" : ""}`);
    if (tag) box.append(el("span", "case-hero-tag", tag));
    box.append(el("h2", "", words));
    return box;
  }

  /**
   * Art's open suitcase round the slots, its plain lining stretched to fit them (a 9-slice, style.css); with
   * `count`, "2 of 10 found" on its rim like a luggage tag (the creator's layout: on the suitcase, and one row
   * fewer, so a 360 x 640 phone shows Play under it).
   */
  function suitcaseOf(e: { items: EventItem[] }, count?: HTMLElement): HTMLElement {
    const suitcase = el("div", "case");
    suitcase.style.setProperty("--case-art", `url("${ART.open}")`);
    suitcase.append(slots(e));
    const wrap = el("div", `case-wrap${count ? " counted" : ""}`);
    if (count) wrap.append(count);
    wrap.append(suitcase);
    return wrap;
  }

  /**
   * An event's page, the newest's (the This event tab) or a past one's (its own page): its name, the suitcase
   * and how many of its items are found, Play, the progress, how it works and the prize.
   */
  function eventPage(e: EventPack, past: boolean): HTMLElement[] {
    const head = past ? hero(t("case.pastEvent"), eventTitle(e), true) : hero(null, t("case.themeBang", { theme: themeName(e) }));
    const found = el("p", "case-count glass");
    found.append(el("b", "", t("case.foundOf", { found: e.found, all: e.items.length })));
    return [head, suitcaseOf(e, found), playNext(e), progress(e), howItWorks(e), prize(e)];
  }

  /** The Past events tab: a card for each, its name and how far the player is, opening its page; or the line that says there are none. */
  function pastList(): HTMLElement {
    const list = pastEvents();
    if (!list.length) return el("p", "case-empty", t("case.pastNone"));
    const box = el("div", "case-past");
    for (const e of list) {
      const b = el("button", `btn past-case${e.complete ? " full" : ""}`);
      b.type = "button";
      b.dataset.press = "case.past";
      b.dataset.event = e.id;
      const words = el("span", "past-words");
      words.append(
        el("b", "", eventTitle(e)),
        el("small", "", t("case.foundOf", { found: e.found, all: e.items.length })),
        el("small", "", t("case.levelsOf", { won: suitcases.wonCount(e), count: e.levels.length || EVENT_LEVELS })),
      );
      b.append(miniCase("", true), words);
      b.setAttribute("aria-label", `${eventTitle(e)}: ${progressLine(e)}`);
      b.addEventListener("click", () => {
        viewing = e.id;
        draw();
        scroll.scrollTop = 0;
        void Promise.all([loadItems(e.id), ensureSuitcase(e.id)]).then(() => !screen.hidden && draw(), () => undefined);
      });
      box.append(b);
    }
    return box;
  }

  /** The next event to come, on its own line (information): "Coming soon: Grand Train Journey · Nov 15". */
  function comingSoon(except: string | null): HTMLElement | null {
    const u = suitcases.upcoming().find((x) => x.id !== except);
    return u ? el("p", "case-soon glass", t("case.comingSoon", { theme: themeName(u), date: shortDate(u.release) })) : null;
  }

  function draw(): void {
    drawTile();
    if (screen.hidden) return;
    pill.textContent = t("case.name");
    const parts: (HTMLElement | null)[] = [];
    // a past event's own page: no tabs and no Coming soon (Back is its way back to the Past events tab)
    const past = viewing ? suitcases.get(viewing) : null;
    if (past) parts.push(...eventPage(past, true));
    else {
      viewing = null;
      parts.push(drawTabs());
      if (tab === "past") parts.push(pastList());
      else {
        const e = suitcases.newest();
        const next = e ? null : nextUp();
        if (e) parts.push(comingSoon(null), ...eventPage(e, false));
        else if (next) {
          // an event to come, with none out yet: its suitcase in outline, when it opens, how it works, its prize
          const data = scheduledFor(next.id);
          const status = el("p", "case-status glass");
          status.append(el("b", "", t("case.starts", { date: shortDate(next.release) })), " · ", el("span", "", t("case.previewWhy")));
          const items: EventItem[] = (data?.items ?? []).map((it) => ({ id: it.id, title: it.title, level: null, found: false }));
          const preview = { id: next.id, theme: next.theme, items, levels: data?.levels ?? [], paid: false, prize: { table: data?.table ?? DEFAULT_TABLE, ...(data?.tableTitle ? { tableTitle: data.tableTitle } : {}), coins: EVENT_ITEM_COINS * items.length } };
          parts.push(comingSoon(next.id), hero(null, t("case.comingSoonName", { theme: themeName(next) })), status, suitcaseOf({ items }), howItWorks(preview), prize(preview));
        } else parts.push(el("p", "case-empty", t("case.none")));
      }
    }
    scroll.replaceChildren(...parts.filter((p): p is HTMLElement => !!p));
  }

  /** Levels' schedule entry for event `id` (a preview's items and prize). */
  const scheduledFor = (id: string) => {
    const sch = scheduledEvent();
    return sch?.e.id === id ? sch.e : null;
  };

  /** Home's strip: "Event · Haunted Holiday" and how far the player is (or when the next one opens): the platform's newest event. */
  function drawTile(): void {
    const on = eventShown();
    const e = on ? suitcases.newest() : null;
    const up = on && !e ? nextUp() : null;
    tile.hidden = !e && !up;
    tileTag.textContent = t("case.eventTag");
    if (e) {
      names = { full: t("case.nowPlaying", { theme: themeName(e) }), short: t("case.themeBang", { theme: themeName(e) }) };
      tileLine.textContent = progressLine(e);
      tile.setAttribute("aria-label", t("case.tileAria", { theme: themeName(e) }));
    } else if (up) {
      names = { full: t("case.comingSoonName", { theme: themeName(up) }), short: themeName(up) };
      tileLine.textContent = t("case.starts", { date: shortDate(up.release) });
      tile.setAttribute("aria-label", t("case.tileAria", { theme: themeName(up) }));
    }
    fitName();
  }

  /**
   * Open the event screen: the This event tab (home's strip: the newest, or the next one's preview with none
   * out), or event `id`'s page, a past one's own (its level's win card comes back to it).
   */
  function open(id: string | null = null): void {
    tab = "now";
    viewing = id && id !== suitcases.newest()?.id ? id : null;
    screen.hidden = false;
    nav.show();
    suitcases.refresh();
    draw();
    scroll.scrollTop = 0;
    // the event's items (their names and pictures) and, in a built game, its pack; the levels' marks
    // (Gameplay's loader, the first time a page opens): drawn again once they are in
    const e = (viewing ? suitcases.get(viewing) : suitcases.newest()) ?? nextUp();
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
  // VIP came or went, or the config's figures landed: the page's VIP tags say so
  onVip(() => {
    if (!screen.hidden) draw();
  });
  onRewardsChange(() => {
    if (!screen.hidden) draw();
  });
  // the event switched on or off (a pretend month): a page up when it goes off goes home
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
      tab = "now";
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
  /** The 10th: the event, and what to do once it has landed (the finish card, app.ts). */
  full: { event: string; done?: () => void } | null = null,
): void {
  const mini = miniCase("on-card");
  const words = el("span", "packed-words");
  // the item and the count, no amount: the card's chip says the level's Coins and the item's as ONE total, with its
  // VIP tag (QA, 2026-11-10: "+60" there and "+50" here read as 110)
  const said = el("span", "", t("case.packedCard", { item: itemName(item), count: packed, all }));
  words.append(said);
  line.replaceChildren(mini, words);
  line.classList.add("packed");
  /** It has landed: the latch (Audio's), and the full suitcase's word when this was the 10th, then its card. */
  const landed = () => {
    mini.classList.add("bump");
    emit("suitcase:packed", { id: item.id, count: 1 });
    if (full) {
      said.textContent = t("case.fullShort");
      emit("suitcase:full", { month: full.event });
      // a breath for the line to be read, then the event's own card over this one
      window.setTimeout(() => full.done?.(), lessMotion() ? 300 : 900);
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
