# VIP: what Gem Arcade VIP members get in Picture Passport

VIP is the Gem Arcade's real-money pass, sold by the Arcade Store (the pass `vip`, sold as
`vip_pass_30d`, 30 days; on sale since 2026-11-01, gem-web#4375). The game never prices it or
describes the Arcade's own perks; the SDK's `docs/arcade-and-store.md` (sections 10 and 11) has the
rules.

**The rule since 2026-11-10** (the creator): **VIP gates no content.** Events, past events and the
daily archive are open to everyone; a VIP gets better rewards for playing them instead: **+50% on
every Coin payout and double on every helper reward.** Until then the events and the archive were
VIP's alone, behind locked doors (the plan of 2026-10-30, in `git log` of this file).

## Who is VIP

- **The server decides, never the client.** The win checker (`functions/checker`, `vip.rs` and
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
- **On dev, a dev-menu "Pretend I'm VIP" toggle** lets the creator and QA see and test every perk,
  the extras included. The server honours it on dev only, and a release build carries none of it
  (`tools/no-dev-menu.mjs`).

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

Items 1 and 2 pay from checker 0.1.55 and config 65 (dev first). 0.1.54 paid the extra's Coins in an
order of its own, which the platform suppressed (one call pays once; QA, 2026-11-10): its helpers
landed, its Coins did not.

1. **The VIP extra on Coins: +50% of every Coin payout**, paid as its own grant inside the reward's own
   order (the platform caps one grant at 100, so a 100 pays 100 and 50). The rule is
   **ceil(base / 2)**: 25 pays +13, 50 pays +25, 100 pays +50. It covers every Coin payout: each
   lane's first win (the campaign, the welcome boards 1–5 included, Souvenirs, the challenge route,
   event levels), First Steps' prize, the daily's 50, a past day's 15, and each event item's 15
   (the rates since config 67: `docs/coins.md`).
2. **Double helpers on every helper reward**: the guided start's kit (3 of each becomes 6), a hard
   board's first win, a stamp, and the daily's first win. Each grant is clamped at the cap of 20.
3. **VIP's own gifts, unchanged** (the creator, 2026-11-01, after Jade Match):
   - **a daily VIP gift of 2 helpers** on the player's own date (the platform's), once a date, by the
     day of their week, Monday first: a week brings 5 Hints, 4 Undos and 5 Shuffles (Monday Hint +
     Undo, Tuesday Shuffle + Hint, Wednesday Undo + Shuffle, Thursday Hint + Undo, Friday Shuffle +
     Hint, Saturday Undo + Shuffle, Sunday Hint + Shuffle); a day not opened is not saved up;
   - **a welcome gift once a membership: 3 Hints, 2 Undos, 3 Shuffles (8).** A membership is told by
     its end date (`vip_welcome_end`): one bought after the last ended is welcomed again, one extended
     before it ends is not, a pass with no end (support's) once for good. With the dev Pretend on, the
     server welcomes the pretend once every 30 days.
   - Paid by the checker (`{"v":1,"what":"vip_gift"}`, `gift.rs`; when a gift is due: `vip.rs`
     `due`) from two marks it keeps (`vip_gift_day`, `vip_welcome_end`), each gift in its own order
     with its own key (`vip:<date>`, `vip-welcome:<end day>`), so asking twice pays once. The marks
     decide, not the key: the platform answers a reused key as a success that changed nothing (QA,
     2026-11-02). The game (`src/net/vip.ts`) asks once the server says VIP and whenever the Arcade's
     pass reading changes while it does, hands each gift to the gift cards (UI's) and reads the stock
     again. Sizes: `src/net/helper-ids.json` `vip`, the copy the checker compiles in.

**Unchanged on purpose** (the creator, 2026-11-10): mercy help is the same for everyone; every price
is the same for everyone; and **no back pay**: the extra comes only with rewards received while VIP,
so a board won earlier as a non-VIP never pays it later. Every level stays winnable with no helper
(AGENTS.md), so VIP never decides whether a level can be won.

## The VIP extra, in the checker

- **One place computes it**: `functions/checker/src/pay.rs` (`vip_extra_coins`, `vip_extra_helpers`), from
  `src/net/vip-extra.json`, the one copy of the rule, which `src/net/vip.ts` reads too for the
  previews UI shows before a reward is won (`vipExtraCoins(base)`, `vipHelpers(gift)`).
- **The seam for the Arcade's figure**: the creator expects a coming SDK to have the Arcade tell the
  game the exact VIP extra. That figure replaces the rule at this one place, and **`gamePays`** in
  `vip-extra.json` turns the game's own payment off, so a VIP is never paid twice.
- **One call pays once** (the platform: "a second paying order in the same call is suppressed",
  `function_invocation_already_granted`, SDK `inventory-and-catalogs.md`). So the extra rides INSIDE
  the reward's own order, under its key: it pays with the reward, once ever, and a resent claim or a
  replay pays nothing more. The achievements' counters ride in the same order (0.1.55 on), for the
  same reason. It goes on the config's `vip_coins` progression (on_add, 1 Coin a unit, written only
  by the checker).
- **Reckoned before the order, from what the config pays**: `functions/checker/data/coins.json`,
  written by make-config with the config, compiled into the checker. `levels-check` (in
  `npm run build`) stops the game build when that file changed after the uploaded checker was built,
  as it does for the level data. A ceiling (the day's cap) trims the extra's grant like any other, and
  the receipt says what landed.
- **At most one pass read per claim**, just before the order, and only when the claim pays. A passing
  hiccup reading it (no answer, 429, 5xx) holds the claim, and base and extra pay together later. Any
  other failure pays the base and holds the extra in the record (`vipOwed` in the progress slot); it
  is paid inside a later paying claim's order, with the held mark (`vip_extra_held`) raised in it, so
  the mark, not the record, says what is paid; a claim that reads not VIP drops it. Never lost, never
  paid to a non-VIP.
- **The answer says what landed**: `coins` (all), `base`, `vipExtra`, `helpers` (all), `vipHelpers`,
  `vipLate` (held extras that landed now), `vipRead` (`yes`, `no` or `unknown`) and `vipHeld` (an
  extra waits). `src/net/claims.ts` types them. The function's log names every grant, base or VIP extra,
  with its outcome (fired, clamped or suppressed, and why); a short extra is a warning.
- **The platform's day cap**: 4,000 Coins a day per game (`gemctl platform config`). A VIP reaches it
  sooner; a grant past it is trimmed, and the receipts (so the answer) say what landed.

## What the game shows (UI's)

No locked doors: the events, their archive and the daily archive open for everyone. VIP shows as the
better reward, a "VIP +13"-style tag beside a reward before and after it is won (from the previews
and the answer's fields), and home's VIP badge opens the VIP screen (`src/ui/vip-view.ts`): what VIP
gives here, "Other Gem Arcade games give VIP rewards too!" (never naming a game or a reward), and Get
VIP, which opens the Arcade's own offer sheet (`gem.store.showOffer`); no price, no "free", no
hurry. A member is shown their VIP where it gives them something, and a welcome card the first time
the checker pays their welcome (once a membership). When VIP ends, the player keeps everything:
stamps, tables, helpers and Coins.

**Every Cosmetic is wearable: OFF since 2026-11-02** (the creator: "disable that but keep it in case
we go back to it"). A VIP buys tables and soundtracks like anyone; the code is behind UI's one switch
(`VIP_WEARS_ALL` in `src/ui/vip-view.ts`, fe7b1ed5).

**The daily's friends leaderboard** (the creator, 2026-10-30): fewest moves, ties to the earlier
finish; every verified first win of the day posts, helpers or not.

Not now (the creator, 2026-10-30): a VIP-only table or soundtrack, a VIP passport.
