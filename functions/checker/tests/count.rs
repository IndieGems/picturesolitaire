//! The achievements' counters (src/count.rs), on this machine:
//!   cargo test --release --test count
//! tools/server/check.mts runs it with the vectors.

use checker::claim::{Lane, Win};
use checker::count::{self, Kind, Plan};
use checker::progress;
use serde_json::{json, Value};

/// Six boards in two trips of three: board 2 hard, board 3 super hard, board 5 super hard.
fn plan() -> Plan {
    count::plan_of(&json!({
        "counters": [
            { "slug": "levels_finished", "id": "id-levels", "counts": "levels" },
            { "slug": "trips_stamped", "id": "id-stamps", "counts": "stamps" },
            { "slug": "souvenirs_finished", "id": "id-souvenirs", "counts": "souvenirs" },
            { "slug": "hard_levels_won", "id": "id-hard", "counts": "hard" },
            { "slug": "super_hard_levels_won", "id": "id-super", "counts": "super" },
            { "slug": "dailies_won", "id": "id-dailies", "counts": "dailies" },
            { "slug": "from_a_later_checker", "id": "id-later", "counts": "something_new" }
        ],
        "marks": [null, "hard", "super", null, "super", null],
        "trips": [3, 6]
    }))
}

fn record(next: u64) -> Value {
    let mut d = progress::empty();
    d["campaign"] = json!({ "next": next, "won": next - 1 });
    d
}

fn of(d: &Value) -> Value {
    count::summary(d, &plan())
}

#[test]
fn a_counter_this_checker_cannot_count_is_never_written() {
    let p = plan();
    assert_eq!(p.counters.len(), 6);
    assert!(p.counters.iter().all(|c| c.slug != "from_a_later_checker"));
}

#[test]
fn a_new_player_counts_nothing_and_writes_nothing() {
    let d = progress::empty();
    assert_eq!(of(&d), json!({ "levels_finished": 0, "trips_stamped": 0, "souvenirs_finished": 0, "hard_levels_won": 0, "super_hard_levels_won": 0, "dailies_won": 0 }));
    assert!(count::operations(&d, &plan()).is_empty());
}

#[test]
fn the_campaign_counts_each_level_once_with_its_marks_and_stamps() {
    let p = plan();
    // boards 1 and 2 won (next 3): one level hard, no stamp yet
    assert_eq!(count::value(&record(3), &p, Kind::Levels), 2);
    assert_eq!(count::value(&record(3), &p, Kind::Hard), 1);
    assert_eq!(count::value(&record(3), &p, Kind::Super), 0);
    assert_eq!(count::value(&record(3), &p, Kind::Stamps), 0);
    // board 3 won: the first trip's stamp, and a super hard level (which is hard too)
    assert_eq!(count::value(&record(4), &p, Kind::Stamps), 1);
    assert_eq!(count::value(&record(4), &p, Kind::Super), 1);
    assert_eq!(count::value(&record(4), &p, Kind::Hard), 2);
    // all done (next = boards + 1), and a record that went round before the stop: no more than the campaign
    for next in [7, 40] {
        let d = record(next);
        assert_eq!(count::value(&d, &p, Kind::Levels), 6);
        assert_eq!(count::value(&d, &p, Kind::Stamps), 2);
        assert_eq!(count::value(&d, &p, Kind::Super), 2);
        assert_eq!(count::value(&d, &p, Kind::Hard), 3);
    }
}

#[test]
fn a_replay_moves_no_counter() {
    let p = plan();
    let mut d = record(5);
    let before = of(&d);
    let replay = Win { lane: Lane::Campaign, board: "b2".into(), date: None, moves: 9, shuffles: 0, ms: 60_000, pictures: vec![], claim_id: Some("k1".into()), n: Some(2), after: None };
    assert_eq!(progress::apply(&mut d, &replay, replay.claim_id.as_deref(), replay.n, 6), Ok(true));
    assert_eq!(d["campaign"]["won"], json!(5), "the replay is a win");
    assert_eq!(of(&d), before, "but counts nothing new");
    assert_eq!(count::value(&d, &p, Kind::Levels), 4);
}

#[test]
fn souvenirs_count_each_once() {
    let mut d = record(7);
    d["souvenir"] = json!({ "s1": 13, "s2": 15 });
    assert_eq!(count::value(&d, &plan(), Kind::Souvenirs), 2);
}

#[test]
fn dailies_count_one_a_date_and_keep_counting_past_the_pruned_dates() {
    let daily = |date: &str, id: &str| Win { lane: Lane::Daily, board: format!("d{date}"), date: Some(date.into()), moves: 12, shuffles: 0, ms: 80_000, pictures: vec![], claim_id: Some(id.into()), n: None, after: None };
    let mut d = progress::empty();
    // a record from before the running total: its dates count
    d["daily"] = json!({ "2026-10-01": { "moves": 10, "ms": 1 }, "2026-10-02": { "moves": 11, "ms": 1 } });
    assert_eq!(progress::dailies(&d), 2);
    progress::apply(&mut d, &daily("2026-10-03", "a"), Some("a"), None, 6).unwrap();
    assert_eq!(d["dailies"], json!(3));
    // the same date again, won again (a second win that day): no new daily
    progress::apply(&mut d, &daily("2026-10-03", "b"), Some("b"), None, 6).unwrap();
    assert_eq!(d["dailies"], json!(3));
    // the record keeps 100 dates; the total goes on past them
    for i in 0..120 {
        let date = format!("2027-{:02}-{:02}", 1 + i / 28, 1 + i % 28);
        progress::apply(&mut d, &daily(&date, &format!("c{i}")), Some(&format!("c{i}")), None, 6).unwrap();
    }
    assert!(d["daily"].as_object().unwrap().len() <= 100);
    assert_eq!(count::value(&d, &plan(), Kind::Dailies), 123);
}

#[test]
fn the_order_sets_each_counter_above_zero_to_its_value() {
    let mut d = record(4);
    d["souvenir"] = json!({ "s1": 13 });
    let ops = count::operations(&d, &plan());
    let set: Vec<(String, u64)> = ops.iter().map(|o| (o["progression_definition_id"].as_str().unwrap().into(), o["value"].as_u64().unwrap())).collect();
    assert_eq!(set, vec![("id-levels".into(), 3), ("id-stamps".into(), 1), ("id-souvenirs".into(), 1), ("id-hard".into(), 2), ("id-super".into(), 1)]);
    assert!(ops.iter().all(|o| o["type"] == "progression_max"), "never lowers a counter, never adds to one");
}

#[test]
fn the_verdict_lists_only_what_unlocked() {
    let changes = vec![
        json!({ "type": "progression", "progression_definition_id": "id-levels" }),
        json!({ "type": "achievement_unlocked", "achievement_id": "a1", "outcome": "unlocked", "points": 5, "principal": "function" }),
        json!({ "type": "achievement_unlocked", "achievement_id": "a2", "outcome": "suppressed", "reason": "channel=dev" }),
        json!({ "type": "achievement_unlocked", "achievement_id": "a3", "outcome": "already_unlocked" }),
    ];
    assert_eq!(count::unlocked(&changes), vec![json!({ "id": "a1", "points": 5 })]);
    assert_eq!(count::receipts(&changes), vec!["a1 unlocked", "a2 suppressed (channel=dev)", "a3 already_unlocked"]);
}

#[test]
fn the_compiled_plan_counts_every_kind_once() {
    let p = count::plan();
    let mut kinds: Vec<String> = p.counters.iter().map(|c| format!("{:?}", c.kind)).collect();
    kinds.sort();
    kinds.dedup();
    assert_eq!(kinds.len(), 6, "{kinds:?}");
    assert_eq!(p.trip_ends.len(), 10);
    assert_eq!(p.marks.len(), 150);
    assert!(p.counters.iter().all(|c| c.id.len() == 36));
}
