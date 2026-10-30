//! THE EVENT, two weeks long and for Gem Arcade VIP members only (docs/vip.md; the Daily Suitcase,
//! docs/daily-suitcase.md, reshaped by the creator, 2026-10-30). Pure, like pay.rs: lib.rs makes the
//! platform calls, this decides what they write.
//!
//! What says what, all of it the platform's:
//!   - each event's items (about 7) are game items (declared by the config), so the quantity held is
//!     the item's count, and a copy beyond the first is a spare;
//!   - the prize is paid once per event: the event's own mark (a progression, threshold 1) is moved
//!     to 1 in the same order as the event's table and the helpers, so it lands with them or not at
//!     all, and the mark is what says "paid". No flag of the game's own.
//!
//! An event is 14 days of dailies (Levels' src/content/levels/events.json, compiled in by build.rs),
//! each day's board carrying one of its items, each item twice. The day's item is packed by a VIP's
//! first win of that day's daily: today's in the daily's one order (pay::order's extras), a past
//! day's in the order of that past win (lib.rs, the archive), once a date (the record says,
//! progress::packed). A swap takes `spares` copies beyond the first, of any items, biggest stacks
//! first, for one missing item, in an event that has begun (the one running or a past one).
//!
//! THE SWITCH (src/net/suitcase-ids.json `on`, compiled in by build.rs): on means on FOR VIPS
//! (vip.rs). For anyone else, and for everyone while it is off, the three ways the event pays are
//! shut here, whatever the player holds: a daily packs nothing (to_pack, daily_extras), a swap is
//! refused (swap: No::Off), and no prize is paid (prize: None). pack, swap_order and prize_order are
//! the mechanics behind those gates.
//!
//! Nonces: today's pack rides the daily's ("daily:<date>"), a past day's its own ("past:<date>"); a
//! swap's is built from the counts it was decided from, so two swaps decided from the same counts
//! land once (the second is refused and decided again from fresh counts), which keeps a race from
//! taking a first copy; the prize's is the event's.

use std::sync::OnceLock;

use serde_json::{json, Value};

use crate::pay::{self, Order};

fn data() -> &'static Value {
    static DATA: OnceLock<Value> = OnceLock::new();
    DATA.get_or_init(|| serde_json::from_str(include_str!(concat!(env!("OUT_DIR"), "/suitcases.json"))).expect("suitcases.json"))
}

/// The event's switch: true only when src/net/suitcase-ids.json says `"on": true`. On means on for VIPs.
pub fn on() -> bool {
    data()["on"].as_bool() == Some(true)
}

/// Is the event open to this player: switched on, and they are VIP?
pub fn open(vip: bool) -> bool {
    on() && vip
}

/// One event, as build.rs compiled it.
pub type Event = &'static Value;

/// What a full suitcase pays besides its table: { hint, undo, shuffle }.
pub fn prize_helpers() -> &'static Value {
    &data()["prize"]
}

/// Copies beyond the first that one swap takes.
pub fn spares() -> u32 {
    data()["spares"].as_u64().unwrap_or(2) as u32
}

/// Every event, in start order.
pub fn events() -> &'static [Value] {
    data()["events"].as_array().map(|v| v.as_slice()).unwrap_or(&[])
}

pub fn event(id: &str) -> Option<Event> {
    events().iter().find(|e| e["id"] == id)
}

/// The event's id ("halloween-2026"; an old month's is the month).
pub fn name(e: Event) -> &'static str {
    e["id"].as_str().unwrap_or_default()
}

pub fn items(e: Event) -> &'static [Value] {
    e["items"].as_array().map(|v| v.as_slice()).unwrap_or(&[])
}

/// An item's place in the event's suitcase (from 0).
pub fn slot(e: Event, item: &str) -> Option<usize> {
    items(e).iter().position(|i| i["id"] == item)
}

/// The item definition id (the config's) of a slot.
pub fn uuid(e: Event, slot: usize) -> &'static str {
    items(e)[slot]["uuid"].as_str().unwrap_or_default()
}

/// The event's prize mark: the progression moved to 1 when its prize is paid.
pub fn mark(e: Event) -> &'static str {
    e["mark"].as_str().unwrap_or_default()
}

/// The event's table (its slug), or None when it shows the built-in table (a stand-in).
pub fn table(e: Event) -> Option<&'static str> {
    e["table"]["slug"].as_str()
}

/// The event's first and last days, "YYYY-MM-DD".
pub fn starts(e: Event) -> &'static str {
    e["start"].as_str().unwrap_or_default()
}

pub fn ends(e: Event) -> &'static str {
    e["end"].as_str().unwrap_or_default()
}

/// The event whose schedule holds this date (the player's own, from the platform), and that
/// day's item's slot.
pub fn day(date: &str) -> Option<(Event, usize)> {
    let e = events().iter().find(|e| e["days"].get(date).is_some())?;
    let at = slot(e, e["days"][date].as_str()?)?;
    Some((e, at))
}

/// The event running on `today`.
pub fn current(today: &str) -> Option<Event> {
    events().iter().find(|e| starts(e) <= today && today <= ends(e))
}

/// Has the event begun by `today` (running, or past)? Only those can be swapped in.
pub fn begun(e: Event, today: &str) -> bool {
    !starts(e).is_empty() && starts(e) <= today
}

/// The day's item a first win on `date` packs (its event and slot): None unless the event is open
/// to this player, or when no event holds the date.
pub fn to_pack(date: &str, vip: bool) -> Option<(Event, usize)> {
    if !open(vip) {
        return None;
    }
    day(date)
}

/// The event's part of today's daily's first win on `date`: the operations that win's one order
/// adds, and the counts they were decided from (to read its receipt by). Nothing unless the event is
/// open to this player and an event holds the date, and then `held` (the player's item rows) is
/// never read.
pub fn daily_extras<E>(date: &str, vip: bool, held: impl FnOnce() -> Result<Vec<Value>, E>) -> Result<(Vec<Value>, Option<Vec<u32>>), E> {
    let Some((e, at)) = to_pack(date, vip) else { return Ok((Vec::new(), None)) };
    let c = counts(e, &held()?);
    Ok((pack(e, at, date), Some(c)))
}

/// The archive of events: those whose every day is before `today`, newest first, at most `shelf`.
pub fn past(today: &str) -> Vec<Event> {
    let mut shelf: Vec<Event> = events().iter().filter(|e| !ends(e).is_empty() && ends(e) < today).collect();
    shelf.sort_by(|a, b| starts(b).cmp(starts(a)));
    shelf.truncate(data()["shelf"].as_u64().unwrap_or(12) as usize);
    shelf
}

/// Copies held of each of the event's items, by slot, from the player's item rows
/// ({ item_definition_id, quantity }, as the inventory read lists them).
pub fn counts(e: Event, rows: &[Value]) -> Vec<u32> {
    (0..items(e).len())
        .map(|i| {
            rows.iter()
                .filter(|r| r["item_definition_id"] == uuid(e, i))
                .map(|r| r["quantity"].as_u64().unwrap_or(0) as u32)
                .sum()
        })
        .collect()
}

/// How many of the event's items are held at all.
pub fn distinct(c: &[u32]) -> u32 {
    c.iter().filter(|n| **n > 0).count() as u32
}

/// Every item held.
pub fn complete(e: Event, c: &[u32]) -> bool {
    !items(e).is_empty() && distinct(c) as usize == items(e).len()
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

/// The day's item packed: what a first win's order adds. The mechanics: the checker reaches it
/// only through daily_extras and the archive, which the switch and VIP gate.
pub fn pack(e: Event, at: usize, date: &str) -> Vec<Value> {
    vec![give(uuid(e, at), 1, format!("daily {date}: the day's item, {}", name(e)))]
}

/// The counts after an order: its receipt's item changes (quantity_after) over the counts
/// read before it.
pub fn after(e: Event, before: &[u32], changes: &[Value]) -> Vec<u32> {
    let mut c = before.to_vec();
    for ch in changes.iter().filter(|ch| ch["type"] == "item") {
        if let (Some(i), Some(q)) = ((0..c.len()).find(|i| ch["item_definition_id"] == uuid(e, *i)), ch["quantity_after"].as_u64()) {
            c[i] = q as u32;
        }
    }
    c
}

/// Did the receipt grant this slot's item?
pub fn granted(e: Event, at: usize, changes: &[Value]) -> bool {
    changes.iter().any(|ch| {
        ch["type"] == "item"
            && ch["item_definition_id"] == uuid(e, at)
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
    /// The event is not open to this player: nothing is swapped.
    Off,
}

/// A swap of `spares` spares for the item in slot `want`, as one order. Err: why not, No::Off
/// unless the event is open to this player.
pub fn swap(e: Event, c: &[u32], want: usize, vip: bool) -> Result<Order, No> {
    if !open(vip) {
        return Err(No::Off);
    }
    swap_order(e, c, want)
}

/// The swap's mechanics, behind swap's switch.
pub fn swap_order(e: Event, c: &[u32], want: usize) -> Result<Order, No> {
    if c[want] > 0 {
        return Err(No::Has);
    }
    let took = take(c, spares()).ok_or(No::Short)?;
    let why = format!("suitcase {}: a swap", name(e));
    let mut ops: Vec<Value> = took.iter().enumerate().filter(|(_, n)| **n > 0).map(|(i, n)| take_out(uuid(e, i), *n, why.clone())).collect();
    ops.push(give(uuid(e, want), 1, why));
    let seen = c.iter().map(u32::to_string).collect::<Vec<_>>().join(",");
    Ok(Order { nonce: format!("swap:{}:{}", name(e), crate::canon::fnv32(&seen)), operations: ops, gifts: Vec::new() })
}

/// A full suitcase's prize, once: the event's mark, its table (unless a stand-in shows the built-in
/// one) and the helpers, clamped at the cap. None unless the event is open to this player, however
/// full the suitcase they hold.
pub fn prize(e: Event, vip: bool) -> Option<Order> {
    if !open(vip) {
        return None;
    }
    Some(prize_order(e))
}

/// The prize's mechanics, behind prize's switch.
pub fn prize_order(e: Event) -> Order {
    let why = format!("suitcase {}: full", name(e));
    let mut ops = vec![pay::mark(mark(e), why.clone())];
    if let Some(t) = e["table"]["uuid"].as_str() {
        ops.push(json!({ "type": "item_grant", "item_definition_id": t, "quantity": 1, "overflow": "clamp", "reason": why }));
    }
    for kind in pay::KINDS {
        let n = prize_helpers()[kind].as_u64().unwrap_or(0);
        if n > 0 {
            ops.push(pay::grant(kind, n, why.clone()));
        }
    }
    Order { nonce: format!("prize:{}", name(e)), operations: ops, gifts: vec!["suitcase"] }
}

/// The event as the game reads it (src/net/suitcase.ts adds the titles and the days left). `month`
/// repeats the id for a build from before the events.
pub fn state(e: Event, c: &[u32], paid: bool) -> Value {
    let counts: serde_json::Map<String, Value> =
        items(e).iter().zip(c).filter(|(_, n)| **n > 0).map(|(i, n)| (i["id"].as_str().unwrap_or_default().to_string(), json!(n))).collect();
    json!({
        "id": name(e),
        "month": name(e),
        "theme": e["theme"],
        "start": starts(e),
        "ends": ends(e),
        "items": items(e).iter().map(|i| i["id"].clone()).collect::<Vec<_>>(),
        "days": e["days"],
        "counts": counts,
        "complete": complete(e, c),
        "paid": paid,
        "prize": { "table": table(e), "helpers": prize_helpers() },
    })
}

/// The day of the event (from 1) of a "YYYY-MM-DD" date, or 0 outside it.
pub fn day_of_event(e: Event, date: &str) -> u32 {
    let mut days: Vec<&String> = e["days"].as_object().map(|d| d.keys().collect()).unwrap_or_default();
    days.sort();
    days.iter().position(|d| d.as_str() == date).map_or(0, |i| i as u32 + 1)
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
