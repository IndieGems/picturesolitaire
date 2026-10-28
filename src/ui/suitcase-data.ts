// THE DAILY SUITCASE as the screens see it (docs/daily-suitcase.md; the creator, 2026-10-27): this
// month's themed suitcase of 10 travel items, the copies the player holds, the swap, the prize, and
// the shelf of past months. The record is the platform's, read and written by Server's
// src/net/suitcase.ts (platform items and a monthly challenge; the daily claim packs the day's item;
// the swap is checked on the server; the prize paid once). Before a month's event starts, the next
// one is read from Levels' months (src/content/levels/suitcases.json) for home's tile and a preview.
//
// In front of the platform's word, outside a release build only:
//   the creator's EVENT PREVIEW (the dev menu; the creator, 2026-10-27: "test November now"): a
//   pretend November, practice, nothing saved or sent: a practice daily of November packs its item
//   into it, a swap is decided here, and the 10th shows the full-suitcase moment;
//   the play-test tool's stand-in (__ps.suitcase).
//
// Nothing here is the device's record: no count, no "paid" flag, no date of its own.

import { suitcase as platform, type Suitcase as NetSuitcase, type SwapAnswer } from "../net/suitcase";
import { currentDaily } from "../net/daily";
import IDS from "../net/suitcase-ids.json";
import MONTHS from "../content/levels/suitcases.json";
import type { HelperKind } from "./stock";
import { suitcaseItemsOf } from "./catalogue";

export type { SwapAnswer };
/** An item: its id (Levels', "item-2026-11-04", also its picture's) and title; `pic` only for a stand-in drawn from elsewhere. */
export type SuitItem = { id: string; title: string; pic?: string };
/** The month as Server's module gives it (`ends` optional for the stand-in). */
export type Suitcase = Omit<NetSuitcase, "ends" | "items"> & { ends?: string; items: SuitItem[] };

/** Copies beyond the first, of any item: what the swap spends, 3 at a time. */
export const spares = (s: Suitcase): number => s.items.reduce((n, it) => n + Math.max(0, (s.counts[it.id] ?? 0) - 1), 0);
export const held = (s: Suitcase): number => s.items.filter((it) => (s.counts[it.id] ?? 0) > 0).length;
export const SWAP_COST: number = IDS.spares;

const heard = new Set<() => void>();
const say = () => {
  for (const fn of [...heard]) fn();
};
platform.onChange(say);

type MonthData = { month: string; theme: string; table: string; tableTitle?: string; items: SuitItem[]; days: Record<string, string> };
const months = (MONTHS as unknown as { months: MonthData[] }).months;

/** The days of month "2026-11". */
const daysIn = (m: string): number => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y!, mo!, 0)).getUTCDate();
};

/** Levels' month `m` as a suitcase, as `counts` would fill it (nothing held: a preview). */
function fromLevels(m: MonthData, counts: Record<string, number> = {}, daysLeft = daysIn(m.month)): Suitcase {
  const complete = m.items.every((it) => (counts[it.id] ?? 0) > 0);
  return {
    month: m.month,
    theme: m.theme,
    items: m.items.map((it) => ({ id: it.id, title: it.title })),
    counts,
    daysLeft,
    complete,
    prize: { table: m.table, ...(m.tableTitle ? { tableTitle: m.tableTitle } : {}), helpers: IDS.prize as Partial<Record<HelperKind, number>> },
    paid: complete,
  };
}

// ---------------------------------------------------------------- outside a release build
type Pretend = { now: Suitcase | null; past: Suitcase[]; preview?: boolean };
let pretend: Pretend | null = null;
/** The last November day the preview gave to play. */
let previewCursor: string | null = null;
const ALLOWED = import.meta.env.MODE !== "release";

/** The creator's preview: November as it would be some days in, 7 of 10 with 3 spares (one swap's worth). */
const START = [1, 2, 1, 0, 1, 1, 0, 3, 1, 0];

/** The play-test tool's stand-in months: this one part-filled, and two closed ones on the shelf. */
export function standIn(): Pretend {
  const art = suitcaseItemsOf("2026-11");
  const nov = months.find((m) => m.month === "2026-11");
  const counts: Record<string, number> = {};
  const items = nov?.items ?? art.map((a) => ({ id: a.id, title: a.title }));
  [1, 2, 1, 3, 0, 1, 0, 1, 2, 0].forEach((n, i) => n && items[i] && (counts[items[i]!.id] = n));
  const closed = (m: MonthData | undefined, upTo: number): Suitcase[] =>
    m ? [fromLevels(m, Object.fromEntries(m.items.slice(0, upTo).map((it) => [it.id, 1])), 0)] : [];
  return {
    now: nov ? fromLevels(nov, counts, 12) : null,
    // the shelf's look, from later months' data: a full one and a part-filled one
    past: [...closed(months[1], 10), ...closed(months[2], 7)],
  };
}

export const suitcases = {
  /** This month's suitcase, or null (not read yet, or no event this month). */
  current: (): Suitcase | null => (pretend ? pretend.now : platform.current()),
  /**
   * The next event, while none is on (home's tile: "Starts Nov 1"; the suitcase as a preview: every
   * slot an outline, the prize, no swap): Levels' next month after the platform's today, with the day
   * it starts. Null while an event is on, or when Levels has no later month.
   */
  upcoming(): { s: Suitcase; starts: string } | null {
    if (suitcases.current()) return null;
    const today = currentDaily().date;
    const m = months.find((x) => x.month > today.slice(0, 7));
    return m ? { s: fromLevels(m), starts: `${m.month}-01` } : null;
  },
  /** The shelf: closed months, newest first (empty ones left out: nothing to look back on). */
  past: (): Suitcase[] => (pretend ? pretend.past : platform.past().filter((s) => Object.values(s.counts).some((n) => n > 0))),
  /** A prize that landed since last asked (a swap's, a win's, a read's), once; null otherwise. */
  lastPrize: (): { month: string; helpers: Partial<Record<HelperKind, number>> } | null => (pretend ? null : platform.lastPrize()),
  /** Swap 3 spares for missing item `want` (the server picks which spares go; a preview's, here alike). */
  async swap(want: string): Promise<SwapAnswer> {
    if (!pretend) return platform.swap(want);
    const s = pretend.now;
    if (!s || s.daysLeft <= 0) return "closed";
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
  /** Hear a change (a count, a swap, the month turning). Returns the unsubscribe. */
  onChange(fn: () => void): () => void {
    heard.add(fn);
    return () => void heard.delete(fn);
  },

  // ---- outside a release build ----
  /** The play-test tool's stand-in months (null: the platform's word again). */
  pretend(p: Partial<Pretend> | null | "default"): void {
    if (!ALLOWED) return;
    pretend = p === null ? null : p === "default" ? standIn() : { ...(pretend ?? standIn()), ...p };
    say();
  },
  /**
   * The creator's event preview (the dev menu): "start", November 7 of 10 with 3 spares; "almost",
   * 9 of 10, the one missing being 1 November's item (play that day, or swap for it); null: off.
   * Practice throughout: nothing is saved or sent.
   */
  preview(kind: "start" | "almost" | null): void {
    if (!ALLOWED) return;
    const nov = months.find((m) => m.month === "2026-11");
    if (!kind || !nov) {
      pretend = null;
      say();
      return;
    }
    const counts: Record<string, number> = {};
    const first = nov.days["2026-11-01"];
    nov.items.forEach((it, i) => {
      const n = kind === "start" ? START[i]! : it.id === first ? 0 : i === 1 ? 4 : 1;
      if (n) counts[it.id] = n;
    });
    pretend = { now: fromLevels(nov, counts, 30), past: [], preview: true };
    previewCursor = null;
    say();
  },
  /** The creator's event preview is on. */
  previewing: (): boolean => ALLOWED && !!pretend?.preview,
  /**
   * The preview's next event puzzle (its "Play the Daily Puzzle!"): the next November day, after the
   * last one given, whose item the pretend suitcase lacks, so each win packs a new one; with nothing
   * missing, the next day at all (its item a spare: "packed again ×N").
   */
  previewNextDay(): { date: string; item: string; spare: boolean } | null {
    const s = ALLOWED && pretend?.preview ? pretend.now : null;
    const m = s ? months.find((x) => x.month === s.month) : undefined;
    if (!s || !m) return null;
    const days = Object.keys(m.days).sort();
    const at = previewCursor ? days.indexOf(previewCursor) + 1 : 0;
    const order = [...days.slice(at), ...days.slice(0, at)];
    const missing = order.find((d) => !(s.counts[m.days[d]!] ?? 0));
    const date = missing ?? order[0];
    if (!date) return null;
    previewCursor = date;
    return { date, item: m.days[date]!, spare: !missing };
  },
  /**
   * A practice daily's item, packed into the preview (its win card's moment): the copies after it,
   * and whether it was the 10th. Null when no preview is on or the item is not this month's.
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
