# The relaxed campaign

What each of the 300 boards asks of the player, axis by axis. Made by
`node tools/levels/make-campaign.mts` from the plan in
`tools/levels/campaign-plan.mts`; every board's winning line is re-proved by
`node tools/levels/check.mts`. Do not edit this table by hand: change the plan
and run the maker. The challenge route is in [challenge.md](challenge.md), the
daily puzzle in [daily.md](daily.md).

- **Destination**: the board's real place (lead, 2026-10-25: the game is a travelogue), a postcard the size of the board of which one window plays as an ordinary picture and unfolds into the whole postcard when finished. It took the place of one of the board's pictures, at the same spot and shape, so the deal and every measure below are as they were. The trips: Travel America (1-15), Japan (16-30), Italy (31-45), American West (46-60), France (61-75), Canada (76-90), Argentina (91-105), Australia (106-120), South Africa (121-135), UK & Ireland (136-150), East Coast America (151-165), New Zealand (166-180), Spain & Portugal (181-195), Morocco (196-210), Vietnam & Thailand (211-225), Scandinavia & Iceland (226-240), Brazil (241-255), Germany, Austria & Switzerland (256-270), South Korea (271-285), Poland (286-300).
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
| 3 | Letchworth State Park | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 2 | 100% | 0 | 22 |
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
| 151 | Portland Head Light | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 99% | 1 | 32 |
| 152 | The Albany Covered Bridge | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 58% | 1 | 28 |
| 153 | A Vermont sugarhouse | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 60% | 0 | 43 |
| 154 | Acorn Street | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 57% | 0 | 35 |
| 155 | The Flying Horse Carousel | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 5 | 35% | 2 | 44 |
| 156 | The Thimble Islands | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 15 |
| 157 | Independence Hall | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 53% | 2 | 40 |
| 158 | The horseshoe crabs of Delaware Bay | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 1 | 39 |
| 159 | Assateague's wild horses | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 1 | 41 |
| 160 | The cherry blossoms of the Tidal Basin | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 21% | 2 | 53 |
| 161 | The Venus flytraps of Carolina Beach | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 100% | 0 | 31 |
| 162 | Rainbow Row | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 55% | 0 | 32 |
| 163 | Driftwood Beach | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 51% | 3 | 41 |
| 164 | The burrowing owls of Cape Coral | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 49% | 0 | 39 |
| 165 | An Everglades alligator | super (marked super) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 6 | 18% | 4 | 43 |
| 166 | Lake Tekapo | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 99% | 1 | 32 |
| 167 | Ohakune's giant carrot | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 58% | 1 | 28 |
| 168 | Pōhutu geyser | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 60% | 0 | 43 |
| 169 | The Moeraki Boulders | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 57% | 0 | 35 |
| 170 | Napier's Art Deco | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 32% | 2 | 37 |
| 171 | The Wānaka tree | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 14 |
| 172 | A kiwi on Stewart Island | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 53% | 2 | 40 |
| 173 | Kaikōura's fur seals | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 1 | 39 |
| 174 | Baldwin Street | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 1 | 41 |
| 175 | Franz Josef Glacier | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 21% | 2 | 53 |
| 176 | Arrowtown in autumn | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 100% | 0 | 31 |
| 177 | A kea at Arthur's Pass | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 55% | 0 | 32 |
| 178 | The Pancake Rocks | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 51% | 3 | 41 |
| 179 | Curio Bay's stone forest | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 49% | 0 | 39 |
| 180 | Milford Sound | super (marked super) | 14 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 56 (31) | 0 | 4 | 17% | 3 | 46 |
| 181 | The Plaza de España | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 100% | 0 | 33 |
| 182 | Costa Nova's striped houses | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 62% | 0 | 35 |
| 183 | The windmills of Consuegra | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 60% | 1 | 35 |
| 184 | Belém Tower | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 54% | 3 | 42 |
| 185 | Las Médulas | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 28% | 2 | 39 |
| 186 | Ronda's Puente Nuevo | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 16 |
| 187 | Guadix's cave houses | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 56% | 3 | 41 |
| 188 | Pena Palace | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 50% | 1 | 38 |
| 189 | La Geria's vineyards | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 55% | 0 | 38 |
| 190 | Monsanto | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 4 | 22% | 1 | 37 |
| 191 | Madrid's Crystal Palace | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 80% | 0 | 27 |
| 192 | The cork oaks of the Alentejo | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 6 | 59% | 1 | 38 |
| 193 | Gulpiyuri | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 4 | 39 |
| 194 | The Benagil sea cave | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 46% | 3 | 44 |
| 195 | Porto's Ribeira | super (marked super) | 19 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 6x6 | 76 (40) | 0 | 4 | 13% | 0 | 72 |
| 196 | Chefchaouen | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 98% | 0 | 29 |
| 197 | Goats in the argan trees | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 56% | 1 | 37 |
| 198 | Essaouira's blue boats | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 60% | 1 | 34 |
| 199 | Volubilis | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 57% | 1 | 40 |
| 200 | Aït Benhaddou | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 32% | 1 | 42 |
| 201 | The Todra Gorge | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 16 |
| 202 | El Badi's storks | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 58% | 2 | 38 |
| 203 | Imlil and Toubkal | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 48% | 0 | 35 |
| 204 | The tanneries of Fes | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 47% | 0 | 42 |
| 205 | Erg Chebbi | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 6 | 25% | 2 | 40 |
| 206 | A donkey of Fes's medina | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 89% | 0 | 27 |
| 207 | The Menara gardens | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 58% | 2 | 37 |
| 208 | Paradise Valley | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 50% | 0 | 33 |
| 209 | The Monkey Fingers of the Dades | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 0 | 40 |
| 210 | The Bahia Palace | super (marked super) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 4 | 20% | 2 | 43 |
| 211 | Hội An's lanterns | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 99% | 0 | 29 |
| 212 | The Maeklong railway market | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 56% | 1 | 37 |
| 213 | The Erawan Falls | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 2 | 40 |
| 214 | The Mã Pí Lèng Pass | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 3 | 51% | 0 | 45 |
| 215 | Phuket's Old Town | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 4 | 30% | 1 | 42 |
| 216 | The Fairy Stream | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 15 |
| 217 | The Damnoen Saduak floating market | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 59% | 7 | 49 |
| 218 | The basket boats of Cẩm Thanh | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 49% | 0 | 34 |
| 219 | Ban Rak Thai | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 51% | 1 | 43 |
| 220 | The rice terraces of Sa Pa | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 5 | 23% | 1 | 41 |
| 221 | Koh Panyee's floating pitch | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 89% | 1 | 28 |
| 222 | Phong Nha Cave | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 57% | 4 | 42 |
| 223 | Bo Sang's umbrellas | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 53% | 0 | 38 |
| 224 | Maya Bay | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 48% | 1 | 37 |
| 225 | Hạ Long Bay | super (marked super) | 19 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 6x6 | 76 (40) | 0 | 4 | 16% | 3 | 61 |
| 226 | Nyhavn | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 100% | 0 | 30 |
| 227 | Icelandic horses | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 57% | 0 | 36 |
| 228 | Reine, Lofoten | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 56% | 0 | 38 |
| 229 | Møns Klint | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 58% | 1 | 39 |
| 230 | Preikestolen | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 6 | 27% | 2 | 44 |
| 231 | Skógafoss | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 14 |
| 232 | The giant Dala horse | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 60% | 3 | 49 |
| 233 | Kronborg | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 50% | 2 | 40 |
| 234 | Diamond Beach | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 2 | 52 |
| 235 | Visby | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 6 | 23% | 3 | 50 |
| 236 | The Atlantic Road | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 100% | 0 | 36 |
| 237 | Dalarna's red cottages | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 58% | 0 | 34 |
| 238 | Iceland's puffins | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 46% | 0 | 41 |
| 239 | Senja's Segla | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 50% | 0 | 41 |
| 240 | Kirkjufell | super (marked super) | 14 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 56 (31) | 0 | 5 | 14% | 3 | 43 |
| 241 | Sugarloaf Mountain | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 97% | 0 | 26 |
| 242 | Paraty at high tide | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 62% | 0 | 29 |
| 243 | The Cup of Vila Velha | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 53% | 3 | 38 |
| 244 | The Hercílio Luz Bridge | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 3 | 34 |
| 245 | Bonito's clear rivers | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 6 | 28% | 3 | 34 |
| 246 | A Pantanal jaguar | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 15 |
| 247 | Hyacinth macaws | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 59% | 1 | 42 |
| 248 | The Lacerda Elevator | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 1 | 36 |
| 249 | A sloth in Bahia's cocoa forest | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 51% | 1 | 36 |
| 250 | The giant cashew tree of Pirangi | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 27% | 1 | 45 |
| 251 | The jangadas of Canoa Quebrada | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 89% | 0 | 29 |
| 252 | Lençóis Maranhenses | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 56% | 4 | 38 |
| 253 | Ver-o-Peso market | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 51% | 1 | 46 |
| 254 | The pink river dolphins | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 53% | 0 | 41 |
| 255 | The Theatro Amazonas | super (marked super) | 19 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 6x6 | 76 (40) | 0 | 4 | 18% | 3 | 61 |
| 256 | The Speicherstadt | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 92% | 0 | 35 |
| 257 | The beach chairs of Warnemünde | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 63% | 3 | 36 |
| 258 | The Brandenburg Gate | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 55% | 2 | 42 |
| 259 | The Rakotz Bridge | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 53% | 0 | 41 |
| 260 | The Wuppertal Schwebebahn | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 35% | 1 | 48 |
| 261 | Pfalzgrafenstein | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 13 |
| 262 | Rothenburg's Plönlein | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 56% | 4 | 39 |
| 263 | The St Bernard dogs | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 45% | 0 | 40 |
| 264 | Bern's bears | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 51% | 4 | 45 |
| 265 | The Chapel Bridge | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 22% | 2 | 45 |
| 266 | Guarda | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 100% | 0 | 31 |
| 267 | The Golden Roof | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 51% | 3 | 40 |
| 268 | The marmots of the Grossglockner | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 50% | 2 | 47 |
| 269 | Grüner See | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 48% | 0 | 48 |
| 270 | The Vienna State Opera | super (marked super) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 12% | 3 | 40 |
| 271 | Gwanghwamun | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 96% | 0 | 33 |
| 272 | Bukchon Hanok Village | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 64% | 0 | 36 |
| 273 | Hwahongmun | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 59% | 1 | 34 |
| 274 | The reed fields of Seocheon | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 51% | 4 | 42 |
| 275 | Sunchang's chilli-paste jars | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 28% | 2 | 48 |
| 276 | The mudskippers of Suncheon Bay | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 17 |
| 277 | Sancheong's persimmon curtains | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 53% | 3 | 43 |
| 278 | Gamcheon Culture Village | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 51% | 3 | 39 |
| 279 | Cheomseongdae | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 51% | 1 | 44 |
| 280 | Hahoe Folk Village | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 28% | 1 | 43 |
| 281 | The log bridge of Museom | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 93% | 0 | 33 |
| 282 | Ulsanbawi | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 1 | 39 |
| 283 | Anbandegi's cabbage fields | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 2 | 36 |
| 284 | Jeju's knobbly tangerines | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 51% | 1 | 37 |
| 285 | Seongsan Ilchulbong | super (marked super) | 19 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 6x6 | 76 (40) | 0 | 4 | 18% | 0 | 60 |
| 286 | The Crooked Forest | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 99% | 1 | 34 |
| 287 | The Crane of Gdańsk | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 63% | 1 | 43 |
| 288 | Malbork Castle | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 52% | 1 | 46 |
| 289 | The Elbląg Canal's ship railway | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 3 | 60% | 1 | 48 |
| 290 | Ciechocinek's graduation towers | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 4 | 33% | 1 | 37 |
| 291 | Biskupin | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 13 |
| 292 | The goats of Poznań | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 50% | 3 | 48 |
| 293 | Wrocław's Old Town Hall | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 54% | 0 | 38 |
| 294 | Nikiszowiec | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 52% | 0 | 42 |
| 295 | Łazienki's Palace on the Isle | hard (marked hard) | 13 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 52 (27) | 0 | 4 | 23% | 2 | 48 |
| 296 | Białowieża's wild bison | relief | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 88% | 0 | 35 |
| 297 | Kazimierz Dolny | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 56% | 2 | 32 |
| 298 | Zalipie, the painted village | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 50% | 0 | 41 |
| 299 | Zakopane's wooden villas | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 54% | 0 | 34 |
| 300 | Kraków's Cloth Hall | super (marked super) | 14 | none | 4 4 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 5x5 | 56 (31) | 0 | 5 | 14% | 2 | 61 |

**Atmospheric pictures** (creator, 2026-10-28; at most one a level, 2026-10-29): one of each board's pictures, from board 3 on (none on an all-long board), is atmospheric, each in a clear square's place with the deal unchanged (`tools/levels/atmospheric.mts`). Per trip: Travel America 12 of 106, Japan 14 of 154, Italy 14 of 160, American West 14 of 172, France 14 of 168, Canada 14 of 176, Argentina 14 of 168, Australia 14 of 174, South Africa 14 of 169, UK & Ireland 14 of 174, East Coast America 14 of 168, New Zealand 14 of 169, Spain & Portugal 14 of 174, Morocco 14 of 168, Vietnam & Thailand 14 of 174, Scandinavia & Iceland 14 of 169, Brazil 14 of 174, Germany, Austria & Switzerland 14 of 168, South Korea 14 of 174, Poland 14 of 169. The clear pictures they displaced: 195, of which 11 are on no board now, the stock trips 11 on take first (`tools/levels/atmospheric.json`).

Every picture's appearances across the 300 boards: 0 to 4 (mean 2.0). A picture comes back 15 boards later at the soonest (median 105). Every board made since 2026-10-25 keeps the rule: no picture on two of boards 1-13, none back within 15 boards; 0 of 1756 returns are sooner than 15, on boards kept from before it.

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
| cherry-bowl (2x2, berry red, atmospheric) | 166, 212 |
| tulip-rows (3x2, berry red) |  |
| red-tram (1x2, berry red) |  |
| red-umbrella (2x3, berry red) |  |
| lemon-coast (3x3, lemon yellow) |  |
| lemon-tart (2x2, lemon yellow, atmospheric) | 30 |
| daffodil-meadow (3x3, lemon yellow) |  |
| canal-bicycle (2x3, lemon yellow) FLAGGED: don't use |  |
| snow-chalets (3x2, snow ice) FLAGGED: don't use |  |
| skating-day (3x3, snow ice) FLAGGED: don't use |  |
| frost-hellebores (2x2, snow ice, atmospheric) | 64, 290 |
| winter-stream (1x2, snow ice) FLAGGED: don't use |  |
| riad-court (2x3, jewel tones) FLAGGED: don't use |  |
| carpet-bazaar (2x2, jewel tones, atmospheric) | 110 |
| anemones (2x2, jewel tones, atmospheric) FLAGGED: don't use |  |
| pomegranates (2x2, jewel tones, atmospheric) | 107 |
| pastel-row (3x2, sugared pastel) |  |
| patisserie (2x1, sugared pastel) FLAGGED: don't use |  |
| beach-huts (2x1, sugared pastel) |  |
| balloon-seller (1x2, sugared pastel) |  |
| copper-spires (2x3, copper teal) FLAGGED: don't use |  |
| copper-kitchen (3x2, copper teal) FLAGGED: don't use |  |
| potter-studio (2x2, copper teal, atmospheric) |  |
| turquoise-falls (2x3, copper teal) |  |
| abbey-cloister (2x2, stone sage, atmospheric) | 95, 209 |
| stone-village (3x2, stone sage) FLAGGED: don't use |  |
| white-garden (2x3, stone sage) FLAGGED: don't use |  |
| olive-grove (2x2, stone sage, atmospheric) | 59 |
| tiled-house (2x2, sea blue) |  |
| fjord-evening (2x2, blue hour) |  |
| vintage-camera (2x2, vintage camera) | 1, 30, 188, 297 |
| red-scooter (2x2, red scooter) | 2, 28, 185, 295 |
| sailboat (2x2, sailboat) | 3, 122, 247 |
| cactus-bloom (2x2, cactus bloom) | 3, 29, 188, 297 |
| cliff-lighthouse (2x2, cliff lighthouse) | 23 |
| blue-headscarf (2x2, blue headscarf) FLAGGED: don't use |  |
| pink-lotus (2x2, pink lotus) | 27, 125, 248 |
| yellow-raincoat (2x2, yellow raincoat) FLAGGED: don't use |  |
| blue-bicycle (2x2, blue bicycle) | 220 |
| mount-fuji (2x2, mount fuji) FLAGGED: don't use |  |
| ice-cream (2x2, ice cream) | 3, 30, 188, 298 |
| paper-balloon (2x2, paper balloon) | 1, 150, 263 |
| ginger-cat (2x2, ginger cat) | 6, 29, 187 |
| golden-puppy (2x2, golden puppy) | 4, 146, 262 |
| chestnut-horse (2x2, chestnut horse) | 10, 139, 257 |
| orchid (2x2, orchid) | 5, 147, 262 |
| calla-lilies (2x2, calla lilies) | 12, 30, 188, 297 |
| irises (2x2, irises) | 189 |
| protea (2x2, protea) | 10, 123, 247 |
| monstera (2x2, monstera) | 9, 30, 198 |
| dahlia (2x2, dahlia) | 10, 179, 273 |
| bird-of-paradise (2x2, bird of paradise) | 8, 29, 187, 297 |
| magnolia (2x2, magnolia) | 243 |
| bonsai (2x2, bonsai) | 7, 178, 275 |
| toadstools (2x2, toadstools) | 13, 179, 274 |
| watermelon (2x2, watermelon) | 5, 150, 264 |
| cappuccino (2x2, cappuccino) | 87, 152, 214 |
| pancakes (2x2, pancakes) | 28, 134, 288 |
| doughnut (2x2, doughnut) | 9, 140, 289 |
| pineapple (2x2, pineapple) | 13, 130, 251 |
| delft-teapot (2x2, delft teapot) | 9, 129, 252 |
| ramen (2x2, ramen) | 13, 180, 277 |
| pizza (2x2, pizza) | 227 |
| gramophone (2x2, gramophone) | 7, 137, 255 |
| violin (2x2, violin) | 13, 179, 275 |
| armchair (2x2, armchair) | 8, 148, 263 |
| rubber-duck (2x2, rubber duck) | 12, 28, 187, 296 |
| teddy-bear (2x2, teddy bear) | 5, 128, 250 |
| camper-van (2x2, camper van) | 6, 29, 187, 296 |
| steam-train (2x2, steam train) | 30 |
| classic-car (2x2, classic car) | 13, 29, 188 |
| biplane (2x2, biplane) | 7, 198, 299 |
| cable-car (2x2, cable car) | 12, 143, 259 |
| suitcase (2x2, suitcase) | 167, 290 |
| rickshaw (2x2, rickshaw) | 10, 28, 187, 297 |
| paper-parasol (2x2, paper parasol) | 13, 30 |
| eiffel-tower (2x2, eiffel tower) FLAGGED: don't use |  |
| golden-gate (2x2, golden gate) FLAGGED: don't use |  |
| colosseum (2x2, colosseum) FLAGGED: don't use |  |
| leaning-tower (2x2, leaning tower) FLAGGED: don't use |  |
| taj-mahal (2x2, taj mahal) FLAGGED: don't use |  |
| tree-house (2x2, tree house) | 219 |
| yellow-door (2x2, yellow door) | 6, 28 |
| red-barn (2x2, red barn) | 3, 29 |
| moai (2x2, moai) FLAGGED: don't use |  |
| eagle-figurehead (2x2, eagle figurehead) | 198, 284 |
| palm-island (2x2, palm island) | 151, 211 |
| sandstone-arch (2x2, sandstone arch) | 8, 29 |
| iceberg (2x2, iceberg) | 30 |
| baobab (2x2, baobab) | 29 |
| redwoods (2x2, redwoods) | 7, 130, 251 |
| rainbow (2x2, rainbow) | 10, 179, 275 |
| sandcastle (2x2, sandcastle) | 204, 296 |
| chef (2x2, chef) FLAGGED: don't use |  |
| ballerina (2x2, ballerina) | 225 |
| red-kite (2x2, red kite) | 9, 131, 253 |
| cowboy (2x2, cowboy) FLAGGED: don't use |  |
| painter (2x2, painter) FLAGGED: don't use |  |
| bubbles (2x2, bubbles) FLAGGED: don't use |  |
| saxophonist (2x2, saxophonist) | 4, 28, 185, 296 |
| skier (2x2, skier) | 3, 129, 250 |
| owl (2x2, owl) | 7, 133 |
| macaw (2x2, macaw) | 187 |
| giraffe (1x2, giraffe) | 21, 126, 261 |
| milkshake (1x2, milkshake) | 21, 216 |
| sunflower (1x2, sunflower) | 21, 186 |
| skyscraper (1x2, skyscraper) | 21 |
| flamenco (1x2, flamenco) | 11, 201 |
| pagoda (1x2, pagoda) | 11 |
| ribbon-falls (1x2, ribbon falls) | 21 |
| canal-house (1x2, canal house) | 11, 141 |
| ice-lolly (1x2, ice lolly) | 11, 201 |
| lily-window (1x2, lily window) | 21, 141, 276 |
| guitar (1x2, guitar) | 11, 171, 291 |
| grand-piano (2x1, grand piano) | 21, 186 |
| sewing-machine (2x1, sewing machine) | 21, 186 |
| tractor (2x1, tractor) | 11, 171, 291 |
| canoe (2x1, canoe) | 21, 186 |
| hammock (2x1, hammock) | 11, 171 |
| wheelbarrow (2x1, wheelbarrow) | 21, 141, 276 |
| rocking-horse (2x1, rocking horse) | 11 |
| paddle-steamer (2x1, paddle steamer) | 171 |
| dachshund (2x1, dachshund) | 171, 291 |
| sidecar (2x1, sidecar) | 21, 171, 291 |
| houseboat (2x1, houseboat) | 11, 126 |
| wok-chef (2x2, wok chef) | 5, 178, 274 |
| fence-cowboy (2x2, fence cowboy) |  |
| plein-air (2x2, plein air) FLAGGED: don't use |  |
| apple-ladder (2x2, apple ladder) |  |
| lobster-pot (2x2, lobster pot) | 2, 125, 247 |
| dandelion-wish (2x2, dandelion wish) | 195, 282 |
| carrot-harvest (2x2, carrot harvest) |  |
| towpath-cyclist (2x3, towpath cyclist) |  |
| book-reader (2x2, book reader) | 2, 178, 274 |
| passion-flower (2x2, passion flower) | 17, 134, 254 |
| hibiscus (2x2, hibiscus) | 240 |
| sweet-peas (2x2, sweet peas) | 22, 182, 278 |
| ranunculus (2x2, ranunculus) | 26, 148, 262 |
| thistle (2x2, thistle) | 25, 183, 279 |
| cornflowers (2x2, cornflowers) | 18, 134, 254 |
| echeveria (2x2, echeveria) | 24, 182, 279 |
| flytrap (2x2, flytrap) | 18 |
| allium (2x2, allium) | 10, 179, 274 |
| chrysanthemum (2x2, chrysanthemum) | 22, 150, 262 |
| fuchsia (2x2, fuchsia) | 15, 180, 275 |
| lupins (2x2, lupins) | 22, 140 |
| clematis (2x2, clematis) | 168, 266 |
| pansy (2x2, pansy) | 24, 130, 251 |
| fiddlehead (2x2, fiddlehead) | 20, 144, 259 |
| ginkgo (2x2, ginkgo) | 19, 180, 277 |
| terrarium (2x2, terrarium) | 154 |
| amaryllis (2x2, amaryllis) | 12, 28, 185, 285 |
| camellia-plate (2x2, camellia plate) FLAGGED: don't use |  |
| sushi (2x2, sushi) | 24, 148, 262 |
| croissant (2x2, croissant) | 212 |
| avocado (2x2, avocado) | 25, 168, 269 |
| burger (2x2, burger) | 22, 181, 275 |
| pretzel (2x2, pretzel) | 190, 278 |
| jelly (2x2, jelly) | 161, 290 |
| egg-cup (2x2, egg cup) | 19, 143, 258 |
| hot-chocolate (2x2, hot chocolate) | 25, 133, 254 |
| majolica-jug (2x2, majolica jug) | 27, 184, 280 |
| desk-globe (2x2, desk globe) | 25, 183, 292 |
| roller-skate (2x2, roller skate) | 238 |
| mussels (2x2, mussels) | 228 |
| corn-cob (2x2, corn cob) | 191, 278 |
| chillies (2x2, chillies) | 15, 30, 189, 299 |
| nesting-dolls (2x2, nesting dolls) | 18, 121, 247 |
| tin-robot (2x2, tin robot) | 20, 181, 277 |
| accordion (2x2, accordion) | 15, 150, 264 |
| trumpet (2x2, trumpet) | 27, 128, 250 |
| origami-crane (2x2, origami crane) | 160, 264 |
| bento (2x2, bento) | 222 |
| volcano (2x2, volcano) | 17, 143 |
| aurora (2x2, aurora) | 20, 138 |
| geyser (2x2, geyser) | 18 |
| rock-pool (2x2, rock pool) | 210 |
| basalt-columns (2x2, basalt columns) | 16 |
| karst-peaks (2x2, karst peaks) |  |
| matterhorn (2x2, matterhorn) FLAGGED: don't use |  |
| pebble-cairn (2x2, pebble cairn) | 5, 179, 275 |
| oak-acorns (2x2, oak acorns) | 26, 183, 281 |
| thunderstorm (2x2, thunderstorm) | 27, 168, 269 |
| harvest-moon (2x2, harvest moon) | 158, 264 |
| birches (2x2, birches) | 16, 142, 257 |
| amethyst (2x2, amethyst) | 26, 145, 260 |
| bamboo (2x2, bamboo) | 24, 198, 298 |
| sea-stack (2x2, sea stack) | 26 |
| crystal-cave (2x2, crystal cave) | 190 |
| rope-bridge (2x2, rope bridge) | 16, 180, 277 |
| standing-stones (2x2, standing stones) | 123 |
| beekeeper (2x2, beekeeper) | 17, 149, 264 |
| cellist (2x2, cellist) FLAGGED: don't use |  |
| glassblower (2x2, glassblower) |  |
| baker (2x2, baker) FLAGGED: don't use |  |
| surfer (2x2, surfer) | 25, 184, 281 |
| knitting (2x2, knitting) | 17, 140, 258 |
| climber (2x2, climber) | 16, 180, 275 |
| tyre-swing (2x2, tyre swing) | 25, 183, 293 |
| blacksmith (2x2, blacksmith) | 18, 132, 288 |
| hiker (2x2, hiker) | 24, 183, 278 |
| juggler (2x2, juggler) | 25, 150, 264 |
| fly-fisher (2x2, fly fisher) |  |
| tennis-player (2x2, tennis player) | 19, 181, 277 |
| washing-line (2x2, washing line) FLAGGED: don't use |  |
| airship (2x2, airship) | 14, 132, 253 |
| skateboard (2x2, skateboard) | 17, 180, 278 |
| double-decker (2x2, double decker) | 64, 211 |
| tugboat (2x2, tugboat) | 14, 135, 255 |
| junk-boat (2x2, junk boat) | 27, 184, 280 |
| ocean-liner (2x2, ocean liner) | 20, 181, 277 |
| galleon (2x2, galleon) | 230 |
| campfire (2x2, campfire) | 19, 138, 256 |
| fire-engine (2x2, fire engine) | 15, 30, 187, 298 |
| penny-farthing (2x2, penny farthing) | 24, 149, 263 |
| longtail-boat (2x2, longtail boat) | 217 |
| seaplane (2x2, seaplane) | 19, 125, 247 |
| bullet-train (2x2, bullet train) | 20, 144, 258 |
| safari-truck (2x2, safari truck) | 20, 127, 249 |
| bow-top-wagon (2x2, bow top wagon) | 18, 199, 298 |
| binoculars (2x2, binoculars) | 24, 241 |
| speedboat (2x2, speedboat) | 23, 136, 255 |
| pier (2x2, pier) | 226 |
| roller-coaster (2x2, roller coaster) | 19, 122, 244 |
| tent (2x2, tent) | 23, 182, 278 |
| castle (2x2, castle) |  |
| igloo (2x2, igloo) | 27, 184, 280 |
| pyramids (2x2, pyramids) FLAGGED: don't use |  |
| greek-temple (2x2, greek temple) | 25, 121, 245 |
| torii (2x2, torii) FLAGGED: don't use |  |
| yurt (2x2, yurt) | 154, 289 |
| covered-bridge (2x2, covered bridge) | 25, 144 |
| moon-gate (2x2, moon gate) | 23, 132, 253 |
| lifeguard-tower (2x2, lifeguard tower) | 22, 182, 280 |
| half-timbered (2x2, half timbered) | 15, 146 |
| stepwell (2x2, stepwell) | 215 |
| circus-tent (2x2, circus tent) | 22, 130, 252 |
| observatory (2x2, observatory) | 27, 137, 255 |
| adobe (2x2, adobe) | 23, 177, 273 |
| petra (2x2, petra) |  |
| stave-church (2x2, stave church) | 180 |
| watermill (2x2, watermill) | 38 |
| bandstand (2x2, bandstand) | 14, 29, 187, 296 |
| fox (2x2, fox) | 20, 127, 250 |
| hedgehog (2x2, hedgehog) | 220 |
| flamingo (2x2, flamingo) | 26 |
| panda (2x2, panda) | 151, 211 |
| tortoise (2x2, tortoise) | 44, 190, 285 |
| peacock (2x2, peacock) |  |
| cow-nose (2x2, cow nose) | 181, 270 |
| rabbit (2x2, rabbit) | 22 |
| koala (2x2, koala) | 16, 123, 247 |
| penguin (2x2, penguin) | 14, 123 |
| chameleon (2x2, chameleon) | 14, 150, 263 |
| rooster (2x2, rooster) | 27, 135, 254 |
| heron (1x2, heron) | 36, 186 |
| hollyhocks (1x2, hollyhocks) | 186 |
| whale (2x1, whale) |  |
| otter (2x1, otter) | 186 |
| marigolds (2x2, marigolds) | 151, 259 |
| bleeding-heart (2x2, bleeding heart) | 234 |
| gerbera (2x2, gerbera) | 49, 133, 253 |
| forget-me-nots (2x2, forget me nots) | 238 |
| snowdrops (2x2, snowdrops) | 39, 58, 203 |
| bluebells (2x2, bluebells) | 52, 193, 295 |
| plum-blossom (2x2, plum blossom) | 33, 53, 195, 300 |
| carnation (2x2, carnation) | 208 |
| zinnia (2x2, zinnia) | 159, 196, 296 |
| cosmos (2x2, cosmos) | 37, 53, 195, 300 |
| morning-glory (2x2, morning glory) FLAGGED: don't use |  |
| air-plant (2x2, air plant) | 119, 137, 288 |
| frangipani (2x2, frangipani) | 50, 191, 294 |
| edelweiss (2x2, edelweiss) | 134, 286 |
| crocus (2x2, crocus) FLAGGED: don't use |  |
| hyacinth (2x2, hyacinth) | 32, 53, 195, 299 |
| bougainvillea (2x2, bougainvillea) | 37, 53, 199 |
| lily-of-the-valley (2x2, lily of the valley) | 45, 139, 256 |
| pitcher-plant (2x2, pitcher plant) | 196, 293 |
| anthurium (2x2, anthurium) FLAGGED: don't use |  |
| prickly-pear (2x2, prickly pear) | 43, 166, 268 |
| coneflower (2x2, coneflower) | 39, 57, 203 |
| nasturtiums (2x2, nasturtiums) | 153, 289 |
| snapdragons (2x2, snapdragons) FLAGGED: don't use |  |
| columbine (2x2, columbine) | 31, 60, 206 |
| kangaroo-paw (2x2, kangaroo paw) | 59, 131, 252 |
| cyclamen (2x2, cyclamen) | 50, 140, 257 |
| banksia (2x2, banksia) | 48, 131, 251 |
| sea-holly (2x2, sea holly) | 59, 143, 258 |
| black-eyed-susans (2x2, black eyed susans) | 175, 268 |
| delphinium (1x2, delphinium) | 51, 141, 276 |
| gladiolus (1x2, gladiolus) | 36, 246 |
| window-geraniums (2x1, window geraniums) | 36, 186 |
| dumplings (2x2, dumplings) | 135, 248 |
| tacos (2x2, tacos) | 38, 60, 204 |
| churros (2x2, churros) | 43, 190, 285 |
| honey-jar (2x2, honey jar) | 42, 60, 205 |
| strawberry-basket (2x2, strawberry basket) | 44, 139, 256 |
| blueberries (2x2, blueberries) | 31, 59, 204 |
| peaches (2x2, peaches) | 47, 199 |
| kiwi-slices (2x2, kiwi slices) | 41, 57, 202 |
| blooming-tea (2x2, blooming tea) | 147, 288 |
| smoothie-bowl (2x2, smoothie bowl) | 40, 58, 203 |
| popcorn (2x2, popcorn) | 33, 185, 282 |
| cotton-candy (2x2, cotton candy) | 45, 190, 294 |
| waffles (2x2, waffles) | 33, 53, 195, 300 |
| apple-pie (2x2, apple pie) | 35, 173, 270 |
| bananas (2x2, bananas) |  |
| mango (2x2, mango) | 44, 191, 294 |
| coconut (2x2, coconut) | 57, 194, 285 |
| dragon-fruit (2x2, dragon fruit) | 45, 122, 247 |
| artichokes (2x2, artichokes) | 48, 192, 294 |
| chanterelles (2x2, chanterelles) | 157, 289 |
| garlic (2x2, garlic) | 50, 192 |
| vine-tomatoes (2x2, vine tomatoes) | 41, 189, 285 |
| lychees (2x2, lychees) | 49, 199, 297 |
| bubble-tea (2x2, bubble tea) | 47, 172, 272 |
| matcha (2x2, matcha) | 52, 193, 295 |
| lollipops (2x2, lollipops) | 34, 133, 255 |
| chocolate-truffles (2x2, chocolate truffles) | 161, 265 |
| hourglass (2x2, hourglass) | 40, 55, 200 |
| vintage-radio (2x2, vintage radio) | 39, 56, 202 |
| rotary-phone (2x2, rotary phone) | 45, 191, 285 |
| music-box (2x2, music box) | 38, 57, 202 |
| kaleidoscope (2x2, kaleidoscope) | 35, 54, 195, 300 |
| paper-fan (2x2, paper fan) | 43, 199, 299 |
| yarn-balls (2x2, yarn balls) | 221 |
| spinning-top (2x2, spinning top) | 39, 122, 286 |
| parfait (1x2, parfait) | 51, 126, 276 |
| kebab-skewer (2x1, kebab skewer) | 51, 201 |
| baguette-sandwich (2x1, baguette sandwich) | 126, 261 |
| lone-tree (2x2, lone tree) | 48, 124 |
| frozen-lake (2x2, frozen lake) | 46, 128, 250 |
| mangrove-roots (2x2, mangrove roots) | 43, 132, 253 |
| oasis (2x2, oasis) | 53 |
| hot-spring (2x2, hot spring) | 135, 249 |
| tide-flats (2x2, tide flats) | 46, 142 |
| mossy-boulders (2x2, mossy boulders) | 34, 53 |
| weeping-willow (2x2, weeping willow) | 34, 184, 281 |
| rainbow-eucalyptus (2x2, rainbow eucalyptus) | 38, 185, 282 |
| dragon-tree (2x2, dragon tree) | 32, 60, 205 |
| rapeseed-fields (2x2, rapeseed fields) | 43, 136, 255 |
| black-sand-beach (2x2, black sand beach) | 48, 125, 249 |
| sandbar (2x2, sandbar) | 31, 129 |
| giant-lily-pads (2x2, giant lily pads) | 211 |
| frosted-web (2x2, frosted web) | 40, 124, 247 |
| autumn-leaves-water (2x2, autumn leaves water) | 41, 127, 249 |
| snowy-fence (2x2, snowy fence) | 32, 57, 202 |
| seashells (2x2, seashells) | 234 |
| scarecrow (2x2, scarecrow) | 45, 124, 248 |
| braided-river (2x2, braided river) | 242 |
| larch-forest (2x2, larch forest) | 37, 143, 259 |
| heather-moor (2x2, heather moor) | 47, 134, 288 |
| snowflake (2x2, snowflake) | 35, 56, 203 |
| cranberry-bog (2x2, cranberry bog) | 188 |
| pine-cone (2x2, pine cone) | 57, 194, 294 |
| shipwreck (2x2, shipwreck) | 42, 59, 204 |
| frozen-bubble (2x2, frozen bubble) | 33, 56 |
| stepping-stones (2x2, stepping stones) | 223 |
| dewdrops (2x2, dewdrops) | 196, 282 |
| rowboat-lake (2x2, rowboat lake) | 143 |
| glowing-waves (2x2, glowing waves) | 37, 54, 195 |
| icy-berries (2x2, icy berries) | 52, 178, 273 |
| snowy-pine (1x2, snowy pine) | 36, 201 |
| hay-bales (2x1, hay bales) | 51, 141, 276 |
| tea-pourer (2x2, tea pourer) | 35, 172, 270 |
| candle-maker (2x2, candle maker) | 41, 149, 263 |
| florist (2x2, florist) FLAGGED: don't use |  |
| cobbler (2x2, cobbler) | 47, 191, 285 |
| violin-maker (2x2, violin maker) FLAGGED: don't use |  |
| tailor (2x2, tailor) | 149 |
| pizzaiolo (2x2, pizzaiolo) | 43, 58, 204 |
| watering-garden (2x2, watering garden) |  |
| rope-sailor (2x2, rope sailor) |  |
| woodcarver (2x2, woodcarver) | 47, 139, 256 |
| shepherd-lambs (2x2, shepherd lambs) | 48 |
| fruit-seller (2x2, fruit seller) | 213 |
| feeding-ducks (2x2, feeding ducks) | 41, 121, 244 |
| pier-fishing (2x2, pier fishing) |  |
| high-diver (2x2, high diver) | 176 |
| taiko (2x2, taiko) | 35, 54, 200 |
| lumberjack (2x2, lumberjack) | 32, 145, 260 |
| weaver (2x2, weaver) FLAGGED: don't use |  |
| pastry-chef (2x2, pastry chef) | 35, 55, 200 |
| photographer (2x2, photographer) |  |
| paper-boat (2x2, paper boat) | 49, 130, 250 |
| snowboarder (2x2, snowboarder) | 46, 136, 256 |
| swimmer (2x2, swimmer) | 40, 132, 254 |
| chess-move (2x2, chess move) | 44, 145, 260 |
| harpist (2x2, harpist) | 56, 193, 295 |
| double-bass (2x2, double bass) | 40, 55, 200 |
| lantern-maker (2x2, lantern maker) |  |
| mountain-biker (2x2, mountain biker) | 44, 189, 284 |
| stilt-walker (1x2, stilt walker) | 51, 201 |
| pole-vaulter (1x2, pole vaulter) FLAGGED: don't use |  |
| rower-scull (2x1, rower scull) FLAGGED: don't use |  |
| brass-compass (2x2, brass compass) | 50, 192, 294 |
| helicopter (2x2, helicopter) | 52, 128, 249 |
| hovercraft (2x2, hovercraft) | 37, 56, 202 |
| submarine (2x2, submarine) | 41, 60, 205 |
| jet-ski (2x2, jet ski) | 34, 145, 260 |
| kick-scooter (2x2, kick scooter) | 147, 288 |
| tandem (2x2, tandem) | 32, 138, 255 |
| river-raft (2x2, river raft) | 184 |
| swan-pedalo (2x2, swan pedalo) | 42, 144, 259 |
| ferris-wheel (2x2, ferris wheel) | 39, 188, 283 |
| carousel-horse (2x2, carousel horse) | 60 |
| harbour-buoy (2x2, harbour buoy) | 46, 140, 256 |
| ships-wheel (2x2, ships wheel) | 33, 55, 202 |
| life-ring (2x2, life ring) | 46, 190, 285 |
| deck-chair (2x2, deck chair) | 48, 127, 249 |
| camping-lantern (2x2, camping lantern) | 40, 124, 245 |
| hiking-boots (2x2, hiking boots) | 37, 55, 200 |
| backpack (2x2, backpack) | 49, 148, 262 |
| chairlift (2x2, chairlift) | 38, 54, 151, 226 |
| icebreaker (2x2, icebreaker) | 52, 193, 295 |
| container-ship (2x2, container ship) | 152, 258 |
| combine (2x2, combine) | 48, 174, 270 |
| ice-cream-van (2x2, ice cream van) | 198, 282 |
| food-truck (2x2, food truck) | 49, 147, 260 |
| teardrop-caravan (2x2, teardrop caravan) | 38, 55, 200 |
| dhow (2x2, dhow) | 50, 148 |
| catamaran (2x2, catamaran) | 48, 142, 258 |
| snowmobile (2x2, snowmobile) | 230 |
| monster-truck (2x2, monster truck) | 37, 54, 195, 299 |
| unicycle (2x2, unicycle) | 45, 136, 255 |
| propeller-plane (2x2, propeller plane) | 34, 54, 195, 300 |
| dog-sled (2x2, dog sled) FLAGGED: don't use |  |
| hot-air-balloon (1x2, hot air balloon) | 51, 201 |
| vintage-motorcycle (2x1, vintage motorcycle) | 36, 201 |
| racing-car (2x1, racing car) | 51, 216 |
| horse-carriage (2x1, horse carriage) | 51, 201 |
| dovecote (2x2, dovecote) | 140, 287 |
| spiral-staircase (2x2, spiral staircase) | 39, 54, 194, 300 |
| grain-silos (2x2, grain silos) | 42, 189, 283 |
| geodesic-dome (2x2, geodesic dome) | 50, 123, 245 |
| stilt-house (2x2, stilt house) | 60, 146 |
| fire-lookout (2x2, fire lookout) | 42, 133, 253 |
| drawbridge (2x2, drawbridge) | 52, 144, 259 |
| viaduct (2x2, viaduct) | 38, 54 |
| chimney-pots (2x2, chimney pots) | 209 |
| library-shelves (2x2, library shelves) | 195 |
| garden-fountain (2x2, garden fountain) | 101, 166, 267 |
| a-frame-cabin (2x2, a frame cabin) | 42, 189, 285 |
| shepherds-hut (2x2, shepherds hut) | 129, 144, 259 |
| turf-house (2x2, turf house) | 14, 180 |
| abbey-arch (2x2, abbey arch) | 50, 150, 265 |
| teahouse (2x2, teahouse) | 49, 145, 260 |
| boathouse (2x2, red waterside) | 34 |
| palace-window (2x2, palace window) | 169 |
| skylight (2x2, skylight) | 47, 190, 284 |
| round-tower (2x2, round tower) | 32, 55, 195 |
| potting-shed (2x2, potting shed) | 43, 58, 203 |
| mailbox (2x2, mailbox) | 32, 58, 202 |
| hedge-maze (2x2, hedge maze) | 288 |
| theatre-stage (2x2, theatre stage) | 40, 59, 204 |
| fishing-shack (2x2, red waterside) | 39, 54 |
| birdhouse (2x2, birdhouse) | 38, 55, 195, 300 |
| red-cabin (2x2, red waterside) | 41, 58 |
| lido (2x2, lido) | 71, 206 |
| rondavel (2x2, rondavel) | 46, 138, 255 |
| porch-rocker (2x2, porch rocker) | 235 |
| lamppost-snow (1x2, lamppost snow) | 36, 201 |
| water-tower (1x2, water tower) | 36, 186 |
| thatched-cottage (2x1, thatched cottage) | 36, 126 |
| conservatory (2x1, conservatory) | 51, 126 |
| toucan (2x2, toucan) | 49, 192, 285 |
| red-panda (2x2, red panda) | 35, 56, 200 |
| sloth (2x2, sloth) | 35, 185 |
| puffin (2x2, puffin) |  |
| polar-bear (2x2, polar bear) | 45 |
| hummingbird (2x2, hummingbird) | 228 |
| octopus (2x2, octopus) | 42, 189, 284 |
| axolotl (2x2, axolotl) | 130, 245 |
| tree-frog (2x2, tree frog) | 33, 53, 194, 300 |
| ladybird (2x2, ladybird) | 50, 192, 285 |
| bumblebee (2x2, bumblebee) | 45, 135, 255 |
| monarch (2x2, monarch) | 158, 263 |
| snail (2x2, snail) | 40, 56, 200 |
| goldfish (2x2, goldfish) | 35, 128, 250 |
| sea-turtle (2x2, sea turtle) | 45, 190, 284 |
| lamb (2x2, lamb) | 48 |
| alpaca (2x2, alpaca) | 40, 139, 256 |
| highland-cow (2x2, highland cow) | 57 |
| piglet (2x2, piglet) | 44, 142, 257 |
| ducklings (2x2, ducklings) | 43, 137, 257 |
| kingfisher (2x2, kingfisher) | 32, 52, 194, 299 |
| robin (2x2, robin) | 31, 58, 204 |
| swan (2x2, swan) | 34, 59, 204 |
| zebra (2x2, zebra) | 45, 125, 286 |
| baby-elephant (2x2, baby elephant) | 55 |
| tiger (2x2, tiger) | 42, 59, 205 |
| raccoon (2x2, raccoon) | 44, 60, 203 |
| squirrel (2x2, squirrel) | 50, 129, 250 |
| dalmatian (2x2, dalmatian) | 52, 199, 298 |
| meerkat (1x2, meerkat) |  |
| seahorse (1x2, seahorse) | 51, 216 |
| ostrich (1x2, ostrich) | 36 |
| crocodile (2x1, crocodile) | 51 |
| sleeping-lion (2x1, sleeping lion) | 36, 186 |
| foxgloves (1x2, foxgloves) | 81, 231 |
| jacaranda (2x1, jacaranda) | 81, 156, 231 |
| strawflowers (2x2, strawflowers) | 79, 212 |
| dogwood (2x2, dogwood) | 64, 79, 214 |
| azaleas (2x2, azaleas) | 63, 84, 219 |
| primroses (2x2, primroses) | 67, 82, 215 |
| poinsettia (2x2, poinsettia) | 72, 153, 265 |
| heliconia (2x2, heliconia) FLAGGED: don't use |  |
| gardenia (2x2, gardenia) | 65, 166, 268 |
| freesias (2x2, freesias) | 164, 266 |
| tiger-lily (2x2, tiger lily) | 68, 83, 220 |
| love-in-a-mist (2x2, love in a mist) | 74, 207 |
| scabious (2x2, scabious) FLAGGED: don't use |  |
| sweet-violets (2x2, sweet violets) FLAGGED: don't use |  |
| petunias (2x2, petunias) | 63, 80, 170, 292 |
| begonias (2x2, begonias) | 68, 203, 299 |
| bromeliad (2x2, bromeliad) | 63, 84, 221 |
| bottlebrush (2x2, bottlebrush) | 77, 210 |
| cockscomb (2x2, cockscomb) | 150, 257 |
| crown-imperial (2x2, crown imperial) | 170, 267 |
| chamomile (2x2, chamomile) | 73, 90, 157, 227 |
| borage (2x2, borage) FLAGGED: don't use |  |
| grape-hyacinths (2x2, blue spikes) | 62, 82, 219 |
| mimosa (2x2, mimosa) | 157 |
| honeysuckle (2x2, honeysuckle) | 78, 212 |
| lantana (2x2, lantana) | 78, 209 |
| salvia (2x2, blue spikes) FLAGGED: don't use |  |
| sundew (2x2, sundew) | 237 |
| clivia (2x2, clivia) | 135, 248 |
| buttercups (2x2, buttercups) | 61, 85, 222 |
| statice (2x2, statice) | 77, 175, 272 |
| cotton-bolls (2x2, cotton bolls) | 75, 207 |
| iceland-poppies (2x2, iceland poppies) | 61, 90, 225 |
| asparagus (1x2, asparagus) | 126, 261 |
| macarons (2x1, macarons) | 81, 156, 231 |
| xylophone (2x1, xylophone) | 66, 216 |
| cinnamon-rolls (2x2, cinnamon rolls) | 183, 273 |
| paella (2x2, paella) | 148 |
| bagels (2x2, bagels) | 80, 213 |
| olives (2x2, olives) | 73, 88, 164, 270 |
| cupcakes (2x2, cupcakes) | 83, 153, 213 |
| jam-jars (2x2, jam jars) | 67, 85, 155, 227 |
| spaghetti (2x2, spaghetti) | 76, 210 |
| tempura (2x2, tempura) | 72, 87, 155, 223 |
| bao-buns (2x2, bao buns) | 62, 170, 269 |
| mochi (2x2, mochi) | 61, 85, 219 |
| persimmons (2x2, persimmons) | 150 |
| blood-oranges (2x2, blood oranges) | 72, 89, 158, 224 |
| pears (2x2, pears) | 76, 208 |
| starfruit (2x2, starfruit) | 78, 210 |
| beetroot (2x2, beetroot) | 215 |
| radishes (2x2, radishes) | 75, 207 |
| pumpkins (2x2, pumpkins) | 207 |
| pea-pod (2x2, pea pod) | 70, 89, 158, 225 |
| cocoa-pod (2x2, cocoa pod) | 136, 250 |
| coffee-beans (2x2, coffee beans) | 69, 84, 154, 226 |
| candy-apples (2x2, candy apples) | 64, 82, 218 |
| gumball-machine (2x2, gumball machine) | 200 |
| gingerbread-men (2x2, gingerbread men) | 72, 207 |
| baklava (2x2, baklava) | 63, 83, 218 |
| empanadas (2x2, empanadas) | 78, 152, 213 |
| ravioli (2x2, ravioli) | 61, 80, 215 |
| scones (2x2, scones) | 67, 87, 220 |
| snow-globe (2x2, snow globe) | 74, 206, 300 |
| ship-in-bottle (2x2, ship in bottle) | 65, 82, 218 |
| ukulele (2x2, ukulele) | 77, 209 |
| jack-in-the-box (2x2, jack in the box) | 68, 84, 168, 274 |
| mortar-pestle (2x2, mortar pestle) | 64, 86, 155, 222 |
| kelp-forest (1x2, kelp forest) | 81, 156, 231 |
| saguaro (1x2, desert cactus) | 66, 216 |
| coral-reef (2x1, coral reef) |  |
| sea-of-clouds (2x1, clouds) | 66, 156, 231 |
| salt-pans (2x2, cracked ground) | 77 |
| vineyard (2x2, vineyard) | 68 |
| rice-paddies (2x2, rice paddies) | 71, 88 |
| cypress-swamp (2x2, cypress swamp) | 65, 85, 154, 227 |
| fern-forest (2x2, green forest) | 60, 195, 295 |
| aspen-grove (2x2, aspen grove) | 82, 213 |
| cracked-earth (2x2, cracked ground) | 64, 89 |
| hoarfrost (2x2, white snow) | 145, 255 |
| termite-mound (2x2, termite mound) | 60, 195, 294 |
| saturn (2x2, space) | 68, 83, 217 |
| nebula (2x2, space) | 79, 213 |
| desert-bloom (2x2, wildflowers) |  |
| wildflower-meadow (2x2, wildflowers) |  |
| rain-window (2x2, rain window) | 225 |
| sunset-clouds (2x2, clouds) | 79, 151, 226 |
| limestone-cave (2x2, limestone cave) | 77 |
| banyan (2x2, banyan) | 77, 209 |
| patchwork-hills (2x2, patchwork hills) | 229 |
| petrified-wood (2x2, petrified wood) | 79 |
| glowing-mushrooms (2x2, glowing mushrooms) | 70, 86, 222 |
| salt-marsh (2x2, salt marsh) | 64, 82, 217 |
| rainforest-canopy (2x2, rainforest canopy) | 146 |
| volcano-island (2x2, volcano island) | 72, 206 |
| orange-grove (2x2, orange grove) | 152 |
| barrel-cacti (2x2, desert cactus) | 219 |
| ski-tracks (2x2, white snow) | 63, 80, 217 |
| sunbeam-forest (2x2, green forest) | 74, 89, 158, 224 |
| zen-garden (2x2, zen garden) | 192, 280 |
| palm-moonrise (2x2, palm moonrise) | 63, 88, 155, 222 |
| pop-sunset (2x2, pop sunset) | 213 |
| windmill (1x2, windmill) | 66 |
| container-house (1x2, container house) | 66, 156, 291 |
| station-roof (2x1, iron glass) | 81, 156, 231 |
| arch-bridge (2x1, arch bridge) | 81, 156, 231 |
| hanok-eaves (2x2, hanok eaves) | 73, 208 |
| gazebo (2x2, gazebo) | 153, 260 |
| pergola (2x2, pergola) | 72, 88, 223 |
| brownstone (2x2, brick city) | 86 |
| fire-escape (2x2, brick city) | 70, 85 |
| barber-pole (2x2, barber pole) | 77, 210 |
| sauna-hut (2x2, sauna hut) | 61, 83, 220 |
| insect-hotel (2x2, insect hotel) | 67, 88, 157, 224 |
| chicken-coop (2x2, chicken coop) | 79, 151, 226 |
| horreo (2x2, horreo) | 73, 205 |
| oast-house (2x2, oast house) | 70, 88, 155, 223 |
| zigzag-bridge (2x2, zigzag bridge) | 76, 208 |
| door-knocker (2x2, door knocker) | 155, 259 |
| weathervane (2x2, weathervane) | 73, 90, 157, 225 |
| blue-shutters (2x2, blue shutters) | 44, 190, 284 |
| iron-gate (2x2, iron gate) | 52, 192, 285 |
| tiled-stairs (2x2, tiled stairs) | 218 |
| glass-arcade (2x2, iron glass) | 198 |
| stone-well (2x2, stone well) | 71, 89, 158, 223 |
| courtyard (2x2, courtyard) | 76, 209 |
| gingerbread-house (2x2, gingerbread house) | 79, 213 |
| dollhouse (2x2, dollhouse) | 145 |
| kasbah (2x2, kasbah) |  |
| glass-cabin (2x2, glass cabin) | 65, 80, 218 |
| glass-dome (2x2, glass dome) | 65, 87, 155, 223 |
| tiny-house (2x2, tiny house) | 75, 208 |
| town-square (2x2, town square) | 212 |
| painted-facade (2x2, painted facade) | 78, 210 |
| tiled-fountain (2x2, tiled fountain) | 75, 207 |
| lattice-window (2x2, lattice window) | 133, 148, 262 |
| jellyfish (1x2, jellyfish) | 66, 171, 291 |
| red-crowned-crane (1x2, red crowned crane) | 66, 216 |
| dolphin (2x1, dolphin) | 81, 156, 231 |
| cheetah (2x1, cheetah) | 66, 291 |
| lynx (2x2, snow cat) | 178, 290 |
| wolf (2x2, wolf) | 68, 86, 222 |
| bison (2x2, bison) | 61, 195 |
| beaver (2x2, beaver) | 69, 84, 220 |
| narwhal (2x2, narwhal) | 73, 88, 155, 223 |
| manta-ray (2x2, manta ray) | 138, 252 |
| clownfish (2x2, clownfish) | 71, 86, 221 |
| walrus (2x2, walrus) | 74, 89, 159, 223 |
| seal-pup (2x2, seal pup) | 70, 87 |
| pelican (2x2, pelican) | 72, 205 |
| cockatoo (2x2, cockatoo) | 62, 195, 297 |
| hoopoe (2x2, hoopoe) | 75, 209 |
| bee-eater (2x2, bee eater) | 75, 208 |
| mandarin-duck (2x2, mandarin duck) | 73, 206, 300 |
| kangaroo (2x2, kangaroo) | 62 |
| quokka (2x2, quokka) | 75 |
| lemur (2x2, lemur) | 74, 90, 159, 224 |
| orangutan (2x2, orangutan) | 64, 80, 215 |
| capybara (2x2, capybara) | 62 |
| okapi (2x2, okapi) | 62, 80, 215 |
| rhino (2x2, rhino) | 78, 210 |
| hippo (2x2, hippo) | 74 |
| snow-leopard (2x2, snow cat) | 71, 90, 157, 225 |
| mountain-goat (2x2, mountain goat) | 63, 82, 217 |
| donkey (2x2, donkey) | 69 |
| hare (2x2, hare) | 79, 212 |
| armadillo (2x2, armadillo) | 68, 176, 272 |
| pangolin (2x2, pangolin) | 68, 85, 221 |
| gecko (2x2, gecko) | 199, 285 |
| blue-morpho (2x2, blue morpho) | 65, 84, 220 |
| corgi (2x2, corgi) | 73, 89, 159, 267 |
| bagpiper (1x2, bagpiper) | 81, 156, 231 |
| window-cleaner (1x2, window cleaner) FLAGGED: don't use |  |
| curler (2x1, curler) | 66, 216 |
| bookbinder (2x2, bookbinder) | 67, 82, 219 |
| printmaker (2x2, printmaker) FLAGGED: don't use |  |
| jeweller (2x2, jeweller) | 71, 206 |
| basket-weaver (2x2, basket weaver) FLAGGED: don't use |  |
| chocolatier (2x2, chocolatier) | 76, 209 |
| barista (2x2, barista) | 62, 85, 221 |
| ice-fisher (2x2, ice fisher) |  |
| dog-walker (2x2, dog walker) |  |
| kite-flyer (2x2, kite flyer) | 79, 154, 265 |
| mail-carrier (2x2, mail carrier) | 64, 83, 218 |
| tap-dancer (2x2, tap dancer) | 65, 202, 300 |
| breakdancer (2x2, breakdancer) FLAGGED: don't use |  |
| gymnast (2x2, gymnast) | 70, 90, 157, 225 |
| archer (2x2, archer) | 78, 212 |
| fencers (2x2, fencers) | 75, 207 |
| paddleboarder (2x2, paddleboarder) | 69, 205 |
| scuba-diver (2x2, scuba diver) FLAGGED: don't use |  |
| sledding (2x2, snow kids) | 69, 86, 222 |
| snowman-builders (2x2, snow kids) | 71, 205 |
| tai-chi (2x2, tai chi) | 74, 90, 160, 269 |
| show-jumper (2x2, show jumper) | 67, 84, 220 |
| cabinetmaker (2x2, cabinetmaker) |  |
| stonemason (2x2, stonemason) |  |
| thatcher (2x2, thatcher) | 68 |
| fishmonger (2x2, fishmonger) | 205 |
| noodle-maker (2x2, noodle maker) | 65, 89, 224 |
| falconer (2x2, falconer) | 173, 266 |
| microscope (2x2, microscope) | 63, 80, 215 |
| quilter (2x2, quilter) FLAGGED: don't use |  |
| puppeteer (2x2, puppeteer) | 70, 90, 157, 225 |
| welder (2x2, welder) | 83, 153, 214 |
| helter-skelter (1x2, helter skelter) | 66, 216 |
| rocket (1x2, rocket) | 66, 216 |
| plane-window (2x1, plane window) | 81, 231 |
| floating-market (2x1, floating market) | 81 |
| glider (2x2, sky plane) | 124, 174, 273 |
| paraglider (2x2, paraglider) | 67, 204, 300 |
| airliner (2x2, sky plane) | 182 |
| lifeboat (2x2, lifeboat) | 76, 209 |
| monorail (2x2, monorail) | 69, 88, 168 |
| handcar (2x2, handcar) | 62, 84, 220 |
| caboose (2x2, red railcar) | 72, 87, 158, 224 |
| picnic-basket (2x2, picnic basket) | 232 |
| snorkel-mask (2x2, snorkel mask) | 189, 293 |
| flip-flops (2x2, flip flops) | 78, 209 |
| cargo-bike (2x2, cargo bike) | 73, 90, 158, 225 |
| toboggan (2x2, toboggan) | 58, 194, 295 |
| snowshoes (2x2, snowshoes) | 70, 86, 221 |
| anchor (2x2, anchor) | 75, 207 |
| dining-car (2x2, dining car) | 151 |
| bumper-cars (2x2, bumper cars) | 179 |
| teacup-ride (2x2, teacup ride) | 70, 211 |
| swing-ride (2x2, swing ride) | 287 |
| water-slide (2x2, water slide) | 80, 153, 214 |
| go-kart (2x2, go kart) | 67, 82, 218 |
| beach-buggy (2x2, beach buggy) | 74, 90, 159, 225 |
| tuk-tuk (2x2, tuk tuk) | 235 |
| parachute (2x2, parachute) | 76, 208 |
| surfboards (2x2, surfboards) | 69, 85, 221 |
| beach-ball (2x2, beach ball) | 123, 177, 292 |
| thermos (2x2, thermos) | 77, 210 |
| rack-railway (2x2, red railcar) | 197, 283 |
| pedal-car (2x2, pedal car) | 70, 85, 222 |
| sleigh (2x2, sleigh) | 62, 83, 218 |
| dragon-boat (2x2, dragon boat) | 181 |
| land-yacht (2x2, land yacht) | 61, 195, 297 |
| sweet-william (2x2, sweet william) FLAGGED: don't use |  |
| flame-lily (2x2, flame lily) | 75, 208 |
| agapanthus (2x2, agapanthus) FLAGGED: don't use |  |
| brioche (2x2, brioche) | 10, 178, 292 |
| pistachios (2x2, pistachios) | 142, 252 |
| kumquats (2x2, kumquats) | 75, 207 |
| abacus (2x2, abacus) | 90, 217 |
| foxtails (2x2, golden wheat) | 50 |
| switchbacks (2x2, switchbacks) | 40 |
| river-meander (2x2, river meander) | 20, 138, 255 |
| carved-door (2x2, carved door) | 90, 217 |
| window-seat (2x2, window seat) | 20, 181, 277 |
| dormer-roof (2x2, dormer roof) | 45, 177, 273 |
| pufferfish (2x2, pufferfish) | 187, 292 |
| dormouse (2x2, dormouse) | 10, 179, 275 |
| tamarin (2x2, tamarin) | 65, 203, 299 |
| farrier (2x2, farrier) | 85, 152, 265 |
| hairdresser (2x2, hairdresser) FLAGGED: don't use |  |
| seedlings (2x2, seedlings) | 60, 194, 294 |
| luggage-trolley (2x2, luggage trolley) | 30, 135, 254 |
| beach-hat (2x2, beach hat) | 90, 166, 219 |
| satchel (2x2, satchel) | 10, 198, 298 |
| fritillary (2x2, fritillary) FLAGGED: don't use |  |
| nerine (2x2, nerine) | 60, 127, 250 |
| rhubarb (2x2, rhubarb) | 125, 175, 290 |
| eclairs (2x2, eclairs) | 182, 290 |
| hazelnuts (2x2, hazelnuts) | 30, 123 |
| sextant (2x2, sextant) | 107, 163, 230 |
| juniper (2x2, juniper) | 90, 152, 265 |
| flax-field (2x2, flax field) | 30, 185, 281 |
| stile (2x2, stile) | 60, 134, 254 |
| clay-oven (2x2, clay oven) | 90, 153, 217 |
| frilled-lizard (2x2, frilled lizard) | 30, 184, 280 |
| stag-beetle (2x2, stag beetle) | 175, 268 |
| wren (2x2, wren) | 60, 146, 289 |
| cooper (2x2, cooper) FLAGGED: don't use |  |
| skipping (2x2, skipping) | 60, 129, 252 |
| moped (2x2, moped) | 30, 137, 255 |
| brugmansia (1x2, brugmansia) | 141, 276 |
| lobelia (2x1, lobelia) | 96, 171, 291 |
| verbena (2x2, verbena) | 93, 119, 242 |
| lisianthus (2x2, lisianthus) | 104, 162, 229 |
| gaillardia (2x2, gaillardia) | 197, 283 |
| ixora (2x2, ixora) | 104, 120, 243 |
| plumbago (2x2, plumbago) | 91, 154, 219 |
| canna (2x2, canna) | 196, 293 |
| stocks (2x2, stocks) | 101, 159, 225 |
| gazania (2x2, gazania) | 108, 164, 267 |
| osteospermum (2x2, osteospermum) FLAGGED: don't use |  |
| echinops (2x2, echinops) | 107, 162, 230 |
| astrantia (2x2, astrantia) | 109, 175, 272 |
| campsis (2x2, campsis) | 101, 119, 242 |
| kniphofia (1x2, kniphofia) | 96, 246 |
| quince-blossom (2x2, quince blossom) | 95, 113, 238 |
| cymbidium (2x2, cymbidium) | 107, 170, 232 |
| waratah (2x2, waratah) | 103, 118, 241 |
| desert-pea (2x2, desert pea) | 98, 166, 268 |
| craspedia (2x2, craspedia) | 104, 160, 229 |
| calendula (2x2, calendula) | 103, 160, 230 |
| meconopsis (2x2, meconopsis) | 105, 161, 229 |
| hemerocallis (2x2, hemerocallis) | 110, 165, 234 |
| moonflower (2x2, moonflower) | 99, 115, 239 |
| jasmine (2x2, jasmine) | 102, 120, 244 |
| oleander (2x2, oleander) | 177, 290 |
| hoya (2x2, hoya) | 93, 112, 238 |
| asters (2x2, asters) | 95, 112, 237 |
| goldenrod (2x2, goldenrod) | 229 |
| armeria (2x2, armeria) | 100, 119, 243 |
| gorse (2x2, gorse) FLAGGED: don't use |  |
| clover (2x2, clover) | 197, 283 |
| aloe-bloom (2x2, aloe bloom) | 98, 114, 240 |
| croquembouche (1x2, croquembouche) | 111, 261 |
| madeleines (2x1, madeleines) | 111, 261 |
| dominoes (2x1, dominoes) | 111, 246 |
| sourdough (2x2, sourdough) | 109, 169, 234 |
| focaccia (2x2, focaccia) | 197, 281 |
| pierogi (2x2, pierogi) | 104, 161, 230 |
| tamales (2x2, tamales) | 105, 160, 230 |
| arepas (2x2, arepas) | 91, 120, 244 |
| pasteis-de-nata (2x2, pasteis de nata) | 100, 159, 225 |
| pavlova (2x2, pavlova) | 91, 215 |
| lamingtons (2x2, lamingtons) | 105, 169, 230 |
| alfajores (2x2, alfajores) | 106, 162, 230 |
| yerba-mate (2x2, yerba mate) | 101, 159, 228 |
| mille-feuille (2x2, mille feuille) | 106, 169, 232 |
| creme-brulee (2x2, creme brulee) | 92, 112, 237 |
| onigiri (2x2, onigiri) | 94, 110, 237 |
| takoyaki (2x2, takoyaki) | 103, 160, 229 |
| dango (2x2, dango) | 97, 113, 177, 280 |
| pho (2x2, pho) | 124, 145, 260 |
| bibimbap (2x2, bibimbap) | 193 |
| nachos (2x2, nachos) | 176, 268 |
| crepes (2x2, crepes) | 105, 172, 229 |
| fudge (2x2, fudge) | 113, 165, 267 |
| liquorice (2x2, liquorice) | 108, 163, 235 |
| papaya (2x2, papaya) | 91, 113, 239 |
| jackfruit (2x2, jackfruit) | 103, 160, 228 |
| rambutan (2x2, rambutan) | 97, 112, 236 |
| gooseberries (2x2, gooseberries) | 105, 120, 241 |
| romanesco (2x2, romanesco) | 95, 114, 240 |
| aubergines (2x2, aubergines) | 92, 110, 236 |
| banjo (2x2, banjo) | 109, 164, 234 |
| magnifying-glass (2x2, magnifying glass) | 106, 163, 229 |
| marbles (2x2, marbles) | 95, 114, 239 |
| inkwell (2x2, inkwell) | 97, 120, 244 |
| lemonade (2x2, lemonade) | 102, 170, 290 |
| jungle-vines (1x2, jungle vines) | 111 |
| gum-trees (1x2, gum trees) | 111, 246 |
| milky-way (2x1, night sky) | 96, 246 |
| alpenglow (2x1, alpenglow) | 96, 201 |
| shooting-stars (2x2, night sky) | 188, 278 |
| eclipse (2x2, space) | 92, 154, 226 |
| jupiter (2x2, space) | 100, 166, 225 |
| moss-carpet (2x2, moss carpet) | 98, 117, 169, 274 |
| beech-woods (2x2, beech woods) |  |
| date-palms (2x2, date palms) | 94, 166, 267 |
| outback-track (2x2, outback) | 98, 116, 165, 271 |
| spinifex (2x2, spinifex) | 103, 160, 228 |
| pampas-grass (2x2, tall grass) | 166 |
| fogbow (2x2, fogbow) | 98, 114, 175, 280 |
| tumbleweed (2x2, tumbleweed) | 94, 175, 271 |
| frosty-meadow (2x2, winter fog) | 99, 118, 241 |
| winter-fog (2x2, winter fog) | 108, 163, 233 |
| driftwood (2x2, driftwood) |  |
| sea-glass (2x2, sea glass) | 197, 282 |
| opal (2x2, gemstone) | 108, 163, 233 |
| malachite (2x2, gemstone) | 115, 174, 235 |
| ammonite (2x2, ammonite) | 118, 172, 270 |
| snow-gums (2x2, gum trees) | 100, 117, 178, 281 |
| bluebonnets (2x2, bluebonnets) FLAGGED: don't use |  |
| ripples (2x2, ripples) | 100, 116, 165, 271 |
| reed-bed (2x2, tall grass) | 217 |
| glowworm-cave (2x2, night sky) | 103, 180, 279 |
| autumn-treetops (2x2, autumn treetops) FLAGGED: don't use |  |
| sunrays (2x2, sunrays) | 97, 114, 239 |
| monsoon-rain (2x2, monsoon rain) | 104, 119, 243 |
| mirage (2x2, outback) | 91, 110, 235 |
| waterspout (2x2, waterspout) | 97, 115, 240 |
| hedgerow (2x2, hedgerow) FLAGGED: don't use |  |
| islet (2x2, islet) | 101, 120 |
| windpump (1x2, windpump) | 111, 246 |
| chandelier (1x2, chandelier) | 96, 246 |
| colonnade (2x1, colonnade) | 96, 246 |
| shophouses (2x1, shophouses) |  |
| queenslander (2x2, verandah) | 197, 284 |
| shearing-shed (2x2, shearing shed) | 100, 115, 239 |
| estancia (2x2, ranch house) | 98, 115, 165, 271 |
| lacework-verandah (2x2, verandah) | 108, 164, 232 |
| rotunda (2x2, rotunda) | 98, 117, 240 |
| bothy (2x2, bothy) | 91, 119, 243 |
| pavilion (2x2, pavilion) | 100, 116 |
| loggia (2x2, loggia) | 95, 116, 240 |
| deco-facade (2x2, deco facade) | 105, 120 |
| lock-gates (2x2, lock gates) | 95, 168, 227 |
| pantry (2x2, pantry) | 110 |
| attic (2x2, attic) | 108, 173, 232 |
| terrazzo (2x2, terrazzo) | 76, 212 |
| oculus (2x2, ceiling) | 112, 165, 235 |
| coffered-ceiling (2x2, ceiling) |  |
| beach-cabana (2x2, beach thatch) | 106, 162, 232 |
| overwater-bungalow (2x2, beach thatch) | 107, 161, 233 |
| beehive-hut (2x2, beehive hut) | 194 |
| white-gables (2x2, white gables) | 92, 120, 244 |
| promenade-shelter (2x2, promenade shelter) | 98, 116, 175, 280 |
| rooftop-garden (2x2, rooftop garden) | 226 |
| rainwater-tank (2x2, rainwater tank) | 116, 170, 270 |
| ranch-gate (2x2, ranch gate) | 110, 167, 235 |
| hacienda (2x2, ranch house) | 95, 113, 238 |
| folly (2x2, rotunda) | 102, 167, 227 |
| inglenook (2x2, inglenook) | 99, 169, 225 |
| grand-stairway (2x2, grand stairway) FLAGGED: don't use |  |
| hammam (2x2, hammam) | 99, 167, 225 |
| boulevard (2x2, boulevard) | 93, 155, 265 |
| metro-station (2x2, metro station) | 91, 154, 265 |
| lyrebird (1x2, lyrebird) | 111, 261 |
| stork (1x2, stork) | 111 |
| condor (2x1, raptor) | 96, 171, 291 |
| dragonfly (2x1, dragonfly) | 111, 246 |
| wombat (2x2, wombat) | 94, 154, 220 |
| echidna (2x2, echidna) | 97, 117, 178, 283 |
| platypus (2x2, platypus) | 107, 163, 267 |
| tasmanian-devil (2x2, tasmanian devil) | 102, 117, 172, 277 |
| emu (2x2, ratite) | 236 |
| cassowary (2x2, ratite) | 105, 120, 243 |
| kookaburra (2x2, kookaburra) | 104, 161, 228 |
| lorikeet (2x2, parrot) | 99, 158, 228 |
| sugar-glider (2x2, sugar glider) | 105, 167, 269 |
| anteater (2x2, anteater) | 109, 173, 270 |
| mara (2x2, mara) | 93, 115, 240 |
| vizcacha (2x2, vizcacha) | 103, 120, 244 |
| tapir (2x2, tapir) | 221 |
| siamese-cat (2x2, siamese cat) | 107, 215 |
| border-collie (2x2, border collie) | 102, 160, 228 |
| poodle (2x2, poodle) | 100, 118, 242 |
| guinea-pig (2x2, guinea pig) | 105, 120, 245 |
| budgies (2x2, parrot) | 130, 149, 264 |
| golden-eagle (2x2, raptor) | 155, 263 |
| scarlet-ibis (2x2, scarlet ibis) | 109, 172, 234 |
| toad (2x2, toad) | 106, 162, 230 |
| fire-salamander (2x2, fire salamander) | 109, 173, 234 |
| iguana (2x2, iguana) | 92, 110, 236 |
| hermit-crab (2x2, hermit crab) | 90 |
| nautilus (2x2, nautilus) | 95, 112, 237 |
| swallowtail (2x2, wings) | 99, 167, 225 |
| atlas-moth (2x2, wings) | 106, 162, 232 |
| fruit-bat (2x2, fruit bat) | 114, 173, 235 |
| gorilla (2x2, gorilla) | 97, 119, 242 |
| badger (2x2, badger) | 103, 118, 243 |
| pixel-pheasant (2x2, pixel pheasant) | 107, 214 |
| tango (1x2, tango) | 96, 246 |
| chimney-sweep (1x2, chimney sweep) | 96, 171 |
| polo-player (2x1, polo player) | 111, 261 |
| gaucho (2x2, gaucho) |  |
| surf-lifesaver (2x2, surf lifesaver) | 120 |
| shearer (2x2, shearer) | 138, 287 |
| asador (2x2, asador) FLAGGED: don't use |  |
| skateboarder (2x2, skating) | 93, 118, 241 |
| rollerskater (2x2, skating) | 196, 283 |
| hula-hoop (2x2, hula hoop) | 140, 253 |
| cheesemaker (2x2, cheesemaker) | 102, 119, 286 |
| pasta-maker (2x2, dough hands) | 107, 170, 270 |
| tortilla-maker (2x2, dough hands) | 109, 164, 233 |
| coffee-roaster (2x2, coffee roaster) | 177, 268 |
| grape-picker (2x2, grape picker) FLAGGED: don't use |  |
| milking (2x2, milking) |  |
| dog-groomer (2x2, dog groomer) |  |
| hockey-player (2x2, hockey player) | 92, 167, 219 |
| sprinter (2x2, sprinter) | 104, 120, 243 |
| golfer (2x2, golfer) |  |
| cricketer (2x2, cricketer) | 110, 174, 235 |
| karate (2x2, karate) | 93, 115, 240 |
| dressmaker (2x2, dressmaker) FLAGGED: don't use |  |
| milliner (2x2, milliner) |  |
| glazier (2x2, glazier) | 193, 293 |
| mosaic-artist (2x2, mosaic artist) |  |
| woodturner (2x2, woodturner) | 97, 114, 239 |
| wheelwright (2x2, wheelwright) | 97, 112, 237 |
| bricklayer (2x2, bricklayer) FLAGGED: don't use |  |
| kite-maker (2x2, kite maker) | 192 |
| toymaker (2x2, toymaker) | 233 |
| beachcomber (2x2, beachcomber) | 101, 160, 266 |
| birdwatcher (2x2, birdwatcher) | 173, 267 |
| cellar-singer (2x2, cellar singer) | 94, 118, 240 |
| zip-line (1x2, zip line) | 111, 261 |
| road-train (2x1, road train) | 96, 171 |
| freight-train (2x1, freight train) | 96, 246 |
| rooftop-tent (2x2, rooftop tent) | 110, 165, 268 |
| ferry (2x2, ferry) | 94, 118, 241 |
| outrigger (2x2, paddle boat) | 202, 295 |
| kayak (2x2, paddle boat) | 94, 169, 269 |
| windsurfer (2x2, sail) | 93, 115, 176, 281 |
| lunar-lander (2x2, spacecraft) | 108, 162, 233 |
| satellite (2x2, spacecraft) | 109, 164, 234 |
| trolleybus (2x2, bus) | 106, 170, 290 |
| vintage-coach (2x2, bus) | 93, 117, 168, 272 |
| bobsleigh (2x2, bobsleigh) | 98, 113, 238 |
| quad-bike (2x2, quad bike) | 172, 266 |
| gyrocopter (2x2, gyrocopter) | 164, 290 |
| microcar (2x2, microcar) | 99, 114, 238 |
| pickup-truck (2x2, pickup truck) | 102, 117, 174, 279 |
| steam-roller (2x2, steam roller) | 196, 283 |
| digger (2x2, construction) | 108, 162, 233 |
| cement-mixer (2x2, construction) | 102, 160, 266 |
| pirate-ship-ride (2x2, pirate ship ride) | 199 |
| log-flume (2x2, log flume) FLAGGED: don't use |  |
| sleeping-bag (2x2, sleeping bag) | 92, 120, 245 |
| camping-stove (2x2, camping stove) | 227 |
| beach-umbrella (2x2, beach umbrella) | 100, 115, 240 |
| bucket-spade (2x2, bucket spade) | 95, 113, 165, 272 |
| jetpack (2x2, jetpack) | 40, 188, 283 |
| trawler (2x2, trawler) | 95, 110, 236 |
| hydrofoil (2x2, hydrofoil) | 99, 116, 172, 278 |
| golf-cart (2x2, golf cart) | 108, 163, 233 |
| dragster (2x2, dragster) | 24, 183, 279 |
| train-set (2x2, train set) | 104, 120, 242 |
| spinnaker (2x2, sail) | 101, 118, 242 |
| tricycle (2x2, tricycle) | 102, 117, 173, 279 |
| drone (2x2, drone) | 105, 168, 232 |
| rose (2x2, rose) | 134, 248 |
| gentian (2x2, gentian) FLAGGED: don't use |  |
| pussy-willow (2x2, pussy willow) | 137, 251 |
| laburnum (1x2, laburnum) | 126, 261 |
| physalis (2x2, physalis) | 139, 254 |
| honesty (2x2, honesty) | 127, 241 |
| coleus (2x2, coleus) | 197, 282 |
| staghorn (2x2, staghorn) | 137, 251 |
| torch-ginger (2x2, torch ginger) | 237 |
| lotus-pod (2x2, lotus pod) | 145, 288 |
| alstroemeria (2x2, alstroemeria) | 143, 255 |
| phlox (2x2, phlox) | 131, 245 |
| penstemon (2x2, foxgloves) | 143 |
| campanula (2x2, bluebells) FLAGGED: don't use |  |
| yarrow (2x2, yarrow) | 227 |
| forsythia (2x1, forsythia) | 126, 261 |
| koeksisters (2x2, koeksisters) | 140, 252 |
| milk-tart (2x2, milk tart) | 130, 245 |
| fish-chips (2x2, fish chips) | 136, 248 |
| victoria-sponge (2x2, victoria sponge) | 130, 286 |
| shortbread (2x2, shortbread) | 125, 175, 272 |
| soda-bread (2x2, soda bread) | 124, 240 |
| welsh-cakes (2x2, welsh cakes) | 123, 176, 274 |
| tiramisu (2x2, tiramisu) | 130, 150, 289 |
| cannoli (2x2, cannoli) | 148, 258 |
| mooncakes (2x2, mooncakes) | 150 |
| falafel (2x2, falafel) | 236 |
| moka-pot (2x2, moka pot) | 138, 287 |
| cuckoo-clock (2x2, cuckoo clock) | 125, 176, 271 |
| typewriter (2x2, typewriter) | 138, 287 |
| leeks (1x2, leeks) | 126, 276 |
| spring-rolls (2x1, spring rolls) | 141, 276 |
| warthog (2x2, warthog) | 132, 248 |
| wild-dog (2x2, wild dog) | 135, 249 |
| bushbaby (2x2, bushbaby) | 163, 290 |
| secretary-bird (2x2, secretary bird) | 124, 168, 269 |
| hornbill (2x2, toucan) | 140, 252 |
| aardvark (2x2, aardvark) | 94, 146, 289 |
| dung-beetle (2x2, dung beetle) FLAGGED: don't use |  |
| weaverbird (2x2, weaverbird) | 135, 150, 264 |
| red-deer (2x2, red deer) | 130, 286 |
| shetland-pony (2x2, shetland pony) | 136 |
| pine-marten (2x2, pine marten) | 135, 150, 264 |
| magpie (2x2, magpie) | 129, 244 |
| maine-coon (2x2, maine coon) | 222 |
| beagle (2x2, beagle) | 132, 247 |
| springbok (1x2, springbok) | 216 |
| orca (2x1, orca) | 216 |
| funicular (1x2, red railcar) | 141, 276 |
| punt (2x2, punt) | 134, 287 |
| hot-rod (2x2, hot rod) | 150, 258 |
| snowcat (2x2, snowcat) | 128, 145, 259 |
| fireboat (2x2, fireboat) | 140, 288 |
| felucca (2x2, sail) | 127, 241 |
| sampan (2x2, sampan) | 137, 251 |
| school-bus (2x2, bus) | 122, 238 |
| bmx (2x2, bmx) | 239 |
| space-shuttle (2x2, rocket) | 131, 286 |
| moon-buggy (2x2, spacecraft) | 139, 251 |
| tow-truck (2x2, tow truck) | 194, 282 |
| car-carrier (2x2, car carrier) | 191 |
| paper-plane (2x2, paper plane) | 240 |
| windsock (2x2, windsock) | 197, 284 |
| cable-ferry (2x1, cable ferry) | 156, 291 |
| quiver-tree (1x2, quiver tree) | 126, 261 |
| ice-cave (2x2, ice cave) | 132, 149, 289 |
| mud-pots (2x2, mud pots) | 163, 266 |
| icicles (2x2, icicles) | 211, 298 |
| cork-oak (2x2, cork oak) | 139 |
| trilobite (2x2, trilobite) | 224 |
| seagrass (2x2, seagrass) | 121, 238 |
| atoll (2x2, atoll) | 162, 265 |
| blowhole (2x2, blowhole) | 146, 256 |
| crevasse (2x2, crevasse) | 134, 286 |
| comet (2x2, space) | 121, 237 |
| mars (2x2, space) | 131, 245 |
| whirlpool (2x2, whirlpool) | 127, 144, 258 |
| cotton-grass (2x2, cotton grass) | 149, 257 |
| jetty (2x2, jetty) | 140, 253 |
| pebble-beach (2x1, pebble beach) | 141, 291 |
| tube-house (1x2, tube house) | 141, 276 |
| windcatcher (2x2, windcatcher) | 129, 147, 262 |
| palapa (2x2, palapa) | 132, 245 |
| market-hall (2x2, sunflower) | 143 |
| porthole (2x2, porthole) | 139, 252 |
| flower-balcony (2x2, window geraniums) | 182 |
| ice-hotel (2x2, igloo) | 228 |
| shell-grotto (2x2, shell grotto) | 206 |
| sundial (2x2, sundial) | 147, 255 |
| sleeping-pods (2x2, sleeping pods) | 150 |
| tree-tent (2x2, tree tent) | 133, 249 |
| log-cabin (2x2, log cabin) | 122 |
| tower-crane (2x2, construction) | 239 |
| signal-box (2x2, signal box) | 183, 271 |
| round-barn (2x2, red barn) | 128 |
| bathing-machine (2x2, bathing machine) | 142, 254 |
| watchmaker (2x2, watchmaker) | 84, 153, 265 |
| mapmaker (2x2, mapmaker) | 125 |
| tile-painter (2x2, tile painter) | 122, 165, 268 |
| lamplighter (2x2, lamplighter) FLAGGED: don't use |  |
| magician (2x2, magician) | 133, 148, 262 |
| trapeze (2x2, trapeze) |  |
| conductor (2x2, conductor) | 226 |
| irish-dancer (2x2, irish dancer) FLAGGED: don't use |  |
| kitesurfer (2x2, kitesurfer) | 123, 176, 273 |
| sandboarder (2x2, sandboarder) | 129, 146, 260 |
| caver (2x2, caver) | 224 |
| oyster-farmer (2x2, oyster farmer) | 147, 255 |
| astronaut (2x2, astronaut) | 128, 144, 260 |
| rugby (2x2, rugby) | 87, 152, 214 |
| hurling (2x2, hurling) | 135, 249 |
| tightrope (2x1, tightrope) | 141, 276 |
| pointillist-promenade (2x2, pointillist promenade, atmospheric) | 42, 300 |
| seaweed-gatherers (2x2, seaweed gatherers, atmospheric) | 142, 257 |
| spice-stalls (2x2, spice stalls, atmospheric) | 18 |
| hanami-picnic (2x2, hanami picnic, atmospheric) | 278 |
| horse-fair (2x2, horse fair, atmospheric) | 97 |
| fireflies-meadow (2x2, fireflies meadow, atmospheric) | 9, 232 |
| dune-fences (2x2, dune fences, atmospheric) | 14, 190 |
| barn-dance (2x2, barn dance, atmospheric) | 137 |
| luzzu-harbour (2x2, luzzu harbour, atmospheric) |  |
| wild-ponies-heath (2x2, wild ponies heath, atmospheric) | 105, 260 |
| village-downpour (2x2, village downpour, atmospheric) | 87, 245 |
| wedding-procession (2x2, wedding procession, atmospheric) | 115, 293 |
| drive-in-cinema (2x2, drive in cinema, atmospheric) | 93, 273 |
| stilt-fishermen (2x2, stilt fishermen, atmospheric) | 76, 155 |
| open-air-dance (2x2, open air dance, atmospheric) | 62, 292 |
| caravanserai (2x2, caravanserai, atmospheric) | 72, 177 |
| cliff-walk (2x2, cliff walk, atmospheric) | 85, 244 |
| sugarcane-harvest (2x2, sugarcane harvest, atmospheric) | 47, 187 |
| sheep-market (2x2, sheep market, atmospheric) | 79, 298 |
| carnival-parade (2x2, carnival parade, atmospheric) | 34 |
| night-train (2x2, night train, atmospheric) | 41, 193 |
| arctic-village (2x2, arctic village, atmospheric) | 118, 265 |
| boat-hauling (2x2, boat hauling, atmospheric) | 100, 237 |
| argan-tree (2x2, argan tree, atmospheric) | 25 |
| fishing-fleet (2x2, fishing fleet, atmospheric) | 184, 240 |
| train-compartment (2x2, train compartment, atmospheric) | 173, 205 |
| maypole-dance (2x2, maypole dance, atmospheric) | 3, 289 |
| murmuration (2x2, murmuration, atmospheric) | 101, 254 |
| misty-pass-road (2x2, misty pass road, atmospheric) | 113, 163 |
| flooded-village (2x2, flooded village, atmospheric) | 133 |
| research-station (2x2, research station, atmospheric) | 40, 207 |
| paddling-children (2x2, paddling children, atmospheric) | 74, 153 |
| salmon-run (2x2, salmon run, atmospheric) | 170, 194 |
| cow-parade (2x2, cow parade, atmospheric) | 52, 285 |
| potato-harvest (2x2, potato harvest, atmospheric) | 179, 203 |
| badlands (2x2, badlands, atmospheric) | 80, 188 |
| apple-press (2x2, apple press, atmospheric) | 143, 297 |
| terrace-breakfast (2x2, terrace breakfast, atmospheric) | 131, 266 |
| mushroom-pickers (2x2, mushroom pickers, atmospheric) | 7, 242 |
| tidal-island (2x2, tidal island, atmospheric) | 112, 243 |
| highland-games (2x2, highland games, atmospheric) | 283, 299 |
| river-horse-bathing (2x2, river horse bathing, atmospheric) | 26, 272 |
| boatyard (2x2, boatyard, atmospheric) | 103, 256 |
| goose-girl (2x2, goose girl, atmospheric) | 148, 247 |
| trajineras (2x2, trajineras, atmospheric) | 281 |
| post-bus (2x2, post bus, atmospheric) | 49, 233 |
| city-view-dusk (2x2, city view dusk, atmospheric) | 277 |
| snowfall-bridge (2x2, snowfall bridge, atmospheric) | 167, 182 |
| dawn-market-wagons (2x2, dawn market wagons, atmospheric) FLAGGED: don't use |  |
| peat-cutting (2x2, peat cutting, atmospheric) | 181, 238 |
| seawall-train (2x2, seawall train, atmospheric) | 71, 228 |
| mokoro-papyrus (2x2, mokoro papyrus, atmospheric) | 174, 264 |
| midsummer-bonfire (2x2, midsummer bonfire, atmospheric) | 132, 221 |
| lake-town-night (2x2, lake town night, atmospheric) | 22, 196 |
| rodeo (2x2, rodeo, atmospheric) | 279 |
| poplar-river (2x2, poplar river, atmospheric) | 160, 175 |
| reed-boats (2x2, reed boats, atmospheric) | 78, 214 |
| flea-market (2x2, flea market, atmospheric) | 149 |
| riverside-picnic (2x2, riverside picnic, atmospheric) | 12, 288 |
| ballet-rehearsal (2x2, ballet rehearsal, atmospheric) | 116, 217 |
| winter-street-dome (2x2, winter street dome, atmospheric) | 70, 185 |
| polder (2x2, polder, atmospheric) | 88, 269 |
| alpine-train (2x2, alpine train, atmospheric) | 77, 218 |
| ghost-town (2x2, ghost town, atmospheric) | 43, 248 |
| fauvist-port (2x2, fauvist port, atmospheric) | 89 |
| sheepdog-trial (2x2, sheepdog trial, atmospheric) | 84, 235 |
| river-shower-boats (2x2, river shower boats, atmospheric) | 50, 206 |
| blossom-orchard (2x2, blossom orchard, atmospheric) | 128, 211 |
| hillside-houses (2x2, hillside houses, atmospheric) | 99 |
| cycle-race (2x2, cycle race, atmospheric) | 120 |
| racehorses (2x2, racehorses, atmospheric) | 67, 161 |
| coast-road-cove (2x2, coast road cove, atmospheric) | 127, 215 |
| river-barges (2x2, river barges, atmospheric) | 58, 262 |
| leg-rowers (2x2, leg rowers, atmospheric) | 20, 151 |
| village-fete (2x2, village fete, atmospheric) | 282 |
| lake-summer-houses (2x2, lake summer houses, atmospheric) | 27, 239 |
| fish-landing (2x2, fish landing, atmospheric) | 106, 294 |
| alpine-pass-mules (2x2, alpine pass mules, atmospheric) | 31, 220 |
| autumn-village (2x2, autumn village, atmospheric) | 98, 195 |
| crows-winter-field (2x2, crows winter field, atmospheric) | 176, 230 |
| hayracks (2x2, hayracks, atmospheric) | 60, 159 |
| pottery-market (2x2, pottery market, atmospheric) | 122 |
| moonlit-bay (2x2, moonlit bay, atmospheric) | 69, 249 |
| midnight-sun (2x2, midnight sun, atmospheric) | 140, 222 |
| full-moon-reeds (2x2, full moon reeds, atmospheric) | 73, 267 |
| fish-market-dutch (2x2, fish market dutch, atmospheric) | 280 |
| petanque (2x2, petanque, atmospheric) | 37, 251 |
| island-market (2x2, island market, atmospheric) | 53 |
| hay-barn-meadow (2x2, hay barn meadow, atmospheric) | 125, 259 |
| cattle-ford (2x2, cattle ford, atmospheric) | 90, 270 |
| willows-misty-river (2x2, willows misty river, atmospheric) | 139, 210 |
| rowing-race-crowd (2x2, rowing race crowd, atmospheric) | 63 |
| hillside-harbour-town (2x2, hillside harbour town, atmospheric) | 92 |
| white-steeple-fall (2x2, white steeple fall, atmospheric) | 104, 199 |
| hill-town-ochre (2x2, hill town ochre, atmospheric) | 136, 225 |
| canyon-river-bend (2x2, canyon river bend, atmospheric) | 46 |
| desert-mesas (2x2, desert mesas, atmospheric) | 33, 152 |
| stormy-swell (2x2, stormy swell, atmospheric) | 55, 241 |
| river-town-bridge (2x2, river town bridge, atmospheric) | 114, 164 |
| rainy-street-night (2x2, rainy street night, atmospheric) | 82 |
| village-pond (2x2, village pond, atmospheric) | 8, 227 |
| night-bridge-lights (2x2, night bridge lights, atmospheric) | 162, 183 |
| winter-village-dusk (2x2, winter village dusk, atmospheric) | 68, 192 |
| autumn-valley-print (2x2, autumn valley print, atmospheric) | 61, 202 |
| city-park-boating (2x2, city park boating, atmospheric) | 135, 287 |
| schooner-harbour (2x2, schooner harbour, atmospheric) | 65 |
| cantilever-nets (2x2, cantilever nets, atmospheric) | 17, 224 |
| clifftop-sheep (2x2, clifftop sheep, atmospheric) | 39, 219 |
| market-square-livestock (2x2, market square livestock, atmospheric) | 284 |
| park-avenue-autumn (2x2, park avenue autumn, atmospheric) | 86, 189 |
| papel-picado-plaza (2x2, papel picado plaza, atmospheric) | 6 |
| steam-cranes-dock (2x2, steam cranes dock, atmospheric) | 56, 286 |
| jungle-river (2x2, jungle river, atmospheric) | 172, 198 |
| cafe-interior (2x2, cafe interior, atmospheric) | 144 |
| lava-moss-field (2x2, lava moss field, atmospheric) | 134, 157 |
| lawn-tennis (2x2, lawn tennis, atmospheric) | 178, 263 |
| river-village-willows (2x2, river village willows, atmospheric) | 32, 253 |
| allotments-summer (2x2, allotments summer, atmospheric) | 119 |
| ochre-sails-lagoon (2x2, ochre sails lagoon, atmospheric) | 23, 208 |
| gondola-lift (2x2, gondola lift, atmospheric) | 75, 191 |
| river-valley (2x2, river valley, atmospheric) | 5, 154 |
| glacial-lake-tents (2x2, glacial lake tents, atmospheric) | 44, 236 |
| fireworks-river (2x2, fireworks river, atmospheric) | 48 |
| narrowboats-towpath (2x2, narrowboats towpath, atmospheric) | 130, 252 |
| layered-hills-dawn (2x2, layered hills dawn, atmospheric) | 13, 234 |
| shrimp-fishers (2x2, shrimp fishers, atmospheric) | 109, 268 |
| savanna-zebras (2x2, savanna zebras, atmospheric) | 150, 258 |
| log-drivers (2x2, log drivers, atmospheric) | 83 |
| arcaded-street (2x2, arcaded street, atmospheric) | 165, 180 |
| andean-terraces (2x2, andean terraces, atmospheric) | 19, 255 |
| rooftops-laundry (2x2, rooftops laundry, atmospheric) | 91, 295 |
| threshing-day (2x2, threshing day, atmospheric) FLAGGED: don't use |  |
| winding-road-hills (2x2, winding road hills, atmospheric) | 121, 271 |
| street-musicians (2x2, street musicians, atmospheric) | 102, 204 |
| autumn-ploughing (2x2, autumn ploughing, atmospheric) | 124, 169 |
| wax-print-market (2x2, wax print market, atmospheric) | 38 |
| promenade-parasols (2x2, promenade parasols, atmospheric) | 146 |
| pergola-lunch (2x2, pergola lunch, atmospheric) | 145 |
| chateau-lake (2x2, chateau lake, atmospheric) | 54, 213 |
| cricket-green (2x2, cricket green, atmospheric) | 129, 226 |
| lakeside-inn (2x2, lakeside inn, atmospheric) | 57, 200 |
| alpine-hut-hikers (2x2, alpine hut hikers, atmospheric) | 45, 275 |
| rocky-cove (2x2, rocky cove, atmospheric) FLAGGED: don't use |  |
| regatta-headland (2x2, regatta headland, atmospheric) | 35, 296 |
| autumn-lake-reflections (2x2, autumn lake reflections, atmospheric) | 28, 274 |
| winter-farmyard (2x2, winter farmyard, atmospheric) | 147, 229 |
| squid-boats-night (2x2, squid boats night, atmospheric) | 4, 158 |
| street-of-steps (2x2, street of steps, atmospheric) | 10, 250 |
| thermal-pools (2x2, thermal pools, atmospheric) | 123, 197 |
| hop-picking (2x2, hop picking, atmospheric) | 16 |
| ink-haircut (2x2, ink haircut) | 17, 211 |
| ink-icing-cake (2x2, ink icing cake) | 49, 191, 285 |
| ink-spaniel (2x2, ink spaniel) | 71, 212 |
| ink-thread-pins (2x2, ink thread pins) | 122, 177, 274 |
| ink-pram (2x2, ink pram) | 20, 180, 292 |
| ink-model-yacht (2x2, ink model yacht) | 109 |
| ink-ironing (2x2, ink ironing) | 112, 169, 235 |
| ink-shoeshine (2x2, ink shoeshine) | 28, 198, 298 |
| ink-bowler (2x2, ink bowler) | 33, 170, 269 |
| ink-waiter (2x2, ink waiter) | 185, 273 |
| ink-badminton (2x2, ink badminton) | 93, 155, 220 |
| ink-puncture (2x2, ink puncture) | 85, 152, 215 |
| ink-cutting-roses (2x2, ink cutting roses) | 9, 179, 275 |
| ink-wallpaper (2x2, ink wallpaper) | 133, 248 |
| ink-projectionist (2x2, ink projectionist) | 232 |
| ink-switchboard (2x2, ink switchboard) | 53, 193, 295 |
| ink-croquet (2x2, ink croquet) | 58, 193 |
| ink-pug (2x2, ink pug) | 117, 176, 236 |
| ink-terrier (2x2, ink terrier) | 47, 191, 285 |
| ink-greyhound (2x2, ink greyhound) | 12, 180, 292 |
| ink-bulldog (2x2, ink bulldog) | 106, 161, 230 |
| ink-hamster (2x2, ink hamster) | 104, 161, 229 |
| ink-woodpecker (2x2, ink woodpecker) | 63, 200, 299 |
| ink-gull (2x2, ink gull) | 99, 167, 225 |
| ink-field-mouse (2x2, ink field mouse) | 77, 210 |
| ink-lobster (2x2, ink lobster) FLAGGED: don't use |  |
| ink-boxing-gloves (2x2, ink boxing gloves) | 23, 183, 279 |
| ink-birdcage (2x2, ink birdcage) | 149, 257 |
| ink-garden-gnome (2x2, ink garden gnome) | 42, 189, 285 |
| ink-perfume (2x2, ink perfume) | 128 |
| ink-handbell (2x2, ink handbell) | 26, 177, 275 |
| ink-pepper-mill (2x2, ink pepper mill) | 39, 199, 298 |
| ink-toy-plane (2x2, ink toy plane) | 44, 190, 285 |
| ink-door-knocker (2x2, ink door knocker) | 147, 255 |
| ink-sundae (2x2, ink sundae) | 37, 185, 293 |
| ink-sardines (2x2, ink sardines) | 55, 193, 296 |
| ink-trifle (2x2, ink trifle) | 69, 174, 272 |
| ink-porridge (2x2, ink porridge) | 125, 174, 271 |
| ink-battenberg (2x2, ink battenberg) | 83, 213 |
| ink-crumpets (2x2, ink crumpets) | 60, 177, 274 |
| ink-crumble (2x2, ink crumble) FLAGGED: don't use |  |
| ink-cauliflower (2x2, ink cauliflower) | 131 |
| ink-raspberries (2x2, ink raspberries) | 115, 175, 273 |
| ink-taxi (2x2, ink taxi) | 87, 153, 265 |
| ink-roadster (2x2, ink roadster) | 31, 184, 280 |
| ink-milk-float (2x2, ink milk float) | 79, 293 |
| ink-soapbox (2x2, ink soapbox) | 101, 172, 270 |
| ink-traction-engine (2x2, ink traction engine) | 142, 253 |
| ink-snowplough (2x2, ink snowplough) | 196, 293 |
| ink-forklift (2x2, ink forklift) | 136, 250 |
| ink-dodgems (2x2, ink dodgems) | 4, 178, 275 |
| ink-pigeons (2x2, ink pigeons) | 88 |
| ink-hydrant (2x2, ink hydrant) | 6, 236 |
| ink-sprinkler (2x2, ink sprinkler) | 95, 295 |
| ink-seesaw (2x2, ink seesaw) | 67, 292 |
| ink-station-master (2x2, ink station master) | 90 |
| ink-level-crossing (2x2, ink level crossing) | 120 |
| ink-fireside (2x2, ink fireside) | 74 |
| ink-kennel (2x2, ink kennel) | 15, 175 |
| ink-bird-table (2x2, ink bird table) | 144 |
| prize-marrow (2x2, prize marrow) | 20, 181, 293 |
| mechanic (2x2, mechanic) | 72, 206 |
| hayfield-farmer (2x2, hayfield farmer) | 211 |
| plaiting-hair (2x2, plaiting hair) | 47, 131, 287 |
| meadow-daydream (2x2, meadow daydream) | 91, 113, 174, 278 |
| wall-balance (2x2, wall balance) | 7, 147, 260 |
| cafe-regular (2x2, cafe regular) | 49, 149, 263 |
| greengrocer (2x2, greengrocer) | 43, 142 |
| orchestra-flautist (2x2, orchestra flautist, atmospheric) | 168, 223 |
| toddler-lift (2x2, toddler lift) | 34, 59, 205 |
| butcher-stall (2x2, butcher stall) | 46, 294 |
| garden-secret (2x2, garden secret) | 30, 185, 279 |
| snowy-lane (2x2, snowy lane) | 198, 284 |
| basketball-dunk (2x2, basketball dunk) | 185, 292 |
| jazz-drummer (2x2, jazz drummer) | 23, 124, 248 |
| kitchen-dance (2x2, kitchen dance) | 55, 150, 263 |
| bus-window (2x2, bus window) | 33, 59 |
| baby-rug (2x2, baby rug) | 38, 60, 205 |
| upholsterer (2x2, upholsterer) | 103 |
| rain-coat (2x2, rain coat) | 75, 208 |
| big-boots (2x2, big boots) | 100, 120, 243 |
| beach-dog (2x2, beach dog) | 78, 210 |
| cartwheel (2x2, cartwheel) | 65, 89, 157, 224 |
| windowsill-peek (2x2, windowsill peek) | 31, 57, 200 |
| football-boot (2x2, football boot) | 92 |
| sculptor (2x2, sculptor) | 94, 113, 239 |
| birthday-tea (2x2, birthday tea) | 223 |
| tree-climb (1x2, tree climb) | 81, 156, 231 |
| vet-puppy (2x2, vet puppy) | 110, 164, 234 |
| hill-roll (2x2, hill roll) FLAGGED: don't use |  |
| hilltop-dusk (2x2, hilltop dusk) | 87, 151, 214 |
| crab-catch (2x2, crab catch) | 50, 192, 295 |
| gondolier (2x2, gondolier) | 19, 150 |
| bartender (2x2, bartender) | 116, 173, 271 |
| armchair-nap (2x2, armchair nap) | 121, 170, 269 |
| crayons (2x2, crayons) | 6, 121, 244 |
| leaf-jump (2x2, leaf jump) | 112, 165, 267 |
| broom-doorway (2x2, broom doorway) | 23, 182, 279 |
| rowing-family (2x1, rowing family) | 36, 186, 201 |
| finish-line (2x2, finish line) | 100, 119 |
| baking-together (2x2, baking together) | 30, 184, 282 |
| cloud-sea (2x2, cloud sea) | 127, 242 |
| family-dinner (2x2, family dinner) | 114 |
| party-lights (2x2, party lights) | 135, 287 |
| sailing-helm (2x2, sailing helm) | 214 |
| bike-shop (2x2, bike shop) | 65, 80, 281 |
| marching-band (2x2, marching band) | 69, 86, 296 |
| beach-twirl (2x2, beach twirl) | 121, 237 |
| rolling-chapatis (2x2, rolling chapatis) | 203 |
| learning-to-ride (2x2, learning to ride) | 15, 180, 277 |
| koi-pair (2x2, koi pair) | 233 |
| french-horn (2x2, french horn) | 214 |
| firefighter (2x2, firefighter) | 159, 289 |
| jukebox (2x2, jukebox) | 169, 266 |
| puffer-fish (2x2, puffer fish) | 174, 196, 297 |
| limes (2x2, limes) | 218 |
| manatee (2x1, manatee) |  |
| black-panther (2x2, black panther) |  |
| toaster (2x2, toaster) |  |
| gumbo (2x2, gumbo) |  |
| pinata (2x2, pinata) |  |
| daruma (2x2, daruma) |  |
| longcase-clock (1x2, longcase clock) |  |
| nouveau-lamp (2x2, nouveau lamp) |  |
| aviator (2x2, aviator) |  |
| backyard-grill (2x2, backyard grill) |  |
| steel-pan (2x2, steel pan) |  |
| chrome-diner (2x2, chrome diner) |  |
| fennec-fox (2x2, fennec fox) |  |
| shoebill (2x2, shoebill) |  |
| mandrill (2x2, mandrill) |  |
| tarsier (2x2, tarsier) |  |
| ibex (2x2, ibex) |  |
| blue-footed-booby (2x2, blue footed booby) |  |
| porcupine (2x2, porcupine) |  |
| musk-ox (2x2, musk ox) |  |
| roadrunner (2x1, roadrunner) |  |
| ocelot (2x2, ocelot) |  |
| jollof-rice (2x2, jollof rice) |  |
| injera (2x2, injera) |  |
| shakshuka (2x2, shakshuka) |  |
| dosa (2x1, dosa) |  |
| ceviche (2x2, ceviche) |  |
| beignets (2x2, beignets) |  |
| poutine (2x2, poutine) |  |
| key-lime-pie (2x2, key lime pie) |  |
| smores (2x2, smores) |  |
| banana-split (2x1, banana split) |  |
| khachapuri (2x2, khachapuri) |  |
| tagine (2x2, tagine) |  |
| borscht (2x2, borscht) |  |
| elote (2x2, elote) |  |
| satay (2x2, satay) |  |
| hummus (2x2, hummus) |  |
| brigadeiros (2x2, brigadeiros) |  |
| poke-bowl (2x2, poke bowl) |  |
| lassi (1x2, lassi) |  |
| french-toast (2x2, french toast) |  |
| raclette (2x2, raclette) |  |
| halva (2x2, halva) |  |
| film-projector (2x2, film projector) |  |
| barometer (1x2, barometer) |  |
| weather-vane (2x2, weather vane) |  |
| yo-yo (2x2, yo yo) |  |
| samovar (2x2, samovar) |  |
| stand-mixer (2x2, stand mixer) |  |
| mirror-ball (2x2, mirror ball) |  |
| boombox (2x2, boombox) |  |
| bongos (2x2, bongos) |  |
| kalimba (2x2, kalimba) |  |
| spinning-wheel (2x2, spinning wheel) |  |
| paint-palette (2x2, paint palette) |  |
| cezve (2x2, cezve) |  |
| cast-iron-skillet (2x2, cast iron skillet) |  |
| garden-gnome (2x2, garden gnome) |  |
| kitchen-scales (2x2, kitchen scales) |  |
| toolbox (2x2, toolbox) |  |
| lunchbox (2x2, lunchbox) |  |
| kimchi-making (2x2, kimchi making) |  |
| soda-fountain (2x2, soda fountain) |  |
| basket-boat (2x2, basket boat) |  |
| luchador (2x2, luchador) |  |
| dj-turntables (2x2, dj turntables) |  |
| ice-sculptor (2x2, ice sculptor) |  |
| figure-skater (2x2, figure skater) |  |
| mime (2x2, mime) |  |
| street-painter (2x2, street painter) |  |
| glasses-optician (2x2, glasses optician) |  |
| lighthouse-keeper (2x2, lighthouse keeper) |  |
| morris-dancer (2x2, morris dancer) |  |
| sumo (2x2, sumo) |  |
| jeepney (2x1, jeepney) |  |
| steamer-trunk (2x2, steamer trunk) |  |
| gas-station (2x2, gas station) |  |
| giant-sequoia (1x2, giant sequoia) |  |
| kakapo (2x2, kakapo) |  |
| quetzal (1x2, quetzal) |  |
| coati (2x2, coati) |  |
| serval (2x2, serval) |  |
| yak (2x2, yak) |  |
| shiba-inu (2x2, shiba inu) |  |
| kiwi-bird (2x2, kiwi bird) |  |
| sea-lion (2x2, sea lion) |  |
| basset-hound (2x2, basset hound) |  |
| kimbap (2x2, kimbap) |  |
| katsu-curry (2x2, katsu curry) |  |
| xiaolongbao (2x2, xiaolongbao) |  |
| banh-mi (2x1, banh mi) |  |
| laksa (2x2, laksa) |  |
| samosas (2x2, samosas) |  |
| gulab-jamun (2x2, gulab jamun) |  |
| simit (2x2, simit) |  |
| kunafa (2x2, kunafa) |  |
| goulash (2x2, goulash) |  |
| sachertorte (2x2, sachertorte) |  |
| croque-monsieur (2x2, croque monsieur) |  |
| tarte-tatin (2x2, tarte tatin) |  |
| tres-leches (2x2, tres leches) |  |
| pupusas (2x2, pupusas) |  |
| feijoada (2x2, feijoada) |  |
| jambalaya (2x2, jambalaya) |  |
| lobster-roll (2x2, lobster roll) |  |
| candy-floss (1x2, candy floss) |  |
| eton-mess (2x2, eton mess) |  |
| semla (2x2, semla) |  |
| suya (2x2, suya) |  |
| armillary-sphere (2x2, armillary sphere) |  |
| butter-churn (2x2, butter churn) |  |
| cake-stand (2x2, cake stand) |  |
| candelabra (2x2, candelabra) |  |
| coffee-grinder (2x2, coffee grinder) |  |
| spectacles (2x2, spectacles) |  |
| gong (2x2, gong) |  |
| harmonica (2x2, harmonica) |  |
| headphones (2x2, headphones) |  |
| jigsaw-puzzle (2x2, jigsaw puzzle) |  |
| padlock (2x2, padlock) |  |
| horseshoe-magnet (2x2, horseshoe magnet) |  |
| microphone (2x2, microphone) |  |
| piggy-bank (2x2, piggy bank) |  |
| paperweight (2x2, paperweight) |  |
| pogo-stick (1x2, pogo stick) |  |
| western-saddle (2x2, western saddle) |  |
| tailor-shears (2x2, tailor shears) |  |
| stethoscope (2x2, stethoscope) |  |
| stopwatch (2x2, stopwatch) |  |
| trophy (2x2, trophy) |  |
| tuba (2x2, tuba) |  |
| washboard (2x2, washboard) |  |
| desk-lamp (2x2, desk lamp) |  |
| electric-fan (2x2, electric fan) |  |
| whistling-kettle (2x2, whistling kettle) |  |
| lava-lamp (2x2, lava lamp) |  |
| light-bulb (2x2, light bulb) |  |
| perfume-bottle (2x2, perfume bottle) |  |
| record-player (2x2, record player) |  |
| toy-soldier (2x2, toy soldier) |  |
| top-hat (2x2, top hat) |  |
| clothes-iron (2x2, clothes iron) |  |
| push-mower (2x1, push mower) |  |
| cowbell (2x2, cowbell) |  |
| bellows (2x2, bellows) |  |
| spice-merchant (2x2, spice merchant) |  |
| shoe-shiner (2x2, shoe shiner) |  |
| beach-yoga (2x2, beach yoga) |  |
| salsa-dancers (2x2, salsa dancers) |  |
| pianist (2x2, pianist) |  |
| one-man-band (2x2, one man band) |  |
| librarian (2x2, librarian) |  |
| dentist (2x2, dentist) |  |
| piano-tuner (2x2, piano tuner) |  |
| ringmaster (2x2, ringmaster) |  |
| synchronised-swimmers (1x2, synchronised swimmers) |  |
| skydiver (2x2, skydiver) |  |
| zookeeper (2x2, zookeeper) |  |
| park-ranger (2x2, park ranger) |  |
| astronomer (2x2, astronomer) |  |
| archaeologist (2x2, archaeologist) |  |
| roofer (2x2, roofer) |  |
| teacher-globe (2x2, teacher globe) |  |
| flight-attendant (2x2, flight attendant) |  |
| simit-seller (2x2, simit seller) |  |
| surf-lifeguard (2x2, surf lifeguard) |  |
| ballroom-dancers (1x2, ballroom dancers) |  |
| train-driver (2x2, train driver) |  |
| geologist (2x2, geologist) |  |
| jianzhi-artist (2x2, jianzhi artist) |  |
| manakish-baker (2x2, manakish baker) | 142 |
| footballer (2x2, footballer) |  |
| coracle (2x2, coracle) |  |
| lowrider (2x1, lowrider) |  |
| bulldozer (2x2, bulldozer) |  |
| stagecoach (2x1, stagecoach) |  |
| autogyro (2x2, autogyro) |  |
| vintage-skis (1x2, vintage skis) |  |
| cooler-box (2x2, cooler box) |  |
| station-wagon (2x1, station wagon) |  |
| tackle-box (2x2, tackle box) |  |
| climbing-gear (2x2, climbing gear) |  |
| sleeper-train (2x2, sleeper train) |  |
| trullo (2x2, trullo) |  |
| longhouse (2x1, longhouse) |  |
| kiosk (2x2, kiosk) |  |
| orangery (2x2, orangery) |  |
| planetarium (2x2, planetarium) |  |
| onsen (2x2, onsen) |  |
| roundhouse (2x2, roundhouse) |  |
| cave-houses (2x2, cave houses) |  |
| watchtower (2x2, watchtower) |  |
| clawfoot-bathtub (2x2, clawfoot bathtub) |  |
| barber-chair (2x2, barber chair) |  |
| breakwater (2x2, breakwater) |  |
| frozen-waterfall (2x2, frozen waterfall) |  |
| bioluminescent-bay (2x2, bioluminescent bay) |  |
| sedan-chair (2x2, sedan chair) |  |
| luggage-porter (2x2, luggage porter) |  |
