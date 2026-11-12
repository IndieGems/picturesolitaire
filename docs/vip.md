# VIP: what Gem Arcade VIP members get in Picture Passport

VIP is the Gem Arcade's real-money pass, sold by the Arcade Store (the pass `vip`, sold as
`vip_pass_30d`, 30 days; on sale since 2026-11-01, gem-web#4375). The game never prices it or
describes the Arcade's own perks; the SDK's `docs/arcade-and-store.md` (sections 10 and 11) has the
rules.

**The rule since 2026-11-10** (the creator): **VIP gates no content.** Events, past events and the
daily archive are open to everyone; a VIP gets better rewards for playing them instead: **+50% on
every Coins grant (the Arcade's own since 2026-11-11) and as many helpers again on every helper
reward (the config's bonuses since checker 0.1.63).** Until then the events and the archive were
VIP's alone, behind locked doors (the plan of 2026-10-30, in `git log` of this file).

**No game code reads VIP** (the creator, 2026-11-12; the game standard's "VIP: gate on the pass in
config, never multiply in code" and ECON-08). What VIP adds is the config's: `bonuses` with
`requires: [{ kind: holds_pass, pass: vip }]` on the rewards catalog's recipes, judged by the
platform as a recipe runs. **No amount is copied into code**: the reward sizes live only in
`tools/server/helper-rewards.json`, which the config generator alone reads; the game learns them
from the platform's preview before a reward and from the receipt after; the checker from the receipt.
**The base reward is the same for everyone.** There is no roll in any bonus, so no odds to disclose.

## Who is VIP

- **The platform, as a recipe runs.** The win checker never asks which passes a player holds
  (checker 0.1.63 on; until then `vip.rs` and `platform_vip` did). Each helper reward and each VIP
  gift is a server-only recipe (below) whose VIP bonus the platform judges: `applied` for a player
  holding VIP, `skipped` (`requirement_unmet`, `holds_pass`) for anyone else. The receipt's `bonus`
  entry is the only word on it, and the checker passes it on (`bonuses` in a verdict).
- **For the screens, the preview.** `src/net/vip.ts` previews VIP's daily-gift recipe
  (`gem.gameConfig.preview({ recipe })`): its bonus's `eligible` is `isVip()` (home's badge, the VIP
  screen), `"unknown"` leaves it unknown. It looks at boot, on resuming, on a new day, and after Get
  VIP's sheet or a sign-in (`recheckVip()`, `src/ui/vip-view.ts`). It reads no pass, names none,
  and decides nothing.
- **VIP on dev is an account that holds the pass.** The dev menu's "Pretend I'm VIP" went on
  2026-11-11 and the checker's dev `pretend_vip` on 0.1.63: a config bonus cannot be faked. A test
  account is given VIP for a few days by an Admin (`gemctl org test-accounts pass grant <org> <label>
  vip --days 7`).

## What everyone gets (no VIP needed)

- **The events.** Each event is **30 levels of its own**, never the dailies, made from library
  pictures (none on another level first, none twice within an event), with **10 items, one hidden in
  each of 10 of its levels** (seeded, `itemLevels` in `events-plan.json`: at least one in levels 1–5,
  never 25 or 30). Which levels hide items is never shown: a won item level wears a suitcase. Each
  item found pays **15 Coins** (150 an event, paid as each lands, so no lump at the end; 50 and 500
  until config 65), and finding all 10 wins the event's table and its **stamp in the Passport** (its
  "Event stamps" page), once. Its levels pay 5 to 15 Coins each (0.45 a move: the creator, 2026-11-10,
  about 280 an event; `docs/coins.md`). An event is playable from its release
  on, for good; the dailies carry no items. **The schedule** (the creator, 2026-10-30): a new event on
  the 1st and the 15th: Haunted Holiday (15 Oct), Ski Trip (1 Nov), Grand Train Journey (15 Nov),
  Winter Market (1 Dec), Northern Lights (15 Dec), Carnival (1 Jan 2027).
- **The event archive** is every past event, still playable and winnable.
- **An event is played in order** (the creator, 2026-11-10): level N pays only once levels 1 to N-1
  of that event are won, in current and past events alike; otherwise the checker refuses it
  `out_of_order` and names the level that is next (`next`). A level won already is never refused,
  whatever the order it was won in (a replay, or a win from before the rule), and nothing won is
  taken away. The event page offers one Play, for the lowest level not won (UI's).
- **The daily archive**: past days' dailies from a calendar opened from home's Daily tile, over the
  game standard's window: the player's current month and the two before it, in their own months.
  Each past day pays its Coins once, as it would have on the day; the server pays nothing older
  (with the standard's day of slack). Yesterday's result still goes on yesterday's friends board.
- The checker no longer refuses anything as `vip_only` (0.1.54 on): an event level while the events
  are switched off is `events_off`, a day older than the archive `too_old`.

## What VIP adds

1. **+50% on every Coins grant: the Arcade's, since 2026-11-11** (the creator: "the gem arcade
   updated yesterday and it now pays the 50% extra for VIPs"; SDK 24, `arcade-economy.md` section 7).
   The platform adds it to every Coins grant a VIP receives, ours included, and scales the ceilings
   with it; the config keeps the unboosted amounts (`docs/coins.md`). **The game pays none of it**:
   checker 0.1.60 on adds no Coins of its own. Checkers
   0.1.55 to 0.1.59 paid our own +50% inside the reward's order on the `vip_coins` progression, which
   the platform then boosted too (about 2.25× for a real VIP, dev only: release never ran them). The
   progression stays declared, written by nothing, so its id is never reused.
2. **As many helpers again on every helper reward**, the config's bonus on each reward's recipe:
   the guided start's kit (3 of each becomes 6), a hard board's first win, a stamp, and the daily's
   first win. A base grant clamps at the cap (each helper currency's max_balance, 20); a bonus that cannot land whole is skipped by the
   platform (a VIP near the cap gets the base, clamped, and no extra: as before).
3. **VIP's own gifts** (the creator, 2026-11-01, after Jade Match; the welcome's rule, 2026-11-11):
   - **a daily VIP gift of 2 helpers** on the player's own date (the platform's), once a date, by the
     day of their week, Monday first: a week brings 5 Hints, 4 Undos and 5 Shuffles (Monday Hint +
     Undo, Tuesday Shuffle + Hint, Wednesday Undo + Shuffle, Thursday Hint + Undo, Friday Shuffle +
     Hint, Saturday Undo + Shuffle, Sunday Hint + Shuffle); a day not opened is not saved up;
   - **a welcome gift ONCE PER PLAYER, EVER: 3 Hints, 2 Undos, 3 Shuffles (8)** (the creator,
     2026-11-11). A player welcomed by an older checker (`vip_welcome_end` above 0) is never
     welcomed again.
   - Given by the checker (`{"v":1,"what":"vip_gift"}`, `gift.rs`) from the config's recipes (below).
     The game (`src/net/vip.ts`) asks only when its preview says the day's bonus would apply, once a
     date a session, hands each gift to the gift cards (UI's) and reads the stock again.

**Unchanged on purpose** (the creator, 2026-11-10): mercy help is the same for everyone; every price
is the same for everyone; and **no back pay**: the extra comes only with rewards received while VIP,
so a board won earlier as a non-VIP never pays it later. Every level stays winnable with no helper
(AGENTS.md), so VIP never decides whether a level can be won.

## How it works: the rewards catalog (checker 0.1.63, config 69 on)

The config's `rewards` catalog (`gem-backend-game-config.yaml`, generated by
`tools/server/make-config.mts` from `tools/server/helper-rewards.json`; held to it by
`tools/server/helpers-check.mts`) holds 18 server-only recipes, each with one bonus `vip`
(`requires: [{ kind: holds_pass, pass: vip }]`):

| recipe | base (everyone) | VIP bonus | run by the checker |
|---|---|---|---|
| `helpers-kit` | 3/3/3, and the kit's mark (`helpers_kit` to 1) | 3/3/3 | at board 1's end, or the next win of a player past it; key `kit:helpers` |
| `helpers-hard` | 1 Hint, 1 Undo | the same | a hard or super campaign board's first win; key `first:campaign:<board>:helpers` |
| `helpers-stamp` | 1/1/1 | the same | a trip's last board's first win (instead of hard); same key form |
| `helpers-daily-1`..`7` | the day's 1 helper, Monday first | the same | the daily's first win of the player's day; key `daily:<date>:helpers` |
| `vip-gift-1`..`7` | none | the day's 2 helpers | the `vip_gift` call; key `vip:<date>` |
| `vip-welcome` | none | 3/2/3 and the `vip-welcome-gift` item (account-bound) | after a day's gift that applied in the same call, unless welcomed; key `vip-welcome:<date>` |

- **The win's one order pays the Coins** (one call pays once: the board's progression, the
  achievements' counters). **Then each reward due runs as its recipe** (`POST
  /v1/inventory/players/{player}/recipes/execute` `{catalog_id, recipe_id, game_id, nonce}`), for the
  player who called. A key that ran answers its first run (the same order, nothing granted again), so
  a resend gives once. The verdict says what landed (`helpers`, a VIP's bonus included) and each
  bonus's judgement (`bonuses: [{ gift, outcome, reason? }]`, never naming a pass).
- **A recipe that could not run now** (no answer, a refusal that may pass) is kept in the progress
  record (`helpersOwed`, by its key) and run by the next verified win; the verdict says
  `helpersOwed`. The VIP extras older checkers held there (`vipOwed`) are dropped: nothing pays them.
- **The welcome is once ever** by its item: the bonus grants it with the helpers, together; the
  checker reads it (and the old mark) before running the welcome. A welcome whose bonus was skipped
  (VIP ended between the two runs) gave nothing and is tried on a later day.
- **Retired, kept declared so their ids are never reused**: `vip_coins` (no `platform_grants` now:
  our own +50% Coins, checkers 0.1.55 to 0.1.59), `vip_extra_held`, and the old marks
  `vip_gift_day` (read by nothing) and `vip_welcome_end` (still read). `src/net/vip-extra.json` and
  `functions/checker/data/coins.json` (the Coins the extra was reckoned from) are gone, with the
  verdict's `base`, `vipExtra`, `vipHelpers`, `vipLate`, `vipRead` and `vipHeld`.
- **The platform's day cap**: 4,000 Coins a day per game (`gemctl platform config`), scaled for a VIP
  by the platform; a grant past it is trimmed, and the receipts say what landed.

**Confirmed live on dev** (2026-11-12, checker 0.1.62's dev-only probe and config 68, as the
Picture Passport QA test account): a function a player called runs a server-only recipe for them
(200 `completed`, the base landed, the bonus `skipped`, `requirement_unmet`, `holds_pass`); a client
running it is refused (403, "this recipe is not client-executable; the game's server must run it");
a bonus-only recipe for a player not VIP changes nothing (the inventory's etag unmoved); a key run
again answers its first order and grants nothing. **Still to see**: an APPLIED bonus (its receipt, and
a VIP bonus at the cap), once an Admin gives the QA account VIP.

## Before the reward: the upsell (the game standard; SDK 24)

The platform holds nothing back, so VIP is offered **before** a reward is paid, never after (the
creator, 2026-11-11: on every win, Get VIP and Continue at equal weight, and Continue pays).
`src/net/claims.ts` `holdWin(claim)` holds the claim while the win card shows the reward and what
VIP would add, from `gem.gameConfig.preview` over the config targets the claim pays from (the board's
progression, an event item's finds, the day's or the archive's) and the helper recipes it will run
(`src/net/rewards.ts` `helperRecipes`), never an amount or a multiplier of ours; the card sends it on Continue, once Get VIP's sheet settles, or when it leaves. A claim held
when the page closes is sent then, and nothing played is dropped. After the claim, the answer's
receipt gives what landed and the pass's part of it (`gem.earnings.fromReceipt`).

## What the game shows (UI's)

No locked doors: the events, their archive and the daily archive open for everyone. VIP shows as the
better reward, a "VIP +13"-style tag beside a reward before and after it is won (from the previews,
the receipt and the answer's `bonuses`), and home's VIP badge opens the VIP screen (`src/ui/vip-view.ts`): what VIP
gives here, "Other Gem Arcade games give VIP rewards too!" (never naming a game or a reward), and Get
VIP, which opens the Arcade's own offer sheet (`gem.store.showOffer`); no price, no "free", no
hurry. A member is shown their VIP where it gives them something, and a welcome card the first time
the checker pays their welcome (once ever). When VIP ends, the player keeps everything:
stamps, tables, helpers and Coins.

**Every Cosmetic is wearable: gone** (off since 2026-11-02, the creator: "disable that but keep it in
case we go back to it"; the switch and its code went on 2026-11-12, as no game code may read VIP). A
VIP buys tables and soundtracks like anyone. If it ever comes back, it has to be config (a
`requires: holds_pass` on the items), never a switch in code.

**The daily's friends leaderboard** (the creator, 2026-10-30): fewest moves, ties to the earlier
finish; every verified first win of the day posts, helpers or not.

Not now (the creator, 2026-10-30): a VIP-only table or soundtrack, a VIP passport.
