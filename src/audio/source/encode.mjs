// Encode the generated originals in this folder into what the game ships,
// public/audio/<name>.ogg (Ogg Opus) and public/audio/<name>.mp3 (the fallback
// for a browser that cannot decode Opus). Re-run after changing a trim or a
// level below; it rewrites every file.
//
//   FFMPEG=<path to ffmpeg> node src/audio/source/encode.mjs [name ...]
//
// With names, only those are re-encoded; with none, every file is.
//
// ffmpeg is not part of the project: `npm i ffmpeg-static` in a scratch folder
// and point FFMPEG at its ffmpeg.exe.
//
// Each effect is trimmed to its one event (the generator pads them with
// seconds of near-silence), faded at both ends, high-passed to drop rumble a
// phone speaker cannot play, and peak-normalised, so the per-sound levels in
// src/audio/sounds.ts are the whole mix. Music is loudness-normalised instead.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FF = process.env.FFMPEG || "ffmpeg";
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../public/audio");
// Alternate takes go beside the project, not into public/: Sound Tuning
// (tools/sound-tuning/) copies a take into the game only once it is picked.
const takesOut = resolve(here, "../../../audio/takes");
mkdirSync(out, { recursive: true });

// start/end in seconds of the source; fade = fade-out length; stereo for music;
// lowpass (Hz), when an effect's top end is too bright for the calm table.
const EFFECTS = [
  { name: "lift", src: "lift.wav", start: 1.22, end: 1.4, fade: 0.06 },
  { name: "land", src: "land.wav", start: 0.48, end: 0.66, fade: 0.08 },
  { name: "slide", src: "slide.wav", start: 0.62, end: 0.95, fade: 0.12 },
  { name: "merge", src: "merge.wav", start: 0.712, end: 0.8, fade: 0.04 },
  { name: "split", src: "split.wav", start: 1.708, end: 1.86, fade: 0.08 },
  // From the harp's first clear note (0.302), skipping two faint ones: the
  // picture leaves in about 450 ms, so the rising run plays under its swell and
  // twinkles, is near full as it shrinks (~250 ms) and peaks as it vanishes.
  { name: "complete", src: "complete.wav", start: 0.3, end: 4.4, fade: 0.9 },
  { name: "fall", src: "fall.wav", start: 1.13, end: 2.12, fade: 0.15 },
  { name: "deal", src: "deal.wav", start: 0.865, end: 0.96, fade: 0.025 },
  { name: "undo", src: "undo.wav", start: 0.7, end: 1.28, fade: 0.05 },
  { name: "hint", src: "hint.wav", start: 0.02, end: 1.6, fade: 0.6 },
  { name: "shuffle", src: "shuffle.wav", start: 2.55, end: 3.85, fade: 0.15 },
  { name: "restart", src: "restart.wav", start: 1.3, end: 2.62, fade: 0.1 },
  { name: "ui", src: "ui.wav", start: 0.1, end: 0.3, fade: 0.1 },
  // The passport stamp: the rubber hit and its body 70 ms later, its clack
  // rolled off above 5 kHz so it thumps rather than snaps.
  { name: "stamp", src: "stamp.wav", start: 0.525, end: 0.82, fade: 0.1, lowpass: 5000 },
];
const MUSIC = [
  // The win cue, whole.
  { name: "won", src: "won.mp3", start: 0, end: 7.9, fade: 0.4, lufs: -16 },
  // A milestone card (the guided start's finish): fuller and a touch louder
  // than the win cue. The near-silent shimmer before its swell is mostly cut,
  // so the swell lands just after the card.
  { name: "milestone", src: "milestone.mp3", start: 0.5, end: 9.9, fade: 1.2, lufs: -15 },
  // The bed: its own ending fade is cut; the game crossfades the last few
  // seconds into the start (src/audio/music.ts), so no loop point is baked in.
  { name: "bed", src: "bed.mp3", start: 0, end: 86.5, fade: 0.05, lufs: -20 },
];
// Effects arranged from slices of the originals, when no single generation
// played what was asked: each part is a slice (start..end) of a source, faded
// at its end, re-pitched by `rate` (below 1 is lower and slower, as on tape),
// starting `at` seconds in, `db` louder or softer. The mix is cut to `len`,
// faded over `fade`, high-passed and peak-normalised like any effect.
const B3 = 2 ** (-3 / 12); // a minor third down
const P4 = 2 ** (-5 / 12); // a fourth down
const BUILT = [
  // A hard board's banner: a playful "uh-oh", one marimba note (C4) then the
  // same note a minor third lower, from the take's first note (to 0.29, before
  // its second) and its last, cleanest one (0.695 on). The take played C, B, C.
  {
    name: "hardmark", len: 0.95, fade: 0.25, parts: [
      { src: "mark-marimba.wav", start: 0, end: 0.29, at: 0 },
      { src: "mark-marimba.wav", start: 0.695, end: 1.35, at: 0.26, rate: B3, db: -2 },
    ],
  },
  // A super hard board's: the same "uh-oh" a fourth deeper (G3, E3), with a
  // soft low thump (C2, ringing E3) landing under the "oh" for weight.
  {
    name: "supermark", len: 0.98, fade: 0.3, parts: [
      { src: "mark-marimba.wav", start: 0, end: 0.29, at: 0, rate: P4 },
      { src: "mark-marimba.wav", start: 0.695, end: 1.2, at: 0.32, rate: P4 * B3, db: -2 },
      { src: "mark-thump.wav", start: 0, end: 0.66, at: 0.32, db: -3 },
    ],
  },
];
// Alternate takes for Sound Tuning, made when the creator marks a sound Remake:
// "<sound>-<letter>" (merge-a, merge-b...), their originals in takes/ here. An
// entry with `lufs` is treated as music (stereo, loudness), else as an effect.
const TAKES = [];
const PEAK_DB = -1.5;
const only = new Set(process.argv.slice(2));
const wanted = (s) => only.size === 0 || only.has(s.name);

function ff(args) {
  execFileSync(FF, ["-hide_banner", "-nostats", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
}
/** Run an analysis pass; ffmpeg prints its findings on stderr. */
function analyse(args) {
  const r = spawnSync(FF, ["-hide_banner", "-nostats", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stderr;
}

function chain(s, highpass) {
  const len = s.end - s.start;
  return [
    `atrim=start=${s.start}:end=${s.end}`,
    "asetpts=PTS-STARTPTS",
    highpass ? "highpass=f=60" : null,
    s.lowpass ? `lowpass=f=${s.lowpass}` : null,
    "afade=t=in:d=0.003",
    `afade=t=out:st=${(len - s.fade).toFixed(3)}:d=${s.fade}`,
  ].filter(Boolean).join(",");
}

/** With several inputs, `filters` is a filter graph over [0:a], [1:a]... */
function encode(s, filters, stereo, dir = out, inputs = [s.src]) {
  const ch = stereo ? "2" : "1";
  const ins = inputs.flatMap((f) => ["-i", join(here, f)]);
  const af = inputs.length > 1 ? ["-filter_complex", filters] : ["-af", filters];
  ff([...ins, ...af, "-ac", ch, "-ar", "48000", "-c:a", "libopus", "-b:a", stereo ? "48k" : "40k", "-application", "audio", "-vbr", "on", join(dir, `${s.name}.ogg`)]);
  ff([...ins, ...af, "-ac", ch, "-ar", "44100", "-c:a", "libmp3lame", "-b:a", stereo ? "80k" : "64k", join(dir, `${s.name}.mp3`)]);
  const kb = (f) => (statSync(join(dir, `${s.name}.${f}`)).size / 1024).toFixed(1);
  console.log(`${s.name.padEnd(9)} ${(s.len ?? s.end - s.start).toFixed(2)}s  ogg ${kb("ogg")} KB  mp3 ${kb("mp3")} KB`);
}

function effect(s, dir) {
  const base = chain(s, true);
  const log = analyse(["-i", join(here, s.src), "-af", `${base},volumedetect`, "-f", "null", "-"]);
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(log)[1]);
  encode(s, `${base},volume=${(PEAK_DB - peak).toFixed(2)}dB`, false, dir);
}
function music(s, dir) {
  const base = chain(s, false);
  const log = analyse(["-i", join(here, s.src), "-af", `${base},ebur128=peak=true`, "-f", "null", "-"]);
  const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(log.slice(log.lastIndexOf("Summary")))[1]);
  const gain = s.lufs - lufs;
  // A limiter catches any peak the gain pushes over -1 dBFS.
  encode(s, `${base},volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false`, true, dir);
}

function built(s, dir) {
  const parts = s.parts.map((p, i) => {
    const len = p.end - p.start;
    return [
      `[${i}:a]atrim=start=${p.start}:end=${p.end}`,
      "asetpts=PTS-STARTPTS",
      `afade=t=out:st=${(len - 0.05).toFixed(3)}:d=0.05`,
      p.rate ? `asetrate=${(48000 * p.rate).toFixed(1)},aresample=48000` : null,
      `adelay=${Math.round(p.at * 1000)}:all=1`,
      p.db ? `volume=${p.db}dB` : null,
    ].filter(Boolean).join(",") + `[p${i}]`;
  });
  const mixed = `${s.parts.map((_, i) => `[p${i}]`).join("")}amix=inputs=${s.parts.length}:normalize=0:duration=longest`;
  const base = `${parts.join(";")};${mixed},${chain({ start: 0, end: s.len, fade: s.fade }, true)}`;
  const inputs = s.parts.map((p) => p.src);
  const log = analyse([...inputs.flatMap((f) => ["-i", join(here, f)]), "-filter_complex", `${base},volumedetect`, "-f", "null", "-"]);
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(log)[1]);
  encode(s, `${base},volume=${(PEAK_DB - peak).toFixed(2)}dB`, false, dir, inputs);
}

for (const s of EFFECTS.filter(wanted)) effect(s, out);
for (const s of BUILT.filter(wanted)) built(s, out);
for (const s of MUSIC.filter(wanted)) music(s, out);
const takes = TAKES.filter(wanted);
if (takes.length) mkdirSync(takesOut, { recursive: true });
for (const s of takes) (s.lufs ? music : effect)(s, takesOut);
