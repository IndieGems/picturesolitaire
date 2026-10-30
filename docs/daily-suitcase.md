# The Daily Suitcase: the monthly event

> **Now a two-week event for VIP members only** (creator, 2026-10-30; `docs/vip.md` overrides this
> page where they differ): 14 days, about 7 items each turning up twice, a swap of 2 spares, the
> table as prize, and an archive of past events starting with a Halloween event in October 2026.
> It stays off for every player until the platform can say who holds VIP. The monthly design
> below is the starting point.

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
- **Where it lives.** The suitcase opens from home's Event tile ("Event", the theme under it), in
  the old Challenges place. Its page leads with "Play the Daily Puzzle!" and a short how-it-works,
  since the daily is the event's only puzzle (creator, 2026-10-28).

## Who builds what

- **Art:**
  - 12 monthly themes for the creator to approve;
  - each month's 10 item pictures: one clear object on a calm background, squares;
  - each month's themed table, in the look of the game's other tables.
  - This costs about $0.50 a month.
- **Levels** (30-level VIP packs since 2026-10-30, docs/vip.md):
  - the plan, `tools/levels/events-plan.json` (which events exist, from which release date, their 10
    items: a plan edit only), made by `make-events.mts` into `src/content/levels/events.json` (the
    details) and `src/content/levels/event-levels.json` (each event's 30 levels), proved by check.mts;
  - the curve, the same for every event (`events.mts` ROWS; docs/difficulty-curve.md "The VIP
    events"): a gentle sawtooth, levels 25 and 30 marked hard; library pictures only, the least used
    first, none twice within an event;
  - the 10 items one a level on levels 2, 5, 8 ... 29, each a 2x2 picture finished neither first nor
    last on the stored line, nothing beside it sharing its family or a word;
  - the dailies carry no item (lifted in place, 2026-10-30) and stay under today's rules from
    1 September 2026.
  - Now: Haunted Holiday from 15 Oct 2026 (ten haunted places), Ski Trip from 1 Nov and Winter Market
    from 1 Dec (each month's ten items).
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

## The twelve themes (approved by the creator, 2026-10-27)

Each month's 10 items are single travel objects, with no brands, logos or writing, and none repeats a
library picture. Item ids are `item-YYYY-MM-NN`, NN being the slot below (01-10), and never change;
`tools/art/items-plan.json` plans them and `pictures.json` lists them under `items`. Each table is
the month's prize, `table-<name>` in `public/art/tables/tables.json`, drawn in the look of the others.

| Month | Theme | Items, slots 01-10 | Table |
| --- | --- | --- | --- |
| 2026-11 | Ski Trip | Ski goggles, Bobble hat, Mittens, Ski boots, Nordic jumper, Striped scarf, Earmuffs, Ice skates, Fondue pot, Hot-water bottle | `table-ski-lodge`: an alpine chalet's pine table by the fire, a frosty window corner, a tartan blanket |
| 2026-12 | Winter Market | Glass bauble, Wooden nutcracker, Roasted chestnuts, Hot cider, Paper star lantern, Carved reindeer, Gift box, Candle arch, Knitted stocking, Pine wreath | `table-winter-dusk`: the game's original snowy dusk desk (creator, 2026-10-28: it replaced `table-winter-market`, whose art is kept for a later winter event, when the default table turned sunny) |
| 2027-01 | Northern Lights | Headlamp, Trapper hat, Wool socks, Camera tripod, Kuksa cup, Cinnamon bun, Kick-sled, Felt slippers, Pocket telescope, Ice lantern | `table-arctic-cabin`: an Arctic cabin's windowsill, the green aurora glowing through |
| 2027-02 | Carnival | Venetian mask, Feather fan, Tambourine, Maracas, Jester hat, Party popper, Sequinned shoes, Bead necklaces, Party horn, Plumed tiara | `table-carnival`: deep velvet and gold, confetti at the edges |
| 2027-03 | Tulip Time | Wooden clogs, Tulip bulbs, Bicycle basket, Garden trowel, Flower bucket, Stroopwafel, Watering can, Pinwheel, Wellies, Cheese wheel | `table-flower-market`: a Dutch flower market's crates, tulips at the corners |
| 2027-04 | Cherry Blossom | Furoshiki bundle, Sakura mochi, Kokeshi doll, Sakura tea, Geta sandals, Wind chime, Marble soda, Carp streamer, Kendama, Taiyaki | `table-blossom-picnic`: a picnic mat under falling blossom |
| 2027-05 | Road Trip | Folded map, Aviator sunglasses, Cool box, Fuzzy dice, Cassette tape, Jerry can, Dashboard dog, Travel pillow, Car keys, Takeaway coffee | `table-roadside-diner`: a roadside diner's chrome-edged counter, a desert sunset at the corners |
| 2027-06 | Island Hopping | Straw tote, Espadrilles, Worry beads, Olive-oil bottle, Sea sponge, Fisherman's cap, Painted plate, Leather sandals, Beach towel, Shell necklace | `table-island-terrace`: a whitewashed terrace, blue shutters, bougainvillea |
| 2027-07 | Safari | Bush hat, Canvas water bottle, Field journal, Long-lens camera, Rooibos mug, Bandana, Duffel bag, Safari jacket, Torch, Folding stool | `table-safari-camp`: a canvas camp table at sunset, acacia shade |
| 2027-08 | Under the Stars | Enamel mug, Toasted marshmallows, S'mores, Firewood bundle, Canoe paddle, Camp chair, Walkie-talkie, Rope and carabiner, Wool blanket, Cast-iron pan | `table-campfire`: a picnic bench by a campfire under the Milky Way |
| 2027-09 | Grand Train Journey | Pocket watch, Travel clock, Hat box, Porcelain teacup, Fountain pen, Opera glasses, Luggage tag, Ticket punch, Silver cloche, Bowler hat | `table-dining-car`: a wood-panelled dining-car table, a brass lamp |
| 2027-10 | Castle Tour | Iron key, Candelabra, Knight's helmet, Quill, Wax seal, Goblet, Plain shield, Scroll map, Gauntlet, Spinning wheel | `table-castle-hall`: a stone hall's oak table by candlelight, a little spooky |

## Seeing it all

The Editor's **Events** tab (`tools/events/`, read-only) shows every event in release order, with the
newest and next ones marked: each event's items and the level each hides on, its levels made and marked,
its art status against its due date (a month ahead), and its prize (the table, and the helpers read from `src/net/suitcase-ids.json`, the win
checker's own source); then the approved themes still waiting for a date, and every table and how a
player gets it. It reads the files
above on every load, so it follows Art's and Levels' changes; `?today=YYYY-MM-DD` previews another day.
