// The game's settings: what the player chose, over the Arcade's defaults.
//
// The rule is the Gem Web SDK's, in what-a-game-must-do.md, "Game settings"
// (node_modules/@indiegems/gem-web-sdk/docs/):
//
//   the player's choice here        (saved on this device)
//   else the Arcade's default       (gem.prefs.recommended)
//   else DEFAULTS below
//
// The player's choice in the game always wins, and only a choice is saved. A
// setting the player never touched follows the Arcade's default, including
// when they change it in the Arcade's Settings mid-game.
//
// Device configuration (a volume, a graphics quality, a look speed) is kept
// here, on this device. A choice that must follow the player to another device
// (a difficulty, key bindings) goes in savePlayerValue (src/storage.ts) instead.
//
// To add a setting: a field in Chosen and in DEFAULTS, a row in
// src/settings-screen.ts, and setting("<key>") wherever the game uses it.

import { gem, onPlayerPrefs } from "./gem";
import { loadDeviceSettings, saveDeviceSettings } from "./storage";

/** What the player chose on the settings screen, and nothing else. */
export type Chosen = {
  v?: 1;
  muted?: boolean;
  volume?: number;
  vibration?: boolean;
};

/** Where a setting starts when neither the player nor the Arcade says. */
const DEFAULTS = { volume: 100, vibration: true };
type Key = keyof typeof DEFAULTS;

let chosen: Chosen = {};
let loaded: Promise<void> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function changed(): void {
  for (const listener of listeners) listener();
}

/** The setting in force: the player's choice, else the Arcade's default, else ours. */
export function setting<K extends Key>(key: K): (typeof DEFAULTS)[K] {
  return (chosen[key] ?? gem.prefs?.recommended?.[key] ?? DEFAULTS[key]) as (typeof DEFAULTS)[K];
}

/** What the player chose for `key`, or `undefined` if they never did. */
export function chosenValue<K extends keyof Chosen>(key: K): Chosen[K] {
  return chosen[key];
}

/**
 * The player changed a setting: it is theirs from now on, and the Arcade's
 * default no longer moves it. Kept on this device; writes are debounced,
 * because the Arcade accepts thirty a minute and a slider sends far more.
 */
export function choose(patch: Omit<Chosen, "v">): void {
  chosen = { ...chosen, ...patch, v: 1 };
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveDeviceSettings(chosen), 400);
  changed();
}

/**
 * The dev menu's own values kept on this device beside the settings (the object is one
 * whole, so they ride in it): a key that starts "dev", read and written by dev-only code
 * alone, so a release build never writes one. Read once the settings have loaded
 * (loadSettings); undefined before that and when never kept.
 */
export function devValue(key: `dev${string}`): unknown {
  return (chosen as Record<string, unknown>)[key];
}
export function keepDevValue(key: `dev${string}`, value: unknown): void {
  chosen = { ...chosen, [key]: value } as Chosen;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveDeviceSettings(chosen), 400);
}

/** Run `listener` whenever a setting may have changed, whoever changed it. Returns the unsubscribe. */
export function onSettingsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Read what the player chose on this device, once; every caller shares the
 * one load. Never hold the first frame on it: the defaults apply until it
 * resolves, and outside a Gem frame it resolves with nothing.
 */
export function loadSettings(): Promise<void> {
  loaded ??= (async () => {
    chosen = await loadDeviceSettings<Chosen>({});
    // The Arcade's defaults changed: every setting the player never chose follows.
    onPlayerPrefs(changed);
    changed();
  })();
  return loaded;
}

/** Vibrate, where this device can and the player has not switched it off. */
export function vibrate(pattern: number | readonly number[]): boolean {
  return setting("vibration") && gem.vibration.vibrate(pattern);
}
