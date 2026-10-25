# The daily puzzle

One board per calendar date, the same deal for every player on that date
(`src/content/levels/daily.json`, 184 days: 2026-08-01 to 2027-01-31).
Made by `node tools/levels/make-daily.mts`, which keeps every day it has
(re-dealing only a day that uses a flagged picture): `--to YYYY-MM-DD` adds
days. Every board is re-proved by
`node tools/levels/check.mts`. Do not edit by hand.

The pool starts on 1 August 2026 so that an archive of this month and the two
before it has a board for every day it can show.

Every day is mid-campaign difficulty (about campaign boards 11 to 19), with a
weekly rhythm so that days next to each other feel different. The weekday is
the date's own, the same for everyone. Each board's par is the fewest moves the
solver found.

| weekday | pictures | lookalikes | cards per picture | cards | shown | chain | careless win | mean par |
|---|---|---|---|---|---|---|---|---|
| Sunday | 6 | none | 2 4 6 9 | 29-31 | 0 | 2-3 | 70%-95% | 19.9 |
| Monday | 6 | none | 2 4 6 | 24-26 | 0 | 2-3 | 80%-100% | 15.0 |
| Tuesday | 6 | none | 2 4 6 | 28-30 | 0 | 2-3 | 70%-95% | 19.1 |
| Wednesday | 6 | none | 2 4 6 9 | 28-30 | 0 | 3-3 | 65%-90% | 18.4 |
| Thursday | 7 | none | 2 4 6 | 26-28 | 0 | 2-3 | 70%-95% | 15.9 |
| Friday | 6 | none | 4 6 9 | 29-31 | 0 | 3-3 | 60%-90% | 19.5 |
| Saturday | 7 | none | 2 4 6 | 27-29 | 0 | 2-3 | 65%-90% | 16.1 |

Every picture's appearances in the pool: 0 to 33 (mean 4.1); no picture is on two boards within three days.
