// The background music: one calm loop under the whole game, which steps back
// while a picture's flourish or the win cue plays.
//
// The loop point is made here rather than in the file: the last few seconds
// of the track are crossfaded into its first few, and the loop runs from the
// end of that crossfade back to it. That keeps the loop seamless whatever the
// codec adds at the file's edges (MP3 pads both), and lets the track keep its
// natural phrasing.
//
// The decoded track is about 33 MB of samples (86 s of stereo). If memory on
// low-end phones becomes a problem, stream it from an <audio> element instead.

import { ctx, load, musicBus, setMusicLevel } from "./engine";
import { MUSIC } from "./sounds";

const duck = ctx.createGain();
duck.connect(musicBus);
let started = false;

/** Crossfade the track's tail into its head, in place; returns where the loop restarts. */
function makeLoop(buffer: AudioBuffer, seconds: number): number {
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
  return n / buffer.sampleRate;
}

/** Load the music and start it, fading in. Safe to call more than once. */
export async function startMusic(): Promise<void> {
  if (started) return;
  started = true;
  setMusicLevel(MUSIC.gain);
  const buffer = await load(MUSIC.file);
  if (!buffer) {
    started = false; // A later call may try again.
    return;
  }
  const loopStart = makeLoop(buffer, MUSIC.crossfade);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = loopStart;
  source.loopEnd = buffer.duration;
  source.connect(duck);
  // Started even while the context is held back: it plays from its first
  // note the moment sound is allowed.
  const now = ctx.currentTime;
  duck.gain.setValueAtTime(0, now);
  duck.gain.linearRampToValueAtTime(1, now + MUSIC.fadeIn);
  source.start(now);
}

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
