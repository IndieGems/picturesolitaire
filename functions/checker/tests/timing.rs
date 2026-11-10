//! THE PLATFORM CALLS' TIMING (src/timing.rs): what the function's call lines say, with no player
//! id in any of them. On this machine:
//!   cargo test --release --test timing

use checker::timing;

const PLAYER: &str = "9481d387-e757-4b8b-ba94-423e5e356b4d";
const GAME: &str = "9c562125-f155-4601-a349-f66ca3c5f2b6";

#[test]
fn a_route_names_the_call_and_no_id() {
    let cases = [
        (format!("/v1/saves/players/{PLAYER}/progress"), "/v1/saves/players/…/progress"),
        (format!("/v1/saves/players/{PLAYER}/progress/upload-url"), "/v1/saves/players/…/progress/upload-url"),
        (format!("/v1/challenges?player_id={PLAYER}&periods_back=1"), "/v1/challenges"),
        (format!("/v1/games/{GAME}/players/me/passes"), "/v1/games/…/players/me/passes"),
        (format!("/v1/inventory/players/{PLAYER}/orders"), "/v1/inventory/players/…/orders"),
        (format!("/v1/games/{GAME}/runs"), "/v1/games/…/runs"),
        (format!("/v1/progressions/{}", PLAYER.replace('-', "")), "/v1/progressions/…"),
    ];
    for (path, want) in cases {
        let got = timing::route(&path);
        assert_eq!(got, want, "{path}");
        assert!(!got.contains(PLAYER) && !got.contains(GAME) && !got.contains(&PLAYER.replace('-', "")), "{got}");
    }
    // route words stay, however long: only ids go
    assert_eq!(timing::route("/v1/inventory/players/me/items"), "/v1/inventory/players/me/items");
    assert_eq!(timing::route("/v1/analytics/events/batch"), "/v1/analytics/events/batch");
}

#[test]
fn a_call_over_half_a_second_is_slow() {
    assert_eq!(timing::SLOW_MS, 500);
    assert!(!timing::slow(0));
    assert!(!timing::slow(500));
    assert!(timing::slow(501));
    assert!(timing::slow(4_909));
}
