# The relaxed campaign

What each of the 90 boards asks of the player, axis by axis. Made by
`node tools/levels/make-campaign.mts` from the plan in
`tools/levels/campaign-plan.mts`; every board's winning line is re-proved by
`node tools/levels/check.mts`. Do not edit this table by hand: change the plan
and run the maker. The challenge route is in [challenge.md](challenge.md), the
daily puzzle in [daily.md](daily.md).

- **Destination**: the board's real place (lead, 2026-10-25: the game is a travelogue), a postcard the size of the board of which one window plays as an ordinary picture and unfolds into the whole postcard when finished. It took the place of one of the board's pictures, at the same spot and shape, so the deal and every measure below are as they were. The trips: Travel America (1-15), Japan (16-30), Italy (31-45), American West (46-60), France (61-75), Canada (76-90).
- **Role**: the board's place in the sawtooth ([difficulty-curve.md](difficulty-curve.md)): teach, bite (the first hard-for-a-beginner board), build, relief, hard, peak, super (super hard), pace (all long pictures, a change of pace). Every board but hard, peak and super starts safe: no first move or first clear dooms it. Players see a mark on hard and peak boards ("hard") and super ones ("super").
- **Lookalikes**: pictures from the same family (they share colours and subjects).
- **Cards per picture**: the pieces each picture is cut into.
- **Cards (waiting)**: all the board's cards; in brackets, those still in the stacks when it opens (a 4x5 board holds 20, a 4x6 board 24).
- **Shown**: upcoming cards each stack shows (0, card backs, on every board since 2026-10-25).
- **Chain**: the longest run of clears that depend on one another that no winning line avoids (1: every picture can be finished from the opening deal).
- **Careless win**: the chance a player who never plans ahead still wins (always finishing whatever picture is ready, wherever, else drawing from any stack). It never sees a stack's next card: every draw and every place is a blind, even choice.
- **Traps**: steps of the winning line where another choice would make the board unwinnable.
- **Line**: moves in the stored winning line (no undo, hint or shuffle).

| # | destination | role | pictures | lookalikes | cards per picture | shapes | board | cards (waiting) | shown | chain | careless win | traps | line |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Statue of Liberty | intro | 3 | none | 4 4 4 | 2x2 | 4x4 | 12 (0) | 0 | 1 | 100% | 0 | 7 |
| 2 | Niagara Falls | intro | 4 | none | 4 4 4 4 | 2x2 | 4x4 | 16 (0) | 0 | 1 | 100% | 0 | 11 |
| 3 | Letchworth State Park | bite | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 3 | 56% | 1 | 22 |
| 4 | Lucy the Elephant | relief | 5 | none | 4 4 4 4 4 | 2x2 | 4x4 | 20 (4) | 0 | 2 | 100% | 0 | 18 |
| 5 | Mabry Mill | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 3 | 72% | 1 | 25 |
| 6 | Castillo de San Marcos | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 4 | 70% | 0 | 23 |
| 7 | French Quarter | hard (marked hard) | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 4 | 44% | 1 | 26 |
| 8 | World's Largest Ball of Twine | relief | 5 | none | 4 4 4 4 4 | 2x2 | 4x4 | 20 (4) | 0 | 2 | 100% | 0 | 15 |
| 9 | Paul Bunyan & Babe | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 4 | 67% | 1 | 23 |
| 10 | Pictured Rocks | peak (marked hard) | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 44 (19) | 0 | 4 | 45% | 2 | 37 |
| 11 | Grand Prismatic Spring | pace | 10 | none | 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 20 (4) | 0 | 2 | 100% | 0 | 13 |
| 12 | Delicate Arch | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 4 | 78% | 0 | 22 |
| 13 | Grand Canyon | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 4 | 73% | 0 | 32 |
| 14 | Yosemite Valley | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 4 | 69% | 1 | 27 |
| 15 | Nā Pali Coast | hard (marked hard) | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 36 (20) | 0 | 4 | 47% | 1 | 24 |
| 16 | Mount Fuji | relief | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 2 | 100% | 0 | 20 |
| 17 | Lucky Cat Temple | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 3 | 61% | 2 | 27 |
| 18 | Great Buddha of Kamakura | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 4 | 59% | 1 | 36 |
| 19 | Snow Monkey Park | build | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 36 (20) | 0 | 5 | 51% | 0 | 31 |
| 20 | Shirakawa-gō | super (marked super) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 22% | 2 | 41 |
| 21 | Golden Pavilion | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 13 |
| 22 | Fushimi Inari Shrine | build | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 36 (16) | 0 | 4 | 77% | 1 | 27 |
| 23 | Kiyomizu-dera | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 72% | 1 | 30 |
| 24 | Nachi Falls | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 62% | 0 | 29 |
| 25 | Himeji Castle | hard (marked hard) | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 6 | 41% | 2 | 32 |
| 26 | Rabbit Island | relief | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 32 (12) | 0 | 3 | 100% | 0 | 32 |
| 27 | Itsukushima Shrine | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 63% | 1 | 33 |
| 28 | Kintai Bridge | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 59% | 1 | 36 |
| 29 | Takachiho Gorge | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 54% | 1 | 41 |
| 30 | Taketomi Island | super (marked super) | 18 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 6x6 | 72 (36) | 0 | 4 | 25% | 1 | 64 |
| 31 | Tre Cime di Lavaredo | relief | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 32 (12) | 0 | 3 | 100% | 0 | 22 |
| 32 | Seceda | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 60% | 0 | 37 |
| 33 | Lake Como | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 61% | 0 | 39 |
| 34 | Isola Bella | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 55% | 1 | 36 |
| 35 | Venice | hard (marked hard) | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 33% | 2 | 34 |
| 36 | Cinque Terre | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 14 |
| 37 | Burano | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 56% | 0 | 33 |
| 38 | The Cheese Cathedral | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 56% | 0 | 37 |
| 39 | Val d'Orcia | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 52% | 0 | 40 |
| 40 | Civita di Bagnoregio | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 33% | 2 | 42 |
| 41 | Monster Park | relief | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 36 (16) | 0 | 4 | 100% | 0 | 28 |
| 42 | Positano | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 0 | 31 |
| 43 | The Faraglioni | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 2 | 42 |
| 44 | Matera | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 41% | 0 | 48 |
| 45 | Alberobello | super (marked super) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 20% | 3 | 49 |
| 46 | Bixby Bridge | relief | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 36 (16) | 0 | 3 | 100% | 0 | 28 |
| 47 | Emerald Bay | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 56% | 2 | 37 |
| 48 | Mono Lake | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 57% | 1 | 37 |
| 49 | Joshua Tree | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 45% | 4 | 40 |
| 50 | Oatman's Burros | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 5 | 28% | 1 | 44 |
| 51 | Horseshoe Bend | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 13 |
| 52 | Zion Narrows | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 53% | 4 | 44 |
| 53 | Bryce Canyon | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 53% | 3 | 43 |
| 54 | Valley of Fire | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 4 | 42 |
| 55 | Grand Teton | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 31% | 1 | 38 |
| 56 | Palouse Falls | relief | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 36 (16) | 0 | 4 | 100% | 0 | 28 |
| 57 | Teapot Dome Station | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 54% | 1 | 36 |
| 58 | Painted Hills | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 2 | 48 |
| 59 | Dog Bark Park Inn | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 1 | 35 |
| 60 | Crater Lake | super (marked super) | 19 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 6x6 | 76 (40) | 0 | 4 | 19% | 2 | 67 |
| 61 | The cliffs of Étretat | relief | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 36 (16) | 0 | 3 | 100% | 0 | 36 |
| 62 | Mont-Saint-Michel | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 62% | 3 | 44 |
| 63 | The pink granite coast | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 56% | 2 | 43 |
| 64 | The chapel oak of Allouville | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 46% | 1 | 33 |
| 65 | Château de Chenonceau | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 25% | 2 | 47 |
| 66 | The Eiffel Tower | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 14 |
| 67 | Colmar's Little Venice | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 59% | 3 | 35 |
| 68 | Mont Blanc from Lac Blanc | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 48% | 1 | 44 |
| 69 | Palais Idéal du Facteur Cheval | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 53% | 2 | 40 |
| 70 | The lavender of Valensole | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 34% | 2 | 35 |
| 71 | The Gorges du Verdon | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 100% | 0 | 30 |
| 72 | The flamingos of the Camargue | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 51% | 2 | 35 |
| 73 | Carcassonne | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 44% | 3 | 46 |
| 74 | Bonifacio | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 50% | 0 | 43 |
| 75 | The Dune du Pilat | super (marked super) | 14 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 56 (31) | 0 | 4 | 15% | 3 | 41 |
| 76 | Moraine Lake | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 87% | 1 | 38 |
| 77 | Abraham Lake's frozen bubbles | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 60% | 0 | 48 |
| 78 | The giant pysanka | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 60% | 0 | 42 |
| 79 | Mac the Moose | build | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 52% | 1 | 41 |
| 80 | The northern lights | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 30% | 3 | 39 |
| 81 | Parliament Hill | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 13 |
| 82 | The polar bears of Churchill | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 1 | 47 |
| 83 | Old Quebec in winter | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 48% | 1 | 42 |
| 84 | Percé Rock | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 39% | 0 | 43 |
| 85 | The gannets of Bonaventure | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 24% | 1 | 53 |
| 86 | The Hopewell Rocks | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 96% | 0 | 34 |
| 87 | Peggy's Cove lighthouse | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 41% | 1 | 42 |
| 88 | Lunenburg | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 49% | 0 | 39 |
| 89 | The Cabot Trail in autumn | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 43% | 1 | 46 |
| 90 | The icebergs of Twillingate | super (marked super) | 19 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 6x6 | 76 (40) | 0 | 4 | 16% | 4 | 55 |

Every picture's appearances across the 90 boards: 0 to 2 (mean 1.1). A picture comes back 15 boards later at the soonest (median 18). Every board made since 2026-10-25 keeps the rule: no picture on two of boards 1-13, none back within 15 boards; 0 of 178 returns are sooner than 15, on boards kept from before it.

| picture | boards |
|---|---|
| dusk-harbour (3x2, warm dusk) |  |
| dune-caravan (2x1, warm dusk) |  |
| poppy-sunset (2x2, warm dusk) |  |
| candle-oranges (2x2, warm dusk) |  |
| blossom-lane (2x3, pink bloom) |  |
| peony-jug (2x2, pink bloom) |  |
| berry-cake (2x2, pink bloom) |  |
| rose-hat (2x3, pink bloom) |  |
| maple-path (2x3, autumn rust) |  |
| harvest-table (3x2, autumn rust) |  |
| apple-orchard (2x2, autumn rust) FLAGGED: don't use |  |
| ivy-lane (1x2, autumn rust) |  |
| blue-domes (2x3, sea blue) |  |
| wave-coast (3x2, sea blue) |  |
| hydrangeas (2x2, sea blue) |  |
| net-mender (2x2, sea blue) |  |
| wheat-farm (3x2, golden wheat) |  |
| bread-table (2x1, golden wheat) |  |
| sunflower-vase (1x2, golden wheat) |  |
| wheat-walk (2x3, golden wheat) |  |
| lavender-rows (3x2, lavender) |  |
| wisteria-door (2x3, lavender) |  |
| lilac-bouquet (2x2, lavender) |  |
| figs-grapes (2x2, lavender) |  |
| tea-terraces (3x2, fresh green) |  |
| market-greens (2x2, fresh green) |  |
| greenhouse (2x2, fresh green) FLAGGED: don't use |  |
| green-alley (1x2, fresh green) |  |
| venice-canal (2x3, blue hour) |  |
| lantern-market (3x2, blue hour) |  |
| lantern-child (2x2, blue hour) |  |
| lake-village (2x1, blue hour) |  |
| cherry-bowl (2x2, berry red) |  |
| tulip-rows (3x2, berry red) |  |
| red-tram (1x2, berry red) |  |
| red-umbrella (2x3, berry red) |  |
| lemon-coast (3x3, lemon yellow) |  |
| lemon-tart (2x2, lemon yellow) |  |
| daffodil-meadow (3x3, lemon yellow) |  |
| canal-bicycle (2x3, lemon yellow) FLAGGED: don't use |  |
| snow-chalets (3x2, snow ice) |  |
| skating-day (3x3, snow ice) |  |
| frost-hellebores (2x2, snow ice) |  |
| winter-stream (1x2, snow ice) |  |
| riad-court (2x3, jewel tones) |  |
| carpet-bazaar (2x2, jewel tones) |  |
| anemones (2x2, jewel tones) |  |
| pomegranates (2x2, jewel tones) |  |
| pastel-row (3x2, sugared pastel) |  |
| patisserie (2x1, sugared pastel) |  |
| beach-huts (2x1, sugared pastel) |  |
| balloon-seller (1x2, sugared pastel) |  |
| copper-spires (2x3, copper teal) |  |
| copper-kitchen (3x2, copper teal) |  |
| potter-studio (2x2, copper teal) |  |
| turquoise-falls (2x3, copper teal) |  |
| abbey-cloister (2x2, stone sage) |  |
| stone-village (3x2, stone sage) |  |
| white-garden (2x3, stone sage) |  |
| olive-grove (2x2, stone sage) |  |
| tiled-house (2x2, sea blue) |  |
| fjord-evening (2x2, blue hour) |  |
| vintage-camera (2x2, vintage camera) | 1, 30 |
| red-scooter (2x2, red scooter) | 2, 28 |
| sailboat (2x2, sailboat) | 3 |
| cactus-bloom (2x2, cactus bloom) | 3, 29 |
| cliff-lighthouse (2x2, cliff lighthouse) | 23 |
| blue-headscarf (2x2, blue headscarf) FLAGGED: don't use |  |
| pink-lotus (2x2, pink lotus) | 27 |
| yellow-raincoat (2x2, yellow raincoat) FLAGGED: don't use |  |
| blue-bicycle (2x2, blue bicycle) | 3 |
| mount-fuji (2x2, mount fuji) |  |
| ice-cream (2x2, ice cream) | 3, 30 |
| paper-balloon (2x2, paper balloon) | 1 |
| ginger-cat (2x2, ginger cat) | 6, 29 |
| golden-puppy (2x2, golden puppy) | 4 |
| chestnut-horse (2x2, chestnut horse) | 10 |
| orchid (2x2, orchid) | 5 |
| calla-lilies (2x2, calla lilies) | 12, 30 |
| irises (2x2, irises) |  |
| protea (2x2, protea) | 10 |
| monstera (2x2, monstera) | 9, 30 |
| dahlia (2x2, dahlia) | 10 |
| bird-of-paradise (2x2, bird of paradise) | 8, 29 |
| magnolia (2x2, magnolia) | 29 |
| bonsai (2x2, bonsai) | 7 |
| toadstools (2x2, toadstools) | 13 |
| watermelon (2x2, watermelon) | 5 |
| cappuccino (2x2, cappuccino) | 6 |
| pancakes (2x2, pancakes) | 28 |
| doughnut (2x2, doughnut) | 9 |
| pineapple (2x2, pineapple) | 13 |
| delft-teapot (2x2, delft teapot) | 9 |
| ramen (2x2, ramen) | 13 |
| pizza (2x2, pizza) | 6 |
| gramophone (2x2, gramophone) | 7 |
| violin (2x2, violin) | 13 |
| armchair (2x2, armchair) | 8 |
| rubber-duck (2x2, rubber duck) | 12, 28 |
| teddy-bear (2x2, teddy bear) | 5 |
| camper-van (2x2, camper van) | 6, 29 |
| steam-train (2x2, steam train) | 4, 30 |
| classic-car (2x2, classic car) | 13, 29 |
| biplane (2x2, biplane) | 7 |
| cable-car (2x2, cable car) | 12 |
| suitcase (2x2, suitcase) | 5 |
| rickshaw (2x2, rickshaw) | 10, 28 |
| paper-parasol (2x2, paper parasol) | 13, 30 |
| eiffel-tower (2x2, eiffel tower) |  |
| golden-gate (2x2, golden gate) FLAGGED: don't use |  |
| colosseum (2x2, colosseum) |  |
| leaning-tower (2x2, leaning tower) |  |
| taj-mahal (2x2, taj mahal) |  |
| tree-house (2x2, tree house) | 7 |
| yellow-door (2x2, yellow door) | 6, 28 |
| red-barn (2x2, red barn) | 3, 29 |
| moai (2x2, moai) |  |
| palm-island (2x2, palm island) | 9 |
| sandstone-arch (2x2, sandstone arch) | 8, 29 |
| iceberg (2x2, iceberg) | 12, 30 |
| baobab (2x2, baobab) | 29 |
| redwoods (2x2, redwoods) | 7 |
| rainbow (2x2, rainbow) | 10 |
| sandcastle (2x2, sandcastle) | 10 |
| chef (2x2, chef) FLAGGED: don't use |  |
| ballerina (2x2, ballerina) | 8 |
| red-kite (2x2, red kite) | 9 |
| cowboy (2x2, cowboy) FLAGGED: don't use |  |
| painter (2x2, painter) FLAGGED: don't use |  |
| bubbles (2x2, bubbles) FLAGGED: don't use |  |
| saxophonist (2x2, saxophonist) | 4, 28 |
| skier (2x2, skier) | 3 |
| owl (2x2, owl) | 7 |
| macaw (2x2, macaw) | 13 |
| giraffe (1x2, giraffe) | 21 |
| milkshake (1x2, milkshake) | 21 |
| sunflower (1x2, sunflower) | 21 |
| skyscraper (1x2, skyscraper) | 21 |
| flamenco (1x2, flamenco) | 11 |
| pagoda (1x2, pagoda) | 11 |
| ribbon-falls (1x2, ribbon falls) | 21 |
| canal-house (1x2, canal house) | 11 |
| ice-lolly (1x2, ice lolly) | 11 |
| lily-window (1x2, lily window) | 21 |
| guitar (1x2, guitar) | 11 |
| grand-piano (2x1, grand piano) | 21 |
| sewing-machine (2x1, sewing machine) | 21 |
| tractor (2x1, tractor) | 11 |
| canoe (2x1, canoe) | 21 |
| hammock (2x1, hammock) | 11 |
| wheelbarrow (2x1, wheelbarrow) | 21 |
| rocking-horse (2x1, rocking horse) | 11 |
| paddle-steamer (2x1, paddle steamer) |  |
| dachshund (2x1, dachshund) |  |
| sidecar (2x1, sidecar) | 21 |
| houseboat (2x1, houseboat) | 11 |
| wok-chef (2x2, wok chef) | 5 |
| fence-cowboy (2x2, fence cowboy) | 7 |
| plein-air (2x2, plein air) | 6 |
| apple-ladder (2x2, apple ladder) | 20 |
| lobster-pot (2x2, lobster pot) | 2 |
| dandelion-wish (2x2, dandelion wish) | 4 |
| carrot-harvest (2x2, carrot harvest) | 15 |
| towpath-cyclist (2x3, towpath cyclist) |  |
| book-reader (2x2, book reader) | 2 |
| passion-flower (2x2, passion flower) | 17 |
| hibiscus (2x2, hibiscus) | 15 |
| sweet-peas (2x2, sweet peas) | 22 |
| ranunculus (2x2, ranunculus) | 26 |
| thistle (2x2, thistle) | 25 |
| cornflowers (2x2, cornflowers) | 18 |
| echeveria (2x2, echeveria) | 24 |
| flytrap (2x2, flytrap) | 18 |
| allium (2x2, allium) | 10 |
| chrysanthemum (2x2, chrysanthemum) | 22 |
| fuchsia (2x2, fuchsia) | 15 |
| lupins (2x2, lupins) | 22 |
| clematis (2x2, clematis) | 26 |
| pansy (2x2, pansy) | 24 |
| fiddlehead (2x2, fiddlehead) | 20 |
| ginkgo (2x2, ginkgo) | 19 |
| terrarium (2x2, terrarium) |  |
| amaryllis (2x2, amaryllis) | 12, 28 |
| camellia-plate (2x2, camellia plate) | 14 |
| sushi (2x2, sushi) | 24 |
| croissant (2x2, croissant) | 25 |
| avocado (2x2, avocado) | 25 |
| burger (2x2, burger) | 22 |
| pretzel (2x2, pretzel) | 9 |
| jelly (2x2, jelly) | 22 |
| egg-cup (2x2, egg cup) | 19 |
| hot-chocolate (2x2, hot chocolate) | 25 |
| majolica-jug (2x2, majolica jug) | 27 |
| desk-globe (2x2, desk globe) | 25 |
| roller-skate (2x2, roller skate) | 23 |
| mussels (2x2, mussels) | 30 |
| corn-cob (2x2, corn cob) |  |
| chillies (2x2, chillies) | 15, 30 |
| nesting-dolls (2x2, nesting dolls) | 18 |
| tin-robot (2x2, tin robot) | 20 |
| accordion (2x2, accordion) | 15 |
| trumpet (2x2, trumpet) | 27 |
| origami-crane (2x2, origami crane) | 16 |
| bento (2x2, bento) |  |
| volcano (2x2, volcano) | 17 |
| aurora (2x2, aurora) | 20 |
| geyser (2x2, geyser) | 18 |
| rock-pool (2x2, rock pool) |  |
| basalt-columns (2x2, basalt columns) | 16 |
| karst-peaks (2x2, karst peaks) |  |
| matterhorn (2x2, matterhorn) |  |
| pebble-cairn (2x2, pebble cairn) | 5 |
| oak-acorns (2x2, oak acorns) | 26 |
| thunderstorm (2x2, thunderstorm) | 27 |
| harvest-moon (2x2, harvest moon) | 27 |
| birches (2x2, birches) | 16 |
| amethyst (2x2, amethyst) | 26 |
| bamboo (2x2, bamboo) | 24 |
| sea-stack (2x2, sea stack) | 26 |
| crystal-cave (2x2, crystal cave) | 28 |
| rope-bridge (2x2, rope bridge) | 16 |
| standing-stones (2x2, standing stones) | 28 |
| beekeeper (2x2, beekeeper) | 17 |
| cellist (2x2, cellist) | 24 |
| glassblower (2x2, glassblower) | 23 |
| baker (2x2, baker) | 12, 30 |
| surfer (2x2, surfer) | 25 |
| knitting (2x2, knitting) | 17 |
| climber (2x2, climber) | 16 |
| tyre-swing (2x2, tyre swing) | 25 |
| blacksmith (2x2, blacksmith) | 18 |
| hiker (2x2, hiker) | 24 |
| juggler (2x2, juggler) | 25 |
| fly-fisher (2x2, fly fisher) | 19 |
| tennis-player (2x2, tennis player) | 19 |
| washing-line (2x2, washing line) | 23 |
| airship (2x2, airship) | 14 |
| skateboard (2x2, skateboard) | 17 |
| double-decker (2x2, double decker) | 17 |
| tugboat (2x2, tugboat) | 14 |
| junk-boat (2x2, junk boat) | 27 |
| ocean-liner (2x2, ocean liner) | 20 |
| galleon (2x2, galleon) |  |
| campfire (2x2, campfire) | 19 |
| fire-engine (2x2, fire engine) | 15, 30 |
| penny-farthing (2x2, penny farthing) | 24 |
| longtail-boat (2x2, longtail boat) | 18 |
| seaplane (2x2, seaplane) | 19 |
| bullet-train (2x2, bullet train) | 20 |
| safari-truck (2x2, safari truck) | 20 |
| bow-top-wagon (2x2, bow top wagon) | 18 |
| binoculars (2x2, binoculars) | 24 |
| speedboat (2x2, speedboat) | 23 |
| pier (2x2, pier) | 17 |
| roller-coaster (2x2, roller coaster) | 19 |
| tent (2x2, tent) | 23 |
| castle (2x2, castle) |  |
| igloo (2x2, igloo) | 27 |
| pyramids (2x2, pyramids) |  |
| greek-temple (2x2, greek temple) | 25 |
| torii (2x2, torii) |  |
| yurt (2x2, yurt) | 19 |
| covered-bridge (2x2, covered bridge) | 25 |
| moon-gate (2x2, moon gate) | 23 |
| lifeguard-tower (2x2, lifeguard tower) | 22 |
| half-timbered (2x2, half timbered) | 15 |
| stepwell (2x2, stepwell) |  |
| circus-tent (2x2, circus tent) | 22 |
| observatory (2x2, observatory) | 27 |
| adobe (2x2, adobe) | 23 |
| petra (2x2, petra) |  |
| stave-church (2x2, stave church) |  |
| watermill (2x2, watermill) | 23 |
| bandstand (2x2, bandstand) | 14, 29 |
| fox (2x2, fox) | 20 |
| hedgehog (2x2, hedgehog) | 14 |
| flamingo (2x2, flamingo) | 26 |
| panda (2x2, panda) | 26 |
| tortoise (2x2, tortoise) | 24 |
| peacock (2x2, peacock) |  |
| cow-nose (2x2, cow nose) | 15 |
| rabbit (2x2, rabbit) | 22 |
| koala (2x2, koala) | 16 |
| penguin (2x2, penguin) | 14 |
| chameleon (2x2, chameleon) | 14 |
| rooster (2x2, rooster) | 27 |
| heron (1x2, heron) |  |
| hollyhocks (1x2, hollyhocks) |  |
| whale (2x1, whale) |  |
| otter (2x1, otter) |  |
| marigolds (2x2, marigolds) |  |
| bleeding-heart (2x2, bleeding heart) | 55 |
| gerbera (2x2, gerbera) | 49 |
| forget-me-nots (2x2, forget me nots) | 33 |
| snowdrops (2x2, snowdrops) | 39, 58 |
| bluebells (2x2, bluebells) | 52 |
| plum-blossom (2x2, plum blossom) | 33, 53 |
| carnation (2x2, carnation) | 40 |
| zinnia (2x2, zinnia) | 46 |
| cosmos (2x2, cosmos) | 37, 53 |
| morning-glory (2x2, morning glory) | 40, 58 |
| air-plant (2x2, air plant) |  |
| frangipani (2x2, frangipani) | 50 |
| edelweiss (2x2, edelweiss) |  |
| crocus (2x2, crocus) |  |
| hyacinth (2x2, hyacinth) | 32, 53 |
| bougainvillea (2x2, bougainvillea) | 37, 53 |
| lily-of-the-valley (2x2, lily of the valley) | 45 |
| pitcher-plant (2x2, pitcher plant) | 49 |
| anthurium (2x2, anthurium) | 44, 60 |
| prickly-pear (2x2, prickly pear) | 43 |
| coneflower (2x2, coneflower) | 39, 57 |
| nasturtiums (2x2, nasturtiums) | 47 |
| snapdragons (2x2, snapdragons) | 38, 56 |
| columbine (2x2, columbine) | 31, 60 |
| kangaroo-paw (2x2, kangaroo paw) | 59 |
| cyclamen (2x2, cyclamen) | 50 |
| banksia (2x2, banksia) | 48 |
| sea-holly (2x2, sea holly) | 59 |
| black-eyed-susans (2x2, black eyed susans) | 42 |
| delphinium (1x2, delphinium) | 51 |
| gladiolus (1x2, gladiolus) | 36 |
| window-geraniums (2x1, window geraniums) | 36 |
| dumplings (2x2, dumplings) | 60 |
| tacos (2x2, tacos) | 38, 60 |
| churros (2x2, churros) | 43 |
| honey-jar (2x2, honey jar) | 42, 60 |
| strawberry-basket (2x2, strawberry basket) | 44 |
| blueberries (2x2, blueberries) | 31, 59 |
| peaches (2x2, peaches) | 47 |
| kiwi-slices (2x2, kiwi slices) | 41, 57 |
| blooming-tea (2x2, blooming tea) | 53 |
| smoothie-bowl (2x2, smoothie bowl) | 40, 58 |
| popcorn (2x2, popcorn) | 33, 58 |
| cotton-candy (2x2, cotton candy) | 45 |
| waffles (2x2, waffles) | 33, 53 |
| apple-pie (2x2, apple pie) | 35 |
| bananas (2x2, bananas) | 35 |
| mango (2x2, mango) | 44 |
| coconut (2x2, coconut) | 57 |
| dragon-fruit (2x2, dragon fruit) | 45 |
| artichokes (2x2, artichokes) | 48 |
| chanterelles (2x2, chanterelles) | 33 |
| garlic (2x2, garlic) | 50 |
| vine-tomatoes (2x2, vine tomatoes) | 41 |
| lychees (2x2, lychees) | 49 |
| bubble-tea (2x2, bubble tea) | 47 |
| matcha (2x2, matcha) | 52 |
| lollipops (2x2, lollipops) | 34 |
| chocolate-truffles (2x2, chocolate truffles) |  |
| hourglass (2x2, hourglass) | 40, 55 |
| vintage-radio (2x2, vintage radio) | 39, 56 |
| rotary-phone (2x2, rotary phone) | 45 |
| music-box (2x2, music box) | 38, 57 |
| kaleidoscope (2x2, kaleidoscope) | 35, 54 |
| paper-fan (2x2, paper fan) | 43 |
| yarn-balls (2x2, yarn balls) | 47 |
| spinning-top (2x2, spinning top) | 39 |
| parfait (1x2, parfait) | 51 |
| kebab-skewer (2x1, kebab skewer) | 51 |
| baguette-sandwich (2x1, baguette sandwich) |  |
| lone-tree (2x2, lone tree) | 48 |
| frozen-lake (2x2, frozen lake) | 46 |
| mangrove-roots (2x2, mangrove roots) | 43 |
| oasis (2x2, oasis) | 37, 53 |
| hot-spring (2x2, hot spring) | 32, 57 |
| tide-flats (2x2, tide flats) | 46 |
| mossy-boulders (2x2, mossy boulders) | 34, 53 |
| weeping-willow (2x2, weeping willow) | 34 |
| rainbow-eucalyptus (2x2, rainbow eucalyptus) | 38, 56 |
| dragon-tree (2x2, dragon tree) | 32, 60 |
| rapeseed-fields (2x2, rapeseed fields) | 43 |
| black-sand-beach (2x2, black sand beach) | 48 |
| sandbar (2x2, sandbar) | 31 |
| giant-lily-pads (2x2, giant lily pads) | 39 |
| frosted-web (2x2, frosted web) | 40 |
| autumn-leaves-water (2x2, autumn leaves water) | 41 |
| snowy-fence (2x2, snowy fence) | 32, 57 |
| seashells (2x2, seashells) | 44 |
| scarecrow (2x2, scarecrow) | 45 |
| braided-river (2x2, braided river) | 53 |
| larch-forest (2x2, larch forest) | 37 |
| heather-moor (2x2, heather moor) | 47 |
| snowflake (2x2, snowflake) | 35, 56 |
| cranberry-bog (2x2, cranberry bog) |  |
| pine-cone (2x2, pine cone) | 57 |
| shipwreck (2x2, shipwreck) | 42, 59 |
| frozen-bubble (2x2, frozen bubble) | 33, 56 |
| stepping-stones (2x2, stepping stones) | 45 |
| dewdrops (2x2, dewdrops) | 37 |
| rowboat-lake (2x2, rowboat lake) |  |
| glowing-waves (2x2, glowing waves) | 37, 54 |
| icy-berries (2x2, icy berries) | 52 |
| snowy-pine (1x2, snowy pine) | 36 |
| hay-bales (2x1, hay bales) | 51 |
| tea-pourer (2x2, tea pourer) | 35 |
| candle-maker (2x2, candle maker) | 41 |
| florist (2x2, florist) | 43 |
| cobbler (2x2, cobbler) | 47 |
| violin-maker (2x2, violin maker) | 34, 59 |
| tailor (2x2, tailor) | 46 |
| pizzaiolo (2x2, pizzaiolo) | 43, 58 |
| watering-garden (2x2, watering garden) | 38, 60 |
| rope-sailor (2x2, rope sailor) | 49 |
| woodcarver (2x2, woodcarver) | 47 |
| shepherd-lambs (2x2, shepherd lambs) | 48 |
| fruit-seller (2x2, fruit seller) | 54 |
| feeding-ducks (2x2, feeding ducks) | 41 |
| pier-fishing (2x2, pier fishing) | 50 |
| high-diver (2x2, high diver) | 34 |
| taiko (2x2, taiko) | 35, 54 |
| lumberjack (2x2, lumberjack) | 32 |
| weaver (2x2, weaver) | 47 |
| pastry-chef (2x2, pastry chef) | 35, 55 |
| photographer (2x2, photographer) | 33, 59 |
| paper-boat (2x2, paper boat) | 49 |
| snowboarder (2x2, snowboarder) | 46 |
| swimmer (2x2, swimmer) | 40 |
| chess-move (2x2, chess move) | 44 |
| harpist (2x2, harpist) | 43 |
| double-bass (2x2, double bass) | 40, 55 |
| lantern-maker (2x2, lantern maker) | 31, 57 |
| mountain-biker (2x2, mountain biker) | 44 |
| stilt-walker (1x2, stilt walker) | 51 |
| pole-vaulter (1x2, pole vaulter) | 36 |
| rower-scull (2x1, rower scull) | 36 |
| brass-compass (2x2, brass compass) | 50 |
| helicopter (2x2, helicopter) | 52 |
| hovercraft (2x2, hovercraft) | 37, 56 |
| submarine (2x2, submarine) | 41, 60 |
| jet-ski (2x2, jet ski) | 34 |
| kick-scooter (2x2, kick scooter) | 58 |
| tandem (2x2, tandem) | 32 |
| river-raft (2x2, river raft) |  |
| swan-pedalo (2x2, swan pedalo) | 42 |
| ferris-wheel (2x2, ferris wheel) | 39 |
| carousel-horse (2x2, carousel horse) | 31, 60 |
| harbour-buoy (2x2, harbour buoy) | 46 |
| ships-wheel (2x2, ships wheel) | 33, 55 |
| life-ring (2x2, life ring) | 46 |
| deck-chair (2x2, deck chair) | 48 |
| camping-lantern (2x2, camping lantern) | 40 |
| hiking-boots (2x2, hiking boots) | 37, 55 |
| backpack (2x2, backpack) | 49 |
| chairlift (2x2, chairlift) | 38, 54 |
| icebreaker (2x2, icebreaker) | 52 |
| container-ship (2x2, container ship) | 49 |
| combine (2x2, combine) | 48 |
| ice-cream-van (2x2, ice cream van) |  |
| food-truck (2x2, food truck) | 49 |
| teardrop-caravan (2x2, teardrop caravan) | 38, 55 |
| dhow (2x2, dhow) | 50 |
| catamaran (2x2, catamaran) | 48 |
| snowmobile (2x2, snowmobile) | 44 |
| monster-truck (2x2, monster truck) | 37, 54 |
| unicycle (2x2, unicycle) | 45 |
| propeller-plane (2x2, propeller plane) | 34, 54 |
| dog-sled (2x2, dog sled) | 52 |
| hot-air-balloon (1x2, hot air balloon) | 51 |
| vintage-motorcycle (2x1, vintage motorcycle) | 36 |
| racing-car (2x1, racing car) | 51 |
| horse-carriage (2x1, horse carriage) | 51 |
| dovecote (2x2, dovecote) | 50 |
| spiral-staircase (2x2, spiral staircase) | 39, 54 |
| grain-silos (2x2, grain silos) | 42, 59 |
| geodesic-dome (2x2, geodesic dome) | 50 |
| stilt-house (2x2, stilt house) | 60 |
| fire-lookout (2x2, fire lookout) | 42 |
| drawbridge (2x2, drawbridge) | 52 |
| viaduct (2x2, viaduct) | 38, 54 |
| chimney-pots (2x2, chimney pots) | 55 |
| library-shelves (2x2, library shelves) |  |
| garden-fountain (2x2, garden fountain) | 48 |
| a-frame-cabin (2x2, a frame cabin) | 42 |
| shepherds-hut (2x2, shepherds hut) |  |
| turf-house (2x2, turf house) |  |
| abbey-arch (2x2, abbey arch) | 50 |
| teahouse (2x2, teahouse) | 49 |
| boathouse (2x2, red waterside) | 34 |
| palace-window (2x2, palace window) | 39 |
| skylight (2x2, skylight) | 47 |
| round-tower (2x2, round tower) | 32, 55 |
| potting-shed (2x2, potting shed) | 43, 58 |
| mailbox (2x2, mailbox) | 32, 58 |
| hedge-maze (2x2, hedge maze) | 52 |
| theatre-stage (2x2, theatre stage) | 40, 59 |
| fishing-shack (2x2, red waterside) | 39, 54 |
| birdhouse (2x2, birdhouse) | 38, 55 |
| red-cabin (2x2, red waterside) | 41, 58 |
| lido (2x2, lido) | 41 |
| rondavel (2x2, rondavel) | 46 |
| porch-rocker (2x2, porch rocker) |  |
| lamppost-snow (1x2, lamppost snow) | 36 |
| water-tower (1x2, water tower) | 36 |
| thatched-cottage (2x1, thatched cottage) | 36 |
| conservatory (2x1, conservatory) | 51 |
| toucan (2x2, toucan) | 49 |
| red-panda (2x2, red panda) | 35, 56 |
| sloth (2x2, sloth) | 35 |
| puffin (2x2, puffin) | 44 |
| polar-bear (2x2, polar bear) | 45 |
| hummingbird (2x2, hummingbird) | 31 |
| octopus (2x2, octopus) | 42 |
| axolotl (2x2, axolotl) | 38 |
| tree-frog (2x2, tree frog) | 33, 53 |
| ladybird (2x2, ladybird) | 50 |
| bumblebee (2x2, bumblebee) | 45 |
| monarch (2x2, monarch) | 42 |
| snail (2x2, snail) | 40, 56 |
| goldfish (2x2, goldfish) | 35 |
| sea-turtle (2x2, sea turtle) | 45 |
| lamb (2x2, lamb) | 48 |
| alpaca (2x2, alpaca) | 40 |
| highland-cow (2x2, highland cow) | 57 |
| piglet (2x2, piglet) | 44 |
| ducklings (2x2, ducklings) | 43 |
| kingfisher (2x2, kingfisher) | 32, 52 |
| robin (2x2, robin) | 31, 58 |
| swan (2x2, swan) | 34, 59 |
| zebra (2x2, zebra) | 45 |
| baby-elephant (2x2, baby elephant) | 55 |
| tiger (2x2, tiger) | 42, 59 |
| raccoon (2x2, raccoon) | 44, 60 |
| squirrel (2x2, squirrel) | 50 |
| dalmatian (2x2, dalmatian) | 52 |
| meerkat (1x2, meerkat) |  |
| seahorse (1x2, seahorse) | 51 |
| ostrich (1x2, ostrich) | 36 |
| crocodile (2x1, crocodile) | 51 |
| sleeping-lion (2x1, sleeping lion) | 36 |
| foxgloves (1x2, foxgloves) | 81 |
| jacaranda (2x1, jacaranda) | 81 |
| strawflowers (2x2, strawflowers) | 79 |
| dogwood (2x2, dogwood) | 64, 79 |
| azaleas (2x2, azaleas) | 63, 84 |
| primroses (2x2, primroses) | 67, 82 |
| poinsettia (2x2, poinsettia) | 72 |
| heliconia (2x2, heliconia) | 76 |
| gardenia (2x2, gardenia) | 65 |
| freesias (2x2, freesias) | 69 |
| tiger-lily (2x2, tiger lily) | 68, 83 |
| love-in-a-mist (2x2, love in a mist) | 74 |
| scabious (2x2, scabious) | 77 |
| sweet-violets (2x2, sweet violets) | 64, 87 |
| petunias (2x2, petunias) | 63, 80 |
| begonias (2x2, begonias) | 68 |
| bromeliad (2x2, bromeliad) | 63, 84 |
| bottlebrush (2x2, bottlebrush) | 77 |
| cockscomb (2x2, cockscomb) |  |
| crown-imperial (2x2, crown imperial) | 83 |
| chamomile (2x2, chamomile) | 73, 90 |
| borage (2x2, borage) | 69, 87 |
| grape-hyacinths (2x2, blue spikes) | 62, 82 |
| mimosa (2x2, mimosa) | 65 |
| honeysuckle (2x2, honeysuckle) | 78 |
| lantana (2x2, lantana) | 78 |
| salvia (2x2, blue spikes) | 71, 87 |
| sundew (2x2, sundew) | 63 |
| clivia (2x2, clivia) |  |
| buttercups (2x2, buttercups) | 61, 85 |
| statice (2x2, statice) | 77 |
| cotton-bolls (2x2, cotton bolls) | 75 |
| iceland-poppies (2x2, iceland poppies) | 61, 90 |
| asparagus (1x2, asparagus) |  |
| macarons (2x1, macarons) | 81 |
| xylophone (2x1, xylophone) | 66 |
| cinnamon-rolls (2x2, cinnamon rolls) |  |
| paella (2x2, paella) |  |
| bagels (2x2, bagels) | 80 |
| olives (2x2, olives) | 73, 88 |
| cupcakes (2x2, cupcakes) | 67, 83 |
| jam-jars (2x2, jam jars) | 67, 85 |
| spaghetti (2x2, spaghetti) | 76 |
| tempura (2x2, tempura) | 72, 87 |
| bao-buns (2x2, bao buns) | 62 |
| mochi (2x2, mochi) | 61, 85 |
| persimmons (2x2, persimmons) |  |
| blood-oranges (2x2, blood oranges) | 72, 89 |
| pears (2x2, pears) | 76 |
| starfruit (2x2, starfruit) | 78 |
| beetroot (2x2, beetroot) | 88 |
| radishes (2x2, radishes) | 75 |
| pumpkins (2x2, pumpkins) |  |
| pea-pod (2x2, pea pod) | 70, 89 |
| cocoa-pod (2x2, cocoa pod) |  |
| coffee-beans (2x2, coffee beans) | 69, 84 |
| candy-apples (2x2, candy apples) | 64, 82 |
| gumball-machine (2x2, gumball machine) | 84 |
| gingerbread-men (2x2, gingerbread men) | 72 |
| baklava (2x2, baklava) | 63, 83 |
| empanadas (2x2, empanadas) | 78 |
| ravioli (2x2, ravioli) | 61, 80 |
| scones (2x2, scones) | 67, 87 |
| snow-globe (2x2, snow globe) | 74 |
| ship-in-bottle (2x2, ship in bottle) | 65, 82 |
| ukulele (2x2, ukulele) | 77 |
| jack-in-the-box (2x2, jack in the box) | 68, 84 |
| mortar-pestle (2x2, mortar pestle) | 64, 86 |
| kelp-forest (1x2, kelp forest) | 81 |
| saguaro (1x2, desert cactus) | 66 |
| coral-reef (2x1, coral reef) |  |
| sea-of-clouds (2x1, clouds) | 66 |
| salt-pans (2x2, cracked ground) | 77 |
| vineyard (2x2, vineyard) | 68, 87 |
| rice-paddies (2x2, rice paddies) | 71, 88 |
| cypress-swamp (2x2, cypress swamp) | 65, 85 |
| fern-forest (2x2, green forest) | 63 |
| aspen-grove (2x2, aspen grove) | 67, 82 |
| cracked-earth (2x2, cracked ground) | 64, 89 |
| hoarfrost (2x2, white snow) |  |
| termite-mound (2x2, termite mound) | 73 |
| saturn (2x2, space) | 68, 83 |
| nebula (2x2, space) | 79 |
| desert-bloom (2x2, wildflowers) |  |
| wildflower-meadow (2x2, wildflowers) |  |
| rain-window (2x2, rain window) | 76 |
| sunset-clouds (2x2, clouds) | 79 |
| limestone-cave (2x2, limestone cave) | 77 |
| banyan (2x2, banyan) | 77 |
| patchwork-hills (2x2, patchwork hills) | 82 |
| petrified-wood (2x2, petrified wood) | 79 |
| glowing-mushrooms (2x2, glowing mushrooms) | 70, 86 |
| salt-marsh (2x2, salt marsh) | 64, 82 |
| rainforest-canopy (2x2, rainforest canopy) |  |
| volcano-island (2x2, volcano island) | 72 |
| orange-grove (2x2, orange grove) | 78 |
| barrel-cacti (2x2, desert cactus) | 77 |
| ski-tracks (2x2, white snow) | 63, 80 |
| sunbeam-forest (2x2, green forest) | 74, 89 |
| zen-garden (2x2, zen garden) | 90 |
| palm-moonrise (2x2, palm moonrise) | 63, 88 |
| pop-sunset (2x2, pop sunset) | 85 |
| windmill (1x2, windmill) | 66 |
| container-house (1x2, container house) | 66 |
| station-roof (2x1, iron glass) | 81 |
| arch-bridge (2x1, arch bridge) | 81 |
| hanok-eaves (2x2, hanok eaves) | 73 |
| gazebo (2x2, gazebo) | 69 |
| pergola (2x2, pergola) | 72, 88 |
| brownstone (2x2, brick city) | 86 |
| fire-escape (2x2, brick city) | 70, 85 |
| barber-pole (2x2, barber pole) | 77 |
| sauna-hut (2x2, sauna hut) | 61, 83 |
| insect-hotel (2x2, insect hotel) | 67, 88 |
| chicken-coop (2x2, chicken coop) | 79 |
| horreo (2x2, horreo) | 73 |
| oast-house (2x2, oast house) | 70, 88 |
| zigzag-bridge (2x2, zigzag bridge) | 76 |
| door-knocker (2x2, door knocker) | 83 |
| weathervane (2x2, weathervane) | 73, 90 |
| blue-shutters (2x2, blue shutters) | 70 |
| iron-gate (2x2, iron gate) | 68 |
| tiled-stairs (2x2, tiled stairs) | 86 |
| glass-arcade (2x2, iron glass) |  |
| stone-well (2x2, stone well) | 71, 89 |
| courtyard (2x2, courtyard) | 76 |
| gingerbread-house (2x2, gingerbread house) | 79 |
| dollhouse (2x2, dollhouse) |  |
| kasbah (2x2, kasbah) | 72 |
| glass-cabin (2x2, glass cabin) | 65, 80 |
| glass-dome (2x2, glass dome) | 65, 87 |
| tiny-house (2x2, tiny house) | 75 |
| town-square (2x2, town square) | 79 |
| painted-facade (2x2, painted facade) | 78 |
| tiled-fountain (2x2, tiled fountain) | 75 |
| lattice-window (2x2, lattice window) |  |
| jellyfish (1x2, jellyfish) | 66 |
| red-crowned-crane (1x2, red crowned crane) | 66 |
| dolphin (2x1, dolphin) | 81 |
| cheetah (2x1, cheetah) | 66 |
| lynx (2x2, snow cat) | 61 |
| wolf (2x2, wolf) | 68, 86 |
| bison (2x2, bison) | 61 |
| beaver (2x2, beaver) | 69, 84 |
| narwhal (2x2, narwhal) | 73, 88 |
| manta-ray (2x2, manta ray) |  |
| clownfish (2x2, clownfish) | 71, 86 |
| walrus (2x2, walrus) | 74, 89 |
| seal-pup (2x2, seal pup) | 70, 87 |
| pelican (2x2, pelican) | 72 |
| cockatoo (2x2, cockatoo) | 62 |
| hoopoe (2x2, hoopoe) | 75 |
| bee-eater (2x2, bee eater) | 75 |
| mandarin-duck (2x2, mandarin duck) | 73 |
| kangaroo (2x2, kangaroo) | 62, 89 |
| quokka (2x2, quokka) | 75 |
| lemur (2x2, lemur) | 74, 90 |
| orangutan (2x2, orangutan) | 64, 80 |
| capybara (2x2, capybara) | 62 |
| okapi (2x2, okapi) | 62, 80 |
| rhino (2x2, rhino) | 78 |
| hippo (2x2, hippo) | 74 |
| snow-leopard (2x2, snow cat) | 71, 90 |
| mountain-goat (2x2, mountain goat) | 63, 82 |
| donkey (2x2, donkey) |  |
| hare (2x2, hare) | 79 |
| armadillo (2x2, armadillo) | 68 |
| pangolin (2x2, pangolin) | 68, 85 |
| gecko (2x2, gecko) |  |
| blue-morpho (2x2, blue morpho) | 65, 84 |
| corgi (2x2, corgi) | 73, 89 |
| bagpiper (1x2, bagpiper) | 81 |
| window-cleaner (1x2, window cleaner) | 81 |
| curler (2x1, curler) | 66 |
| bookbinder (2x2, bookbinder) | 67, 82 |
| printmaker (2x2, printmaker) | 65, 80 |
| jeweller (2x2, jeweller) | 71 |
| basket-weaver (2x2, basket weaver) |  |
| chocolatier (2x2, chocolatier) | 76 |
| barista (2x2, barista) | 62, 85 |
| ice-fisher (2x2, ice fisher) | 78 |
| dog-walker (2x2, dog walker) | 75 |
| kite-flyer (2x2, kite flyer) | 79 |
| mail-carrier (2x2, mail carrier) | 64, 83 |
| tap-dancer (2x2, tap dancer) | 65 |
| breakdancer (2x2, breakdancer) | 75 |
| gymnast (2x2, gymnast) | 70, 90 |
| archer (2x2, archer) | 78 |
| fencers (2x2, fencers) | 75 |
| paddleboarder (2x2, paddleboarder) | 69 |
| scuba-diver (2x2, scuba diver) | 65, 89 |
| sledding (2x2, snow kids) | 69, 86 |
| snowman-builders (2x2, snow kids) | 71 |
| tai-chi (2x2, tai chi) | 74, 90 |
| show-jumper (2x2, show jumper) | 67, 84 |
| cabinetmaker (2x2, cabinetmaker) | 72 |
| stonemason (2x2, stonemason) | 69, 86 |
| thatcher (2x2, thatcher) | 68, 87 |
| fishmonger (2x2, fishmonger) |  |
| noodle-maker (2x2, noodle maker) | 65, 89 |
| falconer (2x2, falconer) | 62 |
| microscope (2x2, microscope) | 63, 80 |
| quilter (2x2, quilter) | 67, 84 |
| puppeteer (2x2, puppeteer) | 70, 90 |
| welder (2x2, welder) | 83 |
| helter-skelter (1x2, helter skelter) | 66 |
| rocket (1x2, rocket) | 66 |
| plane-window (2x1, plane window) | 81 |
| floating-market (2x1, floating market) | 81 |
| glider (2x2, sky plane) |  |
| paraglider (2x2, paraglider) | 74 |
| airliner (2x2, sky plane) | 88 |
| lifeboat (2x2, lifeboat) | 76 |
| monorail (2x2, monorail) | 69, 88 |
| handcar (2x2, handcar) | 62, 84 |
| caboose (2x2, red railcar) | 72, 87 |
| picnic-basket (2x2, picnic basket) | 85 |
| snorkel-mask (2x2, snorkel mask) | 64 |
| flip-flops (2x2, flip flops) | 78 |
| cargo-bike (2x2, cargo bike) | 73, 90 |
| toboggan (2x2, toboggan) | 71 |
| snowshoes (2x2, snowshoes) | 70, 86 |
| anchor (2x2, anchor) | 75 |
| dining-car (2x2, dining car) | 79 |
| bumper-cars (2x2, bumper cars) |  |
| teacup-ride (2x2, teacup ride) | 70 |
| swing-ride (2x2, swing ride) | 80 |
| water-slide (2x2, water slide) | 80 |
| go-kart (2x2, go kart) | 67, 82 |
| beach-buggy (2x2, beach buggy) | 74, 90 |
| tuk-tuk (2x2, tuk tuk) | 71 |
| parachute (2x2, parachute) | 76 |
| surfboards (2x2, surfboards) | 69, 85 |
| beach-ball (2x2, beach ball) |  |
| thermos (2x2, thermos) | 77 |
| rack-railway (2x2, red railcar) | 74 |
| pedal-car (2x2, pedal car) | 70, 85 |
| sleigh (2x2, sleigh) | 62, 83 |
| dragon-boat (2x2, dragon boat) |  |
| land-yacht (2x2, land yacht) | 61 |
| sweet-william (2x2, sweet william) | 20 |
| flame-lily (2x2, flame lily) | 75 |
| agapanthus (2x2, agapanthus) | 90 |
| brioche (2x2, brioche) | 10 |
| pistachios (2x2, pistachios) | 20 |
| kumquats (2x2, kumquats) | 75 |
| abacus (2x2, abacus) | 90 |
| foxtails (2x2, golden wheat) | 50 |
| switchbacks (2x2, switchbacks) | 40 |
| river-meander (2x2, river meander) | 20 |
| carved-door (2x2, carved door) | 90 |
| window-seat (2x2, window seat) | 20 |
| dormer-roof (2x2, dormer roof) | 45 |
| pufferfish (2x2, pufferfish) | 90 |
| dormouse (2x2, dormouse) | 10 |
| tamarin (2x2, tamarin) | 65 |
| farrier (2x2, farrier) | 85 |
| hairdresser (2x2, hairdresser) | 55 |
| seedlings (2x2, seedlings) | 60 |
| luggage-trolley (2x2, luggage trolley) | 30 |
| beach-hat (2x2, beach hat) | 90 |
| satchel (2x2, satchel) | 10 |
| fritillary (2x2, fritillary) | 60 |
| nerine (2x2, nerine) | 60 |
| rhubarb (2x2, rhubarb) |  |
| eclairs (2x2, eclairs) |  |
| hazelnuts (2x2, hazelnuts) | 30 |
| sextant (2x2, sextant) | 60 |
| juniper (2x2, juniper) | 90 |
| flax-field (2x2, flax field) | 30 |
| stile (2x2, stile) | 60 |
| clay-oven (2x2, clay oven) | 90 |
| frilled-lizard (2x2, frilled lizard) | 30 |
| stag-beetle (2x2, stag beetle) |  |
| wren (2x2, wren) | 60 |
| cooper (2x2, cooper) | 30 |
| skipping (2x2, skipping) | 60 |
| moped (2x2, moped) | 30 |
