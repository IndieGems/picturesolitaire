//! VIP's gifts (src/gift.rs, src/vip.rs `due`), against a stand-in platform that keeps nonces,
//! progressions and the helper balances the way the platform does (a nonce pays once, a grant clamps
//! at the cap), on this machine:
//!   cargo test --release --test gift
//! tools/server/check.mts runs it with the rest.

use std::cell::RefCell;
use std::collections::{HashMap, HashSet};

use checker::gift::{self, Platform};
use checker::pay::{self, Order};
use checker::vip::{self, Passes};
use serde_json::{json, Value};

fn ids() -> Value {
    let p = format!("{}/../../src/net/helper-ids.json", env!("CARGO_MANIFEST_DIR"));
    serde_json::from_str(&std::fs::read_to_string(p).unwrap()).unwrap()
}

fn kind_of(currency: &str) -> String {
    let k = ids();
    ["hint", "undo", "shuffle"].iter().find(|x| k["kinds"][**x]["currency"] == currency).unwrap().to_string()
}

/// The platform, for one player.
#[derive(Default)]
struct Fake {
    today: RefCell<String>,
    values: RefCell<HashMap<String, f64>>,
    stock: RefCell<HashMap<String, i64>>,
    nonces: RefCell<HashSet<String>>,
    orders: RefCell<Vec<String>>,
    /// The next orders to fail (their nonces), as the platform answering 503.
    failing: RefCell<HashSet<String>>,
    /// The date read fails.
    no_date: RefCell<bool>,
}

impl Fake {
    fn new(today: &str) -> Fake {
        let f = Fake::default();
        *f.today.borrow_mut() = today.into();
        f
    }
    fn on(&self, today: &str) -> &Fake {
        *self.today.borrow_mut() = today.into();
        self
    }
    fn holding(&self, hint: i64, undo: i64, shuffle: i64) -> &Fake {
        let mut s = self.stock.borrow_mut();
        s.insert("hint".into(), hint);
        s.insert("undo".into(), undo);
        s.insert("shuffle".into(), shuffle);
        self
    }
    fn stock(&self) -> (i64, i64, i64) {
        let s = self.stock.borrow();
        let g = |k: &str| *s.get(k).unwrap_or(&0);
        (g("hint"), g("undo"), g("shuffle"))
    }
    fn welcomed(&self) -> f64 {
        *self.values.borrow().get(pay::vip_welcome_mark().0).unwrap_or(&0.0)
    }
}

impl Platform for Fake {
    fn today(&self) -> Result<String, Value> {
        if *self.no_date.borrow() {
            return Err(gift::retry("platform"));
        }
        Ok(self.today.borrow().clone())
    }
    fn value(&self, id: &str) -> Result<f64, Value> {
        Ok(*self.values.borrow().get(id).unwrap_or(&0.0))
    }
    fn place(&self, order: &Order) -> Result<Option<Vec<Value>>, Value> {
        if self.failing.borrow_mut().remove(&order.nonce) {
            return Err(gift::retry("platform"));
        }
        if !self.nonces.borrow_mut().insert(order.nonce.clone()) {
            return Ok(None);
        }
        self.orders.borrow_mut().push(order.nonce.clone());
        let mut changes = Vec::new();
        for op in &order.operations {
            match op["type"].as_str() {
                Some("progression_max") => {
                    let id = op["progression_definition_id"].as_str().unwrap().to_string();
                    let v = op["value"].as_f64().unwrap();
                    let mut values = self.values.borrow_mut();
                    let was = *values.get(&id).unwrap_or(&0.0);
                    values.insert(id, was.max(v));
                }
                Some("currency_grant") => {
                    assert_eq!(op["overflow"], "clamp", "a gift clamps at the cap");
                    assert_eq!(op["bucket"], "earned");
                    let currency = op["currency_id"].as_str().unwrap();
                    let kind = kind_of(currency);
                    let mut stock = self.stock.borrow_mut();
                    let before = *stock.get(&kind).unwrap_or(&0);
                    let after = (before + op["amount"].as_i64().unwrap()).min(pay::cap() as i64);
                    stock.insert(kind, after);
                    changes.push(json!({ "type": "currency", "currency_id": currency, "bucket": "earned", "balance_before": before, "balance_after": after, "delta": after - before }));
                }
                other => panic!("a gift's order holds only its mark and its grants, not {other:?}"),
            }
        }
        Ok(Some(changes))
    }
    fn log(&self, _: &str) {}
}

/// The platform's pass read: VIP held, ending on `ends` ("YYYY-MM-DD"; None: no end).
fn held(ends: Option<&str>) -> Option<Passes> {
    vip::passes(&json!({ "passes": [{ "pass": "vip", "held": true, "ends_at": ends.map(|d| format!("{d}T08:30:00Z")) }] }))
}

fn kinds(answer: &Value) -> Vec<&str> {
    answer["gifts"].as_array().unwrap().iter().map(|g| g["kind"].as_str().unwrap()).collect()
}

fn helpers(h: i64, u: i64, s: i64) -> Value {
    json!({ "hint": h, "undo": u, "shuffle": s })
}

#[test]
fn the_week_gives_two_helpers_a_day_five_hints_four_undos_five_shuffles_monday_first() {
    // 2026-11-02 is a Monday
    let want = [(1, 1, 0), (1, 0, 1), (0, 1, 1), (1, 1, 0), (1, 0, 1), (0, 1, 1), (1, 0, 1)];
    let mut week = (0, 0, 0);
    for (i, (h, u, s)) in want.iter().enumerate() {
        let date = vip::add_days("2026-11-02", i as i64).unwrap();
        assert_eq!(vip::gift_day(&date), Some(i as u32 + 1), "{date}");
        let g = pay::vip_daily(i as u32 + 1);
        assert_eq!(g, helpers(*h, *u, *s), "day {}", i + 1);
        week = (week.0 + h, week.1 + u, week.2 + s);
    }
    assert_eq!(week, (5, 4, 5));
    assert_eq!(vip::gift_day("2026-11-01"), Some(7), "a Sunday is the week's last day");
    assert_eq!(pay::vip_welcome(), helpers(3, 2, 3));
}

#[test]
fn not_vip_or_vip_unknown_pays_nothing_and_places_no_order() {
    let f = Fake::new("2026-11-02");
    let not = vip::passes(&json!({ "passes": [{ "pass": "vip", "held": false, "ends_at": null }] }));
    let a = gift::vip_gift(&f, Ok(false), not);
    assert_eq!(a, json!({ "v": 1, "status": "vip_gift", "gifts": [] }));
    // the pass read failed: unknown, never a grant and never "not VIP"
    for why in ["platform", "vip_unknown"] {
        assert_eq!(gift::vip_gift(&f, Err(why), None), json!({ "v": 1, "status": "retry", "reason": why }));
    }
    assert!(f.orders.borrow().is_empty());
    assert_eq!(f.stock(), (0, 0, 0));
    // the date could not be read: nothing either, and asked again
    *f.no_date.borrow_mut() = true;
    assert_eq!(gift::vip_gift(&f, Ok(true), held(Some("2026-12-01")))["status"], "retry");
    assert!(f.orders.borrow().is_empty());
}

#[test]
fn a_vip_gets_the_welcome_and_the_days_gift_once_a_date() {
    let f = Fake::new("2026-11-02");
    let pass = held(Some("2026-12-01"));
    let a = gift::vip_gift(&f, Ok(true), pass);
    assert_eq!(kinds(&a), vec!["welcome", "daily"], "welcome first");
    let end = vip::day_number("2026-12-01").unwrap();
    assert_eq!(a["gifts"][0]["id"], format!("vip-welcome:{end}"));
    assert_eq!(a["gifts"][0]["got"], helpers(3, 2, 3));
    assert_eq!(a["gifts"][1], json!({ "kind": "daily", "id": "vip:2026-11-02", "day": 1, "gift": helpers(1, 1, 0), "got": helpers(1, 1, 0), "after": { "hint": 4, "undo": 3 } }));
    assert_eq!(f.stock(), (4, 3, 3));
    assert_eq!(f.welcomed() as i64, end, "the membership's end, marked in the welcome's own order");
    // the same date again (a reload, a second device): nothing
    let again = gift::vip_gift(&f, Ok(true), pass);
    assert_eq!(again, json!({ "v": 1, "status": "vip_gift", "today": "2026-11-02", "gifts": [] }));
    assert_eq!(f.stock(), (4, 3, 3));
    // the next date: the day's gift alone
    let tue = gift::vip_gift(f.on("2026-11-03"), Ok(true), pass);
    assert_eq!(kinds(&tue), vec!["daily"]);
    assert_eq!(tue["gifts"][0]["got"], helpers(1, 0, 1));
    assert_eq!(f.stock(), (5, 3, 4));
}

#[test]
fn the_welcome_is_once_a_membership_again_after_a_lapse_never_on_an_extension() {
    let f = Fake::new("2026-11-02");
    gift::vip_gift(&f, Ok(true), held(Some("2026-12-01")));
    // extended before it lapsed: the same membership, a later end
    let ext = gift::vip_gift(f.on("2026-11-20"), Ok(true), held(Some("2026-12-31")));
    assert_eq!(kinds(&ext), vec!["daily"]);
    // it lapsed (ended 2026-12-01: the mark still says that end) ... the welcome stays paid
    assert_eq!(f.welcomed() as i64, vip::day_number("2026-12-01").unwrap());
    // ... and a membership bought after it ended is a new one
    let new = gift::vip_gift(f.on("2026-12-10"), Ok(true), held(Some("2027-01-09")));
    assert_eq!(kinds(&new), vec!["welcome", "daily"]);
    assert_eq!(f.welcomed() as i64, vip::day_number("2027-01-09").unwrap());
    assert_eq!(kinds(&gift::vip_gift(f.on("2026-12-11"), Ok(true), held(Some("2027-01-09")))), vec!["daily"]);
}

#[test]
fn a_membership_with_no_end_is_welcomed_once_for_good_and_one_ending_today_once() {
    let f = Fake::new("2026-11-02");
    assert_eq!(kinds(&gift::vip_gift(&f, Ok(true), held(None))), vec!["welcome", "daily"]);
    assert_eq!(f.welcomed() as i64, vip::NO_END_DAY);
    assert_eq!(kinds(&gift::vip_gift(f.on("2027-06-01"), Ok(true), held(Some("2027-07-01")))), vec!["daily"]);
    // an end that is already past in UTC on the player's date is taken as today: never twice in a day
    let g = Fake::new("2026-11-02");
    assert_eq!(kinds(&gift::vip_gift(&g, Ok(true), held(Some("2026-11-01")))), vec!["welcome", "daily"]);
    assert_eq!(kinds(&gift::vip_gift(&g, Ok(true), held(Some("2026-11-01")))), Vec::<&str>::new());
}

#[test]
fn gifts_clamp_at_the_cap_and_say_what_landed() {
    let f = Fake::new("2026-11-02");
    f.holding(19, 20, 18);
    let a = gift::vip_gift(&f, Ok(true), held(Some("2026-12-01")));
    // welcome 3/2/3 onto 19/20/18: 1/0/2 land; then Monday's 1/1/0 onto 20/20/20: nothing
    assert_eq!(a["gifts"][0]["gift"], helpers(3, 2, 3));
    assert_eq!(a["gifts"][0]["got"], helpers(1, 0, 2));
    assert_eq!(a["gifts"][0]["after"], helpers(20, 20, 20));
    assert_eq!(a["gifts"][1]["gift"], helpers(1, 1, 0));
    assert_eq!(a["gifts"][1]["got"], helpers(0, 0, 0), "paid, and full: the game says so");
    assert_eq!(a["gifts"][1]["after"], json!({ "hint": 20, "undo": 20 }), "after lists only what the receipt names");
    assert_eq!(f.stock(), (20, 20, 20));
    // the day was paid, full or not: not again today
    assert_eq!(kinds(&gift::vip_gift(&f, Ok(true), held(Some("2026-12-01")))), Vec::<&str>::new());
}

#[test]
fn a_failed_order_pays_nothing_twice_and_says_ask_again() {
    let f = Fake::new("2026-11-02");
    let pass = held(Some("2026-12-01"));
    let end = vip::day_number("2026-12-01").unwrap();
    // the welcome fails: nothing paid, retry
    f.failing.borrow_mut().insert(format!("vip-welcome:{end}"));
    assert_eq!(gift::vip_gift(&f, Ok(true), pass), json!({ "v": 1, "status": "retry", "reason": "platform" }));
    assert_eq!(f.stock(), (0, 0, 0));
    assert_eq!(f.welcomed(), 0.0, "an order that failed marked nothing");
    // the welcome lands and the day's fails: the welcome is said, and "again"
    f.failing.borrow_mut().insert("vip:2026-11-02".into());
    let a = gift::vip_gift(&f, Ok(true), pass);
    assert_eq!(kinds(&a), vec!["welcome"]);
    assert_eq!(a["again"], "platform");
    // asked again: the day's alone, the welcome not twice
    assert_eq!(kinds(&gift::vip_gift(&f, Ok(true), pass)), vec!["daily"]);
    assert_eq!(f.stock(), (4, 3, 3));
}

#[test]
fn the_dev_pretend_is_welcomed_as_a_thirty_day_membership() {
    // VIP by the pretend alone (the platform says not held, or could not say)
    let f = Fake::new("2026-11-02");
    let not = vip::passes(&json!({ "passes": [] }));
    assert_eq!(kinds(&gift::vip_gift(&f, Ok(true), not)), vec!["welcome", "daily"]);
    assert_eq!(f.welcomed() as i64, vip::day_number("2026-11-02").unwrap() + vip::PRETEND_DAYS);
    assert_eq!(kinds(&gift::vip_gift(f.on("2026-11-20"), Ok(true), None)), vec!["daily"]);
    assert_eq!(kinds(&gift::vip_gift(f.on("2026-12-03"), Ok(true), None)), vec!["welcome", "daily"]);
}

#[test]
fn the_pass_read_gives_the_end_day_of_a_held_vip() {
    let end = |b: Value| vip::passes(&b).unwrap().ends;
    assert_eq!(end(json!({ "passes": [{ "pass": "vip", "held": true, "ends_at": "2026-12-01T08:30:00Z" }] })), vip::day_number("2026-12-01"));
    assert_eq!(end(json!({ "passes": [{ "pass": "vip", "held": true, "ends_at": null }] })), None, "no end");
    assert_eq!(end(json!({ "passes": [{ "pass": "vip", "held": true, "ends_at": "soon" }] })), None, "not a date: no end, welcomed once for good");
    assert_eq!(end(json!({ "passes": [{ "pass": "vip", "held": false, "ends_at": "2026-12-01T08:30:00Z" }] })), None, "not held");
}
