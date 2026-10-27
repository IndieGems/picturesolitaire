// Holds gem-backend-game-config.yaml's helpers to src/net/helper-ids.json, the one copy
// the game (src/net/helpers.ts) and the win checker (pay.rs, through build.rs) read:
// each currency's id, slug and cap, the helpers catalog's use and buy recipes, a Coins
// price on every buy, a buy refused at the cap, and the kit's progression.
//
//   node tools/server/helpers-check.mts        (tools/server/build.mts runs it)
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const IDS = JSON.parse(readFileSync(join(root, "src/net/helper-ids.json"), "utf8"));
const yaml = readFileSync(join(root, "gem-backend-game-config.yaml"), "utf8").replace(/\r/g, "");

let failed = 0;
const check = (name, ok) => {
  if (!ok) failed++;
  if (!ok) console.log(`FAIL ${name}`);
};
/** The YAML entry that starts with `- id: <id>`, up to the next entry at its indent. */
const entry = (id) => {
  const m = new RegExp(`\\n( *)- id: ${id}\\n([\\s\\S]*?)(?=\\n\\1- |\\n\\S|$)`).exec(yaml);
  return m ? m[2] : "";
};

for (const [kind, k] of Object.entries(IDS.kinds)) {
  const c = entry(k.currency);
  check(`${kind}: the currency ${k.currency} is declared as ${k.slug}`, c.includes(`slug: ${k.slug}\n`));
  check(`${kind}: capped at ${IDS.cap}`, c.includes(`max_balance: ${IDS.cap}\n`));
  check(`${kind}: no client may write it`, c.includes("client_writable: false"));
  check(`${kind}: no daily top-up (one bucket that never resets)`, (c.match(/{ name: /g) || []).length === 1 && c.includes("reset_interval: never"));
  const use = entry(k.use);
  check(`${kind}: use-${kind} consumes 1 ${k.slug}`, use.includes(`slug: use-${kind}\n`) && use.includes(`currency_consume, currency_slug: ${k.slug}, amount: 1 }`));
  const buy = entry(k.buy);
  check(`${kind}: buy-${kind} grants 1 ${k.slug}, refused at the cap`, buy.includes(`slug: buy-${kind}\n`) && buy.includes(`currency_grant, currency_slug: ${k.slug}, amount: 1, overflow: fail }`));
  check(`${kind}: buy-${kind} has a Coins price`, /currency: ARCADE_TICKETS, price: \d+ \}/.test(buy));
  // the pack of 3: refused at the cap, cheaper than three singles, never under 100 Coins
  const pack = entry(k.buy3);
  const price = (e) => Number(/currency: ARCADE_TICKETS, price: (\d+) \}/.exec(e)?.[1]);
  check(`${kind}: the pack grants 3 ${k.slug}, refused at the cap`, pack.includes(`currency_grant, currency_slug: ${k.slug}, amount: 3, overflow: fail }`));
  check(`${kind}: the pack saves on three singles, and costs at least 100`, price(pack) < 3 * price(buy) && price(pack) >= 100);
}
check("the daily helper rotation names a helper for each weekday", IDS.daily.length === 7 && IDS.daily.every((k) => k in IDS.kinds));
check("the helpers catalog is declared", yaml.includes(`- id: ${IDS.catalog}\n    slug: helpers\n`));
check("the kit's progression is declared", yaml.includes(`- id: ${IDS.kit.progression}\n    slug: ${IDS.kit.slug}\n`));
check("the spends slot is declared", /- key: spends\n/.test(yaml));

console.log(failed ? `helpers: ${failed} FAILED` : "helpers: the config matches src/net/helper-ids.json");
process.exit(failed ? 1 : 0);
