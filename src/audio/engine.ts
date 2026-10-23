// The game's audio engine: one AudioContext and the buses every sound goes
// through.
//
//   effect voices --> effects bus --\
//                                    >--> master --> limiter --> speakers
//   music --> duck --> music bus ---/
//
// - master follows the game's mute and volume (masterGain() in src/sound.ts),
//   so no sound can slip past them. A mute is a gain of 0, never
//   ctx.suspend(): the clock keeps running, as the SDK's own mute does.
// - the music and effects buses follow the Arcade's Music and Sound switches
//   (onAudioChannels in src/gem.ts), on top of the game's own mute.
// - the context is suspended whenever the Arcade pauses the game or the page
//   is hidden (a running context keeps a phone's audio hardware awake, even
//   in silence), and resumed when both end.
// - sound starts as soon as it is loaded. Only where the browser holds it back
//   (the context comes up suspended) does the first lift of a finger, click
//   or key release it: never pointerdown, which a phone does not count.
//
// This module is created after createGem (it is imported lazily from
// src/sound.ts), so the SDK's own mute reaches everything here.

import { gem, onArcadePause, onAudioChannels } from "../gem";
import { onSettingsChange } from "../settings";
import { masterGain, onMutedChange } from "../sound";
import { EFFECTS, type EffectName } from "./sounds";

export const ctx = new AudioContext({ latencyHint: "interactive" });

// A soft limiter last, so a pile-up (a deal ripple over a fall over a merge)
// never clips on a phone speaker.
const limiter = ctx.createDynamicsCompressor();
limiter.threshold.value = -6;
limiter.knee.value = 6;
limiter.ratio.value = 8;
limiter.attack.value = 0.003;
limiter.release.value = 0.2;
limiter.connect(ctx.destination);

const master = ctx.createGain();
master.connect(limiter);

const effectsBus = ctx.createGain();
effectsBus.connect(master);

/** The music bus: the Arcade's Music switch times the music's level. */
export const musicBus = ctx.createGain();
musicBus.connect(master);

let channels = { music: true, sounds: true };
let musicLevel = 1;

/** The slider is linear; loudness is not. Squaring makes half-way sound like half. */
function volumeCurve(v: number): number {
  return v * v;
}

function ramp(param: AudioParam, value: number): void {
  // A short glide, so a dragged volume slider never crackles.
  param.setTargetAtTime(value, ctx.currentTime, 0.02);
}

function applyLevels(): void {
  ramp(master.gain, volumeCurve(masterGain()));
  ramp(effectsBus.gain, channels.sounds ? 1 : 0);
  ramp(musicBus.gain, channels.music ? musicLevel : 0);
}

/** Set the music bus's own level (src/audio/sounds.ts, MUSIC.gain). */
export function setMusicLevel(level: number): void {
  musicLevel = level;
  applyLevels();
}

/** Is there any point making an effect right now? */
function audible(): boolean {
  return ctx.state === "running" && channels.sounds && masterGain() > 0;
}

// --- Running, suspended, released -----------------------------------------

let arcadePaused = gem.paused;
const wanted = () => !arcadePaused && document.visibilityState === "visible";

function resume(): void {
  // Resolves only once the browser allows it; until then the lift below retries.
  ctx.resume().catch(() => {});
}

function settle(): void {
  if (wanted()) {
    if (ctx.state !== "running") resume();
  } else if (ctx.state === "running") {
    ctx.suspend().catch(() => {});
  }
}

// Where the browser held sound back, the first lift releases it. Kept for the
// session: iOS can take a running context away again (a call, Siri), and the
// next tap should bring it back. Each costs one comparison per tap.
for (const type of ["pointerup", "touchend", "click", "keydown"]) {
  addEventListener(
    type,
    () => {
      if (wanted() && ctx.state !== "running") resume();
    },
    { capture: true, passive: true },
  );
}

// --- Loading -------------------------------------------------------------------

// Ogg Opus is half the size; a browser that cannot decode it gets MP3.
let format: "ogg" | "mp3" = document.createElement("audio").canPlayType('audio/ogg; codecs="opus"') ? "ogg" : "mp3";

const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();
const failedAt = new Map<string, number>();

/** Fetch and decode public/audio/<name>, once; a failure may be retried after 10 s. */
export function load(name: string): Promise<AudioBuffer | null> {
  const have = buffers.get(name);
  if (have) return Promise.resolve(have);
  const inFlight = loading.get(name);
  if (inFlight) return inFlight;
  if (performance.now() - (failedAt.get(name) ?? -Infinity) < 10_000) return Promise.resolve(null);
  const job = (async () => {
    try {
      const buffer = await fetchDecode(name);
      buffers.set(name, buffer);
      return buffer;
    } catch (err) {
      failedAt.set(name, performance.now());
      console.warn(`[audio] could not load ${name}`, err);
      return null;
    } finally {
      loading.delete(name);
    }
  })();
  loading.set(name, job);
  return job;
}

async function fetchDecode(name: string): Promise<AudioBuffer> {
  const get = async (ext: string) => {
    const res = await fetch(`${import.meta.env.BASE_URL}audio/${name}.${ext}`, { priority: "low" } as RequestInit);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.arrayBuffer();
  };
  const data = await get(format);
  try {
    return await ctx.decodeAudioData(data);
  } catch (err) {
    if (format !== "ogg") throw err;
    // This browser claimed Opus and could not decode it: MP3 from now on.
    format = "mp3";
    return ctx.decodeAudioData(await get("mp3"));
  }
}

// --- Playing effects -----------------------------------------------------------

export type PlayOptions = {
  /** Multiplies the effect's own level. */
  gain?: number;
  /** Playback rate: 1.1 is a little higher and shorter. */
  rate?: number;
  /** Stereo position, -1 (left) to 1 (right). */
  pan?: number;
  /** Seconds from now. */
  delay?: number;
};

const MAX_VOICES = 16;
let voices = 0;
const lastPlayed = new Map<EffectName, number>();

/** A playing effect, to cut short when something more important starts. */
export type Voice = { fadeOut(seconds: number): void };

/** The file an effect plays: its own name unless its table row names another. */
export function fileOf(name: EffectName): string {
  return EFFECTS[name].file ?? name;
}

/**
 * Play an effect now. Dropped, never queued, when nothing could be heard
 * (suspended, muted, the Arcade's Sound switch off), so a backlog never
 * bursts out on resume. An effect not loaded yet starts loading instead.
 */
export function play(name: EffectName, opts: PlayOptions = {}): Voice | null {
  if (!audible()) return null;
  const buffer = buffers.get(fileOf(name));
  if (!buffer) {
    void load(fileOf(name));
    return null;
  }
  const def = EFFECTS[name];
  const at = ctx.currentTime + Math.max(0, opts.delay ?? 0);
  if (at - (lastPlayed.get(name) ?? -Infinity) < def.minGap) return null;
  if (voices >= MAX_VOICES) return null;
  lastPlayed.set(name, at);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = (def.rate ?? 1) * (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * def.jitter);
  const level = ctx.createGain();
  level.gain.value = def.gain * (opts.gain ?? 1);
  source.connect(level);
  let out: AudioNode = level;
  if (opts.pan) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, opts.pan));
    level.connect(panner);
    out = panner;
  }
  out.connect(effectsBus);
  voices++;
  source.onended = () => {
    voices--;
    out.disconnect();
    level.disconnect();
  };
  source.start(at);
  return {
    fadeOut(seconds) {
      const now = ctx.currentTime;
      level.gain.setTargetAtTime(0, now, seconds / 3);
      try {
        source.stop(now + seconds);
      } catch {
        // Already stopped: nothing to cut.
      }
    },
  };
}

// --- Checks (development only) ------------------------------------------------

/**
 * What the engine is doing, and how loud its output is right now, for
 * play-test scripts: `window.__audio` in `npm run dev` (src/audio/index.ts).
 * The build drops it.
 */
export function devProbe() {
  const meter = ctx.createAnalyser();
  meter.fftSize = 2048;
  limiter.connect(meter);
  const samples = new Float32Array(meter.fftSize);
  return {
    state: () => ({
      context: ctx.state,
      format,
      loaded: [...buffers.keys()],
      voices,
      channels,
      master: master.gain.value,
      music: musicBus.gain.value,
      effects: effectsBus.gain.value,
    }),
    /** Peak of the last ~43 ms of output, in dBFS. */
    peakDb: () => {
      meter.getFloatTimeDomainData(samples);
      let peak = 0;
      for (const s of samples) peak = Math.max(peak, Math.abs(s));
      return peak > 0 ? 20 * Math.log10(peak) : -Infinity;
    },
  };
}

// --- Wiring --------------------------------------------------------------------

/** Follow the mute, the volume, the Arcade's switches and pauses, from now on. */
export function wireEngine(): void {
  master.gain.value = volumeCurve(masterGain());
  onMutedChange(applyLevels);
  onSettingsChange(applyLevels);
  onAudioChannels((next) => {
    channels = next;
    applyLevels();
  });
  onArcadePause((paused) => {
    arcadePaused = paused;
    settle();
  });
  document.addEventListener("visibilitychange", settle);
  settle();
}
