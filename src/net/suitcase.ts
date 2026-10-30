// THE EVENTS, the platform's word: VIP content packs (docs/vip.md, the creator, 2026-10-30). Each event
// is 30 levels of its own, with 10 items hidden one per level; finding all 10 wins the event's table
// (and helpers), once. Open to a VIP from its release date on, for good: no deadline, no swap, no
// spares, and nothing from the dailies. The screens (src/ui/suitcase.ts, through
// src/ui/suitcase-data.ts) draw from events() and redraw on onChange.
//
// Everything in it is the server's: the win checker (functions/checker/src/suitcase.rs) refuses an
// event level to anyone who is not VIP ("vip_only") or before its release ("not_released"), pays its
// Coins once, packs its item on its first verified win, and pays a full suitcase's prize once (the
// event's own mark, never a flag of ours). Which event levels are won is the progress record's
// (src/net/progress.ts eventBest). This file adds only what the player reads: the theme, the item
// titles and the table's title (Levels' src/content/levels/events.json).
//
//   suitcase.events()        the events released for this player, newest first, each an EventPack;
//                            [] until read, unless VIP, or with the switch off
//   suitcase.event(id)       one of them
//   suitcase.upcoming()      the events announced but not released yet by the player's date (no VIP needed)
//   suitcase.lastPrize()     a prize that landed since last asked ({ event, helpers }), once (its table is
//                            in the level's verdict's `items`)
//   suitcase.refresh()       read again (when the events screen opens): from memory if the last read
//                            was under 5 minutes ago (every verdict keeps it current), else one read,
//                            one at a time, paced
//   suitcase.onChange(fn)    hear any change. Returns the unsubscribe.
//
// Read from the checker ({"v":1,"what":"suitcase"}, which also pays a full suitcase found unpaid)
// when the game starts (whoever the player is: the answer says VIP too, so src/net/vip.ts asks
// nothing of its own), when VIP turns on, when the player's day turns (an event may have been
// released), and after an event level is refused; a verdict that carries its event (claims.ts)
// keeps it current with no read. A read that gets no answer is tried again with a
// backoff, and at once when the connection comes back. Unframed (a plain tab, the play-test tool)
// there is no platform: no events.

import { gem } from "../gem";
import EVENT_FILE from "../content/levels/events.json";
import IDS from "./suitcase-ids.json";
import { currentDaily, onDailyChange } from "./daily";
import { helpers, type HelperKind } from "./helpers";
import { noAnswer, refusalOf } from "./no-answer";
import { backoff, heard as hearRefusal, whenDue } from "./pace";
import { onOnline, suspect } from "../ui/online";
import { heardVip, isVip, onVipChange, vipFields, vipKnown, vipReady } from "./vip";

export type EventItem = {
  id: string;
  title: string;
  /** The level it is hidden in (one of the event's `levels`); null while the event has no levels yet. */
  level: string | null;
  /** Held: the platform's word. */
  found: boolean;
};

export type EventPack = {
  /** "halloween-2026". */
  id: string;
  /** "Haunted Holiday". */
  theme: string;
  /** "YYYY-MM-DD": the day it became playable (for VIPs, for good). */
  release: string;
  /** Its levels' ids ("halloween-2026-01"…), in play order: board ids of the "event" lane. */
  levels: string[];
  /** Its items, in slot order, each with its level. */
  items: EventItem[];
  /** How many items are found. */
  found: number;
  /** Every item found. */
  complete: boolean;
  /** The prize is paid: the platform's word (the event's mark). */
  paid: boolean;
  /** What a full suitcase wins: the event's table (its slug; the built-in one while the event is a stand-in) and helpers. */
  prize: { table: string; tableTitle?: string; helpers: Partial<Record<HelperKind, number>> };
};

type EventData = {
  id: string;
  theme: string;
  table?: string;
  tableTitle?: string;
  release?: string;
  start?: string;
  levels?: string[];
  items: { id: string; title: string; level?: string }[];
};
const EVENTS = (EVENT_FILE as unknown as { events: EventData[] }).events;
const releaseOf = (e: EventData): string => e.release ?? e.start ?? "";

const framed = ((): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true;
  }
})();
/** The events' switch (src/net/suitcase-ids.json): on means on for VIPs. Off, the checker is never asked. */
const on = (IDS as { on?: boolean }).on === true;
const heard = new Set<() => void>();
let list: EventPack[] = [];
let prize: { event: string; helpers: Record<HelperKind, number> } | null = null;
let reading: Promise<void> | null = null;
/** When the last read landed (Date.now()), 0 before one: a refresh within FRESH_MS answers from memory. */
let readAt = 0;
const FRESH_MS = 5 * 60_000;
let tries = 0;
let again: (() => void) | null = null;

const say = (): void => {
  for (const fn of [...heard]) fn();
};

/** The server's event, with what the player reads added. Null for an event this build does not know. */
function view(x: unknown): EventPack | null {
  const s = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const e = EVENTS.find((ee) => ee.id === s.id);
  if (!e) return null;
  const got = new Map<string, boolean>();
  for (const it of Array.isArray(s.items) ? s.items : []) {
    const i = (it && typeof it === "object" ? it : {}) as { id?: unknown; found?: unknown };
    if (typeof i.id === "string") got.set(i.id, i.found === true);
  }
  const items = e.items.map((it) => ({ id: it.id, title: it.title, level: it.level ?? null, found: got.get(it.id) === true }));
  const p = (s.prize && typeof s.prize === "object" ? s.prize : {}) as { helpers?: Partial<Record<HelperKind, number>> };
  return {
    id: e.id,
    theme: e.theme,
    release: releaseOf(e),
    levels: [...(e.levels ?? [])],
    items,
    found: items.filter((i) => i.found).length,
    complete: s.complete === true,
    paid: s.paid === true,
    prize: {
      table: e.table ?? IDS.builtInTable,
      ...(e.tableTitle ? { tableTitle: e.tableTitle } : {}),
      helpers: p.helpers ?? IDS.prize,
    },
  };
}

/** Note a prize that landed (the "suitcase" gift) and read the helper stock again. */
function landed(event: string | undefined, gifts: unknown, got: unknown): void {
  if (!Array.isArray(gifts) || !gifts.includes("suitcase")) return;
  const h = (got && typeof got === "object" ? got : {}) as Partial<Record<HelperKind, unknown>>;
  const n = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));
  prize = { event: event ?? list[0]?.id ?? "", helpers: { hint: n(h.hint), undo: n(h.undo), shuffle: n(h.shuffle) } };
  void helpers.refresh();
}

/** Put an event the server answered with in its place. */
function place(e: EventPack): void {
  list = list.some((x) => x.id === e.id) ? list.map((x) => (x.id === e.id ? e : x)) : [e, ...list].sort((a, b) => (a.release < b.release ? 1 : -1));
}

async function read(): Promise<void> {
  try {
    await gem.awaitIdentity(10_000);
    const a = (await gem.functions.invoke({ v: 1, what: "suitcase", ...vipFields() })).json() as Record<string, unknown>;
    heardVip(a);
    if (a.status !== "suitcase" || typeof a.today !== "string") {
      // "retry": the platform was busy, or this channel's config does not know the events yet
      throw new Error(`the checker answered ${String(a.status)} ${String(a.reason ?? "")}`);
    }
    tries = 0;
    readAt = Date.now();
    list = (Array.isArray(a.events) ? a.events : []).map(view).filter((e): e is EventPack => e !== null);
    const ids = Array.isArray(a.prizes) ? (a.prizes as string[]) : [];
    landed(ids[0], a.gifts, a.helpers);
    say();
  } catch (err) {
    if (noAnswer(err)) suspect();
    hearRefusal(err);
    console.warn(`[suitcase] the events could not be read: ${refusalOf(err)}`);
    again?.();
    again = whenDue(backoff(++tries, 5000), () => {
      again = null;
      void refresh(true);
    });
  } finally {
    reading = null;
  }
}

/**
 * Read the events again (at most one read at a time): for a VIP, or while VIP is not known yet (the
 * read says). `force` reads even within FRESH_MS of the last read (VIP turned on, a new day, a refusal).
 */
function refresh(force = false): Promise<void> {
  if (!framed || !on || (!isVip() && vipKnown())) return Promise.resolve();
  if (!force && !reading && readAt && Date.now() - readAt < FRESH_MS) return Promise.resolve();
  reading ??= read();
  return reading;
}

/**
 * An event level's verdict (claims.ts): one that packed its item carries its event, after it; any
 * other (a replay, a level with no item) changes nothing here, and a refusal reads the events again.
 */
export function accept(answer: Record<string, unknown>): void {
  if (!on || !isVip()) return;
  if (answer.suitcase && typeof answer.suitcase === "object") {
    const e = view(answer.suitcase);
    if (e) place(e);
    landed(e?.id, answer.gifts, answer.helpers);
    say();
  } else if (answer.status === "refused") {
    void refresh(true);
  }
}

export const suitcase = {
  events: (): EventPack[] => list,
  event: (id: string): EventPack | undefined => list.find((e) => e.id === id),
  upcoming(): { id: string; theme: string; release: string }[] {
    const today = currentDaily().date;
    return EVENTS.filter((e) => releaseOf(e) > today)
      .map((e) => ({ id: e.id, theme: e.theme, release: releaseOf(e) }))
      .sort((a, b) => (a.release < b.release ? -1 : 1));
  },
  refresh: (): Promise<void> => refresh(),
  lastPrize(): { event: string; helpers: Record<HelperKind, number> } | null {
    const p = prize;
    prize = null;
    return p;
  },
  onChange(fn: () => void): () => void {
    heard.add(fn);
    return () => void heard.delete(fn);
  },
};

/** Read the events as the game starts (src/net/progress.ts calls it), which says VIP too, and keep them current. */
export async function loadSuitcase(): Promise<void> {
  if (!framed || !on) return;
  await vipReady(); // the dev pretend kept from last time goes with this first read
  await refresh(true);
}

if (framed && on) {
  // a new day may release an event
  onDailyChange(() => void refresh(true));
  onOnline((up) => {
    if (up && tries > 0) void refresh(true);
  });
  // VIP on: read them; VIP off: none of it is the player's to see
  onVipChange((vip) => {
    if (vip) {
      void refresh(true);
    } else {
      list = [];
      say();
    }
  });
}
