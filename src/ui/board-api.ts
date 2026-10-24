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
//
// The dev menu (src/board/dev.ts has the details): handle.dev, undefined in a release
// build (`vite build --mode release`, which drops it):
//   dev.winNow(gapMs?)     restart, then play the board's proved line; the finish and
//                          board:solved / board:won happen as in play
//   dev.step()             the next move of the proved line, the Hint's ghost first;
//                          restarts from the deal when the board has left the line
//   dev.setEndless(on)     Undo, Hint, Shuffle never run down (every board, until off)
//   dev.setSpeed(x)        every board animation at x times speed (0.25 slow motion)
//   dev.info()             id, size, pictures and shapes, stacks, peek, par, line, axes
// None of it changes the rules or what the win checker replays; practice gating is ours.

export { openBoard, levelCount } from "../board";
export type { BoardDev, BoardHandle, BoardInfo, BoardPicture, DevStep, HelperCounts } from "../board";
