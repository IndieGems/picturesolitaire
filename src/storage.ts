// Where this game keeps what it remembers. Use these; the rule is in AGENTS.md
// ("Where the game keeps what it remembers").
//
// NEVER the browser's own storage (localStorage, sessionStorage, IndexedDB,
// cookies). Every build of this game runs on its own web address, so the next
// publish starts it empty. And one build is served on every channel it is
// promoted to, so a value written while testing on dev is read by the released
// game. `gemctl project doctor` reports any use it finds.
//
//   a volume, a quality preset, a dismissed tip  -> device settings (this device only)
//   a difficulty, a level counter, a best score  -> player values (follow the player)
//   a world, a run, an inventory snapshot        -> saves (a slot declared in game config)
//   currency, items, rewards                     -> gem.me.inventory; see the
//                                                   inventory-and-catalogs skill
//
// Whether a reward or a daily is still owed is the PLATFORM's answer
// (gem.me.progressions.get), read each session. Never keep a "claimed" or
// "reported" flag of your own, anywhere.

import { gem } from "./gem";

// --- This device: presentation settings. They do NOT follow the player.

export type DeviceSettings = Record<string, unknown>;

/**
 * This device's settings for this game, laid over `defaults`.
 *
 * Waits briefly for the arcade, and uses the defaults if it has nothing or
 * never answers (outside a Gem frame it never does). A player must never wait
 * on a splash screen for a volume level. Anything stored may have been written
 * by an older build, so treat every field as possibly missing.
 */
export async function loadDeviceSettings<T extends DeviceSettings>(defaults: T): Promise<T> {
  const held = await gem.deviceSettings.wait(1_500);
  return { ...defaults, ...(held ?? {}) } as T;
}

/**
 * Keep `settings` for this device. Pass the WHOLE object every time: there
 * are no keys and no merge. Debounce a slider, because the arcade accepts
 * thirty writes a minute.
 *
 * Resolves "stored", "too_large" (over 16 KiB) or "unavailable" and never
 * rejects. On anything but "stored", keep playing on the values you hold.
 */
export function saveDeviceSettings(settings: DeviceSettings) {
  return gem.deviceSettings.put(settings);
}

// --- This player: small values that follow them to any device.
//
// These need a signed-in player, so they reject when there is none — a game
// opened outside any Gem frame. `npm run dev` and `npm run preview` play
// through `gemctl serve`, which signs you in.

/** The string this player stored under `key`, or `null` if they never did. */
export async function loadPlayerValue(key: string): Promise<string | null> {
  return (await gem.me.settings.get(key))?.value ?? null;
}

/** Store a string for this player: at most 8 KiB, and 32 keys per game. */
export async function savePlayerValue(key: string, value: string): Promise<void> {
  await gem.me.settings.put(key, value);
}

// --- This player's progress: a document rather than a value.
//
// A save lives in a SLOT, and the slot must be declared in the game config's
// `save_schemas` and promoted to the channel first; the game-config skill
// does that. Writing to an undeclared slot is refused with `not_found`. Save
// when something that matters happens (a level cleared, a run ended), never on
// a timer.

//
// Load a slot before its first write (SDK 16.2 on): the SDK sends the version that load found with
// every write, and refuses a write over a save it has not seen. A load that FAILS is unknown, never
// "no save": play on unsaved and load again later, through src/net/pace.ts's waits (the SDK refuses
// a write to that slot, GemSaveError "load_failed", until a load succeeds). A write refused as
// "save_conflict" (another device or tab saved since) wrote nothing: load again, then merge and
// write, or pass `overwrite` when this device's copy is meant to win. `teardown` on the closing
// write skips the SDK's spacing between writes. src/net/claims.ts and helpers.ts show both.

/** This player's save in `slot`, or `null` if they have never saved. Rejects when the load fails: that is unknown, not `null`. */
export function loadSave<T>(slot: string): Promise<T | null> {
  return gem.me.saves.get<T>(slot);
}

/** Replace this player's save in `slot` with `state` (serialised as JSON), after a load of it. */
export async function writeSave(slot: string, state: unknown, options: { overwrite?: boolean; teardown?: boolean } = {}): Promise<void> {
  await gem.me.saves.put(slot, state, options);
}
