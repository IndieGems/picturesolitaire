// The game's sound: one mute for ALL of its audio, wired to the Gem Arcade both
// ways, and one master volume.
//
// Every game needs its own mute, on its settings screen (src/settings-screen.ts):
// a page that embeds the game without the Arcade's menu has no other one, and
// the platform's release checklist requires it. The Arcade's Gem menu has a
// Mute row too, and the two agree:
//
//   the Arcade's mute -> prefs.muted (onPlayerPrefs) -> this switch
//                        (the SDK has already silenced the game itself)
//   this switch       -> gem.reportMuted              -> the Arcade's mute
//
// Make every sound the game plays obey both: route all audio through one master
// gain node or bus, set it from masterGain() and again on onMutedChange and
// onSettingsChange, so a sound added later cannot slip past. That bus is in
// src/audio/engine.ts; play every sound through it (src/audio/sounds.ts).
//
// On desktop the Arcade may start the game before the player has pressed
// anything, so an AudioContext created at boot starts suspended: resume it on
// the first pointerdown, keydown or gamepad press.

import { gem, onPlayerPrefs } from "./gem";
import { choose, chosenValue, loadSettings, setting } from "./settings";

let muted = false;
const listeners = new Set<(muted: boolean) => void>();

/** Is the game muted right now? */
export function isMuted(): boolean {
  return muted;
}

/** The gain for the game's master bus: 0 while muted, else the volume, 0 to 1. */
export function masterGain(): number {
  return muted ? 0 : setting("volume") / 100;
}

/** Run `listener` whenever the mute changes, whoever changed it. Returns the unsubscribe. */
export function onMutedChange(listener: (muted: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function show(next: boolean): void {
  if (next === muted) return;
  muted = next;
  for (const listener of listeners) listener(muted);
}

function apply(next: boolean): void {
  if (next === muted) return;
  show(next);
  choose({ muted });
}

/** The player used the game's own switch: apply it, and tell the Arcade. */
export function setMuted(next: boolean): void {
  apply(next);
  gem.reportMuted(muted);
}

// --- Loading the audio, in two steps (agreed with UI, 2026-10-28) ---------------
//
// The game's audio (src/audio/) never holds up the first screen, nor competes
// with home's pictures:
//
// 1. Once home is drawn and the page is idle (startSound): the audio code, a
//    chunk of its own, the Sound Tuning mix and the button click, a few KB
//    in all, so the first tap on home is heard.
// 2. Once home is whole (homeWhole, from UI: its pictures in, or its wait
//    capped): every other effect, then the music, which starts as soon as it
//    is ready. The player's first press brings this forward (the board's
//    sounds come next), and it happens after REST_BY_MS whatever else does.
//
// Where the browser holds sound back, the first tap releases it, and is heard.

/** The latest the rest of the sounds wait for homeWhole(). */
const REST_BY_MS = 10_000;

let audio: Promise<typeof import("./audio") | null> | null = null;
let restAsked = false;

/** The audio code, fetched once: step 1 starts as it arrives. */
function audioCode(): Promise<typeof import("./audio") | null> {
  return (audio ??= import("./audio").then(
    (code) => {
      code.startAudio().catch((err) => console.warn("[sound] the game's audio did not start", err));
      return code;
    },
    (err) => {
      console.warn("[sound] the game's audio did not load", err);
      return null;
    },
  ));
}

/**
 * Home is whole (UI: its pictures are in, or its wait ran out): the rest of
 * the game's sounds, and its music, may load now. Once; again is harmless.
 */
export function homeWhole(): void {
  if (restAsked) return;
  restAsked = true;
  void audioCode().then((code) => code?.loadRest().catch((err) => console.warn("[sound] the game's sounds did not load", err)));
}

/** Step 1 once the first screen has been drawn and the page is idle. */
function startAudioWhenIdle(): void {
  const go = () => void audioCode();
  // Two frames: whatever the first screen draws at start-up is on screen.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 1500 });
      else setTimeout(go, 200);
    }),
  );
  // Step 2's backstops: the first press, or time.
  for (const type of ["pointerdown", "keydown"]) addEventListener(type, homeWhole, { capture: true, passive: true, once: true });
  setTimeout(homeWhole, REST_BY_MS);
}

/**
 * Read the saved setting, tell the Arcade what it is, and follow the Arcade's
 * mute from then on, and start the game's audio (step 1 above; UI calls
 * homeWhole for step 2). `reportMuted` is held until the bridge is up, so this
 * is safe to call at start-up.
 */
export async function startSound(): Promise<void> {
  startAudioWhenIdle();
  await loadSettings();
  show(chosenValue("muted") === true);
  gem.reportMuted(muted);
  onPlayerPrefs((prefs) => apply(prefs.muted));
}
