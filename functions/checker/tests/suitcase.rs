// THE EVENT (src/suitcase.rs; docs/vip.md): two weeks of dailies, for VIPs only. Which item a date
// packs, the swap's choice of spares, the prize's one order, and the ids, held to Levels'
// src/content/levels/events.json and to the game config. The switch is on FOR VIPS: the first
// tests hold every way the event pays shut for anyone else; the rest test the mechanics.

use checker::suitcase::{self, No};
use serde_json::{json, Value};

fn root(p: &str) -> String {
    format!("{}/../../{p}", env!("CARGO_MANIFEST_DIR"))
}

fn read(p: &str) -> Value {
    serde_json::from_str(&std::fs::read_to_string(root(p)).unwrap()).unwrap()
}

/// The first event compiled in.
fn first() -> suitcase::Event {
    suitcase::events().first().expect("an event")
}

fn held(e: suitcase::Event, copies: &[(usize, u64)]) -> Vec<Value> {
    copies.iter().map(|(i, q)| json!({ "item_definition_id": suitcase::uuid(e, *i), "quantity": q, "instance_id": format!("i{i}") })).collect()
}

/// Every date some event's schedule holds, and a day outside them all.
fn every_date() -> Vec<String> {
    let mut dates: Vec<String> = suitcase::events().iter().flat_map(|e| e["days"].as_object().unwrap().keys().cloned()).collect();
    dates.sort();
    dates.extend(["2026-10-31".to_string(), "2099-01-01".to_string()]);
    dates
}

/// A player holding everything: every item of every event, with spares (a team account on dev).
fn holding_everything() -> Vec<Value> {
    suitcase::events()
        .iter()
        .flat_map(|e| (0..suitcase::items(e).len()).map(move |i| json!({ "item_definition_id": suitcase::uuid(e, i), "quantity": 5 })))
        .collect()
}

/// Counts of n slots, all `v`.
fn all(e: suitcase::Event, v: u32) -> Vec<u32> {
    vec![v; suitcase::items(e).len()]
}

#[test]
fn the_event_is_on_for_vips_only() {
    // the creator, 2026-10-30 (docs/vip.md): the event returns, two weeks long, for VIPs only
    assert!(suitcase::on(), "src/net/suitcase-ids.json turns the event off, but it is on for VIPs");
    assert_eq!(read("src/net/suitcase-ids.json")["on"], json!(true), "the switch is written out, true");
    assert!(suitcase::open(true));
    assert!(!suitcase::open(false), "a player who is not VIP never has the event open");
    assert_eq!(read("src/net/suitcase-ids.json")["spares"], json!(2), "a swap takes 2 spares");
}

#[test]
fn a_daily_win_grants_no_item_to_a_player_who_is_not_vip() {
    let marks: Vec<&str> = suitcase::events().iter().map(|e| suitcase::mark(e)).collect();
    for date in every_date() {
        assert!(suitcase::to_pack(&date, false).is_none(), "{date} packs an item");
        let mut asked = false;
        let (ops, before) = suitcase::daily_extras(&date, false, || -> Result<Vec<Value>, ()> {
            asked = true;
            Ok(holding_everything())
        })
        .unwrap();
        assert!(ops.is_empty() && before.is_none(), "{date}: the daily's first win adds {ops:?}");
        assert!(!asked, "{date}: the player's items are read for an event not open to them");
        // the daily's first win, as the checker orders it: its own mark and its own helper, and
        // nothing of the event (no item, no prize mark, no table)
        let o = checker::pay::order(checker::DAILY_ID, &format!("daily {date}"), &format!("daily:{date}"), true, checker::pay::daily_gift(&date), ops, false).unwrap();
        assert!(o.operations.iter().all(|op| op["type"] != "item_grant" && op["type"] != "item_remove"), "{date}: {:?}", o.operations);
        assert!(o.operations.iter().all(|op| !marks.iter().any(|k| op["progression_definition_id"] == *k)), "{date}: {:?}", o.operations);
        assert_eq!(o.operations[0]["progression_definition_id"], checker::DAILY_ID, "{date}: the daily's own mark");
        assert!(!o.gifts.contains(&"suitcase"), "{date}");
    }
}

#[test]
fn no_swap_and_no_prize_for_a_player_who_is_not_vip() {
    for e in suitcase::events() {
        // a full suitcase with spares, as a team account may hold: still no prize
        assert_eq!(suitcase::prize(e, false), None, "{}'s prize", suitcase::name(e));
        // spares enough for a missing item: still no swap
        let mut c = all(e, 5);
        c[3] = 0;
        assert_eq!(suitcase::swap(e, &c, 3, false).unwrap_err(), No::Off, "{}", suitcase::name(e));
        // a VIP's: both made
        assert!(suitcase::prize(e, true).is_some());
        assert!(suitcase::swap(e, &c, 3, true).is_ok());
    }
}

#[test]
fn a_vips_event_day_packs_its_own_item_of_its_own_event() {
    let source = read("src/content/levels/events.json");
    let events = source["events"].as_array().unwrap();
    assert_eq!(suitcase::events().len(), events.len());
    for src in events {
        let name = src["id"].as_str().unwrap();
        let e = suitcase::event(name).unwrap();
        assert_eq!(src["days"].as_object().unwrap().len(), 14, "{name}: two weeks");
        assert_eq!(suitcase::starts(e), src["start"].as_str().unwrap());
        assert_eq!(suitcase::ends(e), src["end"].as_str().unwrap());
        for (date, item) in src["days"].as_object().unwrap() {
            let (got, at) = suitcase::to_pack(date, true).unwrap_or_else(|| panic!("{date} packs nothing"));
            assert_eq!(suitcase::name(got), name);
            assert_eq!(suitcase::items(e)[at]["id"], *item, "{date}");
            assert_eq!(suitcase::current(date).map(suitcase::name), Some(name));
            let (ops, before) = suitcase::daily_extras(date, true, || -> Result<Vec<Value>, ()> { Ok(Vec::new()) }).unwrap();
            assert_eq!(ops, suitcase::pack(e, at, date));
            assert_eq!(before, Some(all(e, 0)));
        }
        assert!(suitcase::day_of_event(e, suitcase::starts(e)) == 1 && suitcase::day_of_event(e, suitcase::ends(e)) == 14);
    }
    // a day outside every event packs nothing
    assert!(suitcase::day("2026-10-31").is_none() && suitcase::to_pack("2026-10-31", true).is_none());
    assert!(suitcase::current("2026-10-31").is_none());
}

#[test]
fn the_archive_is_the_closed_events_newest_first_and_only_begun_ones_swap() {
    let e = first();
    let after = checker::vip::add_days(suitcase::ends(e), 1).unwrap();
    assert!(suitcase::past(&after).iter().any(|p| suitcase::name(p) == suitcase::name(e)));
    assert!(!suitcase::past(suitcase::ends(e)).iter().any(|p| suitcase::name(p) == suitcase::name(e)), "its last day is still open");
    assert!(suitcase::begun(e, suitcase::starts(e)) && suitcase::begun(e, &after));
    assert!(!suitcase::begun(e, &checker::vip::add_days(suitcase::starts(e), -1).unwrap()), "an event to come is not swapped in");
    let shelf = suitcase::past("2099-01-01");
    assert!(shelf.len() <= 12 && shelf.len() == suitcase::events().len().min(12));
    assert!(shelf.windows(2).all(|w| suitcase::starts(w[0]) > suitcase::starts(w[1])));
}

#[test]
fn counts_come_from_the_items_held_and_ignore_other_items() {
    let e = first();
    let mut rows = held(e, &[(0, 2), (3, 1)]);
    rows.push(json!({ "item_definition_id": "dddb8ed0-cd23-52cb-ab6d-3585cbe523b7", "quantity": 1 })); // a table
    let c = suitcase::counts(e, &rows);
    let mut want = all(e, 0);
    want[0] = 2;
    want[3] = 1;
    assert_eq!(c, want);
    assert_eq!(suitcase::distinct(&c), 2);
    assert_eq!(suitcase::spare(&c), 1);
    assert!(!suitcase::complete(e, &c));
}

#[test]
fn a_pack_grants_the_item() {
    let e = first();
    let ops = suitcase::pack(e, 4, "2026-11-05");
    assert_eq!(ops.len(), 1);
    assert_eq!(ops[0]["type"], "item_grant");
    assert_eq!(ops[0]["item_definition_id"], suitcase::uuid(e, 4));
    assert_eq!(ops[0]["quantity"], 1);
    // the daily's first-win order carries it, after its mark; a replay carries nothing
    let o = checker::pay::order("p-daily", "daily 2026-11-05", "daily:2026-11-05", true, None, ops.clone(), false).unwrap();
    assert_eq!(&o.operations[1..2], &ops[..]);
    assert_eq!(checker::pay::order("p-daily", "daily 2026-11-05", "daily:2026-11-05", false, None, ops, false), None);
}

#[test]
fn the_receipt_says_the_count_after() {
    let e = first();
    let mut before = all(e, 0);
    before[0] = 1;
    let changes = vec![
        json!({ "type": "item", "item_definition_id": suitcase::uuid(e, 0), "quantity_before": 1, "quantity_after": 2 }),
        json!({ "type": "currency", "currency_id": "x", "delta": 1 }),
    ];
    assert_eq!(suitcase::after(e, &before, &changes)[0], 2);
    assert!(suitcase::granted(e, 0, &changes));
    assert!(!suitcase::granted(e, 1, &changes));
}

#[test]
fn a_swap_takes_two_spares_biggest_stacks_first_for_a_missing_item() {
    let e = first();
    assert!(suitcase::items(e).len() >= 7);
    // spares: slot 0 has 2, slot 2 has 1, slot 5 has 2; slot 6 is missing
    let mut c = all(e, 1);
    c[0] = 3;
    c[2] = 2;
    c[5] = 3;
    c[6] = 0;
    let mut took = vec![0; c.len()];
    took[0] = 1;
    took[5] = 1;
    assert_eq!(suitcase::take(&c, 2), Some(took.clone()));
    let o = suitcase::swap_order(e, &c, 6).unwrap();
    let removed: Vec<(String, u64)> = o.operations.iter().filter(|op| op["type"] == "item_remove").map(|op| (op["item_definition_id"].as_str().unwrap().into(), op["quantity"].as_u64().unwrap())).collect();
    assert_eq!(removed, vec![(suitcase::uuid(e, 0).into(), 1), (suitcase::uuid(e, 5).into(), 1)]);
    assert!(o.operations.iter().filter(|op| op["type"] == "item_remove").all(|op| op["overflow"] == "fail"));
    let given: Vec<&Value> = o.operations.iter().filter(|op| op["type"] == "item_grant").collect();
    assert_eq!(given.len(), 1);
    assert_eq!(given[0]["item_definition_id"], suitcase::uuid(e, 6));
    // never a first copy: what is left holds every item it held
    let left: Vec<u32> = c.iter().zip(&took).map(|(n, t)| n - t).collect();
    assert!(c.iter().zip(&left).all(|(b, a)| (*b > 0) == (*a > 0)));
}

#[test]
fn a_swap_is_refused_for_an_item_held_or_too_few_spares() {
    let e = first();
    let mut one = all(e, 0);
    one[0] = 2;
    assert_eq!(suitcase::swap_order(e, &one, 3).unwrap_err(), No::Short);
    let mut three = all(e, 0);
    three[0] = 3;
    assert_eq!(suitcase::swap_order(e, &three, 0).unwrap_err(), No::Has);
    assert!(suitcase::swap_order(e, &three, 1).is_ok());
}

#[test]
fn two_swaps_decided_from_the_same_counts_share_a_nonce() {
    let e = first();
    let mut c = all(e, 0);
    c[0] = 2;
    c[1] = 2;
    let a = suitcase::swap_order(e, &c, 3).unwrap();
    let b = suitcase::swap_order(e, &c, 4).unwrap();
    assert_eq!(a.nonce, b.nonce, "the second is refused, and decided again from fresh counts");
    let mut other = c.clone();
    other[0] = 4;
    assert_ne!(suitcase::swap_order(e, &other, 4).unwrap().nonce, a.nonce);
}

#[test]
fn the_prize_is_one_order_of_the_events_mark_its_table_and_the_helpers() {
    let ids = read("src/net/suitcase-ids.json");
    for e in suitcase::events() {
        let o = suitcase::prize_order(e);
        assert_eq!(o.nonce, format!("prize:{}", suitcase::name(e)));
        assert_eq!(o.gifts, vec!["suitcase"]);
        assert_eq!(o.operations[0]["type"], "progression_max");
        assert_eq!(o.operations[0]["progression_definition_id"], suitcase::mark(e));
        let tables = o.operations.iter().filter(|op| op["type"] == "item_grant").count();
        assert_eq!(tables, if suitcase::table(e).is_some() { 1 } else { 0 });
        let helpers: u64 = o.operations.iter().filter(|op| op["type"] == "currency_grant").map(|op| op["amount"].as_u64().unwrap()).sum();
        let want: u64 = ["hint", "undo", "shuffle"].iter().map(|k| ids["prize"][k].as_u64().unwrap()).sum();
        assert_eq!(helpers, want);
        assert!(o.operations.iter().filter(|op| op["type"] == "currency_grant").all(|op| op["overflow"] == "clamp"));
    }
}

#[test]
fn the_state_lists_counts_held_and_the_prize() {
    let e = first();
    let mut c = all(e, 0);
    c[0] = 2;
    c[2] = 1;
    let s = suitcase::state(e, &c, false);
    assert_eq!(s["id"], suitcase::name(e));
    assert_eq!(s["month"], suitcase::name(e), "for a build from before the events");
    assert_eq!(s["items"].as_array().unwrap().len(), suitcase::items(e).len());
    assert_eq!(s["days"].as_object().unwrap().len(), 14);
    assert_eq!(s["counts"].as_object().unwrap().len(), 2);
    assert_eq!(s["counts"][suitcase::items(e)[0]["id"].as_str().unwrap()], 2);
    assert_eq!(s["complete"], false);
    assert_eq!((s["start"].as_str().unwrap(), s["ends"].as_str().unwrap()), (suitcase::starts(e), suitcase::ends(e)));
    assert_eq!(suitcase::state(e, &all(e, 1), true)["complete"], true);
}

#[test]
fn every_event_id_is_the_configs() {
    let config = std::fs::read_to_string(root("gem-backend-game-config.yaml")).unwrap();
    for e in suitcase::events() {
        assert!(config.contains(&format!("- id: {}\n", suitcase::mark(e))), "{}'s prize mark", suitcase::name(e));
        for (i, item) in suitcase::items(e).iter().enumerate() {
            assert!(config.contains(&format!("- id: {}\n    slug: {}\n", suitcase::uuid(e, i), item["id"].as_str().unwrap())), "{}", item["id"]);
        }
        if let Some(t) = suitcase::table(e) {
            // the id the prize grants is the config's item of that slug
            let id = e["table"]["uuid"].as_str().unwrap();
            assert!(config.contains(&format!("- id: {id}\n    slug: {t}\n")), "{}'s table {t} ({id})", suitcase::name(e));
        }
        assert!(config.contains(&format!("\"{}\"", suitcase::name(e))), "{} is a declared value of the event analytics' event", suitcase::name(e));
    }
    assert!(config.contains(&format!("- id: {}\n    slug: daily_archive\n", checker::ARCHIVE_ID)), "the daily archive's progression");
}
