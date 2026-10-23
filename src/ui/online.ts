// EVERY GAME IS PLAYED ONLINE, AND ONLY ONLINE (the game standard, "Every game
// is played online"). The player's progress is the cloud save, so when the
// connection goes the board in hand can still be finished, and nothing new
// starts: the app shell lays the "No connection" card over every other screen,
// and over a board the win card's Next would open, until this file says the
// connection is back, which it notices by itself, with nothing to press.
//
// Offline is what the browser says (`navigator.onLine`, the `offline` event),
// or a platform request that got no answer at all (`suspect()`), confirmed by
// asking the game's own host: ANY answer from it, even an error status, means
// connected. And that question counts only once the host has answered it in
// this session (asked once, a few seconds after launch), so a host that will
// not let it be asked never locks the game behind the card.
//
// Inside a frame only: a developer's plain tab has no platform to need.
// `?offline=1` shows the card for checking it: in the dev server (the
// play-test tool frames it) or a plain tab, never for a framed built game.
// Copied from Untangled's src/online.ts.

const framed = window.self !== window.top;
const demo = new URLSearchParams(location.search).get("offline") === "1" && (import.meta.env.DEV || !framed);

let up = !demo && !(framed && navigator.onLine === false);
const fns = new Set<(up: boolean) => void>();

/** Whether the game can reach the platform, as far as it knows: true until something says otherwise. */
export const online = (): boolean => up;

/** Hear when the connection goes (false) or comes back (true). Returns the unsubscribe. */
export function onOnline(fn: (up: boolean) => void): () => void {
  fns.add(fn);
  return () => void fns.delete(fn);
}

function set(next: boolean): void {
  if (next === up) return;
  up = next;
  if (up) tries = 0;
  for (const fn of [...fns]) fn(up);
}

// While offline, look again on a backoff (2 s, 4 s, 8 s, then every 15 s) while
// the page is in view, and at once on the `online` event or on coming back to
// the page. A hidden page asks nothing.
const PROBE_TIMEOUT_MS = 8000;
const FIRST_PROBE_MS = 5000;
let timer: number | undefined;
let tries = 0;
let probing = false;
/** The host has answered the question once this session, so its silence means something. */
let answers = false;

function again(): void {
  clearTimeout(timer);
  if (up || document.visibilityState === "hidden") return;
  timer = window.setTimeout(probe, Math.min(15_000, 2000 * 2 ** tries++));
}

/** Whether the game's own host answers: the page's own address, never from a cache. */
async function asked(): Promise<boolean> {
  const stop = new AbortController();
  const late = setTimeout(() => stop.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(location.href, { method: "HEAD", cache: "no-store", signal: stop.signal });
    return (answers = true);
  } catch {
    return false;
  } finally {
    clearTimeout(late);
  }
}

async function probe(): Promise<void> {
  if (probing || demo) return;
  probing = true;
  clearTimeout(timer);
  const reached = navigator.onLine !== false && ((await asked()) || !answers);
  probing = false;
  set(reached);
  again();
}

/**
 * A request to the platform got no answer (it could not be sent, or timed
 * out): look whether the connection has gone. A refusal is an answer, and
 * needs no call here.
 */
export function suspect(): void {
  if (framed && up) void probe();
}

if (framed && !demo) {
  addEventListener("offline", () => {
    set(false);
    again();
  });
  addEventListener("online", () => void probe());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !up) void probe();
  });
  if (!up) again();
  // once, after the first screen: can the host be asked at all here?
  else setTimeout(() => void probe(), FIRST_PROBE_MS);
}

/** Checking the card by hand: `__ps.offline(true)` from the console (dev server only). */
export function pretend(off: boolean): void {
  set(!off);
}
