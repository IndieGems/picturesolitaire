// THE EVENT'S SWITCH (docs/vip.md). One value for the whole game: `on` in src/net/suitcase-ids.json, the
// file the win checker (functions/checker/build.rs), the config generator (tools/server/make-config.mts) and
// Server's src/net/suitcase.ts read too. On, the event shows to EVERY player (the creator, 2026-11-10: "no VIP
// gates"; it was a VIP's only until then, behind a locked door for anyone else), so the game shows the event
// exactly when the server packs its items.
//
// Not shown, the player meets no trace of its insides: no item moment on the daily (item-found.ts, from
// app.ts) and no "packed" flight on its win card, no suitcase screen, no locked table "won by a suitcase"
// in the Cosmetics screen (tables.ts), no suitcase in a friend's daily dare (friend-cards.ts). The daily
// keeps everything else, and the day's item picture is dealt as an ordinary picture.
//
// Outside a release build the creator can still look at it: the dev menu's event preview, and the
// play-test tool's stand-in (__ps.suitcase), show it while they are up (suitcase-data.ts, looking()).

import IDS from "../net/suitcase-ids.json";

/** The event is on (the shared switch). */
export const EVENT_ON: boolean = (IDS as { on?: unknown }).on === true;

let looking = false;

/** The event shows, its insides and all: on, or a pretend month is up for the creator (outside a release build). */
export const eventShown = (): boolean => EVENT_ON || looking;

const listeners = new Set<() => void>();
/** Hear when eventShown() may have changed (a pretend month went up or down). Returns the unsubscribe. */
export function onEventShown(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
const changed = () => {
  for (const fn of [...listeners]) fn();
};

/** suitcase-data.ts: a pretend month (the event preview, the play-test's stand-in) is up, or gone. */
export function lookAtEvent(on: boolean): void {
  const next = on && import.meta.env.MODE !== "release";
  if (next === looking) return;
  looking = next;
  changed();
}
