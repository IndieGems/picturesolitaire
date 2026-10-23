// picturesolitaire: the page's real entry, the platform bridge first and the
// game after it.
//
// The Arcade's handshake offer is DELIVERED, not polled, and delivery needs an
// idle main thread: an offer that lands while the page parses the whole game
// waits behind it, and on an iPhone its port can be dead by then (the game
// standard, "Boot through a tiny entry"). So this file pulls in nothing but the
// bridge (./gem), the page guards and the boot text, lets the bridge settle,
// and only then fetches the game. ./gem has already sent `ready()`: the
// page's own loading text is what the player sees until home replaces it.
//
// Keep it tiny: ask what an import drags in before adding one here. The board
// is wired through the app shell (src/ui/app.ts), never here.

import "./ui/browser"; // no zoom, selection or long-press menus, from the first frame
import { gem } from "./gem";
import { t } from "./ui/i18n";

const boot = document.getElementById("boot");
if (boot) boot.textContent = t("boot.loading");

// How long the first screen waits for the Arcade's handshake: 3 s, never the
// SDK's default 10. The Arcade offers again every 2 s and the SDK keeps
// listening after this, so a late handshake still connects.
const BRIDGE_WAIT_MS = 3000;

// The round type the first screen draws in, asked for beside the game's code
// rather than after it has run. After the bridge, never in index.html: the
// Arcade offers the handshake on the frame's `load`, which waits for
// everything the page asked for first.
function preloadFont(): void {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "font";
  link.type = "font/woff2";
  link.crossOrigin = "anonymous";
  link.href = `${import.meta.env.BASE_URL}fonts/fredoka-latin.woff2`;
  document.head.append(link);
}

async function start(): Promise<void> {
  if (window.self !== window.top) await gem.awaitBridge(BRIDGE_WAIT_MS);
  preloadFont();
  // a phone on a bad connection can drop the fetch: try once more, then say so
  for (let tries = 0; ; tries++) {
    try {
      const { startApp } = await import("./ui/app");
      await startApp();
      return;
    } catch (err) {
      if (tries >= 1) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

start().catch((err) => {
  console.error(err);
  if (boot) boot.textContent = t("boot.failed");
});
