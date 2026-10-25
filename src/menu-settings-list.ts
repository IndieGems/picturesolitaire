// What the Arcade's Gem menu lists of the game's own settings (src/menu-settings.ts
// sends it): a mirror of the gear's screen, in its order, from the values in force.
//
// The game standard ("A game's settings are its own"), and the SDK guide's "Mirror
// your settings into the Arcade's menu": every setting of the screen that is a
// toggle, a slider or a choice, up to eight, but never the game's mute or its
// vibration (the Arcade's quick row has its own: a second switch for the same thing).
// Our screen is Sound (the mute: left out), Volume, Vibration (left out), Table.
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
  /** The table on screen (src/ui/tables.ts). */
  table: string;
  /** The tables the player may choose, in the screen's order, with their names. */
  tables: readonly { id: string; label: string }[];
  /** The rows' names, in the player's language. */
  labels: { volume: string; table: string };
}

export function menuSettings(s: MenuState): GemGameSetting[] {
  const list: GemGameSetting[] = [
    // the game's own level, over the Arcade's recommended volume: ours to declare (the guide)
    { id: "volume", label: s.labels.volume, kind: "slider", value: Math.max(0, Math.min(100, Math.round(s.volume))), min: 0, max: 100, step: 1, icon: "sfx" },
  ];
  // the screen shows the Table row only when there is a choice to make; a menu choice holds two
  // to four options, so past four tables it stays on the gear's screen alone
  if (s.tables.length >= 2 && s.tables.length <= 4 && s.tables.some((o) => o.id === s.table)) {
    list.push({ id: "table", label: s.labels.table, kind: "choice", value: s.table, options: s.tables.map((o) => ({ id: o.id, label: o.label })) });
  }
  return list;
}
