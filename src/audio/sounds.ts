// Every sound the game plays, and its level in the mix.
//
// The files are in public/audio/, made by src/audio/source/encode.mjs from the
// generated originals beside it. Each effect is peak-normalised there, so
// `gain` here is the whole mix: tune by ear here, not by re-encoding.

/** A one-shot effect. */
export type EffectName =
  | "lift"
  | "land"
  | "slide"
  | "merge"
  | "split"
  | "complete"
  | "fall"
  | "deal"
  | "undo"
  | "hint"
  | "shuffle"
  | "restart"
  | "ui"
  | "won"
  | "milestone"
  | "stuck"
  | "hardmark"
  | "supermark"
  | "stamp"
  | "fanfare"
  | "nope"
  | "settle"
  | "found"
  | "packed"
  | "suitcase"
  | "stow"
  | "sticker";

export type EffectDef = {
  /** The file in public/audio/, when it is not the effect's own name. */
  file?: string;
  /** Playback rate, when it is not 1 (0.749 is a fourth lower). */
  rate?: number;
  /** Level, 0 to 1, before the master volume. */
  gain: number;
  /** Random pitch spread per play (0.04 = ±4%), so repeats don't sound stamped. */
  jitter: number;
  /** Seconds a repeat must wait; closer repeats are dropped (one sound, not a flam). */
  minGap: number;
};

export const EFFECTS: Record<EffectName, EffectDef> = {
  // Handling a card: soft and close, under everything else.
  lift: { gain: 0.32, jitter: 0.05, minGap: 0.04 },
  land: { gain: 0.5, jitter: 0.05, minGap: 0.04 },
  slide: { gain: 0.42, jitter: 0.05, minGap: 0.06 },
  // Joining: a small satisfying snap, a touch above the handling sounds.
  merge: { gain: 0.6, jitter: 0.02, minGap: 0.05 },
  split: { gain: 0.4, jitter: 0.04, minGap: 0.05 },
  // A picture made whole: the best sound in the game.
  complete: { gain: 0.8, jitter: 0, minGap: 0.4 },
  // Under the column ticks (settle), which mark each column landing: softer.
  fall: { gain: 0.26, jitter: 0.04, minGap: 0.08 },
  // One soft tick per card dealt; src/audio/index.ts ripples them across the stacks.
  deal: { gain: 0.26, jitter: 0, minGap: 0 },
  // A press on a stack (it can't be picked up): a soft "tk-tk" of the deal
  // tick, lower, under the stack's sideways shake. Often repeated: never scolds.
  nope: { gain: 0.24, jitter: 0.04, minGap: 0.1 },
  // A column's cards touch down after a clear: one soft "tok" per column, a
  // little higher further right (src/audio/index.ts), the refill's beat.
  settle: { gain: 0.3, jitter: 0.02, minGap: 0 },
  undo: { gain: 0.45, jitter: 0.03, minGap: 0.1 },
  hint: { gain: 0.42, jitter: 0, minGap: 0.3 },
  shuffle: { gain: 0.5, jitter: 0.02, minGap: 0.3 },
  restart: { gain: 0.5, jitter: 0.02, minGap: 0.3 },
  ui: { gain: 0.3, jitter: 0.03, minGap: 0.05 },
  // The board won: a warm 8 s piano-and-strings resolution. It is the win
  // sting too, so it rides the effects bus: a player who switched music off
  // still hears that they won.
  won: { gain: 0.85, jitter: 0, minGap: 1 },
  // A milestone card (the guided start's finish, more later): a 9 s orchestral
  // swell with bell sparkles under the card's fireworks, bigger and warmer than
  // the win cue, which it replaces. Not in LOAD_ORDER: the game standard has it
  // fetched only when a board that can reach a milestone opens (src/audio/index.ts).
  milestone: { gain: 0.9, jitter: 0, minGap: 2 },
  // The player is stuck (a dead end, or Hint finds no way): the hint chime,
  // a fourth lower and softer. A gentle "hm", never an alarm.
  stuck: { file: "hint", rate: 0.749, gain: 0.3, jitter: 0, minGap: 2 },
  // A hard board's banner as it opens: a playful marimba "uh-oh" (C, A), and
  // for a super hard board the same a fourth deeper with a soft low thump.
  // Under a second each, never an alarm: our table stays calm.
  hardmark: { gain: 0.45, jitter: 0, minGap: 1 },
  supermark: { gain: 0.5, jitter: 0, minGap: 1 },
  // A trip finished: the passport stamp lands on its page (a rubber thump).
  stamp: { gain: 0.65, jitter: 0, minGap: 1 },
  // A destination's postcard opens under the place's name: a bright 2.6 s
  // orchestral flourish (horns, strings, glockenspiel). Every board has one,
  // so it sits under the win cue and stays light enough to hear often.
  fanfare: { gain: 0.6, jitter: 0, minGap: 1 },
  // The Daily Suitcase. Found it: the day's item finished on the board, the
  // big moment (it lifts with a starburst and its name, then flies into a
  // suitcase): a bouncy xylophone, glockenspiel and pizzicato fanfare, under
  // 2 s, its final chord just before the item lands. Stow: the case's latch as
  // it lands (the packed sound, a level of its own).
  found: { gain: 0.6, jitter: 0, minGap: 1 },
  stow: { file: "packed", gain: 0.55, jitter: 0, minGap: 0.5 },
  // Packed: the item lands in the suitcase on the win card, its lid and latches
  // and a tiny sparkle (softer for a spare copy, src/audio/index.ts).
  packed: { gain: 0.55, jitter: 0, minGap: 0.3 },
  // The suitcase full: a rising marimba arpeggio in the win cue's key, with a
  // low thump and glass pings.
  suitcase: { gain: 0.7, jitter: 0, minGap: 1 },
  // A Souvenir won: its sticker is patted onto the trip's passport page, with a
  // warm two-note marimba "da-DING" and glass pings. Smaller than the stamp.
  sticker: { gain: 0.5, jitter: 0, minGap: 1 },
};

/** The order effects load in: what a first move needs comes first. */
export const LOAD_ORDER: EffectName[] = [
  "ui", "lift", "land", "slide", "merge", "split", "deal", "nope", "fall", "settle",
  "complete", "undo", "hint", "shuffle", "restart", "won", "fanfare", "hardmark", "supermark", "stamp",
  "found", "packed", "suitcase", "sticker",
];
// Not loaded up front: milestone.

/**
 * The background music's tracks, each a row of the Sound Tuning editor:
 * "music", the sunny daytime track every table plays unless it has its own,
 * and "winter", today's snowy-evening track, the Winter Dusk table's.
 */
export type MusicName = "music" | "winter";

/** The background music: one calm loop under the whole game, chosen by the player's table. */
export const MUSIC = {
  /**
   * "music": a sunny afternoon (guitar, felt piano, airy strings, flute), 72 bpm, in G major as
   * generated: the creator's choice (2026-10-28) over a copy moved to C, accepting a slight rub
   * between its F sharp and the picture harp's F.
   */
  file: "bed-day",
  /** Each other track's file. */
  tracks: { winter: "bed" } as Record<Exclude<MusicName, "music">, string>,
  /** A table with a track of its own, by the table's id (src/ui/tables.ts); fetched only while it is chosen. */
  tables: { "table-winter-dusk": "winter" } as Record<string, MusicName>,
  /** Level of the music bus: well under the effects. */
  gain: 0.3,
  /** Seconds of the loop's end crossfaded into its start. */
  crossfade: 4,
  /** Seconds the music fades in over when it first starts. */
  fadeIn: 4,
};
