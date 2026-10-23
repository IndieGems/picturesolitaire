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

import { gem } from "./gem";
import { isMuted, onMutedChange, setMuted } from "./sound";
import { choose, loadSettings, onSettingsChange, setting } from "./settings";
import { t } from "./ui/i18n";
import { ICONS } from "./ui/icons";

function row(text: string, input: HTMLInputElement): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "set-row";
  const name = document.createElement("span");
  name.textContent = text;
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
  button.setAttribute("aria-label", t("settings.open"));
  button.setAttribute("aria-haspopup", "dialog");

  const screen = document.createElement("dialog");
  screen.id = "settings-screen";
  screen.setAttribute("aria-labelledby", "settings-title");
  const title = document.createElement("h2");
  title.id = "settings-title";
  title.textContent = t("settings.title");

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
  const vibrationRow = row(t("settings.vibration"), vibration);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "btn close";
  close.dataset.press = "settings.close";
  close.textContent = t("settings.close");
  close.addEventListener("click", () => screen.close());
  // a tap on the shade outside the screen closes it too
  screen.addEventListener("click", (e) => {
    if (e.target === screen) screen.close();
  });

  screen.append(title, row(t("settings.sound"), sound), row(t("settings.volume"), volume), vibrationRow, close);

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
}
