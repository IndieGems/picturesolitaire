//! THE EVENTS, VIP content packs (docs/vip.md, the creator, 2026-10-30): each event is 30 levels of
//! its own (Levels' src/content/levels/events.json and event-levels.json, compiled in by build.rs),
//! with 10 items, each hidden in exactly one of its levels. Pure, like pay.rs: lib.rs makes the
//! platform calls, this decides what they write.
//!
//! What says what, all of it the platform's:
//!   - each item is a game item (declared by the config): held or not is its count;
//!   - an item is packed by a VIP's first verified win of its level, in that win's one order with the
//!     level's Coins (the level's own progression says "first"), so it lands with them or not at all;
//!   - each item found pays its Coins with it: one more on the event-items-found progression
//!     (src/net/suitcase-ids.json `finds`, on_add, 50 a unit: the creator, 2026-10-30, 500 an event
//!     paid as the items land, since the platform pays at most 100 in one grant), in the same order;
//!   - all of an event's items held pays its prize once: the event's own mark (a progression,
//!     threshold 1, which is also its Passport stamp) moved to 1 in the same order as the event's
//!     table, and the mark is what says "paid". No helpers (VIPs have them free), no flag of the
//!     game's own.
//! An event is open from its release date (the player's own date, the platform's) on, for good: no
//! deadline, no window. No spares and no swap. The dailies carry no items.
//!
//! THE SWITCH (src/net/suitcase-ids.json `on`, compiled in by build.rs): on means on FOR VIPS
//! (vip.rs). For anyone else, and for everyone while it is off, an event level is refused
//! (lib.rs: "vip_only"), nothing is packed and no prize is paid (prize: None), whatever is held.
//!
//! Nonces: a level's pack rides that level's first win's ("first:event:<level>"); the prize's is the
//! event's ("prize:<event>").

use std::sync::OnceLock;

use serde_json::{json, Value};

use crate::pay::{self, Order};

fn data() -> &'static Value {
    static DATA: OnceLock<Value> = OnceLock::new();
    DATA.get_or_init(|| serde_json::from_str(include_str!(concat!(env!("OUT_DIR"), "/suitcases.json"))).expect("suitcases.json"))
}

/// The events' switch: true only when src/net/suitcase-ids.json says `"on": true`. On means on for VIPs.
pub fn on() -> bool {
    data()["on"].as_bool() == Some(true)
}

/// Are the events open to this player: switched on, and they are VIP?
pub fn open(vip: bool) -> bool {
    on() && vip
}

/// One event, as build.rs compiled it.
pub type Event = &'static Value;

/// The event-items-found progression's id (src/net/suitcase-ids.json `finds`).
pub fn finds_id() -> &'static str {
    data()["finds"]["id"].as_str().unwrap_or_default()
}

/// The Coins one item found pays (its unit's worth on the finds progression).
pub fn find_coins() -> u64 {
    data()["finds"]["coins"].as_u64().unwrap_or(0)
}

/// The Coins a receipt's finds grants landed (`granted`, after any trim).
pub fn coins_found(changes: &[Value]) -> i64 {
    changes
        .iter()
        .filter(|ch| ch["type"] == "platform_grant" && ch["progression_definition_id"] == finds_id())
        .map(|ch| ch["granted"].as_i64().unwrap_or(0))
        .sum()
}

/// Every event, in release order.
pub fn events() -> &'static [Value] {
    data()["events"].as_array().map(|v| v.as_slice()).unwrap_or(&[])
}

pub fn event(id: &str) -> Option<Event> {
    events().iter().find(|e| e["id"] == id)
}

/// The event's id ("halloween-2026").
pub fn name(e: Event) -> &'static str {
    e["id"].as_str().unwrap_or_default()
}

/// Its items ({ id, uuid, level }), in slot order.
pub fn items(e: Event) -> &'static [Value] {
    e["items"].as_array().map(|v| v.as_slice()).unwrap_or(&[])
}

/// Its levels' ids, in play order.
pub fn levels(e: Event) -> &'static [Value] {
    e["levels"].as_array().map(|v| v.as_slice()).unwrap_or(&[])
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

/// The day the event became playable, "YYYY-MM-DD".
pub fn release(e: Event) -> &'static str {
    e["release"].as_str().unwrap_or_default()
}

/// Is the event playable on the player's `today`: released, ever since? (Open to VIPs only: `open`.)
pub fn released(e: Event, today: &str) -> bool {
    !release(e).is_empty() && release(e) <= today
}

/// The event a level is one of.
pub fn of_level(level: &str) -> Option<Event> {
    events().iter().find(|e| levels(e).iter().any(|l| l == level))
}

/// The level's place in its event (from 1), or 0.
pub fn position(e: Event, level: &str) -> u32 {
    levels(e).iter().position(|l| l == level).map_or(0, |i| i as u32 + 1)
}

/// The slot of the item hidden in this level of the event, if it holds one.
pub fn item_at(e: Event, level: &str) -> Option<usize> {
    items(e).iter().position(|i| i["level"] == level)
}

/// The events the player sees on `today`: every one released, newest first.
pub fn shown(today: &str) -> Vec<Event> {
    let mut list: Vec<Event> = events().iter().filter(|e| released(e, today)).collect();
    list.sort_by(|a, b| release(b).cmp(release(a)));
    list
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

/// How many of the event's items are held.
pub fn found(c: &[u32]) -> u32 {
    c.iter().filter(|n| **n > 0).count() as u32
}

/// Every item held.
pub fn complete(e: Event, c: &[u32]) -> bool {
    !items(e).is_empty() && found(c) as usize == items(e).len()
}

/// The level's item packed, and its Coins: what the order that finds it adds. Its gates (VIP,
/// released, the switch) are lib.rs's, before any of this is asked.
pub fn pack(e: Event, at: usize, level: &str) -> Vec<Value> {
    let why = format!("event {} {level}: its item", name(e));
    let mut ops = vec![json!({
        "type": "item_grant",
        "item_definition_id": uuid(e, at),
        "quantity": 1,
        "overflow": "clamp",
        "reason": why,
    })];
    if !finds_id().is_empty() && find_coins() > 0 {
        ops.push(json!({ "type": "progression_add", "progression_definition_id": finds_id(), "amount": 1, "reason": why }));
    }
    ops
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

/// A full suitcase's prize, once: the event's mark (its Passport stamp) and its table (unless a
/// stand-in shows the built-in one). None unless the events are open to this player, however full
/// the suitcase they hold.
pub fn prize(e: Event, vip: bool) -> Option<Order> {
    if !open(vip) {
        return None;
    }
    Some(prize_order(e))
}

/// The prize's mechanics, behind prize's switch.
pub fn prize_order(e: Event) -> Order {
    let why = format!("event {}: every item found", name(e));
    let mut ops = vec![pay::mark(mark(e), why.clone())];
    if let Some(t) = e["table"]["uuid"].as_str() {
        ops.push(json!({ "type": "item_grant", "item_definition_id": t, "quantity": 1, "overflow": "clamp", "reason": why }));
    }
    Order { nonce: format!("prize:{}", name(e)), operations: ops, gifts: vec!["suitcase"] }
}

/// The event as the game reads it (src/net/suitcase.ts adds the titles): its levels in play order,
/// its items with the level each is hidden in and whether it is found, and the prize (its table, and
/// the Coins its items pay in all, as they are found; `paid` is its stamp).
pub fn state(e: Event, c: &[u32], paid: bool) -> Value {
    let list: Vec<Value> = items(e)
        .iter()
        .zip(c)
        .map(|(i, n)| json!({ "id": i["id"], "level": i["level"], "found": *n > 0 }))
        .collect();
    json!({
        "id": name(e),
        "theme": e["theme"],
        "release": release(e),
        "levels": levels(e),
        "items": list,
        "found": found(c),
        "complete": complete(e, c),
        "paid": paid,
        "prize": { "table": table(e), "coins": find_coins() * items(e).len() as u64 },
    })
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
