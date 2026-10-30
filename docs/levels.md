# The relaxed campaign

What each of the 150 boards asks of the player, axis by axis. Made by
`node tools/levels/make-campaign.mts` from the plan in
`tools/levels/campaign-plan.mts`; every board's winning line is re-proved by
`node tools/levels/check.mts`. Do not edit this table by hand: change the plan
and run the maker. The challenge route is in [challenge.md](challenge.md), the
daily puzzle in [daily.md](daily.md).

- **Destination**: the board's real place (lead, 2026-10-25: the game is a travelogue), a postcard the size of the board of which one window plays as an ordinary picture and unfolds into the whole postcard when finished. It took the place of one of the board's pictures, at the same spot and shape, so the deal and every measure below are as they were. The trips: Travel America (1-15), Japan (16-30), Italy (31-45), American West (46-60), France (61-75), Canada (76-90), Argentina (91-105), Australia (106-120), South Africa (121-135), UK & Ireland (136-150).
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
| 91 | Iguazú Falls | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 96% | 1 | 38 |
| 92 | Caminito, La Boca | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 56% | 0 | 41 |
| 93 | Hill of Seven Colours | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 57% | 0 | 31 |
| 94 | Iberá's capybaras | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 1 | 42 |
| 95 | Mount Fitz Roy | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 25% | 3 | 40 |
| 96 | Les Éclaireurs lighthouse | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 14 |
| 97 | La Trochita | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 57% | 0 | 44 |
| 98 | Salinas Grandes | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 51% | 3 | 48 |
| 99 | La Polvorilla viaduct | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 5 | 34 |
| 100 | A southern right whale | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 27% | 1 | 43 |
| 101 | The penguins of Punta Tombo | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 99% | 0 | 28 |
| 102 | The Arrayanes forest | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 56% | 2 | 43 |
| 103 | Ischigualasto's Mushroom | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 55% | 1 | 35 |
| 104 | La Payunia | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 51% | 1 | 44 |
| 105 | Perito Moreno Glacier | super (marked super) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 19% | 3 | 38 |
| 106 | The Twelve Apostles | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 85% | 1 | 40 |
| 107 | The Brighton bathing boxes | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 56% | 0 | 34 |
| 108 | Hutt Lagoon | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 55% | 3 | 41 |
| 109 | Cape Hillsborough's kangaroos | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 53% | 2 | 39 |
| 110 | Whitehaven Beach | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 30% | 1 | 44 |
| 111 | The Sydney Harbour Bridge | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 13 |
| 112 | The Bay of Fires | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 53% | 3 | 45 |
| 113 | The Pinnacles Desert | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 49% | 4 | 47 |
| 114 | A Rottnest quokka | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 53% | 3 | 37 |
| 115 | The Remarkable Rocks | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 29% | 4 | 39 |
| 116 | Cape Tribulation | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 85% | 0 | 31 |
| 117 | Karijini's gorges | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 56% | 1 | 40 |
| 118 | The Big Banana | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 54% | 1 | 29 |
| 119 | Cradle Mountain | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 42% | 1 | 37 |
| 120 | Heart Reef | super (marked super) | 19 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 6x6 | 76 (40) | 0 | 4 | 16% | 0 | 59 |
| 121 | Table Mountain | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 89% | 0 | 34 |
| 122 | The Bo-Kaap | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 65% | 0 | 43 |
| 123 | Oudtshoorn's ostriches | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 58% | 3 | 36 |
| 124 | The Cape Winelands | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 55% | 4 | 41 |
| 125 | Cape Point | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 32% | 4 | 37 |
| 126 | The Drakensberg Amphitheatre | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 13 |
| 127 | The Wolfberg Arch | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 53% | 1 | 46 |
| 128 | Kalahari meerkats | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 50% | 2 | 51 |
| 129 | Augrabies Falls | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 52% | 2 | 34 |
| 130 | Namaqualand in flower | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 22% | 2 | 45 |
| 131 | Bourke's Luck Potholes | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 89% | 1 | 29 |
| 132 | Kruger's elephants | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 58% | 2 | 37 |
| 133 | Sani Pass | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 54% | 0 | 45 |
| 134 | St Lucia's town hippos | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 53% | 1 | 41 |
| 135 | The Three Rondavels | super (marked super) | 14 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 56 (31) | 0 | 5 | 16% | 2 | 51 |
| 136 | The Palace of Westminster | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 93% | 0 | 27 |
| 137 | The Royal Crescent | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 56% | 0 | 42 |
| 138 | Stonehenge | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 59% | 0 | 42 |
| 139 | Durdle Door | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 0 | 45 |
| 140 | The Pontcysyllte Aqueduct | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 26% | 3 | 52 |
| 141 | The Dark Hedges | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 14 |
| 142 | The Giant's Causeway | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 59% | 2 | 37 |
| 143 | Connemara's painted sheep | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 47% | 1 | 36 |
| 144 | The Cliffs of Moher | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 45% | 1 | 45 |
| 145 | The doors of Dublin | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 4 | 26% | 3 | 49 |
| 146 | A Highland cow | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 100% | 0 | 39 |
| 147 | The Fairy Pools | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 56% | 1 | 44 |
| 148 | Keem Bay | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 3 | 41 |
| 149 | Loch Ness and Urquhart Castle | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 49% | 2 | 41 |
| 150 | Edinburgh Castle | super (marked super) | 19 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 6x6 | 76 (40) | 0 | 4 | 15% | 3 | 75 |

**Atmospheric pictures** (creator, 2026-10-28; at most one a level, 2026-10-29): one of each board's pictures, from board 3 on (none on an all-long board), is atmospheric, each in a clear square's place with the deal unchanged (`tools/levels/atmospheric.mts`). Per trip: Travel America 12 of 106, Japan 14 of 154, Italy 14 of 160, American West 14 of 172, France 14 of 168, Canada 14 of 176, Argentina 14 of 168, Australia 14 of 174, South Africa 14 of 169, UK & Ireland 14 of 174. The clear pictures they displaced: 137, of which 112 are on no board now, the stock trips 11 on take first (`tools/levels/atmospheric.json`).

Every picture's appearances across the 150 boards: 0 to 2 (mean 1.1). A picture comes back 15 boards later at the soonest (median 21). Every board made since 2026-10-25 keeps the rule: no picture on two of boards 1-13, none back within 15 boards; 0 of 396 returns are sooner than 15, on boards kept from before it.

| picture | boards |
|---|---|
| dusk-harbour (3x2, warm dusk) |  |
| dune-caravan (2x1, warm dusk) |  |
| poppy-sunset (2x2, warm dusk, atmospheric) |  |
| candle-oranges (2x2, warm dusk, atmospheric) | 94 |
| blossom-lane (2x3, pink bloom) |  |
| peony-jug (2x2, pink bloom, atmospheric) |  |
| berry-cake (2x2, pink bloom, atmospheric) | 29 |
| rose-hat (2x3, pink bloom) |  |
| maple-path (2x3, autumn rust) |  |
| harvest-table (3x2, autumn rust) |  |
| apple-orchard (2x2, autumn rust, atmospheric) FLAGGED: don't use |  |
| ivy-lane (1x2, autumn rust) |  |
| blue-domes (2x3, sea blue) |  |
| wave-coast (3x2, sea blue) |  |
| hydrangeas (2x2, sea blue, atmospheric) | 138 |
| net-mender (2x2, sea blue, atmospheric) | 117 |
| wheat-farm (3x2, golden wheat) |  |
| bread-table (2x1, golden wheat) |  |
| sunflower-vase (1x2, golden wheat) |  |
| wheat-walk (2x3, golden wheat) |  |
| lavender-rows (3x2, lavender) |  |
| wisteria-door (2x3, lavender) |  |
| lilac-bouquet (2x2, lavender, atmospheric) FLAGGED: don't use |  |
| figs-grapes (2x2, lavender, atmospheric) | 15 |
| tea-terraces (3x2, fresh green) |  |
| market-greens (2x2, fresh green, atmospheric) | 24 |
| greenhouse (2x2, fresh green, atmospheric) FLAGGED: don't use |  |
| green-alley (1x2, fresh green) |  |
| venice-canal (2x3, blue hour) |  |
| lantern-market (3x2, blue hour) |  |
| lantern-child (2x2, blue hour, atmospheric) | 108 |
| lake-village (2x1, blue hour) |  |
| cherry-bowl (2x2, berry red, atmospheric) |  |
| tulip-rows (3x2, berry red) |  |
| red-tram (1x2, berry red) |  |
| red-umbrella (2x3, berry red) |  |
| lemon-coast (3x3, lemon yellow) |  |
| lemon-tart (2x2, lemon yellow, atmospheric) | 30 |
| daffodil-meadow (3x3, lemon yellow) |  |
| canal-bicycle (2x3, lemon yellow) FLAGGED: don't use |  |
| snow-chalets (3x2, snow ice) |  |
| skating-day (3x3, snow ice) |  |
| frost-hellebores (2x2, snow ice, atmospheric) | 64 |
| winter-stream (1x2, snow ice) |  |
| riad-court (2x3, jewel tones) |  |
| carpet-bazaar (2x2, jewel tones, atmospheric) | 110 |
| anemones (2x2, jewel tones, atmospheric) FLAGGED: don't use |  |
| pomegranates (2x2, jewel tones, atmospheric) | 107 |
| pastel-row (3x2, sugared pastel) |  |
| patisserie (2x1, sugared pastel) |  |
| beach-huts (2x1, sugared pastel) |  |
| balloon-seller (1x2, sugared pastel) |  |
| copper-spires (2x3, copper teal) |  |
| copper-kitchen (3x2, copper teal) |  |
| potter-studio (2x2, copper teal, atmospheric) |  |
| turquoise-falls (2x3, copper teal) |  |
| abbey-cloister (2x2, stone sage, atmospheric) | 95 |
| stone-village (3x2, stone sage) |  |
| white-garden (2x3, stone sage) |  |
| olive-grove (2x2, stone sage, atmospheric) | 59 |
| tiled-house (2x2, sea blue) |  |
| fjord-evening (2x2, blue hour) |  |
| vintage-camera (2x2, vintage camera) | 1, 30 |
| red-scooter (2x2, red scooter) | 2, 28 |
| sailboat (2x2, sailboat) | 3, 122 |
| cactus-bloom (2x2, cactus bloom) | 3, 29 |
| cliff-lighthouse (2x2, cliff lighthouse) | 23 |
| blue-headscarf (2x2, blue headscarf) FLAGGED: don't use |  |
| pink-lotus (2x2, pink lotus) | 27, 125 |
| yellow-raincoat (2x2, yellow raincoat) FLAGGED: don't use |  |
| blue-bicycle (2x2, blue bicycle) |  |
| mount-fuji (2x2, mount fuji) |  |
| ice-cream (2x2, ice cream) | 3, 30 |
| paper-balloon (2x2, paper balloon) | 1, 150 |
| ginger-cat (2x2, ginger cat) | 6, 29 |
| golden-puppy (2x2, golden puppy) | 4, 146 |
| chestnut-horse (2x2, chestnut horse) | 10, 139 |
| orchid (2x2, orchid) | 5, 147 |
| calla-lilies (2x2, calla lilies) | 12, 30 |
| irises (2x2, irises) |  |
| protea (2x2, protea) | 10, 123 |
| monstera (2x2, monstera) | 9, 30 |
| dahlia (2x2, dahlia) | 10 |
| bird-of-paradise (2x2, bird of paradise) | 8, 29 |
| magnolia (2x2, magnolia) |  |
| bonsai (2x2, bonsai) | 7 |
| toadstools (2x2, toadstools) | 13 |
| watermelon (2x2, watermelon) | 5, 150 |
| cappuccino (2x2, cappuccino) | 87 |
| pancakes (2x2, pancakes) | 28, 134 |
| doughnut (2x2, doughnut) | 9, 140 |
| pineapple (2x2, pineapple) | 13, 130 |
| delft-teapot (2x2, delft teapot) | 9, 129 |
| ramen (2x2, ramen) | 13 |
| pizza (2x2, pizza) |  |
| gramophone (2x2, gramophone) | 7, 137 |
| violin (2x2, violin) | 13 |
| armchair (2x2, armchair) | 8, 148 |
| rubber-duck (2x2, rubber duck) | 12, 28 |
| teddy-bear (2x2, teddy bear) | 5, 128 |
| camper-van (2x2, camper van) | 6, 29 |
| steam-train (2x2, steam train) | 30 |
| classic-car (2x2, classic car) | 13, 29 |
| biplane (2x2, biplane) | 7 |
| cable-car (2x2, cable car) | 12, 143 |
| suitcase (2x2, suitcase) |  |
| rickshaw (2x2, rickshaw) | 10, 28 |
| paper-parasol (2x2, paper parasol) | 13, 30 |
| eiffel-tower (2x2, eiffel tower) |  |
| golden-gate (2x2, golden gate) FLAGGED: don't use |  |
| colosseum (2x2, colosseum) |  |
| leaning-tower (2x2, leaning tower) |  |
| taj-mahal (2x2, taj mahal) |  |
| tree-house (2x2, tree house) |  |
| yellow-door (2x2, yellow door) | 6, 28 |
| red-barn (2x2, red barn) | 3, 29 |
| moai (2x2, moai) FLAGGED: don't use |  |
| eagle-figurehead (2x2, eagle figurehead) |  |
| palm-island (2x2, palm island) |  |
| sandstone-arch (2x2, sandstone arch) | 8, 29 |
| iceberg (2x2, iceberg) | 30 |
| baobab (2x2, baobab) | 29 |
| redwoods (2x2, redwoods) | 7, 130 |
| rainbow (2x2, rainbow) | 10 |
| sandcastle (2x2, sandcastle) |  |
| chef (2x2, chef) FLAGGED: don't use |  |
| ballerina (2x2, ballerina) |  |
| red-kite (2x2, red kite) | 9, 131 |
| cowboy (2x2, cowboy) FLAGGED: don't use |  |
| painter (2x2, painter) FLAGGED: don't use |  |
| bubbles (2x2, bubbles) FLAGGED: don't use |  |
| saxophonist (2x2, saxophonist) | 4, 28 |
| skier (2x2, skier) | 3, 129 |
| owl (2x2, owl) | 7, 133 |
| macaw (2x2, macaw) |  |
| giraffe (1x2, giraffe) | 21, 126 |
| milkshake (1x2, milkshake) | 21 |
| sunflower (1x2, sunflower) | 21 |
| skyscraper (1x2, skyscraper) | 21 |
| flamenco (1x2, flamenco) | 11 |
| pagoda (1x2, pagoda) | 11 |
| ribbon-falls (1x2, ribbon falls) | 21 |
| canal-house (1x2, canal house) | 11, 141 |
| ice-lolly (1x2, ice lolly) | 11 |
| lily-window (1x2, lily window) | 21, 141 |
| guitar (1x2, guitar) | 11 |
| grand-piano (2x1, grand piano) | 21 |
| sewing-machine (2x1, sewing machine) | 21 |
| tractor (2x1, tractor) | 11 |
| canoe (2x1, canoe) | 21 |
| hammock (2x1, hammock) | 11 |
| wheelbarrow (2x1, wheelbarrow) | 21, 141 |
| rocking-horse (2x1, rocking horse) | 11 |
| paddle-steamer (2x1, paddle steamer) |  |
| dachshund (2x1, dachshund) |  |
| sidecar (2x1, sidecar) | 21 |
| houseboat (2x1, houseboat) | 11, 126 |
| wok-chef (2x2, wok chef) | 5 |
| fence-cowboy (2x2, fence cowboy) |  |
| plein-air (2x2, plein air) |  |
| apple-ladder (2x2, apple ladder) |  |
| lobster-pot (2x2, lobster pot) | 2, 125 |
| dandelion-wish (2x2, dandelion wish) |  |
| carrot-harvest (2x2, carrot harvest) |  |
| towpath-cyclist (2x3, towpath cyclist) |  |
| book-reader (2x2, book reader) | 2 |
| passion-flower (2x2, passion flower) | 17, 134 |
| hibiscus (2x2, hibiscus) |  |
| sweet-peas (2x2, sweet peas) | 22 |
| ranunculus (2x2, ranunculus) | 26, 148 |
| thistle (2x2, thistle) | 25 |
| cornflowers (2x2, cornflowers) | 18, 134 |
| echeveria (2x2, echeveria) | 24 |
| flytrap (2x2, flytrap) | 18 |
| allium (2x2, allium) | 10 |
| chrysanthemum (2x2, chrysanthemum) | 22, 150 |
| fuchsia (2x2, fuchsia) | 15 |
| lupins (2x2, lupins) | 22, 140 |
| clematis (2x2, clematis) |  |
| pansy (2x2, pansy) | 24, 130 |
| fiddlehead (2x2, fiddlehead) | 20, 144 |
| ginkgo (2x2, ginkgo) | 19 |
| terrarium (2x2, terrarium) |  |
| amaryllis (2x2, amaryllis) | 12, 28 |
| camellia-plate (2x2, camellia plate) FLAGGED: don't use |  |
| sushi (2x2, sushi) | 24, 148 |
| croissant (2x2, croissant) |  |
| avocado (2x2, avocado) | 25 |
| burger (2x2, burger) | 22 |
| pretzel (2x2, pretzel) |  |
| jelly (2x2, jelly) |  |
| egg-cup (2x2, egg cup) | 19, 143 |
| hot-chocolate (2x2, hot chocolate) | 25, 133 |
| majolica-jug (2x2, majolica jug) | 27 |
| desk-globe (2x2, desk globe) | 25 |
| roller-skate (2x2, roller skate) |  |
| mussels (2x2, mussels) |  |
| corn-cob (2x2, corn cob) |  |
| chillies (2x2, chillies) | 15, 30 |
| nesting-dolls (2x2, nesting dolls) | 18, 121 |
| tin-robot (2x2, tin robot) | 20 |
| accordion (2x2, accordion) | 15, 150 |
| trumpet (2x2, trumpet) | 27, 128 |
| origami-crane (2x2, origami crane) |  |
| bento (2x2, bento) |  |
| volcano (2x2, volcano) | 17, 143 |
| aurora (2x2, aurora) | 20, 138 |
| geyser (2x2, geyser) | 18 |
| rock-pool (2x2, rock pool) |  |
| basalt-columns (2x2, basalt columns) | 16 |
| karst-peaks (2x2, karst peaks) |  |
| matterhorn (2x2, matterhorn) |  |
| pebble-cairn (2x2, pebble cairn) | 5 |
| oak-acorns (2x2, oak acorns) | 26 |
| thunderstorm (2x2, thunderstorm) | 27 |
| harvest-moon (2x2, harvest moon) |  |
| birches (2x2, birches) | 16, 142 |
| amethyst (2x2, amethyst) | 26, 145 |
| bamboo (2x2, bamboo) | 24 |
| sea-stack (2x2, sea stack) | 26 |
| crystal-cave (2x2, crystal cave) |  |
| rope-bridge (2x2, rope bridge) | 16 |
| standing-stones (2x2, standing stones) | 123 |
| beekeeper (2x2, beekeeper) | 17, 149 |
| cellist (2x2, cellist) | 24 |
| glassblower (2x2, glassblower) |  |
| baker (2x2, baker) |  |
| surfer (2x2, surfer) | 25 |
| knitting (2x2, knitting) | 17, 140 |
| climber (2x2, climber) | 16 |
| tyre-swing (2x2, tyre swing) | 25 |
| blacksmith (2x2, blacksmith) | 18, 132 |
| hiker (2x2, hiker) | 24 |
| juggler (2x2, juggler) | 25, 150 |
| fly-fisher (2x2, fly fisher) |  |
| tennis-player (2x2, tennis player) | 19 |
| washing-line (2x2, washing line) |  |
| airship (2x2, airship) | 14, 132 |
| skateboard (2x2, skateboard) | 17 |
| double-decker (2x2, double decker) | 64 |
| tugboat (2x2, tugboat) | 14, 135 |
| junk-boat (2x2, junk boat) | 27 |
| ocean-liner (2x2, ocean liner) | 20 |
| galleon (2x2, galleon) |  |
| campfire (2x2, campfire) | 19, 138 |
| fire-engine (2x2, fire engine) | 15, 30 |
| penny-farthing (2x2, penny farthing) | 24, 149 |
| longtail-boat (2x2, longtail boat) |  |
| seaplane (2x2, seaplane) | 19, 125 |
| bullet-train (2x2, bullet train) | 20, 144 |
| safari-truck (2x2, safari truck) | 20, 127 |
| bow-top-wagon (2x2, bow top wagon) | 18 |
| binoculars (2x2, binoculars) | 24 |
| speedboat (2x2, speedboat) | 23, 136 |
| pier (2x2, pier) |  |
| roller-coaster (2x2, roller coaster) | 19, 122 |
| tent (2x2, tent) | 23 |
| castle (2x2, castle) |  |
| igloo (2x2, igloo) | 27 |
| pyramids (2x2, pyramids) |  |
| greek-temple (2x2, greek temple) | 25, 121 |
| torii (2x2, torii) |  |
| yurt (2x2, yurt) |  |
| covered-bridge (2x2, covered bridge) | 25, 144 |
| moon-gate (2x2, moon gate) | 23, 132 |
| lifeguard-tower (2x2, lifeguard tower) | 22 |
| half-timbered (2x2, half timbered) | 15, 146 |
| stepwell (2x2, stepwell) |  |
| circus-tent (2x2, circus tent) | 22, 130 |
| observatory (2x2, observatory) | 27, 137 |
| adobe (2x2, adobe) | 23 |
| petra (2x2, petra) |  |
| stave-church (2x2, stave church) |  |
| watermill (2x2, watermill) | 38 |
| bandstand (2x2, bandstand) | 14, 29 |
| fox (2x2, fox) | 20, 127 |
| hedgehog (2x2, hedgehog) |  |
| flamingo (2x2, flamingo) | 26 |
| panda (2x2, panda) |  |
| tortoise (2x2, tortoise) |  |
| peacock (2x2, peacock) |  |
| cow-nose (2x2, cow nose) |  |
| rabbit (2x2, rabbit) | 22 |
| koala (2x2, koala) | 16, 123 |
| penguin (2x2, penguin) | 14, 123 |
| chameleon (2x2, chameleon) | 14, 150 |
| rooster (2x2, rooster) | 27, 135 |
| heron (1x2, heron) |  |
| hollyhocks (1x2, hollyhocks) |  |
| whale (2x1, whale) |  |
| otter (2x1, otter) |  |
| marigolds (2x2, marigolds) |  |
| bleeding-heart (2x2, bleeding heart) |  |
| gerbera (2x2, gerbera) | 49, 133 |
| forget-me-nots (2x2, forget me nots) |  |
| snowdrops (2x2, snowdrops) | 39, 58 |
| bluebells (2x2, bluebells) | 52 |
| plum-blossom (2x2, plum blossom) | 33, 53 |
| carnation (2x2, carnation) |  |
| zinnia (2x2, zinnia) |  |
| cosmos (2x2, cosmos) | 37, 53 |
| morning-glory (2x2, morning glory) FLAGGED: don't use |  |
| air-plant (2x2, air plant) | 119, 137 |
| frangipani (2x2, frangipani) | 50 |
| edelweiss (2x2, edelweiss) | 134 |
| crocus (2x2, crocus) FLAGGED: don't use |  |
| hyacinth (2x2, hyacinth) | 32, 53 |
| bougainvillea (2x2, bougainvillea) | 37, 53 |
| lily-of-the-valley (2x2, lily of the valley) | 45, 139 |
| pitcher-plant (2x2, pitcher plant) |  |
| anthurium (2x2, anthurium) FLAGGED: don't use |  |
| prickly-pear (2x2, prickly pear) | 43 |
| coneflower (2x2, coneflower) | 39, 57 |
| nasturtiums (2x2, nasturtiums) |  |
| snapdragons (2x2, snapdragons) FLAGGED: don't use |  |
| columbine (2x2, columbine) | 31, 60 |
| kangaroo-paw (2x2, kangaroo paw) | 59, 131 |
| cyclamen (2x2, cyclamen) | 50, 140 |
| banksia (2x2, banksia) | 48, 131 |
| sea-holly (2x2, sea holly) | 59, 143 |
| black-eyed-susans (2x2, black eyed susans) |  |
| delphinium (1x2, delphinium) | 51, 141 |
| gladiolus (1x2, gladiolus) | 36 |
| window-geraniums (2x1, window geraniums) | 36 |
| dumplings (2x2, dumplings) | 135 |
| tacos (2x2, tacos) | 38, 60 |
| churros (2x2, churros) | 43 |
| honey-jar (2x2, honey jar) | 42, 60 |
| strawberry-basket (2x2, strawberry basket) | 44, 139 |
| blueberries (2x2, blueberries) | 31, 59 |
| peaches (2x2, peaches) | 47 |
| kiwi-slices (2x2, kiwi slices) | 41, 57 |
| blooming-tea (2x2, blooming tea) | 147 |
| smoothie-bowl (2x2, smoothie bowl) | 40, 58 |
| popcorn (2x2, popcorn) | 33 |
| cotton-candy (2x2, cotton candy) | 45 |
| waffles (2x2, waffles) | 33, 53 |
| apple-pie (2x2, apple pie) | 35 |
| bananas (2x2, bananas) |  |
| mango (2x2, mango) | 44 |
| coconut (2x2, coconut) | 57 |
| dragon-fruit (2x2, dragon fruit) | 45, 122 |
| artichokes (2x2, artichokes) | 48 |
| chanterelles (2x2, chanterelles) |  |
| garlic (2x2, garlic) | 50 |
| vine-tomatoes (2x2, vine tomatoes) | 41 |
| lychees (2x2, lychees) | 49 |
| bubble-tea (2x2, bubble tea) | 47 |
| matcha (2x2, matcha) | 52 |
| lollipops (2x2, lollipops) | 34, 133 |
| chocolate-truffles (2x2, chocolate truffles) |  |
| hourglass (2x2, hourglass) | 40, 55 |
| vintage-radio (2x2, vintage radio) | 39, 56 |
| rotary-phone (2x2, rotary phone) | 45 |
| music-box (2x2, music box) | 38, 57 |
| kaleidoscope (2x2, kaleidoscope) | 35, 54 |
| paper-fan (2x2, paper fan) | 43 |
| yarn-balls (2x2, yarn balls) |  |
| spinning-top (2x2, spinning top) | 39, 122 |
| parfait (1x2, parfait) | 51, 126 |
| kebab-skewer (2x1, kebab skewer) | 51 |
| baguette-sandwich (2x1, baguette sandwich) | 126 |
| lone-tree (2x2, lone tree) | 48, 124 |
| frozen-lake (2x2, frozen lake) | 46, 128 |
| mangrove-roots (2x2, mangrove roots) | 43, 132 |
| oasis (2x2, oasis) | 53 |
| hot-spring (2x2, hot spring) | 135 |
| tide-flats (2x2, tide flats) | 46, 142 |
| mossy-boulders (2x2, mossy boulders) | 34, 53 |
| weeping-willow (2x2, weeping willow) | 34 |
| rainbow-eucalyptus (2x2, rainbow eucalyptus) | 38 |
| dragon-tree (2x2, dragon tree) | 32, 60 |
| rapeseed-fields (2x2, rapeseed fields) | 43, 136 |
| black-sand-beach (2x2, black sand beach) | 48, 125 |
| sandbar (2x2, sandbar) | 31, 129 |
| giant-lily-pads (2x2, giant lily pads) |  |
| frosted-web (2x2, frosted web) | 40, 124 |
| autumn-leaves-water (2x2, autumn leaves water) | 41, 127 |
| snowy-fence (2x2, snowy fence) | 32, 57 |
| seashells (2x2, seashells) |  |
| scarecrow (2x2, scarecrow) | 45, 124 |
| braided-river (2x2, braided river) |  |
| larch-forest (2x2, larch forest) | 37, 143 |
| heather-moor (2x2, heather moor) | 47, 134 |
| snowflake (2x2, snowflake) | 35, 56 |
| cranberry-bog (2x2, cranberry bog) |  |
| pine-cone (2x2, pine cone) | 57 |
| shipwreck (2x2, shipwreck) | 42, 59 |
| frozen-bubble (2x2, frozen bubble) | 33, 56 |
| stepping-stones (2x2, stepping stones) |  |
| dewdrops (2x2, dewdrops) |  |
| rowboat-lake (2x2, rowboat lake) | 143 |
| glowing-waves (2x2, glowing waves) | 37, 54 |
| icy-berries (2x2, icy berries) | 52 |
| snowy-pine (1x2, snowy pine) | 36 |
| hay-bales (2x1, hay bales) | 51, 141 |
| tea-pourer (2x2, tea pourer) | 35 |
| candle-maker (2x2, candle maker) | 41, 149 |
| florist (2x2, florist) |  |
| cobbler (2x2, cobbler) | 47 |
| violin-maker (2x2, violin maker) |  |
| tailor (2x2, tailor) | 149 |
| pizzaiolo (2x2, pizzaiolo) | 43, 58 |
| watering-garden (2x2, watering garden) |  |
| rope-sailor (2x2, rope sailor) |  |
| woodcarver (2x2, woodcarver) | 47, 139 |
| shepherd-lambs (2x2, shepherd lambs) | 48 |
| fruit-seller (2x2, fruit seller) |  |
| feeding-ducks (2x2, feeding ducks) | 41, 121 |
| pier-fishing (2x2, pier fishing) |  |
| high-diver (2x2, high diver) |  |
| taiko (2x2, taiko) | 35, 54 |
| lumberjack (2x2, lumberjack) | 32, 145 |
| weaver (2x2, weaver) |  |
| pastry-chef (2x2, pastry chef) | 35, 55 |
| photographer (2x2, photographer) |  |
| paper-boat (2x2, paper boat) | 49, 130 |
| snowboarder (2x2, snowboarder) | 46, 136 |
| swimmer (2x2, swimmer) | 40, 132 |
| chess-move (2x2, chess move) | 44, 145 |
| harpist (2x2, harpist) | 56 |
| double-bass (2x2, double bass) | 40, 55 |
| lantern-maker (2x2, lantern maker) |  |
| mountain-biker (2x2, mountain biker) | 44 |
| stilt-walker (1x2, stilt walker) | 51 |
| pole-vaulter (1x2, pole vaulter) | 36 |
| rower-scull (2x1, rower scull) |  |
| brass-compass (2x2, brass compass) | 50 |
| helicopter (2x2, helicopter) | 52, 128 |
| hovercraft (2x2, hovercraft) | 37, 56 |
| submarine (2x2, submarine) | 41, 60 |
| jet-ski (2x2, jet ski) | 34, 145 |
| kick-scooter (2x2, kick scooter) | 147 |
| tandem (2x2, tandem) | 32, 138 |
| river-raft (2x2, river raft) |  |
| swan-pedalo (2x2, swan pedalo) | 42, 144 |
| ferris-wheel (2x2, ferris wheel) | 39 |
| carousel-horse (2x2, carousel horse) | 60 |
| harbour-buoy (2x2, harbour buoy) | 46, 140 |
| ships-wheel (2x2, ships wheel) | 33, 55 |
| life-ring (2x2, life ring) | 46 |
| deck-chair (2x2, deck chair) | 48, 127 |
| camping-lantern (2x2, camping lantern) | 40, 124 |
| hiking-boots (2x2, hiking boots) | 37, 55 |
| backpack (2x2, backpack) | 49, 148 |
| chairlift (2x2, chairlift) | 38, 54 |
| icebreaker (2x2, icebreaker) | 52 |
| container-ship (2x2, container ship) |  |
| combine (2x2, combine) | 48 |
| ice-cream-van (2x2, ice cream van) |  |
| food-truck (2x2, food truck) | 49, 147 |
| teardrop-caravan (2x2, teardrop caravan) | 38, 55 |
| dhow (2x2, dhow) | 50, 148 |
| catamaran (2x2, catamaran) | 48, 142 |
| snowmobile (2x2, snowmobile) | 44 |
| monster-truck (2x2, monster truck) | 37, 54 |
| unicycle (2x2, unicycle) | 45, 136 |
| propeller-plane (2x2, propeller plane) | 34, 54 |
| dog-sled (2x2, dog sled) FLAGGED: don't use |  |
| hot-air-balloon (1x2, hot air balloon) | 51 |
| vintage-motorcycle (2x1, vintage motorcycle) | 36 |
| racing-car (2x1, racing car) | 51 |
| horse-carriage (2x1, horse carriage) | 51 |
| dovecote (2x2, dovecote) | 140 |
| spiral-staircase (2x2, spiral staircase) | 39, 54 |
| grain-silos (2x2, grain silos) | 42 |
| geodesic-dome (2x2, geodesic dome) | 50, 123 |
| stilt-house (2x2, stilt house) | 60, 146 |
| fire-lookout (2x2, fire lookout) | 42, 133 |
| drawbridge (2x2, drawbridge) | 52, 144 |
| viaduct (2x2, viaduct) | 38, 54 |
| chimney-pots (2x2, chimney pots) |  |
| library-shelves (2x2, library shelves) |  |
| garden-fountain (2x2, garden fountain) |  |
| a-frame-cabin (2x2, a frame cabin) | 42 |
| shepherds-hut (2x2, shepherds hut) | 129, 144 |
| turf-house (2x2, turf house) | 14 |
| abbey-arch (2x2, abbey arch) | 50, 150 |
| teahouse (2x2, teahouse) | 49, 145 |
| boathouse (2x2, red waterside) | 34 |
| palace-window (2x2, palace window) |  |
| skylight (2x2, skylight) | 47 |
| round-tower (2x2, round tower) | 32, 55 |
| potting-shed (2x2, potting shed) | 43, 58 |
| mailbox (2x2, mailbox) | 32, 58 |
| hedge-maze (2x2, hedge maze) |  |
| theatre-stage (2x2, theatre stage) | 40, 59 |
| fishing-shack (2x2, red waterside) | 39, 54 |
| birdhouse (2x2, birdhouse) | 38, 55 |
| red-cabin (2x2, red waterside) | 41, 58 |
| lido (2x2, lido) | 71 |
| rondavel (2x2, rondavel) | 46, 138 |
| porch-rocker (2x2, porch rocker) |  |
| lamppost-snow (1x2, lamppost snow) | 36 |
| water-tower (1x2, water tower) | 36 |
| thatched-cottage (2x1, thatched cottage) | 36, 126 |
| conservatory (2x1, conservatory) | 51, 126 |
| toucan (2x2, toucan) | 49 |
| red-panda (2x2, red panda) | 35, 56 |
| sloth (2x2, sloth) | 35 |
| puffin (2x2, puffin) |  |
| polar-bear (2x2, polar bear) | 45 |
| hummingbird (2x2, hummingbird) |  |
| octopus (2x2, octopus) | 42 |
| axolotl (2x2, axolotl) | 130 |
| tree-frog (2x2, tree frog) | 33, 53 |
| ladybird (2x2, ladybird) | 50 |
| bumblebee (2x2, bumblebee) | 45, 135 |
| monarch (2x2, monarch) |  |
| snail (2x2, snail) | 40, 56 |
| goldfish (2x2, goldfish) | 35, 128 |
| sea-turtle (2x2, sea turtle) | 45 |
| lamb (2x2, lamb) | 48 |
| alpaca (2x2, alpaca) | 40, 139 |
| highland-cow (2x2, highland cow) | 57 |
| piglet (2x2, piglet) | 44, 142 |
| ducklings (2x2, ducklings) | 43, 137 |
| kingfisher (2x2, kingfisher) | 32, 52 |
| robin (2x2, robin) | 31, 58 |
| swan (2x2, swan) | 34, 59 |
| zebra (2x2, zebra) | 45, 125 |
| baby-elephant (2x2, baby elephant) | 55 |
| tiger (2x2, tiger) | 42, 59 |
| raccoon (2x2, raccoon) | 44, 60 |
| squirrel (2x2, squirrel) | 50, 129 |
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
| heliconia (2x2, heliconia) FLAGGED: don't use |  |
| gardenia (2x2, gardenia) | 65 |
| freesias (2x2, freesias) |  |
| tiger-lily (2x2, tiger lily) | 68, 83 |
| love-in-a-mist (2x2, love in a mist) | 74 |
| scabious (2x2, scabious) FLAGGED: don't use |  |
| sweet-violets (2x2, sweet violets) FLAGGED: don't use |  |
| petunias (2x2, petunias) | 63, 80 |
| begonias (2x2, begonias) | 68 |
| bromeliad (2x2, bromeliad) | 63, 84 |
| bottlebrush (2x2, bottlebrush) | 77 |
| cockscomb (2x2, cockscomb) | 150 |
| crown-imperial (2x2, crown imperial) |  |
| chamomile (2x2, chamomile) | 73, 90 |
| borage (2x2, borage) FLAGGED: don't use |  |
| grape-hyacinths (2x2, blue spikes) | 62, 82 |
| mimosa (2x2, mimosa) |  |
| honeysuckle (2x2, honeysuckle) | 78 |
| lantana (2x2, lantana) | 78 |
| salvia (2x2, blue spikes) FLAGGED: don't use |  |
| sundew (2x2, sundew) |  |
| clivia (2x2, clivia) | 135 |
| buttercups (2x2, buttercups) | 61, 85 |
| statice (2x2, statice) | 77 |
| cotton-bolls (2x2, cotton bolls) | 75 |
| iceland-poppies (2x2, iceland poppies) | 61, 90 |
| asparagus (1x2, asparagus) | 126 |
| macarons (2x1, macarons) | 81 |
| xylophone (2x1, xylophone) | 66 |
| cinnamon-rolls (2x2, cinnamon rolls) |  |
| paella (2x2, paella) | 148 |
| bagels (2x2, bagels) | 80 |
| olives (2x2, olives) | 73, 88 |
| cupcakes (2x2, cupcakes) | 83 |
| jam-jars (2x2, jam jars) | 67, 85 |
| spaghetti (2x2, spaghetti) | 76 |
| tempura (2x2, tempura) | 72, 87 |
| bao-buns (2x2, bao buns) | 62 |
| mochi (2x2, mochi) | 61, 85 |
| persimmons (2x2, persimmons) | 150 |
| blood-oranges (2x2, blood oranges) | 72, 89 |
| pears (2x2, pears) | 76 |
| starfruit (2x2, starfruit) | 78 |
| beetroot (2x2, beetroot) |  |
| radishes (2x2, radishes) | 75 |
| pumpkins (2x2, pumpkins) |  |
| pea-pod (2x2, pea pod) | 70, 89 |
| cocoa-pod (2x2, cocoa pod) | 136 |
| coffee-beans (2x2, coffee beans) | 69, 84 |
| candy-apples (2x2, candy apples) | 64, 82 |
| gumball-machine (2x2, gumball machine) |  |
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
| vineyard (2x2, vineyard) | 68 |
| rice-paddies (2x2, rice paddies) | 71, 88 |
| cypress-swamp (2x2, cypress swamp) | 65, 85 |
| fern-forest (2x2, green forest) | 60 |
| aspen-grove (2x2, aspen grove) | 82 |
| cracked-earth (2x2, cracked ground) | 64, 89 |
| hoarfrost (2x2, white snow) | 145 |
| termite-mound (2x2, termite mound) | 60 |
| saturn (2x2, space) | 68, 83 |
| nebula (2x2, space) | 79 |
| desert-bloom (2x2, wildflowers) |  |
| wildflower-meadow (2x2, wildflowers) |  |
| rain-window (2x2, rain window) |  |
| sunset-clouds (2x2, clouds) | 79 |
| limestone-cave (2x2, limestone cave) | 77 |
| banyan (2x2, banyan) | 77 |
| patchwork-hills (2x2, patchwork hills) |  |
| petrified-wood (2x2, petrified wood) | 79 |
| glowing-mushrooms (2x2, glowing mushrooms) | 70, 86 |
| salt-marsh (2x2, salt marsh) | 64, 82 |
| rainforest-canopy (2x2, rainforest canopy) | 146 |
| volcano-island (2x2, volcano island) | 72 |
| orange-grove (2x2, orange grove) |  |
| barrel-cacti (2x2, desert cactus) |  |
| ski-tracks (2x2, white snow) | 63, 80 |
| sunbeam-forest (2x2, green forest) | 74, 89 |
| zen-garden (2x2, zen garden) |  |
| palm-moonrise (2x2, palm moonrise) | 63, 88 |
| pop-sunset (2x2, pop sunset) |  |
| windmill (1x2, windmill) | 66 |
| container-house (1x2, container house) | 66 |
| station-roof (2x1, iron glass) | 81 |
| arch-bridge (2x1, arch bridge) | 81 |
| hanok-eaves (2x2, hanok eaves) | 73 |
| gazebo (2x2, gazebo) |  |
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
| door-knocker (2x2, door knocker) |  |
| weathervane (2x2, weathervane) | 73, 90 |
| blue-shutters (2x2, blue shutters) | 44 |
| iron-gate (2x2, iron gate) | 52 |
| tiled-stairs (2x2, tiled stairs) |  |
| glass-arcade (2x2, iron glass) |  |
| stone-well (2x2, stone well) | 71, 89 |
| courtyard (2x2, courtyard) | 76 |
| gingerbread-house (2x2, gingerbread house) | 79 |
| dollhouse (2x2, dollhouse) | 145 |
| kasbah (2x2, kasbah) |  |
| glass-cabin (2x2, glass cabin) | 65, 80 |
| glass-dome (2x2, glass dome) | 65, 87 |
| tiny-house (2x2, tiny house) | 75 |
| town-square (2x2, town square) |  |
| painted-facade (2x2, painted facade) | 78 |
| tiled-fountain (2x2, tiled fountain) | 75 |
| lattice-window (2x2, lattice window) | 133, 148 |
| jellyfish (1x2, jellyfish) | 66 |
| red-crowned-crane (1x2, red crowned crane) | 66 |
| dolphin (2x1, dolphin) | 81 |
| cheetah (2x1, cheetah) | 66 |
| lynx (2x2, snow cat) |  |
| wolf (2x2, wolf) | 68, 86 |
| bison (2x2, bison) | 61 |
| beaver (2x2, beaver) | 69, 84 |
| narwhal (2x2, narwhal) | 73, 88 |
| manta-ray (2x2, manta ray) | 138 |
| clownfish (2x2, clownfish) | 71, 86 |
| walrus (2x2, walrus) | 74, 89 |
| seal-pup (2x2, seal pup) | 70, 87 |
| pelican (2x2, pelican) | 72 |
| cockatoo (2x2, cockatoo) | 62 |
| hoopoe (2x2, hoopoe) | 75 |
| bee-eater (2x2, bee eater) | 75 |
| mandarin-duck (2x2, mandarin duck) | 73 |
| kangaroo (2x2, kangaroo) | 62 |
| quokka (2x2, quokka) | 75 |
| lemur (2x2, lemur) | 74, 90 |
| orangutan (2x2, orangutan) | 64, 80 |
| capybara (2x2, capybara) | 62 |
| okapi (2x2, okapi) | 62, 80 |
| rhino (2x2, rhino) | 78 |
| hippo (2x2, hippo) | 74 |
| snow-leopard (2x2, snow cat) | 71, 90 |
| mountain-goat (2x2, mountain goat) | 63, 82 |
| donkey (2x2, donkey) | 69 |
| hare (2x2, hare) | 79 |
| armadillo (2x2, armadillo) | 68 |
| pangolin (2x2, pangolin) | 68, 85 |
| gecko (2x2, gecko) |  |
| blue-morpho (2x2, blue morpho) | 65, 84 |
| corgi (2x2, corgi) | 73, 89 |
| bagpiper (1x2, bagpiper) | 81 |
| window-cleaner (1x2, window cleaner) |  |
| curler (2x1, curler) | 66 |
| bookbinder (2x2, bookbinder) | 67, 82 |
| printmaker (2x2, printmaker) |  |
| jeweller (2x2, jeweller) | 71 |
| basket-weaver (2x2, basket weaver) |  |
| chocolatier (2x2, chocolatier) | 76 |
| barista (2x2, barista) | 62, 85 |
| ice-fisher (2x2, ice fisher) |  |
| dog-walker (2x2, dog walker) |  |
| kite-flyer (2x2, kite flyer) | 79 |
| mail-carrier (2x2, mail carrier) | 64, 83 |
| tap-dancer (2x2, tap dancer) | 65 |
| breakdancer (2x2, breakdancer) FLAGGED: don't use |  |
| gymnast (2x2, gymnast) | 70, 90 |
| archer (2x2, archer) | 78 |
| fencers (2x2, fencers) | 75 |
| paddleboarder (2x2, paddleboarder) | 69 |
| scuba-diver (2x2, scuba diver) |  |
| sledding (2x2, snow kids) | 69, 86 |
| snowman-builders (2x2, snow kids) | 71 |
| tai-chi (2x2, tai chi) | 74, 90 |
| show-jumper (2x2, show jumper) | 67, 84 |
| cabinetmaker (2x2, cabinetmaker) |  |
| stonemason (2x2, stonemason) |  |
| thatcher (2x2, thatcher) | 68 |
| fishmonger (2x2, fishmonger) |  |
| noodle-maker (2x2, noodle maker) | 65, 89 |
| falconer (2x2, falconer) |  |
| microscope (2x2, microscope) | 63, 80 |
| quilter (2x2, quilter) FLAGGED: don't use |  |
| puppeteer (2x2, puppeteer) | 70, 90 |
| welder (2x2, welder) | 83 |
| helter-skelter (1x2, helter skelter) | 66 |
| rocket (1x2, rocket) | 66 |
| plane-window (2x1, plane window) | 81 |
| floating-market (2x1, floating market) | 81 |
| glider (2x2, sky plane) | 124 |
| paraglider (2x2, paraglider) | 67 |
| airliner (2x2, sky plane) |  |
| lifeboat (2x2, lifeboat) | 76 |
| monorail (2x2, monorail) | 69, 88 |
| handcar (2x2, handcar) | 62, 84 |
| caboose (2x2, red railcar) | 72, 87 |
| picnic-basket (2x2, picnic basket) |  |
| snorkel-mask (2x2, snorkel mask) |  |
| flip-flops (2x2, flip flops) | 78 |
| cargo-bike (2x2, cargo bike) | 73, 90 |
| toboggan (2x2, toboggan) | 58 |
| snowshoes (2x2, snowshoes) | 70, 86 |
| anchor (2x2, anchor) | 75 |
| dining-car (2x2, dining car) |  |
| bumper-cars (2x2, bumper cars) |  |
| teacup-ride (2x2, teacup ride) | 70 |
| swing-ride (2x2, swing ride) |  |
| water-slide (2x2, water slide) | 80 |
| go-kart (2x2, go kart) | 67, 82 |
| beach-buggy (2x2, beach buggy) | 74, 90 |
| tuk-tuk (2x2, tuk tuk) |  |
| parachute (2x2, parachute) | 76 |
| surfboards (2x2, surfboards) | 69, 85 |
| beach-ball (2x2, beach ball) | 123 |
| thermos (2x2, thermos) | 77 |
| rack-railway (2x2, red railcar) |  |
| pedal-car (2x2, pedal car) | 70, 85 |
| sleigh (2x2, sleigh) | 62, 83 |
| dragon-boat (2x2, dragon boat) |  |
| land-yacht (2x2, land yacht) | 61 |
| sweet-william (2x2, sweet william) FLAGGED: don't use |  |
| flame-lily (2x2, flame lily) | 75 |
| agapanthus (2x2, agapanthus) FLAGGED: don't use |  |
| brioche (2x2, brioche) | 10 |
| pistachios (2x2, pistachios) | 142 |
| kumquats (2x2, kumquats) | 75 |
| abacus (2x2, abacus) | 90 |
| foxtails (2x2, golden wheat) | 50 |
| switchbacks (2x2, switchbacks) | 40 |
| river-meander (2x2, river meander) | 20, 138 |
| carved-door (2x2, carved door) | 90 |
| window-seat (2x2, window seat) | 20 |
| dormer-roof (2x2, dormer roof) | 45 |
| pufferfish (2x2, pufferfish) |  |
| dormouse (2x2, dormouse) | 10 |
| tamarin (2x2, tamarin) | 65 |
| farrier (2x2, farrier) | 85 |
| hairdresser (2x2, hairdresser) |  |
| seedlings (2x2, seedlings) | 60 |
| luggage-trolley (2x2, luggage trolley) | 30, 135 |
| beach-hat (2x2, beach hat) | 90 |
| satchel (2x2, satchel) | 10 |
| fritillary (2x2, fritillary) FLAGGED: don't use |  |
| nerine (2x2, nerine) | 60, 127 |
| rhubarb (2x2, rhubarb) | 125 |
| eclairs (2x2, eclairs) |  |
| hazelnuts (2x2, hazelnuts) | 30, 123 |
| sextant (2x2, sextant) | 107 |
| juniper (2x2, juniper) | 90 |
| flax-field (2x2, flax field) | 30 |
| stile (2x2, stile) | 60, 134 |
| clay-oven (2x2, clay oven) | 90 |
| frilled-lizard (2x2, frilled lizard) | 30 |
| stag-beetle (2x2, stag beetle) |  |
| wren (2x2, wren) | 60, 146 |
| cooper (2x2, cooper) |  |
| skipping (2x2, skipping) | 60, 129 |
| moped (2x2, moped) | 30, 137 |
| brugmansia (1x2, brugmansia) | 141 |
| lobelia (2x1, lobelia) | 96 |
| verbena (2x2, verbena) | 93, 119 |
| lisianthus (2x2, lisianthus) | 104 |
| gaillardia (2x2, gaillardia) |  |
| ixora (2x2, ixora) | 104, 120 |
| plumbago (2x2, plumbago) | 91 |
| canna (2x2, canna) |  |
| stocks (2x2, stocks) | 101 |
| gazania (2x2, gazania) | 108 |
| osteospermum (2x2, osteospermum) FLAGGED: don't use |  |
| echinops (2x2, echinops) | 107 |
| astrantia (2x2, astrantia) | 109 |
| campsis (2x2, campsis) | 101, 119 |
| kniphofia (1x2, kniphofia) | 96 |
| quince-blossom (2x2, quince blossom) | 95, 113 |
| cymbidium (2x2, cymbidium) | 107 |
| waratah (2x2, waratah) | 103, 118 |
| desert-pea (2x2, desert pea) | 98 |
| craspedia (2x2, craspedia) | 104 |
| calendula (2x2, calendula) | 103 |
| meconopsis (2x2, meconopsis) | 105 |
| hemerocallis (2x2, hemerocallis) | 110 |
| moonflower (2x2, moonflower) | 99, 115 |
| jasmine (2x2, jasmine) | 102, 120 |
| oleander (2x2, oleander) |  |
| hoya (2x2, hoya) | 93, 112 |
| asters (2x2, asters) | 95, 112 |
| goldenrod (2x2, goldenrod) |  |
| armeria (2x2, armeria) | 100, 119 |
| gorse (2x2, gorse) FLAGGED: don't use |  |
| clover (2x2, clover) |  |
| aloe-bloom (2x2, aloe bloom) | 98, 114 |
| croquembouche (1x2, croquembouche) | 111 |
| madeleines (2x1, madeleines) | 111 |
| dominoes (2x1, dominoes) | 111 |
| sourdough (2x2, sourdough) | 109 |
| focaccia (2x2, focaccia) |  |
| pierogi (2x2, pierogi) | 104 |
| tamales (2x2, tamales) | 105 |
| arepas (2x2, arepas) | 91, 120 |
| pasteis-de-nata (2x2, pasteis de nata) | 100 |
| pavlova (2x2, pavlova) | 91 |
| lamingtons (2x2, lamingtons) | 105 |
| alfajores (2x2, alfajores) | 106 |
| yerba-mate (2x2, yerba mate) | 101 |
| mille-feuille (2x2, mille feuille) | 106 |
| creme-brulee (2x2, creme brulee) | 92, 112 |
| onigiri (2x2, onigiri) | 94, 110 |
| takoyaki (2x2, takoyaki) | 103 |
| dango (2x2, dango) | 97, 113 |
| pho (2x2, pho) | 124, 145 |
| bibimbap (2x2, bibimbap) |  |
| nachos (2x2, nachos) |  |
| crepes (2x2, crepes) | 105 |
| fudge (2x2, fudge) | 113 |
| liquorice (2x2, liquorice) | 108 |
| papaya (2x2, papaya) | 91, 113 |
| jackfruit (2x2, jackfruit) | 103 |
| rambutan (2x2, rambutan) | 97, 112 |
| gooseberries (2x2, gooseberries) | 105, 120 |
| romanesco (2x2, romanesco) | 95, 114 |
| aubergines (2x2, aubergines) | 92, 110 |
| banjo (2x2, banjo) | 109 |
| magnifying-glass (2x2, magnifying glass) | 106 |
| marbles (2x2, marbles) | 95, 114 |
| inkwell (2x2, inkwell) | 97, 120 |
| lemonade (2x2, lemonade) | 102 |
| jungle-vines (1x2, jungle vines) | 111 |
| gum-trees (1x2, gum trees) | 111 |
| milky-way (2x1, night sky) | 96 |
| alpenglow (2x1, alpenglow) | 96 |
| shooting-stars (2x2, night sky) |  |
| eclipse (2x2, space) | 92 |
| jupiter (2x2, space) | 100 |
| moss-carpet (2x2, moss carpet) | 98, 117 |
| beech-woods (2x2, beech woods) |  |
| date-palms (2x2, date palms) | 94 |
| outback-track (2x2, outback) | 98, 116 |
| spinifex (2x2, spinifex) | 103 |
| pampas-grass (2x2, tall grass) |  |
| fogbow (2x2, fogbow) | 98, 114 |
| tumbleweed (2x2, tumbleweed) | 94 |
| frosty-meadow (2x2, winter fog) | 99, 118 |
| winter-fog (2x2, winter fog) | 108 |
| driftwood (2x2, driftwood) |  |
| sea-glass (2x2, sea glass) |  |
| opal (2x2, gemstone) | 108 |
| malachite (2x2, gemstone) | 115 |
| ammonite (2x2, ammonite) | 118 |
| snow-gums (2x2, gum trees) | 100, 117 |
| bluebonnets (2x2, bluebonnets) FLAGGED: don't use |  |
| ripples (2x2, ripples) | 100, 116 |
| reed-bed (2x2, tall grass) |  |
| glowworm-cave (2x2, night sky) | 103 |
| autumn-treetops (2x2, autumn treetops) |  |
| sunrays (2x2, sunrays) | 97, 114 |
| monsoon-rain (2x2, monsoon rain) | 104, 119 |
| mirage (2x2, outback) | 91, 110 |
| waterspout (2x2, waterspout) | 97, 115 |
| hedgerow (2x2, hedgerow) | 101 |
| islet (2x2, islet) | 101, 120 |
| windpump (1x2, windpump) | 111 |
| chandelier (1x2, chandelier) | 96 |
| colonnade (2x1, colonnade) | 96 |
| shophouses (2x1, shophouses) |  |
| queenslander (2x2, verandah) |  |
| shearing-shed (2x2, shearing shed) | 100, 115 |
| estancia (2x2, ranch house) | 98, 115 |
| lacework-verandah (2x2, verandah) | 108 |
| rotunda (2x2, rotunda) | 98, 117 |
| bothy (2x2, bothy) | 91, 119 |
| pavilion (2x2, pavilion) | 100, 116 |
| loggia (2x2, loggia) | 95, 116 |
| deco-facade (2x2, deco facade) | 105, 120 |
| lock-gates (2x2, lock gates) | 95 |
| pantry (2x2, pantry) | 110 |
| attic (2x2, attic) | 108 |
| terrazzo (2x2, terrazzo) | 76 |
| oculus (2x2, ceiling) | 112 |
| coffered-ceiling (2x2, ceiling) |  |
| beach-cabana (2x2, beach thatch) | 106 |
| overwater-bungalow (2x2, beach thatch) | 107 |
| beehive-hut (2x2, beehive hut) |  |
| white-gables (2x2, white gables) | 92, 120 |
| promenade-shelter (2x2, promenade shelter) | 98, 116 |
| rooftop-garden (2x2, rooftop garden) |  |
| rainwater-tank (2x2, rainwater tank) | 116 |
| ranch-gate (2x2, ranch gate) | 110 |
| hacienda (2x2, ranch house) | 95, 113 |
| folly (2x2, rotunda) | 102 |
| inglenook (2x2, inglenook) | 99 |
| grand-stairway (2x2, grand stairway) FLAGGED: don't use |  |
| hammam (2x2, hammam) | 99 |
| boulevard (2x2, boulevard) | 93 |
| metro-station (2x2, metro station) | 91 |
| lyrebird (1x2, lyrebird) | 111 |
| stork (1x2, stork) | 111 |
| condor (2x1, raptor) | 96 |
| dragonfly (2x1, dragonfly) | 111 |
| wombat (2x2, wombat) | 94 |
| echidna (2x2, echidna) | 97, 117 |
| platypus (2x2, platypus) | 107 |
| tasmanian-devil (2x2, tasmanian devil) | 102, 117 |
| emu (2x2, ratite) |  |
| cassowary (2x2, ratite) | 105, 120 |
| kookaburra (2x2, kookaburra) | 104 |
| lorikeet (2x2, parrot) | 99 |
| sugar-glider (2x2, sugar glider) | 105 |
| anteater (2x2, anteater) | 109 |
| mara (2x2, mara) | 93, 115 |
| vizcacha (2x2, vizcacha) | 103, 120 |
| tapir (2x2, tapir) |  |
| siamese-cat (2x2, siamese cat) | 107 |
| border-collie (2x2, border collie) | 102 |
| poodle (2x2, poodle) | 100, 118 |
| guinea-pig (2x2, guinea pig) | 105, 120 |
| budgies (2x2, parrot) | 130, 149 |
| golden-eagle (2x2, raptor) |  |
| scarlet-ibis (2x2, scarlet ibis) | 109 |
| toad (2x2, toad) | 106 |
| fire-salamander (2x2, fire salamander) | 109 |
| iguana (2x2, iguana) | 92, 110 |
| hermit-crab (2x2, hermit crab) | 90 |
| nautilus (2x2, nautilus) | 95, 112 |
| swallowtail (2x2, wings) | 99 |
| atlas-moth (2x2, wings) | 106 |
| fruit-bat (2x2, fruit bat) | 114 |
| gorilla (2x2, gorilla) | 97, 119 |
| badger (2x2, badger) | 103, 118 |
| pixel-pheasant (2x2, pixel pheasant) | 107 |
| tango (1x2, tango) | 96 |
| chimney-sweep (1x2, chimney sweep) | 96 |
| polo-player (2x1, polo player) | 111 |
| gaucho (2x2, gaucho) |  |
| surf-lifesaver (2x2, surf lifesaver) | 120 |
| shearer (2x2, shearer) | 138 |
| asador (2x2, asador) |  |
| skateboarder (2x2, skating) | 93, 118 |
| rollerskater (2x2, skating) |  |
| hula-hoop (2x2, hula hoop) | 140 |
| cheesemaker (2x2, cheesemaker) | 102, 119 |
| pasta-maker (2x2, dough hands) | 107 |
| tortilla-maker (2x2, dough hands) | 109 |
| coffee-roaster (2x2, coffee roaster) |  |
| grape-picker (2x2, grape picker) |  |
| milking (2x2, milking) |  |
| dog-groomer (2x2, dog groomer) |  |
| hockey-player (2x2, hockey player) | 92 |
| sprinter (2x2, sprinter) | 104, 120 |
| golfer (2x2, golfer) |  |
| cricketer (2x2, cricketer) | 110 |
| karate (2x2, karate) | 93, 115 |
| dressmaker (2x2, dressmaker) |  |
| milliner (2x2, milliner) |  |
| glazier (2x2, glazier) |  |
| mosaic-artist (2x2, mosaic artist) |  |
| woodturner (2x2, woodturner) | 97, 114 |
| wheelwright (2x2, wheelwright) | 97, 112 |
| bricklayer (2x2, bricklayer) |  |
| kite-maker (2x2, kite maker) |  |
| toymaker (2x2, toymaker) |  |
| beachcomber (2x2, beachcomber) | 101 |
| birdwatcher (2x2, birdwatcher) |  |
| cellar-singer (2x2, cellar singer) | 94, 118 |
| zip-line (1x2, zip line) | 111 |
| road-train (2x1, road train) | 96 |
| freight-train (2x1, freight train) | 96 |
| rooftop-tent (2x2, rooftop tent) | 110 |
| ferry (2x2, ferry) | 94, 118 |
| outrigger (2x2, paddle boat) |  |
| kayak (2x2, paddle boat) | 94 |
| windsurfer (2x2, sail) | 93, 115 |
| lunar-lander (2x2, spacecraft) | 108 |
| satellite (2x2, spacecraft) | 109 |
| trolleybus (2x2, bus) | 106 |
| vintage-coach (2x2, bus) | 93, 117 |
| bobsleigh (2x2, bobsleigh) | 98, 113 |
| quad-bike (2x2, quad bike) |  |
| gyrocopter (2x2, gyrocopter) |  |
| microcar (2x2, microcar) | 99, 114 |
| pickup-truck (2x2, pickup truck) | 102, 117 |
| steam-roller (2x2, steam roller) |  |
| digger (2x2, construction) | 108 |
| cement-mixer (2x2, construction) | 102 |
| pirate-ship-ride (2x2, pirate ship ride) |  |
| log-flume (2x2, log flume) |  |
| sleeping-bag (2x2, sleeping bag) | 92, 120 |
| camping-stove (2x2, camping stove) |  |
| beach-umbrella (2x2, beach umbrella) | 100, 115 |
| bucket-spade (2x2, bucket spade) | 95, 113 |
| jetpack (2x2, jetpack) | 40 |
| trawler (2x2, trawler) | 95, 110 |
| hydrofoil (2x2, hydrofoil) | 99, 116 |
| golf-cart (2x2, golf cart) | 108 |
| dragster (2x2, dragster) |  |
| train-set (2x2, train set) | 104, 120 |
| spinnaker (2x2, sail) | 101, 118 |
| tricycle (2x2, tricycle) | 102, 117 |
| drone (2x2, drone) | 105 |
| rose (2x2, rose) | 134 |
| gentian (2x2, gentian) FLAGGED: don't use |  |
| pussy-willow (2x2, pussy willow) | 137 |
| laburnum (1x2, laburnum) | 126 |
| physalis (2x2, physalis) | 139 |
| honesty (2x2, honesty) | 127 |
| coleus (2x2, coleus) |  |
| staghorn (2x2, staghorn) | 137 |
| torch-ginger (2x2, torch ginger) |  |
| lotus-pod (2x2, lotus pod) | 145 |
| alstroemeria (2x2, alstroemeria) | 143 |
| phlox (2x2, phlox) | 131 |
| penstemon (2x2, foxgloves) | 143 |
| campanula (2x2, bluebells) FLAGGED: don't use |  |
| yarrow (2x2, yarrow) |  |
| forsythia (2x1, forsythia) | 126 |
| koeksisters (2x2, koeksisters) | 140 |
| milk-tart (2x2, milk tart) | 130 |
| fish-chips (2x2, fish chips) | 136 |
| victoria-sponge (2x2, victoria sponge) | 130 |
| shortbread (2x2, shortbread) | 125 |
| soda-bread (2x2, soda bread) | 124 |
| welsh-cakes (2x2, welsh cakes) | 123 |
| tiramisu (2x2, tiramisu) | 130, 150 |
| cannoli (2x2, cannoli) | 148 |
| mooncakes (2x2, mooncakes) | 150 |
| falafel (2x2, falafel) |  |
| moka-pot (2x2, moka pot) | 138 |
| cuckoo-clock (2x2, cuckoo clock) | 125 |
| typewriter (2x2, typewriter) | 138 |
| leeks (1x2, leeks) | 126 |
| spring-rolls (2x1, spring rolls) | 141 |
| warthog (2x2, warthog) | 132 |
| wild-dog (2x2, wild dog) | 135 |
| bushbaby (2x2, bushbaby) |  |
| secretary-bird (2x2, secretary bird) | 124 |
| hornbill (2x2, toucan) | 140 |
| aardvark (2x2, aardvark) | 94, 146 |
| dung-beetle (2x2, dung beetle) FLAGGED: don't use |  |
| weaverbird (2x2, weaverbird) | 135, 150 |
| red-deer (2x2, red deer) | 130 |
| shetland-pony (2x2, shetland pony) | 136 |
| pine-marten (2x2, pine marten) | 135, 150 |
| magpie (2x2, magpie) | 129 |
| maine-coon (2x2, maine coon) |  |
| beagle (2x2, beagle) | 132 |
| springbok (1x2, springbok) |  |
| orca (2x1, orca) |  |
| funicular (1x2, red railcar) | 141 |
| punt (2x2, punt) | 134 |
| hot-rod (2x2, hot rod) | 150 |
| snowcat (2x2, snowcat) | 128, 145 |
| fireboat (2x2, fireboat) | 140 |
| felucca (2x2, sail) | 127 |
| sampan (2x2, sampan) | 137 |
| school-bus (2x2, bus) | 122 |
| bmx (2x2, bmx) |  |
| space-shuttle (2x2, rocket) | 131 |
| moon-buggy (2x2, spacecraft) | 139 |
| tow-truck (2x2, tow truck) |  |
| car-carrier (2x2, car carrier) |  |
| paper-plane (2x2, paper plane) |  |
| windsock (2x2, windsock) |  |
| cable-ferry (2x1, cable ferry) |  |
| quiver-tree (1x2, quiver tree) | 126 |
| ice-cave (2x2, ice cave) | 132, 149 |
| mud-pots (2x2, mud pots) |  |
| icicles (2x2, icicles) |  |
| cork-oak (2x2, cork oak) | 139 |
| trilobite (2x2, trilobite) |  |
| seagrass (2x2, seagrass) | 121 |
| atoll (2x2, atoll) |  |
| blowhole (2x2, blowhole) | 146 |
| crevasse (2x2, crevasse) | 134 |
| comet (2x2, space) | 121 |
| mars (2x2, space) | 131 |
| whirlpool (2x2, whirlpool) | 127, 144 |
| cotton-grass (2x2, cotton grass) | 149 |
| jetty (2x2, jetty) | 140 |
| pebble-beach (2x1, pebble beach) | 141 |
| tube-house (1x2, tube house) | 141 |
| windcatcher (2x2, windcatcher) | 129, 147 |
| palapa (2x2, palapa) | 132 |
| market-hall (2x2, sunflower) | 143 |
| porthole (2x2, porthole) | 139 |
| flower-balcony (2x2, window geraniums) |  |
| ice-hotel (2x2, igloo) |  |
| shell-grotto (2x2, shell grotto) |  |
| sundial (2x2, sundial) | 147 |
| sleeping-pods (2x2, sleeping pods) | 150 |
| tree-tent (2x2, tree tent) | 133 |
| log-cabin (2x2, log cabin) | 122 |
| tower-crane (2x2, construction) |  |
| signal-box (2x2, signal box) |  |
| round-barn (2x2, red barn) | 128 |
| bathing-machine (2x2, bathing machine) | 142 |
| watchmaker (2x2, watchmaker) | 84 |
| mapmaker (2x2, mapmaker) | 125 |
| tile-painter (2x2, tile painter) | 122 |
| lamplighter (2x2, lamplighter) |  |
| magician (2x2, magician) | 133, 148 |
| trapeze (2x2, trapeze) |  |
| conductor (2x2, conductor) |  |
| irish-dancer (2x2, irish dancer) | 142 |
| kitesurfer (2x2, kitesurfer) | 123 |
| sandboarder (2x2, sandboarder) | 129, 146 |
| caver (2x2, caver) |  |
| oyster-farmer (2x2, oyster farmer) | 147 |
| astronaut (2x2, astronaut) | 128, 144 |
| rugby (2x2, rugby) | 87 |
| hurling (2x2, hurling) | 135 |
| tightrope (2x1, tightrope) | 141 |
| pointillist-promenade (2x2, pointillist promenade, atmospheric) | 42 |
| seaweed-gatherers (2x2, seaweed gatherers, atmospheric) | 142 |
| spice-stalls (2x2, spice stalls, atmospheric) | 18 |
| hanami-picnic (2x2, hanami picnic, atmospheric) |  |
| horse-fair (2x2, horse fair, atmospheric) | 97 |
| fireflies-meadow (2x2, fireflies meadow, atmospheric) | 9 |
| dune-fences (2x2, dune fences, atmospheric) | 14 |
| barn-dance (2x2, barn dance, atmospheric) | 137 |
| luzzu-harbour (2x2, luzzu harbour, atmospheric) |  |
| wild-ponies-heath (2x2, wild ponies heath, atmospheric) | 105 |
| village-downpour (2x2, village downpour, atmospheric) |  |
| wedding-procession (2x2, wedding procession, atmospheric) | 115 |
| drive-in-cinema (2x2, drive in cinema, atmospheric) | 93 |
| stilt-fishermen (2x2, stilt fishermen, atmospheric) | 76 |
| open-air-dance (2x2, open air dance, atmospheric) | 62 |
| caravanserai (2x2, caravanserai, atmospheric) | 72 |
| cliff-walk (2x2, cliff walk, atmospheric) | 85 |
| sugarcane-harvest (2x2, sugarcane harvest, atmospheric) | 47 |
| sheep-market (2x2, sheep market, atmospheric) | 79 |
| carnival-parade (2x2, carnival parade, atmospheric) | 34 |
| night-train (2x2, night train, atmospheric) | 41 |
| arctic-village (2x2, arctic village, atmospheric) | 118 |
| boat-hauling (2x2, boat hauling, atmospheric) | 100 |
| argan-tree (2x2, argan tree, atmospheric) | 25 |
| fishing-fleet (2x2, fishing fleet, atmospheric) |  |
| train-compartment (2x2, train compartment, atmospheric) |  |
| maypole-dance (2x2, maypole dance, atmospheric) | 3 |
| murmuration (2x2, murmuration, atmospheric) | 101 |
| misty-pass-road (2x2, misty pass road, atmospheric) | 113 |
| flooded-village (2x2, flooded village, atmospheric) | 133 |
| research-station (2x2, research station, atmospheric) | 40 |
| paddling-children (2x2, paddling children, atmospheric) | 74 |
| salmon-run (2x2, salmon run, atmospheric) |  |
| cow-parade (2x2, cow parade, atmospheric) | 52 |
| potato-harvest (2x2, potato harvest, atmospheric) |  |
| badlands (2x2, badlands, atmospheric) | 80 |
| apple-press (2x2, apple press, atmospheric) | 143 |
| terrace-breakfast (2x2, terrace breakfast, atmospheric) | 131 |
| mushroom-pickers (2x2, mushroom pickers, atmospheric) | 7 |
| tidal-island (2x2, tidal island, atmospheric) | 112 |
| highland-games (2x2, highland games, atmospheric) |  |
| river-horse-bathing (2x2, river horse bathing, atmospheric) | 26 |
| boatyard (2x2, boatyard, atmospheric) | 103 |
| goose-girl (2x2, goose girl, atmospheric) | 148 |
| trajineras (2x2, trajineras, atmospheric) |  |
| post-bus (2x2, post bus, atmospheric) | 49 |
| city-view-dusk (2x2, city view dusk, atmospheric) |  |
| snowfall-bridge (2x2, snowfall bridge, atmospheric) |  |
| dawn-market-wagons (2x2, dawn market wagons, atmospheric) | 44 |
| peat-cutting (2x2, peat cutting, atmospheric) |  |
| seawall-train (2x2, seawall train, atmospheric) | 71 |
| mokoro-papyrus (2x2, mokoro papyrus, atmospheric) |  |
| midsummer-bonfire (2x2, midsummer bonfire, atmospheric) | 132 |
| lake-town-night (2x2, lake town night, atmospheric) | 22 |
| rodeo (2x2, rodeo, atmospheric) |  |
| poplar-river (2x2, poplar river, atmospheric) |  |
| reed-boats (2x2, reed boats, atmospheric) | 78 |
| flea-market (2x2, flea market, atmospheric) | 149 |
| riverside-picnic (2x2, riverside picnic, atmospheric) | 12 |
| ballet-rehearsal (2x2, ballet rehearsal, atmospheric) | 116 |
| winter-street-dome (2x2, winter street dome, atmospheric) | 70 |
| polder (2x2, polder, atmospheric) | 88 |
| alpine-train (2x2, alpine train, atmospheric) | 77 |
| ghost-town (2x2, ghost town, atmospheric) | 43 |
| fauvist-port (2x2, fauvist port, atmospheric) | 89 |
| sheepdog-trial (2x2, sheepdog trial, atmospheric) | 84 |
| river-shower-boats (2x2, river shower boats, atmospheric) | 50 |
| blossom-orchard (2x2, blossom orchard, atmospheric) | 128 |
| hillside-houses (2x2, hillside houses, atmospheric) | 99 |
| cycle-race (2x2, cycle race, atmospheric) | 120 |
| racehorses (2x2, racehorses, atmospheric) | 67 |
| coast-road-cove (2x2, coast road cove, atmospheric) | 127 |
| river-barges (2x2, river barges, atmospheric) | 58 |
| leg-rowers (2x2, leg rowers, atmospheric) | 20 |
| village-fete (2x2, village fete, atmospheric) |  |
| lake-summer-houses (2x2, lake summer houses, atmospheric) | 27 |
| fish-landing (2x2, fish landing, atmospheric) | 106 |
| alpine-pass-mules (2x2, alpine pass mules, atmospheric) | 31 |
| autumn-village (2x2, autumn village, atmospheric) | 98 |
| crows-winter-field (2x2, crows winter field, atmospheric) |  |
| hayracks (2x2, hayracks, atmospheric) | 60 |
| pottery-market (2x2, pottery market, atmospheric) | 122 |
| moonlit-bay (2x2, moonlit bay, atmospheric) | 69 |
| midnight-sun (2x2, midnight sun, atmospheric) | 140 |
| full-moon-reeds (2x2, full moon reeds, atmospheric) | 73 |
| fish-market-dutch (2x2, fish market dutch, atmospheric) |  |
| petanque (2x2, petanque, atmospheric) | 37 |
| island-market (2x2, island market, atmospheric) | 53 |
| hay-barn-meadow (2x2, hay barn meadow, atmospheric) | 125 |
| cattle-ford (2x2, cattle ford, atmospheric) | 90 |
| willows-misty-river (2x2, willows misty river, atmospheric) | 139 |
| rowing-race-crowd (2x2, rowing race crowd, atmospheric) | 63 |
| hillside-harbour-town (2x2, hillside harbour town, atmospheric) | 92 |
| white-steeple-fall (2x2, white steeple fall, atmospheric) | 104 |
| hill-town-ochre (2x2, hill town ochre, atmospheric) | 136 |
| canyon-river-bend (2x2, canyon river bend, atmospheric) | 46 |
| desert-mesas (2x2, desert mesas, atmospheric) | 33 |
| stormy-swell (2x2, stormy swell, atmospheric) | 55 |
| river-town-bridge (2x2, river town bridge, atmospheric) | 114 |
| rainy-street-night (2x2, rainy street night, atmospheric) | 82 |
| village-pond (2x2, village pond, atmospheric) | 8 |
| night-bridge-lights (2x2, night bridge lights, atmospheric) |  |
| winter-village-dusk (2x2, winter village dusk, atmospheric) | 68 |
| autumn-valley-print (2x2, autumn valley print, atmospheric) | 61 |
| city-park-boating (2x2, city park boating, atmospheric) | 135 |
| schooner-harbour (2x2, schooner harbour, atmospheric) | 65 |
| cantilever-nets (2x2, cantilever nets, atmospheric) | 17 |
| clifftop-sheep (2x2, clifftop sheep, atmospheric) | 39 |
| market-square-livestock (2x2, market square livestock, atmospheric) |  |
| park-avenue-autumn (2x2, park avenue autumn, atmospheric) | 86 |
| papel-picado-plaza (2x2, papel picado plaza, atmospheric) | 6 |
| steam-cranes-dock (2x2, steam cranes dock, atmospheric) | 56 |
| jungle-river (2x2, jungle river, atmospheric) |  |
| cafe-interior (2x2, cafe interior, atmospheric) | 144 |
| lava-moss-field (2x2, lava moss field, atmospheric) | 134 |
| lawn-tennis (2x2, lawn tennis, atmospheric) |  |
| river-village-willows (2x2, river village willows, atmospheric) | 32 |
| allotments-summer (2x2, allotments summer, atmospheric) | 119 |
| ochre-sails-lagoon (2x2, ochre sails lagoon, atmospheric) | 23 |
| gondola-lift (2x2, gondola lift, atmospheric) | 75 |
| river-valley (2x2, river valley, atmospheric) | 5 |
| glacial-lake-tents (2x2, glacial lake tents, atmospheric) |  |
| fireworks-river (2x2, fireworks river, atmospheric) | 48 |
| narrowboats-towpath (2x2, narrowboats towpath, atmospheric) | 130 |
| layered-hills-dawn (2x2, layered hills dawn, atmospheric) | 13 |
| shrimp-fishers (2x2, shrimp fishers, atmospheric) | 109 |
| savanna-zebras (2x2, savanna zebras, atmospheric) | 150 |
| log-drivers (2x2, log drivers, atmospheric) | 83 |
| arcaded-street (2x2, arcaded street, atmospheric) |  |
| andean-terraces (2x2, andean terraces, atmospheric) | 19 |
| rooftops-laundry (2x2, rooftops laundry, atmospheric) | 91 |
| threshing-day (2x2, threshing day, atmospheric) | 87 |
| winding-road-hills (2x2, winding road hills, atmospheric) | 121 |
| street-musicians (2x2, street musicians, atmospheric) | 102 |
| autumn-ploughing (2x2, autumn ploughing, atmospheric) | 124 |
| wax-print-market (2x2, wax print market, atmospheric) | 38 |
| promenade-parasols (2x2, promenade parasols, atmospheric) | 146 |
| pergola-lunch (2x2, pergola lunch, atmospheric) | 145 |
| chateau-lake (2x2, chateau lake, atmospheric) | 54 |
| cricket-green (2x2, cricket green, atmospheric) | 129 |
| lakeside-inn (2x2, lakeside inn, atmospheric) | 57 |
| alpine-hut-hikers (2x2, alpine hut hikers, atmospheric) | 45 |
| rocky-cove (2x2, rocky cove, atmospheric) FLAGGED: don't use |  |
| regatta-headland (2x2, regatta headland, atmospheric) | 35 |
| autumn-lake-reflections (2x2, autumn lake reflections, atmospheric) | 28 |
| winter-farmyard (2x2, winter farmyard, atmospheric) | 147 |
| squid-boats-night (2x2, squid boats night, atmospheric) | 4 |
| street-of-steps (2x2, street of steps, atmospheric) | 10 |
| thermal-pools (2x2, thermal pools, atmospheric) | 123 |
| hop-picking (2x2, hop picking, atmospheric) | 16 |
| ink-haircut (2x2, ink haircut) | 17 |
| ink-icing-cake (2x2, ink icing cake) | 49 |
| ink-spaniel (2x2, ink spaniel) | 71 |
| ink-thread-pins (2x2, ink thread pins) | 122 |
| ink-pram (2x2, ink pram) | 20 |
| ink-model-yacht (2x2, ink model yacht) | 109 |
| ink-ironing (2x2, ink ironing) | 112 |
| ink-shoeshine (2x2, ink shoeshine) | 28 |
| ink-bowler (2x2, ink bowler) | 33 |
| ink-waiter (2x2, ink waiter) |  |
| ink-badminton (2x2, ink badminton) | 93 |
| ink-puncture (2x2, ink puncture) | 85 |
| ink-cutting-roses (2x2, ink cutting roses) | 9 |
| ink-wallpaper (2x2, ink wallpaper) | 133 |
| ink-projectionist (2x2, ink projectionist) |  |
| ink-switchboard (2x2, ink switchboard) | 53 |
| ink-croquet (2x2, ink croquet) | 58 |
| ink-pug (2x2, ink pug) | 117 |
| ink-terrier (2x2, ink terrier) | 47 |
| ink-greyhound (2x2, ink greyhound) | 12 |
| ink-bulldog (2x2, ink bulldog) | 106 |
| ink-hamster (2x2, ink hamster) | 104 |
| ink-woodpecker (2x2, ink woodpecker) | 63 |
| ink-gull (2x2, ink gull) | 99 |
| ink-field-mouse (2x2, ink field mouse) | 77 |
| ink-lobster (2x2, ink lobster) FLAGGED: don't use |  |
| ink-boxing-gloves (2x2, ink boxing gloves) | 23 |
| ink-birdcage (2x2, ink birdcage) | 149 |
| ink-garden-gnome (2x2, ink garden gnome) | 42 |
| ink-perfume (2x2, ink perfume) | 128 |
| ink-handbell (2x2, ink handbell) | 26 |
| ink-pepper-mill (2x2, ink pepper mill) | 39 |
| ink-toy-plane (2x2, ink toy plane) | 44 |
| ink-door-knocker (2x2, ink door knocker) | 147 |
| ink-sundae (2x2, ink sundae) | 37 |
| ink-sardines (2x2, ink sardines) | 55 |
| ink-trifle (2x2, ink trifle) | 69 |
| ink-porridge (2x2, ink porridge) | 125 |
| ink-battenberg (2x2, ink battenberg) | 83 |
| ink-crumpets (2x2, ink crumpets) | 60 |
| ink-crumble (2x2, ink crumble) FLAGGED: don't use |  |
| ink-cauliflower (2x2, ink cauliflower) | 131 |
| ink-raspberries (2x2, ink raspberries) | 115 |
| ink-taxi (2x2, ink taxi) | 87 |
| ink-roadster (2x2, ink roadster) | 31 |
| ink-milk-float (2x2, ink milk float) | 79 |
| ink-soapbox (2x2, ink soapbox) | 101 |
| ink-traction-engine (2x2, ink traction engine) | 142 |
| ink-snowplough (2x2, ink snowplough) |  |
| ink-forklift (2x2, ink forklift) | 136 |
| ink-dodgems (2x2, ink dodgems) | 4 |
| ink-pigeons (2x2, ink pigeons) | 88 |
| ink-hydrant (2x2, ink hydrant) | 6 |
| ink-sprinkler (2x2, ink sprinkler) | 95 |
| ink-seesaw (2x2, ink seesaw) | 67 |
| ink-station-master (2x2, ink station master) | 90 |
| ink-level-crossing (2x2, ink level crossing) | 120 |
| ink-fireside (2x2, ink fireside) | 74 |
| ink-kennel (2x2, ink kennel) | 15 |
| ink-bird-table (2x2, ink bird table) | 144 |
| prize-marrow (2x2, prize marrow) | 20 |
| mechanic (2x2, mechanic) | 72 |
| hayfield-farmer (2x2, hayfield farmer) |  |
| plaiting-hair (2x2, plaiting hair) | 47, 131 |
| meadow-daydream (2x2, meadow daydream) | 91, 113 |
| wall-balance (2x2, wall balance) | 7, 147 |
| cafe-regular (2x2, cafe regular) | 49, 149 |
| greengrocer (2x2, greengrocer) | 43, 142 |
| orchestra-flautist (2x2, orchestra flautist, atmospheric) |  |
| toddler-lift (2x2, toddler lift) | 34, 59 |
| butcher-stall (2x2, butcher stall) | 46 |
| garden-secret (2x2, garden secret) | 30 |
| snowy-lane (2x2, snowy lane) |  |
| basketball-dunk (2x2, basketball dunk) |  |
| jazz-drummer (2x2, jazz drummer) | 23, 124 |
| kitchen-dance (2x2, kitchen dance) | 55, 150 |
| bus-window (2x2, bus window) | 33, 59 |
| baby-rug (2x2, baby rug) | 38, 60 |
| upholsterer (2x2, upholsterer) | 103 |
| rain-coat (2x2, rain coat) | 75 |
| big-boots (2x2, big boots) | 100, 120 |
| beach-dog (2x2, beach dog) | 78 |
| cartwheel (2x2, cartwheel) | 65, 89 |
| windowsill-peek (2x2, windowsill peek) | 31, 57 |
| football-boot (2x2, football boot) | 92 |
| sculptor (2x2, sculptor) | 94, 113 |
| birthday-tea (2x2, birthday tea) |  |
| tree-climb (1x2, tree climb) | 81 |
| vet-puppy (2x2, vet puppy) | 110 |
| hill-roll (2x2, hill roll) |  |
| hilltop-dusk (2x2, hilltop dusk) | 87 |
| crab-catch (2x2, crab catch) | 50 |
| gondolier (2x2, gondolier) | 19, 150 |
| bartender (2x2, bartender) | 116 |
| armchair-nap (2x2, armchair nap) | 121 |
| crayons (2x2, crayons) | 6, 121 |
| leaf-jump (2x2, leaf jump) | 112 |
| broom-doorway (2x2, broom doorway) | 23 |
| rowing-family (2x1, rowing family) | 36 |
| finish-line (2x2, finish line) | 100, 119 |
| baking-together (2x2, baking together) | 30 |
| cloud-sea (2x2, cloud sea) | 127 |
| family-dinner (2x2, family dinner) | 114 |
| party-lights (2x2, party lights) | 135 |
| sailing-helm (2x2, sailing helm) |  |
| bike-shop (2x2, bike shop) | 65, 80 |
| marching-band (2x2, marching band) | 69, 86 |
| beach-twirl (2x2, beach twirl) | 121 |
| rolling-chapatis (2x2, rolling chapatis) |  |
| learning-to-ride (2x2, learning to ride) | 15 |
| koi-pair (2x2, koi pair) |  |
| french-horn (2x2, french horn) |  |
| firefighter (2x2, firefighter) |  |
| jukebox (2x2, jukebox) |  |
| puffer-fish (2x2, puffer fish) |  |
| limes (2x2, limes) |  |
