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

- Campaign: 30 boards, 810 Coins in all (710 without the onboarding prize).
  The design puts a relaxed board at 2 to 4 minutes. At 3 minutes a board, 24 a board
  is about 490 Coins an hour; at 2 minutes 734, at 4 minutes 367.
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
| c03 | campaign 3 | 14 | 15 |
| c04 | campaign 4 | 18 | 20 |
| c05 | campaign 5 | 16 | 20 |
| c06 | campaign 6 | 20 | 20 |
| c07 | campaign 7 | 19 | 20 |
| c08 | campaign 8 | 15 | 15 |
| c09 | campaign 9 | 17 | 20 |
| c10 | campaign 10 | 25 | 30 |
| c11 | campaign 11 | 15 | 15 |
| c12 | campaign 12 | 25 | 30 |
| c13 | campaign 13 | 20 | 20 |
| c14 | campaign 14 | 15 | 15 |
| c15 | campaign 15 | 33 | 35 |
| c16 | campaign 16 | 15 | 15 |
| c17 | campaign 17 | 26 | 30 |
| c18 | campaign 18 | 27 | 30 |
| c19 | campaign 19 | 21 | 25 |
| c20 | campaign 20 | 28 | 30 |
| c21 | campaign 21 | 24 | 25 |
| c22 | campaign 22 | 20 | 20 |
| c23 | campaign 23 | 27 | 30 |
| c24 | campaign 24 | 27 | 30 |
| c25 | campaign 25 | 35 | 40 |
| c26 | campaign 26 | 20 | 20 |
| c27 | campaign 27 | 29 | 30 |
| c28 | campaign 28 | 28 | 30 |
| c29 | campaign 29 | 25 | 30 |
| c30 | campaign 30 | 38 | 40 |
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
