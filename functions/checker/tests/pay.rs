// What a verified win pays (src/pay.rs): the rewards by board, the one order and the reward recipes
// after it, and the ids it names, held to the config and to src/net/helper-ids.json. No amount is
// the checker's (docs/vip.md): these tests name none of a reward's.

use checker::claim::{Lane, SHUFFLES};
use checker::pay;
use serde_json::{json, Value};

fn root(p: &str) -> String {
    format!("{}/../../{p}", env!("CARGO_MANIFEST_DIR"))
}

fn ids() -> Value {
    serde_json::from_str(&std::fs::read_to_string(root("src/net/helper-ids.json")).unwrap()).unwrap()
}

/// The Shuffles currency's max_balance, as the game config declares it (the checker holds no cap: the
/// platform clamps every grant at it, so nothing reads it at run time).
fn shuffle_cap() -> u32 {
    let yaml = std::fs::read_to_string(root("gem-backend-game-config.yaml")).unwrap().replace('\r', "");
    let id = ids()["kinds"]["shuffle"]["currency"].as_str().unwrap().to_string();
    let at = yaml.find(&format!("- id: {id}\n")).expect("the Shuffles currency is declared");
    let rest = &yaml[at..];
    let line = rest.lines().find(|l| l.trim_start().starts_with("max_balance:")).expect("it has a max_balance");
    line.trim_start().trim_start_matches("max_balance:").trim().parse().unwrap()
}

#[test]
fn a_line_may_hold_a_full_pouch_of_shuffles_and_more_bought_mid_board() {
    // five full pouches in a line, at the config's cap
    let cap = shuffle_cap();
    assert!(cap > 0);
    assert!(SHUFFLES >= 5 * cap, "SHUFFLES {SHUFFLES} is under five pouches of {cap}");
}

#[test]
fn hard_boards_give_the_hard_reward_and_a_trips_last_board_the_stamp() {
    let k = ids();
    let r = |n: &str| k["rewards"][n]["id"].as_str().unwrap().to_string();
    let of = |board: &str| pay::gift_of(Lane::Campaign, board).map(|g| (g.0, g.1.to_string()));
    assert_eq!(of("c01"), None);
    assert_eq!(of("c07"), Some(("hard", r("hard"))));
    assert_eq!(of("c15"), Some(("stamp", r("stamp")))); // hard, and the end of trip 1: the stamp wins
    assert_eq!(of("c20"), Some(("hard", r("hard")))); // super, mid-trip
    assert_eq!(of("c30"), Some(("stamp", r("stamp"))));
    assert_eq!(of("c90"), Some(("stamp", r("stamp"))));
    assert_eq!(of("c02"), None);
    assert_eq!(pay::gift_of(Lane::Challenge, "ch01"), None);
}

#[test]
fn every_board_progression_and_reward_recipe_id_is_the_configs() {
    let config = std::fs::read_to_string(root("gem-backend-game-config.yaml")).unwrap().replace('\r', "");
    let lines: Vec<&str> = config.lines().collect();
    let mut checked = 0;
    for (i, l) in lines.iter().enumerate() {
        if let Some(slug) = l.trim().strip_prefix("slug: board_") {
            let id = lines[i - 1].trim().strip_prefix("- id: ").expect("the id above the slug");
            assert_eq!(pay::board_id(slug), Some(id), "board_{slug}");
            checked += 1;
        }
    }
    assert!(checked >= 110, "{checked} board progressions in the config");
    assert!(config.contains(&format!("- id: {}\n    slug: {}", pay::kit_mark().0, pay::kit_mark().1)));
    // the rewards catalog and every recipe the checker runs, by id, in it
    let k = ids();
    assert!(config.contains(&format!("- id: {}\n    slug: rewards\n", pay::catalog())));
    let mut recipes: Vec<Value> = vec![k["rewards"]["kit"].clone(), k["rewards"]["hard"].clone(), k["rewards"]["stamp"].clone(), k["rewards"]["vipWelcome"].clone()];
    recipes.extend(k["rewards"]["daily"].as_array().unwrap().iter().cloned());
    recipes.extend(k["rewards"]["vipGift"].as_array().unwrap().iter().cloned());
    assert_eq!(recipes.len(), 18);
    for r in recipes {
        let entry = format!("      - id: {}\n        slug: {}\n", r["id"].as_str().unwrap(), r["slug"].as_str().unwrap());
        assert!(config.contains(&entry), "{entry}");
    }
    let (item, slug) = pay::welcome_item();
    assert!(config.contains(&format!("- id: {item}\n    slug: {slug}\n")));
}

#[test]
fn a_first_win_of_a_hard_board_marks_it_then_runs_its_reward_by_its_own_key() {
    let o = pay::order("p-c07", "campaign c07", "first:campaign:c07", true, pay::gift_of(Lane::Campaign, "c07"), vec![], false).unwrap();
    assert_eq!(o.nonce, "first:campaign:c07");
    assert_eq!(o.gifts, vec!["hard"]);
    assert_eq!(o.operations, vec![json!({ "type": "progression_max", "progression_definition_id": "p-c07", "value": 1, "reason": "campaign c07 verified win" })], "the order grants no helper");
    assert_eq!(o.runs, vec![pay::Run { gift: "hard", recipe: pay::gift_of(Lane::Campaign, "c07").unwrap().1, nonce: "first:campaign:c07:helpers".into() }]);
}

#[test]
fn a_replay_pays_nothing_and_writes_nothing() {
    assert_eq!(pay::order("p-c07", "campaign c07", "first:campaign:c07", false, pay::gift_of(Lane::Campaign, "c07"), vec![], false), None);
}

#[test]
fn the_kit_is_its_own_recipe_on_board_1_and_on_its_own_after() {
    // board 1's first win: its completion (Coins and the table), then the kit's recipe (which sets its mark)
    let o = pay::order("p-c01", "campaign c01", "first:campaign:c01", true, None, vec![], true).unwrap();
    assert_eq!(o.gifts, vec!["kit"]);
    assert_eq!(o.operations.len(), 1);
    assert_eq!(o.runs, vec![pay::Run { gift: "kit", recipe: pay::kit().1, nonce: "kit:helpers".into() }]);
    // a player already past board 1, replaying: no order at all, the kit's recipe alone
    let o = pay::order("p-c05", "campaign c05", "first:campaign:c05", false, None, vec![], true).unwrap();
    assert!(o.operations.is_empty());
    assert_eq!(o.gifts, vec!["kit"]);
    assert_eq!(o.runs[0].nonce, "kit:helpers");
}

#[test]
fn a_trips_last_board_with_the_kit_due_runs_both() {
    let o = pay::order("p-c15", "campaign c15", "first:campaign:c15", true, pay::gift_of(Lane::Campaign, "c15"), vec![], true).unwrap();
    assert_eq!(o.gifts, vec!["stamp", "kit"]);
    assert_eq!(o.operations.len(), 1);
    let keys: Vec<&str> = o.runs.iter().map(|r| r.nonce.as_str()).collect();
    assert_eq!(keys, vec!["first:campaign:c15:helpers", "kit:helpers"]);
}

#[test]
fn what_landed_and_the_bonus_are_read_from_the_receipt() {
    let k = ids();
    let c = |kind: &str| k["kinds"][kind]["currency"].as_str().unwrap().to_string();
    // a recipe's receipt (\`granted\`), as the platform answered the probe (2026-11-12)
    let granted = vec![
        json!({ "type": "currency", "currency_id": c("hint"), "bucket": "earned", "balance_before": 9, "balance_after": 10, "delta": 1 }),
        json!({ "type": "currency", "currency_id": c("undo"), "bucket": "earned", "balance_before": 10, "balance_after": 10, "delta": 0 }),
        json!({ "bonus_id": "vip", "outcome": "skipped", "reason": "requirement_unmet", "type": "bonus", "unmet": [{ "index": 0, "kind": "holds_pass" }] }),
    ];
    assert_eq!(pay::landed(&granted), json!({ "hint": 1, "undo": 0, "shuffle": 0 }));
    assert_eq!(pay::after(&granted), json!({ "hint": 10, "undo": 10 }));
    assert_eq!(pay::bonuses(&granted), vec![json!({ "outcome": "skipped", "reason": "requirement_unmet" })], "never which pass it asks for");
    assert!(!pay::applied(&granted));
    assert!(pay::applied(&[json!({ "type": "bonus", "bonus_id": "vip", "outcome": "applied" })]));
    assert_eq!(pay::none(), json!({ "hint": 0, "undo": 0, "shuffle": 0 }));
}

#[test]
fn the_daily_first_win_runs_its_weekdays_recipe() {
    let k = ids();
    // Monday first: 2026-11-02 a Monday, 2026-11-01 a Sunday
    assert_eq!(pay::daily_gift("2026-11-02").map(|g| g.1), k["rewards"]["daily"][0]["id"].as_str());
    assert_eq!(pay::daily_gift("2026-11-01").map(|g| g.1), k["rewards"]["daily"][6]["id"].as_str());
    assert_eq!(pay::daily_gift("2026-10-31").map(|g| g.0), Some("daily"));
    assert_eq!(pay::daily_gift("today"), None);
    let sat = pay::daily_gift("2026-10-31");
    let o = pay::order("p-daily", "daily 2026-10-31", "daily:2026-10-31", true, sat, vec![], false).unwrap();
    assert_eq!(o.nonce, "daily:2026-10-31");
    assert_eq!(o.gifts, vec!["daily"]);
    assert_eq!(o.operations.len(), 1);
    assert_eq!(o.runs[0].nonce, "daily:2026-10-31:helpers");
    // a second daily win the same day: nothing
    assert_eq!(pay::order("p-daily", "daily 2026-10-31", "daily:2026-10-31", false, sat, vec![], false), None);
}
