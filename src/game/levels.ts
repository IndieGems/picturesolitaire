// The campaign's boards, as the board reads them. The data is the level-design
// member's: src/content/levels/campaign.json, made by tools/levels/ and
// re-proved by `node tools/levels/check.mts`. Each level is a deal
// (src/game/rules.ts), how many upcoming cards its stacks show, and a known
// winning line with no helpers, which the Hint helper follows while the player
// is on it. Other fields there (axes: how hard the board is, and why) are the
// level designer's notes: the board plays without them, and only the dev
// menu's board info shows them.
//
// The game never imports those files whole (the first-load trim, UI's,
// 2026-10-28): the build splits them (tools/content-split.mjs, virtual:ps-content),
// so each trip, each week of dailies and each other list (challenge, Souvenirs,
// the VIP events' levels, lessons, experiments) is a chunk of its own, fetched on the first ask, and a
// chunk has registered its boards' pictures (src/content.ts) by the time it
// resolves. The source files, the level tools and the server's checker are
// unchanged by it.

import { campaign, challenge, daily, eventLevels as eventLane, experiments as experimentLane, lessons as lessonLane, souvenirs as souvenirLane } from "virtual:ps-content";
import type { Deal, Move, Picture, Shuffle } from "./rules.ts";
import { dailyFor } from "./levels/daily.ts";

export interface Level {
  /** "c01" ... */
  id: string;
  /** 1-based place in the campaign. */
  number: number;
  /** How many upcoming cards each stack shows face up: 0, 1 or 2. */
  peek: 0 | 1 | 2;
  deal: Deal;
  /** A winning line from the deal, with no helpers. */
  line: Move[];
  /** The level designer's notes, as stored (the dev menu's board info), when there are any. */
  axes?: Record<string, unknown>;
  /**
   * The board's destination, when it has one (the travelogue): picture `id`
   * of the deal is a window cut from a postcard the size of the whole board
   * (the catalogue's entry for `id`), its top-left card at cell `crop` of
   * the board (col, row). The rules see an ordinary picture; finishing it
   * opens the postcard over the board (src/board/reveal.ts).
   */
  destination?: Destination;
  /**
   * The day's suitcase item, on a daily board (docs/daily-suitcase.md): picture
   * `id` of the deal, a 2×2, is that item's picture, and its id is the item's.
   * The rules see an ordinary picture; finishing it sends suitcase:item, with
   * no pause and no reveal.
   */
  item?: { id: string };
  /**
   * A lesson's staged board (lessonLevel): it opens stuck on purpose, so the
   * board says nothing of being stuck on it, and the screens play it as
   * practice (no claim, no Coins).
   */
  lesson?: LessonKind;
  /**
   * The Shuffle the board plays from the untouched opening, in place of the
   * rescue mix (a lesson's, stored so a change to the helper's tuning never
   * changes the lesson). `line` then wins from just after it.
   */
  shuffle?: Shuffle;
}

export interface Destination {
  id: string;
  crop: [number, number];
}

/** A board as the level files store it (any size: the board fits it to its box). */
export interface Stored {
  id: string;
  peek: number;
  cols: number;
  rows: number;
  seed: number;
  pictures: Picture[];
  stacks: number[][];
  line: number[][];
  axes?: Record<string, unknown>;
  destination?: { id: string; crop: number[] };
  item?: { id: string };
}

/** A stored board as the board plays it; `number` is its place in its list, from 1. */
export function toLevel(l: Stored, number: number): Level {
  return {
    id: l.id,
    number,
    peek: Math.max(0, Math.min(2, l.peek)) as 0 | 1 | 2,
    deal: { cols: l.cols, rows: l.rows, pictures: l.pictures, stacks: l.stacks, seed: l.seed },
    line: l.line.map(([from, to]) => ({ from: from!, to: to! })),
    ...(l.axes && typeof l.axes === "object" ? { axes: l.axes } : {}),
    ...(l.destination && typeof l.destination.id === "string" && l.destination.crop?.length === 2
      ? { destination: { id: l.destination.id, crop: [l.destination.crop[0]!, l.destination.crop[1]!] as [number, number] } }
      : {}),
    ...(l.item && typeof l.item.id === "string" ? { item: { id: l.item.id } } : {}),
  };
}

// ---------------------------------------------------------------- the campaign, a trip at a time
//
// The screens load a board's trip before they open it (loadLevel), and level(n)
// then answers at once. What home and the itinerary read without a deal (a
// board's id, trip, size, destination and mark) is the split's skeleton,
// campaign.boards, always here.

/** The campaign's boards so far, by place (from 0): each trip's fill in as it loads. */
const LEVELS: (Level | undefined)[] = new Array<Level | undefined>(campaign.count);

/** Board `n`'s place in the campaign, from 0; past the end, the campaign goes round again. */
function placeOf(n: number): number {
  const count = Math.max(1, campaign.count);
  return (((Math.floor(n) - 1) % count) + count) % count;
}

const tripLoads = new Map<string, Promise<Level[]>>();
/**
 * Trip `id`'s boards ("t1", src/content/levels/trips.json), in order, loaded
 * once and kept. Rejects when the trip cannot be loaded (an unknown id, or
 * offline), and the next ask tries again.
 */
export function loadTrip(id: string): Promise<Level[]> {
  let p = tripLoads.get(id);
  if (!p) {
    const load = campaign.trips[id];
    p = load
      ? load().then(({ levels, from }) =>
          (levels as unknown as Stored[]).map((l, k) => (LEVELS[from - 1 + k] ??= toLevel(l, from + k))),
        )
      : Promise.reject(new Error(`[levels] no trip "${id}"`));
    p.catch((err: unknown) => {
      console.warn(`[levels] trip ${id} did not load`, err);
      tripLoads.delete(id); // ask again next time
    });
    tripLoads.set(id, p);
  }
  return p;
}

/** Board `n` (from 1, going round past the end), its trip loaded first. Rejects as loadTrip does. */
export async function loadLevel(n: number): Promise<Level> {
  const i = placeOf(n);
  const have = LEVELS[i];
  if (have) return have;
  const trip = campaign.boards[i]?.trip;
  if (!trip) throw new Error(`[levels] no board ${i + 1}`);
  await loadTrip(trip);
  const l = LEVELS[i];
  if (!l) throw new Error(`[levels] board ${i + 1} is not in trip ${trip}`);
  return l;
}

// ---------------------------------------------------------------- challenge route and daily

/** A board with a par: the number of moves in the solver's best line. */
export type Challenge = Level & { par: number };
/** A date's daily board ("YYYY-MM-DD", the player's own date from the platform). */
export type Daily = Challenge & { date: string };

type StoredPar = Stored & { par: number };
/** A daily as stored: its date, and other fields (the level designer's notes) the board ignores. */
type StoredDaily = StoredPar & { date: string; [field: string]: unknown };

let challenges: Promise<Challenge[]> | null = null;
/**
 * The challenge route (src/content/levels/challenge.json), in unlock order.
 * Fetched apart from the boot, on the first ask, then kept; [] if it cannot
 * be loaded.
 */
export function loadChallenges(): Promise<Challenge[]> {
  challenges ??= challenge()
    .then((m) => (m.levels as unknown as StoredPar[]).map((l, i) => ({ ...toLevel(l, i + 1), par: l.par })))
    .catch((err: unknown) => {
      console.warn("[levels] the challenge route did not load", err);
      challenges = null; // ask again next time
      return [];
    });
  return challenges;
}

type DailyWeek = { levels: StoredDaily[]; start: number };
const weekLoads = new Map<string, Promise<DailyWeek>>();
/** UTC days since 1970 of a "YYYY-MM-DD" date (NaN for anything else). */
const dayOf = (d: string): number => Date.parse(`${d}T00:00:00Z`) / 86_400_000;
/** A date's week, by its Monday ("YYYY-MM-DD", UTC), as the split and Art's daily packs name it. */
function mondayOf(date: string): string | null {
  const t = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(t)) return null;
  const d = new Date(t);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
/**
 * The daily board for `date`, or null when the pool has none for it (before
 * its first day, after its last). Rejects when its week cannot be loaded
 * (offline), and the next ask tries again. Only that date's week of the pool (src/content/levels/daily.json)
 * is fetched, on the first ask, then kept. Which board is a date's is the
 * levels member's rule (dailyFor), which the server's win checker mirrors on
 * the whole pool: the week's answer counts only where it is the pool's too.
 */
export async function loadDaily(date: string): Promise<Daily | null> {
  const monday = mondayOf(date);
  const load = monday ? daily.weeks[monday] : undefined;
  if (!monday || !load || !daily.first) return null;
  let p = weekLoads.get(monday);
  if (!p) {
    p = load().then((m) => m as unknown as DailyWeek);
    p.catch((err: unknown) => {
      console.warn(`[levels] the dailies of the week of ${monday} did not load`, err);
      weekLoads.delete(monday); // ask again next time
    });
    weekLoads.set(monday, p);
  }
  const week = await p;
  const b = dailyFor(week, date);
  if (!b) return null;
  const at = week.start + week.levels.indexOf(b);
  // the whole pool's index for the date (dailyFor's rule): the same board, or none
  if (at !== dayOf(date) - dayOf(daily.first)) return null;
  return { ...toLevel(b, at + 1), par: b.par, date: b.date };
}

// ---------------------------------------------------------------- souvenirs

/** A Souvenir: a trip's optional themed bonus board (docs/souvenirs.md); `trip` is its trip's id ("t1"). */
export type Souvenir = Level & { trip: string };
type StoredSouvenir = Stored & { trip: string };

let souvenirs: Promise<Souvenir[]> | null = null;
/**
 * The Souvenir boards (src/content/levels/souvenirs.json, the levels member's:
 * ids s1..., one per trip whose pictures exist, so fewer than the trips at
 * first). Fetched apart from the boot, on the first ask, then kept; [] if it
 * cannot be loaded (asked again next time). Opened like any board
 * (openBoard(host, souvenir)); its pictures are the catalogue's
 * souvenirPictures, its table is the screens' to set, and board:won says its id.
 */
export function loadSouvenirs(): Promise<Souvenir[]> {
  souvenirs ??= souvenirLane()
    .then((m) =>
      (m.levels as unknown as StoredSouvenir[])
        .filter((l) => typeof l.trip === "string")
        .map((l, i) => ({ ...toLevel(l, i + 1), trip: l.trip })),
    )
    .catch((err: unknown) => {
      console.warn("[levels] the souvenir boards did not load", err);
      souvenirs = null; // ask again next time
      return [];
    });
  return souvenirs;
}

/** Trip `trip`'s Souvenir ("t1"), or null when it has none (yet) or they cannot be loaded. */
export async function loadSouvenir(trip: string): Promise<Souvenir | null> {
  return (await loadSouvenirs()).find((s) => s.trip === trip) ?? null;
}

// ---------------------------------------------------------------- the VIP events

/**
 * A level of a VIP event (docs/vip.md): each event is 30 levels of its own, ids "<event>-01" to
 * "-30" (Levels' src/content/levels/event-levels.json). `event` is its event's id
 * (src/content/levels/events.json), `number` its place in that event (1 to 30, play order), `item`
 * the suitcase item hidden in it on 10 of the 30 (the board sends suitcase:item when that picture is
 * finished, as on a daily), `par` the stored line's moves, `mark` a hard level's mark.
 */
export type EventLevel = Level & { event: string; par?: number; mark?: "hard" | "super" };
type StoredEventLevel = Stored & { event?: unknown; par?: unknown; mark?: unknown };

let eventLevels: Promise<EventLevel[]> | null = null;
/**
 * Every event's levels, in each event's play order (about 30 an event). Fetched apart from the
 * boot, on the first ask (an event page opening), then kept; the chunk registers their pictures and
 * their items' pictures as it loads. Rejects when it cannot be loaded (offline), and the next ask
 * tries again. Empty while Levels' file is not in the tree yet.
 */
export function loadEventLevels(): Promise<EventLevel[]> {
  eventLevels ??= eventLane().then((m) => {
    const at = new Map<string, number>();
    return (m.levels as unknown as StoredEventLevel[]).flatMap((l): EventLevel[] => {
      if (typeof l.event !== "string") return [];
      const n = (at.get(l.event) ?? 0) + 1;
      at.set(l.event, n);
      return [
        {
          ...toLevel(l, n),
          event: l.event,
          ...(typeof l.par === "number" ? { par: l.par } : {}),
          ...(l.mark === "hard" || l.mark === "super" ? { mark: l.mark } : {}),
        },
      ];
    });
  });
  eventLevels.catch((err: unknown) => {
    console.warn("[levels] the event levels did not load", err);
    eventLevels = null; // ask again next time
  });
  return eventLevels;
}

/** Event level `id` ("halloween-2026-13"), or null when there is no such level. Rejects as loadEventLevels does. */
export async function loadEventLevel(id: string): Promise<EventLevel | null> {
  return (await loadEventLevels()).find((l) => l.id === id) ?? null;
}

// ---------------------------------------------------------------- lessons

/** What a staged lesson board teaches. */
export type LessonKind = "shuffle";
/** A staged lesson board (src/content/levels/lessons.json, the levels member's). */
export type Lesson = Level & { lesson: LessonKind; name: string };
type StoredLesson = Stored & { lesson: string; name?: string; shuffle?: { board: number[]; stacks: number[][] } };

let lessons: Promise<Lesson[]> | null = null;
/**
 * The staged board that teaches `kind` (the Shuffle lesson, after board 3's
 * win card), or null when there is none or it cannot be loaded. Fetched apart
 * from the boot, on the first ask, then kept.
 */
export async function lessonLevel(kind: LessonKind): Promise<Lesson | null> {
  lessons ??= (async () => {
    const stored = (await lessonLane()).levels as unknown as StoredLesson[];
    return stored.map((l, i): Lesson => ({
      ...toLevel(l, i + 1),
      lesson: l.lesson as LessonKind,
      name: l.name ?? l.id,
      ...(l.shuffle ? { shuffle: { shuffle: true as const, board: [...l.shuffle.board], stacks: l.shuffle.stacks.map((st) => [...st]) } } : {}),
    }));
  })().catch((err: unknown) => {
    console.warn("[levels] the lessons did not load", err);
    lessons = null; // ask again next time
    return [];
  });
  return (await lessons).find((l) => l.lesson === kind) ?? null;
}

let experiments: Promise<Level[]> | null = null;
/** The dev menu's experiment boards (src/content/levels/experiments.json), in order; [] if they cannot be loaded. */
export function loadExperiments(): Promise<Level[]> {
  experiments ??= experimentLane()
    .then((m) => (m.levels as unknown as Stored[]).map((l, i) => toLevel(l, i + 1)))
    .catch((err: unknown) => {
      console.warn("[levels] the experiment boards did not load", err);
      experiments = null; // ask again next time
      return [];
    });
  return experiments;
}

/** How many boards the campaign has. */
export function levelCount(): number {
  return campaign.count;
}

/**
 * Board `n` (from 1; past the end, the campaign goes round again), once its
 * trip is loaded (loadLevel or loadTrip first); it throws for a board not
 * loaded yet.
 */
export function level(n: number): Level {
  const l = LEVELS[placeOf(n)];
  if (!l) throw new Error(`[levels] board ${placeOf(n) + 1} is not loaded yet: await loadLevel(${n}) first`);
  return l;
}
