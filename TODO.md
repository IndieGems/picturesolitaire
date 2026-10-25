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
(`src/net/claims.ts`, Server), pictures at the size drawn (Art, Gameplay, UI).
Still owed:

- **At release:** analytics events and funnels (Untangled's
  `docs/analytics.md` shape); twelve locales, with a fallback font behind
  Fredoka for ą ę ż İ ğ ş and Cyrillic (Untangled's `FACES`) and a text-fit
  check per language; the store page rewritten (it still says 30 boards and
  look-alike pictures), new screenshots and hover loop.
- **Creator's taste, to ask one at a time:** home waiting (capped) to appear
  whole, as Untangled's does; a phone held sideways covered by "turn upright"
  instead of our sideways layout.

- **The challenge route and the daily under the new picture rules** (after
  campaign boards 14–26 and the creator's review): today they mix long and
  square pictures and use the older, busier pictures. Levels counts the
  pictures needed; the batch is the creator's call.
