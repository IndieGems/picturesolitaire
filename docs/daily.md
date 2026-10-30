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

## Until 2026-08-31

Mid-campaign difficulty (about campaign boards 11 to 19), pictures of mixed sizes.

| weekday | pictures | lookalikes | cards per picture | cards | shown | chain | careless win, target | careless win, dealt | mean par |
|---|---|---|---|---|---|---|---|---|---|
| Sunday | 6 | none | 2 4 6 9 | 29-31 | 0 | 2-3 | 70%-95% | 73-93% | 19.2 |
| Monday | 6 | none | 2 4 6 | 24-26 | 0 | 2-3 | 80%-100% | 100-100% | 15.0 |
| Tuesday | 6 | none | 2 4 6 | 28-30 | 0 | 2-3 | 70%-95% | 83-94% | 18.5 |
| Wednesday | 6 | none | 2 4 6 9 | 28-30 | 0 | 3-3 | 65%-90% | 67-83% | 17.5 |
| Thursday | 7 | none | 2 4 6 | 26-28 | 0 | 2-3 | 70%-95% | 72-83% | 16.3 |
| Friday | 6 | none | 4 6 9 | 29-31 | 0 | 3-3 | 60%-90% | 67-83% | 19.5 |
| Saturday | 7 | none | 2 4 6 | 27-29 | 0 | 2-3 | 65%-90% | 67-89% | 15.8 |

## From 2026-09-01: today's rules

A 4x5 board of squares only, readable (a player who draws by the face-up cards
wins 85% or more), a safe start, current pictures only (no landmark, none from
before the clear pictures, none of trips 9 and 10's new ones), no lookalikes,
nothing busy 2 and at most one busy picture. A survey of 4x5 square deals
(2026-10-27, 200 seeds each): 8 or 9 squares at these targets are nearly
always readable, 10 almost never. The days from 28 October were first made so
on 2026-10-28 (creator, playing that day's old-style board), and 1 September to
27 October re-dealt so on 2026-10-30 (lead: VIPs play past days' dailies, from
about the last month; [vip.md](vip.md)).

| weekday | pictures | lookalikes | cards per picture | cards | shown | chain | careless win, target | careless win, dealt | mean par |
|---|---|---|---|---|---|---|---|---|---|
| Sunday | 9 | none | 4 | 36-36 | 0 | any | 70%-95% | 71-94% | 21.0 |
| Monday | 8 | none | 4 | 32-32 | 0 | any | 85%-100% | 89-100% | 17.9 |
| Tuesday | 9 | none | 4 | 36-36 | 0 | any | 75%-95% | 76-94% | 20.9 |
| Wednesday | 9 | none | 4 | 36-36 | 0 | any | 70%-90% | 72-89% | 20.8 |
| Thursday | 8 | none | 4 | 32-32 | 0 | any | 80%-97% | 81-96% | 18.9 |
| Friday | 9 | none | 4 | 36-36 | 0 | any | 65%-90% | 65-89% | 20.9 |
| Saturday | 9 | none | 4 | 36-36 | 0 | any | 70%-95% | 70-95% | 20.9 |

## The events' days

On each day of a VIP event (`src/content/levels/events.json`, from
`tools/levels/events-plan.json`; [daily-suitcase.md](daily-suitcase.md)), the
board hides the day's item as one of its squares, finished like any picture;
the stored line finishes it neither first nor last, and the pictures count
includes it. 42 days carry an item: halloween-2026 from 2026-10-15, ski-trip-2026 from 2026-11-01, winter-market-2026 from 2026-12-01.
The maker places an item IN PLACE on a day already dealt (it takes a square's
spot, so the deal, line and par stay) and lifts it the same way from a day no
event covers any more, so the plan can change with no re-deal.

The data (agreed with Gameplay, UI, Server and Art): a day's board carries
`"item": { "id": "<item id>" }` right after its size, the id one of its own
2x2 pictures, whose files are in pictures.json `items`. Each event runs
14 days; each of its items comes up at least twice and in both weeks,
its days at least 4 apart (`tools/levels/events.mts`, seeded by the event's id).

Every picture's appearances in the pool: 0 to 6 (mean 2.0); no picture is on two boards within three days.
