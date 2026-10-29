// THE PACING CHECK (src/net/pace.ts; the lead, 2026-10-29, after a throttle on the whole office):
// how often each of the game's own retry loops (src/net) can ask the platform while EVERYTHING it
// asks is refused, before the pacing and after it. No platform, no browser: the loops' waits are
// replayed on a clock (the old formulas from git, the new ones through pace.ts's own backoff).
//
//   node tools/server/pace-sim.mts            prints requests per minute per player, worst minute
//
// Exit code 1 if any loop, paced, asks more than 6 times in a minute, or asks again inside a
// retry-after, or more than once in 5 minutes once it has settled.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { GemApiError } from "@indiegems/gem-web-sdk/sdk";
import { backoff, CAP_MS, heard, held, notNow } from "../../src/net/pace.ts";

const MIN = 60_000;
const SPAN = 30 * MIN;
// Math.random fixed at the top of its range: the jitter's shortest waits, the worst case
Math.random = () => 0;

/** Ask times (ms) of a loop that fails every time: `wait(n)` is the wait after the nth failure in a row. */
function asks(wait: (n: number, t: number) => number, first = 0): number[] {
  const out: number[] = [];
  let t = first;
  for (let n = 1; t < SPAN && n < 100_000; n++) {
    out.push(t);
    t += Math.max(1, wait(n, t));
  }
  return out;
}
const worstMinute = (ts: number[]) => Math.max(...ts.map((a) => ts.filter((b) => b >= a && b < a + MIN).length));
const settled = (ts: number[]) => ts.filter((t) => t >= 10 * MIN);
const settledRate = (ts: number[]) => (settled(ts).length / ((SPAN - 10 * MIN) / MIN)).toFixed(2);

// the old formulas (git show HEAD~:src/net/*.ts), each failing forever
const before = {
  "claims: the slot's save, refused at once (3 s apart, inline, forever, also hidden; 10 s apart when each times out)": { ask: asks(() => 3000), req: 3 },
  "claims: 5 held wins sent again, each on its own wait (2 s doubling, at most 60 s, retry-after ignored)": { ask: asks((n) => Math.min(60_000, 2000 * 2 ** Math.min(n - 1, 6))), req: 5 },
  "claims: the slot's read at start (2 s doubling, at most 30 s)": { ask: asks((n) => Math.min(30_000, 2000 * 2 ** (n - 1))), req: 2 },
  "progress: the record's read at start (2 s doubling, at most 30 s)": { ask: asks((n) => Math.min(30_000, 2000 * 2 ** (n - 1))), req: 2 },
  "helpers: an unanswered use sent again (2 s doubling, at most 30 s; a stock read and a save each time)": { ask: asks((n) => Math.min(30_000, 2000 * 2 ** (n - 1))), req: 6 },
};

// the paced ones: every wait is pace.ts's backoff, from each loop's own base
const rate429 = new GemApiError("rate_limited", 429, "slow down", 20);
const paced = {
  "claims: the slot's save": { ask: asks((n) => backoff(n, 5000)), req: 3 },
  "claims: 5 held wins, one wait for the whole queue (a refusal stops the pass)": { ask: asks((n) => backoff(n, 2000)), req: 1 },
  "claims: the slot's read at start": { ask: asks((n) => backoff(n, 2000)), req: 2 },
  "progress: the record's read at start": { ask: asks((n) => backoff(n, 2000)), req: 2 },
  "helpers: an unanswered use sent again (a save once, a stock read only after no answer)": { ask: asks((n) => backoff(n, 2000)), req: 2 },
  "daily: the day's read": { ask: asks((n) => backoff(n, 5000)), req: 1 },
};

let bad = 0;
const table = (title: string, rows: Record<string, { ask: number[]; req: number }>, check: boolean) => {
  console.log(`\n${title}`);
  let worst = 0;
  let after10 = 0;
  for (const [name, { ask, req }] of Object.entries(rows)) {
    const w = worstMinute(ask);
    worst += w * req;
    after10 += Number(settledRate(ask)) * req;
    console.log(`  ${String(w).padStart(3)} asks in its worst minute (${String(w * req).padStart(3)} requests), ${settledRate(ask).padStart(5)} a minute after 10 min   ${name}`);
    if (check) {
      if (w > 6) bad++, console.log("      FAIL: more than 6 asks in a minute");
      const gaps = settled(ask).slice(1).map((t, i) => t - settled(ask)[i]);
      if (gaps.some((g) => g < CAP_MS * 0.85)) bad++, console.log("      FAIL: settled, it asks more than once in about 5 minutes");
    }
  }
  console.log(`  all of these together, one player: at most ${worst} requests in a minute, ${after10.toFixed(1)} a minute once settled`);
};
table("BEFORE (the loops as they were)", before, false);
table("AFTER (paced by src/net/pace.ts)", paced, true);

// a 429's retry-after holds every loop, not only the one refused
heard(rate429);
const h = held();
if (!(h >= 19_000 && h <= 20_000)) bad++, console.log(`FAIL: a 429 naming 20 s holds ${h} ms`);
if (backoff(1, 2000) < h - 50) bad++, console.log("FAIL: a loop's first wait is shorter than the platform's");
if (!notNow(rate429) || !notNow(new Error("save_timeout")) || notNow(new GemApiError("too_large", 413, "big"))) bad++, console.log("FAIL: notNow misreads a refusal");
heard(new GemApiError("rate_limited", 429, "no wait named"));
if (held() < 29_000) bad++, console.log("FAIL: a 429 naming no wait holds less than 30 s");
console.log(`\n${bad ? `pace check: ${bad} FAILED` : "pace check: every paced loop grows to one ask in 5 minutes, and waits out the platform's retry-after"}`);
process.exit(bad ? 1 : 0);
