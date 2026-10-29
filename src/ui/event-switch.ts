// THE DAILY SUITCASE'S SWITCH (the creator, 2026-10-29: the monthly event is on hold, perhaps to come
// back after release as a VIP-only event). One value for the whole game: `on` in
// src/net/suitcase-ids.json, the file the win checker (functions/checker/build.rs), the config
// generator (tools/server/make-config.mts) and Server's src/net/suitcase.ts read too, so the game shows
// the event exactly when the server packs its items. Absent or false: off.
//
// Off, the player meets no trace of it: no Event tile on home (suitcase.ts), no item moment on the
// daily (item-found.ts, from app.ts) and no "packed" flight on its win card, no suitcase screen, no
// locked table "won by a suitcase" in the table chooser (tables.ts), no suitcase in a friend's daily
// dare (friend-cards.ts). The daily keeps everything else, and the day's item picture is dealt as an
// ordinary picture. The code, the translations and docs/daily-suitcase.md stay for its return.
//
// Outside a release build the creator can still look at it: the dev menu's event preview, and the
// play-test tool's stand-in (__ps.suitcase), show it while they are up (suitcase-data.ts, looking()).

import IDS from "../net/suitcase-ids.json";

/** The event is on for players (the shared switch). */
export const EVENT_ON: boolean = (IDS as { on?: unknown }).on === true;

let looking = false;

/** The event shows: on for players, or a pretend month is up for the creator (outside a release build). */
export const eventShown = (): boolean => EVENT_ON || looking;

/** suitcase-data.ts: a pretend month (the event preview, the play-test's stand-in) is up, or gone. */
export function lookAtEvent(on: boolean): void {
  looking = on && import.meta.env.MODE !== "release";
}
