//! PICTURE MEND's WIN CHECKER, a Gem serverless function (Rust, WebAssembly).
//!
//! The game calls it once per finished board (src/net/claims.ts). It replays the
//! claimed line on a port of the rules (rules.rs) against the deal compiled in
//! from the level files (claim.rs, build.rs), and only for a real win does it:
//!   - campaign / challenge board, or a Souvenir (the bonus board after a trip, docs/souvenirs.md,
//!     accepted once its trip is stamped): move that board's progression ("board_<id>",
//!     completion 1, never resets) to 1, which pays its Coins on completion,
//!     so once per board, ever (the config says how many: gem-backend-game-config.yaml);
//!   - daily: check the date is the player's own today, post the result (moves, time) to the
//!     "daily" board under that date, and move "daily_picture" to 1, which pays once per day; a
//!     past day in the archive (vip.rs's window, for everyone since 2026-11-10) pays once through
//!     the archive's progression;
//!   - an event level (docs/vip.md: anyone's since 2026-11-10, from its event's release on): its
//!     board progression, as a campaign board's, and on its first win the item hidden in it (suitcase.rs).
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
//! THE EVENTS (suitcase.rs, docs/vip.md): packs of 30 levels each, with 10 items hidden one per
//! level, open to everyone (the creator, 2026-11-10: VIP gates no content). The first verified win of
//! an item's level packs it, in that win's one order; {"v":1,"what":"suitcase"} reads every released
//! event with what the player holds. An event found full and unpaid, by either, pays its prize (its
//! table and stamp) in an order of its own, once. There is no swap any more ({"v":1,"what":"swap"}
//! answers "closed"), and the dailies pack nothing. While src/net/suitcase-ids.json says
//! `"on": false`, an event level is refused "events_off", the read answers no events ("off": true),
//! and no prize is paid.
//!
//! VIP'S GIFTS (vip.rs `due`, pay.rs `vip_order`; docs/vip.md; the creator, 2026-11-01): a VIP's
//! helpers are not free; {"v":1,"what":"vip_gift"} pays a VIP, on their own date, the day's gift (2
//! helpers, by the day of their week) once a date, and the welcome (8) once a membership, each its
//! own order, clamped at the cap; the answer lists what it paid and what landed. Not VIP: nothing.
//! VIP unknown (the pass read failed): nothing, and "retry".
//!
//! ONE CALL PAYS ONCE (the platform: "a second paying order in the same call is suppressed",
//! function_invocation_already_granted; SDK inventory-and-catalogs.md). So everything a win pays rides
//! in ONE order: the reward, its gifts, the VIP extra and the achievements' counters (prepare). 0.1.54
//! paid the extra in a second order, and the platform suppressed its Coins (QA, 2026-11-10).
//!
//! THE VIP EXTRA (pay.rs, docs/vip.md; the creator, 2026-11-10): for a VIP, every reward a verified win
//! pays pays +50% Coins (each grant its own, reckoned from what the config pays: data/coins.json) and as
//! many helpers again, inside the reward's own order, so with it and once ever. The pass is read at most
//! once a call, just before that order, and only by a call that pays something or holds an extra. Not
//! VIP: nothing. A passing hiccup reading it holds the claim ("retry"), so base and extra pay together;
//! any other failure pays the base and holds the extra in the record ("vipOwed", progress.rs), paid
//! inside a later paying claim's order with the held mark raised in it (pay::add_held), or dropped by a
//! claim that reads not VIP. The verdict says what landed: coins (all), base, vipExtra, helpers (all),
//! vipHelpers, vipLate (held extras that landed now), vipRead (yes, no, unknown) and vipHeld.
//! src/net/vip-extra.json's gamePays false pays none of it (the Arcade's, then).
//!
//! THE EVENTS ARE PLAYED IN ORDER (the creator, 2026-11-10): an event's level N pays only once its
//! levels 1 to N-1 are won (the record's "event"); otherwise "out_of_order", with the level that is
//! next. A level won already is never refused (a replay, or a win from before the rule).
//!
//! THE ACHIEVEMENTS (count.rs, docs/achievements.md): the win's paying order also sets every counter to
//! what the record says (progression_max), so earlier wins count too (a win that places no paying order
//! sets them in an order of their own, its call's one); the
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
pub mod gift;
pub mod pay;
pub mod progress;
pub mod rules;
pub mod suitcase;
pub mod timing;
pub mod vip;

/// The daily challenge's progression (gem-backend-game-config.yaml): its id and slug.
pub const DAILY_ID: &str = "6d1f3b0e-8a52-4c7e-9f14-2b6e0d9a7c31";
pub const DAILY_SLUG: &str = "daily_picture";
/// The daily archive's progression (gem-backend-game-config.yaml, make-config.mts has the same):
/// one added per past day whose first win pays (anyone's since 2026-11-10), which pays that day's Coins (its on_add mapping).
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

    /// One platform call, timed (src/timing.rs): a debug line as it starts, so a call that times out
    /// shows the request it hung on, and a warning with its time when it is slow. `what` names the
    /// route only, never a player id. Nothing about the call or its answer changes.
    fn timed<T>(what: &str, call: impl FnOnce() -> T, said: impl Fn(&T) -> String) -> T {
        host::log(LogLevel::Debug, &format!("calling {what}"));
        let started = host::now_ms();
        let out = call();
        let ms = host::now_ms().saturating_sub(started);
        if crate::timing::slow(ms) {
            host::log(LogLevel::Warn, &format!("slow platform call: {what} took {ms} ms ({})", said(&out)));
        }
        out
    }

    fn api(method: &str, path: String, body: Option<Value>) -> Result<Answer, String> {
        let what = format!("{method} {}", crate::timing::route(&path));
        let res = timed(
            &what,
            || {
                host::call_api(&ApiRequest {
                    method: method.into(),
                    path,
                    body: body.map(|b| b.to_string().into_bytes()).unwrap_or_default(),
                })
            },
            |r| match r {
                Ok(a) => format!("answered {}", a.status),
                Err(_) => "no answer".into(),
            },
        )?;
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

    /// THIS CALL'S PAYING ORDER, as it goes (one call pays once: everything rides in one order).
    /// verified() starts it; prepare() fills an order with it; landed() reads the order's receipt.
    #[derive(Default)]
    struct Call {
        /// The record's held VIP extras still owed (their number above the held mark), to pay inside
        /// this call's paying order: (key, extra, number). Emptied once an order carries them.
        held: Vec<(String, pay::Extra, u64)>,
        /// The pass was read in this call.
        read: bool,
        /// What the order being placed asked as VIP extra: this reward's, and the held ones' (with
        /// the highest number among them).
        now: pay::Extra,
        late: pay::Extra,
        upto: Option<u64>,
        /// The order being placed would hold its extra (VIP unknown): its key and the extra.
        hold: Option<(String, pay::Extra)>,
        /// What landed of the extras, this reward's and the held ones'.
        got_now: pay::Extra,
        got_late: pay::Extra,
        /// Extras to hold in the record once this call's orders are in, and the held number paid now.
        to_hold: Vec<(String, pay::Extra)>,
        held_paid: Option<u64>,
        /// The achievements' counters (count.rs) for the paying order; `counted` once one landed with
        /// them (its unlocks in `unlocked`), `riding` while the order being placed carries them.
        counts: Vec<Value>,
        riding: bool,
        counted: bool,
        unlocked: Vec<Value>,
    }

    thread_local! {
        /// A function instance runs one call at a time; verified() starts this afresh.
        static CALL: std::cell::RefCell<Call> = std::cell::RefCell::new(Call::default());
    }

    /// Fill a reward's order before it is placed (the call's one paying order): the achievements'
    /// counters, and for a VIP the reward's extra and any held extras (with the held mark). The pass is
    /// read here, once a call, only when there is an extra to pay. Err: the verdict ("retry" for a
    /// passing hiccup reading the pass: the claim is held, and base and extra pay together later).
    fn prepare(o: &mut pay::Order, vip: VipWord, what: &str) -> Result<(), Value> {
        CALL.with(|c| {
            let mut c = c.borrow_mut();
            if !c.counted && !c.counts.is_empty() {
                o.operations.extend(c.counts.iter().cloned());
                c.riding = true;
            }
        });
        if !pay::vip_game_pays() {
            return Ok(());
        }
        let x = pay::extra_of(o);
        let held = CALL.with(|c| c.borrow().held.clone());
        if x.nothing() && held.is_empty() {
            return Ok(());
        }
        CALL.with(|c| c.borrow_mut().read = true);
        match vip() {
            Ok(true) => {
                pay::add_extra(o, &x, &format!("vip extra: {what}"));
                let mut late = pay::Extra::zero();
                for (_, e, _) in &held {
                    late.add(e);
                }
                let upto = held.iter().map(|h| h.2).max();
                if let Some(n) = upto {
                    pay::add_held(o, &late, n);
                }
                CALL.with(|c| {
                    let mut c = c.borrow_mut();
                    c.now = x;
                    c.late = late;
                    c.upto = upto;
                    c.held.clear();
                });
                Ok(())
            }
            Ok(false) => Ok(()),
            Err("platform") => Err(retry("platform")),
            Err(_) => {
                CALL.with(|c| c.borrow_mut().hold = Some((o.nonce.clone(), x)));
                Ok(())
            }
        }
    }

    /// The order prepare() filled has landed (`changes`: its receipt): what landed of the extras
    /// (Coins on the extra's progression; helpers past what the reward itself asked), the held ones
    /// paid, the extra to hold, and the counters set (with what they unlocked). Every Coin grant is
    /// logged, base or extra, with its outcome, and a suppressed or clamped extra as a warning.
    fn landed(o: &pay::Order, what: &str, changes: &[Value]) {
        for ch in changes.iter().filter(|c| c["type"] == "platform_grant") {
            let extra = ch["progression_definition_id"] == pay::vip_coins_id();
            let line = format!(
                "grant {what} [{}]: {} {} of {}{}",
                if extra { "vip extra" } else { "base" },
                ch["outcome"],
                ch["granted"],
                ch["requested"],
                ch["reason"].as_str().map(|r| format!(" ({r})")).unwrap_or_default()
            );
            let short = extra && ch["granted"].as_i64().unwrap_or(0) < ch["requested"].as_i64().unwrap_or(0);
            host::log(if short { LogLevel::Warn } else { LogLevel::Info }, &line);
        }
        CALL.with(|c| {
            let mut c = c.borrow_mut();
            let (coins, _) = pay::split_landed(changes);
            let now_c = coins.min(c.now.coins.max(0));
            let late_c = (coins - now_c).max(0);
            // helpers: what landed past what the reward itself asked goes to the extras, this reward's first
            let all = pay::landed(changes);
            let asked = pay::asked(o);
            let mut now_h = pay::none();
            let mut late_h = pay::none();
            for k in pay::KINDS {
                let extra_ask = c.now.helpers[k].as_u64().unwrap_or(0) + c.late.helpers[k].as_u64().unwrap_or(0);
                let base_ask = asked[k].as_u64().unwrap_or(0).saturating_sub(extra_ask);
                let past = (all[k].as_u64().unwrap_or(0)).saturating_sub(base_ask).min(extra_ask);
                let n = past.min(c.now.helpers[k].as_u64().unwrap_or(0));
                now_h[k] = json!(n);
                late_h[k] = json!(past - n);
            }
            c.got_now.add(&pay::Extra { coins: now_c, helpers: now_h });
            c.got_late.add(&pay::Extra { coins: late_c, helpers: late_h });
            if let Some(n) = c.upto.take() {
                c.held_paid = Some(c.held_paid.map_or(n, |m| m.max(n)));
            }
            if let Some(h) = c.hold.take() {
                if !h.1.nothing() {
                    c.to_hold.push(h);
                }
            }
            if c.riding {
                c.riding = false;
                c.counted = true;
                let receipts = count::receipts(changes);
                if !receipts.is_empty() {
                    host::log(LogLevel::Info, &format!("achievements: {}", receipts.join(", ")));
                }
                c.unlocked = count::unlocked(changes);
            }
            c.now = pay::Extra::zero();
            c.late = pay::Extra::zero();
        });
    }

    /// The order prepare() filled did not land now (it landed before: a reused key): nothing it
    /// carried counts as this call's, and the held extras it carried wait for the held mark to say.
    fn not_landed() {
        CALL.with(|c| {
            let mut c = c.borrow_mut();
            c.now = pay::Extra::zero();
            c.late = pay::Extra::zero();
            c.upto = None;
            c.hold = None;
            c.riding = false;
        });
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
        vip: VipWord,
    ) -> Result<Granted, Value> {
        let first = value_of(player, progression)? < 1.0;
        let more = if first { extra()? } else { Vec::new() };
        let Some(mut order) = pay::order(progression, what, nonce, first, gift, more, kit) else {
            return Ok(Granted::nothing());
        };
        prepare(&mut order, vip, what)?;
        let body = json!({ "source": "reward", "nonce": order.nonce, "operations": order.operations });
        let res = api("POST", format!("/v1/inventory/players/{player}/orders"), Some(body)).map_err(|e| {
            host::log(LogLevel::Warn, &format!("order {}: no answer: {e}", order.nonce));
            retry("platform")
        })?;
        if res.status == 409 {
            // this nonce landed already (a claim racing this one for the same first win)
            host::log(LogLevel::Info, &format!("order {}: landed before: {}", order.nonce, res.body));
            not_landed();
            return Ok(Granted::nothing());
        }
        if !(200..300).contains(&res.status) || res.body["status"] == "failed" {
            host::log(LogLevel::Warn, &format!("order {} answered {}: {}", order.nonce, res.status, res.body));
            // a progression or currency this channel's config does not declare is the config's fault, not the player's
            return Err(retry(if passing(res.status) { "platform" } else { "config" }));
        }
        let changes = res.body["changes"].as_array().cloned().unwrap_or_default();
        landed(&order, what, &changes);
        let mut g = Granted { first, helpers: pay::landed(&changes), gifts: order.gifts.clone(), changes: changes.clone(), ..Granted::nothing() };
        for ch in &changes {
            if ch["type"] == "item" && ch["quantity_after"].as_i64().unwrap_or(0) > ch["quantity_before"].as_i64().unwrap_or(0) {
                let id = ch["item_definition_id"].as_str().unwrap_or_default().to_string();
                host::log(LogLevel::Info, &format!("item {what}: {id}"));
                g.items.push(id);
            }
            if ch["type"] == "platform_grant" {
                // logged by landed(), base or extra, with its outcome
                g.coins += ch["granted"].as_i64().unwrap_or(0);
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

    fn board_win(player: &str, win: &Win, kit: bool, vip: VipWord) -> Value {
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
        let done = pay_win(player, progression, &what, &nonce, pay::gift_of(win.lane.clone(), &win.board), &mut || Ok(Vec::new()), kit, vip).map(|mut g| {
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
        /// A past day in the archive (vip.rs), anyone's since 2026-11-10: its Coins, if it was never won.
        /// True for the player's yesterday, whose result still goes on that day's board.
        Past(bool),
    }

    /// The claim's day. Err: the verdict: a date after today ("wrong_day"), a day older than the
    /// archive ("too_old"). Yesterday is in the archive, so a board finished just after midnight pays
    /// as a past day, and its result still goes on yesterday's board (until 2026-11-10 a player not VIP
    /// had it "late": recorded, unpaid; a VIP had it paid, not recorded).
    fn daily_kind(player: &str, win: &Win) -> Result<Day, Value> {
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
        if vip::in_archive(&date, &today) {
            Ok(Day::Past(vip::add_days(&today, -1).as_deref() == Some(date.as_str())))
        } else {
            Err(refused("too_old"))
        }
    }

    /// The result, on the date's board (moves, then time); the first one a day stands. Ok((recorded,
    /// first)): recorded false when the day has closed for this player. Err: the verdict.
    fn post_run(game: &str, player: &str, win: &Win, date: &str) -> Result<(bool, bool), Value> {
        let run = json!({ "runs": [{
            "run_id": crate::daily_run_id(player, &date),
            "entity_type": "player",
            "entity_id": player,
            "run_type": crate::DAILY_RUN,
            "int_value_1": win.moves,
            "int_value_2": win.ms,
            "period_id": date,
        }]});
        let posted = api("POST", format!("/v1/games/{game}/runs"), Some(run)).map_err(|_| retry("platform"))?;
        let recorded = match posted.status {
            200..=299 => true,
            409 => false, // run_period_closed: the day has closed for this player
            s if passing(s) => return Err(retry("platform")),
            s => {
                host::log(LogLevel::Warn, &format!("runs answered {s}: {}", posted.body));
                return Err(retry("config"));
            }
        };
        Ok((recorded, posted.body["inserted"].as_i64() == Some(1)))
    }

    fn daily_win(game: &str, player: &str, win: &Win, kit: bool, vip: VipWord) -> Value {
        let date = win.date.clone().unwrap_or_default();
        let (recorded, first) = match post_run(game, player, win, &date) {
            Ok(r) => r,
            Err(v) => return v,
        };
        // the date is the platform's (the player's own day), so the nonce keys one daily a day;
        // the day's first win pays the day's helper (pay::daily_gift) with the day's mark
        let g = match pay_win(player, crate::DAILY_ID, &format!("daily {date}"), &format!("daily:{date}"), pay::daily_gift(&date), &mut || Ok(Vec::new()), kit, vip) {
            Ok(g) => g,
            Err(v) => return v,
        };
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
    fn settle_prize(player: &str, m: suitcase::Event) -> Result<Option<(Value, Vec<String>)>, Value> {
        // the events switched off: no prize, however full the suitcase held
        let Some(o) = suitcase::prize(m) else { return Err(json!({ "v": 1, "status": "closed", "off": true })) };
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
        host::log(LogLevel::Info, &format!("event {}: full, prize paid (its table and stamp), items {items:?}", suitcase::name(m)));
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

    /// The events whose prize is paid (their mark: the Passport stamp, with the table), newest
    /// release first. Err: the verdict.
    fn stamps_of(player: &str, today: &str) -> Result<Vec<&'static str>, Value> {
        let mut out = Vec::new();
        for e in suitcase::shown(today) {
            if value_of(player, suitcase::mark(e))? >= 1.0 {
                out.push(suitcase::name(e));
            }
        }
        Ok(out)
    }

    /// {"v":1,"what":"suitcase"}: every event released by the player's today, newest first, with the
    /// items they hold, for anyone; a full one whose prize is still unpaid is paid now (a few a call at
    /// most). `current` (the newest) and `past` (the rest) repeat `events` for a build from before.
    /// `stamps`: the events whose prize is paid (stamps_of).
    fn suitcase_read(player: &str) -> Value {
        let today = match today_of(player) {
            Ok(d) => d,
            Err(v) => return v,
        };
        if !suitcase::on() {
            // switched off: no events, and nothing is paid (the items held stay put), but the stamps
            // earned stay theirs. `today` keeps a build from asking again and again.
            let stamps = match stamps_of(player, &today) {
                Ok(s) => s,
                Err(v) => return v,
            };
            return json!({ "v": 1, "status": "suitcase", "off": true, "today": today, "events": [], "current": null, "past": [], "helpers": pay::none(), "gifts": [], "prizes": [], "stamps": stamps });
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
                    Ok(_) if prizes.len() < 3 => match settle_prize(player, e) {
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
        let stamps: Vec<Value> = list.iter().filter(|e| e["paid"] == true).map(|e| e["id"].clone()).collect();
        json!({ "v": 1, "status": "suitcase", "today": today, "events": list, "current": current, "past": past, "helpers": helpers, "gifts": gifts, "prizes": prizes, "stamps": stamps })
    }

    /// An event level's claim may be paid: its event (the level is one of an event's), the events
    /// switched on, and the event released by their today: anyone's, VIP or not (the creator,
    /// 2026-11-10). Err: the verdict.
    fn event_gate(player: &str, win: &Win) -> Result<suitcase::Event, Value> {
        let refused = |why: &str| json!({ "v": 1, "status": "refused", "reason": why, "lane": "event", "board": win.board });
        let Some(e) = suitcase::of_level(&win.board) else { return Err(refused("unknown_event")) };
        if !suitcase::on() {
            return Err(refused("events_off"));
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

    /// A win of an event level: its Coins once (its board progression, as a campaign board's),
    /// and on that first win the item hidden in it, in the same one order; a later win of a level
    /// whose item is still not held packs it then, in an order of its own (an item can move to a level
    /// already won: Levels' random placement, bfe50f2), once per item. Then, if every item of the
    /// event is held, its prize (settle_prize), once.
    fn event_win(game: &str, player: &str, win: &Win, e: suitcase::Event, kit: bool, vip: VipWord) -> Value {
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
            vip,
        );
        let mut g = match paid {
            Ok(g) => g,
            Err(v) => return v,
        };
        // won before, its item not held: the item now (its own nonce: once per item, ever)
        let mut fresh = g.first;
        if let (Some(at), false) = (at, g.first) {
            let c = match items_held(player) {
                Ok(rows) => suitcase::counts(e, &rows),
                Err(v) => return v,
            };
            if c[at] == 0 {
                let nonce = format!("pack:{}:{}", suitcase::name(e), suitcase::items(e)[at]["id"].as_str().unwrap_or_default());
                let mut order = pay::Order { nonce: nonce.clone(), operations: suitcase::pack(e, at, &win.board), gifts: Vec::new() };
                if let Err(v) = prepare(&mut order, vip, &format!("event {}", win.board)) {
                    return v;
                }
                let body = json!({ "source": "reward", "nonce": nonce, "operations": order.operations });
                match api("POST", format!("/v1/inventory/players/{player}/orders"), Some(body)) {
                    Ok(res) if (200..300).contains(&res.status) && res.body["status"] != "failed" => {
                        g.changes = res.body["changes"].as_array().cloned().unwrap_or_default();
                        landed(&order, &format!("event {}", win.board), &g.changes);
                        // its helpers (a VIP's held extras' among them): with what this win paid
                        add(&mut g.helpers, &pay::landed(&g.changes));
                        // its Coins (the find's): counted with what this win paid
                        g.coins += g.changes.iter().filter(|ch| ch["type"] == "platform_grant").map(|ch| ch["granted"].as_i64().unwrap_or(0)).sum::<i64>();
                        before = Some(c);
                        fresh = true;
                    }
                    Ok(res) if res.status == 409 => {
                        not_landed();
                        host::log(LogLevel::Info, &format!("order {nonce}: landed before"));
                    }
                    Ok(res) => {
                        host::log(LogLevel::Warn, &format!("order {nonce} answered {}: {}", res.status, res.body));
                        return retry(if passing(res.status) { "platform" } else { "config" });
                    }
                    Err(e) => {
                        host::log(LogLevel::Warn, &format!("order {nonce}: no answer: {e}"));
                        return retry("platform");
                    }
                }
            }
        }
        // the item is told as `packed`, not among the tables and keepsakes `items` names
        let item_uuid = at.map(|i| suitcase::uuid(e, i));
        let mut items: Vec<String> = g.items.iter().filter(|i| Some(i.as_str()) != item_uuid).cloned().collect();
        let mut verdict = json!({
            "v": 1, "status": "kept", "lane": "event", "board": win.board, "event": suitcase::name(e),
            "moves": win.moves, "coins": g.coins, "items": items,
        });
        if let (Some(at), Some(c), true) = (at, before, fresh) {
            // the order landed with the item in it
            let now = suitcase::after(e, &c, &g.changes);
            let level = suitcase::position(e, &win.board);
            // `coins`: what finding it paid (in the verdict's `coins` too, with the level's own)
            verdict["packed"] = json!({ "item": suitcase::items(e)[at]["id"], "count": now[at], "coins": suitcase::coins_found(&g.changes) });
            let mut events = vec![suitcase::record(
                player,
                "event_item",
                &win.board,
                json!({ "event": suitcase::name(e) }),
                json!({ "found": suitcase::found(&now), "level": level }),
            )];
            let mut paid = false;
            if suitcase::complete(e, &now) {
                match settle_prize(player, e) {
                    Ok(landed) => {
                        paid = true;
                        if let Some((l, granted)) = landed {
                            add(&mut g.helpers, &l);
                            g.gifts.push("suitcase");
                            // the prize's table (its own order): named on the win card with the rest,
                            // and the prize itself: its table and the event's Passport stamp (its mark)
                            items.extend(granted);
                            verdict["items"] = json!(items);
                            verdict["prize"] = json!({ "event": suitcase::name(e), "table": suitcase::table(e), "stamp": suitcase::name(e) });
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
        let got = timed(&format!("save storage download ({key})"), || host::download_link(url), |r| match r {
            Ok(g) => format!("answered {}", g.status),
            Err(_) => "refused".into(),
        })
        .map_err(|e| {
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
        let upload = UploadRequest {
            url: started.body["upload_url"].as_str().unwrap_or_default().to_string(),
            content_type: "application/json".into(),
            headers,
            body: bytes,
        };
        let sent = timed(&format!("save storage upload ({key})"), || host::upload_link(&upload), |r| match r {
            Ok(s) => format!("answered {}", s.status),
            Err(_) => "refused".into(),
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
            m.remove("vipOwed");
        }
        d
    }

    /// A past day (Day::Past, vip.rs), whose payment the record already notes as owed: its
    /// Coins (the archive's progression, one day more, which pays that day's Coins), in an order of
    /// its own ("past:<date>"). Once the platform confirms it landed, the record's owed mark is
    /// cleared. `in_archive` is always true now (a day older than the archive is refused); a
    /// day won before pays nothing ("won_before").
    fn past_win(game: &str, player: &str, win: &Win, doc: &mut Value, coins: bool, yesterday: bool, vip: VipWord) -> Value {
        let date = win.date.clone().unwrap_or_default();
        // yesterday's result still goes on yesterday's board (the platform keeps the first run of a
        // day and says when that day has closed); never in the way of its Coins
        let (recorded, first) = if yesterday { post_run(game, player, win, &date).unwrap_or((false, false)) } else { (false, false) };
        let mut verdict = json!({
            "v": 1, "status": "kept", "lane": "daily", "board": win.board, "date": date, "moves": win.moves, "ms": win.ms,
            "coins": 0, "items": [], "recorded": recorded, "first": first, "helpers": pay::none(), "gifts": [],
            "archive": if coins { "paid" } else { "won_before" },
        });
        if !coins {
            return verdict;
        }
        let ops = vec![json!({ "type": "progression_add", "progression_definition_id": crate::ARCHIVE_ID, "amount": 1, "reason": format!("daily {date}: a past day, verified") })];
        let nonce = format!("past:{date}");
        let mut order = pay::Order { nonce: nonce.clone(), operations: ops, gifts: Vec::new() };
        if let Err(v) = prepare(&mut order, vip, &format!("daily {date}")) {
            return v;
        }
        let body = json!({ "source": "reward", "nonce": nonce, "operations": order.operations });
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
            not_landed();
            host::log(LogLevel::Info, &format!("order {nonce}: landed before"));
            return verdict;
        }
        let changes = res.body["changes"].as_array().cloned().unwrap_or_default();
        landed(&order, &format!("daily {date}"), &changes);
        verdict["helpers"] = pay::landed(&changes);
        let mut paid_coins = 0;
        for ch in res.body["changes"].as_array().into_iter().flatten() {
            if ch["type"] == "platform_grant" {
                // logged by landed(), base or extra, with its outcome
                paid_coins += ch["granted"].as_i64().unwrap_or(0);
            }
        }
        verdict["coins"] = json!(paid_coins);
        let helped = pay::KINDS.iter().any(|k| verdict["helpers"][*k].as_i64().unwrap_or(0) > 0);
        verdict["status"] = json!(if paid_coins > 0 || helped { "paid" } else { "kept" });
        verdict
    }

    /// The record's held VIP extras, before this claim pays (docs/vip.md): those the held mark says are
    /// paid go (an order that paid them landed, whatever the record said after); for a player not VIP
    /// all go; the rest are kept for this call's paying order (prepare), when the player is VIP. Reads
    /// the pass (once a call) and the mark only when the record holds some. True if the record changed.
    fn held_before(player: &str, doc: &mut Value, vip: VipWord) -> bool {
        if !pay::vip_game_pays() || progress::held_extras(doc).is_empty() {
            return false;
        }
        let mut changed = false;
        let mark = value_of(player, pay::held_mark_id()).ok();
        if let Some(m) = mark {
            changed |= progress::drop_held(doc, m.max(0.0) as u64);
        }
        CALL.with(|c| c.borrow_mut().read = true);
        match vip() {
            // never paid to a player who is not VIP
            Ok(false) => changed |= progress::drop_held(doc, u64::MAX),
            // paid inside this call's paying order, once the mark is known (else they wait)
            Ok(true) if mark.is_some() => CALL.with(|c| c.borrow_mut().held = progress::held_extras(doc)),
            _ => {}
        }
        changed
    }

    /// After a paying claim's orders (status paid or kept): the extras to hold go in the record (written
    /// again: rare, VIP unknown at the order), the held ones paid now leave it, and the verdict says it
    /// all: coins (base + vipExtra, as landed), base, vipExtra, helpers (all), vipHelpers, vipLate, vipRead
    /// and vipHeld.
    fn vip_said(player: &str, doc: &mut Value, vip: VipWord, verdict: &mut Value) {
        let (read, got_now, got_late, to_hold, held_paid) = CALL.with(|c| {
            let c = c.borrow();
            (c.read, c.got_now.clone(), c.got_late.clone(), c.to_hold.clone(), c.held_paid)
        });
        if let Some(n) = held_paid {
            progress::drop_held(doc, n);
        }
        if !to_hold.is_empty() {
            for (key, x) in &to_hold {
                progress::hold_extra(doc, key, x);
            }
            if write_save(player, crate::PROGRESS, doc).is_err() {
                // a resend of this claim pays its reward no more, so these are lost: say so
                host::log(LogLevel::Warn, &format!("vip extras: {} to hold, but the record could not be written: lost", to_hold.len()));
                for (key, _) in &to_hold {
                    if let Some(m) = doc["vipOwed"].as_object_mut() {
                        m.remove(key);
                    }
                }
            } else {
                host::log(LogLevel::Info, &format!("vip extras: {} held (VIP unknown at the order)", to_hold.len()));
            }
        }
        let mut extra = got_now;
        extra.add(&got_late);
        let coins = verdict["coins"].as_i64().unwrap_or(0);
        verdict["base"] = json!((coins - extra.coins).max(0));
        verdict["vipExtra"] = json!(extra.coins);
        verdict["vipHelpers"] = extra.helpers.clone();
        if !got_late.nothing() {
            verdict["vipLate"] = got_late.to_json();
        }
        if read {
            verdict["vipRead"] = json!(match vip() {
                Ok(true) => "yes",
                Ok(false) => "no",
                Err(_) => "unknown",
            });
        }
        if !progress::held_extras(doc).is_empty() {
            verdict["vipHeld"] = json!(true);
        }
        if verdict["status"] == "kept" && !extra.nothing() {
            verdict["status"] = json!("paid");
        }
    }

    /// A verified win: the record first, then the payment, so a payment never
    /// lands without its progress, and a resent claim changes the record once.
    fn verified(game: &str, player: &str, win: &Win, boards: u64, vip: VipWord) -> Value {
        CALL.with(|c| *c.borrow_mut() = Call::default());
        let day = match win.lane {
            Lane::Daily => match daily_kind(player, win) {
                Ok(d) => d,
                Err(v) => return v,
            },
            _ => Day::Today,
        };
        // an event level: its events switched on and it released, before anything is recorded
        let event = match win.lane {
            Lane::Event => match event_gate(player, win) {
                Ok(e) => Some(e),
                Err(v) => return v,
            },
            _ => None,
        };
        let (mut doc, stored) = match read_progress(player) {
            Ok(r) => r,
            Err(v) => return v,
        };
        // THE EVENTS ARE PLAYED IN ORDER (the creator, 2026-11-10): level N pays only once levels 1 to
        // N-1 of its event are won; a level won already is never refused (a replay, a win from before)
        if let Some(e) = event {
            let won = |l: &str| doc["event"].get(l).is_some();
            if !suitcase::in_order(e, &win.board, won) {
                let next = suitcase::next_level(e, won);
                host::log(LogLevel::Info, &format!("refused: event {} level {} out of order (next {:?})", suitcase::name(e), win.board, next));
                return json!({ "v": 1, "status": "refused", "reason": "out_of_order", "lane": "event", "board": win.board, "event": suitcase::name(e), "next": next });
            }
        }
        let date = win.date.clone().unwrap_or_default();
        // what a past day owes, decided before this win is applied (its Coins if it was never
        // won), and what an earlier try of it still owes
        let mut past_coins = false;
        if let Day::Past(_) = day {
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
        // VIP extras held by earlier calls: those paid since go, a non-VIP's go, the rest ride in this
        // call's paying order
        let settled = held_before(player, &mut doc, vip);
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
        // the counters ride in this call's paying order (prepare): one call pays once
        CALL.with(|c| c.borrow_mut().counts = count::operations(&doc, count::plan()));
        if changed || marked || recounted || owes || settled || !stored {
            if let Err(v) = write_save(player, crate::PROGRESS, &doc) {
                return v;
            }
        }
        let mut verdict = match (win.lane.clone(), day, event) {
            // a past day pays no kit (it waits for the next win)
            (Lane::Daily, Day::Past(yesterday), _) => past_win(game, player, win, &mut doc, past_coins, yesterday, vip),
            (Lane::Daily, Day::Today, _) => daily_win(game, player, win, kit, vip),
            (Lane::Event, _, Some(e)) => event_win(game, player, win, e, kit, vip),
            _ => board_win(player, win, kit, vip),
        };
        if matches!(verdict["status"].as_str(), Some("paid" | "kept" | "late")) {
            vip_said(player, &mut doc, vip, &mut verdict);
        }
        if verdict["status"] != "retry" {
            verdict["progress"] = public(&doc);
        }
        if matches!(verdict["status"].as_str(), Some("paid" | "kept" | "late")) {
            // the counters rode in the paying order, or (no paying order landed now) go in their own,
            // then the call's one
            let (counted, unlocked) = CALL.with(|c| {
                let c = c.borrow();
                (c.counted, c.unlocked.clone())
            });
            let unlocked = if counted { unlocked } else { count_up(player, &doc, win.claim_id.as_deref()) };
            if !unlocked.is_empty() {
                verdict["achievements"] = json!(unlocked);
            }
        }
        verdict
    }

    /// The gift's platform (gift.rs): the live calls, for the player who called.
    struct Live<'a> {
        player: &'a str,
    }

    impl crate::gift::Platform for Live<'_> {
        fn today(&self) -> Result<String, Value> {
            today_of(self.player)
        }
        fn value(&self, id: &str) -> Result<f64, Value> {
            value_of(self.player, id)
        }
        fn place(&self, order: &pay::Order) -> Result<Option<Vec<Value>>, Value> {
            let body = json!({ "source": "reward", "nonce": order.nonce, "operations": order.operations });
            let res = api("POST", format!("/v1/inventory/players/{}/orders", self.player), Some(body)).map_err(|e| {
                host::log(LogLevel::Warn, &format!("order {}: no answer: {e}", order.nonce));
                retry("platform")
            })?;
            if res.status == 409 {
                host::log(LogLevel::Info, &format!("order {}: landed before", order.nonce));
                return Ok(None);
            }
            if !(200..300).contains(&res.status) || res.body["status"] == "failed" {
                host::log(LogLevel::Warn, &format!("order {} answered {}: {}", order.nonce, res.status, res.body));
                return Err(retry(if passing(res.status) { "platform" } else { "config" }));
            }
            let changes = res.body["changes"].as_array().cloned().unwrap_or_default();
            // what the receipt carried, by kind, and the answer's own fields: a reused nonce's answer
            // is a success with no changes (QA, 2026-11-02), and this line shows what else it says
            let kinds: Vec<&str> = changes.iter().filter_map(|c| c["type"].as_str()).collect();
            let fields: Vec<&str> = res.body.as_object().map(|o| o.keys().map(String::as_str).collect()).unwrap_or_default();
            host::log(LogLevel::Info, &format!("order {}: {} {}, changes {kinds:?}, fields {fields:?}", order.nonce, res.status, res.body["status"]));
            Ok(Some(changes))
        }
        fn log(&self, line: &str) {
            host::log(LogLevel::Info, line);
        }
    }

    /// VIP for this call, read at most once and only when the call needs it: Ok(VIP or not), or
    /// Err(why it is unknown).
    type VipWord<'a> = &'a dyn Fn() -> Result<bool, &'static str>;

    /// THE PLATFORM'S WORD ON VIP (vip.rs; docs/vip.md): the passes of the player who called (the
    /// route's "me" is the function's invoker). Ok(holds `vip`), or Err when the read failed:
    /// "platform" for a hiccup (no answer, 429, 5xx), "vip_unknown" for anything else (a refusal, a
    /// body not the documented shape). A failure is never "not VIP". One log line a read, with no
    /// player id, says whether `vip` was in the list at all: a pass the platform has not marked
    /// visible to games is left out, and every player then reads as not VIP.
    fn platform_vip(game: &str) -> Result<vip::Passes, &'static str> {
        let res = match api("GET", format!("/v1/games/{game}/players/me/passes"), None) {
            Ok(r) => r,
            Err(e) => {
                host::log(LogLevel::Warn, &format!("vip pass read: no answer: {e}"));
                return Err("platform");
            }
        };
        if !(200..300).contains(&res.status) {
            let code = ["code", "reason", "error"].iter().find_map(|k| res.body[*k].as_str()).unwrap_or("");
            host::log(LogLevel::Warn, &format!("vip pass read answered {} {code}", res.status));
            return Err(if passing(res.status) { "platform" } else { "vip_unknown" });
        }
        match vip::passes(&res.body) {
            Some(p) => {
                let held = if !p.listed { "" } else if p.held { ", held" } else { ", not held" };
                host::log(LogLevel::Info, &format!("vip pass read: vip {} ({} listed){held}", if p.listed { "listed" } else { "NOT listed" }, p.count));
                Ok(p)
            }
            None => {
                host::log(LogLevel::Warn, "vip pass read: not the documented shape");
                Err("vip_unknown")
            }
        }
    }

    impl Guest for Function {
        fn handle(input: Vec<u8>) -> Result<Vec<u8>, String> {
            let ctx = host::get_context();
            let Caller::Player(player) = ctx.caller else {
                return Err("this function checks a player's own win: call it as a player".into());
            };
            if serde_json::from_slice::<Value>(&input).ok().and_then(|v| v.get("what").cloned()) == Some(json!("levels")) {
                return Ok(json!({ "v": 1, "levels": claim::LEVELS, "coins": crate::pay::COINS }).to_string().into_bytes());
            }
            let asked = serde_json::from_slice::<Value>(&input).unwrap_or(Value::Null);
            // VIP for this call (vip.rs), asked of the platform once, and only by a call that needs it
            // (the VIP ask, the VIP gift, the events read, a claim that pays or holds a VIP extra). An answer that asked says it, so the game
            // follows the server; one that did not, or could not, says nothing about VIP, and the
            // game keeps what it had.
            let read: std::cell::OnceCell<Result<vip::Passes, &'static str>> = std::cell::OnceCell::new();
            let platform = || *read.get_or_init(|| platform_vip(&ctx.game_id));
            let vip = || -> Result<bool, &'static str> {
                let p = platform();
                match vip::decide(&ctx.channel, &asked, p.ok().map(|p| p.held)) {
                    Some(v) => Ok(v),
                    None => Err(p.err().unwrap_or("vip_unknown")),
                }
            };
            let said = |mut v: Value| -> Result<Vec<u8>, String> {
                if read.get().is_some() {
                    if let Ok(known) = vip() {
                        v["vip"] = json!(known);
                    }
                }
                Ok(v.to_string().into_bytes())
            };
            if asked["what"] == "vip" {
                return said(match vip() {
                    Ok(_) => json!({ "v": 1, "status": "vip" }),
                    Err(why) => retry(why),
                });
            }
            if asked["what"] == "vip_gift" {
                return said(crate::gift::vip_gift(&Live { player: &player }, vip(), platform().ok()));
            }
            if asked["what"] == "suitcase" {
                // the events are everyone's, so what this answers never depends on VIP; the pass is
                // still read, once, so the answer says VIP for the game's boot (src/net/vip.ts asks
                // nothing of its own while the events are on), and a failed read only leaves `vip` out
                let _ = vip();
                return said(suitcase_read(&player));
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
                    verified(&ctx.game_id, &player, &win, data.campaign.len() as u64, &vip)
                }
            };
            said(verdict)
        }
    }

    export!(Function);
}
