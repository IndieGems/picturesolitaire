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
  /**
   * A card's width ÷ its height: 0.75 is the creator's 3:4 portrait card
   * (AGENTS.md). Every other size here is a fraction of a card's WIDTH, except
   * the stacks' row (stackRow, stackGap) and the lift, fractions of its height.
   * The screens read this too (the win card, the albums), at draw time.
   */
  cardAspect: 0.75,
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
  /**
   * A board that shows no upcoming card (peek 0, every board since the
   * creator's "make the game harder"): each stack is a tidy pile of the
   * table's card backs lying flat, one band per card, the next card at the
   * front, so its depth says roughly how many are left (as Jigsaw Drop).
   * pileRow / pileGap: the piles' row and the gap under it, in card heights.
   * pileWidth: a pile's width, of a card's. pileSlab: one flat back's height,
   * of the pile's width. pileStep: the most a band shows, of a flat back's
   * height (a big pile packs its bands closer to fit the row). pileMax: the
   * most bands a pile shows.
   */
  pileRow: 0.62,
  pileGap: 0.14,
  pileWidth: 0.96,
  pileSlab: 0.28,
  pileStep: 0.42,
  pileMax: 12,
  /**
   * The next card on each stack face up again (a trial, the creator,
   * 2026-10-25, after boards 9 and 10: to feel the difficulty with it): every
   * board shows at least its stacks' next card, over a short pile of the
   * table's card backs; false: each level's own (peek 0, backs only, the flat
   * piles). Drawing only: the rules, the levels and the win checker never
   * read it, so the config can flip it back without a build or a level change.
   */
  showNext: true,
  /** The largest a card may be drawn, its width in CSS px (a desktop letterbox). */
  maxCard: 136,
  /**
   * The same where the main pointer is a finger (a phone, a tablet): high
   * enough that a tall screen's board fills its box. maxCard is the desktop's.
   */
  maxCardTouch: 320,
  /** The slight perspective of the concept: one switch (also ?tilt=1 / ?tilt=0). */
  tilt: false,
  tiltDegrees: 8,
  /**
   * Which copy of a picture the board draws (the creator: "a picture ships at
   * the size it is drawn"): Art's light board copy while it has at least this
   * share of the pixels a card needs (its drawn width x the screen's pixel
   * density), else the full picture (a tablet's big board, a desktop, a TV).
   * 0.85 (the lead, 2026-10-25): a big phone (430 wide, 3x) needs 282 px a
   * card and the copy's 240 is 85%, which does not show at that density; it
   * spares every phone a 40% heavier copy. Tablets on 4x4 still get the full
   * picture. If the creator reports soft pictures on a big phone, the fix is
   * Art's copies at 288x384 a card, not a lower number here.
   */
  boardCopyMin: 0.85,

  // --- the hand
  /**
   * How far a press travels, in CSS px, before the piece follows it, 1:1 from
   * there (the creator: "a nice easy slide"). Small: a press that ends within
   * tapSlop of where it went down, still on its own cell, is a tap all the
   * same, so tap-then-tap survives a shaky finger. While a piece is picked up
   * by a tap, a press on another piece needs tapSlop to become a drag.
   */
  dragSlop: 3,
  tapSlop: 10,
  /**
   * How far a dragged piece rises above the fingertip (touch) or the pointer
   * (mouse), in card heights: 0, the piece stays exactly with the finger
   * (the creator, after Jigsaw Drop).
   */
  liftTouch: 0,
  liftMouse: 0,
  /** A dragged piece's slight swell, about the finger (the grab point never leaves it). */
  dragScale: 1.03,
  /** A piece picked up by a tap: its swell (it also rises a little, 0.06 of a card). */
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
  /**
   * A finished picture's exit, brief (the creator: the game is the finding, not
   * the looking): it swells to completeGrow over completeGrowMs and twinkles,
   * holds completeHoldMs, then shrinks to nothing over completeLeaveMs, and the
   * cards fall. Twinkles: how many sparkle over and round it. Two pictures
   * finished by one move start completeStaggerMs apart.
   */
  completeGrow: 1.06,
  completeGrowMs: 140,
  completeHoldMs: 90,
  completeLeaveMs: 220,
  completeStaggerMs: 60,
  twinkles: 16,
  /**
   * A destination's reveal, in place of the quick exit (about 3 s in all):
   * the finished piece slides to where its window sits in the postcard
   * (revealSlideMs), the postcard unfolds round it, sideways and then up and
   * down (revealUnfoldMs, the two halves overlapping a little), holds open
   * while the place's name shows (revealHoldMs), and fades away
   * (revealLeaveMs); then the cards fall. Reduced motion, and a repeat on the
   * same opening of the board (after Undo or a restart): a crossfade of
   * revealFadeMs each way, held revealHoldMs (reduced motion) or
   * revealShortHoldMs (a repeat). A tap skips to the end.
   */
  revealSlideMs: 380,
  revealUnfoldMs: 760,
  revealHoldMs: 1500,
  revealLeaveMs: 380,
  revealFadeMs: 260,
  revealShortHoldMs: 700,
  /**
   * A mystery's clue (a destination whose catalogue entry has a `case`) is
   * held long enough to read its sentence: revealClueHoldMs (a wordless one
   * too, to look at its clock), plus revealClueCharMs for each character of
   * its words (the screens give them: setClueWords), at most revealClueMaxMs.
   * A tap still skips it (the evidence binder keeps it). A repeat is the
   * short one all the same.
   */
  revealClueHoldMs: 2500,
  revealClueCharMs: 50,
  revealClueMaxMs: 8000,
  /**
   * The most positions the stuck check (after every settle) may search before
   * it gives up; giving up claims nothing. 200,000 is the Hint's own default;
   * the most any position of the shipped boards took was under 1 ms.
   */
  stuckBudget: 200_000,
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
