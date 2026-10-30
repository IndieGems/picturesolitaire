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
// A ONE-OFF (friend challenges, the creator 2026-10-28; docs/friend-challenges.md): a friend's
// board, opened by their challenge or a shared link (friend-cards.ts's challenge card), any campaign
// board or dated daily, a sneak peek when the player has not reached it. It SHIPS (practice does
// not), and sits outside progress: no claim, no save, no suitcase item, no Coins, no board numbers
// (tries.ts counts campaign boards only); helpers spend from the stock as on any board, and its
// break is signalled as for any board. Its card compares the two counts (friend_action says how it
// went). After any trip board from 3 or a daily (not practice, not a one-off), the win card offers
// Challenge a friend and Share (friend-cards.ts, socialRow).
//
// A SOUVENIR (the creator, 2026-10-28; docs/souvenirs.md): a stamped trip's optional bonus board
// (souvenirs.ts), opened from the stamp moment, home's tile or the trip's passport page. It wears a
// table of its own while it is up (tables.ts, wearTable), its top row says "Souvenir" over its theme,
// and it claims like any board (lane "souvenir": its Coins paid once). Its first win ends on "Add the
// sticker", the sticker moment on its trip's passport page (passport.ts); a replay goes on to Next stop.
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
import { closeSettings, mountSettings } from "../settings-screen";
import { homeWhole, startSound } from "../sound";
import { arcadeLocale, liveAttr, liveText, locale, onLocaleChange, setLocale, t, warmTitles } from "./i18n";
import { ICONS, keepIcons, type IconName } from "./icons";
import { firstScreen, screenChanged } from "./browser";
import { online, onOnline, pretend, suspect } from "./online";
import { learnt, lessonSeen, loadGuideSave } from "./guide-save";
import { campaignNext, challengeBest, dailyResult, eventBest, guideDone, hold, loadProgress, onProgress, progress, souvenirBest, waitForProgress } from "../net/progress";
import { createAlbums } from "./albums";
import { createChallenges } from "./challenges";
import { createGuide, type GuideMode } from "./guide";
import { fireworks } from "./fireworks";
import type { Challenge } from "./challenge-data";
import { lessonLevel, level as campaignLevel, loadDaily, loadEventLevel, loadLevel, loadTrip, type Daily, type EventLevel, type Level, type Souvenir } from "../game/levels";
import { createSouvenirTile, loadSouvenirList, onSouvenirs, souvenirOf, souvenirWords, stickerReady } from "./souvenirs";
import { createDaily } from "./daily";
import { clock, longDate, shortDate } from "./format";
import { claimWin, cueCoins, onVerdict, type Verdict } from "../net/claims";
import { KEEPSAKE } from "../net/keepsake";
import { knownTable, startTables, tableChoiceRead, tableTitle, thumbOf, tryTable, warmThumbs, wearTable, type TryTable } from "./tables";
import { keepFitted } from "./fit";
import { cardAspect, syncCardAspect } from "./cards";
import { createViewer } from "./viewer";
import { closed, cornerKey, opened } from "./dialogs";
import { markAt, markOf, markTag, markWords, pretendMarks, type Mark } from "./marks";
import { allDone, awaitingRecord, createHome, nextBoard, warmTripStamp } from "./home";
import { KINDS, KIT, stock, type HelperKind } from "./stock";
import { createHelperRest } from "./helper-cooldown";
import { createRunOut } from "./helper-shop";
import { createHomeShop } from "./home-shop";
import { createCosmetics } from "./cosmetics";
import { createUnlocks } from "./unlock";
import { watchTopRow } from "./top-row";
import { pretendAchievements } from "./achievements-page";
import { onUnlock } from "../net/achievements";
import { pretendCosmetics, pretendState } from "./cosmetics-shop";
import { coinIcon, priceTag } from "./coin";
import { createTries, mercyFor } from "./tries";
import { CARRY_WAIT_MS, carryOnCard, carryOnFrom, keptPlayOf, readCarryOn, type CarryOn } from "./resume";
import { keepInHand, type InHand } from "../game/in-hand";
import { createMercyNote } from "./mercy-note";
import { recentStats } from "./board-stats";
import { createSuitcase, eventTitle, packedOnCard, progressLine } from "./suitcase";
import { eventShown } from "./event-switch";
import { playItemFound } from "./item-found";
import { eventNamed, suitcases, type SuitItem } from "./suitcase-data";
import { createLessons, type LessonName } from "./lessons";
import { createHintNudge } from "./hint-nudge";
import { createDestinationBanner, type Destination } from "./destination";
import { createPassport, type AfterStamp } from "./passport";
import { currentTrip, loadTripOf, tripById, tripDone, tripEndingAt, tripOf, tripPlace, trips } from "./trips";
import { challengeCard, comparePanel, createFriendCards, outcomeOf, type ChallengeView } from "./friend-cards";
import { friendAction, launchLink, markAnswered, recentFriendActions, watchFriends, type Dare, type Launch } from "../net/friends";
import { currentDaily, today as dailyToday } from "../net/daily";
import { pretendVip } from "../net/vip";
import { createVipDoor } from "./vip-door";
import { createArchive } from "./daily-archive";
import { forceVipSale } from "./vip-view";
import { copyUrl, picture as cataloguePicture, pictureTitle, sharpCopy, suitcaseItem } from "./catalogue";
import { ensure, ensureSuitcase, fileUrl, resident, warmIndex } from "../packs";
import { mountParticles, setWeather } from "./particles";
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
const dailyUi = createDaily({
  home: () => goHome(),
  show: () => show("daily"),
  play: (d) => openPlay({ kind: "daily", d }),
  // the page's past days (docs/vip.md): a VIP's calendar and days, or anyone else's locked door
  calendar: () => archiveUi.open(),
  playDate: (date) => void playPastDay(date, { archive: true }),
  door: () => vipDoorUi.open({ kind: "archive", today: currentDaily().date }),
});
// the events (suitcase.ts, docs/vip.md): VIP packs of 30 levels with 10 items hidden among them; home's strip,
// each event's page and the other events; for VIPs only (event-switch.ts), a locked door for anyone else
const suitcaseUi = createSuitcase({
  home: () => goHome(),
  show: () => show("suitcase"),
  playLevel: (_event, level) => void playEventLevel(level),
  door: (d) => vipDoorUi.open(d),
});
// a locked VIP door's screen (vip-door.ts): what the daily archive or the event holds, "VIP is coming soon"
const vipDoorUi = createVipDoor({ home: () => goHome(), show: () => show("vip") });
// the daily archive (daily-archive.ts): a VIP's calendar of this month's and the two before's dailies
const archiveUi = createArchive({
  home: () => goHome(),
  show: () => show("archive"),
  play: (date) => void playPastDay(date, { archive: true }),
  results: () => void dailyUi.openResults(),
});
/**
 * A past day's daily, from the Daily page or the archive's calendar (docs/vip.md): its board, its win card's
 * way back to the Daily page. Today's from the calendar plays as today's always does. A week that would not
 * load (offline) opens nothing, and the next tap asks again.
 */
async function playPastDay(date: string, from: DailyFrom): Promise<void> {
  const d = await loadDaily(date).catch(() => null);
  if (!d) return;
  openPlay(date === currentDaily().date && "archive" in from ? { kind: "daily", d } : { kind: "daily", d, from });
}
/**
 * An event's level (its page's grid or its Play level button): Gameplay's loader brings the event boards in
 * on the first ask; a file that would not load (offline) opens nothing, and the next tap asks again.
 */
async function playEventLevel(id: string): Promise<void> {
  const e = await loadEventLevel(id).catch(() => null);
  // the dev menu's stand-in events (outside a release build): their real boards, in practice, nothing sent
  if (e) openPlay(suitcases.pretending() ? { kind: "event", e, practice: true } : { kind: "event", e });
}
// home (home.ts): the trip as an itinerary and its route, Next stop, and Daily, the passport, the month's event
// and the Shop. The challenge route is no longer on home (the creator, 2026-10-27: "Remove Challenges from the
// home screen"): its screen and code stay (routeUi), reached from nowhere for now
// a stamped trip's Souvenir still to play (souvenirs.ts): its tile in home's itinerary
const souvenirTile = createSouvenirTile((trip) => playSouvenir(trip));
const homeUi = createHome(
  {
    play: () => void playNext(),
    passport: () => passportUi.open(),
    shop: () => homeShop.open(),
    cosmetics: () => cosmeticsUi.open(),
  },
  // the Shop once the first board is done (its travel kit is how a player first meets the helpers)
  { note: homeNote, event: suitcaseUi.tile, daily: dailyUi.homeButton, souvenir: souvenirTile.tile, shopShown: () => guideDone() },
);
const home = homeUi.screen;

// the board: the level (on a challenge: its number, par and the moves so far), Back, the board, the helpers
const levelPill = h("div", { class: "top-pill glass" });
const pillName = h("span", { class: "name" });
const pillPar = h("span", { class: "par" });
const back = button("round top-back", "board.back", icon("back"));
liveAttr(back, "aria-label", "board.back");
const host = h("div", { class: "board-host" });
const restartBtn = button("restart", "board.restart", icon("restart"), liveText(h("span"), "board.restart"));

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
// a friend's challenge or a shared link, as the game opens on it (friend-cards.ts, challengeCard)
const dareVeil = h("div", { class: "veil dare", hidden: "", role: "dialog", "aria-modal": "true" });
// the level kept from the last session, offered over home (resume.ts, offerCarryOn)
const resumeVeil = h("div", { class: "veil resume", hidden: "", role: "dialog", "aria-modal": "true" });
/** The level kept last time, still as dealt, until it is carried on or another level opens. */
let carryOn: CarryOn | null = null;
/** The slot's read, resolved; home never waits on it, a press into a level CARRY_WAIT_MS at most. */
let carryRead: Promise<void> = Promise.resolve();
let carryLanded = false;
/** The free Hints the level carried on came back with (tries.ts reads it on its board:start). */
let resumedFree = 0;
const offlineVeil = h(
  "div",
  { class: "veil offline", hidden: "", role: "alertdialog", "aria-live": "assertive" },
  h(
    "div",
    { class: "card" },
    liveText(h("h2"), "offline.title"),
    liveText(h("p"), "offline.why"),
    h("div", { class: "waiting" }, h("i", { "aria-hidden": "true" }), liveText(h("span"), "offline.reconnecting")),
  ),
);

// a phone held sideways: the Arcade draws its own "turn upright" panel over the game (the store page
// declares it portrait-only), so the game draws none (the creator, 2026-10-29, GSR-011)

// the albums (albums.ts): no longer on home (the passport took their place); kept, unreached, until they are tidied away
const albumsUi = createAlbums({ home: () => goHome(), show: (which) => show(which) });
// the passport (passport.ts): a page per trip, and the stamp moment
const passportUi = createPassport({ home: () => goHome(), show: () => show("passport"), souvenir: (trip) => playSouvenir(trip) });
// the challenge route (challenges.ts)
const routeUi = createChallenges({ home: () => goHome(), show: () => show("challenges"), play: (c) => openPlay({ kind: "challenge", c }) });

// RUN-OUT (helper-shop.ts): a helper with none left, tapped; bought, it is used at once
const runOut = createRunOut(stock, (k) => pressHelper(k));
// home's shop (home-shop.ts): the helpers, one or a pack of 3, bought ahead
const homeShop = createHomeShop(stock);
// the Cosmetics screen (cosmetics.ts): tables and soundtracks, tried, bought and chosen
const cosmeticsUi = createCosmetics({ home: () => goHome(), show: () => show("cosmetics") });
// the unlock card (unlock.ts): an achievement the checker says unlocked, in the win card's place, once
// the screen can take it (unlockReady); the cards under it wait out of sight (style.css, #app.unlocking)
const unlockUi = createUnlocks({ ready: () => unlockReady(), changed: (up) => app.classList.toggle("unlocking", up) });

app.append(home, boardScreen, albumsUi.listScreen, albumsUi.albumScreen, passportUi.screen, routeUi.screen, dailyUi.screen, suitcaseUi.screen, vipDoorUi.screen, archiveUi.screen, albumsUi.viewer, passportUi.viewer, winVeil, winViewer.element, restartVeil, dareVeil, resumeVeil, runOut.element, homeShop.element, cosmeticsUi.screen, unlockUi.veil, offlineVeil);
// the win card's Challenge a friend and Share, and the friends sheet over it (friend-cards.ts)
const friendCards = createFriendCards(app);

// ---------- state ----------

type Screen = "home" | "board" | "albums" | "album" | "passport" | "challenges" | "daily" | "suitcase" | "cosmetics" | "vip" | "archive";
/** Where a past day's daily was opened from: the Daily page's days or the archive's calendar. */
type DailyFrom = { archive: true };
/**
 * A board to play: one of the campaign's, one on the challenge route, the day's, or one of the
 * dev menu's experiment boards (practice always).
 * `practice`: the dev menu's (nothing sent or saved); `guide`: board 1 with its guide replayed.
 */
export type Play = (
  | { kind: "campaign"; level: number }
  | { kind: "challenge"; c: Challenge }
  | { kind: "daily"; d: Daily; from?: DailyFrom }
  | { kind: "experiment"; x: Experiment }
  | { kind: "lesson"; x: Level }
  | { kind: "oneoff"; o: OneOff }
  | { kind: "souvenir"; s: Souvenir }
  | { kind: "event"; e: EventLevel }
) & {
  practice?: boolean;
  guide?: boolean;
};
/**
 * A friend's board, played as a one-off (friend challenges): the dare (its board or date, the
 * moves to beat), the board to open (a campaign board's number, or the daily), who sent it, and
 * the challenge's id while it can be marked answered.
 */
export type OneOff = {
  dare: Dare;
  open: number | Daily;
  level: Level;
  from: string | null;
  fromId: string | null;
  id: string | null;
  answered: boolean;
  /** A board the player has not reached yet: a sneak peek. */
  peek: boolean;
  /** A campaign board's trip, as the player reads it ("France"). */
  trip: string | null;
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
  if (a.kind === "oneoff") return a.o === (b as typeof a).o;
  if (a.kind === "souvenir") return a.s.id === (b as typeof a).s.id;
  if (a.kind === "event") return a.e.id === (b as typeof a).e.id;
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
/** Helpers used on this try at the board in hand, free ones too (a dare says how many: friend challenges). */
let helpersUsed = 0;
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
// on a hard board, a pause with no move makes Hint glow, the first time with a line on what it sees (hint-nudge.ts)
const hintNudge = createHintNudge({
  hint: helperBtns.hint.btn,
  layer: boardScreen,
  allowed: () =>
    screen === "board" &&
    !boardWon &&
    !stuck &&
    play?.kind === "campaign" &&
    !isPractice(play) &&
    markAt(play.level) !== null &&
    !guide.active() &&
    !lessons.active() &&
    winVeil.hidden &&
    restartVeil.hidden &&
    offlineVeil.hidden &&
    !runOut.isOpen(),
});
/** The board's lesson call (the gameplay member's): the next use of that helper is free. */
type LessonBoard = BoardHandle & { lesson?: (k: LessonName | null) => void };
/** The Shuffle lesson's staged board (the level designer's, loaded by the gameplay member), once loaded. */
let shuffleBoard: Level | null = null;

const levels = () => levelCount();
/** A campaign position as the board's own number (the campaign goes round past the last board). */
const boardNumber = (n: number) => ((n - 1) % levels()) + 1;

// a campaign board's tries (tries.ts): the boards' player numbers, and mercy help's free Hints after
// repeated stuck tries, said on the board (mercy-note.ts) and paid by the board (grantFree)
const mercyNote = createMercyNote({ hint: helperBtns.hint.btn, layer: boardScreen });
/** The board's mercy call (the gameplay member's): `n` uses of a helper this try pays for. */
type MercyBoard = BoardHandle & { grantFree?: (k: HelperKind, n?: number) => void };
const tries = createTries({
  counted: () => (play?.kind === "campaign" && !isPractice(play) ? boardNumber(play.level) : null),
  daily: () => play?.kind === "daily" && !isPractice(play),
  resumedFree: () => resumedFree,
  pictures: () => board?.pictures().length ?? 0,
  grant: (n) => (board as MercyBoard | null)?.grantFree?.("hint", n),
  announce: (n) => {
    // a VIP's helpers are unlimited already: no free Hint to announce
    if (screen === "board" && !rest.vip()) mercyNote.show(n);
  },
  changed: () => drawHelpers(),
});

/** A trip's stamp or sticker moment is up on the passport (it carries on from a board's win card). */
let stampMoment = false;
/** The stamp or sticker moment `run` opens on the passport: no weather there, as on the board it came from. */
function momentOf(run: () => void): void {
  stampMoment = true;
  run();
}

function show(next: Screen): void {
  screen = next;
  // the table's weather on home and the menus only, never on a board, its win card or a stamp moment
  // (the creator, 2026-10-28: "too distracting" during a level): a quick fade out, and back on home
  if (next !== "passport") stampMoment = false;
  setWeather(next !== "board" && !stampMoment);
  if (import.meta.env.MODE !== "release") dev?.screen(next);
  // every picture and card drawn from here on takes the board's card shape (cards.ts)
  syncCardAspect();
  home.hidden = next !== "home";
  boardScreen.hidden = next !== "board";
  if (next !== "board") {
    destBanner.clear();
    void wearTable(null);
  }
  albumsUi.listScreen.hidden = next !== "albums";
  albumsUi.albumScreen.hidden = next !== "album";
  passportUi.screen.hidden = next !== "passport";
  if (next !== "passport") passportUi.leave();
  routeUi.screen.hidden = next !== "challenges";
  vipDoorUi.screen.hidden = next !== "vip";
  archiveUi.screen.hidden = next !== "archive";
  dailyUi.screen.hidden = next !== "daily";
  suitcaseUi.screen.hidden = next !== "suitcase";
  if (next !== "suitcase") suitcaseUi.leave();
  cosmeticsUi.screen.hidden = next !== "cosmetics";
  if (next !== "cosmetics") cosmeticsUi.leave();
  if (next === "home") {
    drawHomeNote();
    // a friend's challenge waiting for home (offerLink): once this screen has settled
    if (pendingLink) setTimeout(offerLink, 0);
    // the level kept last time (offerCarryOn), likewise
    if (carryOn) setTimeout(offerCarryOn, 0);
  } else homeNote.hidden = true;
  if (next !== "home" && !dareVeil.hidden) hideCard(dareVeil);
  if (next !== "home" && !resumeVeil.hidden) hideCard(resumeVeil);
  if (next !== "album") albumsUi.closeViewer();
  if (next !== "home") homeShop.close();
  if (next !== "board") {
    runOut.close();
    mercyNote.clear();
    lessons.cancel();
    hintNudge.reset();
  }
  winViewer.close();
  screenChanged();
  drawOffline();
  unlockUi.poke();
}

// ---------- home ----------

function drawHome(): void {
  homeUi.draw();
  souvenirTile.draw();
  suitcaseUi.redraw();
  // the board Next stop opens, its pictures fetched ahead while home is up (once home itself is whole:
  // home's own pictures come first)
  if (!awaitingRecord() && homeSettled) prefetchBoard(nextBoard());
}

/**
 * Every picture home shows, decoded: its <img>s, and the CSS backgrounds of the page, the table and
 * home's elements (::before and ::after too), as QA's probe counts "home whole". Nothing else starts
 * before them (the lead, 0.48.0: board 1's pack sharing the line cost home ~0.4 s on 4G).
 */
function homeDrawn(): Promise<unknown> {
  const shown = (e: Element) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden";
  };
  const waits: Promise<unknown>[] = [];
  for (const img of home.querySelectorAll("img")) if (shown(img)) waits.push(img.decode().catch(() => undefined));
  const urls = new Set<string>();
  for (const e of [document.documentElement, document.body, app, home, ...home.querySelectorAll("*")]) {
    if (e !== document.documentElement && e !== document.body && !shown(e)) continue;
    for (const pseudo of [null, "::before", "::after"]) {
      const bg = getComputedStyle(e, pseudo).backgroundImage;
      for (const m of bg.matchAll(/url\("?([^")]+)"?\)/g)) if (!/^(data|blob):/.test(m[1]!)) urls.add(m[1]!);
    }
  }
  for (const u of urls) {
    const img = new Image();
    img.src = u;
    waits.push(img.decode().catch(() => undefined));
  }
  return Promise.all(waits);
}

/** Home's own pictures are in (or 5 s have passed): from then on, the rest loads behind it. */
let homeSettled = false;
/** The longest the background loads wait for home to be whole. */
const SETTLE_CAP_MS = 5000;
/** The longest the rest waits behind the next board's pictures. */
const BOARD_FIRST_MS = 3000;
function settleHome(fonts: Promise<unknown>): void {
  const after = (ms: number) => new Promise((r) => setTimeout(r, ms));
  void Promise.race([Promise.all([fonts, homeUi.whole(), homeDrawn()]), after(SETTLE_CAP_MS)]).then(async () => {
    if (homeSettled) return;
    homeSettled = true;
    // an unlock the checker reported for last session's win waited for home to be whole
    unlockUi.poke();
    // the music and the rest of the sounds (Audio's: the sound code and the click came at start)
    homeWhole();
    // the pictures' titles in the player's language (the enlarged picture, the win card's labels)
    warmTitles();
    // the board Next stop opens, and its pictures: first once home is whole (it is long in before a
    // player's first tap)
    const board = awaitingRecord()
      ? Promise.resolve()
      : loadLevel(nextBoard())
          .then((l) => ensure(boardPaths(l), l.id))
          .catch(() => undefined);
    // the rest behind it, so a quick tap on Next stop waits for nothing else (QA, 0.47.0: a new
    // player's next trip and the Souvenirs came before home and board 1's pictures)
    await Promise.race([board, after(BOARD_FIRST_MS)]);
    // the next trip's boards, so a trip's last board leads on without a wait
    const tr = currentTrip();
    const nextTrip = tr ? trips[trips.indexOf(tr) + 1] : undefined;
    if (nextTrip) void loadTrip(nextTrip.id).catch(() => undefined);
    // the Shuffle lesson's board, for the way to board 4 (lessons.ts): only while the player may need it
    if (awaitingRecord() || campaignNext() <= 4)
      void lessonLevel("shuffle").then(
        (l) => (shuffleBoard = l),
        () => undefined,
      );
    // the Souvenir boards: only a player with a stamp (since boot) shows one; anyone else gets them
    // when a trip's last board opens (openPlay), or a stamp lands in the record
    soonSouvenirs();
    onProgress(soonSouvenirs);
    // the month's suitcase items, for its screen; every table's thumbnail, for the picker and a prize
    suitcaseUi.warm();
    warmThumbs();
  });
}
/** The Souvenir boards, once the player has a stamp (souvenirs.ts: loaded once). */
function soonSouvenirs(): void {
  if (trips.some(tripDone)) void loadSouvenirList();
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
  // the level kept last time, if its read is still on its way (resume.ts): a moment at most, so
  // Next stop carries it on rather than deal it again over it
  if (!carryLanded) {
    playing = true;
    homeUi.opening(true);
    await Promise.race([carryRead, new Promise((r) => setTimeout(r, CARRY_WAIT_MS))]);
    playing = false;
    homeUi.opening(false);
    if (screen !== "home") return;
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
let homeNoteTimer = 0;
/** "Your last win counted: +25 Coins", once, when home is up; nothing for a win that paid nothing. */
function drawHomeNote(): void {
  if (!lastWins.length) return;
  const paid = lastWins.splice(0);
  const coin = coinIcon(20, false, "coin");
  homeNote.replaceChildren(coin, h("span", {}, t("home.lastWin", { count: paid.reduce((sum, v) => sum + (v.status === "paid" ? v.coins : 0), 0) })));
  homeNote.hidden = false;
  for (const v of paid) cueCoins(v, coin);
  // it says its piece, then goes
  clearTimeout(homeNoteTimer);
  homeNoteTimer = window.setTimeout(() => (homeNote.hidden = true), 7000);
}

// ---------- the board ----------

function openLevel(level: number): void {
  openPlay({ kind: "campaign", level });
}

/** The level a play opens (the campaign's by its number, which goes round). */
function levelOfPlay(p: Play): Level {
  return p.kind === "campaign" ? campaignLevel(p.level) : p.kind === "challenge" ? p.c.level : p.kind === "daily" ? p.d : p.kind === "oneoff" ? p.o.level : p.kind === "souvenir" ? p.s : p.kind === "event" ? p.e : p.x;
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
/** Campaign board `n` ahead: its trip's boards first (a trip at a time, Gameplay's loadLevel), then its pictures. */
function prefetchBoard(n: number): void {
  void loadLevel(n).then(prefetch, () => undefined);
}
/** Is campaign board `n`'s trip loaded, so that campaignLevel(n) answers? */
function campaignReady(n: number): boolean {
  try {
    campaignLevel(n);
    return true;
  } catch {
    return false;
  }
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
  // a trip's last board: the Souvenir boards, for the stamp's way on to its Souvenir
  if (next.kind === "campaign" && tripEndingAt(boardNumber(next.level))) void loadSouvenirList();
  // a campaign board whose trip has not loaded (a trip at a time): its boards first, home's Play
  // saying "Opening…" meanwhile, then this again (only the last board asked for opens)
  if (next.kind === "campaign" && !campaignReady(next.level)) {
    const at = ++packWait;
    const onHome = screen === "home";
    if (onHome) homeUi.opening(true);
    const asked = next;
    void loadLevel(asked.level).then(
      () => {
        if (onHome) homeUi.opening(false);
        if (at === packWait) openPlay(asked);
      },
      () => {
        if (onHome) homeUi.opening(false);
        suspect(); // no answer: the connection is checked, and the next tap asks again
      },
    );
    return;
  }
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
    // the try in hand ends here (lost if it stood stuck, else quit; a won one has ended already)
    tries.end();
    dayItem = null;
    mercyNote.clear();
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
    hintNudge.reset();
    helpersUsed = 0;
    // the level kept last time, when this is it, carries on as it was left (resume.ts); any other
    // level opened lets it go (the screens keep one level in hand)
    const carry = carryOn && samePlay(carryOn.play, next) ? carryOn.kept : null;
    carryOn = null;
    hideCard(resumeVeil);
    // a campaign level's free Hints: never more than mercy help could have given this try (tries.ts)
    const freeAllowed = carry && next.kind === "campaign" ? { hint: mercyFor(boardNumber(next.level)) } : undefined;
    resumedFree = carry ? Math.min(Math.floor(Number(carry.free?.hint) || 0), freeAllowed?.hint ?? 0) : 0;
    board = openBoard(
      host,
      next.kind === "campaign" ? next.level : next.kind === "challenge" ? next.c.level : next.kind === "daily" ? next.d : next.kind === "oneoff" ? next.o.open : next.kind === "souvenir" ? next.s : next.kind === "event" ? next.e : next.x,
      carry ? { resume: carry, freeAllowed } : {},
    );
    // kept for the next session from here on, every level that may be carried on (in-hand.ts)
    const keep = keptPlayOf(next, next.kind === "campaign" && next.level === 1 && !guideDone());
    if (keep) keepInHand(board, keep, levelOfPlay(next));
    // a Souvenir wears its own table while it is up; any other board, the player's own
    void wearTable(next.kind === "souvenir" ? (souvenirOf(next.s.trip)?.art.table ?? null) : null);
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
    // an event level hiding an item: the event's cut-outs come now, for its found moment (none while the events are not shown)
    if (next.kind === "event" && next.e.item && eventShown()) void ensureSuitcase(next.e.event).catch(() => undefined);
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
 * board 10), and the first time a 6x6 one, "The biggest board yet!" (the lead: board 30 would come
 * with nothing). Each once per player, remembered beside the lessons (guide-save.ts). Never in practice.
 */
const SIZE_BANNERS: Record<number, { seen: string; words: string }> = {
  5: { seen: "big", words: "board.bigger" },
  6: { seen: "biggest", words: "board.biggest" },
};
function bannersFor(p: Play): Banner[] {
  if (p.kind === "souvenir") return [{ cls: "souvenir", text: t("souvenir.banner") }];
  // an event's hard levels (Levels marks them in the level data) say so as a campaign's do
  if (p.kind === "event") {
    const m = p.e.mark;
    return m ? [{ cls: m, text: markWords(m), shown: () => emit("board:mark", { mark: m }) }] : [];
  }
  if (p.kind !== "campaign") return [];
  const lvl = campaignLevel(p.level);
  const m = markOf(lvl);
  const out: Banner[] = m ? [{ cls: m, text: markWords(m), shown: () => emit("board:mark", { mark: m }) }] : [];
  const size = lvl.deal.cols === lvl.deal.rows ? SIZE_BANNERS[lvl.deal.cols] : undefined;
  if (size && !isPractice(p) && !lessonSeen(size.seen)) out.push({ cls: "big", text: t(size.words), shown: () => learnt(size.seen) });
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
  levelPill.classList.toggle("two", play.kind === "challenge" || play.kind === "daily" || play.kind === "oneoff" || play.kind === "souvenir" || play.kind === "event");
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
  // a Souvenir: its heading over its theme ("Souvenir" / "Street and diner food")
  if (play.kind === "souvenir") {
    pillName.textContent = t("souvenir.pill");
    if (tag) pillName.append(tag);
    pillPar.textContent = souvenirWords(play.s.trip).theme;
    levelPill.replaceChildren(pillName, pillPar);
    return;
  }
  // an event's level: "Level 13" (a hard one tagged) over the event's name
  if (play.kind === "event") {
    pillName.textContent = t("board.level", { level: play.e.number });
    if (play.e.mark) pillName.append(" ", markTag(play.e.mark, true));
    if (tag) pillName.append(tag);
    const named = eventNamed(play.e.event);
    pillPar.textContent = named ? eventTitle(named) : "";
    levelPill.replaceChildren(pillName, pillPar);
    return;
  }
  // a friend's board: which one, over the moves to beat and the player's so far
  if (play.kind === "oneoff") {
    const d = play.o.dare;
    pillName.textContent = "board" in d ? t("home.board", { n: d.board }) : t("board.daily", { date: shortDate(d.date) });
    if (tag) pillName.append(tag);
    pillPar.textContent = movesSoFar === null ? t("oneoff.pill", { count: d.moves }) : t("oneoff.pillYou", { count: d.moves, moves: movesSoFar });
    levelPill.replaceChildren(pillName, pillPar);
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
// creator's practice. A Gem Arcade VIP's are free and unlimited, each button resting a moment after
// use (helper-cooldown.ts, docs/vip.md), except on the guide's and a lesson's boards, free already.
const rest = createHelperRest({
  buttons: helperBtns,
  here: () => !inGuidedStart() && play?.kind !== "lesson",
  canUndo: () => canUndoNow,
  redraw: () => {
    drawHelpers();
    drawStuck();
  },
});
/** Every helper on this board costs nothing. */
function freeHelpers(): boolean {
  return inGuidedStart() || play?.kind === "lesson" || isPractice(play) || rest.vip();
}
/** The counts last drawn, so a count that grew (the kit, a gift, a purchase) gives its badge a pop. */
const shown: Partial<Record<HelperKey, number>> = {};
function drawHelpers(): void {
  const free = freeHelpers();
  // mercy help: this try's free Hints, on the Hint badge in their own colour until used (tries.ts)
  const gifted = free ? 0 : tries.freeHints();
  for (const key of KINDS) {
    // a VIP's: "VIP", or resting with the seconds left (helper-cooldown.ts)
    if (rest.draw(key)) continue;
    const { btn, badge } = helperBtns[key];
    const left = stock.count(key);
    const given = key === "hint" ? gifted : 0;
    const out = !free && !given && left <= 0;
    // none left: "+" (more to be had), and a tap opens the run-out panel
    badge.textContent = given ? String(given) : out ? "+" : String(left);
    btn.classList.toggle("free", free);
    btn.classList.toggle("gifted", given > 0);
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
      free
        ? t(`board.${key}`)
        : given
          ? `${t(`board.${key}`)}, ${t("board.helperFree", { count: given })}`
          : out
            ? `${t(`board.${key}`)}, ${t("board.helperNone")}`
            : `${t(`board.${key}`)}, ${t("board.helperLeft", { count: left })}`,
    );
  }
}

/** A helper pressed (or just bought): it acts, or, with none left and nothing free, the run-out panel opens. */
function pressHelper(k: HelperKey): void {
  if (!board || boardWon) return;
  // a VIP's button resting after its last use takes no press
  if (rest.resting(k)) return;
  const given = k === "hint" && tries.freeHints() > 0;
  if (!freeHelpers() && !given && lessons.lit() !== k && stock.count(k) <= 0) return void runOut.open(k);
  if (k === "undo") board.undo();
  else if (k === "hint") board.hint();
  else board.shuffle();
}
for (const k of KINDS) helperBtns[k].btn.addEventListener("click", () => pressHelper(k));

// the board acted: one spent, unless it was free (a lesson's, the guide's Hint: `lesson`; mercy help's:
// `free`), or the board costs nothing; a spend that got no answer is Server's to send again, and "none"
// (another device used the last) is read again, the act standing
const spendOn = (k: HelperKey) => (e: { lesson?: boolean; free?: boolean }) => {
  // a VIP's: nothing spent, the button rests (a mercy Hint the board gave is used up all the same)
  if (!e.lesson && rest.vip()) {
    rest.used(k);
    if (e.free) tries.usedFree();
    return;
  }
  if (e.lesson || freeHelpers()) return;
  if (e.free) return void tries.usedFree();
  void stock.spend(k);
  tries.spent(k);
  drawHelpers();
};
for (const type of ["helper:undo", "helper:hint", "helper:shuffle"] as const) on(type, () => void helpersUsed++);
on("board:restart", () => (helpersUsed = 0));
on("helper:undo", spendOn("undo"));
on("helper:hint", spendOn("hint"));
on("helper:shuffle", spendOn("shuffle"));
stock.onChange(() => {
  drawHelpers();
  drawStuck();
  runOut.redraw();
  homeShop.redraw();
});

on("board:changed", (e) => {
  canUndoNow = e.canUndo;
  drawHelpers();
  // stuck still: the way out may have changed (an Undo spent, the last Shuffle gone)
  drawStuck();
  // the moves so far, where the board reports them: a challenge's top row counts against par
  const moves = (e as { moves?: number }).moves;
  if (typeof moves === "number" && (play?.kind === "challenge" || play?.kind === "daily" || play?.kind === "oneoff")) {
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
    // the price with the Arcade's own Coin (coin.ts)
    priceTag(price, 16),
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
  if (screen !== "board") return;
  // a sneak peek at a friend's board: a place the player has not been yet, and when they will be
  const o = play?.kind === "oneoff" ? play.o : null;
  destBanner.show(o?.peek && o.trip ? { ...d, note: t("oneoff.visit", { trip: o.trip }) } : d, host);
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
  // the try in hand ends as the board is dealt again: lost if it stood stuck, else quit (tries.ts)
  if (!board.canUndo()) {
    tries.end();
    return void board.restart();
  }
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
            tries.end();
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
  | { kind: "oneoff"; o: OneOff; moves: number; ms: number }
  | { kind: "souvenir"; s: Souvenir; moves: number; ms: number; first: boolean }
  | { kind: "event"; e: EventLevel; moves: number; ms: number; first: boolean }
) & {
  /** Helpers used on the winning try (a dare says how many). */
  helpers?: number;
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
  // the try's ending (a campaign board's player numbers; mercy help starts over): tries.ts says which count
  tries.won();
  mercyNote.clear();
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
  // a friend's board (a one-off): nothing to claim, pay, save or pack; how it went against their
  // count (friend_action), and the challenge marked answered, the player's own record of it
  if (play.kind === "oneoff") {
    const o = play.o;
    lastWin = { kind: "oneoff", o, moves, ms, helpers: helpersUsed };
    if (isPractice(play)) {
      lastWin.practice = true;
      return;
    }
    const r = outcomeOf(moves, o.dare);
    friendAction(r === "won" ? "challenge_won" : r === "tied" ? "challenge_tied" : "challenge_lost", o.dare);
    if (o.id) markAnswered(o.id);
    o.answered = true;
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
  } else if (play.kind === "souvenir") {
    // a Souvenir's first win puts its sticker in the passport (the record, read before this win's claim)
    win = { kind: "souvenir", s: play.s, moves, ms, first: souvenirBest(play.s.id) === undefined };
  } else if (play.kind === "event") {
    // an event level's first win packs the item it hides (the record, read before this win's claim)
    win = { kind: "event", e: play.e, moves, ms, first: eventBest(play.e.id) === undefined };
  } else if (play.kind === "challenge") {
    // any win clears a challenge board, over par too; the record keeps the fewer moves
    const before = challengeBest(play.c.id);
    win = { kind: "challenge", c: play.c, moves, ms, first: before === undefined, better: !isPractice(play) && before !== undefined && moves < before };
  } else {
    // only the day's first finish counts on the day's board
    win = { kind: "daily", d: play.d, moves, ms, first: !dailyResult(play.d.date) };
  }
  win.helpers = helpersUsed;
  lastWin = win;
  // a win that stamps the passport holds its unlocks until the stamp is down
  stampDown = !(win.kind === "campaign" && win.stamp);
  // practice (the dev menu): the card shows as ever, and nothing goes out: no claim, no Coins,
  // no progress, no daily result
  if (isPractice(play)) {
    win.practice = true;
    return;
  }
  // the win checker judges, records and pays (src/net/claims.ts); the card never waits for it
  const lvl = play.kind === "campaign" ? campaignLevel(play.level) : play.kind === "challenge" ? play.c.level : play.kind === "souvenir" ? play.s : play.kind === "event" ? play.e : play.d;
  const verdict = claimWin({
    lane: play.kind,
    board: lvl.id,
    deal: lvl.deal,
    line,
    ms,
    ...(play.kind === "campaign" ? { n: play.level } : {}),
    ...(play.kind === "daily" ? { date: play.d.date } : {}),
  });
  if (win.kind === "daily" && win.first && win.d.date === currentDaily().date) dailyUi.claimed(verdict);
  // the verdict may land before the card is up: it is kept on the win, and the card uses it when it opens
  void verdict.then((v) => {
    win.verdict = v;
    if (lastWin === win && !winVeil.hidden) {
      drawCoins(win);
      const line = winVeil.querySelector(".daily-line");
      if (win.kind === "daily" && line) line.replaceChildren(dailyLine(win));
      // an event level: the checker's word on it, and the item it packed flying in
      const evLine = winVeil.querySelector<HTMLElement>(".event-line");
      if (win.kind === "event" && evLine) {
        evLine.replaceChildren(eventLine(win));
        packedMoment(v, evLine);
      }
    }
  });
});

// the board fires this after its own finish: the card goes straight up (unless a quick Back already showed it)
on("board:won", () => {
  if (screen === "board" && boardWon && lastWin && winVeil.hidden) showWin();
});

// ---------- the unlock card ----------
//
// An achievement Server says just unlocked (onUnlock, below) gets its own card (unlock.ts). It waits for a moment the screen can take it, so a quick tap never loses it:
// - not over the play in hand (a level with a move made: it shows at that level's end, or on leaving);
// - not during a level's finish: it comes up as the level's card does, in its place;
// - on a trip's last level, after the passport's stamp is down, never before it: "Stamped: Japan" crowns
//   the stamp the player has just seen land (and anything else that win unlocked comes with it);
// - not under the settings or the dev menu (<dialog>s), nor before home is whole.

/** The stamp of the win in hand is down (the passport's way on is up), or it has no stamp. */
let stampDown = true;

function unlockReady(): boolean {
  if (document.querySelector("dialog[open]")) return false;
  if (screen === "home" && !homeSettled) return false;
  // the stamp first: from the win card that leads to it, until it is down
  const stamping = lastWin?.kind === "campaign" && !!lastWin.stamp && !stampDown;
  if (stamping && ((screen === "board" && boardWon) || (screen === "passport" && stampMoment))) return false;
  if (screen === "board") {
    // the finish runs: its card comes first (a quick Back shows it at once)
    if (boardWon) return !winVeil.hidden;
    if (board?.canUndo()) return false;
  }
  return true;
}

// Server's word on each unlock (src/net/achievements.ts): a win's verdict, or its compare for a verdict
// that never arrived; once a session each. Several from one win reach the card together (unlock.ts).
onUnlock((u) => unlockUi.add([{ slug: u.achievement.slug, points: u.points }]));

// AN EVENT LEVEL'S ITEM (suitcase.ts, docs/vip.md): the board says when the item's picture is finished
// (suitcase:item, Gameplay's); on the level's first win that is a moment of its own (item-found.ts: the item
// lifts off the board, big, its name, a starburst, then into a small suitcase), and once the checker's
// verdict says the item was packed, its picture flies into a small suitcase on the win card. While the events
// are not shown (event-switch.ts) neither happens: the item's picture finishes as any other picture does.
/** The level's item as the board drew it: its id and the board's copy of its picture, for the card's flight. */
let dayItem: { id: string; url: string } | null = null;
on("suitcase:item", (e) => {
  if (!eventShown()) return;
  // practice counts only in the dev menu's stand-in events (nothing saved or sent)
  if (!play || play.kind !== "event" || (isPractice(play) && !suitcases.pretending()) || e.again) return;
  dayItem = { id: e.id, url: e.url };
  // a replay of a won level packs nothing: no moment
  if (eventBest(play.e.id) !== undefined || suitcases.won(play.e.id)) return;
  const it = suitcases.get(play.e.event)?.items.find((x) => x.id === e.id);
  const art = suitcaseItem(e.id);
  // Art's cut-out when it is in (the month's pack, fetched as the daily opened), else the board's copy
  const cutout = art?.cutout && resident(art.cutout) ? fileUrl(art.cutout) : "";
  const src = cutout || e.url;
  if (!src) return;
  // the board's piece hides at once: the moment's copy takes its place (the call must come inside this event)
  (board as (BoardHandle & { takeItem?: () => void }) | null)?.takeItem?.();
  void playItemFound(boardScreen, { id: e.id, title: it?.title ?? art?.title ?? "", src, cutout: !!cutout, from: e.rect });
});
/** Verdicts whose item has flown already (the card may hear one twice: open, then landed). */
const flownItems = new WeakSet<Verdict>();
/** The checker packed the level's item (its verdict's `packed` and `suitcase`, Server's): the card's line says so and the item flies in. */
function packedMoment(v: Verdict, line: HTMLElement): void {
  const said = v as { packed?: { item: string; count: number }; suitcase?: import("./suitcase-data").EventPack; event?: string; gifts?: string[]; items?: string[] };
  const p = said.packed;
  if (v.status !== "paid" || !p || flownItems.has(v) || !eventShown()) return;
  flownItems.add(v);
  // the event as it stands after this win (the verdict's own), else as last read
  const s = said.suitcase ?? (said.event ? suitcases.get(said.event) : null);
  const found = s?.items.find((x) => x.id === p.item);
  const it: SuitItem = found ?? { id: p.item, title: suitcaseItem(p.item)?.title ?? "" };
  const packed = s ? s.items.filter((x) => x.found).length + (found && !found.found ? 1 : 0) : 1;
  // the 10th: the prize came with this claim (the verdict's gifts say "suitcase", Server's); its table is
  // named only if it LANDED (the verdict's items), as every reward on a card is
  const full = said.gifts?.includes("suitcase") ? { event: s?.id ?? "", table: !!s && (said.items ?? []).includes(s.prize.table), ...(s ? { prize: s.prize } : {}) } : null;
  packedOnCard(line, it, dayItem?.id === p.item ? dayItem.url : "", packed, s?.items.length ?? 10, full);
}

/** An event level's card line: the checker's refusal said plainly, else where the player is in the event. */
function eventLine(w: Extract<Win, { kind: "event" }>): string {
  const v = w.verdict;
  if (v?.status === "refused") return t(v.reason === "vip_only" ? "case.refused.vipOnly" : v.reason === "not_released" ? "case.refused.notReleased" : "case.refused.other");
  const s = suitcases.get(w.e.event);
  return s ? progressLine(s) : "";
}

/** The daily card's plain line: the checker's word on the day wins over the device's (a day closed, or another finish first). */
function dailyLine(w: Extract<Win, { kind: "daily" }>): string {
  const v = w.verdict;
  // a past day's (the daily archive: docs/vip.md): the checker's word on that day
  if (w.d.date !== currentDaily().date && (v?.status !== "late")) {
    const date = longDate(w.d.date); // inside a sentence: the month written out, never "24 окт.."
    const said = (v as { archive?: string; reason?: string } | undefined) ?? {};
    if (v?.status === "refused") return t(said.reason === "too_old" ? "daily.archiveOld" : "daily.notCounted");
    if (said.archive === "won_before") return t("daily.archiveBefore", { date });
    return w.first ? t("daily.archiveCounted", { date }) : t("daily.archiveBefore", { date });
  }
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
function drawCoins(win: Win, fresh = false): void {
  const v = win.verdict;
  const card = winVeil.querySelector<HTMLElement>(".card");
  // practice: "nothing saved" where the Coins would be
  if (isPractice(win)) {
    if (card && dev && !card.querySelector(".coins-chip")) card.append(dev.chip());
    return;
  }
  if (!v || v.status !== "paid" || !card) return;
  const tools = landedTools(v);
  // the guide's finish card says its travel kit up front: each tool that landed is ringed and flies to its
  // button. Its Coins, as many as LANDED (none for a guest: the platform pays a guest no Coins), take the
  // same chip on the card's top edge as any card's, so nothing on it moves when they come
  const kit = card.querySelector<HTMLElement>(".kit");
  if (kit) {
    // the keepsake table, said only if it landed
    settlePrize(card, v, fresh);
    if (v.coins > 0 && !card.querySelector(".coins-chip")) {
      const coin = coinIcon(24, false, "coin");
      card.append(h("div", { class: "coins-chip glass", role: "status" }, coin, h("span", {}, t("win.coins", { count: v.coins }))));
      if (!win.cued) win.cued = cueCoins(v, coin) || true;
    }
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
  const coin = coinIcon(24, false, "coin");
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
  const gifts = (v as { gifts?: string[] }).gifts ?? [];
  if (gifts.includes("kit") && glyphs.length) chip.setAttribute("aria-label", t("win.kitLanded"));
  // a full suitcase's prize (its helpers in the same chip): said as what it is
  else if (gifts.includes("suitcase") && glyphs.length)
    chip.setAttribute("aria-label", `${v.coins > 0 ? `${t("win.coins", { count: v.coins })}, ` : ""}${t("case.prizeWon")}: ${glyphs.map(([k]) => t(`win.gift.${k}`, { count: tools[k]! })).join(", ")}`);
  // the daily's first win of the day pays a helper (Server's rotation): said, for a screen reader, as what it is
  else if (gifts.includes("daily") && glyphs.length)
    chip.setAttribute("aria-label", `${v.coins > 0 ? `${t("win.coins", { count: v.coins })}, ` : ""}${t("win.gift.daily")}: ${glyphs.map(([k]) => t(`win.gift.${k}`, { count: tools[k]! })).join(", ")}`);
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
  if (lastWin.kind === "campaign") prefetchBoard(lastWin.level + 1);
  else if (lastWin.kind === "challenge") prefetch(routeUi.after(lastWin.c)?.level);
  syncCardAspect();
  // board 1's finish card says more (the prize, the travel kit): its pictures take less of the height;
  // so does a card with the friends' row (Challenge a friend, Share)
  const dare = dareOf(lastWin);
  const share = lastWin.kind === "campaign" && lastWin.milestone ? 0.2 : dare || lastWin.kind === "oneoff" ? 0.28 : 0.34;
  const gallery = layoutGallery(board.pictures(), share);
  if (lastWin.kind === "oneoff") return void showOneOffWin(lastWin, gallery);
  if (lastWin.kind === "souvenir") return void showSouvenirWin(lastWin, gallery);
  if (lastWin.kind === "event") return void showEventWin(lastWin, gallery);
  if (lastWin.kind === "challenge") return void showChallengeWin(lastWin, gallery);
  if (lastWin.kind === "daily") return void showDailyWin(lastWin, gallery, dare);
  if (lastWin.kind === "experiment") return void (import.meta.env.MODE !== "release" && showExperimentWin(lastWin, gallery));
  if (lastWin.kind === "lesson") return void showLessonWin(gallery);
  if (lastWin.milestone) return void showMilestone(gallery);
  const { level, moves, ms } = lastWin;
  const practice = isPractice(lastWin);
  // the campaign's last board (each time round)
  const last = boardNumber(level) === levels();
  // a hard board beaten says so (marks.ts)
  const mark = markAt(level);
  // a trip's last board, won the first time: the card says so, and goes on to the passport's stamp
  const ended = lastWin.stamp ? tripById(lastWin.stamp) : undefined;
  const after: AfterStamp = last
    ? { label: t("passport.home"), icon: icon("home"), press: "passport.home", go: goHome }
    : { label: t("passport.nextTrip"), icon: icon("next"), trailing: true, press: "passport.nextTrip", go: () => openPlay({ kind: "campaign", level: level + 1 }) };
  // the trip's Souvenir beside it, once there is one (docs/souvenirs.md): Next trip stays the main action
  after.souvenir = true;
  // the stamp is down: what this win unlocked ("Stamped: <trip>") comes now, over the stamped page
  after.landed = () => {
    stampDown = true;
    unlockUi.poke();
  };
  // Next goes on, round to board 1 after the last (boardNumber); Home is the card's corner key
  const next = ended
    ? withClick(button("amber next", "win.stamp", icon("passport"), t("win.stamp")), () =>
        leaveTo("win-stamp", () => {
          hideCard(winVeil);
          momentOf(() => passportUi.stamp(ended.id, after));
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
      ended ? h("p", { class: "trip-done" }, t("win.tripDone", { trip: tripPlace(ended) })) : null,
      last ? h("p", {}, t("win.allDone")) : null,
      dare ? friendCards.socialRow(dare) : null,
      next,
    ),
  );
  showCard(winVeil, toHome);
  drawCoins(lastWin);
}

/**
 * The guide's prize, its place on the card: nothing is promised up front (QA, 2026-10-27: the platform
 * withholds some rewards from a guest, so a promise could be wrong for one). The table (Server's list,
 * src/net/tables.json) and where to choose it fill it once the checker's verdict says the table LANDED
 * (drawCoins); otherwise the place closes. Its Coins are the card's top-edge chip, as many as landed.
 */
function guidePrize(): HTMLElement | null {
  if (!KEEPSAKE || !knownTable(KEEPSAKE.slug)) return null;
  return h("div", { class: "prize pending" });
}
/**
 * The guide's table, on its card, once the verdict says it landed. If it did not, its place closes when
 * the verdict was in as the card opened (`fresh`), and otherwise stays, empty, so nothing on the card
 * moves under the player's finger.
 */
function settlePrize(card: HTMLElement, v: Extract<Verdict, { status: "paid" }>, fresh: boolean): void {
  const box = card.querySelector<HTMLElement>(".prize.pending");
  if (!box) return;
  const a = KEEPSAKE ? knownTable(KEEPSAKE.slug) : undefined;
  if (!a || !KEEPSAKE || !v.items?.includes(KEEPSAKE.slug)) {
    if (fresh) box.hidden = true;
    return;
  }
  box.classList.remove("pending");
  box.replaceChildren(
    h("span", { class: "won-table" }, h("img", { src: thumbOf(a), alt: "", draggable: "false" }), h("span", {}, tableTitle(a))),
    h("span", { class: "prize-note" }, t("guide.tableNote")),
  );
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
    // a friend's challenge opened the game for this new player: its card now, on home
    withClick(button("amber next", "win.next", t("win.next"), icon("next")), () =>
      pendingLink && !isPractice(lastWin) ? goHome() : openPlay({ kind: "campaign", level: 2, ...(isPractice(lastWin) ? { practice: true } : {}) }),
    ),
  );
  winVeil.replaceChildren(card);
  showCard(winVeil);
  fireworks(card, 6, 3000);
  emit("milestone:show", { id: "guide" });
  if (lastWin) drawCoins(lastWin, true);
}

/**
 * An event level's card (docs/vip.md): its pictures, the moves and the time, where the player is in the
 * event, and the item it packed flying into the suitcase on a first win; every way off goes back to the
 * event's page, which says what to play next.
 */
function showEventWin(w: Extract<Win, { kind: "event" }>, gallery: HTMLElement): void {
  const event = w.e.event;
  const toEvent = () =>
    leaveTo("event-page", () => {
      hideCard(winVeil);
      board?.destroy();
      host.replaceChildren();
      board = null;
      boardWon = false;
      suitcaseUi.openEvent(event);
    });
  const named = eventNamed(event);
  winVeil.replaceChildren(
    h(
      "div",
      { class: "card event" },
      cornerKey("back", t("win.event"), "win.eventBack", toEvent),
      h("h2", {}, t("win.title")),
      h("p", { class: "event-of" }, named ? t("case.levelOf", { theme: eventTitle(named), n: w.e.number }) : t("board.level", { level: w.e.number })),
      gallery,
      h(
        "div",
        { class: "stats" },
        h("div", { class: "stat glass" }, h("b", {}, String(w.moves)), h("span", {}, t("win.moves"))),
        h("div", { class: "stat glass" }, h("b", {}, clock(w.ms)), h("span", {}, t("win.time"))),
      ),
      h("p", { class: "daily-line event-line" }, eventLine(w)),
      withClick(button("amber next", "win.event", t("win.event")), toEvent),
    ),
  );
  showCard(winVeil, toEvent);
  drawCoins(w);
  // the verdict landed before the card: the item flies now
  const line = winVeil.querySelector<HTMLElement>(".event-line");
  if (w.verdict && line && !isPractice(w)) packedMoment(w.verdict, line);
  // the dev menu's stand-in events: a practice level's first win packs its item into the stand-in, as the checker would
  if (line && isPractice(w) && w.first && suitcases.pretending()) {
    const r = suitcases.pretendWin(w.e.id);
    if (r) {
      const it: SuitItem = { id: r.item.id, title: r.item.title };
      packedOnCard(line, it, dayItem?.id === it.id ? dayItem.url : "", r.pack.found, r.pack.items.length, r.pack.complete ? { event: r.pack.id, table: true, prize: r.pack.prize } : null);
    } else {
      const pack = suitcases.get(w.e.event);
      if (pack) line.textContent = progressLine(pack);
    }
  }
}

/**
 * The daily's card: the pictures, the moves and the time (what the day's board ranks
 * by), and plainly whether this finish is the one that counts; then the day's results.
 */
function showDailyWin(w: Extract<Win, { kind: "daily" }>, gallery: HTMLElement, dare: Dare | null): void {
  const line = isPractice(w) && dev ? dev.dailyLine : dailyLine(w);
  // practice: Next is the day after (the dev menu's), in place of the day's results
  const p = play;
  const after = isPractice(w)
    ? p && dev?.hasNext(p)
      ? withClick(button("amber next", "win.next", t("win.next"), icon("next")), () => leaveTo("daily-next", () => dev?.next(p)))
      : null
    : p?.kind === "daily" && p.from
    ? pastDayOn(p.from)
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
  // every way off a daily's card goes back to the Daily page (the creator, 2026-10-30), its corner key too
  const toPage = () =>
    leaveTo("daily-page", () => {
      hideCard(winVeil);
      board?.destroy();
      host.replaceChildren();
      board = null;
      boardWon = false;
      void dailyUi.openPage();
    });
  const toHome = isPractice(w) ? () => leaveTo("daily-home", goHome) : toPage;
  winVeil.replaceChildren(
    h(
      "div",
      { class: "card" },
      isPractice(w) ? cornerKey("home", t("win.home"), "win.home", toHome) : cornerKey("back", t("win.daily"), "win.dailyBack", toHome),
      h("h2", {}, t("win.title")),
      gallery,
      h(
        "div",
        { class: "stats" },
        h("div", { class: "stat glass" }, h("b", {}, String(w.moves)), h("span", {}, t("win.moves"))),
        h("div", { class: "stat glass" }, h("b", {}, clock(w.ms)), h("span", {}, t("win.time"))),
      ),
      h("p", { class: "daily-line" }, line),
      dare ? friendCards.socialRow(dare) : null,
      after,
    ),
  );
  showCard(winVeil, toHome);
  drawCoins(w);
}

/** A past day's win card's way on (docs/vip.md): back to the Daily page, as every daily's. */
function pastDayOn(_from: DailyFrom): HTMLButtonElement {
  return withClick(button("amber next", "win.daily", t("win.daily")), () =>
    leaveTo("daily-page", () => {
      hideCard(winVeil);
      board?.destroy();
      host.replaceChildren();
      board = null;
      boardWon = false;
      void dailyUi.openPage();
    }),
  );
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

// ---------- souvenirs ----------

/** Play trip `trip`'s Souvenir (home's tile, its passport page, the stamp moment), once its trip is stamped. */
function playSouvenir(trip: string): void {
  const sv = souvenirOf(trip);
  if (sv) return openPlay({ kind: "souvenir", s: sv.board });
  // the Souvenir boards not loaded yet (they come with a stamp): loaded, then opened
  void loadSouvenirList().then(() => {
    const now = souvenirOf(trip);
    if (now) openPlay({ kind: "souvenir", s: now.board });
  }, () => suspect());
}

/**
 * A Souvenir's card: its pictures, the moves and the time, and its Coins once the checker pays them
 * (the first win only). The first win's card shows its sticker and ends on "Add the sticker", the
 * sticker moment on the trip's passport page, then Next stop; a replay (or practice) goes on to Next stop.
 */
function showSouvenirWin(w: Extract<Win, { kind: "souvenir" }>, gallery: HTMLElement): void {
  const trip = w.s.trip;
  const sv = souvenirOf(trip);
  const fresh = w.first && !isPractice(w) && !!sv;
  const nextStop = () => openPlay({ kind: "campaign", level: nextBoard() });
  const toHome = () => leaveTo("souvenir-home", goHome);
  let line: HTMLElement | null = null;
  if (fresh && sv) {
    const img = h("img", { class: "sv-sticker", alt: "", draggable: "false" });
    void stickerReady(sv.art).then((src) => (img.src = src));
    line = h("p", { class: "souvenir-line" }, img, h("span", {}, t("souvenir.stickerReady")));
  }
  const go = fresh
    ? withClick(button("amber next", "souvenir.addSticker", icon("passport"), t("souvenir.addSticker")), () =>
        leaveTo("souvenir-sticker", () => {
          hideCard(winVeil);
          momentOf(() => passportUi.sticker(trip, { label: t("home.nextStop"), icon: icon("next"), trailing: true, press: "passport.nextStop", go: nextStop }));
        }),
      )
    : withClick(button("amber next", "win.next", t("home.nextStop"), icon("next")), () => leaveInto("souvenir-next", nextStop));
  winVeil.replaceChildren(
    h(
      "div",
      { class: "card souvenir" },
      cornerKey("home", t("win.home"), "win.home", toHome),
      h("h2", {}, t("souvenir.wonTitle")),
      h("p", { class: "souvenir-theme" }, t("souvenir.wonTheme", { theme: souvenirWords(trip).theme, trip: souvenirWords(trip).trip })),
      gallery,
      h(
        "div",
        { class: "stats" },
        h("div", { class: "stat glass" }, h("b", {}, String(w.moves)), h("span", {}, t("win.moves"))),
        h("div", { class: "stat glass" }, h("b", {}, clock(w.ms)), h("span", {}, t("win.time"))),
      ),
      line,
      go,
    ),
  );
  showCard(winVeil, toHome);
  drawCoins(w);
}

// ---------- friend challenges ----------

/**
 * The dare a win card offers a friend (Challenge a friend, Share): a trip board from board 3 (boards
 * 1 and 2 are the guided start), or a daily; none for practice, a lesson or a one-off (its own card
 * challenges back).
 */
function dareOf(w: Win): Dare | null {
  if (isPractice(w)) return null;
  const count = { moves: w.moves, helpers: w.helpers ?? 0 };
  if (w.kind === "campaign" && !w.milestone && boardNumber(w.level) >= 3) return { board: boardNumber(w.level), ...count };
  if (w.kind === "daily") return { date: w.d.date, ...count };
  return null;
}

/**
 * A friend's board won (the one-off): the two counts side by side, a line for a win, a tie or a loss;
 * then Challenge back (to the sender, with the player's own count; Challenge a friend from a link)
 * and Share. After a loss Try again leads. No Coins, nothing saved: Home is its corner key.
 */
function showOneOffWin(w: Extract<Win, { kind: "oneoff" }>, gallery: HTMLElement): void {
  const { o, moves } = w;
  const helpers = w.helpers ?? 0;
  const outcome = outcomeOf(moves, o.dare);
  const mine: Dare = "board" in o.dare ? { board: o.dare.board, moves, helpers } : { date: o.dare.date, moves, helpers };
  const toHome = () => leaveTo("oneoff-home", goHome);
  const again =
    outcome === "lost"
      ? withClick(button("amber next", "oneoff.tryAgain", icon("restart"), t("oneoff.tryAgain")), () => leaveInto("oneoff-again", () => openPlay({ kind: "oneoff", o })))
      : null;
  const card = h(
    "div",
    { class: "card oneoff" },
    cornerKey("home", t("win.home"), "win.home", toHome),
    h("h2", {}, t(`oneoff.${outcome}`)),
    gallery,
    ...comparePanel(moves, helpers, o.dare, { name: o.from }),
    isPractice(w) ? null : friendCards.socialRow(mine, { ...(o.fromId ? { back: { id: o.fromId, name: o.from } } : {}), amber: outcome !== "lost" }),
    again,
  );
  winVeil.replaceChildren(card);
  showCard(winVeil, toHome);
  if (outcome === "won") fireworks(card, 3, 2200);
  drawCoins(w);
}

/** The challenge or link this launch carried, until its card has shown (once a launch: a relaunch brings it back). */
// ---------- the level kept last time (resume.ts; its state is declared beside resumeVeil) ----------

/** Read the level kept last time, once, as home is up. */
function startCarryOn(): void {
  carryRead = readCarryOn()
    .then((c) => {
      // a level opened meanwhile has let it go
      if (c && !board) {
        carryOn = c;
        offerCarryOn();
      }
    })
    .catch(() => undefined)
    .finally(() => (carryLanded = true));
}

/** Where a kept level is, as the player reads it: "Level 27 · Japan", "Daily · Oct 29". */
function carryWhere(p: Play): string {
  if (p.kind === "campaign") {
    const n = boardNumber(p.level);
    const tr = tripOf(n);
    return tr ? t("oneoff.where", { n, trip: tripPlace(tr) }) : t("home.board", { n });
  }
  if (p.kind === "daily") return t("board.daily", { date: shortDate(p.d.date) });
  if (p.kind === "challenge") return t("board.challenge", { n: p.c.n });
  if (p.kind === "souvenir") {
    const w = souvenirWords(p.s.trip);
    return t("souvenir.wonTheme", { trip: w.trip, theme: w.theme });
  }
  if (p.kind === "event") {
    const named = eventNamed(p.e.event);
    return named ? t("case.levelOf", { theme: eventTitle(named), n: p.e.number }) : t("board.level", { level: p.e.number });
  }
  return "";
}

/**
 * "Carry on?" over home, once a session, when home is up with nothing over it, the record has landed
 * and the guided first level is done (as a friend's challenge waits: offerLink, which goes first).
 * Continue opens the level as it was left; Not now leaves it to Next stop (or its tile).
 */
let carryOffered = false;
function offerCarryOn(): void {
  const c = carryOn;
  if (!c || carryOffered || screen !== "home" || awaitingRecord() || !guideDone() || pendingLink || cardUp()) return;
  carryOffered = true;
  const later = () => hideCard(resumeVeil);
  const go = () => {
    hideCard(resumeVeil);
    if (carryOn === c) openPlay(c.play);
  };
  resumeVeil.replaceChildren(carryOnCard(carryWhere(c.play), go, later, cornerKey("close", t("resume.later"), "resume.close", later)));
  showCard(resumeVeil, later);
}

let pendingLink: Launch | null = null;

/** What the game was opened with (friends.ts), read once as the first screen is up. */
async function greetLaunch(): Promise<void> {
  const link = await launchLink();
  if (!link) return;
  friendAction(link.kind === "challenge" ? "opened_challenge" : "opened_share", link.dare);
  pendingLink = link;
  offerLink();
}

/** A card (or the settings) is over the screen now. */
const cardUp = (): boolean => [...app.querySelectorAll<HTMLElement>(".veil")].some((v) => !v.hidden) || !!document.querySelector("dialog[open]");

/**
 * The challenge card, once home is up with nothing over it and the player's record has landed and
 * says the guided first board is done: a brand-new player plays board 1 first, and its finish card's
 * Next leads home to this card (docs/friend-challenges.md). Asked again as home shows and as the
 * record lands.
 */
let offering = false;
function offerLink(): void {
  const link = pendingLink;
  if (!link || offering || screen !== "home" || awaitingRecord() || !guideDone() || cardUp()) return;
  offering = true;
  void oneOffFor(link)
    .then((got) => {
      if (pendingLink !== link) return;
      if (!got) {
        pendingLink = null; // a board this build does not have, or no daily for that date: an ordinary start
        return;
      }
      if (screen !== "home" || cardUp()) return; // the player moved on meanwhile: home asks again
      pendingLink = null;
      showDare(got.o, got.notYet);
    })
    .catch(() => suspect()) // the board's trip would not load: asked again as home shows or the record lands
    .finally(() => (offering = false));
}

/** The one-off a challenge or link names: its board (the campaign's, or the dated daily) and who sent it. */
async function oneOffFor(link: Launch): Promise<{ o: OneOff; notYet: string | null } | null> {
  const dare = link.dare;
  const sender = link.kind === "challenge" ? { from: link.from, fromId: link.fromId, id: link.id, answered: link.answered } : { from: null, fromId: null, id: null, answered: false };
  if ("board" in dare) {
    if (dare.board > levels()) return null;
    const trip = tripOf(dare.board);
    // not won yet, and not all done: a sneak peek (the campaign goes round past its last board)
    const next = campaignNext();
    const peek = next <= levels() && dare.board >= next;
    // a far trip's board (a sneak peek) comes with its trip's chunk first
    const level = await loadLevel(dare.board);
    return { o: { dare, ...sender, open: dare.board, level, peek, trip: trip ? tripPlace(trip) : null }, notYet: null };
  }
  // a daily: never one whose day has not come for this player (the sender may be a time zone ahead)
  const [now, d] = await Promise.all([dailyToday(1500), loadDaily(dare.date)]);
  if (!d) return null;
  return { o: { dare, ...sender, open: d, level: d, peek: false, trip: null }, notYet: dare.date > now.date ? dare.date : null };
}

/** The challenge card over home: Play opens the one-off; its X leaves it (a relaunch brings it back). */
function showDare(o: OneOff, notYet: string | null): void {
  const d = o.dare;
  const where = "board" in d ? (o.trip ? t("oneoff.where", { n: d.board, trip: o.trip }) : t("home.board", { n: d.board })) : t("oneoff.daily", { date: shortDate(d.date) });
  const view: ChallengeView = { dare: d, who: { name: o.from }, where, peek: o.peek, answered: o.answered, notYet };
  const close = () => hideCard(dareVeil);
  dareVeil.replaceChildren(
    challengeCard(
      view,
      () => {
        hideCard(dareVeil);
        openPlay({ kind: "oneoff", o });
      },
      close,
    ),
  );
  showCard(dareVeil, close);
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
  // turn upright by the Arcade: the game is laid out upright only)
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
  // too many for rows at a size worth tapping: a mosaic may still show them all at one look (QA,
  // 0.48.0: a Souvenir's twelve long pictures ran off the card as a strip); only past that, the strip
  const mosaic = best.u < uTap ? bestMosaic(pics, width, height, aspect, uTap) : null;
  if (mosaic) {
    const gallery = h("div", { class: "gallery mosaic", style: `--u:${Math.floor(mosaic.u)}px;--gap:${MOSAIC_GAP}px;--k:${mosaic.k}` });
    const line = h("div", { class: "line" });
    mosaic.order.forEach((p, i) => line.append(galleryPicture(p, i, { u: Math.floor(mosaic.u), aspect })));
    gallery.append(line);
    return gallery;
  }
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

/**
 * The mosaic's gap: tighter than the rows', so more fits at a tappable size, and twice the 4px a
 * picture reaches past its edges to the touch (button.pic::before, style.css), so neighbours' hit
 * areas meet without overlapping: a 36px-wide picture is 44px under a thumb, all of it its own.
 */
const MOSAIC_GAP = 8;
/**
 * The win card's pictures as a MOSAIC: a grid of k columns, each one card wide (u x the card's
 * aspect), rows u tall, every picture spanning its own cols x rows and placed, biggest first, at the
 * first free place from the top left (what CSS grid-auto-flow: dense does with the same order, so
 * style.css lays them exactly as counted here). The k that gives the biggest unit wins; null when even
 * that is under `uTap` (the sideways strip then). Each picture keeps its own shape: it sits centred
 * in its cells, which a span widens by the gaps it crosses.
 */
function bestMosaic(pics: BoardPicture[], width: number, height: number, aspect: number, uTap: number): { u: number; k: number; order: BoardPicture[] } | null {
  const order = pics
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p.cols * b.p.rows - a.p.cols * a.p.rows || a.i - b.i)
    .map((x) => x.p);
  const widest = Math.max(1, ...pics.map((p) => p.cols));
  let best: { u: number; k: number; order: BoardPicture[] } | null = null;
  for (let k = widest; k <= 12; k++) {
    const used: boolean[][] = [];
    const free = (r: number, c: number, p: BoardPicture) => {
      if (c + p.cols > k) return false;
      for (let dr = 0; dr < p.rows; dr++) for (let dc = 0; dc < p.cols; dc++) if (used[r + dr]?.[c + dc]) return false;
      return true;
    };
    for (const p of order) {
      let r = 0;
      let c = 0;
      while (!free(r, c, p)) if (++c >= k) [r, c] = [r + 1, 0];
      for (let dr = 0; dr < p.rows; dr++) for (let dc = 0; dc < p.cols; dc++) (used[r + dr] ??= [])[c + dc] = true;
    }
    const rows = used.length;
    const u = Math.min(54, (width - MOSAIC_GAP * (k - 1)) / k / aspect, (height - MOSAIC_GAP * (rows - 1)) / rows);
    if (!best || u > best.u + 0.5) best = { u, k, order };
  }
  return best && best.u >= uTap ? best : null;
}

/** One picture of the win card: a button that looks like the picture, opening it big. */
function galleryPicture(p: BoardPicture, i: number, drawn: { u: number; aspect: number }): HTMLElement {
  const style = `--c:${p.cols};--r:${p.rows};--i:${i}`;
  const known = cataloguePicture(p.id);
  // a stand-in the catalogue does not know (a board in the making) is only shown
  // data-pic: the picture's id (the day's item flies from its own picture, suitcase.ts)
  if (!known) return h("figure", { class: "pic", style, "data-pic": p.id }, h("img", { src: p.src, alt: "", draggable: "false" }));
  const sharp = sharpCopy(known, drawn.u * p.cols * drawn.aspect, drawn.u * p.rows);
  const held = known.copies.find((c) => c.file !== known.file && copyUrl(c) === p.src);
  const src = held && held.w >= sharp.copy.w ? p.src : sharp.url;
  const img = h("img", { src, alt: "", draggable: "false" });
  if (src !== p.src) img.addEventListener("error", () => (img.src = p.src), { once: true });
  const b = h("button", { type: "button", class: "pic", style, "data-press": "win.picture", "data-pic": p.id, "aria-label": pictureTitle(known) }, img);
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
  // an unlock waiting for the level's card comes up in its place
  unlockUi.poke();
}
function hideCard(veil: HTMLElement): void {
  if (veil === winVeil) {
    winViewer.close();
    friendCards.closeSheet();
  }
  veil.hidden = true;
  closed(veil);
  unlockUi.poke();
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

// THE ROUND TYPE IN EVERY LANGUAGE. Fredoka's Latin cut is the game's type (asked for by the boot
// entry). Its extended cut has ł and most accents but no ą ę ż, no Turkish İ ğ ş and no Cyrillic, so
// Nunito, a rounded face of the same weight, stands behind it in `--round` (style.css) for just those
// letters, rather than the device's plain font mid-word; Russian reads in Nunito throughout. Each cut
// is fetched by the browser only when a page shows one of its letters, except for the languages that
// show them on every screen (Polish and Turkish: the extended cuts; Russian: Nunito's Cyrillic), which
// home waits for with Fredoka. Japanese, Korean and Chinese read in the device's own font (a CJK font
// would be megabytes); the page's lang (i18n.ts) picks the right one. The faces are Untangled's.
const LATIN_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";
const CYRILLIC = "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116";
function addFaces(): Promise<unknown> {
  const lang = locale();
  const ext = lang === "pl" || lang === "tr";
  const faces: [family: string, file: string, weight: string, range: string, now: boolean][] = [
    ["Fredoka", "fredoka-latin", "300 700", "", true],
    ["Fredoka", "fredoka-latinext", "300 700", LATIN_EXT, ext],
    ["Nunito", "nunito-latinext", "300 900", LATIN_EXT, ext],
    ["Nunito", "nunito-cyrillic", "300 900", CYRILLIC, lang === "ru"],
  ];
  const waits: Promise<unknown>[] = [];
  for (const [family, file, weight, range, now] of faces) {
    const face = new FontFace(family, `url(${import.meta.env.BASE_URL}fonts/${file}.woff2)`, range ? { weight, display: "swap", unicodeRange: range } : { weight, display: "swap" });
    document.fonts.add(face);
    if (now) waits.push(face.load().catch(() => undefined));
  }
  return Promise.all(waits);
}

// A CHANGE OF LANGUAGE while the game is open (the Arcade's, or a late one after a slow handshake):
// the labels set once are set again by i18n.ts (live), and every screen that draws itself redraws
// here. A card open at that moment keeps its words until it is next opened.
onLocaleChange(() => {
  drawHome();
  drawHomeNote();
  if (board) {
    drawPill();
    drawHelpers();
  }
  passportUi.redraw();
  dailyUi.redraw();
  suitcaseUi.redraw();
  albumsUi.redraw();
  routeUi.redraw();
  homeShop.redraw();
  runOut.redraw();
  if (screen === "daily") void dailyUi.openResults();
  drawOffline();
});

/** Draw the first screen. Called once by the boot entry (src/main.ts). */
export async function startApp(): Promise<void> {
  // HOME APPEARS WHOLE (the creator, 2026-10-26, as Untangled does): the round type, home's own
  // pictures (the title, the desk, the booklet) and the route's postcards are waited for, at most
  // HOME_WAIT_MS from here, then home shows anyway and a late picture fades in where it belongs
  const by = performance.now() + HOME_WAIT_MS;
  const fonts = addFaces();
  // the Arcade's language, whenever it says (it can change while the game is open): the boot entry
  // chose it before this module ran (src/main.ts), so home is built in it; a later word redraws
  onPlayerPrefs((prefs) => {
    const l = arcadeLocale(prefs.locale);
    if (l) void setLocale(l);
  });
  void homeUi.warmArt();
  // and the player's progress, the server's record: a second at most (the game standard), then
  // home draws, and redraws when the record lands
  loadProgress();
  loadGuideSave();
  // where the pictures are (the packs' index), so the next board's can start the moment home is drawn
  warmIndex();
  // the player's table, which home now shows (tables.ts): read and laid before home appears, in the
  // same capped wait, so a Winter Dusk owner never sees the sunny home turn snowy
  void startTables();
  await waitForProgress(1000);
  // THE FIRST LOAD CARRIES ONLY HOME (the creator, 2026-10-28: "it should load very quickly… then
  // load the rest smartly in the background as needed"): the player's trip (its boards and postcards,
  // tools/content-split.mjs) inside the same capped wait, and the Souvenirs only for a player with a
  // stamp (home's tile); everything else once home is whole, below
  const until = () => new Promise((r) => setTimeout(r, Math.max(0, by - performance.now())));
  const trip = currentTrip();
  if (trip) warmTripStamp(trip);
  if (trip) await Promise.race([loadTripOf(trip), until()]);
  const stamped = trips.some(tripDone);
  if (stamped) void loadSouvenirList();
  drawHome();
  await Promise.race([Promise.all([fonts, homeUi.whole(), tableChoiceRead]), until()]);

  onProgress(drawHome);
  // the Souvenir boards (souvenirs.ts): home's tile and the passport's pages once they are in
  onSouvenirs(() => {
    if (screen === "home") drawHome();
    passportUi.redraw();
  });
  onProgress(albumsUi.redraw);
  onProgress(passportUi.redraw);
  onProgress(routeUi.redraw);
  onProgress(dailyUi.redraw);
  drawHome();
  document.body.append(app);
  mountSettings(app);
  document.getElementById("boot")?.remove();
  show("home");
  // no tap brought this screen in: Play answers from the first moment it is drawn
  firstScreen();
  // opened by a friend's challenge or a shared link: its card, once home and the record allow (offerLink)
  onProgress(offerLink);
  void greetLaunch();
  // the level kept last time: offered over home once its read lands (resume.ts)
  onProgress(offerCarryOn);
  startCarryOn();
  // whether the player has a friend to challenge (a guest never has): Challenge a friend waits on it
  watchFriends();
  void startSound();
  // which day it is (the platform's word) and its board (its week's chunk): Home's Daily button
  // holds its place meanwhile (daily.ts) and shows once they are known
  void dailyUi.refresh();
  // home is whole: the rest comes in behind it, in the order it is likely wanted
  settleHome(fonts);
  // the table's weather (the table itself was laid before home appeared: startTables, above)
  mountParticles(app);
  // every glyph kept in the page, so a connection dropped later never leaves a button bare
  void keepIcons();
  // the top row's words and the stuck line wrap (or shrink, never under 12 px) rather than lose their ends
  for (const el of app.querySelectorAll<HTMLElement>(".top-pill")) keepFitted(el);
  // a two-line top row (a challenge, a daily, a friend's board, a Souvenir): each line on its own,
  // one line each, smaller if it must be, two lines only at 12 px (fit.ts, oneLine; style.css)
  // a title the Arcade's corner (the Gem and the wallet) leaves too little room steps onto a line of its own
  watchTopRow(app);
  keepFitted(pillName, true);
  keepFitted(pillPar, true);
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
          // always a fresh board from the menu: the one in hand is dropped (its try ends)
          tries.end();
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
        openSuitcase: () => {
          closeSettings();
          suitcaseUi.open();
        },
        showUnlock: (kind) => {
          closeSettings();
          if (kind !== "stamp") return void unlockUi.preview([kind === "icon" ? "first-steps" : "up-for-a-challenge"]);
          // a trip's last level (Travel America's 15th is a hard level): its stamp lands, then its card
          momentOf(() =>
            passportUi.stamp("t1", {
              label: t("passport.nextTrip"),
              icon: icon("next"),
              trailing: true,
              press: "passport.nextTrip",
              go: goHome,
              souvenir: true,
              landed: () => unlockUi.preview(["stamped-t1", "up-for-a-challenge"]),
            }),
          );
        },
        showAchievements: (mix) => {
          closeSettings();
          pretendAchievements(mix);
          passportUi.openAchievements();
        },
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
        momentOf(() => passportUi.stamp(id, { label: t("passport.nextTrip"), icon: icon("next"), trailing: true, press: "passport.nextTrip", go: goHome, souvenir: true }));
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
      /** The Cosmetics screen without the platform: Coins, what is owned, prices, buys failing (cosmetics-shop.ts); null: the platform's word. */
      cosmetics: (p: Parameters<typeof pretendCosmetics>[0]) => pretendCosmetics(p),
      cosmeticsState: pretendState,
      openCosmetics: () => cosmeticsUi.open(),
      /**
       * A table in no list yet, on every screen (Art's options): { table, desk?, base?, deskBase?,
       * stackBack?, particles?... }, paths under the project; null puts the player's own back
       * (tables.ts, tryTable; ?tryTable=<folder> does it from <folder>/table.json at boot).
       */
      tryTable: (a: TryTable | null) => tryTable(a),
      /** As if a win's verdict said these achievements unlocked (slugs, achievements.ts): the card, once the screen can take it; nothing unlocks. */
      unlocked: (slugs: string[]) => unlockUi.add(slugs.map((slug) => ({ slug }))),
      /** Play as a VIP (docs/vip.md), as the dev menu's switch does: on the play-test frame, no server to ask, so it holds. */
      vip: (on: boolean) => pretendVip(on),
      /** Show Get VIP on the doors and in Cosmetics (true), so its words can be seen; its press only logs. As ?vipsale. */
      vipSale: (on: boolean) => forceVipSale(on),
      /** The daily archive's calendar (as a VIP's badge opens it). */
      archive: () => archiveUi.open(),
      /** The locked door's screen for the archive (as a non-VIP's Daily page opens it). */
      door: () => vipDoorUi.open({ kind: "archive", today: currentDaily().date }),
      /** The Daily page (its friends: Server's board, sample players on dev and in the play-test tool). */
      dailyPage: () => void dailyUi.openPage(),
      /** The unlock card for these slugs, again and again (past the once-a-session rule), once the screen can take it. */
      unlockCard: (slugs: string[]) => unlockUi.preview(slugs),
      /** The Passport's Achievements page: `mix`, some unlocked and counters part way (pretend, this page only); else the platform's word. */
      achievements(mix: boolean) {
        pretendAchievements(mix);
        passportUi.openAchievements();
      },
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
      /** The boards' player numbers sent so far (board-stats.ts), and the try in hand (tries.ts). */
      stats: () => ({ sent: recentStats.slice(), now: tries.current() }),
      /** The board in hand, for a script that plays its proved line (board.dev.step) without the dev menu, so it is no practice. */
      board: () => board,
      /** As if `kept` (InHand: { v: 1, play, id, deal, ...board.kept() }) had been read at boot: offered over home (resume.ts). */
      async carry(kept: InHand | null) {
        carryOn = await carryOnFrom(kept);
        carryOffered = false;
        if (screen === "home") offerCarryOn();
        return !!carryOn;
      },
      /** The events as a stand-in ("default": as of the player's date, or of `asOf` such as "2026-11-05"; null: the platform's word), for this page only. */
      suitcase(p?: "default" | null, asOf?: string) {
        suitcases.pretend(p === undefined ? "default" : p, asOf);
        if (screen === "home") drawHome();
      },
      /** An event's page: the newest, or event `id`. */
      openSuitcase: (id?: string) => suitcaseUi.open(id ?? null),
      /** An event's level, as from its page (the stand-in's events play their real boards; the claim goes unframed). */
      eventLevel: (id: string) => void playEventLevel(id),
      /** The stand-in's level `id` won as a first win would (its item found), its page redrawn: nothing sent. */
      pretendEventWin: (id: string) => suitcases.pretendWin(id),
      /** As if the game had been opened by this challenge or link (friends.ts's Launch): its card when home allows. */
      launch(link: Launch) {
        pendingLink = link;
        offerLink();
      },
      /** Trip `trip`'s Souvenir board ("t1"), as from home's tile (it claims as ever, unframed for this page only). */
      souvenir: (trip: string) => playSouvenir(trip),
      /** The sticker moment for trip `trip`, as after its Souvenir's first win (nothing is won or sent). */
      sticker: (trip: string) => momentOf(() => passportUi.sticker(trip, { label: t("home.nextStop"), icon: icon("next"), trailing: true, press: "passport.nextStop", go: goHome })),
      /** The friend_action events sent so far (friends.ts). */
      friendActions: () => recentFriendActions.slice(),
      /** The event level's card up now as if the checker had packed `item` (event `event`; `full`: the 10th, its prize with it): the flight, nothing sent. */
      packed(item: string, event: string, full = false) {
        const line = winVeil.querySelector<HTMLElement>(".event-line");
        const s = suitcases.get(event);
        if (line) packedMoment({ status: "paid", lane: "event", board: "dev", moves: 0, coins: 0, packed: { item, count: 1 }, event, ...(full && s ? { gifts: ["suitcase"], items: [s.prize.table] } : {}) } as unknown as Verdict, line);
      },
    };
    // ?restored=id,id shows those pictures as restored in the albums (never saved)
    const fake = new URLSearchParams(location.search).get("restored");
    if (fake) albumsUi.pretend(fake.split(",").filter(Boolean));
  }
}
