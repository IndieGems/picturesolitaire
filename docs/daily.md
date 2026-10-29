# The daily puzzle

One board per calendar date, the same deal for every player on that date
(`src/content/levels/daily.json`, 334 days: 2026-08-01 to 2027-06-30).
Made by `node tools/levels/make-daily.mts`, which keeps every day it has
(re-dealing only a day that uses a flagged picture): `--to YYYY-MM-DD` adds
days. Every board is re-proved by
`node tools/levels/check.mts`. Do not edit by hand.

The pool starts on 1 August 2026 so that an archive of this month and the two
before it has a board for every day it can show. Every day has a weekly rhythm,
so that days next to each other feel different. The weekday is the date's own,
the same for everyone. Each board's par is the fewest moves the solver found.

## Until 2026-10-27

Mid-campaign difficulty (about campaign boards 11 to 19), pictures of mixed sizes.
The last four days of October, 28 to 31, were re-dealt on 2026-10-28 (creator,
playing that day's old-style board) under the rules of the next section,
without an item, as the event starts on 2026-11-01; the next section's
table counts them too.

| weekday | pictures | lookalikes | cards per picture | cards | shown | chain | careless win, target | careless win, dealt | mean par |
|---|---|---|---|---|---|---|---|---|---|
| Sunday | 6 | none | 2 4 6 9 | 29-31 | 0 | 2-3 | 70%-95% | 73-94% | 19.5 |
| Monday | 6 | none | 2 4 6 | 24-26 | 0 | 2-3 | 80%-100% | 100-100% | 14.8 |
| Tuesday | 6 | none | 2 4 6 | 28-30 | 0 | 2-3 | 70%-95% | 74-94% | 19.2 |
| Wednesday | 6 | none | 2 4 6 9 | 28-30 | 0 | 3-3 | 65%-90% | 67-89% | 18.3 |
| Thursday | 7 | none | 2 4 6 | 26-28 | 0 | 2-3 | 70%-95% | 72-94% | 16.1 |
| Friday | 6 | none | 4 6 9 | 29-31 | 0 | 3-3 | 60%-90% | 67-87% | 19.5 |
| Saturday | 7 | none | 2 4 6 | 27-29 | 0 | 2-3 | 65%-90% | 67-89% | 16.0 |

## From 2026-11-01: the Daily Suitcase

Each board hides the day's item (`src/content/levels/suitcases.json`;
[daily-suitcase.md](daily-suitcase.md)) as one of its squares, finished like
any picture; the stored line finishes it neither first nor last. Made under
today's rules: a 4x5 board of squares only, readable (a player who draws by the
face-up cards wins 85% or more), a safe start, current pictures only (no
landmark, none from before the clear pictures, none of trips 9 and 10's new
ones), no lookalikes, nothing busy 2 and at most one busy picture. The
pictures count includes the item. A survey of 4x5 square deals (2026-10-27,
200 seeds each): 8 or 9 squares at these targets are nearly always readable,
10 almost never.

The data (agreed with Gameplay, UI, Server and Art): a day's board carries
`"item": { "id": "item-YYYY-MM-NN" }` right after its size, the id one of its
own 2x2 pictures, whose files are in pictures.json `items`. The month's theme,
table, ten items and the item of each day are in `suitcases.json`
(`node tools/levels/make-suitcases.mts`, run before this maker). Each item comes
up 2 to 4 times a month, none has all its days within a week, and none comes
back within 3 days (`tools/levels/suitcase.mts`, seeded by the month alone).

| weekday | pictures | lookalikes | cards per picture | cards | shown | chain | careless win, target | careless win, dealt | mean par |
|---|---|---|---|---|---|---|---|---|---|
| Sunday | 9 | none | 4 | 36-36 | 0 | any | 70%-95% | 72-94% | 21.1 |
| Monday | 8 | none | 4 | 32-32 | 0 | any | 85%-100% | 89-100% | 18.1 |
| Tuesday | 9 | none | 4 | 36-36 | 0 | any | 75%-95% | 76-94% | 20.9 |
| Wednesday | 9 | none | 4 | 36-36 | 0 | any | 70%-90% | 72-89% | 20.8 |
| Thursday | 8 | none | 4 | 32-32 | 0 | any | 80%-97% | 81-96% | 18.8 |
| Friday | 9 | none | 4 | 36-36 | 0 | any | 65%-90% | 65-89% | 21.0 |
| Saturday | 9 | none | 4 | 36-36 | 0 | any | 70%-95% | 70-95% | 20.9 |

Every picture's appearances in the pool: 0 to 16 (mean 1.8); no picture is on two boards within three days.
