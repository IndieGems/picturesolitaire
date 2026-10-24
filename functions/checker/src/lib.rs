//! PICTURE MEND's WIN CHECKER, a Gem serverless function (Rust, WebAssembly).
//!
//! The game calls it once per finished board (src/net/claims.ts). It replays the
//! claimed line on a port of the rules (rules.rs) against the deal compiled in
//! from the level files (claim.rs, build.rs), and only for a real win does it:
//!   - campaign / challenge board: move that board's progression ("board_<id>",
//!     completion 1, never resets) to 1, which pays its Coins on completion,
//!     so once per board, ever (the config says how many: gem-backend-game-config.yaml);
//!   - daily: check the date is the player's own today (or yesterday, late),
//!     post the result (moves, time) to the "daily" board under that date, and
//!     move "daily_picture" to 1, which pays once per day.
//! The verdict goes back as JSON; the device follows it, never the other way.
//! Platform refusals that may pass (busy, rate limited) answer "retry".
//!
//! Who pays is always the player who called (get-context), never anyone the
//! input names. Every progression this writes has `function_may_grant: true`:
//! this function is the only check on what they pay.

pub mod claim;
pub mod rules;

/// The daily challenge's progression (gem-backend-game-config.yaml): its id and slug.
pub const DAILY_ID: &str = "6d1f3b0e-8a52-4c7e-9f14-2b6e0d9a7c31";
pub const DAILY_SLUG: &str = "daily_picture";
/// The run type the daily's results are posted as, and its board.
pub const DAILY_RUN: &str = "daily_result";

/// The progression slug that pays for one campaign or challenge board.
pub fn board_slug(board: &str) -> String {
    format!("board_{board}")
}

/// A run id fixed by the player and the date, so one result per player per day:
/// the platform keeps the first run with a given id and counts a resend as a duplicate.
pub fn daily_run_id(player: &str, date: &str) -> String {
    let fnv = |seed: u64| {
        let mut h: u64 = 0xcbf2_9ce4_8422_2325 ^ seed;
        for b in player.bytes().chain(b"|".iter().copied()).chain(date.bytes()) {
            h ^= b as u64;
            h = h.wrapping_mul(0x0000_0100_0000_01b3);
        }
        h
    };
    let (a, b) = (fnv(0x5049_4354), fnv(0x4d45_4e44));
    let hex = format!("{a:016x}{b:016x}");
    // shaped as a UUID: version 8 (custom), RFC 4122 variant
    format!(
        "{}-{}-8{}-{:x}{}-{}",
        &hex[0..8],
        &hex[8..12],
        &hex[13..16],
        0x8 | (u8::from_str_radix(&hex[16..17], 16).unwrap() & 0x3),
        &hex[17..20],
        &hex[20..32]
    )
}

#[cfg(target_arch = "wasm32")]
mod function {
    wit_bindgen::generate!({
        path: "wit",
        world: "function",
    });

    use gem::functions::host::{self, ApiRequest, Caller, LogLevel};
    use serde_json::{json, Value};

    use crate::claim::{self, Lane, Refusal, Win};

    struct Function;

    /// What one platform request answered.
    struct Answer {
        status: u16,
        body: Value,
    }

    fn api(method: &str, path: String, body: Option<Value>) -> Result<Answer, String> {
        let res = host::call_api(&ApiRequest {
            method: method.into(),
            path,
            body: body.map(|b| b.to_string().into_bytes()).unwrap_or_default(),
        })?;
        Ok(Answer { status: res.status, body: serde_json::from_slice(&res.body).unwrap_or(Value::Null) })
    }

    fn passing(status: u16) -> bool {
        status == 429 || status >= 500
    }

    fn retry(why: &str) -> Value {
        json!({ "v": 1, "status": "retry", "reason": why })
    }

    /// Move a paying progression to 1: completes it the first time, pays its
    /// mapping then, and nothing after. Ok(coins granted now) or Err(verdict).
    fn complete(player: &str, slug: &str) -> Result<i64, Value> {
        let res = api(
            "POST",
            format!("/v1/inventory/players/{player}/progressions/{slug}/max"),
            Some(json!({ "value": 1, "reason": "verified win" })),
        )
        .map_err(|e| {
            host::log(LogLevel::Warn, &format!("progression {slug}: no answer: {e}"));
            retry("platform")
        })?;
        if !(200..300).contains(&res.status) {
            host::log(LogLevel::Warn, &format!("progression {slug} answered {}: {}", res.status, res.body));
            // a progression this channel's config does not declare is the config's fault, not the player's
            return Err(retry(if passing(res.status) { "platform" } else { "config" }));
        }
        let mut coins = 0;
        for ch in res.body["changes"].as_array().into_iter().flatten() {
            if ch["type"] == "platform_grant" {
                let granted = ch["granted"].as_i64().unwrap_or(0);
                coins += granted;
                host::log(
                    LogLevel::Info,
                    &format!("grant {slug}: {} {} of {}{}", ch["outcome"], granted, ch["requested"], ch["reason"].as_str().map(|r| format!(" ({r})")).unwrap_or_default()),
                );
            }
        }
        Ok(coins)
    }

    fn board_win(player: &str, win: &Win) -> Value {
        match complete(player, &crate::board_slug(&win.board)) {
            Ok(coins) => json!({
                "v": 1, "status": if coins > 0 { "paid" } else { "kept" }, "lane": win.lane.name(),
                "board": win.board, "moves": win.moves, "coins": coins,
            }),
            Err(v) => v,
        }
    }

    /// The daily's date for the player, `back` periods ago (0: today).
    fn daily_date(player: &str, back: u32) -> Result<Option<String>, Value> {
        let q = if back == 0 { String::new() } else { format!("&periods_back={back}") };
        let res = api("GET", format!("/v1/challenges?player_id={player}{q}"), None).map_err(|_| retry("platform"))?;
        if !(200..300).contains(&res.status) {
            host::log(LogLevel::Warn, &format!("challenges answered {}", res.status));
            return Err(retry("platform"));
        }
        Ok(res.body["challenges"]
            .as_array()
            .into_iter()
            .flatten()
            .find(|c| c["progression_definition_id"] == crate::DAILY_ID || c["slug"] == crate::DAILY_SLUG)
            .and_then(|c| c["period_local_date"].as_str().map(str::to_string)))
    }

    fn daily_win(game: &str, player: &str, win: &Win) -> Value {
        let date = win.date.clone().unwrap_or_default();
        let today = match daily_date(player, 0) {
            Ok(Some(d)) => d,
            Ok(None) => return retry("config"),
            Err(v) => return v,
        };
        let late = if date == today {
            false
        } else {
            match daily_date(player, 1) {
                Ok(Some(d)) if d == date => true,
                Ok(_) => return json!({ "v": 1, "status": "refused", "reason": "wrong_day", "lane": "daily", "board": win.board, "today": today }),
                Err(v) => return v,
            }
        };

        // the result, on the date's board (moves, then time); the first one a day stands
        let run = json!({ "runs": [{
            "run_id": crate::daily_run_id(player, &date),
            "entity_type": "player",
            "entity_id": player,
            "run_type": crate::DAILY_RUN,
            "int_value_1": win.moves,
            "int_value_2": win.ms,
            "period_id": date,
        }]});
        let posted = match api("POST", format!("/v1/games/{game}/runs"), Some(run)) {
            Ok(a) => a,
            Err(_) => return retry("platform"),
        };
        let recorded = match posted.status {
            200..=299 => true,
            409 => false, // run_period_closed: the day has closed for this player
            s if passing(s) => return retry("platform"),
            s => {
                host::log(LogLevel::Warn, &format!("runs answered {s}: {}", posted.body));
                return retry("config");
            }
        };
        let first = posted.body["inserted"].as_i64() == Some(1);

        if late {
            // the platform files a progression write under the period it arrives in,
            // so yesterday's daily can no longer be marked or paid
            return json!({
                "v": 1, "status": "late", "lane": "daily", "board": win.board, "date": date,
                "moves": win.moves, "ms": win.ms, "coins": 0, "recorded": recorded, "first": first,
            });
        }
        match complete(player, crate::DAILY_SLUG) {
            Ok(coins) => json!({
                "v": 1, "status": if coins > 0 { "paid" } else { "kept" }, "lane": "daily", "board": win.board,
                "date": date, "moves": win.moves, "ms": win.ms, "coins": coins, "recorded": recorded, "first": first,
            }),
            Err(v) => v,
        }
    }

    impl Guest for Function {
        fn handle(input: Vec<u8>) -> Result<Vec<u8>, String> {
            let ctx = host::get_context();
            let Caller::Player(player) = ctx.caller else {
                return Err("this function checks a player's own win: call it as a player".into());
            };
            let known = claim::deals();
            let verdict = match claim::check(&input, &known) {
                Err(r) => {
                    host::log(LogLevel::Info, &format!("refused: {r:?}"));
                    let status = if r == Refusal::UnknownDeal { "retry" } else { "refused" };
                    json!({ "v": 1, "status": status, "reason": r.reason() })
                }
                Ok(win) => {
                    host::log(LogLevel::Info, &format!("won {} {} in {} moves, {} shuffles", win.lane.name(), win.board, win.moves, win.shuffles));
                    match win.lane {
                        Lane::Daily => daily_win(&ctx.game_id, &player, &win),
                        _ => board_win(&player, &win),
                    }
                }
            };
            Ok(verdict.to_string().into_bytes())
        }
    }

    export!(Function);
}
