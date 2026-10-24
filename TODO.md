# What is still owed

- **Before 31 Jan 2027: extend the daily puzzle.** The shipped pool ends on
  2027-01-31; past it there is no daily. Run
  `node tools/levels/make-daily.mts --to <a date months ahead>` (it only
  appends days), commit `src/content/levels/daily.json`, then rebuild and
  publish the Server's win checker (`functions/checker`) so it knows the new
  days.
