// THE EVENTS as the screens see them (docs/vip.md, the creator, 2026-10-30): VIP content packs, each 30
// levels of its own with 10 items hidden one per level; finding all 10 wins the event's table (and
// helpers), once. A VIP plays any released event at any time: no deadline, no swap, nothing from the
// dailies. The record is the platform's, through Server's src/net/suitcase.ts (events(), event(id),
// upcoming(), lastPrize()); which levels are won is the progress record's (src/net/progress.ts
// eventBest). Levels' src/content/levels/events.json says what a player who is not a VIP may see of the
// door (the newest event's name and prize table); the boards themselves are Gameplay's loader's
// (src/game/levels.ts loadEventLevels), loaded only when an event page or level opens.
//
// Outside a release build only: a stand-in (the play-test tool's __ps.suitcase, the dev menu's switch), so
// the pages can be seen filled where no platform answers, as of a date of the creator's choosing (the
// creator, 2026-10-30: "see Haunted Holiday as a past event now"): the events Levels releases by then, the
// newest barely begun, the one before part-played, older ones full; the rest to come. Its won levels are
// its own; nothing is saved or sent.
//
// Nothing here is the device's record: no count, no "paid" flag, no date of its own. While the events are
// not shown (event-switch.ts: off, or not a VIP), the platform is never asked here.

import { suitcase as platform, type EventItem, type EventPack } from "../net/suitcase";
import { eventBest, onProgress } from "../net/progress";
import { currentDaily } from "../net/daily";
import IDS from "../net/suitcase-ids.json";
import EVENT_FILE from "../content/levels/events.json";
import type { HelperKind } from "./stock";
import { eventShown, lookAtEvent } from "./event-switch";

export type { EventItem, EventPack };
/** An item as the screens draw it: its id (also its picture's) and title; `pic` only for a stand-in drawn from elsewhere. */
export type SuitItem = { id: string; title: string; pic?: string };

/** An event in Levels' schedule (events.json v3; the older fields kept while a file has them). */
export type EventData = {
  id: string;
  standIn?: boolean;
  theme: string;
  table: string;
  tableTitle?: string;
  release?: string;
  start?: string;
  levels?: string[];
  items: { id: string; title: string; level?: string }[];
};
export const EVENTS: readonly EventData[] = (EVENT_FILE as unknown as { events: EventData[] }).events;
const releaseOf = (e: EventData): string => e.release ?? e.start ?? "";
/** How many levels an event has (Levels': 30). */
export const EVENT_LEVELS = 30;

/**
 * A player who is not a VIP sees the door to the newest event released by their date (Levels' schedule),
 * else the next one to come: its name and prize, never a record.
 */
export function scheduledEvent(today = currentDaily().date): { e: EventData; released: boolean } | null {
  const real = EVENTS.filter((e) => !e.standIn && releaseOf(e));
  const out = real.filter((e) => releaseOf(e) <= today).sort((a, b) => releaseOf(b).localeCompare(releaseOf(a)))[0];
  if (out) return { e: out, released: true };
  const next = real.filter((e) => releaseOf(e) > today).sort((a, b) => releaseOf(a).localeCompare(releaseOf(b)))[0];
  return next ? { e: next, released: false } : null;
}

// ---------------------------------------------------------------- outside a release build
type Pretend = { packs: EventPack[]; won: Set<string>; upcoming: { id: string; theme: string; release: string }[] };
let pretend: Pretend | null = null;
let pretendAsOf: string | null = null;
const ALLOWED = import.meta.env.MODE !== "release";

/** Event `e` as a pack, its levels the first `won` played and every item on them found. */
function packOf(e: EventData, won: number): { pack: EventPack; won: string[] } {
  const levels = e.levels?.length ? [...e.levels] : Array.from({ length: EVENT_LEVELS }, (_, i) => `${e.id}-${String(i + 1).padStart(2, "0")}`);
  const wonIds = levels.slice(0, won);
  // Levels hides them on levels 2, 5, 8 … 29 (its own `level` where the file says)
  const items: EventItem[] = e.items.map((it, i) => {
    const level = it.level ?? levels[Math.min(levels.length - 1, 1 + i * 3)] ?? null;
    return { id: it.id, title: it.title, level, found: !!level && wonIds.includes(level) };
  });
  const found = items.filter((i) => i.found).length;
  const complete = found === items.length;
  return {
    pack: {
      id: e.id,
      theme: e.theme,
      release: releaseOf(e),
      levels,
      items,
      found,
      complete,
      paid: complete,
      prize: { table: e.table, ...(e.tableTitle ? { tableTitle: e.tableTitle } : {}), helpers: IDS.prize as Partial<Record<HelperKind, number>> },
    },
    won: wonIds,
  };
}

/**
 * The stand-in as of `asOf` (the player's date by default): the events released by then, newest first, the
 * newest 2 levels in, the one before 12 in (4 items found), older ones all 30; the ones after, to come.
 */
export function standIn(asOf = currentDaily().date): Pretend {
  const real = EVENTS.filter((e) => !e.standIn && releaseOf(e)).sort((a, b) => releaseOf(b).localeCompare(releaseOf(a)));
  const out = real.filter((e) => releaseOf(e) <= asOf);
  const made = out.map((e, i) => packOf(e, i === 0 ? 2 : i === 1 ? 12 : EVENT_LEVELS));
  return {
    packs: made.map((m) => m.pack),
    won: new Set(made.flatMap((m) => m.won)),
    upcoming: real
      .filter((e) => releaseOf(e) > asOf)
      .reverse()
      .map((e) => ({ id: e.id, theme: e.theme, release: releaseOf(e) })),
  };
}

const heard = new Set<() => void>();
const say = () => {
  for (const fn of [...heard]) fn();
};
platform.onChange(say);
onProgress(say);

export const suitcases = {
  /** The events this player can play, newest first: the platform's, for a VIP (none read yet: []). */
  list: (): EventPack[] => (pretend ? pretend.packs : eventShown() ? platform.events() : []),
  /** One of them, by id. */
  get: (id: string): EventPack | null => suitcases.list().find((e) => e.id === id) ?? null,
  /** The newest one (home's strip, the page the strip opens). */
  newest: (): EventPack | null => suitcases.list()[0] ?? null,
  /** Events announced but not released yet by the player's date. */
  upcoming: (): { id: string; theme: string; release: string }[] => (pretend ? pretend.upcoming : eventShown() ? platform.upcoming() : []),
  /** Level `id` of an event is won (the progress record's word; the stand-in's own). */
  won: (id: string): boolean => (pretend ? pretend.won.has(id) : eventBest(id) !== undefined),
  /** How many of an event's levels are won. */
  wonCount: (e: EventPack): number => e.levels.filter((id) => suitcases.won(id)).length,
  /** The item hidden on level `id` of event `e`, if any. */
  itemOn: (e: EventPack, id: string): EventItem | null => e.items.find((it) => it.level === id) ?? null,
  /** A prize that landed since last asked, once; null otherwise. */
  lastPrize: (): { event: string; helpers: Partial<Record<HelperKind, number>> } | null => (pretend || !eventShown() ? null : platform.lastPrize()),
  /** Read the platform's word again (the events page opening): paced and one at a time, Server's. */
  refresh(): void {
    if (!pretend && eventShown()) void platform.refresh();
  },
  /** Hear a change (an item found, a level won, a prize, VIP coming or going). Returns the unsubscribe. */
  onChange(fn: () => void): () => void {
    heard.add(fn);
    return () => void heard.delete(fn);
  },

  // ---- outside a release build ----
  /** The stand-in ("default": as of the player's date, or of `asOf`), or the platform's word again (null). */
  pretend(p: "default" | null, asOf?: string): void {
    if (!ALLOWED) return;
    pretend = p === null ? null : standIn(asOf);
    pretendAsOf = p === null ? null : (asOf ?? null);
    lookAtEvent(!!pretend);
    say();
  },
  /** The stand-in is on. */
  pretending: (): boolean => ALLOWED && !!pretend,
  /** The stand-in's date, when it was given one ("2026-11-05"). */
  pretendDate: (): string | null => (ALLOWED && pretend ? pretendAsOf : null),
  /** The stand-in: level `id` won (its item found when it hides one), as a first win there would. */
  pretendWin(id: string): { item: EventItem; pack: EventPack } | null {
    if (!ALLOWED || !pretend || pretend.won.has(id)) return null;
    pretend.won.add(id);
    let hit: { item: EventItem; pack: EventPack } | null = null;
    for (const p of pretend.packs) {
      const it = p.items.find((x) => x.level === id);
      if (!it || it.found) continue;
      it.found = true;
      p.found = p.items.filter((x) => x.found).length;
      p.complete = p.paid = p.found === p.items.length;
      hit = { item: it, pack: p };
    }
    say();
    return hit;
  },
};

/**
 * An event's id and theme, for naming it (the top row, a level's win card, "Carry on?"): the platform's
 * event once read, else Levels' schedule, which the game always has, so the name never waits on a read
 * (QA, 2026-10-30: a kept level's card came up before the list and said only "Level 2").
 */
export function eventNamed(id: string): { id: string; theme: string } | null {
  const e = suitcases.get(id) ?? EVENTS.find((x) => x.id === id);
  return e ? { id: e.id, theme: e.theme } : null;
}
