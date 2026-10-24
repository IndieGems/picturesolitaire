// THE TABLE ITEMS: cosmetic platform items the server grants (src/net/keepsake.ts
// reads what the player owns). Pure data with no imports, so the config tool
// (tools/server/make-config.mts) reads it too: this list is the one place a
// table's slug, id and title live, and the game config is written from it.
//
// The onboarding keepsake (the creator's choice, 2026-10-24) is granted by the
// same platform step that pays the onboarding prize: campaign board 1's
// progression completing, which only the win checker can move, after it has
// replayed the board. So it lands once, ever, and the game never writes it.

export interface Table {
  /** The item's slug in the game config: "table-<name>". */
  slug: string;
  /** Its id in the game config: a UUID, fixed for good once uploaded. */
  id: string;
  /** What the player reads. */
  title: string;
  /** The PNG the config uploads as the item's icon (path from the project root), if Art made one. */
  icon?: string;
  /** How it is earned: "onboarding" is granted when campaign board 1 is verified. */
  award: "onboarding";
}

/** Every table item. Empty until the creator picks the keepsake (Art sends its slug and title). */
export const TABLES: readonly Table[] = [];

/** The onboarding keepsake, once it is named. */
export const KEEPSAKE: Table | undefined = TABLES.find((t) => t.award === "onboarding");

/** The table's slug for an item definition id the server reports (the id itself if it names no table). */
export const tableOf = (itemDefinitionId: string): string => TABLES.find((t) => t.id === itemDefinitionId)?.slug ?? itemDefinitionId;
