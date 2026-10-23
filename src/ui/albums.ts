// The albums: every picture the player has restored, kept to look at again.
//
//   Albums   one row per album of the catalogue, "n of m restored"
//   an album its pictures: the restored ones whole, the rest as plain card
//            backs (never a glimpse of the picture), each restored one opening
//            full screen to zoom (viewer.ts)
//
// The albums and their pictures come from the catalogue (catalogue.ts), never
// from a list here; which are restored comes from the player's save
// (progress.ts). Both screens have the standard's top row: the title on the
// left, Back then the gear at the right end.

import { ICONS } from "./icons";
import { t } from "./i18n";
import { albumTitle, albums, picturesIn, pictureTitle, thumbUrl, type Album } from "./catalogue";
import { isRestored } from "./progress";
import { createViewer } from "./viewer";

type Nav = {
  /** Albums' Back: to home. */
  home(): void;
  /** Show one of the two screens. */
  show(which: "albums" | "album"): void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function backButton(press: string): HTMLButtonElement {
  const b = el("button", "btn round top-back");
  b.type = "button";
  b.dataset.press = press;
  b.innerHTML = ICONS.back;
  b.setAttribute("aria-label", t("albums.back"));
  return b;
}

/** The plain back of a card: what a picture not yet restored shows, in its shape and nothing more. */
function cardBack(cols: number, rows: number, cls: string): HTMLElement {
  const back = el("div", cls);
  back.style.setProperty("--c", String(cols));
  back.style.setProperty("--r", String(rows));
  back.setAttribute("aria-hidden", "true");
  return back;
}

export function createAlbums(nav: Nav) {
  // ---- the list ----
  const listPill = el("div", "top-pill glass", t("albums.title"));
  const listBack = backButton("albums.back");
  listBack.addEventListener("click", nav.home);
  const list = el("div", "album-list");
  const listScreen = el("section", "screen menu-screen albums-screen");
  listScreen.hidden = true;
  listScreen.setAttribute("aria-label", t("albums.title"));
  const listScroll = el("div", "scroll");
  listScroll.append(list);
  listScreen.append(listPill, listBack, listScroll);

  // ---- one album ----
  const albumPill = el("div", "top-pill glass");
  const albumBack = backButton("album.back");
  albumBack.addEventListener("click", () => {
    drawList();
    nav.show("albums");
  });
  const count = el("div", "album-count glass");
  const shelf = el("div", "shelf");
  const albumScreen = el("section", "screen menu-screen album-screen");
  albumScreen.hidden = true;
  const albumScroll = el("div", "scroll");
  albumScroll.append(count, shelf);
  albumScreen.append(albumPill, albumBack, albumScroll);

  const viewer = createViewer();
  let open: Album | null = null;

  function tally(a: Album): { done: number; all: number } {
    const pics = picturesIn(a.id);
    return { done: pics.filter((p) => isRestored(p.id)).length, all: pics.length };
  }

  function drawList(): void {
    list.replaceChildren();
    for (const a of albums()) {
      const { done, all } = tally(a);
      const row = el("button", "btn album-row");
      row.type = "button";
      row.dataset.press = "albums.open";
      // the cover: the album's first restored picture, else a plain card back
      const first = picturesIn(a.id).find((p) => isRestored(p.id));
      const cover = el("span", "cover");
      if (first) {
        const img = el("img");
        img.src = thumbUrl(first);
        img.alt = "";
        img.draggable = false;
        img.loading = "lazy";
        cover.append(img);
      } else cover.append(cardBack(1, 1, "back"));
      const words = el("span", "words");
      words.append(el("b", "", albumTitle(a)), el("span", "", t("albums.count", { done, all })));
      const chev = el("span", "chev");
      chev.innerHTML = ICONS.chevron;
      row.append(cover, words, chev);
      row.addEventListener("click", () => openAlbum(a));
      list.append(row);
    }
    listScroll.scrollTop = 0;
  }

  function drawAlbum(a: Album): void {
    const { done, all } = tally(a);
    albumPill.textContent = albumTitle(a);
    count.textContent = t("albums.count", { done, all });
    shelf.replaceChildren();
    for (const p of picturesIn(a.id)) {
      if (isRestored(p.id)) {
        const tile = el("button", "tile restored");
        tile.type = "button";
        tile.dataset.press = "album.picture";
        tile.setAttribute("aria-label", pictureTitle(p));
        const frame = el("span", "frame");
        frame.style.setProperty("--c", String(p.cols));
        frame.style.setProperty("--r", String(p.rows));
        const img = el("img");
        img.src = thumbUrl(p);
        img.alt = "";
        img.draggable = false;
        img.loading = "lazy";
        img.decoding = "async";
        frame.append(img);
        tile.append(frame, el("span", "caption", pictureTitle(p)));
        tile.addEventListener("click", () => viewer.open(p));
        shelf.append(tile);
      } else {
        const tile = el("div", "tile hidden-picture");
        tile.append(cardBack(p.cols, p.rows, "frame back"));
        shelf.append(tile);
      }
    }
  }

  function openAlbum(a: Album): void {
    open = a;
    drawAlbum(a);
    albumScroll.scrollTop = 0;
    nav.show("album");
  }

  return {
    listScreen,
    albumScreen,
    viewer: viewer.element,
    /** Show the list of albums, freshly counted. */
    openList(): void {
      drawList();
      nav.show("albums");
    },
    /** The save changed (a picture restored, the account's copy landed): redraw what is up. */
    redraw(): void {
      if (!listScreen.hidden) drawList();
      if (!albumScreen.hidden && open) drawAlbum(open);
    },
    closeViewer: viewer.close,
  };
}
