// The one place the screens meet the board. The board, its rules and its
// animations are the gameplay member's (src/board/, src/game/); the screens
// only open it, press its helpers and listen to src/events.ts.
//
// The contract, agreed with gameplay:
//   openBoard(host, level) -> BoardHandle   the board fills `host` and follows its size
//   levelCount()                            how many boards the campaign has
// and from src/events.ts: board:start, board:won { level, moves, ms },
// helper:undo|hint|shuffle { left }, board:restart, piece:move.
//
// Until the real board lands, a stand-in (stub-board.ts) keeps the loop
// playable: swap the import below and nothing else changes.

export interface BoardPicture {
  id: string;
  /** The picture's address, as an <img> takes it. */
  src: string;
  /** Its size in cards (square cells): 2 x 3 is two across, three down. */
  cols: number;
  rows: number;
}

export interface HelperCounts {
  undo: number;
  hint: number;
  shuffle: number;
}

export interface BoardHandle {
  undo(): void;
  hint(): void;
  shuffle(): void;
  restart(): void;
  /** Helpers left on this board. */
  helpers(): HelperCounts;
  /** Whether there is a move to undo (none before the first). */
  canUndo(): boolean;
  /** The board's pictures, for the win card shown whole. */
  pictures(): BoardPicture[];
  destroy(): void;
}

export { openBoard, levelCount } from "./stub-board";
