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
| 1 | intro | 4x5 | 6 | none | 4 4 9 4 4 6 | 2x2 2x3 3x3 | 31 (11) | 2 | 4 | 2 | 1 | 33% | 19 |
| 2 | demand | 4x5 | 6 | 2 lavender | 4 4 4 6 6 6 | 2x2 2x3 3x2 | 30 (10) | 1 | 3 | 2 | 1 | 24% | 21 |
| 3 | relief | 4x5 | 6 | 2 blue hour | 6 6 2 6 4 6 | 2x1 2x2 2x3 3x2 | 30 (10) | 1 | 3 | 2 | 1 | 67% | 19 |
| 4 | demand | 4x5 | 6 | 3 lavender | 4 6 9 2 6 6 | 1x2 2x2 2x3 3x2 3x3 | 33 (13) | 1 | 4 | 3 | 1 | 25% | 19 |
| 5 | demand | 4x5 | 7 | 3 warm dusk, 2 berry red | 4 2 6 6 6 4 6 | 2x1 2x2 2x3 3x2 | 34 (14) | 0 | 4 | 3 | 2 | 12% | 19 |
| 6 | relief | 4x6 | 7 | 2 sea blue | 6 4 4 4 6 6 6 | 2x2 2x3 3x2 | 36 (12) | 1 | 3 | 2 | 1 | 67% | 23 |
| 7 | demand | 4x6 | 7 | 2 warm dusk, 2 berry red | 4 4 6 9 4 6 6 | 2x2 2x3 3x2 3x3 | 39 (15) | 1 | 4 | 3 | 1 | 33% | 26 |
| 8 | demand | 4x6 | 8 | 3 autumn rust | 4 9 2 6 6 6 6 2 | 1x2 2x2 2x3 3x2 3x3 | 41 (17) | 1 | 5 | 4 | 2 | 13% | 29 |
| 9 | relief | 4x6 | 7 | 2 fresh green | 6 6 2 6 2 6 6 | 1x2 2x1 2x3 3x2 | 34 (10) | 1 | 3 | 2 | 1 | 54% | 21 |
| 10 | demand | 4x6 | 8 | 4 berry red, 2 lemon yellow | 4 4 9 4 2 6 6 6 | 1x2 2x2 2x3 3x2 3x3 | 41 (17) | 0 | 5 | 3 | 2 | 22% | 28 |
| 11 | relief | 5x5 | 7 | 2 golden wheat | 2 6 6 6 6 2 6 | 1x2 2x1 2x3 3x2 | 34 (9) | 1 | 3 | 2 | 1 | 60% | 20 |
| 12 | demand | 5x5 | 8 | 3 lemon yellow | 4 9 4 9 4 4 4 4 | 2x2 3x3 | 42 (17) | 1 | 4 | 2 | 1 | 31% | 27 |
| 13 | demand | 5x5 | 9 | 3 golden wheat, 2 autumn rust | 6 2 2 6 6 6 2 6 6 | 1x2 2x1 2x3 3x2 | 42 (17) | 0 | 5 | 4 | 2 | 8% | 26 |
| 14 | relief | 5x5 | 8 | 2 warm dusk, 2 blue hour | 6 6 4 2 2 6 6 6 | 2x1 2x2 2x3 3x2 | 38 (13) | 1 | 3 | 2 | 1 | 50% | 22 |
| 15 | demand | 5x5 | 9 | 4 berry red, 2 fresh green | 4 4 2 9 2 6 6 6 6 | 1x2 2x2 2x3 3x2 3x3 | 45 (20) | 0 | 5 | 4 | 2 | 8% | 28 |
| 16 | relief | 5x6 | 9 | 2 pink bloom, 2 sea blue | 4 6 4 4 6 4 4 4 6 | 2x2 2x3 | 42 (12) | 1 | 3 | 2 | 1 | 69% | 25 |
| 17 | demand | 5x6 | 10 | 3 lemon yellow, 2 blue hour | 6 9 2 4 2 6 4 6 4 4 | 1x2 2x1 2x2 2x3 3x2 3x3 | 47 (17) | 1 | 5 | 4 | 2 | 13% | 28 |
| 18 | demand | 5x6 | 10 | 4 pink bloom, 3 golden wheat | 4 6 2 4 6 2 6 6 6 6 | 1x2 2x1 2x2 2x3 3x2 | 48 (18) | 0 | 4 | 4 | 2 | 10% | 30 |
| 19 | relief | 5x6 | 9 | 3 lavender, 2 autumn rust | 4 6 2 6 4 4 6 6 6 | 1x2 2x2 2x3 3x2 | 44 (14) | 1 | 4 | 3 | 1 | 60% | 26 |
| 20 | finale | 5x6 | 11 | 4 lemon yellow, 3 fresh green, 2 warm dusk | 6 4 9 2 4 2 9 4 4 4 2 | 1x2 2x1 2x2 2x3 3x3 | 50 (20) | 0 | 5 | 4 | 2 | 8% | 31 |

Every picture's appearances across the route: 3 to 6 (mean 4.0).

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
| apple-orchard (2x2, autumn rust) | 1, 8, 12, 19 |
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
| greenhouse (2x2, fresh green) | 6, 10, 15, 20 |
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
| canal-bicycle (2x3, lemon yellow) | 6, 14, 17, 20 |
