//! A WIN CLAIM, checked: pure, with no platform calls, so the native tests and
//! the vector check run exactly what the function runs.
//!
//! The claim is the game's word (src/net/claims.ts sends it):
//!   { "v": 1, "lane": "campaign" | "challenge" | "daily", "board": "c05",
//!     "deal": "<8 hex: dealHash of the deal the client played>",
//!     "line": [ {"from": 3, "to": 7}, {"shuffle": true, "board": [...], "stacks": [[...]]}, ... ],
//!     "ms": 95000, "date": "2026-10-24" (daily only) }
//! It is believed only as far as the rules and the compiled level data allow:
//! the deal comes from the data compiled into the function (never the claim),
//! the line is replayed on the ported rules, at most SHUFFLES shuffles, and
//! the board must end won. The move count is the server's, from the line.

use serde_json::Value;

use crate::rules::{self, Action, Deal, Picture};

/// Shuffles a board allows: the creator's ruling (AGENTS.md, "Helpers in the
/// first build: 3 undo, 3 hint, 3 shuffle"). The game config's
/// `board.helpers.shuffle` must not exceed it.
pub const SHUFFLES: u32 = 3;
/// A line longer than this is not a real game.
const MAX_ACTIONS: usize = 5000;
/// The fastest a move can be played and shown (drop, slide, fall, deal):
/// a claimed time under moves x this is raised to it.
pub const MIN_MS_PER_MOVE: u64 = 300;
/// A claimed time over this is held to it (the board's clock stops at rest anyway).
pub const MAX_MS: u64 = 6 * 60 * 60 * 1000;

#[derive(Clone, Debug)]
pub struct Known {
    pub lane: String,
    pub id: String,
    pub hash: String,
    pub deal: Deal,
}

/// Every deal compiled in (build.rs gathers them).
pub fn deals() -> Vec<Known> {
    let text = include_str!(concat!(env!("OUT_DIR"), "/deals.json"));
    let data: Value = serde_json::from_str(text).expect("deals.json is the build's own output");
    let mut out: Vec<Known> = Vec::new();
    for d in data["deals"].as_array().into_iter().flatten() {
        let Some(deal) = deal_of(d) else { continue };
        let known = Known {
            lane: d["lane"].as_str().unwrap_or_default().to_string(),
            id: d["id"].as_str().unwrap_or_default().to_string(),
            hash: deal_hash(&deal),
            deal,
        };
        if !out.iter().any(|k| k.lane == known.lane && k.id == known.id && k.hash == known.hash) {
            out.push(known);
        }
    }
    out
}

/// A deal as the level files store it (no opening board).
pub fn deal_of(d: &Value) -> Option<Deal> {
    let pictures = d["pictures"]
        .as_array()?
        .iter()
        .map(|p| Some(Picture { id: p["id"].as_str()?.to_string(), cols: p["cols"].as_u64()? as usize, rows: p["rows"].as_u64()? as usize }))
        .collect::<Option<Vec<_>>>()?;
    let stacks = d["stacks"].as_array()?.iter().map(cards).collect::<Option<Vec<_>>>()?;
    let board = match &d["board"] {
        Value::Null => None,
        b => Some(cards(b)?),
    };
    Some(Deal {
        cols: d["cols"].as_u64()? as usize,
        rows: d["rows"].as_u64()? as usize,
        pictures,
        stacks,
        board,
        seed: (d["seed"].as_i64()? as i64 as u64 & 0xffff_ffff) as u32,
    })
}

fn cards(v: &Value) -> Option<Vec<i32>> {
    v.as_array()?.iter().map(|c| c.as_i64().filter(|c| *c >= -1 && *c < 1 << 20).map(|c| c as i32)).collect()
}

/// FNV-1a (32-bit) of a deal's canonical text, as 8 lowercase hex: which version of
/// a board the client played. src/net/claims.ts computes the same (dealHash).
/// cols x rows ; picture:cols x rows,... ; stack cards joined by "," and stacks by "/" ; seed
pub fn deal_hash(d: &Deal) -> String {
    let pictures = d.pictures.iter().map(|p| format!("{}:{}x{}", p.id, p.cols, p.rows)).collect::<Vec<_>>().join(",");
    let stacks = d.stacks.iter().map(|s| s.iter().map(|c| c.to_string()).collect::<Vec<_>>().join(",")).collect::<Vec<_>>().join("/");
    let text = format!("{}x{};{};{};{}", d.cols, d.rows, pictures, stacks, d.seed);
    let mut h: u32 = 0x811c_9dc5;
    for b in text.bytes() {
        h ^= b as u32;
        h = h.wrapping_mul(0x0100_0193);
    }
    format!("{h:08x}")
}

/// A line, as the board records it (src/game/rules.ts, Action).
pub fn line_of(v: &Value) -> Result<Vec<Action>, String> {
    let list = v.as_array().ok_or("line is not a list")?;
    if list.len() > MAX_ACTIONS {
        return Err("line is too long".into());
    }
    list.iter()
        .enumerate()
        .map(|(i, a)| {
            if a.get("shuffle").and_then(Value::as_bool) == Some(true) {
                let board = cards(&a["board"]).ok_or(format!("action {i}: a shuffle without its board"))?;
                let stacks = a["stacks"]
                    .as_array()
                    .and_then(|ss| ss.iter().map(cards).collect::<Option<Vec<_>>>())
                    .ok_or(format!("action {i}: a shuffle without its stacks"))?;
                Ok(Action::Shuffle { board, stacks })
            } else {
                match (a["from"].as_i64(), a["to"].as_i64()) {
                    (Some(from), Some(to)) => Ok(Action::Move { from, to }),
                    _ => Err(format!("action {i} is neither a move nor a shuffle")),
                }
            }
        })
        .collect()
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Lane {
    Campaign,
    Challenge,
    Daily,
}

impl Lane {
    pub fn name(&self) -> &'static str {
        match self {
            Lane::Campaign => "campaign",
            Lane::Challenge => "challenge",
            Lane::Daily => "daily",
        }
    }
}

/// A win the checker stands behind.
#[derive(Clone, Debug)]
pub struct Win {
    pub lane: Lane,
    pub board: String,
    /// The daily's date, "YYYY-MM-DD" (daily only).
    pub date: Option<String>,
    pub moves: u32,
    pub shuffles: u32,
    /// The time to show, held between moves x MIN_MS_PER_MOVE and MAX_MS.
    pub ms: u64,
}

/// Why a claim is not a win, as the game reads it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Refusal {
    /// Not a claim this checker reads (a bug in the game, or a forged call). For good.
    BadClaim(String),
    /// No such board in that lane. For good.
    UnknownBoard,
    /// The board is known but not this version of it: the function is older
    /// than the build that sent it. Worth sending again later.
    UnknownDeal,
    /// An action the rules do not allow (index). For good.
    BadAction(usize),
    /// More shuffles than a board allows. For good.
    TooManyShuffles,
    /// The line does not end with the board won. For good.
    NotWon,
}

impl Refusal {
    pub fn reason(&self) -> String {
        match self {
            Refusal::BadClaim(_) => "bad_claim".into(),
            Refusal::UnknownBoard => "unknown_board".into(),
            Refusal::UnknownDeal => "unknown_deal".into(),
            Refusal::BadAction(_) => "bad_action".into(),
            Refusal::TooManyShuffles => "too_many_shuffles".into(),
            Refusal::NotWon => "not_won".into(),
        }
    }
}

fn is_date(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() == 10 && b[4] == b'-' && b[7] == b'-' && b.iter().enumerate().all(|(i, c)| i == 4 || i == 7 || c.is_ascii_digit())
}

/// Check a claim against the compiled deals. Ok is a win the server stands behind.
pub fn check(input: &[u8], known: &[Known]) -> Result<Win, Refusal> {
    let bad = |why: &str| Refusal::BadClaim(why.to_string());
    let c: Value = serde_json::from_slice(input).map_err(|_| bad("not JSON"))?;
    if c["v"].as_u64() != Some(1) {
        return Err(bad("unknown claim version"));
    }
    let lane = match c["lane"].as_str() {
        Some("campaign") => Lane::Campaign,
        Some("challenge") => Lane::Challenge,
        Some("daily") => Lane::Daily,
        _ => return Err(bad("unknown lane")),
    };
    let board = c["board"].as_str().ok_or_else(|| bad("no board"))?.to_string();
    let hash = c["deal"].as_str().ok_or_else(|| bad("no deal"))?;
    let date = match lane {
        Lane::Daily => {
            let date = c["date"].as_str().filter(|d| is_date(d)).ok_or_else(|| bad("a daily without its date"))?;
            if board != format!("d{date}") {
                return Err(bad("the daily's board is not its date's"));
            }
            Some(date.to_string())
        }
        _ => None,
    };
    let line = line_of(&c["line"]).map_err(|e| Refusal::BadClaim(e))?;

    let versions: Vec<&Known> = known.iter().filter(|k| k.lane == lane.name() && k.id == board).collect();
    if versions.is_empty() {
        return Err(Refusal::UnknownBoard);
    }
    let deal = &versions.iter().find(|k| k.hash == hash).ok_or(Refusal::UnknownDeal)?.deal;

    let mut s = rules::start(deal).ok_or_else(|| bad("a deal the rules cannot start"))?;
    for (i, a) in line.iter().enumerate() {
        s = rules::act(&s, a).ok_or(Refusal::BadAction(i))?;
        if s.shuffles > SHUFFLES {
            return Err(Refusal::TooManyShuffles);
        }
    }
    if !rules::is_won(&s) {
        return Err(Refusal::NotWon);
    }
    let claimed = c["ms"].as_u64().unwrap_or(0);
    let ms = claimed.max(s.moves as u64 * MIN_MS_PER_MOVE).min(MAX_MS);
    Ok(Win { lane, board, date, moves: s.moves, shuffles: s.shuffles, ms })
}
