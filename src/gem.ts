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

/** The Arcade's Music and Sound switches (its Gem menu's quick row). */
export type AudioChannels = { music: boolean; sounds: boolean };

const prefsHandlers = new Set<(prefs: GemPrefs) => void>();
const pauseHandlers = new Set<(paused: boolean) => void>();
const channelHandlers = new Set<(channels: AudioChannels) => void>();
const terminateHandlers = new Set<(graceMs: number) => void>();

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

  // The Arcade paused the game (its menu is open, or it parked the game while
  // the player browses) or let it go on. Handed to every `onArcadePause`.
  onPause: (paused) => {
    for (const handler of pauseHandlers) handler(paused);
  },

  // The Arcade's Music and Sound switches. PASSING this is what tells the
  // Arcade the game can silence its music and its effects separately; without
  // it, the Arcade's Music switch does nothing here. Handed to every
  // `onAudioChannels` (src/audio/ follows it).
  onAudioChannels: (channels) => {
    for (const handler of channelHandlers) handler(channels);
  },

  // The Arcade is about to close the game, and says how long it will wait:
  // the moment to send what is not saved yet (src/ui/guide-save.ts).
  onWillTerminate: (notice) => {
    for (const handler of terminateHandlers) handler(notice.graceMs);
  },
});

/** Run `handler(graceMs)` when the Arcade is about to close the game. Returns the unsubscribe. */
export function onWillTerminate(handler: (graceMs: number) => void): () => void {
  terminateHandlers.add(handler);
  return () => terminateHandlers.delete(handler);
}

/** Run `handler` whenever the Arcade pauses or resumes the game. Returns the unsubscribe. */
export function onArcadePause(handler: (paused: boolean) => void): () => void {
  pauseHandlers.add(handler);
  return () => pauseHandlers.delete(handler);
}

/**
 * Run `handler` with the Arcade's Music and Sound switches now, if the Arcade
 * has sent them, and again whenever either changes. Both are `true` until the
 * Arcade says otherwise. Returns the unsubscribe.
 */
export function onAudioChannels(handler: (channels: AudioChannels) => void): () => void {
  channelHandlers.add(handler);
  if (gem.prefs) handler({ music: gem.prefs.music !== false, sounds: gem.prefs.sounds !== false });
  return () => channelHandlers.delete(handler);
}

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

// ANALYTICS ON THE WAY OUT. track() only queues; the SDK sends the queue on a
// 10 s timer and as the page unloads (pagehide, the Arcade's terminate). But a
// page that is only HIDDEN, or that the Arcade PAUSES, just stops that timer,
// and a hidden page may be dropped without ever unloading: whatever was queued
// is then lost (QA, 0.41.0: a friend's challenge_won never landed when the page
// closed ~8 s after the win). So the game sends the queue itself at those two
// moments, and right after an event that ends something (a one-off's result).
// keepalive lets the send outlive the page; a refusal it can retry (too soon, no
// network) puts the events back on the queue, so sending early never loses one.

/** Send what analytics has queued, now (a no-op when nothing is queued, or unframed). */
export function sendAnalyticsNow(): void {
  if (gem.analytics.pending === 0) return;
  gem.analytics.flush({ keepalive: true }).catch(() => undefined);
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") sendAnalyticsNow();
});
onArcadePause((paused) => {
  if (paused) sendAnalyticsNow();
});
