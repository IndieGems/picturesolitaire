// THE DAILY SUITCASE as the screens see it (docs/daily-suitcase.md; the creator, 2026-10-27): this
// month's themed suitcase of 10 travel items, the copies the player holds, the swap, the prize, and
// the shelf of past months. The record is the platform's, read and written by Server's
// src/net/suitcase.ts (platform items and a monthly challenge; the daily claim packs the day's item;
// the swap is checked on the server; the prize paid once). This file only puts a dev-only stand-in
// in front of it (__ps.suitcase), so the screens can be checked in the play-test tool, where no
// platform answers.
//
// Nothing here is the device's: no count, no "paid" flag, no date of its own.

import { suitcase as platform, type Suitcase as NetSuitcase, type SwapAnswer } from "../net/suitcase";
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
export const SWAP_COST = 3;

const heard = new Set<() => void>();
const say = () => {
  for (const fn of [...heard]) fn();
};
platform.onChange(say);

// ---------------------------------------------------------------- the dev stand-in
type Pretend = { now: Suitcase | null; past: Suitcase[] };
let pretend: Pretend | null = null;

const SKI: SuitItem[] = [
  { id: "ski-jacket", title: "Ski jacket" },
  { id: "goggles", title: "Goggles" },
  { id: "thermos", title: "Thermos" },
  { id: "mittens", title: "Mittens" },
  { id: "trail-map", title: "Trail map" },
  { id: "wool-hat", title: "Wool hat" },
  { id: "snow-boots", title: "Snow boots" },
  { id: "lift-pass", title: "Lift pass" },
  { id: "scarf", title: "Scarf" },
  { id: "hot-cocoa", title: "Hot cocoa" },
];
const month = (m: string, theme: string, items: SuitItem[], counts: Record<string, number>, daysLeft: number, table: string): Suitcase => {
  const complete = items.every((it) => (counts[it.id] ?? 0) > 0);
  return { month: m, theme, items, counts, daysLeft, complete, prize: { table, helpers: { hint: 2, undo: 2, shuffle: 1 } }, paid: complete };
};
const names = (t: string) =>
  t.split(",").map((title) => ({ id: title.trim().toLowerCase().replace(/[^a-z]+/g, "-"), title: title.trim() }));

/** The stand-in months: this one part-filled (November's own items once Art lists them), and two closed ones on the shelf. */
export function standIn(): Pretend {
  const art = suitcaseItemsOf("2026-11");
  const items = art.length === 10 ? art.map((a) => ({ id: a.id, title: a.title })) : SKI;
  const counts: Record<string, number> = {};
  [1, 2, 1, 3, 0, 1, 0, 1, 2, 0].forEach((n, i) => n && (counts[items[i]!.id] = n));
  return {
    now: month("2026-11", "Ski Trip", items, counts, 12, "table-ski-lodge"),
    past: [
      month("2026-10", "Autumn Road Trip", names("Road map, Sunglasses, Camera, Snacks, Cooler, Playlist, Blanket, Flashlight, Pumpkin, Postcards"), Object.fromEntries(names("Road map, Sunglasses, Camera, Snacks, Cooler, Playlist, Blanket, Flashlight, Pumpkin, Postcards").map((i) => [i.id, 1])), 0, "table-autumn-study"),
      month("2026-09", "Beach Week", names("Sunhat, Towel, Flip-flops, Sunscreen, Bucket, Snorkel, Book, Shell, Kite, Lemonade"), Object.fromEntries(names("Sunhat, Towel, Flip-flops, Sunscreen, Bucket, Snorkel, Book").map((i) => [i.id, 1])), 0, "table-autumn-study"),
    ],
  };
}

export const suitcases = {
  /** This month's suitcase, or null (not read yet, or no event this month). */
  current: (): Suitcase | null => (pretend ? pretend.now : platform.current()),
  /** The shelf: closed months, newest first (empty ones left out: nothing to look back on). */
  past: (): Suitcase[] => (pretend ? pretend.past : platform.past().filter((s) => Object.values(s.counts).some((n) => n > 0))),
  /** A prize that landed since last asked (a swap's, a win's, a read's), once; null otherwise. */
  lastPrize: (): { month: string; helpers: Partial<Record<HelperKind, number>> } | null => (pretend ? null : platform.lastPrize()),
  /** Swap 3 spares for missing item `want` (the server picks which spares go). */
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
  /** Dev server only: the stand-in months (null: the platform's word again). */
  pretend(p: Partial<Pretend> | null | "default"): void {
    if (!import.meta.env.DEV) return;
    pretend = p === null ? null : p === "default" ? standIn() : { ...(pretend ?? standIn()), ...p };
    say();
  },
};
