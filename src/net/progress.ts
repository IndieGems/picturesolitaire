// THE PLAYER'S PROGRESS, as the server holds it. The "progress" save slot is
// written only by the win checker (functions/checker/src/progress.rs), after it
// has replayed a win; the game reads it and never writes it. The screens draw
// from progress() and redraw on onProgress.
//
//   progress().campaign.next   the campaign position to play (from 1; level(n) goes round past the last)
//   progress().campaign.won    verified wins in all, replays included
//   progress().challenge[id]   best (fewest) moves on a cleared challenge board
//   progress().daily[date]     the first verified result of that date { moves, ms }
//   progress().restored        pictures of boards won
//   progress().known           false until the server's word has landed this session
//
// The game standard's rules for it ("All player data lives in the CLOUD"; "When
// the server pays, the device follows its word"):
//   - the first screen waits about a second at most (waitForProgress): every
//     launch is a new web address with no device copy, so until the record lands
//     progress() is the empty record with `known: false`, and the screen redraws
//     when it lands. A failed read is tried again with a backoff, and at once when
//     the connection or the page comes back;
//   - a won board shows at once: claimWin() holds the win here and progress()
//     applies it over the server's record until the checker answers; its verdict
//     carries the new record, which replaces the held win; a refusal drops it;
//   - progress made before the record existed (the UI's old "campaign" slot) is
//     taken in ONCE by the checker ({"what":"progress"}), never by the device.
// Unframed (a plain tab) there is no platform: wins apply for this page only.

import { gem } from "../gem";
import { onOnline, suspect } from "../ui/online";
import { noAnswer, refusalOf } from "./no-answer";

export interface Progress {
  campaign: { next: number; won: number };
  challenge: Record<string, number>;
  daily: Record<string, { moves: number; ms: number }>;
  restored: string[];
  /** Set once, when the checker took in an old device save. */
  imported?: { from: string };
}

/** What a won board would change, held until the checker answers. */
export interface HeldWin {
  lane: "campaign" | "challenge" | "daily";
  board: string;
  /** Campaign position. */
  n?: number;
  moves: number;
  ms: number;
  date?: string;
  pictures: string[];
}

const SLOT = "progress";
const LEGACY = "campaign";
const framed = window.self !== window.top;

const empty = (): Progress => ({ campaign: { next: 1, won: 0 }, challenge: {}, daily: {}, restored: [] });

let server: Progress = empty();
let known = !framed;
const held = new Map<string, HeldWin>();
const listeners = new Set<() => void>();
let reading = false;
let tries = 0;
let timer: number | undefined;

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
    campaign: { next: Number.isInteger(next) && next >= 1 ? next : 1, won: Math.max(0, Number(d.campaign?.won) || 0) },
    challenge: d.challenge && typeof d.challenge === "object" ? { ...d.challenge } : {},
    daily: d.daily && typeof d.daily === "object" ? { ...d.daily } : {},
    restored: Array.isArray(d.restored) ? d.restored.filter((p): p is string => typeof p === "string") : [],
    ...(d.imported ? { imported: d.imported } : {}),
  };
}

/** One win applied to a record, as the checker applies it (progress.rs, apply). */
function applyWin(p: Progress, w: HeldWin): void {
  if (w.lane === "campaign") {
    const n = w.n ?? p.campaign.next;
    if (n > p.campaign.next) return; // an earlier win is still on its way
    p.campaign = { next: Math.max(p.campaign.next, n + 1), won: p.campaign.won + 1 };
  } else if (w.lane === "challenge") {
    const best = p.challenge[w.board];
    if (best === undefined || w.moves < best) p.challenge[w.board] = w.moves;
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
export const dailyResult = (date: string): { moves: number; ms: number } | undefined => progress().daily[date];

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

async function read(): Promise<void> {
  if (known || reading || !framed) return;
  reading = true;
  clearTimeout(timer);
  try {
    await gem.awaitIdentity(10_000);
    let record: unknown = null;
    try {
      record = await gem.me.saves.get(SLOT, { timeoutMs: 10_000 });
    } catch (err) {
      if (noAnswer(err) || (err as { reason?: string }).reason !== "not_found") throw err;
    }
    if (!record) record = await takeInOldSave();
    if (!known) {
      server = normal(record);
      known = true;
      landed();
      changed();
    }
  } catch (err) {
    if (noAnswer(err)) suspect();
    console.warn(`[progress] the record could not be read: ${refusalOf(err)}`);
    timer = window.setTimeout(() => void read(), Math.min(30_000, 2000 * 2 ** tries++));
  } finally {
    reading = false;
  }
}

/** No record yet: if the old device slot holds progress, ask the checker to take it in (once). */
async function takeInOldSave(): Promise<unknown> {
  let old: Record<string, unknown> | null = null;
  try {
    old = await gem.me.saves.get<Record<string, unknown>>(LEGACY, { timeoutMs: 10_000 });
  } catch (err) {
    if (noAnswer(err) || (err as { reason?: string }).reason !== "not_found") throw err;
  }
  const level = Number(old?.level) || 1;
  const has = old && (level > 1 || (Array.isArray(old.restored) && old.restored.length) || (old.best && Object.keys(old.best as object).length));
  if (!has) return null;
  const answer = (await gem.functions.invoke({ v: 1, what: "progress" })).json() as { status?: string; progress?: unknown };
  if (answer.status !== "progress") throw new Error(`the checker did not take in the old save (${String(answer.status)})`);
  return answer.progress;
}

/** Start reading. Call once, at boot. Also sends again any win a previous session left unanswered. */
export function loadProgress(): void {
  if (!framed) return;
  void read();
  void import("./claims").then((m) => m.resumeClaims());
  onOnline((up) => {
    if (up && !known) {
      tries = 0;
      void read();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !known) void read();
  });
}

/** Wait for the server's record, at most `ms`; true if it landed. */
export function waitForProgress(ms: number): Promise<boolean> {
  if (known) return Promise.resolve(true);
  return Promise.race([progressRead.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), ms))]);
}
