// picturesolitaire — entry point.
// Joins the Gem platform: the bridge to whatever frames this game. Import
// `gem` from it wherever the game needs the player, saves or rooms.
import "./gem";
import { mountSettings } from "./settings-screen";
import { startSound } from "./sound";
// A long press or a right click is the game's, never the browser's. Without this a
// long press on a picture (a button's icon) opens the phone browser's "save image"
// menu over the game. index.html's base styles cover iOS's callout and text selection.
addEventListener("contextmenu", (e) => e.preventDefault());

// A pinch is the game's too: iOS Safari zooms the page past index.html's
// touch-action unless its own gesture events are refused.
for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
  addEventListener(type, (e) => e.preventDefault(), { passive: false });
}

document.getElementById("boot")!.textContent = "picturesolitaire is running";

// The game's own settings button, top-right, and its screen (see
// src/settings-screen.ts); the Arcade's menu never opens them.
mountSettings();
// The game's own mute, wired to the Arcade (see src/sound.ts).
void startSound();
