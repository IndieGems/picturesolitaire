// THE DAILY ARCHIVE (docs/vip.md, perk 2; the game standard's "An archive of past dailies keeps this month
// and the two before it"): a VIP plays past days' daily puzzles from a calendar. Its way in is a round
// calendar badge on home's Daily tile (the creator's pick, 2026-10-30: the tile itself still plays today
// in one tap); for a player who is not a VIP the badge wears the padlock and gold VIP tag, and opens the
// locked door's screen instead (vip-door.ts).
//
//   the calendar   one month a page (after Untangled's): ‹ the month › within the window, Monday first,
//                  each day of the window a button (won: ticked; today: ringed), days to come greyed,
//                  and under it how many of that month's are won; "Play today's puzzle" while today's
//                  is not won
//   a day          a tap plays it (app.ts: its board, and its win card's way back is the calendar)
//
// The window is the player's own months, from the platform's date (src/net/daily.ts, archiveWindow):
// the 1st of the month two before today, to yesterday; it turns at the player's midnight on the 1st.
// While the date is still the device's guess the calendar draws from it, and draws again when the
// platform's lands. Which days are won is the server's record (src/net/progress.ts, dailyResult): the
// server pays a past day's Coins once, to a VIP, inside the window (with a day of slack), never here.

import { archiveWindow, currentDaily, onDailyChange } from "../net/daily";
import { onProgress, dailyResult } from "../net/progress";
import { ICONS } from "./icons";
import { liveAttr, locale, t } from "./i18n";
import { onVip, vipNow } from "./vip-view";

type Nav = {
  home(): void;
  /** Show the calendar's screen (app.ts's show("archive")). */
  show(): void;
  /** Play the daily of `date` (today's included). */
  play(date: string): void;
  /** Today's daily, won already: its results. */
  results(): void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** "2026-10" for "2026-10-29". */
const monthOf = (date: string): string => date.slice(0, 7);
/** The month `n` after "2026-10" (negative: before). */
function stepMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1 + n, 1)).toISOString().slice(0, 7);
}
const daysIn = (month: string): number => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate();
};

export function createArchive(nav: Nav) {
  const pill = el("div", "top-pill glass");
  const back = el("button", "btn round top-back");
  back.type = "button";
  back.dataset.press = "archive.back";
  back.innerHTML = ICONS.back;
  liveAttr(back, "aria-label", "archive.back");
  back.addEventListener("click", () => nav.home());
  const body = el("div", "arc-body");
  const scroll = el("div", "scroll");
  scroll.append(body);
  const screen = el("section", "screen menu-screen archive-screen");
  screen.hidden = true;
  screen.append(pill, back, scroll);

  /** The month shown ("2026-10"); null: today's. */
  let month: string | null = null;

  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale(), { timeZone: "UTC", ...o });
  const at = (date: string): Date => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(Date.UTC(y!, m! - 1, d!));
  };

  function draw(): void {
    const today = currentDaily().date;
    const { first } = archiveWindow(today);
    const firstMonth = monthOf(first);
    const lastMonth = monthOf(today);
    const shown = month && month >= firstMonth && month <= lastMonth ? month : lastMonth;
    pill.textContent = t("archive.title");
    // the month, its neighbours a tap away, no further back than the archive keeps
    const head = el("div", "arc-nav");
    const step = (by: number, cls: string, label: string) => {
      const to = stepMonth(shown, by);
      if (to < firstMonth || to > lastMonth) return el("span", `arc-step ${cls}`);
      const b = el("button", `btn round arc-step ${cls}`);
      b.type = "button";
      b.dataset.press = `archive.${cls}`;
      b.innerHTML = ICONS.chevron;
      b.setAttribute("aria-label", `${t(label)}: ${fmt({ month: "long", year: "numeric" }).format(at(`${to}-01`))}`);
      b.addEventListener("click", () => {
        month = to;
        draw();
      });
      return b;
    };
    const title = el("h2", "arc-month", fmt({ month: "long", year: "numeric" }).format(at(`${shown}-01`)));
    head.append(step(-1, "prev", "archive.prev"), title, step(1, "next", "archive.next"));

    // Monday first
    const grid = el("div", "arc-grid");
    const wd = fmt({ weekday: "narrow" });
    for (let i = 0; i < 7; i++) grid.append(el("span", "arc-wd", wd.format(new Date(Date.UTC(2024, 0, 1 + i)))));
    const lead = (at(`${shown}-01`).getUTCDay() + 6) % 7;
    for (let i = 0; i < lead; i++) grid.append(el("span", "arc-blank"));
    const long = fmt({ weekday: "long", day: "numeric", month: "long" });
    let won = 0;
    let open = 0;
    for (let d = 1; d <= daysIn(shown); d++) {
      const date = `${shown}-${String(d).padStart(2, "0")}`;
      const name = long.format(at(date));
      if (date > today || date < first) {
        grid.append(el("span", "arc-day future", String(d)));
        continue;
      }
      const done = !!dailyResult(date);
      open++;
      if (done) won++;
      const isToday = date === today;
      const b = el("button", `btn arc-day${done ? " done" : ""}${isToday ? " today" : ""}`);
      b.type = "button";
      b.dataset.press = isToday ? "archive.today" : "archive.day";
      b.append(el("span", "n", String(d)));
      if (done) b.insertAdjacentHTML("beforeend", `<svg class="tick" viewBox="0 0 40 32" aria-hidden="true"><path d="M5 17l10 10L36 4"/></svg>`);
      b.setAttribute("aria-label", t(done ? "archive.dayDone" : isToday ? "archive.dayToday" : "archive.day", { day: name }));
      b.addEventListener("click", () => (isToday && done ? nav.results() : nav.play(date)));
      grid.append(b);
    }
    const kids: HTMLElement[] = [head, grid, el("p", "arc-count glass", t("archive.won", { n: won, all: open }))];
    // today's, not won yet: the way to play it
    if (shown === lastMonth && !dailyResult(today)) {
      const play = el("button", "btn amber next arc-play", t("archive.playToday"));
      play.type = "button";
      play.dataset.press = "archive.playToday";
      play.addEventListener("click", () => nav.play(today));
      kids.push(play);
    }
    body.replaceChildren(...kids);
  }

  // the day turned, the platform's date replaced the guess, a day was won, VIP went: drawn again
  const redraw = () => {
    if (screen.hidden) return;
    if (!vipNow()) return nav.home();
    draw();
  };
  onDailyChange(redraw);
  onProgress(redraw);
  onVip(redraw);

  return {
    screen,
    /** Open the calendar (today's month, unless `keepMonth`: back from a day played, at its month). */
    open(keepMonth = false): void {
      if (!keepMonth) month = null;
      draw();
      nav.show();
      if (!keepMonth) scroll.scrollTop = 0;
    },
    /** Back from playing `date`: its month shown. */
    openAt(date: string): void {
      month = monthOf(date);
      draw();
      nav.show();
    },
    redraw(): void {
      if (!screen.hidden) draw();
    },
  };
}
