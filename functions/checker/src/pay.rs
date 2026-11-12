//! WHAT A VERIFIED WIN PAYS (lib.rs sends it, after the record), in two steps:
//!   1. ONE platform order (one call pays once): the board's progression to 1 on its first win, which
//!      pays its Coins (the config's `platform_grants`) and its table (`rewards_on_complete`), once
//!      ever; the achievements' counters ride in it too (lib.rs `prepare`). A VIP's +50% on those Coins
//!      is the Arcade's own (since 2026-11-11), written by nothing here.
//!   2. then the win's HELPER REWARDS, each a recipe of the config's rewards catalog that the checker
//!      runs for the player who called it (docs/vip.md; the creator, 2026-11-12), each with its own
//!      key, `<the order's key>:helpers`, so a resend never gives twice:
//!        - a hard or super campaign board's first win: `helpers-hard`; a trip's last board (the
//!          passport stamp) `helpers-stamp` instead (creator, 2026-10-27);
//!        - the daily puzzle's first win of the player's own day: `helpers-daily-<1..7>`, by the day
//!          of their week, Monday first (the creator, 2026-10-27, after Match3Mahjong);
//!        - the KIT, once ever: at the end of board 1, or on the next win of a player already past it:
//!          `helpers-kit`, which sets the kit's own progression ("helpers_kit") with the kit, so it
//!          lands with it or not at all (key "kit:helpers").
//!      Each gives everyone its base and a VIP the same again, as a BONUS THE PLATFORM JUDGES when it
//!      runs (`requires: holds_pass vip`): the checker never reads VIP, never multiplies, and holds no
//!      amount: what a reward gives is the config's alone (tools/server/helper-rewards.json, the
//!      generator's), and what it gave is the recipe's receipt (`granted`: each helper's change, and a
//!      `bonus` entry, applied or skipped).
//!   - VIP's GIFTS are not a win's (the creator, 2026-11-01; gift.rs): their own call, their own recipes.
//!
//! The helpers are the game's own currencies (src/net/helper-ids.json), granted into their "earned"
//! bucket and clamped at the cap by the recipe; unlike a `platform_grants` mapping, they land for a
//! guest too (gem-development#2039). The order's key is built from the board, never from the claim,
//! so two claims racing for the same first win pay once; the recipes' keys follow from it.

use std::sync::OnceLock;

use serde_json::{json, Value};

use crate::claim::Lane;

/// The helper kinds, in the order the verdict lists them.
pub const KINDS: [&str; 3] = ["hint", "undo", "shuffle"];

fn data() -> &'static Value {
    static PAY: OnceLock<Value> = OnceLock::new();
    PAY.get_or_init(|| serde_json::from_str(include_str!(concat!(env!("OUT_DIR"), "/pay.json"))).expect("pay.json"))
}

fn rewards() -> &'static Value {
    &data()["helpers"]["rewards"]
}

/// The progression that pays for one campaign or challenge board: its id, as the config has it.
pub fn board_id(board: &str) -> Option<&'static str> {
    data()["boards"][crate::board_slug(board)].as_str()
}

/// The kit's own progression: (id, slug).
pub fn kit_mark() -> (&'static str, &'static str) {
    let k = &data()["helpers"]["kit"];
    (k["progression"].as_str().unwrap_or_default(), k["slug"].as_str().unwrap_or_default())
}

/// The rewards catalog the helper recipes are in: its id.
pub fn catalog() -> &'static str {
    rewards()["catalog"]["id"].as_str().unwrap_or_default()
}

/// A helper reward: its name (as the verdict lists it) and the recipe that gives it.
pub type Gift = (&'static str, &'static str);

fn recipe(name: &str) -> &'static str {
    rewards()[name]["id"].as_str().unwrap_or_default()
}

/// The reward a board's first win gives: "hard", "stamp", or none (only campaign boards give one).
pub fn gift_of(lane: Lane, board: &str) -> Option<Gift> {
    if lane != Lane::Campaign {
        return None;
    }
    let name = data()["gifts"][board].as_str()?;
    let r = recipe(name);
    (!r.is_empty()).then_some((name, r))
}

/// The kit's reward.
pub fn kit() -> Gift {
    ("kit", recipe("kit"))
}

/// One of the weekday recipes (`daily`, `vipGift`) for a date: Monday first.
fn by_day(list: &str, date: &str) -> Option<&'static str> {
    let day = crate::days::iso_day(date)?;
    rewards()[list][(day - 1) as usize]["id"].as_str()
}

/// The daily puzzle's reward for a date (the player's own, "YYYY-MM-DD"): its weekday's recipe.
pub fn daily_gift(date: &str) -> Option<Gift> {
    Some(("daily", by_day("daily", date)?))
}

/// VIP's daily gift for a date: its weekday's recipe (a VIP bonus alone).
pub fn vip_gift(date: &str) -> Option<&'static str> {
    by_day("vipGift", date)
}

/// VIP's welcome: its recipe (a VIP bonus alone, with the welcome's item).
pub fn vip_welcome() -> &'static str {
    recipe("vipWelcome")
}

/// The item VIP's welcome grants with its helpers: (id, slug). Held: welcomed.
pub fn welcome_item() -> (&'static str, &'static str) {
    let w = &rewards()["welcomeItem"];
    (w["id"].as_str().unwrap_or_default(), w["slug"].as_str().unwrap_or_default())
}

/// The welcome's mark as checkers before 0.1.63 raised it (helper-ids.json `oldMarks.welcomeEnd`): (id,
/// slug). Above 0: welcomed by one of them, so never again.
pub fn vip_welcome_mark() -> (&'static str, &'static str) {
    let w = &data()["helpers"]["oldMarks"]["welcomeEnd"];
    (w["progression"].as_str().unwrap_or_default(), w["slug"].as_str().unwrap_or_default())
}

pub(crate) fn mark(id: &str, reason: String) -> Value {
    json!({ "type": "progression_max", "progression_definition_id": id, "value": 1, "reason": reason })
}

/// One helper recipe to run after the order: the reward's name, the recipe, and its key.
#[derive(Debug, Clone, PartialEq)]
pub struct Run {
    pub gift: &'static str,
    pub recipe: &'static str,
    pub nonce: String,
}

/// One order's operations and nonce, and the helper recipes that follow it.
#[derive(Debug, Default, PartialEq)]
pub struct Order {
    pub nonce: String,
    /// Empty when the win pays no order of its own (the kit alone): only the runs then.
    pub operations: Vec<Value>,
    /// The rewards' names, in the order they run ("hard" or "stamp" or "daily", then "kit").
    pub gifts: Vec<&'static str>,
    pub runs: Vec<Run>,
}

/// The order for a verified win. `progression`: the id it completes (a board's, or the daily's);
/// `first`: its value read below 1, so this win completes it; `gift`: the board's reward (gift_of,
/// daily_gift), given only with that first completion; `extra`: more operations that ride only with
/// that first completion (an event level's item, suitcase.rs); `kit`: the kit is due. None when there
/// is nothing to write or run.
pub fn order(progression: &str, what: &str, nonce: &str, first: bool, gift: Option<Gift>, extra: Vec<Value>, kit_due: bool) -> Option<Order> {
    let mut o = Order { nonce: nonce.to_string(), ..Order::default() };
    if first {
        o.operations.push(mark(progression, format!("{what} verified win")));
        o.operations.extend(extra);
        if let Some((name, recipe)) = gift {
            o.runs.push(Run { gift: name, recipe, nonce: format!("{nonce}:helpers") });
        }
    }
    if kit_due {
        let (name, recipe) = kit();
        o.runs.push(Run { gift: name, recipe, nonce: "kit:helpers".into() });
    }
    o.gifts = o.runs.iter().map(|r| r.gift).collect();
    if o.operations.is_empty() && o.runs.is_empty() {
        return None;
    }
    Some(o)
}

fn currency(kind: &str) -> &'static str {
    data()["helpers"]["kinds"][kind]["currency"].as_str().unwrap_or_default()
}

/// Each helper's balance after an order or a recipe, from its receipt: only the kinds it lists.
pub fn after(changes: &[Value]) -> Value {
    let mut out = serde_json::Map::new();
    for kind in KINDS {
        let id = currency(kind);
        if let Some(n) = changes.iter().filter(|c| c["type"] == "currency" && c["currency_id"] == id).filter_map(|c| c["balance_after"].as_i64()).last() {
            out.insert(kind.into(), json!(n));
        }
    }
    Value::Object(out)
}

/// What landed of each helper, from an order's or a recipe's receipt (`changes`, `granted`): { hint,
/// undo, shuffle }, after the cap's clamp, a bonus's included.
pub fn landed(changes: &[Value]) -> Value {
    let mut out = serde_json::Map::new();
    for kind in KINDS {
        let id = currency(kind);
        let got: i64 = changes
            .iter()
            .filter(|c| c["type"] == "currency" && c["currency_id"] == id)
            .map(|c| c["delta"].as_i64().or_else(|| Some(c["balance_after"].as_i64()? - c["balance_before"].as_i64()?)).unwrap_or(0))
            .filter(|d| *d > 0)
            .sum();
        out.insert(kind.into(), json!(got));
    }
    Value::Object(out)
}

/// Nothing landed: { hint: 0, undo: 0, shuffle: 0 }.
pub fn none() -> Value {
    landed(&[])
}

/// A recipe receipt's bonus entries, as the verdict lists them: { outcome, reason? } each, the
/// platform's words (applied or skipped). Never which pass or item a bonus asks for.
pub fn bonuses(granted: &[Value]) -> Vec<Value> {
    granted
        .iter()
        .filter(|c| c["type"] == "bonus")
        .map(|c| {
            let mut b = json!({ "outcome": c["outcome"] });
            if let Some(r) = c["reason"].as_str() {
                b["reason"] = json!(r);
            }
            b
        })
        .collect()
}

/// A recipe receipt says a bonus of it applied.
pub fn applied(granted: &[Value]) -> bool {
    granted.iter().any(|c| c["type"] == "bonus" && c["outcome"] == "applied")
}
