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
  VIP ask, the VIP gift, the events read, an event level, a past daily), and logs, once per read and with no
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

1. **VIP gives helpers** (the creator, 2026-11-01, after Jade Match, replacing free and unlimited
   helpers). A VIP's Hint, Undo and Shuffle spend stock like anyone's, with no cooldown, and mercy
   help (the announced free helper after repeated stuck tries) applies to VIPs again.
   - **A daily VIP gift: 2 helpers a day**, on the player's own date (the platform's, never the
     device's), once a date. It follows the day of the player's week, Monday first, so a week brings
     5 Hints, 4 Undos and 5 Shuffles: Monday Hint + Undo, Tuesday Shuffle + Hint, Wednesday Undo +
     Shuffle, Thursday Hint + Undo, Friday Shuffle + Hint, Saturday Undo + Shuffle, Sunday Hint +
     Shuffle. A day the player doesn't open the game is not saved up.
   - **A welcome gift, once a membership: 3 Hints, 2 Undos, 3 Shuffles (8).** A membership is told
     by its end date: the server keeps the end date of the membership it last welcomed
     (`vip_welcome_end`), and one ending later is a new one. So a membership bought after the last
     one ended is welcomed again, one extended before it ends is not, and one membership is never
     welcomed twice. A pass with no end (granted by support) is welcomed once, for good.
   - **Helpers only**, never Coins or Gems: a membership bought with money pays none of the Arcade's
     currencies. Each gift is clamped at the cap of 20, as every other gift is, and the game is told
     what actually landed, so a full stock shows as full rather than as a gift.
   - **Who pays and when.** The win checker pays both (`{"v":1,"what":"vip_gift"}`,
     `functions/checker/src/gift.rs`; who is VIP and when a gift is due: `vip.rs` `due`). What is
     owed is read from two marks the server keeps, the day last given its gift (`vip_gift_day`) and
     the end of the membership last welcomed (`vip_welcome_end`), and each gift is paid in its own
     order that raises its mark, with its own key (`vip:<date>`, `vip-welcome:<end day>`), so asking
     twice pays once and lists nothing the second time. The marks decide, not the key: the platform
     answers a reused key as a success that changed nothing (QA, 2026-11-02), so an empty receipt is
     read as paid before. It reads the pass itself: not VIP pays nothing, and a failed read pays nothing and is
     asked again. The game (`src/net/vip.ts`) asks once the server says VIP (at boot, after a
     purchase or a sign-in) and again whenever the Arcade's pass reading changes while it says VIP,
     which also brings a new day's gift on coming back to the game. It hands each gift paid to the
     gift cards (UI's) and reads the stock again. The sizes are `src/net/helper-ids.json` `vip`, the
     copy the checker compiles in. With the dev Pretend on, the server welcomes the pretend once
     every 30 days, as a 30-day membership.
   - Every level stays winnable with no helper (AGENTS.md), so VIP never decides whether a level can
     be won.
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
5. **Every Cosmetic is wearable: OFF since 2026-11-02** (the creator: "disable that but keep it in
   case we go back to it"). A VIP buys tables and soundtracks like anyone, Cosmetics shows no VIP
   banner or marks, and the VIP door lists four perks. The code is kept behind UI's one switch
   (`VIP_WEARS_ALL` in `src/ui/vip-view.ts`, fe7b1ed5); a VIP wearing a borrowed one when it went off falls back to their own.
   As it was, and would be again with the switch on:
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

**What a player without VIP is shown** (the creator, 2026-11-02):
- The event's locked door lists the past events still in the archive under Get VIP ("Also in the event
  archive": suitcase, name, prize table, VIP tag; at most 3, then "and N more"), as information
  (UI, 64fcf0c3).
- The Passport's Event stamps page draws the running and past events' stamps as empty outlines with the
  VIP tag, never "Finish an event", which they cannot (a32955bb).
- **Home's VIP badge** (after Cosmic Commute's): a round gold VIP button beside the wordmark, from the
  first level done, with a shake and a glint every 6 s (none with less motion), still with a tick for a
  member. It opens the VIP screen: for a player who is not VIP, a gold VIP boarding pass ("FIRST CLASS
  ✈ VIP", Passenger: You!, Seat 1A; the creator picked it of four looks, cc6a2e42) whose stamped lines
  are what VIP gives here, best first (the creator: the events, the daily archive, then the two gifts; fbc37a5a, the doors' list too), then "Other Gem Arcade games give VIP rewards too!" in red on its stub, never
  naming a game or a reward (the Arcade's sheet lists its own perks), and "Get VIP: board now!"; no
  price, no "free", no hurry. A member reads "You're VIP" and the days left (display only, from the
  SDK's pass reading), the perks (`vipPerks()`, the doors' list) and no Get VIP (e9e325a3).

**When VIP ends** the doors lock again, and the player keeps what they earned or bought: every
event's stamp they won (the Passport's Event stamps page reads `suitcase.stamps()`, which the
checker answers to anyone, VIP or not), every event table they won and everything bought (all are
Arcade inventory items, never taken back), and the Coins paid. (With perk 5's switch on, a table or
soundtrack they were only borrowing switches back to one they own.)

**The daily's friends leaderboard** (the creator, 2026-10-30): fewest moves, ties to the earlier finish; every
verified first win of the day posts, helpers or not (the creator's final word).

Not now (the creator, 2026-10-30): a VIP-only table or soundtrack, a VIP passport.
