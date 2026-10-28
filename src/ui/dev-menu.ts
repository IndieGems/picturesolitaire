// THE CREATOR'S DEV MENU (the lead's brief, 2026-10-24): play any board at any
// time, as PRACTICE. A practice board plays and finishes exactly as in the game,
// its win card included, but sends no claim: it pays no Coins, records no
// progress and posts no daily result, and the guide's saved step is left alone.
// The gating is the screens' (app.ts, at the claim's call site; guide.ts for the
// guide's save); the board's side is Gameplay's (handle.dev, src/board/dev.ts).
//
//   the gear's screen  -> Developer (dev channel only, or unframed: the play-test tool)
//   Build              the version, the commit, when it was built, the channel, the config
//   This board         (opened mid-board) what the board is, Win now, Show solution
//                      (a Next move bar over the board), the board before and after
//   Switches           endless helpers, animation speed, every picture in the albums
//   Play any board     the campaign, the challenge route, any date of the daily pool
//   Experiments        Levels' experiment boards (src/content/levels/experiments.json,
//                      imported here only, so a release build drops it with the menu)
//   Event preview      the Daily Suitcase as November will be, pretend and practice (the creator,
//                      2026-10-27: "test November now"): suitcase-data.ts's preview; a practice
//                      November daily finds and packs its item, a swap and the full moment play
//                      against it; nothing is saved or sent
//   Guided start       board 1's guide again, from its first step
//
// NEVER IN A RELEASE BUILD. app.ts imports this file only behind
// `import.meta.env.MODE !== "release"`, by a dynamic import, so `npm run
// build:release` (vite build --mode release) leaves it out, and
// tools/no-dev-menu.mjs fails that build if anything of it is left ("dev-menu"
// in a file's name or text). Its words are English and live here, not in
// locales/: no player reads them, and they leave with the code.
//
// Its switches live in memory for the page, never in browser storage
// (AGENTS.md). A dev hand on a real board (Win now, Next move, endless helpers)
// turns that board into practice: a win helped along never pays.

import "./dev-menu.css";
import { gem } from "../gem";
import { on } from "../events";
import { level, levelCount, loadDaily, toLevel, type Stored } from "../game/levels";
import { currentDaily } from "../net/daily";
import { addToSettings, closeSettings } from "../settings-screen";
import { loadChallenges, type Challenge } from "./challenge-data";
import { shortDate } from "./format";
import { markOf, markTag } from "./marks";
import type { BoardHandle, DevStep } from "./board-api";
import type { Experiment, Play } from "./app";
import { suitcases } from "./suitcase-data";

/** What vite.config.ts stamps in at build time (its `define`). */
declare const __BUILD_INFO__: { version: string; sdk: string; commit: string; changed: boolean; built: string };

/** What the screens lend the menu (app.ts). */
export interface DevHost {
  /** The app's column: the Next move bar goes in it. */
  app: HTMLElement;
  /** Open `p` as a fresh practice board (the board in hand is dropped). */
  open(p: Play): void;
  /** What is on screen now. */
  now(): { screen: string; play: Play | null; board: BoardHandle | null; won: boolean };
  /** The board in hand counts for nothing from now on (a dev hand was on it). */
  practise(): void;
  /** Take the first board's guide down. */
  cancelGuide(): void;
  /** The albums show every picture as restored (never saved), or go back to the record. */
  showAll(on: boolean): void;
  /** Open the Daily Suitcase's screen (the event preview's). */
  openSuitcase(): void;
  /** Open the event preview's next puzzle (a November daily the pretend suitcase lacks the item of), in practice. */
  playEvent(): void;
}

/** What the menu lends the screens back. */
export interface DevMenu {
  /** The board's "Practice" tag, for the top row's level pill (information). */
  tag(): HTMLElement;
  /** The win card's "Practice — nothing saved", where its Coins would be. */
  chip(): HTMLElement;
  /** The daily card's line in practice, in place of "counted on the day's board". */
  dailyLine: string;
  /** Endless helpers are on: every board opened is practice. */
  practiceOnly(): boolean;
  /** A board just opened: it takes the menu's switches. */
  opened(b: BoardHandle): void;
  /** The screen changed (app.ts, show()). */
  screen(name: string): void;
  /** Is there a board after `p` (the next number, the next day)? */
  hasNext(p: Play): boolean;
  /** Open the board after `p`, in practice. */
  next(p: Play): void;
  /** An experiment board's name for the top row ("Board x01"). */
  label(p: Extract<Play, { kind: "experiment" }>): string;
}

const SPEEDS = [0.25, 0.5, 1, 2];
const WHY_NOT: Record<Extract<DevStep, { ok: false }>["reason"], string> = {
  busy: "Wait for the board to settle",
  finishing: "The board is finishing",
  "no-line": "This board has no stored solution",
  closed: "The board has closed",
};

/** The lists of Play any board (the experiments have their own section). */
type Kind = Exclude<Play["kind"], "experiment" | "lesson" | "oneoff" | "souvenir">;
const KINDS: Kind[] = ["campaign", "challenge", "daily"];
const KIND_NAMES: Record<Kind, string> = { campaign: "Campaign", challenge: "Challenge", daily: "Daily" };

// ---------- a little DOM ----------

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", words = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (words) e.textContent = words;
  return e;
}
function btn(cls: string, words: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", `btn ${cls}`.trim(), words);
  b.type = "button";
  b.dataset.press = "dev";
  b.addEventListener("click", onClick);
  return b;
}
function toggle(onChange: (on: boolean) => void): HTMLInputElement {
  const i = el("input", "dev-switch");
  i.type = "checkbox";
  i.setAttribute("role", "switch");
  i.addEventListener("change", () => onChange(i.checked));
  return i;
}
function setting(words: string, control: HTMLElement): HTMLLabelElement {
  const row = el("label", "dev-set");
  row.append(el("span", "", words), control);
  return row;
}

// ---------- dates and neighbours ----------

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}
/** A platform frames the game (the Arcade, the Editor: another origin); the play-test tool's own page does not count. */
function onPlatform(): boolean {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true;
  }
}
const campaignNumber = (n: number) => ((((n - 1) % levelCount()) + levelCount()) % levelCount()) + 1;

export function mountDevMenu(host: DevHost): DevMenu {
  // memory only, for the page
  let endless = false;
  let speed = 1;
  let everyPicture = false;

  // the challenge route and the daily pool's first and last date, read once
  let route: Challenge[] = [];
  let pool: { first: string; last: string } | null = null;
  void loadChallenges().then((l) => {
    route = l;
    if (tab === "challenge") drawPick();
  });
  void import("../content/levels/daily.json").then((m) => {
    const days = (m.default as unknown as { levels: { date: string }[] }).levels;
    if (days.length) pool = { first: days[0]!.date, last: days[days.length - 1]!.date };
    day = clampDay(day);
    if (tab === "daily") drawPick();
  });
  const clampDay = (d: string) => (!pool ? d : d < pool.first ? pool.first : d > pool.last ? pool.last : d);
  // Levels' experiment boards, read once (null until they land)
  let experiments: Experiment[] | null = null;
  void import("../content/levels/experiments.json")
    .then((m) => {
      const stored = (m.default as unknown as { levels: (Stored & { name?: string })[] }).levels;
      experiments = stored.map((l, i) => ({ ...toLevel(l, i + 1), name: l.name ?? l.id }));
    })
    .catch((err: unknown) => {
      console.warn("[dev-menu] the experiment boards did not load", err);
      experiments = [];
    })
    .finally(() => drawExperiments());

  async function neighbour(p: Play, step: 1 | -1): Promise<Play | null> {
    if (p.kind === "campaign") {
      const n = campaignNumber(p.level) + step;
      return n >= 1 && n <= levelCount() ? { kind: "campaign", level: n } : null;
    }
    if (p.kind === "challenge") {
      const c = route[p.c.n - 1 + step];
      return c ? { kind: "challenge", c } : null;
    }
    if (p.kind === "experiment") {
      const x = experiments?.[p.x.number - 1 + step];
      return x ? { kind: "experiment", x } : null;
    }
    // the Shuffle lesson's board, a friend's one-off and a Souvenir stand alone
    if (p.kind === "lesson" || p.kind === "oneoff" || p.kind === "souvenir") return null;
    const date = addDays(p.d.date, step);
    if (pool && (date < pool.first || date > pool.last)) return null;
    const d = await loadDaily(date);
    return d ? { kind: "daily", d } : null;
  }
  function hasNeighbour(p: Play, step: 1 | -1): boolean {
    if (p.kind === "campaign") {
      const n = campaignNumber(p.level) + step;
      return n >= 1 && n <= levelCount();
    }
    if (p.kind === "challenge") return !!route[p.c.n - 1 + step];
    if (p.kind === "experiment") return !!experiments?.[p.x.number - 1 + step];
    if (p.kind === "lesson" || p.kind === "oneoff" || p.kind === "souvenir" || !pool) return false;
    const date = addDays(p.d.date, step);
    return date >= pool.first && date <= pool.last;
  }
  function go(p: Play, step: 1 | -1): void {
    void neighbour(p, step).then((q) => {
      if (q) play(q);
    });
  }
  function play(p: Play): void {
    hideBar();
    dialog.close();
    host.open(p);
  }

  // ---------- the dialog ----------

  const dialog = el("dialog");
  dialog.id = "dev-menu";
  dialog.setAttribute("aria-labelledby", "dev-menu-title");
  const scroll = el("div", "dev-scroll");
  const title = el("h2", "", "Developer");
  title.id = "dev-menu-title";
  const close = btn("dev-close", "Close", () => dialog.close());
  const foot = el("div", "dev-foot");
  foot.append(close);
  dialog.append(scroll, foot);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  // build
  const buildBox = el("div", "dev-info glass");
  async function drawBuild(): Promise<void> {
    const b = typeof __BUILD_INFO__ === "object" ? __BUILD_INFO__ : null;
    const built = b ? new Date(b.built) : null;
    const framed = onPlatform();
    const channel = gem.identity?.channel ?? (framed ? "not known yet" : "none (no Arcade here)");
    const lines = [
      b ? `Build ${b.version} · commit ${b.commit || "unknown"}${b.changed ? " with uncommitted changes" : ""}` : "Build: not stamped",
      built ? `Built ${built.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "",
      `Channel ${channel} · Config …`,
      b?.sdk ? `Gem SDK ${b.sdk}` : "",
    ].filter(Boolean);
    buildBox.replaceChildren(...lines.map((l) => el("p", "", l)));
    const configLine = buildBox.children[built ? 2 : 1]!;
    let config = framed ? "none" : "none (no Arcade here)";
    try {
      const c = framed ? await Promise.race([gem.gameConfig.load(), new Promise<null>((r) => setTimeout(() => r(null), 4000))]) : null;
      if (c) config = `v${c.version}`;
    } catch {
      config = "could not be read";
    }
    configLine.textContent = `Channel ${gem.identity?.channel ?? channel} · Config ${config}`;
  }

  // this board
  const boardSec = el("section", "dev-board");
  const boardBox = el("div", "dev-info glass");
  const winNow = btn("amber", "Win now", () => void runWin());
  const showSolution = btn("", "Show solution", () => {
    dialog.close();
    showBar();
  });
  const prev = btn("", "◀ Board before", () => {
    const p = host.now().play;
    if (p) go(p, -1);
  });
  const next = btn("", "Board after ▶", () => {
    const p = host.now().play;
    if (p) go(p, 1);
  });
  const row1 = el("div", "dev-row");
  row1.append(winNow, showSolution);
  const row2 = el("div", "dev-row");
  row2.append(prev, next);
  boardSec.append(el("h3", "", "This board"), boardBox, row1, row2);

  function playName(p: Play): string {
    if (p.kind === "campaign") return `Campaign board ${campaignNumber(p.level)}`;
    if (p.kind === "challenge") return `Challenge ${p.c.n}`;
    if (p.kind === "experiment") return `Experiment ${p.x.number}: ${p.x.name}`;
    if (p.kind === "lesson") return "The Shuffle lesson";
    if (p.kind === "souvenir") return `The ${p.s.trip} Souvenir (${p.s.id})`;
    if (p.kind === "oneoff") return "board" in p.o.dare ? `A friend's board ${p.o.dare.board} (one-off)` : `A friend's daily, ${shortDate(p.o.dare.date)} (one-off)`;
    return `Daily, ${shortDate(p.d.date)}`;
  }

  function drawBoard(): void {
    const { screen, play: p, board, won } = host.now();
    boardSec.hidden = screen !== "board" || !p || !board;
    if (boardSec.hidden || !p || !board) return;
    const info = board.dev?.info();
    const lines: string[] = [`${playName(p)}${info ? ` (${info.id})` : ""}`];
    if (info) {
      lines.push(
        `${info.cols}×${info.rows} grid · ${info.peek} face-up in the stacks${info.par !== null ? ` · par ${info.par}` : ""}${p.kind === "campaign" && markOf(info) ? ` · marked ${markOf(info)}` : ""}`,
        `${info.pictures.length} pictures: ${info.pictures.map((x) => x.shape.replace("x", "×")).join(", ")}`,
        `${info.stacks.length} stacks: ${info.stacks.join(" · ")} cards`,
        `Solution ${info.lineMoves} moves · ${info.moves} made so far`,
      );
      // the level designer's plain notes (numbers and words; the lists are in the level file)
      if (info.axes) {
        const notes = Object.entries(info.axes)
          .filter(([, v]) => typeof v === "number" || typeof v === "string")
          .map(([k, v]) => `${k} ${typeof v === "number" ? Math.round(v * 100) / 100 : v}`)
          .join(" · ");
        if (notes) lines.push(`Level notes: ${notes}`);
      }
    }
    lines.push(won ? "Won" : p.practice ? "Practice: nothing is saved" : "Counts: its win goes to the checker and pays");
    boardBox.replaceChildren(...lines.map((l, i) => el("p", i === 0 ? "dev-strong" : i === lines.length - 1 ? "dev-state" : "", l)));
    winNow.disabled = showSolution.disabled = !board.dev;
    prev.disabled = !hasNeighbour(p, -1);
    next.disabled = !hasNeighbour(p, 1);
  }

  // switches
  const endlessSwitch = toggle((on) => {
    endless = on;
    const { board } = host.now();
    board?.dev?.setEndless(on);
    // a win with endless helpers never pays: the board in hand becomes practice
    if (on && board) host.practise();
    drawBoard();
  });
  const speedRow = el("div", "dev-speed");
  const speedBtns = SPEEDS.map((x) =>
    btn("", `${x}×`, () => {
      speed = x;
      host.now().board?.dev?.setSpeed(x);
      drawSpeed();
    }),
  );
  speedRow.append(...speedBtns);
  // a plain row, not a label: a tap on its words must not press the first speed
  const speedSet = el("div", "dev-set dev-set-speed");
  speedSet.append(el("span", "", "Animation speed"), speedRow);
  const drawSpeed = () => speedBtns.forEach((b, i) => b.classList.toggle("amber", SPEEDS[i] === speed));
  const picturesSwitch = toggle((on) => {
    everyPicture = on;
    host.showAll(on);
  });
  const switches = el("section");
  switches.append(
    el("h3", "", "Switches"),
    setting("Endless helpers", endlessSwitch),
    el("p", "dev-note", "While it's on, every board you open is practice."),
    speedSet,
    setting("Every picture in the albums", picturesSwitch),
  );

  // play any board
  let tab: Kind = "campaign";
  let day = currentDaily().date;
  const tabs = el("div", "dev-tabs");
  const tabBtns = KINDS.map((k) =>
    btn("", KIND_NAMES[k], () => {
      tab = k;
      drawPick();
    }),
  );
  tabs.append(...tabBtns);
  const pick = el("div", "dev-pick");
  const pickSec = el("section");
  pickSec.append(el("h3", "", "Play any board (practice)"), tabs, pick);

  function tile(big: string, small: string[], current: boolean, pickIt: () => void, extra: HTMLElement[] = []): HTMLButtonElement {
    const b = btn(current ? "amber" : "", "", pickIt);
    b.append(el("b", "", big), ...small.map((s) => el("small", "", s)), ...extra);
    return b;
  }

  function drawPick(): void {
    tabBtns.forEach((b, i) => b.classList.toggle("amber", KINDS[i] === tab));
    const now = host.now();
    const p = now.screen === "board" ? now.play : null;
    if (tab === "campaign") {
      const grid = el("div", "dev-grid");
      for (let n = 1; n <= levelCount(); n++) {
        const l = level(n);
        const d = l.deal;
        // a hard board wears its tag here as on the board (marks.ts)
        const mark = markOf(l);
        grid.append(
          tile(String(n), [`${d.cols}×${d.rows}`], p?.kind === "campaign" && campaignNumber(p.level) === n, () => play({ kind: "campaign", level: n }), mark ? [markTag(mark, true)] : []),
        );
      }
      pick.replaceChildren(grid);
    } else if (tab === "challenge") {
      const grid = el("div", "dev-grid wide");
      for (const c of route)
        grid.append(
          tile(String(c.n), [`${c.level.deal.cols}×${c.level.deal.rows}`, `par ${c.par}`], p?.kind === "challenge" && p.c.id === c.id, () =>
            play({ kind: "challenge", c }),
          ),
        );
      pick.replaceChildren(route.length ? grid : el("p", "dev-note", "Loading the challenge route…"));
    } else drawDay();
  }

  // the daily: a day at a time, or a date picked
  const dayInput = el("input", "dev-date");
  dayInput.type = "date";
  dayInput.addEventListener("change", () => {
    if (dayInput.value) {
      day = clampDay(dayInput.value);
      drawDay();
    }
  });
  const dayInfo = el("p", "dev-info glass dev-day-info");
  const dayPlay = btn("amber", "Play this day", () => {
    const d = shownDay;
    if (d) play({ kind: "daily", d });
  });
  const dayBefore = btn("round", "◀", () => {
    day = clampDay(addDays(day, -1));
    drawDay();
  });
  dayBefore.setAttribute("aria-label", "The day before");
  const dayAfter = btn("round", "▶", () => {
    day = clampDay(addDays(day, 1));
    drawDay();
  });
  dayAfter.setAttribute("aria-label", "The day after");
  const dayRow = el("div", "dev-day");
  dayRow.append(dayBefore, dayInput, dayAfter);
  let shownDay: Extract<Play, { kind: "daily" }>["d"] | null = null;
  let dayToken = 0;
  function drawDay(): void {
    pick.replaceChildren(dayRow, dayInfo, dayPlay);
    dayInput.value = day;
    if (pool) {
      dayInput.min = pool.first;
      dayInput.max = pool.last;
    }
    dayBefore.disabled = !!pool && day <= pool.first;
    dayAfter.disabled = !!pool && day >= pool.last;
    const token = ++dayToken;
    dayPlay.disabled = true;
    dayInfo.textContent = "…";
    void loadDaily(day).then((d) => {
      if (token !== dayToken) return;
      shownDay = d;
      dayPlay.disabled = !d;
      const today = currentDaily().date;
      const when = day === today ? "today" : day < today ? "past" : "still to come";
      dayInfo.textContent = d
        ? `${shortDate(day)} (${when}) · ${d.deal.cols}×${d.deal.rows} · ${d.deal.pictures.length} pictures · par ${d.par}`
        : `No board on ${shortDate(day)}${pool ? `: the pool runs ${shortDate(pool.first)} to ${shortDate(pool.last)}` : ""}`;
    });
  }

  // the experiment boards: one row each, its name (they are long) over its id and size
  const xList = el("div", "dev-xlist");
  const xSec = el("section");
  xSec.append(
    el("h3", "", "Experiments (practice)"),
    el("p", "dev-note", "Boards Levels made to try an idea out. They are never in the game, and the win checker does not know them."),
    xList,
  );
  function drawExperiments(): void {
    if (!experiments) return void xList.replaceChildren(el("p", "dev-note", "Loading the experiment boards…"));
    if (!experiments.length) return void xList.replaceChildren(el("p", "dev-note", "No experiment boards yet."));
    const now = host.now();
    const p = now.screen === "board" ? now.play : null;
    xList.replaceChildren(
      ...experiments.map((x) => {
        const b = btn(p?.kind === "experiment" && p.x.id === x.id ? "amber dev-x" : "dev-x", "", () => play({ kind: "experiment", x }));
        const d = x.deal;
        b.append(el("b", "", x.name), el("small", "", `${x.id} · ${d.cols}×${d.rows} grid · ${d.pictures.length} pictures`));
        return b;
      }),
    );
  }

  // the Daily Suitcase's event preview: pretend, practice, nothing saved or sent
  const eventState = el("p", "dev-info glass");
  const drawEvent = () => {
    const s = suitcases.previewing() ? suitcases.current() : null;
    eventState.textContent = s
      ? `On: ${s.theme}, ${s.items.filter((it) => (s.counts[it.id] ?? 0) > 0).length} of ${s.items.length} packed, ${s.items.reduce((n, it) => n + Math.max(0, (s.counts[it.id] ?? 0) - 1), 0)} spares.`
      : "Off: the game shows the platform's event (none until 1 Nov: the tile previews it).";
  };
  suitcases.onChange(drawEvent);
  drawEvent();
  const startPreview = (kind: "start" | "almost") => {
    suitcases.preview(kind);
    dialog.close();
    host.openSuitcase();
  };
  const eventRow = el("div", "dev-row");
  eventRow.append(
    btn("amber", "November, 7 of 10", () => startPreview("start")),
    btn("", "Almost full, 9 of 10", () => startPreview("almost")),
  );
  const eventSec = el("section");
  eventSec.append(
    el("h3", "", "Event preview (practice)"),
    eventState,
    eventRow,
    // the event page's own words, so the creator sees what players will
    btn("dev-wide amber", "Play the Daily Puzzle!", () => {
      if (!suitcases.previewing()) suitcases.preview("start");
      dialog.close();
      host.playEvent();
    }),
    btn("dev-wide", "Preview off", () => suitcases.preview(null)),
    el(
      "p",
      "dev-note",
      "A pretend November suitcase: nothing is saved or sent. Play the Daily Puzzle! opens the next November daily whose item the suitcase lacks, in practice: win it and the item flies in, then Back to suitcase. A swap works from the suitcase. Almost full is one item short of the full suitcase and the Ski Lodge table. While the preview is on, home's event tile opens it.",
    ),
  );

  // the guided start
  const guideSec = el("section");
  guideSec.append(
    el("h3", "", "Guided start"),
    btn("dev-wide", "Replay the guided start", () => play({ kind: "campaign", level: 1, guide: true })),
    el("p", "dev-note", "Board 1 with its four steps from the first, then its finish card. Nothing is saved, and no table is given."),
  );

  scroll.append(title, buildBox, boardSec, switches, pickSec, xSec, eventSec, guideSec);
  document.body.append(dialog);

  // ---------- the Next move bar, over the board's foot ----------

  const bar = el("div", "dev-bar glass");
  bar.hidden = true;
  const barText = el("span", "dev-bar-text");
  const barNext = btn("amber", "Next move", () => void stepOnce());
  const barDone = btn("", "Done", () => hideBar());
  bar.append(barNext, barText, barDone);
  host.app.append(bar);

  function showBar(text = "Tap Next move to see the solution"): void {
    barText.textContent = text;
    barNext.hidden = false;
    bar.hidden = false;
  }
  function hideBar(): void {
    bar.hidden = true;
  }
  /** A dev hand on the board: it counts for nothing from here, and the guide steps aside. */
  function takeHold(): BoardHandle | null {
    const { board } = host.now();
    if (!board?.dev) return null;
    host.practise();
    host.cancelGuide();
    return board;
  }
  async function stepOnce(): Promise<void> {
    const board = takeHold();
    if (!board?.dev) return hideBar();
    barNext.disabled = true;
    const r = await board.dev.step();
    barNext.disabled = false;
    if (!r.ok) {
      barText.textContent = WHY_NOT[r.reason];
      return;
    }
    barText.textContent = `${r.restarted ? "Started again from the deal · " : ""}Move ${r.played} of ${r.of}`;
    if (r.won) barNext.hidden = true;
  }
  async function runWin(): Promise<void> {
    dialog.close();
    const board = takeHold();
    if (!board?.dev) return;
    showBar("Playing the solution…");
    barNext.hidden = true;
    const ok = await board.dev.winNow();
    if (!ok) showBar("Win now stopped: try again");
  }
  on("board:won", hideBar);
  on("destination:reveal", () => bar.classList.add("aside"));
  on("destination:done", () => bar.classList.remove("aside"));

  // ---------- the Developer button, in the gear's screen ----------

  const open = btn("dev-open", "Developer", () => {
    closeSettings();
    void drawBuild();
    drawBoard();
    const p = host.now().play;
    if (host.now().screen === "board" && p && p.kind !== "experiment" && p.kind !== "lesson" && p.kind !== "oneoff" && p.kind !== "souvenir") tab = p.kind;
    endlessSwitch.checked = endless;
    picturesSwitch.checked = everyPicture;
    drawSpeed();
    drawPick();
    drawExperiments();
    scroll.scrollTop = 0;
    dialog.showModal();
  });
  addToSettings(open);

  return {
    tag: () => el("span", "practice-tag", "Practice"),
    chip: () => {
      const c = el("div", "coins-chip glass practice-chip", "Practice — nothing saved");
      c.setAttribute("role", "status");
      return c;
    },
    dailyLine: "Practice: this finish isn't on the day's board.",
    practiceOnly: () => endless,
    opened(b) {
      hideBar();
      b.dev?.setEndless(endless);
      b.dev?.setSpeed(speed);
    },
    screen(name) {
      if (name !== "board") hideBar();
    },
    hasNext: (p) => hasNeighbour(p, 1),
    next: (p) => go(p, 1),
    // its id, as its row in the menu shows it ("Experiment 1" wraps beside the tag on a small phone)
    label: (p) => `Board ${p.x.id}`,
  };
}
