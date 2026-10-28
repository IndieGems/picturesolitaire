// THE TABLE the game is played on: its picture behind every screen, its base
// colour, and the backs of the cards in the stacks and on Home's emblem. The
// snowy dusk is every player's; others are platform items only the server
// grants (the onboarding keepsake, src/net/keepsake.ts). The art for each is
// the art member's, listed in public/art/tables/tables.json.
//
// Which owned table is CHOSEN is the player's setting, and follows them
// (gem.me.settings "table", AGENTS.md's table); only what they chose is stored.
// A chosen table they no longer own falls back to the default. The first
// screen never waits for any of it: it draws on the default and changes over
// once the choice and the ownership have been read.
//
// The screens read the chosen art through CSS variables on :root:
//   --table-img    the table's picture        --table-base   the colour behind it
//   --stack-back   a stack's card back (the board draws its stacks from it too)

import { gem } from "../gem";
import { ownedTables } from "../net/keepsake";
import { t } from "./i18n";

export interface TableArt {
  /** "table-winter-dusk": the item's slug, the setting's value. */
  id: string;
  title: string;
  /** Paths under public/, as the catalogue's. */
  table: string;
  stackBack: string;
  thumb: string;
  base: string;
  /** Its weather (particles.ts): a strip of `particleFrames` sprites, `particleKind` "snow" or "leaves". */
  particles?: string;
  particleKind?: string;
  particleFrame?: number;
  particleFrames?: number;
  /** A Souvenir board's own table (Art, 2026-10-28: "t1", its trip): worn by that board, owned by nobody, never in the picker. */
  souvenir?: string;
}

const SETTING = "table";
const framed = window.self !== window.top;
const url = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, location.href).href;

let manifest: Promise<{ default: string; tables: TableArt[] }> | null = null;
/** The list, once it has loaded (for what must draw without waiting). */
let known: TableArt[] = [];
/** Each table's thumbnail, kept in the page once fetched (thumbOf), so the picker and a prize draw offline. */
const thumbs = new Map<string, string>();
function loadManifest(): Promise<{ default: string; tables: TableArt[] }> {
  manifest ??= fetch(url("art/tables/tables.json"))
    .then((r) => r.json() as Promise<{ default: string; tables: TableArt[] }>)
    .then((m) => {
      known = m.tables;
      // the thumbnails are small: fetch them now, with the first screen (a Souvenir's table is never shown as one)
      for (const a of m.tables.filter((x) => !x.souvenir))
        void fetch(url(a.thumb))
          .then((r) => (r.ok ? r.blob() : null))
          .then((b) => b && thumbs.set(a.id, URL.createObjectURL(b)))
          .catch(() => undefined);
      return m;
    })
    .catch((err: unknown) => {
      console.warn("[tables] the list of tables did not load", err);
      manifest = null;
      return { default: "table-winter-dusk", tables: [] };
    });
  return manifest;
}

let chosen = "table-winter-dusk";
let fallback = "table-winter-dusk";
/** The player chose a table this session: what the boot read finds later never overrides it. */
let touched = false;
const listeners = new Set<() => void>();

/** Dev server only: ?tables=all plays as if every table were owned (nothing is granted or saved). */
const pretendAll = () => import.meta.env.DEV && new URLSearchParams(location.search).get("tables") === "all";

/** A table's name, in the player's language where a locale has one. */
export function tableTitle(a: TableArt): string {
  const key = `table.${a.id}`;
  const said = t(key);
  return said === key ? a.title : said;
}
/** A table's small picture, for the picker and a prize: the copy kept in the page, else the file. */
export const thumbOf = (a: TableArt): string => thumbs.get(a.id) ?? url(a.thumb);

/** A table's art if the list has already loaded (it loads with the first screen). */
export const knownTable = (id: string): TableArt | undefined => known.find((a) => a.id === id);

/** The tables this player may choose: the default, then each they own, in the list's order. */
export async function ownedTableArts(): Promise<TableArt[]> {
  const m = await loadManifest();
  const owned = new Set(pretendAll() ? m.tables.map((a) => a.id) : await ownedTables());
  return m.tables.filter((a) => !a.souvenir && (a.id === m.default || owned.has(a.id)));
}

/** The art of the table `id`, if the list has it. */
export async function tableArt(id: string): Promise<TableArt | undefined> {
  return (await loadManifest()).tables.find((a) => a.id === id);
}

/** The table on the screen now. */
export const chosenTable = (): string => chosen;

/**
 * Hear when the table changes: the player's choice (chosenTable) or only what shows (shownTable: a
 * Souvenir's own table, worn while its board is up). Read the one you follow again, and ignore a call
 * that left it as it was. Returns the unsubscribe.
 */
export function onTableChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** The table on the screen now: the player's own, or a board's that wears one of its own (a Souvenir's). */
let shown = "table-winter-dusk";
/** A board's own table, worn while it is up (wearTable); null: the player's own shows. */
let worn: string | null = null;
/** Counts each change of what shows, so only the last one asked for is laid down. */
let painting = 0;
export const shownTable = (): string => shown;

/** Lay a table's art on the screens, once its picture is ready to show (never a blank moment). */
async function paint(a: TableArt): Promise<void> {
  const at = ++painting;
  const img = new Image();
  img.src = url(a.table);
  await img.decode().catch(() => undefined);
  if (at !== painting) return;
  const root = document.documentElement.style;
  root.setProperty("--table-img", `url("${url(a.table)}")`);
  root.setProperty("--table-base", a.base);
  root.setProperty("--stack-back", `url("${url(a.stackBack)}")`);
  shown = a.id;
  for (const fn of [...listeners]) fn();
}

/** The player's own table is now `a`: shown, unless a board wears its own (then it shows after). */
async function apply(a: TableArt): Promise<void> {
  chosen = a.id;
  if (worn || trying) return void [...listeners].forEach((fn) => fn());
  await paint(a);
}

// ---- dev server only: a table that is in no list yet (Art's options, for the creator's pick) ----

/** A table to try: a tables.json entry's fields (`table` at least), and home's own backdrop and its colour. */
export type TryTable = Partial<TableArt> & { table: string; desk?: string; deskBase?: string };
/** The table being tried, shown on every screen over the player's own; null: none. */
let trying: TableArt | null = null;

/**
 * Dev server only: show `a` on every screen though no list has it: the boards' table, its base colour,
 * card back and weather, and home's backdrop (`desk`; the table itself where it names none). Paths are
 * under the project, as tables.json's ("design/table-options/a/table.webp": the dev server serves the
 * whole project). Nothing is chosen, granted or saved; null puts the player's own back. The URL switch
 * ?tryTable=<folder> does the same from <folder>/table.json, its paths relative to that folder.
 */
export async function tryTable(a: TryTable | null): Promise<void> {
  if (!import.meta.env.DEV) return;
  const m = await loadManifest();
  const root = document.documentElement.style;
  const at = m.tables.findIndex((x) => x.id === "table-try");
  if (at >= 0) m.tables.splice(at, 1);
  if (!a) {
    trying = null;
    root.removeProperty("--home-desk");
    root.removeProperty("--home-base");
    const own = await tableArt(worn ?? chosen);
    if (own) await paint(own);
    return;
  }
  const now = m.tables.find((x) => x.id === shown);
  const art = { title: "Try", thumb: a.table, stackBack: now?.stackBack ?? "art/stack-back.webp", base: "#2c3746", ...a, id: "table-try" } as TableArt;
  // in the list for this page only, so the weather (particles.ts) finds it; never owned, so never in the picker
  m.tables.push(art);
  trying = art;
  root.setProperty("--home-desk", `url("${url(a.desk ?? a.table)}")`);
  root.setProperty("--home-base", a.deskBase ?? art.base);
  await paint(art);
}

/** ?tryTable=<folder> (dev server only): <folder>/table.json tried at boot, its paths made the project's. */
async function tryFromUrl(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const folder = new URLSearchParams(location.search).get("tryTable")?.replace(/^\/+|\/+$/g, "");
  if (!folder) return;
  try {
    const entry = (await (await fetch(url(`${folder}/table.json`))).json()) as Record<string, unknown>;
    for (const k of ["table", "desk", "stackBack", "thumb", "particles"])
      if (typeof entry[k] === "string") entry[k] = `${folder}/${entry[k] as string}`;
    await tryTable(entry as TryTable);
  } catch (err) {
    console.warn(`[tables] ?tryTable=${folder}: no table.json to try`, err);
  }
}

/**
 * A board with a table of its own (a Souvenir's, docs/souvenirs.md): `id` shows while it is up,
 * and null puts the player's own back. Never saved, never the player's choice (the picker still
 * marks theirs).
 */
export async function wearTable(id: string | null): Promise<void> {
  if (id === worn) return;
  worn = id;
  const a = await tableArt(id ?? chosen);
  if (a && worn === id && !trying) await paint(a);
}

/**
 * At boot: read the player's choice and what they own, and change over to it.
 * Never holds the first screen; a read that fails changes nothing, and a choice
 * the player makes meanwhile always wins over what the read finds.
 */
export async function startTables(): Promise<void> {
  try {
    const m = await loadManifest();
    fallback = m.default;
    void tryFromUrl();
    let want = m.default;
    if (framed && !pretendAll()) {
      try {
        await gem.awaitIdentity(10_000);
        want = (await gem.me.settings.get(SETTING))?.value ?? m.default;
      } catch {
        return; // no player, or no answer: the table on screen stays
      }
    }
    if (touched || want === chosen) return;
    const a = (await ownedTableArts()).find((x) => x.id === want);
    if (a && !touched) await apply(a);
  } finally {
    choiceSettled();
  }
}

let choiceSettled!: () => void;
/**
 * Settles once the boot has read the player's choice and changed over to it, or found it could not
 * (no player, no answer): chosenTable() is then the boot's answer. For what must not start on the
 * default and change a moment later (the music, src/audio/: Winter Dusk has its own); cap the wait.
 */
export const tableChoiceRead: Promise<void> = new Promise((r) => (choiceSettled = r));

/** The player chose a table (one they own): show it, and keep their choice. */
export async function chooseTable(id: string): Promise<void> {
  touched = true;
  const a = (await ownedTableArts()).find((x) => x.id === id);
  if (!a || a.id === chosen) return;
  // chosen on a board that wears its own (the settings over a Souvenir): theirs from now on, there too
  worn = null;
  await apply(a);
  if (!framed || pretendAll()) return;
  try {
    await gem.me.settings.put(SETTING, a.id);
  } catch (err) {
    console.warn("[tables] the choice was not kept", err);
  }
}

/** The default table's id (the snowy dusk). */
export const defaultTable = (): string => fallback;
