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
// DESTINATIONS (lead, 2026-10-25: the game is a travelogue; the places are the
// creator's, the postcards Art's): boards 1-15 each have one, a real place's
// postcard of which a window plays as one picture. It went IN PLACE of the
// board's `drop` picture, at the same spot and shape (lib.mts destinedInPlace),
// so every deal, line and measure stayed as it was. The drop is the board's own
// real landmark where it has one (so the trip's place is the only one), else
// its busiest picture or one of a style the board has most of; on board 10 it
// is Golden Gate, retired (its image is licensed). Board 11's window is wide,
// in a wide picture's place. On board 1 it is the guided start's second clear
// (pink-lotus), so the first postcard opens mid-board there, not at the win.
// On board 5 it is magnolia, a busy one, so Mabry Mill (busy) keeps the row's cap.
// Trip 2, Japan (boards 16-30): first every landmark was swapped out in place
// (lib.mts swappedInPlace; Art's "landmark": true), then each drop was the
// picture finished nearest mid-board on the proved line, of the postcard's
// shape, keeping the row's picture rules (a busy one where the postcard is busy
// and the board is at its cap: 28, 30), of the postcard's style where it could.
// Boards 27-30 were made first and took theirs on the maker's second run.
// Trips 3 and 4 (Italy, the American West; boards 31-60) the same way: dealt
// from the new batch alone, then each postcard in the place of the picture
// finished nearest mid-board (36: a tall window, 51: a wide one).
// Board 21's window is wide, in a wide picture's place.
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
//   newFrom   a catalogue id: take only it and the pictures after it (a batch; lib.mts poolOn)
//   newTo     a catalogue id: and only the pictures before it (the next batch's first)
//   destination  the board's postcard (lib.mts destinationOf), in place of `drop`
//   peek      upcoming cards each stack shows (0 on every board since 2026-10-25)
//   chain     the chain of dependent clears (src/game/solver/metrics.ts)
//   careless  the careless player's chance of winning
//   reader    the chance of a player who draws by the face-up cards (metrics.ts READER): every
//             unmarked board is readable, READABLE or more (set below; check.mts holds it)
//   traps     (optional) the winning line's steps where another choice loses the board
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readFileSync } from "node:fs";
import { CAREFUL, READABLE } from "../../src/game/solver/metrics.ts";

/**
 * The plan's name, stored in campaign.json: the maker adds rows to a file only
 * if it was made from this plan (a file from an earlier plan is remade with
 * --fresh or --keep N, or only repaired with --repair-only). Change it when
 * the rows of boards already shipped change.
 */
export const PLAN_TAG = "sawtooth-2026-10-25";

/**
 * 5x5 boards (creator, 2026-10-27, after Jigsaw Drop's level 18; AGENTS.md): about 65% of the
 * hard and finale boards from board 10, a frequent variation and never a rule: 10, then two a
 * trip in different slots. Each was re-dealt from its 4x4 or 4x5 board (make-campaign.mts
 * --redeal; lib.mts redealDestined) KEEPING its pictures and destination, the window at a 5x5
 * postcard's crop, with new pictures from ADD_5X5 on (Art's batch for them: nobody has met them)
 * to reach the row's count. 5x5 holds more than 4x5 (docs/difficulty-curve.md survey): 13 for a
 * hard board, 13-14 for a finale (14 where 4 traps are allowed), 11 for board 10, the first.
 * 6x6 (creator, 2026-10-27; AGENTS.md): every other finale, 30, 60 and 90, the same way: 18
 * pictures on 30 (trip 2's finale, 10-30%), 19 on 60 and 90 (8-20%).
 */
export const ADD_5X5 = "sweet-william";

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
  /*  1 */ { role: "teach",  destination: "dest-statue-of-liberty", drop: "pink-lotus", ...sq(3), careless: [1, 1], chain: [1, 1], ...STAND_IN },
  /*  2 */ { role: "teach",  destination: "dest-niagara-falls", drop: "cliff-lighthouse", ...sq(4), careless: [1, 1], chain: [1, 1], ...STAND_IN },
  /*  3 */ { role: "bite",   destination: "dest-letchworth", drop: "mount-fuji", ...sq(7, { keep: ["blue-bicycle", "cactus-bloom", "ice-cream", "mount-fuji", "sailboat", "red-barn", "skier"] }), careless: [0.55, 0.65], chain: ANY, liveMost: 2, ...STAND_IN },
  /*  4 */ { role: "relief", destination: "dest-lucy-elephant", drop: "pancakes", ...sq(5, { keep: ["bubbles", "golden-puppy", "pancakes", "saxophonist", "steam-train"] }), careless: [0.85, 1], chain: [2, 2], ...STAND_IN },
  /*  5 */ { role: "build",  destination: "dest-mabry-mill", drop: "magnolia", ...sq(7, { keep: ["chef", "magnolia", "orchid", "suitcase", "teddy-bear", "watermelon"] }), careless: [0.7, 0.8], chain: ANY, ...STAND_IN },
  /*  6 */ { role: "build",  destination: "dest-castillo", drop: "leaning-tower", ...sq(7, { keep: ["camper-van", "cappuccino", "ginger-cat", "leaning-tower", "painter", "yellow-door", "pizza"] }), careless: [0.6, 0.75], chain: ANY, ...STAND_IN },
  /*  7 */ { role: "hard",   destination: "dest-french-quarter", drop: "fjord-evening", ...sq(8, { keep: ["biplane", "bonsai", "cowboy", "fjord-evening", "gramophone", "owl", "redwoods", "tree-house"] }), careless: [0.3, 0.5], chain: ANY, ...STAND_IN },
  /*  8 */ { role: "relief", destination: "dest-twine-ball", drop: "tiled-house", ...sq(5, { keep: ["armchair", "ballerina", "bird-of-paradise", "sandstone-arch", "tiled-house"] }), careless: [0.85, 1], chain: [2, 2], ...STAND_IN },
  /*  9 */ { role: "build",  destination: "dest-paul-bunyan", drop: "baobab", ...sq(7, { keep: ["baobab", "delft-teapot", "doughnut", "monstera", "palm-island", "red-kite"] }), careless: [0.5, 0.7], chain: ANY, ...STAND_IN },
  /* 10 */ { role: "peak",   destination: "dest-pictured-rocks", board: [5, 5], addFrom: ADD_5X5, ...sq(11, { keep: ["chestnut-horse", "dahlia", "golden-gate", "protea", "rainbow", "rickshaw", "sandcastle", "colosseum"] }), careless: [0.3, 0.5], chain: ANY, ...STAND_IN },
  // ---- the second cycle: more pictures; a hard board at 15, super hard at 20
  /* 11 */ { role: "pace",   destination: "dest-grand-prismatic", drop: "paddle-steamer", ...long(["guitar", "hammock", "houseboat", "ice-lolly", "canal-house", "flamenco", "tractor", "pagoda", "rocking-horse", "paddle-steamer"]), careless: [0.85, 1], chain: ANY, ...STAND_IN },
  /* 12 */ { role: "build",  destination: "dest-delicate-arch", drop: "taj-mahal", ...sq(7, { keep: ["cable-car", "eiffel-tower", "iceberg", "rubber-duck", "taj-mahal", "calla-lilies", "moai"] }), careless: [0.7, 0.8], chain: ANY, ...STAND_IN },
  /* 13 */ { role: "build",  destination: "dest-grand-canyon", drop: "irises", ...sq(8, { keep: ["classic-car", "irises", "paper-parasol", "pineapple", "ramen", "violin", "macaw", "toadstools"] }), careless: [0.6, 0.75], chain: ANY, ...STAND_IN },
  /* 14 */ { role: "build",  destination: "dest-yosemite", drop: "standing-stones", ...sq(8), careless: [0.6, 0.7], chain: ANY, ...NEW_ONLY },
  /* 15 */ { role: "hard",   destination: "dest-na-pali", drop: "corn-cob", ...sq(9), careless: [0.3, 0.5], chain: ANY, ...NEW_ONLY },
  /* 16 */ { role: "relief", destination: "dest-fuji-chureito", drop: "covered-bridge", ...sq(7), careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  /* 17 */ { role: "build",  destination: "dest-gotokuji-cats", drop: "rooster", ...sq(8), careless: [0.6, 0.7], chain: ANY, ...NEW_ONLY },
  /* 18 */ { role: "build",  destination: "dest-kamakura-buddha", drop: "amaryllis", ...sq(8), careless: [0.55, 0.65], chain: ANY, ...NEW_ONLY },
  /* 19 */ { role: "build",  destination: "dest-snow-monkeys", drop: "majolica-jug", ...sq(9), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 20 */ { role: "super",  destination: "dest-shirakawa-go", board: [5, 5], addFrom: ADD_5X5, ...sq(13), careless: [0.1, 0.3], traps: [0, 3], chain: ANY, ...NEW_ONLY },
  // ---- the third cycle: 4x5 boards from 22 (Gameplay, 2026-10-25: about 60x80 a card on a 360x640 phone)
  /* 21 */ { role: "pace",   destination: "dest-kinkakuji", drop: "dachshund", ...long(["canoe", "dachshund", "giraffe", "grand-piano", "lily-window", "milkshake", "ribbon-falls", "sewing-machine", "sidecar", "skyscraper", "sunflower", "wheelbarrow"]), careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  /* 22 */ { role: "build",  destination: "dest-fushimi-inari", drop: "observatory", board: [4, 5], ...sq(9), careless: [0.7, 0.8], chain: ANY, ...NEW_ONLY },
  /* 23 */ { role: "build",  destination: "dest-kiyomizu-dera", drop: "thunderstorm", board: [4, 5], ...sq(10), careless: [0.65, 0.75], chain: ANY, ...NEW_ONLY },
  /* 24 */ { role: "build",  destination: "dest-nachi-falls", drop: "baker", board: [4, 5], ...sq(10), careless: [0.6, 0.7], chain: ANY, ...NEW_ONLY },
  /* 25 */ { role: "hard",   destination: "dest-himeji-castle", drop: "igloo", board: [4, 5], ...sq(11), careless: [0.3, 0.5], chain: ANY, ...NEW_ONLY },
  /* 26 */ { role: "relief", destination: "dest-rabbit-island", drop: "bullet-train", board: [4, 5], ...sq(8), careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  // ---- the end of trip 2, Japan (lead, 2026-10-25; docs/difficulty-curve.md "Trips of 15 boards"):
  // the trip's hardest builds, then its super hard finale right before the stamp
  /* 27 */ { role: "build",  destination: "dest-itsukushima", drop: "corn-cob", board: [4, 5], ...sq(10), careless: [0.6, 0.7], chain: ANY, ...NEW_ONLY },
  /* 28 */ { role: "build",  destination: "dest-kintai-bridge", drop: "castle", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY, ...NEW_ONLY },
  /* 29 */ { role: "build",  destination: "dest-takachiho", drop: "armchair", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  // (traps capped: the first deal in range had 8, where board 20 has 1 and 25 has 2; a finale is beaten in a few tries)
  /* 30 */ { role: "super",  destination: "dest-taketomi", board: [6, 6], addFrom: ADD_5X5, ...sq(18), careless: [0.1, 0.3], traps: [0, 3], chain: ANY, ...NEW_ONLY },
  // ---- trip 3, Italy (lead, 2026-10-26; docs/difficulty-curve.md "Trips of 15 boards"): relief after the
  // stamp, hard at x5 and x10, super hard at x15, one all-long 4x4 board (x6, the relief after a spike);
  // every square board 4x5 (the campaign's largest: cards stay about 60x80 on a 360x640 phone), one
  // picture more than trip 2 at each role. Hard boards' traps capped, as on board 30.
  /* 31 */ { role: "relief", destination: "dest-tre-cime", drop: "bleeding-heart", board: [4, 5], ...sq(8), careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  /* 32 */ { role: "build",  destination: "dest-seceda", drop: "highland-cow", board: [4, 5], ...sq(10), careless: [0.6, 0.7], chain: ANY, ...NEW_ONLY },
  /* 33 */ { role: "build",  destination: "dest-lake-como", drop: "rowboat-lake", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY, ...NEW_ONLY },
  /* 34 */ { role: "build",  destination: "dest-isola-bella", drop: "blooming-tea", board: [4, 5], ...sq(10), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 35 */ { role: "hard",   destination: "dest-venice", drop: "kangaroo-paw", board: [4, 5], ...sq(11), careless: [0.3, 0.45], traps: [0, 3], chain: ANY, ...NEW_ONLY },
  /* 36 */ { role: "pace",   destination: "dest-cinque-terre", drop: "meerkat", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  /* 37 */ { role: "build",  destination: "dest-burano", drop: "chocolate-truffles", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY, ...NEW_ONLY },
  /* 38 */ { role: "build",  destination: "dest-parmigiano", drop: "sea-holly", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 39 */ { role: "build",  destination: "dest-val-dorcia", drop: "kick-scooter", board: [4, 5], ...sq(10), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 40 */ { role: "hard",   destination: "dest-civita", board: [5, 5], addFrom: ADD_5X5, ...sq(13), careless: [0.25, 0.4], traps: [0, 3], chain: ANY, ...NEW_ONLY },
  /* 41 */ { role: "relief", destination: "dest-bomarzo", drop: "dumplings", board: [4, 5], ...sq(9), careless: [0.8, 1], chain: ANY, ...NEW_ONLY },
  /* 42 */ { role: "build",  destination: "dest-positano", drop: "pine-cone", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 43 */ { role: "build",  destination: "dest-capri", drop: "edelweiss", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 44 */ { role: "build",  destination: "dest-matera", drop: "shepherds-hut", board: [4, 5], ...sq(11), careless: [0.4, 0.5], chain: ANY, ...NEW_ONLY },
  /* 45 */ { role: "super",  destination: "dest-alberobello", board: [5, 5], addFrom: ADD_5X5, ...sq(13), careless: [0.1, 0.25], traps: [0, 3], chain: ANY, ...NEW_ONLY },
  // ---- trip 4, the American West: the same shape, its floor a little higher again
  /* 46 */ { role: "relief", destination: "dest-bixby", drop: "ice-cream-van", board: [4, 5], ...sq(9), careless: [0.8, 1], chain: ANY, ...NEW_ONLY },
  /* 47 */ { role: "build",  destination: "dest-emerald-bay", drop: "marigolds", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY, ...NEW_ONLY },
  /* 48 */ { role: "build",  destination: "dest-mono-lake", drop: "crocus", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 49 */ { role: "build",  destination: "dest-joshua-tree", drop: "porch-rocker", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 50 */ { role: "hard",   destination: "dest-oatman", board: [5, 5], addFrom: ADD_5X5, ...sq(13), careless: [0.25, 0.4], traps: [0, 3], chain: ANY, ...NEW_ONLY },
  /* 51 */ { role: "pace",   destination: "dest-horseshoe", drop: "baguette-sandwich", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  /* 52 */ { role: "build",  destination: "dest-zion", drop: "tea-pourer", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 53 */ { role: "build",  destination: "dest-bryce", drop: "river-raft", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 54 */ { role: "build",  destination: "dest-valley-of-fire", drop: "rowboat-lake", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 55 */ { role: "hard",   destination: "dest-teton", board: [5, 5], addFrom: ADD_5X5, ...sq(13), careless: [0.2, 0.35], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  /* 56 */ { role: "relief", destination: "dest-palouse", drop: "ferris-wheel", board: [4, 5], ...sq(9), careless: [0.8, 1], chain: ANY, ...NEW_ONLY },
  /* 57 */ { role: "build",  destination: "dest-teapot", drop: "spinning-top", board: [4, 5], ...sq(10), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 58 */ { role: "build",  destination: "dest-painted-hills", drop: "palace-window", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 59 */ { role: "build",  destination: "dest-dog-bark", drop: "shepherds-hut", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 60 */ { role: "super",  destination: "dest-crater-lake", board: [6, 6], addFrom: ADD_5X5, ...sq(19), careless: [0.08, 0.2], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  // ---- trip 5, France (lead, 2026-10-26): trip 4's shape, its floor a little higher. 4x5 holds 12 at the
  // most (past it most deals cannot be won), so the floor rises by a 10-picture relief at x11, lower
  // build ranges, and a trap more allowed on the hard boards
  /* 61 */ { role: "relief", destination: "dest-etretat", drop: "gecko", board: [4, 5], ...sq(9), careless: [0.8, 1], chain: ANY, ...NEW_ONLY },
  /* 62 */ { role: "build",  destination: "dest-mont-saint-michel", drop: "bagels", board: [4, 5], ...sq(11), careless: [0.55, 0.65], chain: ANY, ...NEW_ONLY },
  /* 63 */ { role: "build",  destination: "dest-ploumanach", drop: "water-slide", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 64 */ { role: "build",  destination: "dest-chapel-oak", drop: "donkey", board: [4, 5], ...sq(10), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 65 */ { role: "hard",   destination: "dest-chenonceau", board: [5, 5], addFrom: ADD_5X5, ...sq(13), careless: [0.25, 0.4], traps: [0, 3], chain: ANY, ...NEW_ONLY },
  /* 66 */ { role: "pace",   destination: "dest-eiffel", drop: "asparagus", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  /* 67 */ { role: "build",  destination: "dest-colmar", drop: "brownstone", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 68 */ { role: "build",  destination: "dest-lac-blanc", drop: "persimmons", board: [4, 5], ...sq(11), careless: [0.4, 0.5], chain: ANY, ...NEW_ONLY },
  /* 69 */ { role: "build",  destination: "dest-palais-ideal", drop: "pop-sunset", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 70 */ { role: "hard",   destination: "dest-valensole", drop: "airliner", board: [4, 5], ...sq(12), careless: [0.2, 0.35], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  /* 71 */ { role: "relief", destination: "dest-verdon", drop: "clivia", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY, ...NEW_ONLY },
  /* 72 */ { role: "build",  destination: "dest-camargue-flamingos", drop: "cocoa-pod", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 73 */ { role: "build",  destination: "dest-carcassonne", drop: "manta-ray", board: [4, 5], ...sq(11), careless: [0.4, 0.5], chain: ANY, ...NEW_ONLY },
  /* 74 */ { role: "build",  destination: "dest-bonifacio", drop: "hoarfrost", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 75 */ { role: "super",  destination: "dest-dune-pilat", board: [5, 5], addFrom: ADD_5X5, ...sq(14), careless: [0.08, 0.2], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  // ---- trip 6, Canada: the same shape, its floor higher again (both reliefs 10 pictures)
  /* 76 */ { role: "relief", destination: "dest-moraine", drop: "glider", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY, ...NEW_ONLY },
  /* 77 */ { role: "build",  destination: "dest-abraham-lake", drop: "cinnamon-rolls", board: [4, 5], ...sq(11), careless: [0.55, 0.65], chain: ANY, ...NEW_ONLY },
  /* 78 */ { role: "build",  destination: "dest-pysanka", drop: "basket-weaver", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 79 */ { role: "build",  destination: "dest-mac-moose", drop: "gecko", board: [4, 5], ...sq(12), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 80 */ { role: "hard",   destination: "dest-yellowknife-aurora", drop: "glass-arcade", board: [4, 5], ...sq(12), careless: [0.25, 0.35], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  /* 81 */ { role: "pace",   destination: "dest-parliament-hill", drop: "coral-reef", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  /* 82 */ { role: "build",  destination: "dest-churchill-bears", drop: "capybara", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 83 */ { role: "build",  destination: "dest-old-quebec", drop: "rainforest-canopy", board: [4, 5], ...sq(11), careless: [0.4, 0.5], chain: ANY, ...NEW_ONLY },
  /* 84 */ { role: "build",  destination: "dest-perce", drop: "cockscomb", board: [4, 5], ...sq(11), careless: [0.35, 0.45], chain: ANY, ...NEW_ONLY },
  /* 85 */ { role: "hard",   destination: "dest-bonaventure-gannets", board: [5, 5], addFrom: ADD_5X5, ...sq(13), careless: [0.2, 0.3], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  /* 86 */ { role: "relief", destination: "dest-hopewell", drop: "paella", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY, ...NEW_ONLY },
  /* 87 */ { role: "build",  destination: "dest-peggys-cove", drop: "bumper-cars", board: [4, 5], ...sq(11), careless: [0.4, 0.5], chain: ANY, ...NEW_ONLY },
  /* 88 */ { role: "build",  destination: "dest-lunenburg", drop: "paddleboarder", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 89 */ { role: "build",  destination: "dest-cabot-trail", drop: "clivia", board: [4, 5], ...sq(11), careless: [0.4, 0.5], chain: ANY, ...NEW_ONLY },
  /* 90 */ { role: "super",  destination: "dest-twillingate-iceberg", board: [6, 6], addFrom: ADD_5X5, ...sq(19), careless: [0.08, 0.18], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  // ---- trip 7, Argentina (the creator, 2026-10-27; docs/difficulty-curve.md "Trips 7 and 8"): the trip
  // shape since trip 3, every unmarked board readable and every marked one beatable by a careful player
  // (metrics.ts READABLE, CAREFUL; set below), which caps the builds at 10-11 pictures (12 on 4x5 is not
  // readable at a build's target). Big boards: 95 and 100 at 5x5; the finale 105 stays 4x5 (the 6x6
  // finales are every other one: 90, then 120). Postcards come from Art's batch; rows take them when it lands
  /* 91 */ { role: "relief", destination: "dest-iguazu", drop: "fruit-bat", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY, ...NEW_ONLY },
  /* 92 */ { role: "build",  destination: "dest-caminito", drop: "oculus", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY, ...NEW_ONLY },
  /* 93 */ { role: "build",  destination: "dest-purmamarca", drop: "bricklayer", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 94 */ { role: "build",  destination: "dest-ibera-capybaras", drop: "ammonite", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 95 */ { role: "hard",   destination: "dest-fitz-roy", drop: "rainwater-tank", board: [5, 5], ...sq(13), careless: [0.25, 0.35], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  /* 96 */ { role: "pace",   destination: "dest-eclaireurs", drop: "brugmansia", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  /* 97 */ { role: "build",  destination: "dest-trochita", drop: "tapir", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 98 */ { role: "build",  destination: "dest-salinas-grandes", drop: "fudge", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 99 */ { role: "build",  destination: "dest-polvorilla", drop: "malachite", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 100 */ { role: "hard",  destination: "dest-valdes-whale", drop: "pho", board: [5, 5], ...sq(13), careless: [0.2, 0.3], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  /* 101 */ { role: "relief", destination: "dest-punta-tombo", drop: "birdwatcher", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY, ...NEW_ONLY },
  /* 102 */ { role: "build", destination: "dest-arrayanes", drop: "metro-station", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 103 */ { role: "build", destination: "dest-ischigualasto", drop: "camping-stove", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 104 */ { role: "build", destination: "dest-payunia", drop: "budgies", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 105 */ { role: "super", destination: "dest-perito-moreno", drop: "glazier", board: [4, 5], ...sq(12), careless: [0.08, 0.2], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  // ---- trip 8, Australia (New Zealand in reserve, the creator, 2026-10-27): the same shape; big boards
  // 110 at 5x5 and the finale 120 at 6x6
  /* 106 */ { role: "relief", destination: "dest-twelve-apostles", drop: "rollerskater", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY, ...NEW_ONLY },
  /* 107 */ { role: "build", destination: "dest-brighton-boxes", drop: "beech-woods", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY, ...NEW_ONLY },
  /* 108 */ { role: "build", destination: "dest-hutt-lagoon", drop: "hula-hoop", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 109 */ { role: "build", destination: "dest-hillsborough-kangaroos", drop: "hermit-crab", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 110 */ { role: "hard",  destination: "dest-whitehaven", drop: "kayak", board: [5, 5], ...sq(13), careless: [0.25, 0.35], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  /* 111 */ { role: "pace",  destination: "dest-harbour-bridge", drop: "shophouses", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY, ...NEW_ONLY },
  /* 112 */ { role: "build", destination: "dest-bay-of-fires", drop: "clover", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 113 */ { role: "build", destination: "dest-pinnacles", drop: "bluebonnets", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 114 */ { role: "build", destination: "dest-rottnest-quokka", drop: "goldenrod", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 115 */ { role: "hard",  destination: "dest-remarkable-rocks", drop: "grape-picker", board: [4, 5], ...sq(12), careless: [0.2, 0.3], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  /* 116 */ { role: "relief", destination: "dest-cape-tribulation", drop: "digger", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY, ...NEW_ONLY },
  /* 117 */ { role: "build", destination: "dest-karijini", drop: "date-palms", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY, ...NEW_ONLY },
  /* 118 */ { role: "build", destination: "dest-big-banana", drop: "pho", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY, ...NEW_ONLY },
  /* 119 */ { role: "build", destination: "dest-cradle-mountain", drop: "gaillardia", board: [4, 5], ...sq(11), careless: [0.4, 0.5], chain: ANY, ...NEW_ONLY },
  /* 120 */ { role: "super", destination: "dest-heart-reef", drop: "hedgerow", board: [6, 6], ...sq(19), careless: [0.08, 0.18], traps: [0, 4], chain: ANY, ...NEW_ONLY },
  // ---- trip 9, South Africa (the creator, 2026-10-27; docs/difficulty-curve.md "Trips 9 and 10"): trip 7's
  // shape and targets; big boards in new slots, 130 and the finale 135 at 5x5 (125 is 4x5). HALF NEW: about
  // half of each board's everyday pictures come back from boards 1-60 (BACK, set below), the rest are new
  // (Art's batch after LAST_BEFORE_T9, and the spares no board has shown). Each row deals one new picture
  // more than it shows: the drop, whose place the postcard takes once Art's postcards are in
  /* 121 */ { role: "relief", destination: "dest-bo-kaap", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 122 */ { role: "build", destination: "dest-storms-river", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 123 */ { role: "build", destination: "dest-namaqualand", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 124 */ { role: "build", destination: "dest-oudtshoorn-ostriches", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 125 */ { role: "hard",  destination: "dest-three-rondavels", board: [4, 5], ...sq(12), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 126 */ { role: "pace",  destination: "dest-amphitheatre", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 127 */ { role: "build", destination: "dest-bourkes-luck", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 128 */ { role: "build", destination: "dest-chapmans-peak", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 129 */ { role: "build", destination: "dest-kneeling-warthogs", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 130 */ { role: "hard",  destination: "dest-kruger-elephants", board: [5, 5], ...sq(13), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 131 */ { role: "relief", destination: "dest-st-lucia-hippo", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 132 */ { role: "build", destination: "dest-augrabies", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 133 */ { role: "build", destination: "dest-pretoria-jacarandas", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 134 */ { role: "build", destination: "dest-kgalagadi", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 135 */ { role: "super", destination: "dest-table-mountain", board: [5, 5], ...sq(14), careless: [0.08, 0.2], traps: [0, 4], chain: ANY },
  // ---- trip 10, the UK and Ireland (the creator, 2026-10-27): trip 8's shape and targets; big boards 140 at
  // 5x5 and the finale 150 at 6x6 (every other finale: 30, 60, 90, 120, 150); 145 is 4x5. Half new, as trip 9
  /* 136 */ { role: "relief", destination: "dest-giants-causeway", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 137 */ { role: "build", destination: "dest-arlington-row", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 138 */ { role: "build", destination: "dest-dark-hedges", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 139 */ { role: "build", destination: "dest-skomer-puffins", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 140 */ { role: "hard",  destination: "dest-glencoe", board: [5, 5], ...sq(13), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 141 */ { role: "pace",  destination: "dest-old-man-of-storr", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 142 */ { role: "build", destination: "dest-shambles", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 143 */ { role: "build", destination: "dest-kynance-cove", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 144 */ { role: "build", destination: "dest-royal-crescent", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 145 */ { role: "hard",  destination: "dest-yr-wyddfa", board: [4, 5], ...sq(12), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 146 */ { role: "relief", destination: "dest-dunmore-pineapple", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 147 */ { role: "build", destination: "dest-wistmans-wood", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 148 */ { role: "build", destination: "dest-connemara-sheep", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 149 */ { role: "build", destination: "dest-burren", board: [4, 5], ...sq(11), careless: [0.4, 0.5], chain: ANY },
  /* 150 */ { role: "super", destination: "dest-cliffs-of-moher", board: [6, 6], ...sq(19), careless: [0.08, 0.18], traps: [0, 4], chain: ANY },
];

/**
 * The trips (lead, 2026-10-25: the game is a travelogue; docs/difficulty-curve.md
 * "Trips of 15 boards"): boards `from`-`to` (1-based, as players count them)
 * make one trip, and finishing its last board stamps the passport. The ids
 * stay put when a name changes. Written to src/content/levels/trips.json by
 * tools/levels/make-trips.mts for the passport and home (UI); check.mts holds
 * the file to this list. The last trip may run past the boards made so far.
 */
export const TRIPS = [
  { id: "t1", name: "Travel America", from: 1, to: 15 },
  // the creator's choice (lead, 2026-10-25)
  { id: "t2", name: "Japan", from: 16, to: 30 },
  // the creator's choice (lead, 2026-10-26)
  { id: "t3", name: "Italy", from: 31, to: 45 },
  { id: "t4", name: "American West", from: 46, to: 60 },
  // the creator's choice (lead, 2026-10-26)
  { id: "t5", name: "France", from: 61, to: 75 },
  { id: "t6", name: "Canada", from: 76, to: 90 },
  // the creator's choices (2026-10-27): Argentina, and Australia (New Zealand in reserve)
  { id: "t7", name: "Argentina", from: 91, to: 105 },
  { id: "t8", name: "Australia", from: 106, to: 120 },
];

/** Roles that may trap from the first move; every other board starts safe (check.mts). */
export const MAY_TRAP = new Set(["hard", "peak", "super"]);

/**
 * The mark players see on a board (creator, 2026-10-25: hard and super hard
 * boards are marked), by role: a board's top-level `mark` field, which the
 * game reads; none on any other board, the first bite included, nor on the
 * challenge route or the daily (check.mts). The first peak is at the hard
 * target, so it is marked hard. The win checker ignores the field.
 */
export const MARKS = { hard: "hard", peak: "hard", super: "super" };

// every board: card backs on the stacks, varied, nothing busy 2, and few rated busy at all
// (an all-long board keeps all its pictures, so it has no busy cap of its own)
// boards 31 on: every picture from the creator's new batch (lead, 2026-10-26; Art 6d0e96a: the 240
// catalogue entries from marigolds on), so all of them are new to the player
// boards 61 on: every picture from the next batch (lead, 2026-10-26; Art: foxgloves on), new to the player again;
// 1-60 never take from it (newTo), so a re-dealt board there cannot show one early
// boards 91 on (trips 7 and 8): only from Art's batch for them (NEXT_BATCH: brugmansia on), and boards 61-90
// never take from it
export const NEXT_BATCH = "brugmansia";
// boards 121 on (trips 9 and 10): new pictures from Art's batch for them (every picture after
// LAST_BEFORE_T9, the catalogue's last before it) and the spares no board has shown; boards 91-120 never
// take from that batch
export const LAST_BEFORE_T9 = "drone";
PLAN.forEach((row, i) => Object.assign(row, i < 30 ? { newTo: "foxgloves" } : i < 60 ? { newFrom: "marigolds", newTo: "foxgloves" } : i < 90 ? { newFrom: "foxgloves", newTo: NEXT_BATCH } : i < 120 ? { newFrom: NEXT_BATCH, newThrough: LAST_BEFORE_T9 } : { newAfter: LAST_BEFORE_T9 }));
// HALF NEW on boards 121-150 (the creator, 2026-10-27): of each board's everyday pictures (all but the
// postcard) half, rounded down, come back from boards 1-60 (BACK: pictures-back.json, those that meet
// today's rules), exactly so many (oldLeast with oldMost); the rest, and the drop the postcard replaces,
// are new. The no-repeat rule (SPACING) holds among them as everywhere
const BACK_FILE = JSON.parse(readFileSync(new URL("./pictures-back.json", import.meta.url), "utf8"));
export const BACK = new Set(BACK_FILE.back.filter((id) => !(id in BACK_FILE.struck)));
export const SPARES = new Set(BACK_FILE.spares);
const ALSO = new Set([...BACK, ...SPARES]);
PLAN.forEach((row, i) => {
  if (i < 120) return;
  const back = Math.floor((row.count - 1) / 2);
  Object.assign(row, { old: BACK, oldMost: back, oldLeast: back, also: ALSO });
});
// every unmarked board is READABLE (creator, 2026-10-27, after "rigged"-feeling boards 18-19): a player who
// draws by the face-up cards wins it 85% or more; hard and super hard boards may still hide the way. Where
// no deal of a board's pictures is readable at its target (the 12-picture builds late in trips 3-6 above
// all), the board plays one picture fewer, its postcard kept (34, 39, 54, 57, 58, 59, 64, 68, 69, 72, 73,
// 74, 82, 83, 84, 87, 88, 89; the dropped picture is a spare again), and those that still could not
// (54, 58, 59, 69, 74, 89, each its trip's hardest unmarked build, and 88 under the same rule) ease
// their target one step (creator's choice (a), 2026-10-27; make-campaign.mts --reseat)
for (const row of PLAN) if (!MAY_TRAP.has(row.role)) row.reader = [READABLE, 1];
// and a marked board never walls a thinking player (creator, 2026-10-27, after board 60): the reader
// wins it 1 in 4 or more. The 6x6 finales 60 and 90, re-dealt for it, stay the game's hardest: 25-40%
for (const row of PLAN) if (MAY_TRAP.has(row.role)) row.reader = [CAREFUL, 1];
PLAN[59].reader = PLAN[89].reader = [CAREFUL, 0.4];

/**
 * The creator's re-deal requests from the Difficulty editor (redeals.json): each "easier" one moves its
 * board's careless target up a step (10 points, never past 100%), whether dealt yet or not, so the plan
 * always describes the board as it is or is about to be. "same" changes nothing here (make-campaign.mts
 * --redeals deals them on the next seed).
 */
export const REDEALS = JSON.parse(readFileSync(new URL("./redeals.json", import.meta.url), "utf8")).requests;
for (const r of REDEALS) {
  const row = PLAN[r.board - 1];
  if (r.kind !== "easier" || !row?.careless || r.cancelled) continue;
  row.careless = row.careless.map((v) => Math.min(1, Math.round((v + 0.1) * 100) / 100));
}
for (const row of PLAN) Object.assign(row, { peek: 0, vary: true, busyMost: row.busyMost ?? 0, liveMost: row.liveMost ?? (row.role === "pace" ? undefined : row.count >= 8 ? 2 : 1) });
