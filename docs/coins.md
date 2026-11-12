# What a win pays

Coins only. Every payout is made by the win checker (`functions/checker`)
after it has replayed the board's winning line on the rules, through one progression per
board in the game config, so **each board pays once, ever**, and a resent claim or a
replay pays nothing. Written by `node tools/server/make-config.mts`; do not edit by hand.

**The rule** (the creator, 2026-11-10, through the lead: "players get about 500/hr and VIPs 750",
for all ordinary play): Coins per move of the board's stored winning line, rounded to 5, from a
lane's least to its most:

- a trip level from Level 6: 0.75 a move, 10 to 30 (a third below the old rate; the cap is the old 40 cut in
  proportion, a third less being 27, rounded to 30 to keep about 500 an hour);
- an event level: 0.45 a move, 5 to 15, and each item found 15 more (150 an event);
- the challenge route (off home): 0.75 a move, 10 to 35, the same third off;
- a Souvenir: its trip's better-paying relief board, so a third less with them (below);
- today's daily puzzle 50, once a day; a past day from the archive 15, once each.

Until config 65 every lane paid 1.1 a move (10 to 40; the challenge route 10 to 50), an item
found 50 and a past day 50; config 66 (dev only) paid 20 an item and 25 a past day, and the creator trimmed both to
15 and 15 the same day. **Nothing is taken back**: each board pays once, ever, so a level
already won keeps what it paid then. A campaign board's stored line is a winning line, not
necessarily the shortest; a challenge board's is its par, the fewest moves found. Its length
stands in for how long the board takes. Campaign board 1 pays the onboarding prize instead, 100.

**The pace estimate** (the lead, 2026-11-10): the campaign's 3 minutes a level for its ~37 moves, about
12 moves a minute, for every lane: an event level's ~21 moves are about 1.75 minutes, an event about
52 minutes. No play-time data yet, so every hourly figure below is this estimate.

**The welcome** (the creator, 2026-11-09: "We want to have given out at least 500 [Coins] within
the first 5 levels"; "Just make 1-5 give out 100, and the achievement will make it 600 altogether"):
campaign boards 1 to 5 pay 100 each, 500 in all (until config 63 they paid 100/10/25/20/30, 185),
and finishing the first level pays First Steps' prize, 100 more, as a second grant on board 1's
progression (the platform takes no Coins on an achievement's own level): 600 Coins by Level 5.
100 is the most Coins the platform pays in one grant (its max_per_event), so each is one grant at
the cap, never more. At 3 minutes a level this is far above the standard's 250 to 1,000 an hour for
its first quarter hour: **a deliberate front-loaded welcome, on the creator's word**, not a rate to
flag at the release review, and the creator kept it on 2026-11-10. Each board pays once, ever, so a
player who had already won any of boards 1 to 5 keeps what it paid then and is not topped up.

**A Souvenir** (the optional all-long bonus board after each trip, `docs/souvenirs.md`) pays
what the better-paying of its trip's relief boards pays, once, ever (the lead, 2026-10-28: the
creator's "Coins like a relief board", a bonus for the detour), so it fell by a third with the trip
levels on 2026-11-10. Its short line (about 14 moves, a minute or so) pays more a minute than a
trip level, but it is one bonus level per trip, never repeated, so it moves no hourly rate.

## The hourly maths (the creator: about 500 an hour, VIPs 750; at 12 moves a minute)

| lane | levels | a level, on average | in all | an hour | an hour, VIP | until config 65 |
| --- | --- | --- | --- | --- | --- | --- |
| Trip levels from Level 6 | 325 | 26.5 Coins, 37.7 moves | 8,610 | 506 | 762 | 36.6 a level, 700 an hour |
| Events (6, 30 levels each) | 180 | 9.4 Coins, 20.8 moves; an event 283 + 150 for its items = 433 | 2,595 | 499 | 758 (658 an event) | 1203 an event, 1387 an hour |
| Challenge route (off home) | 20 | 18.3 Coins, 24.4 moves | 365 | 540 | 818 | 27.0 a level, 798 an hour |
| Souvenirs (one-off bonus) | 10 | 25.0 Coins, 13.8 moves | 250 | (1304) | (1967) | 350 in all |
| Today's daily | 1 a day | 50 Coins, 19.9 moves | 50 a day | (once a day) | 75 a day | 50 |
| A past day (the archive) | this month and the two before | 15 Coins, 19.9 moves | 15 each | 542 | 831 | 50 each, 1806 an hour |

Read it so:

- **Trip levels** are the ordinary play: about 506 an hour, 762 for a VIP. At 2 minutes a
  level 795, at 4 minutes 397. Most levels pay the cap (199 of 325 at 30): their lines are 37 moves or longer.
- **An event** pays its levels (5 to 15 each) and 15 with each item found, paid as each lands, never
  in one grant over the platform's 100. The prize for finding all 10 is the event's table and its Passport
  stamp, no Coins and no helpers. Each event is open for good, so an event is a one-off of about 52 minutes.
- **Today's daily** is once a day, on top. **A past day** pays 15 (the creator, 2026-11-10): its line is short, so
  that is about the trip levels' rate for a player catching up on the archive, over the days it holds
  (this month and the two before), each once.
- One-time: the welcome (boards 1 to 5), the onboarding prize and First Steps' prize. Replays and campaign boards past the last pay nothing.
- **VIP** (docs/vip.md): **the Arcade pays a VIP +50% on every Coins grant itself, since 2026-11-11** (the creator:
  "the gem arcade updated yesterday and it now pays the 50% extra for VIPs"; SDK 24, arcade-economy.md section 7),
  and scales the ceilings with it. Every amount here is the unboosted one, and the game pays no Coins of its own
  for VIP (checker 0.1.60 on). The VIP column is these amounts and half again, rounded up (5 +3, 10 +5, 15 +8,
  25 +13, 30 +15, 50 +25, 100 +50): the platform's own rounding may differ by a Coin. That puts a VIP at about 750
  an hour, the creator's "VIPs 750". Every helper reward gives a VIP as many again, as a bonus in the config's
  rewards catalog that the platform judges (docs/vip.md). The platform's 4,000 a day per game still holds, scaled for a VIP.
- **Still to measure: real minutes per level.** No play-time data yet; every hourly figure here is the
  12-moves-a-minute estimate. If levels run much faster or slower, change the rates (LANES in
  tools/server/make-config.mts), rebuild and upload the win checker, and upload the config.

## The helper shop (cap 20 of each)

Every figure here is the config's alone (`gem-backend-game-config.yaml`, the helpers catalog): the cap
(each helper currency's max_balance), what each buy and bundle gives, the Starter Kit's once-only (its
max_uses 1) and the prices, at the standard's 500 Coins to the dollar. **The game holds none of them**
(the creator, 2026-11-12: "never copy amounts from the config into code"): it reads them in its one
config load (`src/net/helpers.ts`), and until that lands it offers no pack and no bundle, as with no
price. `src/net/helper-ids.json` holds only the ids. Every buy is refused at the cap before anything is charged.

| product | Coins | worth |
|---|---|---|
| 1 Hint | 150 | $0.30 |
| 3 Hints | 400 | $0.80 ($0.27 each) |
| 1 Undo | 100 | $0.20 |
| 3 Undos | 270 | $0.54 ($0.18 each) |
| 1 Shuffle | 250 | $0.50 |
| 3 Shuffles | 675 | $1.35 ($0.45 each) |

**The bundles** (the creator, 2026-11-01): all three helpers at once, bought the same way as a
pack (the Arcade's purchase sheet, or the direct purchase where it has none), each for less than
its helpers bought one at a time. **In Coins since config 64** (the creator, 2026-11-10: no Gems in
the Arcade), at the old Gems price times five (100 Gems was 500 Coins), on the same recipes, so a
Starter Kit bought with Gems still counts its one use and can't be bought again. The counterpart:
Candy Crush sells a booster at about $1 to $2 alone and about $0.50 each in bulk; ours cost less a
helper because a helper is smaller than a booster, and every board is winnable with none.

| bundle | gives | Coins | worth in Coins, one at a time | saves | a helper costs | counterpart |
|---|---|---|---|---|---|---|
| Starter Kit | 5 Hints, 5 Undos, 5 Shuffles | 1000 ($2.00) | 2500 ($5.00) | 60% | $0.13 | a hit game's one-time starter pack; once per player, ever |
| Small | 2 Hints, 1 Undo, 1 Shuffle | 500 ($1.00) | 650 ($1.30) | 23% | $0.25 | a quick top-up |
| Medium | 3 Hints, 3 Undos, 3 Shuffles | 1000 ($2.00) | 1500 ($3.00) | 33% | $0.22 | Candy Crush's boosters in bulk, about $0.50 each |
| Large | 8 Hints, 8 Undos, 8 Shuffles | 2500 ($5.00) | 4000 ($8.00) | 38% | $0.21 | a big booster pack, the best rate but the Starter Kit's |

## Board by board

| board | lane | stored winning line (moves) | Coins |
|---|---|---|---|
| c01 | campaign 1 | 7 | 100 (onboarding prize) + 100 (First Steps' prize) |
| c02 | campaign 2 | 11 | 100 (the welcome; 10 by the rule) |
| c03 | campaign 3 | 22 | 100 (the welcome; 15 by the rule) |
| c04 | campaign 4 | 18 | 100 (the welcome; 15 by the rule) |
| c05 | campaign 5 | 25 | 100 (the welcome; 20 by the rule) |
| c06 | campaign 6 | 23 | 15 |
| c07 | campaign 7 | 26 | 20 |
| c08 | campaign 8 | 15 | 10 |
| c09 | campaign 9 | 23 | 15 |
| c10 | campaign 10 | 37 | 30 |
| c11 | campaign 11 | 13 | 10 |
| c12 | campaign 12 | 22 | 15 |
| c13 | campaign 13 | 32 | 25 |
| c14 | campaign 14 | 27 | 20 |
| c15 | campaign 15 | 24 | 20 |
| c16 | campaign 16 | 20 | 15 |
| c17 | campaign 17 | 27 | 20 |
| c18 | campaign 18 | 36 | 25 |
| c19 | campaign 19 | 31 | 25 |
| c20 | campaign 20 | 41 | 30 |
| c21 | campaign 21 | 13 | 10 |
| c22 | campaign 22 | 27 | 20 |
| c23 | campaign 23 | 30 | 25 |
| c24 | campaign 24 | 29 | 20 |
| c25 | campaign 25 | 32 | 25 |
| c26 | campaign 26 | 32 | 25 |
| c27 | campaign 27 | 33 | 25 |
| c28 | campaign 28 | 36 | 25 |
| c29 | campaign 29 | 41 | 30 |
| c30 | campaign 30 | 64 | 30 |
| c31 | campaign 31 | 22 | 15 |
| c32 | campaign 32 | 37 | 30 |
| c33 | campaign 33 | 39 | 30 |
| c34 | campaign 34 | 36 | 25 |
| c35 | campaign 35 | 34 | 25 |
| c36 | campaign 36 | 14 | 10 |
| c37 | campaign 37 | 33 | 25 |
| c38 | campaign 38 | 37 | 30 |
| c39 | campaign 39 | 40 | 30 |
| c40 | campaign 40 | 42 | 30 |
| c41 | campaign 41 | 28 | 20 |
| c42 | campaign 42 | 31 | 25 |
| c43 | campaign 43 | 42 | 30 |
| c44 | campaign 44 | 48 | 30 |
| c45 | campaign 45 | 49 | 30 |
| c46 | campaign 46 | 28 | 20 |
| c47 | campaign 47 | 37 | 30 |
| c48 | campaign 48 | 37 | 30 |
| c49 | campaign 49 | 40 | 30 |
| c50 | campaign 50 | 44 | 30 |
| c51 | campaign 51 | 13 | 10 |
| c52 | campaign 52 | 44 | 30 |
| c53 | campaign 53 | 43 | 30 |
| c54 | campaign 54 | 42 | 30 |
| c55 | campaign 55 | 38 | 30 |
| c56 | campaign 56 | 28 | 20 |
| c57 | campaign 57 | 36 | 25 |
| c58 | campaign 58 | 48 | 30 |
| c59 | campaign 59 | 35 | 25 |
| c60 | campaign 60 | 67 | 30 |
| c61 | campaign 61 | 36 | 25 |
| c62 | campaign 62 | 44 | 30 |
| c63 | campaign 63 | 43 | 30 |
| c64 | campaign 64 | 33 | 25 |
| c65 | campaign 65 | 47 | 30 |
| c66 | campaign 66 | 14 | 10 |
| c67 | campaign 67 | 35 | 25 |
| c68 | campaign 68 | 44 | 30 |
| c69 | campaign 69 | 40 | 30 |
| c70 | campaign 70 | 35 | 25 |
| c71 | campaign 71 | 30 | 25 |
| c72 | campaign 72 | 35 | 25 |
| c73 | campaign 73 | 46 | 30 |
| c74 | campaign 74 | 43 | 30 |
| c75 | campaign 75 | 41 | 30 |
| c76 | campaign 76 | 38 | 30 |
| c77 | campaign 77 | 48 | 30 |
| c78 | campaign 78 | 42 | 30 |
| c79 | campaign 79 | 41 | 30 |
| c80 | campaign 80 | 39 | 30 |
| c81 | campaign 81 | 13 | 10 |
| c82 | campaign 82 | 47 | 30 |
| c83 | campaign 83 | 42 | 30 |
| c84 | campaign 84 | 43 | 30 |
| c85 | campaign 85 | 53 | 30 |
| c86 | campaign 86 | 34 | 25 |
| c87 | campaign 87 | 42 | 30 |
| c88 | campaign 88 | 39 | 30 |
| c89 | campaign 89 | 46 | 30 |
| c90 | campaign 90 | 55 | 30 |
| c91 | campaign 91 | 38 | 30 |
| c92 | campaign 92 | 41 | 30 |
| c93 | campaign 93 | 31 | 25 |
| c94 | campaign 94 | 42 | 30 |
| c95 | campaign 95 | 40 | 30 |
| c96 | campaign 96 | 14 | 10 |
| c97 | campaign 97 | 44 | 30 |
| c98 | campaign 98 | 48 | 30 |
| c99 | campaign 99 | 34 | 25 |
| c100 | campaign 100 | 43 | 30 |
| c101 | campaign 101 | 28 | 20 |
| c102 | campaign 102 | 43 | 30 |
| c103 | campaign 103 | 35 | 25 |
| c104 | campaign 104 | 44 | 30 |
| c105 | campaign 105 | 38 | 30 |
| c106 | campaign 106 | 40 | 30 |
| c107 | campaign 107 | 34 | 25 |
| c108 | campaign 108 | 41 | 30 |
| c109 | campaign 109 | 39 | 30 |
| c110 | campaign 110 | 44 | 30 |
| c111 | campaign 111 | 13 | 10 |
| c112 | campaign 112 | 45 | 30 |
| c113 | campaign 113 | 47 | 30 |
| c114 | campaign 114 | 37 | 30 |
| c115 | campaign 115 | 39 | 30 |
| c116 | campaign 116 | 31 | 25 |
| c117 | campaign 117 | 40 | 30 |
| c118 | campaign 118 | 29 | 20 |
| c119 | campaign 119 | 37 | 30 |
| c120 | campaign 120 | 59 | 30 |
| c121 | campaign 121 | 34 | 25 |
| c122 | campaign 122 | 43 | 30 |
| c123 | campaign 123 | 36 | 25 |
| c124 | campaign 124 | 41 | 30 |
| c125 | campaign 125 | 37 | 30 |
| c126 | campaign 126 | 13 | 10 |
| c127 | campaign 127 | 46 | 30 |
| c128 | campaign 128 | 51 | 30 |
| c129 | campaign 129 | 34 | 25 |
| c130 | campaign 130 | 45 | 30 |
| c131 | campaign 131 | 29 | 20 |
| c132 | campaign 132 | 37 | 30 |
| c133 | campaign 133 | 45 | 30 |
| c134 | campaign 134 | 41 | 30 |
| c135 | campaign 135 | 51 | 30 |
| c136 | campaign 136 | 27 | 20 |
| c137 | campaign 137 | 42 | 30 |
| c138 | campaign 138 | 42 | 30 |
| c139 | campaign 139 | 45 | 30 |
| c140 | campaign 140 | 52 | 30 |
| c141 | campaign 141 | 14 | 10 |
| c142 | campaign 142 | 37 | 30 |
| c143 | campaign 143 | 36 | 25 |
| c144 | campaign 144 | 45 | 30 |
| c145 | campaign 145 | 49 | 30 |
| c146 | campaign 146 | 39 | 30 |
| c147 | campaign 147 | 44 | 30 |
| c148 | campaign 148 | 41 | 30 |
| c149 | campaign 149 | 41 | 30 |
| c150 | campaign 150 | 75 | 30 |
| c151 | campaign 151 | 32 | 25 |
| c152 | campaign 152 | 28 | 20 |
| c153 | campaign 153 | 43 | 30 |
| c154 | campaign 154 | 35 | 25 |
| c155 | campaign 155 | 44 | 30 |
| c156 | campaign 156 | 15 | 10 |
| c157 | campaign 157 | 40 | 30 |
| c158 | campaign 158 | 39 | 30 |
| c159 | campaign 159 | 41 | 30 |
| c160 | campaign 160 | 53 | 30 |
| c161 | campaign 161 | 31 | 25 |
| c162 | campaign 162 | 32 | 25 |
| c163 | campaign 163 | 41 | 30 |
| c164 | campaign 164 | 39 | 30 |
| c165 | campaign 165 | 43 | 30 |
| c166 | campaign 166 | 32 | 25 |
| c167 | campaign 167 | 28 | 20 |
| c168 | campaign 168 | 43 | 30 |
| c169 | campaign 169 | 35 | 25 |
| c170 | campaign 170 | 37 | 30 |
| c171 | campaign 171 | 14 | 10 |
| c172 | campaign 172 | 40 | 30 |
| c173 | campaign 173 | 39 | 30 |
| c174 | campaign 174 | 41 | 30 |
| c175 | campaign 175 | 53 | 30 |
| c176 | campaign 176 | 31 | 25 |
| c177 | campaign 177 | 32 | 25 |
| c178 | campaign 178 | 41 | 30 |
| c179 | campaign 179 | 39 | 30 |
| c180 | campaign 180 | 46 | 30 |
| c181 | campaign 181 | 33 | 25 |
| c182 | campaign 182 | 35 | 25 |
| c183 | campaign 183 | 35 | 25 |
| c184 | campaign 184 | 42 | 30 |
| c185 | campaign 185 | 39 | 30 |
| c186 | campaign 186 | 16 | 10 |
| c187 | campaign 187 | 41 | 30 |
| c188 | campaign 188 | 38 | 30 |
| c189 | campaign 189 | 38 | 30 |
| c190 | campaign 190 | 37 | 30 |
| c191 | campaign 191 | 27 | 20 |
| c192 | campaign 192 | 38 | 30 |
| c193 | campaign 193 | 39 | 30 |
| c194 | campaign 194 | 44 | 30 |
| c195 | campaign 195 | 72 | 30 |
| c196 | campaign 196 | 29 | 20 |
| c197 | campaign 197 | 37 | 30 |
| c198 | campaign 198 | 34 | 25 |
| c199 | campaign 199 | 40 | 30 |
| c200 | campaign 200 | 42 | 30 |
| c201 | campaign 201 | 16 | 10 |
| c202 | campaign 202 | 38 | 30 |
| c203 | campaign 203 | 35 | 25 |
| c204 | campaign 204 | 42 | 30 |
| c205 | campaign 205 | 40 | 30 |
| c206 | campaign 206 | 27 | 20 |
| c207 | campaign 207 | 37 | 30 |
| c208 | campaign 208 | 33 | 25 |
| c209 | campaign 209 | 40 | 30 |
| c210 | campaign 210 | 43 | 30 |
| c211 | campaign 211 | 29 | 20 |
| c212 | campaign 212 | 37 | 30 |
| c213 | campaign 213 | 40 | 30 |
| c214 | campaign 214 | 45 | 30 |
| c215 | campaign 215 | 42 | 30 |
| c216 | campaign 216 | 15 | 10 |
| c217 | campaign 217 | 49 | 30 |
| c218 | campaign 218 | 34 | 25 |
| c219 | campaign 219 | 43 | 30 |
| c220 | campaign 220 | 41 | 30 |
| c221 | campaign 221 | 28 | 20 |
| c222 | campaign 222 | 42 | 30 |
| c223 | campaign 223 | 38 | 30 |
| c224 | campaign 224 | 37 | 30 |
| c225 | campaign 225 | 61 | 30 |
| c226 | campaign 226 | 30 | 25 |
| c227 | campaign 227 | 36 | 25 |
| c228 | campaign 228 | 38 | 30 |
| c229 | campaign 229 | 39 | 30 |
| c230 | campaign 230 | 44 | 30 |
| c231 | campaign 231 | 14 | 10 |
| c232 | campaign 232 | 49 | 30 |
| c233 | campaign 233 | 40 | 30 |
| c234 | campaign 234 | 52 | 30 |
| c235 | campaign 235 | 50 | 30 |
| c236 | campaign 236 | 36 | 25 |
| c237 | campaign 237 | 34 | 25 |
| c238 | campaign 238 | 41 | 30 |
| c239 | campaign 239 | 41 | 30 |
| c240 | campaign 240 | 43 | 30 |
| c241 | campaign 241 | 26 | 20 |
| c242 | campaign 242 | 29 | 20 |
| c243 | campaign 243 | 38 | 30 |
| c244 | campaign 244 | 34 | 25 |
| c245 | campaign 245 | 34 | 25 |
| c246 | campaign 246 | 15 | 10 |
| c247 | campaign 247 | 42 | 30 |
| c248 | campaign 248 | 36 | 25 |
| c249 | campaign 249 | 36 | 25 |
| c250 | campaign 250 | 45 | 30 |
| c251 | campaign 251 | 29 | 20 |
| c252 | campaign 252 | 38 | 30 |
| c253 | campaign 253 | 46 | 30 |
| c254 | campaign 254 | 41 | 30 |
| c255 | campaign 255 | 61 | 30 |
| c256 | campaign 256 | 35 | 25 |
| c257 | campaign 257 | 36 | 25 |
| c258 | campaign 258 | 42 | 30 |
| c259 | campaign 259 | 41 | 30 |
| c260 | campaign 260 | 48 | 30 |
| c261 | campaign 261 | 13 | 10 |
| c262 | campaign 262 | 39 | 30 |
| c263 | campaign 263 | 40 | 30 |
| c264 | campaign 264 | 45 | 30 |
| c265 | campaign 265 | 45 | 30 |
| c266 | campaign 266 | 31 | 25 |
| c267 | campaign 267 | 40 | 30 |
| c268 | campaign 268 | 47 | 30 |
| c269 | campaign 269 | 48 | 30 |
| c270 | campaign 270 | 40 | 30 |
| c271 | campaign 271 | 33 | 25 |
| c272 | campaign 272 | 36 | 25 |
| c273 | campaign 273 | 34 | 25 |
| c274 | campaign 274 | 42 | 30 |
| c275 | campaign 275 | 48 | 30 |
| c276 | campaign 276 | 17 | 15 |
| c277 | campaign 277 | 43 | 30 |
| c278 | campaign 278 | 39 | 30 |
| c279 | campaign 279 | 44 | 30 |
| c280 | campaign 280 | 43 | 30 |
| c281 | campaign 281 | 33 | 25 |
| c282 | campaign 282 | 39 | 30 |
| c283 | campaign 283 | 36 | 25 |
| c284 | campaign 284 | 37 | 30 |
| c285 | campaign 285 | 60 | 30 |
| c286 | campaign 286 | 34 | 25 |
| c287 | campaign 287 | 43 | 30 |
| c288 | campaign 288 | 46 | 30 |
| c289 | campaign 289 | 48 | 30 |
| c290 | campaign 290 | 37 | 30 |
| c291 | campaign 291 | 13 | 10 |
| c292 | campaign 292 | 48 | 30 |
| c293 | campaign 293 | 38 | 30 |
| c294 | campaign 294 | 42 | 30 |
| c295 | campaign 295 | 48 | 30 |
| c296 | campaign 296 | 35 | 25 |
| c297 | campaign 297 | 32 | 25 |
| c298 | campaign 298 | 41 | 30 |
| c299 | campaign 299 | 34 | 25 |
| c300 | campaign 300 | 61 | 30 |
| c301 | campaign 301 | 36 | 25 |
| c302 | campaign 302 | 40 | 30 |
| c303 | campaign 303 | 38 | 30 |
| c304 | campaign 304 | 35 | 25 |
| c305 | campaign 305 | 51 | 30 |
| c306 | campaign 306 | 13 | 10 |
| c307 | campaign 307 | 40 | 30 |
| c308 | campaign 308 | 38 | 30 |
| c309 | campaign 309 | 57 | 30 |
| c310 | campaign 310 | 47 | 30 |
| c311 | campaign 311 | 33 | 25 |
| c312 | campaign 312 | 40 | 30 |
| c313 | campaign 313 | 35 | 25 |
| c314 | campaign 314 | 35 | 25 |
| c315 | campaign 315 | 64 | 30 |
| c316 | campaign 316 | 32 | 25 |
| c317 | campaign 317 | 29 | 20 |
| c318 | campaign 318 | 46 | 30 |
| c319 | campaign 319 | 36 | 25 |
| c320 | campaign 320 | 41 | 30 |
| c321 | campaign 321 | 17 | 15 |
| c322 | campaign 322 | 42 | 30 |
| c323 | campaign 323 | 38 | 30 |
| c324 | campaign 324 | 45 | 30 |
| c325 | campaign 325 | 46 | 30 |
| c326 | campaign 326 | 29 | 20 |
| c327 | campaign 327 | 34 | 25 |
| c328 | campaign 328 | 37 | 30 |
| c329 | campaign 329 | 41 | 30 |
| c330 | campaign 330 | 41 | 30 |
| ch01 | challenge 1 | 19 | 15 |
| ch02 | challenge 2 | 21 | 15 |
| ch03 | challenge 3 | 19 | 15 |
| ch04 | challenge 4 | 19 | 15 |
| ch05 | challenge 5 | 19 | 15 |
| ch06 | challenge 6 | 23 | 15 |
| ch07 | challenge 7 | 26 | 20 |
| ch08 | challenge 8 | 29 | 20 |
| ch09 | challenge 9 | 21 | 15 |
| ch10 | challenge 10 | 28 | 20 |
| ch11 | challenge 11 | 20 | 15 |
| ch12 | challenge 12 | 27 | 20 |
| ch13 | challenge 13 | 26 | 20 |
| ch14 | challenge 14 | 22 | 15 |
| ch15 | challenge 15 | 28 | 20 |
| ch16 | challenge 16 | 25 | 20 |
| ch17 | challenge 17 | 28 | 20 |
| ch18 | challenge 18 | 30 | 25 |
| ch19 | challenge 19 | 26 | 20 |
| ch20 | challenge 20 | 31 | 25 |
| s1 | souvenir 1 | 13 | 15 |
| s2 | souvenir 2 | 13 | 25 |
| s3 | souvenir 3 | 15 | 20 |
| s4 | souvenir 4 | 13 | 20 |
| s5 | souvenir 5 | 14 | 25 |
| s6 | souvenir 6 | 13 | 30 |
| s7 | souvenir 7 | 13 | 30 |
| s8 | souvenir 8 | 16 | 30 |
| s9 | souvenir 9 | 14 | 25 |
| s10 | souvenir 10 | 14 | 30 |
| halloween-2026-01 | event 1 | 11 | 5 |
| halloween-2026-02 | event 2 | 14 | 5 |
| halloween-2026-03 | event 3 | 17 | 10 |
| halloween-2026-04 | event 4 | 11 | 5 |
| halloween-2026-05 | event 5 | 17 | 10 |
| halloween-2026-06 | event 6 | 8 | 5 |
| halloween-2026-07 | event 7 | 21 | 10 |
| halloween-2026-08 | event 8 | 23 | 10 |
| halloween-2026-09 | event 9 | 19 | 10 |
| halloween-2026-10 | event 10 | 21 | 10 |
| halloween-2026-11 | event 11 | 26 | 10 |
| halloween-2026-12 | event 12 | 16 | 5 |
| halloween-2026-13 | event 13 | 24 | 10 |
| halloween-2026-14 | event 14 | 23 | 10 |
| halloween-2026-15 | event 15 | 9 | 5 |
| halloween-2026-16 | event 16 | 23 | 10 |
| halloween-2026-17 | event 17 | 27 | 10 |
| halloween-2026-18 | event 18 | 18 | 10 |
| halloween-2026-19 | event 19 | 24 | 10 |
| halloween-2026-20 | event 20 | 26 | 10 |
| halloween-2026-21 | event 21 | 20 | 10 |
| halloween-2026-22 | event 22 | 26 | 10 |
| halloween-2026-23 | event 23 | 28 | 15 |
| halloween-2026-24 | event 24 | 21 | 10 |
| halloween-2026-25 | event 25 | 27 | 10 |
| halloween-2026-26 | event 26 | 20 | 10 |
| halloween-2026-27 | event 27 | 26 | 10 |
| halloween-2026-28 | event 28 | 27 | 10 |
| halloween-2026-29 | event 29 | 23 | 10 |
| halloween-2026-30 | event 30 | 31 | 15 |
| ski-trip-2026-01 | event 31 | 10 | 5 |
| ski-trip-2026-02 | event 32 | 13 | 5 |
| ski-trip-2026-03 | event 33 | 16 | 5 |
| ski-trip-2026-04 | event 34 | 11 | 5 |
| ski-trip-2026-05 | event 35 | 17 | 10 |
| ski-trip-2026-06 | event 36 | 7 | 5 |
| ski-trip-2026-07 | event 37 | 22 | 10 |
| ski-trip-2026-08 | event 38 | 25 | 10 |
| ski-trip-2026-09 | event 39 | 20 | 10 |
| ski-trip-2026-10 | event 40 | 22 | 10 |
| ski-trip-2026-11 | event 41 | 24 | 10 |
| ski-trip-2026-12 | event 42 | 17 | 10 |
| ski-trip-2026-13 | event 43 | 23 | 10 |
| ski-trip-2026-14 | event 44 | 25 | 10 |
| ski-trip-2026-15 | event 45 | 7 | 5 |
| ski-trip-2026-16 | event 46 | 23 | 10 |
| ski-trip-2026-17 | event 47 | 25 | 10 |
| ski-trip-2026-18 | event 48 | 19 | 10 |
| ski-trip-2026-19 | event 49 | 24 | 10 |
| ski-trip-2026-20 | event 50 | 24 | 10 |
| ski-trip-2026-21 | event 51 | 22 | 10 |
| ski-trip-2026-22 | event 52 | 23 | 10 |
| ski-trip-2026-23 | event 53 | 28 | 15 |
| ski-trip-2026-24 | event 54 | 22 | 10 |
| ski-trip-2026-25 | event 55 | 29 | 15 |
| ski-trip-2026-26 | event 56 | 20 | 10 |
| ski-trip-2026-27 | event 57 | 22 | 10 |
| ski-trip-2026-28 | event 58 | 28 | 15 |
| ski-trip-2026-29 | event 59 | 23 | 10 |
| ski-trip-2026-30 | event 60 | 30 | 15 |
| train-journey-2026-01 | event 61 | 11 | 5 |
| train-journey-2026-02 | event 62 | 14 | 5 |
| train-journey-2026-03 | event 63 | 17 | 10 |
| train-journey-2026-04 | event 64 | 11 | 5 |
| train-journey-2026-05 | event 65 | 16 | 5 |
| train-journey-2026-06 | event 66 | 7 | 5 |
| train-journey-2026-07 | event 67 | 21 | 10 |
| train-journey-2026-08 | event 68 | 24 | 10 |
| train-journey-2026-09 | event 69 | 18 | 10 |
| train-journey-2026-10 | event 70 | 22 | 10 |
| train-journey-2026-11 | event 71 | 21 | 10 |
| train-journey-2026-12 | event 72 | 18 | 10 |
| train-journey-2026-13 | event 73 | 25 | 10 |
| train-journey-2026-14 | event 74 | 25 | 10 |
| train-journey-2026-15 | event 75 | 9 | 5 |
| train-journey-2026-16 | event 76 | 23 | 10 |
| train-journey-2026-17 | event 77 | 26 | 10 |
| train-journey-2026-18 | event 78 | 18 | 10 |
| train-journey-2026-19 | event 79 | 24 | 10 |
| train-journey-2026-20 | event 80 | 25 | 10 |
| train-journey-2026-21 | event 81 | 22 | 10 |
| train-journey-2026-22 | event 82 | 26 | 10 |
| train-journey-2026-23 | event 83 | 26 | 10 |
| train-journey-2026-24 | event 84 | 21 | 10 |
| train-journey-2026-25 | event 85 | 24 | 10 |
| train-journey-2026-26 | event 86 | 18 | 10 |
| train-journey-2026-27 | event 87 | 21 | 10 |
| train-journey-2026-28 | event 88 | 27 | 10 |
| train-journey-2026-29 | event 89 | 25 | 10 |
| train-journey-2026-30 | event 90 | 32 | 15 |
| winter-market-2026-01 | event 91 | 11 | 5 |
| winter-market-2026-02 | event 92 | 12 | 5 |
| winter-market-2026-03 | event 93 | 17 | 10 |
| winter-market-2026-04 | event 94 | 11 | 5 |
| winter-market-2026-05 | event 95 | 18 | 10 |
| winter-market-2026-06 | event 96 | 6 | 5 |
| winter-market-2026-07 | event 97 | 22 | 10 |
| winter-market-2026-08 | event 98 | 23 | 10 |
| winter-market-2026-09 | event 99 | 18 | 10 |
| winter-market-2026-10 | event 100 | 22 | 10 |
| winter-market-2026-11 | event 101 | 23 | 10 |
| winter-market-2026-12 | event 102 | 20 | 10 |
| winter-market-2026-13 | event 103 | 25 | 10 |
| winter-market-2026-14 | event 104 | 25 | 10 |
| winter-market-2026-15 | event 105 | 9 | 5 |
| winter-market-2026-16 | event 106 | 23 | 10 |
| winter-market-2026-17 | event 107 | 28 | 15 |
| winter-market-2026-18 | event 108 | 17 | 10 |
| winter-market-2026-19 | event 109 | 22 | 10 |
| winter-market-2026-20 | event 110 | 27 | 10 |
| winter-market-2026-21 | event 111 | 21 | 10 |
| winter-market-2026-22 | event 112 | 25 | 10 |
| winter-market-2026-23 | event 113 | 26 | 10 |
| winter-market-2026-24 | event 114 | 21 | 10 |
| winter-market-2026-25 | event 115 | 28 | 15 |
| winter-market-2026-26 | event 116 | 21 | 10 |
| winter-market-2026-27 | event 117 | 23 | 10 |
| winter-market-2026-28 | event 118 | 27 | 10 |
| winter-market-2026-29 | event 119 | 25 | 10 |
| winter-market-2026-30 | event 120 | 32 | 15 |
| northern-lights-2026-01 | event 121 | 12 | 5 |
| northern-lights-2026-02 | event 122 | 13 | 5 |
| northern-lights-2026-03 | event 123 | 16 | 5 |
| northern-lights-2026-04 | event 124 | 12 | 5 |
| northern-lights-2026-05 | event 125 | 18 | 10 |
| northern-lights-2026-06 | event 126 | 8 | 5 |
| northern-lights-2026-07 | event 127 | 21 | 10 |
| northern-lights-2026-08 | event 128 | 23 | 10 |
| northern-lights-2026-09 | event 129 | 18 | 10 |
| northern-lights-2026-10 | event 130 | 21 | 10 |
| northern-lights-2026-11 | event 131 | 26 | 10 |
| northern-lights-2026-12 | event 132 | 18 | 10 |
| northern-lights-2026-13 | event 133 | 23 | 10 |
| northern-lights-2026-14 | event 134 | 22 | 10 |
| northern-lights-2026-15 | event 135 | 8 | 5 |
| northern-lights-2026-16 | event 136 | 25 | 10 |
| northern-lights-2026-17 | event 137 | 26 | 10 |
| northern-lights-2026-18 | event 138 | 19 | 10 |
| northern-lights-2026-19 | event 139 | 23 | 10 |
| northern-lights-2026-20 | event 140 | 27 | 10 |
| northern-lights-2026-21 | event 141 | 21 | 10 |
| northern-lights-2026-22 | event 142 | 22 | 10 |
| northern-lights-2026-23 | event 143 | 28 | 15 |
| northern-lights-2026-24 | event 144 | 20 | 10 |
| northern-lights-2026-25 | event 145 | 24 | 10 |
| northern-lights-2026-26 | event 146 | 21 | 10 |
| northern-lights-2026-27 | event 147 | 24 | 10 |
| northern-lights-2026-28 | event 148 | 28 | 15 |
| northern-lights-2026-29 | event 149 | 26 | 10 |
| northern-lights-2026-30 | event 150 | 30 | 15 |
| carnival-2027-01 | event 151 | 13 | 5 |
| carnival-2027-02 | event 152 | 13 | 5 |
| carnival-2027-03 | event 153 | 17 | 10 |
| carnival-2027-04 | event 154 | 10 | 5 |
| carnival-2027-05 | event 155 | 16 | 5 |
| carnival-2027-06 | event 156 | 8 | 5 |
| carnival-2027-07 | event 157 | 22 | 10 |
| carnival-2027-08 | event 158 | 23 | 10 |
| carnival-2027-09 | event 159 | 19 | 10 |
| carnival-2027-10 | event 160 | 21 | 10 |
| carnival-2027-11 | event 161 | 23 | 10 |
| carnival-2027-12 | event 162 | 18 | 10 |
| carnival-2027-13 | event 163 | 26 | 10 |
| carnival-2027-14 | event 164 | 25 | 10 |
| carnival-2027-15 | event 165 | 8 | 5 |
| carnival-2027-16 | event 166 | 25 | 10 |
| carnival-2027-17 | event 167 | 27 | 10 |
| carnival-2027-18 | event 168 | 19 | 10 |
| carnival-2027-19 | event 169 | 24 | 10 |
| carnival-2027-20 | event 170 | 26 | 10 |
| carnival-2027-21 | event 171 | 22 | 10 |
| carnival-2027-22 | event 172 | 24 | 10 |
| carnival-2027-23 | event 173 | 26 | 10 |
| carnival-2027-24 | event 174 | 21 | 10 |
| carnival-2027-25 | event 175 | 26 | 10 |
| carnival-2027-26 | event 176 | 21 | 10 |
| carnival-2027-27 | event 177 | 25 | 10 |
| carnival-2027-28 | event 178 | 25 | 10 |
| carnival-2027-29 | event 179 | 25 | 10 |
| carnival-2027-30 | event 180 | 33 | 15 |
