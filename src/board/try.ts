// The board's test bench (src/board/try.html): the board alone in a host box,
// with plain helper buttons and every event logged. Dev only; never built.
import { openBoard } from "./index.ts";
import { on, type GameEvents } from "../events";
import { lessonLevel, level as levelOf, loadChallenges, loadSouvenir, toLevel, type Level, type Stored } from "../game/levels.ts";
import EXPERIMENTS from "../content/levels/experiments.json";
import { TUNING } from "./tuning.ts";

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
// ?shownext=0: the stacks as each level has them (backs only), not the trial's next card face up
if (q.has("shownext")) TUNING.showNext = q.get("shownext") !== "0";
let level: Level | undefined = ch ? (await loadChallenges()).find((c) => c.id === ch) : undefined;
// ?x=x02: an experiment board (the dev menu's)
const x = q.get("x");
if (x) {
  const all = (EXPERIMENTS as unknown as { levels: Stored[] }).levels;
  const i = all.findIndex((l) => l.id === x);
  if (i >= 0) level = toLevel(all[i]!, i + 1);
}
// ?lesson=shuffle: a lesson's staged board (src/content/levels/lessons.json)
const lesson = q.get("lesson");
if (lesson === "shuffle") level = (await lessonLevel(lesson)) ?? undefined;
// ?souvenir=t1: that trip's Souvenir board (src/content/levels/souvenirs.json)
const souvenir = q.get("souvenir");
if (souvenir) level = (await loadSouvenir(souvenir)) ?? undefined;
// ?dest=dest-grand-canyon&crop=2,2: the board's first 2x2 picture made that destination's window
const dest = q.get("dest");
if (dest) {
  const base = level ?? levelOf(Number(q.get("level") ?? 1));
  const k = base.deal.pictures.findIndex((p) => p.cols === 2 && p.rows === 2);
  const [c, r] = (q.get("crop") ?? "0,0").split(",").map(Number);
  if (k >= 0) {
    level = {
      ...base,
      deal: { ...base.deal, pictures: base.deal.pictures.map((p, j) => (j === k ? { ...p, id: dest } : p)) },
      destination: { id: dest, crop: [c ?? 0, r ?? 0] },
    };
  }
}
// ?item=1: the board's first 2x2 picture made the day's suitcase item (its id the picture's)
if (q.has("item")) {
  const base = level ?? levelOf(Number(q.get("level") ?? 1));
  const p = base.deal.pictures.find((p) => p.cols === 2 && p.rows === 2 && p.id !== base.destination?.id);
  if (p) level = { ...base, item: { id: p.id } };
}
const board = openBoard(host, level ?? Number(q.get("level") ?? 1));
const log: string[] = [];
const names: (keyof GameEvents)[] = ["piece:lift", "piece:cancel", "piece:move", "piece:merge", "piece:split", "picture:complete", "picture:clear", "cards:fall", "stack:deal", "stack:nope", "column:land", "helper:undo", "helper:hint", "helper:shuffle", "board:restart", "board:won", "board:solved", "board:start", "board:changed", "board:stuck", "board:unstuck", "helper:refused", "destination:reveal", "destination:done", "suitcase:item"];
for (const n of names) on(n, (p) => log.push(`${n} ${JSON.stringify(p)}`));
for (const k of ["undo", "hint", "shuffle", "restart"] as const) {
  const b = document.createElement("button");
  b.textContent = k;
  b.onclick = () => board[k]();
  bar.append(b);
}
Object.assign(window, { board, log });
