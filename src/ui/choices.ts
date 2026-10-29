// THE PLAYER'S CHOICES THAT FOLLOW THEM: which table, which soundtrack (the Cosmetics screen,
// cosmetics.ts; the creator, 2026-10-29). Kept with the player's own settings, gem.me.settings
// (AGENTS.md's table: "a difficulty, a level counter" follow the player), under the keys "table"
// and "track"; only what the player chose is ever written, never a default.
//
// ONE READ FOR BOTH: the boot asks for the player's settings once (gem.me.settings.list()), and
// tables.ts and tracks.ts share it, so the track added no call to the boot. A read that gets no
// answer leaves both on their defaults for the session (nothing is written over the player's
// choice: only a choice they make here is written).
//
// WRITES ARE PACED (src/net/pace.ts, the lead, 2026-10-29): a player tapping through the tables
// writes once, the last choice, a moment after the last tap (SETTLE_MS); one call at a time; a
// write that got no answer, or a "not now", is sent again on a wait that grows, never while the
// page is hidden, never before the platform's own hold; and one try on the way out (hidden,
// pagehide, the Arcade's pause or close) for a choice still unsent. A refusal that will not
// change by asking again (a key over the platform's limit) is dropped, with a warning.

import { gem, onArcadePause, onWillTerminate } from "../gem";
import { noAnswer, refusalOf } from "../net/no-answer";
import { backoff, heard, held, notNow, whenDue } from "../net/pace";
import { onOnline, suspect } from "./online";

export type ChoiceKey = "table" | "track";

/** Framed by the platform: another origin's frame. The play-test tool's frame is this page's own origin, with nothing behind it (as src/net/helpers.ts reads it). */
const framed = ((): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true;
  }
})();
/** A choice is written this long after the last change to it. */
const SETTLE_MS = 1500;
/** The first wait after a write got no answer (then it doubles, to pace.ts's cap). */
const FIRST_RETRY_MS = 5000;

let reading: Promise<ReadonlyMap<string, string>> | null = null;

/** The player's choices as the platform holds them (one read, shared); empty unframed or on no answer. */
export function readChoices(): Promise<ReadonlyMap<string, string>> {
  reading ??= (async () => {
    const out = new Map<string, string>();
    if (!framed) return out;
    try {
      await gem.awaitIdentity(10_000);
      for (const s of await gem.me.settings.list()) out.set(s.key, s.value);
    } catch (err) {
      heard(err);
      if (noAnswer(err)) suspect();
      console.warn(`[choices] the player's choices could not be read: ${refusalOf(err)}`);
    }
    return out;
  })();
  return reading;
}

/** The choices still to write: the latest value per key. */
const owed = new Map<ChoiceKey, string>();
/** What the platform was last told, per key (an unchanged value is not written again). */
const told = new Map<ChoiceKey, string>();
let busy = false;
let fails = 0;
let lastChange = 0;
let notBefore = 0;
let cancelWake: (() => void) | null = null;
let wired = false;

function wake(ms: number): void {
  cancelWake?.();
  cancelWake = whenDue(ms, () => {
    cancelWake = null;
    pump();
  });
}

function pump(): void {
  if (busy || !owed.size) return;
  const at = Math.max(lastChange + SETTLE_MS, notBefore, Date.now() + held());
  if (at > Date.now() || document.visibilityState === "hidden") return wake(at - Date.now());
  cancelWake?.();
  cancelWake = null;
  void send();
}

/** Write what is owed, one key at a time. `closing`: the try on the way out, never followed by a wait. */
async function send(closing = false): Promise<void> {
  busy = true;
  try {
    for (const [key, value] of [...owed]) {
      if (told.get(key) === value) {
        owed.delete(key);
        continue;
      }
      try {
        await gem.me.settings.put(key, value);
        told.set(key, value);
        // a newer choice made while this one went stays owed
        if (owed.get(key) === value) owed.delete(key);
        fails = 0;
      } catch (err) {
        heard(err);
        if (noAnswer(err)) suspect();
        if (!notNow(err)) {
          console.warn(`[choices] "${key}" was refused, not kept: ${refusalOf(err)}`);
          if (owed.get(key) === value) owed.delete(key);
          continue;
        }
        if (!closing) {
          notBefore = Date.now() + backoff(++fails, FIRST_RETRY_MS);
          console.warn(`[choices] "${key}" was not kept (${refusalOf(err)}): again in ${Math.round((notBefore - Date.now()) / 1000)} s`);
        }
        return;
      }
    }
  } finally {
    busy = false;
    if (!closing && owed.size) pump();
  }
}

/** On the way out: one try for a choice still unsent, unless the platform asked for a wait. */
function closing(): void {
  if (busy || !owed.size || held() > 0) return;
  cancelWake?.();
  cancelWake = null;
  void send(true);
}

function wire(): void {
  if (wired) return;
  wired = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") closing();
    else pump();
  });
  addEventListener("pagehide", closing);
  onArcadePause((paused) => (paused ? closing() : pump()));
  onWillTerminate(closing);
  onOnline((up) => {
    if (!up || !fails) return;
    notBefore = 0;
    pump();
  });
}

/**
 * The player chose `value` for `key`: kept with them, a moment after their last change (unframed,
 * where there is no player, nothing is kept). What the boot read finds never overrides it.
 */
export function keepChoice(key: ChoiceKey, value: string): void {
  if (!framed) return;
  wire();
  owed.set(key, value);
  lastChange = Date.now();
  // what the boot read says is what the platform holds: the same value is not written again
  void readChoices().then((stored) => {
    if (!told.has(key) && stored.has(key)) told.set(key, stored.get(key)!);
    pump();
  });
}
