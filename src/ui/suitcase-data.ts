// THE EVENT as the screens see it (docs/vip.md: two weeks, for VIPs only; docs/daily-suitcase.md, reshaped
// by the creator, 2026-10-30): the running event's suitcase of about 7 travel items, each turning up twice
// in its 14 dailies, the copies the player holds, the swap (2 spares), the prize table, and the archive of
// past events (each still playable by a VIP: its 14 boards). The record is the platform's, read and written
// by Server's src/net/suitcase.ts (current, past, swap(want, event)); the schedule is Levels'
// src/content/levels/events.json, read here for what a player who is not a VIP may see of the event's door
// (its name and prize: suitcase.ts, vip-door.ts) and for the next event's preview.
//
// In front of the platform's word, outside a release build only:
//   the creator's EVENT PREVIEW (the dev menu): a pretend Ski Trip, practice, nothing saved or sent: a
//   practice daily of its days packs its item into it, a swap is decided here, and the last one shows
//   the full-suitcase moment;
//   the play-test tool's stand-in (__ps.suitcase).
//
// Nothing here is the device's record: no count, no "paid" flag, no date of its own.
//
// Not shown (event-switch.ts: off, or not a VIP), the platform's word is never asked for here: no event, no
// archive, no prize, no swap. A pretend one still shows, outside a release build, for the creator's
// preview and the play-test tool.

import { suitcase as platform, SWAP_COST as NET_SWAP_COST, type Suitcase as NetSuitcase, type SwapAnswer } from "../net/suitcase";
import { currentDaily } from "../net/daily";
import IDS from "../net/suitcase-ids.json";
import EVENT_FILE from "../content/levels/events.json";
import type { HelperKind } from "./stock";
import { eventShown, lookAtEvent } from "./event-switch";

export type { SwapAnswer };
/** An item: its id (Levels', "item-2026-11-04", "item-halloween-2026-01", also its picture's) and title; `pic` only for a stand-in drawn from elsewhere. */
export type SuitItem = { id: string; title: string; pic?: string };
/** The event as Server's module gives it (`ends` optional for the stand-in). */
export type Suitcase = Omit<NetSuitcase, "ends" | "items"> & { ends?: string; items: SuitItem[] };

/** Copies beyond the first, of any item: what the swap spends, 2 at a time. */
export const spares = (s: Suitcase): number => s.items.reduce((n, it) => n + Math.max(0, (s.counts[it.id] ?? 0) - 1), 0);
export const held = (s: Suitcase): number => s.items.filter((it) => (s.counts[it.id] ?? 0) > 0).length;
export const SWAP_COST: number = NET_SWAP_COST;

const heard = new Set<() => void>();
const say = () => {
  for (const fn of [...heard]) fn();
};
platform.onChange(say);

/** An event in Levels' schedule. */
export type EventData = { id: string; standIn?: boolean; theme: string; table: string; tableTitle?: string; start: string; end: string; items: SuitItem[]; days: Record<string, string> };
export const EVENTS: readonly EventData[] = (EVENT_FILE as unknown as { events: EventData[] }).events;

/** "2026-11-01" plus `n` days. */
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}
/** The days of an event, first to last, both counted. */
export const eventLength = (e: { start?: string; ends?: string; end?: string }): number => {
  const start = e.start;
  const end = e.ends ?? e.end;
  if (!start || !end) return 14;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
};

/** Levels' event `e` as a suitcase, as `counts` would fill it (nothing held: a preview). */
function fromLevels(e: EventData, counts: Record<string, number> = {}, daysLeft = eventLength(e)): Suitcase {
  const complete = e.items.every((it) => (counts[it.id] ?? 0) > 0);
  return {
    id: e.id,
    month: e.id,
    theme: e.theme,
    items: e.items.map((it) => ({ id: it.id, title: it.title })),
    days: e.days,
    counts,
    start: e.start,
    ends: e.end,
    daysLeft,
    complete,
    prize: { table: e.table, ...(e.tableTitle ? { tableTitle: e.tableTitle } : {}), helpers: IDS.prize as Partial<Record<HelperKind, number>> },
    paid: complete,
  };
}

/** The event running on the player's date in Levels' schedule, else the next to come (a non-VIP's door: its name and prize, never its record). */
export function scheduledEvent(today = currentDaily().date): { e: EventData; running: boolean } | null {
  const real = EVENTS.filter((e) => !e.standIn);
  const now = real.find((e) => e.start <= today && today <= e.end);
  if (now) return { e: now, running: true };
  const next = real.find((e) => e.start > today);
  return next ? { e: next, running: false } : null;
}

// ---------------------------------------------------------------- outside a release build
type Pretend = { now: Suitcase | null; past: Suitcase[]; preview?: boolean };
let pretend: Pretend | null = null;
/** The last day the preview gave to play. */
let previewCursor: string | null = null;
const ALLOWED = import.meta.env.MODE !== "release";

/** The event the creator's preview and the play-test's stand-in pretend with: the first real one. */
const PREVIEW = (): EventData | undefined => EVENTS.find((e) => !e.standIn && e.id === "ski-trip-2026") ?? EVENTS.find((e) => !e.standIn);
/** The preview's start: 5 of 7 held, 3 spares (one swap's worth, and one over). */
const START = [1, 2, 1, 0, 1, 0, 3];

/** The play-test tool's stand-in: the Ski Trip part-filled, and Halloween in the archive. */
export function standIn(): Pretend {
  const ev = PREVIEW();
  const counts: Record<string, number> = {};
  [1, 2, 0, 3, 1, 0, 1].forEach((n, i) => n && ev?.items[i] && (counts[ev.items[i]!.id] = n));
  const past = EVENTS.filter((e) => !e.standIn && ev && e.end < ev.start)
    .reverse()
    .map((e, i) => fromLevels(e, Object.fromEntries(e.items.slice(0, i === 0 ? 5 : e.items.length).map((it) => [it.id, 1])), 0));
  return { now: ev ? fromLevels(ev, counts, 9) : null, past };
}

export const suitcases = {
  /** The running event's suitcase, or null (not read yet, no event now, or not a VIP). */
  current: (): Suitcase | null => (pretend ? pretend.now : eventShown() ? platform.current() : null),
  /**
   * The next event, while none is on (home's strip: "Starts Nov 1"; the suitcase as a preview: every
   * slot an outline, the prize, no swap): Levels' next event after the platform's today. Null while an
   * event is on, or when Levels has no later one.
   */
  upcoming(): { s: Suitcase; starts: string } | null {
    if (!eventShown() || suitcases.current()) return null;
    const next = scheduledEvent();
    return next && !next.running ? { s: fromLevels(next.e), starts: next.e.start } : null;
  },
  /** The archive: past events, newest first, every one (a VIP can still fill an empty one). */
  past: (): Suitcase[] => (pretend ? pretend.past : eventShown() ? platform.past() : []),
  /** A prize that landed since last asked (a swap's, a win's, a read's), once; null otherwise. */
  lastPrize: (): { month: string; helpers: Partial<Record<HelperKind, number>> } | null => (pretend || !eventShown() ? null : platform.lastPrize()),
  /** Swap 2 spares for missing item `want` in event `event` (the running one when left out); the server picks which spares go (a preview's, here alike). */
  async swap(want: string, event?: string): Promise<SwapAnswer> {
    if (!pretend) return eventShown() ? platform.swap(want, event) : "closed";
    const s = event ? (pretend.past.find((x) => x.id === event) ?? pretend.now) : pretend.now;
    if (!s) return "closed";
    if ((s.counts[want] ?? 0) > 0) return "has";
    if (spares(s) < SWAP_COST) return "short";
    await new Promise((r) => setTimeout(r, 500));
    // the biggest stacks give first
    let left = SWAP_COST;
    while (left > 0) {
      const top = [...s.items].sort((a, b) => (s.counts[b.id] ?? 0) - (s.counts[a.id] ?? 0))[0]!;
      s.counts[top.id]! -= 1;
      left--;
    }
    s.counts[want] = 1;
    s.complete = s.items.every((it) => (s.counts[it.id] ?? 0) > 0);
    s.paid = s.complete;
    say();
    return "ok";
  },
  /** Hear a change (a count, a swap, the event turning, VIP coming or going). Returns the unsubscribe. */
  onChange(fn: () => void): () => void {
    heard.add(fn);
    return () => void heard.delete(fn);
  },

  // ---- outside a release build ----
  /** The play-test tool's stand-in (null: the platform's word again). */
  pretend(p: Partial<Pretend> | null | "default"): void {
    if (!ALLOWED) return;
    pretend = p === null ? null : p === "default" ? standIn() : { ...(pretend ?? standIn()), ...p };
    lookAtEvent(!!pretend);
    say();
  },
  /**
   * The creator's event preview (the dev menu): "start", the Ski Trip 5 of 7 with 3 spares; "almost",
   * 6 of 7, the one missing being its first day's item (play that day, or swap for it); null: off.
   * Practice throughout: nothing is saved or sent.
   */
  preview(kind: "start" | "almost" | null): void {
    if (!ALLOWED) return;
    const ev = PREVIEW();
    if (!kind || !ev) {
      pretend = null;
      lookAtEvent(false);
      say();
      return;
    }
    const counts: Record<string, number> = {};
    const first = ev.days[ev.start];
    ev.items.forEach((it, i) => {
      const n = kind === "start" ? (START[i] ?? 1) : it.id === first ? 0 : i === 1 ? 3 : 1;
      if (n) counts[it.id] = n;
    });
    pretend = { now: fromLevels(ev, counts, 9), past: standIn().past, preview: true };
    lookAtEvent(true);
    previewCursor = null;
    say();
  },
  /** The creator's event preview is on. */
  previewing: (): boolean => ALLOWED && !!pretend?.preview,
  /**
   * The preview's next event puzzle (its "Play the Daily Puzzle!"): the next of its days, after the
   * last one given, whose item the pretend suitcase lacks, so each win packs a new one; with nothing
   * missing, the next day at all (its item a spare: "packed again ×N").
   */
  previewNextDay(): { date: string; item: string; spare: boolean } | null {
    const s = ALLOWED && pretend?.preview ? pretend.now : null;
    const days = s?.days;
    if (!s || !days) return null;
    const all = Object.keys(days).sort();
    const at = previewCursor ? all.indexOf(previewCursor) + 1 : 0;
    const order = [...all.slice(at), ...all.slice(0, at)];
    const missing = order.find((d) => !(s.counts[days[d]!] ?? 0));
    const date = missing ?? order[0];
    if (!date) return null;
    previewCursor = date;
    return { date, item: days[date]!, spare: !missing };
  },
  /**
   * A practice daily's item, packed into the preview (its win card's moment): the copies after it,
   * and whether it was the last missing. Null when no preview is on or the item is not this event's.
   */
  previewPack(item: string): { count: number; full: boolean; month: string } | null {
    const s = ALLOWED && pretend?.preview ? pretend.now : null;
    if (!s || !s.items.some((it) => it.id === item)) return null;
    const was = s.complete;
    s.counts[item] = (s.counts[item] ?? 0) + 1;
    s.complete = s.items.every((it) => (s.counts[it.id] ?? 0) > 0);
    s.paid = s.complete;
    say();
    return { count: s.counts[item]!, full: s.complete && !was, month: s.month };
  },
};

/** "2026-10-15" for event `e`'s day `n` (0-based). */
export const eventDay = (e: { start?: string }, n: number): string | null => (e.start ? addDays(e.start, n) : null);
