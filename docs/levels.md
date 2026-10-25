# The relaxed campaign

What each of the 26 boards asks of the player, axis by axis. Made by
`node tools/levels/make-campaign.mts` from the plan in
`tools/levels/campaign-plan.mts`; every board's winning line is re-proved by
`node tools/levels/check.mts`. Do not edit this table by hand: change the plan
and run the maker. The challenge route is in [challenge.md](challenge.md), the
daily puzzle in [daily.md](daily.md).

- **Role**: the board's place in the sawtooth ([difficulty-curve.md](difficulty-curve.md)): teach, bite (the first hard-for-a-beginner board), build, relief, hard, peak, super (super hard), pace (all long pictures, a change of pace). Every board but hard, peak and super starts safe: no first move or first clear dooms it. Players see a mark on hard and peak boards ("hard") and super ones ("super").
- **Lookalikes**: pictures from the same family (they share colours and subjects).
- **Cards per picture**: the pieces each picture is cut into.
- **Cards (waiting)**: all the board's cards; in brackets, those still in the stacks when it opens (a 4x5 board holds 20, a 4x6 board 24).
- **Shown**: upcoming cards each stack shows (0, card backs, on every board since 2026-10-25).
- **Chain**: the longest run of clears that depend on one another that no winning line avoids (1: every picture can be finished from the opening deal).
- **Careless win**: the chance a player who never plans ahead still wins (always finishing whatever picture is ready, wherever, else drawing from any stack). It never sees a stack's next card: every draw and every place is a blind, even choice.
- **Traps**: steps of the winning line where another choice would make the board unwinnable.
- **Line**: moves in the stored winning line (no undo, hint or shuffle).

| # | role | pictures | lookalikes | cards per picture | shapes | board | cards (waiting) | shown | chain | careless win | traps | line |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | intro | 3 | none | 4 4 4 | 2x2 | 4x4 | 12 (0) | 0 | 1 | 100% | 0 | 7 |
| 2 | intro | 4 | none | 4 4 4 4 | 2x2 | 4x4 | 16 (0) | 0 | 1 | 100% | 0 | 11 |
| 3 | bite | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 3 | 59% | 0 | 26 |
| 4 | relief | 5 | none | 4 4 4 4 4 | 2x2 | 4x4 | 20 (4) | 0 | 2 | 100% | 0 | 18 |
| 5 | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 3 | 72% | 1 | 25 |
| 6 | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 4 | 70% | 0 | 23 |
| 7 | hard (marked hard) | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 4 | 44% | 1 | 26 |
| 8 | relief | 5 | none | 4 4 4 4 4 | 2x2 | 4x4 | 20 (4) | 0 | 2 | 100% | 0 | 15 |
| 9 | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 4 | 67% | 1 | 23 |
| 10 | peak (marked hard) | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 5 | 48% | 1 | 26 |
| 11 | pace | 10 | none | 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 20 (4) | 0 | 2 | 100% | 0 | 13 |
| 12 | build | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 4 | 78% | 0 | 22 |
| 13 | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 3 | 70% | 0 | 25 |
| 14 | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 4 | 69% | 1 | 27 |
| 15 | hard (marked hard) | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 36 (20) | 0 | 4 | 47% | 1 | 24 |
| 16 | relief | 7 | none | 4 4 4 4 4 4 4 | 2x2 | 4x4 | 28 (12) | 0 | 2 | 100% | 0 | 20 |
| 17 | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 3 | 61% | 2 | 27 |
| 18 | build | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 32 (16) | 0 | 3 | 56% | 1 | 21 |
| 19 | build | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 36 (20) | 0 | 4 | 56% | 2 | 30 |
| 20 | super (marked super) | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x4 | 36 (20) | 0 | 3 | 25% | 1 | 33 |
| 21 | pace | 12 | none | 2 2 2 2 2 2 2 2 2 2 2 2 | 1x2 2x1 | 4x4 | 24 (8) | 0 | 2 | 100% | 0 | 13 |
| 22 | build | 9 | none | 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 36 (16) | 0 | 3 | 78% | 0 | 28 |
| 23 | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 72% | 1 | 30 |
| 24 | build | 10 | none | 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 40 (20) | 0 | 5 | 65% | 1 | 26 |
| 25 | hard (marked hard) | 11 | none | 4 4 4 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 44 (24) | 0 | 6 | 41% | 2 | 32 |
| 26 | relief | 8 | none | 4 4 4 4 4 4 4 4 | 2x2 | 4x5 | 32 (12) | 0 | 3 | 100% | 0 | 32 |

Every picture's appearances across the 26 boards: 0 to 1 (mean 0.7). A picture comes back null boards later at the soonest (median null). Every board made since 2026-10-25 keeps the rule: no picture on two of boards 1-13, none back within 15 boards; 0 of 0 returns are sooner than 15, on boards kept from before it.

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
| tiled-house (2x2, sea blue) | 8 |
| fjord-evening (2x2, blue hour) | 7 |
| vintage-camera (2x2, vintage camera) | 1 |
| red-scooter (2x2, red scooter) | 2 |
| sailboat (2x2, sailboat) | 3 |
| cactus-bloom (2x2, cactus bloom) | 3 |
| cliff-lighthouse (2x2, cliff lighthouse) | 2 |
| blue-headscarf (2x2, blue headscarf) FLAGGED: don't use |  |
| pink-lotus (2x2, pink lotus) | 1 |
| yellow-raincoat (2x2, yellow raincoat) FLAGGED: don't use |  |
| blue-bicycle (2x2, blue bicycle) | 3 |
| mount-fuji (2x2, mount fuji) | 3 |
| ice-cream (2x2, ice cream) | 3 |
| paper-balloon (2x2, paper balloon) | 1 |
| ginger-cat (2x2, ginger cat) | 6 |
| golden-puppy (2x2, golden puppy) | 4 |
| chestnut-horse (2x2, chestnut horse) | 10 |
| orchid (2x2, orchid) | 5 |
| calla-lilies (2x2, calla lilies) | 12 |
| irises (2x2, irises) | 13 |
| protea (2x2, protea) | 10 |
| monstera (2x2, monstera) | 9 |
| dahlia (2x2, dahlia) | 10 |
| bird-of-paradise (2x2, bird of paradise) | 8 |
| magnolia (2x2, magnolia) | 5 |
| bonsai (2x2, bonsai) | 7 |
| toadstools (2x2, toadstools) | 13 |
| watermelon (2x2, watermelon) | 5 |
| cappuccino (2x2, cappuccino) | 6 |
| pancakes (2x2, pancakes) | 4 |
| doughnut (2x2, doughnut) | 9 |
| pineapple (2x2, pineapple) | 13 |
| delft-teapot (2x2, delft teapot) | 9 |
| ramen (2x2, ramen) | 13 |
| pizza (2x2, pizza) | 6 |
| gramophone (2x2, gramophone) | 7 |
| violin (2x2, violin) | 13 |
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
| colosseum (2x2, colosseum) | 10 |
| leaning-tower (2x2, leaning tower) | 6 |
| taj-mahal (2x2, taj mahal) | 12 |
| tree-house (2x2, tree house) | 7 |
| yellow-door (2x2, yellow door) | 6 |
| red-barn (2x2, red barn) | 3 |
| moai (2x2, moai) | 12 |
| palm-island (2x2, palm island) | 9 |
| sandstone-arch (2x2, sandstone arch) | 8 |
| iceberg (2x2, iceberg) | 12 |
| baobab (2x2, baobab) | 9 |
| redwoods (2x2, redwoods) | 7 |
| rainbow (2x2, rainbow) | 10 |
| sandcastle (2x2, sandcastle) | 10 |
| chef (2x2, chef) FLAGGED: don't use |  |
| ballerina (2x2, ballerina) | 8 |
| red-kite (2x2, red kite) | 9 |
| cowboy (2x2, cowboy) FLAGGED: don't use |  |
| painter (2x2, painter) FLAGGED: don't use |  |
| bubbles (2x2, bubbles) FLAGGED: don't use |  |
| saxophonist (2x2, saxophonist) | 4 |
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
| paddle-steamer (2x1, paddle steamer) | 11 |
| dachshund (2x1, dachshund) | 21 |
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
| allium (2x2, allium) |  |
| chrysanthemum (2x2, chrysanthemum) | 22 |
| fuchsia (2x2, fuchsia) | 15 |
| lupins (2x2, lupins) | 22 |
| clematis (2x2, clematis) | 26 |
| pansy (2x2, pansy) | 24 |
| fiddlehead (2x2, fiddlehead) | 20 |
| ginkgo (2x2, ginkgo) | 19 |
| terrarium (2x2, terrarium) |  |
| amaryllis (2x2, amaryllis) | 18 |
| camellia-plate (2x2, camellia plate) | 14 |
| sushi (2x2, sushi) | 24 |
| croissant (2x2, croissant) | 25 |
| avocado (2x2, avocado) | 25 |
| burger (2x2, burger) | 22 |
| pretzel (2x2, pretzel) | 9 |
| jelly (2x2, jelly) | 22 |
| egg-cup (2x2, egg cup) | 19 |
| hot-chocolate (2x2, hot chocolate) | 25 |
| majolica-jug (2x2, majolica jug) | 19 |
| desk-globe (2x2, desk globe) | 25 |
| roller-skate (2x2, roller skate) | 23 |
| mussels (2x2, mussels) |  |
| corn-cob (2x2, corn cob) | 15 |
| chillies (2x2, chillies) | 15 |
| nesting-dolls (2x2, nesting dolls) | 18 |
| tin-robot (2x2, tin robot) | 20 |
| accordion (2x2, accordion) | 15 |
| trumpet (2x2, trumpet) |  |
| origami-crane (2x2, origami crane) | 16 |
| bento (2x2, bento) |  |
| volcano (2x2, volcano) | 17 |
| aurora (2x2, aurora) | 20 |
| geyser (2x2, geyser) | 18 |
| rock-pool (2x2, rock pool) |  |
| basalt-columns (2x2, basalt columns) | 16 |
| karst-peaks (2x2, karst peaks) |  |
| matterhorn (2x2, matterhorn) | 17 |
| pebble-cairn (2x2, pebble cairn) | 5 |
| oak-acorns (2x2, oak acorns) | 26 |
| thunderstorm (2x2, thunderstorm) | 23 |
| harvest-moon (2x2, harvest moon) | 20 |
| birches (2x2, birches) | 16 |
| amethyst (2x2, amethyst) | 26 |
| bamboo (2x2, bamboo) | 24 |
| sea-stack (2x2, sea stack) | 26 |
| crystal-cave (2x2, crystal cave) |  |
| rope-bridge (2x2, rope bridge) | 16 |
| standing-stones (2x2, standing stones) | 14 |
| beekeeper (2x2, beekeeper) |  |
| cellist (2x2, cellist) | 24 |
| glassblower (2x2, glassblower) | 23 |
| baker (2x2, baker) | 24 |
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
| junk-boat (2x2, junk boat) |  |
| ocean-liner (2x2, ocean liner) | 20 |
| galleon (2x2, galleon) |  |
| campfire (2x2, campfire) | 19 |
| fire-engine (2x2, fire engine) | 15 |
| penny-farthing (2x2, penny farthing) | 24 |
| longtail-boat (2x2, longtail boat) | 18 |
| seaplane (2x2, seaplane) | 19 |
| bullet-train (2x2, bullet train) | 26 |
| safari-truck (2x2, safari truck) | 20 |
| bow-top-wagon (2x2, bow top wagon) | 18 |
| binoculars (2x2, binoculars) | 24 |
| speedboat (2x2, speedboat) | 23 |
| pier (2x2, pier) | 17 |
| roller-coaster (2x2, roller coaster) | 19 |
| tent (2x2, tent) | 23 |
| castle (2x2, castle) |  |
| igloo (2x2, igloo) | 25 |
| pyramids (2x2, pyramids) | 23 |
| greek-temple (2x2, greek temple) | 25 |
| torii (2x2, torii) | 20 |
| yurt (2x2, yurt) | 19 |
| covered-bridge (2x2, covered bridge) | 16 |
| moon-gate (2x2, moon gate) | 23 |
| lifeguard-tower (2x2, lifeguard tower) | 22 |
| half-timbered (2x2, half timbered) | 15 |
| stepwell (2x2, stepwell) |  |
| circus-tent (2x2, circus tent) | 22 |
| observatory (2x2, observatory) | 22 |
| adobe (2x2, adobe) | 23 |
| petra (2x2, petra) | 25 |
| stave-church (2x2, stave church) |  |
| watermill (2x2, watermill) | 23 |
| bandstand (2x2, bandstand) | 14 |
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
| rooster (2x2, rooster) | 17 |
| heron (1x2, heron) |  |
| hollyhocks (1x2, hollyhocks) |  |
| whale (2x1, whale) |  |
| otter (2x1, otter) |  |
