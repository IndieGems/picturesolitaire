// Gathers every deal the checker must know into one compact file it embeds
// (OUT_DIR/deals.json): the level files the game ships (src/content/levels/,
// the levels member's) and data/archive.json, every earlier version of each
// board, kept so a player on an older build still verifies
// (tools/server/archive.mts appends to it). Only what a replay needs is kept:
// lane, id, cols, rows, seed, pictures, stacks, and board (the cards already
// placed, when a level has them).
//
// The lane is the file's name: campaign.json -> "campaign", challenge.json ->
// "challenge", daily.json -> "daily", except souvenirs.json -> "souvenir" (the
// optional bonus board after each trip, docs/souvenirs.md). Other files are not
// lanes the checker pays. A Souvenir unlocks once its trip is stamped: deals.json's
// "souvenirs" maps each to its trip's last campaign position (trips.json "to").
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

/** (lane, its file in src/content/levels): tools/server/levels-hash.mts has the same list. */
const LANES: [(&str, &str); 4] = [("campaign", "campaign"), ("challenge", "challenge"), ("daily", "daily"), ("souvenir", "souvenirs")];

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
    // each Souvenir: the campaign position its trip ends at, which must be won first
    let trips_file = levels.join("trips.json");
    let trip_ends: std::collections::HashMap<String, u64> = fs::read_to_string(&trips_file)
        .ok()
        .and_then(|t| serde_json::from_str::<Value>(&t).ok())
        .and_then(|v| v["trips"].as_array().cloned())
        .unwrap_or_default()
        .iter()
        .filter_map(|t| Some((t["id"].as_str()?.to_string(), t["to"].as_u64()?)))
        .collect();
    let mut souvenirs = serde_json::Map::new();
    for (lane, name) in LANES {
        let file = levels.join(format!("{name}.json"));
        println!("cargo:rerun-if-changed={}", file.display());
        let Ok(text) = fs::read_to_string(&file) else { continue };
        let data: Value = serde_json::from_str(&text).unwrap_or_else(|e| panic!("{}: {e}", file.display()));
        for l in data["levels"].as_array().expect("a level file has a levels list") {
            deals.push(compact(lane, l));
            lines.push(line_of(lane, l));
            if lane == "campaign" {
                campaign.push(l["id"].clone());
            }
            if lane == "souvenir" {
                let id = l["id"].as_str().expect("a souvenir has an id");
                let trip = l["trip"].as_str().unwrap_or_else(|| panic!("souvenirs.json {id}: no trip"));
                let end = trip_ends.get(trip).unwrap_or_else(|| panic!("souvenirs.json {id}: its trip {trip} is not in trips.json"));
                souvenirs.insert(id.into(), json!(end));
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
    fs::write(out, json!({ "deals": deals, "campaign": campaign, "souvenirs": souvenirs }).to_string()).unwrap();

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

    // WHAT A WIN PAYS WITH (OUT_DIR/pay.json): each board's progression id (the config's, from
    // tools/server/make-config.mts's uuid5, so an order can name it), the campaign boards whose
    // first win gives a gift ("hard": a hard or super mark; "stamp": a trip's last board, which
    // wins over "hard"), and the helper ids and gift sizes (src/net/helper-ids.json).
    let mut boards = serde_json::Map::new();
    let mut gifts = serde_json::Map::new();
    let read = |p: &Path| -> Value {
        println!("cargo:rerun-if-changed={}", p.display());
        serde_json::from_str(&fs::read_to_string(p).unwrap_or_else(|e| panic!("{}: {e}", p.display()))).unwrap()
    };
    let trips = read(&levels.join("trips.json"));
    let last: Vec<u64> = trips["trips"].as_array().into_iter().flatten().filter_map(|t| t["to"].as_u64()).collect();
    for (lane, name) in [("campaign", "campaign"), ("challenge", "challenge"), ("souvenir", "souvenirs")] {
        let path = levels.join(format!("{name}.json"));
        if lane == "souvenir" && !path.exists() {
            continue;
        }
        let data = read(&path);
        for (i, l) in data["levels"].as_array().into_iter().flatten().enumerate() {
            let id = l["id"].as_str().expect("a level has an id");
            boards.insert(format!("board_{id}"), json!(uuid5(&format!("board:{lane}:{id}"))));
            if lane != "campaign" {
                continue;
            }
            if last.contains(&(i as u64 + 1)) {
                gifts.insert(id.into(), json!("stamp"));
            } else if matches!(l["mark"].as_str(), Some("hard") | Some("super")) {
                gifts.insert(id.into(), json!("hard"));
            }
        }
    }
    let helpers = read(&Path::new(&here).join("../../src/net/helper-ids.json"));
    let pay = json!({ "boards": boards, "gifts": gifts, "helpers": helpers });
    fs::write(Path::new(&env::var("OUT_DIR").unwrap()).join("pay.json"), pay.to_string()).unwrap();

    // THE DAILY SUITCASE (OUT_DIR/suitcases.json, read by src/suitcase.rs): Levels' months
    // (src/content/levels/suitcases.json) with each item's and each month's prize mark's id
    // (name-based, exactly as make-config.mts writes them into the config), the month's table
    // item (src/net/tables.json) unless it is the built-in table, and the fixed ids
    // (src/net/suitcase-ids.json). The schedule is the date's, so a day's item is the same
    // whichever version of its board was played. A daily board that names its item must name
    // its date's, and hold it as one of its own pictures (check.mts proves the same).
    let fixed = read(&Path::new(&here).join("../../src/net/suitcase-ids.json"));
    let built_in = fixed["builtInTable"].as_str().expect("src/net/suitcase-ids.json names its builtInTable");
    let table_items = read(&tables_file)["tables"].as_array().cloned().unwrap_or_default();
    // every player's own table is no item: one that is both would be paid for by nothing
    assert!(
        !table_items.iter().any(|t| t["slug"] == built_in),
        "{built_in} is an item in src/net/tables.json and also src/net/suitcase-ids.json's builtInTable: a month showing it would pay no table"
    );
    let schedule = levels.join("suitcases.json");
    println!("cargo:rerun-if-changed={}", schedule.display());
    let source: Vec<Value> = fs::read_to_string(&schedule)
        .ok()
        .map(|t| serde_json::from_str::<Value>(&t).unwrap_or_else(|e| panic!("{}: {e}", schedule.display())))
        .and_then(|v| v["months"].as_array().cloned())
        .unwrap_or_default();
    let daily = read(&levels.join("daily.json"));
    let by_date: std::collections::HashMap<&str, &Value> =
        daily["levels"].as_array().into_iter().flatten().filter_map(|l| Some((l["date"].as_str()?, l))).collect();
    let mut months: Vec<Value> = Vec::new();
    let mut unmarked = 0;
    for m in &source {
        let month = m["month"].as_str().expect("a suitcase month names its month");
        let items: Vec<Value> = m["items"]
            .as_array()
            .unwrap_or_else(|| panic!("suitcases.json {month}: no items"))
            .iter()
            .map(|i| {
                let id = i["id"].as_str().unwrap_or_else(|| panic!("suitcases.json {month}: an item with no id"));
                json!({ "id": id, "uuid": uuid5(&format!("suitcase:item:{id}")) })
            })
            .collect();
        let days = m["days"].as_object().unwrap_or_else(|| panic!("suitcases.json {month}: no days"));
        for (date, item) in days {
            let item = item.as_str().unwrap_or_default();
            assert!(date.starts_with(month), "suitcases.json {month}: {date} is not in the month");
            assert!(items.iter().any(|i| i["id"] == item), "suitcases.json {month}: {date}'s item {item} is not one of the month's");
            let Some(level) = by_date.get(date.as_str()) else { continue };
            match level["item"]["id"].as_str() {
                Some(named) if named == item => assert!(
                    level["pictures"].as_array().into_iter().flatten().any(|p| p["id"] == item),
                    "daily {date}: its item {item} is not one of its pictures"
                ),
                Some(named) => panic!("daily {date}: its board's item is {named}, but suitcases.json says {item}"),
                None => unmarked += 1,
            }
        }
        let slug = m["table"].as_str().unwrap_or(built_in);
        let table = if slug == built_in {
            Value::Null
        } else {
            let t = table_items
                .iter()
                .find(|t| t["slug"] == slug)
                .unwrap_or_else(|| panic!("suitcases.json {month}: its table {slug} is not in src/net/tables.json (node tools/server/make-config.mts adds it)"));
            json!({ "slug": slug, "uuid": t["id"] })
        };
        months.push(json!({ "month": month, "items": items, "table": table, "mark": uuid5(&format!("suitcase:prize:{month}")), "days": days }));
    }
    if unmarked > 0 {
        println!("cargo:warning=suitcase: {unmarked} scheduled daily boards do not name their item yet (packing goes by the date all the same)");
    }
    // the event's one switch: anything but true (missing, mistyped) is off, which grants nothing
    let on = fixed["on"].as_bool() == Some(true);
    let suitcases = json!({
        "on": on, "event": fixed["event"], "prize": fixed["prize"], "spares": fixed["spares"],
        "stack": fixed["stack"], "shelf": fixed["shelf"], "months": months,
    });
    fs::write(Path::new(&env::var("OUT_DIR").unwrap()).join("suitcases.json"), suitcases.to_string()).unwrap();
}

/// The game id: the namespace of the config's name-based ids (tools/server/make-config.mts).
const NAMESPACE: [u8; 16] = [0x9c, 0x56, 0x21, 0x25, 0xf1, 0x55, 0x46, 0x01, 0xa3, 0x49, 0xf6, 0x6c, 0xa3, 0xc5, 0xf2, 0xb6];

/// A name-based UUID (RFC 4122 version 5), exactly as make-config.mts makes the config's.
fn uuid5(name: &str) -> String {
    let mut msg = NAMESPACE.to_vec();
    msg.extend_from_slice(name.as_bytes());
    let mut h = sha1(&msg);
    h[6] = (h[6] & 0x0f) | 0x50;
    h[8] = (h[8] & 0x3f) | 0x80;
    let x: String = h[..16].iter().map(|b| format!("{b:02x}")).collect();
    format!("{}-{}-{}-{}-{}", &x[0..8], &x[8..12], &x[12..16], &x[16..20], &x[20..32])
}

/// SHA-1 (FIPS 180-4), for the name-based ids only.
fn sha1(data: &[u8]) -> [u8; 20] {
    let mut h: [u32; 5] = [0x6745_2301, 0xefcd_ab89, 0x98ba_dcfe, 0x1032_5476, 0xc3d2_e1f0];
    let mut m = data.to_vec();
    let bits = (data.len() as u64).wrapping_mul(8);
    m.push(0x80);
    while m.len() % 64 != 56 {
        m.push(0);
    }
    m.extend_from_slice(&bits.to_be_bytes());
    for chunk in m.chunks(64) {
        let mut w = [0u32; 80];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([chunk[4 * i], chunk[4 * i + 1], chunk[4 * i + 2], chunk[4 * i + 3]]);
        }
        for i in 16..80 {
            w[i] = (w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]).rotate_left(1);
        }
        let (mut a, mut b, mut c, mut d, mut e) = (h[0], h[1], h[2], h[3], h[4]);
        for (i, wi) in w.iter().enumerate() {
            let (f, k) = match i {
                0..=19 => ((b & c) | (!b & d), 0x5a82_7999),
                20..=39 => (b ^ c ^ d, 0x6ed9_eba1),
                40..=59 => ((b & c) | (b & d) | (c & d), 0x8f1b_bcdc),
                _ => (b ^ c ^ d, 0xca62_c1d6u32),
            };
            let t = a.rotate_left(5).wrapping_add(f).wrapping_add(e).wrapping_add(k).wrapping_add(*wi);
            e = d;
            d = c;
            c = b.rotate_left(30);
            b = a;
            a = t;
        }
        h = [h[0].wrapping_add(a), h[1].wrapping_add(b), h[2].wrapping_add(c), h[3].wrapping_add(d), h[4].wrapping_add(e)];
    }
    let mut out = [0u8; 20];
    for (i, v) in h.iter().enumerate() {
        out[4 * i..4 * i + 4].copy_from_slice(&v.to_be_bytes());
    }
    out
}
