// THE GAME'S OWN FILES (the build's static files: the picture packs and their index, the tables' list,
// the icons), fetched so that a request that never answers cannot strand the player (QA, 2026-11-01: in
// 2 of 10 loads on a test host, packs/index.json and art/tables/tables.json, sent about 5 s in, never
// answered, while a fresh fetch of the same file answered in 4 ms; a phone on a bad connection can do
// the same). Home's Play then said "Opening…" for good.
//
//   - Each try has a time limit, WAIT_MS, for an answer to start AND for each piece of it after that
//     (a stalled download is caught too, while a slow one that keeps arriving is never cut off).
//   - A try that gets no answer, stalls, or meets a busy host (5xx, 408, 429) is tried again, TRIES in
//     all, after waits that grow (FIRST_RETRY_MS, doubled each time, jittered): never a tight loop.
//   - Anything else (a 404, a file that is not what it should be) is the caller's to judge, at once.
//   - The first try with no answer asks the connection check (online.ts suspect), so a phone that has
//     lost its connection gets "No connection" within seconds, not after every try.
//   - When every try fails, the call rejects, and the screen says so with Try again (app.ts's
//     "Couldn't load" card), never an endless "Opening…".
// These are our own files on the game's own host, not platform calls: src/net/pace.ts does not apply.

import { suspect } from "./online";
//
//   ownFile(url, read, opts)  read(response, release) turns the answer into what the caller wants (its
//                             json, its bytes, a part of its stream); release() ends the request early
//                             once the caller has read enough (its connection back), and is no failure.

/** Tries in all (the first and its retries). */
const TRIES = 4;
/** The longest a try waits for an answer to start, or for the next piece of it. */
const WAIT_MS = 10_000;
/** The first retry's wait; each one after doubles (1 s, 2 s, 4 s). */
const FIRST_RETRY_MS = 1000;

/** A try that is worth repeating: no answer, a stall, a busy host. */
class Transient extends Error {}

/** A host that is busy or down for the moment, rather than refusing. */
const busyStatus = (s: number): boolean => s >= 500 || s === 408 || s === 429;

/** `body`, read through a watch: a piece that does not come within WAIT_MS ends the request (`stall`). */
function watched(body: ReadableStream<Uint8Array>, stall: () => void): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(out) {
      // only while a piece is being waited for: a reader that pauses is not a stalled host
      const timer = setTimeout(stall, WAIT_MS);
      try {
        const { done, value } = await reader.read();
        if (done) out.close();
        else out.enqueue(value);
      } catch (err) {
        out.error(err);
      } finally {
        clearTimeout(timer);
      }
    },
    cancel: (why) => reader.cancel(why),
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Fetch one of the game's own files, with a time limit per try and a few tries (above). `read` gets
 * the answer (any status but a busy host's) and may call `release` once it has read what it wants.
 * Rejects with the last try's error once every try has failed, or at once with `read`'s own.
 */
export async function ownFile<T>(url: string, read: (r: Response, release: () => void) => Promise<T>, opts: { init?: Omit<RequestInit, "signal">; tries?: number } = {}): Promise<T> {
  const tries = Math.max(1, opts.tries ?? TRIES);
  for (let n = 1; ; n++) {
    const stop = new AbortController();
    let stalled = false;
    let released = false;
    const stall = () => {
      stalled = true;
      stop.abort();
    };
    const timer = setTimeout(stall, WAIT_MS);
    try {
      const r = await fetch(url, { ...opts.init, signal: stop.signal });
      clearTimeout(timer);
      if (busyStatus(r.status)) {
        void r.body?.cancel().catch(() => undefined);
        throw new Transient(`${url}: ${r.status}`);
      }
      const answer = r.body && ![204, 205, 304].includes(r.status) ? new Response(watched(r.body, stall), { status: r.status, statusText: r.statusText, headers: r.headers }) : r;
      return await read(answer, () => {
        released = true;
        stop.abort();
      });
    } catch (err) {
      clearTimeout(timer);
      // no answer (a network error is a TypeError), a stall, a busy host: worth another try; a
      // request the caller released, or what the caller made of the answer, is the caller's
      const again = !released && (stalled || err instanceof Transient || err instanceof TypeError);
      if (!again) throw err;
      if (n === 1 && !(err instanceof Transient)) suspect(); // no answer at all (a busy host is an answer)
      const why = stalled ? `no answer in ${WAIT_MS / 1000} s` : err instanceof Error ? err.message : String(err);
      if (n >= tries) {
        console.warn(`[files] ${url} did not load after ${tries} tries (${why})`);
        throw stalled ? new Error(`${url}: no answer`) : err;
      }
      const wait = Math.round(FIRST_RETRY_MS * 2 ** (n - 1) * (0.85 + Math.random() * 0.3));
      console.info(`[files] ${url}: ${why}; again in ${(wait / 1000).toFixed(1)} s (${n + 1} of ${tries})`);
      await sleep(wait);
    }
  }
}

/** One of the game's own JSON files; null for a 404 when `missing` is "null" (a build without it), else any non-OK status rejects. */
export function ownJson<T>(url: string, missing: "null" | "fail" = "fail", tries?: number): Promise<T | null> {
  return ownFile(
    url,
    async (r) => {
      if (r.status === 404 && missing === "null") {
        void r.body?.cancel().catch(() => undefined);
        return null;
      }
      if (!r.ok) {
        void r.body?.cancel().catch(() => undefined);
        throw new Error(`${url}: ${r.status}`);
      }
      return (await r.json()) as T;
    },
    tries === undefined ? {} : { tries },
  );
}
