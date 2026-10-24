// The board's test bench (src/board/try.html): the board alone in a host box,
// with plain helper buttons and every event logged. Dev only; never built.
import { openBoard } from "./index.ts";
import { on, type GameEvents } from "../events";
import { loadChallenges } from "../game/levels.ts";

const q = new URLSearchParams(location.search);
const host = document.getElementById("host")!;
const bar = document.getElementById("bar")!;
// ?hidden=ms: open the board in a box not on screen yet, as the screens may
if (q.has("hidden")) {
  document.getElementById("app")!.style.display = "none";
  setTimeout(() => (document.getElementById("app")!.style.display = ""), Number(q.get("hidden")) || 800);
}
// ?challenge=ch16: a challenge board (any size) instead of a campaign one
const ch = q.get("challenge");
const level = ch ? (await loadChallenges()).find((c) => c.id === ch) : undefined;
const board = openBoard(host, level ?? Number(q.get("level") ?? 1));
const log: string[] = [];
const names: (keyof GameEvents)[] = ["piece:lift", "piece:cancel", "piece:move", "piece:merge", "piece:split", "picture:complete", "picture:clear", "cards:fall", "stack:deal", "helper:undo", "helper:hint", "helper:shuffle", "board:restart", "board:won", "board:solved", "board:start", "board:changed", "board:stuck"];
for (const n of names) on(n, (p) => log.push(`${n} ${JSON.stringify(p)}`));
for (const k of ["undo", "hint", "shuffle", "restart"] as const) {
  const b = document.createElement("button");
  b.textContent = k;
  b.onclick = () => board[k]();
  bar.append(b);
}
Object.assign(window, { board, log });
