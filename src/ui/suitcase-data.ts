// THE DAILY SUITCASE as the screens see it (docs/daily-suitcase.md; the creator, 2026-10-27): this
// month's themed suitcase of 10 travel items, the copies the player holds, the swap, the prize, and
// the shelf of past months. The record is the platform's, read and written by Server's
// src/net/suitcase.ts (a monthly progression; the daily claim packs the day's item; the swap is
// checked on the server). This file only puts a dev-only stand-in in front of it (__ps.suitcase), so
// the screens can be built and checked in the play-test tool, where no platform answers, and before
// Server's module and Levels' months exist.
//
// Nothing here is the device's: no count, no "paid" flag, no date of its own.

import type { HelperKind } from "./stock";
import { suitcaseItemsOf } from "./catalogue";

export type SuitItem = { id: string; title: string; /** Art's picture, when there is one (else a stand-in is drawn). */ pic?: string };

export type Suitcase = {
  /** "2026-11": the player's own month. */
  month: string;
  /** "Ski Trip". */
  theme: string;
  /** The 10, in slot order. */
  items: SuitItem[];
  /** Copies held, by item id (absent or 0: missing). */
  counts: Record<string, number>;
  /** Days left, today included; 0 once the month is over (a shelf suitcase). */
  daysLeft: number;
  /** All 10 are held. */
  complete: boolean;
  /** What all 10 unlock: a table (its id in public/art/tables/tables.json) and some helpers. */
  prize: { table: string; tableTitle?: string; helpers: Partial<Record<HelperKind, number>> };
  /** The platform has paid the prize. */
  paid: boolean;
};

export type SwapAnswer = "ok" | "short" | "has" | "closed" | "failed";

/** Copies beyond the first, of any item: what the swap spends, 3 at a time. */
export const spares = (s: Suitcase): number => s.items.reduce((n, it) => n + Math.max(0, (s.counts[it.id] ?? 0) - 1), 0);
export const held = (s: Suitcase): number => s.items.filter((it) => (s.counts[it.id] ?? 0) > 0).length;
export const SWAP_COST = 3;

/** Server's module, once it exists (a bridge: its file is not in the tree yet). */
type Net = {
  suitcase: {
    current(): Suitcase | null;
    past(): Suitcase[];
    onChange(fn: () => void): () => void;
    swap(want: string): Promise<SwapAnswer>;
  };
};
let net: Net | null = null;
const heard = new Set<() => void>();
const say = () => {
  for (const fn of [...heard]) fn();
};
const found = import.meta.glob<Net>("../net/suitcase.ts");
for (const load of Object.values(found))
  void load().then(
    (m) => {
      net = m;
      m.suitcase.onChange(say);
      say();
    },
    (err) => console.warn("[suitcase] the platform's module did not load:", err),
  );

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
  current: (): Suitcase | null => (pretend ? pretend.now : (net?.suitcase.current() ?? null)),
  /** The shelf: closed months, newest first. */
  past: (): Suitcase[] => (pretend ? pretend.past : (net?.suitcase.past() ?? [])),
  /** Swap 3 spares for missing item `want` (the server picks which spares go). */
  async swap(want: string): Promise<SwapAnswer> {
    if (!pretend) return net ? net.suitcase.swap(want) : "failed";
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
