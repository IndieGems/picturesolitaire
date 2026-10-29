// THE COSMETICS SCREEN (the creator, 2026-10-29): home's Cosmetics tile opens it. The player's
// tables and soundtracks, what is for sale, and which ones are in use. It replaces the table
// chooser that was in Settings.
//
//   the top row   "Cosmetics", then Back (home) and the gear, as every screen's
//   the tabs      Tables | Music, two buttons; the one shown sits pressed in
//   Tables        a tile per table: its picture (a button: TRY IT ON, the whole game's table
//                 behind the screen changes to it, with a panel at the foot naming it, its price
//                 or Use, and a corner key back), its name, then one of: "In use" (information),
//                 Use (a button), or its price (a button: buy). In order: the default and every
//                 table owned, then the shop's tables (owned or not, in their own order, so a
//                 table never moves when bought), then an event's table to win, locked, while the
//                 event runs (information, with how to win it). An event's table shows only to its
//                 owners, and none is ever sold.
//   Music         a row per soundtrack: its cover, its name, then Listen (a track for sale: it
//                 plays in place of the music while they listen; Stop, another Listen, a purchase
//                 or leaving the screen ends it), and "In use", Use or its price as for a table.
//                 The Winter Dusk track shows only to the table's owners, and comes with it.
//
// BUYING: a price press says "Buying…", and only the platform's answer moves anything (Server's
// src/net/cosmetics.ts, through cosmetics-shop.ts): bought, the item is put on at once (the player
// bought it to use it) and the tile says so; "not enough Coins", or no answer ("try again in a
// moment"), is said in words on the tile, and nothing changes. A purchase is never sent again by
// itself. A price the player's Coins do not cover greys its button, which stays pressable and
// answers in words; the Coins themselves are never drawn (the Arcade's wallet is the one place).
//
// THE TRY-OUT obeys the sound: while the game is muted, its volume is at nothing, or the
// Arcade's Music switch is off, Listen says "The music is off" instead of playing silence.
//
// Information is glass (the tiles, "In use", the lines); only the buttons are buttons. Every
// button is a 44 px target or more at 360 x 640, focusable, and Escape ends a try-on.

import { onAudioChannels } from "../gem";
import { isMuted, onMutedChange, tryTrack } from "../sound";
import { onSettingsChange, setting } from "../settings";
import { eventShown } from "./event-switch";
import { cosmeticStats } from "./board-stats";
import { sayPrice } from "./coin";
import { closed, cornerKey, opened } from "./dialogs";
import { liveAttr, liveText, onLocaleChange, t } from "./i18n";
import { ICONS } from "./icons";
import { shop, type BuyAnswer, type CosmeticKind } from "./cosmetics-shop";
import { chooseTable, chosenTable, knownTable, onTableChange, pickerTables, shopTableArts, tableTitle, thumbOf, warmThumbs, wearTable, type TableArt } from "./tables";
import { chooseTrack, chosenTrack, onTrackChange, ownedTrackIds, TRACK_LIST, trackTitle, type TrackInfo } from "./tracks";

type Nav = {
  /** Back: to home. */
  home(): void;
  /** Show the screen (app.ts's show("cosmetics")). */
  show(): void;
};
type Tab = "tables" | "music";
/** A tile's state: chosen, owned (Use), for sale (its price), or an event's to win (information). */
type State = "inUse" | "owned" | "sale" | "locked";
type TableRow = { art: TableArt; state: State; lockedMonth?: string };
type TrackRow = { info: TrackInfo; state: State };

const COVER = (id: string) => `${import.meta.env.BASE_URL}art/tracks/${id}-cover.webp`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function btn(cls: string, press: string): HTMLButtonElement {
  const b = el("button", `btn ${cls}`);
  b.type = "button";
  b.dataset.press = press;
  return b;
}
function glyph(svg: string): Node {
  const tpl = document.createElement("template");
  tpl.innerHTML = svg;
  return tpl.content.firstChild!;
}

/** The Arcade's Music switch, as last sent (on until it says otherwise). */
let arcadeMusic = true;
onAudioChannels((c) => (arcadeMusic = c.music));
/** Would a try-out be heard? Not while muted, at no volume, or with the Arcade's Music off. */
const musicHeard = (): boolean => !isMuted() && arcadeMusic && setting("volume") > 0;

export function createCosmetics(nav: Nav) {
  const pill = liveText(el("div", "top-pill glass"), "cosmetics.title");
  const back = btn("round top-back", "cosmetics.back");
  back.append(glyph(ICONS.back));
  liveAttr(back, "aria-label", "cosmetics.back");
  back.addEventListener("click", () => nav.home());

  // the tabs: two buttons, the one shown pressed in
  const tabs = el("div", "cz-tabs");
  tabs.setAttribute("role", "tablist");
  const tabBtn = (tab: Tab): HTMLButtonElement => {
    const b = btn("cz-tab", `cosmetics.tab.${tab}`);
    b.setAttribute("role", "tab");
    b.id = `cz-tab-${tab}`;
    b.setAttribute("aria-controls", "cz-panel");
    liveText(b, `cosmetics.tab.${tab}`);
    b.addEventListener("click", () => showTab(tab));
    return b;
  };
  const tabTables = tabBtn("tables");
  const tabMusic = tabBtn("music");
  tabs.append(tabTables, tabMusic);

  const panel = el("div", "cz-panel");
  panel.id = "cz-panel";
  panel.setAttribute("role", "tabpanel");
  const scroll = el("div", "scroll");
  scroll.append(tabs, panel);

  // the try-on's panel at the foot, over the table being tried
  const tryOn = el("div", "cz-tryon");
  tryOn.hidden = true;
  tryOn.setAttribute("role", "dialog");
  tryOn.setAttribute("aria-modal", "false");

  const screen = el("section", "screen menu-screen cosmetics-screen");
  screen.hidden = true;
  liveAttr(screen, "aria-label", "cosmetics.title");
  screen.append(pill, back, scroll, tryOn);

  let tab: Tab = "tables";
  let tables: TableRow[] = [];
  let tracks: TrackRow[] = [];
  /** A purchase is going: one at a time, and no redraw from elsewhere meanwhile. */
  let busy = false;
  /** The last word on a tile ("Not enough Coins yet.", "Yours!"), by item, until the screen is left. */
  const said = new Map<string, { text: string; good: boolean }>();
  /** Items previewed this visit (cosmetic_previewed: once per item per visit). */
  const previewed = new Set<string>();
  /** The track being listened to, and whether it is still loading. */
  let listening: string | null = null;
  let loadingTrack = false;
  let listenToken = 0;
  /** The table being tried on. */
  let wearing: string | null = null;
  /** Each draw's token: a slower read never draws over a newer one. */
  let drawing = 0;
  let loaded = false;

  function preview(kind: CosmeticKind, id: string, state: State): void {
    if (state !== "sale" || previewed.has(id)) return;
    previewed.add(id);
    cosmeticStats.previewed(kind, id);
  }

  // ---------------------------------------------------------------- reading

  async function readTables(): Promise<TableRow[]> {
    const [picker, forSale] = await Promise.all([pickerTables(), shopTableArts()]);
    const owned = new Set(picker.filter((p) => !p.lockedMonth).map((p) => p.art.id));
    const sold = new Set(forSale.map((a) => a.id));
    const mine = (a: TableArt): State => (a.id === chosenTable() ? "inUse" : "owned");
    return [
      ...picker.filter((p) => !p.lockedMonth && !sold.has(p.art.id)).map((p) => ({ art: p.art, state: mine(p.art) })),
      ...forSale.map((art) => ({ art, state: owned.has(art.id) ? mine(art) : ("sale" as State) })),
      ...(eventShown() ? picker.filter((p) => p.lockedMonth).map((p) => ({ art: p.art, state: "locked" as State, lockedMonth: p.lockedMonth! })) : []),
    ];
  }

  async function readTracks(): Promise<TrackRow[]> {
    const owned = await ownedTrackIds();
    return TRACK_LIST.filter((x) => x.kind !== "table" || owned.has(x.id)).map((info) => ({
      info,
      state: owned.has(info.id) ? (info.id === chosenTrack() ? "inUse" : "owned") : "sale",
    }));
  }

  /** Read what is owned and chosen, and draw the tab shown. */
  async function refresh(): Promise<void> {
    const at = ++drawing;
    const [a, b] = await Promise.all([readTables(), readTracks()]);
    if (at !== drawing) return;
    tables = a;
    tracks = b;
    draw();
  }

  // ---------------------------------------------------------------- the pieces

  /** "In use", Use, or the price: what a tile or row offers. */
  function action(kind: CosmeticKind, id: string, state: State, name: string): HTMLElement {
    if (state === "inUse") {
      const tag = el("span", "cz-inuse");
      tag.append(glyph(ICONS.check), el("span", "", t("cosmetics.inUse")));
      return tag;
    }
    if (state === "owned") {
      const b = btn("cz-use", `cosmetics.use.${kind}`);
      b.textContent = t("cosmetics.use");
      b.setAttribute("aria-label", t("cosmetics.useAria", { name }));
      b.addEventListener("click", () => void use(kind, id));
      return b;
    }
    const price = shop.price(id);
    const b = btn("cz-buy shop-buy", `cosmetics.buy.${kind}`);
    const words = el("span", "buy-words");
    if (price === null) words.textContent = "…";
    else words.append(...sayPrice("cosmetics.price", price));
    b.append(words);
    b.disabled = price === null;
    b.classList.toggle("short", price !== null && shop.affordable(id) === false);
    if (price !== null) b.setAttribute("aria-label", t("cosmetics.buyAria", { name, price: `${price.toLocaleString()} ${t("coins.name")}` }));
    b.addEventListener("click", () => void buy(kind, id, b));
    return b;
  }

  /** A tile's line: the last answer on it, else why its price is greyed or missing. */
  function line(id: string, state: State): HTMLElement {
    const p = el("p", "cz-say");
    p.setAttribute("role", "status");
    const last = said.get(id);
    if (last) {
      p.textContent = last.text;
      p.classList.toggle("good", last.good);
    } else if (state === "sale" && loaded && shop.price(id) === null) p.textContent = t("cosmetics.notYet");
    else if (state === "sale" && shop.affordable(id) === false) p.textContent = t("shop.short");
    return p;
  }

  function tableTile(r: TableRow): HTMLElement {
    const name = tableTitle(r.art);
    const tile = el("section", `cz-tile glass ${r.state}`);
    tile.dataset.id = r.art.id;
    // a picture that is pressed, as a postcard is: raised in its frame, no button face
    const look = el("button", "cz-look");
    look.type = "button";
    look.dataset.press = "cosmetics.tryOn";
    look.setAttribute("aria-label", t("cosmetics.tryOnAria", { name }));
    const img = el("img");
    Object.assign(img, { src: thumbOf(r.art), alt: "", draggable: false, decoding: "async" });
    look.append(img);
    if (r.state === "locked") {
      // a table to win, not to try or buy: information
      const frame = el("span", "cz-look locked");
      frame.setAttribute("role", "img");
      frame.setAttribute("aria-label", t("settings.tableLockedAria", { table: name, month: monthName(r.lockedMonth!) }));
      const lock = el("span", "table-lock");
      lock.innerHTML = ICONS.lock;
      frame.append(img, lock);
      tile.append(frame, el("b", "cz-name", name), el("small", "cz-how", t("settings.tableLocked", { month: monthName(r.lockedMonth!) })));
      return tile;
    }
    look.addEventListener("click", () => void startTryOn(r.art.id));
    tile.append(look, el("b", "cz-name", name), action("table", r.art.id, r.state, name), line(r.art.id, r.state));
    return tile;
  }

  function trackRow(r: TrackRow): HTMLElement {
    const id = r.info.id;
    const name = trackTitle(id);
    const row = el("section", `cz-track glass ${r.state}`);
    row.dataset.id = id;
    const cover = el("span", "cz-cover");
    const img = el("img");
    Object.assign(img, { src: COVER(id), alt: "", draggable: false, decoding: "async" });
    img.addEventListener("error", () => img.remove(), { once: true });
    cover.append(img);
    // what is heard now: the track listened to once it plays, else the one in use
    const heard = listening ? listening === id && !loadingTrack : r.state === "inUse";
    if (heard && musicHeard()) {
      const eq = el("span", "cz-eq");
      eq.setAttribute("aria-hidden", "true");
      eq.append(el("i"), el("i"), el("i"));
      cover.append(eq);
    }
    const words = el("div", "cz-words");
    words.append(el("b", "", name));
    if (r.info.kind === "free") words.append(el("small", "", t("cosmetics.free")));
    else if (r.info.kind === "table" && r.info.table) {
      const art = knownTable(r.info.table);
      words.append(el("small", "", t("cosmetics.withTable", { table: art ? tableTitle(art) : r.info.table })));
    }
    const acts = el("div", "cz-acts");
    if (r.state === "sale") {
      const listen = btn("cz-listen", "cosmetics.listen");
      const on = listening === id;
      listen.classList.toggle("on", on);
      listen.setAttribute("aria-pressed", String(on));
      if (on && loadingTrack) {
        listen.setAttribute("aria-busy", "true");
        listen.append(el("span", "", t("cosmetics.loading")));
      } else {
        listen.append(el("i", on ? "cz-stop" : "cz-play"), el("span", "", t(on ? "cosmetics.stop" : "cosmetics.listen")));
      }
      listen.setAttribute("aria-label", t(on ? "cosmetics.stopAria" : "cosmetics.listenAria", { name }));
      listen.addEventListener("click", () => void listenTo(id));
      acts.append(listen);
    }
    acts.append(action("track", id, r.state, name));
    row.append(cover, words, acts, line(id, r.state));
    return row;
  }

  /** "December", in the player's language (a locked event table's month). */
  const monthName = (month: string) =>
    new Intl.DateTimeFormat(document.documentElement.lang || "en", { month: "long", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

  function draw(): void {
    if (busy) return;
    for (const [b, which] of [
      [tabTables, "tables"],
      [tabMusic, "music"],
    ] as const) {
      const on = which === tab;
      b.setAttribute("aria-selected", String(on));
      b.classList.toggle("pressed", on);
      b.tabIndex = on ? 0 : -1;
    }
    panel.setAttribute("aria-labelledby", `cz-tab-${tab}`);
    // keep the focus on the button pressed across the redraw
    const focused = document.activeElement instanceof HTMLElement && panel.contains(document.activeElement) ? document.activeElement : null;
    const where = focused?.closest<HTMLElement>("[data-id]")?.dataset.id;
    const press = focused?.dataset.press;
    if (tab === "tables") {
      const grid = el("div", "cz-grid");
      grid.append(...tables.map(tableTile));
      panel.replaceChildren(grid);
    } else {
      const list = el("div", "cz-list");
      list.append(...tracks.map(trackRow));
      panel.replaceChildren(list);
    }
    if (where && press) panel.querySelector<HTMLElement>(`[data-id="${where}"] [data-press="${press}"]`)?.focus({ preventScroll: true });
    if (wearing) drawTryOn();
  }

  // ---------------------------------------------------------------- doing

  function showTab(next: Tab): void {
    if (next === tab) return;
    tab = next;
    if (tab !== "music") stopListening(false);
    scroll.scrollTop = 0;
    draw();
  }

  async function use(kind: CosmeticKind, id: string): Promise<void> {
    if (kind === "table") await chooseTable(id);
    else {
      await chooseTrack(id);
      // listening to another: back to the music, which now plays this one
      if (listening) stopListening(false);
    }
    void refresh();
  }

  async function buy(kind: CosmeticKind, id: string, b: HTMLButtonElement): Promise<void> {
    if (busy) return;
    busy = true;
    said.clear();
    b.setAttribute("aria-busy", "true");
    b.disabled = true;
    const words = b.querySelector(".buy-words");
    if (words) words.textContent = t("shop.buying");
    const answer: BuyAnswer = await shop.buy(kind, id);
    busy = false;
    if (screen.hidden) return;
    if (answer === "ok" || answer === "owned") {
      // theirs: put on at once (a track being listened to carries straight on as the music)
      if (kind === "table") await chooseTable(id);
      else await chooseTrack(id);
      if (kind === "track" && listening) stopListening(false);
      said.set(id, { text: t(answer === "ok" ? "cosmetics.bought" : "cosmetics.had"), good: true });
    } else {
      said.set(id, { text: t(answer === "short" ? "cosmetics.short" : "shop.failed"), good: false });
    }
    await refresh();
    if (answer === "ok") screen.querySelector<HTMLElement>(`[data-id="${id}"]`)?.classList.add("grew");
  }

  /** Listen to a track for sale in place of the music (again: stop). */
  async function listenTo(id: string): Promise<void> {
    if (listening === id) return stopListening();
    said.delete(id);
    if (!musicHeard()) {
      said.set(id, { text: t("cosmetics.musicOff"), good: false });
      return draw();
    }
    const at = ++listenToken;
    listening = id;
    loadingTrack = true;
    preview("track", id, "sale");
    draw();
    const playing = await tryTrack(id);
    if (at !== listenToken) return;
    loadingTrack = false;
    if (!playing) {
      listening = null;
      said.set(id, { text: t("cosmetics.cannotPlay"), good: false });
    }
    draw();
  }

  /** The music back to the chosen track. */
  function stopListening(redraw = true): void {
    if (!listening) return;
    listenToken++;
    listening = null;
    loadingTrack = false;
    void tryTrack(null);
    if (redraw) draw();
  }

  // ---- trying a table on: the whole game's table behind the screen, a panel at the foot

  async function startTryOn(id: string): Promise<void> {
    wearing = id;
    const r = tables.find((x) => x.art.id === id);
    if (r) preview("table", id, r.state);
    scroll.hidden = true;
    tryOn.hidden = false;
    drawTryOn();
    opened(tryOn, endTryOn);
    await wearTable(id);
  }

  function drawTryOn(): void {
    const r = tables.find((x) => x.art.id === wearing);
    if (!r) return endTryOn();
    const name = tableTitle(r.art);
    const card = el("div", "card cz-tryon-card");
    const head = el("h2", "", name);
    card.append(cornerKey("back", t("cosmetics.tryOnDone"), "cosmetics.tryOnDone", endTryOn), head, el("p", "cz-tryon-line", t("cosmetics.tryingOn")));
    const act = action("table", r.art.id, r.state, name);
    // the focus goes to the price or Use as it opens (dialogs.ts); "In use" is no button
    if (act instanceof HTMLButtonElement) act.classList.add("next");
    card.append(act, line(r.art.id, r.state));
    // drawn again while up (the table laid, a purchase): the focus stays where it was, or goes to the action
    const had = tryOn.contains(document.activeElement) ? ((document.activeElement as HTMLElement).dataset.press ?? "") : null;
    tryOn.replaceChildren(card);
    if (had !== null) (card.querySelector<HTMLElement>(`[data-press="${had}"]`) ?? card.querySelector<HTMLElement>(".next, .corner-key"))?.focus({ preventScroll: true });
  }

  function endTryOn(): void {
    if (!wearing) return;
    wearing = null;
    tryOn.hidden = true;
    scroll.hidden = false;
    closed(tryOn);
    void wearTable(null);
    draw();
  }

  // ---------------------------------------------------------------- staying true

  const redraw = (): void => {
    if (!screen.hidden) void refresh();
  };
  shop.onChange(() => {
    if (!screen.hidden && !busy) draw();
  });
  onTableChange(redraw);
  onTrackChange(redraw);
  onLocaleChange(redraw);
  // the sound switched off or on while listening: the line and the playing bars follow
  onMutedChange(() => {
    if (!screen.hidden) {
      if (listening && !musicHeard()) {
        said.set(listening, { text: t("cosmetics.musicOff"), good: false });
        stopListening(false);
      }
      draw();
    }
  });
  onSettingsChange(() => {
    if (!screen.hidden && tab === "music") draw();
  });
  // hidden (another app, the Arcade's menu): a try-out stops, so it never comes back playing
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && listening) stopListening();
  });

  return {
    screen,
    /** Open on home's tile. */
    open(): void {
      said.clear();
      previewed.clear();
      tab = "tables";
      loaded = false;
      warmThumbs();
      nav.show();
      cosmeticStats.opened("home");
      void refresh();
      void shop.load().then(() => {
        loaded = true;
        if (!screen.hidden && !busy) draw();
      });
      queueMicrotask(() => tabTables.focus({ preventScroll: true }));
    },
    /** The screen is going (app.ts's show): the try-out and the try-on end. */
    leave(): void {
      stopListening(false);
      if (wearing) {
        wearing = null;
        tryOn.hidden = true;
        scroll.hidden = false;
        closed(tryOn);
      }
      busy = false;
    },
  };
}
