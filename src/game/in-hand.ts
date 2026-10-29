// THE BOARD IN HAND, KEPT FOR THE NEXT SESSION (GSR-014; the creator chose "Yes, offer to
// resume"). The Arcade keeps a parked game for about five minutes; past that it ends the
// session, and a board in play was lost with it (wins were kept already: src/net/claims.ts).
// So the board in hand is kept in the player's "resume" save slot (config v42, one record;
// presentation state, never progress: no server code decides anything from it).
//
// What is kept: which play it is (a campaign board, the day's daily, a challenge, a
// Souvenir), the level's id and its deal's hash (src/net/deal-hash.ts), and the board's own
// record (BoardHandle.kept(): every action from the deal, shuffles with the mix they made,
// the time shown, the hint lines proved, the try's unused free helpers). A resumed board
// replays that line from the deal (openBoard's resume), so its win claims the complete
// line, which the checker replays from the deal and pays once like any win; the helpers
// used before the break were spent from the Arcade then, and nothing here counts them.
//
// The slot mirrors the board the screens keep (keepInHand): it is written after moves (at
// most every few seconds: a save is three requests of the 120 a minute the platform allows
// a network address) and at once when the page hides, the Arcade pauses the game, or it is
// about to close it. It empties itself when there is nothing to carry on: a win (from the
// moment the rules say so), a Restart, a board not played yet, another board opened in its
// place; and dropInHand() for the screens' own reasons (a daily whose day has gone, a kept
// board that no longer fits). Back to home keeps it, as the screens keep the board in hand
// (the lead, 2026-10-29: a session that ends on home loses nothing either). Never written
// before this session's read has landed, so a board kept last time is never written over
// unseen.
//
// The screens' part (UI's, src/ui/app.ts): read keptBoard() once at boot (cap the wait, as
// for any save) and offer the board when it fits() the level as loaded; open it with
// openBoard(host, level, { resume: kept, freeAllowed }) and call keepInHand(board, play,
// level) for every board that may be carried on (never practice, a lesson, the dev menu
// or a friend's one-off); dropInHand() where the board in hand is let go.

import { GemApiError } from "@indiegems/gem-web-sdk/sdk";
import { gem, onArcadePause, onWillTerminate } from "../gem";
import { on } from "../events";
import { dealHash } from "../net/deal-hash.ts";
import { refusalOf } from "../net/no-answer.ts";
import { onOnline } from "../ui/online.ts";
import type { BoardHandle, BoardKept } from "../board/index.ts";
import type { Level } from "./levels.ts";

const SLOT = "resume";

/** Which play a kept board is: what the screens need to open it again. */
export type KeptPlay =
  | { kind: "campaign"; level: number }
  | { kind: "daily"; date: string }
  | { kind: "challenge"; id: string }
  | { kind: "souvenir"; trip: string };

/** The record in the slot. */
export interface InHand extends BoardKept {
  v: 1;
  play: KeptPlay;
  /** The level's id ("c27", "d2026-11-03", "s1", "ch16"). */
  id: string;
  /** dealHash of the deal it was started on. */
  deal: string;
}

/** Is `kept` a board of `level` as the game has it now (the same id and deal)? A re-deal shipped since: no. */
export function fits(kept: InHand, level: Level): boolean {
  return kept.id === level.id && kept.deal === dealHash(level.deal);
}

/** A record as stored, checked field by field (an older build's, or an edited one). */
function asRecord(x: unknown): InHand | null {
  const r = x as Partial<InHand> | null;
  const p = r?.play as Partial<Record<string, unknown>> | undefined;
  const playOk =
    !!p &&
    ((p.kind === "campaign" && Number.isInteger(p.level) && (p.level as number) >= 1) ||
      (p.kind === "daily" && typeof p.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) ||
      (p.kind === "challenge" && typeof p.id === "string") ||
      (p.kind === "souvenir" && typeof p.trip === "string"));
  if (!r || r.v !== 1 || !playOk || typeof r.id !== "string" || typeof r.deal !== "string" || !Array.isArray(r.line) || !r.line.length) return null;
  return {
    v: 1,
    play: r.play!,
    id: r.id,
    deal: r.deal,
    line: r.line,
    ms: Number.isFinite(r.ms) ? Math.max(0, r.ms!) : 0,
    plans: Array.isArray(r.plans) ? r.plans : [],
    free: r.free && typeof r.free === "object" ? r.free : {},
  };
}

// ---------------------------------------------------------------- the read, once a session

const framed = window.self !== window.top;
/** The slot's record once read; undefined until then. */
let stored: InHand | null | undefined;
let reading: Promise<InHand | null> | null = null;
let readTries = 0;
let settleRead: ((r: InHand | null) => void) | null = null;

/**
 * The board kept last time, once this session's read has landed (it is
 * tried again until it does, on a backoff and when the connection comes
 * back); null when there is none, or outside the Arcade. Cap the wait: a
 * screen never waits on it.
 */
export function keptBoard(): Promise<InHand | null> {
  if (stored !== undefined) return Promise.resolve(stored);
  if (!reading) {
    reading = new Promise((r) => (settleRead = r));
    if (!framed) finishRead(null);
    else void readOnce();
  }
  return reading;
}

function finishRead(r: InHand | null): void {
  stored = r;
  written = JSON.stringify(r);
  settleRead?.(r);
  settleRead = null;
  // what the screens kept or dropped meanwhile is written now
  if (current) void write();
}

async function readOnce(): Promise<void> {
  try {
    await gem.awaitIdentity(10_000);
    let got: unknown = null;
    try {
      got = await gem.me.saves.get(SLOT, { timeoutMs: 10_000 });
    } catch (err) {
      if (!(err instanceof GemApiError) || err.reason !== "not_found") throw err;
    }
    finishRead(asRecord(got));
  } catch (err) {
    console.warn(`[in-hand] the kept board could not be read: ${refusalOf(err)}`);
    window.setTimeout(() => void readOnce(), Math.min(30_000, 2000 * 2 ** readTries++));
  }
}

// ---------------------------------------------------------------- the board kept now

/**
 * What the slot mirrors: the board the screens keep, or "dropped" (let go,
 * or refused for good); null until the screens say either this session, and
 * the slot is left as it was read (a board kept last time waits to be offered).
 */
let current: { board: BoardHandle; play: KeptPlay; id: string; deal: string } | "dropped" | null = null;
/** Something may have changed since the last write. */
let dirty = false;
/** The record as last written (JSON; "null": the slot is empty). */
let written: string | undefined;
let writing = false;
let lastPut = 0;
/** No save call before this (the platform said to wait: rate_limited's retry-after). */
let holdUntil = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
/** At most one write in this long while playing (each change after waits for it). */
const GAP_MS = 8000;

/**
 * Keep `board` (opened for `play`, of `level`) from now on: the slot follows
 * it as it is played, until it is won, restarted, replaced or dropped.
 */
export function keepInHand(board: BoardHandle, play: KeptPlay, level: Level): void {
  current = { board, play, id: level.id, deal: dealHash(level.deal) };
  soon();
}

/** Let the board kept go: the slot empties (a daily whose day has gone, a kept board that no longer fits). */
export function dropInHand(): void {
  current = "dropped";
  dirty = true;
  void write();
}

/** The record for the board kept now; null when there is nothing to carry on. */
function recordNow(): InHand | null {
  if (!current || current === "dropped") return null;
  const k = current.board.kept();
  return k ? { v: 1, play: current.play, id: current.id, deal: current.deal, ...k } : null;
}

/** Write after a while (a move, a hint): at most once in GAP_MS. */
function soon(): void {
  dirty = true;
  if (timer !== undefined) return;
  timer = setTimeout(() => {
    timer = undefined;
    void write();
  }, Math.max(1500, lastPut + GAP_MS - Date.now(), holdUntil - Date.now()));
}

/**
 * A refusal no retry changes: the record is too large or malformed, or the slot is not
 * declared on this channel. Anything else (rate_limited, unavailable, a session that
 * ended mid-save, storage's own GemSaveError, no answer at all) is asked again later.
 */
const forGood = (err: unknown): boolean =>
  err instanceof GemApiError && (err.reason === "too_large" || err.reason === "invalid" || err.reason === "not_found");

/**
 * Write now (the wait is over; or `closing`: the page hides, a pause, the game closing, which
 * try once even while the platform asked for a pause, since there may be no later: a win
 * closed at once must not leave its board behind to be offered again).
 */
async function write(timeoutMs = 10_000, closing = false): Promise<void> {
  if (!framed || stored === undefined || !current) return; // the read writes what waited; nothing said yet: the slot stays
  if (!closing && Date.now() < holdUntil) return soon(); // the platform asked for a pause
  if (writing) {
    dirty = true;
    return;
  }
  clearTimeout(timer);
  timer = undefined;
  writing = true;
  let again = false;
  try {
    for (;;) {
      dirty = false;
      const rec = recordNow();
      const text = JSON.stringify(rec);
      if (text === written) {
        if (dirty) continue;
        break;
      }
      lastPut = Date.now();
      try {
        if (rec) await gem.me.saves.put(SLOT, rec, { timeoutMs });
        else await gem.me.saves.delete(SLOT);
        written = text;
      } catch (err) {
        console.warn(`[in-hand] the board in hand could not be kept: ${refusalOf(err)}`);
        if (!forGood(err)) {
          // asked again on a timer (and when the connection is back), after any wait the platform set
          if (err instanceof GemApiError && err.reason === "rate_limited") holdUntil = Date.now() + Math.max(5, err.retryAfterSeconds ?? 30) * 1000;
          again = true;
          break;
        }
        // refused for good (too large, no such slot here): keep nothing more of this board, which
        // stays winnable fresh; a refused delete leaves the slot as empty as it will get
        if (rec) {
          current = "dropped";
          continue;
        }
        written = text;
        break;
      }
    }
  } finally {
    writing = false;
  }
  if (again) soon();
}

if (framed) {
  // a move or a Hint (board:changed), a win, a Restart, a board dealt: the slot follows the board kept now
  for (const type of ["board:changed", "board:start", "board:restart"] as const) on(type, () => soon());
  // a win is final the moment the rules say so (its claim goes out on this): nothing to carry on
  on("board:solved", () => {
    dirty = true;
    void write();
  });
  const now = () => {
    dirty = true;
    void write(4000, true);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") now();
  });
  addEventListener("pagehide", now);
  onArcadePause((paused) => {
    if (paused) now();
  });
  onWillTerminate((graceMs) => {
    dirty = true;
    void write(Math.max(1000, graceMs - 500), true);
  });
  onOnline((up) => {
    if (!up) return;
    if (stored === undefined && reading) void readOnce();
    else if (dirty) void write();
  });
}
