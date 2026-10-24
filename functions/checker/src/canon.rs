// The canonical texts the checker and the game's tools hash, shared by build.rs
// (include!) and claim.rs (mod). src/net/deal-hash.ts and
// tools/server/levels-hash.mts compute the same in TypeScript;
// tools/server/check.mts proves the two agree.

/// FNV-1a (32-bit) of `text`, as 8 lowercase hex.
pub fn fnv32(text: &str) -> String {
    let mut h: u32 = 0x811c_9dc5;
    for b in text.bytes() {
        h ^= b as u32;
        h = h.wrapping_mul(0x0100_0193);
    }
    format!("{h:08x}")
}

/// A deal's canonical text:
/// cols x rows ; picture:cols x rows,... ; stack cards joined by "," and stacks by "/" ; seed
/// [; the cards already on the board, joined by ",", only when the deal places some]
pub fn deal_text(cols: u64, rows: u64, pictures: &[(String, u64, u64)], stacks: &[Vec<i64>], seed: u32, board: Option<&[i64]>) -> String {
    let join = |v: &[i64]| v.iter().map(|c| c.to_string()).collect::<Vec<_>>().join(",");
    let pictures = pictures.iter().map(|(id, c, r)| format!("{id}:{c}x{r}")).collect::<Vec<_>>().join(",");
    let stacks = stacks.iter().map(|s| join(s)).collect::<Vec<_>>().join("/");
    let mut text = format!("{cols}x{rows};{pictures};{stacks};{seed}");
    if let Some(b) = board {
        text.push(';');
        text.push_str(&join(b));
    }
    text
}

/// The level data's fingerprint: FNV-1a of the lines "lane/id/dealHash", sorted, joined by "\n".
pub fn levels_hash(mut lines: Vec<String>) -> String {
    lines.sort();
    fnv32(&lines.join("\n"))
}
