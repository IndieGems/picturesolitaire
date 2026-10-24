// THE DAILY RULE: which board is a date's daily puzzle. Pure, so the game and
// the win checker (server) pick the same board for the same date and never
// disagree; the server mirrors this function.
//
// The pool (src/content/levels/daily.json, made by tools/levels/make-daily.mts)
// holds one proved board per calendar date, id "d" + date. A date's daily is
// the board with that id, or none: no board before the pool's first date or
// after its last, and nothing wraps round (a board id pays once, so a repeat
// would be a daily that cannot be earned). The pool is kept months ahead of
// today by appending days; a shipped date never changes.
//
// The date is the player's own calendar date from the platform
// (periodLocalDate, "YYYY-MM-DD"), never the device clock.

export interface DailyBoard {
  id: string;
  date: string;
  [field: string]: unknown;
}

/** The daily board for `date` ("YYYY-MM-DD") in `pool`, or null when the pool has none for it. */
export function dailyFor<B extends DailyBoard>(pool: { levels: readonly B[] }, date: string): B | null {
  const levels = pool.levels;
  if (!levels.length) return null;
  // one board a day from the first date, so the index is the days since it
  const day = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;
  const i = day(date) - day(levels[0]!.date);
  if (!Number.isInteger(i) || i < 0 || i >= levels.length) return null;
  const b = levels[i]!;
  return b.id === `d${date}` ? b : null;
}
