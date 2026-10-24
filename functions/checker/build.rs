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
//
// It also fingerprints the level files (canon.rs, levels_hash) into
// PICTURE_MEND_LEVELS, which the function reports and the game build checks
// (tools/server/levels-check.mts).

use std::{env, fs, path::Path};

use serde_json::{json, Value};

include!("src/canon.rs");

/** "lane/id/dealHash" for a level as the files store it. */
fn line_of(lane: &str, l: &Value) -> String {
    let cards = |v: &Value| v.as_array().map(|a| a.iter().map(|c| c.as_i64().unwrap_or(0)).collect::<Vec<i64>>()).unwrap_or_default();
    let pictures: Vec<(String, u64, u64)> = l["pictures"]
        .as_array()
        .into_iter()
        .flatten()
        .map(|p| (p["id"].as_str().unwrap_or_default().to_string(), p["cols"].as_u64().unwrap_or(0), p["rows"].as_u64().unwrap_or(0)))
        .collect();
    let stacks: Vec<Vec<i64>> = l["stacks"].as_array().into_iter().flatten().map(cards).collect();
    let board = if l["board"].is_null() { None } else { Some(cards(&l["board"])) };
    let seed = (l["seed"].as_i64().unwrap_or(0) as u64 & 0xffff_ffff) as u32;
    let text = deal_text(l["cols"].as_u64().unwrap_or(0), l["rows"].as_u64().unwrap_or(0), &pictures, &stacks, seed, board.as_deref());
    format!("{lane}/{}/{}", l["id"].as_str().unwrap_or_default(), fnv32(&text))
}

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
    let mut lines: Vec<String> = Vec::new();
    // the campaign's order (its file's order): position n plays board (n - 1) % len
    let mut campaign: Vec<Value> = Vec::new();
    for lane in LANES {
        let file = levels.join(format!("{lane}.json"));
        println!("cargo:rerun-if-changed={}", file.display());
        let Ok(text) = fs::read_to_string(&file) else { continue };
        let data: Value = serde_json::from_str(&text).unwrap_or_else(|e| panic!("{}: {e}", file.display()));
        for l in data["levels"].as_array().expect("a level file has a levels list") {
            deals.push(compact(lane, l));
            lines.push(line_of(lane, l));
            if lane == "campaign" {
                campaign.push(l["id"].clone());
            }
        }
    }
    println!("cargo:rustc-env=PICTURE_MEND_LEVELS={}", levels_hash(lines));
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
    fs::write(out, json!({ "deals": deals, "campaign": campaign }).to_string()).unwrap();

    // which campaign board grants which table item (src/net/tables.json)
    let tables_file = Path::new(&here).join("../../src/net/tables.json");
    println!("cargo:rerun-if-changed={}", tables_file.display());
    let tables: Vec<Value> = fs::read_to_string(&tables_file)
        .ok()
        .and_then(|t| serde_json::from_str::<Value>(&t).ok())
        .and_then(|v| v["tables"].as_array().cloned())
        .unwrap_or_default()
        .iter()
        .map(|t| json!({ "board": t["board"], "slug": t["slug"] }))
        .collect();
    fs::write(Path::new(&env::var("OUT_DIR").unwrap()).join("tables.json"), Value::Array(tables).to_string()).unwrap();
}
