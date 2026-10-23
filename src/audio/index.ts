// The game's sound, started once the first screen is up (src/sound.ts loads
// this module lazily, so none of it weighs on the first screen).
//
// The board never calls sound: it emits events (src/events.ts) and this file
// answers each with its sound. A new event that needs a sound gets a line in
// listen() below and, if it needs a new file, a row in src/audio/sounds.ts.

import { on } from "../events";
import { loadSettings } from "../settings";
import { devProbe, load, play, wireEngine } from "./engine";
import { duckMusic, startMusic } from "./music";
import { LOAD_ORDER } from "./sounds";

let started = false;

export async function startAudio(): Promise<void> {
  if (started) return;
  started = true;
  wireEngine();
  listen();
  if (import.meta.env.DEV) (window as unknown as { __audio: unknown }).__audio = { ...devProbe(), play };

  // Effects first, a few at a time: they are small, and the first move wants them.
  const queue = [...LOAD_ORDER];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let name = queue.shift(); name; name = queue.shift()) await load(name);
    }),
  );

  // Music last, once the player's saved mute and volume are known (capped,
  // so a slow read never keeps the game silent). It fades in from nothing.
  await Promise.race([loadSettings(), new Promise((r) => setTimeout(r, 1500))]);
  await startMusic();
}

// --- The deal ripple ------------------------------------------------------------
//
// Each card a stack deals ticks once, placed under its column (left to right
// across the stereo field) and a little higher in pitch further right, so a
// refill sweeping left to right sounds like a ripple. Ticks that arrive at the
// same moment are spread 35 ms apart, so a refill dealt all at once still
// ripples; ticks the board already staggers play as they come.

const DEAL_SPACING = 0.035;
let widestCol = 4;
let nextDealAt = 0;

function dealTick(col: number): void {
  widestCol = Math.max(widestCol, col);
  const across = widestCol > 0 ? col / widestCol : 0.5; // 0 left .. 1 right
  const now = performance.now() / 1000;
  const at = Math.max(now, nextDealAt);
  nextDealAt = at + DEAL_SPACING;
  play("deal", {
    pan: (across - 0.5) * 1.1,
    rate: 0.94 + across * 0.14,
    delay: Math.min(at - now, 0.5),
  });
}

function listen(): void {
  on("piece:lift", () => play("lift"));
  // Put back where it was: the landing tap, lighter.
  on("piece:cancel", () => play("land", { gain: 0.6, rate: 1.08 }));
  on("piece:move", ({ cards, displaced }) => {
    // A bigger piece lands a little lower and fuller.
    play("land", cards > 1 ? { gain: 1.15, rate: 0.9 } : {});
    if (displaced > 0) play("slide", { delay: 0.06, gain: Math.min(1.2, 0.8 + displaced * 0.06) });
  });
  // The more of a picture is joined, the brighter the snap.
  on("piece:merge", ({ size }) => play("merge", { rate: 1 + Math.min(Math.max(size - 2, 0), 8) * 0.03 }));
  on("piece:split", () => play("split"));
  on("picture:complete", () => {
    play("complete");
    duckMusic(0.5, 2.6, 1.6);
  });
  on("cards:fall", ({ cards }) => play("fall", { gain: Math.min(1.2, 0.7 + cards * 0.05) }));
  on("stack:deal", ({ col }) => dealTick(col));
  on("helper:undo", () => play("undo"));
  on("helper:hint", () => play("hint"));
  on("helper:shuffle", () => play("shuffle"));
  on("board:restart", () => play("restart"));
  on("board:won", () => {
    play("won");
    duckMusic(0.2, 7, 3);
  });
  on("ui:press", () => play("ui"));
}
