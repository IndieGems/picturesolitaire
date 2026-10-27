//! THE DAILY SUITCASE, the monthly event (docs/daily-suitcase.md; the creator, 2026-10-27).
//! Pure, like pay.rs: lib.rs makes the platform calls, this decides what they write.
//!
//! What says what, all of it the platform's:
//!   - each month's 10 items are game items (`item-YYYY-MM-NN`, declared by the config), so the
//!     quantity held is the item's count, and a copy beyond the first is a spare;
//!   - the Arcade's event is a monthly challenge ("suitcase", threshold 10) whose meter this
//!     keeps at the number of the month's items held (progression_max, in the same order);
//!   - the prize is paid once per month: the month's own mark (a progression, threshold 1) is
//!     moved to 1 in the same order as the month's table and the helpers, so it lands with them
//!     or not at all, and the mark is what says "paid". No flag of the game's own.
//!
//! The day's item is packed by the daily's first win of the player's own day, in that win's
//! one order (pay::order's extras); replays and late finishes pack nothing. A swap takes
//! `spares` copies beyond the first, of any items, biggest stacks first, for one missing item,
//! only in the month running now. The month of a date is the schedule's: the month whose days
//! hold it (Levels' src/content/levels/suitcases.json, compiled in by build.rs).
//!
//! Nonces: the pack rides the daily's ("daily:<date>"); a swap's is built from the counts it was
//! decided from, so two swaps decided from the same counts land once (the second is refused and
//! decided again from fresh counts), which keeps a race from taking a first copy; the prize's is
//! the month's.

use std::sync::OnceLock;

use serde_json::{json, Value};

use crate::pay::{self, Order};

fn data() -> &'static Value {
    static DATA: OnceLock<Value> = OnceLock::new();
    DATA.get_or_init(|| serde_json::from_str(include_str!(concat!(env!("OUT_DIR"), "/suitcases.json"))).expect("suitcases.json"))
}

/// One month's suitcase, as build.rs compiled it.
pub type Month = &'static Value;

/// The Arcade's monthly challenge: (id, slug).
pub fn event() -> (&'static str, &'static str) {
    (data()["event"]["id"].as_str().unwrap_or_default(), data()["event"]["slug"].as_str().unwrap_or_default())
}

/// What a full suitcase pays besides its table: { hint, undo, shuffle }.
pub fn prize_helpers() -> &'static Value {
    &data()["prize"]
}

/// Copies beyond the first that one swap takes.
pub fn spares() -> u32 {
    data()["spares"].as_u64().unwrap_or(3) as u32
}

fn stack() -> u32 {
    data()["stack"].as_u64().unwrap_or(31) as u32
}

pub fn months() -> &'static [Value] {
    data()["months"].as_array().map(|v| v.as_slice()).unwrap_or(&[])
}

pub fn month(name: &str) -> Option<Month> {
    months().iter().find(|m| m["month"] == name)
}

pub fn name(m: Month) -> &'static str {
    m["month"].as_str().unwrap_or_default()
}

pub fn items(m: Month) -> &'static [Value] {
    m["items"].as_array().map(|v| v.as_slice()).unwrap_or(&[])
}

/// An item's place in the month's suitcase (from 0).
pub fn slot(m: Month, item: &str) -> Option<usize> {
    items(m).iter().position(|i| i["id"] == item)
}

/// The item definition id (the config's) of a slot.
pub fn uuid(m: Month, slot: usize) -> &'static str {
    items(m)[slot]["uuid"].as_str().unwrap_or_default()
}

/// The month's prize mark: the progression moved to 1 when its prize is paid.
pub fn mark(m: Month) -> &'static str {
    m["mark"].as_str().unwrap_or_default()
}

/// The month's table (its slug), or None when it shows the built-in table (a stand-in).
pub fn table(m: Month) -> Option<&'static str> {
    m["table"]["slug"].as_str()
}

/// The month's last scheduled day, "YYYY-MM-DD".
pub fn ends(m: Month) -> &'static str {
    m["days"].as_object().and_then(|d| d.keys().max()).map(String::as_str).unwrap_or_default()
}

/// The month whose schedule holds this date (the player's own, from the platform), and that
/// day's item's slot.
pub fn day(date: &str) -> Option<(Month, usize)> {
    let m = months().iter().find(|m| m["days"].get(date).is_some())?;
    let at = slot(m, m["days"][date].as_str()?)?;
    Some((m, at))
}

/// The suitcase open on `today`: the month whose days hold it.
pub fn current(today: &str) -> Option<Month> {
    day(today).map(|(m, _)| m)
}

/// The shelf: the months whose every day is before `today`, newest first, at most `shelf`.
pub fn past(today: &str) -> Vec<Month> {
    let mut shelf: Vec<Month> = months().iter().filter(|m| !ends(m).is_empty() && ends(m) < today).collect();
    shelf.sort_by(|a, b| name(b).cmp(name(a)));
    shelf.truncate(data()["shelf"].as_u64().unwrap_or(12) as usize);
    shelf
}

/// Copies held of each of the month's items, by slot, from the player's item rows
/// ({ item_definition_id, quantity }, as the inventory read lists them).
pub fn counts(m: Month, rows: &[Value]) -> Vec<u32> {
    (0..items(m).len())
        .map(|i| {
            rows.iter()
                .filter(|r| r["item_definition_id"] == uuid(m, i))
                .map(|r| r["quantity"].as_u64().unwrap_or(0) as u32)
                .sum()
        })
        .collect()
}

/// How many of the month's items are held at all.
pub fn distinct(c: &[u32]) -> u32 {
    c.iter().filter(|n| **n > 0).count() as u32
}

/// Every item held.
pub fn complete(m: Month, c: &[u32]) -> bool {
    !items(m).is_empty() && distinct(c) as usize == items(m).len()
}

/// Copies beyond the first, of any items.
pub fn spare(c: &[u32]) -> u32 {
    c.iter().map(|n| n.saturating_sub(1)).sum()
}

fn give(uuid: &str, n: u32, reason: String) -> Value {
    json!({ "type": "item_grant", "item_definition_id": uuid, "quantity": n, "overflow": "clamp", "reason": reason })
}

/// A spare taken: "fail" if the copies are no longer there (counts that went stale), so the
/// whole order is refused rather than taking less.
fn take_out(uuid: &str, n: u32, reason: String) -> Value {
    json!({ "type": "item_remove", "item_definition_id": uuid, "quantity": n, "overflow": "fail", "reason": reason })
}

/// The event's meter: the month's items held.
fn meter(n: u32, reason: String) -> Value {
    json!({ "type": "progression_max", "progression_definition_id": event().0, "value": n, "reason": reason })
}

/// The day's item packed: what the daily's first-win order adds, from the counts read before it.
pub fn pack(m: Month, at: usize, before: &[u32], date: &str) -> Vec<Value> {
    let mut after = before.to_vec();
    after[at] = (after[at] + 1).min(stack());
    vec![give(uuid(m, at), 1, format!("daily {date}: the day's item")), meter(distinct(&after), format!("suitcase {}: an item packed", name(m)))]
}

/// The counts after an order: its receipt's item changes (quantity_after) over the counts
/// read before it.
pub fn after(m: Month, before: &[u32], changes: &[Value]) -> Vec<u32> {
    let mut c = before.to_vec();
    for ch in changes.iter().filter(|ch| ch["type"] == "item") {
        if let (Some(i), Some(q)) = ((0..c.len()).find(|i| ch["item_definition_id"] == uuid(m, *i)), ch["quantity_after"].as_u64()) {
            c[i] = q as u32;
        }
    }
    c
}

/// Did the receipt grant this slot's item?
pub fn granted(m: Month, at: usize, changes: &[Value]) -> bool {
    changes.iter().any(|ch| {
        ch["type"] == "item"
            && ch["item_definition_id"] == uuid(m, at)
            && ch["quantity_after"].as_i64().unwrap_or(0) > ch["quantity_before"].as_i64().unwrap_or(0)
    })
}

/// Which spares a swap takes: `n` copies beyond the first, one at a time from the biggest stack
/// (the earlier slot on a tie), as copies per slot. None when there are fewer than `n`.
pub fn take(c: &[u32], n: u32) -> Option<Vec<u32>> {
    let mut left = c.to_vec();
    let mut took = vec![0; c.len()];
    for _ in 0..n {
        let (i, most) = left.iter().copied().enumerate().max_by(|a, b| a.1.cmp(&b.1).then(b.0.cmp(&a.0)))?;
        if most < 2 {
            return None;
        }
        left[i] -= 1;
        took[i] += 1;
    }
    Some(took)
}

/// Why a swap is not made.
#[derive(Debug, PartialEq, Eq)]
pub enum No {
    /// The wanted item is held already.
    Has,
    /// Fewer than `spares` spares.
    Short,
}

/// A swap of `spares` spares for the item in slot `want`, as one order (the month's meter moves
/// with it). Err: why not.
pub fn swap(m: Month, c: &[u32], want: usize) -> Result<Order, No> {
    if c[want] > 0 {
        return Err(No::Has);
    }
    let took = take(c, spares()).ok_or(No::Short)?;
    let why = format!("suitcase {}: a swap", name(m));
    let mut ops: Vec<Value> = took.iter().enumerate().filter(|(_, n)| **n > 0).map(|(i, n)| take_out(uuid(m, i), *n, why.clone())).collect();
    ops.push(give(uuid(m, want), 1, why.clone()));
    let mut after: Vec<u32> = c.iter().zip(&took).map(|(n, t)| n - t).collect();
    after[want] = 1;
    ops.push(meter(distinct(&after), why));
    let seen = c.iter().map(u32::to_string).collect::<Vec<_>>().join(",");
    Ok(Order { nonce: format!("swap:{}:{}", name(m), crate::canon::fnv32(&seen)), operations: ops, gifts: Vec::new() })
}

/// A full suitcase's prize, once: the month's mark, its table (unless a stand-in shows the
/// built-in one) and the helpers, clamped at the cap.
pub fn prize(m: Month) -> Order {
    let why = format!("suitcase {}: full", name(m));
    let mut ops = vec![pay::mark(mark(m), why.clone())];
    if let Some(t) = m["table"]["uuid"].as_str() {
        ops.push(json!({ "type": "item_grant", "item_definition_id": t, "quantity": 1, "overflow": "clamp", "reason": why }));
    }
    for kind in pay::KINDS {
        let n = prize_helpers()[kind].as_u64().unwrap_or(0);
        if n > 0 {
            ops.push(pay::grant(kind, n, why.clone()));
        }
    }
    Order { nonce: format!("prize:{}", name(m)), operations: ops, gifts: vec!["suitcase"] }
}

/// The month as the game reads it (src/net/suitcase.ts adds the titles and the days left).
pub fn state(m: Month, c: &[u32], paid: bool) -> Value {
    let counts: serde_json::Map<String, Value> =
        items(m).iter().zip(c).filter(|(_, n)| **n > 0).map(|(i, n)| (i["id"].as_str().unwrap_or_default().to_string(), json!(n))).collect();
    json!({
        "month": name(m),
        "items": items(m).iter().map(|i| i["id"].clone()).collect::<Vec<_>>(),
        "counts": counts,
        "ends": ends(m),
        "complete": complete(m, c),
        "paid": paid,
        "prize": { "table": table(m), "helpers": prize_helpers() },
    })
}

/// The day of the month of a "YYYY-MM-DD" date.
pub fn day_of_month(date: &str) -> u32 {
    date.get(8..10).and_then(|d| d.parse().ok()).unwrap_or(0)
}

/// One analytics event about the player who called, keyed so a resend counts once.
pub fn record(player: &str, event: &str, key: &str, dimensions: Value, measures: Value) -> Value {
    json!({
        "name": event,
        "event_uid": crate::daily_run_id(player, &format!("{event}|{key}")),
        "offset_ms": 0,
        "player_id": player,
        "dimensions": dimensions,
        "measures": measures,
    })
}
