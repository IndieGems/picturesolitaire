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
//!   - VIP's GIFTS are not a win's (the creator, 2026-11-01, docs/vip.md): their own call, their own
//!     orders (vip_order), sizes from helper-ids.json `vip`.
//!   - THE VIP EXTRA (the creator, 2026-11-10, docs/vip.md): +50% on every Coin payout and double on
//!     every helper reward, for a VIP, computed in ONE place (below, from src/net/vip-extra.json) and
//!     paid in an order of its own right after its reward (vip_extra_order, "vipx:<key>").
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

pub(crate) fn mark(id: &str, reason: String) -> Value {
    json!({ "type": "progression_max", "progression_definition_id": id, "value": 1, "reason": reason })
}

pub(crate) fn grant(kind: &str, amount: u64, reason: String) -> Value {
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
/// gift (gift_of, daily_gift), paid only with that first completion; `extra`: more operations
/// that ride only with that first completion (the daily's: the day's suitcase item,
/// suitcase.rs); `kit`: the kit is due. None when there is nothing to write.
pub fn order(progression: &str, what: &str, nonce: &str, first: bool, gift: Option<Gift>, extra: Vec<Value>, kit: bool) -> Option<Order> {
    let mut o = Order::default();
    let mut paying: Vec<(&'static str, Value)> = Vec::new();
    if first {
        o.operations.push(mark(progression, format!("{what} verified win")));
        o.operations.extend(extra);
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

/// VIP's welcome mark (helper-ids.json `vip.welcomeEnd`): (id, slug). Its value is the end day of
/// the membership last welcomed (vip.rs).
pub fn vip_welcome_mark() -> (&'static str, &'static str) {
    let w = &data()["helpers"]["vip"]["welcomeEnd"];
    (w["progression"].as_str().unwrap_or_default(), w["slug"].as_str().unwrap_or_default())
}

/// VIP's day mark (helper-ids.json `vip.dayMark`): (id, slug). Its value is the day number last given
/// its gift (vip.rs).
pub fn vip_day_mark() -> (&'static str, &'static str) {
    let d = &data()["helpers"]["vip"]["dayMark"];
    (d["progression"].as_str().unwrap_or_default(), d["slug"].as_str().unwrap_or_default())
}

/// VIP's welcome gift, once a membership: { hint, undo, shuffle }.
pub fn vip_welcome() -> Value {
    sizes(&data()["helpers"]["vip"]["welcome"])
}

/// VIP's gift on day `day` of the player's week (1 Monday .. 7 Sunday, vip::gift_day).
pub fn vip_daily(day: u32) -> Value {
    sizes(&data()["helpers"]["vip"]["daily"][day.saturating_sub(1) as usize])
}

/// Every kind present, 0 where the data has none.
fn sizes(v: &Value) -> Value {
    let mut out = none();
    for kind in KINDS {
        out[kind] = json!(v[kind].as_u64().unwrap_or(0));
    }
    out
}

/// One VIP gift's order (gift.rs sends it; vip.rs decides when one is due), with its MARK raised in
/// the same order, so the gift and its mark land together or not at all: the day's, nonce
/// `vip:<date>` and the day mark to that day's number; the welcome's, nonce `vip-welcome:<end day>`
/// and the welcome mark to that end day. A fresh order always moves its mark, so its receipt is never
/// empty: an empty one is the platform answering a reused nonce. Each grant into "earned", clamped at
/// the cap.
pub fn vip_order(nonce: String, sizes: &Value, mark: (&str, i64), what: &str) -> Order {
    let mut o = Order { nonce, ..Order::default() };
    o.operations.push(json!({ "type": "progression_max", "progression_definition_id": mark.0, "value": mark.1, "reason": format!("vip {what} gift") }));
    for kind in KINDS {
        let n = sizes[kind].as_u64().unwrap_or(0);
        if n > 0 {
            o.operations.push(grant(kind, n, format!("vip {what} gift")));
        }
    }
    o
}

/// Each helper's balance after an order, from its receipt: only the kinds the receipt lists.
pub fn after(changes: &[Value]) -> Value {
    let mut out = serde_json::Map::new();
    for kind in KINDS {
        let id = currency(kind);
        if let Some(n) = changes.iter().filter(|c| c["type"] == "currency" && c["currency_id"] == id).filter_map(|c| c["balance_after"].as_i64()).last() {
            out.insert(kind.into(), json!(n));
        }
    }
    Value::Object(out)
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

// ------------------------------------------------------------------ THE VIP EXTRA

// THE VIP EXTRA (the creator, 2026-11-10; docs/vip.md): +50% on every Coin payout and double on every
// helper reward, for a VIP, paid by this checker beside the base. THE ONE PLACE it is computed, from
// src/net/vip-extra.json (the rule's one copy; src/net/vip.ts shows the same figures as previews).
// A coming SDK may have the Arcade tell the game its exact VIP extra (the creator): that figure
// replaces the rule HERE (vip_extra_coins, vip_extra_helpers), and `gamePays` goes false, so a VIP
// is never paid twice (vip_game_pays: lib.rs then places nothing and reads no pass for it).

fn vip_rule() -> &'static Value {
    &data()["vipExtra"]
}

/// The game pays the VIP extra itself (vip-extra.json `gamePays`). False: the Arcade pays it, and
/// this checker pays none.
pub fn vip_game_pays() -> bool {
    vip_rule()["gamePays"].as_bool() == Some(true)
}

/// THE SEAM, Coins: the VIP extra on one Coin payout of `base` (what landed of it): ceil(base * num /
/// den), so 25 pays 13, 50 pays 25, 100 pays 50. Per payout: a reward of two grants adds each one's.
pub fn vip_extra_coins(base: i64) -> i64 {
    let r = &vip_rule()["coins"];
    let num = r["num"].as_i64().unwrap_or(0).max(0);
    let den = r["den"].as_i64().unwrap_or(1).max(1);
    (base.max(0) * num + den - 1) / den
}

/// THE SEAM, helpers: the VIP extra on a helper reward of `asked` (its sizes before the cap): the
/// reward again (factor - 1) times, so double pays as much again.
pub fn vip_extra_helpers(asked: &Value) -> Value {
    let more = vip_rule()["helpers"].as_u64().unwrap_or(1).saturating_sub(1);
    let mut out = none();
    for kind in KINDS {
        out[kind] = json!(asked[kind].as_u64().unwrap_or(0) * more);
    }
    out
}

/// The VIP extra Coins' progression (vip-extra.json `progression`, declared by make-config: on_add,
/// 1 Coin a unit): its id.
pub fn vip_coins_id() -> &'static str {
    vip_rule()["progression"]["id"].as_str().unwrap_or_default()
}

/// One reward's VIP extra: Coins, and helpers { hint, undo, shuffle }.
#[derive(Debug, Clone, PartialEq)]
pub struct Extra {
    pub coins: i64,
    pub helpers: Value,
}

impl Extra {
    /// Nothing at all.
    pub fn zero() -> Extra {
        Extra { coins: 0, helpers: none() }
    }
    /// A reward's extra: each Coin grant that landed (`grants`) its own vip_extra_coins, added, and
    /// the helpers it asked (`asked`) vip_extra_helpers.
    pub fn of(grants: &[i64], asked: &Value) -> Extra {
        Extra { coins: grants.iter().map(|g| vip_extra_coins(*g)).sum(), helpers: vip_extra_helpers(asked) }
    }
    pub fn nothing(&self) -> bool {
        self.coins <= 0 && KINDS.iter().all(|k| self.helpers[*k].as_u64().unwrap_or(0) == 0)
    }
    /// Add another's.
    pub fn add(&mut self, o: &Extra) {
        self.coins += o.coins.max(0);
        for kind in KINDS {
            self.helpers[kind] = json!(self.helpers[kind].as_u64().unwrap_or(0) + o.helpers[kind].as_u64().unwrap_or(0));
        }
    }
    /// As the progress record holds it, and as the verdict says it.
    pub fn to_json(&self) -> Value {
        json!({ "coins": self.coins.max(0), "helpers": self.helpers })
    }
    pub fn from_json(v: &Value) -> Extra {
        Extra { coins: v["coins"].as_i64().unwrap_or(0).max(0), helpers: sizes(&v["helpers"]) }
    }
    /// What an order's receipt says landed: its Coin grants and its helpers.
    pub fn landed(changes: &[Value]) -> Extra {
        Extra { coins: grants_landed(changes).iter().sum(), helpers: landed(changes) }
    }
}

/// One reward's VIP extra as an order of its own, nonce "vipx:<key>": `key` is the nonce of the order
/// that paid the reward, so the extra pays once ever, whichever call places it (now, or later from
/// the record's held extras). Its Coins go on the extra's progression in adds of at most `maxGrant`
/// (the platform's most in one grant), its helpers into "earned", clamped at the cap. None when the
/// extra is nothing.
pub fn vip_extra_order(key: &str, extra: &Extra) -> Option<Order> {
    if extra.nothing() {
        return None;
    }
    let most = vip_rule()["maxGrant"].as_i64().unwrap_or(100).max(1);
    let why = format!("vip extra: {key}");
    let mut o = Order { nonce: format!("vipx:{key}"), ..Order::default() };
    let mut left = extra.coins.max(0);
    while left > 0 {
        let n = left.min(most);
        o.operations.push(json!({ "type": "progression_add", "progression_definition_id": vip_coins_id(), "amount": n, "reason": why }));
        left -= n;
    }
    for kind in KINDS {
        let n = extra.helpers[kind].as_u64().unwrap_or(0);
        if n > 0 {
            o.operations.push(grant(kind, n, why.clone()));
        }
    }
    Some(o)
}

/// What each Coin grant of a receipt paid (`granted`: what landed, after any ceiling), in its order.
pub fn grants_landed(changes: &[Value]) -> Vec<i64> {
    changes.iter().filter(|c| c["type"] == "platform_grant").map(|c| c["granted"].as_i64().unwrap_or(0)).filter(|g| *g > 0).collect()
}

/// The helpers an order asks for (its grants, before the cap's clamp): { hint, undo, shuffle }.
pub fn asked(o: &Order) -> Value {
    let mut out = none();
    for kind in KINDS {
        let id = currency(kind);
        let n: u64 = o.operations.iter().filter(|op| op["type"] == "currency_grant" && op["currency_id"] == id).filter_map(|op| op["amount"].as_u64()).sum();
        out[kind] = json!(n);
    }
    out
}
