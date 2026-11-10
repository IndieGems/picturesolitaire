//! THE PLATFORM CALLS' TIMING (the lead, 2026-11-10; TODO.md "Platform calls stall before the
//! order"): claims stalled for seconds inside one platform read before their order, on dev and on
//! release, with our own CPU flat at ~100 ms. So the function (lib.rs `timed`) writes a short debug
//! line as each platform call starts, so a call that times out shows the request it hung on, and a
//! warning with the time when one takes longer than SLOW_MS. Lines name the route only, never a
//! player id: `route` drops the query (`?player_id=…`) and every id in the path. Nothing here
//! changes what a call pays or answers.

/// A platform call slower than this is logged with its time (the release checklist's 1 s for a
/// whole claim, halved: one call should never take half of it).
pub const SLOW_MS: u64 = 500;

/// Whether a call that took `ms` is logged as slow.
pub fn slow(ms: u64) -> bool {
    ms > SLOW_MS
}

/// The route of an API path, with no ids: the query goes, and each path segment that is a UUID
/// (a player, the game, a progression, an item) becomes "…". "GET /v1/saves/players/<id>/progress"
/// reads "/v1/saves/players/…/progress"; "/v1/challenges?player_id=<id>" reads "/v1/challenges".
pub fn route(path: &str) -> String {
    let path = path.split(['?', '#']).next().unwrap_or_default();
    path.split('/').map(|s| if uuid_like(s) { "…" } else { s }).collect::<Vec<_>>().join("/")
}

/// 32 hex digits, with or without the four hyphens: an id, never a route word.
fn uuid_like(s: &str) -> bool {
    let hex = s.chars().filter(|c| *c != '-').collect::<String>();
    hex.len() == 32 && hex.chars().all(|c| c.is_ascii_hexdigit()) && (s.len() == 32 || s.len() == 36)
}
