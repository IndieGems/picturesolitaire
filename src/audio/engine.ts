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
// - the Sound Tuning editor's mix (src/audio/mix.ts) sets each effect's level,
//   mute, pitch and take, and the levels of all effects and of the music.
// - the music and effects buses follow the Arcade's Music and Sound switches
//   (onAudioChannels in src/gem.ts), on top of the game's own mute.
// - the context is suspended whenever the Arcade pauses the game or the page
//   is hidden (a running context keeps a phone's audio hardware awake, even
//   in silence), and resumed when both end.
// - sound starts as soon as it is loaded. Only where the browser holds it back
//   (the context comes up suspended) does the first lift of a finger, click
//   or key release it: never pointerdown, which a phone does not count. That
//   tap's own sound is heard too, started into the waking context (audible()).
//
// This module is created after createGem (it is imported lazily from
// src/sound.ts), so the SDK's own mute reaches everything here.

import { gem, onArcadePause, onAudioChannels } from "../gem";
import { onSettingsChange } from "../settings";
import { masterGain, onMutedChange } from "../sound";
import { EMPTY_MIX, cleanMix, pickedTakes, type SoundMix } from "./mix";
import { EFFECTS, MUSIC, type EffectName, type MusicName } from "./sounds";

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
/** The music track playing (src/audio/music.ts), for its Sound Tuning mute. */
let musicTrack: MusicName = "music";
/** The Sound Tuning editor's mix (src/audio/mix.ts), in force from when it is read. */
let mix: SoundMix = EMPTY_MIX;

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
  ramp(effectsBus.gain, channels.sounds ? mix.effects : 0);
  // The Music row's Mute silences every track; another track's row, only its own.
  const muted = mix.sounds.music?.muted || mix.sounds[musicTrack]?.muted;
  ramp(musicBus.gain, channels.music && !muted ? musicLevel * mix.music : 0);
}

/** The music track playing now (src/audio/music.ts), for its Sound Tuning mute. */
export function setMusicTrack(track: MusicName): void {
  musicTrack = track;
  applyLevels();
}

/** Set the music bus's own level (src/audio/sounds.ts, MUSIC.gain). */
export function setMusicLevel(level: number): void {
  musicLevel = level;
  applyLevels();
}

/**
 * Is there any point making an effect right now? While the browser holds
 * sound back, the tap that releases it counts as audible too: its press
 * sound is started into the waking context and heard as it wakes (play()).
 */
function audible(): boolean {
  if (!channels.sounds || masterGain() <= 0) return false;
  return ctx.state === "running" || waking();
}

/**
 * Inside a tap or key press while the context is held back (a phone's first
 * tap): ask it to wake now, within the press. Never on a press the browser
 * does not count (navigator.userActivation), so nothing queues for later.
 */
function waking(): boolean {
  if (!wanted() || !(navigator as { userActivation?: { isActive: boolean } }).userActivation?.isActive) return false;
  resume();
  return true;
}

/** How long a sound started into a waking context may wait for it, before it is dropped. */
const WAKE_WAIT_MS = 300;

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
  /** Seconds into the sound to start from: a cue that arrived late keeps its timing. */
  offset?: number;
};

const MAX_VOICES = 16;
let voices = 0;
const lastPlayed = new Map<EffectName, number>();

/** A playing effect, to cut short when something more important starts. */
export type Voice = { fadeOut(seconds: number): void };

/** The file an effect plays: the take the mix picks, else its own name unless its table row names another. */
export function fileOf(name: EffectName): string {
  const take = mix.sounds[name]?.take;
  return take ? `takes/${take}` : (EFFECTS[name].file ?? name);
}

/** The file a music track plays: the take the mix picks, else the built-in track. */
export function musicFile(track: MusicName = "music"): string {
  const take = mix.sounds[track]?.take;
  return take ? `takes/${take}` : track === "music" ? MUSIC.file : MUSIC.tracks[track];
}

/** Let a decoded file go (a music track no longer played: ~30 MB of samples). */
export function forget(name: string): void {
  buffers.delete(name);
}

// --- The mix -------------------------------------------------------------------
//
// The Sound Tuning editor saves public/sound-mix.json (src/audio/mix.ts), and
// the built game's copy too (dist/), so the Editor's Play has it at once.
//
// LIVE where the tool can save it while the game runs: the dev server, or a
// build played on this machine (the Editor's Play). There it is read when the
// audio starts and again whenever the player comes back to the page (focus,
// or the tab shown again), at most once a second, past every cache: a change
// saved in the tool is heard as soon as the creator clicks back into the game.
// Nothing polls.
//
// Everywhere else (an uploaded build, and every release build, which drops the
// live branch at build time) it is read once, as a plain request the browser
// may cache: a published build's mix never changes, and the release checklist
// flags a file fetched past the cache on every load (QA, 2026-10-28).
const LIVE_MIX =
  import.meta.env.MODE !== "release" &&
  (import.meta.env.DEV || ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname));

let mixText: string | null = null;
let mixReadAt = -Infinity;
const mixHandlers = new Set<() => void>();

/** Call `handler` whenever a new mix comes into force. */
export function onMixChange(handler: () => void): void {
  mixHandlers.add(handler);
}

/** Read the mix; put it in force when it changed. A failed read keeps the last good mix. Never throws. */
export async function refreshMix(): Promise<void> {
  // Not live: one answer (even "no file") is the mix for good; a failed read retries.
  if (!LIVE_MIX && mixText !== null) return;
  if (performance.now() - mixReadAt < 1000) return;
  mixReadAt = performance.now();
  try {
    const file = `${import.meta.env.BASE_URL}sound-mix.json`;
    // `rev`, never `t`: the Gem host reads `t` as its sign-in token.
    // The release test spelled out here, so a release build drops the live branch's text too.
    const res =
      import.meta.env.MODE !== "release" && LIVE_MIX
        ? await fetch(`${file}?rev=${Date.now()}`, { cache: "no-store" })
        : await fetch(file);
    // A missing file can come back as the game's page (the dev server), so the type is the test.
    const text = res.ok && /json/.test(res.headers.get("content-type") ?? "") ? await res.text() : "";
    if (text === mixText) return;
    mix = text ? cleanMix(JSON.parse(text)) : EMPTY_MIX;
    mixText = text;
  } catch {
    return; // the last good mix stands
  }
  applyLevels();
  for (const stem of pickedTakes(mix)) void load(`takes/${stem}`);
  for (const handler of mixHandlers) handler();
}

/**
 * Play an effect now. Dropped, never queued, when nothing could be heard
 * (suspended, muted, the Arcade's Sound switch off), so a backlog never
 * bursts out on resume. An effect not loaded yet starts loading instead.
 */
export function play(name: EffectName, opts: PlayOptions = {}): Voice | null {
  const tuned = mix.sounds[name];
  if (!audible() || tuned?.muted) return null;
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
  const nudge = 2 ** ((tuned?.pitch ?? 0) / 12);
  source.playbackRate.value = (def.rate ?? 1) * nudge * (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * def.jitter);
  const level = ctx.createGain();
  level.gain.value = def.gain * (tuned?.volume ?? 1) * (opts.gain ?? 1);
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
  let ended = false;
  const done = () => {
    if (ended) return;
    ended = true;
    voices--;
    out.disconnect();
    level.disconnect();
  };
  source.onended = done;
  source.start(at, Math.max(0, opts.offset ?? 0));
  // Started into a waking context (audible()): it plays as the context wakes,
  // or, if that has not happened soon, never, so no backlog bursts out later.
  if (ctx.state !== "running") {
    setTimeout(() => {
      if (ctx.state === "running") return;
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
      done();
    }, WAKE_WAIT_MS);
  }
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
      mix,
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
  document.addEventListener("visibilitychange", () => {
    settle();
    if (document.visibilityState === "visible") void refreshMix();
  });
  addEventListener("focus", () => void refreshMix());
  settle();
}
