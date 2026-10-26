# What is still owed

- **Before 31 Jan 2027: extend the daily puzzle.** The shipped pool ends on
  2027-01-31; past it there is no daily. Run
  `node tools/levels/make-daily.mts --to <a date months ahead>` (it only
  appends days), commit `src/content/levels/daily.json`, then rebuild and
  publish the Server's win checker (`functions/checker`) so it knows the new
  days.

## The travelogue (2026-10-25)

- **Trip 3 and on.** The creator picks where; the lead suggested alternating home and abroad (American West next). Each trip needs 15 postcards (Art, about $1) and a destination list. The library has no unseen calm squares left: trip 3 can reuse pictures 15+ boards back, or a batch of about 120 new squares makes every picture new. The creator's call.
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
  `docs/analytics.md` shape); twelve locales, with a fallback font behind
  Fredoka for ą ę ż İ ğ ş and Cyrillic (Untangled's `FACES`) and a text-fit
  check per language; the store page rewritten (it still says 30 boards and
  look-alike pictures), new screenshots and hover loop.
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
