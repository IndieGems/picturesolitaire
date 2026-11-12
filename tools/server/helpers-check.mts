// Holds gem-backend-game-config.yaml's helpers to src/net/helper-ids.json, the one copy of
// their IDS the game (src/net/helpers.ts) and the win checker (pay.rs, through build.rs) read:
// each currency's id and slug, the helpers catalog's use and buy recipes, the bundles' recipes,
// and the kit's progression. Every FIGURE is the config's alone (the creator, 2026-11-12: "never
// copy amounts from the config into code"), which the game reads at run time: this checks only
// that the config's figures keep the shop's rules (one cap for all three, every buy refused at it,
// a Coins price on each, a pack and a bundle cheaper than the same helpers one at a time, the
// Starter Kit once ever), never that they equal a number of ours;
// and the rewards catalog (docs/vip.md) to tools/server/helper-rewards.json, the amounts'
// one copy: every recipe declared, server-only, its base what the file says (clamped at the
// cap), and one VIP bonus of the same again (VIP's gifts: the bonus alone).
//
//   node tools/server/helpers-check.mts        (tools/server/build.mts runs it)
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const IDS = JSON.parse(readFileSync(join(root, "src/net/helper-ids.json"), "utf8"));
const HR = JSON.parse(readFileSync(join(root, "tools/server/helper-rewards.json"), "utf8"));
const EN = JSON.parse(readFileSync(join(root, "locales/en.json"), "utf8"));
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

/** A currency's cap (its max_balance), or NaN. */
const capOf = (id) => Number(/\n *max_balance: (\d+)\n/.exec(`\n${entry(id)}\n`)?.[1]);
const CAPS = Object.values(IDS.kinds).map((k) => capOf(k.currency));
/** The cap, one for all three (the screens say "N of each"). */
const CAP = CAPS[0];
check("the three helpers share one cap (" + CAPS.join(", ") + ")", CAPS.every((c) => Number.isInteger(c) && c > 0 && c === CAP));
const price = (e) => Number(/currency: ARCADE_TICKETS, price: (\d+) \}/.exec(e)?.[1]);
/** What an entry grants of each helper, refused at the cap (overflow: fail); and how many grants it has of anything. */
const grantsOf = (e) => ({
  helpers: Object.fromEntries(Object.entries(IDS.kinds).map(([k, v]) => [k, Number(new RegExp("currency_grant, currency_slug: " + v.slug + ", amount: (\\d+), overflow: fail \\}").exec(e)?.[1] ?? 0)])),
  all: (e.match(/type: (currency_grant|item_grant|progression_\w+)/g) ?? []).length,
});
for (const [kind, k] of Object.entries(IDS.kinds)) {
  const c = entry(k.currency);
  check(kind + ": the currency " + k.currency + " is declared as " + k.slug, c.includes("slug: " + k.slug + "\n"));
  check(kind + ": no client may write it", c.includes("client_writable: false"));
  check(kind + ": no daily top-up (one bucket that never resets)", (c.match(/{ name: /g) || []).length === 1 && c.includes("reset_interval: never"));
  const use = entry(k.use);
  check(kind + ": use-" + kind + " consumes 1 " + k.slug, use.includes("slug: use-" + kind + "\n") && use.includes("currency_consume, currency_slug: " + k.slug + ", amount: 1 }"));
  // the single and the pack: each grants its own helper alone, refused at the cap, for Coins. The words
  // on the buttons are UI's ("1 Hint", "3 Hints", locales/en.json shop.buy, shop.buy3): held to the
  // config here until they are worded from its figure (stock.size)
  const buy = entry(k.buy);
  const pack = entry(k.buy3);
  const one = grantsOf(buy);
  const three = grantsOf(pack);
  check(kind + ": buy-" + kind + " grants its helper alone, refused at the cap", buy.includes("slug: buy-" + kind + "\n") && one.all === 1 && one.helpers[kind] > 0);
  check(kind + ": buy-" + kind + " has a Coins price", price(buy) > 0);
  check(kind + ": the pack grants its helper alone, more than the single, refused at the cap", three.all === 1 && three.helpers[kind] > one.helpers[kind] && three.helpers[kind] <= CAP);
  check(kind + ": the pack saves on its helpers bought singly, and costs at least 100", price(pack) < (three.helpers[kind] / one.helpers[kind]) * price(buy) && price(pack) >= 100);
  for (const [key, n] of [["buy", one.helpers[kind]], ["buy3", three.helpers[kind]]]) {
    const words = String(EN["shop." + key + "." + kind] ?? "");
    const said = /^(\d+) /.exec(words)?.[1];
    if (said !== undefined) check(kind + ": UI's words \"" + words + "\" say what the config grants (" + n + ")", Number(said) === n);
  }
}
// THE BUNDLES (the creator, 2026-11-01; in Coins since 2026-11-10, when the Arcade dropped Gems:
// 100 Gems became 500 Coins): all three helpers, refused at the cap, one price and it in Coins, a
// round one (a multiple of 500), the Starter Kit once ever (its recipe's max_uses: the game reads it),
// and always cheaper than the same helpers bought one at a time for Coins
const single = (kind) => {
  const e = entry(IDS.kinds[kind].buy);
  return price(e) / grantsOf(e).helpers[kind];
};
check("four bundles, in shop order", (IDS.bundles ?? []).map((b) => b.name).join() === "starter,small,medium,large");
check("the bundles hold ids only (the config holds their figures)", (IDS.bundles ?? []).every((b) => Object.keys(b).sort().join() === "id,name,slug"));
check("helper-ids.json holds no cap (the config's max_balance is the one)", !("cap" in IDS));
for (const b of IDS.bundles ?? []) {
  const e = entry(b.id);
  check(b.name + ": the recipe " + b.id + " is declared as " + b.slug + ", a purchase", e.includes("slug: " + b.slug + "\n") && e.includes("recipe_type: purchase\n"));
  const g = grantsOf(e);
  check(b.name + ": grants all three helpers and nothing else, each within the cap and refused at it", Object.values(g.helpers).every((n) => n > 0 && n <= CAP) && g.all === 3);
  const p = price(e);
  check(b.name + ": a round Coins price (" + p + ")", p > 0 && p % 500 === 0);
  check(b.name + ": one price, in Coins", (e.match(/\{ currency: /g) ?? []).length === 1);
  const once = /\n *max_uses: 1\n/.test("\n" + e + "\n");
  check(b.name + ": " + (b.name === "starter" ? "once ever (max_uses 1)" : "no use limit"), once === (b.name === "starter") && (once || !/max_uses:/.test(e)));
  const coins = Object.entries(g.helpers).reduce((sum, [kind, n]) => sum + n * single(kind), 0);
  check(b.name + ": cheaper than its helpers one at a time (" + coins + " Coins of them, for " + p + ")", p < coins);
}
// THE HELPER REWARDS (docs/vip.md; the creator, 2026-11-12): the rewards catalog, server-only, every
// amount from helper-rewards.json, and VIP's part a bonus the platform judges (holds_pass vip), never code
const R = IDS.rewards ?? {};
const sum = (g) => Object.values(g ?? {}).reduce((a, n) => a + n, 0);
const onlyHelpers = (g) => Object.entries(g ?? {}).every(([k, n]) => k in IDS.kinds && Number.isInteger(n) && n >= 0 && n <= CAP);
check("rewards: the rewards catalog is declared", yaml.includes(`- id: ${R.catalog?.id}\n    slug: ${R.catalog?.slug}\n`));
/** What an entry grants of each helper: base (the recipe's grants, clamped) and bonus (its one VIP bonus). */
const split = (e) => {
  const [base, bonus = ""] = e.split("\n        bonuses:\n");
  const of = (part, clamp) =>
    Object.fromEntries(
      Object.entries(IDS.kinds).map(([k, v]) => {
        const m = new RegExp(`currency_grant, currency_slug: ${v.slug}, amount: (\\d+)${clamp ? ", bucket: earned, overflow: clamp" : ""} \\}`).exec(part);
        return [k, m ? Number(m[1]) : 0];
      }),
    );
  return { base: of(base, true), bonus: of(bonus, false), bonusText: bonus, baseText: base };
};
const same = (a, b) => Object.keys(IDS.kinds).every((k) => (a?.[k] ?? 0) === (b?.[k] ?? 0));
const vipBonus = (t) => (t.match(/- id: vip\n/g) ?? []).length === 1 && t.includes("requires: [{ kind: holds_pass, pass: vip }]");
const rewardCheck = (name, r, base, bonus) => {
  const e = entry(r?.id);
  check(`rewards: ${name} is declared as ${r?.slug}`, e.includes(`slug: ${r?.slug}\n`));
  check(`rewards: ${name} is server-only (no client_writable, no price)`, !e.includes("client_writable: true") && !e.includes("platform_prices"));
  const g = split(e);
  check(`rewards: ${name} gives everyone ${JSON.stringify(base ?? {})}`, same(g.base, base ?? {}) && (base ? true : !g.baseText.includes("currency_grant")));
  check(`rewards: ${name} has one VIP bonus (holds_pass vip) of ${JSON.stringify(bonus)}`, vipBonus(g.bonusText) && same(g.bonus, bonus));
  return e;
};
check("rewards: the kit, the hard and the stamp rewards are helpers only, within the cap", [HR.kit, HR.hard, HR.stamp].every((g) => onlyHelpers(g) && sum(g) > 0));
const kit = rewardCheck("the kit", R.kit, HR.kit, HR.kit);
check("rewards: the kit sets its own mark", kit.includes(`type: progression_set, progression_definition_id: ${IDS.kit.progression}, value: 1`));
rewardCheck("a hard level's first win", R.hard, HR.hard, HR.hard);
rewardCheck("a trip's last level", R.stamp, HR.stamp, HR.stamp);
check("rewards: the daily helper rotation names a helper for each weekday, Monday first", (HR.daily ?? []).length === 7 && HR.daily.every((k) => k in IDS.kinds));
check("rewards: a daily recipe for each weekday", (R.daily ?? []).length === 7);
(R.daily ?? []).forEach((r, i) => rewardCheck(`the daily's first win, day ${i + 1}`, r, { [HR.daily[i]]: 1 }, { [HR.daily[i]]: 1 }));
// VIP's gifts (the creator, 2026-11-01): 2 helpers a day over a 7-day week (5 Hints, 4 Undos, 5 Shuffles),
// and a welcome of 3 Hints, 2 Undos, 3 Shuffles once per player, ever, with its account-bound item
const V = HR.vip ?? {};
check("vip: a gift for each day of the week, Monday first", Array.isArray(V.daily) && V.daily.length === 7 && (R.vipGift ?? []).length === 7);
check("vip: each day's gift is 2 helpers, and nothing but helpers", (V.daily ?? []).every((g) => onlyHelpers(g) && sum(g) === 2));
const week = Object.fromEntries(Object.keys(IDS.kinds).map((k) => [k, (V.daily ?? []).reduce((a, g) => a + (g[k] ?? 0), 0)]));
check(`vip: a week gives 5 Hints, 4 Undos, 5 Shuffles (${JSON.stringify(week)})`, week.hint === 5 && week.undo === 4 && week.shuffle === 5);
(R.vipGift ?? []).forEach((r, i) => rewardCheck(`VIP's gift, day ${i + 1}`, r, null, V.daily[i]));
check("vip: the welcome is 3 Hints, 2 Undos, 3 Shuffles", onlyHelpers(V.welcome) && V.welcome.hint === 3 && V.welcome.undo === 2 && V.welcome.shuffle === 3);
const welcome = rewardCheck("VIP's welcome", R.vipWelcome, null, V.welcome);
check("vip: the welcome's bonus grants its account-bound item", welcome.includes(`item_grant, item_definition_slug: ${R.welcomeItem?.slug}, quantity: 1, account_bound: true }`));
check("vip: the welcome's item is declared, never traded or written by the game", (() => {
  const e = entry(R.welcomeItem?.id);
  return e.includes(`slug: ${R.welcomeItem?.slug}\n`) && e.includes("transfer_policy: none") && e.includes("client_writable: false") && !e.includes("platform_prices");
})());
for (const [name, mark] of [["the old welcome mark", IDS.oldMarks?.welcomeEnd], ["the old day mark", IDS.oldMarks?.dayMark]]) {
  check(`vip: ${name} stays declared, writable by no client`, (() => {
    const e = entry(mark?.progression);
    return e.includes(`slug: ${mark?.slug}\n`) && !e.includes("client_writable: true") && !e.includes("platform_grants");
  })());
}
// no VIP Coins of the game's own: the Arcade pays VIP's +50% (2026-11-11)
check("vip: the retired VIP Coins progression pays nothing", !entry("38072584-41bb-4cb2-95cc-8a0455af63a5").includes("platform_grants"));
check("the helpers catalog is declared", yaml.includes(`- id: ${IDS.catalog}\n    slug: helpers\n`));
check("the kit's progression is declared", yaml.includes(`- id: ${IDS.kit.progression}\n    slug: ${IDS.kit.slug}\n`));
check("the spends slot is declared", /- key: spends\n/.test(yaml));

console.log(failed ? `helpers: ${failed} FAILED` : "helpers: the config matches src/net/helper-ids.json");
process.exit(failed ? 1 : 0);
