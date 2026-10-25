// The relaxed campaign's curve: one row per board, each axis on its own.
// tools/levels/make-campaign.mts turns it into src/content/levels/campaign.json.
//
// Demand and relief alternate: a board that asks more (more cards waiting, a
// longer chain of clears, more lookalikes, fewer upcoming cards shown) is
// followed by an easier one. Early boards mix families and show 1-2 upcoming
// cards; later ones hold more lookalikes and show fewer; hidden stacks first
// come at board 18.
//
// THE SHAPE RAMP (creator, 2026-10-24, as in Jigsaw Drop): boards 1-10 use
// only square 2x2 pictures; the long 1x2 and 2x1 ones join at board 11; the
// big ones (2x3, 3x2, 3x3) at board 20, one a board at most, then two from
// board 30 and three from board 40 (`bigMost`). The first 3x3 is board 23.
// BOARD SIZES for portrait 3:4 cards (Gameplay's sizes, 2026-10-24: a card
// on a 360x640 phone is 65x87 on 4x4, 58x77 on 4x5 and 5x5, 50x67 on 4x6
// and 5x6, which also shrink the stacks): boards 1-15 are 4x4, as Jigsaw
// Drop plays; the board grows to 4x5 at board 16, a relief board, so it comes
// on its own, and stays 4x5 (lead, 2026-10-24: the campaign stays around
// 4x4/4x5; readability wins over board size). Board 31 opens a second arc after the peak at 30.
// Square-only boards are easy for their size (every picture fits any 2x2
// hole), so their demand boards hold more pictures: 8 squares, 12 waiting (boards
// 11-19, small pictures only: 32-38 cards).
//
// CLEAR, CLOSE AND VARIED (creator, 2026-10-24; AGENTS.md): no look-alike
// families on a board (alike is [] on every row: one picture a family), the
// subjects and art styles vary (vary: no shared subject word, an album at most
// a third of the board, a style at most half), and at most one busy picture a
// board (busyMost). Boards 1-3 take no busy picture and at most one picture
// from the catalogue as it was before the clear pictures came (CURRENT), calm
// ones first; with portrait 3:4 cards they are 4x4, as Jigsaw Drop opens.
//
// PICTURES RARELY REPEAT (creator, 2026-10-25, after Jigsaw Drop, whose
// players notice repeats only after 200+ levels): no picture on two of boards
// 1-DISTINCT, and none back within SPACING boards after that; one the player
// has not met yet comes first. A hard rule on every board the maker makes
// (lib.mts bannedOn): a board the library cannot fill stops the maker, which
// names what is short. Boards 4-13 take at most one picture from before the
// clear ones (CURRENT), and none while the new ones cover them.
//
// Columns:
//   board     columns x rows (default 4x5)
//   role      intro | build | demand | relief (for the reader; nothing reads it)
//   count     pictures on the board
//   alike     lookalike family groups ([3, 2]: a triple and a pair)
//   sizes     cards a picture may have (2, 4, 6, 9): pieces per picture
//   cards     total cards, all pictures: 20 fill a 4x5 board, the rest wait in the stacks
//   must      shapes that must be on the board
//   most      at most so many pictures of a size, by cards (default: one 3x3)
//   bigMost   at most so many big pictures (6 or 9 cards) in all
//   peek      upcoming cards each stack shows (0, 1 or 2)
//   chain     the chain of dependent clears (src/game/solver/metrics.ts)
//   careless  the careless player's chance of winning
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

/**
 * The plan's name, stored in campaign.json: the maker adds rows to a file only
 * if it was made from this plan (a file from an earlier plan is remade with
 * --fresh, or only repaired with --repair-only). Change it when the rows of
 * boards already shipped change.
 */
export const PLAN_TAG = "clear-varied-2026-10-24";

/** The board unless a row says otherwise. */
export const BOARD = { cols: 4, rows: 5 };

/** Boards before a picture may come back, at the least. */
export const SPACING = 15;

/** The first boards, on which no picture is on two. */
export const DISTINCT = 13;

/** The catalogue's pictures before the clear, varied ones (2026-10-24): boards 1-3 take at most one. */
export const CURRENT = new Set(["dusk-harbour", "dune-caravan", "poppy-sunset", "candle-oranges", "blossom-lane", "peony-jug", "berry-cake", "rose-hat", "maple-path", "harvest-table", "apple-orchard", "ivy-lane", "blue-domes", "wave-coast", "hydrangeas", "net-mender", "wheat-farm", "bread-table", "sunflower-vase", "wheat-walk", "lavender-rows", "wisteria-door", "lilac-bouquet", "figs-grapes", "tea-terraces", "market-greens", "greenhouse", "green-alley", "venice-canal", "lantern-market", "lantern-child", "lake-village", "cherry-bowl", "tulip-rows", "red-tram", "red-umbrella", "lemon-coast", "lemon-tart", "daffodil-meadow", "canal-bicycle", "snow-chalets", "skating-day", "frost-hellebores", "winter-stream", "riad-court", "carpet-bazaar", "anemones", "pomegranates", "pastel-row", "patisserie", "beach-huts", "balloon-seller", "copper-spires", "copper-kitchen", "potter-studio", "turquoise-falls", "abbey-cloister", "stone-village", "white-garden", "olive-grove"]);
const FRESH = { busyMost: 0, old: CURRENT, oldMost: 1 };
/** Boards 4-13: at most one picture from before the clear ones (the re-deal ranks them after new ones). */
const NEWER = { old: CURRENT, oldMost: 1 };

const SQ = [4];

const SMALL = [2, 4];
const ALL = [2, 4, 6, 9];

export const PLAN = [
  // ---- squares only
  /*  1 */ { role: "intro",  board: [4, 4], count: 3, alike: [], sizes: SQ, cards: [12, 12], peek: 2, chain: [1, 1], careless: [1, 1], ...FRESH },
  /*  2 */ { role: "intro",  board: [4, 4], count: 4, alike: [], sizes: SQ, cards: [16, 16], peek: 2, chain: [1, 1], careless: [1, 1], ...FRESH },
  /*  3 */ { role: "build",  board: [4, 4], count: 5, alike: [], sizes: SQ, cards: [20, 20], peek: 2, chain: [2, 2], careless: [0.95, 1], ...FRESH },
  /*  4 */ { role: "build",  board: [4, 4], count: 5, alike: [], sizes: SQ, cards: [20, 20], peek: 2, chain: [2, 2], careless: [0.9, 1], ...NEWER },
  /*  5 */ { role: "relief", board: [4, 4], count: 5, alike: [], sizes: SQ, cards: [20, 20], peek: 2, chain: [1, 2], careless: [1, 1], ...NEWER },
  /*  6 */ { role: "build",  board: [4, 4], count: 6, alike: [], sizes: SQ, cards: [24, 24], peek: 2, chain: [2, 3], careless: [0.85, 1], ...NEWER },
  /*  7 */ { role: "demand", board: [4, 4], count: 7, alike: [], sizes: SQ, cards: [28, 28], peek: 1, chain: [3, 4], careless: [0.6, 0.95], ...NEWER },
  /*  8 */ { role: "relief", board: [4, 4], count: 5, alike: [], sizes: SQ, cards: [20, 20], peek: 2, chain: [2, 2], careless: [0.95, 1], ...NEWER },
  /*  9 */ { role: "build",  board: [4, 4], count: 6, alike: [], sizes: SQ, cards: [24, 24], peek: 1, chain: [2, 3], careless: [0.85, 1], ...NEWER },
  /* 10 */ { role: "demand", board: [4, 4], count: 7, alike: [], sizes: SQ, cards: [28, 28], peek: 1, chain: [3, 4], careless: [0.55, 0.9], ...NEWER },
  // ---- the long 1x2 and 2x1 pictures join
  /* 11 */ { role: "relief", board: [4, 4], count: 6, alike: [], sizes: SMALL, cards: [20, 22], peek: 2, chain: [2, 2], careless: [0.9, 1], ...NEWER },
  /* 12 */ { role: "build",  board: [4, 4], count: 7, alike: [], sizes: SMALL, cards: [24, 26], peek: 1, chain: [2, 3], careless: [0.7, 1], ...NEWER },
  /* 13 */ { role: "demand", board: [4, 4], count: 8, alike: [], sizes: SMALL, cards: [26, 28], peek: 1, chain: [3, 4], careless: [0.55, 0.9], ...NEWER },
  /* 14 */ { role: "relief", board: [4, 4], count: 6, alike: [], sizes: SMALL, cards: [20, 22], peek: 2, chain: [2, 2], careless: [0.9, 1] },
  /* 15 */ { role: "demand", board: [4, 4], count: 8, alike: [], sizes: SMALL, cards: [28, 30], peek: 1, chain: [3, 4], careless: [0.45, 0.85] },
  /* 16 */ { role: "relief", count: 7, alike: [],        sizes: SMALL, cards: [24, 26], peek: 1, chain: [2, 3], careless: [0.85, 1] },
  /* 17 */ { role: "build",  count: 9, alike: [],        sizes: SMALL, cards: [32, 34], peek: 1, chain: [3, 4], careless: [0.6, 0.9] },
  /* 18 */ { role: "demand", count: 9, alike: [],        sizes: SMALL, cards: [34, 36], peek: 0, chain: [3, 4], careless: [0.5, 0.9] },
  /* 19 */ { role: "relief", count: 7, alike: [],        sizes: SMALL, cards: [24, 26], peek: 1, chain: [2, 3], careless: [0.85, 1] },
  // ---- big pictures join, one a board
  /* 20 */ { role: "demand", count: 8, alike: [],        sizes: ALL,   cards: [32, 34], peek: 1, chain: [4, 4], careless: [0.5, 0.8], bigMost: 1 },
  /* 21 */ { role: "build",  count: 7, alike: [],        sizes: ALL,   cards: [30, 32], peek: 1, chain: [3, 4], careless: [0.6, 0.9], bigMost: 1 },
  /* 22 */ { role: "relief", count: 7, alike: [],        sizes: SMALL, cards: [24, 26], peek: 2, chain: [2, 2], careless: [0.9, 1] },
  /* 23 */ { role: "demand", count: 8, alike: [],        sizes: ALL,   cards: [32, 35], peek: 0, chain: [4, 5], careless: [0.45, 0.75], bigMost: 1, must: ["3x3"] },
  /* 24 */ { role: "build",  count: 7, alike: [],        sizes: ALL,   cards: [28, 30], peek: 1, chain: [3, 3], careless: [0.7, 0.95], bigMost: 1 },
  /* 25 */ { role: "demand", count: 8, alike: [],        sizes: ALL,   cards: [32, 35], peek: 0, chain: [4, 5], careless: [0.4, 0.7], bigMost: 1 },
  /* 26 */ { role: "relief", count: 6, alike: [],        sizes: [2, 4, 6], cards: [24, 26], peek: 1, chain: [2, 3], careless: [0.85, 1], bigMost: 1 },
  /* 27 */ { role: "demand", count: 8, alike: [],        sizes: ALL,   cards: [33, 35], peek: 0, chain: [4, 5], careless: [0.4, 0.7], bigMost: 1 },
  /* 28 */ { role: "build",  count: 8, alike: [],        sizes: [4, 6, 9], cards: [34, 37], peek: 1, chain: [4, 5], careless: [0.45, 0.85], bigMost: 1 },
  /* 29 */ { role: "relief", count: 6, alike: [],        sizes: [2, 4, 6], cards: [24, 26], peek: 1, chain: [2, 3], careless: [0.8, 1], bigMost: 1 },
  // ---- up to two big pictures; the peak, then a second arc
  /* 30 */ { role: "peak",   count: 8, alike: [],        sizes: ALL,   cards: [34, 37], peek: 0, chain: [5, 5], careless: [0.35, 0.65], bigMost: 2, must: ["3x3"] },
  /* 31 */ { role: "relief", count: 6, alike: [],        sizes: [2, 4, 6], cards: [22, 24], peek: 2, chain: [2, 2], careless: [0.9, 1], bigMost: 1 },
  /* 32 */ { role: "build",  count: 6, alike: [],        sizes: [2, 4, 6], cards: [26, 28], peek: 1, chain: [2, 3], careless: [0.8, 1], bigMost: 2 },
  /* 33 */ { role: "demand", count: 7, alike: [],        sizes: ALL,   cards: [30, 32], peek: 1, chain: [3, 4], careless: [0.6, 0.9], bigMost: 2 },
  /* 34 */ { role: "relief", count: 6, alike: [],        sizes: [2, 4, 6], cards: [24, 26], peek: 2, chain: [2, 3], careless: [0.85, 1], bigMost: 1 },
  /* 35 */ { role: "demand", count: 7, alike: [],        sizes: ALL,   cards: [31, 33], peek: 0, chain: [4, 4], careless: [0.5, 0.85], bigMost: 2, must: ["3x3"] },
  /* 36 */ { role: "relief", count: 6, alike: [],        sizes: [2, 4, 6], cards: [24, 26], peek: 1, chain: [2, 3], careless: [0.85, 1], bigMost: 1 },
  /* 37 */ { role: "build",  count: 7, alike: [],     sizes: [2, 4, 6], cards: [28, 30], peek: 1, chain: [2, 3], careless: [0.8, 1], bigMost: 2 },
  /* 38 */ { role: "demand", count: 8, alike: [],        sizes: ALL,   cards: [32, 34], peek: 0, chain: [4, 5], careless: [0.45, 0.75], bigMost: 2 },
  /* 39 */ { role: "relief", count: 6, alike: [],        sizes: SMALL, cards: [22, 24], peek: 2, chain: [2, 2], careless: [0.9, 1] },
  // ---- up to three big pictures
  /* 40 */ { role: "demand", count: 8, alike: [],     sizes: ALL, cards: [34, 36], peek: 1, chain: [4, 5], careless: [0.45, 0.75], bigMost: 3, must: ["3x3"] },
  /* 41 */ { role: "relief", count: 6, alike: [],        sizes: [2, 4, 6], cards: [26, 28], peek: 1, chain: [2, 3], careless: [0.85, 1], bigMost: 2 },
  /* 42 */ { role: "build",  count: 8, alike: [],     sizes: [2, 4, 6], cards: [32, 34], peek: 1, chain: [3, 4], careless: [0.6, 0.9], bigMost: 3 },
  /* 43 */ { role: "demand", count: 8, alike: [],        sizes: ALL,   cards: [33, 35], peek: 0, chain: [4, 5], careless: [0.4, 0.7], bigMost: 3 },
  /* 44 */ { role: "relief", count: 6, alike: [],        sizes: [2, 4, 6], cards: [24, 26], peek: 1, chain: [2, 3], careless: [0.85, 1], bigMost: 2 },
  /* 45 */ { role: "demand", count: 8, alike: [],        sizes: ALL, cards: [34, 36], peek: 0, chain: [4, 5], careless: [0.4, 0.7], bigMost: 3 },
  /* 46 */ { role: "relief", count: 7, alike: [],        sizes: SMALL, cards: [24, 26], peek: 2, chain: [2, 2], careless: [0.9, 1] },
  /* 47 */ { role: "build",  count: 8, alike: [],     sizes: ALL, cards: [32, 34], peek: 1, chain: [3, 4], careless: [0.55, 0.85], bigMost: 3 },
  /* 48 */ { role: "relief", count: 6, alike: [],        sizes: [2, 4, 6], cards: [26, 28], peek: 1, chain: [2, 3], careless: [0.8, 1], bigMost: 2 },
  /* 49 */ { role: "demand", count: 8, alike: [],        sizes: ALL,   cards: [34, 36], peek: 0, chain: [4, 5], careless: [0.4, 0.7], bigMost: 3, must: ["3x3"] },
  /* 50 */ { role: "finale", count: 9, alike: [],        sizes: ALL, cards: [36, 38], peek: 0, chain: [5, 5], careless: [0.35, 0.65], bigMost: 3, must: ["3x3"] },
];

// every board: varied, and one busy picture at most (FRESH rows say none)
for (const row of PLAN) Object.assign(row, { vary: true, busyMost: row.busyMost ?? 1 });
