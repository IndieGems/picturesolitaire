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
//! That move goes in ONE order with the helper gifts due (pay.rs: board 1's kit, a
//! hard board's or a trip's last board's gift), and the verdict says what landed.
//! The verdict goes back as JSON; the device follows it, never the other way.
//! Platform refusals that may pass (busy, rate limited) answer "retry".
//!
//! {"v":1,"what":"levels"} asks only which level data the checker was built
//! with (claim::LEVELS): tools/server/upload.mts records it, and the game build
//! refuses to ship boards the uploaded checker does not know.
//!
//! THE PLAYER'S PROGRESS is the server's too (progress.rs): every verified win
//! updates the "progress" save slot, which only this function writes, BEFORE
//! anything is paid, and the verdict carries the new record. The first time, an
//! old device save (the "campaign" slot) is taken in once. {"v":1,"what":"progress"}
//! does only that: reads the record, taking in an old save if there is no record.
//!
//! Who pays is always the player who called (get-context), never anyone the
//! input names. Every progression this writes has `function_may_grant: true`:
//! this function is the only check on what they pay.

pub mod canon;
pub mod claim;
pub mod pay;
pub mod progress;
pub mod rules;

/// The daily challenge's progression (gem-backend-game-config.yaml): its id and slug.
pub const DAILY_ID: &str = "6d1f3b0e-8a52-4c7e-9f14-2b6e0d9a7c31";
pub const DAILY_SLUG: &str = "daily_picture";
/// The run type the daily's results are posted as, and its board.
pub const DAILY_RUN: &str = "daily_result";
/// The save slot holding the player's progress, written only by this function.
pub const PROGRESS: &str = "progress";
/// The old device-written slot, taken in once (src/ui/progress.ts wrote it).
pub const LEGACY: &str = "campaign";

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

    use gem::functions::host::{self, ApiRequest, Caller, LogLevel, UploadRequest};
    use serde_json::{json, Value};

    use crate::claim::{self, Lane, Refusal, Win};
    use crate::pay;
    use crate::progress::{self, Wait};

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

    /// What one win's order granted, from the platform's receipt.
    struct Granted {
        coins: i64,
        /// Items granted now, by slug or id (the onboarding keepsake, by board 1's rewards_on_complete).
        items: Vec<String>,
        /// This win completed the progression for the first time.
        first: bool,
        /// What landed of each helper ({ hint, undo, shuffle }), after the cap's clamp.
        helpers: Value,
        /// The gifts the order carried: "kit", "hard", "stamp".
        gifts: Vec<&'static str>,
    }

    impl Granted {
        fn nothing() -> Granted {
            Granted { coins: 0, items: Vec::new(), first: false, helpers: pay::none(), gifts: Vec::new() }
        }
        fn status(&self) -> &'static str {
            let helped = pay::KINDS.iter().any(|k| self.helpers[*k].as_i64().unwrap_or(0) > 0);
            if self.coins > 0 || !self.items.is_empty() || helped {
                "paid"
            } else {
                "kept"
            }
        }
    }

    /// A progression's value for the player, by id (0 when never written). Err: the verdict.
    fn value_of(player: &str, id: &str) -> Result<f64, Value> {
        let res = api("GET", format!("/v1/inventory/players/{player}/progressions/{id}"), None).map_err(|e| {
            host::log(LogLevel::Warn, &format!("progression {id}: no answer: {e}"));
            retry("platform")
        })?;
        match res.status {
            200..=299 => Ok(res.body["current_value"].as_f64().unwrap_or(0.0)),
            404 => Ok(0.0),
            s => {
                host::log(LogLevel::Warn, &format!("progression {id} answered {s}: {}", res.body));
                Err(retry(if passing(s) { "platform" } else { "config" }))
            }
        }
    }

    /// Pay a verified win in ONE order (pay.rs): `progression` to 1 if this is its first
    /// completion (which pays its Coins and rewards), the board's gift with it, and the kit
    /// if due. Ok(what landed now) or Err(verdict).
    fn pay_win(player: &str, progression: &str, what: &str, nonce: &str, gift: Option<&'static str>, kit: bool) -> Result<Granted, Value> {
        let first = value_of(player, progression)? < 1.0;
        let Some(order) = pay::order(progression, what, nonce, first, gift, kit) else {
            return Ok(Granted::nothing());
        };
        let body = json!({ "source": "reward", "nonce": order.nonce, "operations": order.operations });
        let res = api("POST", format!("/v1/inventory/players/{player}/orders"), Some(body)).map_err(|e| {
            host::log(LogLevel::Warn, &format!("order {}: no answer: {e}", order.nonce));
            retry("platform")
        })?;
        if res.status == 409 {
            // this nonce landed already (a claim racing this one for the same first win)
            host::log(LogLevel::Info, &format!("order {}: landed before: {}", order.nonce, res.body));
            return Ok(Granted::nothing());
        }
        if !(200..300).contains(&res.status) || res.body["status"] == "failed" {
            host::log(LogLevel::Warn, &format!("order {} answered {}: {}", order.nonce, res.status, res.body));
            // a progression or currency this channel's config does not declare is the config's fault, not the player's
            return Err(retry(if passing(res.status) { "platform" } else { "config" }));
        }
        let changes = res.body["changes"].as_array().cloned().unwrap_or_default();
        let mut g = Granted { first, helpers: pay::landed(&changes), gifts: order.gifts.clone(), ..Granted::nothing() };
        for ch in &changes {
            if ch["type"] == "item" && ch["quantity_after"].as_i64().unwrap_or(0) > ch["quantity_before"].as_i64().unwrap_or(0) {
                let id = ch["item_definition_id"].as_str().unwrap_or_default().to_string();
                host::log(LogLevel::Info, &format!("item {what}: {id}"));
                g.items.push(id);
            }
            if ch["type"] == "platform_grant" {
                let granted = ch["granted"].as_i64().unwrap_or(0);
                g.coins += granted;
                host::log(
                    LogLevel::Info,
                    &format!("grant {what}: {} {} of {}{}", ch["outcome"], granted, ch["requested"], ch["reason"].as_str().map(|r| format!(" ({r})")).unwrap_or_default()),
                );
            }
            if ch["type"] == "currency" {
                host::log(LogLevel::Info, &format!("helper {what}: {} {} -> {}", ch["currency_id"], ch["balance_before"], ch["balance_after"]));
            }
        }
        if !g.gifts.is_empty() {
            host::log(LogLevel::Info, &format!("gifts {what}: {:?}, landed {}", g.gifts, g.helpers));
        }
        Ok(g)
    }

    /// The table items a board's first completion grants (src/net/tables.json, through build.rs).
    fn tables_for(board: &str) -> Vec<String> {
        let all: Value = serde_json::from_str(include_str!(concat!(env!("OUT_DIR"), "/tables.json"))).unwrap_or(Value::Null);
        all.as_array()
            .into_iter()
            .flatten()
            .filter(|t| t["board"] == board)
            .filter_map(|t| t["slug"].as_str().map(str::to_string))
            .collect()
    }

    /// Does the player hold this item now? The platform's answer.
    fn holds(player: &str, slug: &str) -> bool {
        match api("GET", format!("/v1/inventory/players/{player}/items/{slug}"), None) {
            Ok(a) if (200..300).contains(&a.status) => {
                let list = if a.body.is_array() { &a.body } else { &a.body["data"] };
                list.as_array().into_iter().flatten().any(|i| i["quantity"].as_i64().unwrap_or(0) > 0)
            }
            Ok(a) => {
                host::log(LogLevel::Warn, &format!("item {slug} answered {}", a.status));
                false
            }
            Err(_) => false,
        }
    }

    fn board_win(player: &str, win: &Win, kit: bool) -> Value {
        // a campaign board that has left the campaign (an older build still plays it; claim.rs
        // gives it no position): a real win, but its pay left with it, and asking for it would
        // only answer "retry" for ever
        if win.lane == Lane::Campaign && win.n.is_none() {
            return json!({ "v": 1, "status": "kept", "lane": "campaign", "board": win.board, "moves": win.moves, "coins": 0, "items": [], "helpers": pay::none(), "gifts": [] });
        }
        let Some(progression) = pay::board_id(&win.board) else {
            host::log(LogLevel::Warn, &format!("no progression for {}", win.board));
            return retry("config");
        };
        let what = format!("{} {}", win.lane.name(), win.board);
        let nonce = format!("first:{}:{}", win.lane.name(), win.board);
        let done = pay_win(player, progression, &what, &nonce, pay::gift_of(win.lane.clone(), &win.board), kit).map(|mut g| {
            // a completion's item rewards land in a step of their own, which this receipt does
            // not list: on the first completion, confirm each table the board grants is held
            if g.first && win.lane == Lane::Campaign {
                for slug in tables_for(&win.board) {
                    if !g.items.contains(&slug) && holds(player, &slug) {
                        g.items.push(slug);
                    }
                }
            }
            g
        });
        match done {
            Ok(g) => json!({
                "v": 1, "status": g.status(), "lane": win.lane.name(),
                "board": win.board, "moves": win.moves, "coins": g.coins, "items": g.items,
                "helpers": g.helpers, "gifts": g.gifts,
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

    /// Is the daily's date the player's own today (Ok(false)), or yesterday (Ok(true), late)? Err: the verdict.
    fn daily_day(player: &str, win: &Win) -> Result<bool, Value> {
        let date = win.date.clone().unwrap_or_default();
        let today = match daily_date(player, 0)? {
            Some(d) => d,
            None => return Err(retry("config")),
        };
        if date == today {
            return Ok(false);
        }
        match daily_date(player, 1)? {
            Some(d) if d == date => Ok(true),
            _ => Err(json!({ "v": 1, "status": "refused", "reason": "wrong_day", "lane": "daily", "board": win.board, "today": today })),
        }
    }

    fn daily_win(game: &str, player: &str, win: &Win, late: bool, kit: bool) -> Value {
        let date = win.date.clone().unwrap_or_default();

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
            // (a kit still due waits for the next win)
            return json!({
                "v": 1, "status": "late", "lane": "daily", "board": win.board, "date": date,
                "moves": win.moves, "ms": win.ms, "coins": 0, "recorded": recorded, "first": first,
                "helpers": pay::none(), "gifts": [],
            });
        }
        // the date is the platform's (the player's own day), so the nonce keys one daily a day
        match pay_win(player, crate::DAILY_ID, &format!("daily {date}"), &format!("daily:{date}"), None, kit) {
            Ok(g) => json!({
                "v": 1, "status": g.status(), "lane": "daily", "board": win.board, "date": date,
                "moves": win.moves, "ms": win.ms, "coins": g.coins, "items": g.items, "recorded": recorded, "first": first,
                "helpers": g.helpers, "gifts": g.gifts,
            }),
            Err(v) => v,
        }
    }

    /// Read one of the player's save slots: Ok(None) when there is none.
    fn read_save(player: &str, key: &str) -> Result<Option<Value>, Value> {
        let rec = api("GET", format!("/v1/saves/players/{player}/{key}"), None).map_err(|_| retry("platform"))?;
        if rec.status == 404 {
            return Ok(None);
        }
        if !(200..300).contains(&rec.status) {
            host::log(LogLevel::Warn, &format!("save {key} answered {}: {}", rec.status, rec.body));
            return Err(retry(if passing(rec.status) { "platform" } else { "config" }));
        }
        let url = rec.body["download_url"].as_str().unwrap_or_default();
        let got = host::download_link(url).map_err(|e| {
            host::log(LogLevel::Warn, &format!("save {key}: download refused: {e}"));
            retry("platform")
        })?;
        if got.status != 200 {
            host::log(LogLevel::Warn, &format!("save {key}: download answered {}", got.status));
            return Err(retry("platform"));
        }
        Ok(serde_json::from_slice(&got.body).ok())
    }

    /// Write one of the player's save slots, as JSON.
    fn write_save(player: &str, key: &str, value: &Value) -> Result<(), Value> {
        let bytes = value.to_string().into_bytes();
        let path = format!("/v1/saves/players/{player}/{key}");
        let started = api("POST", format!("{path}/upload-url"), Some(json!({ "size_bytes": bytes.len(), "content_type": "application/json" })))
            .map_err(|_| retry("platform"))?;
        if started.status != 200 {
            host::log(LogLevel::Warn, &format!("save {key}: upload-url answered {}: {}", started.status, started.body));
            return Err(retry(if passing(started.status) { "platform" } else { "config" }));
        }
        let headers = started.body["upload_headers"]
            .as_object()
            .into_iter()
            .flatten()
            .map(|(k, v)| (k.clone(), v.as_str().unwrap_or_default().to_string()))
            .collect();
        let sent = host::upload_link(&UploadRequest {
            url: started.body["upload_url"].as_str().unwrap_or_default().to_string(),
            content_type: "application/json".into(),
            headers,
            body: bytes,
        })
        .map_err(|e| {
            host::log(LogLevel::Warn, &format!("save {key}: upload refused: {e}"));
            retry("platform")
        })?;
        if !(200..300).contains(&sent.status) {
            host::log(LogLevel::Warn, &format!("save {key}: upload answered {}", sent.status));
            return Err(retry("platform"));
        }
        let done = api("POST", format!("{path}/finalize"), Some(json!({ "session_id": started.body["session_id"] }))).map_err(|_| retry("platform"))?;
        if done.status != 200 {
            host::log(LogLevel::Warn, &format!("save {key}: finalize answered {}: {}", done.status, done.body));
            return Err(retry("platform"));
        }
        Ok(())
    }

    /// The player's progress record, and whether it is stored yet. With none
    /// stored, an old device save ("campaign") is taken in.
    fn read_progress(player: &str) -> Result<(Value, bool), Value> {
        if let Some(doc) = read_save(player, crate::PROGRESS)? {
            return Ok((progress::normal(Some(doc)), true));
        }
        Ok(match read_save(player, crate::LEGACY)? {
            Some(old) if progress::has_progress(&old) => {
                host::log(LogLevel::Info, "taking in the old campaign save");
                (progress::import_legacy(&old), false)
            }
            _ => (progress::empty(), false),
        })
    }

    /// The record as the game reads it (without the claim ids it keeps).
    fn public(doc: &Value) -> Value {
        let mut d = doc.clone();
        if let Some(m) = d.as_object_mut() {
            m.remove("seen");
        }
        d
    }

    /// A verified win: the record first, then the payment, so a payment never
    /// lands without its progress, and a resent claim changes the record once.
    fn verified(game: &str, player: &str, win: &Win, boards: u64) -> Value {
        let late = match win.lane {
            Lane::Daily => match daily_day(player, win) {
                Ok(late) => late,
                Err(v) => return v,
            },
            _ => false,
        };
        let (mut doc, stored) = match read_progress(player) {
            Ok(r) => r,
            Err(v) => return v,
        };
        let changed = match progress::apply(&mut doc, win, win.claim_id.as_deref(), win.n, boards) {
            Err(Wait::Order) => return retry("order"),
            Ok(changed) => changed,
        };
        // THE KIT is due once the player is past board 1 (this win included) and its mark
        // still reads 0: board 1's first win, or the next win of a player who was past it
        // before the kit existed. The record notes a mark read as 1, so it is read no more.
        let mut kit = false;
        let mut marked = false;
        if doc["campaign"]["next"].as_u64().unwrap_or(1) > 1 && doc["kit"] != json!(true) {
            match value_of(player, pay::kit_mark().0) {
                Ok(v) if v >= 1.0 => {
                    doc["kit"] = json!(true);
                    marked = true;
                }
                Ok(_) => kit = true,
                Err(v) => return v,
            }
        }
        if changed || marked || !stored {
            if let Err(v) = write_save(player, crate::PROGRESS, &doc) {
                return v;
            }
        }
        let mut verdict = match win.lane {
            Lane::Daily => daily_win(game, player, win, late, kit),
            _ => board_win(player, win, kit),
        };
        if verdict["status"] != "retry" {
            verdict["progress"] = public(&doc);
        }
        verdict
    }

    impl Guest for Function {
        fn handle(input: Vec<u8>) -> Result<Vec<u8>, String> {
            let ctx = host::get_context();
            let Caller::Player(player) = ctx.caller else {
                return Err("this function checks a player's own win: call it as a player".into());
            };
            if serde_json::from_slice::<Value>(&input).ok().and_then(|v| v.get("what").cloned()) == Some(json!("levels")) {
                return Ok(json!({ "v": 1, "levels": claim::LEVELS }).to_string().into_bytes());
            }
            if serde_json::from_slice::<Value>(&input).ok().and_then(|v| v.get("what").cloned()) == Some(json!("progress")) {
                let verdict = match read_progress(&player) {
                    Ok((doc, stored)) => {
                        if !stored && doc.get("imported").is_some() {
                            if let Err(v) = write_save(&player, crate::PROGRESS, &doc) {
                                return Ok(v.to_string().into_bytes());
                            }
                        }
                        json!({ "v": 1, "status": "progress", "progress": public(&doc) })
                    }
                    Err(v) => v,
                };
                return Ok(verdict.to_string().into_bytes());
            }
            let data = claim::data();
            let verdict = match claim::check(&input, &data) {
                Err(r) => {
                    host::log(LogLevel::Info, &format!("refused: {r:?}"));
                    let status = if r == Refusal::UnknownDeal { "retry" } else { "refused" };
                    json!({ "v": 1, "status": status, "reason": r.reason() })
                }
                Ok(win) => {
                    host::log(LogLevel::Info, &format!("won {} {} in {} moves, {} shuffles", win.lane.name(), win.board, win.moves, win.shuffles));
                    verified(&ctx.game_id, &player, &win, data.campaign.len() as u64)
                }
            };
            Ok(verdict.to_string().into_bytes())
        }
    }

    export!(Function);
}
