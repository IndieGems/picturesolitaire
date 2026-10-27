// THE BOARDS' PLAYER NUMBERS (the creator, 2026-10-27, from Match3Mahjong; the events are
// Server's, declared in the game config: gem-backend-game-config.yaml, analytics_events). Sent
// for campaign boards only, never for practice, a lesson, the dev menu, the daily or a
// challenge (tries.ts decides which try counts, and when it ends):
//
//   board_started  board                attempt
//   board_won      board, mercy         attempt, hints, undos, shuffles
//   board_lost     board, mercy         attempt, pictures_left, helpers
//   board_quit     board                attempt, pictures_left, helpers
//
// The SDK files every string as a dimension and every number as a measure (its track() splits
// them by type, whatever the config says), so a dimension always goes as a string: `board` is
// the campaign number written out ("7", 1-1000), never the number 7, which would go as a
// measure and the event be refused for a missing dimension (QA, 2026-10-27). Every dimension
// must be sent. `mercy` says whether the try started with free Hints; the helpers counted are
// only those taken from the player's stock (a mercy Hint or a lesson's use is not). Levels
// reads tries per win as started over won, and quits by board.
//
// track() only queues: the SDK sends on a timer and on the way out of the page. Unframed
// (the play-test tool) nothing is sent; the dev server keeps the last events for checks
// (__ps.stats).

import { gem } from "../gem";
import type { HelperKind } from "./stock";

export type Spent = Record<HelperKind, number>;

/** The last events, for the dev server's checks (never in a build). */
export const recentStats: { name: string; props: Record<string, string | number> }[] = [];

function send(name: string, n: number, props: Record<string, string | number>): void {
  const board = Math.round(n);
  if (!(board >= 1 && board <= 1000)) return; // outside the declared range: refused anyway
  // a dimension, so a string (see above)
  props = { board: String(board), ...props };
  gem.analytics.track(name, props);
  if (import.meta.env.DEV) {
    recentStats.push({ name, props });
    if (recentStats.length > 40) recentStats.shift();
  }
}

const all = (s: Spent): number => s.hint + s.undo + s.shuffle;
const yesNo = (b: boolean): string => (b ? "yes" : "no");

export const boardStats = {
  started(board: number, attempt: number): void {
    send("board_started", board, { attempt });
  },
  won(board: number, mercy: boolean, attempt: number, spent: Spent): void {
    send("board_won", board, { mercy: yesNo(mercy), attempt, hints: spent.hint, undos: spent.undo, shuffles: spent.shuffle });
  },
  lost(board: number, mercy: boolean, attempt: number, picturesLeft: number, spent: Spent): void {
    send("board_lost", board, { mercy: yesNo(mercy), attempt, pictures_left: picturesLeft, helpers: all(spent) });
  },
  quit(board: number, attempt: number, picturesLeft: number, spent: Spent): void {
    send("board_quit", board, { attempt, pictures_left: picturesLeft, helpers: all(spent) });
  },
  /** The page is going: send what is queued now. */
  flush(): void {
    void gem.analytics.flush().catch(() => undefined);
  },
};
