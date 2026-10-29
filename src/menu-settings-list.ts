// What the Arcade's Gem menu lists of the game's own settings (src/menu-settings.ts
// sends it): a mirror of the gear's screen, in its order, from the values in force.
//
// The game standard ("A game's settings are its own"), and the SDK guide's "Mirror
// your settings into the Arcade's menu": every setting of the screen that is a
// toggle, a slider or a choice, up to eight, but never the game's mute or its
// vibration (the Arcade's quick row has its own: a second switch for the same thing).
// Our screen is Sound (the mute: left out), Volume, Vibration (left out). The table and the
// soundtrack are chosen on the Cosmetics screen, not in Settings (the creator, 2026-10-29), so the
// menu lists neither.
// The Developer row is the creator's, never a setting: never here.
//
// Plain data in, plain data out, with no imports that run: tools/menu-settings-check.mts
// holds it to the rules in the build.

import type { GemGameSetting } from "@indiegems/gem-web-sdk/sdk";

/** The most settings the Arcade's menu lists. */
export const MENU_MAX = 8;

export interface MenuState {
  /** The volume in force, 0 to 100 (src/settings.ts). */
  volume: number;
  /** The rows' names, in the player's language. */
  labels: { volume: string };
}

export function menuSettings(s: MenuState): GemGameSetting[] {
  const list: GemGameSetting[] = [
    // the game's own level, over the Arcade's recommended volume: ours to declare (the guide)
    { id: "volume", label: s.labels.volume, kind: "slider", value: Math.max(0, Math.min(100, Math.round(s.volume))), min: 0, max: 100, step: 1, icon: "sfx" },
  ];
  return list;
}
