// The daily puzzle: one board a day, the same for everyone on the same date,
// on the player's own calendar.
//
//   Home's Daily button   today's state: ready to play, or done in N moves
//   the board             plays as any other; its top row shows par and the moves so far
//   the results screen    the player's result, then their friends' for the day
//                         (fewest moves, then the quicker time), "so far" until
//                         the day's board is final
//
// Which day it is comes from the platform (src/net/daily.ts, Server's), never
// the device's clock: until the platform answers, a guess may draw the screen,
// and it is redrawn when the real date lands or the day turns. Which board is
// the day's is the level designer's rule (loadDaily, Gameplay's). Only the
// player's FIRST finish of the day counts on the day's board (the win checker
// keeps it); the screens say so plainly once the player has a result. That
// first finish is in the server's record of the player's progress
// (src/net/progress.ts), shown at once when it is won.

import { text, type PlayerText } from "@indiegems/gem-web-sdk/sdk";
import { loadDaily, type Daily } from "../game/levels";
import { onDailyChange, standings, today, type DailyStandings, type DailyToday } from "../net/daily";
import type { Verdict } from "../net/claims";
import { ICONS } from "./icons";
import { liveAttr, liveText, t } from "./i18n";
import { clock, shortDate } from "./format";
import { dailyResult } from "../net/progress";
import { vipTag } from "./vip-door";
import { onVip, vipNow } from "./vip-view";

type Nav = {
  /** Back: to home. */
  home(): void;
  /** Show the results screen. */
  show(): void;
  /** Play the day's board. */
  play(d: Daily): void;
  /** Home's Daily tile was pressed: true when something else took it (the month's suitcase opens instead, suitcase.ts). */
  tile?(): boolean;
  /** The archive's badge was pressed: the calendar for a VIP, the locked door's screen for anyone else (app.ts). */
  archive(): void;
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

/** The archive badge's glyph: a calendar page with its days, and a turn back round to past ones. */
const ARCHIVE_GLYPH =
  '<svg class="arc-glyph" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M8.5 13.5h.01M12 13.5h.01M15.5 13.5h.01M8.5 16.8h.01M12 16.8h.01"/></svg>';

export function createDaily(nav: Nav) {
  // ---- home's button: in its place from the first frame (lead, 2026-10-28: on 4G it came ~2 s after
  // home and the dock's tiles moved over for it), its name shown and its line blank while the day and
  // its board come (taps wait for them); hidden only once it is known there is no board today ----
  const homeStatus = el("span", "", " ");
  const homeWords = el("span", "words");
  homeWords.append(liveText(el("b"), "home.daily"), homeStatus);
  const homeButton = el("button", "btn daily-btn");
  homeButton.type = "button";
  homeButton.dataset.press = "home.daily";
  homeButton.classList.add("holding");
  homeButton.setAttribute("aria-disabled", "true");
  homeButton.insertAdjacentHTML("afterbegin", ICONS.daily);
  homeButton.append(homeWords);
  // the daily archive's way in (daily-archive.ts; the creator's pick, 2026-10-30): a round calendar badge
  // on the tile's corner; for a player who is not a VIP, with the padlock and gold VIP tag (vip-door.ts)
  const archiveBadge = el("button", "btn round archive-badge");
  archiveBadge.type = "button";
  archiveBadge.dataset.press = "home.archive";
  archiveBadge.innerHTML = ARCHIVE_GLYPH;
  archiveBadge.hidden = true;
  const archiveLock = vipTag("badge-tag");
  archiveBadge.append(archiveLock);
  archiveBadge.addEventListener("click", () => nav.archive());
  const drawBadge = () => {
    const vip = vipNow();
    archiveLock.hidden = vip;
    archiveBadge.classList.toggle("locked", !vip);
    archiveBadge.setAttribute("aria-label", vip ? t("archive.badge") : t("archive.badgeLocked"));
  };
  onVip(drawBadge);

  // ---- the results screen ----
  const pill = el("div", "top-pill glass");
  const back = el("button", "btn round top-back");
  back.type = "button";
  back.dataset.press = "daily.back";
  back.innerHTML = ICONS.back;
  liveAttr(back, "aria-label", "daily.back");
  back.addEventListener("click", nav.home);
  const you = el("div", "daily-you glass");
  const note = el("p", "daily-note");
  const head = el("h2", "daily-head");
  const list = el("ol", "daily-list");
  const empty = el("p", "daily-empty");
  const foot = el("div", "daily-foot");
  const scroll = el("div", "scroll");
  scroll.append(you, note, head, list, empty, foot);
  const screen = el("section", "screen menu-screen daily-screen");
  screen.hidden = true;
  screen.append(pill, back, scroll);

  let day: DailyToday | null = null;
  let board: Daily | null = null;
  /** The day's first finish, on its way to the checker: its row lands on the board once it is answered. */
  let pending: Promise<Verdict> | null = null;
  let loadToken = 0;

  async function refresh(): Promise<void> {
    const d = await today();
    // the day's week of boards (a chunk of its own); not loaded, the button holds its place and the
    // next refresh (a new day, the connection back) asks again
    const b = await loadDaily(d.date).catch(() => undefined);
    if (b === undefined) return;
    day = d;
    board = b;
    drawHome();
    if (!screen.hidden) void openResults();
  }
  onDailyChange(() => void refresh());

  function drawHome(): void {
    if (!day) return; // not known yet: holding its place
    homeButton.hidden = !board;
    archiveBadge.hidden = !board;
    drawBadge();
    homeButton.classList.remove("holding");
    homeButton.removeAttribute("aria-disabled");
    if (!board) return;
    const mine = dailyResult(day.date);
    homeStatus.textContent = mine ? t("home.dailyDone", { count: mine.moves }) : t("home.dailyNew");
    homeButton.setAttribute("aria-label", `${t("home.daily")}: ${homeStatus.textContent}`);
  }

  /** Today's daily: play it, or its results once the day's first finish is in. */
  function go(): void {
    if (!day || !board) return;
    if (dailyResult(day.date)) void openResults();
    else nav.play(board);
  }
  homeButton.addEventListener("click", () => {
    if (!day || !board) return;
    if (nav.tile?.()) return;
    go();
  });

  function drawRows(st: DailyStandings): void {
    head.textContent = st.final ? t("daily.friendsFinal") : t("daily.friendsSoFar");
    list.replaceChildren();
    for (const row of st.rows) {
      const li = el("li", row.isViewer ? "glass you" : "glass");
      const who = el("span", "who");
      const name = row.displayName ? text.toPlain(row.displayName as PlayerText) : t("daily.anonymous");
      who.append(el("span", "name", row.isViewer ? t("daily.you") : name));
      if (!row.isViewer && row.discriminator) who.append(el("span", "tag", `#${row.discriminator}`));
      const moves = el("span", "num");
      moves.append(String(row.moves), el("small", "", t("daily.moves")));
      const time = el("span", "num");
      time.append(clock(row.timeMs), el("small", "", t("daily.time")));
      li.append(el("span", "rank", String(row.rank)), who, moves, time);
      list.append(li);
    }
    const others = st.rows.filter((r) => !r.isViewer).length;
    empty.textContent = others ? "" : t("daily.noFriends");
  }

  /** Show the results screen now, and the friends' results once they come. */
  async function openResults(): Promise<void> {
    if (!day || !board) return;
    const token = ++loadToken;
    const mine = dailyResult(day.date);
    pill.textContent = t("daily.title", { date: shortDate(day.date) });
    you.replaceChildren(
      el("span", "", mine ? t("daily.yours") : t("daily.notYet")),
      ...(mine ? [el("b", "", t("daily.result", { count: mine.moves, time: clock(mine.ms) }))] : []),
    );
    note.textContent = mine ? t("daily.firstCounts") : "";
    note.hidden = !mine;
    head.textContent = t("daily.friendsSoFar");
    list.replaceChildren();
    empty.textContent = t("daily.loading");
    const playBtn = mine ? btn("", "daily.again", t("daily.again")) : btn("amber", "daily.play", t("daily.play"));
    const b = board;
    playBtn.addEventListener("click", () => nav.play(b));
    foot.replaceChildren(playBtn);
    nav.show();
    scroll.scrollTop = 0;
    try {
      // a first finish still on its way to the checker: wait for it a little, so its row is on the board
      if (pending) await Promise.race([pending, new Promise((r) => setTimeout(r, 8000))]);
      // a wait with an end: no answer in 10 s says so, and opening the screen again asks again
      const st = await Promise.race([
        standings(),
        new Promise<never>((_, no) => setTimeout(() => no(new Error("no answer in 10 s")), 10_000)),
      ]);
      if (token !== loadToken || screen.hidden) return;
      drawRows(st);
    } catch (err) {
      if (token !== loadToken) return;
      console.warn("[daily] results did not load:", err);
      empty.textContent = t("daily.loadFailed");
    }
  }

  return {
    homeButton,
    /** The daily archive's badge, for the Daily tile's corner. */
    archiveBadge,
    screen,
    /** Ask the platform which day it is, and fetch that day's board (at boot, and when the save changes). */
    refresh,
    /** The save changed: redraw Home's state. */
    redraw: drawHome,
    openResults,
    /** Today's daily, for the suitcase's button: done already (results) or not (play); null while the day's board is unknown. */
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
