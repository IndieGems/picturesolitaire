// The game's sound, started once the first screen is up (src/sound.ts loads
// this module lazily, so none of it weighs on the first screen).
//
// The board never calls sound: it emits events (src/events.ts) and this file
// answers each with its sound. A new event that needs a sound gets a line in
// listen() below and, if it needs a new file, a row in src/audio/sounds.ts.

import { on, type GameEvents } from "../events";
import { loadSettings } from "../settings";
import { devProbe, fileOf, load, play, refreshMix, wireEngine, type Voice } from "./engine";
import { duckMusic, startMusic } from "./music";
import { LOAD_ORDER } from "./sounds";

let started = false;

export async function startAudio(): Promise<void> {
  if (started) return;
  started = true;
  wireEngine();
  listen();
  if (import.meta.env.DEV) (window as unknown as { __audio: unknown }).__audio = { ...devProbe(), play };

  // The Sound Tuning editor's mix first (a small file, capped), so a picked
  // take loads in place of the original.
  await Promise.race([refreshMix(), new Promise((r) => setTimeout(r, 1000))]);

  // Effects next, a few at a time: they are small, and the first move wants them.
  const queue = [...LOAD_ORDER];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let name = queue.shift(); name; name = queue.shift()) await load(fileOf(name));
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

// --- Columns landing after a clear -----------------------------------------------
//
// Each column whose cards moved after a clear ticks once as its last card
// touches down (column:land arrives in landing order: left to right for the
// refill), a little higher further right, so the refill has a beat. The deal
// ticks mark cards leaving the stacks, these their arrival. Columns that land
// together (a fall with nothing to deal) are spread 40 ms apart as they come.

const SETTLE_SPACING = 0.04;
let nextSettleAt = 0;

function settleTick(col: number): void {
  widestCol = Math.max(widestCol, col);
  const across = widestCol > 0 ? col / widestCol : 0.5; // 0 left .. 1 right
  const now = performance.now() / 1000;
  const at = Math.max(now, nextSettleAt);
  nextSettleAt = at + SETTLE_SPACING;
  play("settle", { pan: (across - 0.5) * 1.1, rate: 0.95 + across * 0.2, delay: Math.min(at - now, 0.3) });
}

// --- When a card touches down ----------------------------------------------------
//
// The board emits piece:move and cards:fall as their animations START, so the
// tap waits for the card to arrive. When the board says how long that takes
// (`ms`), a move's tap lands at 85% of it (its ease-out reads as arrived by
// then), a fall's at the end (falling cards land at full speed and bounce,
// since 2026-10-27); until it does, these are its usual times
// (src/board/tuning.ts: a drop settles in about 170 ms, a one-row fall in 150 ms).
const MOVE_LANDS = 0.13;
const FALL_LANDS = 0.15;

function landsIn(payload: object, fallback: number, at = 0.85): number {
  const ms = (payload as { ms?: unknown }).ms;
  return typeof ms === "number" && ms >= 0 ? Math.min(ms * at, 600) / 1000 : fallback;
}

/** The flourish still ringing, cut short if the win cue starts over it. */
let flourish: Voice | null = null;
/** The win cue, cut short if a milestone card replaces the win card. */
let winCue: Voice | null = null;
/** The found-it fanfare, cut short if its moment is skipped. */
let foundCue: Voice | null = null;
/** When the last suitcase item was packed (performance.now ms). */
let packedAt = -Infinity;

// --- Milestones ------------------------------------------------------------------
//
// A milestone card replaces the win card, and its cue replaces the win cue. The
// UI raises the card from its own board:won handler, so milestone:show usually
// arrives BEFORE this file hears board:won; either order ends with the
// milestone's cue alone.
//
// The game standard: fetch the cue only when a board that can reach a milestone
// opens. Today that is the guided start's board, campaign board 1; a new
// milestone adds its board here. A cue still loading when the card goes up
// plays if it arrives within LATE_CUE, else not at all.

const MILESTONE_BOARDS = new Set(["1"]);
const LATE_CUE = 2000;
let milestoneAt = -Infinity;

function milestone(): void {
  const asked = performance.now();
  milestoneAt = asked;
  flourish?.fadeOut(0.4);
  flourish = null;
  winCue?.fadeOut(0.3);
  winCue = null;
  void load(fileOf("milestone")).then((buffer) => {
    if (!buffer || performance.now() - asked > LATE_CUE) return;
    if (play("milestone")) duckMusic(0.15, 8, 3);
  });
}

// --- Destinations ----------------------------------------------------------------
//
// A board's destination picture gets the harp at picture:complete like any
// picture; about 1.1 s later its postcard is open (destination:reveal) and the
// fanfare plays under the place's name, the harp fading out beneath it. A
// repeat (after Undo or a restart) has had its harp: nothing more. The postcard
// holds 1.5 s, then leaves and destination:done comes; sooner than that is a
// tap that skipped, which stops the fanfare (at once if the postcard never
// opened), while the natural end lets it ring out.

const REVEAL_HOLD = 1500;
let fanfare: Voice | null = null;
let fanfareAt = 0;

function reveal(p: GameEvents["destination:reveal"]): void {
  if (p.again) return;
  flourish?.fadeOut(0.5);
  flourish = null;
  fanfare = play("fanfare", { delay: 0.03 });
  fanfareAt = performance.now();
  if (fanfare) duckMusic(0.3, 2, 1.5);
}

function revealDone(): void {
  const held = performance.now() - fanfareAt;
  fanfare?.fadeOut(held < 150 ? 0.03 : held < REVEAL_HOLD ? 0.25 : 0.8);
  fanfare = null;
}

function listen(): void {
  on("piece:lift", () => play("lift"));
  // Put back where it was: the landing tap, lighter.
  on("piece:cancel", () => play("land", { gain: 0.6, rate: 1.08 }));
  on("piece:move", (p) => {
    // A bigger piece lands a little lower and fuller.
    play("land", { delay: landsIn(p, MOVE_LANDS), ...(p.cards > 1 ? { gain: 1.15, rate: 0.9 } : {}) });
    // The pushed-aside cards swish as they travel.
    if (p.displaced > 0) play("slide", { delay: 0.04, gain: Math.min(1.2, 0.8 + p.displaced * 0.06) });
  });
  // The more of a picture is joined, the brighter the snap.
  on("piece:merge", ({ size }) => play("merge", { rate: 1 + Math.min(Math.max(size - 2, 0), 8) * 0.03 }));
  on("piece:split", () => play("split"));
  // The picture leaves in about 450 ms (swell and twinkles, then picture:clear
  // at ~230 and a shrink to nothing): the flourish's rising harp run IS the
  // twinkle, and it peaks as the picture vanishes, ringing on under the falling
  // cards. Two pictures finished by one move (60 ms apart) get one flourish.
  on("picture:complete", () => {
    flourish = play("complete") ?? flourish;
    duckMusic(0.5, 2.4, 1.6);
  });
  on("destination:reveal", reveal);
  on("destination:done", revealDone);
  on("cards:fall", (p) => play("fall", { delay: landsIn(p, FALL_LANDS, 1), gain: Math.min(1.2, 0.7 + p.cards * 0.05) }));
  on("stack:deal", ({ col }) => dealTick(col));
  on("column:land", ({ col }) => settleTick(col));
  // A press on a stack: its little "no", placed under the stack like a deal tick.
  on("stack:nope", ({ col }) => {
    widestCol = Math.max(widestCol, col);
    play("nope", { pan: ((widestCol > 0 ? col / widestCol : 0.5) - 0.5) * 1.1 });
  });
  on("helper:undo", () => play("undo"));
  on("helper:hint", () => play("hint"));
  on("helper:shuffle", () => play("shuffle"));
  on("board:restart", () => play("restart"));
  on("board:stuck", () => play("stuck"));
  // A helper pressed that could do nothing (a Shuffle with no mix to make): the
  // same gentle "hm", just after the button's click so the two don't blur.
  on("helper:refused", () => play("stuck", { delay: 0.06 }));
  on("board:won", () => {
    // A milestone card went up for this win: its cue plays instead.
    if (performance.now() - milestoneAt < 1000) return;
    // The last flourish's tail would blur the win cue's first chord.
    flourish?.fadeOut(0.5);
    flourish = null;
    winCue = play("won");
    duckMusic(0.2, 7, 3);
  });
  on("board:start", ({ level }) => {
    if (MILESTONE_BOARDS.has(level)) void load(fileOf("milestone"));
  });
  on("milestone:show", milestone);
  // A hard or super hard board's banner just appeared (UI, once per opening).
  on("board:mark", ({ mark }) => play(mark === "super" ? "supermark" : "hardmark"));
  // A trip's stamp lands on its passport page (UI, the instant it lands).
  on("trip:stamp", () => play("stamp"));
  // A Souvenir's sticker is patted onto its trip's page (UI, at the touch, ~0.85 s
  // after the passport opens). A quick tap from the win card can bring it
  // under 2 s into the win cue: the cue gives way, so the sticker is heard.
  on("souvenir:sticker", () => {
    winCue?.fadeOut(0.6);
    winCue = null;
    if (play("sticker")) duckMusic(0.4, 1, 1.5);
  });
  // The Daily Suitcase. The day's item finished on the board, at its picture's
  // clear: UI's big moment (~2.1 s) and its fanfare, the harp fading under it.
  // Once per opening of the board. The item lands in its suitcase ~1.65 s in
  // (suitcase:stowed): the latch, just after the fanfare's final chord. A tap
  // skips the moment to its end: the fanfare goes with it (UI fades in 150 ms).
  on("suitcase:item", ({ again }) => {
    if (again) return;
    flourish?.fadeOut(0.3);
    flourish = null;
    foundCue = play("found");
    if (foundCue) duckMusic(0.3, 1.8, 1.2);
  });
  on("suitcase:stowed", ({ skipped }) => {
    if (skipped) foundCue?.fadeOut(0.15);
    foundCue = null;
    play("stow");
  });
  // The item lands in the suitcase on the win card (UI): the latch, a little
  // softer for a spare copy.
  on("suitcase:packed", ({ count }) => {
    packedAt = performance.now();
    play("packed", count > 1 ? { gain: 0.75 } : {});
  });
  // The suitcase full: on the win card it comes in the same frame as the 10th
  // item's latch, so the sting waits for the latch to be heard; on the suitcase
  // screen (a swap) it plays at once. It sits in the win cue's key, over it.
  on("suitcase:full", () => {
    play("suitcase", { delay: performance.now() - packedAt < 150 ? 0.3 : 0 });
    duckMusic(0.3, 1.5, 1.5);
  });
  on("ui:press", () => play("ui"));
}
