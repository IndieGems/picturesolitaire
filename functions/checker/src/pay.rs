//! WHAT A VERIFIED WIN PAYS, as one platform order (lib.rs sends it, after the record):
//!   - the board's progression to 1 on its first win, which pays its Coins (the
//!     config's `platform_grants`) and its table (`rewards_on_complete`), once ever;
//!   - its GIFT of helpers on that same first win (creator, 2026-10-27): a hard or
//!     super campaign board 1 Hint and 1 Undo, a trip's last board (the passport
//!     stamp) 1 of each instead;
//!   - the DAILY HELPER: the daily puzzle's first win of the player's own day pays one
//!     helper, by weekday (helper-ids.json `daily`, Saturday a Shuffle; the creator,
//!     2026-10-27, after Match3Mahjong), with the day's mark in the same order;
//!   - the KIT, 3 of each, once ever: at the end of board 1, or on the next win of a
//!     player already past it. Its own progression ("helpers_kit") is set in the
//!     same order, so it lands with the kit or not at all.
//!
//! The helpers are the game's own currencies (src/net/helper-ids.json), granted into
//! their "earned" bucket and clamped at the cap, by the function's own write: unlike a
//! `platform_grants` mapping, it lands for a guest too (gem-development#2039, found by
//! the mahjong-solitaire game). One order holds the mark and the gift together, so a
//! landed order has both and a failed one neither; its nonce (built from the board,
//! never from the claim) makes two claims racing for the same first win pay once.
//! The receipt says what LANDED of each helper, which the verdict passes on.

use std::sync::OnceLock;

use serde_json::{json, Value};

use crate::claim::Lane;

/// The helper kinds, in the order the verdict lists them.
pub const KINDS: [&str; 3] = ["hint", "undo", "shuffle"];

fn data() -> &'static Value {
    static PAY: OnceLock<Value> = OnceLock::new();
    PAY.get_or_init(|| serde_json::from_str(include_str!(concat!(env!("OUT_DIR"), "/pay.json"))).expect("pay.json"))
}

/// The most of one helper a player can hold (helper-ids.json `cap`).
pub fn cap() -> u32 {
    data()["helpers"]["cap"].as_u64().unwrap_or(10) as u32
}

/// The progression that pays for one campaign or challenge board: its id, as the config has it.
pub fn board_id(board: &str) -> Option<&'static str> {
    data()["boards"][crate::board_slug(board)].as_str()
}

/// The kit's own progression: (id, slug).
pub fn kit_mark() -> (&'static str, &'static str) {
    let k = &data()["helpers"]["kit"];
    (k["progression"].as_str().unwrap_or_default(), k["slug"].as_str().unwrap_or_default())
}

/// A gift: its name (as the verdict lists it) and how many of each helper it pays.
pub type Gift = (&'static str, Value);

/// The gift a board's first win gives: "hard", "stamp", or none (only campaign boards give one).
pub fn gift_of(lane: Lane, board: &str) -> Option<Gift> {
    if lane != Lane::Campaign {
        return None;
    }
    let name = data()["gifts"][board].as_str()?;
    Some((name, data()["helpers"][name].clone()))
}

/// The daily puzzle's gift for a date (the player's own, "YYYY-MM-DD"): one helper by weekday.
pub fn daily_gift(date: &str) -> Option<Gift> {
    let kind = data()["helpers"]["daily"][weekday(date)? as usize].as_str()?;
    let mut sizes = none();
    sizes[kind] = json!(1);
    Some(("daily", sizes))
}

/// The weekday of a "YYYY-MM-DD" date, Sunday 0 (days from the civil date, H. Hinnant's method).
pub fn weekday(date: &str) -> Option<u32> {
    let mut parts = date.split('-').map(|p| p.parse::<i64>().ok());
    let (y, m, d) = (parts.next()??, parts.next()??, parts.next()??);
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) {
        return None;
    }
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let days = era * 146_097 + doe - 719_468; // 1970-01-01 is day 0, a Thursday
    Some((days + 4).rem_euclid(7) as u32)
}

fn kit_sizes() -> &'static Value {
    &data()["helpers"]["kit"]["gift"]
}

fn currency(kind: &str) -> &'static str {
    data()["helpers"]["kinds"][kind]["currency"].as_str().unwrap_or_default()
}

fn mark(id: &str, reason: String) -> Value {
    json!({ "type": "progression_max", "progression_definition_id": id, "value": 1, "reason": reason })
}

fn grant(kind: &str, amount: u64, reason: String) -> Value {
    json!({ "type": "currency_grant", "currency_id": currency(kind), "amount": amount, "bucket": "earned", "overflow": "clamp", "reason": reason })
}

/// One order's operations and nonce, and the gifts it carries.
#[derive(Debug, Default, PartialEq)]
pub struct Order {
    pub nonce: String,
    pub operations: Vec<Value>,
    pub gifts: Vec<&'static str>,
}

/// The order for a verified win. `progression`: the id it completes (a board's, or the
/// daily's); `first`: its value read below 1, so this win completes it; `gift`: the board's
/// gift (gift_of, daily_gift), paid only with that first completion; `kit`: the kit is due.
/// None when there is nothing to write.
pub fn order(progression: &str, what: &str, nonce: &str, first: bool, gift: Option<Gift>, kit: bool) -> Option<Order> {
    let mut o = Order::default();
    let mut paying: Vec<(&'static str, Value)> = Vec::new();
    if first {
        o.operations.push(mark(progression, format!("{what} verified win")));
        if let Some(g) = gift {
            paying.push(g);
        }
    }
    if kit {
        paying.push(("kit", kit_sizes().clone()));
        o.operations.push(mark(kit_mark().0, "the helper kit".into()));
    }
    for (name, sizes) in &paying {
        o.gifts.push(name);
        for kind in KINDS {
            let n = sizes[kind].as_u64().unwrap_or(0);
            if n > 0 {
                o.operations.push(grant(kind, n, format!("{what}: {name} gift")));
            }
        }
    }
    if o.operations.is_empty() {
        return None;
    }
    // a first win's nonce is the board's own (two claims of it racing pay once); the kit alone, "kit"
    o.nonce = if first { nonce.to_string() } else { "kit".into() };
    Some(o)
}

/// What landed of each helper, from an order's receipt (its `changes`): { hint, undo, shuffle }.
pub fn landed(changes: &[Value]) -> Value {
    let mut out = serde_json::Map::new();
    for kind in KINDS {
        let id = currency(kind);
        let got: i64 = changes
            .iter()
            .filter(|c| c["type"] == "currency" && c["currency_id"] == id)
            .map(|c| c["delta"].as_i64().or_else(|| Some(c["balance_after"].as_i64()? - c["balance_before"].as_i64()?)).unwrap_or(0))
            .filter(|d| *d > 0)
            .sum();
        out.insert(kind.into(), json!(got));
    }
    Value::Object(out)
}

/// Nothing landed: { hint: 0, undo: 0, shuffle: 0 }.
pub fn none() -> Value {
    landed(&[])
}
