# The relaxed campaign

What each of the 60 boards asks of the player, axis by axis. Made by
`node tools/levels/make-campaign.mts` from the plan in
`tools/levels/campaign-plan.mts`; every board's winning line is re-proved by
`node tools/levels/check.mts`. Do not edit this table by hand: change the plan
and run the maker. The challenge route is in [challenge.md](challenge.md), the
daily puzzle in [daily.md](daily.md).

- **Destination**: the board's real place (lead, 2026-10-25: the game is a travelogue), a postcard the size of the board of which one window plays as an ordinary picture and unfolds into the whole postcard when finished. It took the place of one of the board's pictures, at the same spot and shape, so the deal and every measure below are as they were. The trips: Travel America (1-15), Japan (16-30), Italy (31-45), American West (46-60).
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
| 3 | Letchworth State Park | bite | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 3 | 59% | 0 | 26 |
| 4 | Lucy the Elephant | relief | 5 | none | 4 4 4 4 4 | 2x2 | 4x4 | 20 (4) | 0 | 2 | 100% | 0 | 18 |
| 5 | Mabry Mill | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 3 | 72% | 1 | 25 |
| 6 | Castillo de San Marcos | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 4 | 70% | 0 | 23 |
| 7 | French Quarter | hard (marked hard) | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 4 | 44% | 1 | 26 |
| 8 | World's Largest Ball of Twine | relief | 5 | none | 4 4 4 4 4 | 2x2 | 4x4 | 20 (4) | 0 | 2 | 100% | 0 | 15 |
| 9 | Paul Bunyan & Babe | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 4 | 67% | 1 | 23 |
| 10 | Pictured Rocks | peak (marked hard) | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 5 | 48% | 1 | 26 |
| 11 | Grand Prismatic Spring | pace | 10 | none | 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 20 (4) | 0 | 2 | 100% | 0 | 13 |
| 12 | Delicate Arch | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 4 | 78% | 0 | 22 |
| 13 | Grand Canyon | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 3 | 70% | 0 | 25 |
| 14 | Yosemite Valley | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 4 | 69% | 1 | 27 |
| 15 | Nā Pali Coast | hard (marked hard) | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 36 (20) | 0 | 4 | 47% | 1 | 24 |
| 16 | Mount Fuji | relief | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 2 | 100% | 0 | 20 |
| 17 | Lucky Cat Temple | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 3 | 61% | 2 | 27 |
| 18 | Great Buddha of Kamakura | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 3 | 56% | 1 | 21 |
| 19 | Snow Monkey Park | build | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 36 (20) | 0 | 4 | 56% | 2 | 30 |
| 20 | Shirakawa-gō | super (marked super) | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 36 (20) | 0 | 3 | 25% | 1 | 33 |
| 21 | Golden Pavilion | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 13 |
| 22 | Fushimi Inari Shrine | build | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 36 (16) | 0 | 3 | 78% | 0 | 28 |
| 23 | Kiyomizu-dera | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 72% | 1 | 30 |
| 24 | Nachi Falls | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 65% | 1 | 26 |
| 25 | Himeji Castle | hard (marked hard) | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 6 | 41% | 2 | 32 |
| 26 | Rabbit Island | relief | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 32 (12) | 0 | 3 | 100% | 0 | 32 |
| 27 | Itsukushima Shrine | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 61% | 0 | 29 |
| 28 | Kintai Bridge | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 58% | 1 | 29 |
| 29 | Takachiho Gorge | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 49% | 2 | 39 |
| 30 | Taketomi Island | super (marked super) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 27% | 1 | 46 |
| 31 | Tre Cime di Lavaredo | relief | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 32 (12) | 0 | 3 | 100% | 0 | 22 |
| 32 | Seceda | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 3 | 60% | 0 | 37 |
| 33 | Lake Como | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 60% | 0 | 31 |
| 34 | Isola Bella | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 3 | 55% | 1 | 33 |
| 35 | Venice | hard (marked hard) | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 33% | 2 | 34 |
| 36 | Cinque Terre | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 14 |
| 37 | Burano | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 56% | 0 | 33 |
| 38 | The Cheese Cathedral | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 60% | 1 | 45 |
| 39 | Val d'Orcia | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 47% | 1 | 33 |
| 40 | Civita di Bagnoregio | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 4 | 39% | 2 | 42 |
| 41 | Monster Park | relief | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 36 (16) | 0 | 4 | 100% | 0 | 28 |
| 42 | Positano | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 58% | 1 | 38 |
| 43 | The Faraglioni | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 48% | 2 | 43 |
| 44 | Matera | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 49% | 3 | 35 |
| 45 | Alberobello | super (marked super) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 6 | 20% | 0 | 43 |
| 46 | Bixby Bridge | relief | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 36 (16) | 0 | 3 | 100% | 0 | 28 |
| 47 | Emerald Bay | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 4 | 63% | 0 | 33 |
| 48 | Mono Lake | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 55% | 2 | 40 |
| 49 | Joshua Tree | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 53% | 1 | 35 |
| 50 | Oatman's Burros | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 6 | 36% | 3 | 41 |
| 51 | Horseshoe Bend | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 13 |
| 52 | Zion Narrows | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 56% | 0 | 42 |
| 53 | Bryce Canyon | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 5 | 47% | 1 | 44 |
| 54 | Valley of Fire | build | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 45% | 3 | 44 |
| 55 | Grand Teton | hard (marked hard) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 6 | 33% | 3 | 48 |
| 56 | Palouse Falls | relief | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 36 (16) | 0 | 4 | 100% | 0 | 28 |
| 57 | Teapot Dome Station | build | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 4 | 49% | 0 | 32 |
| 58 | Painted Hills | build | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 4 | 45% | 1 | 41 |
| 59 | Dog Bark Park Inn | build | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 5 | 41% | 2 | 32 |
| 60 | Crater Lake | super (marked super) | 12 | none | 4 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 48 (28) | 0 | 6 | 17% | 2 | 41 |

Every picture's appearances across the 60 boards: 0 to 2 (mean 1.0). A picture comes back 15 boards later at the soonest (median 19). Every board made since 2026-10-25 keeps the rule: no picture on two of boards 1-13, none back within 15 boards; 0 of 93 returns are sooner than 15, on boards kept from before it.

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
| air-plant (2x2, air plant) | 34 |
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
| coconut (2x2, coconut) | 39, 57 |
| dragon-fruit (2x2, dragon fruit) | 45 |
| artichokes (2x2, artichokes) | 48 |
| chanterelles (2x2, chanterelles) | 33 |
| garlic (2x2, garlic) | 50 |
| vine-tomatoes (2x2, vine tomatoes) | 41 |
| lychees (2x2, lychees) | 49 |
| bubble-tea (2x2, bubble tea) | 47 |
| matcha (2x2, matcha) | 52 |
| lollipops (2x2, lollipops) | 34 |
| chocolate-truffles (2x2, chocolate truffles) | 59 |
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
| cranberry-bog (2x2, cranberry bog) | 54 |
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
| axolotl (2x2, axolotl) | 38, 57 |
| tree-frog (2x2, tree frog) | 33, 53 |
| ladybird (2x2, ladybird) | 50 |
| bumblebee (2x2, bumblebee) | 45 |
| monarch (2x2, monarch) | 42 |
| snail (2x2, snail) | 40, 56 |
| goldfish (2x2, goldfish) | 35 |
| sea-turtle (2x2, sea turtle) | 45 |
| lamb (2x2, lamb) | 48 |
| alpaca (2x2, alpaca) | 40, 58 |
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
