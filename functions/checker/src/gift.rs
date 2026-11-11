//! VIP'S GIFTS, paid (the creator, 2026-11-01, after Jade Match; docs/vip.md). {"v":1,"what":"vip_gift"}:
//! a VIP is given helpers, never free uses: on their own date (the platform's, never the device's),
//! the welcome once per player ever (the creator, 2026-11-11), then the day's gift, each its own order (pay.rs
//! `vip_order`), clamped at the cap. vip.rs `due` decides what is owed; this asks the platform through
//! `Platform` (lib.rs's live calls, or the stand-in in tests/gift.rs) and says what this call paid.
//!
//! The answer, the game's word to draw from (src/net/vip.ts):
//!   { "v": 1, "status": "vip_gift", "vip": true, "today": "2026-11-02",
//!     "gifts": [ { "kind": "welcome", "id": "vip-welcome:20785", "gift": {..}, "got": {..}, "after": {..} },
//!                { "kind": "daily", "id": "vip:2026-11-02", "day": 1, "gift": {..}, "got": {..}, "after": {..} } ],
//!     "again"?: "platform" }
//! `gift` is the gift's size, `got` what landed after the cap (got < gift: the stock was full), `after`
//! each helper's balance after, as far as the receipt lists them. A gift paid by an earlier call is
//! never listed: what is owed is read from the two marks first (`vip_gift_day`, `vip_welcome_end`),
//! and nothing owed places no order at all. And should two calls race past that read, the one whose
//! order reused the nonce is told by its receipt: the platform answers a reused nonce as a success
//! that changed nothing (QA, 2026-11-02: not a 409), and a fresh gift's order always moves its mark,
//! so an empty receipt is a gift paid before. A gift that clamped at the cap still moved its mark,
//! and is listed with what landed. `again`: an order failed after another
//! landed; ask again later (the one that landed is not paid twice). Not VIP: no gifts, `vip: false`
//! (lib.rs adds `vip`). VIP unknown (the pass read failed): "retry", nothing paid.

use serde_json::{json, Value};

use crate::pay;
use crate::vip;

/// What the gift asks of the platform, for the player who called.
pub trait Platform {
    /// The player's own date, "YYYY-MM-DD". Err: the verdict.
    fn today(&self) -> Result<String, Value>;
    /// A progression's value (0 when never written). Err: the verdict.
    fn value(&self, id: &str) -> Result<f64, Value>;
    /// Place one order: Ok(Some(the receipt's changes)), Ok(None) when its nonce landed before, or
    /// Err(the verdict).
    fn place(&self, order: &pay::Order) -> Result<Option<Vec<Value>>, Value>;
    /// One line of the function's log.
    fn log(&self, line: &str);
}

pub fn retry(why: &str) -> Value {
    json!({ "v": 1, "status": "retry", "reason": why })
}

/// The gift call. `vip`: VIP for this call (vip::decide: the platform's word, or the dev pretend), or
/// Err(why it is unknown); `passes`: the platform's pass read (None: it failed, so VIP, if any, is the
/// dev pretend alone).
pub fn vip_gift(p: &dyn Platform, vip: Result<bool, &'static str>, passes: Option<vip::Passes>) -> Value {
    match vip {
        Err(why) => return retry(why),
        Ok(false) => return json!({ "v": 1, "status": "vip_gift", "gifts": [] }),
        Ok(true) => {}
    }
    let today = match p.today() {
        Ok(d) => d,
        Err(v) => return v,
    };
    let mark = |id: &str| p.value(id).map(|v| v as i64);
    let (welcomed, gifted) = match (mark(pay::vip_welcome_mark().0), mark(pay::vip_day_mark().0)) {
        (Ok(w), Ok(g)) => (w, g),
        (Err(v), _) | (_, Err(v)) => return v,
    };
    let _ = passes; // the welcome no longer reads the pass's end (once per player, ever)
    let Some(due) = vip::due(&today, welcomed, gifted) else {
        p.log(&format!("vip gift: the date {today:?} is not a date"));
        return retry("config");
    };
    if due.nothing() {
        return json!({ "v": 1, "status": "vip_gift", "today": today, "gifts": [] });
    }
    let mut orders: Vec<(&str, pay::Order, Value)> = Vec::new();
    if let Some(end) = due.welcome {
        let sizes = pay::vip_welcome();
        orders.push(("welcome", pay::vip_order(format!("vip-welcome:{end}"), &sizes, (pay::vip_welcome_mark().0, end), "welcome"), sizes));
    }
    if let Some(nonce) = due.daily.clone() {
        let sizes = pay::vip_daily(due.day);
        orders.push(("daily", pay::vip_order(nonce, &sizes, (pay::vip_day_mark().0, due.today), &format!("day {}", due.day)), sizes));
    }
    let mut gifts: Vec<Value> = Vec::new();
    for (kind, order, sizes) in orders {
        match p.place(&order) {
            // the platform's answer to a reused nonce: paid before, by a call that raced this one
            Ok(Some(changes)) if changes.is_empty() => p.log(&format!("vip gift {kind} {}: paid before (an empty receipt)", order.nonce)),
            Ok(Some(changes)) => {
                let got = pay::landed(&changes);
                p.log(&format!("vip gift {kind} {}: {sizes}, landed {got}", order.nonce));
                let mut g = json!({ "kind": kind, "id": order.nonce, "gift": sizes, "got": got, "after": pay::after(&changes) });
                if kind == "daily" {
                    g["day"] = json!(due.day);
                }
                gifts.push(g);
            }
            Ok(None) => {}
            Err(v) if gifts.is_empty() => return v,
            Err(v) => return json!({ "v": 1, "status": "vip_gift", "today": today, "gifts": gifts, "again": v["reason"] }),
        }
    }
    json!({ "v": 1, "status": "vip_gift", "today": today, "gifts": gifts })
}
