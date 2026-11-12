//! VIP'S GIFTS (the creator, 2026-11-01, after Jade Match; docs/vip.md), given by the config's rewards
//! catalog, never by a reading of VIP here (the creator, 2026-11-12). {"v":1,"what":"vip_gift"}: on
//! the player's own date (the platform's, never the device's) the checker runs that weekday's gift
//! recipe (pay.rs `vip_gift`), key `vip:<date>`. It has no base, only a VIP bonus (`holds_pass vip`),
//! which the platform judges as it runs: a VIP gets the day's helpers, anyone else nothing at all. The
//! key makes it once a date: run again, the platform answers the first run (the same order, nothing
//! granted). Then, only after a day's gift whose bonus APPLIED in this very call, the WELCOME, once
//! per player, ever (the creator, 2026-11-11): unless the player holds the welcome's item, or a checker
//! before 0.1.63 welcomed them (`vip_welcome_end` above 0), the welcome recipe runs (key
//! `vip-welcome:<date>`), whose VIP bonus grants its helpers with that account-bound item, together.
//! A welcome whose bonus was skipped (VIP ended between the two runs) gave nothing, and is tried on a
//! later day. Every grant clamps at the cap; a bonus that cannot land is skipped by the platform.
//!
//! The game asks only when its preview of the day's recipe says the bonus would apply
//! (src/net/vip.ts); the platform still decides.
//!
//! The answer, the game's word to draw from (src/net/vip.ts):
//!   { "v": 1, "status": "vip_gift", "today": "2026-11-02",
//!     "gifts": [ { "kind": "welcome", "id": "vip-welcome:2026-11-02", "got": {..}, "after": {..} },
//!                { "kind": "daily", "id": "vip:2026-11-02", "day": 1, "got": {..}, "after": {..} } ],
//!     "again"?: "platform" }
//! `got` is what landed after the cap, `after` each helper's balance after, as far as the receipt
//! lists them. A gift given by an earlier call is never listed. `again`: a run failed after one
//! landed; ask again later (what landed is never given twice). Nothing about VIP is said: the game
//! knows it from the preview.

use serde_json::{json, Value};

use crate::pay;

/// What the gift asks of the platform, for the player who called.
pub trait Platform {
    /// The player's own date, "YYYY-MM-DD". Err: the verdict.
    fn today(&self) -> Result<String, Value>;
    /// A progression's value (0 when never written). Err: the verdict.
    fn value(&self, id: &str) -> Result<f64, Value>;
    /// The player holds at least one of the item with this slug. Err: the verdict.
    fn holds(&self, slug: &str) -> Result<bool, Value>;
    /// Run a recipe of the rewards catalog with this key: Ok(its receipt's `granted`, empty when the
    /// key ran before), or Err(the verdict).
    fn run(&self, recipe: &str, nonce: &str) -> Result<Vec<Value>, Value>;
    /// One line of the function's log.
    fn log(&self, line: &str);
}

pub fn retry(why: &str) -> Value {
    json!({ "v": 1, "status": "retry", "reason": why })
}

fn entry(kind: &str, id: &str, granted: &[Value]) -> Value {
    json!({ "kind": kind, "id": id, "got": pay::landed(granted), "after": pay::after(granted) })
}

/// The gift call.
pub fn vip_gift(p: &dyn Platform) -> Value {
    let today = match p.today() {
        Ok(d) => d,
        Err(v) => return v,
    };
    let (Some(recipe), Some(day)) = (pay::vip_gift(&today), crate::days::iso_day(&today)) else {
        p.log(&format!("vip gift: the date {today:?} is not a date, or the config has no gift for it"));
        return retry("config");
    };
    let nonce = format!("vip:{today}");
    let granted = match p.run(recipe, &nonce) {
        Ok(g) => g,
        Err(v) => return v,
    };
    let answer = |gifts: Vec<Value>| json!({ "v": 1, "status": "vip_gift", "today": today, "gifts": gifts });
    if granted.is_empty() {
        // the key ran before: today's gift was given (or judged) by an earlier call
        p.log(&format!("vip gift {nonce}: run before"));
        return answer(Vec::new());
    }
    if !pay::applied(&granted) {
        p.log(&format!("vip gift {nonce}: its bonus did not apply ({:?})", pay::bonuses(&granted)));
        return answer(Vec::new());
    }
    let mut daily = entry("daily", &nonce, &granted);
    daily["day"] = json!(day);
    p.log(&format!("vip gift {nonce}: landed {}", daily["got"]));
    // the welcome, once per player, ever, after a day's gift that applied now
    let welcomed = p.value(pay::vip_welcome_mark().0).map(|v| v > 0.0).and_then(|w| if w { Ok(true) } else { p.holds(pay::welcome_item().1) });
    let again = |gifts: Vec<Value>, why: &Value| {
        let mut a = answer(gifts);
        a["again"] = why["reason"].clone();
        a
    };
    match welcomed {
        Err(v) => return again(vec![daily], &v),
        Ok(true) => return answer(vec![daily]),
        Ok(false) => {}
    }
    let key = format!("vip-welcome:{today}");
    match p.run(pay::vip_welcome(), &key) {
        Err(v) => again(vec![daily], &v),
        Ok(g) if pay::applied(&g) => {
            let w = entry("welcome", &key, &g);
            p.log(&format!("vip welcome {key}: landed {}", w["got"]));
            answer(vec![w, daily])
        }
        Ok(g) => {
            p.log(&format!("vip welcome {key}: nothing given ({:?})", pay::bonuses(&g)));
            answer(vec![daily])
        }
    }
}
