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

/**
 * Load the game's audio (src/audio/) once the first screen has been drawn,
 * without ever holding it up: its code is a chunk of its own, fetched when the
 * page is idle, and its sounds load after that. Music starts as soon as it is
 * ready; where the browser holds sound back, the first tap releases it.
 */
function startAudioWhenIdle(): void {
  const go = () => {
    import("./audio")
      .then((audio) => audio.startAudio())
      .catch((err) => console.warn("[sound] the game's audio did not start", err));
  };
  // Two frames: whatever the first screen draws at start-up is on screen.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 1500 });
      else setTimeout(go, 200);
    }),
  );
}

/**
 * Read the saved setting, tell the Arcade what it is, and follow the Arcade's
 * mute from then on, and start the game's audio. `reportMuted` is held until
 * the bridge is up, so this is safe to call at start-up.
 */
export async function startSound(): Promise<void> {
  startAudioWhenIdle();
  await loadSettings();
  show(chosenValue("muted") === true);
  gem.reportMuted(muted);
  onPlayerPrefs((prefs) => apply(prefs.muted));
}
