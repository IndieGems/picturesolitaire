// A CAMPAIGN BOARD'S TRIES: each try at a campaign board, from its deal (a new board, or a
// Restart) to its end, for two things (the creator, 2026-10-27, from Match3Mahjong):
//
//   the player numbers   board-stats.ts: started as it is dealt; then ONE ending per try,
//                        sent as the try ends: won; lost (it ended while the board was
//                        stuck: a Restart, another board opened, or the game closed while
//                        the stuck notice stood); quit (it ended any other way). A stuck
//                        board rescued by Shuffle or Undo and then won is a win. Going home
//                        and back keeps the board in hand, so it is the same try.
//   mercy help           after 3 tries at one board that ended stuck, each later try at it
//                        starts with a free Hint, after 5 with two (Levels' steps, measured on
//                        the solver: one free Hint lifts a careful player's hard board from
//                        about 1 in 3 to 2 in 3). Announced on the board ("A free Hint for
//                        this try."), paid by the board (grantFree), never from the stock,
//                        and only for that try. A win resets the count, and so does a stuck
//                        try at another board: only the newest board counts. Never a quietly
//                        easier board (AGENTS.md).
//
// Campaign boards only: never practice, a lesson, the dev menu, the daily or a challenge
// (app.ts's `counted`). The counts follow the player (the guide save's `tries`).
//
// The day's daily (not practice: app.ts's `daily`) has tries too, for its player numbers alone
// (daily_started, daily_ended: board-stats.ts): they start and end exactly as a campaign try's,
// with no attempt count and no mercy help.

import { on } from "../events";
import { keepTries, savedTries } from "./guide-save";
import { boardStats, dailyStats, type Spent } from "./board-stats";
import type { HelperKind } from "./stock";

/** Mercy help's steps: stuck tries at one board, and the free Hints each later try starts with. */
export const MERCY: readonly { stuck: number; hints: number }[] = [
  { stuck: 5, hints: 2 },
  { stuck: 3, hints: 1 },
];

/** The free Hints a try at board `n` starts with now. */
export function mercyFor(n: number): number {
  const m = savedTries().mercy;
  if (!m || m.n !== n) return 0;
  return MERCY.find((s) => m.stuck >= s.stuck)?.hints ?? 0;
}

type Try = {
  /** A campaign board's try, or the day's daily (its numbers only: n, attempt and the rest unused). */
  lane: "campaign" | "daily";
  n: number;
  attempt: number;
  spent: Spent;
  /** The board says it cannot be won from here (board:stuck), and has not said otherwise since. */
  stuck: boolean;
  /** The try started with free Hints. */
  mercy: boolean;
  /** Free Hints still to use. */
  free: number;
  cleared: number;
  pictures: number;
  ended: boolean;
};

type Deps = {
  /** The campaign board in play, as its number, when its tries count; null otherwise. */
  counted(): number | null;
  /** The board in play is the day's daily, not practice. */
  daily(): boolean;
  /** How many pictures the board in play deals. */
  pictures(): number;
  /** The board pays `n` Hints this try (its grantFree). */
  grant(n: number): void;
  /** A try starts with `n` free Hints: say so on the board. */
  announce(n: number): void;
  /** The free Hints left changed (the Hint button's badge). */
  changed(): void;
};

export function createTries(d: Deps) {
  let cur: Try | null = null;

  /** A try begins: the board was dealt (a new board, or a Restart). */
  function begin(): void {
    end();
    const n = d.counted();
    if (n === null) {
      cur = d.daily() ? { lane: "daily", n: 0, attempt: 0, spent: { hint: 0, undo: 0, shuffle: 0 }, stuck: false, mercy: false, free: 0, cleared: 0, pictures: 0, ended: false } : null;
      if (cur) dailyStats.started();
      d.changed();
      return;
    }
    const saved = savedTries();
    const attempt = (saved.boards[n] ?? 0) + 1;
    keepTries({ ...saved, boards: { ...saved.boards, [n]: attempt } });
    const free = mercyFor(n);
    cur = { lane: "campaign", n, attempt, spent: { hint: 0, undo: 0, shuffle: 0 }, stuck: false, mercy: free > 0, free, cleared: 0, pictures: d.pictures(), ended: false };
    boardStats.started(n, attempt);
    if (free > 0) {
      d.grant(free);
      d.announce(free);
    }
    d.changed();
  }

  /** The try in hand ends (a Restart, another board, the game closed): lost if the board stood stuck, else quit. */
  function end(): void {
    if (!cur || cur.ended) return;
    cur.ended = true;
    if (cur.lane === "daily") return dailyStats.ended(cur.stuck ? "lost" : "quit");
    const left = Math.max(0, cur.pictures - cur.cleared);
    if (cur.stuck) {
      boardStats.lost(cur.n, cur.mercy, cur.attempt, left, cur.spent);
      const saved = savedTries();
      const stuck = saved.mercy?.n === cur.n ? saved.mercy.stuck + 1 : 1;
      keepTries({ ...saved, mercy: { n: cur.n, stuck } });
    } else boardStats.quit(cur.n, cur.attempt, left, cur.spent);
    cur.free = 0;
    d.changed();
  }

  // a board is dealt: a new board (once, as it is created), or a Restart (each time); the grant
  // waits a moment, so the board's handle is the new one and a restart has cleared the old grant
  on("board:start", () => queueMicrotask(begin));
  on("board:restart", () => queueMicrotask(begin));
  on("board:stuck", () => {
    if (cur && !cur.ended) cur.stuck = true;
  });
  on("board:unstuck", () => {
    if (cur && !cur.ended) cur.stuck = false;
  });
  on("picture:clear", () => {
    if (cur && !cur.ended) cur.cleared++;
  });
  // the game is closing: the try ends here, and its ending goes out now
  addEventListener("pagehide", () => {
    if (!cur || cur.ended) return;
    end();
    boardStats.flush();
  });

  return {
    begin,
    end,
    /** The board in play was won (board:solved): the try's ending, and the counts start over. */
    won(): void {
      if (!cur || cur.ended) return;
      cur.ended = true;
      if (cur.lane === "daily") return dailyStats.ended("won");
      cur.free = 0;
      boardStats.won(cur.n, cur.mercy, cur.attempt, cur.spent);
      const saved = savedTries();
      const boards = { ...saved.boards };
      delete boards[cur.n];
      keepTries({ boards, mercy: null });
      d.changed();
    },
    /** One taken from the player's stock on this try. */
    spent(k: HelperKind): void {
      if (cur && !cur.ended) cur.spent[k]++;
    },
    /** Free Hints left on this try. */
    freeHints: (): number => (cur && !cur.ended ? cur.free : 0),
    /** One free Hint used (helper:hint said free). */
    usedFree(): void {
      if (!cur || cur.free <= 0) return;
      cur.free--;
      d.changed();
    },
    /** The try in hand, for the dev server's checks. */
    current: (): Readonly<Try> | null => cur,
  };
}
