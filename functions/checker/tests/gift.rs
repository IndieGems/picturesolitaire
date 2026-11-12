//! VIP's gifts (src/gift.rs), against a stand-in platform that runs the config's rewards recipes the
//! way the platform does (a key runs once and answers its first run after; a base grant clamps at the
//! cap; a VIP bonus applies only for a player holding VIP, and is skipped whole if it cannot land), on
//! this machine:
//!   cargo test --release --test gift
//! tools/server/check.mts runs it with the rest. What each recipe gives is read from
//! tools/server/helper-rewards.json, the config's one copy: the checker itself holds no amount.

use std::cell::RefCell;
use std::collections::{HashMap, HashSet};

use checker::gift::{self, Platform};
use checker::pay;
use serde_json::{json, Value};

fn root(p: &str) -> String {
    format!("{}/../../{p}", env!("CARGO_MANIFEST_DIR"))
}
fn read(p: &str) -> Value {
    serde_json::from_str(&std::fs::read_to_string(root(p)).unwrap()).unwrap()
}
fn ids() -> Value {
    read("src/net/helper-ids.json")
}
const KINDS: [&str; 3] = ["hint", "undo", "shuffle"];
/// A helper's cap as the game config declares it (its currency's max_balance): the fake platform
/// clamps at it, as the real one does. The checker itself holds no cap.
fn cap_of(kind: &str) -> i64 {
    let yaml = std::fs::read_to_string(root("gem-backend-game-config.yaml")).unwrap().replace('\r', "");
    let id = ids()["kinds"][kind]["currency"].as_str().unwrap().to_string();
    let at = yaml.find(&format!("- id: {id}\n")).expect("the currency is declared");
    let line = yaml[at..].lines().find(|l| l.trim_start().starts_with("max_balance:")).expect("it has a max_balance");
    line.trim_start().trim_start_matches("max_balance:").trim().parse().unwrap()
}

/// What a recipe gives as the config says: (base, bonus helpers, bonus grants the welcome's item).
fn recipe_of(id: &str) -> (Value, Value, bool) {
    let (k, r) = (ids(), read("tools/server/helper-rewards.json"));
    let none = json!({});
    for (i, g) in k["rewards"]["vipGift"].as_array().unwrap().iter().enumerate() {
        if g["id"] == id {
            return (none, r["vip"]["daily"][i].clone(), false);
        }
    }
    if k["rewards"]["vipWelcome"]["id"] == id {
        return (none, r["vip"]["welcome"].clone(), true);
    }
    panic!("not a gift recipe: {id}")
}

/// The platform, for one player.
#[derive(Default)]
struct Fake {
    today: RefCell<String>,
    vip: RefCell<bool>,
    values: RefCell<HashMap<String, f64>>,
    stock: RefCell<HashMap<String, i64>>,
    items: RefCell<HashSet<String>>,
    keys: RefCell<HashSet<String>>,
    runs: RefCell<Vec<String>>,
    /// The next runs to fail (their keys), as the platform answering 503.
    failing: RefCell<HashSet<String>>,
    no_date: RefCell<bool>,
}

impl Fake {
    fn new(today: &str, vip: bool) -> Fake {
        let f = Fake::default();
        *f.today.borrow_mut() = today.into();
        *f.vip.borrow_mut() = vip;
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
    fn change(&self, kind: &str, n: i64, out: &mut Vec<Value>) {
        let mut s = self.stock.borrow_mut();
        let before = *s.get(kind).unwrap_or(&0);
        s.insert(kind.into(), before + n);
        out.push(json!({ "type": "currency", "currency_id": ids()["kinds"][kind]["currency"], "bucket": "earned", "balance_before": before, "balance_after": before + n, "delta": n }));
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
    fn holds(&self, slug: &str) -> Result<bool, Value> {
        Ok(self.items.borrow().contains(slug))
    }
    fn run(&self, recipe: &str, nonce: &str) -> Result<Vec<Value>, Value> {
        if self.failing.borrow_mut().remove(nonce) {
            return Err(gift::retry("platform"));
        }
        self.runs.borrow_mut().push(nonce.into());
        if !self.keys.borrow_mut().insert(nonce.into()) {
            return Ok(Vec::new()); // the key ran before: its first run's answer, nothing granted
        }
        let (base, bonus, item) = recipe_of(recipe);
        let mut out = Vec::new();
        for k in KINDS {
            let n = base[k].as_i64().unwrap_or(0);
            let have = *self.stock.borrow().get(k).unwrap_or(&0);
            if n > 0 {
                self.change(k, n.min(cap_of(k) - have).max(0), &mut out);
            }
        }
        let fits = KINDS.iter().all(|k| *self.stock.borrow().get(*k).unwrap_or(&0) + bonus[*k].as_i64().unwrap_or(0) <= cap_of(k));
        let (outcome, reason) = match (*self.vip.borrow(), fits) {
            (false, _) => ("skipped", Some("requirement_unmet")),
            (true, false) => ("skipped", Some("would_exceed")),
            (true, true) => ("applied", None),
        };
        if outcome == "applied" {
            for k in KINDS {
                let n = bonus[k].as_i64().unwrap_or(0);
                if n > 0 {
                    self.change(k, n, &mut out);
                }
            }
            if item {
                self.items.borrow_mut().insert(pay::welcome_item().1.into());
            }
        }
        let mut b = json!({ "type": "bonus", "bonus_id": "vip", "outcome": outcome });
        if let Some(r) = reason {
            b["reason"] = json!(r);
        }
        out.push(b);
        Ok(out)
    }
    fn log(&self, _line: &str) {}
}

#[test]
fn a_vip_gets_the_days_gift_once_a_date_and_the_welcome_first_time() {
    let f = Fake::new("2026-11-02", true); // a Monday
    let a = gift::vip_gift(&f);
    assert_eq!(a["status"], "vip_gift");
    let kinds: Vec<&str> = a["gifts"].as_array().unwrap().iter().map(|g| g["kind"].as_str().unwrap()).collect();
    assert_eq!(kinds, vec!["welcome", "daily"], "the welcome is listed first");
    assert_eq!(a["gifts"][1]["id"], "vip:2026-11-02");
    assert_eq!(a["gifts"][1]["day"], 1);
    assert_eq!(a["gifts"][0]["id"], "vip-welcome:2026-11-02");
    // the config's Monday (1 Hint, 1 Undo) and the welcome (3, 2, 3)
    assert_eq!(a["gifts"][1]["got"], json!({ "hint": 1, "undo": 1, "shuffle": 0 }));
    assert_eq!(a["gifts"][0]["got"], json!({ "hint": 3, "undo": 2, "shuffle": 3 }));
    assert_eq!(f.stock(), (4, 3, 3));
    // asked again the same day: the key answers its first run, nothing is given
    let again = gift::vip_gift(&f);
    assert_eq!(again["gifts"], json!([]));
    assert_eq!(f.stock(), (4, 3, 3));
    // the next day: the day's gift alone, the welcome never again
    let next = gift::vip_gift(f.on("2026-11-03"));
    let kinds: Vec<&str> = next["gifts"].as_array().unwrap().iter().map(|g| g["kind"].as_str().unwrap()).collect();
    assert_eq!(kinds, vec!["daily"]);
    assert_eq!(next["gifts"][0]["day"], 2);
    assert!(!f.runs.borrow().iter().any(|k| k == "vip-welcome:2026-11-03"), "a welcomed player's welcome is not even run");
}

#[test]
fn a_player_not_vip_is_given_nothing_and_never_welcomed() {
    let f = Fake::new("2026-11-02", false);
    f.holding(2, 2, 2);
    let a = gift::vip_gift(&f);
    assert_eq!(a["status"], "vip_gift");
    assert_eq!(a["gifts"], json!([]));
    assert_eq!(f.stock(), (2, 2, 2), "a skipped bonus spends and gives nothing");
    assert_eq!(*f.runs.borrow(), vec!["vip:2026-11-02".to_string()], "no welcome run after a gift that did not apply");
    assert!(a.get("vip").is_none(), "the answer says nothing about VIP");
}

#[test]
fn a_player_welcomed_by_an_older_checker_is_never_welcomed_again() {
    let f = Fake::new("2026-11-10", true);
    f.values.borrow_mut().insert(pay::vip_welcome_mark().0.into(), 20_785.0);
    let a = gift::vip_gift(&f);
    let kinds: Vec<&str> = a["gifts"].as_array().unwrap().iter().map(|g| g["kind"].as_str().unwrap()).collect();
    assert_eq!(kinds, vec!["daily"]);
    assert!(!f.items.borrow().contains(pay::welcome_item().1));
}

#[test]
fn a_welcome_that_could_not_run_says_ask_again_and_comes_on_a_later_day() {
    let f = Fake::new("2026-11-02", true);
    f.failing.borrow_mut().insert("vip-welcome:2026-11-02".into());
    let a = gift::vip_gift(&f);
    assert_eq!(a["again"], "platform");
    assert_eq!(a["gifts"].as_array().unwrap().len(), 1, "the day's gift landed and is listed");
    // the same day: the day's key ran, so nothing more today
    assert_eq!(gift::vip_gift(&f)["gifts"], json!([]));
    // the next day's gift applies, and the welcome follows it
    let next = gift::vip_gift(f.on("2026-11-03"));
    let kinds: Vec<&str> = next["gifts"].as_array().unwrap().iter().map(|g| g["kind"].as_str().unwrap()).collect();
    assert_eq!(kinds, vec!["welcome", "daily"]);
}

#[test]
fn a_full_stock_skips_a_bonus_that_cannot_land_and_the_cap_is_never_passed() {
    let f = Fake::new("2026-11-02", true);
    let full = (cap_of("hint"), cap_of("undo"), cap_of("shuffle"));
    f.holding(full.0, full.1, full.2);
    let a = gift::vip_gift(&f);
    assert_eq!(a["gifts"], json!([]), "a bonus that cannot land is skipped: nothing given");
    assert_eq!(f.stock(), full);
}

#[test]
fn each_weekday_runs_its_own_recipe() {
    let k = ids();
    for (i, date) in ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"].iter().enumerate() {
        assert_eq!(pay::vip_gift(date), k["rewards"]["vipGift"][i]["id"].as_str(), "{date}");
    }
}

#[test]
fn no_date_or_a_bad_one_gives_nothing_and_asks_again() {
    let f = Fake::new("2026-11-02", true);
    *f.no_date.borrow_mut() = true;
    assert_eq!(gift::vip_gift(&f)["status"], "retry");
    let g = Fake::new("someday", true);
    assert_eq!(gift::vip_gift(&g), json!({ "v": 1, "status": "retry", "reason": "config" }));
    assert!(g.runs.borrow().is_empty());
}
