// The game's event bus: how the board tells the rest of the game what just
// happened, so sound, the HUD and screens react without the board knowing
// about them. The board EMITS; sound (src/audio/) and the screens (src/ui/)
// LISTEN. Owned by the gameplay member: add an event here when the board does
// something new others may want to hear about, and say so to the team.
//
// Payloads stay small and plain (ids, counts, cell lists), never DOM nodes.

import type { Action } from "./game/rules.ts";

export type Cell = { col: number; row: number };

export interface GameEvents {
  /** A card or merged piece was picked up (drag start or first tap). */
  "piece:lift": { cards: number };
  /** A lifted piece was put back where it was (cancelled drag, second tap on itself). */
  "piece:cancel": Record<string, never>;
  /**
   * A move landed: `cards` moved, `displaced` cards slid back to where it came
   * from. `ms`: from now until the moved piece touches down.
   */
  "piece:move": { cards: number; displaced: number; ms?: number };
  /** Correct neighbours touched and joined; `size` is the joined piece's card count. */
  "piece:merge": { pictureId: string; size: number };
  /** A merged piece came apart (covered by a move, or broken by gravity). */
  "piece:split": { pictureId: string };
  /** A picture is whole: shown complete before it leaves. */
  "picture:complete": { pictureId: string; cells: Cell[] };
  /** The completed picture left the board. */
  "picture:clear": { pictureId: string };
  /**
   * A board's destination picture was finished and its postcard (the whole
   * picture, the size of the board) is fully open over the board: UI shows
   * the place's name on it, Sound its fanfare. English `name` and `place`,
   * from the picture catalogue. `again`: a repeat on this opening of the
   * board (after Undo or a restart), the short version. Always followed by
   * one destination:done, at once when the board closes or restarts.
   */
  "destination:reveal": { id: string; name: string; place: string; again: boolean };
  /** The postcard has gone (or was skipped); the board's cards fall and refill next. */
  "destination:done": { id: string };
  /**
   * The day's suitcase item (a daily board's item picture, docs/daily-suitcase.md)
   * was finished: sent once its grow and hold are done, at its fullest, the
   * same moment as its picture:clear, on every finish (practice and replays
   * too: whether it packs is the screens' and the server's). `id`: the item's
   * id from the level data. `rect`: the picture's box on screen then, in
   * viewport CSS px. `url`: the copy the board drew ("" if none had loaded).
   * `again`: finished before on this opening of the board (after Undo or a
   * restart). No pause, no reveal: the board shrinks it away as any picture
   * and the cards fall, unless a handler calls board.takeItem() during this
   * event, which hides the board's own piece at once so the screens' copy is
   * the one that leaves.
   */
  "suitcase:item": { id: string; rect: { x: number; y: number; w: number; h: number }; url: string; again: boolean };
  /** Cards fell into gaps. `ms`: from now until the first of them lands. */
  "cards:fall": { cards: number; ms?: number };
  /** A stack dealt a card into its column. `left` is what the stack still holds. */
  "stack:deal": { col: number; left: number };
  /** A press on a stack (its top card or its edges): it shakes "no", nothing is picked up. Once a press. */
  "stack:nope": { col: number };
  /**
   * After a finished picture's clear, a column's cards have all landed (those
   * that fell and those its stack dealt), sent once per column where any did,
   * as its last one touches down, so in landing order (the refill's, left to
   * right). `cards`: how many landed in it. Never for a move's own drop, a
   * shuffle, the opening deal, Undo or Restart.
   */
  "column:land": { col: number; cards: number };
  /**
   * A helper acted (sent inside the board's undo() / hint() / shuffle() call).
   * The player's stock is the screens' to count and spend (creator,
   * 2026-10-27): they spend one here unless `lesson` is true (board.lesson()'s
   * next use, or the guide's Hint) or `free` is (a use board.grantFree() gave
   * this try: mercy help), which spend nothing.
   */
  "helper:undo": { lesson: boolean; free: boolean };
  "helper:hint": { lesson: boolean; free: boolean };
  "helper:shuffle": { lesson: boolean; free: boolean };
  /**
   * A helper was pressed and could do nothing, so none was spent. Shuffle: no
   * loose card to mix, or no mix the solver could prove winnable. Hint: the
   * solver found no winning line within its budget, which proves nothing, so
   * say "no hint found", never "can't be won".
   */
  "helper:refused": { helper: "shuffle" | "hint" };
  /** The board was started over. */
  "board:restart": Record<string, never>;
  /**
   * The board settled after a move, undo, shuffle or restart (and once at
   * start): whether Undo has a move to take back, and `moves` made so far
   * (Undo takes one back; a shuffle is not a move). The helpers' counts are
   * the screens' own (the player's stock), never the board's.
   */
  "board:changed": { canUndo: boolean; moves: number };
  /**
   * The board can no longer be won, PROVED (never on a guess), sent once the
   * moment it becomes so (after the settle of the move that lost it): `doomed`
   * false is the plain dead end (the board is full and no picture has all its
   * cards on it), true the solver's proof. No move can make it winnable again;
   * a Shuffle's rescue mix, Undo or Restart can. Followed by board:unstuck
   * when one does.
   */
  "board:stuck": { doomed: boolean };
  /** A stuck board can be won again (an Undo, a Shuffle's mix, a Restart); sent once, only after board:stuck. */
  "board:unstuck": Record<string, never>;
  /**
   * Every picture restored: the board is won. `level`: the campaign number,
   * or the board's id for any other board. `line`: the actions as played,
   * undone ones left out, shuffles included with the mix they made; the rules
   * replay it from the deal to this win (replay in src/game/rules.ts), and
   * `moves` is the number of moves in it.
   */
  "board:won": { level: string; moves: number; ms: number; line: Action[] };
  /**
   * The board is won, said the moment the rules say so: right after the
   * winning move (or a shuffle whose clear empties the board), BEFORE the
   * finish plays. The same payload as board:won, which follows after the
   * finish for the win card. Send anything that must not be lost (the win
   * claim, saved progress) on this one: a game closed during the finish has
   * still said it.
   */
  "board:solved": { level: string; moves: number; ms: number; line: Action[] };
  /** A board opened and play can begin. */
  "board:start": { level: string };
  /**
   * A hard or super hard board's banner just appeared over it (UI, once per
   * opening of a marked board; never on restart). Sound plays its sting.
   */
  "board:mark": { mark: "hard" | "super" };
  /**
   * A trip was finished and its stamp just landed in the passport (UI, once
   * per trip, when progress first passes its last board; never on a replay).
   * `trip`: its id in src/content/levels/trips.json ("t1"). Sound plays the
   * stamp's thud.
   */
  "trip:stamp": { trip: string };
  /** Any button pressed in the interface (for its click sound). */
  "ui:press": { id: string };
  /**
   * A milestone card just went up, the moment a player plays for (its own sound;
   * the UI member emits it). `id`: "guide" for the first board's finish.
   */
  "milestone:show": { id: string };
}

type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

const handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

/** Listen for `type`. Returns the unsubscribe. */
export function on<K extends keyof GameEvents>(type: K, handler: Handler<K>): () => void {
  let set = handlers.get(type);
  if (!set) handlers.set(type, (set = new Set()));
  set.add(handler as Handler<never>);
  return () => set!.delete(handler as Handler<never>);
}

/** Tell every listener of `type`. A listener that throws never stops the game. */
export function emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
  const set = handlers.get(type);
  if (!set) return;
  for (const handler of set) {
    try {
      (handler as Handler<K>)(payload);
    } catch (err) {
      console.error(`[events] ${String(type)} listener failed`, err);
    }
  }
}
