//! The Rust side of the agreement check: replays tools/server/vectors.mts's
//! games on the ported rules and checks every state, then runs every claim
//! through the checker. Run through tools/server/check.mts, which writes the
//! vectors and passes their path in VECTORS:
//!   VECTORS=<file> cargo test --release --test vectors -- --nocapture

use checker::claim::{self, Known};
use checker::rules::{self, digest};
use serde_json::Value;

#[test]
fn rust_rules_agree_with_typescript() {
    let Ok(path) = std::env::var("VECTORS") else {
        eprintln!("VECTORS is not set: run node tools/server/check.mts");
        return;
    };
    let data: Value = serde_json::from_str(&std::fs::read_to_string(&path).expect("read the vectors")).expect("parse the vectors");
    let mut failures: Vec<String> = Vec::new();
    let mut actions = 0usize;

    // ---------------------------------------------------------------- games
    let games = data["games"].as_array().expect("games");
    for g in games {
        let name = g["name"].as_str().unwrap_or("?");
        let deal = claim::deal_of(&g["deal"]).unwrap_or_else(|| panic!("{name}: a deal the checker cannot read"));
        let Some(mut s) = rules::start(&deal) else {
            failures.push(format!("{name}: the Rust rules cannot start this deal"));
            continue;
        };
        if digest(&s) != g["start"].as_str().unwrap_or_default() {
            failures.push(format!("{name}: the opening differs\n  ts:   {}\n  rust: {}", g["start"], digest(&s)));
            continue;
        }
        let line = match claim::line_of(&g["actions"]) {
            Ok(l) => l,
            Err(e) => {
                failures.push(format!("{name}: {e}"));
                continue;
            }
        };
        let states = g["states"].as_array().expect("states");
        for (i, a) in line.iter().enumerate() {
            actions += 1;
            let want = states[i].as_str();
            let got = rules::act(&s, a);
            match (want, &got) {
                (None, None) => {}
                (Some(w), Some(n)) if w == digest(n) => {}
                _ => {
                    failures.push(format!(
                        "{name}: action {i} ({}) differs\n  before: {}\n  ts:     {}\n  rust:   {}",
                        g["actions"][i],
                        digest(&s),
                        want.unwrap_or("does nothing"),
                        got.as_ref().map(digest).unwrap_or_else(|| "does nothing".into()),
                    ));
                    break;
                }
            }
            if let Some(n) = got {
                s = n;
            }
        }
        if rules::is_won(&s) != g["won"].as_bool().unwrap_or(false) {
            failures.push(format!("{name}: won differs (ts {})", g["won"]));
        }
        if failures.len() > 20 {
            break;
        }
    }

    // ---------------------------------------------------------------- claims
    let known: Vec<Known> = claim::deals();
    let claims = data["claims"].as_array().expect("claims");
    for c in claims {
        let name = c["name"].as_str().unwrap_or("?");
        let input = c["input"].as_str().unwrap_or_default().as_bytes();
        let want = &c["expect"];
        match claim::check(input, &known) {
            Ok(win) => {
                let ok = want["ok"] == true
                    && want["moves"].as_u64() == Some(win.moves as u64)
                    && want["shuffles"].as_u64() == Some(win.shuffles as u64)
                    && want["ms"].as_u64() == Some(win.ms);
                if !ok {
                    failures.push(format!("claim {name}: accepted ({} moves, {} shuffles, {} ms), expected {want}", win.moves, win.shuffles, win.ms));
                }
            }
            Err(r) => {
                if want["reason"].as_str() != Some(r.reason().as_str()) {
                    failures.push(format!("claim {name}: refused {r:?}, expected {want}"));
                }
            }
        }
    }

    // ---------------------------------------------------------------- deal hashes
    let hashes = data["hashes"].as_array().map(Vec::as_slice).unwrap_or_default();
    for h in hashes {
        let deal = claim::deal_of(&h["deal"]).expect("a deal");
        if claim::deal_hash(&deal) != h["hash"].as_str().unwrap_or_default() {
            failures.push(format!("deal hash differs: ts {} rust {} for {}", h["hash"], claim::deal_hash(&deal), h["deal"]));
        }
    }

    println!(
        "rust: {} games, {actions} actions, {} claims, {} deal hashes checked; shuffles as {}",
        games.len(),
        claims.len(),
        hashes.len(),
        data["arrangeFrom"].as_str().unwrap_or("?")
    );
    if !failures.is_empty() {
        panic!("{} disagreement(s) between the Rust and TypeScript rules:\n{}", failures.len(), failures.join("\n"));
    }
}
