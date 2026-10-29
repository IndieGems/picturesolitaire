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
| 2 | demand | 4x5 | 6 | none | 4 4 4 6 6 6 | 2x2 2x3 3x2 | 30 (10) | 0 | 3 | 2 | 1 | 24% | 21 |
| 3 | relief | 4x5 | 6 | 2 blue hour | 6 6 2 6 4 6 | 2x1 2x2 2x3 3x2 | 30 (10) | 0 | 3 | 2 | 1 | 67% | 19 |
| 4 | demand | 4x5 | 6 | 3 lavender | 4 6 9 2 6 6 | 1x2 2x2 2x3 3x2 3x3 | 33 (13) | 0 | 4 | 3 | 1 | 25% | 19 |
| 5 | demand | 4x5 | 7 | 3 warm dusk | 4 2 6 6 6 4 6 | 2x1 2x2 2x3 3x2 | 34 (14) | 0 | 4 | 3 | 2 | 12% | 19 |
| 6 | relief | 4x6 | 7 | none | 6 4 4 4 6 6 6 | 2x2 2x3 3x2 | 36 (12) | 0 | 3 | 2 | 1 | 67% | 23 |
| 7 | demand | 4x6 | 7 | 2 warm dusk, 2 berry red | 4 4 6 9 4 6 6 | 2x2 2x3 3x2 3x3 | 39 (15) | 0 | 4 | 3 | 1 | 33% | 26 |
| 8 | demand | 4x6 | 8 | 2 autumn rust | 4 9 2 6 6 6 6 2 | 1x2 2x2 2x3 3x2 3x3 | 41 (17) | 0 | 5 | 4 | 2 | 13% | 29 |
| 9 | relief | 4x6 | 7 | 2 fresh green | 6 6 2 6 2 6 6 | 1x2 2x1 2x3 3x2 | 34 (10) | 0 | 3 | 2 | 1 | 54% | 21 |
| 10 | demand | 4x6 | 8 | 4 berry red | 4 4 9 4 2 6 6 6 | 1x2 2x2 2x3 3x2 3x3 | 41 (17) | 0 | 5 | 3 | 2 | 22% | 28 |
| 11 | relief | 5x5 | 7 | 2 golden wheat | 2 6 6 6 6 2 6 | 1x2 2x1 2x3 3x2 | 34 (9) | 0 | 3 | 2 | 1 | 60% | 20 |
| 12 | demand | 5x5 | 8 | 3 lemon yellow | 4 9 4 9 4 4 4 4 | 2x2 3x3 | 42 (17) | 0 | 4 | 2 | 1 | 31% | 27 |
| 13 | demand | 5x5 | 9 | 3 golden wheat, 2 autumn rust | 6 2 2 6 6 6 2 6 6 | 1x2 2x1 2x3 3x2 | 42 (17) | 0 | 5 | 4 | 2 | 8% | 26 |
| 14 | relief | 5x5 | 8 | 2 warm dusk, 2 blue hour | 6 6 4 2 2 6 6 6 | 2x1 2x2 2x3 3x2 | 38 (13) | 0 | 3 | 2 | 1 | 50% | 22 |
| 15 | demand | 5x5 | 9 | 4 berry red | 4 4 2 9 2 6 6 6 6 | 1x2 2x2 2x3 3x2 3x3 | 45 (20) | 0 | 5 | 4 | 2 | 8% | 28 |
| 16 | relief | 5x6 | 9 | 2 sea blue | 4 6 4 4 6 4 4 4 6 | 2x2 2x3 | 42 (12) | 0 | 3 | 2 | 1 | 69% | 25 |
| 17 | demand | 5x6 | 10 | 2 blue hour | 6 9 2 4 2 6 4 6 4 4 | 1x2 2x1 2x2 2x3 3x2 3x3 | 47 (17) | 0 | 5 | 4 | 2 | 13% | 28 |
| 18 | demand | 5x6 | 10 | 3 pink bloom, 3 golden wheat | 4 6 2 4 6 2 6 6 6 6 | 1x2 2x1 2x2 2x3 3x2 | 48 (18) | 0 | 4 | 4 | 2 | 10% | 30 |
| 19 | relief | 5x6 | 9 | 3 lavender | 4 6 2 6 4 4 6 6 6 | 1x2 2x2 2x3 3x2 | 44 (14) | 0 | 4 | 3 | 1 | 60% | 26 |
| 20 | finale | 5x6 | 11 | 3 lemon yellow | 6 4 9 2 4 2 9 4 4 4 2 | 1x2 2x1 2x2 2x3 3x3 | 50 (20) | 0 | 5 | 4 | 2 | 8% | 31 |

Every picture's appearances across the route: 0 to 6 (mean 0.1).

| picture | boards |
|---|---|
| dusk-harbour (3x2, warm dusk) | 5, 7, 11, 19 |
| dune-caravan (2x1, warm dusk) | 5, 14, 17 |
| poppy-sunset (2x2, warm dusk) | 5 |
| candle-oranges (2x2, warm dusk) | 1, 7, 14 |
| blossom-lane (2x3, pink bloom) | 3, 9, 13, 18 |
| peony-jug (2x2, pink bloom) |  |
| berry-cake (2x2, pink bloom) | 18 |
| rose-hat (2x3, pink bloom) | 2, 8, 11, 14, 18 |
| maple-path (2x3, autumn rust) | 5, 8, 13, 16 |
| harvest-table (3x2, autumn rust) | 3, 9, 11, 13, 17 |
| apple-orchard (2x2, autumn rust) |  |
| ivy-lane (1x2, autumn rust) | 8, 15, 19 |
| blue-domes (2x3, sea blue) | 3, 9, 14, 16 |
| wave-coast (3x2, sea blue) | 4, 10, 13, 18 |
| hydrangeas (2x2, sea blue) | 6, 16 |
| net-mender (2x2, sea blue) |  |
| wheat-farm (3x2, golden wheat) | 2, 6, 13, 18 |
| bread-table (2x1, golden wheat) | 3, 11, 13, 18 |
| sunflower-vase (1x2, golden wheat) | 8, 11, 13, 18 |
| wheat-walk (2x3, golden wheat) | 9, 16, 19 |
| lavender-rows (3x2, lavender) | 4, 8, 11, 13, 19 |
| wisteria-door (2x3, lavender) | 4, 6, 14, 19 |
| lilac-bouquet (2x2, lavender) | 19 |
| figs-grapes (2x2, lavender) | 2, 4 |
| tea-terraces (3x2, fresh green) | 2, 9, 15, 18 |
| market-greens (2x2, fresh green) |  |
| greenhouse (2x2, fresh green) |  |
| green-alley (1x2, fresh green) | 9, 13, 17, 20 |
| venice-canal (2x3, blue hour) | 3, 6, 11, 15, 18 |
| lantern-market (3x2, blue hour) | 5, 8, 14, 17 |
| lantern-child (2x2, blue hour) | 3, 17 |
| lake-village (2x1, blue hour) | 9, 14, 20 |
| cherry-bowl (2x2, berry red) | 10, 15 |
| tulip-rows (3x2, berry red) | 5, 7, 10, 15, 19 |
| red-tram (1x2, berry red) | 4, 10, 15, 20 |
| red-umbrella (2x3, berry red) | 1, 7, 10, 15 |
| lemon-coast (3x3, lemon yellow) | 4, 7, 10, 12, 15, 20 |
| lemon-tart (2x2, lemon yellow) | 12, 20 |
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
| pink-lotus (2x2, pink lotus) | 17 |
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
| steam-train (2x2, steam train) | 16 |
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
| eagle-figurehead (2x2, eagle figurehead) |  |
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
| marigolds (2x2, marigolds) |  |
| bleeding-heart (2x2, bleeding heart) |  |
| gerbera (2x2, gerbera) |  |
| forget-me-nots (2x2, forget me nots) |  |
| snowdrops (2x2, snowdrops) |  |
| bluebells (2x2, bluebells) |  |
| plum-blossom (2x2, plum blossom) |  |
| carnation (2x2, carnation) |  |
| zinnia (2x2, zinnia) |  |
| cosmos (2x2, cosmos) |  |
| morning-glory (2x2, morning glory) |  |
| air-plant (2x2, air plant) |  |
| frangipani (2x2, frangipani) |  |
| edelweiss (2x2, edelweiss) |  |
| crocus (2x2, crocus) |  |
| hyacinth (2x2, hyacinth) |  |
| bougainvillea (2x2, bougainvillea) |  |
| lily-of-the-valley (2x2, lily of the valley) |  |
| pitcher-plant (2x2, pitcher plant) |  |
| anthurium (2x2, anthurium) |  |
| prickly-pear (2x2, prickly pear) |  |
| coneflower (2x2, coneflower) |  |
| nasturtiums (2x2, nasturtiums) |  |
| snapdragons (2x2, snapdragons) |  |
| columbine (2x2, columbine) |  |
| kangaroo-paw (2x2, kangaroo paw) |  |
| cyclamen (2x2, cyclamen) |  |
| banksia (2x2, banksia) |  |
| sea-holly (2x2, sea holly) |  |
| black-eyed-susans (2x2, black eyed susans) |  |
| delphinium (1x2, delphinium) |  |
| gladiolus (1x2, gladiolus) |  |
| window-geraniums (2x1, window geraniums) |  |
| dumplings (2x2, dumplings) |  |
| tacos (2x2, tacos) |  |
| churros (2x2, churros) |  |
| honey-jar (2x2, honey jar) |  |
| strawberry-basket (2x2, strawberry basket) |  |
| blueberries (2x2, blueberries) |  |
| peaches (2x2, peaches) |  |
| kiwi-slices (2x2, kiwi slices) |  |
| blooming-tea (2x2, blooming tea) |  |
| smoothie-bowl (2x2, smoothie bowl) |  |
| popcorn (2x2, popcorn) |  |
| cotton-candy (2x2, cotton candy) |  |
| waffles (2x2, waffles) |  |
| apple-pie (2x2, apple pie) |  |
| bananas (2x2, bananas) |  |
| mango (2x2, mango) |  |
| coconut (2x2, coconut) |  |
| dragon-fruit (2x2, dragon fruit) |  |
| artichokes (2x2, artichokes) |  |
| chanterelles (2x2, chanterelles) |  |
| garlic (2x2, garlic) |  |
| vine-tomatoes (2x2, vine tomatoes) |  |
| lychees (2x2, lychees) |  |
| bubble-tea (2x2, bubble tea) |  |
| matcha (2x2, matcha) |  |
| lollipops (2x2, lollipops) |  |
| chocolate-truffles (2x2, chocolate truffles) |  |
| hourglass (2x2, hourglass) |  |
| vintage-radio (2x2, vintage radio) |  |
| rotary-phone (2x2, rotary phone) |  |
| music-box (2x2, music box) |  |
| kaleidoscope (2x2, kaleidoscope) |  |
| paper-fan (2x2, paper fan) | 10 |
| yarn-balls (2x2, yarn balls) |  |
| spinning-top (2x2, spinning top) |  |
| parfait (1x2, parfait) |  |
| kebab-skewer (2x1, kebab skewer) |  |
| baguette-sandwich (2x1, baguette sandwich) |  |
| lone-tree (2x2, lone tree) |  |
| frozen-lake (2x2, frozen lake) |  |
| mangrove-roots (2x2, mangrove roots) |  |
| oasis (2x2, oasis) |  |
| hot-spring (2x2, hot spring) |  |
| tide-flats (2x2, tide flats) |  |
| mossy-boulders (2x2, mossy boulders) |  |
| weeping-willow (2x2, weeping willow) |  |
| rainbow-eucalyptus (2x2, rainbow eucalyptus) |  |
| dragon-tree (2x2, dragon tree) |  |
| rapeseed-fields (2x2, rapeseed fields) |  |
| black-sand-beach (2x2, black sand beach) |  |
| sandbar (2x2, sandbar) |  |
| giant-lily-pads (2x2, giant lily pads) |  |
| frosted-web (2x2, frosted web) |  |
| autumn-leaves-water (2x2, autumn leaves water) |  |
| snowy-fence (2x2, snowy fence) |  |
| seashells (2x2, seashells) |  |
| scarecrow (2x2, scarecrow) |  |
| braided-river (2x2, braided river) |  |
| larch-forest (2x2, larch forest) |  |
| heather-moor (2x2, heather moor) |  |
| snowflake (2x2, snowflake) |  |
| cranberry-bog (2x2, cranberry bog) |  |
| pine-cone (2x2, pine cone) |  |
| shipwreck (2x2, shipwreck) |  |
| frozen-bubble (2x2, frozen bubble) |  |
| stepping-stones (2x2, stepping stones) |  |
| dewdrops (2x2, dewdrops) |  |
| rowboat-lake (2x2, rowboat lake) |  |
| glowing-waves (2x2, glowing waves) |  |
| icy-berries (2x2, icy berries) |  |
| snowy-pine (1x2, snowy pine) |  |
| hay-bales (2x1, hay bales) |  |
| tea-pourer (2x2, tea pourer) |  |
| candle-maker (2x2, candle maker) |  |
| florist (2x2, florist) |  |
| cobbler (2x2, cobbler) |  |
| violin-maker (2x2, violin maker) |  |
| tailor (2x2, tailor) |  |
| pizzaiolo (2x2, pizzaiolo) |  |
| watering-garden (2x2, watering garden) |  |
| rope-sailor (2x2, rope sailor) |  |
| woodcarver (2x2, woodcarver) |  |
| shepherd-lambs (2x2, shepherd lambs) |  |
| fruit-seller (2x2, fruit seller) |  |
| feeding-ducks (2x2, feeding ducks) |  |
| pier-fishing (2x2, pier fishing) |  |
| high-diver (2x2, high diver) |  |
| taiko (2x2, taiko) |  |
| lumberjack (2x2, lumberjack) |  |
| weaver (2x2, weaver) |  |
| pastry-chef (2x2, pastry chef) |  |
| photographer (2x2, photographer) |  |
| paper-boat (2x2, paper boat) |  |
| snowboarder (2x2, snowboarder) |  |
| swimmer (2x2, swimmer) |  |
| chess-move (2x2, chess move) |  |
| harpist (2x2, harpist) |  |
| double-bass (2x2, double bass) |  |
| lantern-maker (2x2, lantern maker) |  |
| mountain-biker (2x2, mountain biker) |  |
| stilt-walker (1x2, stilt walker) |  |
| pole-vaulter (1x2, pole vaulter) |  |
| rower-scull (2x1, rower scull) |  |
| brass-compass (2x2, brass compass) |  |
| helicopter (2x2, helicopter) |  |
| hovercraft (2x2, hovercraft) |  |
| submarine (2x2, submarine) |  |
| jet-ski (2x2, jet ski) |  |
| kick-scooter (2x2, kick scooter) |  |
| tandem (2x2, tandem) |  |
| river-raft (2x2, river raft) |  |
| swan-pedalo (2x2, swan pedalo) |  |
| ferris-wheel (2x2, ferris wheel) |  |
| carousel-horse (2x2, carousel horse) |  |
| harbour-buoy (2x2, harbour buoy) |  |
| ships-wheel (2x2, ships wheel) |  |
| life-ring (2x2, life ring) |  |
| deck-chair (2x2, deck chair) |  |
| camping-lantern (2x2, camping lantern) |  |
| hiking-boots (2x2, hiking boots) |  |
| backpack (2x2, backpack) |  |
| chairlift (2x2, chairlift) |  |
| icebreaker (2x2, icebreaker) |  |
| container-ship (2x2, container ship) |  |
| combine (2x2, combine) |  |
| ice-cream-van (2x2, ice cream van) |  |
| food-truck (2x2, food truck) |  |
| teardrop-caravan (2x2, teardrop caravan) |  |
| dhow (2x2, dhow) |  |
| catamaran (2x2, catamaran) |  |
| snowmobile (2x2, snowmobile) |  |
| monster-truck (2x2, monster truck) | 12 |
| unicycle (2x2, unicycle) |  |
| propeller-plane (2x2, propeller plane) |  |
| dog-sled (2x2, dog sled) |  |
| hot-air-balloon (1x2, hot air balloon) |  |
| vintage-motorcycle (2x1, vintage motorcycle) |  |
| racing-car (2x1, racing car) |  |
| horse-carriage (2x1, horse carriage) |  |
| dovecote (2x2, dovecote) |  |
| spiral-staircase (2x2, spiral staircase) |  |
| grain-silos (2x2, grain silos) |  |
| geodesic-dome (2x2, geodesic dome) |  |
| stilt-house (2x2, stilt house) | 5 |
| fire-lookout (2x2, fire lookout) |  |
| drawbridge (2x2, drawbridge) |  |
| viaduct (2x2, viaduct) |  |
| chimney-pots (2x2, chimney pots) |  |
| library-shelves (2x2, library shelves) |  |
| garden-fountain (2x2, garden fountain) |  |
| a-frame-cabin (2x2, a frame cabin) |  |
| shepherds-hut (2x2, shepherds hut) |  |
| turf-house (2x2, turf house) |  |
| abbey-arch (2x2, abbey arch) |  |
| teahouse (2x2, teahouse) |  |
| boathouse (2x2, red waterside) |  |
| palace-window (2x2, palace window) |  |
| skylight (2x2, skylight) |  |
| round-tower (2x2, round tower) |  |
| potting-shed (2x2, potting shed) |  |
| mailbox (2x2, mailbox) |  |
| hedge-maze (2x2, hedge maze) |  |
| theatre-stage (2x2, theatre stage) |  |
| fishing-shack (2x2, red waterside) |  |
| birdhouse (2x2, birdhouse) |  |
| red-cabin (2x2, red waterside) |  |
| lido (2x2, lido) |  |
| rondavel (2x2, rondavel) |  |
| porch-rocker (2x2, porch rocker) |  |
| lamppost-snow (1x2, lamppost snow) |  |
| water-tower (1x2, water tower) |  |
| thatched-cottage (2x1, thatched cottage) |  |
| conservatory (2x1, conservatory) |  |
| toucan (2x2, toucan) |  |
| red-panda (2x2, red panda) |  |
| sloth (2x2, sloth) |  |
| puffin (2x2, puffin) |  |
| polar-bear (2x2, polar bear) |  |
| hummingbird (2x2, hummingbird) |  |
| octopus (2x2, octopus) |  |
| axolotl (2x2, axolotl) |  |
| tree-frog (2x2, tree frog) |  |
| ladybird (2x2, ladybird) |  |
| bumblebee (2x2, bumblebee) | 12 |
| monarch (2x2, monarch) |  |
| snail (2x2, snail) |  |
| goldfish (2x2, goldfish) |  |
| sea-turtle (2x2, sea turtle) |  |
| lamb (2x2, lamb) |  |
| alpaca (2x2, alpaca) |  |
| highland-cow (2x2, highland cow) |  |
| piglet (2x2, piglet) |  |
| ducklings (2x2, ducklings) |  |
| kingfisher (2x2, kingfisher) |  |
| robin (2x2, robin) |  |
| swan (2x2, swan) |  |
| zebra (2x2, zebra) |  |
| baby-elephant (2x2, baby elephant) |  |
| tiger (2x2, tiger) |  |
| raccoon (2x2, raccoon) |  |
| squirrel (2x2, squirrel) |  |
| dalmatian (2x2, dalmatian) |  |
| meerkat (1x2, meerkat) |  |
| seahorse (1x2, seahorse) |  |
| ostrich (1x2, ostrich) |  |
| crocodile (2x1, crocodile) |  |
| sleeping-lion (2x1, sleeping lion) |  |
| foxgloves (1x2, foxgloves) |  |
| jacaranda (2x1, jacaranda) |  |
| strawflowers (2x2, strawflowers) |  |
| dogwood (2x2, dogwood) |  |
| azaleas (2x2, azaleas) |  |
| primroses (2x2, primroses) |  |
| poinsettia (2x2, poinsettia) |  |
| heliconia (2x2, heliconia) |  |
| gardenia (2x2, gardenia) |  |
| freesias (2x2, freesias) |  |
| tiger-lily (2x2, tiger lily) |  |
| love-in-a-mist (2x2, love in a mist) |  |
| scabious (2x2, scabious) |  |
| sweet-violets (2x2, sweet violets) |  |
| petunias (2x2, petunias) |  |
| begonias (2x2, begonias) |  |
| bromeliad (2x2, bromeliad) | 7 |
| bottlebrush (2x2, bottlebrush) |  |
| cockscomb (2x2, cockscomb) |  |
| crown-imperial (2x2, crown imperial) |  |
| chamomile (2x2, chamomile) |  |
| borage (2x2, borage) |  |
| grape-hyacinths (2x2, blue spikes) |  |
| mimosa (2x2, mimosa) |  |
| honeysuckle (2x2, honeysuckle) |  |
| lantana (2x2, lantana) |  |
| salvia (2x2, blue spikes) |  |
| sundew (2x2, sundew) |  |
| clivia (2x2, clivia) | 1 |
| buttercups (2x2, buttercups) |  |
| statice (2x2, statice) |  |
| cotton-bolls (2x2, cotton bolls) |  |
| iceland-poppies (2x2, iceland poppies) |  |
| asparagus (1x2, asparagus) |  |
| macarons (2x1, macarons) |  |
| xylophone (2x1, xylophone) |  |
| cinnamon-rolls (2x2, cinnamon rolls) |  |
| paella (2x2, paella) |  |
| bagels (2x2, bagels) |  |
| olives (2x2, olives) |  |
| cupcakes (2x2, cupcakes) |  |
| jam-jars (2x2, jam jars) |  |
| spaghetti (2x2, spaghetti) |  |
| tempura (2x2, tempura) |  |
| bao-buns (2x2, bao buns) |  |
| mochi (2x2, mochi) |  |
| persimmons (2x2, persimmons) |  |
| blood-oranges (2x2, blood oranges) |  |
| pears (2x2, pears) |  |
| starfruit (2x2, starfruit) |  |
| beetroot (2x2, beetroot) |  |
| radishes (2x2, radishes) |  |
| pumpkins (2x2, pumpkins) |  |
| pea-pod (2x2, pea pod) |  |
| cocoa-pod (2x2, cocoa pod) |  |
| coffee-beans (2x2, coffee beans) |  |
| candy-apples (2x2, candy apples) |  |
| gumball-machine (2x2, gumball machine) |  |
| gingerbread-men (2x2, gingerbread men) |  |
| baklava (2x2, baklava) |  |
| empanadas (2x2, empanadas) |  |
| ravioli (2x2, ravioli) |  |
| scones (2x2, scones) |  |
| snow-globe (2x2, snow globe) |  |
| ship-in-bottle (2x2, ship in bottle) |  |
| ukulele (2x2, ukulele) |  |
| jack-in-the-box (2x2, jack in the box) |  |
| mortar-pestle (2x2, mortar pestle) |  |
| kelp-forest (1x2, kelp forest) |  |
| saguaro (1x2, desert cactus) |  |
| coral-reef (2x1, coral reef) |  |
| sea-of-clouds (2x1, clouds) |  |
| salt-pans (2x2, cracked ground) |  |
| vineyard (2x2, vineyard) |  |
| rice-paddies (2x2, rice paddies) |  |
| cypress-swamp (2x2, cypress swamp) |  |
| fern-forest (2x2, green forest) |  |
| aspen-grove (2x2, aspen grove) |  |
| cracked-earth (2x2, cracked ground) |  |
| hoarfrost (2x2, white snow) |  |
| termite-mound (2x2, termite mound) |  |
| saturn (2x2, space) |  |
| nebula (2x2, space) |  |
| desert-bloom (2x2, wildflowers) |  |
| wildflower-meadow (2x2, wildflowers) |  |
| rain-window (2x2, rain window) |  |
| sunset-clouds (2x2, clouds) |  |
| limestone-cave (2x2, limestone cave) |  |
| banyan (2x2, banyan) |  |
| patchwork-hills (2x2, patchwork hills) |  |
| petrified-wood (2x2, petrified wood) |  |
| glowing-mushrooms (2x2, glowing mushrooms) |  |
| salt-marsh (2x2, salt marsh) |  |
| rainforest-canopy (2x2, rainforest canopy) |  |
| volcano-island (2x2, volcano island) |  |
| orange-grove (2x2, orange grove) |  |
| barrel-cacti (2x2, desert cactus) |  |
| ski-tracks (2x2, white snow) |  |
| sunbeam-forest (2x2, green forest) |  |
| zen-garden (2x2, zen garden) |  |
| palm-moonrise (2x2, palm moonrise) |  |
| pop-sunset (2x2, pop sunset) |  |
| windmill (1x2, windmill) |  |
| container-house (1x2, container house) |  |
| station-roof (2x1, iron glass) |  |
| arch-bridge (2x1, arch bridge) |  |
| hanok-eaves (2x2, hanok eaves) | 18 |
| gazebo (2x2, gazebo) |  |
| pergola (2x2, pergola) |  |
| brownstone (2x2, brick city) |  |
| fire-escape (2x2, brick city) |  |
| barber-pole (2x2, barber pole) |  |
| sauna-hut (2x2, sauna hut) |  |
| insect-hotel (2x2, insect hotel) |  |
| chicken-coop (2x2, chicken coop) |  |
| horreo (2x2, horreo) |  |
| oast-house (2x2, oast house) |  |
| zigzag-bridge (2x2, zigzag bridge) |  |
| door-knocker (2x2, door knocker) |  |
| weathervane (2x2, weathervane) |  |
| blue-shutters (2x2, blue shutters) |  |
| iron-gate (2x2, iron gate) |  |
| tiled-stairs (2x2, tiled stairs) |  |
| glass-arcade (2x2, iron glass) |  |
| stone-well (2x2, stone well) |  |
| courtyard (2x2, courtyard) |  |
| gingerbread-house (2x2, gingerbread house) |  |
| dollhouse (2x2, dollhouse) |  |
| kasbah (2x2, kasbah) |  |
| glass-cabin (2x2, glass cabin) |  |
| glass-dome (2x2, glass dome) |  |
| tiny-house (2x2, tiny house) |  |
| town-square (2x2, town square) |  |
| painted-facade (2x2, painted facade) |  |
| tiled-fountain (2x2, tiled fountain) |  |
| lattice-window (2x2, lattice window) |  |
| jellyfish (1x2, jellyfish) |  |
| red-crowned-crane (1x2, red crowned crane) |  |
| dolphin (2x1, dolphin) |  |
| cheetah (2x1, cheetah) |  |
| lynx (2x2, snow cat) |  |
| wolf (2x2, wolf) |  |
| bison (2x2, bison) |  |
| beaver (2x2, beaver) |  |
| narwhal (2x2, narwhal) |  |
| manta-ray (2x2, manta ray) |  |
| clownfish (2x2, clownfish) |  |
| walrus (2x2, walrus) |  |
| seal-pup (2x2, seal pup) |  |
| pelican (2x2, pelican) |  |
| cockatoo (2x2, cockatoo) |  |
| hoopoe (2x2, hoopoe) |  |
| bee-eater (2x2, bee eater) |  |
| mandarin-duck (2x2, mandarin duck) |  |
| kangaroo (2x2, kangaroo) |  |
| quokka (2x2, quokka) |  |
| lemur (2x2, lemur) |  |
| orangutan (2x2, orangutan) |  |
| capybara (2x2, capybara) |  |
| okapi (2x2, okapi) |  |
| rhino (2x2, rhino) |  |
| hippo (2x2, hippo) |  |
| snow-leopard (2x2, snow cat) |  |
| mountain-goat (2x2, mountain goat) |  |
| donkey (2x2, donkey) |  |
| hare (2x2, hare) |  |
| armadillo (2x2, armadillo) |  |
| pangolin (2x2, pangolin) |  |
| gecko (2x2, gecko) |  |
| blue-morpho (2x2, blue morpho) |  |
| corgi (2x2, corgi) |  |
| bagpiper (1x2, bagpiper) |  |
| window-cleaner (1x2, window cleaner) |  |
| curler (2x1, curler) |  |
| bookbinder (2x2, bookbinder) |  |
| printmaker (2x2, printmaker) |  |
| jeweller (2x2, jeweller) |  |
| basket-weaver (2x2, basket weaver) |  |
| chocolatier (2x2, chocolatier) |  |
| barista (2x2, barista) | 16 |
| ice-fisher (2x2, ice fisher) |  |
| dog-walker (2x2, dog walker) |  |
| kite-flyer (2x2, kite flyer) |  |
| mail-carrier (2x2, mail carrier) |  |
| tap-dancer (2x2, tap dancer) |  |
| breakdancer (2x2, breakdancer) |  |
| gymnast (2x2, gymnast) |  |
| archer (2x2, archer) |  |
| fencers (2x2, fencers) |  |
| paddleboarder (2x2, paddleboarder) |  |
| scuba-diver (2x2, scuba diver) |  |
| sledding (2x2, snow kids) |  |
| snowman-builders (2x2, snow kids) |  |
| tai-chi (2x2, tai chi) |  |
| show-jumper (2x2, show jumper) |  |
| cabinetmaker (2x2, cabinetmaker) |  |
| stonemason (2x2, stonemason) |  |
| thatcher (2x2, thatcher) |  |
| fishmonger (2x2, fishmonger) |  |
| noodle-maker (2x2, noodle maker) |  |
| falconer (2x2, falconer) |  |
| microscope (2x2, microscope) |  |
| quilter (2x2, quilter) |  |
| puppeteer (2x2, puppeteer) |  |
| welder (2x2, welder) |  |
| helter-skelter (1x2, helter skelter) |  |
| rocket (1x2, rocket) |  |
| plane-window (2x1, plane window) |  |
| floating-market (2x1, floating market) |  |
| glider (2x2, sky plane) |  |
| paraglider (2x2, paraglider) |  |
| airliner (2x2, sky plane) |  |
| lifeboat (2x2, lifeboat) |  |
| monorail (2x2, monorail) |  |
| handcar (2x2, handcar) |  |
| caboose (2x2, red railcar) | 2 |
| picnic-basket (2x2, picnic basket) |  |
| snorkel-mask (2x2, snorkel mask) |  |
| flip-flops (2x2, flip flops) |  |
| cargo-bike (2x2, cargo bike) |  |
| toboggan (2x2, toboggan) |  |
| snowshoes (2x2, snowshoes) |  |
| anchor (2x2, anchor) |  |
| dining-car (2x2, dining car) |  |
| bumper-cars (2x2, bumper cars) |  |
| teacup-ride (2x2, teacup ride) |  |
| swing-ride (2x2, swing ride) |  |
| water-slide (2x2, water slide) |  |
| go-kart (2x2, go kart) |  |
| beach-buggy (2x2, beach buggy) |  |
| tuk-tuk (2x2, tuk tuk) |  |
| parachute (2x2, parachute) |  |
| surfboards (2x2, surfboards) |  |
| beach-ball (2x2, beach ball) |  |
| thermos (2x2, thermos) |  |
| rack-railway (2x2, red railcar) |  |
| pedal-car (2x2, pedal car) |  |
| sleigh (2x2, sleigh) |  |
| dragon-boat (2x2, dragon boat) |  |
| land-yacht (2x2, land yacht) |  |
| sweet-william (2x2, sweet william) |  |
| flame-lily (2x2, flame lily) |  |
| agapanthus (2x2, agapanthus) |  |
| brioche (2x2, brioche) |  |
| pistachios (2x2, pistachios) |  |
| kumquats (2x2, kumquats) |  |
| abacus (2x2, abacus) |  |
| foxtails (2x2, golden wheat) |  |
| switchbacks (2x2, switchbacks) |  |
| river-meander (2x2, river meander) |  |
| carved-door (2x2, carved door) |  |
| window-seat (2x2, window seat) |  |
| dormer-roof (2x2, dormer roof) |  |
| pufferfish (2x2, pufferfish) |  |
| dormouse (2x2, dormouse) |  |
| tamarin (2x2, tamarin) |  |
| farrier (2x2, farrier) |  |
| hairdresser (2x2, hairdresser) |  |
| seedlings (2x2, seedlings) |  |
| luggage-trolley (2x2, luggage trolley) |  |
| beach-hat (2x2, beach hat) |  |
| satchel (2x2, satchel) |  |
| fritillary (2x2, fritillary) |  |
| nerine (2x2, nerine) |  |
| rhubarb (2x2, rhubarb) |  |
| eclairs (2x2, eclairs) |  |
| hazelnuts (2x2, hazelnuts) |  |
| sextant (2x2, sextant) |  |
| juniper (2x2, juniper) |  |
| flax-field (2x2, flax field) |  |
| stile (2x2, stile) |  |
| clay-oven (2x2, clay oven) |  |
| frilled-lizard (2x2, frilled lizard) |  |
| stag-beetle (2x2, stag beetle) |  |
| wren (2x2, wren) |  |
| cooper (2x2, cooper) |  |
| skipping (2x2, skipping) |  |
| moped (2x2, moped) |  |
| brugmansia (1x2, brugmansia) |  |
| lobelia (2x1, lobelia) |  |
| verbena (2x2, verbena) |  |
| lisianthus (2x2, lisianthus) |  |
| gaillardia (2x2, gaillardia) |  |
| ixora (2x2, ixora) |  |
| plumbago (2x2, plumbago) |  |
| canna (2x2, canna) | 12 |
| stocks (2x2, stocks) |  |
| gazania (2x2, gazania) |  |
| osteospermum (2x2, osteospermum) |  |
| echinops (2x2, echinops) |  |
| astrantia (2x2, astrantia) |  |
| campsis (2x2, campsis) |  |
| kniphofia (1x2, kniphofia) |  |
| quince-blossom (2x2, quince blossom) |  |
| cymbidium (2x2, cymbidium) |  |
| waratah (2x2, waratah) |  |
| desert-pea (2x2, desert pea) |  |
| craspedia (2x2, craspedia) |  |
| calendula (2x2, calendula) |  |
| meconopsis (2x2, meconopsis) |  |
| hemerocallis (2x2, hemerocallis) |  |
| moonflower (2x2, moonflower) |  |
| jasmine (2x2, jasmine) |  |
| oleander (2x2, oleander) |  |
| hoya (2x2, hoya) |  |
| asters (2x2, asters) |  |
| goldenrod (2x2, goldenrod) |  |
| armeria (2x2, armeria) |  |
| gorse (2x2, gorse) |  |
| clover (2x2, clover) |  |
| aloe-bloom (2x2, aloe bloom) |  |
| croquembouche (1x2, croquembouche) |  |
| madeleines (2x1, madeleines) |  |
| dominoes (2x1, dominoes) |  |
| sourdough (2x2, sourdough) |  |
| focaccia (2x2, focaccia) |  |
| pierogi (2x2, pierogi) |  |
| tamales (2x2, tamales) |  |
| arepas (2x2, arepas) |  |
| pasteis-de-nata (2x2, pasteis de nata) |  |
| pavlova (2x2, pavlova) |  |
| lamingtons (2x2, lamingtons) |  |
| alfajores (2x2, alfajores) |  |
| yerba-mate (2x2, yerba mate) |  |
| mille-feuille (2x2, mille feuille) |  |
| creme-brulee (2x2, creme brulee) |  |
| onigiri (2x2, onigiri) |  |
| takoyaki (2x2, takoyaki) |  |
| dango (2x2, dango) |  |
| pho (2x2, pho) |  |
| bibimbap (2x2, bibimbap) |  |
| nachos (2x2, nachos) | 16 |
| crepes (2x2, crepes) |  |
| fudge (2x2, fudge) |  |
| liquorice (2x2, liquorice) |  |
| papaya (2x2, papaya) |  |
| jackfruit (2x2, jackfruit) |  |
| rambutan (2x2, rambutan) |  |
| gooseberries (2x2, gooseberries) |  |
| romanesco (2x2, romanesco) |  |
| aubergines (2x2, aubergines) |  |
| banjo (2x2, banjo) |  |
| magnifying-glass (2x2, magnifying glass) |  |
| marbles (2x2, marbles) |  |
| inkwell (2x2, inkwell) |  |
| lemonade (2x2, lemonade) |  |
| jungle-vines (1x2, jungle vines) |  |
| gum-trees (1x2, gum trees) |  |
| milky-way (2x1, night sky) |  |
| alpenglow (2x1, alpenglow) |  |
| shooting-stars (2x2, night sky) |  |
| eclipse (2x2, space) |  |
| jupiter (2x2, space) |  |
| moss-carpet (2x2, moss carpet) |  |
| beech-woods (2x2, beech woods) |  |
| date-palms (2x2, date palms) |  |
| outback-track (2x2, outback) |  |
| spinifex (2x2, spinifex) |  |
| pampas-grass (2x2, tall grass) |  |
| fogbow (2x2, fogbow) |  |
| tumbleweed (2x2, tumbleweed) |  |
| frosty-meadow (2x2, winter fog) |  |
| winter-fog (2x2, winter fog) |  |
| driftwood (2x2, driftwood) |  |
| sea-glass (2x2, sea glass) |  |
| opal (2x2, gemstone) |  |
| malachite (2x2, gemstone) |  |
| ammonite (2x2, ammonite) |  |
| snow-gums (2x2, gum trees) |  |
| bluebonnets (2x2, bluebonnets) |  |
| ripples (2x2, ripples) |  |
| reed-bed (2x2, tall grass) |  |
| glowworm-cave (2x2, night sky) |  |
| autumn-treetops (2x2, autumn treetops) |  |
| sunrays (2x2, sunrays) |  |
| monsoon-rain (2x2, monsoon rain) |  |
| mirage (2x2, outback) |  |
| waterspout (2x2, waterspout) |  |
| hedgerow (2x2, hedgerow) |  |
| islet (2x2, islet) |  |
| windpump (1x2, windpump) |  |
| chandelier (1x2, chandelier) |  |
| colonnade (2x1, colonnade) |  |
| shophouses (2x1, shophouses) |  |
| queenslander (2x2, verandah) |  |
| shearing-shed (2x2, shearing shed) |  |
| estancia (2x2, ranch house) |  |
| lacework-verandah (2x2, verandah) |  |
| rotunda (2x2, rotunda) | 20 |
| bothy (2x2, bothy) |  |
| pavilion (2x2, pavilion) |  |
| loggia (2x2, loggia) |  |
| deco-facade (2x2, deco facade) |  |
| lock-gates (2x2, lock gates) | 16 |
| pantry (2x2, pantry) |  |
| attic (2x2, attic) |  |
| terrazzo (2x2, terrazzo) |  |
| oculus (2x2, ceiling) |  |
| coffered-ceiling (2x2, ceiling) |  |
| beach-cabana (2x2, beach thatch) |  |
| overwater-bungalow (2x2, beach thatch) |  |
| beehive-hut (2x2, beehive hut) |  |
| white-gables (2x2, white gables) |  |
| promenade-shelter (2x2, promenade shelter) |  |
| rooftop-garden (2x2, rooftop garden) |  |
| rainwater-tank (2x2, rainwater tank) |  |
| ranch-gate (2x2, ranch gate) |  |
| hacienda (2x2, ranch house) |  |
| folly (2x2, rotunda) |  |
| inglenook (2x2, inglenook) |  |
| grand-stairway (2x2, grand stairway) |  |
| hammam (2x2, hammam) |  |
| boulevard (2x2, boulevard) |  |
| metro-station (2x2, metro station) |  |
| lyrebird (1x2, lyrebird) |  |
| stork (1x2, stork) |  |
| condor (2x1, raptor) |  |
| dragonfly (2x1, dragonfly) |  |
| wombat (2x2, wombat) |  |
| echidna (2x2, echidna) |  |
| platypus (2x2, platypus) |  |
| tasmanian-devil (2x2, tasmanian devil) |  |
| emu (2x2, ratite) |  |
| cassowary (2x2, ratite) |  |
| kookaburra (2x2, kookaburra) | 16 |
| lorikeet (2x2, parrot) |  |
| sugar-glider (2x2, sugar glider) |  |
| anteater (2x2, anteater) |  |
| mara (2x2, mara) |  |
| vizcacha (2x2, vizcacha) |  |
| tapir (2x2, tapir) |  |
| siamese-cat (2x2, siamese cat) |  |
| border-collie (2x2, border collie) |  |
| poodle (2x2, poodle) |  |
| guinea-pig (2x2, guinea pig) |  |
| budgies (2x2, parrot) |  |
| golden-eagle (2x2, raptor) |  |
| scarlet-ibis (2x2, scarlet ibis) |  |
| toad (2x2, toad) |  |
| fire-salamander (2x2, fire salamander) |  |
| iguana (2x2, iguana) |  |
| hermit-crab (2x2, hermit crab) |  |
| nautilus (2x2, nautilus) | 20 |
| swallowtail (2x2, wings) |  |
| atlas-moth (2x2, wings) |  |
| fruit-bat (2x2, fruit bat) |  |
| gorilla (2x2, gorilla) |  |
| badger (2x2, badger) |  |
| pixel-pheasant (2x2, pixel pheasant) |  |
| tango (1x2, tango) |  |
| chimney-sweep (1x2, chimney sweep) |  |
| polo-player (2x1, polo player) |  |
| gaucho (2x2, gaucho) |  |
| surf-lifesaver (2x2, surf lifesaver) |  |
| shearer (2x2, shearer) |  |
| asador (2x2, asador) |  |
| skateboarder (2x2, skating) |  |
| rollerskater (2x2, skating) |  |
| hula-hoop (2x2, hula hoop) |  |
| cheesemaker (2x2, cheesemaker) |  |
| pasta-maker (2x2, dough hands) |  |
| tortilla-maker (2x2, dough hands) |  |
| coffee-roaster (2x2, coffee roaster) |  |
| grape-picker (2x2, grape picker) |  |
| milking (2x2, milking) |  |
| dog-groomer (2x2, dog groomer) |  |
| hockey-player (2x2, hockey player) |  |
| sprinter (2x2, sprinter) |  |
| golfer (2x2, golfer) |  |
| cricketer (2x2, cricketer) |  |
| karate (2x2, karate) |  |
| dressmaker (2x2, dressmaker) |  |
| milliner (2x2, milliner) |  |
| glazier (2x2, glazier) |  |
| mosaic-artist (2x2, mosaic artist) |  |
| woodturner (2x2, woodturner) |  |
| wheelwright (2x2, wheelwright) |  |
| bricklayer (2x2, bricklayer) |  |
| kite-maker (2x2, kite maker) |  |
| toymaker (2x2, toymaker) |  |
| beachcomber (2x2, beachcomber) |  |
| birdwatcher (2x2, birdwatcher) |  |
| cellar-singer (2x2, cellar singer) |  |
| zip-line (1x2, zip line) |  |
| road-train (2x1, road train) |  |
| freight-train (2x1, freight train) |  |
| rooftop-tent (2x2, rooftop tent) |  |
| ferry (2x2, ferry) |  |
| outrigger (2x2, paddle boat) |  |
| kayak (2x2, paddle boat) |  |
| windsurfer (2x2, sail) |  |
| lunar-lander (2x2, spacecraft) |  |
| satellite (2x2, spacecraft) |  |
| trolleybus (2x2, bus) |  |
| vintage-coach (2x2, bus) |  |
| bobsleigh (2x2, bobsleigh) |  |
| quad-bike (2x2, quad bike) |  |
| gyrocopter (2x2, gyrocopter) |  |
| microcar (2x2, microcar) |  |
| pickup-truck (2x2, pickup truck) |  |
| steam-roller (2x2, steam roller) |  |
| digger (2x2, construction) |  |
| cement-mixer (2x2, construction) |  |
| pirate-ship-ride (2x2, pirate ship ride) |  |
| log-flume (2x2, log flume) |  |
| sleeping-bag (2x2, sleeping bag) |  |
| camping-stove (2x2, camping stove) |  |
| beach-umbrella (2x2, beach umbrella) |  |
| bucket-spade (2x2, bucket spade) |  |
| jetpack (2x2, jetpack) |  |
| trawler (2x2, trawler) |  |
| hydrofoil (2x2, hydrofoil) |  |
| golf-cart (2x2, golf cart) |  |
| dragster (2x2, dragster) |  |
| train-set (2x2, train set) |  |
| spinnaker (2x2, sail) |  |
| tricycle (2x2, tricycle) |  |
| drone (2x2, drone) |  |
| rose (2x2, rose) |  |
| gentian (2x2, gentian) |  |
| pussy-willow (2x2, pussy willow) |  |
| laburnum (1x2, laburnum) |  |
| physalis (2x2, physalis) |  |
| honesty (2x2, honesty) |  |
| coleus (2x2, coleus) |  |
| staghorn (2x2, staghorn) |  |
| torch-ginger (2x2, torch ginger) |  |
| lotus-pod (2x2, lotus pod) |  |
| alstroemeria (2x2, alstroemeria) |  |
| phlox (2x2, phlox) |  |
| penstemon (2x2, foxgloves) |  |
| campanula (2x2, bluebells) |  |
| yarrow (2x2, yarrow) |  |
| forsythia (2x1, forsythia) |  |
| koeksisters (2x2, koeksisters) |  |
| milk-tart (2x2, milk tart) |  |
| fish-chips (2x2, fish chips) |  |
| victoria-sponge (2x2, victoria sponge) |  |
| shortbread (2x2, shortbread) |  |
| soda-bread (2x2, soda bread) |  |
| welsh-cakes (2x2, welsh cakes) |  |
| tiramisu (2x2, tiramisu) |  |
| cannoli (2x2, cannoli) |  |
| mooncakes (2x2, mooncakes) |  |
| falafel (2x2, falafel) |  |
| moka-pot (2x2, moka pot) |  |
| cuckoo-clock (2x2, cuckoo clock) |  |
| typewriter (2x2, typewriter) |  |
| leeks (1x2, leeks) |  |
| spring-rolls (2x1, spring rolls) |  |
| warthog (2x2, warthog) |  |
| wild-dog (2x2, wild dog) |  |
| bushbaby (2x2, bushbaby) |  |
| secretary-bird (2x2, secretary bird) |  |
| hornbill (2x2, toucan) |  |
| aardvark (2x2, aardvark) |  |
| dung-beetle (2x2, dung beetle) |  |
| weaverbird (2x2, weaverbird) |  |
| red-deer (2x2, red deer) |  |
| shetland-pony (2x2, shetland pony) |  |
| pine-marten (2x2, pine marten) | 17 |
| magpie (2x2, magpie) |  |
| maine-coon (2x2, maine coon) |  |
| beagle (2x2, beagle) |  |
| springbok (1x2, springbok) |  |
| orca (2x1, orca) |  |
| funicular (1x2, red railcar) |  |
| punt (2x2, punt) |  |
| hot-rod (2x2, hot rod) | 20 |
| snowcat (2x2, snowcat) |  |
| fireboat (2x2, fireboat) |  |
| felucca (2x2, sail) |  |
| sampan (2x2, sampan) |  |
| school-bus (2x2, bus) |  |
| bmx (2x2, bmx) |  |
| space-shuttle (2x2, rocket) |  |
| moon-buggy (2x2, spacecraft) |  |
| tow-truck (2x2, tow truck) | 1 |
| car-carrier (2x2, car carrier) |  |
| paper-plane (2x2, paper plane) |  |
| windsock (2x2, windsock) |  |
| cable-ferry (2x1, cable ferry) |  |
| quiver-tree (1x2, quiver tree) |  |
| ice-cave (2x2, ice cave) | 7 |
| mud-pots (2x2, mud pots) |  |
| icicles (2x2, icicles) |  |
| cork-oak (2x2, cork oak) |  |
| trilobite (2x2, trilobite) |  |
| seagrass (2x2, seagrass) |  |
| atoll (2x2, atoll) |  |
| blowhole (2x2, blowhole) |  |
| crevasse (2x2, crevasse) |  |
| comet (2x2, space) |  |
| mars (2x2, space) |  |
| whirlpool (2x2, whirlpool) |  |
| cotton-grass (2x2, cotton grass) |  |
| jetty (2x2, jetty) |  |
| pebble-beach (2x1, pebble beach) |  |
| tube-house (1x2, tube house) |  |
| windcatcher (2x2, windcatcher) |  |
| palapa (2x2, palapa) |  |
| market-hall (2x2, sunflower) |  |
| porthole (2x2, porthole) |  |
| flower-balcony (2x2, window geraniums) |  |
| ice-hotel (2x2, igloo) |  |
| shell-grotto (2x2, shell grotto) |  |
| sundial (2x2, sundial) |  |
| sleeping-pods (2x2, sleeping pods) |  |
| tree-tent (2x2, tree tent) |  |
| log-cabin (2x2, log cabin) |  |
| tower-crane (2x2, construction) |  |
| signal-box (2x2, signal box) |  |
| round-barn (2x2, red barn) |  |
| bathing-machine (2x2, bathing machine) |  |
| watchmaker (2x2, watchmaker) |  |
| mapmaker (2x2, mapmaker) |  |
| tile-painter (2x2, tile painter) |  |
| lamplighter (2x2, lamplighter) |  |
| magician (2x2, magician) |  |
| trapeze (2x2, trapeze) |  |
| conductor (2x2, conductor) |  |
| irish-dancer (2x2, irish dancer) |  |
| kitesurfer (2x2, kitesurfer) |  |
| sandboarder (2x2, sandboarder) |  |
| caver (2x2, caver) |  |
| oyster-farmer (2x2, oyster farmer) |  |
| astronaut (2x2, astronaut) |  |
| rugby (2x2, rugby) |  |
| hurling (2x2, hurling) |  |
| tightrope (2x1, tightrope) |  |
| pointillist-promenade (2x2, pointillist promenade) |  |
| seaweed-gatherers (2x2, seaweed gatherers) |  |
| spice-stalls (2x2, spice stalls) |  |
| hanami-picnic (2x2, hanami picnic) |  |
| horse-fair (2x2, horse fair) |  |
| fireflies-meadow (2x2, fireflies meadow) |  |
| dune-fences (2x2, dune fences) |  |
| barn-dance (2x2, barn dance) |  |
| luzzu-harbour (2x2, luzzu harbour) |  |
| wild-ponies-heath (2x2, wild ponies heath) |  |
| village-downpour (2x2, village downpour) |  |
| wedding-procession (2x2, wedding procession) |  |
| drive-in-cinema (2x2, drive in cinema) |  |
| stilt-fishermen (2x2, stilt fishermen) |  |
| open-air-dance (2x2, open air dance) |  |
| caravanserai (2x2, caravanserai) |  |
| cliff-walk (2x2, cliff walk) |  |
| sugarcane-harvest (2x2, sugarcane harvest) |  |
| sheep-market (2x2, sheep market) |  |
| carnival-parade (2x2, carnival parade) |  |
| night-train (2x2, night train) |  |
| arctic-village (2x2, arctic village) |  |
| boat-hauling (2x2, boat hauling) |  |
| argan-tree (2x2, argan tree) |  |
| fishing-fleet (2x2, fishing fleet) |  |
| train-compartment (2x2, train compartment) |  |
| maypole-dance (2x2, maypole dance) |  |
| murmuration (2x2, murmuration) |  |
| misty-pass-road (2x2, misty pass road) |  |
| flooded-village (2x2, flooded village) |  |
| research-station (2x2, research station) |  |
| paddling-children (2x2, paddling children) |  |
| salmon-run (2x2, salmon run) |  |
| cow-parade (2x2, cow parade) |  |
| potato-harvest (2x2, potato harvest) |  |
| badlands (2x2, badlands) |  |
| apple-press (2x2, apple press) |  |
| terrace-breakfast (2x2, terrace breakfast) |  |
| mushroom-pickers (2x2, mushroom pickers) |  |
| tidal-island (2x2, tidal island) |  |
| highland-games (2x2, highland games) |  |
| river-horse-bathing (2x2, river horse bathing) |  |
| boatyard (2x2, boatyard) |  |
| goose-girl (2x2, goose girl) |  |
| trajineras (2x2, trajineras) |  |
| post-bus (2x2, post bus) |  |
| city-view-dusk (2x2, city view dusk) |  |
| snowfall-bridge (2x2, snowfall bridge) |  |
| dawn-market-wagons (2x2, dawn market wagons) |  |
| peat-cutting (2x2, peat cutting) |  |
| seawall-train (2x2, seawall train) |  |
| mokoro-papyrus (2x2, mokoro papyrus) |  |
| midsummer-bonfire (2x2, midsummer bonfire) |  |
| lake-town-night (2x2, lake town night) |  |
| rodeo (2x2, rodeo) |  |
| poplar-river (2x2, poplar river) |  |
| reed-boats (2x2, reed boats) |  |
| flea-market (2x2, flea market) |  |
| riverside-picnic (2x2, riverside picnic) |  |
| ballet-rehearsal (2x2, ballet rehearsal) |  |
| winter-street-dome (2x2, winter street dome) |  |
| polder (2x2, polder) |  |
| alpine-train (2x2, alpine train) |  |
| ghost-town (2x2, ghost town) |  |
| fauvist-port (2x2, fauvist port) |  |
| sheepdog-trial (2x2, sheepdog trial) |  |
| river-shower-boats (2x2, river shower boats) |  |
| blossom-orchard (2x2, blossom orchard) |  |
| hillside-houses (2x2, hillside houses) |  |
| cycle-race (2x2, cycle race) |  |
| racehorses (2x2, racehorses) |  |
| coast-road-cove (2x2, coast road cove) |  |
| river-barges (2x2, river barges) |  |
| leg-rowers (2x2, leg rowers) |  |
| village-fete (2x2, village fete) |  |
| lake-summer-houses (2x2, lake summer houses) |  |
| fish-landing (2x2, fish landing) |  |
| alpine-pass-mules (2x2, alpine pass mules) |  |
| autumn-village (2x2, autumn village) |  |
| crows-winter-field (2x2, crows winter field) |  |
| hayracks (2x2, hayracks) |  |
| pottery-market (2x2, pottery market) |  |
| moonlit-bay (2x2, moonlit bay) |  |
| midnight-sun (2x2, midnight sun) |  |
| full-moon-reeds (2x2, full moon reeds) |  |
| fish-market-dutch (2x2, fish market dutch) |  |
| petanque (2x2, petanque) |  |
| island-market (2x2, island market) |  |
| hay-barn-meadow (2x2, hay barn meadow) |  |
| cattle-ford (2x2, cattle ford) |  |
| willows-misty-river (2x2, willows misty river) |  |
| rowing-race-crowd (2x2, rowing race crowd) |  |
| hillside-harbour-town (2x2, hillside harbour town) |  |
| white-steeple-fall (2x2, white steeple fall) |  |
| hill-town-ochre (2x2, hill town ochre) |  |
| canyon-river-bend (2x2, canyon river bend) |  |
| desert-mesas (2x2, desert mesas) |  |
| stormy-swell (2x2, stormy swell) |  |
| river-town-bridge (2x2, river town bridge) |  |
| rainy-street-night (2x2, rainy street night) |  |
| village-pond (2x2, village pond) |  |
| night-bridge-lights (2x2, night bridge lights) |  |
| winter-village-dusk (2x2, winter village dusk) |  |
| autumn-valley-print (2x2, autumn valley print) |  |
| city-park-boating (2x2, city park boating) |  |
| schooner-harbour (2x2, schooner harbour) |  |
| cantilever-nets (2x2, cantilever nets) |  |
| clifftop-sheep (2x2, clifftop sheep) |  |
| market-square-livestock (2x2, market square livestock) |  |
| park-avenue-autumn (2x2, park avenue autumn) |  |
| papel-picado-plaza (2x2, papel picado plaza) |  |
| steam-cranes-dock (2x2, steam cranes dock) |  |
| jungle-river (2x2, jungle river) |  |
| cafe-interior (2x2, cafe interior) |  |
| lava-moss-field (2x2, lava moss field) |  |
| lawn-tennis (2x2, lawn tennis) |  |
| river-village-willows (2x2, river village willows) |  |
| allotments-summer (2x2, allotments summer) |  |
| ochre-sails-lagoon (2x2, ochre sails lagoon) |  |
| gondola-lift (2x2, gondola lift) |  |
| river-valley (2x2, river valley) |  |
| glacial-lake-tents (2x2, glacial lake tents) |  |
| fireworks-river (2x2, fireworks river) |  |
| narrowboats-towpath (2x2, narrowboats towpath) |  |
| layered-hills-dawn (2x2, layered hills dawn) |  |
| shrimp-fishers (2x2, shrimp fishers) |  |
| savanna-zebras (2x2, savanna zebras) |  |
| log-drivers (2x2, log drivers) |  |
| arcaded-street (2x2, arcaded street) |  |
| andean-terraces (2x2, andean terraces) |  |
| rooftops-laundry (2x2, rooftops laundry) |  |
| threshing-day (2x2, threshing day) |  |
| winding-road-hills (2x2, winding road hills) |  |
| street-musicians (2x2, street musicians) |  |
| autumn-ploughing (2x2, autumn ploughing) |  |
| wax-print-market (2x2, wax print market) |  |
| promenade-parasols (2x2, promenade parasols) |  |
| pergola-lunch (2x2, pergola lunch) |  |
| chateau-lake (2x2, chateau lake) |  |
| cricket-green (2x2, cricket green) |  |
| lakeside-inn (2x2, lakeside inn) |  |
| alpine-hut-hikers (2x2, alpine hut hikers) |  |
| rocky-cove (2x2, rocky cove) |  |
| regatta-headland (2x2, regatta headland) |  |
| autumn-lake-reflections (2x2, autumn lake reflections) |  |
| winter-farmyard (2x2, winter farmyard) |  |
| squid-boats-night (2x2, squid boats night) |  |
| street-of-steps (2x2, street of steps) |  |
| thermal-pools (2x2, thermal pools) |  |
| hop-picking (2x2, hop picking) |  |
| ink-haircut (2x2, ink haircut) |  |
| ink-icing-cake (2x2, ink icing cake) |  |
| ink-spaniel (2x2, ink spaniel) |  |
| ink-thread-pins (2x2, ink thread pins) |  |
| ink-pram (2x2, ink pram) |  |
| ink-model-yacht (2x2, ink model yacht) |  |
| ink-ironing (2x2, ink ironing) |  |
| ink-shoeshine (2x2, ink shoeshine) |  |
| ink-bowler (2x2, ink bowler) |  |
| ink-waiter (2x2, ink waiter) | 2 |
| ink-badminton (2x2, ink badminton) |  |
| ink-puncture (2x2, ink puncture) |  |
| ink-cutting-roses (2x2, ink cutting roses) |  |
| ink-wallpaper (2x2, ink wallpaper) |  |
| ink-projectionist (2x2, ink projectionist) | 19 |
| ink-switchboard (2x2, ink switchboard) |  |
| ink-croquet (2x2, ink croquet) |  |
| ink-pug (2x2, ink pug) |  |
| ink-terrier (2x2, ink terrier) |  |
| ink-greyhound (2x2, ink greyhound) |  |
| ink-bulldog (2x2, ink bulldog) |  |
| ink-hamster (2x2, ink hamster) |  |
| ink-woodpecker (2x2, ink woodpecker) |  |
| ink-gull (2x2, ink gull) |  |
| ink-field-mouse (2x2, ink field mouse) |  |
| ink-lobster (2x2, ink lobster) |  |
| ink-boxing-gloves (2x2, ink boxing gloves) |  |
| ink-birdcage (2x2, ink birdcage) | 6 |
| ink-garden-gnome (2x2, ink garden gnome) |  |
| ink-perfume (2x2, ink perfume) |  |
| ink-handbell (2x2, ink handbell) |  |
| ink-pepper-mill (2x2, ink pepper mill) |  |
| ink-toy-plane (2x2, ink toy plane) |  |
| ink-door-knocker (2x2, ink door knocker) |  |
| ink-sundae (2x2, ink sundae) |  |
| ink-sardines (2x2, ink sardines) |  |
| ink-trifle (2x2, ink trifle) |  |
| ink-porridge (2x2, ink porridge) |  |
| ink-battenberg (2x2, ink battenberg) |  |
| ink-crumpets (2x2, ink crumpets) |  |
| ink-crumble (2x2, ink crumble) |  |
| ink-cauliflower (2x2, ink cauliflower) |  |
| ink-raspberries (2x2, ink raspberries) |  |
| ink-taxi (2x2, ink taxi) | 12 |
| ink-roadster (2x2, ink roadster) |  |
| ink-milk-float (2x2, ink milk float) |  |
| ink-soapbox (2x2, ink soapbox) |  |
| ink-traction-engine (2x2, ink traction engine) |  |
| ink-snowplough (2x2, ink snowplough) | 17 |
| ink-forklift (2x2, ink forklift) |  |
| ink-dodgems (2x2, ink dodgems) |  |
| ink-pigeons (2x2, ink pigeons) |  |
| ink-hydrant (2x2, ink hydrant) |  |
| ink-sprinkler (2x2, ink sprinkler) |  |
| ink-seesaw (2x2, ink seesaw) |  |
| ink-station-master (2x2, ink station master) |  |
| ink-level-crossing (2x2, ink level crossing) |  |
| ink-fireside (2x2, ink fireside) |  |
| ink-kennel (2x2, ink kennel) |  |
| ink-bird-table (2x2, ink bird table) |  |
