# The relaxed campaign

What each of the 30 boards asks of the player, axis by axis. Made by
`node tools/levels/make-campaign.mts` from the plan in
`tools/levels/campaign-plan.mts`; every board's winning line is re-proved by
`node tools/levels/check.mts`. Do not edit this table by hand: change the plan
and run the maker. The challenge route is in [challenge.md](challenge.md), the
daily puzzle in [daily.md](daily.md).

- **Lookalikes**: pictures from the same family (they share colours and subjects).
- **Cards per picture**: the pieces each picture is cut into.
- **Cards (waiting)**: all the board's cards; in brackets, those still in the stacks when it opens (a 4x5 board holds 20, a 4x6 board 24).
- **Shown**: upcoming cards each stack shows.
- **Chain**: the longest run of clears that depend on one another that no winning line avoids (1: every picture can be finished from the opening deal).
- **Careless win**: the chance a player who never plans ahead still wins (always finishing whatever picture is ready, wherever).
- **Traps**: steps of the winning line where another choice would make the board unwinnable.
- **Line**: moves in the stored winning line (no undo, hint or shuffle).

| # | role | pictures | lookalikes | cards per picture | shapes | board | cards (waiting) | shown | chain | careless win | traps | line |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | intro | 3 | none | 4 4 4 | 2x2 | 4x4 | 12 (0) | 2 | 1 | 100% | 0 | 7 |
| 2 | intro | 4 | none | 4 4 4 4 | 2x2 | 4x4 | 16 (0) | 2 | 1 | 100% | 0 | 11 |
| 3 | build | 5 | none | 4 4 4 4 4 | 2x2 | 4x4 | 20 (4) | 2 | 2 | 100% | 0 | 14 |
| 4 | build | 5 | none | 4 4 4 4 4 | 2x2 | 4x4 | 20 (4) | 2 | 2 | 100% | 0 | 18 |
| 5 | relief | 5 | none | 4 4 4 4 4 | 2x2 | 4x4 | 20 (4) | 2 | 2 | 100% | 0 | 16 |
| 6 | build | 6 | none | 4 4 4 4 4 4 | 2x2 | 4x4 | 24 (8) | 2 | 3 | 100% | 0 | 20 |
| 7 | demand | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 1 | 3 | 89% | 0 | 19 |
| 8 | relief | 5 | none | 4 4 4 4 4 | 2x2 | 4x4 | 20 (4) | 2 | 2 | 100% | 0 | 15 |
| 9 | build | 6 | none | 4 4 4 4 4 4 | 2x2 | 4x4 | 24 (8) | 1 | 3 | 100% | 0 | 17 |
| 10 | demand | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 1 | 3 | 78% | 1 | 25 |
| 11 | relief | 6 | none | 4 2 2 4 4 4 | 1x2 2x1 2x2 | 4x4 | 20 (4) | 2 | 2 | 100% | 0 | 15 |
| 12 | build | 7 | none | 4 4 2 2 4 4 4 | 1x2 2x1 2x2 | 4x4 | 24 (8) | 1 | 2 | 100% | 0 | 25 |
| 13 | demand | 8 | none | 2 4 2 4 4 4 4 2 | 1x2 2x1 2x2 | 4x4 | 26 (10) | 1 | 4 | 89% | 0 | 20 |
| 14 | relief | 6 | 2 pink bloom | 4 4 4 2 4 4 | 2x1 2x2 | 4x5 | 22 (2) | 2 | 2 | 100% | 0 | 15 |
| 15 | demand | 6 | 3 sea blue | 4 4 9 4 6 6 | 2x2 3x2 3x3 | 4x5 | 33 (13) | 1 | 4 | 75% | 1 | 33 |
| 16 | relief | 6 | 2 pink bloom, 2 golden wheat | 4 6 2 2 6 6 | 1x2 2x1 2x2 2x3 3x2 | 4x5 | 26 (6) | 1 | 2 | 100% | 0 | 15 |
| 17 | build | 7 | 3 lavender, 2 autumn rust | 4 6 2 6 6 2 6 | 1x2 2x2 2x3 3x2 | 4x5 | 32 (12) | 1 | 3 | 79% | 1 | 26 |
| 18 | demand | 7 | 3 warm dusk | 2 4 9 6 4 4 2 | 1x2 2x1 2x2 3x2 3x3 | 4x5 | 31 (11) | 0 | 3 | 67% | 1 | 27 |
| 19 | relief | 6 | 2 lemon yellow | 4 6 2 4 4 6 | 2x1 2x2 2x3 3x2 | 4x5 | 26 (6) | 1 | 2 | 100% | 0 | 21 |
| 20 | demand | 8 | 3 berry red, 2 sea blue | 6 2 4 2 6 2 6 6 | 1x2 2x2 2x3 3x2 | 4x5 | 34 (14) | 1 | 4 | 62% | 1 | 28 |
| 21 | build | 6 | 4 pink bloom | 4 6 6 4 6 6 | 2x2 2x3 3x2 | 4x5 | 32 (12) | 1 | 3 | 78% | 1 | 24 |
| 22 | relief | 7 | 2 lavender, 2 sea blue | 2 4 4 4 4 4 4 | 2x1 2x2 | 4x5 | 26 (6) | 2 | 2 | 100% | 0 | 20 |
| 23 | demand | 7 | 4 blue hour, 2 lemon yellow | 2 2 4 6 9 4 6 | 2x1 2x2 2x3 3x2 3x3 | 4x5 | 33 (13) | 0 | 4 | 67% | 1 | 27 |
| 24 | build | 7 | 3 autumn rust | 4 2 6 6 4 2 6 | 1x2 2x2 2x3 3x2 | 4x5 | 30 (10) | 1 | 3 | 89% | 0 | 27 |
| 25 | demand | 8 | 4 sea blue, 3 warm dusk | 6 2 4 2 6 4 4 6 | 2x1 2x2 2x3 3x2 | 4x5 | 34 (14) | 0 | 4 | 44% | 1 | 35 |
| 26 | relief | 6 | 3 fresh green | 6 2 2 6 4 6 | 1x2 2x2 2x3 3x2 | 4x5 | 26 (6) | 1 | 3 | 100% | 0 | 20 |
| 27 | demand | 8 | 4 lavender, 2 berry red, 2 golden wheat | 4 4 6 4 2 2 6 6 | 1x2 2x2 2x3 3x2 | 4x5 | 34 (14) | 0 | 4 | 54% | 2 | 29 |
| 28 | build | 6 | 4 pink bloom, 2 berry red | 4 6 4 6 6 6 | 2x2 2x3 3x2 | 4x5 | 32 (12) | 1 | 4 | 80% | 1 | 28 |
| 29 | relief | 6 | 3 golden wheat, 3 warm dusk | 2 4 6 4 6 6 | 2x1 2x2 2x3 3x2 | 4x5 | 28 (8) | 1 | 3 | 100% | 0 | 25 |
| 30 | finale | 8 | 4 fresh green, 3 lemon yellow | 6 9 2 4 2 4 4 6 | 1x2 2x2 2x3 3x2 3x3 | 4x5 | 37 (17) | 0 | 5 | 48% | 2 | 38 |

Every picture's appearances across the 30 boards: 0 to 4 (mean 1.2). A picture comes back 2 boards later at the soonest (median 5). Every board made since 2026-10-25 keeps the rule: no picture on two of boards 1-13, none back within 15 boards; 75 of 75 returns are sooner than 15, on boards kept from before it.

| picture | boards |
|---|---|
| dusk-harbour (3x2, warm dusk) | 18, 25, 29 |
| dune-caravan (2x1, warm dusk) | 16, 23, 25 |
| poppy-sunset (2x2, warm dusk) | 18, 24, 29 |
| candle-oranges (2x2, warm dusk) | 18, 25, 29 |
| blossom-lane (2x3, pink bloom) | 16, 21, 28 |
| peony-jug (2x2, pink bloom) | 14, 21, 28 |
| berry-cake (2x2, pink bloom) | 14, 16, 21, 28 |
| rose-hat (2x3, pink bloom) | 21, 28 |
| maple-path (2x3, autumn rust) | 21, 24 |
| harvest-table (3x2, autumn rust) | 17, 24 |
| apple-orchard (2x2, autumn rust) | 14, 19, 24 |
| ivy-lane (1x2, autumn rust) | 17, 20, 26, 30 |
| blue-domes (2x3, sea blue) | 20, 25 |
| wave-coast (3x2, sea blue) | 15, 20, 25 |
| hydrangeas (2x2, sea blue) | 15, 22, 25 |
| net-mender (2x2, sea blue) | 15, 22, 25 |
| wheat-farm (3x2, golden wheat) | 16, 19, 27, 29 |
| bread-table (2x1, golden wheat) | 18, 22, 25, 29 |
| sunflower-vase (1x2, golden wheat) | 17, 20, 27 |
| wheat-walk (2x3, golden wheat) | 16, 24, 29 |
| lavender-rows (3x2, lavender) | 17, 27 |
| wisteria-door (2x3, lavender) | 17, 27 |
| lilac-bouquet (2x2, lavender) | 19, 22, 27 |
| figs-grapes (2x2, lavender) | 17, 22, 27 |
| tea-terraces (3x2, fresh green) | 15, 21, 26, 30 |
| market-greens (2x2, fresh green) | 14, 20, 26, 30 |
| greenhouse (2x2, fresh green) | 18, 22, 30 |
| green-alley (1x2, fresh green) | 16, 24, 26, 30 |
| venice-canal (2x3, blue hour) | 23 |
| lantern-market (3x2, blue hour) | 17, 23, 26 |
| lantern-child (2x2, blue hour) | 15, 23 |
| lake-village (2x1, blue hour) | 14, 19, 23 |
| cherry-bowl (2x2, berry red) | 14, 22, 27 |
| tulip-rows (3x2, berry red) | 20, 28 |
| red-tram (1x2, berry red) | 18, 20, 24, 27 |
| red-umbrella (2x3, berry red) | 20, 28 |
| lemon-coast (3x3, lemon yellow) | 15, 23 |
| lemon-tart (2x2, lemon yellow) | 19, 23, 30 |
| daffodil-meadow (3x3, lemon yellow) | 18, 30 |
| canal-bicycle (2x3, lemon yellow) | 19, 26, 30 |
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
| tiled-house (2x2, sea blue) | 8 |
| fjord-evening (2x2, blue hour) | 7 |
| vintage-camera (2x2, vintage camera) | 1 |
| red-scooter (2x2, red scooter) | 2 |
| sailboat (2x2, sailboat) | 3 |
| cactus-bloom (2x2, cactus bloom) | 3 |
| cliff-lighthouse (2x2, cliff lighthouse) | 2 |
| blue-headscarf (2x2, blue headscarf) | 2 |
| pink-lotus (2x2, pink lotus) | 1 |
| yellow-raincoat (2x2, yellow raincoat) | 2 |
| blue-bicycle (2x2, blue bicycle) | 3 |
| mount-fuji (2x2, mount fuji) | 3 |
| ice-cream (2x2, ice cream) | 3 |
| paper-balloon (2x2, paper balloon) | 1 |
| ginger-cat (2x2, ginger cat) | 6 |
| golden-puppy (2x2, golden puppy) | 4 |
| chestnut-horse (2x2, chestnut horse) | 10 |
| orchid (2x2, orchid) | 5 |
| calla-lilies (2x2, calla lilies) | 11 |
| irises (2x2, irises) | 13 |
| protea (2x2, protea) | 10 |
| monstera (2x2, monstera) | 9 |
| dahlia (2x2, dahlia) | 10 |
| bird-of-paradise (2x2, bird of paradise) | 8 |
| magnolia (2x2, magnolia) | 5 |
| bonsai (2x2, bonsai) | 7 |
| toadstools (2x2, toadstools) |  |
| watermelon (2x2, watermelon) |  |
| cappuccino (2x2, cappuccino) | 6 |
| pancakes (2x2, pancakes) | 4 |
| doughnut (2x2, doughnut) | 9 |
| pineapple (2x2, pineapple) | 13 |
| delft-teapot (2x2, delft teapot) | 9 |
| ramen (2x2, ramen) | 13 |
| pizza (2x2, pizza) |  |
| gramophone (2x2, gramophone) | 7 |
| violin (2x2, violin) | 11 |
| armchair (2x2, armchair) | 8 |
| rubber-duck (2x2, rubber duck) | 12 |
| teddy-bear (2x2, teddy bear) | 5 |
| camper-van (2x2, camper van) | 6 |
| steam-train (2x2, steam train) | 4 |
| classic-car (2x2, classic car) | 13 |
| biplane (2x2, biplane) | 7 |
| cable-car (2x2, cable car) | 12 |
| suitcase (2x2, suitcase) | 5 |
| rickshaw (2x2, rickshaw) | 10 |
| paper-parasol (2x2, paper parasol) | 13 |
| eiffel-tower (2x2, eiffel tower) | 12 |
| golden-gate (2x2, golden gate) | 10 |
| colosseum (2x2, colosseum) |  |
| leaning-tower (2x2, leaning tower) | 6 |
| taj-mahal (2x2, taj mahal) | 12 |
| tree-house (2x2, tree house) |  |
| yellow-door (2x2, yellow door) | 6 |
| red-barn (2x2, red barn) |  |
| moai (2x2, moai) | 11 |
| palm-island (2x2, palm island) | 9 |
| sandstone-arch (2x2, sandstone arch) | 8 |
| iceberg (2x2, iceberg) | 12 |
| baobab (2x2, baobab) | 9 |
| redwoods (2x2, redwoods) | 7 |
| rainbow (2x2, rainbow) | 10 |
| sandcastle (2x2, sandcastle) | 10 |
| chef (2x2, chef) | 5 |
| ballerina (2x2, ballerina) | 8 |
| red-kite (2x2, red kite) | 9 |
| cowboy (2x2, cowboy) | 7 |
| painter (2x2, painter) | 6 |
| bubbles (2x2, bubbles) | 4 |
| saxophonist (2x2, saxophonist) | 4 |
| skier (2x2, skier) |  |
| owl (2x2, owl) | 7 |
| macaw (2x2, macaw) | 11 |
| giraffe (1x2, giraffe) |  |
| milkshake (1x2, milkshake) |  |
| sunflower (1x2, sunflower) |  |
| skyscraper (1x2, skyscraper) |  |
| flamenco (1x2, flamenco) | 13 |
| pagoda (1x2, pagoda) |  |
| ribbon-falls (1x2, ribbon falls) |  |
| canal-house (1x2, canal house) | 13 |
| ice-lolly (1x2, ice lolly) | 12 |
| lily-window (1x2, lily window) |  |
| guitar (1x2, guitar) | 11 |
| grand-piano (2x1, grand piano) |  |
| sewing-machine (2x1, sewing machine) |  |
| tractor (2x1, tractor) | 13 |
| canoe (2x1, canoe) |  |
| hammock (2x1, hammock) | 11 |
| wheelbarrow (2x1, wheelbarrow) |  |
| rocking-horse (2x1, rocking horse) |  |
| paddle-steamer (2x1, paddle steamer) |  |
| dachshund (2x1, dachshund) |  |
| sidecar (2x1, sidecar) |  |
| houseboat (2x1, houseboat) | 12 |
