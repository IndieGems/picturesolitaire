// Numbers and dates as the player reads them.

/** A play time: "1:32", or "1:02:05" past the hour. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const hrs = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${String(m % 60).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/**
 * A calendar date ("YYYY-MM-DD", the platform's date for the player's day) as a
 * short day and month in the page's language: "Oct 24". Read as the date it
 * names, never moved by the device's time zone.
 */
export function shortDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Intl.DateTimeFormat(document.documentElement.lang || "en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    Date.UTC(y, m - 1, d),
  );
}
