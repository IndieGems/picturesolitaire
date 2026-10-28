// The background music: one calm loop under the whole game, which steps back
// while a picture's flourish or the win cue plays. The player's table picks
// the track (MUSIC.tables in src/audio/sounds.ts: Winter Dusk keeps the snowy
// evening, every other table plays the sunny one); choosing another table
// crossfades to its track. Only the player's own choice counts: a board that
// wears a table of its own (a Souvenir's) leaves the music as it is.
//
// The loop point is made here rather than in the file: the last few seconds
// of the track are crossfaded into its first few, and the loop runs from the
// end of that crossfade back to it. That keeps the loop seamless whatever the
// codec adds at the file's edges (MP3 pads both), and lets the track keep its
// natural phrasing.
//
// A decoded track is about 33 MB of samples (86-90 s of stereo), so only the
// one playing is kept: a track swapped away from is let go once it has faded.
// If memory on low-end phones becomes a problem, stream it from an <audio>
// element instead.

import { chosenTable, onTableChange } from "../ui/tables";
import { ctx, forget, load, musicBus, musicFile, onMixChange, setMusicLevel, setMusicTrack } from "./engine";
import { MUSIC, type MusicName } from "./sounds";

/** The track the player's table plays: its own, else the sunny one. */
const trackNow = (): MusicName => MUSIC.tables[chosenTable()] ?? "music";
/** The file to play now: that track, or the take the Sound Tuning editor picks for it. */
const fileNow = (): string => musicFile(trackNow());

const duck = ctx.createGain();
duck.connect(musicBus);
let started = false;
/** What is playing: its file and its own fader, for a swap to fade out. */
let playing: { file: string; source: AudioBufferSourceNode; fader: GainNode } | null = null;
/** Each decoded track's loop start, once its join is made (made once: it changes the samples). */
const loops = new WeakMap<AudioBuffer, number>();

/** Crossfade the track's tail into its head, in place; returns where the loop restarts. */
function makeLoop(buffer: AudioBuffer, seconds: number): number {
  const made = loops.get(buffer);
  if (made !== undefined) return made;
  const n = Math.min(Math.floor(seconds * buffer.sampleRate), Math.floor(buffer.length / 3));
  const tail = buffer.length - n;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) {
      // Equal-power: the level holds steady through the join.
      const t = (i + 0.5) / n;
      data[tail + i] = data[tail + i] * Math.cos((t * Math.PI) / 2) + data[i] * Math.sin((t * Math.PI) / 2);
    }
  }
  loops.set(buffer, n / buffer.sampleRate);
  return n / buffer.sampleRate;
}

/** Start `file` looping, fading in over `fadeIn` s; whatever played before fades out over the same time. */
async function play(file: string, fadeIn: number): Promise<boolean> {
  const buffer = await load(file);
  if (!buffer || file !== fileNow()) return false; // failed, or the table or the mix moved on meanwhile
  const loopStart = makeLoop(buffer, MUSIC.crossfade);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = loopStart;
  source.loopEnd = buffer.duration;
  const fader = ctx.createGain();
  source.connect(fader).connect(duck);
  // Started even while the context is held back: it plays from its first
  // note the moment sound is allowed.
  const now = ctx.currentTime;
  fader.gain.setValueAtTime(0, now);
  fader.gain.linearRampToValueAtTime(1, now + fadeIn);
  source.start(now);
  if (playing) {
    const old = playing;
    old.fader.gain.cancelScheduledValues(now);
    old.fader.gain.setValueAtTime(old.fader.gain.value, now);
    old.fader.gain.linearRampToValueAtTime(0, now + fadeIn);
    old.source.stop(now + fadeIn + 0.05);
    if (old.file !== file) setTimeout(() => playing?.file !== old.file && forget(old.file), (fadeIn + 0.1) * 1000);
  }
  playing = { file, source, fader };
  setMusicTrack(trackNow());
  return true;
}

/** Load the music and start it, fading in. Safe to call more than once. */
export async function startMusic(): Promise<void> {
  if (started) return;
  started = true;
  setMusicLevel(MUSIC.gain);
  if (!(await play(fileNow(), MUSIC.fadeIn)) && !playing) started = false; // a later call may try again
}

// Another table chosen, or another take picked in the Sound Tuning editor:
// swap to its track, crossfading. (A table change that leaves the track as it
// was, such as a Souvenir's table showing, changes nothing.)
onTableChange(() => {
  if (started && playing && playing.file !== fileNow()) void play(fileNow(), 2.5);
});
onMixChange(() => {
  if (started && playing && playing.file !== fileNow()) void play(fileNow(), 1.5);
});

/**
 * Step the music back to `level` (0 to 1) for `hold` seconds, then bring it
 * back over `release` seconds: room for a flourish or the win cue.
 */
export function duckMusic(level: number, hold: number, release: number): void {
  if (!started) return;
  const now = ctx.currentTime;
  duck.gain.cancelScheduledValues(now);
  duck.gain.setTargetAtTime(level, now, 0.08);
  duck.gain.setTargetAtTime(1, now + hold, release / 3);
}
