//! THE PLAYER'S DAYS, and the daily archive's window (the creator, 2026-10-30; open to everyone since
//! 2026-11-10; docs/vip.md). Pure: lib.rs asks the platform for the player's own date, this reckons
//! from it. tests/days.rs runs it on this machine.
//!
//! THE DAILY ARCHIVE (the game standard, "An archive of past dailies"): this month and the two before
//! it, in the player's own months, from the 1st of the month two before their today, to yesterday.
//! The server pays a past day if the archive showed it on the player's date or the day before (a day
//! of slack, so a board opened just before midnight on the 31st still pays), and nothing older.
//!
//! THE DAY OF THE WEEK (iso_day, Monday 1 .. Sunday 7) picks which of the config's weekday recipes a
//! day gives (pay.rs: the daily puzzle's helper, VIP's daily gift). What each gives is the config's.
//! (Until 0.1.63 this file was vip.rs, and read the player's VIP pass too: no game code reads it now.)

/// Days from 1970-01-01 of a "YYYY-MM-DD" date. None when malformed.
pub fn day_number(date: &str) -> Option<i64> {
    let (y, m, d) = ymd(date)?;
    Some(days_of(y, m, d))
}

/// The day of the player's week a date is, Monday 1 .. Sunday 7 (ISO).
pub fn iso_day(date: &str) -> Option<u32> {
    // 1970-01-01, day 0, was a Thursday (4)
    Some(((day_number(date)? + 3).rem_euclid(7) + 1) as u32)
}

fn ymd(date: &str) -> Option<(i64, i64, i64)> {
    let mut p = date.split('-').map(|x| x.parse::<i64>().ok());
    let (y, m, d) = (p.next()??, p.next()??, p.next()??);
    ((1..=12).contains(&m) && (1..=31).contains(&d) && date.len() == 10).then_some((y, m, d))
}

/// Days from 1970-01-01 of a civil date (H. Hinnant's method), and back.
fn days_of(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    era * 146_097 + yoe * 365 + yoe / 4 - yoe / 100 + doy - 719_468
}

fn date_of(z: i64) -> String {
    let z = z + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02}")
}

/// `date` moved by `n` days, in the calendar alone. None for a malformed date.
pub fn add_days(date: &str, n: i64) -> Option<String> {
    let (y, m, d) = ymd(date)?;
    Some(date_of(days_of(y, m, d) + n))
}

/// The archive's first day for a player whose date is `today`: the 1st of the month two before.
pub fn archive_start(today: &str) -> Option<String> {
    let (y, m, _) = ymd(today)?;
    let months = y * 12 + (m - 1) - 2;
    Some(format!("{:04}-{:02}-01", months.div_euclid(12), months.rem_euclid(12) + 1))
}

/// Does a past day `date` pay, for a player whose date is `today`? It must be before today, and in
/// the archive as it was today or yesterday (the day of slack).
pub fn in_archive(date: &str, today: &str) -> bool {
    let (Some(_), Some(yesterday)) = (ymd(date), add_days(today, -1)) else { return false };
    let Some(first) = archive_start(&yesterday) else { return false };
    first.as_str() <= date && date < today
}
