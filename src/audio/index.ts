// The game's sound, started once the first screen is up (src/sound.ts loads
// this module lazily, so none of it weighs on the first screen).
//
// The board never calls sound: it emits events (src/events.ts) and this file
// answers each with its sound. A new event that needs a sound gets a line in
// listen() below and, if it needs a new file, a row in src/audio/sounds.ts.

import { on } from "../events";
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

// --- When a card touches down ----------------------------------------------------
//
// The board emits piece:move and cards:fall as their animations START, so the
// tap waits for the card to arrive. When the board says how long that takes
// (`ms`), the tap lands at 85% of it (its ease-out reads as arrived by then);
// until it does, these are its usual times (src/board/tuning.ts: a drop
// settles in about 170 ms, a one-row fall in 150 ms).
const MOVE_LANDS = 0.13;
const FALL_LANDS = 0.13;

function landsIn(payload: object, fallback: number): number {
  const ms = (payload as { ms?: unknown }).ms;
  return typeof ms === "number" && ms >= 0 ? Math.min(ms * 0.85, 600) / 1000 : fallback;
}

/** The flourish still ringing, cut short if the win cue starts over it. */
let flourish: Voice | null = null;
/** The win cue, cut short if a milestone card replaces the win card. */
let winCue: Voice | null = null;

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

function reveal(p: { again: boolean }): void {
  if (p.again) return;
  // A mystery case's clue (Gameplay's `clue`, from the catalogue's "case"):
  // "Clue found" instead, and the accusation's cues start loading.
  const clue = (p as { clue?: unknown }).clue === true;
  if (clue) for (const name of VERDICT_CUES) void load(fileOf(name));
  flourish?.fadeOut(0.5);
  flourish = null;
  fanfare = play(clue ? "caseclue" : "fanfare", { delay: 0.03 });
  fanfareAt = performance.now();
  if (fanfare) duckMusic(0.3, 2, 1.5);
}

function revealDone(): void {
  const held = performance.now() - fanfareAt;
  fanfare?.fadeOut(held < 150 ? 0.03 : held < REVEAL_HOLD ? 0.25 : 0.8);
  fanfare = null;
}

// --- The mystery pilot's accusation ------------------------------------------------
//
// case:verdict (UI, as the result shows): right with the proving picture is
// "Case closed", whose thump UI's gold stamp lands on (0.76 s in); right without
// it the same resolve with no thump; wrong a kind "hm". A cue still loading
// joins late at the point it would have reached, so the thump still meets the
// stamp; later than LATE_VERDICT it is dropped.

const VERDICT_CUES = ["caseclosed", "casesolved", "casewrong"] as const;
const LATE_VERDICT = 0.6;

function verdict({ right, gold }: { right: boolean; gold: boolean }): void {
  const name = !right ? "casewrong" : gold ? "caseclosed" : "casesolved";
  const asked = performance.now();
  void load(fileOf(name)).then((buffer) => {
    const late = (performance.now() - asked) / 1000;
    if (!buffer || late > LATE_VERDICT) return;
    if (play(name, { offset: late > 0.02 ? late : 0 }) && right) duckMusic(0.3, 2.2, 1.6);
  });
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
  on("cards:fall", (p) => play("fall", { delay: landsIn(p, FALL_LANDS), gain: Math.min(1.2, 0.7 + p.cards * 0.05) }));
  on("stack:deal", ({ col }) => dealTick(col));
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
  on("case:verdict", verdict);
  on("ui:press", () => play("ui"));
}
