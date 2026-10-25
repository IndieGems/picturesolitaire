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
// creator, 2026-10-25: "a picture ships at the size it is drawn"): the thumb (320 px
// on the long side) for grids and covers, the board copy (240 x 320 a card) for the
// board and the win card, the full file (384 x 512 a card) only seen big. A copy
// the catalogue does not list (a picture Art has not reached) falls back to the full.

import CATALOGUE from "../content/pictures.json";
import { t } from "./i18n";

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

/** Art's thumbs: the full picture's aspect, 320 px on the long side (measured on all 156, 2026-10-25). */
const THUMB_LONG = 320;

type Entry = (typeof CATALOGUE.pictures)[number] & { thumb?: string; px?: number[]; board?: string; boardPx?: number[] };
function copiesOf(p: Entry): Copy[] {
  const [w, h] = p.px?.length === 2 ? (p.px as [number, number]) : [Infinity, Infinity];
  const list: Copy[] = [{ file: p.file, w, h }];
  if (p.board && p.boardPx?.length === 2) list.push({ file: p.board, w: p.boardPx[0]!, h: p.boardPx[1]! });
  if (p.thumb && p.thumb !== p.file && Number.isFinite(w)) {
    const k = THUMB_LONG / Math.max(w, h);
    list.push({ file: p.thumb, w: Math.round(w * k), h: Math.round(h * k) });
  }
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
  return `${import.meta.env.BASE_URL}${p.file}`;
}

/** Its small copy's address, for grids and covers. */
export function thumbUrl(p: Picture): string {
  return `${import.meta.env.BASE_URL}${p.thumb}`;
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
  return `${import.meta.env.BASE_URL}${c.file}`;
}

/** A catalogue title, in the player's language where a locale has one. */
function localized(key: string, english: string): string {
  const said = t(key);
  return said === key ? english : said;
}
export const albumTitle = (a: Album): string => localized(`album.${a.id}`, a.title);
export const pictureTitle = (p: Picture): string => localized(`picture.${p.id}`, p.title);
