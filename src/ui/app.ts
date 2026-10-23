// The app shell: every screen around the board, and the moves between them.
//
//   home  --Play-->  board  --won-->  win card  --Next-->  the next board
//     ^                |  Back
//     +----------------+   (the board in hand is kept; Play returns to it)
//   home  --Albums-->  albums  -->  an album  -->  a picture, full screen
//                      (albums.ts; each Back goes one step up)
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
import { campaign, loadCampaign, onCampaign, pretendRestored, restore, waitForCloud, won } from "./progress";
import { createAlbums } from "./albums";
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
const homeAlbums = button("albums", "home.albums", icon("albums"), t("home.albums"));
const home = h(
  "section",
  { class: "screen home", "aria-label": t("game.title") },
  h("div", { class: "emblem", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
  h("h1", {}, t("game.title")),
  homeWhere,
  homePlay,
  homeAlbums,
);

// the board: the level, Back, the board, the helpers
const levelPill = h("div", { class: "top-pill glass" });
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
const boardScreen = h("section", { class: "screen board-screen", hidden: "" }, levelPill, back, host, helpers);

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

app.append(home, boardScreen, albumsUi.listScreen, albumsUi.albumScreen, albumsUi.viewer, winVeil, restartVeil, offlineVeil);

// ---------- state ----------

type Screen = "home" | "board" | "albums" | "album";
let screen: Screen = "home";
let board: BoardHandle | null = null;
let boardLevel = 0;
/** The board in hand was won; its card is up (or about to be). */
let boardWon = false;
/** A board asked for while there was no connection: opened once it is back. */
let waiting: number | null = null;

const levels = () => levelCount();
const allDone = () => campaign().level > levels();

function show(next: Screen): void {
  screen = next;
  home.hidden = next !== "home";
  boardScreen.hidden = next !== "board";
  albumsUi.listScreen.hidden = next !== "albums";
  albumsUi.albumScreen.hidden = next !== "album";
  if (next !== "album") albumsUi.closeViewer();
  screenChanged();
  drawOffline();
}

// ---------- home ----------

function drawHome(): void {
  const c = campaign();
  homeWhere.textContent = allDone() ? t("home.allDone") : t("home.level", { level: c.level });
  homePlayLabel.textContent = t("home.play");
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

// ---------- the board ----------

function openLevel(level: number): void {
  if (!online()) {
    waiting = level;
    drawOffline();
    return;
  }
  waiting = null;
  hideCard(winVeil);
  hideCard(restartVeil);
  if (!board || boardLevel !== level || boardWon) {
    board?.destroy();
    host.replaceChildren();
    boardWon = false;
    boardLevel = level;
    levelPill.textContent = t("board.level", { level });
    // the board reports its helpers and undo through board:changed, once at start too
    drawHelpers({ undo: 3, hint: 3, shuffle: 3 }, false);
    board = openBoard(host, level);
  }
  show("board");
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
  goHome();
});

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

on("board:changed", ({ canUndo, helpers: counts }) => drawHelpers(counts, canUndo));

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

let lastWin: { level: number; moves: number; ms: number } | null = null;

// every picture restored is the player's to keep: saved with the board's end (won), one write a board
on("picture:clear", ({ pictureId }) => restore(pictureId));

on("board:won", ({ level, moves, ms }) => {
  const n = Number(level) || boardLevel;
  boardWon = true;
  won(n);
  lastWin = { level: n, moves, ms };
  // the board fires this after its own flourish, so the card goes straight up
  showWin();
});

function showWin(): void {
  if (!lastWin || !board) return;
  const { level, moves, ms } = lastWin;
  const last = level >= levels();
  const gallery = layoutGallery(board.pictures());
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
}

/**
 * The board's pictures whole, in one to three rows, each card of a picture one
 * unit square, the unit as big as fits the card's width and a share of the
 * screen's height (never bigger than 46px, never under 18px).
 */
const GAP = 10;
function layoutGallery(pics: BoardPicture[]): HTMLElement {
  const width = Math.min(360, app.clientWidth - 32) - 44 - 4;
  const height = Math.max(120, Math.min(300, app.clientHeight * 0.34));
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

function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const hrs = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${String(m % 60).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
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
  if (up && waiting !== null) openLevel(waiting);
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
  // the round type, asked for beside this code by the boot; a moment's wait so
  // the first screen does not redraw in another font, never longer
  const face = new FontFace("Fredoka", `url(${import.meta.env.BASE_URL}fonts/fredoka-latin.woff2)`, { weight: "300 700", display: "swap" });
  document.fonts.add(face);
  await Promise.race([face.load().catch(() => undefined), new Promise((r) => setTimeout(r, 400))]);

  loadCampaign();
  onCampaign(drawHome);
  onCampaign(albumsUi.redraw);
  drawHome();
  document.body.append(app);
  mountSettings(app);
  document.getElementById("boot")?.remove();
  show("home");
  void startSound();

  if (import.meta.env.DEV) {
    (window as unknown as { __ps: unknown }).__ps = { offline: pretend, openLevel, campaign, restored: pretendRestored };
    // ?restored=id,id shows those pictures as restored in the albums (never saved)
    const fake = new URLSearchParams(location.search).get("restored");
    if (fake) pretendRestored(fake.split(",").filter(Boolean));
  }
}
