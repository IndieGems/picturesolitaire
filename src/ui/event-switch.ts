// THE EVENT'S SWITCH (docs/vip.md: the two-week event is for VIPs only). One value for the whole game:
// `on` in src/net/suitcase-ids.json, the file the win checker (functions/checker/build.rs), the config
// generator (tools/server/make-config.mts) and Server's src/net/suitcase.ts read too: on means ON FOR
// VIPS. The event shows to a player only when it is on AND the server says they are a VIP (src/net/vip.ts),
// so the game shows the event exactly when the server packs its items for them.
//
// Not shown, the player meets no trace of its insides: no item moment on the daily (item-found.ts, from
// app.ts) and no "packed" flight on its win card, no suitcase screen, no locked table "won by a suitcase"
// in the Cosmetics screen (tables.ts), no suitcase in a friend's daily dare (friend-cards.ts). The daily
// keeps everything else, and the day's item picture is dealt as an ordinary picture.
//
// A PLAYER WHO IS NOT A VIP sees the event's DOOR, locked (the creator, 2026-10-30, after Untangled):
// home's event strip with a padlock and a gold VIP tag while an event runs (eventDoor), and a tap on it
// opens the locked door's screen (vip-door.ts), never the suitcase.
//
// Outside a release build the creator can still look at it: the dev menu's event preview, and the
// play-test tool's stand-in (__ps.suitcase), show it while they are up (suitcase-data.ts, looking()).

import IDS from "../net/suitcase-ids.json";
import { isVip, onVipChange } from "../net/vip";

/** The event is on (for VIPs: the shared switch). */
export const EVENT_ON: boolean = (IDS as { on?: unknown }).on === true;

let looking = false;

/** The event shows, its insides and all: on and this player a VIP, or a pretend month is up for the creator (outside a release build). */
export const eventShown = (): boolean => (EVENT_ON && isVip()) || looking;

/** The event's door shows on home: on (to every player: locked to one who is not a VIP), or a pretend month is up. */
export const eventDoor = (): boolean => EVENT_ON || looking;

const listeners = new Set<() => void>();
/** Hear when eventShown() may have changed (VIP came or went, a pretend month went up or down). Returns the unsubscribe. */
export function onEventShown(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
const changed = () => {
  for (const fn of [...listeners]) fn();
};
onVipChange(changed);

/** suitcase-data.ts: a pretend month (the event preview, the play-test's stand-in) is up, or gone. */
export function lookAtEvent(on: boolean): void {
  const next = on && import.meta.env.MODE !== "release";
  if (next === looking) return;
  looking = next;
  changed();
}
