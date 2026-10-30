//! WHO IS VIP, and the daily archive VIPs may play (the creator, 2026-10-30; docs/vip.md). Pure:
//! lib.rs asks the platform, this decides. tests/vip.rs runs it on this machine.
//!
//! Gem Arcade VIP is the Arcade's own pass. The platform cannot tell a game who holds it yet (SDK
//! 17.0.0), so lib.rs's `platform_vip` answers None and the player is NOT VIP on test and release.
//! When the platform adds a read, that one function changes, and nothing else. On the dev channel
//! only, a call carrying `pretend_vip: true` (the dev menu's "Pretend I'm VIP", src/net/vip.ts) is
//! VIP, so the creator and QA can see every perk; on any other channel the flag is ignored.
//!
//! THE DAILY ARCHIVE (the game standard, "An archive of past dailies"): this month and the two before
//! it, in the player's own months, from the 1st of the month two before their today, to yesterday.
//! The server pays a past day if the archive showed it on the player's date or the day before (a day
//! of slack, so a board opened just before midnight on the 31st still pays), and nothing older.

use serde_json::Value;

/// VIP for this call: the platform's word when it has one; else, on the dev channel only, the
/// dev menu's pretend; else not.
pub fn decide(channel: &str, input: &Value, platform: Option<bool>) -> bool {
    match platform {
        Some(v) => v || (channel == "dev" && input["pretend_vip"] == true),
        None => channel == "dev" && input["pretend_vip"] == true,
    }
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
