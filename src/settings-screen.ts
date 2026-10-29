// The game's own settings button (the gear at the right end of the top row, on
// every screen) and the screen it opens.
//
// The Gem Arcade's menu never opens a game's settings: this button is the only
// way a player reaches them, so it is always drawn, over every card too. Its
// place is the top row's right end, level with the Arcade's Gem; the app's
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

import { gem } from "./gem";
import { isMuted, onMutedChange, setMuted } from "./sound";
import { choose, loadSettings, onSettingsChange, setting } from "./settings";
import { liveAttr, liveText, t } from "./ui/i18n";
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
}
