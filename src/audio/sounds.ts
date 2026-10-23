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
  | "stuck";

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
  fall: { gain: 0.42, jitter: 0.04, minGap: 0.08 },
  // One soft tick per card dealt; src/audio/index.ts ripples them across the stacks.
  deal: { gain: 0.26, jitter: 0, minGap: 0 },
  undo: { gain: 0.45, jitter: 0.03, minGap: 0.1 },
  hint: { gain: 0.42, jitter: 0, minGap: 0.3 },
  shuffle: { gain: 0.5, jitter: 0.02, minGap: 0.3 },
  restart: { gain: 0.5, jitter: 0.02, minGap: 0.3 },
  ui: { gain: 0.3, jitter: 0.03, minGap: 0.05 },
  // The board won: a warm 8 s piano-and-strings resolution. It is the win
  // sting too, so it rides the effects bus: a player who switched music off
  // still hears that they won.
  won: { gain: 0.85, jitter: 0, minGap: 1 },
  // The player is stuck (a dead end, or Hint finds no way): the hint chime,
  // a fourth lower and softer. A gentle "hm", never an alarm.
  stuck: { file: "hint", rate: 0.749, gain: 0.3, jitter: 0, minGap: 2 },
};

/** The order effects load in: what a first move needs comes first. */
export const LOAD_ORDER: EffectName[] = [
  "ui", "lift", "land", "slide", "merge", "split", "deal", "fall",
  "complete", "undo", "hint", "shuffle", "restart", "won",
];

/** The background music: one calm loop under the whole game. */
export const MUSIC = {
  file: "bed",
  /** Level of the music bus: well under the effects. */
  gain: 0.3,
  /** Seconds of the loop's end crossfaded into its start. */
  crossfade: 4,
  /** Seconds the music fades in over when it first starts. */
  fadeIn: 4,
};
