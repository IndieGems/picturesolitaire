//! THE VIP EXTRA (src/pay.rs; docs/vip.md; the creator, 2026-11-10): +50% on every Coin payout and
//! double on every helper reward, in an order of its own keyed by the reward it rides with, and the
//! record's held extras (src/progress.rs). On this machine:
//!   cargo test --release --test vip_extra

use checker::pay::{self, Extra};
use checker::progress;
use serde_json::{json, Value};

fn rule() -> Value {
    serde_json::from_str(&std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/../../src/net/vip-extra.json")).unwrap()).unwrap()
}

fn helpers(h: u64, u: u64, s: u64) -> Value {
    json!({ "hint": h, "undo": u, "shuffle": s })
}

#[test]
fn the_coins_extra_is_half_of_each_payout_rounded_up() {
    // the creator's figures: 25 pays +13, 50 pays +25, 100 pays +50
    for (base, extra) in [(25, 13), (50, 25), (100, 50), (37, 19), (1, 1), (0, 0), (-5, 0)] {
        assert_eq!(pay::vip_extra_coins(base), extra, "{base}");
    }
    let r = rule();
    assert_eq!((r["coins"]["num"].as_i64(), r["coins"]["den"].as_i64()), (Some(1), Some(2)), "the rule's one copy says +50%");
    assert_eq!(r["gamePays"], json!(true), "the game pays it until the Arcade does");
    assert_eq!(pay::vip_game_pays(), true);
}

#[test]
fn each_grant_of_a_reward_has_its_own_extra() {
    // Level 1: the onboarding prize and First Steps' prize, 100 each: 50 + 50
    assert_eq!(Extra::of(&[100, 100], &pay::none()).coins, 100);
    // 25 and 25 apart are 13 + 13, never ceil(50 / 2) = 25
    assert_eq!(Extra::of(&[25, 25], &pay::none()).coins, 26);
}

#[test]
fn helper_rewards_pay_double() {
    // the kit's 3 of each: 3 more of each (6 in all)
    assert_eq!(pay::vip_extra_helpers(&helpers(3, 3, 3)), helpers(3, 3, 3));
    assert_eq!(pay::vip_extra_helpers(&helpers(1, 1, 0)), helpers(1, 1, 0));
    assert_eq!(rule()["helpers"], json!(2));
}

#[test]
fn the_extra_is_an_order_of_its_own_keyed_by_its_reward() {
    let o = pay::vip_extra_order("first:campaign:c01", &Extra { coins: 100, helpers: helpers(3, 3, 3) }).unwrap();
    assert_eq!(o.nonce, "vipx:first:campaign:c01");
    let adds: Vec<&Value> = o.operations.iter().filter(|op| op["type"] == "progression_add").collect();
    assert_eq!(adds.len(), 1, "100 fits one grant");
    assert_eq!(adds[0]["progression_definition_id"], json!(pay::vip_coins_id()));
    assert_eq!(adds[0]["amount"], json!(100));
    let grants: Vec<&Value> = o.operations.iter().filter(|op| op["type"] == "currency_grant").collect();
    assert_eq!(grants.len(), 3);
    assert!(grants.iter().all(|g| g["amount"] == json!(3) && g["overflow"] == "clamp" && g["bucket"] == "earned"));
    // past the platform's most in one grant: split
    let big = pay::vip_extra_order("k", &Extra { coins: 130, helpers: pay::none() }).unwrap();
    let amounts: Vec<i64> = big.operations.iter().filter_map(|op| op["amount"].as_i64()).collect();
    assert_eq!(amounts, vec![100, 30]);
    assert!(pay::vip_extra_order("k", &Extra::zero()).is_none(), "nothing to pay: no order");
}

#[test]
fn the_extras_progression_is_declared_for_the_checker_alone() {
    let r = rule();
    let id = r["progression"]["id"].as_str().unwrap();
    let yaml = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/../../gem-backend-game-config.yaml")).unwrap().replace('\r', "");
    let at = yaml.find(&format!("- id: {id}\n")).expect("the vip_coins progression is in the config");
    let entry: String = yaml[at..].lines().skip(1).take_while(|l| !l.trim_start().starts_with("- id:")).collect::<Vec<_>>().join("\n");
    assert!(entry.contains("slug: vip_coins"), "{entry}");
    assert!(entry.contains("function_may_grant: true"));
    assert!(entry.contains("mode: on_add") && entry.contains("per_unit: 1") && entry.contains("ARCADE_TICKETS"), "{entry}");
    assert!(!entry.contains("client_writable: true"));
}

#[test]
fn an_orders_asked_helpers_and_a_receipts_grants() {
    let o = pay::order("p", "campaign c07", "first:campaign:c07", true, Some(("hard", helpers(1, 1, 0))), Vec::new(), true).unwrap();
    // the hard gift and the kit (3 of each) in one order
    assert_eq!(pay::asked(&o), helpers(4, 4, 3));
    let changes = vec![
        json!({ "type": "platform_grant", "granted": 100, "requested": 100 }),
        json!({ "type": "platform_grant", "granted": 0, "requested": 100 }),
        json!({ "type": "platform_grant", "granted": 40, "requested": 100 }),
    ];
    // what landed, the day's cap's trim included (a grant trimmed to 0 has no extra)
    assert_eq!(pay::grants_landed(&changes), vec![100, 40]);
    assert_eq!(Extra::of(&pay::grants_landed(&changes), &pay::none()).coins, 70);
}

#[test]
fn the_record_holds_an_extra_until_vip_is_known() {
    let mut d = progress::empty();
    assert!(progress::held_extras(&d).is_empty());
    progress::hold_extra(&mut d, "daily:2026-11-10", &Extra { coins: 25, helpers: helpers(1, 0, 0) });
    progress::hold_extra(&mut d, "first:campaign:c09", &Extra { coins: 19, helpers: pay::none() });
    let held = progress::held_extras(&d);
    assert_eq!(held.len(), 2);
    assert_eq!(held[0].0, "daily:2026-11-10");
    assert_eq!(held[0].1, Extra { coins: 25, helpers: helpers(1, 0, 0) });
    // held twice under one key: still one (an extra pays once, ever)
    progress::hold_extra(&mut d, "daily:2026-11-10", &Extra { coins: 25, helpers: helpers(1, 0, 0) });
    assert_eq!(progress::held_extras(&d).len(), 2);
    progress::drop_extra(&mut d, "daily:2026-11-10");
    assert_eq!(progress::held_extras(&d).iter().map(|(k, _)| k.as_str()).collect::<Vec<_>>(), vec!["first:campaign:c09"]);
    progress::drop_extra(&mut d, "first:campaign:c09");
    assert!(d.get("vipOwed").is_none(), "an empty list leaves the record as it was");
}
