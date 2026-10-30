// THE EVENT, the platform's word: two weeks of dailies for Gem Arcade VIP members (docs/vip.md; the
// Daily Suitcase, docs/daily-suitcase.md, reshaped by the creator, 2026-10-30). The screens
// (src/ui/suitcase.ts, through src/ui/suitcase-data.ts) draw from current() and past() and redraw on
// onChange. Everything in it is the server's: the win checker (functions/checker/src/suitcase.rs)
// holds the counts as platform items, packs a day's item on a VIP's first win of that day (today's,
// or a past day's from the archive), decides a swap, and pays a full suitcase's table and helpers
// once (the event's own mark, never a flag of ours). This file adds only what the player reads: the
// theme, the item titles, the slot order and the days (Levels' src/content/levels/events.json) and
// the days left, from the platform's date for the daily (src/net/daily.ts), never the device's.
//
//   suitcase.current()          the running event's suitcase, or null (not read yet, no event now,
//                               or not VIP)
//   suitcase.past()             the archive: past events, newest first, at most 12, empty ones too
//   suitcase.swap(want, event?) 2 spares (the server picks: biggest stacks first) for missing item
//                               `want`, in the running event or a past one (its id; the running one
//                               when left out): "ok" | "short" (too few spares) | "has" (held
//                               already) | "closed" (not open to this player, or not begun) |
//                               "failed" (no answer: try again later)
//   suitcase.lastPrize()        a prize that landed since last asked ({ month, helpers }), once
//   suitcase.onChange(fn)       hear any change. Returns the unsubscribe.
//
// Only a VIP has the event (src/net/vip.ts; the checker decides, and answers "off" to anyone else):
// it is read from the checker ({"v":1,"what":"suitcase"}, which also pays a full suitcase found
// unpaid) when the game starts and the player is VIP, when VIP turns on, when the player's day
// turns, and after a daily verdict that does not carry the event itself (claims.ts hands the ones
// that do to accept()). A read that gets no answer is tried again with a backoff, and at once when
// the connection comes back. Not VIP, or the switch off (src/net/suitcase-ids.json `on`), nothing
// here asks: current() is null, past() empty, swap() "closed". Unframed (a plain tab, the play-test
// tool) there is no platform: no suitcase.

import { gem } from "../gem";
import EVENT_FILE from "../content/levels/events.json";
import IDS from "./suitcase-ids.json";
import { currentDaily, onDailyChange } from "./daily";
import { helpers, type HelperKind } from "./helpers";
import { noAnswer, refusalOf } from "./no-answer";
import { backoff, heard as hearRefusal, whenDue } from "./pace";
import { onOnline, suspect } from "../ui/online";
import { heardVip, isVip, onVipChange, vipFields } from "./vip";

export type SuitItem = { id: string; title: string };

export type Suitcase = {
  /** "halloween-2026": the event's id (events.json). Always set by this file; optional only while UI's preview (src/ui/suitcase-data.ts) still builds months. */
  id?: string;
  /** The same id, for screens written when an event was a month. */
  month: string;
  /** "Ski Trip". */
  theme: string;
  /** About 7, in slot order. */
  items: SuitItem[];
  /** Each of its 14 days, "YYYY-MM-DD", and that day's item id (always set here, as `id`). */
  days?: Record<string, string>;
  /** Copies held, by item id (absent: missing). */
  counts: Record<string, number>;
  /** The event's first and last days (`start` always set here, as `id`). */
  start?: string;
  ends: string;
  /** Days left, today included; 0 for a past event (the archive). */
  daysLeft: number;
  /** Every item is held. */
  complete: boolean;
  /** What a full suitcase unlocks: the event's table (its slug; the built-in one while an event is a stand-in) and helpers. */
  prize: { table: string; tableTitle?: string; helpers: Partial<Record<HelperKind, number>> };
  /** The prize is paid: the platform's word (the event's mark). */
  paid: boolean;
};

export type SwapAnswer = "ok" | "short" | "has" | "closed" | "failed";

type EventData = { id: string; theme: string; table?: string; tableTitle?: string; start: string; end: string; items: SuitItem[]; days: Record<string, string> };
const EVENTS = (EVENT_FILE as unknown as { events: EventData[] }).events;

const framed = window.self !== window.top;
/** The event's switch (src/net/suitcase-ids.json): on means on for VIPs. Off, the checker is never asked. */
const on = (IDS as { on?: boolean }).on === true;
/** Copies beyond the first that one swap takes. */
export const SWAP_COST: number = (IDS as { spares?: number }).spares ?? 2;
const heard = new Set<() => void>();
let now: Suitcase | null = null;
let shelf: Suitcase[] = [];
let prize: { month: string; helpers: Record<HelperKind, number> } | null = null;
let reading: Promise<void> | null = null;
let tries = 0;
let again: (() => void) | null = null;

const say = (): void => {
  for (const fn of [...heard]) fn();
};

/** Days from `a` to `b` ("YYYY-MM-DD"), b - a. */
function daysBetween(a: string, b: string): number {
  const at = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((at(b) - at(a)) / 86_400_000);
}

/** The server's event, with what the player reads added. Null for an event this build does not know. */
function view(x: unknown, today: string): Suitcase | null {
  const s = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const id = typeof s.id === "string" ? s.id : s.month;
  const e = EVENTS.find((ee) => ee.id === id);
  if (!e) return null;
  const raw = (s.counts && typeof s.counts === "object" ? s.counts : {}) as Record<string, unknown>;
  const counts: Record<string, number> = {};
  for (const it of e.items) {
    const n = Math.floor(Number(raw[it.id]) || 0);
    if (n > 0) counts[it.id] = n;
  }
  const p = (s.prize && typeof s.prize === "object" ? s.prize : {}) as { helpers?: Partial<Record<HelperKind, number>> };
  return {
    id: e.id,
    month: e.id,
    theme: e.theme,
    items: e.items.map((it) => ({ id: it.id, title: it.title })),
    days: { ...e.days },
    counts,
    start: e.start,
    ends: e.end,
    daysLeft: Math.max(0, daysBetween(today, e.end) + 1),
    complete: s.complete === true,
    prize: {
      table: e.table ?? IDS.builtInTable,
      ...(e.tableTitle ? { tableTitle: e.tableTitle } : {}),
      helpers: p.helpers ?? IDS.prize,
    },
    paid: s.paid === true,
  };
}

/** Note a prize that landed (helpers > 0 or the "suitcase" gift) and read the stock again. */
function landed(event: string | undefined, gifts: unknown, got: unknown): void {
  if (!Array.isArray(gifts) || !gifts.includes("suitcase")) return;
  const h = (got && typeof got === "object" ? got : {}) as Partial<Record<HelperKind, unknown>>;
  const n = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));
  prize = { month: event ?? now?.id ?? "", helpers: { hint: n(h.hint), undo: n(h.undo), shuffle: n(h.shuffle) } };
  void helpers.refresh();
}

/** Put an event the server answered with in its place: the running one, or the archive's. */
function place(s: Suitcase): void {
  if (now && now.id === s.id) now = s;
  else shelf = shelf.map((p) => (p.id === s.id ? s : p));
}

async function read(): Promise<void> {
  try {
    await gem.awaitIdentity(10_000);
    const a = (await gem.functions.invoke({ v: 1, what: "suitcase", ...vipFields() })).json() as Record<string, unknown>;
    heardVip(a);
    if (a.status !== "suitcase" || typeof a.today !== "string") {
      // "retry": the platform was busy, or this channel's config does not know the event yet
      throw new Error(`the checker answered ${String(a.status)} ${String(a.reason ?? "")}`);
    }
    tries = 0;
    now = a.current ? view(a.current, a.today) : null;
    shelf = Array.isArray(a.past) ? a.past.map((p) => view(p, a.today as string)).filter((p): p is Suitcase => p !== null) : [];
    const ids = Array.isArray(a.prizes) ? (a.prizes as string[]) : [];
    landed(ids[0], a.gifts, a.helpers);
    say();
  } catch (err) {
    if (noAnswer(err)) suspect();
    hearRefusal(err);
    console.warn(`[suitcase] could not be read: ${refusalOf(err)}`);
    again?.();
    again = whenDue(backoff(++tries, 5000), () => {
      again = null;
      void refresh();
    });
  } finally {
    reading = null;
  }
}

/** Read the suitcase again (at most one read at a time), for a VIP only. */
function refresh(): Promise<void> {
  if (!framed || !on || !isVip()) return Promise.resolve();
  reading ??= read();
  return reading;
}

/**
 * A daily verdict (claims.ts): one that packed a day's item carries its event, after it; any other
 * daily answer (a resend, a late finish) reads the suitcase again.
 */
export function accept(answer: Record<string, unknown>): void {
  if (!on || !isVip()) return;
  if (answer.suitcase && typeof answer.suitcase === "object") {
    const s = view(answer.suitcase, currentDaily().date);
    if (s) place(s);
    landed(s?.id, answer.gifts, answer.helpers);
    say();
  } else {
    void refresh();
  }
}

export const suitcase = {
  current: (): Suitcase | null => now,
  past: (): Suitcase[] => shelf,
  lastPrize(): { month: string; helpers: Record<HelperKind, number> } | null {
    const p = prize;
    prize = null;
    return p;
  },
  onChange(fn: () => void): () => void {
    heard.add(fn);
    return () => void heard.delete(fn);
  },
  async swap(want: string, event?: string): Promise<SwapAnswer> {
    if (!on || !isVip()) return "closed";
    const id = event ?? now?.id;
    if (!framed || !id) return "failed";
    try {
      await gem.awaitIdentity(10_000);
      const a = (await gem.functions.invoke({ v: 1, what: "swap", event: id, month: id, want, ...vipFields() })).json() as Record<string, unknown>;
      heardVip(a);
      const status = a.status;
      if (status === "closed") {
        void refresh();
        return "closed";
      }
      if (a.suitcase) {
        const s = view(a.suitcase, currentDaily().date);
        if (s) place(s);
      }
      if (status === "ok") {
        landed(id, a.gifts, a.helpers);
        say();
        return "ok";
      }
      if (status === "short" || status === "has") {
        say();
        return status;
      }
      console.warn(`[suitcase] swap: ${String(status)} ${String(a.reason ?? "")}`);
      return "failed";
    } catch (err) {
      if (noAnswer(err)) suspect();
      console.warn(`[suitcase] swap: no answer: ${refusalOf(err)}`);
      // it may have landed: read what the platform holds
      void refresh();
      return "failed";
    }
  },
};

/** Read the suitcase as the game starts (src/net/progress.ts calls it), and keep it current. */
export async function loadSuitcase(): Promise<void> {
  if (!framed || !on) return;
  await refresh();
}

if (framed && on) {
  onDailyChange(() => void refresh());
  onOnline((up) => {
    if (up && tries > 0) void refresh();
  });
  // VIP on: read it; VIP off: none of it is the player's to see
  onVipChange((vip) => {
    if (vip) {
      void refresh();
    } else {
      now = null;
      shelf = [];
      say();
    }
  });
}
