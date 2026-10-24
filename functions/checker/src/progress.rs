//! THE PLAYER'S PROGRESS, owned by the server: the "progress" save slot, which
//! the player reads and only this function writes (game config, save_schemas:
//! access_self_write false). Pure: the platform calls are lib.rs's; this file
//! only says what one verified win changes, and how an old device save is
//! taken in once. tests/progress.rs runs it on this machine.
//!
//! The record (src/net/progress.ts reads it):
//!   { "v": 1,
//!     "campaign": { "next": 6, "won": 7 },   next: the campaign position to play (from 1; past
//!                                             the last board it goes round); won: verified wins, replays too
//!     "challenge": { "ch01": 19 },          best (fewest) moves per cleared challenge board
//!     "daily": { "2026-10-24": { "moves": 17, "ms": 150000 } },  the first verified result per date
//!     "restored": ["apple-orchard", ...],   pictures of boards won, in the order first restored
//!     "imported": { "from": "campaign" },   set once, when an old device save was taken in
//!     "seen": ["<claim id>", ...] }          the last claims applied, so a resent claim changes nothing

use serde_json::{json, Map, Value};

use crate::claim::{Lane, Win};

/// How many claim ids are remembered: far more than a device ever holds unanswered.
const SEEN: usize = 32;
/// How many dates of daily results are kept: the archive's longest reach (this
/// month and the two before, at most 92 days), with a little slack.
const DAILY_DAYS: usize = 100;

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

/// Take in an old device save (the UI's "campaign" slot, written by the game
/// before progress moved to the server): { level, won, restored, best }.
/// Its word is the device's, accepted ONCE so nobody loses progress; from then
/// on only verified wins move the record.
pub fn import_legacy(old: &Value) -> Value {
    let mut d = empty();
    let level = old["level"].as_u64().filter(|l| *l >= 1 && *l < 100_000).unwrap_or(1);
    d["campaign"]["next"] = json!(level);
    d["campaign"]["won"] = json!(old["won"].as_u64().unwrap_or(0).min(1_000_000));
    let restored: Vec<Value> = old["restored"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|p| p.as_str().filter(|s| !s.is_empty() && s.len() <= 64).map(|s| json!(s)))
        .take(1000)
        .collect();
    d["restored"] = Value::Array(dedupe(restored));
    let mut best = Map::new();
    for (id, moves) in old["best"].as_object().into_iter().flatten().take(1000) {
        if let Some(m) = moves.as_u64().filter(|m| *m >= 1 && *m < 100_000) {
            if id.len() <= 32 {
                best.insert(id.clone(), json!(m));
            }
        }
    }
    d["challenge"] = Value::Object(best);
    d["imported"] = json!({ "from": "campaign" });
    d
}

fn dedupe(list: Vec<Value>) -> Vec<Value> {
    let mut out: Vec<Value> = Vec::new();
    for v in list {
        if !out.contains(&v) {
            out.push(v);
        }
    }
    out
}

/// Why a win cannot be applied yet.
#[derive(Debug, PartialEq, Eq)]
pub enum Wait {
    /// A campaign win at a position past the next one: an earlier win is still on its way.
    Order,
}

/// What one verified win changes. Ok(true) when the record changed, Ok(false)
/// when this claim was applied before (a resend). `n` is the campaign position
/// the claim was played at (checked by claim.rs against the campaign's order).
pub fn apply(doc: &mut Value, win: &Win, claim_id: Option<&str>, n: Option<u64>) -> Result<bool, Wait> {
    if let Some(id) = claim_id {
        if doc["seen"].as_array().is_some_and(|s| s.iter().any(|x| x == id)) {
            return Ok(false);
        }
    }
    match win.lane {
        Lane::Campaign => {
            let next = doc["campaign"]["next"].as_u64().unwrap_or(1);
            let n = n.unwrap_or(next);
            if n > next {
                return Err(Wait::Order);
            }
            doc["campaign"]["next"] = json!(next.max(n + 1));
            doc["campaign"]["won"] = json!(doc["campaign"]["won"].as_u64().unwrap_or(0) + 1);
        }
        Lane::Challenge => {
            let best = doc["challenge"][&win.board].as_u64();
            if best.map_or(true, |b| (win.moves as u64) < b) {
                doc["challenge"][&win.board] = json!(win.moves);
            }
        }
        Lane::Daily => {
            let date = win.date.clone().unwrap_or_default();
            if doc["daily"].get(&date).is_none() {
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
