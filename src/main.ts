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
import { WORDMARK } from "./ui/wordmark";

const boot = document.getElementById("boot");
// The tab's title is the game's name in the player's language (index.html carries the English
// one for the moment before this runs: the Arcade's header reads it).
document.title = t("game.title");
if (boot) boot.textContent = t("boot.loading");

// How long the first screen waits for the Arcade's handshake: 3 s, never the
// SDK's default 10. The Arcade offers again every 2 s and the SDK keeps
// listening after this, so a late handshake still connects.
const BRIDGE_WAIT_MS = 3000;

// The round type and the title the first screen draws, asked for beside the
// game's code rather than after it has run. After the bridge, never in
// index.html: the Arcade offers the handshake on the frame's `load`, which
// waits for everything the page asked for first.
function preloadFirstScreen(): void {
  const font = document.createElement("link");
  font.rel = "preload";
  font.as = "font";
  font.type = "font/woff2";
  font.crossOrigin = "anonymous";
  font.href = `${import.meta.env.BASE_URL}fonts/fredoka-latin.woff2`;
  // the title in the size the screen will draw it (src/ui/wordmark.ts): a phone never fetches the big one
  const title = (href: string, media: string) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    link.media = media;
    return link;
  };
  document.head.append(
    font,
    title(WORDMARK.big, WORDMARK.bigWhere),
    title(WORDMARK.small, `not all and ${WORDMARK.bigWhere}`),
  );
}

async function start(): Promise<void> {
  if (window.self !== window.top) await gem.awaitBridge(BRIDGE_WAIT_MS);
  preloadFirstScreen();
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
