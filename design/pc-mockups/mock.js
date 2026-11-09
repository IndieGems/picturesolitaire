// PC LAYOUT MOCKUPS (design/pc-mockups/README.md): the real game, its own screens and pieces, laid out
// for a PC window, for pictures only. render.mts imports this into the running game (the play-test
// tool's dev server); the game never loads it. The words a mockup adds (key names, a panel's title) are
// English stand-ins: a chosen direction would put them in locales/en.json.
import { pretendViewport } from "/src/ui/top-row.ts";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
function el(tag, cls, ...kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
const key = (name) => el("span", "pcm-key", name);

const BORDER = "/.gemarcade/borders/sunny-day.jpg";
const GEM = "/node_modules/@indiegems/gem-web-sdk/brand/gem-icon-32-2x.png";
const COIN = "/node_modules/@indiegems/gem-web-sdk/brand/ticket-icon-32-2x.png";
const TOOLS = { undo: ["Undo", "Z"], hint: ["Hint", "H"], shuffle: ["Shuffle", "S"], restart: ["Restart", "R"] };
/** The config's Coins prices (docs/coins.md), shown where the play-test tool, with no config, has "…". */
const PRICES = { undo: [100, 270], hint: [150, 400], shuffle: [250, 675] };

/** The tool's name and key on each of the level screen's tool buttons (once: the screen is kept between levels). */
function labelTools(root) {
  for (const b of $$(".helpers .btn, .pcm-toolbar .btn", root)) {
    const k = Object.keys(TOOLS).find((c) => b.classList.contains(c));
    if (!k || $(".pcm-key", b)) continue;
    if (k !== "restart") b.append(el("span", "pcm-label", TOOLS[k][0]));
    b.append(key(TOOLS[k][1]));
  }
}
const BOXED = new Set(["box", "d"]);
const WIDE = new Set(["a", "b"]);

const kept = { itinerary: null, k: 1, width: 0, height: 0, cards: [] };

async function hold(from, to) {
  const p = await import("/src/net/progress.ts");
  for (let i = from; i <= to; i++) p.hold("dev-c" + i, { lane: "campaign", board: "c" + i, n: i, moves: 9, ms: 1, pictures: [] });
  window.__ps.marks({});
}

/** A friend in the Arcade's list, so the win card offers Challenge a friend (nothing is sent). */
async function friendStandIn() {
  const { gem } = await import("/src/gem.ts");
  if (gem.frame) gem.frame.parentSupports = () => true;
  const list = async () => ({ friends: [{ playerId: "p1", displayName: null, discriminator: null }] });
  try { Object.defineProperty(gem.friends, "list", { configurable: true, value: list }); } catch { gem.friends.list = list; }
  const fr = await import("/src/net/friends.ts");
  await fr.listFriends().catch(() => {});
}

/** The Arcade's corner, drawn where the Arcade draws it: its frame's top-left (the column, when letterboxed). */
async function arcadeCorner(mode) {
  const app = $("#app").getBoundingClientRect();
  const left = BOXED.has(mode) ? app.left : 0;
  const corner = el("div", "pcm-arcade");
  corner.style.left = `${left + 8}px`;
  corner.innerHTML = `<span class="pcm-gem"><img src="${GEM}" alt=""></span><span class="pcm-chip"><img src="${GEM}" alt="">1,240</span><span class="pcm-chip"><img src="${COIN}" alt="">3,850</span>`;
  document.body.append(corner);
  await Promise.all($$("img", corner).map((i) => i.decode().catch(() => {})));
  const g = corner.firstElementChild.getBoundingClientRect();
  const c = corner.getBoundingClientRect();
  const reserved = [
    { x: left, y: 0, width: g.right - left, height: g.bottom, control: { x: g.left, y: g.top, width: g.width, height: g.height } },
    { x: g.right + 8, y: 0, width: c.right - g.right - 8, height: c.bottom + 4, control: { x: g.right + 8, y: c.top, width: c.right - g.right - 8, height: c.height } },
  ];
  for (const [n, v] of [["--gem-reserved-tl-width", c.right - left], ["--gem-reserved-tl-height", c.bottom + 4], ["--gem-reserved-tl-center-y", g.top + g.height / 2], ["--gem-reserved-tl-control-height", g.height]]) {
    html.style.setProperty(n, `${Math.round(v)}px`);
  }
  pretendViewport({ insets: { top: 0, right: 0, bottom: 0, left: 0 }, reserved });
}

/** The mouse pointer at (x, y), its tip there. */
function cursor(x, y) {
  const c = el("div", "pcm-cursor");
  c.innerHTML = `<svg viewBox="0 0 26 38" width="26" height="38"><path d="M2 2 L2 30 L9 23.5 L14 35 L19 33 L14 21.5 L23 21.5 Z" fill="#fff" stroke="#111" stroke-width="2" stroke-linejoin="round"/></svg>`;
  c.style.left = `${x - 2}px`;
  c.style.top = `${y - 2}px`;
  document.body.append(c);
}
/** The pointer resting on `target`, a little right of its middle; the button lit as under a mouse. */
function hover(target, dx = 0.62, dy = 0.6) {
  if (!target) return;
  target.classList.add("pcm-hover");
  const r = target.getBoundingClientRect();
  cursor(r.left + r.width * dx, r.top + r.height * dy);
}
/** A tooltip beside `target`: its title (with a key), a line under it. side: "left", "right", "above". */
function tip(target, title, line, side = "left", keyName) {
  const r = target.getBoundingClientRect();
  const t = el("div", "pcm-tip", el("b", null, title, keyName ? key(keyName) : null), line ? el("span", null, line) : null);
  document.body.append(t);
  const w = t.offsetWidth, h = t.offsetHeight;
  const at = side === "left" ? [r.left - w - 14, r.top + r.height / 2 - h / 2] : side === "right" ? [r.right + 14, r.top + r.height / 2 - h / 2] : [r.left + r.width / 2 - w / 2, r.top - h - 14];
  t.style.left = `${Math.round(at[0])}px`;
  t.style.top = `${Math.round(at[1])}px`;
}

/** Keep copies of pieces drawn elsewhere: home's itinerary, and this trip's postcards from the passport. */
async function keepPieces() {
  const it = $(".home .itinerary");
  const r = it.getBoundingClientRect();
  kept.itinerary = it.cloneNode(true);
  kept.k = parseFloat(getComputedStyle($("section.screen.home")).getPropertyValue("--k")) || 1;
  kept.width = r.width;
  kept.height = r.height;
  window.__ps.passport("t17");
  await sleep(3200);
  kept.cards = $$(".passport-screen .pp-grid > .pc").map((c) => c.cloneNode(true));
  $(".passport-screen .top-back").click();
  await sleep(1500);
}

/** The trip so far, as home draws it, scaled to `width`. */
function itinerary(width) {
  const s = Math.min(1, width / kept.width);
  const scope = el("div", "home pcm-scope itin-wrap");
  scope.style.cssText = `--k:${kept.k};--pin:calc(44px * var(--k));width:${kept.width * s}px;height:${kept.height * s}px`;
  const it = kept.itinerary.cloneNode(true);
  it.style.cssText = `width:${kept.width}px;transform:scale(${s});transform-origin:0 0;margin:0`;
  for (const sv of $$(".souvenir-tile", it)) sv.remove();
  scope.append(it);
  return scope;
}
/** Postcards from this trip: the last one found, and the sealed one this level holds. */
function postcards(found) {
  const panel = el("section", "pcm-panel glass", el("h3", null, "Postcards from Brazil", el("small", null, `${found} of 15 found`)));
  const row = el("div", "pcm-cards pp-grid");
  row.style.display = "flex";
  row.append(kept.cards[found - 1].cloneNode(true), kept.cards[found].cloneNode(true));
  panel.append(row);
  return panel;
}

// ------------------------------------------------------------------ steps

export async function setup(mode) {
  html.classList.add("pcm", `pcm-${mode}`, "arcade-menu");
  if (WIDE.has(mode)) html.classList.add("pcm-wide");
  if (BOXED.has(mode)) html.classList.add("pcm-box");
  html.style.setProperty("--pcm-border", `url("${BORDER}")`);
  const link = el("link");
  link.rel = "stylesheet";
  link.href = "/design/pc-mockups/mock.css";
  await new Promise((ok) => { link.onload = ok; link.onerror = ok; document.head.append(link); });
  await hold(1, 249);
  await friendStandIn();
  await sleep(1500);
  await arcadeCorner(mode);
  if (mode === "a" || mode === "b" || mode === "c") await keepPieces();
  await sleep(800);
  return { app: Math.round($("#app").getBoundingClientRect().width), border: await fetch(BORDER, { method: "HEAD" }).then((r) => r.status) };
}

export async function home(mode) {
  const scr = $("section.screen.home");
  if (mode === "a") {
    const hub = el("aside", "pcm-hub glass");
    const tiles = [...$(".home .dock").children].filter((t) => !t.hidden);
    hub.append(...tiles, el("div", "pcm-hub-sp"), $(".home .event-strip"));
    scr.append(hub);
    $(".home .play").append(key("Enter"));
    await sleep(900);
    hover($(".pcm-hub .passport"), 0.55, 0.55);
  }
  if (mode === "b") {
    const bar = el("nav", "pcm-topbar");
    for (const t of [...$(".home .dock").children].filter((x) => !x.hidden)) bar.append(t);
    scr.append(bar);
    const lead = el("div", "pcm-lead", $(".home .home-title"), $(".home .play"), $(".home .event-strip"));
    scr.prepend(lead);
    $(".home .play").append(key("Enter"));
    await sleep(1200);
    const next = $(".home .tr-stop.next .tr-pin");
    if (next) { tip(next, "Level 250 · Hard", "Stop 10: your next postcard is here", "right"); cursor(next.getBoundingClientRect().left + 30, next.getBoundingClientRect().top + 34); }
  }
  if (mode === "c") {
    const left = el("aside", "home pcm-c-side left");
    const right = el("aside", "home pcm-c-side right");
    const stamps = el("section", "pcm-panel glass pcm-stamps", el("h3", null, "Your passport", el("small", null, "16 stamps · Brazil next")));
    const grid = el("div", "pcm-stamp-grid");
    for (let i = 1; i <= 16; i++) { const im = el("img"); im.src = `/art/stamps/stamp-t${i}.webp`; im.alt = ""; grid.append(im); }
    stamps.append(grid);
    left.append(stamps);
    const tiles = el("div", "pcm-c-tiles");
    tiles.append(...[...$(".home .dock").children].filter((t) => !t.hidden));
    right.append(tiles, $(".home .event-strip"));
    document.body.append(left, right);
    $(".home .play").append(key("Enter"));
    await sleep(1500);
    hover($(".pcm-c-tiles .daily-btn"), 0.8, 0.84);
  }
  if (mode === "d") {
    $(".home .play").append(key("Enter"));
    await sleep(500);
    const pass = $(".home .tile-btn.passport");
    hover(pass, 0.66, 0.3);
    tip(pass, "Passport", "Your stamps and postcards", "above", "P");
  }
  await sleep(700);
}

export async function shop(mode) {
  $(".home .tile-btn.shop, .pcm-hub .shop, .pcm-topbar .shop").click();
  await sleep(1800);
  for (const c of $$(".pcm-cursor, .pcm-tip")) c.remove();
  for (const b of $$(".pcm-hover")) b.classList.remove("pcm-hover");
  const card = $(".veil.shop .card");
  if (card) card.append(el("span", "pcm-esc pcm-key", "Esc"));
  for (const item of $$(".veil.shop .shop-item")) {
    const k = Object.keys(PRICES).find((x) => $(`img[src*="helper-${x}"]`, item));
    if (!k) continue;
    $$(".shop-buy .buy-words", item).forEach((w, i) => { w.innerHTML = `${i ? 3 : 1} for <b>${PRICES[k][i]}</b> <img class="pcm-coin" src="${COIN}" alt="">`; });
  }
  await sleep(500);
  hover($$(".veil.shop .shop-buy")[5], 0.5, 0.6);
  await sleep(500);
}

export async function closeShop() {
  for (const b of $$(".pcm-hover")) b.classList.remove("pcm-hover");
  for (const c of $$(".pcm-cursor, .pcm-tip")) c.remove();
  $(".veil.shop .corner-key")?.click();
  await sleep(1200);
}

/** Open level n and lay its screen out for `mode`. */
export async function level(mode, n = 250, found = 9) {
  for (const c of $$(".pcm-cursor, .pcm-tip, .pcm-card-hover, .pcm-c-side:not(.board-side)")) c.remove();
  window.__ps.openLevel(n);
  for (let i = 0; i < 40 && !window.__ps.board(); i++) await sleep(250);
  await sleep(3500);
  const bs = $(".board-screen");
  const back = $(".top-back", bs);
  if (mode !== "box" && mode !== "today" && mode !== "c" && !$(".pcm-key", back)) back.append(key("Esc"));
  if (mode === "a") {
    labelTools(bs);
    const left = el("div", "pcm-left");
    bs.append(left);
    left.append(itinerary(left.clientWidth), postcards(found));
  }
  if (mode === "b") {
    let bar = $(".pcm-toolbar", bs);
    if (!bar) {
      bar = el("div", "pcm-toolbar glass");
      const pill = $(".top-pill", bs);
      bar.append(el("span", "pcm-tb-level", ...[...pill.childNodes].map((x) => x.cloneNode(true))), el("i", "pcm-tb-sep"));
      for (const b of $$(".helpers .btn", bs)) if (Object.keys(TOOLS).some((c) => b.classList.contains(c))) bar.append(b);
      bs.append(bar);
    } else {
      const pill = $(".top-pill", bs);
      $(".pcm-tb-level", bar).replaceChildren(...[...pill.childNodes].map((x) => x.cloneNode(true)));
    }
    labelTools(bs);
    const drawer = el("aside", "pcm-drawer glass");
    const grid = el("div", "pcm-drawer-grid");
    kept.cards.forEach((c, i) => { const x = c.cloneNode(true); if (i === found) x.classList.add("pcm-now"); grid.append(x); });
    const fold = el("button", "btn round pcm-fold");
    fold.type = "button";
    fold.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const latest = el("div", "pcm-latest", el("h4", null, "Latest postcard"), kept.cards[found - 1].cloneNode(true));
    drawer.append(el("div", "pcm-drawer-head", el("h3", null, "Brazil", el("small", null, `Stop ${found + 1} of 15 · ${found} postcards`)), fold), grid, latest);
    bs.append(drawer);
  }
  if (mode === "c") {
    const left = el("aside", "home pcm-c-side left board-side");
    document.body.append(left);
    left.append(itinerary(left.clientWidth), postcards(found));
    const right = el("aside", "pcm-c-side right board-side");
    const keys = el("section", "pcm-panel glass pcm-keys", el("h3", null, "Keys"));
    for (const [name, k] of [["Undo", "Z"], ["Hint", "H"], ["Shuffle", "S"], ["Restart", "R"], ["Back", "Esc"]]) keys.append(el("p", null, key(k), el("span", null, name)));
    keys.append(el("p", "pcm-keys-note", "Drag a piece with the mouse, or click it and then click where it goes."));
    right.append(keys);
    document.body.append(right);
  }
  await sleep(1200);
  if (mode === "a" || mode === "b") cardHover(bs, 7);
  if (mode === "c") cardHover(bs, 12);
  if (mode === "d") {
    const hint = $(".helpers .hint", bs);
    hover(hint, 0.55, 0.55);
    tip(hint, "Hint", "Shows two pieces that fit", "above", "H");
  }
  await sleep(500);
}

/** The pointer over the i-th card of the grid, ringed as a mouse would light it. */
function cardHover(bs, i) {
  // the grid's cards: the commonest card-shaped box on the board (the stacks' are smaller)
  const rects = $$(".bd-plane *", bs).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 30 && Math.abs(r.width / r.height - 0.75) < 0.06);
  const count = new Map();
  for (const r of rects) { const s = `${Math.round(r.width)}x${Math.round(r.height)}`; count.set(s, (count.get(s) ?? 0) + 1); }
  const size = [...count.entries()].sort((p, q) => q[1] - p[1])[0]?.[0];
  const seen = new Set();
  const cards = rects
    .filter((r) => `${Math.round(r.width)}x${Math.round(r.height)}` === size)
    .filter((r) => { const s = `${Math.round(r.left)},${Math.round(r.top)}`; if (seen.has(s)) return false; seen.add(s); return true; })
    .sort((p, q) => p.top - q.top || p.left - q.left);
  const r = cards[Math.min(i, cards.length - 1)];
  if (!r) return;
  const ring = el("div", "pcm-card-hover");
  ring.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
  document.body.append(ring);
  cursor(r.left + r.width * 0.58, r.top + r.height * 0.55);
}

/** Level 255, the trip's last, won: its trip-end win card over the board laid out for `mode`. */
export async function win(mode) {
  for (const c of $$(".pcm-cursor, .pcm-tip, .pcm-card-hover, .pcm-c-side.board-side, .pcm-left, .pcm-drawer, .pcm-toolbar")) c.remove();
  $(".board-screen .top-back")?.click();
  await sleep(1500);
  await hold(250, 254);
  await sleep(1500);
  if (mode === "a" || mode === "b" || mode === "c") await keepPieces();
  await level(mode, 255, 14);
  for (const c of $$(".pcm-cursor, .pcm-tip, .pcm-card-hover")) c.remove();
  if (mode === "c") html.classList.add("pcm-dimmed");
  await window.__ps.board().dev.winNow(0);
  await sleep(5000);
  const next = $(".veil.win .btn.next");
  // in the column's narrow card the key sits on the button's top edge, so its words keep their line
  if (next) next.append(el("span", `pcm-key${mode === "c" || mode === "d" ? " pcm-key-corner" : ""}`, "Enter"));
  if (mode === "b") {
    // a PC card has the room to show the level's pictures big: the same pictures, in a grid, the postcard first and largest
    const g = $(".veil.win .gallery");
    const grid = el("div", "pcm-wingrid");
    for (const p of $$(".pic", g)) {
      const img = $("img", p);
      const c = p.cloneNode(true);
      c.removeAttribute("style");
      c.style.setProperty("--ar", `${img.naturalWidth || 3} / ${img.naturalHeight || 4}`);
      grid.append(c);
    }
    g.replaceWith(grid);
    // the words and actions in the middle of the right half: a row each, between two that take the spare height
    const card = $(".veil.win .card");
    const right = $$(":scope > *, :scope > .card-body > *", card)
      .filter((e) => !e.matches(".card-body, .corner-key, .pcm-wingrid") && getComputedStyle(e).position !== "absolute" && e.offsetHeight);
    card.style.gridTemplateRows = `1fr repeat(${right.length}, auto) 1fr`;
    right.forEach((e, i) => (e.style.gridRow = String(i + 2)));
    grid.style.gridRow = "1 / -1";
  }
  await sleep(600);
  if (mode !== "box" && mode !== "today") hover(next, 0.7, 0.6);
  await sleep(400);
  return { card: !!$(".veil.win:not([hidden]) .card") };
}
