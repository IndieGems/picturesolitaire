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
// game is played online"). Each card is a dialog to a keyboard too (dialogs.ts):
// the focus moves into it, and Escape does the card's own way out.
//
// The top row is the standard's: the Gem's corner (top-left) left alone, the
// level on the left, Back then the gear at the right end, all level with the
// Gem. The board itself, its rules and animations are the gameplay member's,
// opened through board-api.ts and heard through src/events.ts.
//
// PRACTICE (the creator's dev menu, dev-menu.ts; never in a release build): a
// board opened from the menu, or one a dev hand was put on, plays and finishes
// as ever, its win card included, but sends no claim (no Coins, no progress, no
// daily result), saves no guide step and signals no break. It is gated here, at
// the claim's call site, and says so on the board and on its card. The menu's
// experiment boards (Levels' experiments.json, which the win checker does not
// know) are a fourth kind of board, practice always.

import "./style.css";
import { gem, onArcadePause, onPlayerPrefs } from "../gem";
import { emit, on } from "../events";
import { mountSettings } from "../settings-screen";
import { startSound } from "../sound";
import { t } from "./i18n";
import { ICONS, keepIcons, type IconName } from "./icons";
import { firstScreen, screenChanged } from "./browser";
import { online, onOnline, pretend, suspect } from "./online";
import { learnt, lessonSeen, loadGuideSave } from "./guide-save";
import { campaignNext, challengeBest, dailyResult, guideDone, hold, loadProgress, onProgress, progress, waitForProgress } from "../net/progress";
import { createAlbums } from "./albums";
import { createChallenges } from "./challenges";
import { createGuide, type GuideMode } from "./guide";
import { fireworks } from "./fireworks";
import type { Challenge } from "./challenge-data";
import { lessonLevel, level as campaignLevel, type Daily, type Level } from "../game/levels";
import { createDaily } from "./daily";
import { clock, shortDate } from "./format";
import { claimWin, cueCoins, onVerdict, type Verdict } from "../net/claims";
import { KEEPSAKE } from "../net/keepsake";
import { knownTable, startTables, tableTitle, thumbOf } from "./tables";
import { keepFitted } from "./fit";
import { cardAspect, syncCardAspect } from "./cards";
import { createViewer } from "./viewer";
import { closed, cornerKey, opened } from "./dialogs";
import { markOf, markTag, markWords, pretendMarks, type Mark } from "./marks";
import { allDone, awaitingRecord, createHome, nextBoard } from "./home";
import { KINDS, KIT, stock, type HelperKind } from "./stock";
import { createRunOut } from "./helper-shop";
import { createLessons, type LessonName } from "./lessons";
import { createDestinationBanner, type Destination } from "./destination";
import { createPassport, type AfterStamp } from "./passport";
import { tripById, tripEndingAt, tripName } from "./trips";
import { copyUrl, picture as cataloguePicture, pictureTitle, sharpCopy } from "./catalogue";
import { ensure, resident } from "../packs";
import { mountParticles } from "./particles";
import { boardFiles, levelCount, openBoard, type BoardHandle, type BoardPicture } from "./board-api";
import type { DevMenu } from "./dev-menu";

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

// a win from an earlier session that the checker accepted at this start, and paid: one line in home's
// top row (information, never a button), its Coins flown to the Arcade's total once
const homeNote = h("div", { class: "top-pill glass home-note", role: "status", hidden: "" });
// the daily puzzle (daily.ts): its Home button shows today's state, and is hidden until the day's board is known
const dailyUi = createDaily({ home: () => goHome(), show: () => show("daily"), play: (d) => openPlay({ kind: "daily", d }) });
// home (home.ts): the trip as an itinerary and its route, Next stop, and Daily, the passport and the challenges
const homeUi = createHome(
  {
    play: () => void playNext(),
    passport: () => passportUi.open(),
    challenges: () => void routeUi.openRoute(),
  },
  // the challenge tile shows once the challenge boards exist: nothing promises a screen with nothing on it
  { note: homeNote, daily: dailyUi.homeButton, challengesShown: () => routeUi.exists() },
);
const home = homeUi.screen;

// the board: the level (on a challenge: its number, par and the moves so far), Back, the board, the helpers
const levelPill = h("div", { class: "top-pill glass" });
const pillName = h("span", { class: "name" });
const pillPar = h("span", { class: "par" });
const back = button("round top-back", "board.back", icon("back"));
back.setAttribute("aria-label", t("board.back"));
const host = h("div", { class: "board-host" });
const restartBtn = button("restart", "board.restart", icon("restart"), t("board.restart"));

type HelperKey = HelperKind;
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
// a hard board's banner as it opens (marks.ts): over the board, taking no touch
const markBanner = h("div", { class: "mark-banner", "aria-hidden": "true", hidden: "" });
// a finished destination's name over the top of its postcard (destination.ts), taking no touch
const destBanner = createDestinationBanner();
const boardScreen = h("section", { class: "screen board-screen", hidden: "" }, levelPill, back, host, stuckNote, helpers, markBanner, destBanner.element);

// the cards
const winVeil = h("div", { class: "veil win", hidden: "", role: "dialog", "aria-modal": "true" });
// a picture of the win card, big (the albums' view; a tap or Back returns to the card as it was)
const winViewer = createViewer({ tapToClose: true });
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

// a phone held sideways: one card over everything asking for it upright, shown by the stylesheet
// alone (style.css, .upright); the game is laid out upright only (the creator, 2026-10-26)
const upright = h("div", { class: "upright", role: "status" }, h("div", { class: "glass" }, icon("rotate"), h("h2", {}, t("upright.title")), h("p", {}, t("upright.why"))));

// the albums (albums.ts): no longer on home (the passport took their place); kept, unreached, until they are tidied away
const albumsUi = createAlbums({ home: () => goHome(), show: (which) => show(which) });
// the passport (passport.ts): a page per trip, and the stamp moment
const passportUi = createPassport({ home: () => goHome(), show: () => show("passport") });
// the challenge route (challenges.ts)
const routeUi = createChallenges({ home: () => goHome(), show: () => show("challenges"), play: (c) => openPlay({ kind: "challenge", c }) });

// RUN-OUT (helper-shop.ts): a helper with none left, tapped; bought, it is used at once
const runOut = createRunOut(stock, (k) => pressHelper(k));

app.append(home, boardScreen, albumsUi.listScreen, albumsUi.albumScreen, passportUi.screen, routeUi.screen, dailyUi.screen, albumsUi.viewer, passportUi.viewer, winVeil, winViewer.element, restartVeil, runOut.element, offlineVeil);

// ---------- state ----------

type Screen = "home" | "board" | "albums" | "album" | "passport" | "challenges" | "daily";
/**
 * A board to play: one of the campaign's, one on the challenge route, the day's, or one of the
 * dev menu's experiment boards (practice always).
 * `practice`: the dev menu's (nothing sent or saved); `guide`: board 1 with its guide replayed.
 */
export type Play = (
  | { kind: "campaign"; level: number }
  | { kind: "challenge"; c: Challenge }
  | { kind: "daily"; d: Daily }
  | { kind: "experiment"; x: Experiment }
  | { kind: "lesson"; x: Level }
) & {
  practice?: boolean;
  guide?: boolean;
};
/** An experiment board (src/content/levels/experiments.json, loaded by the dev menu alone); `name` is its label there. */
export type Experiment = Level & { name: string };
/** A practice board or win (the dev menu's). Always false in a release build, which then drops every branch on it. */
function isPractice(x: { practice?: boolean } | null | undefined): boolean {
  return import.meta.env.MODE !== "release" && x?.practice === true;
}
const samePlay = (a: Play | null, b: Play): boolean => {
  if (!a || a.kind !== b.kind || isPractice(a) !== isPractice(b) || (isPractice(a) && !!a.guide !== !!b.guide)) return false;
  if (a.kind === "campaign") return a.level === (b as typeof a).level;
  if (a.kind === "challenge") return a.c.id === (b as typeof a).c.id;
  if (a.kind === "experiment" || a.kind === "lesson") return a.x.id === (b as typeof a).x.id;
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
/** The creator's dev menu, once it has loaded (dev channel only); null in every release build. */
let dev: DevMenu | null = null;

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

// the two lessons after the guide (lessons.ts): Undo on board 2, Shuffle on a practice board before board 4
const lessons = createLessons({
  app,
  button: (name) => helperBtns[name].btn,
  others: () =>
    [back, restartBtn, helperBtns.undo.btn, helperBtns.hint.btn, helperBtns.shuffle.btn, document.getElementById("settings-button")].filter(
      (el): el is HTMLElement => !!el,
    ),
  setBoard: (mode) => (board as GuidedBoard | null)?.guide?.(mode),
  free: (name) => (board as LessonBoard | null)?.lesson?.(name),
  stillHere: (name) =>
    screen === "board" && !boardWon && (name === "undo" ? play?.kind === "campaign" && play.level === 2 : play?.kind === "lesson"),
});
/** The board's lesson call (the gameplay member's): the next use of that helper is free. */
type LessonBoard = BoardHandle & { lesson?: (k: LessonName | null) => void };
/** The Shuffle lesson's staged board (the level designer's, loaded by the gameplay member), once loaded. */
let shuffleBoard: Level | null = null;

const levels = () => levelCount();
/** A campaign position as the board's own number (the campaign goes round past the last board). */
const boardNumber = (n: number) => ((n - 1) % levels()) + 1;

function show(next: Screen): void {
  screen = next;
  if (import.meta.env.MODE !== "release") dev?.screen(next);
  // every picture and card drawn from here on takes the board's card shape (cards.ts)
  syncCardAspect();
  home.hidden = next !== "home";
  boardScreen.hidden = next !== "board";
  if (next !== "board") destBanner.clear();
  albumsUi.listScreen.hidden = next !== "albums";
  albumsUi.albumScreen.hidden = next !== "album";
  passportUi.screen.hidden = next !== "passport";
  if (next !== "passport") passportUi.leave();
  routeUi.screen.hidden = next !== "challenges";
  dailyUi.screen.hidden = next !== "daily";
  if (next === "home") drawHomeNote();
  else homeNote.hidden = true;
  if (next !== "album") albumsUi.closeViewer();
  if (next !== "board") {
    runOut.close();
    lessons.cancel();
  }
  winViewer.close();
  screenChanged();
  drawOffline();
}

// ---------- home ----------

function drawHome(): void {
  homeUi.draw();
  // the board Next stop opens, its pictures fetched ahead while home is up
  if (!awaitingRecord()) prefetch(campaignLevel(nextBoard()));
}

let playing = false;
async function playNext(): Promise<void> {
  if (playing) return;
  // where the player is is the server's record: if it is still on its way, the press answers at
  // once ("Opening…") and the board opens as soon as the record lands (3 s at most, then on what
  // we have), never a press that seems to do nothing
  if (awaitingRecord()) {
    playing = true;
    homeUi.opening(true);
    await waitForProgress(3000);
    playing = false;
    homeUi.opening(false);
    drawHome();
    if (screen !== "home") return; // the player went elsewhere meanwhile
  }
  // the next position; once every board is won the position stays at "all done" (the server's
  // rule), and Next stop goes round the boards in order (home.ts, nextBoard)
  openLevel(nextBoard());
}

/** Paid verdicts of claims from an earlier session (Server's claims.ts marks them resumed), waiting for home. */
const lastWins: Verdict[] = [];
onVerdict((v) => {
  if (v.status !== "paid" || !v.resumed || v.coins <= 0) return;
  lastWins.push(v);
  if (screen === "home") drawHomeNote();
});
/** "Your last win counted: +25 Coins", once, when home is up; nothing for a win that paid nothing. */
function drawHomeNote(): void {
  if (!lastWins.length) return;
  const paid = lastWins.splice(0);
  const coin = h("span", { class: "coin", "aria-hidden": "true" });
  homeNote.replaceChildren(coin, h("span", {}, t("home.lastWin", { count: paid.reduce((sum, v) => sum + (v.status === "paid" ? v.coins : 0), 0) })));
  homeNote.hidden = false;
  for (const v of paid) cueCoins(v, coin);
}

// ---------- the board ----------

function openLevel(level: number): void {
  openPlay({ kind: "campaign", level });
}

/** The level a play opens (the campaign's by its number, which goes round). */
function levelOfPlay(p: Play): Level {
  return p.kind === "campaign" ? campaignLevel(p.level) : p.kind === "challenge" ? p.c.level : p.kind === "daily" ? p.d : p.x;
}

/**
 * The picture files a board will draw in the board's box (catalogue paths, the board's own
 * choice: Gameplay's boardFiles), to load from its pack before it opens (src/packs.ts).
 */
const boardPaths = (lvl: Level): string[] => boardFiles(lvl, host);

/** Load a board's pictures ahead (the next board, while the win card or home is up); a miss costs nothing. */
function prefetch(lvl: Level | null | undefined): void {
  if (!lvl) return;
  const paths = boardPaths(lvl);
  if (!paths.every(resident)) void ensure(paths, lvl.id).catch(() => undefined);
}

/** Counts each board asked for while its pictures load, so only the last one asked for opens. */
let packWait = 0;

function openPlay(next: Play): void {
  // the dev menu's endless helpers are on: a win helped along never pays, so every board is practice
  if (import.meta.env.MODE !== "release" && dev?.practiceOnly() && !next.practice) next = { ...next, practice: true };
  // the first way to board 4 goes through the Shuffle lesson (lessons.ts), once per player
  if (next.kind === "campaign" && next.level === 4 && !isPractice(next) && campaignNext() <= 4 && shuffleBoard && lessons.shuffleOwed())
    next = { kind: "lesson", x: shuffleBoard };
  if (!online()) {
    waiting = next;
    drawOffline();
    return;
  }
  waiting = null;
  // a built game: the board's pictures come from its pack first (src/packs.ts); usually they are in
  // already (fetched while the last card or home was up), else home's Play says "Opening…" meanwhile
  const lvl = levelOfPlay(next);
  const paths = boardPaths(lvl);
  if (!paths.every(resident)) {
    const at = ++packWait;
    const onHome = screen === "home";
    if (onHome) homeUi.opening(true);
    void ensure(paths, lvl.id)
      .catch(() => suspect())
      .finally(() => {
        if (onHome) homeUi.opening(false);
        if (at === packWait) openLoaded(next);
      });
    return;
  }
  ++packWait;
  openLoaded(next);
}

/** Open `next`, its pictures in (or plain files). */
function openLoaded(next: Play): void {
  if (!online()) {
    waiting = next;
    drawOffline();
    return;
  }
  hideCard(winVeil);
  hideCard(restartVeil);
  // the board in hand is kept (Back, then the same board again, carries on)
  if (!board || !samePlay(play, next) || boardWon) {
    board?.destroy();
    host.replaceChildren();
    destBanner.clear();
    boardWon = false;
    play = next;
    movesSoFar = null;
    unstick();
    drawPill();
    canUndoNow = false;
    guide.cancel();
    lessons.cancel();
    runOut.close();
    board = openBoard(host, next.kind === "campaign" ? next.level : next.kind === "challenge" ? next.c.level : next.kind === "daily" ? next.d : next.x);
    // the player's own stock on the buttons (the board reports undo through board:changed)
    drawHelpers();
    // a hard board's banner; the first 5x5 board a player opens says so after it, once (bannersFor)
    showBanners(bannersFor(next));
    if (import.meta.env.MODE !== "release") dev?.opened(board);
    // the first board teaches the game, once the save says the player has not learnt it yet;
    // in practice only when the dev menu asked for the guide again (and then it saves nothing)
    if (next.kind === "campaign" && next.level === 1) {
      if (!isPractice(next)) void guide.offer();
      else if (next.guide) void guide.practise();
    }
    // board 2, not won before: the Undo lesson, after the first move; the lesson board: Shuffle's
    if (next.kind === "campaign" && next.level === 2 && !isPractice(next) && campaignNext() <= 2) void lessons.offerUndo();
    if (next.kind === "lesson") lessons.startShuffle();
  }
  show("board");
}

/** How long a banner stays (style.css's mark-banner animation lasts as long). */
const BANNER_MS = 1200;
let bannerTimer = 0;
/** A banner over the board as it opens: its look (style.css), its words, and what happens as it shows. */
type Banner = { cls: string; text: string; shown?: () => void };

/**
 * The banners a board opens with: a hard board's (marks.ts); then, the first time a player opens
 * a 5x5 campaign board, "A bigger board!" (the creator, 2026-10-27: the hard and finale boards from
 * board 10), once per player, remembered beside the lessons (guide-save.ts). Never in practice.
 */
function bannersFor(p: Play): Banner[] {
  if (p.kind !== "campaign") return [];
  const lvl = campaignLevel(p.level);
  const m = markOf(lvl);
  const out: Banner[] = m ? [{ cls: m, text: markWords(m), shown: () => emit("board:mark", { mark: m }) }] : [];
  if (!isPractice(p) && lvl.deal.cols >= 5 && lvl.deal.rows >= 5 && !lessonSeen("big"))
    out.push({ cls: "big", text: t("board.bigger"), shown: () => learnt("big") });
  return out;
}

/** The board's banners over its middle, one after another, about a second each, then gone by themselves; they take no touch. */
function showBanners(list: Banner[]): void {
  clearTimeout(bannerTimer);
  markBanner.hidden = true;
  const next = (i: number): void => {
    const b = list[i];
    markBanner.hidden = true;
    if (!b) return;
    markBanner.className = `mark-banner ${b.cls}`;
    markBanner.textContent = b.text;
    // over the middle of the board, once the board screen is laid out
    requestAnimationFrame(() => {
      if (screen !== "board") return;
      const a = host.getBoundingClientRect();
      const r = boardScreen.getBoundingClientRect();
      markBanner.style.top = `${Math.round(a.top - r.top + a.height / 2)}px`;
      markBanner.hidden = false; // shown again, the animation starts over
      b.shown?.(); // the hard banner: Audio's sting under it
      bannerTimer = window.setTimeout(() => next(i + 1), BANNER_MS);
    });
  };
  next(0);
}

/** The top row's information: the level; on a challenge or the daily, its name over the par and the moves so far. */
function drawPill(): void {
  if (!play) return;
  levelPill.classList.toggle("two", play.kind === "challenge" || play.kind === "daily");
  levelPill.classList.remove("stacked");
  // a practice board says so beside its name (the dev menu's tag: information, never a button)
  const tag = isPractice(play) ? dev?.tag() : null;
  if (play.kind === "campaign") {
    const mark = markOf(campaignLevel(play.level));
    const name = h("span", { class: "level-name" }, t("board.level", { level: boardNumber(play.level) }));
    // a hard board's tag by the number (marks.ts); with the practice tag too, both under the number
    const tags = [...(mark ? [markTag(mark, true)] : []), ...(tag ? [tag] : [])];
    levelPill.classList.toggle("stacked", tags.length > 1);
    levelPill.replaceChildren(name, ...(tags.length > 1 ? [h("span", { class: "tags" }, ...tags)] : tags));
    return;
  }
  if (play.kind === "experiment") {
    levelPill.replaceChildren(dev?.label(play) ?? play.x.id, ...(tag ? [tag] : []));
    return;
  }
  if (play.kind === "lesson") {
    levelPill.replaceChildren(h("span", { class: "level-name" }, t("lesson.pill")));
    return;
  }
  const par = play.kind === "challenge" ? play.c.par : play.d.par;
  pillName.textContent = play.kind === "challenge" ? t("board.challenge", { n: play.c.n }) : t("board.daily", { date: shortDate(play.d.date) });
  if (tag) pillName.append(tag);
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
  // leaving a board in play is a break: the player chose to go back
  void signalBreak("menu_return", "board-back");
  if (play?.kind === "challenge") return void toRoute();
  goHome();
});

// ---------- platform moments ----------

/**
 * The guided start: board 1 before its finish card is over (its card included). The
 * Arcade is never asked for a moment there; the first comes at the first break after it.
 */
function inGuidedStart(): boolean {
  if (lastWin?.kind === "campaign" && lastWin.milestone && boardWon) return true;
  return play?.kind === "campaign" && play.level === 1 && !guideDone();
}

/** A lesson under way (lessons.ts): its board in play, or the lesson board's card. */
function inLesson(): boolean {
  return lessons.active() || play?.kind === "lesson" || (lastWin?.kind === "lesson" && boardWon);
}

/**
 * A press that leaves a break (the game standard, "Ads are each game's choice": break
 * ads; the SDK's platform-moments.md). The Arcade alone decides whether anything of its
 * own shows over the paused game, and usually nothing does; `shown` grants nothing, and
 * the game shows no ads of its own. Signalled from the press itself, once per break.
 * Resolves when the Arcade has answered (it never rejects).
 */
function signalBreak(kind: "level_end" | "menu_return", placement: string): Promise<void> {
  // nothing of the Arcade's over the guided start, inside a lesson, nor over the creator's practice
  if (inGuidedStart() || inLesson() || isPractice(play)) return Promise.resolve();
  return gem.moments.signal({ kind, placement }).then(
    () => undefined,
    () => undefined,
  );
}

/**
 * Leave a win card into play (Next): the card stops answering, the break is signalled,
 * and the next board opens once the Arcade has answered, so nothing starts under one of
 * its panels.
 */
function leaveInto(placement: string, go: () => void): void {
  winVeil.inert = true;
  void signalBreak("level_end", placement).then(() => {
    winVeil.inert = false;
    go();
  });
}
/** Leave a win card to a screen with no clock (Home, the route, the results): at once, the break signalled beside it. */
function leaveTo(placement: string, go: () => void): void {
  void signalBreak("level_end", placement);
  go();
}

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

// THE HELPERS are the player's own stock (the creator, 2026-10-27): Hints, Undos and Shuffles held by
// the Arcade, carried from board to board, at most 10 of each (stock.ts, over Server's helpers.ts).
// A press with some left acts at once (an Undo never waits on the network), and one is spent only once
// the board says it acted and it was not free; a press with none left opens the run-out panel. Free:
// the guided first board (before the travel kit comes), a lesson's lit button and its board, and the
// creator's practice.
/** Every helper on this board costs nothing. */
function freeHelpers(): boolean {
  return inGuidedStart() || play?.kind === "lesson" || isPractice(play);
}
/** The counts last drawn, so a count that grew (the kit, a gift, a purchase) gives its badge a pop. */
const shown: Partial<Record<HelperKey, number>> = {};
function drawHelpers(): void {
  const free = freeHelpers();
  for (const key of KINDS) {
    const { btn, badge } = helperBtns[key];
    const left = stock.count(key);
    const out = !free && left <= 0;
    // none left: "+" (more to be had), and a tap opens the run-out panel
    badge.textContent = out ? "+" : String(left);
    btn.classList.toggle("free", free);
    btn.classList.toggle("out", out);
    btn.classList.toggle("resting", key === "undo" && !out && !canUndoNow);
    if ((shown[key] ?? left) < left) {
      btn.classList.remove("grew");
      void btn.offsetWidth;
      btn.classList.add("grew");
    }
    shown[key] = left;
    btn.setAttribute(
      "aria-label",
      free ? t(`board.${key}`) : out ? `${t(`board.${key}`)}, ${t("board.helperNone")}` : `${t(`board.${key}`)}, ${t("board.helperLeft", { count: left })}`,
    );
  }
}

/** A helper pressed (or just bought): it acts, or, with none left and nothing free, the run-out panel opens. */
function pressHelper(k: HelperKey): void {
  if (!board || boardWon) return;
  if (!freeHelpers() && lessons.lit() !== k && stock.count(k) <= 0) return void runOut.open(k);
  if (k === "undo") board.undo();
  else if (k === "hint") board.hint();
  else board.shuffle();
}
for (const k of KINDS) helperBtns[k].btn.addEventListener("click", () => pressHelper(k));

// the board acted: one spent, unless it was free (a lesson's, the guide's Hint: `lesson`), or the board
// costs nothing; a spend that got no answer is Server's to send again, and "none" (another device used
// the last) is read again, the act standing
const spendOn = (k: HelperKey) => (e: { lesson?: boolean }) => {
  if (e.lesson || freeHelpers()) return;
  void stock.spend(k);
  drawHelpers();
};
on("helper:undo", spendOn("undo"));
on("helper:hint", spendOn("hint"));
on("helper:shuffle", spendOn("shuffle"));
stock.onChange(() => {
  drawHelpers();
  drawStuck();
  runOut.redraw();
});

on("board:changed", (e) => {
  canUndoNow = e.canUndo;
  drawHelpers();
  // stuck still: the way out may have changed (an Undo spent, the last Shuffle gone)
  drawStuck();
  // the moves so far, where the board reports them: a challenge's top row counts against par
  const moves = (e as { moves?: number }).moves;
  if (typeof moves === "number" && (play?.kind === "challenge" || play?.kind === "daily")) {
    movesSoFar = moves;
    drawPill();
  }
});

// STUCK (the creator, 2026-10-25: "On 9 and 10 I became stuck and didn't realise it for a good while,
// still trying to move pieces around"). The board says so the moment its solver proves there is no way
// to finish from here (board:stuck), and no move can change that, so the notice stays through moves
// until the board is winnable again (board:unstuck: after an Undo past the slip, a Shuffle's rescue
// mix, a Restart). It is calm information (glass) over the board's foot, the board dimmed a little
// behind it, and it names ONE way out, lit and pointed at: Shuffle while one is left (the rescue mix
// built for this), else Undo while one is left and there is a move to take back, else Restart
// (always free). Only ever said when proved: a solver out of budget proves nothing.
let stuck = false;
/** Whether there is a move to take back (board:changed), and whether a Shuffle just found no better mix. */
let canUndoNow = false;
let shuffleRefused = false;
type WayOut = "shuffle" | "undo" | "restart";
/** The player has this helper to use now (their stock, or free here). */
const toHand = (k: HelperKey): boolean => freeHelpers() || stock.count(k) > 0;
/** The way out lit: one the player holds (Shuffle, else Undo with a move to take back), else Restart, always free. */
function wayOut(): WayOut {
  if (toHand("shuffle") && !shuffleRefused) return "shuffle";
  if (toHand("undo") && canUndoNow) return "undo";
  return "restart";
}
/**
 * One of the notice's three ways out, as a chip: its glyph and what it costs here: how many are
 * left, its price where none are (a guest's: none left), or free (Restart, always).
 */
function wayChip(w: WayOut, lit: boolean): HTMLElement {
  const cls = `w${lit ? " lit" : ""}`;
  if (w === "restart") return h("span", { class: cls }, icon("restart"), h("span", {}, t("board.wayFree")));
  const name = t(`board.${w}`);
  const left = stock.count(w);
  const price = stock.price(w);
  if (freeHelpers()) return h("span", { class: cls, "aria-label": `${name}: ${t("board.wayFree")}` }, icon(w), h("span", {}, t("board.wayFree")));
  if (left > 0) return h("span", { class: cls, "aria-label": `${name}: ${t("board.helperLeft", { count: left })}` }, icon(w), h("span", {}, t("board.helperLeft", { count: left })));
  if (price === null) return h("span", { class: cls, "aria-label": `${name}: ${t("board.helperNone")}` }, icon(w), h("span", {}, t("board.wayNone")));
  return h(
    "span",
    { class: cls, "aria-label": `${name}: ${t("board.wayPrice", { price })}` },
    icon(w),
    h("span", {}, String(price)),
    h("span", { class: "coin", "aria-hidden": "true" }),
  );
}
const wayButton = (w: WayOut): HTMLElement => (w === "restart" ? restartBtn : helperBtns[w].btn);
function drawStuck(): void {
  // the Shuffle lesson's board opens stuck on purpose: the lesson says it instead
  if (!stuck || refusing || lessons.lit()) return;
  const way = wayOut();
  stuckNote.replaceChildren(
    h("b", { class: "why" }, t("board.stuckWhy")),
    h("span", { class: "way" }, t(`board.way.${way}`)),
    h("span", { class: "ways" }, ...(["shuffle", "undo", "restart"] as const).map((w) => wayChip(w, w === way))),
  );
  stuckNote.hidden = false;
  host.classList.add("stuck");
  for (const w of ["shuffle", "undo", "restart"] as const) wayButton(w).classList.toggle("beckon", w === way);
  requestAnimationFrame(() => pointAt(wayButton(way)));
}
/** The note's arrow over the lit button, when the button is under it (a phone held upright); none beside it. */
function pointAt(target: HTMLElement): void {
  if (stuckNote.hidden || refusing) return;
  const n = stuckNote.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const under = b.top >= n.bottom - 2;
  stuckNote.classList.toggle("pointing", under);
  if (under) stuckNote.style.setProperty("--arrow-x", `${Math.round(Math.min(n.width - 26, Math.max(26, b.left + b.width / 2 - n.left)))}px`);
}
// a finished destination: its name over the postcard while it is open, gone with it (destination.ts)
on("destination:reveal", (d) => {
  if (screen === "board") destBanner.show(d, host);
});
on("destination:done", () => destBanner.hide());
on("board:stuck", () => {
  stuck = true;
  drawStuck();
});
/** The board can be won again (or it closed): the notice, the dim and the lit button go. */
function unstick(): void {
  stuck = false;
  shuffleRefused = false;
  refusing = false;
  clearTimeout(refusedTimer);
  stuckNote.hidden = true;
  stuckNote.classList.remove("pointing");
  host.classList.remove("stuck");
  for (const w of ["shuffle", "undo", "restart"] as const) wayButton(w).classList.remove("beckon");
}
// A helper that could do nothing spent nothing (Shuffle found no better mix, Hint no line it could prove
// within its budget, which proves nothing about the board): say so for a moment, then back to what was there
let refusedTimer: number | undefined;
let refusing = false;
on("helper:refused", ({ helper }) => {
  if (helper === "shuffle") shuffleRefused = true;
  refusing = true;
  // for the moment it says so, nothing is lit; then the notice comes back with the next way out
  stuckNote.classList.remove("pointing");
  for (const w of ["shuffle", "undo", "restart"] as const) wayButton(w).classList.remove("beckon");
  stuckNote.textContent = t(helper === "hint" ? "board.noHint" : "board.noMix");
  stuckNote.hidden = false;
  clearTimeout(refusedTimer);
  refusedTimer = window.setTimeout(() => {
    refusing = false;
    if (stuck) drawStuck();
    else stuckNote.hidden = true;
  }, 3500);
});
// a lost board stays lost through moves: only the board's word (unstuck), or a new start, clears it
for (const type of ["board:unstuck", "board:restart", "board:start", "board:solved", "board:won"] as const) on(type, unstick);

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
          // a board given up and dealt again is a break; the new deal waits for the Arcade's answer
          restartVeil.inert = true;
          void signalBreak("level_end", "restart").then(() => {
            restartVeil.inert = false;
            hideCard(restartVeil);
            board?.restart();
          });
        }),
      ),
    ),
  );
  showCard(restartVeil);
});

// ---------- the win card ----------

type Win = (
  | { kind: "campaign"; level: number; moves: number; ms: number; milestone: boolean; stamp?: string }
  | { kind: "challenge"; c: Challenge; moves: number; ms: number; first: boolean; better: boolean }
  | { kind: "daily"; d: Daily; moves: number; ms: number; first: boolean }
  | { kind: "experiment"; x: Experiment; moves: number; ms: number }
  | { kind: "lesson"; moves: number; ms: number }
) & {
  /** The win checker's word, once it lands (it may take a while offline). */
  verdict?: Verdict;
  /** Its Coins have flown to the Arcade's wallet (once, ever, per win). */
  cued?: boolean;
  /** The helpers it paid have flown to their buttons (once per win). */
  flown?: boolean;
  /** A practice board's win (the dev menu): nothing was sent, and its card says so. */
  practice?: boolean;
};
let lastWin: Win | null = null;

// The board is won the moment the rules say so (board:solved), before its last picture's finish
// plays: the claim goes then, so a game closed during the finish still has its win sent (Server
// keeps an unsent claim and sends it at the next start), and from then on the board counts as won
// (a quick Back shows its card at once, Restart is closed). The card itself goes up after the
// finish, on board:won.
on("board:solved", ({ moves, ms, line }) => {
  if (!play || boardWon) return;
  boardWon = true;
  // the dev menu's experiment boards: practice always (no checker lane knows them)
  if (play.kind === "experiment") {
    lastWin = { kind: "experiment", x: play.x, moves, ms, practice: true };
    return;
  }
  // the Shuffle lesson's board: nothing to claim, pay or record; its card goes on to board 4
  if (play.kind === "lesson") {
    lastWin = { kind: "lesson", moves, ms };
    return;
  }
  let win: Win;
  // The player's progress is the server's record (src/net/progress.ts): the claim below
  // shows the win in it at once, and the checker's verdict then replaces it with its own
  // word. The card reads the record as it stood before this win.
  if (play.kind === "campaign") {
    // the board the guide taught on ends on the guide's own milestone card
    const milestone = play.level === 1 && guide.takeFinish();
    // the first win of a trip's last board stamps the passport after its card (passport.ts):
    // the record (read before this win's claim) has not passed it yet; a replay never stamps
    const ending = tripEndingAt(play.level);
    const stamp = ending && !isPractice(play) && play.level >= campaignNext() ? ending.id : undefined;
    win = { kind: "campaign", level: play.level, moves, ms, milestone, ...(stamp ? { stamp } : {}) };
  } else if (play.kind === "challenge") {
    // any win clears a challenge board, over par too; the record keeps the fewer moves
    const before = challengeBest(play.c.id);
    win = { kind: "challenge", c: play.c, moves, ms, first: before === undefined, better: !isPractice(play) && before !== undefined && moves < before };
  } else {
    // only the day's first finish counts on the day's board
    win = { kind: "daily", d: play.d, moves, ms, first: !dailyResult(play.d.date) };
  }
  lastWin = win;
  // practice (the dev menu): the card shows as ever, and nothing goes out: no claim, no Coins,
  // no progress, no daily result
  if (isPractice(play)) {
    win.practice = true;
    return;
  }
  // the win checker judges, records and pays (src/net/claims.ts); the card never waits for it
  const lvl = play.kind === "campaign" ? campaignLevel(play.level) : play.kind === "challenge" ? play.c.level : play.d;
  const verdict = claimWin({
    lane: play.kind,
    board: lvl.id,
    deal: lvl.deal,
    line,
    ms,
    ...(play.kind === "campaign" ? { n: play.level } : {}),
    ...(play.kind === "daily" ? { date: play.d.date } : {}),
  });
  if (win.kind === "daily" && win.first) dailyUi.claimed(verdict);
  // the verdict may land before the card is up: it is kept on the win, and the card uses it when it opens
  void verdict.then((v) => {
    win.verdict = v;
    if (lastWin === win && !winVeil.hidden) {
      drawCoins(win);
      const line = winVeil.querySelector(".daily-line");
      if (win.kind === "daily" && line) line.replaceChildren(dailyLine(win));
    }
  });
});

// the board fires this after its own finish: the card goes straight up (unless a quick Back already showed it)
on("board:won", () => {
  if (screen === "board" && boardWon && lastWin && winVeil.hidden) showWin();
});

/** The daily card's plain line: the checker's word on the day wins over the device's (a day closed, or another finish first). */
function dailyLine(w: Extract<Win, { kind: "daily" }>): string {
  const v = w.verdict;
  if (v?.status === "late") return t("daily.late");
  if (v && "first" in v && v.first === false) return t("daily.notCounted");
  return w.first ? t("daily.counted") : t("daily.notCounted");
}

/**
 * What the win paid, on its card, once the checker says so: a coin chip on the
 * card's top edge (the milestone card has a place kept for it, so nothing under
 * the player's finger moves), and the Coins flying to the Arcade's wallet once.
 * Nothing for a win that paid nothing new.
 */
function drawCoins(win: Win): void {
  const v = win.verdict;
  const card = winVeil.querySelector<HTMLElement>(".card");
  // practice: "nothing saved" where the Coins would be
  if (isPractice(win)) {
    if (card && dev && !card.querySelector(".coins-chip")) card.append(dev.chip());
    return;
  }
  if (!v || v.status !== "paid" || !card) return;
  const tools = landedTools(v);
  // the guide's finish card already says its prize and the travel kit: the Coins fly from its coin,
  // each tool that landed is ringed and flies to its button, and nothing on it moves
  const promised = card.querySelector<HTMLElement>(".prize .coin");
  const kit = card.querySelector<HTMLElement>(".kit");
  if (promised || kit) {
    if (promised && v.coins > 0 && !win.cued) win.cued = cueCoins(v, promised) || true;
    for (const k of KINDS) {
      const tool = kit?.querySelector<HTMLElement>(`.tool.${k}`);
      if (!tool || !tools[k]) continue;
      tool.classList.add("landed");
      if (!win.flown) flyTool(k, tool.querySelector(".ico") ?? tool, 0);
    }
    win.flown = true;
    return;
  }
  if (v.coins <= 0 && !KINDS.some((k) => tools[k])) return;
  // any other win card: one chip on its top edge (so nothing on the card moves): the Coins, then each
  // helper that landed (the travel kit, a hard board's gift, a trip's stamp), which flies to its button
  const chip = h("div", { class: "coins-chip glass", role: "status" });
  const coin = h("span", { class: "coin", "aria-hidden": "true" });
  if (v.coins > 0) chip.append(coin, h("span", {}, t("win.coins", { count: v.coins })));
  const glyphs: Array<[HelperKey, Element]> = [];
  for (const k of KINDS) {
    const n = tools[k];
    if (!n) continue;
    const g = icon(k) as Element;
    glyphs.push([k, g]);
    chip.append(h("span", { class: "gift-tool", "aria-label": t(`win.gift.${k}`, { count: n }) }, g, h("span", { "aria-hidden": "true" }, `+${n}`)));
  }
  // the kit on a later board's card (a player past board 1 without it): said in words too
  if ((v as { gifts?: string[] }).gifts?.includes("kit") && glyphs.length) chip.setAttribute("aria-label", t("win.kitLanded"));
  card.querySelector(".coins-chip")?.remove();
  card.append(chip);
  if (v.coins > 0 && !win.cued) win.cued = cueCoins(v, coin) || true;
  if (!win.flown) glyphs.forEach(([k, g], i) => flyTool(k, g, 250 + i * 120));
  win.flown = true;
}

/** The helpers a verdict says LANDED (after the cap's clamp), by kind; nothing where none did. */
function landedTools(v: Verdict): Partial<Record<HelperKey, number>> {
  const got = (v as { helpers?: Partial<Record<string, unknown>> }).helpers;
  const out: Partial<Record<HelperKey, number>> = {};
  for (const k of KINDS) {
    const n = got?.[k];
    if (typeof n === "number" && n > 0) out[k] = Math.floor(n);
  }
  return out;
}

/**
 * A helper that landed flies from where the card shows it to its own button at the foot of the board
 * (under the card's veil): a glance at where it went, never in the way (it takes no touch). Less motion:
 * no flight, the badge alone says so.
 */
function flyTool(k: HelperKey, from: Element, delay: number): void {
  if (document.documentElement.classList.contains("less-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = from.getBoundingClientRect();
  const b = helperBtns[k].btn.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const ghost = h("div", { class: "tool-flight", "aria-hidden": "true" }, icon(k));
  const size = 34;
  ghost.style.left = `${a.left + a.width / 2 - size / 2}px`;
  ghost.style.top = `${a.top + a.height / 2 - size / 2}px`;
  document.body.append(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = ghost.animate(
    [
      { transform: "translate(0, 0) scale(0.6)", opacity: 0 },
      { transform: "translate(0, -14px) scale(1.1)", opacity: 1, offset: 0.2 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.8)`, opacity: 1, offset: 0.92 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0 },
    ],
    { duration: 800, delay, easing: "cubic-bezier(0.45, 0, 0.3, 1)", fill: "both" },
  );
  anim.onfinish = anim.oncancel = () => {
    ghost.remove();
    const { btn } = helperBtns[k];
    btn.classList.remove("grew");
    void btn.offsetWidth;
    btn.classList.add("grew");
  };
}

function showWin(): void {
  if (!lastWin || !board) return;
  // the board Next opens, its pictures fetched while the card is up
  if (lastWin.kind === "campaign") prefetch(campaignLevel(lastWin.level + 1));
  else if (lastWin.kind === "challenge") prefetch(routeUi.after(lastWin.c)?.level);
  syncCardAspect();
  // board 1's finish card says more (the prize, the travel kit): its pictures take less of the height
  const gallery = layoutGallery(board.pictures(), lastWin.kind === "campaign" && lastWin.milestone ? 0.2 : 0.34);
  if (lastWin.kind === "challenge") return void showChallengeWin(lastWin, gallery);
  if (lastWin.kind === "daily") return void showDailyWin(lastWin, gallery);
  if (lastWin.kind === "experiment") return void (import.meta.env.MODE !== "release" && showExperimentWin(lastWin, gallery));
  if (lastWin.kind === "lesson") return void showLessonWin(gallery);
  if (lastWin.milestone) return void showMilestone(gallery);
  const { level, moves, ms } = lastWin;
  const practice = isPractice(lastWin);
  // the campaign's last board (each time round)
  const last = boardNumber(level) === levels();
  // a hard board beaten says so (marks.ts)
  const mark = markOf(campaignLevel(level));
  // a trip's last board, won the first time: the card says so, and goes on to the passport's stamp
  const ended = lastWin.stamp ? tripById(lastWin.stamp) : undefined;
  const after: AfterStamp = last
    ? { label: t("passport.home"), icon: icon("home"), press: "passport.home", go: goHome }
    : { label: t("passport.nextTrip"), icon: icon("next"), trailing: true, press: "passport.nextTrip", go: () => openPlay({ kind: "campaign", level: level + 1 }) };
  // Next goes on, round to board 1 after the last (boardNumber); Home is the card's corner key
  const next = ended
    ? withClick(button("amber next", "win.stamp", icon("passport"), t("win.stamp")), () =>
        leaveTo("win-stamp", () => {
          hideCard(winVeil);
          passportUi.stamp(ended.id, after);
        }),
      )
    : withClick(button("amber next", "win.next", t("win.next"), icon("next")), () =>
        leaveInto("win-next", () => openPlay({ kind: "campaign", level: level + 1, ...(practice ? { practice } : {}) })),
      );
  const toHome = () => leaveTo("win-home", goHome);
  winVeil.replaceChildren(
    h(
      "div",
      { class: "card" },
      cornerKey("home", t("win.home"), "win.home", toHome),
      h("h2", {}, t("win.title")),
      mark ? h("p", { class: `mark-beaten ${mark}` }, t(mark === "hard" ? "win.beatHard" : "win.beatSuper")) : null,
      gallery,
      h(
        "div",
        { class: "stats" },
        h("div", { class: "stat glass" }, h("b", {}, String(moves)), h("span", {}, t("win.moves"))),
        h("div", { class: "stat glass" }, h("b", {}, clock(ms)), h("span", {}, t("win.time"))),
      ),
      ended ? h("p", { class: "trip-done" }, t("win.tripDone", { trip: tripName(ended) })) : null,
      last ? h("p", {}, t("win.allDone")) : null,
      next,
    ),
  );
  showCard(winVeil, toHome);
  drawCoins(lastWin);
}

/**
 * The guide's prize, said up front (the game standard: the card says what the prize is;
 * what lands is the Arcade's to show): its Coins, and the table, with where to choose it.
 * Both come from Server's list (src/net/tables.json), never written here.
 */
function guidePrize(): HTMLElement | null {
  if (!KEEPSAKE) return null;
  const a = knownTable(KEEPSAKE.slug);
  const coins = KEEPSAKE.coins ?? 0;
  const parts: Node[] = [];
  if (coins > 0) parts.push(h("span", { class: "won-coins" }, h("span", { class: "coin", "aria-hidden": "true" }), h("span", {}, t("guide.prize", { count: coins }))));
  if (a) parts.push(h("span", { class: "won-table" }, h("img", { src: thumbOf(a), alt: "", draggable: "false" }), h("span", {}, tableTitle(a))));
  if (!parts.length) return null;
  if (a) parts.push(h("span", { class: "prize-note" }, t("guide.tableNote")));
  return h("div", { class: "prize" }, ...parts);
}

/**
 * The guide's finish: a milestone card of its own in place of the win card, with a
 * burst over it (the game standard: a card, fireworks, a picture of the prize). The
 * prize is the server's to pay (the c01 win's verdict); its place on the card waits
 * for it.
 */
function showMilestone(gallery: HTMLElement): void {
  const prize = guidePrize();
  // the travel kit, said up front (the checker grants it with this win: one copy of its size, Server's
  // helpers.ts); each tool is ringed as it lands, and flies to its button
  const kit = h(
    "div",
    { class: "kit" },
    h("span", { class: "kit-head" }, t("guide.kit")),
    h(
      "div",
      { class: "kit-row" },
      ...KINDS.map((k) => h("span", { class: `tool ${k} glass`, "aria-label": t(`win.gift.${k}`, { count: KIT[k] }) }, icon(k), h("span", { "aria-hidden": "true" }, `×${KIT[k]}`))),
    ),
  );
  const card = h(
    "div",
    { class: "card milestone" },
    h("h2", {}, t("guide.doneTitle")),
    h("p", {}, t("guide.doneWhy")),
    gallery,
    prize,
    kit,
    withClick(button("amber next", "win.next", t("win.next"), icon("next")), () =>
      openPlay({ kind: "campaign", level: 2, ...(isPractice(lastWin) ? { practice: true } : {}) }),
    ),
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
  const line = isPractice(w) && dev ? dev.dailyLine : dailyLine(w);
  // practice: Next is the day after (the dev menu's), in place of the day's results
  const p = play;
  const after = isPractice(w)
    ? p && dev?.hasNext(p)
      ? withClick(button("amber next", "win.next", t("win.next"), icon("next")), () => leaveTo("daily-next", () => dev?.next(p)))
      : null
    : withClick(button("amber next", "win.results", t("win.results")), () =>
        leaveTo("daily-results", () => {
          hideCard(winVeil);
          board?.destroy();
          host.replaceChildren();
          board = null;
          boardWon = false;
          void dailyUi.openResults();
        }),
      );
  const toHome = () => leaveTo("daily-home", goHome);
  winVeil.replaceChildren(
    h(
      "div",
      { class: "card" },
      cornerKey("home", t("win.home"), "win.home", toHome),
      h("h2", {}, t("win.title")),
      gallery,
      h(
        "div",
        { class: "stats" },
        h("div", { class: "stat glass" }, h("b", {}, String(w.moves)), h("span", {}, t("win.moves"))),
        h("div", { class: "stat glass" }, h("b", {}, clock(w.ms)), h("span", {}, t("win.time"))),
      ),
      h("p", { class: "daily-line" }, line),
      after,
    ),
  );
  showCard(winVeil, toHome);
  drawCoins(w);
}

/** The Shuffle lesson's card: done, then on to board 4 (no claim, no Coins, no break: it is still the lesson). */
function showLessonWin(gallery: HTMLElement): void {
  const toHome = () => goHome();
  winVeil.replaceChildren(
    h(
      "div",
      { class: "card lesson-done" },
      cornerKey("home", t("win.home"), "win.home", toHome),
      h("h2", {}, t("lesson.doneTitle")),
      gallery,
      h("p", {}, t("lesson.doneWhy")),
      withClick(button("amber next", "win.next", t("win.next"), icon("next")), () => openPlay({ kind: "campaign", level: 4 })),
    ),
  );
  showCard(winVeil, toHome);
}

/** An experiment board's card (the dev menu's, practice): the campaign's card, with the next experiment for Next. */
function showExperimentWin(w: Extract<Win, { kind: "experiment" }>, gallery: HTMLElement): void {
  const p = play;
  const after = p && dev?.hasNext(p);
  const toHome = () => leaveTo("experiment-home", goHome);
  winVeil.replaceChildren(
    h(
      "div",
      { class: "card" },
      cornerKey("home", t("win.home"), "win.home", toHome),
      h("h2", {}, t("win.title")),
      gallery,
      h(
        "div",
        { class: "stats" },
        h("div", { class: "stat glass" }, h("b", {}, String(w.moves)), h("span", {}, t("win.moves"))),
        h("div", { class: "stat glass" }, h("b", {}, clock(w.ms)), h("span", {}, t("win.time"))),
      ),
      after ? withClick(button("amber next", "win.next", t("win.next"), icon("next")), () => leaveTo("experiment-next", () => p && dev?.next(p))) : null,
    ),
  );
  showCard(winVeil, toHome);
  drawCoins(w);
}

/** A challenge board's card: the pictures, then "Par N · You M". No fail: over par, it is still cleared. */
function showChallengeWin(w: Extract<Win, { kind: "challenge" }>, gallery: HTMLElement): void {
  const { c, moves, better } = w;
  const practice = isPractice(w);
  const after = routeUi.after(c);
  // a word only for a good result; going over par says nothing against the player
  const praise = better ? t("win.newBest") : moves < c.par ? t("win.underPar") : moves === c.par ? t("win.onPar") : "";
  // back to the route is the card's corner key; Next, while there is a next board, its big button
  const back = () => leaveTo("challenge-route", toRoute);
  const next = after
    ? withClick(button("amber next", "win.next", t("win.next"), icon("next")), () =>
        leaveInto("challenge-next", () => openPlay({ kind: "challenge", c: after, ...(practice ? { practice } : {}) })),
      )
    : null;
  winVeil.replaceChildren(
    h(
      "div",
      { class: "card" },
      cornerKey("back", t("win.route"), "win.route", back),
      h("h2", {}, t("win.title")),
      gallery,
      h(
        "div",
        { class: "stats" },
        h("div", { class: "stat glass" }, h("b", {}, String(c.par)), h("span", {}, t("win.par"))),
        h("div", { class: "stat glass" }, h("b", {}, String(moves)), h("span", {}, t("win.you"))),
      ),
      praise ? h("p", { class: "praise" }, praise) : null,
      next,
    ),
  );
  showCard(winVeil, back);
  drawCoins(w);
}

/**
 * The board's pictures whole, in one to three rows, each card of a picture in the board's card
 * shape (cards.ts: --u its height, --u x aspect its width), as big as fits the win card's width
 * and a share of the screen's height (a card never taller than 54px).
 *
 * Each picture is a button to see it big (the creator, 2026-10-24: players see the pictures
 * here). A picture is never under TAP px on its narrow side (its hit area adds 4px all round, so
 * 44px to the touch): when the rows would make one smaller, the pictures go in one row that
 * scrolls sideways instead, bigger rather than smaller.
 *
 * Each is drawn from the smallest copy sharp at that size (catalogue.ts, sharpCopy), and the
 * board's own copy, already loaded, wins whenever it is sharp here: no download, so the pictures
 * show at once, even with the connection gone. A copy that fails to load falls back to the board's.
 */
const GAP = 10;
const TAP = 36;
const STRIP_U = 60;
function layoutGallery(pics: BoardPicture[], share = 0.34): HTMLElement {
  // the gallery has the card's width and a third of the height (a phone held sideways is asked to
  // turn upright, style.css: the game is laid out upright only)
  const width = Math.min(360, app.clientWidth - 32) - 44 - 4;
  const height = Math.max(110, Math.min(300, app.clientHeight * share));
  const aspect = cardAspect();
  let best: { u: number; rows: BoardPicture[][] } = { u: 0, rows: [pics] };
  for (let n = 1; n <= Math.min(3, pics.length); n++) {
    // fill n rows, each picture into the row with the fewest columns so far (biggest first)
    const rows: BoardPicture[][] = Array.from({ length: n }, () => []);
    const cols = (row: BoardPicture[]) => row.reduce((sum, p) => sum + p.cols, 0);
    for (const p of [...pics].sort((a, b) => b.cols - a.cols)) rows.reduce((a, b) => (cols(b) < cols(a) ? b : a)).push(p);
    const byWidth = Math.min(...rows.map((r) => (width - GAP * (r.length - 1)) / Math.max(1, cols(r) * aspect)));
    const tall = rows.reduce((sum, r) => sum + Math.max(0, ...r.map((p) => p.rows)), 0);
    const u = Math.min(54, byWidth, (height - GAP * (n - 1)) / Math.max(1, tall));
    if (u > best.u + 0.5) best = { u, rows };
  }
  // the card height that keeps every picture's narrow side tappable
  const uTap = Math.max(0, ...pics.map((p) => TAP / Math.min(p.cols * aspect, p.rows)));
  const strip = best.u < uTap;
  const tall = Math.max(1, ...pics.map((p) => p.rows));
  const u = strip ? Math.max(uTap, Math.min(STRIP_U, height / tall)) : best.u;
  const gallery = h("div", { class: `gallery${strip ? " strip" : ""}`, style: `--u:${Math.floor(u)}px;--gap:${GAP}px` });
  const drawn = { u: Math.floor(u), aspect };
  let i = 0;
  for (const row of strip ? [pics] : best.rows) {
    if (!row.length) continue;
    const line = h("div", { class: "line" });
    for (const p of row) line.append(galleryPicture(p, i++, drawn));
    gallery.append(line);
    if (strip) keepEdges(line);
  }
  return gallery;
}

/** One picture of the win card: a button that looks like the picture, opening it big. */
function galleryPicture(p: BoardPicture, i: number, drawn: { u: number; aspect: number }): HTMLElement {
  const style = `--c:${p.cols};--r:${p.rows};--i:${i}`;
  const known = cataloguePicture(p.id);
  // a stand-in the catalogue does not know (a board in the making) is only shown
  if (!known) return h("figure", { class: "pic", style }, h("img", { src: p.src, alt: "", draggable: "false" }));
  const sharp = sharpCopy(known, drawn.u * p.cols * drawn.aspect, drawn.u * p.rows);
  const held = known.copies.find((c) => c.file !== known.file && copyUrl(c) === p.src);
  const src = held && held.w >= sharp.copy.w ? p.src : sharp.url;
  const img = h("img", { src, alt: "", draggable: "false" });
  if (src !== p.src) img.addEventListener("error", () => (img.src = p.src), { once: true });
  const b = h("button", { type: "button", class: "pic", style, "data-press": "win.picture", "aria-label": pictureTitle(known) }, img);
  // seen big from the copy already on screen, the full picture swapped in once it lands (viewer.ts)
  b.addEventListener("click", () => winViewer.open(known, img.currentSrc || img.src, play ? levelOfPlay(play).id : undefined));
  return b;
}

/** A sideways strip fades at an edge only while there is more to see that way; a mouse wheel scrolls it. */
function keepEdges(line: HTMLElement): void {
  const edges = () => {
    line.classList.toggle("more-left", line.scrollLeft > 2);
    line.classList.toggle("more-right", line.scrollLeft + line.clientWidth < line.scrollWidth - 2);
  };
  line.addEventListener("scroll", edges, { passive: true });
  new ResizeObserver(edges).observe(line);
  line.addEventListener(
    "wheel",
    (e) => {
      if (line.scrollWidth <= line.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      line.scrollLeft += e.deltaY;
    },
    { passive: false },
  );
}


// ---------- cards ----------

function withClick(b: HTMLButtonElement, fn: () => void): HTMLButtonElement {
  b.addEventListener("click", fn);
  return b;
}
/** Show a card; `escape` is its corner key's way out, for Escape (dialogs.ts). */
function showCard(veil: HTMLElement, escape?: () => void): void {
  veil.hidden = false;
  // to a keyboard (dialogs.ts): Escape on the restart card keeps playing; on a win card, its corner key
  opened(veil, veil === restartVeil ? () => hideCard(restartVeil) : escape);
  screenChanged();
  drawOffline();
}
function hideCard(veil: HTMLElement): void {
  if (veil === winVeil) winViewer.close();
  veil.hidden = true;
  closed(veil);
}

/** The "No connection" card: over everything but the board in hand, until the connection is back. */
function drawOffline(): void {
  // the board in hand plays on, and once it is won its card stays readable: the card covers
  // only what the player asks for next (Next, Back, Home), and opens nothing new
  const inHand = screen === "board" && waiting === null;
  const hide = online() || inHand;
  if (hide === offlineVeil.hidden) return;
  offlineVeil.hidden = hide;
  // no way out but the connection: Escape does nothing under it
  if (hide) closed(offlineVeil);
  else opened(offlineVeil);
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

/** The longest the first screen waits for home's pictures (the lead, 2026-10-26: "about 1.5 s"). */
const HOME_WAIT_MS = 1500;

/** Draw the first screen. Called once by the boot entry (src/main.ts). */
export async function startApp(): Promise<void> {
  // HOME APPEARS WHOLE (the creator, 2026-10-26, as Untangled does): the round type, home's own
  // pictures (the title, the desk, the booklet) and the route's postcards are waited for, at most
  // HOME_WAIT_MS from here, then home shows anyway and a late picture fades in where it belongs
  const by = performance.now() + HOME_WAIT_MS;
  const face = new FontFace("Fredoka", `url(${import.meta.env.BASE_URL}fonts/fredoka-latin.woff2)`, { weight: "300 700", display: "swap" });
  document.fonts.add(face);
  const fonts = face.load().catch(() => undefined);
  void homeUi.warmArt();
  // and the player's progress, the server's record: a second at most (the game standard), then
  // home draws, and redraws when the record lands
  loadProgress();
  loadGuideSave();
  await waitForProgress(1000);
  drawHome();
  await Promise.race([Promise.all([fonts, homeUi.whole()]), new Promise((r) => setTimeout(r, Math.max(0, by - performance.now())))]);

  onProgress(drawHome);
  // the Shuffle lesson's board, ready for the way to board 4 (lessons.ts)
  void lessonLevel("shuffle").then(
    (l) => (shuffleBoard = l),
    () => undefined,
  );
  onProgress(albumsUi.redraw);
  onProgress(passportUi.redraw);
  onProgress(routeUi.redraw);
  onProgress(dailyUi.redraw);
  drawHome();
  document.body.append(app, upright);
  mountSettings(app);
  document.getElementById("boot")?.remove();
  show("home");
  // no tap brought this screen in: Play answers from the first moment it is drawn
  firstScreen();
  void startSound();
  // which day it is (the platform's word) and its board: Home's Daily button appears once they are known
  void dailyUi.refresh();
  // the player's chosen table, once their choice and what they own are read, and its weather
  mountParticles(app);
  void startTables();
  // every glyph kept in the page, so a connection dropped later never leaves a button bare
  void keepIcons();
  // the top row's words and the stuck line wrap (or shrink, never under 12 px) rather than lose their ends
  for (const el of app.querySelectorAll<HTMLElement>(".top-pill")) keepFitted(el);
  keepFitted(stuckNote);

  // The creator's dev menu: never in a release build (`npm run build:release` drops this branch
  // and the chunk; tools/no-dev-menu.mjs checks), and at run time only on the dev channel, or
  // unframed (the play-test tool: no player, nothing to protect).
  if (import.meta.env.MODE !== "release") {
    void (async () => {
      // the Arcade and the Editor frame the game from another origin; the play-test tool frames
      // it from its own page, same origin, with no platform behind it
      let testFrame = false;
      try {
        testFrame = window.parent.location.origin === location.origin;
      } catch {
        /* another origin: a platform frame */
      }
      if (window.self !== window.top && !testFrame) {
        const id = await gem.awaitIdentity(20_000).catch(() => null);
        if (id?.channel !== "dev") return;
      }
      const { mountDevMenu } = await import("./dev-menu");
      dev = mountDevMenu({
        app,
        open(p) {
          // always a fresh board from the menu: the one in hand is dropped
          board?.destroy();
          host.replaceChildren();
          board = null;
          boardWon = false;
          openPlay({ ...p, practice: true });
        },
        now: () => ({ screen, play, board, won: boardWon }),
        practise() {
          if (!play || play.practice) return;
          play.practice = true;
          drawPill();
        },
        cancelGuide: () => guide.cancel(),
        showAll: (on) => albumsUi.showAll(on),
      });
    })().catch((err: unknown) => console.warn("[dev-menu] did not load", err));
  }

  if (import.meta.env.DEV) {
    (window as unknown as { __ps: unknown }).__ps = {
      offline: pretend,
      openLevel,
      progress,
      restored: albumsUi.pretend,
      /** Show campaign boards as marked hard ("c07": "hard", "c20": "super"), for this page only. */
      marks(m: Record<string, Mark | null>) {
        pretendMarks(m);
        if (screen === "home") drawHome();
        if (screen === "board") drawPill();
      },
      /** The destination banner as if a postcard had opened (null: as if it had gone), for checking it by hand. */
      destination(d: Destination | null) {
        if (d) destBanner.show(d, host);
        else destBanner.hide();
      },
      /** The passport, open at trip `id` ("t1"), or at the trip the player is on. */
      passport: (id?: string) => passportUi.open(id ? tripById(id) : undefined),
      /** The stamp moment for trip `id`, as after its last board's win card (nothing is won or sent). */
      stamp(id: string) {
        passportUi.stamp(id, { label: t("passport.nextTrip"), icon: icon("next"), trailing: true, press: "passport.nextTrip", go: goHome });
      },
      /** Show a challenge board as cleared in `moves`, for this page only (a win held, never sent). */
      cleared(id: string, moves: number) {
        hold(`dev-${id}`, { lane: "challenge", board: id, moves, ms: 0, pictures: [] });
      },
      guide,
      /** Home's note as if a win from last time had paid `coins` (nothing is paid: the checker alone pays). */
      lastWin(coins: number) {
        lastWins.push({ status: "paid", lane: "campaign", board: "dev", moves: 0, coins, resumed: true });
        if (screen === "home") drawHomeNote();
      },
      /** The card up now shows what a paid verdict of `coins` looks like (no Coins move: the checker alone pays); `items` as granted. */
      paid(coins: number, items?: string[], helpers?: Partial<Record<HelperKey, number>>, gifts?: string[]) {
        if (!lastWin) return;
        // the card as a real player's would be (a "Win now" win is practice, which shows nothing paid)
        lastWin.practice = false;
        winVeil.querySelector(".coins-chip")?.remove();
        lastWin.verdict = { status: "paid", lane: "campaign", board: "dev", moves: lastWin.moves, coins, ...(items ? { items } : {}), ...(helpers ? { helpers, gifts } : {}) } as Verdict;
        drawCoins(lastWin);
      },
      /** The helper stock as if the platform said so (null: its own word again), for this page only. */
      stock: (p: Parameters<typeof stock.pretend>[0]) => stock.pretend(p),
      /** Board 1's finish card over the board in hand, as after its guided win (nothing is sent). */
      milestone() {
        if (!board || !play) return;
        boardWon = true;
        lastWin = { kind: "campaign", level: 1, moves: 12, ms: 64_000, milestone: true };
        showWin();
      },
      /** The first-5x5 banner over the board in hand, as on a player's first 5x5 board (nothing is saved). */
      bigger: () => showBanners([{ cls: "big", text: t("board.bigger") }]),
      /** A pretend board:stuck, to see the notice (the board's own word clears it). */
      stuck: () => emit("board:stuck", { doomed: true } as never),
    };
    // ?restored=id,id shows those pictures as restored in the albums (never saved)
    const fake = new URLSearchParams(location.search).get("restored");
    if (fake) albumsUi.pretend(fake.split(",").filter(Boolean));
  }
}
