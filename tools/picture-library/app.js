// The Picture Library's page. Everything it shows comes from /api/library (server.mjs), asked
// again whenever /api/stamp says a file it is made from changed, so new pictures and re-dealt
// boards appear by themselves. The view's choices (grouping, filters, the open picture) live in
// the address's #hash, so a reload keeps them; nothing is kept in browser storage.

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? "" : v);
  }
  n.append(...kids.filter((k) => k !== null && k !== undefined && k !== false));
  return n;
};

const QUICK_NOTES = ["Too dark", "Looks AI-ish", "Too busy", "Hard to tell apart", "Cut lines spoil it", "Blurry"];
/**
 * What this page saves through the library's server: 2 is the flag and the redraw mark (server.mjs's API).
 * A server started before then (it reads this page from disk, so the page can be newer than it) answers
 * /api/version with a 404, or a smaller number: the page then says so at the top, before anything is
 * marked (the creator, 2026-10-30, after marks that were never saved).
 */
const PAGE_API = 2;
/** The server's word on what it can save: null until asked, 0 when it is too old to say. */
let serverApi = null;
const LANE_WORDS = { campaign: "Campaign", challenge: "Challenge route", daily: "Daily puzzle", "event-levels": "VIP events" };

/** Palette words as the catalogue writes them, as colours to show. */
const SWATCH = {
  orange: "#f08a3c", peach: "#f6b996", coral: "#f27b6b", gold: "#d9a62e", violet: "#8a62c9",
  pink: "#f19ac0", blush: "#f2c4c8", rose: "#e0607e", cream: "#f3ead2", "fresh green": "#7cc56a",
  rust: "#b5562b", amber: "#e9a23b", red: "#d63a35", ochre: "#c58f2a", brown: "#7a5233",
  azure: "#3a9be0", cobalt: "#2350b8", turquoise: "#3cc8c0", white: "#f7f7f4", navy: "#24345e",
  straw: "#e6cf7e", honey: "#d9a441", "sky blue": "#8cc7ee", sky: "#8cc7ee", lavender: "#b7a3e0",
  purple: "#7d4aa8", sage: "#9cb08f", stone: "#a39d92", green: "#3f9a4f", emerald: "#1f9a6e",
  lime: "#a8d64a", moss: "#6f7f3a", "deep blue": "#1f3f8a", blue: "#3b6fd1", indigo: "#3f3a8f",
  teal: "#23857f", crimson: "#b8203b", cherry: "#c0263f", lemon: "#f2e05a", yellow: "#f5d33b",
};
const swatchColour = (word) => SWATCH[word] ?? (CSS.supports("color", word.replace(/\s+/g, "")) ? word.replace(/\s+/g, "") : "#777");

const words = (slug) => {
  const s = String(slug ?? "").replace(/[-_]+/g, " ").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : "No family";
};
/** A family's own title (Art's plan), else its id in words. */
const familyName = (id) => (id === SOLO ? "No look-alikes" : lib?.familyTitles?.[id] ?? words(id));
/** Pictures with no look-alike (a family of one, as Art gives a picture its own id) share one group. */
const SOLO = "__solo";
const familyOf = (p) => {
  const f = p.family ?? "";
  return f && lib.pictures.some((q) => q !== p && (q.family ?? "") === f) ? f : SOLO;
};
const mediumWord = (m) => ({ photo: "Photo", painting: "Painting", "low-poly": "Low-poly", papercut: "Paper cut" })[m] ?? words(m);
const BUSY = ["Calm", "Some detail", "Busy"];
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const sizeOf = (p) => `${p.cols}×${p.rows}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso || "";
};
/** "1, 4, 9" for a short list; "1, 4, 9 … 30" past a dozen. */
const listOf = (ns) => (ns.length <= 12 ? ns.join(", ") : `${ns.slice(0, 10).join(", ")} … ${ns.at(-1)}`);

// ---------------------------------------------------------------------------
// State

let lib = null;
let stamp = "";
const view = { group: "album", find: "", medium: "", size: "", family: "", show: "", open: "" };

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(view)) view[k] = h.get(k) ?? (k === "group" ? "album" : "");
  if (!["album", "family"].includes(view.group)) view.group = "album";
}
function writeHash() {
  const h = new URLSearchParams();
  for (const [k, v] of Object.entries(view)) if (v && !(k === "group" && v === "album")) h.set(k, v);
  const next = h.toString();
  if (next !== location.hash.slice(1)) history.replaceState(null, "", next ? `#${next}` : location.pathname);
}

const byId = (id) => lib?.pictures.find((p) => p.id === id);
/** A card's width ÷ height (the board's tuning, read by the server). */
const cardAspect = () => lib?.cardAspect ?? 1;
/** The window the game shows of a picture: cols cards across, rows down, in the card's shape. */
const windowAspect = (p) => (p.cols * cardAspect()) / p.rows;
const imageAspect = (p) => (Array.isArray(p.px) && p.px[1] ? p.px[0] / p.px[1] : null);
/** Made for another card shape: the game crops its edges off (centre-cropped) until it is redrawn. */
const isCropped = (p) => {
  const i = imageAspect(p);
  return i !== null && Math.abs(i / windowAspect(p) - 1) > 0.01;
};
/** 0.75 as "3:4". */
const ratioWords = (a) => {
  for (let d = 1; d <= 12; d++) if (Math.abs(a * d - Math.round(a * d)) < 0.01) return `${Math.round(a * d)}:${d}`;
  return a.toFixed(2);
};
const isFlagged = (p) => p.flag?.flagged === true;
/** Marked to be redrawn cleaner (the creator, 2026-10-30): still in the game, on Art's to-do list. */
const isRedraw = (p) => p.redraw?.redraw === true;
// Don't-use pictures sort to the bottom of every group (the creator, 2026-10-30). While a picture is
// open the order holds still (`sunk`, frozen at opening), so flagging one never makes Next skip
// ahead; it moves down when the sheet closes.
let sunk = null;
const sinks = (p) => (sunk ? sunk.has(p.id) : isFlagged(p));
const flaggedLast = (ps) => [...ps.filter((p) => !sinks(p)), ...ps.filter(sinks)];
const imgUrl = (p, big = false) => {
  if (!big && p.thumbV) return `/${p.thumb}?v=${p.thumbV}`;
  if (p.fileV) return `/${p.file}?v=${p.fileV}`;
  return null;
};

function matches(p) {
  if (view.medium && p.medium !== view.medium) return false;
  if (view.size && sizeOf(p) !== view.size) return false;
  if (view.family && familyOf(p) !== view.family) return false;
  if (view.show === "flagged" && !isFlagged(p)) return false;
  if (view.show === "ok" && isFlagged(p)) return false;
  if (view.show === "redraw" && !isRedraw(p)) return false;
  if (view.show === "unused" && p.usedTotal > 0) return false;
  if (view.show === "cropped" && !isCropped(p)) return false;
  if (view.find) {
    const q = view.find.toLowerCase();
    const hay = [p.title, p.id, p.album, p.family, ...(p.subjects ?? []), ...(p.palette ?? [])].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** The pictures shown, in the order the grid draws them (prev/next follow it). */
function shownInOrder() {
  const shown = lib.pictures.filter(matches);
  return groups(shown).flatMap((g) => g.pictures);
}

// The newest batch of pictures (the catalogue's `batch`, a date-first label Art writes on each new
// picture, e.g. "2026-10-30 new library") shows first as a group of its own, so the creator can review
// it in one place (the creator, 2026-10-30). Its pictures leave their album groups while it is the
// newest; an older batch's pictures go back to their albums.
const newestBatch = () => lib.pictures.map((p) => p.batch).filter((b) => typeof b === "string" && b).sort().pop() ?? "";
const batchLabel = (b) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})\s*(.*)$/.exec(b);
  if (!m) return `New: ${b}`;
  const when = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
  return `New, ${when}${m[4] ? `: ${m[4]}` : ""}`;
};

// Pictures put up for review (the server's `review`, a group title, e.g. the turned-away people
// pictures a level still deals) show first, above the newest batch, each review a group of its own
// (the creator, 2026-10-30).
function groups(list) {
  const reviews = [...new Set(lib.pictures.map((p) => p.review).filter((r) => typeof r === "string" && r))];
  const top = reviews
    .map((r) => ({ key: `review:${r}`, title: r, all: lib.pictures.filter((p) => p.review === r).length, pictures: flaggedLast(list.filter((p) => p.review === r)) }))
    .filter((g) => g.pictures.length);
  list = list.filter((p) => !p.review);
  const batch = newestBatch();
  const fresh = batch ? list.filter((p) => p.batch === batch) : [];
  const head = fresh.length ? [{ key: `batch:${batch}`, title: batchLabel(batch), all: lib.pictures.filter((p) => p.batch === batch).length, pictures: flaggedLast(fresh) }] : [];
  if (batch) list = list.filter((p) => p.batch !== batch);
  return [...top, ...head, ...groupsBy(list)];
}

function groupsBy(list) {
  if (view.group === "family") {
    // real families by name, then the pictures with no look-alike
    const keys = [...new Set(lib.pictures.map(familyOf))].sort((a, b) => (a === SOLO) - (b === SOLO) || familyName(a).localeCompare(familyName(b)));
    return keys.map((k) => ({ key: k, title: familyName(k), all: lib.pictures.filter((p) => familyOf(p) === k).length, pictures: flaggedLast(list.filter((p) => familyOf(p) === k)) })).filter((g) => g.pictures.length);
  }
  const albums = [...lib.albums];
  // a picture whose album the catalogue does not list still shows, under its own album id
  for (const p of lib.pictures) if (!albums.some((a) => a.id === p.album)) albums.push({ id: p.album, title: words(p.album) });
  return albums.map((a) => ({ key: a.id, title: a.title, all: lib.pictures.filter((p) => p.album === a.id).length, pictures: flaggedLast(list.filter((p) => p.album === a.id)) })).filter((g) => g.pictures.length);
}

// ---------------------------------------------------------------------------
// The grid

function fillSelect(select, values, label = (v) => v) {
  const keep = select.value;
  select.replaceChildren(el("option", { value: "", text: "All" }), ...values.map((v) => el("option", { value: v, text: label(v) })));
  select.value = values.includes(keep) ? keep : "";
}

function drawFilters() {
  const sizes = [...new Set(lib.pictures.map(sizeOf))].sort((a, b) => {
    const [ac, ar] = a.split("×").map(Number);
    const [bc, br] = b.split("×").map(Number);
    return ac * ar - bc * br || ac - bc;
  });
  fillSelect($("size"), sizes, (s) => s.replace("×", " × "));
  const fams = [...new Set(lib.pictures.map(familyOf))].sort((a, b) => (a === SOLO) - (b === SOLO) || familyName(a).localeCompare(familyName(b)));
  fillSelect($("family"), fams, familyName);
  const media = [...new Set(lib.pictures.map((p) => p.medium).filter(Boolean))].sort((a, b) => mediumWord(a).localeCompare(mediumWord(b)));
  fillSelect($("medium"), media, mediumWord);
  for (const id of ["find", "medium", "size", "family", "show"]) {
    const n = $(id);
    if (n !== document.activeElement) n.value = view[id];
  }
  for (const b of document.querySelectorAll(".seg button")) b.setAttribute("aria-checked", String(b.dataset.group === view.group));
}

function drawNotes() {
  const notes = $("notes");
  notes.replaceChildren();
  // the server is older than the page: marks for redraw cannot be saved until it is restarted
  if (serverApi !== null && serverApi < PAGE_API)
    notes.append(
      el(
        "p",
        { class: "note alert stale" },
        el("b", { text: "Redraw marks can't be saved yet." }),
        " The Picture Library's server is older than this page. Ask for the library to be restarted, then reload this tab. Don't-use flags still save.",
      ),
    );
  for (const problem of lib.problems) notes.append(el("p", { class: "note", text: problem }));
  const stuck = lib.pictures.filter((p) => isFlagged(p) && p.usedTotal > 0);
  if (stuck.length) {
    const boards = stuck.reduce((n, p) => n + p.usedTotal, 0);
    const who = stuck
      .slice(0, 6)
      .map((p) => `${p.title} (${p.usedTotal})`)
      .join(", ");
    notes.append(
      el(
        "p",
        { class: "note alert" },
        el("b", { text: `${plural(stuck.length, "flagged picture is", "flagged pictures are")} still in ${plural(boards, "board")}` }),
        `: ${who}${stuck.length > 6 ? ", …" : ""}. The team needs to re-deal them (the Levels member runs `,
        el("code", { text: "node tools/levels/redeal.mts" }),
        ").",
      ),
    );
  }
}

function tile(p) {
  const url = imgUrl(p);
  const flagged = isFlagged(p);
  const redraw = isRedraw(p);
  const meta = [sizeOf(p), mediumWord(p.medium)];
  const metaLine = el("span", { class: "meta", text: meta.join(" · ") + " · " });
  metaLine.append(
    flagged && p.usedTotal
      ? el("span", { class: "redeal", text: `in ${plural(p.usedTotal, "board")}: re-deal` })
      : p.usedTotal
        ? `in ${plural(p.usedTotal, "board")}`
        : "in no board",
  );
  return el(
    "button",
    {
      type: "button",
      class: `tile${flagged ? " flagged" : ""}${redraw ? " redraw" : ""}`,
      "data-id": p.id,
      onclick: () => openDetail(p.id),
      title: [flagged && p.flag.note ? `Don't use: ${p.flag.note}` : "", redraw ? `Redraw${p.redraw.note ? `: ${p.redraw.note}` : ""}` : ""].filter(Boolean).join(" · ") || null,
    },
    // the picture as the game shows it: its cards' shape, centre-cropped
    el(
      "span",
      { class: "frame" },
      el(
        "span",
        { class: `shape ${windowAspect(p) >= 1 ? "wide" : "tall"}`, style: `--ar:${windowAspect(p)}` },
        url ? el("img", { src: url, alt: "", loading: "lazy", decoding: "async" }) : el("span", { class: "missing", text: "No picture file yet" }),
      ),
      redraw ? el("span", { class: "badge-redraw", text: "Redraw" }) : null,
    ),
    el("span", { class: "name", text: p.title ?? p.id }),
    metaLine,
  );
}

function drawGrid() {
  const shown = lib.pictures.filter(matches);
  const flagged = lib.pictures.filter(isFlagged).length;
  const redraws = lib.pictures.filter(isRedraw).length;
  const families = new Set(lib.pictures.map(familyOf).filter((f) => f !== SOLO)).size;
  $("count").textContent =
    `${plural(lib.pictures.length, "picture")} · ${plural(lib.albums.length, "album")} · ${plural(families, "family", "families")} · ${flagged} flagged · ${redraws} to redraw · cards ${ratioWords(cardAspect())}` +
    (shown.length !== lib.pictures.length ? ` · showing ${shown.length}` : "");
  const grid = $("grid");
  const sections = groups(shown).map((g) =>
    el(
      "section",
      { class: "section" },
      el("h2", {}, g.title, el("small", { text: g.pictures.length === g.all ? plural(g.all, "picture") : `${g.pictures.length} of ${g.all}` })),
      el("div", { class: "tiles" }, ...g.pictures.map(tile)),
    ),
  );
  grid.replaceChildren(...(sections.length ? sections : [el("p", { class: "empty", text: "No picture matches these filters." })]));
}

function drawAll() {
  drawFilters();
  drawNotes();
  drawGrid();
  if (view.open) {
    if (byId(view.open)) drawDetail();
    else closeDetail();
  }
}

// ---------------------------------------------------------------------------
// One picture, large

let noteDirty = false;
let noteTimer = 0;
let rdDirty = false;
let rdTimer = 0;

function openDetail(id) {
  if (view.open && view.open !== id) {
    flushNote();
    flushRedraw();
  }
  if (!view.open) sunk = new Set(lib.pictures.filter(isFlagged).map((p) => p.id));
  view.open = id;
  writeHash();
  noteDirty = false;
  rdDirty = false;
  $("d-saved").textContent = "";
  $("d-rd-saved").textContent = "";
  $("detail").hidden = false;
  // each picture opens at its top
  document.querySelector(".sheet").scrollTop = 0;
  drawDetail(true);
  $("d-close").focus({ preventScroll: true });
}

function closeDetail() {
  flushNote();
  flushRedraw();
  view.open = "";
  writeHash();
  $("detail").hidden = true;
  sunk = null;
  drawGrid();
  const back = document.querySelector(`.tile[data-id="${CSS.escape(lastOpened)}"]`);
  back?.focus({ preventScroll: false });
}

let lastOpened = "";

/** The window the game shows of an iw × ih image, centred (x, y, w, h in image pixels). */
function windowOf(p, iw, ih) {
  const a = windowAspect(p);
  if (iw / ih > a) return { x: (iw - ih * a) / 2, y: 0, w: ih * a, h: ih };
  return { x: 0, y: (ih - iw / a) / 2, w: iw, h: iw / a };
}

/** Over the whole image: the edges the game crops off shaded, the window outlined, its card cut lines. */
function cutLines(p, iw, ih) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${iw} ${ih}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const add = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    svg.append(n);
  };
  const w = windowOf(p, iw, ih);
  const cropped = w.w < iw - 1 || w.h < ih - 1;
  if (cropped) {
    add("path", { d: `M0 0H${iw}V${ih}H0Z M${w.x} ${w.y}h${w.w}v${w.h}h${-w.w}Z`, "fill-rule": "evenodd", fill: "rgba(10,14,22,0.66)" });
    add("rect", { x: w.x, y: w.y, width: w.w, height: w.h, fill: "none", stroke: "#ffd28a", "stroke-width": 2, "vector-effect": "non-scaling-stroke" });
  }
  const line = (x1, y1, x2, y2) => {
    for (const [stroke, width] of [["rgba(20,28,40,0.55)", 5], ["rgba(255,255,255,0.95)", 2]]) add("line", { x1, y1, x2, y2, stroke, "stroke-width": width, "vector-effect": "non-scaling-stroke" });
  };
  for (let c = 1; c < p.cols; c++) line(w.x + (c * w.w) / p.cols, w.y, w.x + (c * w.w) / p.cols, w.y + w.h);
  for (let r = 1; r < p.rows; r++) line(w.x, w.y + (r * w.h) / p.rows, w.x + w.w, w.y + (r * w.h) / p.rows);
  return svg;
}

function usedRows(p) {
  const rows = [];
  for (const lane of ["campaign", "challenge", "daily", "event-levels"]) {
    // a library server from before the events were counted sends no event lane: leave the row out
    if (!(lane in p.used)) continue;
    const list = p.used[lane];
    if (!list.length) {
      rows.push(el("li", {}, el("b", { text: `${LANE_WORDS[lane]}: ` }), el("span", { text: "not in any board" })));
      continue;
    }
    let detail;
    if (lane === "campaign") detail = `Level${list.length > 1 ? "s" : ""} ${listOf(list.map((b) => b.n))}`;
    else if (lane === "challenge") detail = `Challenge${list.length > 1 ? "s" : ""} ${listOf(list.map((b) => b.n))}`;
    else if (lane === "event-levels") {
      const byEvent = new Map();
      for (const b of list) byEvent.set(b.event, [...(byEvent.get(b.event) ?? []), b.n]);
      detail = [...byEvent].map(([name, ns]) => `${name} level${ns.length > 1 ? "s" : ""} ${listOf(ns)}`).join("; ");
    } else {
      const ahead = list.filter((b) => b.ahead);
      detail = ahead.length ? `${ahead.length} still to come, next on ${day(ahead[0].date)}` : `all in the past (last ${day(list.at(-1).date)})`;
    }
    rows.push(el("li", {}, el("b", { text: `${LANE_WORDS[lane]}: ${plural(list.length, "board")}` }), " ", el("span", { text: `(${detail})` })));
  }
  const of = Object.values(lib.boards).reduce((a, b) => a + b, 0);
  rows.push(el("li", {}, el("span", { text: `${plural(p.usedTotal, "board")} in all, of ${of}.` })));
  return rows;
}

function drawDetail(fresh = false) {
  const p = byId(view.open);
  if (!p) return;
  lastOpened = p.id;
  const flagged = isFlagged(p);
  $("d-title").textContent = p.title ?? p.id;
  const album = lib.albums.find((a) => a.id === p.album)?.title ?? words(p.album);
  $("d-sub").textContent = `${album} album · ${mediumWord(p.medium)}`;

  // the whole image, with what the game shows of it: the catalogue's size first, else the file's own
  const cut = $("d-cut");
  const img = $("d-img");
  const url = imgUrl(p, true);
  const drawCut = () => {
    if (view.open !== p.id) return;
    const iw = imageAspect(p) ? p.px[0] : img.naturalWidth || p.cols * 300;
    const ih = imageAspect(p) ? p.px[1] : img.naturalHeight || p.rows * 400;
    cut.style.aspectRatio = `${iw} / ${ih}`;
    cut.querySelector("svg")?.remove();
    cut.append(cutLines(p, iw, ih));
  };
  img.onload = drawCut;
  if (url) {
    if (img.getAttribute("src") !== url) img.src = url;
    img.hidden = false;
  } else {
    img.removeAttribute("src");
    img.hidden = true;
  }
  drawCut();
  const cards = `Cut into ${plural(p.cols * p.rows, "card")}: ${p.cols} across, ${p.rows} down, each ${ratioWords(cardAspect())}.`;
  $("d-cutnote").textContent = !url
    ? "No picture file yet."
    : isCropped(p)
      ? `${cards} The shaded edges don't show in the game: this picture was made for another card shape and is cropped to fit until it is redrawn.`
      : cards;

  const warn = $("d-warn");
  warn.hidden = !(flagged && p.usedTotal > 0);
  if (!warn.hidden) warn.replaceChildren(el("b", { text: `In ${plural(p.usedTotal, "board")}:` }), " the team needs to re-deal them.");

  const solo = familyOf(p) === SOLO;
  const fam = solo ? [p] : lib.pictures.filter((q) => familyOf(q) === familyOf(p));
  const facts = [
    ["Size", `${p.cols} × ${p.rows} cards`],
    ["Family", solo ? "None: no look-alike" : `${familyName(p.family)} (${plural(fam.length, "picture")})`],
    ["Busyness", Number.isInteger(p.busy) && BUSY[p.busy] ? BUSY[p.busy] : "–"],
    ["Palette", el("span", { class: "swatches" }, ...(p.palette ?? []).map((w) => el("span", { class: "swatch" }, el("i", { style: `background:${swatchColour(w)}` }), w)))],
    ["Subjects", (p.subjects ?? []).join(", ") || "–"],
    ["Image", Array.isArray(p.px) ? `${p.px[0]} × ${p.px[1]} px` : "–"],
    ["Name in files", el("code", { text: p.id })],
  ];
  $("d-facts").replaceChildren(...facts.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", {}, v)]));
  $("d-used").replaceChildren(...usedRows(p));

  const others = fam.filter((q) => q.id !== p.id);
  $("d-alike").replaceChildren(
    ...(others.length
      ? others.map((q) => el("button", { type: "button", onclick: () => openDetail(q.id), title: q.title }, imgUrl(q) ? el("img", { src: imgUrl(q), alt: "" }) : null, (isFlagged(q) ? "Don't use · " : "") + (q.title ?? q.id)))
      : [el("span", { class: "sub", text: "No other picture in this family." })]),
  );

  // the flag: the switch saves at once, the note as the typing stops; never overwrite a note being typed
  $("d-flagged").checked = flagged;
  const note = $("d-note");
  if (fresh || (!noteDirty && note !== document.activeElement)) note.value = p.flag?.note ?? "";
  if (!noteDirty) {
    const saved = $("d-saved");
    if (!saved.classList.contains("err") && !saved.dataset.just) saved.textContent = p.flag?.date ? `${flagged ? "Flagged" : "Unflagged"} on ${day(p.flag.date)}` : "";
  }

  // the redraw mark: its own switch and note, saved the same way, never touching the flag
  const redraw = isRedraw(p);
  $("d-rd-on").checked = redraw;
  const rdNote = $("d-rd-note");
  if (fresh || (!rdDirty && rdNote !== document.activeElement)) rdNote.value = p.redraw?.note ?? "";
  if (!rdDirty) {
    const saved = $("d-rd-saved");
    if (!saved.classList.contains("err") && !saved.dataset.just) saved.textContent = p.redraw?.date ? `${redraw ? "Marked" : "Unmarked"} on ${day(p.redraw.date)}` : "";
  }

  const order = shownInOrder();
  const i = order.findIndex((q) => q.id === p.id);
  $("d-prev").disabled = i <= 0;
  $("d-next").disabled = i < 0 || i >= order.length - 1;
}

async function saveFlag(flagged, note) {
  const id = view.open;
  const saved = $("d-saved");
  saved.classList.remove("err");
  saved.textContent = "Saving…";
  try {
    const res = await fetch("/api/flag", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, flagged, note }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `the library answered ${res.status}`);
    noteDirty = false;
    const p = byId(id);
    if (p) {
      p.flag = body.flag;
      if (view.open === id) {
        saved.textContent = flagged ? "Saved: this picture won't be used." : "Saved: this picture can be used again.";
        saved.dataset.just = "1";
        setTimeout(() => delete saved.dataset.just, 2500);
      }
    }
    await refresh(true);
  } catch (e) {
    // nothing changed: the switch goes back to what is saved, and the sheet says so plainly
    const p = byId(id);
    if (view.open === id) $("d-flagged").checked = p ? isFlagged(p) : false;
    saved.classList.add("err");
    saved.textContent = `Not saved: ${e.message}`;
  }
}

async function saveRedraw(redraw, note) {
  const id = view.open;
  const saved = $("d-rd-saved");
  saved.classList.remove("err");
  saved.textContent = "Saving…";
  try {
    const res = await fetch("/api/redraw", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, redraw, note }) });
    const body = await res.json().catch(() => ({}));
    // a library server started before the switch existed: it needs one restart
    if (res.status === 404) {
      serverApi = 0;
      drawNotes();
      throw new Error("the Picture Library's server is older than this page. Ask for the library to be restarted, then reload this tab.");
    }
    if (!res.ok) throw new Error(body.error || `the library answered ${res.status}`);
    rdDirty = false;
    const p = byId(id);
    if (p) {
      p.redraw = body.redraw;
      if (view.open === id) {
        saved.textContent = redraw ? "Saved: marked for Art to redraw cleaner." : "Saved: no longer marked for redraw.";
        saved.dataset.just = "1";
        setTimeout(() => delete saved.dataset.just, 2500);
      }
    }
    await refresh(true);
  } catch (e) {
    // nothing changed: the switch goes back to what is saved, and the sheet says so plainly
    const p = byId(id);
    if (view.open === id) $("d-rd-on").checked = p ? isRedraw(p) : false;
    saved.classList.add("err");
    saved.textContent = `Not saved: ${e.message}`;
  }
}

function flushRedraw() {
  if (!rdDirty) return;
  clearTimeout(rdTimer);
  void saveRedraw($("d-rd-on").checked, $("d-rd-note").value);
}

function flushNote() {
  if (!noteDirty) return;
  clearTimeout(noteTimer);
  void saveFlag($("d-flagged").checked, $("d-note").value);
}

// ---------------------------------------------------------------------------
// Keeping up with the files

async function refresh(force = false) {
  try {
    const s = (await (await fetch("/api/stamp", { cache: "no-store" })).json()).stamp;
    if (!force && s === stamp && lib) return;
    const next = await (await fetch("/api/library", { cache: "no-store" })).json();
    stamp = s;
    lib = next;
    drawAll();
  } catch {
    if (!lib) $("count").textContent = "The library could not be reached. It may be starting; trying again…";
  }
}

// ---------------------------------------------------------------------------
// Wiring

document.querySelector(".seg").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-group]");
  if (!b) return;
  view.group = b.dataset.group;
  writeHash();
  drawAll();
});
for (const id of ["medium", "size", "family", "show"]) {
  $(id).addEventListener("change", () => {
    view[id] = $(id).value;
    writeHash();
    drawAll();
  });
}
$("find").addEventListener("input", () => {
  view.find = $("find").value.trim();
  writeHash();
  drawGrid();
});

$("d-close").addEventListener("click", closeDetail);
$("detail").addEventListener("click", (e) => {
  if (e.target === $("detail")) closeDetail();
});
const step = (d) => {
  const order = shownInOrder();
  const i = order.findIndex((q) => q.id === view.open);
  const next = order[i + d];
  if (next) openDetail(next.id);
};
$("d-prev").addEventListener("click", () => step(-1));
$("d-next").addEventListener("click", () => step(1));
document.addEventListener("keydown", (e) => {
  if ($("detail").hidden) return;
  if (e.key === "Escape") closeDetail();
  if (e.target instanceof HTMLInputElement && e.target.type === "text") return;
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});

$("d-flag").addEventListener("submit", (e) => {
  e.preventDefault();
  flushNote();
});
$("d-flagged").addEventListener("change", () => {
  clearTimeout(noteTimer);
  void saveFlag($("d-flagged").checked, $("d-note").value);
});
$("d-note").addEventListener("input", () => {
  noteDirty = true;
  $("d-saved").classList.remove("err");
  $("d-saved").textContent = "…";
  clearTimeout(noteTimer);
  noteTimer = setTimeout(flushNote, 700);
});
$("d-note").addEventListener("blur", flushNote);
$("d-rd").addEventListener("submit", (e) => {
  e.preventDefault();
  flushRedraw();
});
$("d-rd-on").addEventListener("change", () => {
  clearTimeout(rdTimer);
  void saveRedraw($("d-rd-on").checked, $("d-rd-note").value);
});
$("d-rd-note").addEventListener("input", () => {
  rdDirty = true;
  $("d-rd-saved").classList.remove("err");
  $("d-rd-saved").textContent = "…";
  clearTimeout(rdTimer);
  rdTimer = setTimeout(flushRedraw, 700);
});
$("d-rd-note").addEventListener("blur", flushRedraw);
$("d-quick").replaceChildren(
  ...QUICK_NOTES.map((n) =>
    el("button", {
      type: "button",
      text: n,
      onclick: () => {
        const note = $("d-note");
        note.value = note.value.trim() ? `${note.value.trim()}; ${n.toLowerCase()}` : n;
        noteDirty = true;
        flushNote();
      },
    }),
  ),
);

addEventListener("hashchange", () => {
  readHash();
  if (lib) drawAll();
  $("detail").hidden = !view.open;
});

/** Ask the server what it can save (a 404 is a server older than the page). */
async function checkServer() {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    serverApi = res.ok ? Number((await res.json()).api) || 0 : res.status === 404 ? 0 : serverApi;
  } catch {
    // not reachable just now: the count says so, and the next look asks again
  }
  if (lib) drawNotes();
}

readHash();
if (view.open) $("detail").hidden = false;
await checkServer();
await refresh(true);
if (view.open && byId(view.open)) drawDetail(true);
// ask every few seconds while the library is in view; at once on coming back to it
setInterval(() => {
  if (document.visibilityState === "visible") void refresh();
}, 2500);
// a restart while the page is open: the banner goes once the new server answers
setInterval(() => {
  if (document.visibilityState === "visible" && serverApi !== null && serverApi < PAGE_API) void checkServer();
}, 15000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refresh();
});
