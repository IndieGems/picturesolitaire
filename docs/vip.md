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
3. **The event is two weeks, for VIPs only** (the creator's boss, 2026-10-30: no monthly events for
   now). The Daily Suitcase (`docs/daily-suitcase.md`) is reshaped:
   - 14 days, about 7 items, each turning up twice in that event's dailies.
   - A swap takes 2 spares. The themed table is the prize.
   - How often events run (back to back, or with gaps) is still open: a schedule file, not code.
4. **The event archive.**
   - VIPs can play past events: their 14 boards, their items and their prize table, still winnable.
   - Starts with a **Halloween event** dated in October 2026, already over, so the archive has one
     at launch.
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

**Events after Halloween** (until the cadence is set): Ski Trip from 1 Nov 2026 and Winter Market
from 1 Dec, two weeks each, with 7 of each month's 10 items. Halloween runs 15–28 Oct 2026 and its
7 items are famous haunted places (the creator), painted postcards.

Not now (the creator, 2026-10-30): a VIP-only table or soundtrack, a VIP passport.

Open with the platform: reading who holds VIP, client and server (gem-development#2119; SDK 17.0.0
added `gem.store.showOffer` for the card). Still to ask: whether a game may say "free for VIP" on
its own screens.
