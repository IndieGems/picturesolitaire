//! The player's days and the daily archive's window (src/days.rs), on this machine:
//!   cargo test --release --test days
//! tools/server/check.mts runs it with the rest. (Until 0.1.63, tests/vip.rs, which read VIP too.)

use checker::days;
use serde_json::json;

#[test]
fn the_days_of_the_week_are_monday_first() {
    // 2026-11-02 is a Monday
    for i in 0..7 {
        let date = days::add_days("2026-11-02", i as i64).unwrap();
        assert_eq!(days::iso_day(&date), Some(i as u32 + 1), "{date}");
    }
    assert_eq!(days::iso_day("2026-11-01"), Some(7), "a Sunday is the week's last day");
    assert_eq!(days::iso_day("1970-01-01"), Some(4), "a Thursday");
    assert_eq!(days::iso_day("2026-13-01"), None);
}


#[test]
fn the_archive_starts_on_the_first_of_the_month_two_before() {
    for (today, first) in [
        ("2026-10-12", "2026-08-01"),
        ("2026-10-01", "2026-08-01"),
        ("2026-10-31", "2026-08-01"),
        ("2026-11-01", "2026-09-01"),
        ("2027-01-15", "2026-11-01"),
        ("2027-02-01", "2026-12-01"),
        ("2027-03-31", "2027-01-01"),
    ] {
        assert_eq!(days::archive_start(today).as_deref(), Some(first), "{today}");
    }
    assert_eq!(days::archive_start("2026-13-01"), None);
}

#[test]
fn no_date_has_an_archive_longer_than_91_days() {
    let mut day = "2026-01-01".to_string();
    let mut longest = 0;
    for _ in 0..800 {
        let first = days::archive_start(&day).unwrap();
        let mut n = 0;
        let mut d = first.clone();
        while d < day {
            n += 1;
            d = days::add_days(&d, 1).unwrap();
        }
        longest = longest.max(n);
        day = days::add_days(&day, 1).unwrap();
    }
    assert_eq!(longest, 91, "on 31 July: 1 May to 30 July");
}

#[test]
fn a_past_day_pays_in_the_archive_with_a_day_of_slack_and_nothing_older() {
    // the 12th: 1 August to yesterday
    assert!(days::in_archive("2026-08-01", "2026-10-12"));
    assert!(days::in_archive("2026-10-11", "2026-10-12"));
    assert!(!days::in_archive("2026-07-31", "2026-10-12"), "the day before the first");
    assert!(!days::in_archive("2026-10-12", "2026-10-12") && !days::in_archive("2026-10-13", "2026-10-12"), "today and later are not past days");
    // the 1st: the archive turned at the player's midnight, but the day before still showed 1 August
    assert!(days::in_archive("2026-08-01", "2026-11-01"), "the day of slack");
    assert!(!days::in_archive("2026-07-31", "2026-11-01"));
    // the 2nd: the slack is over, and 1 September is the first
    assert!(!days::in_archive("2026-08-31", "2026-11-02"));
    assert!(days::in_archive("2026-09-01", "2026-11-02"));
    // across a new year, and a player whose month just turned while UTC's has not: their date is
    // the platform's, so only their own 1 January counts
    assert!(days::in_archive("2026-10-01", "2027-01-01") && !days::in_archive("2026-09-30", "2027-01-01"));
    assert!(!days::in_archive("2026-10-31", "2027-01-02") && days::in_archive("2026-11-01", "2027-01-02"));
    assert!(!days::in_archive("bad", "2026-10-12") && !days::in_archive("2026-10-01", "bad"));
}

#[test]
fn days_move_by_the_calendar() {
    assert_eq!(days::add_days("2026-12-31", 1).as_deref(), Some("2027-01-01"));
    assert_eq!(days::add_days("2028-03-01", -1).as_deref(), Some("2028-02-29"));
    assert_eq!(days::add_days("2026-03-01", -1).as_deref(), Some("2026-02-28"));
    assert_eq!(days::add_days("2026-10-15", 13).as_deref(), Some("2026-10-28"));
}

#[test]
fn the_record_marks_a_past_day_owed_until_it_lands_and_its_item_packed_for_good() {
    use checker::progress;
    let mut d = progress::empty();
    assert_eq!(progress::owed(&d, "2026-10-03"), (false, false));
    progress::owe(&mut d, "2026-10-03", true, false);
    progress::owe(&mut d, "2026-10-16", true, true);
    assert_eq!(progress::owed(&d, "2026-10-03"), (true, false));
    assert_eq!(progress::owed(&d, "2026-10-16"), (true, true));
    progress::settle(&mut d, "2026-10-03");
    assert_eq!(progress::owed(&d, "2026-10-03"), (false, false));
    progress::settle(&mut d, "2026-10-16");
    assert!(d.get("owed").is_none(), "nothing owed: no mark left in the record");
    assert!(!progress::packed(&d, "halloween-2026", "2026-10-16"));
    progress::mark_packed(&mut d, "halloween-2026", "2026-10-16");
    progress::mark_packed(&mut d, "halloween-2026", "2026-10-16");
    assert!(progress::packed(&d, "halloween-2026", "2026-10-16") && !progress::packed(&d, "ski-trip-2026", "2026-10-16"));
    assert_eq!(d["packed"]["halloween-2026"], json!(["2026-10-16"]), "once");
    // the record's own rules keep both marks (normal keeps what it does not know)
    let back = progress::normal(Some(d.clone()));
    assert!(progress::packed(&back, "halloween-2026", "2026-10-16"));
}
