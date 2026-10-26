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
   * `clue`: a mystery's clue (its catalogue entry has a `case`, or the
   * screens gave its words: setClueWords), held long enough to read; Sound
   * plays "Clue found", UI shows its sentence.
   */
  "destination:reveal": { id: string; name: string; place: string; again: boolean; clue?: true };
  /** The postcard has gone (or was skipped); the board's cards fall and refill next. */
  "destination:done": { id: string };
  /** Cards fell into gaps. `ms`: from now until the first of them lands. */
  "cards:fall": { cards: number; ms?: number };
  /** A stack dealt a card into its column. `left` is what the stack still holds. */
  "stack:deal": { col: number; left: number };
  /** Helpers. `left` is how many remain on this board. */
  "helper:undo": { left: number };
  "helper:hint": { left: number };
  "helper:shuffle": { left: number };
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
   * start): what the helper buttons should show now, and `moves` made so far
   * (Undo takes one back; a shuffle is not a move).
   */
  "board:changed": { canUndo: boolean; helpers: { undo: number; hint: number; shuffle: number }; moves: number };
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
  /**
   * A mystery case's accusation was judged (UI, once per accusation, as the
   * result shows; docs/mystery-pilot.md). `right`: the killer was named;
   * `gold`: named with the proving picture, and the gold "case closed" stamp
   * lands. Sound plays "Case closed" or "Not quite".
   */
  "case:verdict": { right: boolean; gold: boolean };
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
