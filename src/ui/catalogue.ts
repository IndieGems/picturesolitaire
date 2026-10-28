// The picture catalogue, as the screens read it: src/content/pictures.json
// (the art member's). It grows from a first batch to forty and more, so
// nothing here or on any screen counts or names pictures by hand: albums and
// their pictures always come from the file.
//
// Album and picture titles are player-facing text kept in the catalogue. When
// the game is translated, a locale may carry "album.<id>" and "picture.<id>"
// keys; until then, and for any key a locale lacks, the catalogue's English
// stands.
//
// Each picture comes in copies of three sizes (Art's, all at the full picture's
// aspect), and a screen draws the smallest that is sharp where it is shown (the
// creator, 2026-10-25: "a picture ships at the size it is drawn"): the board copy
// (240 x 320 a card) for the board and the win card, the full file (384 x 512 a card)
// only seen big, and a destination's passport copy (300 px wide, its size listed) for
// the passport's postcards. The library's own thumbs no longer ship (2026-10-26: the
// albums that drew them are unreached, and the build has a file cap), so nothing picks
// them. A copy the catalogue does not list falls back to the full. In a built game the
// files are in Art's packs (src/packs.ts): an address is the file's blob URL once its pack
// is loaded, the plain path until then (and always, in the dev loop).
//
// The DESTINATIONS (the travelogue, 2026-10-25) are Art's list of their own beside the
// pictures: one real place per campaign board, a postcard the size of the board whose
// crop plays as an ordinary picture. Never in an album (the passport shows them,
// passport.ts). Their two lines, "Grand Canyon" / "Arizona, USA", are "name" and "place";
// a locale may carry "destination.<id>.name" and ".place". A destination's thumb is sized
// for the passport's postcards, so it lists its own size (thumbPx).
//
// The SOUVENIRS (docs/souvenirs.md, 2026-10-28): each trip's bonus board has pictures of its own
// (`souvenirPictures`, never in an album, known by id like any picture), and a record per trip
// (`souvenirs`: its theme, its table, its sticker).
//
// LOADED AS NEEDED (the first-load trim, 2026-10-28): the game never carries pictures.json whole.
// The build splits it (tools/content-split.mjs): each chunk of boards (a trip, a daily week, the
// Souvenirs) brings the entries its boards deal, a month's suitcase items come with its screen
// (loadItems), and the whole list only for the albums (loadLibrary). So picture(), destination()
// and suitcaseItem() answer for what has loaded (src/content.ts): every picture of a board once
// its loader has resolved. The small lists (the albums, the Souvenir records) are always here.

import { catalogue, items as itemMonths, library } from "virtual:ps-content";
import { entriesOf, entryOf, type CatalogueEntry } from "../content";
import { t } from "./i18n";
import { fileUrl } from "../packs";

export interface Album {
  id: string;
  title: string;
}

export interface Picture {
  id: string;
  album: string;
  title: string;
  /** Under public/, as the page asks for it: the picture at full size, for looking closely. */
  file: string;
  /** A small copy for grids and covers (320 px on the long side); the full file where there is none. */
  thumb: string;
  /** The board copy (240 x 320 a card), or null where Art has not made one yet. */
  board: string | null;
  /** Every copy, the smallest first and the full file last, each at its size in pixels (sharpCopy). */
  copies: readonly Copy[];
  /** Its size in cards: 2 x 3 is two across, three down. */
  cols: number;
  rows: number;
}

/** One copy of a picture: its file under public/ and its size in pixels. */
export interface Copy {
  file: string;
  w: number;
  h: number;
}

type Sizes = { file: string; thumb?: string; thumbPx?: number[]; px?: number[]; board?: string; boardPx?: number[] };
function copiesOf(p: Sizes): Copy[] {
  const [w, h] = p.px?.length === 2 ? (p.px as [number, number]) : [Infinity, Infinity];
  const list: Copy[] = [{ file: p.file, w, h }];
  if (p.board && p.boardPx?.length === 2) list.push({ file: p.board, w: p.boardPx[0]!, h: p.boardPx[1]! });
  // a thumb only where its size is listed (a destination's passport copy): the library's
  // thumbs no longer ship (the albums are unreached; Art, 2026-10-26, the build's file cap)
  if (p.thumb && p.thumb !== p.file && p.thumbPx?.length === 2) list.push({ file: p.thumb, w: p.thumbPx[0]!, h: p.thumbPx[1]! });
  return list.sort((a, b) => a.w * a.h - b.w * b.h);
}

type PictureEntry = CatalogueEntry & Sizes & { album?: string; title?: string; cols: number; rows: number };
/** Each entry as the screens read it, made once. */
const made = new Map<string, Picture>();
function asPicture(e: PictureEntry, album: string): Picture {
  let p = made.get(e.id);
  if (!p) {
    p = {
      id: e.id,
      album,
      title: e.title ?? e.id,
      file: e.file,
      thumb: e.thumb ?? e.file,
      board: e.board && e.boardPx?.length === 2 ? e.board : null,
      copies: copiesOf(e),
      cols: e.cols,
      rows: e.rows,
    };
    made.set(e.id, p);
  }
  return p;
}

const albumList: Album[] = catalogue.albums.map((a) => ({ id: a.id, title: a.title }));

/**
 * A trip's Souvenir as Art lists it (pictures.json `souvenirs`): its theme in words, the table its
 * board wears, and the sticker its first win puts on the trip's passport page (a catalogue path,
 * in the trip's passport pack). A locale may carry "souvenir.<trip>.theme".
 */
export interface SouvenirArt {
  trip: string;
  theme: string;
  table: string;
  tableTitle: string;
  sticker: string;
}
const souvenirByTrip = new Map<string, SouvenirArt>(catalogue.souvenirs.map((s) => [s.trip, s]));
/** Trip `trip`'s Souvenir ("t1"), or undefined while Art has not made it. */
export function souvenirArt(trip: string): SouvenirArt | undefined {
  return souvenirByTrip.get(trip);
}

/** A destination: a picture (the whole postcard, cols x rows of the board) with the place's two lines. */
export interface Destination extends Picture {
  /** Where it is: "Arizona, USA". The picture's `title` is its name. */
  place: string;
}
type DestEntry = PictureEntry & { name: string; place?: string };
const destMade = new Map<string, Destination>();

/**
 * The destination `id` (a board's level data names it), once its trip has loaded (a trip's chunk
 * brings its boards' postcards); undefined until then, and while Art has not made it.
 */
export function destination(id: string): Destination | undefined {
  const known = destMade.get(id);
  if (known) return known;
  const e = entryOf("destinations", id) as DestEntry | undefined;
  if (!e) return undefined;
  const d: Destination = {
    id: e.id,
    album: "",
    title: e.name,
    place: e.place ?? "",
    file: e.file,
    thumb: e.thumb ?? (e.board && e.boardPx?.length === 2 ? e.board : e.file),
    board: e.board && e.boardPx?.length === 2 ? e.board : null,
    copies: copiesOf(e),
    cols: e.cols,
    rows: e.rows,
  };
  destMade.set(id, d);
  return d;
}

/**
 * A Daily Suitcase item (the catalogue's `items`, Art's): its title, the board copy the daily board
 * draws, and its cut-out (the object alone on transparency, for the suitcase's slot and, darkened, a
 * missing slot's outline) once Art has made one. A stand-in has no cut-out.
 */
export interface SuitcaseItemArt {
  id: string;
  month: string;
  title: string;
  /** The board copy (the 2x2 picture), or the full file. */
  picture: string;
  cutout: string | null;
}
type ItemEntry = CatalogueEntry & { month?: string; title?: string; board?: string; cutout?: string };
const asItem = (i: ItemEntry): SuitcaseItemArt => ({
  id: i.id,
  month: i.month ?? i.id.slice(5, 12),
  title: i.title ?? i.id,
  picture: i.board ?? i.file,
  cutout: i.cutout ?? null,
});
/** A month's items as Art lists them, in slot order, once loaded (loadItems). */
export function suitcaseItemsOf(month: string): SuitcaseItemArt[] {
  return [...(entriesOf("items") as IterableIterator<ItemEntry>)]
    .map(asItem)
    .filter((i) => i.month === month)
    .sort((a, b) => a.id.localeCompare(b.id));
}
/** The suitcase item `id` ("item-2026-11-04"), once its month, or a daily board dealing it, has loaded. */
export function suitcaseItem(id: string): SuitcaseItemArt | undefined {
  const e = entryOf("items", id) as ItemEntry | undefined;
  return e && asItem(e);
}
/** Load month `month`'s items ("YYYY-MM") for its suitcase screen; at once for a month Art has none for. */
export async function loadItems(month: string): Promise<void> {
  await itemMonths[month]?.();
}

let libraryLoad: Promise<void> | null = null;
/** Load the whole picture list (the albums, the dev menu): never at boot. Asked again after a failure. */
export function loadLibrary(): Promise<void> {
  libraryLoad ??= library().then(
    () => undefined,
    (err: unknown) => {
      libraryLoad = null;
      throw err;
    },
  );
  return libraryLoad;
}

const libraryEntries = () => [...(entriesOf("pictures") as IterableIterator<PictureEntry>)];

/** Every album, in the catalogue's order, that has at least one loaded picture (loadLibrary first for all). */
export function albums(): Album[] {
  const loaded = new Set(libraryEntries().map((e) => e.album));
  return albumList.filter((a) => loaded.has(a.id));
}

/** An album's loaded pictures (all of them once loadLibrary has resolved), in the catalogue's order. */
export function picturesIn(album: string): Picture[] {
  return libraryEntries()
    .filter((e) => e.album === album)
    .map((e) => asPicture(e, album));
}

/** A picture (the library's, or a Souvenir's) by id, once a chunk dealing it has loaded. */
export function picture(id: string): Picture | undefined {
  const lib = entryOf("pictures", id) as PictureEntry | undefined;
  if (lib) return asPicture(lib, lib.album ?? "");
  const sv = entryOf("souvenirPictures", id) as PictureEntry | undefined;
  return sv && asPicture(sv, "");
}

/** The picture's address at full size, as an <img> takes it. */
export function pictureUrl(p: Picture): string {
  return fileUrl(p.file);
}

/** Its small copy's address, for grids and covers. */
export function thumbUrl(p: Picture): string {
  return fileUrl(p.thumb);
}

/** A copy short of sharp by this little looks the same (a thumb on a 3x phone's win card is 1% short). */
const SHARP = 0.95;

/**
 * The smallest copy that is sharp drawn `w` x `h` CSS pixels filling its box (object-fit:
 * cover, so both sides must reach) on this screen, as `copy` and its address. It goes no
 * further than the board copy, even where that is short of sharp (a tall picture in a
 * phone's album): only the enlarged view fetches the full picture (viewer.ts). A picture
 * with no board copy yet falls back to the full one.
 */
export function sharpCopy(p: Picture, w: number, h: number, dpr = window.devicePixelRatio || 1): { copy: Copy; url: string } {
  const pool = p.board ? p.copies.filter((c) => c.file !== p.file) : p.copies;
  const copy = pool.find((c) => c.w >= w * dpr * SHARP && c.h >= h * dpr * SHARP) ?? pool[pool.length - 1]!;
  return { copy, url: copyUrl(copy) };
}

/** A copy's address, as an <img> takes it (and as the board names the copy it drew). */
export function copyUrl(c: Copy): string {
  return fileUrl(c.file);
}

/** A catalogue title, in the player's language where a locale has one. */
function localized(key: string, english: string): string {
  const said = t(key);
  return said === key ? english : said;
}
export const albumTitle = (a: Album): string => localized(`album.${a.id}`, a.title);
export const pictureTitle = (p: Picture): string =>
  entryOf("destinations", p.id) ? destinationName(p.id, p.title) : localized(`picture.${p.id}`, p.title);
/** A destination's two lines in the player's language: its name, and where it is. */
export const destinationName = (id: string, english: string): string => localized(`destination.${id}.name`, english);
export const destinationPlace = (id: string, english: string): string => localized(`destination.${id}.place`, english);
/** A Souvenir's theme in the player's language: "Street and diner food". */
export const souvenirTheme = (s: SouvenirArt): string => localized(`souvenir.${s.trip}.theme`, s.theme);
