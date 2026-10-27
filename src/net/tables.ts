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
// The built-in snowy dusk table (table-winter-dusk) is every player's and is no item.

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
   * time; "suitcase" with month `month`'s full Daily Suitcase (src/net/suitcase.ts; its entry
   * is written by tools/server/make-config.mts from Levels' suitcases.json).
   */
  award: "onboarding" | "suitcase";
  board?: string;
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
