//! The progress record's rules (src/progress.rs), on this machine:
//!   cargo test --release --test progress
//! tools/server/check.mts runs it with the vectors.

use checker::claim::{Lane, Win};
use checker::progress::{self, Wait};
use serde_json::json;

fn win(lane: Lane, board: &str, moves: u32, pictures: &[&str]) -> Win {
    Win {
        lane,
        board: board.into(),
        date: None,
        moves,
        shuffles: 0,
        ms: 90_000,
        pictures: pictures.iter().map(|p| p.to_string()).collect(),
        claim_id: None,
        n: None,
    }
}

#[test]
fn a_campaign_win_moves_the_next_board_and_restores_its_pictures() {
    let mut d = progress::empty();
    assert_eq!(progress::apply(&mut d, &win(Lane::Campaign, "c01", 7, &["a", "b"]), Some("k1"), Some(1)), Ok(true));
    assert_eq!(d["campaign"], json!({ "next": 2, "won": 1 }));
    assert_eq!(d["restored"], json!(["a", "b"]));
    // the same picture again is restored once
    progress::apply(&mut d, &win(Lane::Campaign, "c02", 9, &["b", "c"]), Some("k2"), Some(2)).unwrap();
    assert_eq!(d["restored"], json!(["a", "b", "c"]));
    assert_eq!(d["campaign"]["next"], 3);
}

#[test]
fn a_win_past_the_next_board_waits_for_the_one_before() {
    let mut d = progress::empty();
    assert_eq!(progress::apply(&mut d, &win(Lane::Campaign, "c03", 7, &["a"]), Some("k3"), Some(3)), Err(Wait::Order));
    assert_eq!(d["campaign"]["next"], 1, "nothing changed");
    assert_eq!(d["restored"], json!([]));
}

#[test]
fn replaying_an_earlier_board_counts_a_win_and_keeps_the_place() {
    let mut d = progress::empty();
    d["campaign"]["next"] = json!(5);
    progress::apply(&mut d, &win(Lane::Campaign, "c02", 7, &[]), Some("k"), Some(2)).unwrap();
    assert_eq!(d["campaign"], json!({ "next": 5, "won": 1 }));
}

#[test]
fn a_resent_claim_changes_nothing() {
    let mut d = progress::empty();
    let w = win(Lane::Campaign, "c01", 7, &["a"]);
    assert_eq!(progress::apply(&mut d, &w, Some("same"), Some(1)), Ok(true));
    let before = d.clone();
    assert_eq!(progress::apply(&mut d, &w, Some("same"), Some(1)), Ok(false));
    assert_eq!(d, before);
}

#[test]
fn the_record_remembers_only_the_last_claims() {
    let mut d = progress::empty();
    for i in 0..40 {
        progress::apply(&mut d, &win(Lane::Challenge, "ch01", 30, &[]), Some(&format!("k{i}")), None).unwrap();
    }
    assert_eq!(d["seen"].as_array().unwrap().len(), 32);
    assert_eq!(d["seen"][31], "k39");
}

#[test]
fn a_challenge_keeps_its_best() {
    let mut d = progress::empty();
    progress::apply(&mut d, &win(Lane::Challenge, "ch01", 20, &[]), Some("a"), None).unwrap();
    progress::apply(&mut d, &win(Lane::Challenge, "ch01", 25, &[]), Some("b"), None).unwrap();
    assert_eq!(d["challenge"]["ch01"], 20);
    progress::apply(&mut d, &win(Lane::Challenge, "ch01", 18, &[]), Some("c"), None).unwrap();
    assert_eq!(d["challenge"]["ch01"], 18);
    assert_eq!(d["campaign"], json!({ "next": 1, "won": 0 }), "the campaign is untouched");
}

#[test]
fn a_daily_keeps_its_first_result_and_only_recent_dates() {
    let mut d = progress::empty();
    let mut w = win(Lane::Daily, "d2026-10-24", 17, &["x"]);
    w.date = Some("2026-10-24".into());
    progress::apply(&mut d, &w, Some("a"), None).unwrap();
    w.moves = 12;
    progress::apply(&mut d, &w, Some("b"), None).unwrap();
    assert_eq!(d["daily"]["2026-10-24"], json!({ "moves": 17, "ms": 90000 }), "the first result stands");
    for day in 1..=120 {
        let mut w = win(Lane::Daily, "d", 10, &[]);
        w.date = Some(format!("2027-{:02}-{:02}", 1 + (day - 1) / 28, 1 + (day - 1) % 28));
        progress::apply(&mut d, &w, Some(&format!("d{day}")), None).unwrap();
    }
    let days = d["daily"].as_object().unwrap();
    assert_eq!(days.len(), 100);
    assert!(days.get("2026-10-24").is_none(), "the oldest dates leave first");
    assert!(days.get("2027-05-08").is_some(), "the newest stays");
}

#[test]
fn an_old_device_save_is_taken_in_once() {
    let old = json!({ "v": 1, "level": 7, "won": 9, "restored": ["a", "b", "a", 5, ""], "best": { "ch01": 20, "ch02": "x" }, "guide": 3 });
    let d = progress::import_legacy(&old);
    assert_eq!(d["campaign"], json!({ "next": 7, "won": 9 }));
    assert_eq!(d["restored"], json!(["a", "b"]));
    assert_eq!(d["challenge"], json!({ "ch01": 20 }));
    assert_eq!(d["imported"], json!({ "from": "campaign" }));
    // nonsense is taken in as nothing
    let d = progress::import_legacy(&json!({ "level": -3, "won": "many" }));
    assert_eq!(d["campaign"], json!({ "next": 1, "won": 0 }));
}

#[test]
fn a_damaged_record_reads_as_a_well_formed_one() {
    assert_eq!(progress::normal(Some(json!("nope"))), progress::empty());
    let d = progress::normal(Some(json!({ "campaign": { "next": 0 }, "restored": "x", "extra": 1 })));
    assert_eq!(d["campaign"]["next"], 1);
    assert_eq!(d["restored"], json!([]));
    assert_eq!(d["extra"], 1, "unknown fields are kept");
}
