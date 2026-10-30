// THE PLAYER'S PROGRESS, as the server holds it. The "progress" save slot is
// written only by the win checker (functions/checker/src/progress.rs), after it
// has replayed a win; the game reads it and never writes it. The screens draw
// from progress() and redraw on onProgress.
//
//   progress().campaign.next   the first campaign board not won yet (from 1); levelCount() + 1 is
//                              "all done", and it never goes past that (progress.rs: replays after
//                              the last board, level(n) going round, never move it)
//   progress().campaign.won    verified wins in all, replays included
//   progress().challenge[id]   best (fewest) moves on a cleared challenge board
//   progress().daily[date]     the first verified result of that date { moves, ms }
//   progress().souvenir[id]    best (fewest) moves on a Souvenir won ("s1"): its sticker (docs/souvenirs.md)
//   progress().event[id]       best (fewest) moves on an event level won ("halloween-2026-04"; a VIP's, docs/vip.md)
//   progress().restored        pictures of boards won
//   progress().counts          the achievements' counters as the checker last set them, by counter slug
//                              (src/net/achievements.ts); absent on a record from before checker 0.1.35
//   progress().known           false until the server's word has landed this session
//
// The game standard's rules for it ("All player data lives in the CLOUD"; "When
// the server pays, the device follows its word"):
//   - the first screen waits about a second at most (waitForProgress): every
//     launch is a new web address with no device copy, so until the record lands
//     progress() is the empty record with `known: false`, and the screen redraws
//     when it lands. A failed read is tried again on a wait that grows (src/net/pace.ts:
//     never under the platform's retry-after, at most 5 minutes, never while hidden), and when
//     the connection or the page comes back;
//   - a won board shows at once: claimWin() holds the win here and progress()
//     applies it over the server's record until the checker answers; its verdict
//     carries the new record, which replaces the held win; a refusal drops it;
//   - with no record yet, progress starts empty: nothing the player can write
//     (the UI's own "campaign" slot) ever becomes progress (release report GSR-006).
// Unframed (a plain tab) there is no platform: wins apply for this page only.

import { gem } from "../gem";
import { levelCount } from "../game/levels";
import { onOnline, suspect } from "../ui/online";
import { backoff, heard, held as platformWait, whenDue } from "./pace";
import ACHIEVEMENT_DATA from "./achievements.json";
import { noAnswer, refusalOf } from "./no-answer";

export interface Progress {
  campaign: { next: number; won: number };
  challenge: Record<string, number>;
  daily: Record<string, { moves: number; ms: number }>;
  /** Souvenirs won, by id: best (fewest) moves. Won when present. */
  souvenir: Record<string, number>;
  /** Event levels won (a VIP's, docs/vip.md), by id: best (fewest) moves. Won when present. */
  event: Record<string, number>;
  restored: string[];
  /** The achievements' counters as the checker last set them (functions/checker/src/count.rs), by counter slug; absent on a record from before them. Held wins never change it. */
  counts?: Record<string, number>;
}

/** What a won board would change, held until the checker answers. */
export interface HeldWin {
  lane: "campaign" | "challenge" | "daily" | "souvenir" | "event";
  board: string;
  /** Campaign position. */
  n?: number;
  moves: number;
  ms: number;
  date?: string;
  pictures: string[];
}

const SLOT = "progress";
const framed = window.self !== window.top;

const empty = (): Progress => ({ campaign: { next: 1, won: 0 }, challenge: {}, daily: {}, souvenir: {}, event: {}, restored: [] });

let server: Progress = empty();
/** The server's record was a stored one (a player with a win), not the empty start of a new player. */
let stored = false;
let known = !framed;
const held = new Map<string, HeldWin>();
const listeners = new Set<() => void>();
let reading = false;
let tries = 0;

let landed!: () => void;
/** Resolves once the server's record has been read this session (at once unframed). */
export const progressRead: Promise<void> = new Promise((r) => (landed = r));
if (known) landed();

/** Hear when progress changes: the record landed, a win was held, answered or dropped. Returns the unsubscribe. */
export function onProgress(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

function changed(): void {
  for (const fn of [...listeners]) fn();
}

/** A stored record made well-formed (the server's own shape; anything missing reads as nothing). */
function normal(x: unknown): Progress {
  const d = (x && typeof x === "object" ? x : {}) as Partial<Progress>;
  const next = Number(d.campaign?.next);
  return {
    // a record from before the stop (went round) reads as "all done", as the checker pulls it back
    campaign: { next: Number.isInteger(next) && next >= 1 ? Math.min(next, levelCount() + 1) : 1, won: Math.max(0, Number(d.campaign?.won) || 0) },
    challenge: d.challenge && typeof d.challenge === "object" ? { ...d.challenge } : {},
    daily: d.daily && typeof d.daily === "object" ? { ...d.daily } : {},
    souvenir: d.souvenir && typeof d.souvenir === "object" ? { ...d.souvenir } : {},
    event: d.event && typeof d.event === "object" ? { ...d.event } : {},
    restored: Array.isArray(d.restored) ? d.restored.filter((p): p is string => typeof p === "string") : [],
    ...(d.counts && typeof d.counts === "object"
      ? { counts: Object.fromEntries(Object.entries(d.counts).filter((e): e is [string, number] => Number.isInteger(e[1]) && e[1] >= 0)) }
      : {}),
  };
}

/** One win applied to a record, as the checker applies it (progress.rs, apply). */
function applyWin(p: Progress, w: HeldWin): void {
  if (w.lane === "campaign") {
    const end = levelCount() + 1;
    const n = Math.min(w.n ?? p.campaign.next, end); // past the last board: a replay
    if (n > p.campaign.next) return; // an earlier win is still on its way
    p.campaign = { next: Math.min(Math.max(p.campaign.next, n + 1), end), won: p.campaign.won + 1 };
  } else if (w.lane === "challenge" || w.lane === "souvenir" || w.lane === "event") {
    const best = p[w.lane][w.board];
    if (best === undefined || w.moves < best) p[w.lane][w.board] = w.moves;
  } else if (w.date && !p.daily[w.date]) {
    p.daily[w.date] = { moves: w.moves, ms: w.ms };
  }
  for (const pic of w.pictures) if (!p.restored.includes(pic)) p.restored.push(pic);
}

/** The server's record, with the wins still on their way applied over it. */
export function progress(): Readonly<Progress & { known: boolean }> {
  const p = normal(server);
  // campaign wins in play order, whatever order they were held in (a restart's resumed wins
  // are held after the ones won since): one ahead of the next position would not count
  const wins = [...held.values()];
  const campaign = wins.filter((w) => w.lane === "campaign").sort((a, b) => (a.n ?? 0) - (b.n ?? 0));
  let c = 0;
  for (const w of wins) applyWin(p, w.lane === "campaign" ? campaign[c++]! : w);
  return { ...p, known };
}

export const campaignNext = (): number => progress().campaign.next;
export const campaignWon = (): number => progress().campaign.won;
export const challengeBest = (id: string): number | undefined => progress().challenge[id];
export const challengeCleared = (id: string): boolean => progress().challenge[id] !== undefined;
export const isRestored = (pictureId: string): boolean => progress().restored.includes(pictureId);
/** The guided start is done once campaign board 1 is won. */
export const guideDone = (): boolean => progress().campaign.next > 1;
/** A Souvenir is won (its sticker shows) once its id is in the record: its best moves, or undefined. */
export const souvenirBest = (id: string): number | undefined => progress().souvenir[id];
/** An event level's best (fewest) moves, once won (a VIP's: the checker refuses anyone else's). */
export const eventBest = (id: string): number | undefined => progress().event[id];
export const dailyResult = (date: string): { moves: number; ms: number } | undefined => progress().daily[date];
/** Every counter at 0: a new player's (src/net/achievements.json's counters). */
const NONE: Readonly<Record<string, number>> = Object.freeze(Object.fromEntries((ACHIEVEMENT_DATA.counters as { slug: string }[]).map((c) => [c.slug, 0])));
/**
 * The achievements' counters in the server's record (never a held win's), by counter slug: every
 * one 0 for a new player (no record yet). null before the record landed, and for a record from
 * before the counters (checker 0.1.35), which says nothing about them until the next verified win.
 */
export const serverCounts = (): Readonly<Record<string, number>> | null => (!known ? null : server.counts ? server.counts : stored ? null : NONE);

// ---------------------------------------------------------------- held wins (src/net/claims.ts)

/** A win sent to the checker: shown at once, until it is answered. */
export function hold(claimId: string, w: HeldWin): void {
  held.set(claimId, w);
  changed();
}

/** The checker answered a held win: its record (when it sent one) is the word from now on. */
export function answered(claimId: string, record: unknown, refused: boolean): void {
  const w = held.get(claimId);
  held.delete(claimId);
  if (record && typeof record === "object") {
    server = normal(record);
    stored = true;
    if (!known) {
      known = true;
      landed();
    }
  } else if (!framed && w && !refused) {
    applyWin(server, w); // a plain tab: the win counts for this page
  }
  changed();
}

// ---------------------------------------------------------------- reading the record

/** The one read waiting to try again (src/net/pace.ts). */
let again: (() => void) | null = null;

/** Read again in `ms` (one waiting read at a time). */
function readLater(ms: number): void {
  again?.();
  again = whenDue(ms, () => {
    again = null;
    void read();
  });
}

async function read(): Promise<void> {
  if (known || reading || !framed) return;
  if (platformWait() > 0) return readLater(platformWait());
  reading = true;
  again?.();
  again = null;
  try {
    await gem.awaitIdentity(10_000);
    let record: unknown = null;
    try {
      record = await gem.me.saves.get(SLOT, { timeoutMs: 10_000 });
    } catch (err) {
      if (noAnswer(err) || (err as { reason?: string }).reason !== "not_found") throw err;
    }
    if (!known) {
      server = normal(record);
      stored = record !== null && typeof record === "object";
      known = true;
      landed();
      changed();
    }
  } catch (err) {
    if (noAnswer(err)) suspect();
    heard(err);
    console.warn(`[progress] the record could not be read: ${refusalOf(err)}`);
    readLater(backoff(++tries, 2000));
  } finally {
    reading = false;
  }
}

/** Start reading. Call once, at boot. Also sends again any win a previous session left unanswered. */
export function loadProgress(): void {
  if (!framed) return;
  void read();
  void import("./claims").then((m) => m.resumeClaims());
  void import("./helpers").then((m) => m.loadHelpers());
  void import("./suitcase").then((m) => m.loadSuitcase());
  void import("./vip").then((m) => m.loadVip());
  // the connection back asks at once (inside any wait the platform named); a page shown again
  // asks when its wait is over (whenDue), never sooner
  onOnline((up) => {
    if (up && !known) {
      tries = 0;
      void read();
    }
  });
}

/** Wait for the server's record, at most `ms`; true if it landed. */
export function waitForProgress(ms: number): Promise<boolean> {
  if (known) return Promise.resolve(true);
  return Promise.race([progressRead.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), ms))]);
}
