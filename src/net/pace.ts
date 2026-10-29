// PACING EVERY CALL THIS GAME ASKS AGAIN (the lead, 2026-10-29, after a throttle on the whole
// office: the platform limits requests per NETWORK ADDRESS, 120 a minute for saves, and an office
// or a home shares one). Every loop in src/net that asks the platform again after "not now" waits
// here, so none of them hammers:
//   - a wait that grows from the loop's own base (2 s, 4 s, 8 s ...) to at most 5 minutes, with a
//     little jitter so two loops, or two players behind one address, do not ask in step;
//   - never shorter than the platform asked: a refusal's retry-after (429 rate_limited, 503
//     unavailable), or 30 s for a 429 that names none, holds EVERY loop here, not only the one
//     refused, since the budget is the address's, not the loop's;
//   - nothing while the page is hidden: a wait that ends then waits for the page to be shown
//     (each loop's one closing write on the way out is its own, and is never asked again);
//   - one call in flight per loop (each loop's own flag).
// Worst case, under a throttle that refuses everything: each loop asks about 5 times in its
// first minute and once in 5 minutes after that, and no loop asks while the platform's wait runs.

import { GemApiError, GemSaveError } from "@indiegems/gem-web-sdk/sdk";

/** The longest any loop waits between two asks. */
export const CAP_MS = 300_000;
/** A 429 that names no wait is held this long. */
const RATE_LIMITED_MS = 30_000;

let heldUntil = 0;

/**
 * Is this a "not now", worth asking again later: no answer at all (a timeout, a dropped
 * connection, storage's own leg of a save), or a refusal the platform marks retryable
 * (rate_limited, unavailable)? Anything else will not change by asking again.
 */
export function notNow(err: unknown): boolean {
  if (!(err instanceof GemApiError)) return true;
  return err.retryable || err.reason === "rate_limited" || err.reason === "unavailable";
}

/**
 * A save's storage leg refused for the rate: it reaches the game as a GemSaveError, not an API
 * refusal ("the save upload answered 429. Storage said: {"error":{"code":"rate_limited"...").
 * The first refusal of the 2026-10-29 throttle was one (Gameplay's note, session c2751c4c).
 */
const storageRateLimited = (err: unknown): boolean =>
  err instanceof GemSaveError && /answered 429\b|"rate_limited"/.test(err.message);

/** Take in what a refusal says about waiting: a named wait, or a 429's (storage's too), holds every loop here. */
export function heard(err: unknown): void {
  if (storageRateLimited(err)) {
    heldUntil = Math.max(heldUntil, Date.now() + RATE_LIMITED_MS);
    return;
  }
  if (!(err instanceof GemApiError)) return;
  const named = err.retryAfterSeconds && err.retryAfterSeconds > 0 ? err.retryAfterSeconds * 1000 : err.reason === "rate_limited" ? RATE_LIMITED_MS : 0;
  if (named > 0) heldUntil = Math.max(heldUntil, Date.now() + Math.min(named, CAP_MS));
}

/** How long, from now, the platform asked everyone here to wait (0: not held). */
export const held = (): number => Math.max(0, heldUntil - Date.now());

/**
 * The wait after `fails` failures in a row (1 for the first): `base`, doubled for each one more,
 * at most `cap`, jittered by up to 15% either way, and never shorter than the platform's hold.
 */
export function backoff(fails: number, base = 2000, cap = CAP_MS): number {
  const grown = Math.min(cap, base * 2 ** Math.max(0, Math.min(fails - 1, 20)));
  return Math.max(held(), Math.round(grown * (0.85 + Math.random() * 0.3)));
}

/**
 * Run `fn` once, `ms` from now, while the page is shown, and not before the platform's hold has
 * run out: a wait that ends while the page is hidden runs `fn` when it is shown again. Returns the
 * cancel. A loop keeps one of these at a time (it cancels the last before asking for another).
 */
export function whenDue(ms: number, fn: () => void): () => void {
  let timer: number | undefined;
  let done = false;
  const shown = (): void => {
    if (document.visibilityState !== "visible") return;
    document.removeEventListener("visibilitychange", shown);
    go();
  };
  const go = (): void => {
    if (done) return;
    if (document.visibilityState === "hidden") {
      document.addEventListener("visibilitychange", shown);
      return;
    }
    const wait = held();
    if (wait > 0) {
      timer = window.setTimeout(go, wait);
      return;
    }
    done = true;
    fn();
  };
  timer = window.setTimeout(go, Math.max(0, ms));
  return () => {
    done = true;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", shown);
  };
}
