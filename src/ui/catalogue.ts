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

import CATALOGUE from "../content/pictures.json";
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
type Entry = (typeof CATALOGUE.pictures)[number] & Sizes;
function copiesOf(p: Sizes): Copy[] {
  const [w, h] = p.px?.length === 2 ? (p.px as [number, number]) : [Infinity, Infinity];
  const list: Copy[] = [{ file: p.file, w, h }];
  if (p.board && p.boardPx?.length === 2) list.push({ file: p.board, w: p.boardPx[0]!, h: p.boardPx[1]! });
  // a thumb only where its size is listed (a destination's passport copy): the library's
  // thumbs no longer ship (the albums are unreached; Art, 2026-10-26, the build's file cap)
  if (p.thumb && p.thumb !== p.file && p.thumbPx?.length === 2) list.push({ file: p.thumb, w: p.thumbPx[0]!, h: p.thumbPx[1]! });
  return list.sort((a, b) => a.w * a.h - b.w * b.h);
}

const albumList: Album[] = CATALOGUE.albums.map((a) => ({ id: a.id, title: a.title }));
const pictureList: Picture[] = (CATALOGUE.pictures as Entry[]).map((p) => ({
  id: p.id,
  album: p.album,
  title: p.title,
  file: p.file,
  thumb: p.thumb ?? p.file,
  board: p.board && p.boardPx?.length === 2 ? p.board : null,
  copies: copiesOf(p),
  cols: p.cols,
  rows: p.rows,
}));
const byId = new Map(pictureList.map((p) => [p.id, p]));

/** A destination: a picture (the whole postcard, cols x rows of the board) with the place's two lines. */
export interface Destination extends Picture {
  /** Where it is: "Arizona, USA". The picture's `title` is its name. */
  place: string;
}
type DestEntry = Sizes & { id: string; name: string; place?: string; cols: number; rows: number };
const destinationList: Destination[] = ((CATALOGUE as { destinations?: DestEntry[] }).destinations ?? []).map((d) => ({
  id: d.id,
  album: "",
  title: d.name,
  place: d.place ?? "",
  file: d.file,
  thumb: d.thumb ?? (d.board && d.boardPx?.length === 2 ? d.board : d.file),
  board: d.board && d.boardPx?.length === 2 ? d.board : null,
  copies: copiesOf(d),
  cols: d.cols,
  rows: d.rows,
}));
const destById = new Map(destinationList.map((d) => [d.id, d]));

/** The destination `id` (a board's level data names it), or undefined while Art has not made it. */
export function destination(id: string): Destination | undefined {
  return destById.get(id);
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
type ItemEntry = { id: string; month?: string; title?: string; file: string; board?: string; cutout?: string };
const itemById = new Map(
  ((CATALOGUE as { items?: ItemEntry[] }).items ?? []).map((i): [string, SuitcaseItemArt] => [
    i.id,
    { id: i.id, month: i.month ?? i.id.slice(5, 12), title: i.title ?? i.id, picture: i.board ?? i.file, cutout: i.cutout ?? null },
  ]),
);
/** A month's items as Art lists them, in slot order (for the dev server's stand-in suitcase). */
export function suitcaseItemsOf(month: string): SuitcaseItemArt[] {
  return [...itemById.values()].filter((i) => i.month === month).sort((a, b) => a.id.localeCompare(b.id));
}
/** The suitcase item `id` ("item-2026-11-04"), or undefined while Art has not listed it. */
export function suitcaseItem(id: string): SuitcaseItemArt | undefined {
  return itemById.get(id);
}

/** Every album, in the catalogue's order, that has at least one picture. */
export function albums(): Album[] {
  return albumList.filter((a) => pictureList.some((p) => p.album === a.id));
}

/** An album's pictures, in the catalogue's order. */
export function picturesIn(album: string): Picture[] {
  return pictureList.filter((p) => p.album === album);
}

export function picture(id: string): Picture | undefined {
  return byId.get(id);
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
  destById.has(p.id) ? destinationName(p.id, p.title) : localized(`picture.${p.id}`, p.title);
/** A destination's two lines in the player's language: its name, and where it is. */
export const destinationName = (id: string, english: string): string => localized(`destination.${id}.name`, english);
export const destinationPlace = (id: string, english: string): string => localized(`destination.${id}.place`, english);
