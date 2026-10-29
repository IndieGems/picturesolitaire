// THE SOUNDTRACK ITEMS sold on the Cosmetics screen (the creator, 2026-10-29): cosmetic platform
// items a player buys once for Coins (src/net/cosmetics.ts), never traded, never written by the
// game (src/net/keepsake.ts reads what the player owns). The list itself is src/net/tracks.json,
// the one place a track's slug, id, title and price live: the config tool
// (tools/server/make-config.mts) writes the items and their offers in the game config from it.
// Every player's own track (track-sunny-day) is no item, nor is a track that comes with owning a
// table (UI's src/ui/tracks.ts says which).

import DATA from "./tracks.json";

export interface Track {
  /** The item's slug in the game config, and Audio's file name: "track-<name>". */
  slug: string;
  /** Its id in the game config: a UUID, fixed for good once uploaded. */
  id: string;
  /** What the player reads. */
  title: string;
  /** The trip it belongs to (src/content/levels/trips.json). */
  trip: string;
  /** Its Coins price as written into the config; the screen shows the config's (src/net/cosmetics.ts). */
  price: number;
}

export const TRACKS: readonly Track[] = DATA.tracks as Track[];
