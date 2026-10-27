// What a verified win pays (src/pay.rs): the gifts by board, the one order, and the
// ids it names, held to the config and to src/net/helper-ids.json.

use checker::claim::{Lane, SHUFFLES};
use checker::pay;
use serde_json::{json, Value};

fn root(p: &str) -> String {
    format!("{}/../../{p}", env!("CARGO_MANIFEST_DIR"))
}

fn ids() -> Value {
    serde_json::from_str(&std::fs::read_to_string(root("src/net/helper-ids.json")).unwrap()).unwrap()
}

#[test]
fn a_line_may_hold_a_full_pouch_of_shuffles_and_more_bought_mid_board() {
    assert_eq!(pay::cap(), 10);
    assert!(SHUFFLES >= 10 * pay::cap());
}

#[test]
fn hard_boards_give_the_hard_gift_and_a_trips_last_board_the_stamp_gift() {
    assert_eq!(pay::gift_of(Lane::Campaign, "c01"), None);
    assert_eq!(pay::gift_of(Lane::Campaign, "c07"), Some("hard"));
    assert_eq!(pay::gift_of(Lane::Campaign, "c15"), Some("stamp")); // hard, and the end of trip 1: the stamp wins
    assert_eq!(pay::gift_of(Lane::Campaign, "c20"), Some("hard")); // super, mid-trip
    assert_eq!(pay::gift_of(Lane::Campaign, "c30"), Some("stamp"));
    assert_eq!(pay::gift_of(Lane::Campaign, "c90"), Some("stamp"));
    assert_eq!(pay::gift_of(Lane::Campaign, "c02"), None);
    assert_eq!(pay::gift_of(Lane::Challenge, "ch01"), None);
}

#[test]
fn every_board_progression_id_is_the_configs() {
    let config = std::fs::read_to_string(root("gem-backend-game-config.yaml")).unwrap();
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
}

#[test]
fn a_first_win_of_a_hard_board_marks_it_and_pays_its_gift_in_one_order() {
    let o = pay::order("p-c07", "campaign c07", "first:campaign:c07", true, Some("hard"), false).unwrap();
    assert_eq!(o.nonce, "first:campaign:c07");
    assert_eq!(o.gifts, vec!["hard"]);
    let k = ids();
    assert_eq!(o.operations[0], json!({ "type": "progression_max", "progression_definition_id": "p-c07", "value": 1, "reason": "campaign c07 verified win" }));
    let grants: Vec<(String, u64)> = o.operations[1..].iter().map(|op| (op["currency_id"].as_str().unwrap().to_string(), op["amount"].as_u64().unwrap())).collect();
    assert_eq!(grants, vec![(k["kinds"]["hint"]["currency"].as_str().unwrap().into(), 1), (k["kinds"]["undo"]["currency"].as_str().unwrap().into(), 1)]);
    assert!(o.operations[1..].iter().all(|op| op["bucket"] == "earned" && op["overflow"] == "clamp"));
}

#[test]
fn a_replay_pays_nothing_and_writes_nothing() {
    assert_eq!(pay::order("p-c07", "campaign c07", "first:campaign:c07", false, Some("hard"), false), None);
}

#[test]
fn the_kit_comes_with_its_mark_on_board_1_and_on_its_own_after() {
    // board 1's first win: its completion (Coins and the table), the kit's mark, 3 of each
    let o = pay::order("p-c01", "campaign c01", "first:campaign:c01", true, None, true).unwrap();
    assert_eq!(o.nonce, "first:campaign:c01");
    assert_eq!(o.gifts, vec!["kit"]);
    assert_eq!(o.operations.len(), 5);
    assert_eq!(o.operations[1]["progression_definition_id"], pay::kit_mark().0);
    assert!(o.operations[2..].iter().all(|op| op["amount"] == 3));
    // a player already past board 1, replaying: the kit alone, under its own nonce
    let o = pay::order("p-c05", "campaign c05", "first:campaign:c05", false, None, true).unwrap();
    assert_eq!(o.nonce, "kit");
    assert_eq!(o.gifts, vec!["kit"]);
    assert_eq!(o.operations.len(), 4);
}

#[test]
fn a_trips_last_board_with_the_kit_due_pays_both() {
    let o = pay::order("p-c15", "campaign c15", "first:campaign:c15", true, Some("stamp"), true).unwrap();
    assert_eq!(o.gifts, vec!["stamp", "kit"]);
    // mark, kit mark, stamp 1/1/1, kit 3/3/3
    assert_eq!(o.operations.len(), 8);
}

#[test]
fn what_landed_is_read_from_the_receipt_after_the_clamp() {
    let k = ids();
    let c = |kind: &str| k["kinds"][kind]["currency"].as_str().unwrap().to_string();
    let changes = vec![
        json!({ "type": "currency", "currency_id": c("hint"), "bucket": "earned", "balance_before": 9, "balance_after": 10, "delta": 1 }),
        json!({ "type": "currency", "currency_id": c("undo"), "bucket": "earned", "balance_before": 10, "balance_after": 10, "delta": 0 }),
        json!({ "type": "platform_grant", "granted": 30 }),
    ];
    assert_eq!(pay::landed(&changes), json!({ "hint": 1, "undo": 0, "shuffle": 0 }));
    assert_eq!(pay::none(), json!({ "hint": 0, "undo": 0, "shuffle": 0 }));
}
