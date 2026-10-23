// A STAND-IN board, so the screens around it can be built and checked before
// the real one lands (board-api.ts swaps it out). It keeps the agreed
// contract: helper counts, undo after a move, the events the real board sends.
// Nothing here is the game's: no rules, no art. Delete it once the real board
// is wired.

import { emit } from "../events";
import type { BoardHandle, BoardPicture, HelperCounts } from "./board-api";
import CATALOGUE from "../content/pictures.json";

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
    for (const p of pictures) {
      emit("picture:complete", { pictureId: p.id, cells: [] });
      emit("picture:clear", { pictureId: p.id });
    }
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

  // four real pictures of the catalogue, so the win card and the albums show real art
  const pictures: BoardPicture[] = CATALOGUE.pictures
    .slice((level - 1) % CATALOGUE.pictures.length)
    .concat(CATALOGUE.pictures)
    .slice(0, 4)
    .map((p) => ({ id: p.id, src: `${import.meta.env.BASE_URL}${p.file}`, cols: p.cols, rows: p.rows }));


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
