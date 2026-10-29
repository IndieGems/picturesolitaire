// THE TABLE the game is played on: its picture behind every screen, its base
// colour, and the backs of the cards in the stacks and on Home's emblem. The
// sunny day (table-sunny-day, the sky-blue suitcase: the game turned sunny,
// creator 2026-10-28) is every player's; others are platform items only the
// server grants (the onboarding keepsake, src/net/keepsake.ts; a month's
// suitcase, Winter Dusk among them). The art for each is the art member's,
// listed in public/art/tables/tables.json.
//
// HOME shows the chosen table too, unless the table names a picture of its own
// for home (`desk`): Winter Dusk, the old snowy look, names the traveller's desk
// (art/home-desk.webp), so its whole winter skin comes back. Home follows the
// CHOICE: a Souvenir's table, worn by its board, never reaches it.
//
// THE PICKER is the Cosmetics screen's Tables (cosmetics.ts; it left Settings, the creator,
// 2026-10-29): the default and every table owned, then the shop's tables not yet bought (award
// "shop" in Server's src/net/tables.json, shopTableArts), then any table marked `showLocked` that
// is not owned, as information, with how to win it: Winter Dusk says "Fill December's suitcase"
// (its month: Levels' suitcases.json). While the Daily Suitcase is on hold (event-switch.ts), a
// table no suitcase can win is simply absent: an event's table shows only to its owners, and is
// never sold.
//
// Which owned table is CHOSEN is the player's setting, and follows them
// (gem.me.settings "table", choices.ts: one read with the track's, writes paced); only what they
// chose is stored.
// A chosen table they no longer own falls back to the default. The first
// screen never waits for any of it: it draws on the default and changes over
// once the choice and the ownership have been read.
//
// The screens read the chosen art through CSS variables on :root:
//   --table-img    the table's picture        --table-base   the colour behind it
//   --stack-back   a stack's card back (the board draws its stacks from it too)
//   --home-img     home's own picture (`desk`) --home-base its colour: unset, home is
//                  see-through to the table
// Until they are set, style.css draws the built-in table, the same files.

import { gem } from "../gem";
import { ownedTables } from "../net/keepsake";
import { TABLES } from "../net/tables";
import { keepChoice, readChoices } from "./choices";
import SCHEDULE from "../content/levels/suitcases.json";
import { eventShown } from "./event-switch";
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
  /** Its weather (particles.ts): a strip of `particleFrames` sprites, `particleKind` "snow", "leaves" or "petals". */
  particles?: string;
  particleKind?: string;
  particleFrame?: number;
  particleFrames?: number;
  /** A Souvenir board's own table (Art, 2026-10-28: "t1", its trip): worn by that board, owned by nobody, never in the picker. */
  souvenir?: string;
  /** Home's own picture while this table is chosen (Winter Dusk: the snowy desk); without one, home shows `table`. */
  desk?: string;
  /** Shown in the picker though not owned, locked, with how to win it (a month's suitcase: Levels' schedule). */
  showLocked?: boolean;
  /**
   * Its art beside the game on a PC or a TV (the creator, 2026-10-28: each table its own): the name of
   * a `media.portrait_borders` image on the store page (Art's, "sunny-day"), set by Art only once the
   * page carries it. A table without one shows the Arcade's own bars.
   */
  border?: string;
}

/** The table every player has, and the one drawn before anything is read (style.css draws its files until then). */
export const BUILT_IN_TABLE = "table-sunny-day";

const SETTING = "table";
const url = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, location.href).href;

let manifest: Promise<{ default: string; tables: TableArt[] }> | null = null;
/** The list, once it has loaded (for what must draw without waiting). */
let known: TableArt[] = [];
/** Each table's thumbnail, kept in the page once fetched (thumbOf), so the picker and a prize draw offline. */
const thumbs = new Map<string, string>();
function loadManifest(): Promise<{ default: string; tables: TableArt[] }> {
  manifest ??= fetch(url("art/tables/tables.json"))
    .then((r) => r.json() as Promise<{ default: string; tables: TableArt[] }>)
    .then(async (m) => {
      if (import.meta.env.DEV) await standIns(m.tables);
      known = m.tables;
      return m;
    })
    .catch((err: unknown) => {
      console.warn("[tables] the list of tables did not load", err);
      manifest = null;
      return { default: BUILT_IN_TABLE, tables: [] };
    });
  return manifest;
}

/**
 * Dev server only: a shop table with no art in the list yet stands in from Art's concept folder
 * (design/concepts/tables/<name>/table.json, the ?tryTable= try-outs), so the Cosmetics screen can be
 * checked before the creator's pick lands. Never in a build: there a table with no art is not shown.
 */
async function standIns(list: TableArt[]): Promise<void> {
  const missing = TABLES.filter((x) => x.award === "shop" && !list.some((a) => a.id === x.slug));
  const sunny = list.find((a) => a.id === BUILT_IN_TABLE);
  await Promise.all(
    missing.map(async (x) => {
      const folder = `design/concepts/tables/${x.slug.replace(/^table-/, "")}`;
      try {
        const r = await fetch(url(`${folder}/table.json`));
        if (!r.ok) return;
        const e = (await r.json()) as { title?: string; table?: string; base?: string };
        if (!e.table) return;
        const pic = `${folder}/${e.table}`;
        list.push({ id: x.slug, title: e.title ?? x.title, table: pic, thumb: pic, stackBack: sunny?.stackBack ?? "art/stack-back.webp", base: e.base ?? "#51c5fd" });
      } catch {
        // no concept folder: the table is not shown
      }
    }),
  );
}

let thumbsAsked = false;
/**
 * Fetch every table's thumbnail into the page (a Souvenir's table is never shown as one), so the
 * picker and a prize draw at once and offline. Small, but not home's: called once home is whole
 * (app.ts; the first-load trim, 2026-10-28), and by the picker should it open first.
 */
export function warmThumbs(): void {
  if (thumbsAsked) return;
  thumbsAsked = true;
  void loadManifest().then((m) => {
    for (const a of m.tables.filter((x) => !x.souvenir && !thumbs.has(x.id)))
      void fetch(url(a.thumb))
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => b && thumbs.set(a.id, URL.createObjectURL(b)))
        .catch(() => undefined);
  });
}

let chosen = BUILT_IN_TABLE;
let fallback = BUILT_IN_TABLE;
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

/** Dev server only: the tables owned for a check in the play-test tool (cosmetics-shop.ts's pretend); null: the platform's word. */
let devOwned: Set<string> | null = null;
export function pretendOwnedTables(ids: readonly string[] | null): void {
  if (!import.meta.env.DEV) return;
  devOwned = ids ? new Set(ids) : null;
}
const pretending = (): boolean => pretendAll() || devOwned !== null;

/** The tables this player may choose: the default, then each they own, in the list's order. */
export async function ownedTableArts(): Promise<TableArt[]> {
  const m = await loadManifest();
  const owned = new Set(pretendAll() ? m.tables.map((a) => a.id) : devOwned ? devOwned : await ownedTables());
  return m.tables.filter((a) => !a.souvenir && (a.id === m.default || owned.has(a.id)));
}

/** The shop's tables (award "shop", Server's src/net/tables.json) that have art to draw, in that list's order: owned or not. */
export async function shopTableArts(): Promise<TableArt[]> {
  const m = await loadManifest();
  return TABLES.filter((x) => x.award === "shop")
    .map((x) => m.tables.find((a) => a.id === x.slug))
    .filter((a): a is TableArt => !!a && !a.souvenir);
}

/** A picker's row: a table to choose, or one shown locked with the month whose suitcase wins it ("2026-12"). */
export type PickerTable = { art: TableArt; lockedMonth: string | null };

/** The month whose suitcase wins table `id` (Levels' schedule), or null when no month does. */
const prizeMonth = (id: string): string | null =>
  ((SCHEDULE as { months: { month: string; table: string }[] }).months.find((m) => m.table === id)?.month ?? null);

/**
 * The picker's tables: the ones this player may choose (ownedTableArts), then each `showLocked` one
 * they do not own whose month's suitcase wins it, locked. In the list's order within each part.
 */
export async function pickerTables(): Promise<PickerTable[]> {
  const mine = await ownedTableArts();
  const have = new Set(mine.map((a) => a.id));
  // the event on hold: no suitcase wins a table, so none is shown to be won
  if (!eventShown()) return mine.map((art) => ({ art, lockedMonth: null }));
  const m = await loadManifest();
  const locked = m.tables
    .filter((a) => a.showLocked && !a.souvenir && !have.has(a.id))
    .map((art) => ({ art, lockedMonth: prizeMonth(art.id) }))
    .filter((x): x is PickerTable & { lockedMonth: string } => x.lockedMonth !== null);
  return [...mine.map((art) => ({ art, lockedMonth: null })), ...locked];
}

/** The art of the table `id`, if the list has it. */
export async function tableArt(id: string): Promise<TableArt | undefined> {
  return (await loadManifest()).tables.find((a) => a.id === id);
}

/** The player's own table (what the picker marks; home shows it). */
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
let shown = BUILT_IN_TABLE;
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

/** Counts each change of home's picture, as `painting` does the table's. */
let homing = 0;
/**
 * Get `a`'s home picture ready: its `desk`, decoded. Answers what lays it on home: --home-img and
 * --home-base set, or, for a table with no desk, cleared, so home is see-through to the table the
 * whole game stands on (the same picture, framed the same; nothing more to fetch).
 */
async function homeReady(a: TableArt): Promise<() => void> {
  const at = ++homing;
  const root = document.documentElement.style;
  if (!a.desk) {
    return () => {
      if (at !== homing) return;
      root.removeProperty("--home-img");
      root.removeProperty("--home-base");
    };
  }
  const pic = url(a.desk);
  const img = new Image();
  img.src = pic;
  await img.decode().catch(() => undefined);
  return () => {
    if (at !== homing) return;
    root.setProperty("--home-img", `url("${pic}")`);
    root.setProperty("--home-base", a.base);
  };
}

/**
 * The art beside the game on a PC or a TV (the store page's portrait borders) follows the player's
 * CHOICE, as home does: a Souvenir's worn table never changes it. Called at start-up and on every
 * change, unconditionally (the SDK holds it until the Arcade connects, and a phone ignores it); null
 * for a table with no border, which brings back the Arcade's own bars.
 */
function showBorder(a: TableArt | undefined): void {
  gem.showPortraitBorders(typeof a?.border === "string" && a.border ? a.border : null);
}

/**
 * The player's own table is now `a`: on the boards (unless one wears its own: then after) and home
 * together, once both pictures are ready, so home never shows the old table between the two.
 */
async function apply(a: TableArt): Promise<void> {
  chosen = a.id;
  if (!trying) showBorder(a);
  if (trying) return void [...listeners].forEach((fn) => fn());
  if (worn) {
    [...listeners].forEach((fn) => fn());
    return (await homeReady(a))();
  }
  const [home] = await Promise.all([homeReady(a), paint(a)]);
  home();
}

// ---- dev server only: a table that is in no list yet (Art's options, for the creator's pick) ----

/** A table to try: a tables.json entry's fields (`table` at least), and home's own picture's colour. */
export type TryTable = Partial<TableArt> & { table: string; deskBase?: string };
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
    const [own, mine] = await Promise.all([tableArt(worn ?? chosen), tableArt(chosen)]);
    const home = mine ? await homeReady(mine) : null;
    if (own) await paint(own);
    home?.();
    return;
  }
  const now = m.tables.find((x) => x.id === shown);
  const art = { title: "Try", thumb: a.table, stackBack: now?.stackBack ?? "art/stack-back.webp", base: "#2c3746", ...a, id: "table-try" } as TableArt;
  // in the list for this page only, so the weather (particles.ts) finds it; never owned, so never in the picker
  m.tables.push(art);
  trying = art;
  homing++; // a home picture still on its way stays away
  if (a.desk) {
    root.setProperty("--home-img", `url("${url(a.desk)}")`);
    root.setProperty("--home-base", a.deskBase ?? art.base);
  } else {
    root.removeProperty("--home-img");
    root.removeProperty("--home-base");
  }
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
 * At boot: read the player's choice and what they own, and lay that table (its pictures decoded:
 * home's first screen waits on tableChoiceRead, capped, so a Winter Dusk owner never sees the sunny
 * home turn snowy). A read that fails, or a choice no longer owned, keeps the default; a choice the
 * player makes meanwhile always wins over what the read finds.
 */
export async function startTables(): Promise<void> {
  try {
    const m = await loadManifest();
    fallback = m.default;
    void tryFromUrl();
    // everyone's table, laid at once (its card back too, which no stylesheet fallback carries), while
    // the player's own choice is asked for; a different choice changes over when it is read
    const builtIn = m.tables.find((x) => x.id === m.default);
    if (builtIn && !touched && chosen === m.default) {
      void paint(builtIn);
      showBorder(builtIn);
    }
    // the player's choice (one read with the track's, choices.ts): no player, or no answer, keeps the default
    const want = pretendAll() ? m.default : ((await readChoices()).get(SETTING) ?? m.default);
    if (touched) return;
    // the default is everyone's: no need to ask what is owned for it (the usual case, and the quick one)
    const mine = want === m.default ? m.tables : await ownedTableArts();
    const a = mine.find((x) => x.id === want) ?? m.tables.find((x) => x.id === m.default);
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
  if (!pretending()) keepChoice(SETTING, a.id);
}

/** The default table's id (the manifest's: the sunny day). */
export const defaultTable = (): string => fallback;
