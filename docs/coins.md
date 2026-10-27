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

- Campaign: 90 boards, 3115 Coins in all (3015 without the onboarding prize).
  The design puts a relaxed board at 2 to 4 minutes. At 3 minutes a board, 34 a board
  is about 678 Coins an hour; at 2 minutes 1016, at 4 minutes 508.
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
| c10 | campaign 10 | 37 | 40 |
| c11 | campaign 11 | 13 | 15 |
| c12 | campaign 12 | 22 | 25 |
| c13 | campaign 13 | 25 | 30 |
| c14 | campaign 14 | 27 | 30 |
| c15 | campaign 15 | 24 | 25 |
| c16 | campaign 16 | 20 | 20 |
| c17 | campaign 17 | 27 | 30 |
| c18 | campaign 18 | 21 | 25 |
| c19 | campaign 19 | 30 | 35 |
| c20 | campaign 20 | 41 | 40 |
| c21 | campaign 21 | 13 | 15 |
| c22 | campaign 22 | 28 | 30 |
| c23 | campaign 23 | 30 | 35 |
| c24 | campaign 24 | 26 | 30 |
| c25 | campaign 25 | 32 | 35 |
| c26 | campaign 26 | 32 | 35 |
| c27 | campaign 27 | 29 | 30 |
| c28 | campaign 28 | 29 | 30 |
| c29 | campaign 29 | 39 | 40 |
| c30 | campaign 30 | 40 | 40 |
| c31 | campaign 31 | 22 | 25 |
| c32 | campaign 32 | 37 | 40 |
| c33 | campaign 33 | 31 | 35 |
| c34 | campaign 34 | 33 | 35 |
| c35 | campaign 35 | 34 | 35 |
| c36 | campaign 36 | 14 | 15 |
| c37 | campaign 37 | 33 | 35 |
| c38 | campaign 38 | 45 | 40 |
| c39 | campaign 39 | 33 | 35 |
| c40 | campaign 40 | 42 | 40 |
| c41 | campaign 41 | 28 | 30 |
| c42 | campaign 42 | 38 | 40 |
| c43 | campaign 43 | 43 | 40 |
| c44 | campaign 44 | 35 | 40 |
| c45 | campaign 45 | 49 | 40 |
| c46 | campaign 46 | 28 | 30 |
| c47 | campaign 47 | 33 | 35 |
| c48 | campaign 48 | 40 | 40 |
| c49 | campaign 49 | 35 | 40 |
| c50 | campaign 50 | 44 | 40 |
| c51 | campaign 51 | 13 | 15 |
| c52 | campaign 52 | 42 | 40 |
| c53 | campaign 53 | 44 | 40 |
| c54 | campaign 54 | 44 | 40 |
| c55 | campaign 55 | 38 | 40 |
| c56 | campaign 56 | 28 | 30 |
| c57 | campaign 57 | 32 | 35 |
| c58 | campaign 58 | 41 | 40 |
| c59 | campaign 59 | 32 | 35 |
| c60 | campaign 60 | 41 | 40 |
| c61 | campaign 61 | 36 | 40 |
| c62 | campaign 62 | 39 | 40 |
| c63 | campaign 63 | 41 | 40 |
| c64 | campaign 64 | 38 | 40 |
| c65 | campaign 65 | 47 | 40 |
| c66 | campaign 66 | 14 | 15 |
| c67 | campaign 67 | 35 | 40 |
| c68 | campaign 68 | 42 | 40 |
| c69 | campaign 69 | 41 | 40 |
| c70 | campaign 70 | 35 | 40 |
| c71 | campaign 71 | 30 | 35 |
| c72 | campaign 72 | 40 | 40 |
| c73 | campaign 73 | 40 | 40 |
| c74 | campaign 74 | 35 | 40 |
| c75 | campaign 75 | 41 | 40 |
| c76 | campaign 76 | 38 | 40 |
| c77 | campaign 77 | 34 | 35 |
| c78 | campaign 78 | 32 | 35 |
| c79 | campaign 79 | 52 | 40 |
| c80 | campaign 80 | 39 | 40 |
| c81 | campaign 81 | 13 | 15 |
| c82 | campaign 82 | 40 | 40 |
| c83 | campaign 83 | 45 | 40 |
| c84 | campaign 84 | 39 | 40 |
| c85 | campaign 85 | 53 | 40 |
| c86 | campaign 86 | 34 | 35 |
| c87 | campaign 87 | 41 | 40 |
| c88 | campaign 88 | 40 | 40 |
| c89 | campaign 89 | 47 | 40 |
| c90 | campaign 90 | 47 | 40 |
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
