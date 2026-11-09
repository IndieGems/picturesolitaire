// The campaign's curve: one row per board, each axis on its own.
// tools/levels/make-campaign.mts turns it into src/content/levels/campaign.json.
//
// A SAWTOOTH (creator, 2026-10-25: "we need to make the game harder", with a
// bite "even by level 3"; docs/difficulty-curve.md): a ten-board cycle of a
// change of pace (x1, all long pictures), three builds, a hard board (x5),
// relief (x6), three builds and a peak (x10). Board 3 was the first bite (a
// small step up since 2026-11-05: it walled new players; its row below), 7
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

import { existsSync, readFileSync } from "node:fs";
import { CAREFUL, READABLE } from "../../src/game/solver/metrics.ts";
import { catalogue, destinations, MOVED_OFF } from "./lib.mts";

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
  // ---- the first cycle: teach, a small step up at board 3, a hard board at 7, the first peak at 10
  /*  1 */ { role: "teach",  destination: "dest-statue-of-liberty", drop: "pink-lotus", ...sq(3), careless: [1, 1], chain: [1, 1], ...STAND_IN },
  /*  2 */ { role: "teach",  destination: "dest-niagara-falls", drop: "cliff-lighthouse", ...sq(4), careless: [1, 1], chain: [1, 1], ...STAND_IN },
  // board 3 was the first bite (careless 55-65%, one trap); in release it walled half the new players
  // (2-5 Nov: 164 started, 88 won; most stuck or quit with 6-7 pictures left), so (creator, 2026-11-05,
  // via the lead) it is a small step up from board 2: the same 7 pictures and postcard, a deal no clear
  // can doom (careless 100%, no trap) and no clear needing more than one before it (chain 2, as board
  // 4), re-dealt in place (id c03 kept, so a win on the old deal still pays) with --reseat 3
  /*  3 */ { role: "build",  destination: "dest-letchworth", drop: "mount-fuji", ...sq(7, { keep: ["blue-bicycle", "cactus-bloom", "ice-cream", "mount-fuji", "sailboat", "red-barn", "skier"] }), careless: [1, 1], traps: [0, 0], chain: [2, 2], liveMost: 2, ...STAND_IN },
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
  // ---- trip 9, South Africa (the creator, 2026-10-27; docs/difficulty-curve.md "Trips 9 and 10"; the places
  // and their order Art's, docs/destinations-south-africa.md): trip 7's
  // shape and targets; big boards in new slots, 130 and the finale 135 at 5x5 (125 is 4x5). HALF NEW: about
  // half of each board's everyday pictures come back from boards 1-60 (BACK, set below), the rest are new
  // (Art's batch after LAST_BEFORE_T9, and the spares no board has shown). Each row deals one new picture
  // more than it shows: the drop, whose place the postcard takes once Art's postcards are in
  /* 121 */ { role: "relief", destination: "dest-table-mountain", drop: "sundial", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 122 */ { role: "build", destination: "dest-bo-kaap", drop: "oyster-farmer", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 123 */ { role: "build", destination: "dest-oudtshoorn-ostriches", drop: "caver", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 124 */ { role: "build", destination: "dest-cape-winelands", drop: "cockscomb", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 125 */ { role: "hard",  destination: "dest-cape-point", drop: "rowboat-lake", board: [4, 5], ...sq(12), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 126 */ { role: "pace",  destination: "dest-amphitheatre", drop: "orca", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 127 */ { role: "build", destination: "dest-wolfberg-arch", drop: "lotus-pod", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 128 */ { role: "build", destination: "dest-kalahari-meerkats", drop: "alstroemeria", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 129 */ { role: "build", destination: "dest-augrabies", drop: "cotton-grass", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 130 */ { role: "hard",  destination: "dest-namaqualand", drop: "cannoli", board: [5, 5], ...sq(13), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 131 */ { role: "relief", destination: "dest-bourkes-luck", drop: "eclairs", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 132 */ { role: "build", destination: "dest-kruger-elephants", drop: "persimmons", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 133 */ { role: "build", destination: "dest-sani-pass", drop: "hot-rod", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 134 */ { role: "build", destination: "dest-st-lucia-hippos", drop: "porch-rocker", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 135 */ { role: "super", destination: "dest-three-rondavels", drop: "mooncakes", board: [5, 5], ...sq(14), careless: [0.08, 0.2], traps: [0, 4], chain: ANY },
  // ---- trip 10, the UK and Ireland (the creator, 2026-10-27; Art's places, docs/destinations-uk-ireland.md):
  // trip 8's shape and targets; big boards 140 at
  // 5x5 and the finale 150 at 6x6 (every other finale: 30, 60, 90, 120, 150); 145 is 4x5. Half new, as trip 9
  /* 136 */ { role: "relief", destination: "dest-westminster", drop: "atoll", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 137 */ { role: "build", destination: "dest-royal-crescent", drop: "bushbaby", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 138 */ { role: "build", destination: "dest-stonehenge", drop: "tow-truck", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 139 */ { role: "build", destination: "dest-durdle-door", drop: "icicles", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 140 */ { role: "hard",  destination: "dest-pontcysyllte", drop: "gecko", board: [5, 5], ...sq(13), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 141 */ { role: "pace",  destination: "dest-dark-hedges", drop: "springbok", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 142 */ { role: "build", destination: "dest-giants-causeway", drop: "watchmaker", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 143 */ { role: "build", destination: "dest-connemara-sheep", drop: "rhubarb", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 144 */ { role: "build", destination: "dest-cliffs-of-moher", drop: "shortbread", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 145 */ { role: "hard",  destination: "dest-dublin-doors", drop: "beach-ball", board: [4, 5], ...sq(12), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 146 */ { role: "relief", destination: "dest-highland-cow", drop: "seagrass", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 147 */ { role: "build", destination: "dest-fairy-pools", drop: "glider", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 148 */ { role: "build", destination: "dest-keem-bay", drop: "coleus", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 149 */ { role: "build", destination: "dest-loch-ness", drop: "red-deer", board: [4, 5], ...sq(11), careless: [0.4, 0.5], chain: ANY },
  /* 150 */ { role: "super", destination: "dest-edinburgh-castle", drop: "tree-tent", board: [6, 6], ...sq(19), careless: [0.08, 0.18], traps: [0, 4], chain: ANY },
  // ---- trips 11-16 (the creator, 2026-11-07; docs/difficulty-curve.md "Trips 11-16 (plan)"): trips 9 and
  // 10's shape and targets, no harder (x14 at South Africa's 45-55%); two of each trip's three marked boards
  // big, never in the same two slots as the trip before or after; the 6x6 finales 195 and 225. NO NEW
  // EVERYDAY ART (the creator): every picture from the library (TRIP_11_ON below), longest unseen first, and
  // each postcard seated mid-board by the maker (no drop: lib.mts seatMidBoard). East Coast America was put
  // in as trip 11 after the others were dealt (the creator: "get another American region in there, since it
  // is and will probably stay our main audience"): the five after it moved back 15 boards, each board at the
  // row of its postcard with its deal kept (make-campaign.mts, lib.mts alignByDestination)
  // ---- trip 11, East Coast America: x5 155 and x10 160 at 5x5 (UK & Ireland had x5 and the finale, New
  // Zealand x10 and the finale), the finale 165 at 4x5 (Art's places, docs/destinations-east-coast-america.md)
  /* 151 */ { role: "relief", destination: "dest-portland-head-light", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 152 */ { role: "build", destination: "dest-albany-covered-bridge", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 153 */ { role: "build", destination: "dest-vermont-sugarhouse", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 154 */ { role: "build", destination: "dest-acorn-street", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 155 */ { role: "hard",  destination: "dest-flying-horse-carousel", board: [5, 5], ...sq(13), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 156 */ { role: "pace",  destination: "dest-thimble-islands", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 157 */ { role: "build", destination: "dest-independence-hall", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 158 */ { role: "build", destination: "dest-delaware-horseshoe-crabs", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 159 */ { role: "build", destination: "dest-assateague-horses", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 160 */ { role: "hard",  destination: "dest-tidal-basin-blossoms", board: [5, 5], ...sq(13), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 161 */ { role: "relief", destination: "dest-carolina-flytraps", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 162 */ { role: "build", destination: "dest-rainbow-row", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 163 */ { role: "build", destination: "dest-driftwood-beach", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 164 */ { role: "build", destination: "dest-cape-coral-owls", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 165 */ { role: "super", destination: "dest-everglades-alligator", board: [4, 5], ...sq(12), careless: [0.08, 0.2], traps: [0, 4], chain: ANY },
  // ---- trip 12, New Zealand (Art's places, docs/destinations-new-zealand.md): 175 and the finale 180 at 5x5
  /* 166 */ { role: "relief", destination: "dest-lake-tekapo", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 167 */ { role: "build", destination: "dest-ohakune-carrot", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 168 */ { role: "build", destination: "dest-pohutu", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 169 */ { role: "build", destination: "dest-moeraki-boulders", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 170 */ { role: "hard",  destination: "dest-napier-art-deco", board: [4, 5], ...sq(12), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 171 */ { role: "pace",  destination: "dest-wanaka-tree", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 172 */ { role: "build", destination: "dest-rakiura-kiwi", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 173 */ { role: "build", destination: "dest-kaikoura-seals", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 174 */ { role: "build", destination: "dest-baldwin-street", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 175 */ { role: "hard",  destination: "dest-franz-josef", board: [5, 5], ...sq(13), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 176 */ { role: "relief", destination: "dest-arrowtown", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 177 */ { role: "build", destination: "dest-kea-arthurs-pass", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 178 */ { role: "build", destination: "dest-pancake-rocks", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 179 */ { role: "build", destination: "dest-curio-bay", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 180 */ { role: "super", destination: "dest-milford-sound", board: [5, 5], ...sq(14), careless: [0.08, 0.2], traps: [0, 4], chain: ANY },
  // ---- trip 13, Spain & Portugal (Art's places, docs/destinations-spain-portugal.md): 185 at 5x5, the finale 195 at 6x6
  /* 181 */ { role: "relief", destination: "dest-plaza-de-espana", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 182 */ { role: "build", destination: "dest-costa-nova", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 183 */ { role: "build", destination: "dest-consuegra-windmills", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 184 */ { role: "build", destination: "dest-belem-tower", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 185 */ { role: "hard",  destination: "dest-las-medulas", board: [5, 5], ...sq(13), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 186 */ { role: "pace",  destination: "dest-ronda-bridge", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 187 */ { role: "build", destination: "dest-guadix-caves", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 188 */ { role: "build", destination: "dest-pena-palace", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 189 */ { role: "build", destination: "dest-la-geria", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 190 */ { role: "hard",  destination: "dest-monsanto", board: [4, 5], ...sq(12), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 191 */ { role: "relief", destination: "dest-palacio-de-cristal", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 192 */ { role: "build", destination: "dest-alentejo-cork-oaks", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 193 */ { role: "build", destination: "dest-gulpiyuri", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 194 */ { role: "build", destination: "dest-benagil-cave", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 195 */ { role: "super", destination: "dest-porto-ribeira", board: [6, 6], ...sq(19), careless: [0.08, 0.18], traps: [0, 4], chain: ANY },
  // ---- trip 14, Morocco (Art's places, docs/destinations-morocco.md): 200 and 205 at 5x5, the finale 210 at 4x5
  /* 196 */ { role: "relief", destination: "dest-chefchaouen", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 197 */ { role: "build", destination: "dest-argan-goats", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 198 */ { role: "build", destination: "dest-essaouira-boats", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 199 */ { role: "build", destination: "dest-volubilis", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 200 */ { role: "hard",  destination: "dest-ait-benhaddou", board: [5, 5], ...sq(13), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 201 */ { role: "pace",  destination: "dest-todra-gorge", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 202 */ { role: "build", destination: "dest-el-badi-storks", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 203 */ { role: "build", destination: "dest-imlil-toubkal", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 204 */ { role: "build", destination: "dest-fes-tanneries", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 205 */ { role: "hard",  destination: "dest-erg-chebbi", board: [5, 5], ...sq(13), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 206 */ { role: "relief", destination: "dest-fes-donkey", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 207 */ { role: "build", destination: "dest-menara-gardens", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 208 */ { role: "build", destination: "dest-paradise-valley", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 209 */ { role: "build", destination: "dest-dades-monkey-fingers", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 210 */ { role: "super", destination: "dest-bahia-palace", board: [4, 5], ...sq(12), careless: [0.08, 0.2], traps: [0, 4], chain: ANY },
  // ---- trip 15, Vietnam & Thailand (Art's places, docs/destinations-vietnam-thailand.md): 220 at 5x5, the finale 225 at 6x6
  /* 211 */ { role: "relief", destination: "dest-hoi-an-lanterns", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 212 */ { role: "build", destination: "dest-maeklong-railway-market", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 213 */ { role: "build", destination: "dest-erawan-falls", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 214 */ { role: "build", destination: "dest-ma-pi-leng", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 215 */ { role: "hard",  destination: "dest-phuket-old-town", board: [4, 5], ...sq(12), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 216 */ { role: "pace",  destination: "dest-fairy-stream", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 217 */ { role: "build", destination: "dest-damnoen-saduak", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 218 */ { role: "build", destination: "dest-cam-thanh-basket-boats", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 219 */ { role: "build", destination: "dest-ban-rak-thai", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 220 */ { role: "hard",  destination: "dest-sapa-terraces", board: [5, 5], ...sq(13), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 221 */ { role: "relief", destination: "dest-koh-panyee", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 222 */ { role: "build", destination: "dest-phong-nha-cave", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 223 */ { role: "build", destination: "dest-bo-sang-umbrellas", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 224 */ { role: "build", destination: "dest-maya-bay", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 225 */ { role: "super", destination: "dest-ha-long-bay", board: [6, 6], ...sq(19), careless: [0.08, 0.18], traps: [0, 4], chain: ANY },
  // ---- trip 16, Scandinavia & Iceland (Art's places, docs/destinations-scandinavia-iceland.md): 230 and the finale 240 at 5x5
  /* 226 */ { role: "relief", destination: "dest-nyhavn", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 227 */ { role: "build", destination: "dest-icelandic-horses", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 228 */ { role: "build", destination: "dest-reine-lofoten", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 229 */ { role: "build", destination: "dest-mons-klint", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 230 */ { role: "hard",  destination: "dest-preikestolen", board: [5, 5], ...sq(13), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 231 */ { role: "pace",  destination: "dest-skogafoss", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 232 */ { role: "build", destination: "dest-avesta-dala-horse", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 233 */ { role: "build", destination: "dest-kronborg", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 234 */ { role: "build", destination: "dest-diamond-beach", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 235 */ { role: "hard",  destination: "dest-visby", board: [4, 5], ...sq(12), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 236 */ { role: "relief", destination: "dest-atlantic-road", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 237 */ { role: "build", destination: "dest-dalarna-cottages", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 238 */ { role: "build", destination: "dest-iceland-puffins", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 239 */ { role: "build", destination: "dest-senja-segla", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 240 */ { role: "super", destination: "dest-kirkjufell", board: [5, 5], ...sq(14), careless: [0.08, 0.2], traps: [0, 4], chain: ANY },
  // ---- trip 17, Brazil (the creator, 2026-11-08; Art's places, docs/destinations-brazil.md; docs/difficulty-curve.md
  // "Trips 17-22 (plan)": trips 11-16's slots and targets): 250 at 5x5, the finale 255 at 6x6
  /* 241 */ { role: "relief", destination: "dest-sugarloaf", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 242 */ { role: "build", destination: "dest-paraty", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 243 */ { role: "build", destination: "dest-vila-velha-cup", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 244 */ { role: "build", destination: "dest-hercilio-luz-bridge", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 245 */ { role: "hard",  destination: "dest-bonito-rivers", board: [4, 5], ...sq(12), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 246 */ { role: "pace",  destination: "dest-pantanal-jaguar", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 247 */ { role: "build", destination: "dest-hyacinth-macaws", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 248 */ { role: "build", destination: "dest-lacerda-elevator", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 249 */ { role: "build", destination: "dest-bahia-cocoa-sloth", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 250 */ { role: "hard",  destination: "dest-pirangi-cashew", board: [5, 5], ...sq(13), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 251 */ { role: "relief", destination: "dest-canoa-quebrada-jangadas", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 252 */ { role: "build", destination: "dest-lencois-maranhenses", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 253 */ { role: "build", destination: "dest-ver-o-peso", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 254 */ { role: "build", destination: "dest-amazon-pink-dolphins", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 255 */ { role: "super", destination: "dest-theatro-amazonas", board: [6, 6], ...sq(19), careless: [0.08, 0.18], traps: [0, 4], chain: ANY },
  // ---- trip 18, Germany, Austria & Switzerland (Art's places, docs/destinations-germany-austria-switzerland.md):
  // 260 and 265 at 5x5, the finale 270 at 4x5
  /* 256 */ { role: "relief", destination: "dest-speicherstadt", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 257 */ { role: "build", destination: "dest-warnemunde-beach-chairs", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 258 */ { role: "build", destination: "dest-brandenburg-gate", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 259 */ { role: "build", destination: "dest-rakotz-bridge", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 260 */ { role: "hard",  destination: "dest-wuppertal-schwebebahn", board: [5, 5], ...sq(13), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 261 */ { role: "pace",  destination: "dest-pfalzgrafenstein", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 262 */ { role: "build", destination: "dest-rothenburg-plonlein", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 263 */ { role: "build", destination: "dest-st-bernard-dogs", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 264 */ { role: "build", destination: "dest-bern-bears", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 265 */ { role: "hard",  destination: "dest-chapel-bridge", board: [5, 5], ...sq(13), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 266 */ { role: "relief", destination: "dest-guarda", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 267 */ { role: "build", destination: "dest-golden-roof", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 268 */ { role: "build", destination: "dest-grossglockner-marmots", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 269 */ { role: "build", destination: "dest-gruner-see", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 270 */ { role: "super", destination: "dest-vienna-state-opera", board: [4, 5], ...sq(12), careless: [0.08, 0.2], traps: [0, 4], chain: ANY },
  // ---- trip 19, South Korea (Art's places, docs/destinations-south-korea.md): 275 at 5x5, the finale 285 at 6x6
  /* 271 */ { role: "relief", destination: "dest-gwanghwamun", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 272 */ { role: "build", destination: "dest-bukchon", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 273 */ { role: "build", destination: "dest-hwahongmun", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 274 */ { role: "build", destination: "dest-seocheon-reeds", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 275 */ { role: "hard",  destination: "dest-sunchang-onggi", board: [5, 5], ...sq(13), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 276 */ { role: "pace",  destination: "dest-suncheon-mudskippers", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 277 */ { role: "build", destination: "dest-sancheong-persimmons", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 278 */ { role: "build", destination: "dest-gamcheon", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 279 */ { role: "build", destination: "dest-cheomseongdae", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 280 */ { role: "hard",  destination: "dest-hahoe", board: [4, 5], ...sq(12), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 281 */ { role: "relief", destination: "dest-museom-log-bridge", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 282 */ { role: "build", destination: "dest-ulsanbawi", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 283 */ { role: "build", destination: "dest-anbandegi", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 284 */ { role: "build", destination: "dest-jeju-tangerines", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 285 */ { role: "super", destination: "dest-seongsan-ilchulbong", board: [6, 6], ...sq(19), careless: [0.08, 0.18], traps: [0, 4], chain: ANY },
  // ---- trip 20, Poland (Art's places, docs/destinations-poland.md): 295 and the finale 300 at 5x5
  /* 286 */ { role: "relief", destination: "dest-crooked-forest", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 287 */ { role: "build", destination: "dest-gdansk-crane", board: [4, 5], ...sq(10), careless: [0.55, 0.65], chain: ANY },
  /* 288 */ { role: "build", destination: "dest-malbork-castle", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 289 */ { role: "build", destination: "dest-elblag-canal", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 290 */ { role: "hard",  destination: "dest-ciechocinek-towers", board: [4, 5], ...sq(12), careless: [0.25, 0.35], traps: [0, 4], chain: ANY },
  /* 291 */ { role: "pace",  destination: "dest-biskupin", count: 12, alike: [], sizes: [2], cards: [24, 24], careless: [0.85, 1], chain: ANY },
  /* 292 */ { role: "build", destination: "dest-poznan-goats", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 293 */ { role: "build", destination: "dest-wroclaw-town-hall", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 294 */ { role: "build", destination: "dest-nikiszowiec", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 295 */ { role: "hard",  destination: "dest-lazienki-palace", board: [5, 5], ...sq(13), careless: [0.2, 0.3], traps: [0, 4], chain: ANY },
  /* 296 */ { role: "relief", destination: "dest-bialowieza-bison", board: [4, 5], ...sq(10), careless: [0.8, 1], chain: ANY },
  /* 297 */ { role: "build", destination: "dest-kazimierz-dolny", board: [4, 5], ...sq(11), careless: [0.5, 0.6], chain: ANY },
  /* 298 */ { role: "build", destination: "dest-zalipie", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 299 */ { role: "build", destination: "dest-zakopane-villas", board: [4, 5], ...sq(11), careless: [0.45, 0.55], chain: ANY },
  /* 300 */ { role: "super", destination: "dest-krakow-cloth-hall", board: [5, 5], ...sq(14), careless: [0.08, 0.2], traps: [0, 4], chain: ANY },
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
  // the creator's choices (2026-10-27): South Africa, and the UK and Ireland (New Zealand in reserve)
  { id: "t9", name: "South Africa", from: 121, to: 135 },
  { id: "t10", name: "UK & Ireland", from: 136, to: 150 },
  // the creator's choices (2026-11-07; the names exactly as the lead gave them: UI's translators' copy is made from them)
  { id: "t11", name: "East Coast America", from: 151, to: 165 },
  { id: "t12", name: "New Zealand", from: 166, to: 180 },
  { id: "t13", name: "Spain & Portugal", from: 181, to: 195 },
  { id: "t14", name: "Morocco", from: 196, to: 210 },
  { id: "t15", name: "Vietnam & Thailand", from: 211, to: 225 },
  { id: "t16", name: "Scandinavia & Iceland", from: 226, to: 240 },
  // the creator's choices (2026-11-08: "go ahead and do them all except russia"; the names exactly as the lead gave
  // them; t21 is "Türkiye", in English too), each added as its boards are dealt
  { id: "t17", name: "Brazil", from: 241, to: 255 },
  { id: "t18", name: "Germany, Austria & Switzerland", from: 256, to: 270 },
  { id: "t19", name: "South Korea", from: 271, to: 285 },
  { id: "t20", name: "Poland", from: 286, to: 300 },
];

/** Roles that may trap from the first move; every other board starts safe (check.mts). */
export const MAY_TRAP = new Set(["hard", "peak", "super"]);

/**
 * The mark players see on a board (creator, 2026-10-25: hard and super hard
 * boards are marked), by role: a board's top-level `mark` field, which the
 * game reads; none on any other board, nor on the
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
// boards 151 on (trips 11-16): no batch window, the whole library (TRIP_11_ON below)
PLAN.forEach((row, i) => Object.assign(row, i < 30 ? { newTo: "foxgloves" } : i < 60 ? { newFrom: "marigolds", newTo: "foxgloves" } : i < 90 ? { newFrom: "foxgloves", newTo: NEXT_BATCH } : i < 120 ? { newFrom: NEXT_BATCH, newThrough: LAST_BEFORE_T9 } : i < 150 ? { newAfter: LAST_BEFORE_T9 } : {}));
// HALF NEW on boards 121-150 (the creator, 2026-10-27): of each board's everyday pictures (all but the
// postcard) half, rounded down, come back from boards 1-60 (BACK: pictures-back.json, those that meet
// today's rules), exactly so many (oldLeast with oldMost); the rest, and the drop the postcard replaces,
// are new. The no-repeat rule (SPACING) holds among them as everywhere
const BACK_FILE = JSON.parse(readFileSync(new URL("./pictures-back.json", import.meta.url), "utf8"));
export const BACK = new Set(BACK_FILE.back.filter((id) => !(id in BACK_FILE.struck)));
export const SPARES = new Set(BACK_FILE.spares.filter((id) => !(id in BACK_FILE.struck)));
const ALSO = new Set([...BACK, ...SPARES]);
/**
 * The clear pictures the atmospheric swap took out of boards 1-150 and left on no board (atmospheric.json
 * `freed`, written by make-campaign.mts), and those a swap-in batch displaced (swap-ins.json, each batch's
 * `freed`, written by swap-in.mts: the pen-and-ink pictures, creator, 2026-10-29). Trips 11-15 take them
 * first with no list of their own: in the whole-library pool (TRIP_11_ON) a picture on no board costs least.
 */
const ATMOS_FILE = new URL("./atmospheric.json", import.meta.url);
const SWAP_INS_FILE = new URL("./swap-ins.json", import.meta.url);
export const FREED = new Set([
  ...(existsSync(ATMOS_FILE) ? JSON.parse(readFileSync(ATMOS_FILE, "utf8")).freed : []),
  ...(existsSync(SWAP_INS_FILE) ? Object.values(JSON.parse(readFileSync(SWAP_INS_FILE, "utf8")).batches).flatMap((b) => b.freed) : []),
]);
PLAN.forEach((row, i) => {
  if (i < 120 || i >= 150) return;
  const back = Math.floor((row.count - 1) / 2);
  Object.assign(row, { old: BACK, oldMost: back, oldLeast: back, also: ALSO });
});
/**
 * TRIP 11 ON (boards 151-240; the creator, 2026-11-07: "These levels will not feature new art, except for
 * the special ones required for the destination"; docs/difficulty-curve.md "Trips 11-16 (plan)"): every
 * everyday picture from the library as it stands, by today's rules, none back within SPACING boards, and
 * the one the player saw LONGEST AGO first (`longest`: lib.mts spacedCost), a picture on no board first of
 * all. The pool is every clear picture (lib.mts poolOn) but those the row takes none of (`old` with
 * oldMost 0, so pick.ts holds it):
 *   - the 2026-10-30 new library (Art's `batch`): made for the VIP events and on them (lead, 2026-11-07:
 *     "keep the 200 event pictures off trips 11-15"; they may join a later trip once their events have
 *     been out a while);
 *   - any look-alike of a postcard, of any trip (Art gives a postcard its look-alike's family; on boards
 *     151-240, of trips 1-16 only: TRIP_17_ON below);
 *   - those from before the clear pictures (CURRENT), those the people swap moved off (lib.mts MOVED_OFF),
 *     those waiting for a redraw (picture-redraws.json), and those Art struck by eye (pictures-back.json).
 * Calm before busy, firmly (`busyLean`: under longest-unseen-first the busy ones come due together late
 * on, a quarter of trips 13 and 14 in the trial).
 */
const REDRAWS_FILE = new URL("../../src/content/picture-redraws.json", import.meta.url);
const REDRAWING = existsSync(REDRAWS_FILE) ? Object.entries(JSON.parse(readFileSync(REDRAWS_FILE, "utf8")).pictures).filter(([, v]) => v.redraw).map(([id]) => id) : [];
const lookalikesOf = (ds) => {
  const families = new Map(ds.map((d) => [d.family ?? d.id, d.id]));
  return catalogue.filter((p) => families.has(p.family) && families.get(p.family) !== p.id).map((p) => p.id);
};
const NEVER_FROM_11 = [
  ...catalogue.filter((p) => p.batch === "2026-10-30 new library").map((p) => p.id),
  ...CURRENT,
  ...MOVED_OFF,
  ...REDRAWING,
  ...Object.keys(BACK_FILE.struck),
];
export const TRIP_11_ON = 150;
/**
 * TRIP 17 ON (boards 241-330; the creator, 2026-11-08; docs/difficulty-curve.md "Trips 17-22 (plan)"): trip 11's
 * rules, the 200 still off (lead, 2026-11-08: Grand Train Journey has not run). Boards 151-240 went to test
 * with the win checker before trips 17-22's postcards were painted, so they keep clear of trips 1-16's
 * postcards' look-alikes only (POSTCARDS_TO_16: the postcards on rows 1-240), and a later postcard never
 * changes them (route's outOf, the atmospheric pass, evenNew); boards 241 on keep clear of every postcard's.
 */
export const TRIP_17_ON = 240;
export const POSTCARDS_TO_16 = new Set(PLAN.slice(0, TRIP_17_ON).map((r) => r.destination).filter(Boolean));
export const NOT_ON_TRIP_11_ON = new Set([...NEVER_FROM_11, ...lookalikesOf(destinations.filter((d) => POSTCARDS_TO_16.has(d.id)))]);
export const NOT_ON_TRIP_17_ON = new Set([...NEVER_FROM_11, ...lookalikesOf(destinations)]);
/** The pool limit of board i (0-based) from trip 11 on, or null before it. */
export const notOnBoard = (i) => (i >= TRIP_17_ON ? NOT_ON_TRIP_17_ON : i >= TRIP_11_ON ? NOT_ON_TRIP_11_ON : null);
/**
 * THE NEVER-SEEN PICTURES SHARED EVENLY across trips 11-16 (lead, 2026-11-07): make-campaign.mts runs lib.mts
 * evenNew after the atmospheric pass, moving new pictures in place between the trips' boards. Not on trips
 * 17 on (lead, 2026-11-08: 14 never-seen pictures were left for them, kept where the picker puts them).
 */
export const EVEN_NEW = true;
export const EVEN_NEW_TO = TRIP_17_ON;
PLAN.forEach((row, i) => {
  if (i < TRIP_11_ON) return;
  Object.assign(row, { old: notOnBoard(i), oldMost: 0, longest: true, busyLean: 3 });
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
