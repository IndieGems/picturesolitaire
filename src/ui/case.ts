// The Traveling Detective's case (the pilot, "Murder on the Melusine": docs/mystery-pilot.md),
// as the screens read it: its file (src/content/cases/melusine.json, UI's: each clue's one
// sentence, the suspects, the answer, the explanation), its fifteen boards (Levels'
// src/content/levels/cases.json, `case` {id, n} on each), and the player's progress through it.
//
// It is played from home's Traveling Detective button (the creator, 2026-10-25), its boards
// in story order: the next board is the first not yet won, and a won one can be played again.
// Finishing a board finds its clue (Art's pictures.json destinations, mel-01 to mel-15);
// after board 15 the player names the killer and the picture that proves it.
//
// THE PLAYER'S PROGRESS follows them (the lead, 2026-10-25): the boards won (so the clues
// found) and the verdict, kept in a player value (src/storage.ts, gem.me.settings) under
// case_<id>. The game standard's rules for what the player keeps: the first screen never waits
// on it, a failed read is tried again with a backoff (and at once when the connection or the
// page comes back), nothing is written before the account's copy has been read and merged
// (boards won only ever add up; the first verdict stands), and a write that fails is sent
// again on a timer and flushed when the page is hidden or closed. Unframed (a plain tab,
// the play-test tool) it lives for the page. No Coins and no claims: nothing for the server.

import CASE from "../content/cases/melusine.json";
import { gem, onWillTerminate } from "../gem";
import { toLevel, type Level, type Stored } from "../game/levels";
import { loadPlayerValue, savePlayerValue } from "../storage";
import { destination, destinationName, type Destination } from "./catalogue";
import { onOnline, suspect } from "./online";

export interface Clue {
  n: number;
  /** Its picture's id in the catalogue. */
  id: string;
  /** What stands in for its name while its picture is missing (then the picture's own name, Art's, is shown). */
  label: string;
  /** Its one sentence. */
  words: string;
  /** Writing the game draws over the picture (the photo's date stamp): where, in fractions of the picture from its right and bottom edges. */
  stamp?: { text: string; right: number; bottom: number };
}

export interface Suspect {
  id: string;
  name: string;
  /** Who they are, in three words. */
  who: string;
  /** Their portrait: a clue's id. */
  portrait: string;
}

export type Verdict = "gold" | "solved" | "wrong";

export const theCase = CASE as unknown as {
  id: string;
  title: string;
  question: string;
  proofQuestion: string;
  clues: Clue[];
  suspects: Suspect[];
  culprit: string;
  gold: string;
  accepted: string[];
  verdict: { gold: string; solved: string; wrongProof: string; wrongSuspect: string };
  explanation: { text: string; pictures: string[] }[];
};

const byId = new Map(theCase.clues.map((c) => [c.id, c]));

/** The clue whose picture is `id`, or undefined (not this case's). */
export function clueOf(id: string): Clue | undefined {
  return byId.get(id);
}

/** The clue's picture, once Art's is in the catalogue. */
export function clueImage(c: Clue): Destination | undefined {
  return destination(c.id);
}

/** The clue's name: its picture's (Art's, as the full-size view and the win card show it), else its stand-in label. */
export function clueName(c: Clue): string {
  const img = destination(c.id);
  return img ? destinationName(img.id, img.title) : c.label;
}

/** Judge an accusation: the culprit with the gold proof, with an accepted one, or anything else. */
export function judge(suspect: string, proof: string): Verdict {
  if (suspect !== theCase.culprit) return "wrong";
  if (proof === theCase.gold) return "gold";
  return theCase.accepted.includes(proof) ? "solved" : "wrong";
}

/** The verdict's one line: who did it, and what of the proof. */
export function verdictLine(v: Verdict, suspect: string): string {
  if (v === "gold") return theCase.verdict.gold;
  if (v === "solved") return theCase.verdict.solved;
  return suspect === theCase.culprit ? theCase.verdict.wrongProof : theCase.verdict.wrongSuspect;
}

// ---------- the boards ----------

/** One of the case's boards: a level, with its place in the story. */
export type CaseBoard = Level & { n: number; caseId: string };

let boardsLoad: Promise<CaseBoard[]> | null = null;
/** The case's boards, in story order (read once, when first wanted). */
export function caseBoards(): Promise<CaseBoard[]> {
  boardsLoad ??= import("../content/levels/cases.json").then((m) => {
    const stored = (m.default as unknown as { levels: (Stored & { case?: { id: string; n: number } })[] }).levels;
    return stored
      .filter((l) => l.case?.id === theCase.id && Number.isInteger(l.case.n))
      .map((l, i) => ({ ...toLevel(l, i + 1), n: l.case!.n, caseId: theCase.id }))
      .sort((a, b) => a.n - b.n);
  });
  return boardsLoad;
}

// ---------- the player's progress ----------

const KEY = `case_${theCase.id}`;
/** The verdict kept with how it was reached, so the case can show it again as it was. */
export type Kept = { v: Verdict; suspect: string; proof: string };
type Saved = { v: 1; won: number[]; verdict?: Kept };
let saved: Saved = { v: 1, won: [] };
let read = false;
let reading = false;
let dirty = false;
let readTries = 0;
let readTimer: number | undefined;
let pushTimer: number | undefined;
const listeners = new Set<() => void>();
const framed = window.self !== window.top;

function parse(raw: string | null): Partial<Saved> {
  try {
    const x = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
    return x && typeof x === "object" ? x : {};
  } catch {
    return {};
  }
}
const boards = (xs: unknown): number[] => (Array.isArray(xs) ? xs.filter((n): n is number => Number.isInteger(n) && n >= 1) : []);
const isVerdict = (x: unknown): x is Kept => !!x && typeof x === "object" && ["gold", "solved", "wrong"].includes((x as Kept).v);

/** A refusal is an answer: the platform is there, and asking again will not change it. */
function refusal(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return typeof code === "string" && ["not_found", "invalid", "too_large", "forbidden"].includes(code);
}

function changed(): void {
  for (const fn of [...listeners]) fn();
}

async function readCloud(): Promise<void> {
  if (read || reading) return;
  reading = true;
  clearTimeout(readTimer);
  try {
    await gem.awaitIdentity(10_000);
    const cloud = parse(await loadPlayerValue(KEY));
    // what this page did meanwhile and what the account holds, together: boards only add up, the first verdict stands
    const won = [...new Set([...boards(cloud.won), ...saved.won])].sort((a, b) => a - b);
    const verdict = isVerdict(cloud.verdict) ? cloud.verdict : saved.verdict;
    dirty ||= won.length !== boards(cloud.won).length || (!!verdict && !isVerdict(cloud.verdict));
    saved = { v: 1, won, ...(verdict ? { verdict } : {}) };
    finishRead();
  } catch (err) {
    if (refusal(err)) finishRead();
    else {
      suspect();
      readTimer = window.setTimeout(() => void readCloud(), Math.min(30_000, 2000 * 2 ** readTries++));
    }
  } finally {
    reading = false;
  }
}

function finishRead(): void {
  read = true;
  changed();
  if (dirty) schedulePush(0);
}

function schedulePush(ms = 600): void {
  dirty = true;
  if (!read || !framed) return;
  clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => void push(), ms);
}

async function push(): Promise<void> {
  if (!dirty || !read || !framed) return;
  dirty = false;
  try {
    await savePlayerValue(KEY, JSON.stringify(saved));
  } catch (err) {
    if (refusal(err)) return void console.warn("[case] save refused:", err);
    // no answer: keep it, and send it again on a timer, not only at the next change
    suspect();
    dirty = true;
    clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => void push(), 5000);
  }
}

function keep(): void {
  changed();
  schedulePush();
}

/** Start reading the player's progress in the case. Call once, at boot (the first screen never waits on it). */
export function loadCase(): void {
  if (!framed) return void finishRead();
  void readCloud();
  onOnline((up) => {
    if (!up) return;
    if (!read) void readCloud();
    else if (dirty) void push();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !read) void readCloud();
    if (document.visibilityState === "hidden" && dirty) void push();
  });
  addEventListener("pagehide", () => {
    if (dirty) void push();
  });
  onWillTerminate(() => {
    if (dirty) void push();
  });
}

/** Hear when the progress changes (a board won, the account's copy landed). */
export function onCase(fn: () => void): void {
  listeners.add(fn);
}

/** Board `n` won (its clue found). */
export function isWon(n: number): boolean {
  return saved.won.includes(n);
}
/** How many boards are won, of how many. */
export function caseCount(): { done: number; all: number } {
  return { done: saved.won.filter((n) => n <= theCase.clues.length).length, all: theCase.clues.length };
}
/** The next board in the story: the first not yet won (null: every one won). */
export function nextBoard(): number | null {
  for (const c of theCase.clues) if (!saved.won.includes(c.n)) return c.n;
  return null;
}

/** The clues found so far, in the case's order. */
export function foundClues(): Clue[] {
  return theCase.clues.filter((c) => saved.won.includes(c.n));
}

/** Board `n` won: its clue is found. */
export function win(n: number): void {
  if (saved.won.includes(n)) return;
  saved = { ...saved, won: [...saved.won, n].sort((a, b) => a - b) };
  keep();
}

/** The accusation's verdict: the first one stands. */
export function settle(k: Kept): void {
  if (saved.verdict) return;
  saved = { ...saved, verdict: k };
  keep();
}

export function theVerdict(): Kept | undefined {
  return saved.verdict;
}

/** The dev menu's shortcut: every board won, straight to the accusation. */
export function winAll(): void {
  saved = { ...saved, won: theCase.clues.map((c) => c.n) };
  keep();
}

/** The dev menu's "start the case over": nothing won, no verdict. */
export function restart(): void {
  saved = { v: 1, won: [] };
  keep();
}
