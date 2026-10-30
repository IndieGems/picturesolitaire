# VIP: what Gem Arcade VIP members get in Picture Passport

The creator's plan (2026-10-30). VIP is the Gem Arcade's real-money pass, sold by the Arcade Store.
The game never sells it, prices it or describes the Arcade's own perks; the SDK's
`docs/arcade-and-store.md` (17.0.0) has the rules.

**The platform cannot yet tell a game who holds VIP** (17.0.0: "the Arcade keeps that to itself").
So everything here is built now, in the main game, behind one switch that is **off** for every player:
- **Who is VIP is decided on the server**, never by the client. Until the platform exposes it, the
  answer is "not VIP" on release and test.
- **On dev, a dev-menu "Pretend I'm VIP" toggle** lets the creator and QA see and test every perk.
  The server honours it on dev only, and a release build carries none of it (`tools/no-dev-menu.mjs`).
- **When the platform adds a VIP read, switching on is a server change**, not a redesign.

## The perks

1. **Helpers are free and unlimited.**
   - A VIP uses Hint, Undo and Shuffle without spending stock. Their stock stays as it was, for when
     VIP ends.
   - Each button gets a short cooldown after use, shown as a countdown on the button, so it can't be
     spammed: Hint and Shuffle about 10 s, Undo about 1 s (undoing several moves in a row is
     ordinary play). The values are tunable.
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
   - Finding all 10 wins the event's table. Its levels pay the usual level Coins.
   - A VIP can play any event at any time; a new event arrives on the schedule (`events-plan.json`, every two weeks or as set), and old ones stay playable.
   - The dailies carry no event items.
4. **The event archive** is simply every past event, still playable and winnable by VIPs. The first three are Haunted Holiday (10 famous haunted places), Ski Trip and Winter Market.
5. **Every Cosmetic is wearable.**
   - A VIP can choose any table and soundtrack sold in Cosmetics.
   - What a player buys stays in their Arcade inventory, before VIP or during it.
   - When VIP ends, they keep everything they paid for. A table or track they were only borrowing
     switches back to one they own (Sunny Day if none).
   - Event tables stay event prizes: VIP wears the sold Cosmetics, not other events' prizes.
   - Buying for keeps stays open to VIPs.

**Players without VIP see locked doors** (the creator, 2026-10-30, after Untangled): the archive and
the event wear a padlock and a gold VIP tag, and a tap opens a full screen of what's inside with Back
and "VIP is coming soon". There is no buy button until the platform can both sell VIP to a game and
say who holds it (gem-development#2119): a buyer must never stay locked. Untangled (`../yarn`:
`src/vip.ts`, `showVip`) is the model. The dev toggle is kept in the save, so it holds across reloads.

**The daily's friends leaderboard** (the creator, 2026-10-30): fewest moves, ties to the earlier finish; every
verified first win of the day posts, helpers or not (the creator's final word).

Not now (the creator, 2026-10-30): a VIP-only table or soundtrack, a VIP passport.

Open with the platform: reading who holds VIP, client and server (gem-development#2119; SDK 17.0.0
added `gem.store.showOffer` for the card). Still to ask: whether a game may say "free for VIP" on
its own screens.
