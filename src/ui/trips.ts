// The campaign's trips (the travelogue, the creator 2026-10-25): about fifteen boards
// each ("Travel America", boards 1-15), every board one real place, and finishing a
// trip's last board stamps the passport (passport.ts). Which boards make a trip is the
// level designer's: src/content/levels/trips.json, `from` and `to` as players count
// boards (1-based, both ends in), the last trip possibly running past the boards that
// exist yet. A board's place is its level data's `destination`, drawn from Art's
// catalogue (catalogue.ts, destination()).
//
// Nothing here is saved: a place is unlocked when its board is won, and a trip is
// stamped when its last board is won, both read from the server's record of the
// player's progress (src/net/progress.ts: the boards before the campaign's next).
//
// A trip's name is the player's to read: "trip.<id>" in a locale when it has one, else
// the file's English.

import TRIPS from "../content/levels/trips.json";
import { level as campaignLevel, levelCount } from "../game/levels";
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
  exists: boolean;
  won: boolean;
  /** Its postcard, or null while the board names none or Art has not made it. */
  dest: Destination | null;
}

export function placesOf(tr: Trip): Place[] {
  const won = lastWon();
  const out: Place[] = [];
  for (let n = tr.from; n <= tr.to; n++) {
    const exists = n <= levelCount();
    const id = exists ? campaignLevel(n).destination?.id : undefined;
    out.push({ board: n, exists, won: exists && n <= won, dest: (id && destination(id)) || null });
  }
  return out;
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
