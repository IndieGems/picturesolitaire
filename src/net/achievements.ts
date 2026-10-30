// THE PLATFORM ACHIEVEMENTS, as the game hears of them (the creator, 2026-10-30; docs/achievements.md).
// The list is src/net/achievements.json: each achievement's id (fixed for good), its counter, its
// threshold and points; tools/server/make-config.mts writes the game config from it. Only the win
// checker moves a counter (functions/checker/src/count.rs, from the player's verified progress) and
// only the platform unlocks one, on release only: nothing here writes anything.
//
// HOW THE GAME LEARNS ONE UNLOCKED, for the unlock card (UI's): onUnlock(fn) hears each achievement
// unlocked, once a session, from either of:
//   - THE VERDICT: the checker's answer to a win lists what its order unlocked (`achievements` on
//     the verdict, src/net/claims.ts), earlier wins' catch-ups included. Heard at once.
//   - THE COMPARE (the SDK's achievements.md §5), for a list that never arrived (an answer lost, the
//     claim sent again, whose order unlocks nothing new): the progress record carries the counters
//     (`counts`, src/net/progress.ts). When a record from the checker moves a counter past an
//     achievement's threshold and the verdict did not list it, that counter's progression is read
//     once (gem.me.progressions.get), and an achievement it shows unlocked is heard. One read per
//     counter that crossed a threshold, never asked again, nothing while the platform asked for a
//     wait (src/net/pace.ts). Crossings happen a couple of dozen times in the whole game.
// On dev and test nothing ever unlocks (the platform answers "suppressed"), so nothing is heard there;
// the compare's read still happens at each crossing.
//
// THE STANDING, for the Passport's Achievements page (UI's): readStanding() says which achievements
// the player holds. Call it when the page opens, never on a timer: one read of each counter's
// progression, in turn, one round at a time, from the SDK's cache unless an unlock was heard since
// the last round (then the cache is dropped first), nothing while the platform asked for a wait
// (src/net/pace.ts). A counter the player never moved holds nothing (locked, and known); a counter
// whose read said nothing (achievementsUnavailable, no answer, or a wait) is `unknown`, and its rows
// must show no locked state. An achievement heard this session counts as held whatever a read says.
// onStanding(fn) hears each new standing: a round landing, or an unlock heard.

import { gem } from "../gem";
import DATA from "./achievements.json";
import { onVerdict } from "./claims";
import { refusalOf } from "./no-answer";
import { heard, held } from "./pace";
import { onProgress, serverCounts } from "./progress";

export interface Achievement {
  /** Its slug, the key of its words in the locales: achievement.<slug>.name / .desc (a stamp's are achievement.stamped.*, with {{trip}}). */
  slug: string;
  /** The platform's id for it, fixed for good. */
  id: string;
  /** The counter progression it sits on (its slug, as gem.me.progressions.get takes it). */
  counter: string;
  /** The counter's value that unlocks it. */
  at: number;
  /** The achievement points it awards. */
  points: number;
  /** It awards an Arcade avatar icon (the game item `icon`, once Art's is uploaded). */
  awardsIcon: boolean;
  icon?: string;
  /** A stamp's trip (trips.json id, names-<lang>.json trip.<id>). */
  trip?: string;
}

interface Source {
  slug: string;
  id?: string;
  achievements: { slug: string; id?: string; at: number; points: number; awardsIcon?: boolean; icon?: string; trip?: string }[];
}

/** Every achievement, in the list's order (group by group, each group by threshold). */
export const ACHIEVEMENTS: readonly Achievement[] = (DATA.counters as Source[]).flatMap((c) =>
  c.achievements.map((a) => ({
    slug: a.slug,
    id: a.id ?? "",
    counter: c.slug,
    at: a.at,
    points: a.points,
    awardsIcon: a.awardsIcon === true,
    ...(a.icon ? { icon: a.icon } : {}),
    ...(a.trip ? { trip: a.trip } : {}),
  })),
);
/** The counter progressions that carry achievements, by slug. */
export const COUNTERS: readonly string[] = (DATA.counters as Source[]).map((c) => c.slug);

export const achievementById = (id: string): Achievement | undefined => ACHIEVEMENTS.find((a) => a.id === id);

/** A counter's value in the server's record (0 for a new player); null before the record is known, or on a record from before the counters (the next verified win sets them). */
export const counterValue = (counter: string): number | null => serverCounts()?.[counter] ?? null;

export interface Unlock {
  achievement: Achievement;
  /** The points it credited (the platform's word when the verdict said, else the list's). */
  points: number;
}

const listeners = new Set<(u: Unlock) => void>();
/** Heard this session, with the points credited: none is heard twice. */
const heardIds = new Map<string, number>();
/** Thresholds a record crossed that no verdict has listed yet, by achievement id. */
const crossed = new Set<string>();
/** The counters as last seen in a record; null until one with counters is seen. */
let last: Record<string, number> | null = null;
let comparing = false;
let timer: number | undefined;
let started = false;

function tell(a: Achievement, points: number): void {
  crossed.delete(a.id);
  if (heardIds.has(a.id)) return;
  heardIds.set(a.id, points);
  heardSinceRound = true;
  for (const fn of [...listeners]) {
    try {
      fn({ achievement: a, points });
    } catch (err) {
      console.warn("[achievements] a listener failed:", err);
    }
  }
  if (standing) setStanding({ unlocked: new Map([...standing.unlocked, [a.id, points]]), unknown: standing.unknown });
}

/** A record landed or was replaced: note any threshold its counters crossed since the last. */
function moved(): void {
  const now = serverCounts();
  if (!now) return; // not known yet, or a record from before the counters: no baseline to compare with
  if (last) {
    for (const a of ACHIEVEMENTS) {
      if ((last[a.counter] ?? 0) < a.at && a.at <= (now[a.counter] ?? 0) && !heardIds.has(a.id)) crossed.add(a.id);
    }
  }
  last = { ...now };
  // the verdict that carried this record is heard just after (claims.ts settles both at once),
  // so the compare waits a moment for its list
  if (crossed.size && timer === undefined) timer = window.setTimeout(compare, 1000);
}

/** Read each counter with a threshold crossed and not listed, once, and tell what it shows unlocked. */
async function compare(): Promise<void> {
  timer = undefined;
  if (comparing || !crossed.size) return;
  const wait = held();
  if (wait > 0) {
    timer = window.setTimeout(compare, wait);
    return;
  }
  comparing = true;
  const todo = ACHIEVEMENTS.filter((a) => crossed.has(a.id));
  for (const a of todo) crossed.delete(a.id);
  try {
    gem.me.inventory.refresh(); // the unlock happened on the server: the SDK's cache cannot know it
    for (const counter of new Set(todo.map((a) => a.counter))) {
      try {
        const p = await gem.me.progressions.get(counter);
        if (!p || p.achievementsUnavailable) continue; // says nothing: a missed card loses nothing else
        for (const a of todo.filter((x) => x.counter === counter)) {
          const s = p.achievements?.find((x) => x.id === a.id);
          if (s && s.unlockedAt !== undefined && !s.revoked) tell(a, s.points);
        }
      } catch (err) {
        heard(err);
        console.warn(`[achievements] ${counter} could not be read: ${refusalOf(err)}`);
      }
    }
  } finally {
    comparing = false;
  }
}

function start(): void {
  if (started) return;
  started = true;
  onProgress(moved);
  moved();
  onVerdict((v) => {
    if (v.status !== "paid" && v.status !== "kept" && v.status !== "late") return;
    for (const u of v.achievements ?? []) {
      const a = achievementById(u.id);
      if (a) tell(a, u.points || a.points);
      else console.warn(`[achievements] the checker unlocked ${u.id}, which src/net/achievements.json does not list`);
    }
  });
}

/** Hear each achievement unlocked this session, once (for the unlock card). Returns the unsubscribe. */
export function onUnlock(fn: (u: Unlock) => void): () => void {
  start();
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

// ---------------------------------------------------------------- the standing (the Achievements page)

export interface Standing {
  /** Each achievement held (and not revoked), by id: the points it credited. */
  unlocked: ReadonlyMap<string, number>;
  /** Counters (by slug) whose read said nothing just now: show their rows neither locked nor unlocked. */
  unknown: ReadonlySet<string>;
}

/** Framed by the platform: another origin's frame (as src/net/helpers.ts). The play-test tool's same-origin frame has no platform behind it. */
const framed = ((): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true;
  }
})();
let standing: Standing | null = null;
let reading: Promise<Standing> | null = null;
/** An unlock was heard since the last round began, so the SDK's cached progressions predate it. */
let heardSinceRound = false;
let dropCache = false;
const standingListeners = new Set<(s: Standing) => void>();

function setStanding(s: Standing): void {
  standing = s;
  for (const fn of [...standingListeners]) {
    try {
      fn(s);
    } catch (err) {
      console.warn("[achievements] a standing listener failed:", err);
    }
  }
}

async function round(): Promise<Standing> {
  const unlocked = new Map<string, number>();
  const unknown = new Set<string>();
  if (!framed) {
    for (const c of COUNTERS) unknown.add(c); // no platform to ask
  } else {
    if (dropCache) gem.me.inventory.refresh(); // an unlock was heard since: the cache predates it
    dropCache = false;
    for (const counter of COUNTERS) {
      if (held() > 0) {
        unknown.add(counter); // the platform asked for a wait: ask nothing more this round
        continue;
      }
      try {
        const p = await gem.me.progressions.get(counter);
        if (!p) continue; // never written: nothing held on it, and that is known
        if (p.achievementsUnavailable) {
          unknown.add(counter);
          continue;
        }
        for (const a of p.achievements ?? []) if (a.unlockedAt !== undefined && !a.revoked) unlocked.set(a.id, a.points);
      } catch (err) {
        heard(err);
        unknown.add(counter);
        console.warn(`[achievements] ${counter} could not be read: ${refusalOf(err)}`);
      }
    }
  }
  // heard this session: held, whatever a read (perhaps from before it) says
  for (const [id, points] of heardIds) unlocked.set(id, points);
  return { unlocked, unknown };
}

/**
 * What the player holds, for the Achievements page: call when it opens, never on a timer. One
 * round at a time (a call during one shares it); each counter read in turn through the SDK's cache.
 */
export function readStanding(): Promise<Standing> {
  start();
  if (reading) return reading;
  if (heardSinceRound) dropCache = true;
  heardSinceRound = false;
  reading = round()
    .then((s) => {
      setStanding(s);
      return s;
    })
    .finally(() => {
      reading = null;
    });
  return reading;
}

/** The last standing read (with every unlock heard since), or null before the first round. */
export const lastStanding = (): Standing | null => standing;

/** Hear each new standing: a round landing, or an unlock heard after one. Returns the unsubscribe. */
export function onStanding(fn: (s: Standing) => void): () => void {
  start();
  standingListeners.add(fn);
  return () => void standingListeners.delete(fn);
}
