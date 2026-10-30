// THE TABLE ITEMS: cosmetic platform items only the server grants
// (src/net/keepsake.ts reads what the player owns). The list itself is
// src/net/tables.json, the one place a table's slug, id and title live: the
// config tool (tools/server/make-config.mts) writes the game config from it,
// and the win checker (functions/checker/build.rs) learns from it which board
// grants which table.
//
// The onboarding keepsake (the creator's choice, 2026-10-24: the Autumn Study)
// is granted by the same platform step that pays the onboarding prize: board
// c01's progression completing, which only the win checker can move, after it
// has replayed the board. So it lands once, ever, and the game never writes it.
// Every player's own table (src/net/suitcase-ids.json, builtInTable) is no item. The snowy
// dusk desk (table-winter-dusk) was it until the game turned sunny (creator, 2026-10-28):
// it is now December 2026's suitcase prize, an item like the others.

import DATA from "./tables.json";

export interface Table {
  /** The item's slug in the game config: "table-<name>". */
  slug: string;
  /** Its id in the game config: a UUID, fixed for good once uploaded. */
  id: string;
  /** What the player reads. */
  title: string;
  /** The PNG the config uploads as the item's icon (path from the project root). */
  icon?: string;
  /**
   * How it is earned: "onboarding" is granted when board `board` is verified for the first
   * time; "suitcase" with event `event`'s full suitcase (a VIP event, docs/vip.md; src/net/suitcase.ts;
   * its entry is written by tools/server/make-config.mts from Levels' events.json); "none" is an
   * uploaded table no month awards any more, its id and item kept for a later event
   * (Winter Market, creator 2026-10-28); "shop" is sold on the Cosmetics screen for `price`
   * Coins, once per player (src/net/cosmetics.ts; creator 2026-10-29). Only a shop table is sold.
   */
  award: "onboarding" | "suitcase" | "none" | "shop";
  /** A shop table's Coins price as written into the config; the screen shows the config's (src/net/cosmetics.ts). */
  price?: number;
  board?: string;
  /** A suitcase table's event (src/content/levels/events.json id). */
  event?: string;
  /** Before the events, a suitcase table's month. */
  month?: string;
  /**
   * The Coins paid with it, in the same step: for the onboarding keepsake, the
   * onboarding prize (the config pays this number; the finish card shows it up front).
   */
  coins?: number;
}

export const TABLES: readonly Table[] = DATA.tables as Table[];

/** The onboarding keepsake. */
export const KEEPSAKE: Table | undefined = TABLES.find((t) => t.award === "onboarding");

/** The table's slug for an item definition id or slug the server reports (the input itself if it names no table). */
export const tableOf = (idOrSlug: string): string => TABLES.find((t) => t.id === idOrSlug)?.slug ?? idOrSlug;
