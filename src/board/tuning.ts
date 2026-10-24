// The board's tuning numbers, in one place. These are the defaults; the game
// config can override any of them without a new build: `config: board:` in
// gem-backend-game-config.yaml, a JSON text the SDK hands over as `kv.board`,
// read once before the first deal (applyTuning). A key the config leaves out
// keeps its default here. Sizes are fractions of a card (one cell); times are
// milliseconds.

export const TUNING = {
  /** Helpers at the start of every board (creator's ruling: 3 of each, not saved). */
  helpers: { undo: 3, hint: 3, shuffle: 3 },

  // --- layout (tools/art/chrome-spec.md)
  /** The gap between cards. */
  gutter: 0.08,
  /**
   * The pale frosted frame round every picture, board and stacks alike: its
   * width as a fraction of a card, never under frameMin CSS px. Thin by the
   * creator's ruling (AGENTS.md): half the concept's 0.05.
   */
  frame: 0.025,
  frameMin: 2,
  /** The stacks' row above the grid, and the gap under it. */
  stackRow: 1.18,
  stackGap: 0.2,
  /** The largest a card may be drawn, in CSS px (a desktop letterbox). */
  maxCard: 136,
  /** The slight perspective of the concept: one switch (also ?tilt=1 / ?tilt=0). */
  tilt: false,
  tiltDegrees: 8,

  // --- the hand
  /** How far a press travels, in CSS px, before it is a drag rather than a tap. */
  dragSlop: 8,
  /** How far a dragged piece rises above the fingertip (touch) or the pointer (mouse). */
  liftTouch: 0.62,
  liftMouse: 0.08,
  liftScale: 1.06,

  // --- motion
  /** A dropped piece settling on its cells. */
  dropMs: 150,
  /** Covered cards going back to where the piece came from. */
  slideMs: 240,
  /** A fall of one row; longer falls take sqrt(rows) times as long. */
  fallMs: 150,
  /** THE refill stagger: the delay between one dealt card and the next, left to right. */
  dealStagger: 55,
  /** One dealt card's drop from its stack into its cell. */
  dealMs: 280,
  /** The small scale pop when correct neighbours join. */
  mergePop: 1.07,
  mergePopMs: 260,
  /** A finished picture: shown whole for this long, then it leaves. */
  completeHoldMs: 1000,
  completeLeaveMs: 420,
  /** Shuffle: the loose cards trading places. */
  shuffleMs: 460,
  /** Hint: the ghost of the piece going to where it should be played. */
  hintMs: 1300,
};

type Tuning = typeof TUNING;

/** Lay numbers from the game config over the defaults: only known keys, only numbers and booleans. */
export function applyTuning(patch: unknown): void {
  // the config's key-value section holds text: the numbers arrive as JSON
  if (typeof patch === "string") {
    try {
      patch = JSON.parse(patch);
    } catch {
      console.warn("[board] kv.board in the game config is not JSON; the defaults stand");
      return;
    }
  }
  if (!patch || typeof patch !== "object") return;
  const into = TUNING as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const was = into[k];
    if (k === "helpers" && v && typeof v === "object") {
      for (const h of ["undo", "hint", "shuffle"] as const) {
        const n = (v as Record<string, unknown>)[h];
        if (typeof n === "number" && n >= 0 && n <= 99) TUNING.helpers[h] = Math.floor(n);
      }
    } else if (typeof was === "number" && typeof v === "number" && Number.isFinite(v)) into[k] = v;
    else if (typeof was === "boolean" && typeof v === "boolean") into[k] = v;
  }
}

export type { Tuning };
