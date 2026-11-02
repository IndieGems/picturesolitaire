//! WHO IS VIP, and the daily archive VIPs may play (the creator, 2026-10-30; docs/vip.md). Pure:
//! lib.rs asks the platform, this decides. tests/vip.rs runs it on this machine.
//!
//! Gem Arcade VIP is the Arcade's own pass, `vip` (on sale since 2026-11-01). lib.rs's `platform_vip`
//! asks the platform which passes the player who called holds (GET /v1/games/{game}/players/me/passes,
//! gem-api#4337; SDK 19.0.0's arcade-and-store.md, section 11), and `passes` reads the answer: VIP is
//! a `vip` entry with `held: true`; listed and not held, or not listed at all, is not VIP. A read that
//! failed is UNKNOWN (None), never "not VIP" and never VIP: lib.rs holds a claim that needs it to try
//! again and says nothing about VIP, so the game keeps what it had. On the dev channel only, a call
//! carrying `pretend_vip: true` (the dev menu's "Pretend I'm VIP", src/net/vip.ts) is VIP, so the
//! creator and QA can see every perk; on any other channel the flag is ignored.
//!
//! THE DAILY ARCHIVE (the game standard, "An archive of past dailies"): this month and the two before
//! it, in the player's own months, from the 1st of the month two before their today, to yesterday.
//! The server pays a past day if the archive showed it on the player's date or the day before (a day
//! of slack, so a board opened just before midnight on the 31st still pays), and nothing older.
//!
//! VIP'S GIFTS (the creator, 2026-11-01, after Jade Match; docs/vip.md): VIP no longer makes a helper
//! free; it gives helpers. `due` decides what a VIP is owed on their own date (the platform's, never
//! the device's): the day's gift, by the day of their week (Monday 1 .. Sunday 7, src/net/helper-ids.json
//! `vip.daily`), once a date, while the day last given its gift (the progression `vip_gift_day`) is
//! before today; and the welcome, once a membership, while the end day of the membership last
//! welcomed (the progression `vip_welcome_end`) is before today. A membership is told by its end:
//! one that ends after the last one welcomed ended is a new one, so a membership bought after a lapse
//! is welcomed again and one extended before it lapses is not. lib.rs pays them (`what: "vip_gift"`).

use serde_json::Value;

/// The pass read's answer ({"passes":[{"pass":"vip","held":true,"ends_at":…}]}), read for VIP.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Passes {
    /// The player holds `vip`.
    pub held: bool,
    /// `vip` is in the list at all: a pass the platform has not marked visible to games is left out,
    /// and then every player reads as not VIP (lib.rs logs which).
    pub listed: bool,
    /// How many passes the list has.
    pub count: usize,
    /// The day (days from 1970-01-01) a held `vip` ends: its `ends_at`'s UTC date. None: not held, or
    /// held with no end (a pass support granted).
    pub ends: Option<i64>,
}

/// Read a 2xx pass read's body. None when it is not the documented shape: unknown, not "not VIP".
pub fn passes(body: &Value) -> Option<Passes> {
    let list = body["passes"].as_array()?;
    let vip: Vec<&Value> = list.iter().filter(|p| p["pass"] == "vip").collect();
    let held: Vec<&&Value> = vip.iter().filter(|p| p["held"] == true).collect();
    // two held entries (never seen): the later end, and none at all if either has none; an `ends_at`
    // that is not a date reads as no end, which welcomes once for good rather than every day
    let open = held.iter().any(|p| p["ends_at"].as_str().and_then(|e| day_number(e.get(..10)?)).is_none());
    let ends = if open { None } else { held.iter().filter_map(|p| day_number(p["ends_at"].as_str()?.get(..10)?)).max() };
    Some(Passes { held: !held.is_empty(), listed: !vip.is_empty(), count: list.len(), ends })
}

/// `vip_welcome_end` for a membership with no end: welcomed once, for good.
pub const NO_END_DAY: i64 = 99_999_999;
/// The dev pretend has no membership behind it: it is welcomed as a 30-day one from that day.
pub const PRETEND_DAYS: i64 = 30;

/// Days from 1970-01-01 of a "YYYY-MM-DD" date. None when malformed.
pub fn day_number(date: &str) -> Option<i64> {
    let (y, m, d) = ymd(date)?;
    Some(days_of(y, m, d))
}

/// The day of the player's week a date is, Monday 1 .. Sunday 7 (ISO): which VIP gift it pays.
pub fn gift_day(date: &str) -> Option<u32> {
    // 1970-01-01, day 0, was a Thursday (4)
    Some(((day_number(date)? + 3).rem_euclid(7) + 1) as u32)
}

/// What a VIP is owed on `today`, their own date: the day's gift unless the day mark says this day
/// (or a later one, after a change of time zone) had it, and the welcome while the membership last
/// welcomed ended before today. Both are decided from the marks the platform keeps, never from an
/// order's nonce alone: the platform answers a reused nonce as a success that changed nothing.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Due {
    /// The day of the week (gift_day), whose gift the day pays.
    pub day: u32,
    /// The player's date as a day number: what the day's order raises `vip_gift_day` to.
    pub today: i64,
    /// The day's gift is due: its order nonce, "vip:<date>".
    pub daily: Option<String>,
    /// The welcome is due: the end day its order raises `vip_welcome_end` to (nonce "vip-welcome:<end>").
    pub welcome: Option<i64>,
}

impl Due {
    /// Nothing is owed: no order to place.
    pub fn nothing(&self) -> bool {
        self.daily.is_none() && self.welcome.is_none()
    }
}

/// `today`: the player's date; `welcomed`: `vip_welcome_end` as read (0 never); `gifted`:
/// `vip_gift_day` as read (0 never); `held`: the platform says they hold `vip` (false: the dev pretend
/// alone); `ends`: its end day (Passes::ends). None for a malformed date: nothing is owed on a date
/// that cannot be read. A membership's end is never taken as before today (an end today in UTC can be
/// the player's tomorrow), so a welcome is never paid twice in a day.
pub fn due(today: &str, welcomed: i64, gifted: i64, held: bool, ends: Option<i64>) -> Option<Due> {
    let now = day_number(today)?;
    let end = if held { ends.unwrap_or(NO_END_DAY).max(now) } else { now + PRETEND_DAYS };
    Some(Due {
        day: gift_day(today)?,
        today: now,
        daily: (gifted < now).then(|| format!("vip:{today}")),
        welcome: (welcomed < now).then_some(end),
    })
}

/// VIP for this call: Some(true) if the platform says the player holds it, or on the dev channel
/// only, the dev menu's pretend; Some(false) if the platform says not; None (unknown) if the
/// platform could not be asked and there is no pretend.
pub fn decide(channel: &str, input: &Value, platform: Option<bool>) -> Option<bool> {
    let pretend = channel == "dev" && input["pretend_vip"] == true;
    match platform {
        Some(true) => Some(true),
        _ if pretend => Some(true),
        p => p,
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
