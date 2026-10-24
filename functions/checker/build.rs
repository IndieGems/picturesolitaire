// Gathers every deal the checker must know into one compact file it embeds
// (OUT_DIR/deals.json): the level files the game ships (src/content/levels/,
// the levels member's) and data/archive.json, every earlier version of each
// board, kept so a player on an older build still verifies
// (tools/server/archive.mts appends to it). Only what a replay needs is kept:
// lane, id, cols, rows, seed, pictures, stacks, and board (the cards already
// placed, when a level has them).
//
// The lane is the file's name: campaign.json -> "campaign", challenge.json ->
// "challenge", daily.json -> "daily". Other files are not lanes the checker pays.

use std::{env, fs, path::Path};

use serde_json::{json, Value};

const LANES: [&str; 3] = ["campaign", "challenge", "daily"];

fn compact(lane: &str, l: &Value) -> Value {
    json!({
        "lane": lane,
        "id": l["id"],
        "cols": l["cols"],
        "rows": l["rows"],
        "seed": l["seed"],
        "pictures": l["pictures"].as_array().map(|ps| ps.iter().map(|p| json!({ "id": p["id"], "cols": p["cols"], "rows": p["rows"] })).collect::<Vec<_>>()),
        "stacks": l["stacks"],
        "board": l["board"],
    })
}

fn main() {
    let here = env::var("CARGO_MANIFEST_DIR").unwrap();
    let levels = Path::new(&here).join("../../src/content/levels");
    let archive = Path::new(&here).join("data/archive.json");
    println!("cargo:rerun-if-changed={}", archive.display());
    println!("cargo:rerun-if-changed={}", levels.display());

    let mut deals: Vec<Value> = Vec::new();
    for lane in LANES {
        let file = levels.join(format!("{lane}.json"));
        println!("cargo:rerun-if-changed={}", file.display());
        let Ok(text) = fs::read_to_string(&file) else { continue };
        let data: Value = serde_json::from_str(&text).unwrap_or_else(|e| panic!("{}: {e}", file.display()));
        for l in data["levels"].as_array().expect("a level file has a levels list") {
            deals.push(compact(lane, l));
        }
    }
    if let Ok(text) = fs::read_to_string(&archive) {
        let data: Value = serde_json::from_str(&text).unwrap_or_else(|e| panic!("{}: {e}", archive.display()));
        for d in data["deals"].as_array().expect("the archive has a deals list") {
            let lane = d["lane"].as_str().expect("an archived deal names its lane");
            deals.push(compact(lane, d));
        }
    }
    // the archive holds the current versions too: keep each distinct deal once
    let mut seen = std::collections::HashSet::new();
    deals.retain(|d| seen.insert(d.to_string()));
    let out = Path::new(&env::var("OUT_DIR").unwrap()).join("deals.json");
    fs::write(out, json!({ "deals": deals }).to_string()).unwrap();
}
