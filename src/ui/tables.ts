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
}

const SETTING = "table";
const framed = window.self !== window.top;
const url = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, location.href).href;

let manifest: Promise<{ default: string; tables: TableArt[] }> | null = null;
function loadManifest(): Promise<{ default: string; tables: TableArt[] }> {
  manifest ??= fetch(url("art/tables/tables.json"))
    .then((r) => r.json() as Promise<{ default: string; tables: TableArt[] }>)
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
/** A table's small picture, for the picker and a prize. */
export const thumbOf = (a: TableArt): string => url(a.thumb);

/** The tables this player may choose: the default, then each they own, in the list's order. */
export async function ownedTableArts(): Promise<TableArt[]> {
  const m = await loadManifest();
  const owned = new Set(pretendAll() ? m.tables.map((a) => a.id) : await ownedTables());
  return m.tables.filter((a) => a.id === m.default || owned.has(a.id));
}

/** The art of the table `id`, if the list has it. */
export async function tableArt(id: string): Promise<TableArt | undefined> {
  return (await loadManifest()).tables.find((a) => a.id === id);
}

/** The table on the screen now. */
export const chosenTable = (): string => chosen;

/** Hear when the table changes. Returns the unsubscribe. */
export function onTableChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Lay the table's art on the screens, once its picture is ready to show (never a blank moment). */
async function apply(a: TableArt): Promise<void> {
  const img = new Image();
  img.src = url(a.table);
  await img.decode().catch(() => undefined);
  const root = document.documentElement.style;
  root.setProperty("--table-img", `url("${url(a.table)}")`);
  root.setProperty("--table-base", a.base);
  root.setProperty("--stack-back", `url("${url(a.stackBack)}")`);
  chosen = a.id;
  for (const fn of [...listeners]) fn();
}

/**
 * At boot: read the player's choice and what they own, and change over to it.
 * Never holds the first screen; a read that fails changes nothing, and a choice
 * the player makes meanwhile always wins over what the read finds.
 */
export async function startTables(): Promise<void> {
  const m = await loadManifest();
  fallback = m.default;
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
}

/** The player chose a table (one they own): show it, and keep their choice. */
export async function chooseTable(id: string): Promise<void> {
  touched = true;
  const a = (await ownedTableArts()).find((x) => x.id === id);
  if (!a || a.id === chosen) return;
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
