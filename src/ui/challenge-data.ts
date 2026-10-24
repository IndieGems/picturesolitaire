// The challenge route's boards, as the screens read them: the level-design
// member's src/content/levels/challenge.json (ids ch01, ch02 ... in unlock
// order, each with its par: the fewest moves the solver found, which a sharp
// player can sometimes beat). Fetched only
// when the route is first wanted, so the first screen never carries it.
//
// While the file does not exist there are no challenges, and home shows no
// Challenges button: nothing promises a screen that has nothing on it.
//
// Dev server only: ?challenges=demo plays campaign boards as stand-in
// challenges (par = their stored line), to check the route before the real
// boards land. The build drops it.

import { level, levelCount, toLevel, type Level, type Stored } from "../game/levels";

export interface Challenge {
  /** "ch01" ... the save keys the player's best moves by it. */
  id: string;
  /** Its place on the route, from 1. */
  n: number;
  /** Par: the fewest moves the solver found (a player can sometimes beat it). */
  par: number;
  /** The board, as openBoard takes it. */
  level: Level;
}

type File = { levels?: Array<Stored & { par?: number }> };
const files = import.meta.glob<File>("../content/levels/challenge.json", { import: "default" });

let loading: Promise<Challenge[]> | null = null;

const demoAsked = () => import.meta.env.DEV && new URLSearchParams(location.search).get("challenges") === "demo";

/** Are there challenge boards (the file is in the build)? Known without fetching it. */
export function challengesExist(): boolean {
  return demoAsked() || Object.keys(files).length > 0;
}

function demo(): Challenge[] {
  const out: Challenge[] = [];
  for (let i = 1; i <= Math.min(20, levelCount()); i++) {
    const lvl = level(i + 5);
    out.push({ id: `demo${i}`, n: i, par: lvl.line.length, level: { ...lvl, id: `demo${i}`, number: i } });
  }
  return out;
}

/** Every challenge board, in unlock order; empty when there are none (yet). */
export function loadChallenges(): Promise<Challenge[]> {
  loading ??= (async () => {
    if (demoAsked()) return demo();
    const load = Object.values(files)[0];
    if (!load) return [];
    try {
      const file = await load();
      return (file.levels ?? []).map((stored, i) => ({
        id: stored.id,
        n: i + 1,
        par: Math.max(1, Math.floor(stored.par ?? stored.line.length)),
        level: toLevel(stored, i + 1),
      }));
    } catch (err) {
      // a dropped fetch: no route this time, and the next call asks again
      console.warn("[challenges] could not load:", err);
      loading = null;
      return [];
    }
  })();
  return loading;
}
