// THE GAME'S CONTENT NAMES IN ENGLISH, keyed as the game looks their translations up, for the
// translators: locales/names-en.json and locales/titles-en.json. The English itself stays where
// it is written (Art's src/content/pictures.json and public/art/tables/tables.json, Levels'
// src/content/levels/trips.json and events.json) and is what the game shows when a language
// has no translation; these two files are only its snapshot, so a later translation pass can see
// what changed (`git diff` on them, the gemctl:localization skill). They are never shipped.
//
//   names-en.json    what home, the passport and the suitcase show, loaded with the language:
//                      trip.<id>                          a trip's title ("Travel America")
//                      destination.<id>.name / .place     a postcard's place and where it is
//                      souvenir.<trip>.theme              a Souvenir's theme
//                      suitcase.<event id>.theme          an event's theme (the VIP events)
//                      table.<id>                         a table's name (the picker, a prize)
//                      album.<id>                         an album's name
//                      picture.<item id>                  an event item's name
//   titles-en.json   every other picture a player can meet (the levels', the events' and the Souvenirs'):
//                      picture.<id>                       its title (the enlarged view, the win card)
//
//   node tools/i18n/content-en.mjs           write both
//   node tools/i18n/content-en.mjs --check   exit 1 when either is out of date (tools/i18n/check.mjs)

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(`${ROOT}${p}`, "utf8"));
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
export const NAMES_EN = "locales/names-en.json";
export const TITLES_EN = "locales/titles-en.json";

/** The two snapshots as they should be now. */
export function contentEnglish() {
  const pictures = read("src/content/pictures.json");
  const trips = read("src/content/levels/trips.json").trips;
  // the VIP events (docs/vip.md; Levels' events.json): a theme each, its prize table and its items
  const events = (read("src/content/levels/events.json").events ?? []).filter((e) => !e.standIn);
  const tables = read("public/art/tables/tables.json").tables ?? [];
  const names = {};
  const titles = {};
  for (const tr of trips) names[`trip.${tr.id}`] = tr.name;
  for (const d of pictures.destinations ?? []) {
    names[`destination.${d.id}.name`] = d.name;
    if (d.place) names[`destination.${d.id}.place`] = d.place;
  }
  for (const s of pictures.souvenirs ?? []) names[`souvenir.${s.trip}.theme`] = s.theme;
  for (const t of tables) if (t.title) names[`table.${t.id}`] = t.title;
  // a prize or a Souvenir table not in the table list yet still shows its name
  for (const s of [...(pictures.suitcases ?? []), ...(pictures.events ?? []), ...(pictures.souvenirs ?? []), ...events])
    if (s.table && s.tableTitle && !names[`table.${s.table}`]) names[`table.${s.table}`] = s.tableTitle;
  for (const m of pictures.suitcases ?? []) names[`suitcase.${m.month}.theme`] = m.theme;
  for (const e of events) names[`suitcase.${e.id}.theme`] = e.theme;
  for (const a of pictures.albums ?? []) names[`album.${a.id}`] = a.title;
  for (const it of pictures.items ?? []) names[`picture.${it.id}`] = it.title ?? it.id;
  for (const m of events) for (const it of m.items ?? []) names[`picture.${it.id}`] ??= it.title;

  // the pictures a player can meet: those the shipped levels deal (never the experiments, the dev
  // menu's), and every Souvenir picture; a destination's is its place's name, an item's is above
  const dealt = new Set();
  for (const f of readdirSync(`${ROOT}src/content/levels`).filter((f) => f.endsWith(".json") && f !== "experiments.json")) {
    const d = read(`src/content/levels/${f}`);
    for (const l of Array.isArray(d.levels) ? d.levels : []) for (const p of l.pictures ?? []) dealt.add(p.id);
  }
  for (const p of pictures.pictures ?? []) if (dealt.has(p.id) && p.title) titles[`picture.${p.id}`] = p.title;
  for (const p of pictures.souvenirPictures ?? []) if (p.title) titles[`picture.${p.id}`] = p.title;
  return { names: sorted(names), titles: sorted(titles) };
}

const text = (o) => `${JSON.stringify(o, null, 2)}\n`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { names, titles } = contentEnglish();
  if (process.argv.includes("--check")) {
    const stale = [[NAMES_EN, names], [TITLES_EN, titles]].filter(([p, o]) => {
      try {
        return readFileSync(`${ROOT}${p}`, "utf8").replace(/\r\n/g, "\n") !== text(o);
      } catch {
        return true;
      }
    });
    for (const [p] of stale) console.log(`out of date: ${p} (node tools/i18n/content-en.mjs)`);
    process.exit(stale.length ? 1 : 0);
  }
  writeFileSync(`${ROOT}${NAMES_EN}`, text(names));
  writeFileSync(`${ROOT}${TITLES_EN}`, text(titles));
  console.log(`${NAMES_EN}: ${Object.keys(names).length} names; ${TITLES_EN}: ${Object.keys(titles).length} titles`);
}
