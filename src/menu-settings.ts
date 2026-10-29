// The game's settings in the Arcade's Gem menu (gem.settings, SDK 14+): what the
// list is, and why, is src/menu-settings-list.ts. This keeps it true.
//
// - The list is screen state: each declare is the whole list, sent again whenever
//   what it shows would change (a value moved here or in the Arcade, the language),
//   and only then.
// - A change made in the menu is the player's own choice, exactly as on the gear's
//   screen: kept where that setting is kept (the volume on this device,
//   src/settings.ts) and applied at once, even while the menu holds the game
//   paused. Anything we did not declare is ignored. (The table is chosen on the
//   Cosmetics screen now, src/ui/cosmetics.ts, so the menu no longer lists it.)
// - The gear and its screen stay: another embedder shows none of this.

import { gem } from "./gem";
import { choose, onSettingsChange, setting } from "./settings";
import { onLocaleChange, t } from "./ui/i18n";
import { menuSettings } from "./menu-settings-list";

let last = "";
let started = false;

function mirror(): void {
  const list = menuSettings({ volume: setting("volume"), labels: { volume: t("settings.volume") } });
  const key = JSON.stringify(list);
  if (key === last) return;
  last = key;
  gem.settings.declare(list);
}

/** Start mirroring (src/settings-screen.ts, once). */
export function startMenuSettings(): void {
  if (started) return;
  started = true;
  gem.settings.onChange(({ id, value }) => {
    if (id === "volume" && typeof value === "number") choose({ volume: Math.max(0, Math.min(100, Math.round(value))) });
  });
  onSettingsChange(mirror);
  // the label, in the language on screen
  onLocaleChange(mirror);
  mirror();
}
