// THE DAILY SUITCASE (src/suitcase.rs): which item a date packs, the swap's choice of spares,
// the prize's one order, and the ids, held to Levels' src/content/levels/suitcases.json and
// to the game config.

use checker::suitcase::{self, No};
use serde_json::{json, Value};

fn root(p: &str) -> String {
    format!("{}/../../{p}", env!("CARGO_MANIFEST_DIR"))
}

fn read(p: &str) -> Value {
    serde_json::from_str(&std::fs::read_to_string(root(p)).unwrap()).unwrap()
}

/// The first month compiled in, and its counts as one slot vector from a list of (slot, copies).
fn first() -> suitcase::Month {
    suitcase::months().first().expect("a suitcase month")
}

fn held(m: suitcase::Month, copies: &[(usize, u64)]) -> Vec<Value> {
    copies.iter().map(|(i, q)| json!({ "item_definition_id": suitcase::uuid(m, *i), "quantity": q, "instance_id": format!("i{i}") })).collect()
}

#[test]
fn every_scheduled_day_packs_its_own_item_of_its_own_month() {
    let source = read("src/content/levels/suitcases.json");
    let months = source["months"].as_array().unwrap();
    assert_eq!(suitcase::months().len(), months.len());
    for src in months {
        let name = src["month"].as_str().unwrap();
        let m = suitcase::month(name).unwrap();
        assert_eq!(suitcase::items(m).len(), 10, "{name}: ten items");
        for (date, item) in src["days"].as_object().unwrap() {
            let (got, at) = suitcase::day(date).unwrap_or_else(|| panic!("{date} packs nothing"));
            assert_eq!(suitcase::name(got), name);
            assert_eq!(suitcase::items(m)[at]["id"], *item, "{date}");
        }
    }
    // a day outside every month packs nothing
    assert!(suitcase::day("2026-10-27").is_none());
    assert!(suitcase::current("2026-10-27").is_none());
}

#[test]
fn the_shelf_is_the_closed_months_newest_first() {
    let m = first();
    let after = suitcase::ends(m);
    // the day after the first month's last day: it is on the shelf, and the next month is open
    let next: Option<suitcase::Month> = suitcase::months().get(1);
    let open = next.and_then(|n| n["days"].as_object().unwrap().keys().min().cloned()).unwrap();
    assert!(open.as_str() > after);
    assert_eq!(suitcase::past(&open).iter().map(|p| suitcase::name(p)).collect::<Vec<_>>(), vec![suitcase::name(m)]);
    assert_eq!(suitcase::current(&open).map(suitcase::name), next.map(suitcase::name));
    // long after the last month: every month, newest first, at most twelve
    let shelf = suitcase::past("2099-01-01");
    assert!(shelf.len() <= 12 && shelf.len() == suitcase::months().len().min(12));
    assert!(shelf.windows(2).all(|w| suitcase::name(w[0]) > suitcase::name(w[1])));
}

#[test]
fn counts_come_from_the_items_held_and_ignore_other_items() {
    let m = first();
    let mut rows = held(m, &[(0, 2), (3, 1)]);
    rows.push(json!({ "item_definition_id": "dddb8ed0-cd23-52cb-ab6d-3585cbe523b7", "quantity": 1 })); // a table
    let c = suitcase::counts(m, &rows);
    assert_eq!(c, vec![2, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
    assert_eq!(suitcase::distinct(&c), 2);
    assert_eq!(suitcase::spare(&c), 1);
    assert!(!suitcase::complete(m, &c));
}

#[test]
fn a_pack_grants_the_item_and_moves_the_meter_to_the_items_held() {
    let m = first();
    let before = vec![1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let ops = suitcase::pack(m, 4, &before, "2026-11-05");
    assert_eq!(ops.len(), 2);
    assert_eq!(ops[0]["type"], "item_grant");
    assert_eq!(ops[0]["item_definition_id"], suitcase::uuid(m, 4));
    assert_eq!(ops[0]["quantity"], 1);
    assert_eq!(ops[1], json!({ "type": "progression_max", "progression_definition_id": suitcase::event().0, "value": 2, "reason": format!("suitcase {}: an item packed", suitcase::name(m)) }));
    // a duplicate: the meter stays
    assert_eq!(suitcase::pack(m, 0, &before, "2026-11-05")[1]["value"], 1);
    // the daily's first-win order carries them, after its mark; a replay carries nothing
    let o = checker::pay::order("p-daily", "daily 2026-11-05", "daily:2026-11-05", true, None, ops.clone(), false).unwrap();
    assert_eq!(&o.operations[1..3], &ops[..]);
    assert_eq!(checker::pay::order("p-daily", "daily 2026-11-05", "daily:2026-11-05", false, None, ops, false), None);
}

#[test]
fn the_receipt_says_the_count_after() {
    let m = first();
    let before = vec![1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let changes = vec![
        json!({ "type": "item", "item_definition_id": suitcase::uuid(m, 0), "quantity_before": 1, "quantity_after": 2 }),
        json!({ "type": "currency", "currency_id": "x", "delta": 1 }),
    ];
    assert_eq!(suitcase::after(m, &before, &changes)[0], 2);
    assert!(suitcase::granted(m, 0, &changes));
    assert!(!suitcase::granted(m, 1, &changes));
}

#[test]
fn a_swap_takes_three_spares_biggest_stacks_first_for_a_missing_item() {
    let m = first();
    // spares: slot 0 has 2, slot 2 has 1, slot 5 has 2 (5 in all); slot 7 is missing
    let c = vec![3, 1, 2, 0, 1, 3, 1, 0, 1, 1];
    assert_eq!(suitcase::take(&c, 3), Some(vec![2, 0, 0, 0, 0, 1, 0, 0, 0, 0]));
    let o = suitcase::swap(m, &c, 7).unwrap();
    let removed: Vec<(String, u64)> = o.operations.iter().filter(|op| op["type"] == "item_remove").map(|op| (op["item_definition_id"].as_str().unwrap().into(), op["quantity"].as_u64().unwrap())).collect();
    assert_eq!(removed, vec![(suitcase::uuid(m, 0).into(), 2), (suitcase::uuid(m, 5).into(), 1)]);
    assert!(o.operations.iter().filter(|op| op["type"] == "item_remove").all(|op| op["overflow"] == "fail"));
    let given: Vec<&Value> = o.operations.iter().filter(|op| op["type"] == "item_grant").collect();
    assert_eq!(given.len(), 1);
    assert_eq!(given[0]["item_definition_id"], suitcase::uuid(m, 7));
    // the meter: 8 held before, 9 after
    assert_eq!(o.operations.last().unwrap()["value"], 9);
    // never a first copy: what is left holds every item it held
    let left: Vec<u32> = c.iter().zip(suitcase::take(&c, 3).unwrap()).map(|(n, t)| n - t).collect();
    assert!(c.iter().zip(&left).all(|(b, a)| (*b > 0) == (*a > 0)));
}

#[test]
fn a_swap_is_refused_for_an_item_held_or_too_few_spares() {
    let m = first();
    assert_eq!(suitcase::swap(m, &[2, 2, 1, 0, 0, 0, 0, 0, 0, 0], 3).unwrap_err(), No::Short);
    assert_eq!(suitcase::swap(m, &[4, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0).unwrap_err(), No::Has);
    assert!(suitcase::swap(m, &[4, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1).is_ok());
}

#[test]
fn two_swaps_decided_from_the_same_counts_share_a_nonce() {
    let m = first();
    let c = vec![2, 2, 2, 0, 0, 0, 0, 0, 0, 0];
    let a = suitcase::swap(m, &c, 3).unwrap();
    let b = suitcase::swap(m, &c, 4).unwrap();
    assert_eq!(a.nonce, b.nonce, "the second is refused, and decided again from fresh counts");
    let fresh = vec![1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
    assert_ne!(suitcase::swap(m, &[4, 1, 1, 1, 0, 0, 0, 0, 0, 0], 4).unwrap().nonce, a.nonce);
    assert_eq!(suitcase::swap(m, &fresh, 4).unwrap_err(), No::Short);
}

#[test]
fn the_prize_is_one_order_of_the_months_mark_its_table_and_the_helpers() {
    let ids = read("src/net/suitcase-ids.json");
    for m in suitcase::months() {
        let o = suitcase::prize(m);
        assert_eq!(o.nonce, format!("prize:{}", suitcase::name(m)));
        assert_eq!(o.gifts, vec!["suitcase"]);
        assert_eq!(o.operations[0]["type"], "progression_max");
        assert_eq!(o.operations[0]["progression_definition_id"], suitcase::mark(m));
        let tables = o.operations.iter().filter(|op| op["type"] == "item_grant").count();
        assert_eq!(tables, if suitcase::table(m).is_some() { 1 } else { 0 });
        let helpers: u64 = o.operations.iter().filter(|op| op["type"] == "currency_grant").map(|op| op["amount"].as_u64().unwrap()).sum();
        let want: u64 = ["hint", "undo", "shuffle"].iter().map(|k| ids["prize"][k].as_u64().unwrap()).sum();
        assert_eq!(helpers, want);
        assert!(o.operations.iter().filter(|op| op["type"] == "currency_grant").all(|op| op["overflow"] == "clamp"));
    }
}

#[test]
fn the_state_lists_counts_held_and_the_prize() {
    let m = first();
    let c = vec![2, 0, 1, 0, 0, 0, 0, 0, 0, 0];
    let s = suitcase::state(m, &c, false);
    assert_eq!(s["month"], suitcase::name(m));
    assert_eq!(s["items"].as_array().unwrap().len(), 10);
    assert_eq!(s["counts"].as_object().unwrap().len(), 2);
    assert_eq!(s["counts"][suitcase::items(m)[0]["id"].as_str().unwrap()], 2);
    assert_eq!(s["complete"], false);
    assert_eq!(s["ends"], suitcase::ends(m));
    let full = vec![1; 10];
    assert_eq!(suitcase::state(m, &full, true)["complete"], true);
}

#[test]
fn every_suitcase_id_is_the_configs() {
    let config = std::fs::read_to_string(root("gem-backend-game-config.yaml")).unwrap();
    let (event, slug) = suitcase::event();
    assert!(config.contains(&format!("- id: {event}\n    slug: {slug}")), "the monthly challenge");
    for m in suitcase::months() {
        assert!(config.contains(&format!("- id: {}\n", suitcase::mark(m))), "{}'s prize mark", suitcase::name(m));
        for (i, item) in suitcase::items(m).iter().enumerate() {
            assert!(config.contains(&format!("- id: {}\n    slug: {}\n", suitcase::uuid(m, i), item["id"].as_str().unwrap())), "{}", item["id"]);
        }
        if let Some(t) = suitcase::table(m) {
            assert!(config.contains(&format!("    slug: {t}\n")), "{t}");
        }
        assert!(config.contains(&format!("\"{}\"", suitcase::name(m))), "{} is a declared value of the suitcase events' month", suitcase::name(m));
    }
}
