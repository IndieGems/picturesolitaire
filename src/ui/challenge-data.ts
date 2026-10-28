// The challenge route's boards, as the screens read them: the level-design
// member's src/content/levels/challenge.json (ids ch01, ch02 ... in unlock
// order, each with its par: the fewest moves the solver found, which a sharp
// player can sometimes beat), loaded by the gameplay member's loadChallenges
// (src/game/levels.ts) as a chunk of its own on the first ask, so the first
// screen never carries it.
//
// Dev server only: ?challenges=demo plays campaign boards as stand-in
// challenges (par = their stored line), to check the route with other boards.
// The build drops it.

import { levelCount, loadChallenges as loadRoute, loadLevel, type Level } from "../game/levels";

export interface Challenge {
  /** "ch01" ... the save keys the player's best moves by it, and the win checker the board. */
  id: string;
  /** Its place on the route, from 1. */
  n: number;
  /** Par: the fewest moves the solver found (a player can sometimes beat it). */
  par: number;
  /** The board, as openBoard takes it. */
  level: Level;
}

const demoAsked = () => import.meta.env.DEV && new URLSearchParams(location.search).get("challenges") === "demo";

/** Are there challenge boards? They ship with the build (Levels' challenge.json), so Home offers the route. */
export function challengesExist(): boolean {
  return true;
}

async function demo(): Promise<Challenge[]> {
  const out: Challenge[] = [];
  for (let i = 1; i <= Math.min(20, levelCount()); i++) {
    const lvl = await loadLevel(i + 5);
    out.push({ id: `demo${i}`, n: i, par: lvl.line.length, level: { ...lvl, id: `demo${i}`, number: i } });
  }
  return out;
}

let loading: Promise<Challenge[]> | null = null;

/** Every challenge board, in unlock order; empty when they could not be fetched (asked again next time). */
export function loadChallenges(): Promise<Challenge[]> {
  loading ??= demoAsked()
    ? demo()
    : loadRoute().then((list) => {
        if (!list.length) loading = null;
        return list.map((c, i) => ({ id: c.id, n: i + 1, par: c.par, level: c }));
      });
  return loading;
}
