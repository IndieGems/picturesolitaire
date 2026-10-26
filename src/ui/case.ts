// A mystery case (the pilot, "Murder on the Melusine": docs/mystery-pilot.md), as the
// screens read it: its file (src/content/cases/melusine.json, UI's), and the run the
// detective is on. DEV ONLY: the case is played from the dev menu, as practice, and this
// module is imported by dev-only code alone, so a release build carries none of it.
//
// A case is a trip of fifteen boards (Levels' experiment boards mel01-mel15, each with
// `case` {id, n}); each board's special picture is a clue (Art's pictures.json
// destinations, mel-01 to mel-15). Finishing a board finds its clue; after board 15 the
// player names the killer and the picture that proves it.
//
// The run (the clues found, the verdict) touches neither the server nor the player's
// progress. It is kept on this device under a dev key beside the settings (settings.ts,
// keepDevValue), so the creator can carry a run across sessions; "Start the case over"
// clears it. Never browser storage.

import CASE from "../content/cases/melusine.json";
import { destination, destinationName, type Destination } from "./catalogue";
import { devValue, keepDevValue, loadSettings } from "../settings";

export interface Clue {
  n: number;
  /** Its picture's id in the catalogue. */
  id: string;
  /** What stands in for its name while its picture is missing (then the picture's own name, Art's, is shown). */
  label: string;
  /** Its one sentence, or "" where the picture tells it. */
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

// ---------- the run ----------

const KEY = `dev-case-${theCase.id}` as const;
type Run = { found: number[]; verdict?: Verdict };
let run: Run = { found: [] };
const listeners = new Set<() => void>();

/** Read the run kept on this device (once the settings have loaded; nothing kept: a fresh run). */
export const runRead: Promise<void> = loadSettings().then(() => {
  const kept = devValue(KEY) as Partial<Run> | undefined;
  if (kept && Array.isArray(kept.found)) run = { found: kept.found.filter((n) => Number.isInteger(n)), ...(kept.verdict ? { verdict: kept.verdict } : {}) };
  for (const fn of listeners) fn();
});

function keep(): void {
  keepDevValue(KEY, run);
  for (const fn of listeners) fn();
}

/** Run `fn` whenever the run changes. */
export function onRun(fn: () => void): void {
  listeners.add(fn);
}

export function isFound(n: number): boolean {
  return run.found.includes(n);
}

/** The clues found so far, in the case's order. */
export function foundClues(): Clue[] {
  return theCase.clues.filter((c) => run.found.includes(c.n));
}

/** Board `n`'s clue is found (its board won). */
export function find(n: number): void {
  if (run.found.includes(n)) return;
  run = { ...run, found: [...run.found, n].sort((a, b) => a - b) };
  keep();
}

/** The dev shortcut: every clue counts as found. */
export function findAll(): void {
  run = { ...run, found: theCase.clues.map((c) => c.n) };
  keep();
}

/** The accusation's verdict, kept with the run (the first one stands). */
export function settle(v: Verdict): void {
  if (run.verdict) return;
  run = { ...run, verdict: v };
  keep();
}

export function firstVerdict(): Verdict | undefined {
  return run.verdict;
}

/** Start the case over: nothing found, no verdict. */
export function restart(): void {
  run = { found: [] };
  keep();
}
