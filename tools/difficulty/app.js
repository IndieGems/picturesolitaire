// The Difficulty editor's page: one chart a lane (up is harder), a board's numbers and opening on tap.
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent?.appendChild(n);
  return n;
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const r0 = (x) => (x == null ? "–" : `${Math.round(x)}%`);
const sizeOf = (b) => (b.long ? "all long" : `${b.cols}×${b.rows}`);

let state = { lane: "campaign", data: null, selected: null };

const LEDE = {
  campaign: "Up is harder: the share of games lost. Blue is a careless player, the measure every board is dealt to; orange is a player who, when it must draw, takes the face-up card that helps most (where the two lines meet, looking does not help). Grey bands are each board's target.",
  challenge: "The challenge route, up is harder. Blue is a careless player, orange one who draws by the face-up cards; grey bands are each board's target.",
  daily: "The daily boards by date, up is harder. Blue is a careless player, orange one who draws by the face-up cards; grey bands are each weekday's target.",
};

// ------------------------------------------------------------------ markers (shape = board size)
function marker(parent, b, x, y, color) {
  const ring = { stroke: "var(--ring)", "stroke-width": 2 };
  if (b.long) return el("circle", { cx: x, cy: y, r: 4.5, fill: "var(--surface)", stroke: color, "stroke-width": 2 }, parent);
  if (b.cols >= 6) {
    const pts = Array.from({ length: 6 }, (_, k) => `${x + 7 * Math.cos((Math.PI / 3) * k)},${y + 7 * Math.sin((Math.PI / 3) * k)}`).join(" ");
    return el("polygon", { points: pts, fill: color, ...ring }, parent);
  }
  if (b.cols === 5) return el("path", { d: `M${x} ${y - 6.5}L${x + 6.5} ${y}L${x} ${y + 6.5}L${x - 6.5} ${y}Z`, fill: color, ...ring }, parent);
  if (b.rows === 5 || b.cols * b.rows > 16) return el("rect", { x: x - 5, y: y - 5, width: 10, height: 10, rx: 2, fill: color, ...ring }, parent);
  return el("circle", { cx: x, cy: y, r: 5, fill: color, ...ring }, parent);
}

function legend(lane) {
  const box = $("legend");
  const swatch = (draw) => {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("width", 22);
    s.setAttribute("height", 14);
    draw(s);
    return s.outerHTML;
  };
  const items = [
    [swatch((s) => { el("line", { x1: 0, y1: 7, x2: 22, y2: 7, stroke: "var(--careless)", "stroke-width": 2 }, s); }), "careless player"],
    [swatch((s) => { el("line", { x1: 0, y1: 7, x2: 22, y2: 7, stroke: "var(--reader)", "stroke-width": 2, "stroke-dasharray": "4 3" }, s); }), "draws by the face-up cards"],
    [swatch((s) => { el("rect", { x: 1, y: 2, width: 20, height: 10, fill: "var(--band)", stroke: "var(--band-edge)" }, s); }), "target"],
    [swatch((s) => marker(s, { cols: 4, rows: 4 }, 11, 7, "var(--soft)")), "4×4"],
    [swatch((s) => marker(s, { cols: 4, rows: 5 }, 11, 7, "var(--soft)")), "4×5"],
    [swatch((s) => marker(s, { cols: 5, rows: 5 }, 11, 7, "var(--soft)")), "5×5"],
    [swatch((s) => marker(s, { cols: 6, rows: 6 }, 11, 7, "var(--soft)")), "6×6"],
    [swatch((s) => marker(s, { long: true }, 11, 7, "var(--soft)")), "all long pictures"],
  ];
  if (lane === "campaign") items.push([swatch((s) => { el("path", { d: "M5 12L11 2L17 12Z", fill: "var(--soft)" }, s); }), "hard"], [swatch((s) => { el("path", { d: "M3 13L11 0L19 13Z", fill: "var(--text)" }, s); }), "super hard"], ["<span style='font-size:15px'>★</span>", "passport stamp"]);
  box.innerHTML = items.map(([sw, t]) => `<span>${sw}${t}</span>`).join("");
}

// ------------------------------------------------------------------ the chart
function chart() {
  const { boards, trips } = state.data;
  const box = $("chart");
  box.innerHTML = "";
  const n = boards.length;
  const M = { l: 46, r: 16, t: state.lane === "campaign" ? 44 : 16, b: state.lane === "campaign" ? 58 : 40 };
  const step = Math.max(state.lane === "daily" ? 7 : 9, (box.clientWidth - M.l - M.r) / n);
  const W = M.l + M.r + step * n, H = 300, h = H - M.t - M.b;
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img" }, box);
  const x = (i) => M.l + step * (i + 0.5);
  const y = (lost) => M.t + (lost / 100) * -h + h;

  // grid and axis: games lost, up is harder
  for (const v of [0, 25, 50, 75, 100]) {
    el("line", { x1: M.l, x2: W - M.r, y1: y(v), y2: y(v), stroke: v ? "var(--grid)" : "var(--axis)", "stroke-width": 1 }, svg);
    el("text", { x: M.l - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, svg).textContent = `${v}%`;
  }
  const yl = el("text", { x: 12, y: M.t + h / 2, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)", transform: `rotate(-90 12 ${M.t + h / 2})` }, svg);
  yl.textContent = "games lost (harder ↑)";

  // the readable bar (campaign): on an unmarked board the orange line stays at or under it
  if (state.lane === "campaign") {
    el("line", { x1: M.l, x2: W - M.r, y1: y(15), y2: y(15), stroke: "var(--reader)", "stroke-width": 1, "stroke-dasharray": "1 4", opacity: 0.8 }, svg);
    el("text", { x: W - M.r - 2, y: y(15) - 4, "text-anchor": "end", "font-size": 10, fill: "var(--muted)" }, svg).textContent = "readable: orange at or under this, unmarked boards";
    el("line", { x1: M.l, x2: W - M.r, y1: y(75), y2: y(75), stroke: "var(--reader)", "stroke-width": 1, "stroke-dasharray": "1 4", opacity: 0.8 }, svg);
    el("text", { x: W - M.r - 2, y: y(75) - 4, "text-anchor": "end", "font-size": 10, fill: "var(--muted)" }, svg).textContent = "never a wall: orange at or under this, marked boards";
  }
  // targets: the band each board was dealt to (as games lost)
  boards.forEach((b, i) => {
    if (!b.target) return;
    const [lo, hi] = [100 - b.target[1], 100 - b.target[0]];
    el("rect", { x: x(i) - step / 2 + 0.5, width: step - 1, y: y(hi), height: Math.max(1, y(lo) - y(hi)), fill: "var(--band)" }, svg);
  });

  // trips: a hairline between them, the name over each, a stamp on its last board
  if (state.lane === "campaign") {
    for (const t of trips) {
      const a = t.from - 1, z = Math.min(t.to, n) - 1;
      if (a >= n) continue;
      if (a > 0) el("line", { x1: x(a) - step / 2, x2: x(a) - step / 2, y1: 6, y2: M.t + h, stroke: "var(--axis)", "stroke-dasharray": "3 3" }, svg);
      el("text", { x: (x(a) + x(z)) / 2, y: 14, "text-anchor": "middle", "font-size": 12, fill: "var(--soft)" }, svg).textContent = `${t.name} (${t.from}–${t.to})`;
      if (t.to <= n) el("text", { x: x(z), y: 32, "text-anchor": "middle", "font-size": 13, fill: "var(--soft)" }, svg).textContent = "★";
    }
  }

  // the two players' lines
  const line = (key, color, dash) =>
    el("polyline", { points: boards.map((b, i) => `${x(i)},${y(100 - b[key])}`).join(" "), fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round", ...(dash ? { "stroke-dasharray": dash } : {}) }, svg);
  line("reader", "var(--reader)", "4 3");
  boards.forEach((b, i) => el("circle", { cx: x(i), cy: y(100 - b.reader), r: 2.5, fill: "var(--reader)" }, svg));
  line("careless", "var(--careless)");
  boards.forEach((b, i) => marker(svg, b, x(i), y(100 - b.careless), "var(--careless)"));

  // marks under the plot, and the board numbers
  const base = M.t + h;
  boards.forEach((b, i) => {
    if (b.mark === "hard") el("path", { d: `M${x(i) - 4} ${base + 16}L${x(i)} ${base + 8}L${x(i) + 4} ${base + 16}Z`, fill: "var(--soft)" }, svg);
    if (b.mark === "super") el("path", { d: `M${x(i) - 5.5} ${base + 18}L${x(i)} ${base + 6}L${x(i) + 5.5} ${base + 18}Z`, fill: "var(--text)" }, svg);
    const every = state.lane === "daily" ? 7 : 5;
    if (i === 0 || (i + 1) % every === 0) {
      const t = el("text", { x: x(i), y: base + (state.lane === "campaign" ? 34 : 18), "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, svg);
      t.textContent = state.lane === "daily" ? b.label.slice(5) : b.n;
    }
  });
  if (state.lane === "campaign") el("text", { x: M.l - 8, y: base + 16, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, svg).textContent = "mark";

  // the selected board, and the hit targets (a whole column each, wider than the marks)
  if (state.selected != null) {
    const i = boards.findIndex((b) => b.id === state.selected);
    if (i >= 0) el("rect", { x: x(i) - step / 2, y: M.t - 4, width: step, height: h + 8, fill: "none", stroke: "var(--band-edge)", "stroke-width": 1.5, rx: 3 }, svg);
  }
  boards.forEach((b, i) => {
    const hit = el("rect", { x: x(i) - step / 2, y: 0, width: step, height: H, fill: "transparent", style: "cursor:pointer" }, svg);
    hit.addEventListener("pointermove", (e) => tip(e, b));
    hit.addEventListener("pointerleave", () => ($("tip").hidden = true));
    hit.addEventListener("click", () => open(b.id));
  });
}

function tip(e, b) {
  const t = $("tip");
  t.hidden = false;
  t.innerHTML = `<b>${state.lane === "daily" ? b.label : `Board ${b.n}`}</b>${b.label && state.lane !== "daily" ? ` · ${esc(b.label)}` : ""}<br>
    <span class="k">${esc(b.role)}${b.mark ? `, marked ${b.mark}` : ""} · ${sizeOf(b)} · ${b.pictures} pictures</span><br>
    careless player wins <b>${r0(b.careless)}</b>${b.target ? ` <span class="k">(target ${r0(b.target[0])}–${r0(b.target[1])})</span>` : ""}<br>
    draws by the face-up cards: wins <b>${r0(b.reader)}</b>`;
  const pad = 14;
  t.style.left = `${Math.min(e.clientX + pad, innerWidth - t.offsetWidth - 8)}px`;
  t.style.top = `${Math.min(e.clientY + pad, innerHeight - t.offsetHeight - 8)}px`;
}

// ------------------------------------------------------------------ one board
function cardStyle(pics, card) {
  const p = pics[card >> 5];
  if (!p?.img) return "";
  const i = card & 31, cx = p.at[0] + (i % p.cols), cy = p.at[1] + Math.floor(i / p.cols);
  const [gc, gr] = p.grid;
  return `background-image:url('/${encodeURI(p.img)}');background-size:${gc * 100}% ${gr * 100}%;background-position:${gc > 1 ? (cx / (gc - 1)) * 100 : 0}% ${gr > 1 ? (cy / (gr - 1)) * 100 : 0}%`;
}

function why(b) {
  const c = b.careless, r = b.reader;
  const parts = [];
  if (r >= c + 20) parts.push(`Reading the face-up cards pays here: a player who draws by them wins ${r0(r)}, against ${r0(c)} for a careless one.`);
  else if (r >= c + 8) parts.push(`Reading the face-up cards helps a little (${r0(r)}, against ${r0(c)} careless).`);
  else parts.push(`Reading the face-up cards barely helps (${r0(r)}, against ${r0(c)} careless): what decides this board is mostly the hidden cards behind them, which come down when a picture is finished.`);
  if (b.traps) parts.push(`On the solver's winning line, ${b.traps} choice${b.traps > 1 ? "s" : ""} where the other option loses the board.`);
  if (b.chain) parts.push(`The longest chain of pictures that wait on one another: ${b.chain}.`);
  return parts.join(" ");
}

async function open(id) {
  state.selected = id;
  chart();
  const res = await fetch(`/api/board?lane=${state.lane}&id=${encodeURIComponent(id)}`);
  const b = await res.json();
  const pics = b.picturesOn;
  const { cols, rows, board, stacks } = b.opening;
  const onBoard = new Set(board.filter((c) => c >= 0).map((c) => c >> 5));
  const card = (c, cls = "") => `<div class="card ${cls}${onBoard.has(c >> 5) ? " related" : ""}" style="${cardStyle(pics, c)}" title="${esc(pics[c >> 5]?.title)}"></div>`;
  const colsHtml = Array.from({ length: cols }, (_, col) => {
    const st = stacks[col] ?? [];
    const stack = st.length ? st.map((c, k) => card(c, `small${k ? " behind" : ""}`)).join("") : `<span class="label">empty</span>`;
    const cells = Array.from({ length: rows }, (_, r) => {
      const c = board[r * cols + col];
      return c >= 0 ? card(c).replace(" related", "") : `<div class="card empty"></div>`;
    }).join("");
    return `<div class="col"><div class="stack">${stack}</div>${cells}</div>`;
  }).join("");
  const dl = [
    ["Careless player wins", r0(b.careless)],
    ["Draws by the face-up cards", r0(b.reader)],
    ["Target (careless)", b.target ? `${r0(b.target[0])}–${r0(b.target[1])}` : "–"],
    ["Pictures", b.pictures],
    ["Cards (waiting in stacks)", `${b.cards} (${b.waiting ?? "–"})`],
    ["Choices that lose (traps)", b.traps ?? "–"],
    ["Chain", b.chain ?? "–"],
    ["Winning line", `${b.moves} moves`],
    ...(b.par != null ? [["Par", b.par]] : []),
    ["Starts safe", b.safe ? "yes" : "no: a first move can lose it"],
    ...(state.lane === "campaign"
      ? [b.mark ? ["A careful player wins 1 in 4 or more (marked)", b.reader >= 25 ? "yes" : "no: a wall"] : ["Readable (85%+ drawing by the face-up cards)", b.reader >= 85 ? "yes" : "no"]]
      : []),
    ["Board", sizeOf(b)],
  ];
  $("detail").innerHTML = `
    <h2>${state.lane === "daily" ? esc(b.label) : `Board ${b.n}`}${b.destination ? ` · ${esc(b.destination.name)}` : ""}</h2>
    <p class="sub">${esc(b.role)}${b.mark ? `, marked ${b.mark}` : ""}${b.destination?.place ? ` · ${esc(b.destination.place)}` : ""}</p>
    <p class="why">${esc(why(b))}</p>
    <dl class="nums">${dl.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    <div class="opening">
      <div class="board" style="grid-template-columns:repeat(${cols}, auto)">${colsHtml}</div>
      <div class="key">
        <p><b>How it opens.</b> Over each column, its stack: the face-up card first, then the hidden cards behind it, dimmed, in the order they come down.</p>
        <p>A green dot: that card's picture is already on the board.</p>
        <p>Finishing a square brings down two cards in each of its columns: the face-up one and the one behind it.</p>
      </div>
    </div>`;
}

function table() {
  const rows = state.data.boards.map((b) => `<tr><td>${state.lane === "daily" ? b.label : b.n}</td><td>${esc(state.lane === "daily" ? b.role : b.label ?? b.id)}</td><td>${esc(b.role)}</td><td>${b.mark ?? ""}</td><td>${sizeOf(b)}</td><td>${b.pictures}</td><td>${r0(b.careless)}</td><td>${r0(b.reader)}</td><td>${b.target ? `${r0(b.target[0])}–${r0(b.target[1])}` : ""}</td><td>${b.traps ?? ""}</td><td>${b.chain ?? ""}</td><td>${b.moves}</td><td>${b.safe ? "yes" : "no"}</td></tr>`);
  $("table").innerHTML = `<table><thead><tr><th>Board</th><th>Name</th><th>Role</th><th>Mark</th><th>Size</th><th>Pictures</th><th>Careless wins</th><th>Reader wins</th><th>Target</th><th>Traps</th><th>Chain</th><th>Moves</th><th>Safe start</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

// ------------------------------------------------------------------ lanes
async function load(lane, id) {
  state = { lane, data: null, selected: null };
  for (const t of document.querySelectorAll(".tabs button")) t.setAttribute("aria-selected", String(t.dataset.lane === lane));
  $("lede").textContent = LEDE[lane];
  $("detail").innerHTML = `<p class="hint">Tap a board in the chart to see its numbers and how it opens.</p>`;
  legend(lane);
  const res = await fetch(`/api/lane?lane=${lane}`);
  const data = await res.json();
  if (data.error) {
    $("problem").hidden = false;
    $("problem").textContent = data.error;
    return;
  }
  $("problem").hidden = true;
  state.data = data;
  chart();
  table();
  if (id && data.boards.some((b) => b.id === id)) open(id);
}

// the address names the lane and, optionally, a board: #campaign, #campaign/c18, #daily/d2026-10-27
const fromHash = () => {
  const [lane, id] = location.hash.slice(1).split("/");
  load(["campaign", "challenge", "daily"].includes(lane) ? lane : "campaign", id);
};
for (const t of document.querySelectorAll(".tabs button")) t.addEventListener("click", () => { location.hash = t.dataset.lane; });
addEventListener("hashchange", fromHash);
addEventListener("resize", () => state.data && chart());
fromHash();
