// The picture catalogue, as the screens read it: src/content/pictures.json
// (the art member's). It grows from a first batch to forty and more, so
// nothing here or on any screen counts or names pictures by hand: albums and
// their pictures always come from the file.
//
// Album and picture titles are player-facing text kept in the catalogue. When
// the game is translated, a locale may carry "album.<id>" and "picture.<id>"
// keys; until then, and for any key a locale lacks, the catalogue's English
// stands.

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
  /** Its size in cards: 2 x 3 is two across, three down. */
  cols: number;
  rows: number;
}

const albumList: Album[] = CATALOGUE.albums.map((a) => ({ id: a.id, title: a.title }));
const pictureList: Picture[] = CATALOGUE.pictures.map((p) => ({
  id: p.id,
  album: p.album,
  title: p.title,
  file: p.file,
  thumb: (p as { thumb?: string }).thumb ?? p.file,
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

/** A catalogue title, in the player's language where a locale has one. */
function localized(key: string, english: string): string {
  const said = t(key);
  return said === key ? english : said;
}
export const albumTitle = (a: Album): string => localized(`album.${a.id}`, a.title);
export const pictureTitle = (p: Picture): string => localized(`picture.${p.id}`, p.title);
