# The Daily Suitcase: the monthly event

The creator's design (2026-10-27), worked out with the lead. The daily puzzle becomes the way
players fill a themed suitcase, one month at a time. That month's suitcase is the game's monthly
event.

## For the player

- **One event a month.** Each month has a themed suitcase, for example "November: Ski Trip", with
  10 travel items: coat, goggles, thermos, mittens, map and so on. A banner on home names the event
  and how many days are left. The event shows in the Arcade's challenges.
- **The day's item.** Each daily board hides that day's item as one of its pictures, the way a
  campaign board hides its destination. Finish that picture and the item flies into the suitcase.
  Only the player's first daily win of their day packs it. Replays and late finishes pack nothing.
- **A hidden schedule.** The item of the day is the same for every player, set in advance for the
  whole month and never shown ahead. Each item comes up about 3 times a month (never fewer than
  2), spread across the month so that no item has all its days in one week.
- **Duplicates count.** A second or third copy shows on the item as "×2", "×3".
- **The swap.** Three spare copies, of any items, swap for one item the player is missing. A
  spare is any copy beyond the first. So a player who misses some days can still finish.
- **The prize.** All 10 items unlock that month's themed table, which the player can then choose
  in Settings (for example a ski-lodge table), plus a small pack of helpers. It's paid once.
- **The shelf.** When the month ends, its suitcase closes onto a shelf, full or not, and the next
  event begins. Past suitcases stay there to look back on, and can't be finished afterwards.
- **Unchanged.** The daily's Coins and its free helper for the day's first win stay as they are.
- **Where it lives.** The suitcase opens from the Daily tile on home.

## Who builds what

- **Art:**
  - 12 monthly themes for the creator to approve;
  - each month's 10 item pictures: one clear object on a calm background, squares;
  - each month's themed table, in the look of the game's other tables.
  - This costs about $0.50 a month.
- **Levels:**
  - each month's schedule of items, made by a maker script and proved by check.mts:
    - each item appears 2 to 4 times, about 3 on average;
    - no item has all its days in one week;
  - the daily boards re-dealt under today's rules: readable, current pictures, no landmarks;
  - each day's item placed as a 2×2 picture on that day's board;
  - the pool extended well past 31 January 2027.
- **Server:**
  - packs the day's item in the daily claim's one order, on the player's own day, first win only;
  - the swap: 3 spares for one missing item, checked on the server;
  - the finished-suitcase prize, paid once and kept by the platform, never by a flag of our own;
  - the event as a monthly progression with `platform_display: challenge`. The SDK's
    `docs/daily-challenges.md` covers it.
- **UI:**
  - the suitcase screen: 10 slots, counts, and the swap;
  - the item flying in on the daily win card;
  - the event banner with its days left;
  - the shelf;
  - the tables in Settings.
- **Gameplay:** the day's item picture on the daily board, drawn like any picture. The board
  reports when it's finished, so UI can fly it.

Days are the player's own (the platform's date, never the device's). Nothing about the suitcase
lives in browser storage.
