# The challenge route

What each of the 20 challenge boards asks of the player, axis by
axis. Made by `node tools/levels/make-challenge.mts` from the plan in
`tools/levels/challenge-plan.mts`; every board's line is re-proved by
`node tools/levels/check.mts`. Do not edit this table by hand: change the plan
and run the maker. The relaxed campaign is in [levels.md](levels.md).

The route uses the deeper rules on purpose: big pictures that have to wait
while small ones are cleared to make room for them, and clear order that
matters. Each board's par is the fewest moves the solver found (its stored
line); a sharp player may beat it.

- **Board**: columns x rows.
- **Lookalikes, cards per picture, shapes, cards (waiting), shown, chain, careless win**: as in [levels.md](levels.md).
- **Big waits**: how many pictures must be cleared before the longest-waiting big picture (6 or 9 cards) can be finished, on the best line there is.
- **Order traps**: how many times every winning line meets a finished-able picture that must not be finished yet, or not in that place.
- **Par**: moves in the stored line (no undo, hint or shuffle).

| # | role | board | pictures | lookalikes | cards per picture | shapes | cards (waiting) | shown | chain | big waits | order traps | careless win | par |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | intro | 4x5 | 6 | none | 4 4 9 4 4 6 | 2x2 2x3 3x3 | 31 (11) | 0 | 4 | 2 | 1 | 33% | 19 |
| 2 | demand | 4x5 | 6 | 2 lavender | 4 4 4 6 6 6 | 2x2 2x3 3x2 | 30 (10) | 0 | 3 | 2 | 1 | 24% | 21 |
| 3 | relief | 4x5 | 6 | 2 blue hour | 6 6 2 6 4 6 | 2x1 2x2 2x3 3x2 | 30 (10) | 0 | 3 | 2 | 1 | 67% | 19 |
| 4 | demand | 4x5 | 6 | 3 lavender | 4 6 9 2 6 6 | 1x2 2x2 2x3 3x2 3x3 | 33 (13) | 0 | 4 | 3 | 1 | 25% | 19 |
| 5 | demand | 4x5 | 7 | 3 warm dusk, 2 berry red | 4 2 6 6 6 4 6 | 2x1 2x2 2x3 3x2 | 34 (14) | 0 | 4 | 3 | 2 | 12% | 19 |
| 6 | relief | 4x6 | 7 | 2 sea blue | 6 4 4 4 6 6 6 | 2x2 2x3 3x2 | 36 (12) | 0 | 3 | 2 | 1 | 67% | 23 |
| 7 | demand | 4x6 | 7 | 2 warm dusk, 2 berry red | 4 4 6 9 4 6 6 | 2x2 2x3 3x2 3x3 | 39 (15) | 0 | 4 | 3 | 1 | 33% | 26 |
| 8 | demand | 4x6 | 8 | 2 autumn rust | 4 9 2 6 6 6 6 2 | 1x2 2x2 2x3 3x2 3x3 | 41 (17) | 0 | 5 | 4 | 2 | 13% | 29 |
| 9 | relief | 4x6 | 7 | 2 fresh green | 6 6 2 6 2 6 6 | 1x2 2x1 2x3 3x2 | 34 (10) | 0 | 3 | 2 | 1 | 54% | 21 |
| 10 | demand | 4x6 | 8 | 4 berry red, 2 lemon yellow | 4 4 9 4 2 6 6 6 | 1x2 2x2 2x3 3x2 3x3 | 41 (17) | 0 | 5 | 3 | 2 | 22% | 28 |
| 11 | relief | 5x5 | 7 | 2 golden wheat | 2 6 6 6 6 2 6 | 1x2 2x1 2x3 3x2 | 34 (9) | 0 | 3 | 2 | 1 | 60% | 20 |
| 12 | demand | 5x5 | 8 | 3 lemon yellow | 4 9 4 9 4 4 4 4 | 2x2 3x3 | 42 (17) | 0 | 4 | 2 | 1 | 31% | 27 |
| 13 | demand | 5x5 | 9 | 3 golden wheat, 2 autumn rust | 6 2 2 6 6 6 2 6 6 | 1x2 2x1 2x3 3x2 | 42 (17) | 0 | 5 | 4 | 2 | 8% | 26 |
| 14 | relief | 5x5 | 8 | 2 warm dusk, 2 blue hour | 6 6 4 2 2 6 6 6 | 2x1 2x2 2x3 3x2 | 38 (13) | 0 | 3 | 2 | 1 | 50% | 22 |
| 15 | demand | 5x5 | 9 | 4 berry red | 4 4 2 9 2 6 6 6 6 | 1x2 2x2 2x3 3x2 3x3 | 45 (20) | 0 | 5 | 4 | 2 | 8% | 28 |
| 16 | relief | 5x6 | 9 | 2 pink bloom, 2 sea blue | 4 6 4 4 6 4 4 4 6 | 2x2 2x3 | 42 (12) | 0 | 3 | 2 | 1 | 69% | 25 |
| 17 | demand | 5x6 | 10 | 2 lemon yellow, 2 blue hour | 6 9 2 4 2 6 4 6 4 4 | 1x2 2x1 2x2 2x3 3x2 3x3 | 47 (17) | 0 | 5 | 4 | 2 | 13% | 28 |
| 18 | demand | 5x6 | 10 | 4 pink bloom, 3 golden wheat | 4 6 2 4 6 2 6 6 6 6 | 1x2 2x1 2x2 2x3 3x2 | 48 (18) | 0 | 4 | 4 | 2 | 10% | 30 |
| 19 | relief | 5x6 | 9 | 3 lavender | 4 6 2 6 4 4 6 6 6 | 1x2 2x2 2x3 3x2 | 44 (14) | 0 | 4 | 3 | 1 | 60% | 26 |
| 20 | finale | 5x6 | 11 | 3 lemon yellow, 2 warm dusk, 2 fresh green | 6 4 9 2 4 2 9 4 4 4 2 | 1x2 2x1 2x2 2x3 3x3 | 50 (20) | 0 | 5 | 4 | 2 | 8% | 31 |

Every picture's appearances across the route: 0 to 6 (mean 0.6).

| picture | boards |
|---|---|
| dusk-harbour (3x2, warm dusk) | 5, 7, 11, 19 |
| dune-caravan (2x1, warm dusk) | 5, 14, 17 |
| poppy-sunset (2x2, warm dusk) | 5, 16, 20 |
| candle-oranges (2x2, warm dusk) | 1, 7, 14, 20 |
| blossom-lane (2x3, pink bloom) | 3, 9, 13, 18 |
| peony-jug (2x2, pink bloom) | 1, 12, 16, 18 |
| berry-cake (2x2, pink bloom) | 7, 16, 18 |
| rose-hat (2x3, pink bloom) | 2, 8, 11, 14, 18 |
| maple-path (2x3, autumn rust) | 5, 8, 13, 16 |
| harvest-table (3x2, autumn rust) | 3, 9, 11, 13, 17 |
| apple-orchard (2x2, autumn rust) |  |
| ivy-lane (1x2, autumn rust) | 8, 15, 19 |
| blue-domes (2x3, sea blue) | 3, 9, 14, 16 |
| wave-coast (3x2, sea blue) | 4, 10, 13, 18 |
| hydrangeas (2x2, sea blue) | 2, 6, 16 |
| net-mender (2x2, sea blue) | 6, 12, 17, 19 |
| wheat-farm (3x2, golden wheat) | 2, 6, 13, 18 |
| bread-table (2x1, golden wheat) | 3, 11, 13, 18 |
| sunflower-vase (1x2, golden wheat) | 8, 11, 13, 18 |
| wheat-walk (2x3, golden wheat) | 9, 16, 19 |
| lavender-rows (3x2, lavender) | 4, 8, 11, 13, 19 |
| wisteria-door (2x3, lavender) | 4, 6, 14, 19 |
| lilac-bouquet (2x2, lavender) | 2, 7, 16, 19 |
| figs-grapes (2x2, lavender) | 2, 4, 17 |
| tea-terraces (3x2, fresh green) | 2, 9, 15, 18 |
| market-greens (2x2, fresh green) | 1, 12, 16, 20 |
| greenhouse (2x2, fresh green) |  |
| green-alley (1x2, fresh green) | 9, 13, 17, 20 |
| venice-canal (2x3, blue hour) | 3, 6, 11, 15, 18 |
| lantern-market (3x2, blue hour) | 5, 8, 14, 17 |
| lantern-child (2x2, blue hour) | 3, 12, 17 |
| lake-village (2x1, blue hour) | 9, 14, 20 |
| cherry-bowl (2x2, berry red) | 5, 10, 15 |
| tulip-rows (3x2, berry red) | 5, 7, 10, 15, 19 |
| red-tram (1x2, berry red) | 4, 10, 15, 20 |
| red-umbrella (2x3, berry red) | 1, 7, 10, 15 |
| lemon-coast (3x3, lemon yellow) | 4, 7, 10, 12, 15, 20 |
| lemon-tart (2x2, lemon yellow) | 10, 12, 17, 20 |
| daffodil-meadow (3x3, lemon yellow) | 1, 8, 12, 17, 20 |
| canal-bicycle (2x3, lemon yellow) |  |
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
| vintage-camera (2x2, vintage camera) |  |
| red-scooter (2x2, red scooter) |  |
| sailboat (2x2, sailboat) |  |
| cactus-bloom (2x2, cactus bloom) |  |
| cliff-lighthouse (2x2, cliff lighthouse) |  |
| blue-headscarf (2x2, blue headscarf) |  |
| pink-lotus (2x2, pink lotus) |  |
| yellow-raincoat (2x2, yellow raincoat) |  |
| blue-bicycle (2x2, blue bicycle) |  |
| mount-fuji (2x2, mount fuji) |  |
| ice-cream (2x2, ice cream) |  |
| paper-balloon (2x2, paper balloon) |  |
| ginger-cat (2x2, ginger cat) |  |
| golden-puppy (2x2, golden puppy) |  |
| chestnut-horse (2x2, chestnut horse) |  |
| orchid (2x2, orchid) |  |
| calla-lilies (2x2, calla lilies) |  |
| irises (2x2, irises) |  |
| protea (2x2, protea) |  |
| monstera (2x2, monstera) |  |
| dahlia (2x2, dahlia) |  |
| bird-of-paradise (2x2, bird of paradise) |  |
| magnolia (2x2, magnolia) |  |
| bonsai (2x2, bonsai) |  |
| toadstools (2x2, toadstools) |  |
| watermelon (2x2, watermelon) |  |
| cappuccino (2x2, cappuccino) |  |
| pancakes (2x2, pancakes) |  |
| doughnut (2x2, doughnut) |  |
| pineapple (2x2, pineapple) |  |
| delft-teapot (2x2, delft teapot) |  |
| ramen (2x2, ramen) |  |
| pizza (2x2, pizza) |  |
| gramophone (2x2, gramophone) |  |
| violin (2x2, violin) |  |
| armchair (2x2, armchair) |  |
| rubber-duck (2x2, rubber duck) |  |
| teddy-bear (2x2, teddy bear) |  |
| camper-van (2x2, camper van) |  |
| steam-train (2x2, steam train) |  |
| classic-car (2x2, classic car) |  |
| biplane (2x2, biplane) |  |
| cable-car (2x2, cable car) |  |
| suitcase (2x2, suitcase) |  |
| rickshaw (2x2, rickshaw) |  |
| paper-parasol (2x2, paper parasol) |  |
| eiffel-tower (2x2, eiffel tower) |  |
| golden-gate (2x2, golden gate) |  |
| colosseum (2x2, colosseum) |  |
| leaning-tower (2x2, leaning tower) |  |
| taj-mahal (2x2, taj mahal) |  |
| tree-house (2x2, tree house) |  |
| yellow-door (2x2, yellow door) |  |
| red-barn (2x2, red barn) |  |
| moai (2x2, moai) |  |
| palm-island (2x2, palm island) |  |
| sandstone-arch (2x2, sandstone arch) |  |
| iceberg (2x2, iceberg) |  |
| baobab (2x2, baobab) |  |
| redwoods (2x2, redwoods) |  |
| rainbow (2x2, rainbow) |  |
| sandcastle (2x2, sandcastle) |  |
| chef (2x2, chef) |  |
| ballerina (2x2, ballerina) |  |
| red-kite (2x2, red kite) |  |
| cowboy (2x2, cowboy) |  |
| painter (2x2, painter) |  |
| bubbles (2x2, bubbles) |  |
| saxophonist (2x2, saxophonist) |  |
| skier (2x2, skier) |  |
| owl (2x2, owl) |  |
| macaw (2x2, macaw) |  |
| giraffe (1x2, giraffe) |  |
| milkshake (1x2, milkshake) |  |
| sunflower (1x2, sunflower) |  |
| skyscraper (1x2, skyscraper) |  |
| flamenco (1x2, flamenco) |  |
| pagoda (1x2, pagoda) |  |
| ribbon-falls (1x2, ribbon falls) |  |
| canal-house (1x2, canal house) |  |
| ice-lolly (1x2, ice lolly) |  |
| lily-window (1x2, lily window) |  |
| guitar (1x2, guitar) |  |
| grand-piano (2x1, grand piano) |  |
| sewing-machine (2x1, sewing machine) |  |
| tractor (2x1, tractor) |  |
| canoe (2x1, canoe) |  |
| hammock (2x1, hammock) |  |
| wheelbarrow (2x1, wheelbarrow) |  |
| rocking-horse (2x1, rocking horse) |  |
| paddle-steamer (2x1, paddle steamer) |  |
| dachshund (2x1, dachshund) |  |
| sidecar (2x1, sidecar) |  |
| houseboat (2x1, houseboat) |  |
| wok-chef (2x2, wok chef) |  |
| fence-cowboy (2x2, fence cowboy) |  |
| plein-air (2x2, plein air) |  |
| apple-ladder (2x2, apple ladder) | 1, 8, 12, 19 |
| lobster-pot (2x2, lobster pot) |  |
| dandelion-wish (2x2, dandelion wish) |  |
| carrot-harvest (2x2, carrot harvest) | 6, 10, 15, 20 |
| towpath-cyclist (2x3, towpath cyclist) | 6, 14, 17, 20 |
| book-reader (2x2, book reader) |  |
| passion-flower (2x2, passion flower) |  |
| hibiscus (2x2, hibiscus) |  |
| sweet-peas (2x2, sweet peas) |  |
| ranunculus (2x2, ranunculus) |  |
| thistle (2x2, thistle) |  |
| cornflowers (2x2, cornflowers) |  |
| echeveria (2x2, echeveria) |  |
| flytrap (2x2, flytrap) |  |
| allium (2x2, allium) |  |
| chrysanthemum (2x2, chrysanthemum) |  |
| fuchsia (2x2, fuchsia) |  |
| lupins (2x2, lupins) |  |
| clematis (2x2, clematis) |  |
| pansy (2x2, pansy) |  |
| fiddlehead (2x2, fiddlehead) |  |
| ginkgo (2x2, ginkgo) |  |
| terrarium (2x2, terrarium) |  |
| amaryllis (2x2, amaryllis) |  |
| camellia-plate (2x2, camellia plate) |  |
| sushi (2x2, sushi) |  |
| croissant (2x2, croissant) |  |
| avocado (2x2, avocado) |  |
| burger (2x2, burger) |  |
| pretzel (2x2, pretzel) |  |
| jelly (2x2, jelly) |  |
| egg-cup (2x2, egg cup) |  |
| hot-chocolate (2x2, hot chocolate) |  |
| majolica-jug (2x2, majolica jug) |  |
| desk-globe (2x2, desk globe) |  |
| roller-skate (2x2, roller skate) |  |
| mussels (2x2, mussels) |  |
| corn-cob (2x2, corn cob) |  |
| chillies (2x2, chillies) |  |
| nesting-dolls (2x2, nesting dolls) |  |
| tin-robot (2x2, tin robot) |  |
| accordion (2x2, accordion) |  |
| trumpet (2x2, trumpet) |  |
| origami-crane (2x2, origami crane) |  |
| bento (2x2, bento) |  |
| volcano (2x2, volcano) |  |
| aurora (2x2, aurora) |  |
| geyser (2x2, geyser) |  |
| rock-pool (2x2, rock pool) |  |
| basalt-columns (2x2, basalt columns) |  |
| karst-peaks (2x2, karst peaks) |  |
| matterhorn (2x2, matterhorn) |  |
| pebble-cairn (2x2, pebble cairn) |  |
| oak-acorns (2x2, oak acorns) |  |
| thunderstorm (2x2, thunderstorm) |  |
| harvest-moon (2x2, harvest moon) |  |
| birches (2x2, birches) |  |
| amethyst (2x2, amethyst) |  |
| bamboo (2x2, bamboo) |  |
| sea-stack (2x2, sea stack) |  |
| crystal-cave (2x2, crystal cave) |  |
| rope-bridge (2x2, rope bridge) |  |
| standing-stones (2x2, standing stones) |  |
| beekeeper (2x2, beekeeper) |  |
| cellist (2x2, cellist) |  |
| glassblower (2x2, glassblower) |  |
| baker (2x2, baker) |  |
| surfer (2x2, surfer) |  |
| knitting (2x2, knitting) |  |
| climber (2x2, climber) |  |
| tyre-swing (2x2, tyre swing) |  |
| blacksmith (2x2, blacksmith) |  |
| hiker (2x2, hiker) |  |
| juggler (2x2, juggler) |  |
| fly-fisher (2x2, fly fisher) |  |
| tennis-player (2x2, tennis player) |  |
| washing-line (2x2, washing line) |  |
| airship (2x2, airship) |  |
| skateboard (2x2, skateboard) |  |
| double-decker (2x2, double decker) |  |
| tugboat (2x2, tugboat) |  |
| junk-boat (2x2, junk boat) |  |
| ocean-liner (2x2, ocean liner) |  |
| galleon (2x2, galleon) |  |
| campfire (2x2, campfire) |  |
| fire-engine (2x2, fire engine) |  |
| penny-farthing (2x2, penny farthing) |  |
| longtail-boat (2x2, longtail boat) |  |
| seaplane (2x2, seaplane) |  |
| bullet-train (2x2, bullet train) |  |
| safari-truck (2x2, safari truck) |  |
| bow-top-wagon (2x2, bow top wagon) |  |
| binoculars (2x2, binoculars) |  |
| speedboat (2x2, speedboat) |  |
| pier (2x2, pier) |  |
| roller-coaster (2x2, roller coaster) |  |
| tent (2x2, tent) |  |
| castle (2x2, castle) |  |
| igloo (2x2, igloo) |  |
| pyramids (2x2, pyramids) |  |
| greek-temple (2x2, greek temple) |  |
| torii (2x2, torii) |  |
| yurt (2x2, yurt) |  |
| covered-bridge (2x2, covered bridge) |  |
| moon-gate (2x2, moon gate) |  |
| lifeguard-tower (2x2, lifeguard tower) |  |
| half-timbered (2x2, half timbered) |  |
| stepwell (2x2, stepwell) |  |
| circus-tent (2x2, circus tent) |  |
| observatory (2x2, observatory) |  |
| adobe (2x2, adobe) |  |
| petra (2x2, petra) |  |
| stave-church (2x2, stave church) |  |
| watermill (2x2, watermill) |  |
| bandstand (2x2, bandstand) |  |
| fox (2x2, fox) |  |
| hedgehog (2x2, hedgehog) |  |
| flamingo (2x2, flamingo) |  |
| panda (2x2, panda) |  |
| tortoise (2x2, tortoise) |  |
| peacock (2x2, peacock) |  |
| cow-nose (2x2, cow nose) |  |
| rabbit (2x2, rabbit) |  |
| koala (2x2, koala) |  |
| penguin (2x2, penguin) |  |
| chameleon (2x2, chameleon) |  |
| rooster (2x2, rooster) |  |
| heron (1x2, heron) |  |
| hollyhocks (1x2, hollyhocks) |  |
| whale (2x1, whale) |  |
| otter (2x1, otter) |  |
