# What is still owed

- **Before 31 Jan 2027: extend the daily puzzle.** The shipped pool ends on
  2027-01-31; past it there is no daily. Run
  `node tools/levels/make-daily.mts --to <a date months ahead>` (it only
  appends days), commit `src/content/levels/daily.json`, then rebuild and
  publish the Server's win checker (`functions/checker`) so it knows the new
  days.

## From the Untangled review (2026-10-25)

Untangled (`IndieGems/yarn`, cloned beside this game) is the standard's
reference game. In hand now: the settings mirror (`gem.settings.declare`,
UI), cards as keyboard dialogs (UI), held wins trimmed in order
(`src/net/claims.ts`, Server). Still owed:

- **Lighter pictures, before the next big picture batch** (creator: after
  the review of boards 4–13). Each picture ships at full size (768×1024 for
  2×2, ~170 KB mean, up to 500 KB), so a board fetches 1 MB or more while the
  board draws it far smaller. Ship a board-sized copy (about 2× its drawn
  size on a 390 px phone, photo WebP ~0.74, as Untangled's `docs/mobile.md`
  §1) and fetch the full picture only for the enlarge view.
- **At release:** analytics events and funnels (Untangled's
  `docs/analytics.md` shape); twelve locales, with a fallback font behind
  Fredoka for ą ę ż İ ğ ş and Cyrillic (Untangled's `FACES`) and a text-fit
  check per language; the store page rewritten (it still says 30 boards and
  look-alike pictures), new screenshots and hover loop.
- **Creator's taste, to ask one at a time:** home waiting (capped) to appear
  whole, as Untangled's does; a phone held sideways covered by "turn upright"
  instead of our sideways layout.
