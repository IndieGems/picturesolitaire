//! THE PLAYER'S PROGRESS, owned by the server: the "progress" save slot, which
//! the player reads and only this function writes (game config, save_schemas:
//! access_self_write false). Pure: the platform calls are lib.rs's; this file
//! only says what one verified win changes, and where the record starts (from_saves).
//! tests/progress.rs runs it on this machine.
//!
//! The record (src/net/progress.ts reads it):
//!   { "v": 1,
//!     "campaign": { "next": 6, "won": 7 },   next: the first campaign board not won yet (from 1),
//!                                             at most boards + 1, "all done"; won: verified wins, replays too
//!     "challenge": { "ch01": 19 },          best (fewest) moves per cleared challenge board
//!     "daily": { "2026-10-24": { "moves": 17, "ms": 150000 } },  the first verified result per date
//!     "dailies": 23,                         dailies won, one a date, ever (the dates above are pruned);
//!                                             absent on a record from before 0.1.35: its dates count
//!     "restored": ["apple-orchard", ...],   pictures of boards won, in the order first restored
//!     "souvenir": { "s1": 13 },              best (fewest) moves per Souvenir won: its sticker on its
//!                                             trip's passport page (UI, 2026-10-28); absent until the first
//!     "counts": { "levels_finished": 7, ... },  the achievements' counters as last set (count.rs,
//!                                             written by lib.rs beside each win; derived, never read back)
//!     "event": { "halloween-2026-04": 21 },  best (fewest) moves per event level won (docs/vip.md, a
//!                                             VIP's): absent until the first
//!     "packed": { "halloween-2026": ["2026-10-15", ...] },  from when events were dailies (until 0.1.40):
//!                                             the days whose item was packed; kept, written by nothing now
//!     "owed": { "2026-10-03": { "coins": true, "pack": false } },  a VIP's past day decided and not yet
//!                                             confirmed paid (lib.rs, the archive): sent again, then cleared
//!                                             ("pack" is always false now: a daily packs nothing)
//!     "imported": { "from": "campaign" },   only on a record begun before 0.1.28 from an old device save; read by nothing
//!     "seen": ["<claim id>", ...] }          the last claims applied, so a resent claim changes nothing

use serde_json::{json, Value};

use crate::claim::{Lane, Win};

/// How many claim ids are remembered: far more than a device ever holds unanswered.
const SEEN: usize = 32;
/// How many dates of daily results are kept: the archive's longest reach (this
/// month and the two before, at most 92 days), with a little slack.
const DAILY_DAYS: usize = 100;

/// How many dailies the record has won, one a date, ever: its running total, or on a record from
/// before the total was kept, its dates (all of them, then: the game was newer than DAILY_DAYS).
pub fn dailies(doc: &Value) -> u64 {
    let dates = doc["daily"].as_object().map_or(0, |d| d.len() as u64);
    doc["dailies"].as_u64().unwrap_or(0).max(dates)
}

/// A record for a player with no progress yet.
pub fn empty() -> Value {
    json!({ "v": 1, "campaign": { "next": 1, "won": 0 }, "challenge": {}, "daily": {}, "restored": [], "seen": [] })
}

/// Make any stored value a well-formed record (unknown fields are kept).
pub fn normal(doc: Option<Value>) -> Value {
    let mut d = match doc {
        Some(Value::Object(m)) => Value::Object(m),
        _ => return empty(),
    };
    let e = empty();
    for key in ["campaign", "challenge", "daily", "restored", "seen"] {
        if d.get(key).map(|v| v.is_object() || v.is_array()) != Some(true) {
            d[key] = e[key].clone();
        }
    }
    if d["campaign"]["next"].as_u64().unwrap_or(0) < 1 {
        d["campaign"]["next"] = json!(1);
    }
    if !d["campaign"]["won"].is_u64() {
        d["campaign"]["won"] = json!(0);
    }
    d["v"] = json!(1);
    d
}

/// The record a win is applied to, from the player's saves (`save(key)` reads one slot), and
/// whether it is stored yet. Only the "progress" slot is read, the one only this function
/// writes; with none, the record starts empty. No slot the player can write ever becomes
/// progress (release report GSR-006): the game's own "campaign" slot is presentation state,
/// and the device's old progress in it was taken in by checkers before 0.1.28, never since.
pub fn from_saves<E>(mut save: impl FnMut(&str) -> Result<Option<Value>, E>) -> Result<(Value, bool), E> {
    Ok(match save(crate::PROGRESS)? {
        Some(doc) => (normal(Some(doc)), true),
        None => (empty(), false),
    })
}

/// Why a win cannot be applied yet.
#[derive(Debug, PartialEq, Eq)]
pub enum Wait {
    /// A campaign win at a position past the next one, or a Souvenir before its trip's stamp:
    /// an earlier win is still on its way.
    Order,
}

/// What one verified win changes. Ok(true) when the record changed, Ok(false)
/// when this claim was applied before (a resend). `n` is the campaign position
/// the claim was played at (checked by claim.rs against the campaign's order);
/// `boards` is how many boards the campaign has now.
///
/// The position stops at boards + 1 ("all done"): a game that goes round after
/// the last board sends positions past it, and those are replays, which never
/// move it. So when boards are added at the end, a player who had finished
/// plays the first new one, never one past it. A record from before the stop
/// (went round) is pulled back to it by any win.
pub fn apply(doc: &mut Value, win: &Win, claim_id: Option<&str>, n: Option<u64>, boards: u64) -> Result<bool, Wait> {
    if let Some(id) = claim_id {
        if doc["seen"].as_array().is_some_and(|s| s.iter().any(|x| x == id)) {
            return Ok(false);
        }
    }
    let end = if boards > 0 { boards + 1 } else { u64::MAX };
    if doc["campaign"]["next"].as_u64().is_some_and(|next| next > end) {
        doc["campaign"]["next"] = json!(end);
    }
    match win.lane {
        Lane::Campaign => {
            let next = doc["campaign"]["next"].as_u64().unwrap_or(1);
            // a position past the last board is a replay: it counts as "all done"; a board that
            // has left the campaign (an older build's, claim.rs gives it no position) moves nothing
            let n = n.map_or(0, |n| n.min(end));
            if n > next {
                return Err(Wait::Order);
            }
            doc["campaign"]["next"] = json!(next.max(n.saturating_add(1)).min(end));
            doc["campaign"]["won"] = json!(doc["campaign"]["won"].as_u64().unwrap_or(0) + 1);
        }
        Lane::Challenge => {
            let best = doc["challenge"][&win.board].as_u64();
            if best.map_or(true, |b| (win.moves as u64) < b) {
                doc["challenge"][&win.board] = json!(win.moves);
            }
        }
        Lane::Souvenir => {
            // it opens with its trip's stamp: the trip's last board won (the next board is past it)
            let next = doc["campaign"]["next"].as_u64().unwrap_or(1);
            if next <= win.after.unwrap_or(u64::MAX) {
                return Err(Wait::Order);
            }
            if !doc["souvenir"].is_object() {
                doc["souvenir"] = json!({});
            }
            let best = doc["souvenir"][&win.board].as_u64();
            if best.map_or(true, |b| (win.moves as u64) < b) {
                doc["souvenir"][&win.board] = json!(win.moves);
            }
        }
        Lane::Event => {
            // an event level (VIP only, released: lib.rs decided before this is applied)
            if !doc["event"].is_object() {
                doc["event"] = json!({});
            }
            let best = doc["event"][&win.board].as_u64();
            if best.map_or(true, |b| (win.moves as u64) < b) {
                doc["event"][&win.board] = json!(win.moves);
            }
        }
        Lane::Daily => {
            let date = win.date.clone().unwrap_or_default();
            if doc["daily"].get(&date).is_none() {
                doc["dailies"] = json!(dailies(doc) + 1);
                doc["daily"][&date] = json!({ "moves": win.moves, "ms": win.ms });
                // keep the most recent dates only (ISO dates sort as text)
                if let Some(days) = doc["daily"].as_object_mut() {
                    let mut dates: Vec<String> = days.keys().cloned().collect();
                    dates.sort();
                    let drop = dates.len().saturating_sub(DAILY_DAYS);
                    for d in &dates[..drop] {
                        days.remove(d);
                    }
                }
            }
        }
    }
    let restored = doc["restored"].as_array_mut().expect("normal() made it a list");
    for p in &win.pictures {
        if !restored.iter().any(|x| x == p.as_str()) {
            restored.push(json!(p));
        }
    }
    if let Some(id) = claim_id {
        let seen = doc["seen"].as_array_mut().expect("normal() made it a list");
        seen.push(json!(id));
        let over = seen.len().saturating_sub(SEEN);
        seen.drain(..over);
    }
    Ok(true)
}

/// Was this event day's item packed for the player (the record's "packed")?
pub fn packed(doc: &Value, event: &str, date: &str) -> bool {
    doc["packed"][event].as_array().is_some_and(|d| d.iter().any(|x| x == date))
}

/// Note an event day's item as packed.
pub fn mark_packed(doc: &mut Value, event: &str, date: &str) {
    if packed(doc, event, date) {
        return;
    }
    if !doc["packed"].is_object() {
        doc["packed"] = json!({});
    }
    if !doc["packed"][event].is_array() {
        doc["packed"][event] = json!([]);
    }
    doc["packed"][event].as_array_mut().expect("made a list").push(json!(date));
}

/// A past day's payment still owed: (its Coins, its item), as decided when its first win was applied.
pub fn owed(doc: &Value, date: &str) -> (bool, bool) {
    let o = &doc["owed"][date];
    (o["coins"] == true, o["pack"] == true)
}

/// Note a past day's payment as owed, until the platform confirms it (settle).
pub fn owe(doc: &mut Value, date: &str, coins: bool, pack: bool) {
    if !doc["owed"].is_object() {
        doc["owed"] = json!({});
    }
    doc["owed"][date] = json!({ "coins": coins, "pack": pack });
}

/// A past day's payment landed: owed no more.
pub fn settle(doc: &mut Value, date: &str) {
    if let Some(o) = doc["owed"].as_object_mut() {
        o.remove(date);
        if o.is_empty() {
            doc.as_object_mut().map(|m| m.remove("owed"));
        }
    }
}
