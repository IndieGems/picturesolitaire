// The game's own settings button, top-right, and the screen it opens.
//
// The Gem Arcade's menu never opens a game's settings: this button is the only
// way a player reaches them, so it is always drawn. The Arcade's own control is
// the Gem, top-left; keep that corner for the game's Home / Back.
//
// Every value starts from the player's Arcade-wide default until they change it
// here (src/settings.ts). Add the game's own settings as rows below; when the
// game has a menu of its own, it may open this screen from there too.

import { gem } from "./gem";
import { isMuted, onMutedChange, setMuted } from "./sound";
import { choose, loadSettings, onSettingsChange, setting } from "./settings";

const STYLE = `
#settings-button {
  position: fixed;
  z-index: 1;
  top: calc(max(var(--safe-top, 0px), var(--reserved-tr-height, 0px)) + 8px);
  right: calc(var(--safe-right, 0px) + 8px);
  min-width: 44px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #2a3240;
  border-radius: 22px;
  background: #141a22;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
#settings-screen {
  width: min(320px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 16px;
  border: 1px solid #2a3240;
  border-radius: 12px;
  background: #141a22;
  color: #cdd6e4;
  font: inherit;
}
#settings-screen::backdrop { background: rgb(0 0 0 / 0.5); }
#settings-screen h2 { margin: 0 0 12px; font-size: 18px; }
#settings-screen label { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; }
#settings-screen label[hidden] { display: none; }
#settings-screen input[type="checkbox"] { width: 22px; height: 22px; }
#settings-screen input[type="range"] { flex: 1; max-width: 160px; }
#settings-screen .close {
  margin-top: 12px;
  width: 100%;
  min-height: 44px;
  border: 1px solid #2a3240;
  border-radius: 8px;
  background: #1d2530;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
`;

function row(text: string, input: HTMLInputElement): HTMLLabelElement {
  const label = document.createElement("label");
  label.append(text, input);
  return label;
}

/** Draw the settings button and its screen. Call once, after `import "./gem"`. */
export function mountSettings(): void {
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.append(style);

  const button = document.createElement("button");
  button.id = "settings-button";
  button.type = "button";
  button.textContent = "Settings";
  button.setAttribute("aria-haspopup", "dialog");

  const screen = document.createElement("dialog");
  screen.id = "settings-screen";
  screen.setAttribute("aria-labelledby", "settings-title");
  const title = document.createElement("h2");
  title.id = "settings-title";
  title.textContent = "Settings";

  // Sound: the game's own mute, the same one as the Arcade's (src/sound.ts).
  const sound = document.createElement("input");
  sound.type = "checkbox";
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
  vibration.addEventListener("change", () => choose({ vibration: vibration.checked }));
  const vibrationRow = row("Vibration", vibration);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "close";
  close.textContent = "Close";
  close.addEventListener("click", () => screen.close());

  screen.append(title, row("Sound", sound), row("Volume", volume), vibrationRow, close);

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

  document.body.append(button, screen);
  render();
  void loadSettings();
}
