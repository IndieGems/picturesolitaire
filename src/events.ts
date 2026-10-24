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
   * The player is stuck: `doomed` false means a dead end (the board is full
   * and no picture has all its cards on it), true means Hint found no way to
   * win from here. Either way only Undo or Restart helps.
   */
  "board:stuck": { doomed: boolean };
  /**
   * Every picture restored: the board is won. `level`: the campaign number,
   * or the board's id for any other board. `line`: the actions as played,
   * undone ones left out, shuffles included with the mix they made; the rules
   * replay it from the deal to this win (replay in src/game/rules.ts), and
   * `moves` is the number of moves in it.
   */
  "board:won": { level: string; moves: number; ms: number; line: Action[] };
  /** A board opened and play can begin. */
  "board:start": { level: string };
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
