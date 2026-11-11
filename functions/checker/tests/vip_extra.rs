//! THE VIP EXTRA (src/pay.rs; docs/vip.md; the creator, 2026-11-10): double on every helper reward
//! (since 2026-11-11 the Arcade pays VIP's +50% Coins itself, so this checker adds no Coins: gamePays
//! false), INSIDE the reward's own order (the platform pays one order a call:
//! function_invocation_already_granted), reckoned from what the config pays (data/coins.json); and the
//! record's held extras (src/progress.rs), paid under a mark. On this machine:
//!   cargo test --release --test vip_extra

use checker::pay::{self, Extra, Order};
use checker::progress;
use serde_json::{json, Value};

fn read(p: &str) -> String {
    std::fs::read_to_string(format!("{}/{p}", env!("CARGO_MANIFEST_DIR"))).unwrap().replace('\r', "")
}

fn rule() -> Value {
    serde_json::from_str(&read("../../src/net/vip-extra.json")).unwrap()
}

fn helpers(h: u64, u: u64, s: u64) -> Value {
    json!({ "hint": h, "undo": u, "shuffle": s })
}

fn adds(o: &Order) -> Vec<i64> {
    o.operations.iter().filter(|op| op["type"] == "progression_add" && op["progression_definition_id"] == pay::vip_coins_id()).filter_map(|op| op["amount"].as_i64()).collect()
}

#[test]
fn the_coins_extra_is_half_of_each_payout_rounded_up() {
    // the creator's figures: 25 pays +13, 50 pays +25, 100 pays +50
    for (base, extra) in [(25, 13), (50, 25), (100, 50), (37, 19), (1, 1), (0, 0), (-5, 0)] {
        assert_eq!(pay::vip_extra_coins(base), extra, "{base}");
    }
    let r = rule();
    assert_eq!((r["coins"]["num"].as_i64(), r["coins"]["den"].as_i64()), (Some(1), Some(2)), "the rule's one copy says +50%");
    // the creator, 2026-11-11: "the gem arcade updated yesterday and it now pays the 50% extra for VIPs"
    assert_eq!(r["gamePays"], json!(false), "the Arcade pays VIP's Coins since 2026-11-11");
    assert!(!pay::vip_game_pays());
    // so no reward reckons a Coins extra here, whatever its grants
    assert_eq!(Extra::of(&[25, 25], &pay::none()).coins, 0);
    assert_eq!(Extra::of(&[25, 25], &helpers(1, 0, 0)).helpers, helpers(1, 0, 0), "the helpers are still doubled here");
}

#[test]
fn helper_rewards_pay_double() {
    assert_eq!(pay::vip_extra_helpers(&helpers(3, 3, 3)), helpers(3, 3, 3), "the kit's 3 of each: 3 more of each");
    assert_eq!(pay::vip_extra_helpers(&helpers(1, 1, 0)), helpers(1, 1, 0));
    assert_eq!(rule()["helpers"], json!(2));
}

#[test]
fn level_1s_order_carries_its_extra_inside_it() {
    // Level 1's first win with the kit: the onboarding prize and First Steps' prize (100 each, the
    // config's), the kit's 3 of each; as a VIP, +50 +50 and 3 more of each, IN THE SAME ORDER
    let c01 = pay::board_id("c01").unwrap();
    let mut o = pay::order(c01, "campaign c01", "first:campaign:c01", true, None, Vec::new(), true).unwrap();
    assert_eq!(pay::base_grants(&o), vec![100, 100], "the config's two grants on Level 1");
    let x = pay::extra_of(&o);
    assert_eq!(x, Extra { coins: 0, helpers: helpers(3, 3, 3) }, "no Coins: the Arcade adds VIP's +50% to the base itself");
    let before = o.operations.len();
    pay::add_extra(&mut o, &x, "vip extra: campaign c01");
    assert_eq!(o.nonce, "first:campaign:c01", "the reward's own key: once ever");
    assert!(adds(&o).is_empty(), "no grant on the VIP Coins progression");
    assert_eq!(o.operations.len(), before + 3, "three helper grants");
    assert_eq!(pay::asked(&o), helpers(6, 6, 6), "6 of each asked in all");
    // a Coins extra handed in (a held one from before 2026-11-11) adds no Coins either
    let mut big = Order::default();
    pay::add_extra(&mut big, &Extra { coins: 130, helpers: pay::none() }, "k");
    assert!(adds(&big).is_empty());
    let mut nothing = Order::default();
    pay::add_extra(&mut nothing, &Extra::zero(), "k");
    assert!(nothing.operations.is_empty(), "nothing to pay: nothing added");
}

#[test]
fn every_lane_reckons_its_base_from_the_config() {
    // a board past the welcome: its one grant
    let c07 = pay::board_id("c07").unwrap();
    let o = pay::order(c07, "campaign c07", "first:campaign:c07", true, Some(("hard", helpers(1, 1, 0))), Vec::new(), false).unwrap();
    assert_eq!(pay::base_grants(&o).len(), 1);
    // the daily's first win: 50, so +25
    let d = pay::order(checker::DAILY_ID, "daily", "daily:2026-11-10", true, pay::daily_gift("2026-11-10"), Vec::new(), false).unwrap();
    assert_eq!(pay::base_grants(&d), vec![50]);
    assert_eq!(pay::extra_of(&d).coins, 0, "the Arcade's");
    // a past day (the archive, 15 a day) and an event item (15 an item): one unit each (the creator, 2026-11-10)
    let past = Order { nonce: "past:2026-11-01".into(), operations: vec![json!({ "type": "progression_add", "progression_definition_id": checker::ARCHIVE_ID, "amount": 1 })], gifts: Vec::new() };
    assert_eq!(pay::base_grants(&past), vec![15]);
    assert_eq!(pay::extra_of(&past).coins, 0);
    let ids: Value = serde_json::from_str(&read("../../src/net/suitcase-ids.json")).unwrap();
    let find = Order { nonce: "pack".into(), operations: vec![json!({ "type": "progression_add", "progression_definition_id": ids["finds"]["id"], "amount": 1 })], gifts: Vec::new() };
    assert_eq!(pay::base_grants(&find), vec![15]);
    assert_eq!(pay::extra_of(&find).coins, 0);
    // a replay's order (the kit alone) pays no Coins: no Coins extra
    let kit = pay::order(c07, "campaign c07", "first:campaign:c07", false, None, Vec::new(), true).unwrap();
    assert!(pay::base_grants(&kit).is_empty());
    assert_eq!(pay::extra_of(&kit), Extra { coins: 0, helpers: helpers(3, 3, 3) });
}

#[test]
fn the_compiled_coins_are_the_configs() {
    // data/coins.json is make-config's, from the same figures as the config: Level 1's two grants
    // are in both, and every board progression the config declares is in the file
    let yaml = read("../../gem-backend-game-config.yaml");
    let coins: Value = serde_json::from_str(&read("data/coins.json")).unwrap();
    let p = &coins["progressions"];
    assert_eq!(p[pay::board_id("c01").unwrap()]["complete"], json!([100, 100]));
    for line in yaml.lines().filter(|l| l.trim_start().starts_with("slug: board_")) {
        let slug = line.trim_start().trim_start_matches("slug: ").trim();
        let id = pay::board_id(slug.trim_start_matches("board_")).unwrap_or_else(|| panic!("{slug}"));
        assert!(p[id]["complete"].is_array(), "{slug} is in data/coins.json");
    }
    assert_eq!(pay::COINS.len(), 8, "its fingerprint is compiled in");
}

#[test]
fn the_extras_progressions_are_declared_for_the_checker_alone() {
    let r = rule();
    let yaml = read("../../gem-backend-game-config.yaml");
    let entry = |id: &str| -> String {
        let at = yaml.find(&format!("- id: {id}\n")).unwrap_or_else(|| panic!("{id} is in the config"));
        yaml[at..].lines().skip(1).take_while(|l| !l.trim_start().starts_with("- id:")).collect::<Vec<_>>().join("\n")
    };
    let coins = entry(r["progression"]["id"].as_str().unwrap());
    assert!(coins.contains("slug: vip_coins") && coins.contains("function_may_grant: true"), "{coins}");
    assert!(coins.contains("mode: on_add") && coins.contains("per_unit: 1") && coins.contains("ARCADE_TICKETS"), "{coins}");
    let mark = entry(r["heldMark"]["id"].as_str().unwrap());
    assert!(mark.contains("slug: vip_extra_held") && !mark.contains("platform_grants"), "{mark}");
    for e in [&coins, &mark] {
        assert!(!e.contains("client_writable: true"));
    }
}

#[test]
fn held_extras_pay_under_their_mark_once() {
    let mut d = progress::empty();
    assert!(progress::held_extras(&d).is_empty());
    progress::hold_extra(&mut d, "daily:2026-11-10", &Extra { coins: 25, helpers: helpers(1, 0, 0) });
    progress::hold_extra(&mut d, "first:campaign:c09", &Extra { coins: 19, helpers: pay::none() });
    progress::hold_extra(&mut d, "daily:2026-11-10", &Extra { coins: 25, helpers: helpers(1, 0, 0) });
    let held = progress::held_extras(&d);
    assert_eq!(held.iter().map(|h| (h.0.as_str(), h.2)).collect::<Vec<_>>(), vec![("daily:2026-11-10", 1), ("first:campaign:c09", 2)], "held twice under one key: still one");
    assert_eq!(held[0].1, Extra { coins: 25, helpers: helpers(1, 0, 0) });
    // paid inside a paying order with the mark raised to the highest number: their helpers, and no
    // Coins (the Arcade's since 2026-11-11)
    let mut o = Order::default();
    pay::add_held(&mut o, &Extra { coins: 44, helpers: helpers(1, 0, 0) }, 2);
    assert!(adds(&o).is_empty());
    assert_eq!(pay::asked(&o), helpers(1, 0, 0));
    let mark = o.operations.iter().find(|op| op["progression_definition_id"] == pay::held_mark_id()).unwrap();
    assert_eq!((mark["type"].as_str(), mark["value"].as_u64()), (Some("progression_max"), Some(2)));
    // the mark says what is paid: those numbered up to it go, the rest stay
    assert!(progress::drop_held(&mut d, 1));
    assert_eq!(progress::held_extras(&d).len(), 1);
    assert!(!progress::drop_held(&mut d, 1), "nothing more at 1");
    progress::hold_extra(&mut d, "past:2026-11-02", &Extra { coins: 25, helpers: pay::none() });
    assert_eq!(progress::held_extras(&d).last().unwrap().2, 3, "the number keeps counting");
    assert!(progress::drop_held(&mut d, u64::MAX));
    assert!(d.get("vipOwed").is_none(), "an empty list leaves the record as it was");
}

#[test]
fn a_receipt_splits_the_extra_from_the_base() {
    let changes = vec![
        json!({ "type": "platform_grant", "progression_definition_id": pay::board_id("c01").unwrap(), "granted": 100, "requested": 100, "outcome": "fired" }),
        json!({ "type": "platform_grant", "progression_definition_id": pay::board_id("c01").unwrap(), "granted": 100, "requested": 100, "outcome": "fired" }),
        json!({ "type": "platform_grant", "progression_definition_id": pay::vip_coins_id(), "granted": 60, "requested": 100, "outcome": "clamped" }),
    ];
    // what landed, a ceiling's trim included
    assert_eq!(pay::split_landed(&changes), (60, 200));
}
