//! PICTURE MEND's WIN CHECKER, a Gem serverless function (Rust, WebAssembly).
//!
//! The game calls it once per finished board (src/net/claims.ts). It replays the
//! claimed line on a port of the rules (rules.rs) against the deal compiled in
//! from the level files (claim.rs, build.rs), and only for a real win does it:
//!   - campaign / challenge board, or a Souvenir (the bonus board after a trip, docs/souvenirs.md,
//!     accepted once its trip is stamped): move that board's progression ("board_<id>",
//!     completion 1, never resets) to 1, which pays its Coins on completion,
//!     so once per board, ever (the config says how many: gem-backend-game-config.yaml);
//!   - daily: check the date is the player's own today (or yesterday, late),
//!     post the result (moves, time) to the "daily" board under that date, and
//!     move "daily_picture" to 1, which pays once per day;
//!   - an event level (docs/vip.md: a VIP's, from its event's release on): its board progression,
//!     as a campaign board's, and on its first win the item hidden in it (suitcase.rs).
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
//! anything is paid, and the verdict carries the new record. With no record yet it
//! starts empty: no slot the player can write is ever taken in (GSR-006; the old
//! device "campaign" slot was, before 0.1.28). {"v":1,"what":"progress"} only reads it.
//!
//! THE EVENTS (suitcase.rs, docs/vip.md): VIP packs of 30 levels each, with 10 items hidden one per
//! level. A VIP's first verified win of an item's level packs it, in that win's one order;
//! {"v":1,"what":"suitcase"} reads every released event with what the player holds. An event found
//! full and unpaid, by either, pays its prize (its table and helpers) in an order of its own, once.
//! There is no swap any more ({"v":1,"what":"swap"} answers "closed"), and the dailies pack nothing.
//! While src/net/suitcase-ids.json says `"on": false`, or for a player who is not VIP, an event
//! level is refused "vip_only", the read answers no events ("off": true), and no prize is paid.
//!
//! THE ACHIEVEMENTS (count.rs, docs/achievements.md): after a verified win is paid, one more order
//! sets every counter to what the record says (progression_max), so earlier wins count too; the
//! platform unlocks an achievement from it (on release only), and the verdict lists what it
//! unlocked ("achievements": [{ id, points }]). The record keeps the counts too ("counts"), so the
//! game sees which thresholds a verdict crossed. That order failing never changes the verdict:
//! the next verified win sets them all again.
//!
//! Who pays is always the player who called (get-context), never anyone the
//! input names. Every progression this writes has `function_may_grant: true`:
//! this function is the only check on what they pay.

pub mod canon;
pub mod claim;
pub mod count;
pub mod pay;
pub mod progress;
pub mod rules;
pub mod suitcase;
pub mod vip;

/// The daily challenge's progression (gem-backend-game-config.yaml): its id and slug.
pub const DAILY_ID: &str = "6d1f3b0e-8a52-4c7e-9f14-2b6e0d9a7c31";
pub const DAILY_SLUG: &str = "daily_picture";
/// The daily archive's progression (gem-backend-game-config.yaml, make-config.mts has the same):
/// one added per past day a VIP's first win pays, which pays that day's Coins (its on_add mapping).
pub const ARCHIVE_ID: &str = "795d5832-be77-44b1-a949-6ae8ec1c629d";
/// The run type the daily's results are posted as, and its board.
pub const DAILY_RUN: &str = "daily_result";
/// The save slot holding the player's progress, written only by this function. The only
/// slot it reads progress from: none the player can write (release report GSR-006).
pub const PROGRESS: &str = "progress";

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
    use crate::count;
    use crate::pay;
    use crate::progress::{self, Wait};
    use crate::suitcase;
    use crate::vip;

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
        /// The gifts the order carried: "kit", "hard", "stamp", "daily" (and "suitcase", added by a prize).
        gifts: Vec<&'static str>,
        /// The receipt's changes, for what else the order carried (the day's suitcase item).
        changes: Vec<Value>,
    }

    impl Granted {
        fn nothing() -> Granted {
            Granted { coins: 0, items: Vec::new(), first: false, helpers: pay::none(), gifts: Vec::new(), changes: Vec::new() }
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
    /// if due. `extra` gives more operations for that first completion (asked only then). Ok(what
    /// landed now) or Err(verdict).
    fn pay_win(
        player: &str,
        progression: &str,
        what: &str,
        nonce: &str,
        gift: Option<pay::Gift>,
        extra: &mut dyn FnMut() -> Result<Vec<Value>, Value>,
        kit: bool,
    ) -> Result<Granted, Value> {
        let first = value_of(player, progression)? < 1.0;
        let more = if first { extra()? } else { Vec::new() };
        let Some(order) = pay::order(progression, what, nonce, first, gift, more, kit) else {
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
        let mut g = Granted { first, helpers: pay::landed(&changes), gifts: order.gifts.clone(), changes: changes.clone(), ..Granted::nothing() };
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
        let done = pay_win(player, progression, &what, &nonce, pay::gift_of(win.lane.clone(), &win.board), &mut || Ok(Vec::new()), kit).map(|mut g| {
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

    /// Which day a daily claim is for, as the platform dates the player's own days.
    #[derive(Clone, Copy)]
    enum Day {
        /// The player's today.
        Today,
        /// Yesterday, for a player who is not VIP: recorded, unpaid.
        Late,
        /// A VIP's past day in the archive (vip.rs): its Coins, if it was never won.
        Past,
    }

    /// The claim's day. Err: the verdict: a date after today ("wrong_day"); a past day for a player
    /// who is not VIP ("vip_only", yesterday excepted); a VIP's day older than the archive ("too_old").
    fn daily_kind(player: &str, win: &Win, vip: bool) -> Result<Day, Value> {
        let date = win.date.clone().unwrap_or_default();
        let today = match daily_date(player, 0)? {
            Some(d) => d,
            None => return Err(retry("config")),
        };
        let refused = |why: &str| json!({ "v": 1, "status": "refused", "reason": why, "lane": "daily", "board": win.board, "today": today });
        if date == today {
            return Ok(Day::Today);
        }
        if date.as_str() > today.as_str() {
            return Err(refused("wrong_day"));
        }
        if vip {
            return if vip::in_archive(&date, &today) { Ok(Day::Past) } else { Err(refused("too_old")) };
        }
        match daily_date(player, 1)? {
            Some(d) if d == date => Ok(Day::Late),
            _ => Err(refused("vip_only")),
        }
    }

    fn daily_win(game: &str, player: &str, win: &Win, late: bool, kit: bool, vip: bool) -> Value {
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
        // the date is the platform's (the player's own day), so the nonce keys one daily a day;
        // the day's first win pays the day's helper (pay::daily_gift) with the day's mark
        let g = match pay_win(player, crate::DAILY_ID, &format!("daily {date}"), &format!("daily:{date}"), pay::daily_gift(&date), &mut || Ok(Vec::new()), kit) {
            Ok(g) => g,
            Err(v) => return v,
        };
        let _ = vip; // the events left the dailies: nothing here is VIP's now
        let mut verdict = json!({
            "v": 1, "status": "kept", "lane": "daily", "board": win.board, "date": date,
            "moves": win.moves, "ms": win.ms, "coins": g.coins, "items": g.items, "recorded": recorded, "first": first,
        });
        verdict["status"] = json!(g.status());
        verdict["helpers"] = g.helpers.clone();
        verdict["gifts"] = json!(g.gifts);
        verdict
    }

    /// Add what landed of each helper to a tally.
    fn add(tally: &mut Value, landed: &Value) {
        for k in pay::KINDS {
            tally[k] = json!(tally[k].as_i64().unwrap_or(0) + landed[k].as_i64().unwrap_or(0));
        }
    }

    /// A cursor, safe in a query string.
    fn escape(s: &str) -> String {
        s.bytes()
            .map(|b| if b.is_ascii_alphanumeric() || b"-_.~".contains(&b) { (b as char).to_string() } else { format!("%{b:02X}") })
            .collect()
    }

    /// Every item row the player holds ({ item_definition_id, quantity }), page by page. Err: the verdict.
    fn items_held(player: &str) -> Result<Vec<Value>, Value> {
        let mut rows: Vec<Value> = Vec::new();
        let mut cursor = String::new();
        for _ in 0..8 {
            let q = if cursor.is_empty() { String::new() } else { format!("&item_cursor={}", escape(&cursor)) };
            let res = api("GET", format!("/v1/inventory/players/{player}?item_limit=200&progression_limit=1&currency_limit=1{q}"), None).map_err(|e| {
                host::log(LogLevel::Warn, &format!("inventory: no answer: {e}"));
                retry("platform")
            })?;
            if !(200..300).contains(&res.status) {
                host::log(LogLevel::Warn, &format!("inventory answered {}: {}", res.status, res.body));
                return Err(retry(if passing(res.status) { "platform" } else { "config" }));
            }
            let items = &res.body["items"];
            rows.extend(items["data"].as_array().cloned().unwrap_or_default());
            match (items["has_more"].as_bool(), items["next_cursor"].as_str()) {
                (Some(true), Some(c)) if !c.is_empty() => cursor = c.to_string(),
                _ => break,
            }
        }
        Ok(rows)
    }

    /// A full event's prize, unless its mark says it is paid: Ok(Some((what landed of each helper,
    /// the items it granted now: its table, by id))) when it is paid now, Ok(None) when it was paid
    /// before. Err: not paid yet.
    fn settle_prize(player: &str, m: suitcase::Event, vip: bool) -> Result<Option<(Value, Vec<String>)>, Value> {
        // the event not open to this player: no prize, however full the suitcase held
        let Some(o) = suitcase::prize(m, vip) else { return Err(json!({ "v": 1, "status": "closed", "off": true })) };
        if value_of(player, suitcase::mark(m))? >= 1.0 {
            return Ok(None);
        }
        let body = json!({ "source": "reward", "nonce": o.nonce, "operations": o.operations });
        let res = api("POST", format!("/v1/inventory/players/{player}/orders"), Some(body)).map_err(|e| {
            host::log(LogLevel::Warn, &format!("order {}: no answer: {e}", o.nonce));
            retry("platform")
        })?;
        if res.status == 409 {
            return Ok(None); // a call racing this one paid it
        }
        if !(200..300).contains(&res.status) || res.body["status"] == "failed" {
            host::log(LogLevel::Warn, &format!("order {} answered {}: {}", o.nonce, res.status, res.body));
            return Err(retry(if passing(res.status) { "platform" } else { "config" }));
        }
        let changes = res.body["changes"].as_array().map(|v| v.as_slice()).unwrap_or(&[]);
        let landed = pay::landed(changes);
        let items: Vec<String> = changes
            .iter()
            .filter(|ch| ch["type"] == "item" && ch["quantity_after"].as_i64().unwrap_or(0) > ch["quantity_before"].as_i64().unwrap_or(0))
            .filter_map(|ch| ch["item_definition_id"].as_str().map(str::to_string))
            .collect();
        host::log(LogLevel::Info, &format!("event {}: full, prize paid, helpers {landed}, items {items:?}", suitcase::name(m)));
        Ok(Some((landed, items)))
    }

    /// The suitcase's numbers, from the server (analytics_events, sources: server). Never in the way of a verdict.
    fn record(game: &str, events: Vec<Value>) {
        let Some(first) = events.first() else { return };
        let batch = json!({ "batch_id": first["event_uid"].clone(), "sent_at_ms": host::now_ms(), "events": events });
        match api("POST", format!("/v1/games/{game}/analytics/events"), Some(batch)) {
            Ok(a) if (200..300).contains(&a.status) => {
                if a.body["rejected"].as_array().is_some_and(|r| !r.is_empty()) {
                    host::log(LogLevel::Warn, &format!("analytics: {}", a.body));
                }
            }
            Ok(a) => host::log(LogLevel::Warn, &format!("analytics answered {}: {}", a.status, a.body)),
            Err(e) => host::log(LogLevel::Warn, &format!("analytics: no answer: {e}")),
        }
    }

    /// The player's own date for the daily. Err: the verdict.
    fn today_of(player: &str) -> Result<String, Value> {
        match daily_date(player, 0)? {
            Some(d) => Ok(d),
            None => Err(retry("config")),
        }
    }

    /// {"v":1,"what":"suitcase"}: every event released by the player's today, newest first, with the
    /// items they hold, for a VIP; a full one whose prize is still unpaid is paid now (a few a call at
    /// most). `current` (the newest) and `past` (the rest) repeat `events` for a build from before.
    fn suitcase_read(player: &str, vip: bool) -> Value {
        let today = match today_of(player) {
            Ok(d) => d,
            Err(v) => return v,
        };
        if !suitcase::open(vip) {
            // not open to this player: no events, and nothing is read or paid (the items held stay
            // put). `today` keeps a build from asking again and again.
            return json!({ "v": 1, "status": "suitcase", "off": true, "today": today, "events": [], "current": null, "past": [], "helpers": pay::none(), "gifts": [], "prizes": [] });
        }
        let rows = match items_held(player) {
            Ok(r) => r,
            Err(v) => return v,
        };
        let mut helpers = pay::none();
        let mut prizes: Vec<&str> = Vec::new();
        let mut list: Vec<Value> = Vec::new();
        for e in suitcase::shown(&today) {
            let c = suitcase::counts(e, &rows);
            let mut paid = false;
            if suitcase::complete(e, &c) {
                paid = match value_of(player, suitcase::mark(e)) {
                    Ok(v) if v >= 1.0 => true,
                    Ok(_) if prizes.len() < 3 => match settle_prize(player, e, vip) {
                        Ok(landed) => {
                            if let Some((l, _)) = landed {
                                add(&mut helpers, &l);
                                prizes.push(suitcase::name(e));
                            }
                            true
                        }
                        Err(_) => false,
                    },
                    _ => false,
                };
            }
            list.push(suitcase::state(e, &c, paid));
        }
        let gifts = if prizes.is_empty() { json!([]) } else { json!(["suitcase"]) };
        let current = list.first().cloned().unwrap_or(Value::Null);
        let past: Vec<Value> = list.iter().skip(1).cloned().collect();
        json!({ "v": 1, "status": "suitcase", "today": today, "events": list, "current": current, "past": past, "helpers": helpers, "gifts": gifts, "prizes": prizes })
    }

    /// An event level's claim may be paid: its event (the level is one of an event's), the events
    /// open to this player (switched on, VIP), and the event released by their today. Err: the verdict.
    fn event_gate(player: &str, win: &Win, vip: bool) -> Result<suitcase::Event, Value> {
        let refused = |why: &str| json!({ "v": 1, "status": "refused", "reason": why, "lane": "event", "board": win.board });
        let Some(e) = suitcase::of_level(&win.board) else { return Err(refused("unknown_event")) };
        if !suitcase::open(vip) {
            return Err(refused("vip_only"));
        }
        let today = today_of(player)?;
        if !suitcase::released(e, &today) {
            let mut v = refused("not_released");
            v["today"] = json!(today);
            v["release"] = json!(suitcase::release(e));
            return Err(v);
        }
        Ok(e)
    }

    /// A VIP's win of an event level: its Coins once (its board progression, as a campaign board's),
    /// and on that first win the item hidden in it, in the same one order; then, if every item of the
    /// event is held, its prize (settle_prize), once.
    fn event_win(game: &str, player: &str, win: &Win, e: suitcase::Event, kit: bool, vip: bool) -> Value {
        let Some(progression) = pay::board_id(&win.board) else {
            host::log(LogLevel::Warn, &format!("no progression for event level {}", win.board));
            return retry("config");
        };
        let at = suitcase::item_at(e, &win.board);
        let mut before: Option<Vec<u32>> = None;
        let paid = pay_win(
            player,
            progression,
            &format!("event {}", win.board),
            &format!("first:event:{}", win.board),
            None,
            &mut || {
                let Some(at) = at else { return Ok(Vec::new()) };
                before = Some(suitcase::counts(e, &items_held(player)?));
                Ok(suitcase::pack(e, at, &win.board))
            },
            kit,
        );
        let mut g = match paid {
            Ok(g) => g,
            Err(v) => return v,
        };
        // the item is told as `packed`, not among the tables and keepsakes `items` names
        let item_uuid = at.map(|i| suitcase::uuid(e, i));
        let mut items: Vec<String> = g.items.iter().filter(|i| Some(i.as_str()) != item_uuid).cloned().collect();
        let mut verdict = json!({
            "v": 1, "status": "kept", "lane": "event", "board": win.board, "event": suitcase::name(e),
            "moves": win.moves, "coins": g.coins, "items": items,
        });
        if let (Some(at), Some(c), true) = (at, before, g.first) {
            // the order landed with the item in it
            let now = suitcase::after(e, &c, &g.changes);
            let level = suitcase::position(e, &win.board);
            verdict["packed"] = json!({ "item": suitcase::items(e)[at]["id"], "count": now[at] });
            let mut events = vec![suitcase::record(
                player,
                "event_item",
                &win.board,
                json!({ "event": suitcase::name(e) }),
                json!({ "found": suitcase::found(&now), "level": level }),
            )];
            let mut paid = false;
            if suitcase::complete(e, &now) {
                match settle_prize(player, e, vip) {
                    Ok(landed) => {
                        paid = true;
                        if let Some((l, granted)) = landed {
                            add(&mut g.helpers, &l);
                            g.gifts.push("suitcase");
                            // the prize's table (its own order): named on the win card with the rest
                            items.extend(granted);
                            verdict["items"] = json!(items);
                        }
                        if !suitcase::complete(e, &c) {
                            events.push(suitcase::record(player, "event_complete", suitcase::name(e), json!({ "event": suitcase::name(e) }), json!({ "level": level })));
                        }
                    }
                    Err(_) => host::log(LogLevel::Warn, &format!("event {}: full, its prize waits for the next read", suitcase::name(e))),
                }
            }
            verdict["suitcase"] = suitcase::state(e, &now, paid);
            record(game, events);
        }
        let helped = pay::KINDS.iter().any(|k| g.helpers[*k].as_i64().unwrap_or(0) > 0);
        verdict["status"] = json!(if g.coins > 0 || !items.is_empty() || verdict.get("packed").is_some() || helped { "paid" } else { "kept" });
        verdict["helpers"] = g.helpers.clone();
        verdict["gifts"] = json!(g.gifts);
        verdict
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

    /// The player's progress record, and whether it is stored yet: the "progress" slot
    /// alone, empty when there is none (progress::from_saves; never a slot the player writes).
    fn read_progress(player: &str) -> Result<(Value, bool), Value> {
        progress::from_saves(|key| read_save(player, key))
    }

    /// Set the achievements' counters to what the record says (count.rs), in an order of its own,
    /// after the win's payment: a channel whose config has no counters yet, or a refusal, costs
    /// only this order, never the payment, and the next verified win sets them again. The nonce is
    /// the claim's, so a resend of it writes once. What it unlocked (release only), else nothing.
    fn count_up(player: &str, doc: &Value, claim_id: Option<&str>) -> Vec<Value> {
        let operations = count::operations(doc, count::plan());
        if operations.is_empty() {
            return Vec::new();
        }
        let nonce = format!("count:{}", claim_id.map(str::to_string).unwrap_or_else(|| host::now_ms().to_string()));
        let body = json!({ "source": "reward", "nonce": nonce, "operations": operations });
        let res = match api("POST", format!("/v1/inventory/players/{player}/orders"), Some(body)) {
            Ok(r) => r,
            Err(e) => {
                host::log(LogLevel::Warn, &format!("order {nonce}: no answer: {e}"));
                return Vec::new();
            }
        };
        if res.status == 409 {
            return Vec::new(); // this claim's counts were set before (a resend)
        }
        if !(200..300).contains(&res.status) || res.body["status"] == "failed" {
            host::log(LogLevel::Warn, &format!("order {nonce} answered {}: {}", res.status, res.body));
            return Vec::new();
        }
        let changes = res.body["changes"].as_array().cloned().unwrap_or_default();
        let receipts = count::receipts(&changes);
        if !receipts.is_empty() {
            host::log(LogLevel::Info, &format!("achievements: {}", receipts.join(", ")));
        }
        count::unlocked(&changes)
    }

    /// The record as the game reads it (without the claim ids it keeps).
    fn public(doc: &Value) -> Value {
        let mut d = doc.clone();
        if let Some(m) = d.as_object_mut() {
            m.remove("seen");
        }
        d
    }

    /// A VIP's past day (Day::Past, vip.rs), whose payment the record already notes as owed: its
    /// Coins (the archive's progression, one day more, which pays that day's Coins), in an order of
    /// its own ("past:<date>"). Once the platform confirms it landed, the record's owed mark is
    /// cleared. `in_archive` is always true now (a VIP's day older than the archive is refused); a
    /// day won before pays nothing ("won_before").
    fn past_win(player: &str, win: &Win, doc: &mut Value, coins: bool) -> Value {
        let date = win.date.clone().unwrap_or_default();
        let mut verdict = json!({
            "v": 1, "status": "kept", "lane": "daily", "board": win.board, "date": date, "moves": win.moves, "ms": win.ms,
            "coins": 0, "items": [], "recorded": false, "first": false, "helpers": pay::none(), "gifts": [],
            "archive": if coins { "paid" } else { "won_before" },
        });
        if !coins {
            return verdict;
        }
        let ops = vec![json!({ "type": "progression_add", "progression_definition_id": crate::ARCHIVE_ID, "amount": 1, "reason": format!("daily {date}: a past day, verified") })];
        let nonce = format!("past:{date}");
        let body = json!({ "source": "reward", "nonce": nonce, "operations": ops });
        let res = match api("POST", format!("/v1/inventory/players/{player}/orders"), Some(body)) {
            Ok(r) => r,
            Err(e) => {
                host::log(LogLevel::Warn, &format!("order {nonce}: no answer: {e}"));
                return retry("platform");
            }
        };
        let landed_before = res.status == 409;
        if !landed_before && (!(200..300).contains(&res.status) || res.body["status"] == "failed") {
            host::log(LogLevel::Warn, &format!("order {nonce} answered {}: {}", res.status, res.body));
            return retry(if passing(res.status) { "platform" } else { "config" });
        }
        // it landed (now, or before this resend): owed no more
        progress::settle(doc, &date);
        if write_save(player, crate::PROGRESS, doc).is_err() {
            host::log(LogLevel::Warn, &format!("{nonce}: paid, its owed mark waits for the next write (a resend finds it landed)"));
        }
        if landed_before {
            host::log(LogLevel::Info, &format!("order {nonce}: landed before"));
            return verdict;
        }
        let mut paid_coins = 0;
        for ch in res.body["changes"].as_array().into_iter().flatten() {
            if ch["type"] == "platform_grant" {
                paid_coins += ch["granted"].as_i64().unwrap_or(0);
                host::log(LogLevel::Info, &format!("grant {nonce}: {} {} of {}{}", ch["outcome"], ch["granted"], ch["requested"], ch["reason"].as_str().map(|r| format!(" ({r})")).unwrap_or_default()));
            }
        }
        verdict["coins"] = json!(paid_coins);
        verdict["status"] = json!(if paid_coins > 0 { "paid" } else { "kept" });
        verdict
    }

    /// A verified win: the record first, then the payment, so a payment never
    /// lands without its progress, and a resent claim changes the record once.
    fn verified(game: &str, player: &str, win: &Win, boards: u64, vip: bool) -> Value {
        let day = match win.lane {
            Lane::Daily => match daily_kind(player, win, vip) {
                Ok(d) => d,
                Err(v) => return v,
            },
            _ => Day::Today,
        };
        // an event level: VIP, its event released, before anything is recorded
        let event = match win.lane {
            Lane::Event => match event_gate(player, win, vip) {
                Ok(e) => Some(e),
                Err(v) => return v,
            },
            _ => None,
        };
        let (mut doc, stored) = match read_progress(player) {
            Ok(r) => r,
            Err(v) => return v,
        };
        let date = win.date.clone().unwrap_or_default();
        // what a VIP's past day owes, decided before this win is applied (its Coins if it was never
        // won), and what an earlier try of it still owes
        let mut past_coins = false;
        if let Day::Past = day {
            let (owed_coins, _) = progress::owed(&doc, &date);
            past_coins = doc["daily"].get(&date).is_none() || owed_coins;
        }
        let changed = match progress::apply(&mut doc, win, win.claim_id.as_deref(), win.n, boards) {
            Err(Wait::Order) => return retry("order"),
            Ok(changed) => changed,
        };
        let owes = past_coins;
        if owes {
            progress::owe(&mut doc, &date, true, false);
        }
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
        // the achievements' counts ride in the record (count.rs), so the game knows what a verdict
        // moved from; a record from before them gains them on its next verified win
        let counts = count::summary(&doc, count::plan());
        let recounted = doc["counts"] != counts;
        doc["counts"] = counts;
        if changed || marked || recounted || owes || !stored {
            if let Err(v) = write_save(player, crate::PROGRESS, &doc) {
                return v;
            }
        }
        let mut verdict = match (win.lane.clone(), day, event) {
            // a past day pays no kit (it waits for the next win)
            (Lane::Daily, Day::Past, _) => past_win(player, win, &mut doc, past_coins),
            (Lane::Daily, d, _) => daily_win(game, player, win, matches!(d, Day::Late), kit, vip),
            (Lane::Event, _, Some(e)) => event_win(game, player, win, e, kit, vip),
            _ => board_win(player, win, kit),
        };
        if verdict["status"] != "retry" {
            verdict["progress"] = public(&doc);
        }
        if matches!(verdict["status"].as_str(), Some("paid" | "kept" | "late")) {
            let unlocked = count_up(player, &doc, win.claim_id.as_deref());
            if !unlocked.is_empty() {
                verdict["achievements"] = json!(unlocked);
            }
        }
        verdict
    }

    /// THE PLATFORM'S WORD ON VIP: None while the platform cannot say (SDK 17.0.0, docs/vip.md).
    /// When it adds a read, this is the one function to change (vip::decide does the rest).
    fn platform_vip(_player: &str) -> Option<bool> {
        None
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
            let asked = serde_json::from_slice::<Value>(&input).unwrap_or(Value::Null);
            // VIP for this call (vip.rs): every answer below says it, so the game follows the server
            let vip = vip::decide(&ctx.channel, &asked, platform_vip(&player));
            let said = |mut v: Value| -> Result<Vec<u8>, String> {
                v["vip"] = json!(vip);
                Ok(v.to_string().into_bytes())
            };
            if asked["what"] == "vip" {
                return said(json!({ "v": 1, "status": "vip" }));
            }
            if asked["what"] == "suitcase" {
                return said(suitcase_read(&player, vip));
            }
            if asked["what"] == "swap" {
                // no swap since the events became level packs (docs/vip.md, 2026-10-30)
                return said(json!({ "v": 1, "status": "closed", "reason": "no_swap" }));
            }
            if asked["what"] == "progress" {
                return said(match read_progress(&player) {
                    Ok((doc, _)) => json!({ "v": 1, "status": "progress", "progress": public(&doc) }),
                    Err(v) => v,
                });
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
                    verified(&ctx.game_id, &player, &win, data.campaign.len() as u64, vip)
                }
            };
            said(verdict)
        }
    }

    export!(Function);
}
