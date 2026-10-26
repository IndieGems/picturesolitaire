// Trips: draws /api/data (server.mjs). Read-only; reload the page to see changes.

const STYLE = { photo: "photo", painting: "painting", print: "woodblock print", watercolour: "watercolour", retro: "travel poster" };

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

/** The picture with the part that plays on the board outlined; tap for the full picture. */
function figure(p, caption) {
  const fig = el("button", "pic");
  fig.type = "button";
  fig.style.aspectRatio = `${p.cols * 3} / ${p.rows * 4}`;
  const img = el("img");
  img.src = p.thumb;
  img.alt = caption;
  img.loading = "lazy";
  const [c, r] = p.crop;
  const [w, h] = p.window;
  const box = el("span", "window");
  Object.assign(box.style, { left: `${(c / p.cols) * 100}%`, top: `${(r / p.rows) * 100}%`, width: `${(w / p.cols) * 100}%`, height: `${(h / p.rows) * 100}%` });
  box.title = `Plays on the board: ${w}×${h} cards`;
  fig.append(img, box);
  fig.addEventListener("click", () => {
    const big = document.getElementById("big");
    document.getElementById("big-img").src = p.full;
    document.getElementById("big-cap").textContent = caption;
    big.showModal();
  });
  return fig;
}

function missing(text) {
  const m = el("div", "pic missing", text);
  m.style.aspectRatio = "3 / 4";
  return m;
}

function tripSection(t) {
  const s = el("section", "group");
  s.id = `trip-${t.id}`;
  const head = el("header", "group-head");
  if (t.stamp) {
    const st = el("img", "stamp");
    st.src = t.stamp;
    st.alt = `${t.name} stamp`;
    head.append(st);
  }
  head.append(el("h2", null, `${t.name} · boards ${t.from}–${t.to}`));
  s.append(head);
  const grid = el("div", "grid");
  for (const b of t.boards) {
    const card = el("article", "card");
    card.append(el("span", "num", String(b.n)));
    const p = b.picture;
    if (!p) {
      card.append(missing("No postcard on this board yet"));
    } else {
      card.append(figure(p, `Board ${b.n}: ${p.name ?? p.id}${p.place ? `, ${p.place}` : ""}`));
      card.append(el("p", "name", p.name ?? p.id));
      if (p.place) card.append(el("p", "place", p.place));
      const meta = [p.tag, STYLE[p.medium] ?? p.medium].filter(Boolean).join(" · ");
      if (meta) card.append(el("p", "meta", meta));
    }
    grid.append(card);
  }
  s.append(grid);
  return s;
}

async function load() {
  const main = document.getElementById("main");
  const notes = document.getElementById("notes");
  let d;
  try {
    const r = await fetch("/api/data", { cache: "no-store" });
    if (!r.ok) throw new Error(`the server answered ${r.status}`);
    d = await r.json();
  } catch (e) {
    main.replaceChildren(el("p", "loading", `Could not load the trips (${e.message}). Reload to try again.`));
    return;
  }
  notes.replaceChildren(...d.problems.map((p) => el("p", null, p)));
  const jump = document.getElementById("jump");
  jump.replaceChildren(...d.trips.map((t) => Object.assign(el("a", null, t.name), { href: `#trip-${t.id}` })));
  main.replaceChildren(...d.trips.map(tripSection));
  if (!d.trips.length) main.append(el("p", "loading", "No trips yet."));
}

document.getElementById("big").addEventListener("click", (e) => {
  if (e.target.id === "big" || e.target.id === "big-img") e.currentTarget.close();
});
load();
