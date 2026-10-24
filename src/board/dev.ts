// The dev menu's hold on an open board (the creator's tool; the screens build
// the menu, src/ui/). It drives the board the way a player would: it plays the
// level's own proved line through the board's ordinary move, so the rules, the
// finish, board:solved and board:won are exactly what play gives. Nothing here
// changes the rules or anything the win checker replays. Practice gating (no
// claim, no Coins, no progress) is the screens'.
//
// Only the board imports this, and only under `import.meta.env.MODE !==
// "release"`, so a release build (`vite build --mode release`) leaves the
// whole file out. Keep the names winNow and setEndless: the screens' release
// check looks for them in the built files.

import type { Level } from "../game/levels.ts";
import type { Move } from "../game/rules.ts";
import { setTimeScale, timeScaleNow, wait } from "./pace.ts";

/** What the dev menu can do with the board in play (agreed with the UI member). */
export interface BoardDev {
  /**
   * Restart, then play the board's proved line, each move as soon as the last
   * has settled plus `gapMs` (default 150, board time). The finish, board:solved
   * and board:won happen as in play. True once the line is played; false when
   * refused (mid-finish, another run going, the board restarted or moved under
   * it, or closed). The player's hand is held while it plays.
   */
  winNow(gapMs?: number): Promise<boolean>;
  /**
   * One move of the proved line: the Hint's ghost shows it, then it is played.
   * While the board is still on the proved line from the deal (the player's
   * own moves may be the line's), it carries on; after anything else (a move
   * off the line, an undo, a shuffle, a won board) it restarts from the deal
   * first and says so (`restarted`).
   */
  step(): Promise<DevStep>;
  /**
   * Endless helpers: while on, Undo, Hint and Shuffle never run down.
   * Switching it on tops this board's back to the starting counts (3 each),
   * and board:changed keeps reporting those. Global: it holds for every board
   * until switched off.
   */
  setEndless(on: boolean): void;
  endless(): boolean;
  /**
   * Animation speed, global: 0.25 is quarter speed (slow motion), 2 twice as
   * fast; clamped to 0.1 to 4. Every board animation follows it, read every
   * frame, and the ms that piece:move and cards:fall report are real time.
   */
  setSpeed(x: number): void;
  speed(): number;
  /** A plain read of the board. */
  info(): BoardInfo;
}

export type DevStep =
  | { ok: true; played: number; of: number; restarted: boolean; won: boolean }
  | { ok: false; reason: "busy" | "finishing" | "no-line" | "closed" };

export interface BoardInfo {
  /** The level's id ("c01", "ch16", a daily's), and what the events call it ("1", or the id). */
  id: string;
  level: string;
  cols: number;
  rows: number;
  peek: number;
  /** A challenge's or a daily's par; null for a campaign board. */
  par: number | null;
  pictures: { id: string; cols: number; rows: number; shape: string }[];
  /** Cards in each stack at the deal, left to right. */
  stacks: number[];
  /** Moves in the level's proved line. */
  lineMoves: number;
  /** The level designer's notes, as stored in the level file (null when it has none). */
  axes: Record<string, unknown> | null;
  /** Moves made so far on this board. */
  moves: number;
}

/** What the board lends the dev menu: reads of its state and its own ways to move. */
export interface DevBoard {
  level: Level & { par?: number };
  name: string;
  moves(): number;
  /** The moves played since the deal (undone ones gone), or null when a shuffle is among them. */
  played(): Move[] | null;
  busy(): boolean;
  won(): boolean;
  /** Solved, the finish still playing: the win stands, nothing may restart it. */
  finishing(): boolean;
  closed(): boolean;
  /** Deal again and wait until the deal has played; false when refused. */
  restart(): Promise<boolean>;
  /** Lift the piece at m.from and play m, as a tap-tap would; resolves once it has settled. */
  play(m: Move): Promise<boolean>;
  /** The Hint's ghost for m (free: no helper spent). */
  ghost(m: Move): void;
  /** Hold the player's hand off the board (true) or give it back. */
  hold(on: boolean): void;
  /** Endless helpers: the board's own switch, and its top-up. */
  setEndless(on: boolean): void;
  endless(): boolean;
  hintMs(): number;
}

const sameMove = (a: Move, b: Move) => a.from === b.from && a.to === b.to;
const later = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function makeDev(b: DevBoard): BoardDev {
  const line = b.level.line;
  let running = false;
  /** The board settled (a real-time poll: it draws nothing while it waits). */
  const idle = async () => {
    while (b.busy() && !b.closed()) await later(40);
  };
  /** Run one dev action at a time, with the player's hand held. */
  async function driving<T>(fn: () => Promise<T>): Promise<T> {
    running = true;
    b.hold(true);
    try {
      return await fn();
    } finally {
      running = false;
      b.hold(false);
    }
  }

  return {
    winNow(gapMs = 150) {
      if (running || b.finishing() || b.closed()) return Promise.resolve(false);
      return driving(async () => {
        await idle();
        if (b.closed() || !(await b.restart())) return false;
        for (let i = 0; i < line.length; i++) {
          await idle();
          const p = b.played();
          // the board was undone, restarted or moved under it: stop, never play on blind
          if (b.closed() || !p || p.length !== i) return false;
          if (i) await wait(Math.max(0, gapMs));
          if (!(await b.play(line[i]!))) return false;
        }
        return true;
      });
    },

    step() {
      if (running) return Promise.resolve({ ok: false, reason: "busy" } as DevStep);
      if (b.closed()) return Promise.resolve({ ok: false, reason: "closed" } as DevStep);
      if (b.finishing()) return Promise.resolve({ ok: false, reason: "finishing" } as DevStep);
      if (!line.length) return Promise.resolve({ ok: false, reason: "no-line" } as DevStep);
      return driving(async (): Promise<DevStep> => {
        await idle();
        let p = b.played();
        const onLine = !b.won() && !!p && p.length < line.length && p.every((m, i) => sameMove(m, line[i]!));
        let restarted = false;
        if (!onLine) {
          if (!(await b.restart())) return { ok: false, reason: b.closed() ? "closed" : "finishing" };
          restarted = true;
          await idle();
          p = [];
        }
        const i = p!.length;
        const m = line[i]!;
        // the Hint's ghost shows the move, lands and holds; then it is played
        b.ghost(m);
        await wait(b.hintMs() * 0.8);
        if (b.closed()) return { ok: false, reason: "closed" };
        if (!(await b.play(m))) return { ok: false, reason: "busy" };
        return { ok: true, played: i + 1, of: line.length, restarted, won: b.won() };
      });
    },

    setEndless: (on) => b.setEndless(on),
    endless: () => b.endless(),
    setSpeed: (x) => setTimeScale(x),
    speed: () => timeScaleNow(),

    info() {
      const { level: l } = b;
      return {
        id: l.id,
        level: b.name,
        cols: l.deal.cols,
        rows: l.deal.rows,
        peek: l.peek,
        par: typeof l.par === "number" ? l.par : null,
        pictures: l.deal.pictures.map((p) => ({ id: p.id, cols: p.cols, rows: p.rows, shape: `${p.cols}x${p.rows}` })),
        stacks: l.deal.stacks.map((s) => s.length),
        lineMoves: line.length,
        axes: l.axes ?? null,
        moves: b.moves(),
      };
    },
  };
}
