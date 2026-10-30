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

**A Souvenir** (the optional all-long bonus board after each trip, `docs/souvenirs.md`) pays
what the better-paying of its trip's relief boards pays, once, ever (the lead, 2026-10-28: the
creator's "Coins like a relief board", a bonus for the detour). By the rule its short line, about
13 moves, would pay about 15; as a one-off per trip this adds about 350 Coins to the whole game
and leaves the hourly rate where it is.

## The hourly maths (the standard: about 500 an hour of ordinary play)

- Campaign: 150 boards, 5405 Coins in all (5305 without the onboarding prize).
  The design puts a relaxed board at 2 to 4 minutes. At 3 minutes a board, 36 a board
  is about 712 Coins an hour; at 2 minutes 1068, at 4 minutes 534.
- Challenge route: 20 boards, 540 Coins in all, 27 a board on average.
  At 4 minutes a board that is about 405 an hour; at 5 minutes 324.
- Daily: 50 once a day, on top.
- Souvenirs: 10 of 10 trips dealt, 350 Coins in all, once each (s1 20, s2 35, s3 30, s4 30, s5 40, s6 40, s7 40, s8 40, s9 35, s10 40).
- Events (VIPs only, docs/vip.md): 180 levels, 4220 Coins in all, once each, by the campaign's rule (halloween-2026 695, ski-trip-2026 690, train-journey-2026 700, winter-market-2026 710, northern-lights-2026 705, carnival-2027 720).
  23 a level: at 3 minutes a level about 469 an hour, the campaign's rate.
- Event items (the creator, 2026-10-30): 50 Coins with each item found, once per item, 500 an event
  (60 items, 3000 in all), paid as each lands, never in one grant over the platform's 100. The
  prize for finding all 10 is the event's table and its Passport stamp, no Coins and no helpers. With
  its levels (about 703), an event pays about 1203 over its 30 levels: at 3 minutes a level,
  about 802 an hour while playing an event, inside the standard's 250 to 1,000. Two events a
  month add 1000 Coins of finds a month to a VIP who finishes both.
- One-time: the onboarding prize. Replays and campaign boards past the last pay nothing.
- **Still to measure**: real minutes per board once the creator has played some (the lead's
  note): if boards run much faster or slower than 2 to 4 minutes, change the rule here.

## Board by board

| board | lane | stored winning line (moves) | Coins |
|---|---|---|---|
| c01 | campaign 1 | 7 | 100 (onboarding prize) |
| c02 | campaign 2 | 11 | 10 |
| c03 | campaign 3 | 22 | 25 |
| c04 | campaign 4 | 18 | 20 |
| c05 | campaign 5 | 25 | 30 |
| c06 | campaign 6 | 23 | 25 |
| c07 | campaign 7 | 26 | 30 |
| c08 | campaign 8 | 15 | 15 |
| c09 | campaign 9 | 23 | 25 |
| c10 | campaign 10 | 37 | 40 |
| c11 | campaign 11 | 13 | 15 |
| c12 | campaign 12 | 22 | 25 |
| c13 | campaign 13 | 32 | 35 |
| c14 | campaign 14 | 27 | 30 |
| c15 | campaign 15 | 24 | 25 |
| c16 | campaign 16 | 20 | 20 |
| c17 | campaign 17 | 27 | 30 |
| c18 | campaign 18 | 36 | 40 |
| c19 | campaign 19 | 31 | 35 |
| c20 | campaign 20 | 41 | 40 |
| c21 | campaign 21 | 13 | 15 |
| c22 | campaign 22 | 27 | 30 |
| c23 | campaign 23 | 30 | 35 |
| c24 | campaign 24 | 29 | 30 |
| c25 | campaign 25 | 32 | 35 |
| c26 | campaign 26 | 32 | 35 |
| c27 | campaign 27 | 33 | 35 |
| c28 | campaign 28 | 36 | 40 |
| c29 | campaign 29 | 41 | 40 |
| c30 | campaign 30 | 64 | 40 |
| c31 | campaign 31 | 22 | 25 |
| c32 | campaign 32 | 37 | 40 |
| c33 | campaign 33 | 39 | 40 |
| c34 | campaign 34 | 36 | 40 |
| c35 | campaign 35 | 34 | 35 |
| c36 | campaign 36 | 14 | 15 |
| c37 | campaign 37 | 33 | 35 |
| c38 | campaign 38 | 37 | 40 |
| c39 | campaign 39 | 40 | 40 |
| c40 | campaign 40 | 42 | 40 |
| c41 | campaign 41 | 28 | 30 |
| c42 | campaign 42 | 31 | 35 |
| c43 | campaign 43 | 42 | 40 |
| c44 | campaign 44 | 48 | 40 |
| c45 | campaign 45 | 49 | 40 |
| c46 | campaign 46 | 28 | 30 |
| c47 | campaign 47 | 37 | 40 |
| c48 | campaign 48 | 37 | 40 |
| c49 | campaign 49 | 40 | 40 |
| c50 | campaign 50 | 44 | 40 |
| c51 | campaign 51 | 13 | 15 |
| c52 | campaign 52 | 44 | 40 |
| c53 | campaign 53 | 43 | 40 |
| c54 | campaign 54 | 42 | 40 |
| c55 | campaign 55 | 38 | 40 |
| c56 | campaign 56 | 28 | 30 |
| c57 | campaign 57 | 36 | 40 |
| c58 | campaign 58 | 48 | 40 |
| c59 | campaign 59 | 35 | 40 |
| c60 | campaign 60 | 67 | 40 |
| c61 | campaign 61 | 36 | 40 |
| c62 | campaign 62 | 44 | 40 |
| c63 | campaign 63 | 43 | 40 |
| c64 | campaign 64 | 33 | 35 |
| c65 | campaign 65 | 47 | 40 |
| c66 | campaign 66 | 14 | 15 |
| c67 | campaign 67 | 35 | 40 |
| c68 | campaign 68 | 44 | 40 |
| c69 | campaign 69 | 40 | 40 |
| c70 | campaign 70 | 35 | 40 |
| c71 | campaign 71 | 30 | 35 |
| c72 | campaign 72 | 35 | 40 |
| c73 | campaign 73 | 46 | 40 |
| c74 | campaign 74 | 43 | 40 |
| c75 | campaign 75 | 41 | 40 |
| c76 | campaign 76 | 38 | 40 |
| c77 | campaign 77 | 48 | 40 |
| c78 | campaign 78 | 42 | 40 |
| c79 | campaign 79 | 41 | 40 |
| c80 | campaign 80 | 39 | 40 |
| c81 | campaign 81 | 13 | 15 |
| c82 | campaign 82 | 47 | 40 |
| c83 | campaign 83 | 42 | 40 |
| c84 | campaign 84 | 43 | 40 |
| c85 | campaign 85 | 53 | 40 |
| c86 | campaign 86 | 34 | 35 |
| c87 | campaign 87 | 42 | 40 |
| c88 | campaign 88 | 39 | 40 |
| c89 | campaign 89 | 46 | 40 |
| c90 | campaign 90 | 55 | 40 |
| c91 | campaign 91 | 38 | 40 |
| c92 | campaign 92 | 41 | 40 |
| c93 | campaign 93 | 31 | 35 |
| c94 | campaign 94 | 42 | 40 |
| c95 | campaign 95 | 40 | 40 |
| c96 | campaign 96 | 14 | 15 |
| c97 | campaign 97 | 44 | 40 |
| c98 | campaign 98 | 48 | 40 |
| c99 | campaign 99 | 34 | 35 |
| c100 | campaign 100 | 43 | 40 |
| c101 | campaign 101 | 28 | 30 |
| c102 | campaign 102 | 43 | 40 |
| c103 | campaign 103 | 35 | 40 |
| c104 | campaign 104 | 44 | 40 |
| c105 | campaign 105 | 38 | 40 |
| c106 | campaign 106 | 40 | 40 |
| c107 | campaign 107 | 34 | 35 |
| c108 | campaign 108 | 41 | 40 |
| c109 | campaign 109 | 39 | 40 |
| c110 | campaign 110 | 44 | 40 |
| c111 | campaign 111 | 13 | 15 |
| c112 | campaign 112 | 45 | 40 |
| c113 | campaign 113 | 47 | 40 |
| c114 | campaign 114 | 37 | 40 |
| c115 | campaign 115 | 39 | 40 |
| c116 | campaign 116 | 31 | 35 |
| c117 | campaign 117 | 40 | 40 |
| c118 | campaign 118 | 29 | 30 |
| c119 | campaign 119 | 37 | 40 |
| c120 | campaign 120 | 59 | 40 |
| c121 | campaign 121 | 34 | 35 |
| c122 | campaign 122 | 43 | 40 |
| c123 | campaign 123 | 36 | 40 |
| c124 | campaign 124 | 41 | 40 |
| c125 | campaign 125 | 37 | 40 |
| c126 | campaign 126 | 13 | 15 |
| c127 | campaign 127 | 46 | 40 |
| c128 | campaign 128 | 51 | 40 |
| c129 | campaign 129 | 34 | 35 |
| c130 | campaign 130 | 45 | 40 |
| c131 | campaign 131 | 29 | 30 |
| c132 | campaign 132 | 37 | 40 |
| c133 | campaign 133 | 45 | 40 |
| c134 | campaign 134 | 41 | 40 |
| c135 | campaign 135 | 51 | 40 |
| c136 | campaign 136 | 27 | 30 |
| c137 | campaign 137 | 42 | 40 |
| c138 | campaign 138 | 42 | 40 |
| c139 | campaign 139 | 45 | 40 |
| c140 | campaign 140 | 52 | 40 |
| c141 | campaign 141 | 14 | 15 |
| c142 | campaign 142 | 37 | 40 |
| c143 | campaign 143 | 36 | 40 |
| c144 | campaign 144 | 45 | 40 |
| c145 | campaign 145 | 49 | 40 |
| c146 | campaign 146 | 39 | 40 |
| c147 | campaign 147 | 44 | 40 |
| c148 | campaign 148 | 41 | 40 |
| c149 | campaign 149 | 41 | 40 |
| c150 | campaign 150 | 75 | 40 |
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
| s1 | souvenir 1 | 13 | 20 |
| s2 | souvenir 2 | 13 | 35 |
| s3 | souvenir 3 | 15 | 30 |
| s4 | souvenir 4 | 13 | 30 |
| s5 | souvenir 5 | 14 | 40 |
| s6 | souvenir 6 | 13 | 40 |
| s7 | souvenir 7 | 13 | 40 |
| s8 | souvenir 8 | 16 | 40 |
| s9 | souvenir 9 | 14 | 35 |
| s10 | souvenir 10 | 14 | 40 |
| halloween-2026-01 | event 1 | 11 | 10 |
| halloween-2026-02 | event 2 | 14 | 15 |
| halloween-2026-03 | event 3 | 17 | 20 |
| halloween-2026-04 | event 4 | 11 | 10 |
| halloween-2026-05 | event 5 | 17 | 20 |
| halloween-2026-06 | event 6 | 8 | 10 |
| halloween-2026-07 | event 7 | 21 | 25 |
| halloween-2026-08 | event 8 | 23 | 25 |
| halloween-2026-09 | event 9 | 19 | 20 |
| halloween-2026-10 | event 10 | 21 | 25 |
| halloween-2026-11 | event 11 | 26 | 30 |
| halloween-2026-12 | event 12 | 16 | 20 |
| halloween-2026-13 | event 13 | 24 | 25 |
| halloween-2026-14 | event 14 | 23 | 25 |
| halloween-2026-15 | event 15 | 9 | 10 |
| halloween-2026-16 | event 16 | 23 | 25 |
| halloween-2026-17 | event 17 | 27 | 30 |
| halloween-2026-18 | event 18 | 18 | 20 |
| halloween-2026-19 | event 19 | 24 | 25 |
| halloween-2026-20 | event 20 | 26 | 30 |
| halloween-2026-21 | event 21 | 20 | 20 |
| halloween-2026-22 | event 22 | 26 | 30 |
| halloween-2026-23 | event 23 | 28 | 30 |
| halloween-2026-24 | event 24 | 21 | 25 |
| halloween-2026-25 | event 25 | 27 | 30 |
| halloween-2026-26 | event 26 | 20 | 20 |
| halloween-2026-27 | event 27 | 26 | 30 |
| halloween-2026-28 | event 28 | 27 | 30 |
| halloween-2026-29 | event 29 | 23 | 25 |
| halloween-2026-30 | event 30 | 31 | 35 |
| ski-trip-2026-01 | event 31 | 10 | 10 |
| ski-trip-2026-02 | event 32 | 13 | 15 |
| ski-trip-2026-03 | event 33 | 16 | 20 |
| ski-trip-2026-04 | event 34 | 11 | 10 |
| ski-trip-2026-05 | event 35 | 17 | 20 |
| ski-trip-2026-06 | event 36 | 7 | 10 |
| ski-trip-2026-07 | event 37 | 22 | 25 |
| ski-trip-2026-08 | event 38 | 25 | 30 |
| ski-trip-2026-09 | event 39 | 20 | 20 |
| ski-trip-2026-10 | event 40 | 22 | 25 |
| ski-trip-2026-11 | event 41 | 24 | 25 |
| ski-trip-2026-12 | event 42 | 17 | 20 |
| ski-trip-2026-13 | event 43 | 23 | 25 |
| ski-trip-2026-14 | event 44 | 25 | 30 |
| ski-trip-2026-15 | event 45 | 7 | 10 |
| ski-trip-2026-16 | event 46 | 23 | 25 |
| ski-trip-2026-17 | event 47 | 25 | 30 |
| ski-trip-2026-18 | event 48 | 19 | 20 |
| ski-trip-2026-19 | event 49 | 24 | 25 |
| ski-trip-2026-20 | event 50 | 24 | 25 |
| ski-trip-2026-21 | event 51 | 22 | 25 |
| ski-trip-2026-22 | event 52 | 23 | 25 |
| ski-trip-2026-23 | event 53 | 28 | 30 |
| ski-trip-2026-24 | event 54 | 22 | 25 |
| ski-trip-2026-25 | event 55 | 29 | 30 |
| ski-trip-2026-26 | event 56 | 20 | 20 |
| ski-trip-2026-27 | event 57 | 22 | 25 |
| ski-trip-2026-28 | event 58 | 28 | 30 |
| ski-trip-2026-29 | event 59 | 23 | 25 |
| ski-trip-2026-30 | event 60 | 30 | 35 |
| train-journey-2026-01 | event 61 | 11 | 10 |
| train-journey-2026-02 | event 62 | 14 | 15 |
| train-journey-2026-03 | event 63 | 17 | 20 |
| train-journey-2026-04 | event 64 | 11 | 10 |
| train-journey-2026-05 | event 65 | 16 | 20 |
| train-journey-2026-06 | event 66 | 7 | 10 |
| train-journey-2026-07 | event 67 | 21 | 25 |
| train-journey-2026-08 | event 68 | 24 | 25 |
| train-journey-2026-09 | event 69 | 18 | 20 |
| train-journey-2026-10 | event 70 | 22 | 25 |
| train-journey-2026-11 | event 71 | 21 | 25 |
| train-journey-2026-12 | event 72 | 18 | 20 |
| train-journey-2026-13 | event 73 | 25 | 30 |
| train-journey-2026-14 | event 74 | 25 | 30 |
| train-journey-2026-15 | event 75 | 9 | 10 |
| train-journey-2026-16 | event 76 | 23 | 25 |
| train-journey-2026-17 | event 77 | 26 | 30 |
| train-journey-2026-18 | event 78 | 18 | 20 |
| train-journey-2026-19 | event 79 | 24 | 25 |
| train-journey-2026-20 | event 80 | 25 | 30 |
| train-journey-2026-21 | event 81 | 22 | 25 |
| train-journey-2026-22 | event 82 | 26 | 30 |
| train-journey-2026-23 | event 83 | 26 | 30 |
| train-journey-2026-24 | event 84 | 21 | 25 |
| train-journey-2026-25 | event 85 | 24 | 25 |
| train-journey-2026-26 | event 86 | 18 | 20 |
| train-journey-2026-27 | event 87 | 21 | 25 |
| train-journey-2026-28 | event 88 | 27 | 30 |
| train-journey-2026-29 | event 89 | 25 | 30 |
| train-journey-2026-30 | event 90 | 32 | 35 |
| winter-market-2026-01 | event 91 | 11 | 10 |
| winter-market-2026-02 | event 92 | 12 | 15 |
| winter-market-2026-03 | event 93 | 17 | 20 |
| winter-market-2026-04 | event 94 | 11 | 10 |
| winter-market-2026-05 | event 95 | 18 | 20 |
| winter-market-2026-06 | event 96 | 6 | 10 |
| winter-market-2026-07 | event 97 | 22 | 25 |
| winter-market-2026-08 | event 98 | 23 | 25 |
| winter-market-2026-09 | event 99 | 18 | 20 |
| winter-market-2026-10 | event 100 | 22 | 25 |
| winter-market-2026-11 | event 101 | 23 | 25 |
| winter-market-2026-12 | event 102 | 20 | 20 |
| winter-market-2026-13 | event 103 | 25 | 30 |
| winter-market-2026-14 | event 104 | 25 | 30 |
| winter-market-2026-15 | event 105 | 9 | 10 |
| winter-market-2026-16 | event 106 | 23 | 25 |
| winter-market-2026-17 | event 107 | 28 | 30 |
| winter-market-2026-18 | event 108 | 17 | 20 |
| winter-market-2026-19 | event 109 | 22 | 25 |
| winter-market-2026-20 | event 110 | 27 | 30 |
| winter-market-2026-21 | event 111 | 21 | 25 |
| winter-market-2026-22 | event 112 | 25 | 30 |
| winter-market-2026-23 | event 113 | 26 | 30 |
| winter-market-2026-24 | event 114 | 21 | 25 |
| winter-market-2026-25 | event 115 | 28 | 30 |
| winter-market-2026-26 | event 116 | 21 | 25 |
| winter-market-2026-27 | event 117 | 23 | 25 |
| winter-market-2026-28 | event 118 | 27 | 30 |
| winter-market-2026-29 | event 119 | 25 | 30 |
| winter-market-2026-30 | event 120 | 32 | 35 |
| northern-lights-2026-01 | event 121 | 12 | 15 |
| northern-lights-2026-02 | event 122 | 13 | 15 |
| northern-lights-2026-03 | event 123 | 16 | 20 |
| northern-lights-2026-04 | event 124 | 12 | 15 |
| northern-lights-2026-05 | event 125 | 18 | 20 |
| northern-lights-2026-06 | event 126 | 8 | 10 |
| northern-lights-2026-07 | event 127 | 21 | 25 |
| northern-lights-2026-08 | event 128 | 23 | 25 |
| northern-lights-2026-09 | event 129 | 18 | 20 |
| northern-lights-2026-10 | event 130 | 21 | 25 |
| northern-lights-2026-11 | event 131 | 26 | 30 |
| northern-lights-2026-12 | event 132 | 18 | 20 |
| northern-lights-2026-13 | event 133 | 23 | 25 |
| northern-lights-2026-14 | event 134 | 22 | 25 |
| northern-lights-2026-15 | event 135 | 8 | 10 |
| northern-lights-2026-16 | event 136 | 25 | 30 |
| northern-lights-2026-17 | event 137 | 26 | 30 |
| northern-lights-2026-18 | event 138 | 19 | 20 |
| northern-lights-2026-19 | event 139 | 23 | 25 |
| northern-lights-2026-20 | event 140 | 27 | 30 |
| northern-lights-2026-21 | event 141 | 21 | 25 |
| northern-lights-2026-22 | event 142 | 22 | 25 |
| northern-lights-2026-23 | event 143 | 28 | 30 |
| northern-lights-2026-24 | event 144 | 20 | 20 |
| northern-lights-2026-25 | event 145 | 24 | 25 |
| northern-lights-2026-26 | event 146 | 21 | 25 |
| northern-lights-2026-27 | event 147 | 24 | 25 |
| northern-lights-2026-28 | event 148 | 28 | 30 |
| northern-lights-2026-29 | event 149 | 26 | 30 |
| northern-lights-2026-30 | event 150 | 30 | 35 |
| carnival-2027-01 | event 151 | 13 | 15 |
| carnival-2027-02 | event 152 | 13 | 15 |
| carnival-2027-03 | event 153 | 17 | 20 |
| carnival-2027-04 | event 154 | 10 | 10 |
| carnival-2027-05 | event 155 | 16 | 20 |
| carnival-2027-06 | event 156 | 8 | 10 |
| carnival-2027-07 | event 157 | 22 | 25 |
| carnival-2027-08 | event 158 | 23 | 25 |
| carnival-2027-09 | event 159 | 19 | 20 |
| carnival-2027-10 | event 160 | 21 | 25 |
| carnival-2027-11 | event 161 | 23 | 25 |
| carnival-2027-12 | event 162 | 18 | 20 |
| carnival-2027-13 | event 163 | 26 | 30 |
| carnival-2027-14 | event 164 | 25 | 30 |
| carnival-2027-15 | event 165 | 8 | 10 |
| carnival-2027-16 | event 166 | 25 | 30 |
| carnival-2027-17 | event 167 | 27 | 30 |
| carnival-2027-18 | event 168 | 19 | 20 |
| carnival-2027-19 | event 169 | 24 | 25 |
| carnival-2027-20 | event 170 | 26 | 30 |
| carnival-2027-21 | event 171 | 22 | 25 |
| carnival-2027-22 | event 172 | 24 | 25 |
| carnival-2027-23 | event 173 | 26 | 30 |
| carnival-2027-24 | event 174 | 21 | 25 |
| carnival-2027-25 | event 175 | 26 | 30 |
| carnival-2027-26 | event 176 | 21 | 25 |
| carnival-2027-27 | event 177 | 25 | 30 |
| carnival-2027-28 | event 178 | 25 | 30 |
| carnival-2027-29 | event 179 | 25 | 30 |
| carnival-2027-30 | event 180 | 33 | 35 |
