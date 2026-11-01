# VIP: what Gem Arcade VIP members get in Picture Passport

The creator's plan (2026-10-30). VIP is the Gem Arcade's real-money pass, sold by the Arcade Store.
The game never prices it or describes the Arcade's own perks; the SDK's `docs/arcade-and-store.md`
(19.0.0, sections 10 and 11) has the rules. VIP went on sale on 2026-11-01 (gem-web#4375): the pass
`vip`, sold as `vip_pass_30d`, 30 days.

## Who is VIP

- **The server decides, never the client.** The win checker (`functions/checker`, `vip.rs` and
  `platform_vip` in `lib.rs`) asks the platform which passes the player who called holds
  (`GET /v1/games/{game}/players/me/passes`, gem-api#4337): VIP is a `vip` entry with `held: true`.
  Listed and not held, or not listed at all, is not VIP. It asks only on a call that needs it (the
  VIP ask, the events read, an event level, a past daily), and logs, once per read and with no
  player id, whether `vip` was in the list at all: the platform lists only passes it has marked
  visible to games, and an unmarked `vip` would read as nobody holding it.
- **A failed read is unknown, never "not VIP" and never VIP.** An event level's or a past daily's
  claim is held and sent again (`retry`, reason `platform` or `vip_unknown`), never refused
  `vip_only`, so a holder is never locked out. The VIP ask and the events read answer `retry` too,
  and an answer that could not ask carries no `vip`: the game keeps what it had (`src/net/vip.ts`).
- **The browser only says when to ask again.** `src/net/vip.ts` listens to the SDK's own pass reads
  (`gem.me.passes.on("changed")`: after a store purchase, on resume, after a sign-in, when a pass
  ends) and asks the checker again when the reading differs from the checker's last word;
  `recheckVip()` does the same after Get VIP's sheet or a sign-in (`src/ui/vip-view.ts`). The doors
  open on the checker's answer alone.
- **On dev, a dev-menu "Pretend I'm VIP" toggle** lets the creator and QA see and test every perk.
  The server honours it on dev only, and a release build carries none of it (`tools/no-dev-menu.mjs`).

## The perks

1. **Helpers are free and unlimited.**
   - A VIP uses Hint, Undo and Shuffle without spending stock. Their stock stays as it was, for when
     VIP ends.
   - Each button gets a short cooldown after use, shown as a countdown on the button, so it can't be
     spammed: Hint and Shuffle about 10 s, Undo about 1 s (undoing several moves in a row is
     ordinary play). The values are tunable.
   - Every level stays winnable with no helper (AGENTS.md), so VIP never decides whether a level can
     be won.
   - Known limit, left for now (the lead, 2026-11-01): the win checker takes at most 100 shuffles in
     one level's line (`SHUFFLES` in `functions/checker/src/claim.rs`), so a VIP who shuffles for about
     17 minutes on one level would have that win refused. Raise it the next time the checker is
     rebuilt for something else.
2. **The daily archive.**
   - VIPs can play past days' dailies from a calendar opened from home's Daily tile.
   - It starts with about the past month, then follows the game standard's window: the player's
     current month and the two before it, counted in the player's own months.
   - Each past day pays its Coins once, the same as it would have on the day. The server pays
     nothing outside the window (with the standard's day of slack) and nothing to a non-VIP.
3. **Events are VIP content packs of their own** (the creator, 2026-10-30, replacing events in the dailies):
   - Each event is **30 levels of its own**, never the dailies, made from library pictures: pictures on no other level first, and none twice within an event.
   - Each has **10 items, one hidden in each of 10 of its levels**, spread across the 30, so an item never repeats and there is no swap.
   - Each item found pays **50 Coins** (500 an event; the Arcade caps one payout at 100, so no lump at the end), and
     finding all 10 wins the event's table and its **stamp in the Passport** (its own "Event stamps" page), once
     (the creator, 2026-10-30: helpers mean nothing to a VIP, so none). Its levels pay the usual
     level Coins.
   - Which levels hide items is never shown: a won item level wears a suitcase. Items sit on seeded random levels
     (`itemLevels` in `events-plan.json`), at least one in levels 1–5, never on 25 or 30.
   - A VIP can play any event at any time; a new event arrives on the schedule (`events-plan.json`, every two weeks or as set), and old ones stay playable.
   - The dailies carry no event items.
4. **The event archive** is simply every past event, still playable and winnable by VIPs.
   **The schedule** (the creator, 2026-10-30): a new event every two weeks, on the 1st and the 15th. Haunted Holiday
   (15 Oct, the archive's first), Ski Trip (1 Nov), Grand Train Journey (15 Nov), Winter Market (1 Dec), Northern
   Lights (15 Dec), Carnival (1 Jan 2027). Six in all; the themes come from `docs/daily-suitcase.md`'s approved list.
5. **Every Cosmetic is wearable.**
   - A VIP can choose any table and soundtrack sold in Cosmetics.
   - What a player buys stays in their Arcade inventory, before VIP or during it.
   - When VIP ends, they keep everything they paid for. A table or track they were only borrowing
     switches back to one they own (Sunny Day if none).
   - Event tables stay event prizes: VIP wears the sold Cosmetics, not other events' prizes.
   - Buying for keeps stays open to VIPs.

**Players without VIP see locked doors** (the creator, 2026-10-30, after Untangled): the archive and
the event wear a padlock and a gold VIP tag, and a tap opens a full screen of what's inside with Back.
Its Get VIP opens the Arcade's own offer sheet (`gem.store.showOffer`, UI's `src/ui/vip-view.ts`),
which says what VIP is and what it costs; the game shows no price and no perks of the Arcade's, and a
buyer's doors open when the checker says so, with no reload. Untangled (`../yarn`: `src/vip.ts`,
`showVip`) is the model. The dev toggle is kept in the save, so it holds across reloads.

**When VIP ends** the doors lock again, and the player keeps what they earned or bought: every
event's stamp they won (the Passport's Event stamps page reads `suitcase.stamps()`, which the
checker answers to anyone, VIP or not), every event table they won and everything bought (all are
Arcade inventory items, never taken back), and the Coins paid. A table or soundtrack they were only
borrowing switches back to one they own.

**The daily's friends leaderboard** (the creator, 2026-10-30): fewest moves, ties to the earlier finish; every
verified first win of the day posts, helpers or not (the creator's final word).

Not now (the creator, 2026-10-30): a VIP-only table or soundtrack, a VIP passport.

Still to ask the platform: whether a game may say "free for VIP" on its own screens.
