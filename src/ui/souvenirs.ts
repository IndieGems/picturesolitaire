// SOUVENIRS on screen (the creator, 2026-10-28; docs/souvenirs.md): each trip's optional bonus board,
// themed on the trip, opened once its trip is stamped. Here, what the screens ask of them:
//
//   which exist      the boards Levels has made (Gameplay's loadSouvenirs), with Art's record of each
//                    (catalogue.ts: the theme, the table it wears, the sticker); a trip with no board
//                    or no record has no Souvenir yet
//   which are open   a stamped trip's (the record's: its last board won), the same rule as the checker's
//   which are won    the server's record (progress().souvenir: each won Souvenir's id, Server's), a
//                    held win showing at once; a won one puts its sticker on the trip's passport page
//   home's tile      the first stamped trip whose Souvenir is still to play, in the itinerary's head:
//                    its sticker and "Souvenir", a tap opening its board (a button on information)
//
// The board itself (app.ts, kind "souvenir") claims like any board and pays once; the passport's
// sticker and the stamp card's way in are passport.ts's.

import { loadSouvenirs, type Souvenir } from "../game/levels";
import { souvenirBest } from "../net/progress";
import { ensureTrip, fileUrl, resident } from "../packs";
import { souvenirArt, souvenirTheme, type SouvenirArt } from "./catalogue";
import { liveText, t } from "./i18n";
import { tripById, tripDone, tripPlace, trips } from "./trips";

/** The Souvenir boards, once loaded (they load with the first screen; until then, none). */
let boards: Souvenir[] = [];
let loading: Promise<void> | null = null;
const changed = new Set<() => void>();

/** Load the Souvenir boards (once; again on the next ask if it failed), then tell the screens. */
export function loadSouvenirList(): Promise<void> {
  loading ??= loadSouvenirs().then((list) => {
    boards = list;
    if (!list.length) loading = null;
    for (const fn of [...changed]) fn();
  });
  return loading;
}
/** Hear when the boards have loaded. Returns the unsubscribe. */
export function onSouvenirs(fn: () => void): () => void {
  changed.add(fn);
  return () => void changed.delete(fn);
}

/** Trip `trip`'s Souvenir, board and art, when both exist. */
export function souvenirOf(trip: string): { board: Souvenir; art: SouvenirArt } | null {
  const board = boards.find((b) => b.trip === trip);
  const art = souvenirArt(trip);
  return board && art ? { board, art } : null;
}

/** The record says this Souvenir was won (Server's `souvenir`: each won one's id, its fewest moves; a held win at once). */
export function souvenirWon(id: string): boolean {
  return souvenirBest(id) !== undefined;
}

/** Trip `trip`'s Souvenir is open to play: it exists, and the trip is stamped. */
export function souvenirOpen(trip: string): boolean {
  const tr = tripById(trip);
  return !!tr && tripDone(tr) && !!souvenirOf(trip);
}

/** The stamped trips' Souvenirs still to play, in trip order (home's tile shows the first). */
export function souvenirsWaiting(): string[] {
  return trips.filter((tr) => souvenirOpen(tr.id) && !souvenirWon(souvenirOf(tr.id)!.board.id)).map((tr) => tr.id);
}

/** A sticker's address: from its trip's passport pack once that is in (a built game), else its file. */
export function stickerUrl(art: SouvenirArt): string {
  return fileUrl(art.sticker);
}
/** The sticker, ready to draw: its trip's pack loaded first where it is not in (a failure resolves too). */
export function stickerReady(art: SouvenirArt): Promise<string> {
  if (resident(art.sticker)) return Promise.resolve(fileUrl(art.sticker));
  return ensureTrip(art.trip).then(
    () => fileUrl(art.sticker),
    () => fileUrl(art.sticker),
  );
}

/** The words for a Souvenir: its trip's place ("America": tripPlace) and its theme. */
export function souvenirWords(trip: string): { theme: string; trip: string } {
  const art = souvenirArt(trip);
  const tr = tripById(trip);
  return { theme: art ? souvenirTheme(art) : "", trip: tr ? tripPlace(tr) : trip };
}

/**
 * Home's Souvenir tile, in the itinerary's head: the first stamped trip's Souvenir still to play,
 * its sticker and "Souvenir" over the trip's name; hidden when there is none. A tap plays it.
 */
export function createSouvenirTile(play: (trip: string) => void) {
  const img = document.createElement("img");
  img.className = "sv-sticker";
  img.alt = "";
  img.draggable = false;
  const name = document.createElement("b");
  liveText(name, "souvenir.tile");
  const sub = document.createElement("small");
  const words = document.createElement("span");
  words.className = "words";
  words.append(name, sub);
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "btn souvenir-tile";
  tile.dataset.press = "home.souvenir";
  tile.hidden = true;
  tile.append(img, words);
  let trip: string | null = null;
  tile.addEventListener("click", () => trip && play(trip));

  function draw(): void {
    const next = souvenirsWaiting()[0] ?? null;
    trip = next;
    tile.hidden = !next;
    if (!next) return;
    const s = souvenirOf(next)!;
    const w = souvenirWords(next);
    sub.textContent = w.trip;
    tile.setAttribute("aria-label", t("souvenir.tileAria", { trip: w.trip, theme: w.theme }));
    if (img.dataset.trip !== next) {
      img.dataset.trip = next;
      img.classList.remove("in");
      void stickerReady(s.art).then((src) => {
        if (img.dataset.trip !== next) return;
        img.src = src;
        void img.decode().then(
          () => img.classList.add("in"),
          () => img.classList.add("in"),
        );
      });
    }
  }
  return { tile, draw };
}
