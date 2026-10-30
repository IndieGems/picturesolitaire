//! THE ACHIEVEMENTS' COUNTERS (the creator, 2026-10-30; docs/achievements.md). Pure: lib.rs sends
//! the order; tests/count.rs runs this on this machine.
//!
//! One counter progression per group (src/net/achievements.json; the game config's, written by
//! tools/server/make-config.mts), each achievement on one level of its track. Every verified win
//! sets every counter to what the player's progress record (progress.rs) says, with
//! `progression_max`: it never lowers a value, and a value it already holds changes nothing. So a
//! replay, a practice run (never claimed) or a resend counts nothing new, and a player who won
//! before achievements existed is counted on their next verified win (the backfill). The counts:
//!   levels     campaign levels finished, each once: the record's next position, less one;
//!   stamps     trips stamped: those whose last position is finished (trips.json's order, so the
//!              counter's level k is trip k's stamp: the campaign is played in order);
//!   souvenirs  Souvenirs finished, each once;
//!   hard       hard and super hard campaign levels won (their mark), each once;
//!   super      super hard ones;
//!   dailies    dailies won, one a date (the record's running total, progress::dailies).
//! Only the platform unlocks an achievement, on release, from a function's write; the receipt says
//! (`achievement_unlocked`), and the verdict passes on what it unlocked.

use std::sync::OnceLock;

use serde_json::{json, Value};

/// What a counter counts.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    Levels,
    Stamps,
    Souvenirs,
    Hard,
    Super,
    Dailies,
}

impl Kind {
    pub fn of(name: &str) -> Option<Kind> {
        Some(match name {
            "levels" => Kind::Levels,
            "stamps" => Kind::Stamps,
            "souvenirs" => Kind::Souvenirs,
            "hard" => Kind::Hard,
            "super" => Kind::Super,
            "dailies" => Kind::Dailies,
            _ => return None,
        })
    }
}

#[derive(Clone, Debug)]
pub struct Counter {
    pub slug: String,
    pub id: String,
    pub kind: Kind,
}

/// What the counts are made from: the counters, each campaign board's mark (play order), and each
/// trip's last campaign position.
#[derive(Clone, Debug)]
pub struct Plan {
    pub counters: Vec<Counter>,
    pub marks: Vec<Option<String>>,
    pub trip_ends: Vec<u64>,
}

/// A plan from its JSON (build.rs's counts.json). A counter counting what this checker cannot is
/// left out, so it is never written.
pub fn plan_of(v: &Value) -> Plan {
    let counters = v["counters"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|c| Some(Counter { slug: c["slug"].as_str()?.into(), id: c["id"].as_str()?.into(), kind: Kind::of(c["counts"].as_str()?)? }))
        .collect();
    let marks = v["marks"].as_array().into_iter().flatten().map(|m| m.as_str().map(str::to_string)).collect();
    let trip_ends = v["trips"].as_array().into_iter().flatten().filter_map(Value::as_u64).collect();
    Plan { counters, marks, trip_ends }
}

/// The plan compiled in.
pub fn plan() -> &'static Plan {
    static PLAN: OnceLock<Plan> = OnceLock::new();
    PLAN.get_or_init(|| plan_of(&serde_json::from_str(include_str!(concat!(env!("OUT_DIR"), "/counts.json"))).expect("counts.json")))
}

/// One counter's value for this record.
pub fn value(doc: &Value, plan: &Plan, kind: Kind) -> u64 {
    // the campaign positions finished: every one before the next (a position past the last board
    // is a replay, so at most the campaign's length)
    let done = (doc["campaign"]["next"].as_u64().unwrap_or(1).saturating_sub(1) as usize).min(plan.marks.len());
    let marked = |hard: &[&str]| plan.marks[..done].iter().filter(|m| m.as_deref().is_some_and(|m| hard.contains(&m))).count() as u64;
    match kind {
        Kind::Levels => done as u64,
        Kind::Stamps => plan.trip_ends.iter().filter(|&&to| to as usize <= done).count() as u64,
        Kind::Souvenirs => doc["souvenir"].as_object().map_or(0, |s| s.len() as u64),
        Kind::Hard => marked(&["hard", "super"]),
        Kind::Super => marked(&["super"]),
        Kind::Dailies => crate::progress::dailies(doc),
    }
}

/// Every counter's value for this record, in the plan's order.
pub fn values<'p>(doc: &Value, plan: &'p Plan) -> Vec<(&'p Counter, u64)> {
    plan.counters.iter().map(|c| (c, value(doc, plan, c.kind))).collect()
}

/// The counts as a verdict carries them: { <counter slug>: n }.
pub fn summary(doc: &Value, plan: &Plan) -> Value {
    Value::Object(values(doc, plan).into_iter().map(|(c, n)| (c.slug.clone(), json!(n))).collect())
}

/// The order's operations: each counter above 0 set to its value. progression_max never lowers
/// one, so a record that somehow reads lower than what was written before changes nothing.
pub fn operations(doc: &Value, plan: &Plan) -> Vec<Value> {
    values(doc, plan)
        .into_iter()
        .filter(|(_, n)| *n > 0)
        .map(|(c, n)| json!({ "type": "progression_max", "progression_definition_id": c.id, "value": n, "reason": format!("{} from the verified progress", c.slug) }))
        .collect()
}

/// The achievements an order's receipt (its `changes`) says it unlocked: [{ "id", "points" }].
pub fn unlocked(changes: &[Value]) -> Vec<Value> {
    changes
        .iter()
        .filter(|c| c["type"] == "achievement_unlocked" && c["outcome"] == "unlocked")
        .filter_map(|c| Some(json!({ "id": c["achievement_id"].as_str()?, "points": c["points"].as_i64().unwrap_or(0) })))
        .collect()
}

/// Every achievement receipt, for the log: "id outcome (reason)".
pub fn receipts(changes: &[Value]) -> Vec<String> {
    changes
        .iter()
        .filter(|c| c["type"] == "achievement_unlocked")
        .map(|c| format!("{} {}{}", c["achievement_id"].as_str().unwrap_or("?"), c["outcome"].as_str().unwrap_or("?"), c["reason"].as_str().map(|r| format!(" ({r})")).unwrap_or_default()))
        .collect()
}
