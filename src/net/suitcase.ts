// THE DAILY SUITCASE, the platform's word (docs/daily-suitcase.md; the creator, 2026-10-27). The
// screens (src/ui/suitcase.ts, through src/ui/suitcase-data.ts) draw from current() and past() and
// redraw on onChange. Everything in it is the server's: the win checker
// (functions/checker/src/suitcase.rs) holds the counts as platform items, packs the day's item in
// the daily's first win of the player's day, decides a swap, and pays a full suitcase's table and
// helpers once (the month's own mark, never a flag of ours). This file adds only what the player
// reads: the theme, the item titles and the slot order (Levels' src/content/levels/suitcases.json)
// and the days left, from the platform's date for the daily (src/net/daily.ts), never the device's.
//
//   suitcase.current()       this month's suitcase, or null (not read yet, or no event this month)
//   suitcase.past()          the shelf: closed months, newest first, at most 12, empty ones too
//   suitcase.swap(want)      3 spares (the server picks: biggest stacks first) for missing item `want`:
//                            "ok" | "short" (fewer than 3 spares) | "has" (held already) |
//                            "closed" (not this month's) | "failed" (no answer: try again later)
//   suitcase.lastPrize()     a prize that landed since last asked ({ month, helpers }), once
//   suitcase.onChange(fn)    hear any change. Returns the unsubscribe.
//
// It is read from the checker ({"v":1,"what":"suitcase"}, which also pays a full suitcase found
// unpaid) when the game starts, when the player's day turns, and after a daily verdict that does
// not carry the month itself (claims.ts hands the ones that do to accept()). A read that gets no
// answer is tried again with a backoff, and at once when the connection comes back.
// Unframed (a plain tab, the play-test tool) there is no platform: no suitcase.
// ON HOLD (the creator, 2026-10-29): while src/net/suitcase-ids.json says `"on": false` nothing
// here asks the checker (which would answer an empty suitcase and swap nothing): current() is
// null, past() empty, swap() "closed".

import { gem } from "../gem";
import SCHEDULE from "../content/levels/suitcases.json";
import IDS from "./suitcase-ids.json";
import { currentDaily, onDailyChange } from "./daily";
import { helpers, type HelperKind } from "./helpers";
import { noAnswer, refusalOf } from "./no-answer";
import { backoff, heard as hearRefusal, whenDue } from "./pace";
import { onOnline, suspect } from "../ui/online";

export type SuitItem = { id: string; title: string };

export type Suitcase = {
  /** "2026-11": the month, on the player's own calendar. */
  month: string;
  /** "Ski Trip". */
  theme: string;
  /** The 10, in slot order. */
  items: SuitItem[];
  /** Copies held, by item id (absent: missing). */
  counts: Record<string, number>;
  /** The month's last day, "2026-11-30". */
  ends: string;
  /** Days left, today included; 0 for a closed month (the shelf). */
  daysLeft: number;
  /** All 10 are held. */
  complete: boolean;
  /** What all 10 unlock: the month's table (its slug; the built-in one while a month is a stand-in) and helpers. */
  prize: { table: string; tableTitle?: string; helpers: Partial<Record<HelperKind, number>> };
  /** The prize is paid: the platform's word (the month's mark). */
  paid: boolean;
};

export type SwapAnswer = "ok" | "short" | "has" | "closed" | "failed";

type Month = { month: string; theme: string; table?: string; tableTitle?: string; items: SuitItem[]; days: Record<string, string> };
const MONTHS = (SCHEDULE as unknown as { months: Month[] }).months;

const framed = window.self !== window.top;
/** The event's one switch (src/net/suitcase-ids.json): off, the checker is never asked. */
const on = (IDS as { on?: boolean }).on === true;
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

/** The server's month, with what the player reads added. Null for a month this build does not know. */
function view(x: unknown, today: string): Suitcase | null {
  const s = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const m = MONTHS.find((mm) => mm.month === s.month);
  if (!m) return null;
  const raw = (s.counts && typeof s.counts === "object" ? s.counts : {}) as Record<string, unknown>;
  const counts: Record<string, number> = {};
  for (const it of m.items) {
    const n = Math.floor(Number(raw[it.id]) || 0);
    if (n > 0) counts[it.id] = n;
  }
  const ends = typeof s.ends === "string" && s.ends ? s.ends : Object.keys(m.days).sort().pop()!;
  const p = (s.prize && typeof s.prize === "object" ? s.prize : {}) as { helpers?: Partial<Record<HelperKind, number>> };
  return {
    month: m.month,
    theme: m.theme,
    items: m.items.map((it) => ({ id: it.id, title: it.title })),
    counts,
    ends,
    daysLeft: Math.max(0, daysBetween(today, ends) + 1),
    complete: s.complete === true,
    prize: {
      table: m.table ?? IDS.builtInTable,
      ...(m.tableTitle ? { tableTitle: m.tableTitle } : {}),
      helpers: p.helpers ?? IDS.prize,
    },
    paid: s.paid === true,
  };
}

/** Note a prize that landed (helpers > 0 or the "suitcase" gift) and read the stock again. */
function landed(month: string | undefined, gifts: unknown, got: unknown): void {
  if (!Array.isArray(gifts) || !gifts.includes("suitcase")) return;
  const h = (got && typeof got === "object" ? got : {}) as Partial<Record<HelperKind, unknown>>;
  const n = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));
  prize = { month: month ?? now?.month ?? "", helpers: { hint: n(h.hint), undo: n(h.undo), shuffle: n(h.shuffle) } };
  void helpers.refresh();
}

async function read(): Promise<void> {
  try {
    await gem.awaitIdentity(10_000);
    const a = (await gem.functions.invoke({ v: 1, what: "suitcase" })).json() as Record<string, unknown>;
    if (a.status !== "suitcase" || typeof a.today !== "string") {
      // "retry": the platform was busy, or this channel's config does not know the event yet
      throw new Error(`the checker answered ${String(a.status)} ${String(a.reason ?? "")}`);
    }
    tries = 0;
    now = a.current ? view(a.current, a.today) : null;
    shelf = Array.isArray(a.past) ? a.past.map((p) => view(p, a.today as string)).filter((p): p is Suitcase => p !== null) : [];
    const months = Array.isArray(a.prizes) ? (a.prizes as string[]) : [];
    landed(months[0], a.gifts, a.helpers);
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

/** Read the suitcase again (at most one read at a time). */
function refresh(): Promise<void> {
  if (!framed || !on) return Promise.resolve();
  reading ??= read();
  return reading;
}

/**
 * A daily verdict (claims.ts): one that packed the day's item carries the month, after it;
 * any other daily answer (a resend, a late finish) reads the suitcase again.
 */
export function accept(answer: Record<string, unknown>): void {
  if (!on) return;
  if (answer.suitcase && typeof answer.suitcase === "object") {
    const s = view(answer.suitcase, currentDaily().date);
    if (s && (!now || now.month === s.month)) now = s;
    landed(s?.month, answer.gifts, answer.helpers);
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
  async swap(want: string): Promise<SwapAnswer> {
    if (!on) return "closed";
    if (!framed || !now) return "failed";
    const month = now.month;
    try {
      await gem.awaitIdentity(10_000);
      const a = (await gem.functions.invoke({ v: 1, what: "swap", month, want })).json() as Record<string, unknown>;
      const status = a.status;
      if (status === "closed") {
        void refresh();
        return "closed";
      }
      if (a.suitcase) {
        const s = view(a.suitcase, currentDaily().date);
        if (s && now?.month === s.month) now = s;
      }
      if (status === "ok") {
        landed(month, a.gifts, a.helpers);
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
}
