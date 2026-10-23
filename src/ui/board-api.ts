// The one place the screens meet the board. The board, its rules and its
// animations are the gameplay member's (src/board/); the screens only open it,
// press its helpers and listen to src/events.ts.
//
// The contract, agreed with gameplay:
//   openBoard(host, level) -> BoardHandle   level from 1; the board fills `host` (stacks and
//                                           grid only) and follows its size
//   levelCount()                            how many boards the campaign has
// and from src/events.ts: board:start, board:changed { canUndo, helpers } (at open and after
// every settle), board:stuck { doomed }, board:won { level, moves, ms } (after the last
// picture's flourish), picture:clear { pictureId }, board:restart.
// A helper pressed when it cannot act does nothing and sends nothing; restart() is at once
// (the screens ask first).

export { openBoard, levelCount } from "../board";
export type { BoardHandle, BoardPicture, HelperCounts } from "../board";
