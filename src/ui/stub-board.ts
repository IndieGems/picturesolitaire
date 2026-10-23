// A STAND-IN board, so the screens around it can be built and checked before
// the real one lands (board-api.ts swaps it out). It keeps the agreed
// contract: helper counts, undo after a move, the events the real board sends.
// Nothing here is the game's: no rules, no art. Delete it once the real board
// is wired.

import { emit } from "../events";
import type { BoardHandle, BoardPicture, HelperCounts } from "./board-api";

const LEVELS = 12;
const SHADES = ["#c98b6b", "#8fb0c9", "#d9c27a", "#9cc49a", "#c79bc4", "#e0a07a"];

export function levelCount(): number {
  return LEVELS;
}

export function openBoard(host: HTMLElement, level: number): BoardHandle {
  let helpers: HelperCounts = { undo: 3, hint: 3, shuffle: 3 };
  let moves = 0;
  let started = performance.now();
  let won = false;

  const root = document.createElement("div");
  root.className = "stub-board";
  root.style.cssText =
    "position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,var(--cell));grid-auto-rows:var(--cell);gap:8px;padding:10px 14px 56px;box-sizing:border-box;align-content:center;justify-content:center";
  // square cells, as many as fit: the board follows its host's size
  const fit = new ResizeObserver(() => {
    const w = (host.clientWidth - 28 - 24) / 4;
    const h = (host.clientHeight - 66 - 32) / 5;
    root.style.setProperty("--cell", `${Math.max(20, Math.floor(Math.min(w, h)))}px`);
  });
  fit.observe(host);
  const cells: HTMLElement[] = [];
  for (let i = 0; i < 20; i++) {
    const cell = document.createElement("div");
    cell.style.cssText = `border-radius:14px;border:5px solid #eef3f8;box-shadow:0 4px 8px rgba(0,0,0,.35);background:${SHADES[(i * 7 + level) % SHADES.length]}`;
    cell.addEventListener("click", () => {
      if (won) return;
      moves++;
      cell.style.background = SHADES[(moves + i) % SHADES.length]!;
      emit("piece:move", { cards: 1, displaced: 1 });
      changed();
    });
    cells.push(cell);
    root.append(cell);
  }
  // the stand-in's own way to finish a board, for checking the win card
  const solve = document.createElement("button");
  solve.type = "button";
  solve.textContent = "Solve (stand-in)";
  solve.className = "stub-solve";
  solve.style.cssText = "position:absolute;left:50%;bottom:6px;transform:translateX(-50%);min-height:44px;padding:0 16px;border-radius:22px;border:0;background:#fff8;font:inherit;font-size:14px";
  solve.addEventListener("click", () => {
    if (won) return;
    won = true;
    changed();
    emit("board:won", { level: String(level), moves: Math.max(moves, 17), ms: Math.round(performance.now() - started) + 92_000 });
  });
  root.append(solve);
  host.append(root);
  queueMicrotask(() => {
    emit("board:start", { level: String(level) });
    changed();
  });

  // what the buttons draw from: after every move, helper and restart, and once at start
  const changed = () => emit("board:changed", { canUndo: moves > 0 && !won, helpers });

  const spend = (k: keyof HelperCounts) => {
    if (helpers[k] <= 0 || won) return false;
    helpers = { ...helpers, [k]: helpers[k] - 1 };
    return true;
  };

  const pictures: BoardPicture[] = [
    { id: "a", src: picture("#c98b6b", "#f3d1a6"), cols: 2, rows: 2 },
    { id: "b", src: picture("#8fb0c9", "#e6eef5"), cols: 3, rows: 2 },
    { id: "c", src: picture("#9cc49a", "#e3f0c9"), cols: 2, rows: 3 },
    { id: "d", src: picture("#c79bc4", "#f2dcef"), cols: 1, rows: 2 },
  ];

  return {
    undo() {
      if (moves > 0 && spend("undo")) {
        moves--;
        emit("helper:undo", { left: helpers.undo });
        changed();
      }
    },
    hint() {
      if (spend("hint")) {
        const c = cells[(moves * 3) % cells.length]!;
        c.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], 500);
        emit("helper:hint", { left: helpers.hint });
        changed();
      }
    },
    shuffle() {
      if (spend("shuffle")) {
        emit("helper:shuffle", { left: helpers.shuffle });
        changed();
      }
    },
    restart() {
      helpers = { undo: 3, hint: 3, shuffle: 3 };
      moves = 0;
      won = false;
      started = performance.now();
      emit("board:restart", {});
      changed();
    },
    helpers: () => helpers,
    canUndo: () => moves > 0 && !won,
    pictures: () => pictures,
    destroy() {
      fit.disconnect();
      root.remove();
    },
  };
}

/** A plain two-tone stand-in picture, as a data address. */
function picture(a: string, b: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" preserveAspectRatio="none"><rect width="10" height="10" fill="${b}"/><circle cx="6" cy="4" r="3" fill="${a}"/><rect y="7" width="10" height="3" fill="${a}" opacity=".6"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
