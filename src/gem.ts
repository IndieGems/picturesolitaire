// The platform bridge: @indiegems/gem-web-sdk, its unified `./sdk` entry.
//
// The SDK ships INSIDE this game. It is an ordinary `dependencies` entry in
// package.json pinned to ONE exact version — a bare number, never a ^ or ~
// range, which would let an install move the game to a release nobody chose and
// let its client and server bundles drift apart. To upgrade, change the number,
// install, and commit the lockfile. (A project set up before 5.9.0 pins the
// published tarball URL instead: the same package, and still correct.) Nothing
// goes in `index.html`: a page that also loaded the SDK from a script tag would
// fetch and run a second copy that nothing imports.
//
// `/sdk` is the one entry. `.`, `/game` and `/server` are narrow doors over the
// same modules; `/game` in particular carries no `defineServer`, so a game that
// later grows server logic fails with a missing export that reads like a
// packaging bug.
//
// `createGem()` is synchronous. It performs the handshake with whatever frames
// the game: the arcade, the Gem Editor, or the page `npm run dev` and
// `npm run preview` open through `gemctl serve`. Opened unframed it never
// connects, so the game has no player, no saves and no config.

import { createGem, type GemPrefs } from "@indiegems/gem-web-sdk/sdk";

const prefsHandlers = new Set<(prefs: GemPrefs) => void>();

export const gem = createGem({
  // No `allowedEmbedders`. The SDK always allows the Gem Arcade's website and
  // app, and a dev host on your own machine (`gemctl serve`, the Gem Editor)
  // while this game is served from it. Add the option only if a site of your
  // own embeds this game; whatever it lists is ADDED to the arcade's origins.

  // A refused handshake is the most likely way this game fails, and it is
  // SILENT on the wire by design: a page that is not allowed to embed the game
  // learns nothing, so the frame reports nothing. This callback is the only
  // signal that a refusal happened rather than a handshake never arriving.
  onRefused: (reason) => {
    console.error(`[gem] handshake refused: ${reason}`);
  },

  // The player's preferences — `muted`, `reducedMotion`, `locale`, and
  // `recommended`, their Arcade-wide defaults for the game's own settings
  // (src/settings.ts) — pushed by
  // the Arcade after the handshake and whenever they change, handed to every
  // `onPlayerPrefs` below. It touches nothing but that list: a callback passed
  // INTO `createGem` must not reach for `gem` (see `ready()` below for why).
  onPrefs: (prefs) => {
    for (const handler of prefsHandlers) handler(prefs);
  },
});

/**
 * Run `handler` with the player's preferences now, if the Arcade has sent
 * them, and again every time they change. `src/sound.ts` follows `muted` with
 * it and `src/settings.ts` follows `recommended`; a game that animates owes
 * `reducedMotion` one too.
 */
export function onPlayerPrefs(handler: (prefs: GemPrefs) => void): void {
  prefsHandlers.add(handler);
  if (gem.prefs) handler(gem.prefs);
}

// `ready()` is HELD if the port is not up yet and delivered the moment it is
// (see the SDK's `frame.ts`), so it does not need gating — and calling it here
// rather than from an `onStateChange` callback matters for a reason that only
// bites in the Arcade: a callback passed INTO `createGem` can run during
// construction, while `gem` is still in its temporal dead zone. That is a
// `ReferenceError` framed and nothing at all standalone, which is the exact
// shape of bug this scaffold exists to stop shipping.
//
// Anything else that talks to the platform DOES need gating — add an
// `onStateChange` and wait for `"connected"`, reading the handle you already
// have here rather than one the callback closes over.
gem.frame?.ready();
