// The app shell: every screen around the board, and the moves between them.
//
//   home  --Play-->  board  --won-->  win card  --Next-->  the next board
//     ^                |  Back
//     +----------------+   (the board in hand is kept; Play returns to it)
//   home  --Albums-->  albums  -->  an album  -->  a picture, full screen
//                      (albums.ts; each Back goes one step up)
//   home  --Challenges-->  the route  -->  a challenge board  --won-->  win card
//                          (challenges.ts; a second lane beside the campaign,
//                          neither blocking the other)
//   home  --Daily-->  the day's board  --won-->  win card  -->  the day's results
//                     (daily.ts; once played, Daily opens the results)
//
// Over them: the restart card (Restart is free, so the card only checks it was
// meant), the win card, and the "No connection" card, which covers every
// screen but the board in hand, and covers a board asked for (Play, Next)
// without opening it, until the connection is back (the game standard, "Every
// game is played online").
//
// The top row is the standard's: the Gem's corner (top-left) left alone, the
// level on the left, Back then the gear at the right end, all level with the
// Gem. The board itself, its rules and animations are the gameplay member's,
// opened through board-api.ts and heard through src/events.ts.

import "./style.css";
import { onArcadePause, onPlayerPrefs } from "../gem";
import { emit, on } from "../events";
import { mountSettings } from "../settings-screen";
import { startSound } from "../sound";
import { t } from "./i18n";
import { ICONS, type IconName } from "./icons";
import { screenChanged } from "./browser";
import { online, onOnline, pretend } from "./online";
import { campaign, cleared, loadCampaign, onCampaign, playedDaily, pretendRestored, restore, waitForCloud, won } from "./progress";
import { createAlbums } from "./albums";
import { createChallenges } from "./challenges";
import { createGuide, type GuideMode } from "./guide";
import { fireworks } from "./fireworks";
import type { Challenge } from "./challenge-data";
import { level as campaignLevel, type Daily } from "../game/levels";
import { createDaily } from "./daily";
import { clock, shortDate } from "./format";
import { claimWin, cueCoins, type Verdict } from "../net/claims";
import { levelCount, openBoard, type BoardHandle, type BoardPicture, type HelperCounts } from "./board-api";

// ---------- a little DOM ----------

type Kids = Array<Node | string | null | undefined | false>;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<Record<string, string>> = {}, ...kids: Kids): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (v !== undefined) el.setAttribute(k, v);
  for (const kid of kids) if (kid) el.append(kid);
  return el;
}
function icon(name: IconName): Node {
  const t = document.createElement("template");
  t.innerHTML = ICONS[name];
  return t.content.firstChild!;
}
function button(cls: string, press: string, ...kids: Kids): HTMLButtonElement {
  const b = h("button", { type: "button", class: `btn ${cls}`, "data-press": press }, ...kids);
  return b;
}

// ---------- the screens ----------

const app = h("div", { id: "app" });

// home: the game's name, where the player is, and Play
const homeWhere = h("div", { class: "where glass" });
const homePlayLabel = h("span");
const homePlay = button("amber play", "home.play", icon("play"), homePlayLabel);
const homeAlbums = button("tile-btn albums", "home.albums", icon("albums"), h("span", {}, t("home.albums")));
// the daily puzzle (daily.ts): its Home button shows today's state, and is hidden until the day's board is known
const dailyUi = createDaily({ home: () => goHome(), show: () => show("daily"), play: (d) => openPlay({ kind: "daily", d }) });
// shown once the challenge boards exist: nothing promises a screen with nothing on it
const homeChallenges = button("tile-btn challenges", "home.challenges", icon("challenges"), h("span", {}, t("home.challenges")));
homeChallenges.hidden = true;
// the game's name is Art's drawn title (public/art/wordmark.webp, 840 x 405); its
// words reach screen readers as the picture's alt
const wordmark = h("img", {
  class: "wordmark",
  src: `${import.meta.env.BASE_URL}art/wordmark.webp`,
  alt: t("game.title"),
  width: "840",
  height: "405",
  draggable: "false",
  decoding: "async",
});
const home = h(
  "section",
  { class: "screen home", "aria-label": t("game.title") },
  h(
    "div",
    { class: "brand" },
    h("div", { class: "emblem", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
    h("h1", {}, wordmark),
  ),
  homeWhere,
  homePlay,
  dailyUi.homeButton,
  h("div", { class: "more" }, homeAlbums, homeChallenges),
);

// the board: the level (on a challenge: its number, par and the moves so far), Back, the board, the helpers
const levelPill = h("div", { class: "top-pill glass" });
const pillName = h("span", { class: "name" });
const pillPar = h("span", { class: "par" });
const back = button("round top-back", "board.back", icon("back"));
back.setAttribute("aria-label", t("board.back"));
const host = h("div", { class: "board-host" });
const restartBtn = button("restart", "board.restart", icon("restart"), t("board.restart"));

type HelperKey = keyof HelperCounts;
const helperBtns = {} as Record<HelperKey, { btn: HTMLButtonElement; badge: HTMLElement }>;
function helper(key: HelperKey, name: IconName, label: string): HTMLButtonElement {
  const badge = h("span", { class: "badge", "aria-hidden": "true" });
  const btn = button(`round helper ${key}`, `board.${key}`, icon(name), badge);
  btn.setAttribute("aria-label", label);
  helperBtns[key] = { btn, badge };
  return btn;
}
const helpers = h(
  "div",
  { class: "helpers" },
  restartBtn,
  h("span", { class: "spacer" }),
  helper("undo", "undo", t("board.undo")),
  helper("hint", "hint", t("board.hint")),
  helper("shuffle", "shuffle", t("board.shuffle")),
);
// one short line at the board's foot when it is stuck: a dead end, or no way to win from here
const stuckNote = h("div", { class: "stuck-note glass", role: "status", hidden: "" });
const boardScreen = h("section", { class: "screen board-screen", hidden: "" }, levelPill, back, host, stuckNote, helpers);

// the cards
const winVeil = h("div", { class: "veil win", hidden: "", role: "dialog", "aria-modal": "true" });
const restartVeil = h("div", { class: "veil restart", hidden: "", role: "dialog", "aria-modal": "true" });
const offlineVeil = h(
  "div",
  { class: "veil offline", hidden: "", role: "alertdialog", "aria-live": "assertive" },
  h(
    "div",
    { class: "card" },
    h("h2", {}, t("offline.title")),
    h("p", {}, t("offline.why")),
    h("div", { class: "waiting" }, h("i", { "aria-hidden": "true" }), t("offline.reconnecting")),
  ),
);

// the albums (albums.ts): the list, one album, and the full-screen picture
const albumsUi = createAlbums({ home: () => goHome(), show: (which) => show(which) });
// the challenge route (challenges.ts)
const routeUi = createChallenges({ home: () => goHome(), show: () => show("challenges"), play: (c) => openPlay({ kind: "challenge", c }) });

app.append(home, boardScreen, albumsUi.listScreen, albumsUi.albumScreen, routeUi.screen, dailyUi.screen, albumsUi.viewer, winVeil, restartVeil, offlineVeil);

// ---------- state ----------

type Screen = "home" | "board" | "albums" | "album" | "challenges" | "daily";
/** A board to play: one of the campaign's, one on the challenge route, or the day's. */
type Play = { kind: "campaign"; level: number } | { kind: "challenge"; c: Challenge } | { kind: "daily"; d: Daily };
const samePlay = (a: Play | null, b: Play): boolean => {
  if (!a || a.kind !== b.kind) return false;
  if (a.kind === "campaign") return a.level === (b as typeof a).level;
  if (a.kind === "challenge") return a.c.id === (b as typeof a).c.id;
  return a.d.id === (b as typeof a).d.id;
};

let screen: Screen = "home";
let board: BoardHandle | null = null;
let play: Play | null = null;
/** The board in hand was won; its card is up (or about to be). */
let boardWon = false;
/** A board asked for while there was no connection: opened once it is back. */
let waiting: Play | null = null;
/** Moves so far on the board in hand, when the board says (board:changed). */
let movesSoFar: number | null = null;

/** The board as the guide steers it (its guide mode is the gameplay member's). */
type GuidedBoard = BoardHandle & { guide?: (mode: GuideMode) => void };

// the first board's guide (guide.ts): over everything, the gear too
const guide = createGuide({
  app,
  host,
  hint: helperBtns.hint.btn,
  others: () =>
    [back, restartBtn, helperBtns.undo.btn, helperBtns.hint.btn, helperBtns.shuffle.btn, document.getElementById("settings-button")].filter(
      (el): el is HTMLElement => !!el,
    ),
  setBoard: (mode) => (board as GuidedBoard | null)?.guide?.(mode),
  stillHere: () => screen === "board" && play?.kind === "campaign" && play.level === 1 && !boardWon,
});

const levels = () => levelCount();
const allDone = () => campaign().level > levels();

function show(next: Screen): void {
  screen = next;
  home.hidden = next !== "home";
  boardScreen.hidden = next !== "board";
  albumsUi.listScreen.hidden = next !== "albums";
  albumsUi.albumScreen.hidden = next !== "album";
  routeUi.screen.hidden = next !== "challenges";
  dailyUi.screen.hidden = next !== "daily";
  if (next !== "album") albumsUi.closeViewer();
  screenChanged();
  drawOffline();
}

// ---------- home ----------

function drawHome(): void {
  const c = campaign();
  homeWhere.textContent = allDone() ? t("home.allDone") : t("home.level", { level: c.level });
  homePlayLabel.textContent = t("home.play");
  homeChallenges.hidden = !routeUi.exists();
}

homePlay.addEventListener("click", async () => {
  // where the player is comes from their save: give it a moment more to land
  // (the first screen did not wait for it), then go on what we have
  homePlay.disabled = true;
  await waitForCloud(3000);
  homePlay.disabled = false;
  // a finished campaign starts again from the first board (progress is kept)
  const level = allDone() ? 1 : campaign().level;
  openLevel(level);
});

homeAlbums.addEventListener("click", () => albumsUi.openList());
homeChallenges.addEventListener("click", () => void routeUi.openRoute());

// ---------- the board ----------

function openLevel(level: number): void {
  openPlay({ kind: "campaign", level });
}

function openPlay(next: Play): void {
  if (!online()) {
    waiting = next;
    drawOffline();
    return;
  }
  waiting = null;
  hideCard(winVeil);
  hideCard(restartVeil);
  // the board in hand is kept (Back, then the same board again, carries on)
  if (!board || !samePlay(play, next) || boardWon) {
    board?.destroy();
    host.replaceChildren();
    boardWon = false;
    play = next;
    movesSoFar = null;
    stuckNote.hidden = true;
    drawPill();
    // the board reports its helpers and undo through board:changed, once at start too
    drawHelpers({ undo: 3, hint: 3, shuffle: 3 }, false);
    guide.cancel();
    board = openBoard(host, next.kind === "campaign" ? next.level : next.kind === "challenge" ? next.c.level : next.d);
    // the first board teaches the game, once the save says the player has not learnt it yet
    if (next.kind === "campaign" && next.level === 1) void guide.offer();
  }
  show("board");
}

/** The top row's information: the level; on a challenge or the daily, its name over the par and the moves so far. */
function drawPill(): void {
  if (!play) return;
  levelPill.classList.toggle("two", play.kind !== "campaign");
  if (play.kind === "campaign") {
    levelPill.replaceChildren(t("board.level", { level: play.level }));
    return;
  }
  const par = play.kind === "challenge" ? play.c.par : play.d.par;
  pillName.textContent = play.kind === "challenge" ? t("board.challenge", { n: play.c.n }) : t("board.daily", { date: shortDate(play.d.date) });
  pillPar.textContent = movesSoFar === null ? t("board.par", { par }) : t("board.parYou", { par, moves: movesSoFar });
  levelPill.replaceChildren(pillName, pillPar);
}

function goHome(): void {
  hideCard(winVeil);
  hideCard(restartVeil);
  if (boardWon) {
    board?.destroy();
    host.replaceChildren();
    board = null;
    boardWon = false;
  }
  drawHome();
  show("home");
}

back.addEventListener("click", () => {
  // a won board's card is never lost to a quick Back: it shows at once instead
  if (boardWon && winVeil.hidden) return void showWin();
  if (play?.kind === "challenge") return void toRoute();
  goHome();
});

/** Back to the challenge route, the board in hand kept unless it was won. */
function toRoute(): void {
  hideCard(winVeil);
  hideCard(restartVeil);
  if (boardWon) {
    board?.destroy();
    host.replaceChildren();
    board = null;
    boardWon = false;
  }
  void routeUi.openRoute();
}

function drawHelpers(counts: HelperCounts, canUndo: boolean): void {
  for (const key of ["undo", "hint", "shuffle"] as const) {
    const { btn, badge } = helperBtns[key];
    const left = counts[key];
    badge.textContent = String(left);
    btn.classList.toggle("spent", left <= 0);
    btn.classList.toggle("resting", left <= 0 || (key === "undo" && !canUndo));
    btn.setAttribute("aria-label", `${t(`board.${key}`)}, ${t("board.helperLeft", { count: left })}`);
  }
}

helperBtns.undo.btn.addEventListener("click", () => board?.undo());
helperBtns.hint.btn.addEventListener("click", () => board?.hint());
helperBtns.shuffle.btn.addEventListener("click", () => board?.shuffle());

on("board:changed", (e) => {
  drawHelpers(e.helpers, e.canUndo);
  // the moves so far, where the board reports them: a challenge's top row counts against par
  const moves = (e as { moves?: number }).moves;
  if (typeof moves === "number" && play && play.kind !== "campaign") {
    movesSoFar = moves;
    drawPill();
  }
});

// Stuck: only Undo or Restart helps, so the line says so, and stays until the player does something.
let stuckLine: string | null = null;
on("board:stuck", ({ doomed }) => {
  stuckLine = t(doomed ? "board.doomed" : "board.stuck");
  stuckNote.textContent = stuckLine;
  stuckNote.hidden = false;
});
const unstick = () => {
  stuckLine = null;
  clearTimeout(refusedTimer);
  stuckNote.hidden = true;
};
// Shuffle that could find no better mix spent nothing: say so for a moment, then back to what was there
let refusedTimer: number | undefined;
on("helper:refused", () => {
  stuckNote.textContent = t("board.noMix");
  stuckNote.hidden = false;
  clearTimeout(refusedTimer);
  refusedTimer = window.setTimeout(() => {
    if (stuckLine) stuckNote.textContent = stuckLine;
    else stuckNote.hidden = true;
  }, 3500);
});
for (const type of ["piece:lift", "helper:undo", "helper:shuffle", "board:restart", "board:start", "board:won"] as const) on(type, unstick);

// Restart is free; the card only checks it was meant. Before the first move there is nothing to lose.
restartBtn.addEventListener("click", () => {
  if (!board || boardWon) return;
  if (!board.canUndo()) return void board.restart();
  restartVeil.replaceChildren(
    h(
      "div",
      { class: "card" },
      h("h2", {}, t("restart.title")),
      h("p", {}, t("restart.why")),
      h(
        "div",
        { class: "row" },
        withClick(button("", "restart.no", t("restart.no")), () => hideCard(restartVeil)),
        withClick(button("amber", "restart.yes", icon("restart"), t("restart.yes")), () => {
          hideCard(restartVeil);
          board?.restart();
        }),
      ),
    ),
  );
  showCard(restartVeil);
});

// ---------- the win card ----------

type Win = (
  | { kind: "campaign"; level: number; moves: number; ms: number; milestone: boolean }
  | { kind: "challenge"; c: Challenge; moves: number; ms: number; first: boolean; better: boolean }
  | { kind: "daily"; d: Daily; moves: number; ms: number; first: boolean }
) & {
  /** The win checker's word, once it lands (it may take a while offline). */
  verdict?: Verdict;
  /** Its Coins have flown to the Arcade's wallet (once, ever, per win). */
  cued?: boolean;
};
let lastWin: Win | null = null;

// every picture restored is the player's to keep: saved with the board's end (won), one write a board
on("picture:clear", ({ pictureId }) => restore(pictureId));

on("board:won", ({ moves, ms, line }) => {
  if (!play) return;
  boardWon = true;
  let win: Win;
  if (play.kind === "campaign") {
    won(play.level);
    // the board the guide taught on ends on the guide's own milestone card
    const milestone = play.level === 1 && guide.takeFinish();
    win = { kind: "campaign", level: play.level, moves, ms, milestone };
  } else if (play.kind === "challenge") {
    // any win clears a challenge board, over par too; the save keeps the fewer moves
    const { first, better } = cleared(play.c.id, moves);
    win = { kind: "challenge", c: play.c, moves, ms, first, better };
  } else {
    // only the day's first finish counts on the day's board
    win = { kind: "daily", d: play.d, moves, ms, first: playedDaily(play.d.date, moves, ms) };
  }
  lastWin = win;
  // the win checker judges and pays (src/net/claims.ts); the card never waits for it
  const lvl = play.kind === "campaign" ? campaignLevel(play.level) : play.kind === "challenge" ? play.c.level : play.d;
  const verdict = claimWin({
    lane: play.kind,
    board: lvl.id,
    deal: lvl.deal,
    line,
    ms,
    ...(play.kind === "daily" ? { date: play.d.date } : {}),
  });
  if (win.kind === "daily" && win.first) dailyUi.claimed(verdict);
  void verdict.then((v) => {
    win.verdict = v;
    if (lastWin === win && !winVeil.hidden) {
      drawCoins(win);
      // the checker's word on the day wins over the device's: a day closed, or another finish was first
      const line = winVeil.querySelector(".daily-line");
      if (win.kind === "daily" && line) {
        if (v.status === "late") line.replaceChildren(t("daily.late"));
        else if ("first" in v && v.first === false) line.replaceChildren(t("daily.notCounted"));
      }
    }
  });
  // the board fires this after its own flourish, so the card goes straight up
  showWin();
});

/**
 * What the win paid, on its card, once the checker says so: a coin chip on the
 * card's top edge (the milestone card has a place kept for it, so nothing under
 * the player's finger moves), and the Coins flying to the Arcade's wallet once.
 * Nothing for a win that paid nothing new.
 */
function drawCoins(win: Win): void {
  const v = win.verdict;
  if (!v || v.status !== "paid" || v.coins <= 0) return;
  const card = winVeil.querySelector<HTMLElement>(".card");
  if (!card) return;
  const coin = h("span", { class: "coin", "aria-hidden": "true" });
  const slot = card.querySelector<HTMLElement>(".prize");
  if (slot) {
    slot.replaceChildren(coin, h("span", {}, t("guide.prize", { count: v.coins })));
    slot.classList.add("landed");
  } else {
    card.querySelector(".coins-chip")?.remove();
    card.append(h("div", { class: "coins-chip glass", role: "status" }, coin, h("span", {}, t("win.coins", { count: v.coins }))));
  }
  if (!win.cued) win.cued = cueCoins(v, coin) || true;
}

function showWin(): void {
  if (!lastWin || !board) return;
  const gallery = layoutGallery(board.pictures());
  if (lastWin.kind === "challenge") return void showChallengeWin(lastWin, gallery);
  if (lastWin.kind === "daily") return void showDailyWin(lastWin, gallery);
  if (lastWin.milestone) return void showMilestone(gallery);
  const { level, moves, ms } = lastWin;
  const last = level >= levels();
  const next = last
    ? withClick(button("amber next", "win.home", icon("home"), t("win.home")), goHome)
    : withClick(button("amber next", "win.next", t("win.next"), icon("next")), () => openLevel(level + 1));
  winVeil.replaceChildren(
    h(
      "div",
      { class: "card" },
      h("h2", {}, t("win.title")),
      gallery,
      h(
        "div",
        { class: "stats" },
        h("div", { class: "stat glass" }, h("b", {}, String(moves)), h("span", {}, t("win.moves"))),
        h("div", { class: "stat glass" }, h("b", {}, clock(ms)), h("span", {}, t("win.time"))),
      ),
      last ? h("p", {}, t("win.allDone")) : null,
      next,
    ),
  );
  showCard(winVeil);
  drawCoins(lastWin);
}

/**
 * The guide's finish: a milestone card of its own in place of the win card, with a
 * burst over it (the game standard: a card, fireworks, a picture of the prize). The
 * prize is the server's to pay (the c01 win's verdict); its place on the card waits
 * for it.
 */
function showMilestone(gallery: HTMLElement): void {
  // the prize's place, kept from the start so nothing moves when the checker's word lands
  const prize = h("div", { class: "prize", "aria-live": "polite" });
  const card = h(
    "div",
    { class: "card milestone" },
    h("h2", {}, t("guide.doneTitle")),
    h("p", {}, t("guide.doneWhy")),
    gallery,
    prize,
    withClick(button("amber next", "win.next", t("win.next"), icon("next")), () => openLevel(2)),
  );
  winVeil.replaceChildren(card);
  showCard(winVeil);
  fireworks(card, 6, 3000);
  emit("milestone:show", { id: "guide" });
  if (lastWin) drawCoins(lastWin);
}

/**
 * The daily's card: the pictures, the moves and the time (what the day's board ranks
 * by), and plainly whether this finish is the one that counts; then the day's results.
 */
function showDailyWin(w: Extract<Win, { kind: "daily" }>, gallery: HTMLElement): void {
  const line = w.verdict?.status === "late" ? t("daily.late") : w.first ? t("daily.counted") : t("daily.notCounted");
  winVeil.replaceChildren(
    h(
      "div",
      { class: "card" },
      h("h2", {}, t("win.title")),
      gallery,
      h(
        "div",
        { class: "stats" },
        h("div", { class: "stat glass" }, h("b", {}, String(w.moves)), h("span", {}, t("win.moves"))),
        h("div", { class: "stat glass" }, h("b", {}, clock(w.ms)), h("span", {}, t("win.time"))),
      ),
      h("p", { class: "daily-line" }, line),
      h(
        "div",
        { class: "row" },
        withClick(button("", "win.home", t("win.home")), goHome),
        withClick(button("amber next", "win.results", t("win.results")), () => {
          hideCard(winVeil);
          board?.destroy();
          host.replaceChildren();
          board = null;
          boardWon = false;
          void dailyUi.openResults();
        }),
      ),
    ),
  );
  showCard(winVeil);
  drawCoins(w);
}

/** A challenge board's card: the pictures, then "Par N · You M". No fail: over par, it is still cleared. */
function showChallengeWin(w: Extract<Win, { kind: "challenge" }>, gallery: HTMLElement): void {
  const { c, moves, better } = w;
  const after = routeUi.after(c);
  // a word only for a good result; going over par says nothing against the player
  const praise = better ? t("win.newBest") : moves < c.par ? t("win.underPar") : moves === c.par ? t("win.onPar") : "";
  // beside Next it is the plain one, its word alone so both fit a small phone; on the last board, the main one
  const toRouteBtn = after
    ? withClick(button("", "win.route", t("win.route")), toRoute)
    : withClick(button("amber next", "win.route", icon("challenges"), t("win.route")), toRoute);
  const buttons = after
    ? h(
        "div",
        { class: "row" },
        toRouteBtn,
        withClick(button("amber next", "win.next", t("win.next"), icon("next")), () => openPlay({ kind: "challenge", c: after })),
      )
    : toRouteBtn;
  winVeil.replaceChildren(
    h(
      "div",
      { class: "card" },
      h("h2", {}, t("win.title")),
      gallery,
      h(
        "div",
        { class: "stats" },
        h("div", { class: "stat glass" }, h("b", {}, String(c.par)), h("span", {}, t("win.par"))),
        h("div", { class: "stat glass" }, h("b", {}, String(moves)), h("span", {}, t("win.you"))),
      ),
      praise ? h("p", { class: "praise" }, praise) : null,
      buttons,
    ),
  );
  showCard(winVeil);
  drawCoins(w);
}

/**
 * The board's pictures whole, in one to three rows, each card of a picture one
 * unit square, the unit as big as fits the card's width and a share of the
 * screen's height (never bigger than 46px, never under 18px).
 */
const GAP = 10;
/** A phone held sideways: the same question as the stylesheet's sideways block. */
const SIDEWAYS = matchMedia("(orientation: landscape) and (max-height: 560px)");
function layoutGallery(pics: BoardPicture[]): HTMLElement {
  // upright the gallery has the card's width and a third of the height; sideways, the card's left
  // column and the height under its title
  const width = SIDEWAYS.matches ? Math.min(720, app.clientWidth - 32) * 0.55 - 34 : Math.min(360, app.clientWidth - 32) - 44 - 4;
  const height = SIDEWAYS.matches ? Math.max(110, app.clientHeight - 210) : Math.max(120, Math.min(300, app.clientHeight * 0.34));
  let best: { u: number; rows: BoardPicture[][] } = { u: 0, rows: [pics] };
  for (let n = 1; n <= Math.min(3, pics.length); n++) {
    // fill n rows, each picture into the row with the fewest columns so far (biggest first)
    const rows: BoardPicture[][] = Array.from({ length: n }, () => []);
    const cols = (row: BoardPicture[]) => row.reduce((sum, p) => sum + p.cols, 0);
    for (const p of [...pics].sort((a, b) => b.cols - a.cols)) rows.reduce((a, b) => (cols(b) < cols(a) ? b : a)).push(p);
    const byWidth = Math.min(...rows.map((r) => (width - GAP * (r.length - 1)) / Math.max(1, cols(r))));
    const tall = rows.reduce((sum, r) => sum + Math.max(0, ...r.map((p) => p.rows)), 0);
    const u = Math.min(46, byWidth, (height - GAP * (n - 1)) / Math.max(1, tall));
    if (u > best.u + 0.5) best = { u, rows };
  }
  const gallery = h("div", { class: "gallery", style: `--u:${Math.max(18, Math.floor(best.u))}px;--gap:${GAP}px` });
  let i = 0;
  for (const row of best.rows) {
    if (!row.length) continue;
    const line = h("div", { class: "line" });
    for (const p of row) line.append(h("figure", { style: `--c:${p.cols};--r:${p.rows};--i:${i++}` }, h("img", { src: p.src, alt: "", draggable: "false" })));
    gallery.append(line);
  }
  return gallery;
}


// ---------- cards ----------

function withClick(b: HTMLButtonElement, fn: () => void): HTMLButtonElement {
  b.addEventListener("click", fn);
  return b;
}
function showCard(veil: HTMLElement): void {
  veil.hidden = false;
  screenChanged();
  drawOffline();
}
function hideCard(veil: HTMLElement): void {
  veil.hidden = true;
}

/** The "No connection" card: over everything but the board in hand, until the connection is back. */
function drawOffline(): void {
  const inHand = screen === "board" && !boardWon && waiting === null;
  offlineVeil.hidden = online() || inHand;
}

onOnline((up) => {
  if (up && waiting !== null) openPlay(waiting);
  drawOffline();
});

// ---------- the page ----------

// Every interface button press, for its click sound (src/audio/ listens). Heard
// on the way down, before the button's own handler can disable it or swap the
// screen; a ghost tap the page refused (browser.ts) makes no sound.
document.addEventListener(
  "click",
  (e) => {
    const b = (e.target as Element | null)?.closest?.("button");
    if (b && !b.disabled && !e.defaultPrevented && !b.closest(".board-host")) emit("ui:press", { id: b.dataset.press || b.id || "button" });
  },
  true,
);

// Less motion: the Arcade's setting reaches the CSS (the device's does by media query).
onPlayerPrefs((prefs) => document.documentElement.classList.toggle("less-motion", prefs.reducedMotion === true));
// Paused: every CSS animation stands still, under the Arcade's menu or on a hidden page.
let arcadePaused = false;
const drawPaused = () => document.documentElement.classList.toggle("paused", arcadePaused || document.visibilityState === "hidden");
onArcadePause((p) => {
  arcadePaused = p;
  drawPaused();
});
document.addEventListener("visibilitychange", drawPaused);

/** Draw the first screen. Called once by the boot entry (src/main.ts). */
export async function startApp(): Promise<void> {
  // the round type and the title, asked for beside this code by the boot; a
  // moment's wait so the first screen does not redraw in another font or pop
  // its title in, never longer
  const face = new FontFace("Fredoka", `url(${import.meta.env.BASE_URL}fonts/fredoka-latin.woff2)`, { weight: "300 700", display: "swap" });
  document.fonts.add(face);
  await Promise.race([
    Promise.all([face.load().catch(() => undefined), wordmark.decode().catch(() => undefined)]),
    new Promise((r) => setTimeout(r, 400)),
  ]);

  loadCampaign();
  onCampaign(drawHome);
  onCampaign(albumsUi.redraw);
  onCampaign(routeUi.redraw);
  onCampaign(dailyUi.redraw);
  drawHome();
  document.body.append(app);
  mountSettings(app);
  document.getElementById("boot")?.remove();
  show("home");
  void startSound();
  // which day it is (the platform's word) and its board: Home's Daily button appears once they are known
  void dailyUi.refresh();

  if (import.meta.env.DEV) {
    (window as unknown as { __ps: unknown }).__ps = {
      offline: pretend,
      openLevel,
      campaign,
      restored: pretendRestored,
      cleared,
      guide,
      /** The card up now shows what a paid verdict of `coins` looks like (no Coins move: the checker alone pays). */
      paid(coins: number) {
        if (!lastWin) return;
        lastWin.verdict = { status: "paid", lane: "campaign", board: "dev", moves: lastWin.moves, coins };
        drawCoins(lastWin);
      },
    };
    // ?restored=id,id shows those pictures as restored in the albums (never saved)
    const fake = new URLSearchParams(location.search).get("restored");
    if (fake) pretendRestored(fake.split(",").filter(Boolean));
  }
}
