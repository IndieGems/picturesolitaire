// Checks src/net/held-wins.ts, the rule for wins held while the checker cannot be reached:
// which is sent next, and which the player's "claims" slot keeps for a restart.
//
//   node tools/server/held-wins-check.mts
//
// Held wins are made from the shipped boards' own lines (campaign in play order, with challenge
// boards and a daily a day mixed in), 20, 60 and 400 of them, and the slot's rule must:
//   - keep all of them when they fit, and never more bytes than the slot takes;
//   - keep them in the order they were won;
//   - drop dailies before anything else, oldest date first;
//   - keep the campaign wins a prefix in play order: replayed through the checker's own rule
//     (progress.rs: a win ahead of the next position waits for "order"), every kept campaign
//     win applies, none is left retrying for good.
// The old rule (the newest 20) is run beside it on the same wins, to show what it stranded.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dealHash } from "../../src/net/deal-hash.ts";
import { KEEP_BYTES, SLOT_BYTES, nextToSend, slotBytes, trimHeld } from "../../src/net/held-wins.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const lane = (l) => JSON.parse(readFileSync(join(root, "src/content/levels", `${l}.json`), "utf8")).levels;
const campaign = lane("campaign");
const challenge = lane("challenge");
const daily = lane("daily");

// the slot's ceiling here must be the config's
const config = readFileSync(join(root, "gem-backend-game-config.yaml"), "utf8");
const declared = Number(/- key: claims[\s\S]*?max_size_bytes: (\d+)/.exec(config)?.[1]);
let failed = 0;
const check = (name, ok, got = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  ${got}`}`);
};
check(`the slot's ceiling is the config's (${declared} bytes)`, declared === SLOT_BYTES, `held-wins.ts says ${SLOT_BYTES}`);
check("the kept list leaves room in the slot", KEEP_BYTES < SLOT_BYTES);

/** A held win as claims.ts keeps it: the claim's body and what it shows meanwhile. */
function held(laneName, lv, extra = {}) {
  const deal = { cols: lv.cols, rows: lv.rows, pictures: lv.pictures, stacks: lv.stacks, seed: lv.seed };
  const line = lv.line.map((m) => (Array.isArray(m) ? { from: m[0], to: m[1] } : m));
  const id = randomUUID();
  const body = { v: 1, id, lane: laneName, board: lv.id, deal: dealHash(deal), line, ms: 95_123, ...extra };
  const effect = { lane: laneName, board: lv.id, ...(extra.n ? { n: extra.n } : {}), moves: line.length, ms: 95_123, ...(extra.date ? { date: extra.date } : {}), pictures: lv.pictures.map((p) => p.id) };
  return { id, body, effect };
}

/** `count` wins in the order won: mostly the campaign in play order, a challenge board every 4th, a daily a day (every 15th win). */
function session(count, firstN = 1) {
  const out = [];
  let n = firstN;
  let ch = 0;
  let day = 0;
  for (let k = 1; k <= count; k++) {
    if (k % 15 === 0) {
      const d = daily[day++ % daily.length];
      const date = new Date(Date.UTC(2026, 10, 1 + day)).toISOString().slice(0, 10);
      out.push(held("daily", d, { date }));
    } else if (k % 4 === 0) out.push(held("challenge", challenge[ch++ % challenge.length]));
    else {
      out.push(held("campaign", campaign[(n - 1) % campaign.length], { n }));
      n++;
    }
  }
  return out;
}

/** The checker's campaign rule (progress.rs, apply) over claims sent in order, each resent until it lands. */
function campaignLands(kept, next) {
  const waiting = kept.filter((c) => c.effect.lane === "campaign");
  for (let progress = true; progress && waiting.length; ) {
    progress = false;
    for (let i = 0; i < waiting.length; i++) {
      if (waiting[i].effect.n <= next) {
        next = Math.max(next, waiting[i].effect.n + 1);
        waiting.splice(i--, 1);
        progress = true;
      }
    }
  }
  return { stranded: waiting.length, next };
}

for (const count of [20, 60, 400]) {
  console.log(`\n${count} held wins (${slotBytes(session(count))} bytes as one list; the slot keeps ${KEEP_BYTES} of its ${SLOT_BYTES}):`);
  const firstN = 7;
  const all = session(count, firstN);
  const kept = trimHeld(all);
  const dropped = all.filter((c) => !kept.includes(c));
  const by = (list, l) => list.filter((c) => c.effect.lane === l);
  console.log(`  kept ${kept.length} (${by(kept, "campaign").length} campaign, ${by(kept, "challenge").length} challenge, ${by(kept, "daily").length} daily); dropped ${dropped.length} (${by(dropped, "campaign").length} campaign, ${by(dropped, "challenge").length} challenge, ${by(dropped, "daily").length} daily)`);

  check("the kept list fits the slot", slotBytes(kept) <= KEEP_BYTES, `${slotBytes(kept)} bytes`);
  if (slotBytes(all) <= KEEP_BYTES) check("all of them are kept when they fit", kept.length === all.length, `${kept.length} of ${all.length}`);
  else check("the slot is filled, not emptied (within one claim of its room)", KEEP_BYTES - slotBytes(kept) < Math.max(...dropped.map((c) => slotBytes([c]))), `${KEEP_BYTES - slotBytes(kept)} bytes unused`);
  check("kept in the order won", kept.every((c, i) => i === 0 || all.indexOf(kept[i - 1]) < all.indexOf(c)));
  const droppedOther = dropped.some((c) => c.effect.lane !== "daily");
  check("dailies go first", !droppedOther || by(kept, "daily").length === 0, `${by(kept, "daily").length} dailies kept while others were dropped`);
  const keptDates = by(kept, "daily").map((c) => c.effect.date);
  check("the oldest dailies go first", by(dropped, "daily").every((c) => keptDates.every((d) => c.effect.date <= d)));
  const camp = by(all, "campaign");
  const keptCamp = by(kept, "campaign");
  check("the campaign wins kept are the earliest (a prefix in play order)", keptCamp.every((c, i) => c === camp[i]));
  const lands = campaignLands(kept, firstN);
  check("every kept campaign win lands on the checker", lands.stranded === 0, `${lands.stranded} answered "order" for good`);
  console.log(`  after a restart: the campaign stands at board ${lands.next} (won up to ${firstN + camp.length - 1} before the outage; the player replays from ${lands.next})`);

  // the rule before 2026-10-25: the newest 20, whatever they were
  const old = all.slice(-20);
  const oldLands = campaignLands(old, firstN);
  console.log(`  the old rule (newest 20) kept ${old.length}: ${oldLands.stranded} campaign wins stranded for good${oldLands.stranded ? ", and every later one with them" : ""}`);
}

// what goes next: the oldest due, never a campaign win behind an earlier one
console.log("\nwhat is sent next:");
const q = (lanes, notBefore = []) => lanes.map((l, i) => ({ lane: l, i, notBefore: notBefore[i] ?? 0 }));
const pick = (queue, now = 0) => nextToSend(queue, now)?.i;
check("the oldest due goes first", pick(q(["campaign", "challenge", "daily"])) === 0);
check("a campaign win waits while an earlier one waits on a retry", pick(q(["campaign", "campaign", "challenge"], [5000])) === 2);
check("other lanes are not held up by a waiting campaign win", pick(q(["campaign", "daily"], [5000])) === 1);
check("nothing is sent before its retry time", pick(q(["challenge", "daily"], [5000, 5000])) === undefined);
check("once due, the waiting campaign win goes", pick(q(["campaign", "campaign"], [5000]), 6000) === 0);

console.log(failed ? `\nheld wins: ${failed} FAILED` : "\nheld wins: all passed");
process.exit(failed ? 1 : 0);
