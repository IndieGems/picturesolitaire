//! The progress record's rules (src/progress.rs), on this machine:
//!   cargo test --release --test progress
//! tools/server/check.mts runs it with the vectors.

use checker::claim::{Lane, Win};
use checker::progress::{self, Wait};
use serde_json::json;

/// A campaign far longer than any test here goes: no stop in the way.
fn apply(d: &mut serde_json::Value, w: &Win, id: Option<&str>, n: Option<u64>) -> Result<bool, Wait> {
    progress::apply(d, w, id, n, 1000)
}

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
        after: None,
    }
}

#[test]
fn a_souvenir_waits_for_its_trips_stamp_then_puts_its_sticker_in_the_record() {
    let mut d = progress::empty();
    d["campaign"] = json!({ "next": 15, "won": 14 }); // trip 1 (boards 1-15) one board short
    let s1 = Win { after: Some(15), ..win(Lane::Souvenir, "s1", 13, &["sv-a"]) };
    assert_eq!(apply(&mut d, &s1, Some("k1"), None), Err(Wait::Order));
    assert!(d.get("souvenir").is_none(), "nothing changes while it waits");
    d["campaign"] = json!({ "next": 16, "won": 15 }); // stamped
    assert_eq!(apply(&mut d, &s1, Some("k1"), None), Ok(true));
    assert_eq!(d["souvenir"], json!({ "s1": 13 }));
    assert_eq!(d["campaign"], json!({ "next": 16, "won": 15 }), "a Souvenir moves no campaign position");
    // a resend changes nothing; a replay keeps the fewer moves
    assert_eq!(apply(&mut d, &s1, Some("k1"), None), Ok(false));
    assert_eq!(apply(&mut d, &Win { moves: 20, ..s1.clone() }, Some("k2"), None), Ok(true));
    assert_eq!(d["souvenir"], json!({ "s1": 13 }));
    assert_eq!(apply(&mut d, &Win { moves: 11, ..s1.clone() }, Some("k3"), None), Ok(true));
    assert_eq!(d["souvenir"], json!({ "s1": 11 }));
    // a record with no Souvenir yet reads as before (normal adds no empty map)
    assert!(progress::normal(Some(json!({ "v": 1 }))).get("souvenir").is_none());
}

#[test]
fn a_campaign_win_moves_the_next_board_and_restores_its_pictures() {
    let mut d = progress::empty();
    assert_eq!(apply(&mut d, &win(Lane::Campaign, "c01", 7, &["a", "b"]), Some("k1"), Some(1)), Ok(true));
    assert_eq!(d["campaign"], json!({ "next": 2, "won": 1 }));
    assert_eq!(d["restored"], json!(["a", "b"]));
    // the same picture again is restored once
    apply(&mut d, &win(Lane::Campaign, "c02", 9, &["b", "c"]), Some("k2"), Some(2)).unwrap();
    assert_eq!(d["restored"], json!(["a", "b", "c"]));
    assert_eq!(d["campaign"]["next"], 3);
}

#[test]
fn a_win_past_the_next_board_waits_for_the_one_before() {
    let mut d = progress::empty();
    assert_eq!(apply(&mut d, &win(Lane::Campaign, "c03", 7, &["a"]), Some("k3"), Some(3)), Err(Wait::Order));
    assert_eq!(d["campaign"]["next"], 1, "nothing changed");
    assert_eq!(d["restored"], json!([]));
}

#[test]
fn replaying_an_earlier_board_counts_a_win_and_keeps_the_place() {
    let mut d = progress::empty();
    d["campaign"]["next"] = json!(5);
    apply(&mut d, &win(Lane::Campaign, "c02", 7, &[]), Some("k"), Some(2)).unwrap();
    assert_eq!(d["campaign"], json!({ "next": 5, "won": 1 }));
}

#[test]
fn a_resent_claim_changes_nothing() {
    let mut d = progress::empty();
    let w = win(Lane::Campaign, "c01", 7, &["a"]);
    assert_eq!(apply(&mut d, &w, Some("same"), Some(1)), Ok(true));
    let before = d.clone();
    assert_eq!(apply(&mut d, &w, Some("same"), Some(1)), Ok(false));
    assert_eq!(d, before);
}

#[test]
fn the_record_remembers_only_the_last_claims() {
    let mut d = progress::empty();
    for i in 0..40 {
        apply(&mut d, &win(Lane::Challenge, "ch01", 30, &[]), Some(&format!("k{i}")), None).unwrap();
    }
    assert_eq!(d["seen"].as_array().unwrap().len(), 32);
    assert_eq!(d["seen"][31], "k39");
}

#[test]
fn a_challenge_keeps_its_best() {
    let mut d = progress::empty();
    apply(&mut d, &win(Lane::Challenge, "ch01", 20, &[]), Some("a"), None).unwrap();
    apply(&mut d, &win(Lane::Challenge, "ch01", 25, &[]), Some("b"), None).unwrap();
    assert_eq!(d["challenge"]["ch01"], 20);
    apply(&mut d, &win(Lane::Challenge, "ch01", 18, &[]), Some("c"), None).unwrap();
    assert_eq!(d["challenge"]["ch01"], 18);
    assert_eq!(d["campaign"], json!({ "next": 1, "won": 0 }), "the campaign is untouched");
}

#[test]
fn a_daily_keeps_its_first_result_and_only_recent_dates() {
    let mut d = progress::empty();
    let mut w = win(Lane::Daily, "d2026-10-24", 17, &["x"]);
    w.date = Some("2026-10-24".into());
    apply(&mut d, &w, Some("a"), None).unwrap();
    w.moves = 12;
    apply(&mut d, &w, Some("b"), None).unwrap();
    assert_eq!(d["daily"]["2026-10-24"], json!({ "moves": 17, "ms": 90000 }), "the first result stands");
    for day in 1..=120 {
        let mut w = win(Lane::Daily, "d", 10, &[]);
        w.date = Some(format!("2027-{:02}-{:02}", 1 + (day - 1) / 28, 1 + (day - 1) % 28));
        apply(&mut d, &w, Some(&format!("d{day}")), None).unwrap();
    }
    let days = d["daily"].as_object().unwrap();
    assert_eq!(days.len(), 100);
    assert!(days.get("2026-10-24").is_none(), "the oldest dates leave first");
    assert!(days.get("2027-05-08").is_some(), "the newest stays");
}

#[test]
fn a_campaign_save_the_player_wrote_never_becomes_progress() {
    // GSR-006: a new player writes level 150 into their own "campaign" slot before any win
    let mut asked = Vec::new();
    let saves = |key: &str| -> Result<Option<serde_json::Value>, ()> {
        asked.push(key.to_string());
        Ok(match key {
            "campaign" => Some(json!({ "v": 1, "level": 150, "won": 149, "restored": ["a"], "best": { "ch01": 3 } })),
            _ => None,
        })
    };
    let (mut d, stored) = progress::from_saves(saves).unwrap();
    assert_eq!(asked, ["progress"], "only the slot the checker writes is read");
    assert!(!stored);
    assert_eq!(d, progress::empty());
    // their first win, board 1, puts them on board 2
    assert_eq!(apply(&mut d, &win(Lane::Campaign, "c01", 7, &["a"]), Some("k1"), Some(1)), Ok(true));
    assert_eq!(d["campaign"], json!({ "next": 2, "won": 1 }));
    assert!(d.get("imported").is_none());
}

#[test]
fn a_stored_record_is_read_as_it_is() {
    let saves = |key: &str| -> Result<Option<serde_json::Value>, ()> {
        Ok((key == "progress").then(|| json!({ "v": 1, "campaign": { "next": 6, "won": 7 } })))
    };
    let (d, stored) = progress::from_saves(saves).unwrap();
    assert!(stored);
    assert_eq!(d["campaign"], json!({ "next": 6, "won": 7 }));
}

#[test]
fn a_damaged_record_reads_as_a_well_formed_one() {
    assert_eq!(progress::normal(Some(json!("nope"))), progress::empty());
    let d = progress::normal(Some(json!({ "campaign": { "next": 0 }, "restored": "x", "extra": 1 })));
    assert_eq!(d["campaign"]["next"], 1);
    assert_eq!(d["restored"], json!([]));
    assert_eq!(d["extra"], 1, "unknown fields are kept");
}

#[test]
fn the_position_stops_after_the_last_board_and_going_round_never_moves_it() {
    // a 26-board campaign: winning board 26 is "all done" (27)
    let mut d = progress::empty();
    d["campaign"]["next"] = json!(26);
    progress::apply(&mut d, &win(Lane::Campaign, "c26", 20, &[]), Some("a"), Some(26), 26).unwrap();
    assert_eq!(d["campaign"]["next"], 27);
    // the game goes round: position 27 plays board 1, 28 board 2; replays, the position stays
    progress::apply(&mut d, &win(Lane::Campaign, "c01", 7, &[]), Some("b"), Some(27), 26).unwrap();
    progress::apply(&mut d, &win(Lane::Campaign, "c02", 9, &[]), Some("c"), Some(28), 26).unwrap();
    assert_eq!(d["campaign"]["next"], 27);
    assert_eq!(d["campaign"]["won"], 3);
    // a replay of an earlier board by its own position does not move it either
    progress::apply(&mut d, &win(Lane::Campaign, "c05", 9, &[]), Some("d"), Some(5), 26).unwrap();
    assert_eq!(d["campaign"]["next"], 27);
    // boards 27-30 come back: the player who finished plays the first new one
    progress::apply(&mut d, &win(Lane::Campaign, "c27", 20, &[]), Some("e"), Some(27), 30).unwrap();
    assert_eq!(d["campaign"]["next"], 28);
}

#[test]
fn a_record_that_went_round_is_pulled_back_to_all_done() {
    // stored before the stop: went round to position 33 of a 30-board campaign
    let mut d = progress::empty();
    d["campaign"]["next"] = json!(33);
    // any verified win pulls it back to "all done" for the campaign as it is now
    progress::apply(&mut d, &win(Lane::Challenge, "ch01", 20, &[]), Some("a"), None, 26).unwrap();
    assert_eq!(d["campaign"]["next"], 27);
    let mut d = progress::empty();
    d["campaign"]["next"] = json!(33);
    progress::apply(&mut d, &win(Lane::Campaign, "c07", 20, &[]), Some("b"), Some(33), 26).unwrap();
    assert_eq!(d["campaign"]["next"], 27);
}

#[test]
fn a_win_past_the_end_still_waits_for_earlier_ones() {
    // board 25 not yet in: a going-round win waits like any later one
    let mut d = progress::empty();
    d["campaign"]["next"] = json!(25);
    assert_eq!(progress::apply(&mut d, &win(Lane::Campaign, "c01", 7, &[]), Some("a"), Some(27), 26), Err(Wait::Order));
    assert_eq!(d["campaign"]["next"], 25);
}

#[test]
fn a_board_that_left_the_campaign_counts_a_win_and_moves_nothing() {
    let mut d = progress::empty();
    d["campaign"]["next"] = json!(12);
    progress::apply(&mut d, &win(Lane::Campaign, "c29", 20, &["x"]), Some("a"), None, 26).unwrap();
    assert_eq!(d["campaign"]["next"], 12);
    assert_eq!(d["campaign"]["won"], 1);
    assert_eq!(d["restored"], json!(["x"]));
}
