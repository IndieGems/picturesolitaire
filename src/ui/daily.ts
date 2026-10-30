// The daily puzzle: one board a day, the same for everyone on the same date,
// on the player's own calendar.
//
//   Home's Daily tile     today's state: ready to play, or done in N moves. It opens THE DAILY PAGE
//                         (the creator, 2026-10-30: the archive's VIP badge on the tile made the daily
//                         itself look locked, and it never is)
//   the Daily page        today's puzzle first: "Play today's puzzle", big, or once won "Played ✓"
//                         and the result; then the past days (the archive: for a VIP a strip of the
//                         last days and the calendar, daily-archive.ts; for anyone else the archive's
//                         locked door, about the archive alone, vip-door.ts); then today's friends
//                         (Server's src/net/daily-board.ts, read as the page opens, never on a
//                         timer): fewest moves first, a tie to whoever finished first (the platform's
//                         own tie-break); the time each took is shown, never ranked
//   the board             plays as any other; its top row shows par and the moves so far; every way
//                         off a daily's win card comes back here (app.ts)
//
// Which day it is comes from the platform (src/net/daily.ts, Server's), never
// the device's clock: until the platform answers, a guess may draw the screen,
// and it is redrawn when the real date lands or the day turns. Which board is
// the day's is the level designer's rule (loadDaily, Gameplay's). Only the
// player's FIRST finish of the day counts on the day's board (the win checker
// keeps it); the page says so plainly once the player has a result. That
// first finish is in the server's record of the player's progress
// (src/net/progress.ts), shown at once when it is won.
//
// On the dev channel (and in the play-test tool), while no real friend has played, the board's rows
// include sample players (Server's, seeded by the date): the page labels them "Sample players". They
// never appear on test or release.

import { loadDaily, type Daily } from "../game/levels";
import { archiveWindow, currentDaily, onDailyChange, today, type DailyToday } from "../net/daily";
import { dailyBoard, type DailyBoard } from "../net/daily-board";
import type { Verdict } from "../net/claims";
import { ICONS } from "./icons";
import { liveAttr, liveText, locale, t } from "./i18n";
import { clock, shortDate } from "./format";
import { dailyResult, onProgress } from "../net/progress";
import { vipTag } from "./vip-door";
import { onVip, vipNow } from "./vip-view";

type Nav = {
  /** Back: to home. */
  home(): void;
  /** Show the Daily page. */
  show(): void;
  /** Play the day's board. */
  play(d: Daily): void;
  /** Home's Daily tile was pressed: true when something else took it (the month's suitcase opens instead, suitcase.ts). */
  tile?(): boolean;
  /** A VIP's archive: the calendar (daily-archive.ts). */
  calendar(): void;
  /** A past day from the page's strip: play it (a VIP's). */
  playDate(date: string): void;
  /** Anyone else's archive: the locked door's screen (vip-door.ts). */
  door(): void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", words = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (words) e.textContent = words;
  return e;
}
function btn(cls: string, press: string, words: string): HTMLButtonElement {
  const b = el("button", `btn ${cls}`, words);
  b.type = "button";
  b.dataset.press = press;
  return b;
}

/** "2026-10-29" a day `n` before `date`. */
function daysBefore(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! - n)).toISOString().slice(0, 10);
}


export function createDaily(nav: Nav) {
  // ---- home's tile: in its place from the first frame (lead, 2026-10-28: on 4G it came ~2 s after
  // home and the dock's tiles moved over for it), its name shown and its line blank while the day and
  // its board come (taps wait for them); hidden only once it is known there is no board today ----
  const homeStatus = el("span", "", " ");
  const homeWords = el("span", "words");
  homeWords.append(liveText(el("b"), "home.daily"), homeStatus);
  const homeButton = el("button", "btn daily-btn");
  homeButton.type = "button";
  homeButton.dataset.press = "home.daily";
  homeButton.classList.add("holding");
  homeButton.setAttribute("aria-disabled", "true");
  homeButton.insertAdjacentHTML("afterbegin", ICONS.daily);
  homeButton.append(homeWords);

  // ---- the Daily page ----
  const pill = el("div", "top-pill glass");
  const back = el("button", "btn round top-back");
  back.type = "button";
  back.dataset.press = "daily.back";
  back.innerHTML = ICONS.back;
  liveAttr(back, "aria-label", "daily.back");
  back.addEventListener("click", nav.home);
  const todayBox = el("section", "daily-today glass");
  const archiveBox = el("section", "daily-archive");
  const friendsBox = el("section", "daily-friends");
  const scroll = el("div", "scroll");
  scroll.append(todayBox, archiveBox, friendsBox);
  const screen = el("section", "screen menu-screen daily-screen");
  screen.hidden = true;
  screen.append(pill, back, scroll);

  let day: DailyToday | null = null;
  let board: Daily | null = null;
  /** The day's first finish, on its way to the checker: its row lands on the board once it is answered. */
  let pending: Promise<Verdict> | null = null;
  let loadToken = 0;
  /** Today's friends board as last read (null: not yet, or the read got no answer). */
  let friends: DailyBoard | null = null;
  let friendsFailed = false;

  async function refresh(): Promise<void> {
    const d = await today();
    // the day's week of boards (a chunk of its own); not loaded, the button holds its place and the
    // next refresh (a new day, the connection back) asks again
    const b = await loadDaily(d.date).catch(() => undefined);
    if (b === undefined) return;
    day = d;
    board = b;
    drawHome();
    if (!screen.hidden) void openPage();
  }
  onDailyChange(() => void refresh());

  function drawHome(): void {
    if (!day) return; // not known yet: holding its place
    homeButton.hidden = !board;
    homeButton.classList.remove("holding");
    homeButton.removeAttribute("aria-disabled");
    if (!board) return;
    const mine = dailyResult(day.date);
    homeStatus.textContent = mine ? t("home.dailyDone", { count: mine.moves }) : t("home.dailyNew");
    homeButton.setAttribute("aria-label", `${t("home.daily")}: ${homeStatus.textContent}`);
  }

  /** Today's daily: play it, or the Daily page once the day's first finish is in. */
  function go(): void {
    if (!day || !board) return;
    if (dailyResult(day.date)) void openPage();
    else nav.play(board);
  }
  // the tile opens the Daily page (the suitcase may take the press first: suitcase.ts)
  homeButton.addEventListener("click", () => {
    if (!day || !board) return;
    if (nav.tile?.()) return;
    void openPage();
  });

  /** Today's puzzle: the big button, or once won, the result and Play again. */
  function drawToday(): void {
    if (!day || !board) return;
    const mine = dailyResult(day.date);
    const b = board;
    const head = el("h2", "daily-today-head", t("daily.today"));
    if (!mine) {
      const play = btn("amber next daily-play", "daily.play", t("daily.play"));
      play.addEventListener("click", () => nav.play(b));
      todayBox.replaceChildren(head, play);
      return;
    }
    const done = el("p", "daily-done");
    done.append(el("b", "", t("daily.played")), el("span", "", t("daily.result", { count: mine.moves, time: clock(mine.ms) })));
    const again = btn("daily-again", "daily.again", t("daily.again"));
    again.addEventListener("click", () => nav.play(b));
    todayBox.replaceChildren(head, done, el("p", "daily-note", t("daily.firstCounts")), again);
  }

  /** The past days: a VIP's strip of the last week and the calendar; anyone else's locked door, about the archive alone. */
  function drawArchive(): void {
    if (!day) return;
    const vip = vipNow();
    const { first } = archiveWindow(day.date);
    const head = el("h2", "daily-section-head", t("daily.pastDays"));
    const strip = el("div", "daily-strip");
    const wd = new Intl.DateTimeFormat(locale(), { weekday: "short", timeZone: "UTC" });
    for (let n = 6; n >= 1; n--) {
      const date = daysBefore(day.date, n);
      if (date < first) continue;
      const [y, m, d] = date.split("-").map(Number);
      const won = !!dailyResult(date);
      const words = [el("small", "", wd.format(new Date(Date.UTC(y!, m! - 1, d!)))), el("b", "", String(d))];
      if (vip) {
        const b = el("button", `btn daily-day${won ? " done" : ""}`);
        b.type = "button";
        b.dataset.press = "daily.pastDay";
        b.append(...words);
        if (won) b.insertAdjacentHTML("beforeend", `<svg class="tick" viewBox="0 0 40 32" aria-hidden="true"><path d="M5 17l10 10L36 4"/></svg>`);
        b.setAttribute("aria-label", t(won ? "archive.dayDone" : "archive.day", { day: shortDate(date) }));
        b.addEventListener("click", () => nav.playDate(date));
        strip.append(b);
      } else {
        const s = el("span", "daily-day glass");
        s.append(...words);
        strip.append(s);
      }
    }
    if (vip) {
      const cal = btn("daily-calendar", "daily.calendar", t("daily.calendar"));
      cal.addEventListener("click", () => nav.calendar());
      archiveBox.replaceChildren(head, strip, cal);
      archiveBox.classList.remove("locked");
      return;
    }
    // the archive's locked door: the strip dimmed under the padlock and VIP tag, one line on what it is
    const door = el("button", "daily-door glass");
    door.type = "button";
    door.dataset.press = "daily.archiveDoor";
    door.setAttribute("aria-label", t("archive.badgeLocked"));
    door.append(strip, vipTag("daily-door-tag"), el("span", "daily-door-line", t("daily.archiveLocked")));
    door.addEventListener("click", () => nav.door());
    archiveBox.replaceChildren(head, door);
    archiveBox.classList.add("locked");
  }

  /**
   * Today's friends, as the board ranks them (fewest moves; a tie to whoever finished first), once a
   * friend has played; a friendly line until then. Sample players (dev only) are said to be samples.
   */
  function drawFriends(): void {
    const head = el("h2", "daily-section-head", friends?.final ? t("daily.friendsFinal") : t("daily.friendsSoFar"));
    if (friendsFailed) return void friendsBox.replaceChildren(head, el("p", "daily-empty", t("daily.loadFailed")));
    if (!friends) return void friendsBox.replaceChildren(head, el("p", "daily-empty", t("daily.loading")));
    if (!friends.friendsPlayed && !friends.sample) return void friendsBox.replaceChildren(head, el("p", "daily-empty", t("daily.noFriends")));
    const list = el("ol", "daily-list");
    for (const row of friends.rows) {
      const li = el("li", row.isViewer ? "glass you" : "glass");
      const who = el("span", "who");
      who.append(el("span", "name", row.isViewer ? t("daily.you") : row.name || t("daily.anonymous")));
      if (!row.isViewer && row.discriminator) who.append(el("span", "tag", `#${row.discriminator}`));
      const moves = el("span", "num");
      moves.append(String(row.moves), el("small", "", t("daily.moves")));
      const time = el("span", "num");
      time.append(clock(row.timeMs), el("small", "", t("daily.time")));
      li.append(el("span", "rank", String(row.rank)), who, moves, time);
      list.append(li);
    }
    friendsBox.replaceChildren(head, ...(friends.sample ? [el("p", "daily-sample", t("daily.sample"))] : []), list);
  }

  function draw(): void {
    if (!day || !board) return;
    pill.textContent = t("daily.title", { date: shortDate(day.date) });
    drawToday();
    drawArchive();
    drawFriends();
  }

  /** The Daily page now; today's friends once their results come. */
  async function openPage(): Promise<void> {
    if (!day || !board) return;
    const token = ++loadToken;
    friends = null;
    friendsFailed = false;
    draw();
    nav.show();
    scroll.scrollTop = 0;
    await readFriends(token);
    // a first finish still on its way to the checker: the board as it is now, then once more when the
    // checker answers, so the player's own row joins it (Server's board reads it again only then)
    const was = pending;
    if (was) void was.finally(() => token === loadToken && !screen.hidden && readFriends(token));
  }

  /** Server's board: paced and cached; no answer (offline, refused, a wait asked for) says so, and the next open asks again. */
  async function readFriends(token: number): Promise<void> {
    if (!board) return;
    try {
      const b = await dailyBoard({ par: board.par });
      if (token !== loadToken || screen.hidden) return;
      friends = b;
      friendsFailed = !b;
    } catch (err) {
      if (token !== loadToken) return;
      console.warn("[daily] results did not load:", err);
      friendsFailed = true;
    }
    drawFriends();
  }


  // VIP came or went, a past day was won: the page's archive follows
  const redraw = () => {
    if (!screen.hidden) {
      drawToday();
      drawArchive();
    }
  };
  onVip(redraw);
  onProgress(redraw);

  return {
    homeButton,
    screen,
    /** Ask the platform which day it is, and fetch that day's board (at boot, and when the save changes). */
    refresh,
    /** The save changed: redraw Home's state. */
    redraw: drawHome,
    /** The Daily page (a daily's win card comes back here). */
    openResults: openPage,
    openPage,
    /** Today's daily, for the suitcase's button: done already (the Daily page) or not (play); null while the day's board is unknown. */
    state: (): { done: boolean; go(): void } | null => (day && board ? { done: !!dailyResult(day.date), go } : null),
    /** The day's first finish was sent to the checker. */
    claimed(p: Promise<Verdict>): void {
      pending = p;
      void p.finally(() => {
        if (pending === p) pending = null;
      });
    },
  };
}

/** The date of the current daily on the platform's calendar (a guess until it lands). */
export const dailyDate = (): string => currentDaily().date;
