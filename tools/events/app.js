// Events: draws /api/data (server.mjs). Read-only; reload the page to see changes.
// ?today=YYYY-MM-DD on the page's address previews another day's live and next marks.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = MONTHS.map((m) => m.slice(0, 3));
const HELPER = { hint: "Hint", undo: "Undo", shuffle: "Shuffle" };
const STYLE = { photo: "photo", painting: "painting", watercolour: "watercolour", render: "3D render", "low-poly": "low-poly", flat: "flat illustration", retro: "retro illustration", print: "print" };

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

const parts = (date) => date.split("-").map(Number);
/** "2026-12-01" -> "1 Dec 2026" */
const dayName = (date) => {
  const [y, m, d] = parts(date);
  return `${d} ${SHORT[m - 1]} ${y}`;
};
/** "2026-12-01" -> "1 Dec" */
const dayShort = (date) => {
  const [, m, d] = parts(date);
  return `${d} ${SHORT[m - 1]}`;
};
/** An event's span: "15 to 28 Oct 2026", "25 Nov to 8 Dec 2026". */
const spanName = (a, b) => {
  const [ya, ma, da] = parts(a);
  const [yb, mb] = parts(b);
  return ya === yb && ma === mb ? `${da} to ${dayName(b)}` : ya === yb ? `${dayShort(a)} to ${dayName(b)}` : `${dayName(a)} to ${dayName(b)}`;
};
const toUtc = (date) => {
  const [y, m, d] = parts(date);
  return [y, m - 1, d];
};
const daysBetween = (a, b) => Math.round((Date.UTC(...toUtc(b)) - Date.UTC(...toUtc(a))) / 86400000);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "2 Hints, 2 Undos, 1 Shuffle", from the win checker's own numbers. */
const helpersText = (h) =>
  h
    ? Object.entries(h)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => plural(n, HELPER[k] ?? k))
        .join(", ")
    : "unknown";

function enlarge(src, caption) {
  const big = document.getElementById("big");
  document.getElementById("big-img").src = src;
  document.getElementById("big-cap").textContent = caption;
  big.showModal();
}

/** A picture you can tap for the full one, or a placeholder. */
function picture(thumb, full, caption, aspect, empty) {
  if (!thumb) {
    const m = el("div", "pic missing", empty);
    m.style.aspectRatio = aspect;
    return m;
  }
  const b = el("button", "pic");
  b.type = "button";
  b.style.aspectRatio = aspect;
  const img = el("img");
  img.src = thumb;
  img.alt = caption;
  img.loading = "lazy";
  img.decoding = "async";
  b.append(img);
  if (full) b.addEventListener("click", () => enlarge(full, caption));
  else b.disabled = true;
  return b;
}

const badge = (text, kind) => el("span", `badge ${kind}`, text);

function whenBadge(m, d) {
  if (m.key === d.live) return badge("Live now", "live");
  if (m.key === d.next) return badge("Next", "next");
  return m.when === "ended" ? badge("Ended: in the archive", "ended") : badge("Upcoming", "upcoming");
}

function artBadge(m, today) {
  const late = m.art !== "ready" && m.when !== "ended" && today >= m.due;
  const due = m.when === "ended" ? "" : ` · ${late ? "was due" : "due by"} ${dayName(m.due)}`;
  const kind = late ? "late" : "warn";
  switch (m.art) {
    case "ready":
      return badge("Art ready", "good");
    case "standin":
      return badge(`Stand-in art${due}`, kind);
    case "table-missing":
      return badge(`Items ready, table not drawn${due}`, kind);
    case "partial":
      return badge(`${m.counts.ready} of ${m.items.length} items drawn${due}`, kind);
    default:
      return badge(`No art yet${due}`, kind);
  }
}

function scheduleText(m) {
  if (m.scheduled === m.days) return `Every day of the ${m.days} deals its item on its daily`;
  return `${m.scheduled} of ${m.days} days deal their item: Levels re-runs the daily maker`;
}

/** "2 days: 3 Nov, 10 Nov" */
const datesText = (dates) => (dates.length ? `${plural(dates.length, "day")}: ${dates.map(dayShort).join(", ")}` : "Not scheduled");

function piece(it, m) {
  const card = el("article", `piece ${it.kind}`);
  card.append(el("span", "num", String(it.slot)));
  const name = it.title ?? `Item ${it.slot}`;
  const pic = picture(it.thumb, it.full, `${m.theme}, item ${it.slot}: ${name}${it.kind === "standin" ? " (stand-in picture)" : ""}`, "3 / 4", it.kind === "missing" ? "Picture file missing" : "No art yet");
  if (it.kind === "standin") pic.append(el("span", "ribbon", "Stand-in"));
  card.append(pic, el("p", "name", name));
  const meta = el("p", "meta", datesText(it.dates));
  if (it.dates.length) meta.title = it.dates.map(dayName).join(", ");
  card.append(meta);
  if (it.kind === "standin") card.append(el("p", "meta soft", `Stand-in: ${it.borrowed}`));
  else if (it.kind === "ready" && it.medium) card.append(el("p", "meta soft", STYLE[it.medium] ?? it.medium));
  return card;
}

function prizeCard(m, spares) {
  const p = m.prize;
  const card = el("article", "prize");
  card.append(el("h3", null, "The prize for a full suitcase"));
  const caption = `${p.title} table: the ${m.theme} prize`;
  card.append(picture(p.thumb, p.thumb, caption, "4 / 5", p.builtIn ? "The built-in table" : "Table not drawn yet"));
  card.append(el("p", "name", p.title ? `${p.title} table` : "No table planned"));
  if (!p.drawn && p.note) card.append(el("p", "meta soft", `Planned: ${p.note}`));
  if (p.builtIn) card.append(el("p", "meta warn-text", "Shows the built-in table, so it pays only the helpers"));
  const helpers = el("p", "helpers");
  helpers.append(el("span", "plus", "plus"), document.createTextNode(` ${helpersText(p.helpers)}`));
  card.append(helpers);
  card.append(el("p", "meta soft", `Paid once, when the last of the ${m.items.length} items is packed${spares ? ` or swapped in (${spares} spares a swap)` : ""}`));
  return card;
}

function eventSection(m, d) {
  const s = el("section", `group month ${m.key === d.live ? "is-live" : m.key === d.next ? "is-next" : ""}`);
  s.id = `e-${m.key}`;
  const head = el("header", "group-head");
  const title = el("h2", null, `${m.theme} · ${spanName(m.start, m.end)}`);
  const badges = el("div", "badges");
  badges.append(whenBadge(m, d), artBadge(m, d.today));
  head.append(title, badges);
  s.append(head);
  let span = `${m.days} days, ${plural(m.items.length, "item")}, each turning up ${m.items.length ? Math.floor(m.days / m.items.length) : 0} times or more`;
  if (m.when === "upcoming") span += ` · starts in ${plural(daysBetween(d.today, m.start), "day")}`;
  if (m.when === "live") span += ` · ${plural(daysBetween(d.today, m.end) + 1, "day")} left`;
  s.append(el("p", "sub", `${span} · ${scheduleText(m)}`));
  const row = el("div", "month-row");
  const grid = el("div", "grid");
  for (const it of m.items) grid.append(piece(it, m));
  row.append(prizeCard(m, d.spares), grid);
  s.append(row);
  return s;
}

function overview(d) {
  const s = el("section", "group");
  s.id = "all";
  s.append(el("h2", null, "Every event"));
  s.append(el("p", "sub", "Two weeks each, for VIP members (switched off for every player until the platform can say who holds VIP). How often they run is a schedule edit."));
  const t = el("table", "year");
  const head = el("tr");
  for (const h of ["Event", "Dates", "When", "Art", "Prize table"]) head.append(el("th", null, h));
  t.append(el("thead"));
  t.tHead.append(head);
  const body = el("tbody");
  for (const m of d.events) {
    const tr = el("tr", m.key === d.live ? "is-live" : m.key === d.next ? "is-next" : "");
    const a = Object.assign(el("a", null, m.theme), { href: `#e-${m.key}` });
    const c1 = el("td");
    c1.append(a);
    const c3 = el("td");
    c3.append(whenBadge(m, d));
    const c4 = el("td");
    c4.append(artBadge(m, d.today));
    const c5 = el("td", "table-cell");
    if (m.prize.thumb) {
      const img = el("img", "mini");
      img.src = m.prize.thumb;
      img.alt = "";
      img.loading = "lazy";
      c5.append(img);
    } else c5.append(el("span", "mini blank"));
    c5.append(document.createTextNode(m.prize.title ?? "–"));
    tr.append(c1, el("td", null, spanName(m.start, m.end)), c3, c4, c5);
    body.append(tr);
  }
  t.append(body);
  const wrap = el("div", "scroll");
  wrap.append(t);
  s.append(wrap);
  if (d.waiting.length) s.append(el("p", "sub", `Approved themes waiting for a date: ${d.waiting.map((w) => w.theme).join(", ")}.`));
  return s;
}

function tablesSection(d) {
  const s = el("section", "group");
  s.id = "tables";
  s.append(el("h2", null, "Tables"));
  s.append(el("p", "sub", "Every table and how a player gets it. Players choose among the default and the ones they own, in Cosmetics."));
  const grid = el("div", "grid tables");
  for (const t of d.tables) {
    const card = el("article", `piece table ${t.drawn ? "" : "none"}`);
    card.append(picture(t.thumb, t.thumb, `${t.title}`, "4 / 5", "Not drawn yet"));
    card.append(el("p", "name", t.title ?? t.id));
    for (const w of t.how) {
      const line = el("p", `how ${w.kind}`);
      if (w.kind === "event") {
        const a = Object.assign(el("a", null, `${w.text} (from ${dayName(w.start)})`), { href: `#e-${w.key}` });
        line.append(a);
      } else line.textContent = w.text;
      card.append(line);
    }
    if (!t.drawn && t.note) card.append(el("p", "meta soft", `Planned: ${t.note}`));
    grid.append(card);
  }
  s.append(grid);
  return s;
}

async function load() {
  const main = document.getElementById("main");
  const notes = document.getElementById("notes");
  const asked = new URLSearchParams(location.search).get("today");
  let d;
  try {
    const r = await fetch(`/api/data${asked ? `?today=${encodeURIComponent(asked)}` : ""}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`the server answered ${r.status}`);
    d = await r.json();
  } catch (e) {
    main.replaceChildren(el("p", "loading", `Could not load the events (${e.message}). Reload to try again.`));
    return;
  }
  notes.replaceChildren(...d.problems.map((p) => el("p", null, p)));
  const live = d.events.find((m) => m.key === d.live);
  const next = d.events.find((m) => m.key === d.next);
  let line = `Today is ${dayName(d.today)}${asked ? " (previewed)" : ""}. `;
  line += live ? `Live now: ${live.theme}, ${plural(daysBetween(d.today, live.end) + 1, "day")} left. ` : "No event is live. ";
  if (next) line += `Next: ${next.theme}, from ${dayName(next.start)} (in ${plural(daysBetween(d.today, next.start), "day")}). `;
  line += `Every full suitcase pays its table plus ${helpersText(d.events[0]?.prize.helpers)}${d.spares ? `; ${d.spares} spare copies swap for a missing item` : ""}.`;
  document.getElementById("today").textContent = line;
  const jump = document.getElementById("jump");
  jump.replaceChildren(
    ...d.events.map((m) => Object.assign(el("a", m.key === d.live ? "live" : m.key === d.next ? "next" : "", m.theme), { href: `#e-${m.key}` })),
    Object.assign(el("a", "tables-link", "Tables"), { href: "#tables" }),
  );
  main.replaceChildren(overview(d), ...d.events.map((m) => eventSection(m, d)), tablesSection(d));
  if (!d.events.length) main.prepend(el("p", "loading", "No events yet."));
  // the page draws after it loads, so a link to an event (#e-ski-trip-2026) or #tables lands only now
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

document.getElementById("big").addEventListener("click", (e) => {
  if (e.target.id === "big" || e.target.id === "big-img") e.currentTarget.close();
});
load();
