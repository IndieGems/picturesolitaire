# What a win pays

Coins only, never Gems. Every payout is made by the win checker (`functions/checker`)
after it has replayed the board's winning line on the rules, through one progression per
board in the game config, so **each board pays once, ever**, and a resent claim or a
replay pays nothing. Written by `node tools/server/make-config.mts`; do not edit by hand.

**The rule** (agreed with the lead, 2026-10-24): about 1.1 Coins per move of the board's
stored winning line, rounded to 5. Campaign boards 10 to 40, challenge boards 10 to 50.
A campaign board's stored line is a winning line, not necessarily the shortest; a challenge
board's is its par, the fewest moves found. Its length stands in for how long the board
takes. Campaign board 1 pays the onboarding prize instead, 100. The daily puzzle pays
50, once a day.

## The hourly maths (the standard: about 500 an hour of ordinary play)

- Campaign: 26 boards, 765 Coins in all (665 without the onboarding prize).
  The design puts a relaxed board at 2 to 4 minutes. At 3 minutes a board, 27 a board
  is about 532 Coins an hour; at 2 minutes 798, at 4 minutes 399.
- Challenge route: 20 boards, 540 Coins in all, 27 a board on average.
  At 4 minutes a board that is about 405 an hour; at 5 minutes 324.
- Daily: 50 once a day, on top.
- One-time: the onboarding prize. Replays and campaign boards past the last pay nothing.
- **Still to measure**: real minutes per board once the creator has played some (the lead's
  note): if boards run much faster or slower than 2 to 4 minutes, change the rule here.

## Board by board

| board | lane | stored winning line (moves) | Coins |
|---|---|---|---|
| c01 | campaign 1 | 7 | 100 (onboarding prize) |
| c02 | campaign 2 | 11 | 10 |
| c03 | campaign 3 | 26 | 30 |
| c04 | campaign 4 | 18 | 20 |
| c05 | campaign 5 | 25 | 30 |
| c06 | campaign 6 | 23 | 25 |
| c07 | campaign 7 | 26 | 30 |
| c08 | campaign 8 | 15 | 15 |
| c09 | campaign 9 | 23 | 25 |
| c10 | campaign 10 | 26 | 30 |
| c11 | campaign 11 | 13 | 15 |
| c12 | campaign 12 | 22 | 25 |
| c13 | campaign 13 | 25 | 30 |
| c14 | campaign 14 | 27 | 30 |
| c15 | campaign 15 | 24 | 25 |
| c16 | campaign 16 | 20 | 20 |
| c17 | campaign 17 | 27 | 30 |
| c18 | campaign 18 | 21 | 25 |
| c19 | campaign 19 | 30 | 35 |
| c20 | campaign 20 | 33 | 35 |
| c21 | campaign 21 | 13 | 15 |
| c22 | campaign 22 | 28 | 30 |
| c23 | campaign 23 | 30 | 35 |
| c24 | campaign 24 | 26 | 30 |
| c25 | campaign 25 | 32 | 35 |
| c26 | campaign 26 | 32 | 35 |
| ch01 | challenge 1 | 19 | 20 |
| ch02 | challenge 2 | 21 | 25 |
| ch03 | challenge 3 | 19 | 20 |
| ch04 | challenge 4 | 19 | 20 |
| ch05 | challenge 5 | 19 | 20 |
| ch06 | challenge 6 | 23 | 25 |
| ch07 | challenge 7 | 26 | 30 |
| ch08 | challenge 8 | 29 | 30 |
| ch09 | challenge 9 | 21 | 25 |
| ch10 | challenge 10 | 28 | 30 |
| ch11 | challenge 11 | 20 | 20 |
| ch12 | challenge 12 | 27 | 30 |
| ch13 | challenge 13 | 26 | 30 |
| ch14 | challenge 14 | 22 | 25 |
| ch15 | challenge 15 | 28 | 30 |
| ch16 | challenge 16 | 25 | 30 |
| ch17 | challenge 17 | 28 | 30 |
| ch18 | challenge 18 | 30 | 35 |
| ch19 | challenge 19 | 26 | 30 |
| ch20 | challenge 20 | 31 | 35 |
