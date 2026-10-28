// The picture catalogue as far as it has loaded. The game never imports src/content/pictures.json
// whole: the build splits it (tools/content-split.mjs), and each chunk of boards it loads (a trip,
// a daily week, the Souvenirs, a month's suitcase items) registers here the catalogue entries its
// boards deal, as it is evaluated. So a board's pictures are known once its chunk has resolved,
// which is before any screen opens it (the level loaders await their chunk).
//
// Entries are as pictures.json holds them (Art's fields: file, board, boardPx, px, thumb, title...).
// The screens read them through src/ui/catalogue.ts; the board reads them by id here.
// Nothing here is player data: it is the game's own content, loaded again each session.

/** A catalogue entry, as pictures.json lists it. */
export type CatalogueEntry = {
  id: string;
  file: string;
  title?: string;
  name?: string;
  [field: string]: unknown;
};

/** Part of the catalogue: any of its picture lists. */
export interface CataloguePart {
  pictures?: CatalogueEntry[];
  destinations?: CatalogueEntry[];
  items?: CatalogueEntry[];
  souvenirPictures?: CatalogueEntry[];
}
export type CatalogueKind = keyof CataloguePart;

const lists: Record<CatalogueKind, Map<string, CatalogueEntry>> = {
  pictures: new Map(),
  destinations: new Map(),
  items: new Map(),
  souvenirPictures: new Map(),
};
const byId = new Map<string, CatalogueEntry>();
const listeners = new Set<() => void>();

/** Called by each content chunk as it is evaluated (never by hand): its boards' entries. */
export function addCatalogue(part: CataloguePart): void {
  let added = false;
  for (const kind of Object.keys(lists) as CatalogueKind[]) {
    for (const e of part[kind] ?? []) {
      if (lists[kind].has(e.id)) continue;
      lists[kind].set(e.id, e);
      byId.set(e.id, e);
      added = true;
    }
  }
  if (added) for (const fn of listeners) fn();
}

/** The entry for `id` in any list (a picture, a destination, an item, a Souvenir picture), once loaded. */
export function catalogueEntry(id: string): CatalogueEntry | undefined {
  return byId.get(id);
}

/** The entry for `id` in list `kind`, once loaded. */
export function entryOf(kind: CatalogueKind, id: string): CatalogueEntry | undefined {
  return lists[kind].get(id);
}

/** Every loaded entry of list `kind`, in the order loaded. */
export function entriesOf(kind: CatalogueKind): IterableIterator<CatalogueEntry> {
  return lists[kind].values();
}

/** Hear each time entries arrive; returns the way to stop. */
export function onCatalogue(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
