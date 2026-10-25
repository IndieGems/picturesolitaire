// The game's settings in the Arcade's Gem menu (gem.settings, SDK 14+): what the
// list is, and why, is src/menu-settings-list.ts. This keeps it true.
//
// - The list is screen state: each declare is the whole list, sent again whenever
//   what it shows would change (a value moved here or in the Arcade, the tables
//   the player owns), and only then.
// - A change made in the menu is the player's own choice, exactly as on the gear's
//   screen: kept where that setting is kept (the volume on this device,
//   src/settings.ts; the table with the player, src/ui/tables.ts) and applied at
//   once, even while the menu holds the game paused. Anything we did not declare
//   is ignored.
// - The gear and its screen stay: another embedder shows none of this.

import { gem } from "./gem";
import { onVerdict } from "./net/claims";
import { choose, onSettingsChange, setting } from "./settings";
import { t } from "./ui/i18n";
import { chooseTable, chosenTable, onTableChange, ownedTableArts, tableTitle } from "./ui/tables";
import { menuSettings } from "./menu-settings-list";

let owned: { id: string; label: string }[] = [];
let last = "";
let started = false;

function mirror(): void {
  const list = menuSettings({
    volume: setting("volume"),
    table: chosenTable(),
    tables: owned,
    labels: { volume: t("settings.volume"), table: t("settings.table") },
  });
  const key = JSON.stringify(list);
  if (key === last) return;
  last = key;
  gem.settings.declare(list);
}

let reading = 0;
async function readOwned(): Promise<void> {
  const token = ++reading;
  const arts = await ownedTableArts();
  if (token !== reading) return;
  owned = arts.map((a) => ({ id: a.id, label: tableTitle(a) }));
  mirror();
}

/** Start mirroring (src/settings-screen.ts, once). */
export function startMenuSettings(): void {
  if (started) return;
  started = true;
  gem.settings.onChange(({ id, value }) => {
    if (id === "volume" && typeof value === "number") choose({ volume: Math.max(0, Math.min(100, Math.round(value))) });
    else if (id === "table" && typeof value === "string")
      void chooseTable(value).finally(() => {
        // a table no longer owned is refused: the menu, which wrote the value into its copy, hears ours again
        last = "";
        mirror();
      });
  });
  onSettingsChange(mirror);
  onTableChange(mirror);
  // a win that paid may have granted a table (the guide's keepsake)
  onVerdict((v) => {
    if (v.status === "paid") void readOwned();
  });
  mirror();
  void readOwned();
}
