// The game's own settings button (the gear at the right end of the top row, on
// every screen) and the screen it opens.
//
// INSIDE THE ARCADE THE GEAR GOES (the creator, 2026-10-29; the game standard, "A game's settings
// are its own": the gear may go when the Gem menu reaches everything it did). The Gem menu has it
// all: Volume in its Settings (src/menu-settings.ts), the mute and vibration in its quick row
// (src/sound.ts reports the mute and follows the Arcade's; vibration starts from the Arcade's
// recommended value, src/settings.ts; Music and Sound are onAudioChannels, src/gem.ts). The screen
// has no action of a player's to put in the menu; on the dev channel the creator's Developer row
// goes there (addMenuRow, src/ui/dev-menu.ts). So while gem.setMenu answers true, html.arcade-menu
// hides the gear on every screen, and Back takes the top row's right end (src/ui/style.css,
// --gear-room); it is asked again when the bridge comes up and when the language changes. Under
// an embedder with no menu, and in a plain tab, the gear stays, with its screen.
//
// Its place is the top row's right end, level with the Arcade's Gem; the app's
// stylesheet (src/ui/style.css, #settings-button) puts it there and moves it in
// beside whatever the Arcade keeps in that corner. Back sits just left of it.
//
// Every value starts from the player's Arcade-wide default until they change it
// here (src/settings.ts). Add the game's own settings as rows below.
//
// The table and the soundtrack are chosen on the Cosmetics screen (src/ui/cosmetics.ts, home's
// Cosmetics tile; the creator, 2026-10-29), not here.
//
// The Arcade's Gem menu lists Volume too, as a mirror of this screen
// (src/menu-settings.ts); this screen stays, for every embedder that draws none.

import { gem, onFrameState } from "./gem";
import { isMuted, onMutedChange, setMuted } from "./sound";
import { choose, loadSettings, onSettingsChange, setting } from "./settings";
import { liveAttr, liveText, onLocaleChange, t } from "./ui/i18n";
import { ICONS } from "./ui/icons";
import { cornerKey } from "./ui/dialogs";
import { startMenuSettings } from "./menu-settings";

// Rows added from outside, above Close: the creator's Developer button (src/ui/dev-menu.ts,
// on the dev channel only); and the screen itself, for closing it from there.
const extra = document.createElement("div");
extra.className = "set-extra";
let screenEl: HTMLDialogElement | null = null;

/** Put `el` in the settings screen, above Close. */
export function addToSettings(el: HTMLElement): void {
  extra.append(el);
}

/** A row of the game's own in the Arcade's Gem menu: its label in the player's language, asked each time it is offered. */
export type MenuRow = { id: string; label: () => string; onSelect: () => void };
const menuRows: MenuRow[] = [];

/**
 * Offer the Arcade's menu the game's rows (at most four; none for a player today), and hide the
 * gear while it answers that it has a menu (html.arcade-menu). Again on every change of the bridge
 * and of the language.
 */
function offerMenu(): void {
  const on = gem.setMenu({ items: menuRows.slice(0, 4).map((r) => ({ id: r.id, label: r.label(), onSelect: r.onSelect })) });
  document.documentElement.classList.toggle("arcade-menu", on);
}

/** Add a row of the game's own to the Arcade's menu (the creator's Developer row, on the dev channel). */
export function addMenuRow(row: MenuRow): void {
  menuRows.push(row);
  offerMenu();
}

/** Close the settings screen if it is open. */
export function closeSettings(): void {
  if (screenEl?.open) screenEl.close();
}

function row(key: string, input: HTMLInputElement): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "set-row";
  const name = liveText(document.createElement("span"), key);
  label.append(name, input);
  return label;
}

/** Draw the gear and its screen into `parent` (the app's column). Call once. */
export function mountSettings(parent: HTMLElement = document.body): void {
  const button = document.createElement("button");
  button.id = "settings-button";
  button.type = "button";
  button.className = "btn round";
  button.dataset.press = "settings.open";
  button.innerHTML = ICONS.gear;
  liveAttr(button, "aria-label", "settings.open");
  button.setAttribute("aria-haspopup", "dialog");

  const screen = document.createElement("dialog");
  screenEl = screen;
  screen.id = "settings-screen";
  screen.setAttribute("aria-labelledby", "settings-title");
  const title = document.createElement("h2");
  title.id = "settings-title";
  liveText(title, "settings.title");

  // Sound: the game's own mute, the same one as the Arcade's (src/sound.ts).
  const sound = document.createElement("input");
  sound.type = "checkbox";
  sound.setAttribute("role", "switch");
  sound.addEventListener("change", () => setMuted(!sound.checked));

  // Volume: 0 to 100, as the Arcade's default is.
  const volume = document.createElement("input");
  volume.type = "range";
  volume.min = "0";
  volume.max = "100";
  volume.step = "1";
  volume.addEventListener("input", () => choose({ volume: volume.valueAsNumber }));

  // Vibration: shown only where this device can vibrate.
  const vibration = document.createElement("input");
  vibration.type = "checkbox";
  vibration.setAttribute("role", "switch");
  vibration.addEventListener("change", () => choose({ vibration: vibration.checked }));
  const vibrationRow = row("settings.vibration", vibration);

  // its own way out, an X at its top right (dialogs.ts)
  const close = liveAttr(cornerKey("close", t("settings.close"), "settings.close", () => screen.close()), "aria-label", "settings.close");
  // a tap on the shade outside the screen closes it too
  screen.addEventListener("click", (e) => {
    if (e.target === screen) screen.close();
  });

  screen.append(close, title, row("settings.sound", sound), row("settings.volume", volume), vibrationRow, extra);

  const render = () => {
    sound.checked = !isMuted();
    volume.valueAsNumber = setting("volume");
    vibration.checked = setting("vibration");
  };
  onMutedChange(render);
  onSettingsChange(render);

  button.addEventListener("click", () => {
    vibrationRow.hidden = !gem.vibration.available;
    render();
    screen.showModal();
  });

  parent.append(button, screen);
  render();
  void loadSettings();
  startMenuSettings();
  // the Arcade's menu holds the settings: the gear goes while it says it has one
  offerMenu();
  onFrameState(offerMenu);
  onLocaleChange(offerMenu);
  // THE PLAYER'S GEMS AND COINS, drawn by the Arcade beside its Gem on every screen (the creator,
  // 2026-10-30, as Untangled): asked once, held by the SDK until the Arcade connects and sent again on
  // every reconnect. The game draws no balance of its own; every top row lays out around the corner
  // they take (gem.viewport.reserved, --gem-reserved-*: style.css's --row-left, --row-right), and a
  // win's Coins fly to them (src/net/claims.ts, cueCoins).
  gem.setWalletVisible(true, { only: ["GEMS", "ARCADE_TICKETS"] });
}
