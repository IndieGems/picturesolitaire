// The build-time split of the game's content (tools/content-split.mjs): what the game imports
// instead of src/content/pictures.json and src/content/levels/*.json. Each loader resolves a chunk
// as stored in those files, and the chunk has already registered its boards' pictures
// (src/content.ts) when it resolves.

declare module "virtual:ps-content" {
  /** A campaign board's skeleton: what home, the itinerary and the passport read without its deal. */
  export interface BoardSkeleton {
    /** "c07" */
    id: string;
    /** Its trip's id ("t1"), or "rest" for a board past the last trip. */
    trip: string;
    cols: number;
    rows: number;
    /** Its destination's id in the catalogue, when it has one. */
    destination?: string;
    mark?: "hard" | "super";
  }
  /** A level as the level files store it (src/game/levels.ts's Stored, and lane fields). */
  type StoredLevel = { id: string; [field: string]: unknown };

  export const campaign: {
    count: number;
    /** Board n's skeleton at index n - 1. */
    boards: readonly BoardSkeleton[];
    /** Each trip's boards as stored; `from` is its first board's number (from 1). */
    trips: Record<string, () => Promise<{ levels: StoredLevel[]; from: number }>>;
  };
  export const daily: {
    /** The pool's first date ("YYYY-MM-DD"), or null for an empty pool. */
    first: string | null;
    /** Each week's dailies by its Monday ("YYYY-MM-DD", UTC); `start` is the week's first index in the pool. */
    weeks: Record<string, () => Promise<{ levels: StoredLevel[]; start: number }>>;
  };
  /** Each month's Daily Suitcase items ("YYYY-MM"), registered in the catalogue; resolves their ids. */
  export const items: Record<string, () => Promise<{ items: string[] }>>;
  export const souvenirs: () => Promise<{ levels: StoredLevel[] }>;
  export const challenge: () => Promise<{ levels: StoredLevel[] }>;
  export const lessons: () => Promise<{ levels: StoredLevel[] }>;
  export const experiments: () => Promise<{ levels: StoredLevel[] }>;
  /** The whole catalogue, registered (the albums, the dev menu). */
  export const library: () => Promise<Record<string, never>>;
  /** The catalogue's small lists, always here. */
  export const catalogue: {
    albums: { id: string; title: string }[];
    suitcases: { month: string; theme: string; table: string; tableTitle: string }[];
    souvenirs: { trip: string; theme: string; table: string; tableTitle: string; sticker: string }[];
  };
}

declare module "virtual:ps-icons" {
  /** Each interface glyph (public/art/ui/icon-<name>.svg) as a data URL, by <name>: the build's (tools/content-split.mjs). */
  const glyphs: Record<string, string>;
  export default glyphs;
}
