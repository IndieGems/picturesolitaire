# What is still owed

- **Before 30 Jun 2027: extend the daily puzzle** (it now runs to 2027-06-30, with the
  Daily Suitcase's items). Levels runs `make-daily.mts` for the new months once Art's
  items for them exist, then Server rebuilds the checker.
- **Each month's suitcase art a month ahead** (Art): 10 items, the table and its icon
  for the next theme in `docs/daily-suitcase.md`. January's is due by 1 Dec 2026.
- **On or after 1 Nov 2026: a framed check of the first live suitcase** as a new test
  guest: the home banner, the first pack flying in on the daily's win card, and the
  suitcase screen (UI or QA).
- **Build size:** 0.31.0 is 618 MB of a 1 GiB limit, up from 349 MB, mostly the
  re-dealt dailies' packs. Before more trips or months, Art de-duplicates pictures
  that repeat across packs, or ships a month's dailies only near their month.

## The travelogue (2026-10-25)

- **Trip 11 and on.** Ten trips ship (boards 1–150, to the UK & Ireland); New Zealand is in reserve. The creator picks where. Their pictures come first from the clear pictures the atmospheric swap takes out of boards 1–150 (creator, 2026-10-28; Levels keeps the list), then new ones. Art's cap is $60 (raised 2026-10-28 for the atmospheric batch and the Souvenirs), with $52.23 spent before the Souvenirs. Later trips grow through 5×5 and 6×6 boards, within the readable and careful-player rules (`docs/difficulty-curve.md`).
- **The challenge route and daily** still deal some landmark pictures (`"landmark": true`). Swap them out when those are redone under the new picture rules.
- **The old albums' code** is unreachable from home; remove it, and the albums' catalogue fields, when the passport has settled.
- **At release:** a travel key art for the store page (the current one is the old winter table), and a new preview video showing a postcard unfolding.

## From the Untangled review (2026-10-25)

Untangled (`IndieGems/yarn`, cloned beside this game) is the standard's
reference game. In hand now: the settings mirror (`gem.settings.declare`,
UI), cards as keyboard dialogs (UI), held wins trimmed in order
(`src/net/claims.ts`, Server), pictures at the size drawn (Art, Gameplay, UI).
Still owed:

- **At release:** analytics events and funnels (Untangled's
  `docs/analytics.md` shape), including per board: tries per win, stuck
  notices, helpers spent and bought, and where players stop; Levels re-deals a
  board one picture lighter past ~2 tries (hard 3, super hard 5); twelve locales, with a fallback font behind
  Fredoka for ą ę ż İ ğ ş and Cyrillic (Untangled's `FACES`) and a text-fit
  check per language; the store page rewritten (it still says 30 boards and
  look-alike pictures), new screenshots and hover loop.
- **At release: a rights pass on the pictures** (creator, 2026-10-28; QA and Art, about half an hour):
  - flag any generated picture with lettering or logo-like marks (team jerseys, signs, rinds);
  - reverse-image-search the most iconic-looking pictures for near-copies of famous photos or characters;
  - confirm the image tool's terms allow commercial use (ask the platform);
  - check whether Gem Arcade asks for an AI-art disclosure on the store page;
  - re-read the postcards' borderline notes (Japan's temples and shrines, Dog Bark Park, Paul Bunyan, the Big Banana's name) and the Souvenirs' museum credits (`docs/credits.md`).
  Record the result in `docs/credits.md`.
- **Effects on WebGL, the next time they are worked on** (the standard,
  2026-10-25; QA's second pass, 2026-10-26): the milestone fireworks (a 2D
  canvas on the page's thread, UI) and the finished picture's twinkles (page
  elements, Gameplay) move to one WebGL layer drawn from its own worker. Jade
  Hands' fx layer is the model. The weather's CSS sprites can stay.

- **The challenge route and the daily under the new picture rules** (after
  campaign boards 14–26 and the creator's review): today they mix long and
  square pictures and use the older, busier pictures. Levels counts the
  pictures needed; the batch is the creator's call.
- **The upload's 2,000-file cap, before the library passes ~450 pictures.**
  Every picture ships three files (full, board copy, thumb): 290 pictures are
  870 files on 2026-10-25. Ship only pictures a shipped board or album uses,
  and/or drop the thumb or pack thumbs into sheets, before a batch would
  push the build past the cap (`gemctl build upload --dry-run` counts it).
