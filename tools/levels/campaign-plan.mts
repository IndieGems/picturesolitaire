// The campaign's curve: one row per board, each axis on its own.
// tools/levels/make-campaign.mts turns it into src/content/levels/campaign.json.
//
// A SAWTOOTH (creator, 2026-10-25: "we need to make the game harder", with a
// bite "even by level 3"; docs/difficulty-curve.md): a ten-board cycle of a
// change of pace (x1, all long pictures), three builds, a hard board (x5),
// relief (x6), three builds and a peak (x10). Board 3 is the first bite, 7
// hard, 10 the first peak (at the hard target), 15 hard, 20 super hard. Each
// cycle raises the floor: more pictures, then 4x5 boards from board 22.
// THE DIAL IS THE PICTURE COUNT. Every stack shows card backs (peek 0), and
// the careless-win measure never used the shown cards anyway (it draws and
// places blind), so a board gets harder by holding more pictures for its
// size. The survey in docs/difficulty-curve.md ("Setting a board's
// difficulty") gives the counts: on 4x4, 5-6 squares are always won
// carelessly, 7 sometimes not, 8 about half the time, 9 seldom; 4x5 needs
// about two more pictures for the same bite.
// SHAPES (creator, 2026-10-25): a board is all square (2x2), or all long
// (1x2 and 2x1, tall and wide mixed), never both; boards 11, 21... are the
// all-long ones. A 4x4 of long pictures is always won carelessly, at any
// count from 7 to 12, so those boards are the change of pace.
// A SAFE START on every board but hard, peak and super (MAY_TRAP; AGENTS.md;
// check.mts).
// KEEP: boards 3-13 were re-dealt to the curve keeping the pictures the
// creator reviews them by (keep). They needed 13 more squares: the 7 spare
// new ones, placed by hand where the busy caps let them fit, board 11's 4,
// and 2 the picker adds (boards 5 and 9) from Art's batch of 2026-10-25. A
// flagged kept picture gives way to its remake (lib.mts REMAKES, keepOf). Board 11 took the
// long pictures of boards 11-13, and its squares went to boards 12-13.
// Board 21 takes the dev menu's long-pictures experiment (x01).
//
// CLEAR, CLOSE AND VARIED (creator, 2026-10-24; AGENTS.md): one picture a
// family (alike []), no shared subject word, an album at most a third of the
// board and an art style at most half (vary), nothing rated busy 2
// (busyMost 0), and at most one rated busy at all, two on boards of 8 or more
// (liveMost). Boards 3-13 take at most one picture from before the clear ones
// (CURRENT), and only where the new ones run out; boards 14 on take none.
//
// PICTURES RARELY REPEAT (creator, 2026-10-25, after Jigsaw Drop, whose
// players notice repeats only after 200+ levels): no picture on two of boards
// 1-DISTINCT, and none back within SPACING boards after that; one the player
// has not met yet comes first. A hard rule on every board the maker makes
// (lib.mts bannedOn): a board the library cannot fill stops the maker, which
// names what is short.
//
// Columns:
//   role      teach | bite | build | relief | hard | peak | super | pace
//   board     columns x rows (default 4x4)
//   count     pictures on the board
//   alike     lookalike family groups ([] on every row: one picture a family)
//   sizes     cards a picture may have: [4] squares, [2] long
//   cards     total cards, all pictures: 16 fill a 4x4 board, the rest wait in the stacks
//   keep      pictures the board keeps (pick.ts)
//   peek      upcoming cards each stack shows (0 on every board since 2026-10-25)
//   chain     the chain of dependent clears (src/game/solver/metrics.ts)
//   careless  the careless player's chance of winning
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

/**
 * The plan's name, stored in campaign.json: the maker adds rows to a file only
 * if it was made from this plan (a file from an earlier plan is remade with
 * --fresh or --keep N, or only repaired with --repair-only). Change it when
 * the rows of boards already shipped change.
 */
export const PLAN_TAG = "sawtooth-2026-10-25";

/** The board unless a row says otherwise. */
export const BOARD = { cols: 4, rows: 4 };

/** Boards before a picture may come back, at the least. */
export const SPACING = 15;

/** The first boards, on which no picture is on two. */
export const DISTINCT = 13;

/** The catalogue's pictures before the clear, varied ones (2026-10-24). */
export const CURRENT = new Set(["dusk-harbour", "dune-caravan", "poppy-sunset", "candle-oranges", "blossom-lane", "peony-jug", "berry-cake", "rose-hat", "maple-path", "harvest-table", "apple-orchard", "ivy-lane", "blue-domes", "wave-coast", "hydrangeas", "net-mender", "wheat-farm", "bread-table", "sunflower-vase", "wheat-walk", "lavender-rows", "wisteria-door", "lilac-bouquet", "figs-grapes", "tea-terraces", "market-greens", "greenhouse", "green-alley", "venice-canal", "lantern-market", "lantern-child", "lake-village", "cherry-bowl", "tulip-rows", "red-tram", "red-umbrella", "lemon-coast", "lemon-tart", "daffodil-meadow", "canal-bicycle", "snow-chalets", "skating-day", "frost-hellebores", "winter-stream", "riad-court", "carpet-bazaar", "anemones", "pomegranates", "pastel-row", "patisserie", "beach-huts", "balloon-seller", "copper-spires", "copper-kitchen", "potter-studio", "turquoise-falls", "abbey-cloister", "stone-village", "white-garden", "olive-grove"]);

const sq = (n, extra = {}) => ({ count: n, alike: [], sizes: [4], cards: [n * 4, n * 4], ...extra });
const long = (keep) => ({ count: keep.length, alike: [], sizes: [2], cards: [keep.length * 2, keep.length * 2], keep });
const ANY = [1, 99];
/** Boards 1-13: an old picture stands in only where the new ones run out (lib.mts pickFrom). */
const STAND_IN = { old: CURRENT, oldMost: 1 };
const NEW_ONLY = { old: CURRENT, oldMost: 0 };

export const PLAN = [
  // ---- the first cycle: teach, a first bite at board 3, a hard board at 7, the first peak at 10
  /*  1 */ { role: "teach",  ...sq(3), careless: [1, 1], chain: [1, 1], ...STAND_IN },
  /*  2 */ { role: "teach",  ...sq(4), careless: [1, 1], chain: [1, 1], ...STAND_IN },
  /*  3 */ { role: "bite",   ...sq(7, { keep: ["blue-bicycle", "cactus-bloom", "ice-cream", "mount-fuji", "sailboat", "red-barn", "skier"] }), careless: [0.55, 0.65], chain: ANY, liveMost: 2, ...STAND_IN },
  /*  4 */ { role: "relief", ...sq(5, { keep: ["bubbles", "golden-puppy", "pancakes", "saxophonist", "steam-train"] }), careless: [0.85, 1], chain: [2, 2], ...STAND_IN },
  /*  5 */ { role: "build",  ...sq(7, { keep: ["chef", "magnolia", "orchid", "suitcase", "teddy-bear", "watermelon"] }), careless: [0.7, 0.8], chain: ANY, ...STAND_IN },
  /*  6 */ { role: "build",  ...sq(7, { keep: ["camper-van", "cappuccino", "ginger-cat", "leaning-tower", "painter", "yellow-door", "pizza"] }), careless: [0.6, 0.75], chain: ANY, ...STAND_IN },
  /*  7 */ { role: "hard",   ...sq(8, { keep: ["biplane", "bonsai", "cowboy", "fjord-evening", "gramophone", "owl", "redwoods", "tree-house"] }), careless: [0.3, 0.5], chain: ANY, ...STAND_IN },
  /*  8 */ { role: "relief", ...sq(5, { keep: ["armchair", "ballerina", "bird-of-paradise", "sandstone-arch", "tiled-house"] }), careless: [0.85, 1], chain: [2, 2], ...STAND_IN },
  /*  9 */ { role: "build",  ...sq(7, { keep: ["baobab", "delft-teapot", "doughnut", "monstera", "palm-island", "red-kite"] }), careless: [0.5, 0.7], chain: ANY, ...STAND_IN },
  /* 10 */ { role: "peak",   ...sq(8, { keep: ["chestnut-horse", "dahlia", "golden-gate", "protea", "rainbow", "rickshaw", "sandcastle", "colosseum"] }), careless: [0.3, 0.5], chain: ANY, ...STAND_IN },
  // ---- the second cycle: more pictures; a hard board at 15, super hard at 20
  /* 11 */ { role: "pace",   ...long(["guitar", "hammock", "houseboat", "ice-lolly", "canal-house", "flamenco", "tractor", "pagoda", "rocking-horse", "paddle-steamer"]), careless: [0.85, 1], chain: ANY, ...STAND_IN },
  /* 12 */ { role: "build",  ...sq(7, { keep: ["cable-car", "eiffel-tower", "iceberg", "rubber-duck", "taj-mahal", "calla-lilies", "moai"] }), careless: [0.7, 0.8], chain: ANY, ...STAND_IN },
  /* 13 */ { role: "build",  ...sq(8, { keep: ["classic-car", "irises", "paper-parasol", "pineapple", "ramen", "violin", "macaw", "toadstools"] }), careless: [0.6, 0.75], chain: ANY, ...STAND_IN },
  /* 14 */ { role: "build",  ...sq(8), careless: [0.6, 0.7], chain: ANY, ...NEW_ONLY },
  /* 15 */ { role: "hard",   ...sq(9), careless: [0.3, 0.5], chain: ANY, ...NEW_ONLY },
  /* 16 */ { role: "relief", ...sq(7), careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  /* 17 */ { role: "build",  ...sq(8), careless: [0.6, 0.7], chain: ANY, ...NEW_ONLY },
  /* 18 */ { role: "build",  ...sq(8), careless: [0.55, 0.65], chain: ANY, ...NEW_ONLY },
  /* 19 */ { role: "build",  ...sq(9), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 20 */ { role: "super",  ...sq(9), careless: [0.1, 0.3], chain: ANY, ...NEW_ONLY },
  // ---- the third cycle: 4x5 boards from 22 (Gameplay, 2026-10-25: about 60x80 a card on a 360x640 phone)
  /* 21 */ { role: "pace",   ...long(["canoe", "dachshund", "giraffe", "grand-piano", "lily-window", "milkshake", "ribbon-falls", "sewing-machine", "sidecar", "skyscraper", "sunflower", "wheelbarrow"]), careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  /* 22 */ { role: "build",  board: [4, 5], ...sq(9), careless: [0.7, 0.8], chain: ANY, ...NEW_ONLY },
  /* 23 */ { role: "build",  board: [4, 5], ...sq(10), careless: [0.65, 0.75], chain: ANY, ...NEW_ONLY },
  /* 24 */ { role: "build",  board: [4, 5], ...sq(10), careless: [0.6, 0.7], chain: ANY, ...NEW_ONLY },
  /* 25 */ { role: "hard",   board: [4, 5], ...sq(11), careless: [0.3, 0.5], chain: ANY, ...NEW_ONLY },
  /* 26 */ { role: "relief", board: [4, 5], ...sq(8), careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
];

/** Roles that may trap from the first move; every other board starts safe (check.mts). */
export const MAY_TRAP = new Set(["hard", "peak", "super"]);

// every board: card backs on the stacks, varied, nothing busy 2, and few rated busy at all
// (an all-long board keeps all its pictures, so it has no busy cap of its own)
for (const row of PLAN) Object.assign(row, { peek: 0, vary: true, busyMost: row.busyMost ?? 0, liveMost: row.liveMost ?? (row.role === "pace" ? undefined : row.count >= 8 ? 2 : 1) });
