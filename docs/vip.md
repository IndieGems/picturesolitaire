# VIP: what Gem Arcade VIP members get in Picture Passport

VIP is the Gem Arcade's real-money pass, sold by the Arcade Store (the pass `vip`, sold as
`vip_pass_30d`, 30 days; on sale since 2026-11-01, gem-web#4375). The game never prices it or
describes the Arcade's own perks; the SDK's `docs/arcade-and-store.md` (sections 10 and 11) has the
rules.

**The rule since 2026-11-10** (the creator): **VIP gates no content.** Events, past events and the
daily archive are open to everyone; a VIP gets better rewards for playing them instead: **+50% on
every Coins grant (the Arcade's own since 2026-11-11) and double on every helper reward.** Until then the events and the archive were
VIP's alone, behind locked doors (the plan of 2026-10-30, in `git log` of this file).

## Who is VIP

- **The server decides, never the client** (a stopgap until config `bonuses` land: below). The win checker (`functions/checker`, `vip.rs` and
  `platform_vip` in `lib.rs`) asks the platform which passes the player who called holds
  (`GET /v1/games/{game}/players/me/passes`, gem-api#4337): VIP is a `vip` entry with `held: true`.
  Listed and not held, or not listed at all, is not VIP. It asks at most once a call, and only on a
  call that needs it (the VIP ask, the VIP gift, the events read, and a claim that pays), and logs,
  once per read and with no player id, whether `vip` was in the list at all: the platform lists only
  passes it has marked visible to games, and an unmarked `vip` would read as nobody holding it.
- **A failed read is unknown, never "not VIP" and never VIP.** The VIP ask and the gift answer
  `retry`; any other answer that could not ask carries no `vip`, and the game keeps what it had
  (`src/net/vip.ts`). What a claim's VIP extra does then is under "The VIP extra" below.
- **The browser only says when to ask again.** `src/net/vip.ts` listens to the SDK's own pass reads
  (`gem.me.passes.on("changed")`: after a store purchase, on resume, after a sign-in, when a pass
  ends) and asks the checker again when the reading differs from the checker's last word;
  `recheckVip()` does the same after Get VIP's sheet or a sign-in (`src/ui/vip-view.ts`).
- **VIP on dev is an account that holds the pass.** The dev menu's "Pretend I'm VIP" went on
  2026-11-11: it cannot fake the Arcade's +50%, so it showed a VIP no Arcade pays. The game sends no
  pretend now; the checker still honours `pretend_vip` on dev (`vip.rs`) until the pass read goes.

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
   checker 0.1.60 on adds no Coins of its own (`src/net/vip-extra.json` `gamePays` false). Checkers
   0.1.55 to 0.1.59 paid our own +50% inside the reward's order on the `vip_coins` progression, which
   the platform then boosted too (about 2.25× for a real VIP, dev only: release never ran them). The
   progression stays declared, written by nothing, so its id is never reused.
2. **Double helpers on every helper reward**, still the checker's: the guided start's kit (3 of each
   becomes 6), a hard board's first win, a stamp, and the daily's first win. Each grant is clamped at
   the cap of 20.
3. **VIP's own gifts** (the creator, 2026-11-01, after Jade Match; the welcome's rule, 2026-11-11):
   - **a daily VIP gift of 2 helpers** on the player's own date (the platform's), once a date, by the
     day of their week, Monday first: a week brings 5 Hints, 4 Undos and 5 Shuffles (Monday Hint +
     Undo, Tuesday Shuffle + Hint, Wednesday Undo + Shuffle, Thursday Hint + Undo, Friday Shuffle +
     Hint, Saturday Undo + Shuffle, Sunday Hint + Shuffle); a day not opened is not saved up;
   - **a welcome gift ONCE PER PLAYER, EVER: 3 Hints, 2 Undos, 3 Shuffles (8)** (the creator,
     2026-11-11: a membership can no longer be told by its pass's end date, which SDK 24 stops
     sending). From checker 0.1.60 it is paid while `vip_welcome_end` has never been raised, and
     raises it for good; a player welcomed under the old once-a-membership rule (0.1.47 to 0.1.59,
     whose mark held that membership's end day) is never welcomed again.
   - Paid by the checker (`{"v":1,"what":"vip_gift"}`, `gift.rs`; when a gift is due: `vip.rs`
     `due`) from two marks it keeps (`vip_gift_day`, `vip_welcome_end`), each gift in its own order
     with its own key (`vip:<date>`, `vip-welcome:99999999`), so asking twice pays once. The marks
     decide, not the key: the platform answers a reused key as a success that changed nothing (QA,
     2026-11-02). The game (`src/net/vip.ts`) asks once the server says VIP and whenever the Arcade's
     pass reading changes while it does, hands each gift to the gift cards (UI's) and reads the stock
     again. Sizes: `src/net/helper-ids.json` `vip`, the copy the checker compiles in.

**Unchanged on purpose** (the creator, 2026-11-10): mercy help is the same for everyone; every price
is the same for everyone; and **no back pay**: the extra comes only with rewards received while VIP,
so a board won earlier as a non-VIP never pays it later. Every level stays winnable with no helper
(AGENTS.md), so VIP never decides whether a level can be won.

## The helpers' extra and the gifts, in the checker: A STOPGAP

**The pass read is a stopgap until gem-development#2246 lands** (the creator, 2026-11-11: keep VIP's
doubled helpers and the gifts working as now until the config takes `bonuses`, then switch before the
next release). The game standard's rule "VIP: gate on the pass in config, never multiply in code"
forbids it, and **the release check ECON-08 will flag it**: `vip.rs`, `platform_vip` in `lib.rs`,
`pay.rs`'s `vip_extra_helpers`, the gifts in `gift.rs`, and `vip.rs`'s dev `pretend_vip` all name VIP in code.
The plan that replaces them is the next section.

- **One place computes it**: `functions/checker/src/pay.rs` (`vip_extra_helpers`), from
  `src/net/vip-extra.json` (`helpers`: 2, double).
- **One call pays once** (the platform: "a second paying order in the same call is suppressed",
  `function_invocation_already_granted`). So the extra helpers ride INSIDE the reward's own order,
  under its key: they pay with the reward, once ever. The achievements' counters ride in the same
  order (0.1.55 on), for the same reason.
- **At most one pass read per claim**, just before the order, and only when the claim has helpers to
  pay. A passing hiccup reading it (no answer, 429, 5xx) holds the claim, and base and extra pay
  together later. Any other failure pays the base and holds the extra in the record (`vipOwed` in the
  progress slot), paid inside a later paying claim's order with the held mark (`vip_extra_held`)
  raised in it; a claim that reads not VIP drops it. Held extras from before 0.1.60 pay their helpers
  alone: their Coins were ours, and the platform's +50% has replaced them.
- **The answer says what landed**: `helpers` (all), `vipHelpers`, `vipLate` (held extras that
  landed now), `vipRead` (`yes`, `no` or `unknown`) and `vipHeld`; `vipExtra` (Coins) is 0 from
  0.1.60. The function's log names every Coins grant with its outcome.
- **The platform's day cap**: 4,000 Coins a day per game (`gemctl platform config`), scaled for a VIP
  by the platform; a grant past it is trimmed, and the receipts say what landed.

## Planned, waiting on config `bonuses` (gem-development#2246)

The platform is building `bonuses` (gem-development#2246, WS3; gem-api#5386 for bonuses in
execute_recipe, #5453 for authoring them; neither merged on 2026-11-11). gemctl's schema (3.33.325)
has none yet: a recipe and a loot table take no `bonuses`, and `holds_pass` exists only on a
progression track's `requires`. Nothing is worked around meanwhile. When they land:

- **A helper reward is a recipe the checker runs.** A function a player called may run a recipe for
  that player (`serverless-functions.md`, "What a function a player called may change"), on the
  SDK's own route, `POST /v1/inventory/players/{player}/recipes/execute`
  `{catalog_id, recipe_id, game_id, nonce}`; the platform judges each bonus's `requires` then. An
  order cannot: its operations are currency, item and progression writes, with no roll, so no bonus
  ever applies inside the paying order. So the paying order carries the Coins, and right after it the
  checker runs one recipe per helper reward: the kit (3/3/3), a hard board's first win (1/1/0), a
  stamp (1/1/1) and the daily's first win (three recipes, one per helper, by weekday). Base grants are
  today's sizes, clamped at the cap; one bonus each, `requires: [{ kind: holds_pass, pass: vip }]`,
  the same grants again. The nonce is the reward's key + `:helpers`, so a resend runs once. Helpers
  are no platform currency, so "one call pays once" does not touch the recipe. A recipe call that
  fails after the Coins landed is held in the record and run by the next call, same nonce (replacing
  the held VIP extras).
- **No client can farm them.** A recipe is server-only unless it sets `client_writable: true` (the
  schema's default is false: "only your game server may") or carries `platform_prices`; ours set
  neither. Still to confirm on #2246 (the lead asked there, 2026-11-11): that a function's recipe run
  counts as "your game server".
- **The daily gift** is seven recipes, one per weekday's size, with no base grants and a VIP bonus of
  the day's helpers; the checker runs today's (nonce `vip:<date>`) for whoever asks, and the receipt's
  `bonus` entry (`applied`) is its only word that the player is VIP: no pass read.
- **The welcome, once ever**: only after a daily gift whose bonus applied in the same call, while
  `vip_welcome_end` is still 0 and the player holds no welcome-marker item, the checker runs the
  welcome recipe: no base grants, a VIP bonus of 3/2/3 plus an `account_bound` marker item, nonce
  `vip-welcome:<date>`. The marker lands with the helpers and is the once-ever proof (a bonus cannot
  write a progression). A run whose bonus was skipped (the pass lapsed between the two runs) spends
  nothing and tries again another day; no `max_uses`, which would count a skipped run.
- **Then the pass read goes** (`vip.rs`'s pass parsing, `platform_vip`, one platform call fewer before
  the order), and the checker's dev `pretend_vip` with it (the game sends none since 2026-11-11). `vip-extra.json` and the `vip*` answer fields retire with it.

## Before the reward: the upsell (the game standard; SDK 24)

The platform holds nothing back, so VIP is offered **before** a reward is paid, never after (the
creator, 2026-11-11: on every win, Get VIP and Continue at equal weight, and Continue pays).
`src/net/claims.ts` `holdWin(claim)` holds the claim while the win card shows the reward and what
VIP would add, from `gem.gameConfig.preview` over the config targets the claim pays from (the board's
progression, an event item's finds, the day's or the archive's), never an amount or a multiplier of
ours; the card sends it on Continue, once Get VIP's sheet settles, or when it leaves. A claim held
when the page closes is sent then, and nothing played is dropped. After the claim, the answer's
receipt gives what landed and the pass's part of it (`gem.earnings.fromReceipt`).

## What the game shows (UI's)

No locked doors: the events, their archive and the daily archive open for everyone. VIP shows as the
better reward, a "VIP +13"-style tag beside a reward before and after it is won (from the previews
and the answer's fields), and home's VIP badge opens the VIP screen (`src/ui/vip-view.ts`): what VIP
gives here, "Other Gem Arcade games give VIP rewards too!" (never naming a game or a reward), and Get
VIP, which opens the Arcade's own offer sheet (`gem.store.showOffer`); no price, no "free", no
hurry. A member is shown their VIP where it gives them something, and a welcome card the first time
the checker pays their welcome (once ever). When VIP ends, the player keeps everything:
stamps, tables, helpers and Coins.

**Every Cosmetic is wearable: OFF since 2026-11-02** (the creator: "disable that but keep it in case
we go back to it"). A VIP buys tables and soundtracks like anyone; the code is behind UI's one switch
(`VIP_WEARS_ALL` in `src/ui/vip-view.ts`, fe7b1ed5).

**The daily's friends leaderboard** (the creator, 2026-10-30): fewest moves, ties to the earlier
finish; every verified first win of the day posts, helpers or not.

Not now (the creator, 2026-10-30): a VIP-only table or soundtrack, a VIP passport.
