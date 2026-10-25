// The challenge route's curve: one row per board, each axis on its own.
// tools/levels/make-challenge.mts turns it into src/content/levels/challenge.json.
//
// The route uses the deeper rules on purpose:
//   - BIG PICTURES NEED ROOM: the board opens full, so a big picture (6 or 9
//     cards) whose cards wait in the stacks can only come together once small
//     pictures are cleared to deal them in. `bigWait` is how many clears the
//     longest-waiting big picture needs first, on the best line there is.
//   - CLEAR ORDER MATTERS: `orderTraps` is how many times EVERY winning line
//     meets a ready picture that must not be finished yet (or not there);
//     `careless` (the chance a player who never plans ahead still wins) is low.
//   - PAR: each board stores the fewest-moves line the solver finds; its length
//     is the board's optional par.
// The boards grow from 4x5 to 4x6, 5x5 and 5x6, and demand and relief
// alternate (a relief board here is still harder than most of the campaign).
//
// Every stack shows card backs (peek 0, creator, 2026-10-25); peek is no part
// of a deal, so the boards kept their deals and lines when it went to 0.
//
// Columns as in campaign-plan.mts, plus:
//   board       cols x rows
//   bigWait     clears the longest-waiting big picture needs first
//   orderTraps  ready-picture traps every winning line meets
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

const ANY = 99;

export const PLAN = [
  /*  1 */ { role: "intro",  board: [4, 5], count: 6,  alike: [],        sizes: [2, 4, 6, 9], cards: [31, 33], must: ["3x3"],        peek: 0, chain: [2, 4], careless: [0.3, 0.75],  bigWait: [2, ANY], orderTraps: [1, ANY] },
  /*  2 */ { role: "demand", board: [4, 5], count: 6,  alike: [2],       sizes: [4, 6],       cards: [30, 32],                       peek: 0, chain: [3, 4], careless: [0.15, 0.55], bigWait: [2, ANY], orderTraps: [1, ANY] },
  /*  3 */ { role: "relief", board: [4, 5], count: 6,  alike: [2],       sizes: [2, 4, 6],    cards: [28, 30],                       peek: 0, chain: [2, 3], careless: [0.4, 0.8],   bigWait: [2, ANY], orderTraps: [1, ANY] },
  /*  4 */ { role: "demand", board: [4, 5], count: 6,  alike: [3],       sizes: [2, 4, 6, 9], cards: [32, 34], must: ["3x3"],        peek: 0, chain: [3, 5], careless: [0.1, 0.45],  bigWait: [3, ANY], orderTraps: [1, ANY] },
  /*  5 */ { role: "demand", board: [4, 5], count: 7,  alike: [3, 2],    sizes: [2, 4, 6, 9], cards: [33, 36],                       peek: 0, chain: [4, 5], careless: [0.05, 0.35], bigWait: [3, ANY], orderTraps: [2, ANY] },
  /*  6 */ { role: "relief", board: [4, 6], count: 7,  alike: [2],       sizes: [2, 4, 6],    cards: [36, 38],                       peek: 0, chain: [2, 4], careless: [0.4, 0.8],   bigWait: [2, ANY], orderTraps: [1, ANY] },
  /*  7 */ { role: "demand", board: [4, 6], count: 7,  alike: [2, 2],    sizes: [4, 6, 9],    cards: [38, 40], must: ["3x3"],        peek: 0, chain: [3, 4], careless: [0.15, 0.5], bigWait: [3, ANY], orderTraps: [1, ANY] },
  /*  8 */ { role: "demand", board: [4, 6], count: 8,  alike: [3],       sizes: [2, 4, 6, 9], cards: [40, 42],                       peek: 0, chain: [4, 5], careless: [0.1, 0.4],   bigWait: [3, ANY], orderTraps: [2, ANY] },
  /*  9 */ { role: "relief", board: [4, 6], count: 7,  alike: [2],       sizes: [2, 4, 6],    cards: [34, 36],                       peek: 0, chain: [3, 3], careless: [0.35, 0.75], bigWait: [2, ANY], orderTraps: [1, ANY] },
  /* 10 */ { role: "demand", board: [4, 6], count: 8,  alike: [4, 2],    sizes: [2, 4, 6, 9], cards: [41, 44], must: ["3x3"],        peek: 0, chain: [4, 6], careless: [0.03, 0.3],  bigWait: [3, ANY], orderTraps: [2, ANY] },
  /* 11 */ { role: "relief", board: [5, 5], count: 7,  alike: [2],       sizes: [2, 4, 6],    cards: [34, 37],                       peek: 0, chain: [2, 3], careless: [0.4, 0.8],   bigWait: [2, ANY], orderTraps: [1, ANY] },
  /* 12 */ { role: "demand", board: [5, 5], count: 8,  alike: [3],       sizes: [4, 6, 9],    cards: [40, 43], must: ["3x3", "3x3"], most: { 9: 2 }, peek: 0, chain: [3, 4], careless: [0.1, 0.5], bigWait: [2, ANY], orderTraps: [1, ANY] },
  /* 13 */ { role: "demand", board: [5, 5], count: 9,  alike: [3, 2],    sizes: [2, 4, 6, 9], cards: [42, 45],                       peek: 0, chain: [4, 5], careless: [0.05, 0.35], bigWait: [3, ANY], orderTraps: [2, ANY] },
  /* 14 */ { role: "relief", board: [5, 5], count: 8,  alike: [2, 2],    sizes: [2, 4, 6],    cards: [38, 40],                       peek: 0, chain: [3, 3], careless: [0.3, 0.7],   bigWait: [2, ANY], orderTraps: [1, ANY] },
  /* 15 */ { role: "demand", board: [5, 5], count: 9,  alike: [4, 2],    sizes: [2, 4, 6, 9], cards: [44, 47], must: ["3x3"],        peek: 0, chain: [4, 6], careless: [0.03, 0.3],  bigWait: [3, ANY], orderTraps: [2, ANY] },
  /* 16 */ { role: "relief", board: [5, 6], count: 9,  alike: [2, 2],    sizes: [2, 4, 6],    cards: [42, 45],                       peek: 0, chain: [3, 3], careless: [0.3, 0.7],   bigWait: [2, ANY], orderTraps: [1, ANY] },
  /* 17 */ { role: "demand", board: [5, 6], count: 10, alike: [3, 2],    sizes: [2, 4, 6, 9], cards: [46, 49], must: ["3x3"],        peek: 0, chain: [4, 5], careless: [0.1, 0.4],   bigWait: [3, ANY], orderTraps: [2, ANY] },
  /* 18 */ { role: "demand", board: [5, 6], count: 10, alike: [4, 3],    sizes: [2, 4, 6, 9], cards: [47, 50],                       peek: 0, chain: [4, 6], careless: [0.05, 0.3],  bigWait: [3, ANY], orderTraps: [2, ANY] },
  /* 19 */ { role: "relief", board: [5, 6], count: 9,  alike: [3, 2],    sizes: [2, 4, 6],    cards: [44, 46],                       peek: 0, chain: [3, 4], careless: [0.25, 0.6],  bigWait: [2, ANY], orderTraps: [1, ANY] },
  /* 20 */ { role: "finale", board: [5, 6], count: 11, alike: [4, 3, 2], sizes: [2, 4, 6, 9], cards: [50, 54], must: ["3x3", "3x3"], most: { 9: 2 }, peek: 0, chain: [5, 7], careless: [0.02, 0.25], bigWait: [4, ANY], orderTraps: [2, ANY] },
];
