// The relaxed campaign's curve: one row per board, each axis on its own.
// tools/levels/make-campaign.mts turns it into src/content/levels/campaign.json.
//
// Demand and relief alternate: a board that asks more (more cards waiting, a
// longer chain of clears, more lookalikes, fewer upcoming cards shown) is
// followed by an easier one. Early boards mix families and show 1-2 upcoming
// cards; later ones hold more lookalikes and show fewer. The first big 3x3
// picture comes at board 10, the first board with hidden stacks at 18.
//
// Columns:
//   role      intro | build | demand | relief (for the reader; nothing reads it)
//   count     pictures on the board
//   alike     lookalike family groups ([3, 2]: a triple and a pair)
//   sizes     cards a picture may have (2, 4, 6, 9): pieces per picture
//   cards     total cards, all pictures: 20 fill the board, the rest wait in the stacks
//   must      shapes that must be on the board
//   most      at most so many pictures of a size, by cards (default: one 3x3)
//   peek      upcoming cards each stack shows (0, 1 or 2)
//   chain     the chain of dependent clears (src/game/solver/metrics.ts)
//   careless  the careless player's chance of winning
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

export const BOARD = { cols: 4, rows: 5 };

export const PLAN = [
  /*  1 */ { role: "intro",  count: 3, alike: [],        sizes: [4],          cards: [12, 12], peek: 2, chain: [1, 1], careless: [1, 1] },
  /*  2 */ { role: "intro",  count: 4, alike: [],        sizes: [2, 4, 6],    cards: [18, 20], peek: 2, chain: [1, 1], careless: [1, 1], most: { 6: 2 } },
  /*  3 */ { role: "build",  count: 5, alike: [],        sizes: [2, 4, 6],    cards: [22, 24], peek: 2, chain: [2, 2], careless: [0.95, 1] },
  /*  4 */ { role: "build",  count: 5, alike: [],        sizes: [4, 6],       cards: [24, 26], peek: 2, chain: [2, 2], careless: [0.9, 1] },
  /*  5 */ { role: "relief", count: 4, alike: [2],       sizes: [2, 4, 6],    cards: [20, 22], peek: 2, chain: [1, 2], careless: [1, 1] },
  /*  6 */ { role: "build",  count: 6, alike: [2],       sizes: [2, 4, 6],    cards: [26, 28], peek: 2, chain: [2, 3], careless: [0.85, 1] },
  /*  7 */ { role: "demand", count: 6, alike: [2],       sizes: [4, 6],       cards: [28, 30], peek: 1, chain: [3, 3], careless: [0.75, 0.95] },
  /*  8 */ { role: "relief", count: 5, alike: [],        sizes: [2, 4, 6],    cards: [22, 24], peek: 2, chain: [2, 2], careless: [0.95, 1] },
  /*  9 */ { role: "build",  count: 7, alike: [2, 2],    sizes: [2, 4],       cards: [24, 26], peek: 1, chain: [2, 3], careless: [0.85, 1] },
  /* 10 */ { role: "demand", count: 5, alike: [2],       sizes: [4, 6, 9],    cards: [28, 30], peek: 1, chain: [3, 3], careless: [0.7, 0.95], must: ["3x3"] },
  /* 11 */ { role: "relief", count: 5, alike: [2],       sizes: [2, 4, 6],    cards: [22, 24], peek: 2, chain: [2, 2], careless: [0.9, 1] },
  /* 12 */ { role: "build",  count: 7, alike: [3],       sizes: [2, 4, 6, 9], cards: [28, 30], peek: 1, chain: [3, 3], careless: [0.7, 0.95] },
  /* 13 */ { role: "demand", count: 7, alike: [2, 2],    sizes: [2, 4, 6, 9], cards: [30, 32], peek: 1, chain: [3, 4], careless: [0.6, 0.9] },
  /* 14 */ { role: "relief", count: 6, alike: [2],       sizes: [2, 4],       cards: [22, 24], peek: 2, chain: [2, 2], careless: [0.9, 1] },
  /* 15 */ { role: "demand", count: 6, alike: [3],       sizes: [4, 6, 9],    cards: [31, 33], peek: 1, chain: [4, 4], careless: [0.55, 0.85], must: ["3x3"] },
  /* 16 */ { role: "relief", count: 6, alike: [2, 2],    sizes: [2, 4, 6],    cards: [24, 26], peek: 1, chain: [2, 3], careless: [0.85, 1] },
  /* 17 */ { role: "build",  count: 7, alike: [3, 2],    sizes: [2, 4, 6, 9], cards: [30, 32], peek: 1, chain: [3, 4], careless: [0.6, 0.9] },
  /* 18 */ { role: "demand", count: 7, alike: [3],       sizes: [2, 4, 6, 9], cards: [30, 32], peek: 0, chain: [3, 4], careless: [0.6, 0.9] },
  /* 19 */ { role: "relief", count: 6, alike: [2],       sizes: [2, 4, 6],    cards: [24, 26], peek: 1, chain: [2, 3], careless: [0.85, 1] },
  /* 20 */ { role: "demand", count: 8, alike: [3, 2],    sizes: [2, 4, 6, 9], cards: [32, 34], peek: 1, chain: [4, 4], careless: [0.5, 0.8] },
  /* 21 */ { role: "build",  count: 6, alike: [4],       sizes: [4, 6, 9],    cards: [30, 32], peek: 1, chain: [3, 4], careless: [0.6, 0.9] },
  /* 22 */ { role: "relief", count: 7, alike: [2, 2],    sizes: [2, 4],       cards: [24, 26], peek: 2, chain: [2, 2], careless: [0.9, 1] },
  /* 23 */ { role: "demand", count: 7, alike: [4, 2],    sizes: [2, 4, 6, 9], cards: [32, 34], peek: 0, chain: [4, 5], careless: [0.45, 0.75], must: ["3x3"] },
  /* 24 */ { role: "build",  count: 7, alike: [3],       sizes: [2, 4, 6, 9], cards: [28, 30], peek: 1, chain: [3, 3], careless: [0.7, 0.95] },
  /* 25 */ { role: "demand", count: 8, alike: [4, 3],    sizes: [2, 4, 6, 9], cards: [32, 35], peek: 0, chain: [4, 5], careless: [0.4, 0.7] },
  /* 26 */ { role: "relief", count: 6, alike: [3],       sizes: [2, 4, 6],    cards: [24, 26], peek: 1, chain: [2, 3], careless: [0.85, 1] },
  /* 27 */ { role: "demand", count: 8, alike: [4, 2, 2], sizes: [2, 4, 6, 9], cards: [33, 35], peek: 0, chain: [4, 5], careless: [0.4, 0.7] },
  /* 28 */ { role: "build",  count: 6, alike: [4, 2],    sizes: [4, 6, 9],    cards: [30, 32], peek: 1, chain: [4, 4], careless: [0.5, 0.85] },
  /* 29 */ { role: "relief", count: 6, alike: [3, 3],    sizes: [2, 4, 6],    cards: [26, 28], peek: 1, chain: [2, 3], careless: [0.8, 1] },
  /* 30 */ { role: "finale", count: 8, alike: [4, 3],    sizes: [2, 4, 6, 9], cards: [34, 37], peek: 0, chain: [5, 5], careless: [0.35, 0.65], must: ["3x3"] },
];
