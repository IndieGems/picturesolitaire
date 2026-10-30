// THE EVENTS (src/suitcase.rs; docs/vip.md): VIP packs of 30 levels, each with 10 items hidden one per
// level. Which level hides which item, when an event opens, what a pack and the prize write, and the
// ids, held to Levels' src/content/levels/events.json and event-levels.json and to the game config.
// The switch is on FOR VIPS: the first tests hold every way an event pays shut for anyone else; the
// rest test the mechanics. While the events are still in their two-week shape (no levels yet), the
// tests that walk the levels have none to walk.

use checker::suitcase;
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

/// Counts of the event's slots, all `v`.
fn all(e: suitcase::Event, v: u32) -> Vec<u32> {
    vec![v; suitcase::items(e).len()]
}

#[test]
fn the_events_are_on_for_vips_only() {
    let ids = read("src/net/suitcase-ids.json");
    assert_eq!(suitcase::on(), ids["on"] == json!(true));
    assert!(!suitcase::open(false), "never for a player who is not VIP");
    assert_eq!(suitcase::open(true), suitcase::on());
}

#[test]
fn no_prize_for_a_player_who_is_not_vip_however_full_the_suitcase() {
    for e in suitcase::events() {
        assert!(suitcase::prize(e, false).is_none(), "{}", suitcase::name(e));
        assert_eq!(suitcase::prize(e, true).is_some(), suitcase::on());
    }
}

#[test]
fn an_event_opens_on_its_release_date_and_never_closes() {
    for e in suitcase::events() {
        let r = suitcase::release(e);
        assert_eq!(r.len(), 10, "{}: a release date", suitcase::name(e));
        assert!(suitcase::released(e, r), "open on the day itself");
        assert!(suitcase::released(e, "2099-12-31"), "and for good after it");
        assert!(!suitcase::released(e, "2000-01-01"), "not before");
    }
    // events are in release order, and the shelf shows the released ones, newest first
    let dates: Vec<&str> = suitcase::events().iter().map(|e| suitcase::release(e)).collect();
    let mut sorted = dates.clone();
    sorted.sort();
    assert_eq!(dates, sorted, "events.json lists events in release order");
    let shown: Vec<&str> = suitcase::shown("2099-01-01").iter().map(|e| suitcase::release(e)).collect();
    let mut newest = dates.clone();
    newest.reverse();
    assert_eq!(shown, newest);
    let early = suitcase::shown(dates[0]);
    assert!(early.iter().all(|e| suitcase::release(e) <= dates[0]), "nothing released later shows early");
    assert!(suitcase::shown("2000-01-01").is_empty());
}

#[test]
fn every_item_is_in_one_level_of_its_own_event_and_that_level_holds_its_picture() {
    let boards = std::fs::read_to_string(root("src/content/levels/event-levels.json")).ok().map(|t| serde_json::from_str::<Value>(&t).unwrap());
    for e in suitcase::events() {
        for (slot, item) in suitcase::items(e).iter().enumerate() {
            let Some(level) = item["level"].as_str() else { continue };
            assert_eq!(suitcase::of_level(level).map(suitcase::name), Some(suitcase::name(e)));
            assert_eq!(suitcase::item_at(e, level), Some(slot), "{level} hides {}", item["id"]);
            assert!(suitcase::position(e, level) >= 1);
            let b = boards.as_ref().and_then(|b| b["levels"].as_array().unwrap().iter().find(|l| l["id"] == level)).expect("its level's board");
            assert!(b["pictures"].as_array().unwrap().iter().any(|p| p["id"] == item["id"]), "{level}: {} among its pictures", item["id"]);
        }
        // a level with no item packs nothing
        for l in suitcase::levels(e) {
            let l = l.as_str().unwrap();
            let hides = suitcase::items(e).iter().filter(|i| i["level"] == l).count();
            assert!(hides <= 1, "{l} hides one item at most");
            assert_eq!(suitcase::item_at(e, l).is_some(), hides == 1);
            assert_eq!(suitcase::of_level(l).map(suitcase::name), Some(suitcase::name(e)));
        }
    }
    assert!(suitcase::of_level("c01").is_none() && suitcase::of_level("d2026-10-15").is_none(), "no campaign board or daily is an event's");
}

#[test]
fn no_daily_carries_an_item_any_more() {
    // the events left the dailies (docs/vip.md, 2026-10-30): the checker packs nothing from one
    // (lib.rs), and once Levels has lifted them, none names one
    let daily = read("src/content/levels/daily.json");
    let named = daily["levels"].as_array().unwrap().iter().filter(|l| l["item"].is_object()).count();
    let reshaped = suitcase::events().iter().any(|e| !suitcase::levels(e).is_empty());
    if reshaped {
        assert_eq!(named, 0, "daily boards that still name an event item");
    }
}

#[test]
fn counts_come_from_the_items_held_and_ignore_other_items() {
    let e = first();
    let mut rows = held(e, &[(0, 1), (2, 1)]);
    rows.push(json!({ "item_definition_id": "someone-elses-item", "quantity": 4 }));
    let c = suitcase::counts(e, &rows);
    assert_eq!(c.len(), suitcase::items(e).len());
    assert_eq!((c[0], c[1], c[2]), (1, 0, 1));
    assert_eq!(suitcase::found(&c), 2);
    assert!(!suitcase::complete(e, &c));
    assert!(suitcase::complete(e, &all(e, 1)), "every item held, one each");
}

#[test]
fn a_pack_grants_the_one_item_and_the_receipt_says_the_count_after() {
    let e = first();
    let ops = suitcase::pack(e, 1, "x-01");
    assert_eq!(ops.len(), 1);
    assert_eq!(ops[0]["type"], "item_grant");
    assert_eq!(ops[0]["item_definition_id"], suitcase::uuid(e, 1));
    assert_eq!(ops[0]["quantity"], 1);
    assert_eq!(ops[0]["overflow"], "clamp", "a copy held already stays one");
    let changes = vec![json!({ "type": "item", "item_definition_id": suitcase::uuid(e, 1), "quantity_before": 0, "quantity_after": 1 })];
    let now = suitcase::after(e, &all(e, 0), &changes);
    assert_eq!(now[1], 1);
    assert_eq!(suitcase::found(&now), 1);
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
fn the_state_lists_the_levels_the_items_found_and_the_prize() {
    let e = first();
    let mut c = all(e, 0);
    c[0] = 1;
    c[2] = 1;
    let s = suitcase::state(e, &c, false);
    assert_eq!(s["id"], suitcase::name(e));
    assert_eq!(s["release"], suitcase::release(e));
    assert_eq!(s["levels"].as_array().unwrap().len(), suitcase::levels(e).len());
    let items = s["items"].as_array().unwrap();
    assert_eq!(items.len(), suitcase::items(e).len());
    assert_eq!((items[0]["found"].clone(), items[1]["found"].clone(), items[2]["found"].clone()), (json!(true), json!(false), json!(true)));
    assert_eq!(items[0]["id"], suitcase::items(e)[0]["id"]);
    assert_eq!(items[0]["level"], suitcase::items(e)[0]["level"]);
    assert_eq!(s["found"], 2);
    assert_eq!(s["complete"], false);
    assert!(s.get("days").is_none() && s.get("counts").is_none(), "no days and no spares any more");
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
        for l in suitcase::levels(e) {
            assert!(config.contains(&format!("    slug: board_{}\n", l.as_str().unwrap())), "{l}'s Coins progression");
        }
        assert!(config.contains(&format!("\"{}\"", suitcase::name(e))), "{} is a declared value of the event analytics' event", suitcase::name(e));
    }
    for id in ["event_item", "event_complete"] {
        assert!(config.contains(&format!("  - id: {id}\n")), "the analytics event {id} is declared");
    }
    assert!(config.contains(&format!("- id: {}\n    slug: daily_archive\n", checker::ARCHIVE_ID)), "the daily archive's progression");
}
