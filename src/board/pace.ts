// The board's one animation loop, paced by the game standard ("Phones: battery
// and heat"): at most 60 frames a second in whole screen refreshes, nothing
// at all at rest, and under Battery saver about 30 for what plays by itself
// (a card sliding home, a celebration) while what is under the finger stays
// at 60. Every animation on the board asks this loop, so they all draw on the
// same refreshes.
//
// Time is the frames' own clock: dt is this drawn frame's timestamp minus the
// last drawn one, both as requestAnimationFrame passes them, never below 0 and
// never more than MAX_STEP, and the first frame after a rest or a pause
// advances by 0. A hidden page gets no frames, so nothing moves while away.

const MAX_STEP = 50;

interface Job {
  /** Advance by `dt` ms; return false when done. */
  fn: (dt: number) => boolean;
  /** Plays by itself (not under the finger): slowed under Battery saver. */
  calm: boolean;
  /** Time a calm job has not been given yet, while its frames are skipped. */
  owed: number;
}

const jobs = new Set<Job>();
let raf = 0;
let lastRefresh: number | null = null;
let lastDrawn: number | null = null;
let interval = 1000 / 60;
let refreshes = 0;
let drawn = 0;
let batterySaver = false;
/**
 * Board time runs at this many times real time: the dev menu's animation
 * speed (0.25 slow motion, 2 twice as fast). Every animation steps by board
 * time, so one value slows or quickens them all. 1 outside the dev menu.
 */
let timeScale = 1;
export function setTimeScale(x: number): void {
  timeScale = Number.isFinite(x) ? Math.min(4, Math.max(0.1, x)) : 1;
}
/** Real ms for `ms` of board time (for events that tell others when something lands). */
export const realMs = (ms: number): number => Math.round(ms / timeScale);
export const timeScaleNow = (): number => timeScale;

/** Battery saver on or off (the Arcade's, or the game's own switch). */
export function setBatterySaver(on: boolean): void {
  batterySaver = on;
}

function frame(now: number): void {
  raf = 0;
  if (lastRefresh !== null) {
    const d = now - lastRefresh;
    if (d > 3 && d < 60) interval += (d - interval) * 0.1;
  }
  lastRefresh = now;
  const n = Math.max(1, Math.floor(1000 / 60 / interval + 0.15));
  refreshes++;
  if (refreshes % n === 0 || lastDrawn === null) {
    const dt = (lastDrawn === null ? 0 : Math.min(MAX_STEP, Math.max(0, now - lastDrawn))) * timeScale;
    lastDrawn = now;
    drawn++;
    const m = batterySaver ? Math.max(1, Math.floor(1000 / 30 / (n * interval) + 0.15)) : 1;
    for (const job of [...jobs]) {
      let step = dt;
      if (job.calm && m > 1) {
        job.owed += dt;
        if (drawn % m !== 0) continue;
        step = Math.min(MAX_STEP * m * timeScale, job.owed);
      }
      job.owed = 0;
      let keep = false;
      try {
        keep = job.fn(step);
      } catch (err) {
        console.error("[board] animation failed", err);
      }
      if (!keep) jobs.delete(job);
    }
  }
  if (jobs.size && !paused) raf = requestAnimationFrame(frame);
  else lastRefresh = lastDrawn = null;
}

let paused = false;

/** The Arcade paused the game (or let it go on): paused means stopped, no frames at all. */
export function setPaused(on: boolean): void {
  if (on === paused) return;
  paused = on;
  if (on && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  lastRefresh = lastDrawn = null; // the first frame back advances by 0
  if (!on && jobs.size && !raf) raf = requestAnimationFrame(frame);
}

/** Run `fn` on every drawn frame until it returns false. Returns a stop. */
export function run(fn: (dt: number) => boolean, calm = true): () => void {
  const job: Job = { fn, calm, owed: 0 };
  jobs.add(job);
  if (!raf && !paused) raf = requestAnimationFrame(frame);
  return () => jobs.delete(job);
}

/** Stop and forget every job (the board closed). */
export function stopAll(): void {
  jobs.clear();
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  lastRefresh = lastDrawn = null;
}

export type Ease = (t: number) => number;
export const ease = {
  linear: (t: number) => t,
  out: (t: number) => 1 - (1 - t) ** 3,
  /** Slow at first, then faster: something going to nothing. */
  in: (t: number) => t * t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  /** Falling: speeds up like a dropped card, then a soft landing in the last tenth. */
  fall: (t: number) => (t < 0.9 ? (t / 0.9) ** 2 * 0.98 : 0.98 + ((t - 0.9) / 0.1) * 0.02),
  /** Overshoots a little and settles: a pop. */
  back: (t: number) => {
    const c = 1.7;
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
  },
};

/**
 * Call `apply(progress)` from 0 to 1 over `ms`, after `delay` ms. Resolves
 * when done (at once for 0 ms). `cancel` from the returned handle finishes it
 * where it stands.
 */
export function tween(ms: number, apply: (t: number) => void, opts: { delay?: number; ease?: Ease; calm?: boolean } = {}): Promise<void> {
  const curve = opts.ease ?? ease.out;
  let t = -(opts.delay ?? 0);
  if (ms <= 0 && t >= 0) {
    apply(1);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    run((dt) => {
      t += dt;
      if (t < 0) return true;
      const p = ms <= 0 ? 1 : Math.min(1, t / ms);
      apply(curve(p));
      if (p >= 1) {
        resolve();
        return false;
      }
      return true;
    }, opts.calm ?? true);
  });
}

/** Wait `ms` of board time (it stands still while the page is hidden). */
export function wait(ms: number): Promise<void> {
  return tween(ms, () => {}, { ease: ease.linear });
}
