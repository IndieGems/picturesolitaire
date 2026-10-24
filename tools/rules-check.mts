// Checks the rules model (src/game/rules.ts) against the creator's rulings.
// Run: node tools/rules-check.mts   (exit code 0 = every check passed)
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EMPTY, act, arrange, cardOf, isDeadEnd, isWon, move, onBoard, pieces, picOf, random, replay, sameBoard, start,
  type Deal, type Picture, type State,
} from "../src/game/rules.ts";
import { rescue } from "../src/game/shuffle.ts";
import { solveFrom } from "../src/game/solver/index.ts";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL ${name}\n`, err);
    process.exitCode = 1;
  }
}

// Test pictures, big enough that the partial pieces below never count as finished.
const PICS: Picture[] = [
  { id: "A", cols: 2, rows: 2 },
  { id: "B", cols: 3, rows: 1 },
  { id: "C", cols: 1, rows: 3 },
  { id: "D", cols: 3, rows: 2 },
  { id: "E", cols: 2, rows: 3 },
];
// A board is drawn as rows separated by "/", one token per cell:
// "." is empty, "D21" is picture D's card at x=2, y=1.
const card = (t: string) => (t === "." ? EMPTY : cardOf(PICS, PICS.findIndex((p) => p.id === t[0]), +t[1]!, +t[2]!));
function tok(c: number): string {
  if (c === EMPTY) return ".";
  const p = PICS[picOf(c)]!;
  return `${p.id}${(c & 31) % p.cols}${((c & 31) / p.cols) | 0}`;
}
function board(text: string, stacks: string[][] = [], pictures = PICS): Deal {
  const rows = text.trim().split("/").map((r) => r.trim().split(/\s+/));
  const cols = rows[0]!.length;
  return {
    cols, rows: rows.length, pictures, seed: 7,
    board: rows.flat().map(card),
    stacks: Array.from({ length: cols }, (_, i) => (stacks[i] ?? []).map(card)),
  };
}
const begin = (text: string, stacks?: string[][]) => start(board(text, stacks)).state;
function draw(s: State): string {
  const out: string[] = [];
  for (let r = 0; r < s.rows; r++) out.push(s.board.slice(r * s.cols, (r + 1) * s.cols).map(tok).join(" "));
  return out.join(" / ");
}
const at = (s: State, col: number, row: number) => row * s.cols + col;
function go(s: State, from: [number, number], to: [number, number]) {
  const out = move(s, { from: at(s, ...from), to: at(s, ...to) });
  assert.ok(out, "move refused");
  return out;
}

check("two loose cards swap", () => {
  const s = begin("A00 C00 / C01 A11");
  assert.equal(draw(go(s, [0, 0], [1, 1]).state), "A11 C00 / C01 A00");
});

check("start settles nothing on a still board", () => {
  const s = begin("A00 C00 / C01 A11");
  assert.equal(draw(s), "A00 C00 / C01 A11");
});

check("a joined piece moves whole; the card it covers goes back to where it came from", () => {
  const s = begin("B00 B10 C00 / A00 A11 C01 / D00 D10 D20");
  assert.equal(pieces(s).list.find((p) => p.includes(0))!.length, 2);
  const { state: t, steps } = go(s, [0, 0], [1, 0]);
  assert.equal(draw(t).split(" / ")[0], "C00 B00 B10");
  assert.equal(steps[0]!.kind, "move");
  assert.equal(steps[0]!.moved.length, 2);
  assert.deepEqual(steps[0]!.displaced, [{ card: card("C00"), from: 2, to: 0 }]);
});

check("a fully covered piece moves whole when the vacated cells take its shape", () => {
  const s = begin("B00 B10 . / D00 D10 C00");
  // two 2-card pieces stacked: B00 B10 over D00 D10 (rows 0 and 1); swap them
  const { state: t } = go(s, [0, 0], [0, 1]);
  assert.equal(draw(t).split(" / ")[1], "B00 B10 C00");
  // D00 D10 went up together and are still one piece (then fell? row 0 has support: yes, row 1 is full)
  assert.equal(draw(t).split(" / ")[0], "D00 D10 .");
  assert.ok(pieces(t).list.some((p) => p.length === 2 && p[0] === 0 && p[1] === 1));
});

check("a partly covered piece splits: only the covered part moves", () => {
  const s = begin("D00 D10 D20 / A00 B00 C00");
  const { state: t, steps } = go(s, [2, 1], [2, 0]);
  assert.equal(draw(t), "D00 D10 C00 / A00 B00 D20");
  assert.equal(steps[0]!.displaced.length, 1);
});

check("a short slide shifts the covered card back along the move", () => {
  const s = begin("D00 D10 D20 A00 / C00 B00 A11 B10");
  const { state: t } = go(s, [0, 0], [1, 0]);
  assert.equal(draw(t).split(" / ")[0], "A00 D00 D10 D20");
});

check("covered cells map one-to-one onto vacated cells (random boards and moves)", () => {
  const rnd = random(99);
  const all: number[] = [];
  for (let p = 0; p < PICS.length; p++) for (let i = 0; i < PICS[p]!.cols * PICS[p]!.rows; i++) all.push(p * 32 + i);
  let tried = 0;
  for (let n = 0; n < 3000; n++) {
    const pool = [...all];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const s0: State = { cols: 4, rows: 5, pictures: PICS, board: pool.slice(0, 20), stacks: [[], [], [], []], cleared: [], moves: 0, shuffles: 0, seed: 1 };
    const from = Math.floor(rnd() * 20);
    const to = Math.floor(rnd() * 20);
    const out = move(s0, { from, to });
    if (!out) continue;
    tried++;
    const step = out.steps[0]!;
    const next = [...s0.board];
    for (const sl of step.displaced) next[sl.to] = sl.card;
    for (const sl of step.moved) next[sl.to] = sl.card;
    assert.deepEqual([...next].sort((x, y) => x - y), [...s0.board].sort((x, y) => x - y));
    // nothing is lost after settling either: board + cleared pictures hold every card
    const left = out.state.board.filter((c) => c !== EMPTY).length;
    const gone = out.state.cleared.reduce((t, p) => t + PICS[p]!.cols * PICS[p]!.rows, 0);
    assert.equal(left + gone, 20);
  }
  assert.ok(tried > 1000);
});

check("gravity is per column: a piece hanging over a gap breaks and its loose part falls", () => {
  // B00 B10 sit side by side on row 1; column 1 has nothing under B10.
  const out = start(board(". . / B00 B10 / A00 ."));
  assert.equal(draw(out.state), ". . / B00 . / A00 B10");
  assert.equal(out.steps[0]!.kind, "fall");
});

check("a move into the air: the piece lands where it can rest", () => {
  // Lift the lone C00 from the bottom of column 0 into column 1's empty top cell.
  const s = begin(". . / A00 . / C00 E00");
  const { state: t, steps } = go(s, [0, 2], [1, 0]);
  // A00 drops into the cell C00 left; C00 falls onto E00
  assert.equal(draw(t), ". . / . C00 / A00 E00");
  assert.deepEqual(steps.map((x) => x.kind), ["move", "fall"]);
});

check("a finished picture clears, cards fall, then the stacks refill left to right", () => {
  // A (2x2) is one swap from whole in columns 0-1.
  const s = begin("C00 B00 D00 / A00 A10 D10 / A11 A01 D20", [["D01"], ["D11", "D21"], ["B10"]]);
  const { state: t, steps } = go(s, [0, 2], [1, 2]);
  assert.deepEqual(steps.map((x) => x.kind).slice(0, 3), ["move", "clear", "fall"]);
  const dealt = steps.find((x) => x.kind === "deal")!;
  assert.deepEqual(dealt.deals.map((d) => d.col), [0, 1, 1]);
  assert.deepEqual(t.cleared, [0]);
  assert.deepEqual(t.stacks, [[], [], [card("B10")]]);
});

check("a picture finished by falling clears in turn, before the stacks refill", () => {
  // C (column 1, rows 1-3) is whole at the start, so it clears; B10 falls from row 0 to row 3,
  // between B00 and B20: B is whole and clears in turn. Only then do the stacks refill, from the left.
  const out = start(board("A00 B10 A10 / A01 C00 A11 / D00 C01 D10 / B00 C02 B20", [["E00"], ["E10", "E01"], ["E11"]]));
  assert.deepEqual(out.state.cleared, [2, 1]);
  const kinds = out.steps.map((x) => x.kind);
  assert.deepEqual(kinds, ["clear", "fall", "clear", "fall", "deal"]);
  assert.deepEqual(out.steps[4]!.deals.map((d) => d.col), [0, 1, 1, 2]);
});

check("won when the board and the stacks are empty", () => {
  const pics: Picture[] = [{ id: "A", cols: 2, rows: 2 }];
  const deal: Deal = { cols: 2, rows: 2, pictures: pics, seed: 3, stacks: [[2, 0], [1, 3]] };
  // the opening deal: col 0 gets card 2 (x0,y1) at the bottom, card 0 above it; col 1 gets 1 then 3:
  // rows "A00 A11 / A01 A10" -- swap the right column's two cards and A is whole.
  let s = start(deal).state;
  assert.equal(isWon(s), false);
  s = move(s, { from: 1, to: 3 })!.state;
  assert.equal(isWon(s), true);
  assert.deepEqual(s.cleared, [0]);
});

check("a dead end: a full board where no picture has all its cards", () => {
  assert.equal(isDeadEnd(begin("A00 D00 / D10 A10", [["A01"], ["A11"]])), true);
  assert.equal(isDeadEnd(begin("A00 A10 / A01 D00", [["A11"], []])), true);
  // all of A is on the board (not yet in place): not a dead end
  assert.equal(isDeadEnd(begin("A00 A11 / A01 A10 / D00 D10", [["D20"], []])), false);
});

// The Shuffle: `arrange` (rules, no solver) checks a mix; `rescue` (src/game/shuffle.ts) picks one the solver proves.
const MIX = () => begin("D00 D10 D20 A00 / C00 B00 A11 B20 / E00 C01 E11 A01", [["A10", "B10"], ["E01"], [], []]);
const swapCells = (b: number[], i: number, j: number) => { const c = [...b]; [c[i], c[j]] = [c[j]!, c[i]!]; return c; };

check("arrange plays a mix of loose cards and settles it; refuses anything else", () => {
  const s = MIX();
  const ok = arrange(s, { shuffle: true, board: swapCells(s.board, 4, 11), stacks: s.stacks });
  assert.ok(ok);
  assert.equal(ok.state.shuffles, 1);
  assert.equal(ok.steps[0].kind, "shuffle");
  assert.equal(ok.steps[0].slides.length, 2);
  // a joined card moved (D00 is joined to D10)
  assert.equal(arrange(s, { shuffle: true, board: swapCells(s.board, 0, 4), stacks: s.stacks }), null);
  // stack cards reordered among themselves
  assert.equal(arrange(s, { shuffle: true, board: s.board, stacks: [[s.stacks[0][1], s.stacks[0][0]], s.stacks[1], [], []] }), null);
  // a card twice, one missing
  const twice = [...s.board]; twice[4] = twice[11];
  assert.equal(arrange(s, { shuffle: true, board: twice, stacks: s.stacks }), null);
  // a stack that changed size, and nothing changed at all
  assert.equal(arrange(s, { shuffle: true, board: s.board, stacks: [[s.stacks[0][0]], s.stacks[1], [], []] }), null);
  assert.equal(arrange(s, { shuffle: true, board: s.board, stacks: s.stacks }), null);
});

check("arrange lets loose cards trade with stack cards, each taking the other's place", () => {
  const s = MIX();
  const b = [...s.board];
  const st = s.stacks.map((x) => [...x]);
  [b[4], st[0][1]] = [st[0][1], b[4]]; // C00 into stack 0 place 1, B10 out onto the board
  const o = arrange(s, { shuffle: true, board: b, stacks: st });
  assert.ok(o);
  const step = o.steps[0];
  assert.deepEqual(step.toStacks.map((x) => [x.col, x.at, x.cell]), [[0, 1, 4]]);
  assert.deepEqual(step.fromStacks.map((x) => [x.col, x.at, x.cell]), [[0, 1, 4]]);
  // a stack card may only be swapped for a card that was loose (D00 is joined)
  const b2 = [...s.board];
  const st2 = s.stacks.map((x) => [...x]);
  [b2[0], st2[0][1]] = [st2[0][1], b2[0]];
  assert.equal(arrange(s, { shuffle: true, board: b2, stacks: st2 }), null);
});

// real deals for the rescue: the campaign's boards (src/content/levels/campaign.json)
const CAMPAIGN = JSON.parse(readFileSync(new URL("../src/content/levels/campaign.json", import.meta.url), "utf8")).levels.map(
  (l) => ({ cols: l.cols, rows: l.rows, pictures: l.pictures, stacks: l.stacks, seed: l.seed }),
);
const loosen = (s: State) => pieces(s).list.filter((p) => p.length === 1).map((p) => p[0]!);

check("rescue on a board that can be won mixes the loose cards only, into a board the solver proves", () => {
  const s = start(CAMPAIGN[4]).state;
  const r = rescue(s);
  const again = rescue(s);
  assert.ok(r && again);
  assert.deepEqual(r.action, again.action);
  assert.equal(r.swapped, 0);
  assert.deepEqual(r.action.stacks, s.stacks);
  const loose = new Set(loosen(s));
  s.board.forEach((c, i) => loose.has(i) || assert.equal(r.action.board[i], c));
  assert.ok(isWon(r.state) || "win" in solveFrom(r.state, 20_000));
  assert.ok(sameBoard(replay(CAMPAIGN[4], [r.action]), r.state));
});

check("rescue on a dead end swaps in stack cards, the solver proves it, and a replay plays it back", () => {
  let found = 0;
  for (let n = 0; n < CAMPAIGN.length && found < 4; n++) {
    // a dead end from this board's opening: trade cards of every picture that is all on the board for stack cards
    const opened = start(CAMPAIGN[n]).state;
    const board = [...opened.board];
    const stacks = opened.stacks.map((x) => [...x]);
    for (let guard = 0; guard < 60 && !isDeadEnd({ ...opened, board, stacks }); guard++) {
      const counts = onBoard({ ...opened, board, stacks });
      const p = counts.findIndex((k, pic) => k > 0 && k === CAMPAIGN[n].pictures[pic].cols * CAMPAIGN[n].pictures[pic].rows);
      const cell = board.findIndex((c) => c !== EMPTY && picOf(c) === p);
      const col = stacks.findIndex((st) => st.some((c) => picOf(c) !== p));
      if (cell < 0 || col < 0) break;
      const at2 = stacks[col].findIndex((c) => picOf(c) !== p);
      [board[cell], stacks[col][at2]] = [stacks[col][at2], board[cell]];
    }
    const deal = { ...CAMPAIGN[n], board, stacks };
    const s = start(deal).state;
    if (!isDeadEnd(s)) continue;
    found++;
    const r = rescue(s);
    assert.ok(r, `board ${n + 1}: no rescue from a dead end`);
    assert.ok(r.swapped >= 1);
    assert.ok(isWon(r.state) || "win" in solveFrom(r.state, 20_000));
    assert.ok(sameBoard(replay(deal, [r.action]), r.state));
    // a recorded game survives JSON, shuffle and all
    assert.ok(sameBoard(replay(deal, JSON.parse(JSON.stringify([r.action]))), r.state));
  }
  assert.ok(found >= 2, `only ${found} dead ends made`);
});

check("a move that leaves the board is refused; any move that fits is not", () => {
  const s = begin("B00 B10 C00 / A00 A11 C01");
  assert.equal(move(s, { from: at(s, 0, 0), to: at(s, 2, 0) }), null);
  assert.ok(move(s, { from: at(s, 1, 0), to: at(s, 2, 1) }));
  assert.equal(move(s, { from: 0, to: 0 }), null);
});

check("replay is deterministic and a state survives JSON", () => {
  const deal = board("D00 A00 B00 C00 / E00 A11 C01 B10 / D21 E11 A10 D10", [["A01", "E01"], ["C02"], ["B20", "E10"], ["D20", "E02", "D01", "E12", "D11"]]);
  let s = start(deal).state;
  const tried = [{ from: 0, to: 5 }, { from: 3, to: 8 }, { from: 11, to: 1 }, { from: 2, to: 9 }];
  const played: any[] = [];
  for (const a of tried) {
    const o = act(s, a);
    if (o) {
      played.push(a);
      s = o.state;
    }
  }
  assert.ok(played.length >= 3);
  const again = replay(JSON.parse(JSON.stringify(deal)), played);
  assert.ok(sameBoard(again, s));
  assert.equal(again.moves, s.moves);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});

console.log(`${passed} checks passed${process.exitCode ? "; some FAILED" : ""}`);
