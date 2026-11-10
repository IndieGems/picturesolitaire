// Holds gem-backend-game-config.yaml's helpers to src/net/helper-ids.json, the one copy
// the game (src/net/helpers.ts) and the win checker (pay.rs, through build.rs) read:
// each currency's id, slug and cap, the helpers catalog's use and buy recipes, a Coins
// price on every buy, a buy refused at the cap, the bundles, and the kit's progression.
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
// THE BUNDLES (the creator, 2026-11-01; in Coins since 2026-11-10, when the Arcade dropped Gems:
// 100 Gems became 500 Coins): all three helpers, refused at the cap, one price and it in Coins, a
// round one (a multiple of 500), the Starter Kit once ever, and always cheaper than the same helpers
// bought one at a time for Coins
const single = (kind) => Number(/currency: ARCADE_TICKETS, price: (\d+) \}/.exec(entry(IDS.kinds[kind].buy))?.[1]);
check("four bundles, in shop order", (IDS.bundles ?? []).map((b) => b.name).join() === "starter,small,medium,large");
for (const b of IDS.bundles ?? []) {
  const e = entry(b.id);
  check(`${b.name}: the recipe ${b.id} is declared as ${b.slug}, a purchase`, e.includes(`slug: ${b.slug}\n`) && e.includes("recipe_type: purchase\n"));
  for (const [kind, n] of Object.entries(b.grants)) {
    const slug = IDS.kinds[kind]?.slug;
    check(`${b.name}: grants ${n} ${slug}, refused at the cap`, !!slug && n > 0 && n <= IDS.cap && e.includes(`currency_grant, currency_slug: ${slug}, amount: ${n}, overflow: fail }`));
  }
  check(`${b.name}: nothing else granted`, (e.match(/type: (currency_grant|item_grant|progression_\w+)/g) ?? []).length === Object.keys(b.grants).length);
  const price = Number(/currency: ARCADE_TICKETS, price: (\d+) \}/.exec(e)?.[1]);
  check(`${b.name}: a round Coins price (${price})`, price > 0 && price % 500 === 0);
  check(`${b.name}: one price, in Coins`, (e.match(/\{ currency: /g) ?? []).length === 1);
  check(`${b.name}: the unframed stand-in price is the config's`, b.coinsUnframed === price);
  check(`${b.name}: ${b.once ? "once ever (max_uses 1)" : "no use limit"}`, b.once === /\n *max_uses: 1\n/.test(`\n${e}\n`));
  const coins = Object.entries(b.grants).reduce((sum, [kind, n]) => sum + n * single(kind), 0);
  check(`${b.name}: cheaper than its helpers one at a time (${coins} Coins of them, for ${price})`, price < coins);
}
// VIP'S GIFTS (the creator, 2026-11-01; docs/vip.md): helpers only, 2 a day over a 7-day week (5 Hints,
// 4 Undos, 5 Shuffles), a welcome of 8 once a membership, and the welcome's mark declared for the checker
const V = IDS.vip ?? {};
const sum = (g) => Object.values(g ?? {}).reduce((a, n) => a + n, 0);
const onlyHelpers = (g) => Object.entries(g ?? {}).every(([k, n]) => k in IDS.kinds && Number.isInteger(n) && n >= 0 && n <= IDS.cap);
check("vip: a gift for each day of the week, Monday first", Array.isArray(V.daily) && V.daily.length === 7);
check("vip: each day's gift is 2 helpers, and nothing but helpers", (V.daily ?? []).every((g) => onlyHelpers(g) && sum(g) === 2));
const week = Object.fromEntries(Object.keys(IDS.kinds).map((k) => [k, (V.daily ?? []).reduce((a, g) => a + (g[k] ?? 0), 0)]));
check(`vip: a week gives 5 Hints, 4 Undos, 5 Shuffles (${JSON.stringify(week)})`, week.hint === 5 && week.undo === 4 && week.shuffle === 5);
check("vip: the welcome is 3 Hints, 2 Undos, 3 Shuffles", onlyHelpers(V.welcome) && V.welcome.hint === 3 && V.welcome.undo === 2 && V.welcome.shuffle === 3);
for (const [name, mark] of [["the welcome's mark", V.welcomeEnd], ["the day's mark", V.dayMark]]) {
  check(`vip: ${name} is declared, writable by no client`, (() => {
    const e = entry(mark?.progression);
    return e.includes(`slug: ${mark?.slug}\n`) && !e.includes("client_writable: true") && !e.includes("platform_grants");
  })());
}
check("the daily helper rotation names a helper for each weekday", IDS.daily.length === 7 && IDS.daily.every((k) => k in IDS.kinds));
check("the helpers catalog is declared", yaml.includes(`- id: ${IDS.catalog}\n    slug: helpers\n`));
check("the kit's progression is declared", yaml.includes(`- id: ${IDS.kit.progression}\n    slug: ${IDS.kit.slug}\n`));
check("the spends slot is declared", /- key: spends\n/.test(yaml));

console.log(failed ? `helpers: ${failed} FAILED` : "helpers: the config matches src/net/helper-ids.json");
process.exit(failed ? 1 : 0);
