// The Sound Tuning editor's mix (tools/sound-tuning/), saved as
// public/sound-mix.json: the creator's level, mute and pitch nudge for each
// sound, which take of it plays, and the levels of all effects and of the
// music. The game reads it fresh at start and again when the player comes back
// to the page (src/audio/engine.ts), in every build; no file means the sounds
// as built.
//
// Pure: the editor's server imports this file straight into Node (types
// stripped), so it imports nothing but ./sounds.ts, by its full name.

import { EFFECTS, type EffectName, type MusicName } from "./sounds.ts";

/** Everything the mix can tune: each effect, and each background music track ("music", "winter"). */
export type SoundName = EffectName | MusicName;

export type SoundSetting = {
  /** A multiple of the sound's built-in level (0 to 4); absent: 1. Not for a music track: their level is `music`. */
  volume?: number;
  /** Silent in the game. */
  muted?: true;
  /** Semitones up or down (-12 to 12), for an effect; absent: 0. */
  pitch?: number;
  /** An alternate take, by its file stem ("merge-b": audio/takes/merge-b.ogg); absent: the original. */
  take?: string;
};

export type SoundMix = {
  /** All effects, a multiple of their levels (0 to 4). */
  effects: number;
  /** The music, every track, a multiple of its level (0 to 4). */
  music: number;
  sounds: Partial<Record<SoundName, SoundSetting>>;
};

export const EMPTY_MIX: SoundMix = { effects: 1, music: 1, sounds: {} };

const MUSIC_NAMES: readonly SoundName[] = ["music", "winter"];
export const SOUND_NAMES: SoundName[] = [...(Object.keys(EFFECTS) as EffectName[]), ...MUSIC_NAMES];

/** A take's stem belongs to `name` when it is that name, a dash and one letter: "merge-a". */
export function takeOwner(stem: string): SoundName | undefined {
  const m = /^([a-z]+)-([a-z])$/.exec(stem);
  return m && (SOUND_NAMES as string[]).includes(m[1]) ? (m[1] as SoundName) : undefined;
}

function num(v: unknown, lo: number, hi: number): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(hi, Math.max(lo, v)) * 100) / 100 : undefined;
}

/**
 * Whatever came in (a file, an editor's request), as a mix holding only what
 * the game reads, defaults left out. `takes`: the stems that exist, when known;
 * a take not among them is dropped.
 */
export function cleanMix(input: unknown, takes?: readonly string[]): SoundMix {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: SoundMix = { effects: num(raw.effects, 0, 4) ?? 1, music: num(raw.music, 0, 4) ?? 1, sounds: {} };
  const given = (raw.sounds && typeof raw.sounds === "object" ? raw.sounds : {}) as Record<string, unknown>;
  for (const name of SOUND_NAMES) {
    const s = given[name] as Record<string, unknown> | undefined;
    if (!s || typeof s !== "object") continue;
    const entry: SoundSetting = {};
    const music = MUSIC_NAMES.includes(name);
    const volume = music ? undefined : num(s.volume, 0, 4);
    if (volume !== undefined && volume !== 1) entry.volume = volume;
    if (s.muted === true) entry.muted = true;
    const pitch = music ? undefined : num(s.pitch, -12, 12);
    const semitones = Math.round(pitch ?? 0);
    if (semitones) entry.pitch = semitones;
    if (typeof s.take === "string" && takeOwner(s.take) === name && (!takes || takes.includes(s.take))) entry.take = s.take;
    if (Object.keys(entry).length) out.sounds[name] = entry;
  }
  return out;
}

/** The takes a mix picks, by stem. */
export function pickedTakes(mix: SoundMix): string[] {
  return Object.values(mix.sounds).flatMap((s) => (s?.take ? [s.take] : []));
}
