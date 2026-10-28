// The campaign's trips (the travelogue, the creator 2026-10-25): about fifteen boards
// each ("Travel America", boards 1-15), every board one real place, and finishing a
// trip's last board stamps the passport (passport.ts). Which boards make a trip is the
// level designer's: src/content/levels/trips.json, `from` and `to` as players count
// boards (1-based, both ends in), the last trip possibly running past the boards that
// exist yet. A board's place is its level data's `destination`, drawn from Art's
// catalogue (catalogue.ts, destination()).
//
// The boards themselves load a trip at a time (Gameplay's loadTrip; the first-load trim,
// 2026-10-28), so a place is read from the campaign's skeleton (tools/content-split.mjs:
// each board's id, size and destination id, always here), and its postcard once the trip's
// chunk has brought it: until then a place's `dest` is null and `coming` is true, and the
// screens call loadTripOf and draw again.
//
// Nothing here is saved: a place is unlocked when its board is won, and a trip is
// stamped when its last board is won, both read from the server's record of the
// player's progress (src/net/progress.ts: the boards before the campaign's next).
//
// A trip's name is the player's to read: "trip.<id>" in a locale when it has one, else
// the file's English.

import TRIPS from "../content/levels/trips.json";
import { campaign } from "virtual:ps-content";
import { levelCount, loadTrip } from "../game/levels";
import { progress } from "../net/progress";
import { destination, type Destination } from "./catalogue";
import { t } from "./i18n";

export interface Trip {
  id: string;
  name: string;
  /** Its first and last board, as players count them. */
  from: number;
  to: number;
}

export const trips: readonly Trip[] = (TRIPS.trips as Trip[]).filter((tr) => tr.to >= tr.from).sort((a, b) => a.from - b.from);

export function tripName(tr: Trip): string {
  const said = t(`trip.${tr.id}`);
  return said === `trip.${tr.id}` ? tr.name : said;
}

/**
 * A trip's place, for a sentence or a short label: "Board 8 · America", "on your America trip"
 * (QA, 0.41.0: "Travel America" read oddly there). "tripPlace.<id>" in a locale where the trip's
 * name is a title rather than a place, else its name. The passport's page and home's itinerary
 * keep the name, as a title.
 */
export function tripPlace(tr: Trip): string {
  const said = t(`tripPlace.${tr.id}`);
  return said === `tripPlace.${tr.id}` ? tripName(tr) : said;
}

export function tripById(id: string): Trip | undefined {
  return trips.find((tr) => tr.id === id);
}

/** The trip board `n` belongs to. */
export function tripOf(n: number): Trip | undefined {
  return trips.find((tr) => n >= tr.from && n <= tr.to);
}

/** The trip whose last board is `n`: winning it the first time stamps that trip. */
export function tripEndingAt(n: number): Trip | undefined {
  return trips.find((tr) => tr.to === n);
}

/** The last board won so far (0: none); "all done" sits one past the last board. */
const lastWon = (): number => Math.min(progress().campaign.next - 1, levelCount());

/** One place of a trip: its board, whether that board exists yet and is won, and its destination. */
export interface Place {
  board: number;
  /** Its board's id ("c07"): where its pictures' packs are found (src/packs.ts), when it exists. */
  id: string | null;
  exists: boolean;
  won: boolean;
  /** Its postcard, or null while the board names none or Art has not made it, or its trip has not loaded. */
  dest: Destination | null;
  /** It has a postcard that comes with its trip's chunk, not loaded yet (loadTripOf, then draw again). */
  coming: boolean;
  /** The postcard's size in cards (the board's): 4 x 4, or 4 x 5 for a tall board. */
  cols: number;
  rows: number;
}

export function placesOf(tr: Trip): Place[] {
  const won = lastWon();
  const out: Place[] = [];
  for (let n = tr.from; n <= tr.to; n++) {
    const exists = n <= levelCount();
    const b = exists ? campaign.boards[n - 1] : undefined;
    const dest = (b?.destination && destination(b.destination)) || null;
    out.push({ board: n, id: b?.id ?? null, exists, won: exists && n <= won, dest, coming: !!b?.destination && !dest, cols: dest?.cols ?? b?.cols ?? 4, rows: dest?.rows ?? b?.rows ?? 4 });
  }
  return out;
}

const tripLoads = new Map<string, Promise<boolean>>();
/**
 * Load trip `tr`'s boards and postcards (once; again after a failure). Resolves true when they
 * came now (the caller draws again), false when there was nothing to wait for or they would not load.
 */
export function loadTripOf(tr: Trip): Promise<boolean> {
  if (!placesOf(tr).some((p) => p.coming)) return Promise.resolve(false);
  let job = tripLoads.get(tr.id);
  if (!job) {
    job = loadTrip(tr.id).then(
      () => true,
      () => {
        tripLoads.delete(tr.id); // the next draw asks again
        return false;
      },
    );
    tripLoads.set(tr.id, job);
  }
  return job;
}

/** How many of a trip's places are won, of how many. */
export function tripCount(tr: Trip): { done: number; all: number } {
  return { done: Math.max(0, Math.min(lastWon(), tr.to) - tr.from + 1), all: tr.to - tr.from + 1 };
}

/** Every board of the trip won: its stamp is in the passport. */
export function tripDone(tr: Trip): boolean {
  return tr.to <= levelCount() && lastWon() >= tr.to;
}

/** The trip the player is on: the next board's, else (every board won) the last one with boards. */
export function currentTrip(): Trip | undefined {
  const next = progress().campaign.next;
  return tripOf(Math.min(next, levelCount())) ?? trips[trips.length - 1];
}
