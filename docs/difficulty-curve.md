# The campaign's difficulty curve: a sawtooth

The creator, 2026-10-25: "It should not be one long difficulty ramp that gets
tougher and tougher. Making it more difficult early, even by level 3, keeps
the game interesting and keeps players from getting bored and moving on."
Boards 4–13 as first dealt were won by careless play 78–100% of the time,
with the next card showing on every stack. Now every stack shows card backs
(`peek` 0), and the curve below replaces "alternate demand and relief".

## What the genre does

- **Sawtooth:** peaks and valleys, each peak a little higher than the last.
  The valley after a peak gives relief and a sense of mastery. *Where's My
  Water?* builds each set of levels to a hard finish, then eases off.
  *ELIMINATION*, a word puzzle tested on about 1,000 players, generated a
  sawtooth on purpose, and the players' runs confirmed it.
- **Royal Match**, by a third-party count: about 20 levels per world. A
  "super hard" level falls every 10th level from level 59 on, with a "hard"
  level between each pair. Normal levels take about 1.2 tries, hard ones
  about 1.6, super hard up to 2.5. A new mechanic gets 2–3 learning levels,
  then a hard spike. Every 10th level is also a bonus "victory lap". Its
  first hard level is 39; this game wants a bite far sooner.
- **Early churn:** in a study of about 12 million Candy Crush players, early
  frustration drove large churn. A player leaves when the tries a level
  takes outrun the tries it takes them to get bored. So early boards must
  bite, but never wall anyone. Our 3 undo, 3 hint and 3 shuffle on every
  board, and the free restart, are the way out of a hard board.

## The cycle (10 boards)

| Board in the cycle | Role | Careless play wins (target) |
|---|---|---|
| x1 | **Change of pace:** all long pictures, from board 11 (AGENTS.md), and relief | 85–100% |
| x2–x4 | Build, each a little harder | 60–80% |
| x5 | **Hard** | 30–50% |
| x6 | Relief | 85–100% |
| x7–x9 | Build, x9 the hardest of them | 50–70% |
| x10 | **Super hard**, the cycle's peak | 10–30% |

**The first cycle:**

- Boards 1–2 teach.
- Board 3 is the first bite: a hard-for-a-beginner board, around 60%.
- Board 4 is relief.
- Boards 5–6 build, board 7 is hard, board 8 is relief and board 9 builds.
- Board 10 is the first peak, at the hard target rather than super hard.

**Raising each cycle's floor:** each cycle raises the floor, using more
pictures, longer chains, more traps, then 4×5 boards.

"Careless play" is the generator's careless-win measure, made fair to hidden
stacks: the player cannot see a stack's next card. A peak must still be
something a player beats in a few tries with the helpers. No board ships that
needs a helper to be won (AGENTS.md: "Levels are proved data").

## Setting a board's difficulty (Levels)

**The dial is the number of pictures for the board's size.** Hidden stacks do
not move the careless-win measure: that player already draws and picks a place
blind, so it never used the shown cards. A careful player, who could plan
draws while the cards showed, now plays closer to it. A survey of random
square-only deals that can be won, careless win by picture count (Levels,
2026-10-25; median, with the middle half in brackets):

| board | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|
| 4×4 | 100% | 100% | 100% (67–100) | 44% (25–67) | 18% (10–41) | 5%, rare | — | — | — | — |
| 4×5 | — | — | 100% | 100% (89–100) | 67% (42–96) | 39% (21–67) | 22% (11–44) | 11%, rare | — | — |
| 5×5 | — | — | — | — | — | — | 91% (62–100) | 54% (28–86) | 26% (9–48) | 8% (3–21) |

(5×5 surveyed 2026-10-27; at 15 pictures the median is 2% and most deals cannot be won.)

6×6, surveyed 2026-10-27 (winnable deals; median, middle half in brackets):

| 6×6 | 15 | 16 | 17 | 18 | 19 |
|---|---|---|---|---|---|
| careless win | 100% (89–100) | 80% (49–99) | 56% (32–79) | 31% (9–56) | 12% (4–30) |

- A 4×4 board of long pictures (tall and wide mixed) is won carelessly
  every time, from 7 pictures to 12: a change of pace, never a bite.
- Past about 9 pictures on 4×4 (11 on 4×5, 13 on 5×5), most deals cannot be won at all,
  and the chain of dependent clears grows by about one per added picture.
- So: relief takes 5 squares on 4×4 (8 on 4×5). A build takes 7–8 (9–10), a
  hard board 8–9 (10–11), and a super hard one 9 (11–12). On 5×5 a hard
  board takes 13 and a super hard one 13–14. The maker then
  picks the deal inside the row's careless-win range
  (`tools/levels/campaign-plan.mts`).
- Every board but hard, peak and super starts safe: no first move or first
  clear dooms it.

**Decided:** hard and super hard boards are marked for the player, as in
Royal Match (creator, 2026-10-25; AGENTS.md).

**Open, for the creator:**

- **Coins:** whether peaks pay more than the usual Coins per move.

## Trips of 15 boards (proposal, Levels, 2026-10-25)

The game becomes a travelogue (creator, 2026-10-25): trips of about 15 boards,
each ending in a passport stamp. Each board has one destination, a real
place's postcard the size of the board, of which a 2×2 window plays as an
ordinary picture and unfolds into the whole postcard when it is finished.

**A trip's shape.** Three spikes, one every fifth board, each followed by a
board that eases off. The stamp rewards the finale.

| Board in the trip | Role | Careless play wins (target) |
|---|---|---|
| x1 | Relief, right after the stamp (teach, on trip 1) | 85–100% |
| x2–x4 | Build | 60–80% |
| x5 | **Hard** | 30–50% |
| x6 | Change of pace: all long pictures (relief) | 100% |
| x7–x9 | Build, rising | 55–70% |
| x10 | **Hard** | 30–50% |
| x11 | Relief | 85–100% |
| x12–x14 | Build, the trip's hardest builds | 50–65% |
| x15 | **Super hard**, the finale before the stamp | 10–30% |

- **Trip 1 keeps its onboarding curve** (bite 3, hard 7, peak 10, finale 15):
  it ends on a hard board, not a super hard one.
- **All-long boards:** one a trip, in a relief slot after a spike (11 on
  trip 1, 21 on trip 2, then x6). That is one board in 15, not the ruled one
  in ten; one in ten needs two a trip (x6 and x11). *The creator's call*; I
  would keep one a trip, since x11 already relieves.

**What a destination does to difficulty: nothing, if it takes a picture's
place.** The rules see a 2×2 like any other. Added as an extra picture, it
would turn the dial: a relief board's 5 pictures to 6 stays easy, but a hard
board's 8 to 9 drops careless win from about 44% to 18%.

**On an all-long board**, squares and long pictures never mix, so the
destination plays as a tall (1×2) or wide (2×1) window of the same postcard.
Art picks the way it runs: tall for a tower or a waterfall, wide for a
skyline or a bridge. Two cards show less of the place than four, but the
reveal unfolds the whole postcard anyway. The board already draws any window
shape (Gameplay). The check would allow a long window on an all-long board
only, and Art's entry would say which way it runs.

**Re-dealing boards 1–15 with a destination each costs no difficulty.**

- Each board's destination takes one picture's place, at the same spot in the
  board's list. The deal, the winning line, par, careless win, traps and chain
  stay exactly as they are; the people remakes went in this way. So the
  creator's reviews of boards 1–15 stand.
- **Which picture leaves:** the board's own real landmark, where it has one,
  so the trip's place is the only real place on its board: Mount Fuji (3),
  the Leaning Tower (6), the Colosseum (10), the Eiffel Tower or the Taj Mahal
  (12). Golden Gate (10) is American, and could become board 10's destination
  itself, as a postcard. Elsewhere, the busiest picture leaves. The 15 that
  leave go back to the spares, since no player has met them yet.
- **The cost:**
  - Art: 15 postcards at the 4×4 board's size, board 11's with a long window.
  - Levels: a destination for each board, then a re-run (minutes).
  - Server: one checker and Coins rebuild; the pictures change, the Coins do not.
- **Only if wanted:** the place can be held back to come late on the board,
  as its last clear. That needs a new deal for the board, aimed at the same
  targets, which changes the deal the creator reviewed. I would start with the
  swap, and re-deal only the boards where the place comes out too soon.

**The campaign in trips:**

- **Trip 1, "Travel America", boards 1–15:** as it is now.
- **Trip 2, boards 16–30:**
  - Board 16 is already relief, right after the stamp.
  - Board 20 is super hard, board 21 all long, board 25 hard and board 26 relief.
  - New: boards 27–29 are 4×5 builds (10–11 pictures, 50–65%), and board 30
    is the super hard finale (12 pictures, 10–30%).
- **The cost of trip 2:**
  - Levels: 4 new boards.
  - Art: 15 postcards, 6 at the 4×4 size (16–21, board 21's long) and 9 at
    the 4×5 size (22–30), since 4×5 boards start mid-trip, at 22.
  - The same in-place swap for 16–26.
- *For the creator:* keep board 20 super hard, so trip 2 has two (20 and 30)
  and ends on its hardest board; or ease 20 to hard, to match the shape above
  (one board re-dealt). I would keep it.
- The challenge route and the daily stay library-only, with no destinations,
  unless the creator wants them.

## 5×5 and 6×6 boards (creator, 2026-10-27)

After Jigsaw Drop's level 18, the creator asked for 5×5 boards as a frequent
variation on hard boards and finales, never a rule. About 65% of the marked
boards from board 10 are big: 12 of 17. Board 10 is first, then two a trip
from trip 2, in different slots each trip; every other finale (30, 60, 90)
is 6×6. The bigger board is the change of feel, not an extra spike: each
keeps its role, mark and careless-win target.

| Trip | Big boards (slot in the trip) |
|---|---|
| 1, Travel America | 10, 5×5 (the peak, at trip 1's gentler target) |
| 2, Japan | 20, 5×5 (x5, super hard); 30, **6×6** (x15, the finale) |
| 3, Italy | 40, 5×5 (x10); 45, 5×5 (x15, the finale) |
| 4, American West | 50, 5×5 (x5); 55, 5×5 (x10); 60, **6×6** (x15, the finale) |
| 5, France | 65, 5×5 (x5); 75, 5×5 (x15, the finale) |
| 6, Canada | 85, 5×5 (x10); 90, **6×6** (x15, the finale) |

- **Hard and finale boards that stay 4×5 or 4×4:** 15, 25, 35, 70 and 80.
- **How they were made:** each board was re-dealt at its new size. It keeps
  all its pictures and its destination, and Art's new pictures, met nowhere
  else, bring it up to the row's count.
- **Counts:** board 10 takes 11 pictures. The 5×5 hard boards take 13, and
  the 5×5 finales 13, or 14 where four traps are allowed (75). On 6×6,
  board 30 takes 18 and boards 60 and 90 take 19.
- **The postcard:** a postcard the board's size (3:4) with a 2×2 window. It
  opens mid-board on the proved line, never as the first or last clear.
- **Stacks:** no stack holds more than 13 cards after the opening, so the
  board's count of cards left is exact all the way (Gameplay).

## Readable boards (creator, 2026-10-27)

On boards 18 and 19 the creator felt the dealing was rigged: "I could see at
the top how the images were going to come in… I was going to be stuck unless
somehow I got lucky on the two cards behind". The measures agreed. Finishing
a square brings down two cards in each of its columns, the face-up one and
the hidden one behind it, and on those boards the hidden cards decided the
game: a player who read the face-up cards won no more often than a careless
one.

**The reader.** Like the careless player it finishes a picture whenever it
can, but when it must draw it takes the column whose face-up card is of the
picture furthest along on the board (`reader` in
`src/game/solver/metrics.ts`). Where its line and the careless line meet in
the Difficulty editor, looking at the cards does not help.

**The rule (the creator's choice).** Every unmarked campaign board is
readable: the reader wins it 85% or more, and careless play keeps the board's
target. Hard and super hard boards may still hide the way, since they are
marked. `tools/levels/check.mts` fails an unmarked board that is not.

- **43 of the 72 unmarked boards failed it**, and were re-dealt with their
  own pictures and postcards on a new seed: 3, 13, 18, 19, 22, 24, 27, 28,
  29, 33, 34, 38, 39, 42, 43, 44, 47, 48, 49, 52, 53, 54, 57, 58, 59, 62,
  63, 64, 67, 68, 69, 72, 73, 74, 77, 78, 79, 82, 83, 84, 87, 88 and 89.
- **One picture fewer, on 18 of them:** 34, 39, 54, 57, 58, 59, 64, 68, 69,
  72, 73, 74, 82, 83, 84, 87, 88 and 89. No deal of their pictures was
  readable at their target; most are the 12-picture builds late in trips
  3–6. Each kept its postcard, and the picture it dropped is back in the
  library.
- **Eased one step, on seven of those:** 54, 58, 59, 69, 74 and 89, each its
  trip's hardest unmarked build, and 88 under the same rule. They were still
  unreadable with one picture fewer.

| Board | Target before | Target now |
|---|---|---|
| 54 | 35–45% | 45–55% |
| 58 | 40–50% | 50–60% |
| 59 | 35–45% | 45–55% |
| 69 | 35–45% | 45–55% |
| 74 | 35–45% | 45–55% |
| 88 | 35–45% | 45–55% |
| 89 | 30–40% | 40–50% |

- **Only the campaign is held to it.** The challenge route keeps its
  character: it is demanding throughout, and all 20 of its boards would fail.
  The daily is left as it is (58 of its 184 boards would fail, mostly at
  67–75%).
- **It assumes the next card is face up**, the creator's trial (board tuning
  `showNext`). If the stacks go back to card backs, the reader sees nothing,
  and readability must be measured again.

**Marked boards never wall a careful player (the creator, 2026-10-27).**
After board 60 the creator said: "I know I'm very very likely to get stuck
and can't do anything about it." A hard or super hard board may still hide
the way. But the reader must win it about 1 in 4 or more (25%, `CAREFUL` in
`metrics.ts`), and `tools/levels/check.mts` fails a marked campaign board
under that.

- **Two boards failed: 60 and 90.** Both were re-dealt at 6×6 with their own
  pictures and postcards. Their careless play stays in the super band, and
  the reader is now 25–40%, so they stay the game's hardest boards.

| Board | Careless, before → now | Reader, before → now |
|---|---|---|
| 60 | 9.3% → 19% | 10.6% → 29% |
| 90 | 14.9% → 16% | 20.9% → 34% |

- **Every other marked board already passed.** The lowest is board 20, at
  exactly 25%.
- **The floor applies to the campaign only.**

## Trips 7 and 8 (plan, the creator's choices, 2026-10-27)

**Trip 7 is Argentina, boards 91–105. Trip 8 is Australia, boards
106–120**, with New Zealand to join it only if Australia runs short of
places that fit the postcard rules.

**The shape** is the one since trip 3: relief after the stamp, hard at x5
and x10, an all-long breather at x6, a relief at x11, and a super hard
finale. Two rules now cap how hard a board can be:

- every unmarked board is readable (85% or more for a player who draws by
  the face-up cards);
- every marked board lets that player win 1 in 4 or more.

So the builds sit at 10–11 pictures, not 12: on 4×5, 12 pictures is not
readable at a build's target. The bigger board sizes are where the trips
grow.

| In the trip | Argentina | Australia | Pictures | Careless target |
|---|---|---|---|---|
| x1 relief | 91 | 106 | 10 | 80–100% |
| x2 build | 92 | 107 | 10 | 55–65% |
| x3 build | 93 | 108 | 11 | 50–60% |
| x4 build | 94 | 109 | 11 | 50–60% |
| x5 hard | 95, 5×5 | 110, 5×5 | 13 | 25–35% |
| x6 all long, 4×4 | 96 | 111 | 12 | 85–100% |
| x7 build | 97 | 112 | 11 | 50–60% |
| x8 build | 98 | 113 | 11 | 45–55% |
| x9 build | 99 | 114 | 11 | 45–55% |
| x10 hard | 100, 5×5, 13 pictures, 20–30% | 115, 4×5, 12 pictures, 20–30% | | |
| x11 relief | 101 | 116 | 10 | 80–100% |
| x12 build | 102 | 117 | 11 | 50–60% |
| x13 build | 103 | 118 | 11 | 45–55% |
| x14 build | 104 | 119 | 11 | 45–55% (Australia 40–50%) |
| x15 super | 105, 4×5, 12 pictures, 8–20% | 120, **6×6**, 19 pictures, 8–18% | | |

Every square board not marked otherwise above is 4×5.

- **Big boards:** two a trip, in new slots: Argentina's x5 and x10 (its finale
  stays 4×5), and Australia's x5 and its finale, 6×6 as every other finale
  is (90, then 120).

**Art's work, as for trips 5–6:**

- 240 new everyday pictures: 216 squares, 12 tall and 12 wide.
- 30 postcards:
  - 4×5 for the square boards;
  - 5×5 for 95, 100 and 110;
  - 6×6 for 120;
  - 4×4 with a long window for 96 and 111.

**The places: a shortlist for Art to fact-check.** Each trip has about 8
famous places, 4 hidden gems and 3 silly ones. They are set by slot: a
famous opener, vistas on the big boards, a tall or wide place on the
all-long board, and the most famous as the finale.

| Slot | Argentina | Australia |
|---|---|---|
| x1 | Iguazú Falls (famous) | The Twelve Apostles (famous) |
| x2 | La Boca's painted houses, Caminito (famous) | Brighton's bathing boxes (famous) |
| x3 | The Hill of Seven Colours, Purmamarca (famous) | Hutt Lagoon, the pink lake (gem) |
| x4 | Capybaras of the Iberá wetlands (gem) | Cape Hillsborough's beach kangaroos at sunrise (silly) |
| x5, big | Mount Fitz Roy at sunrise (famous) | Whitehaven Beach's swirling sands (famous) |
| x6, long | Les Éclaireurs lighthouse, Ushuaia (famous, tall) | Sydney Harbour Bridge (famous, wide) |
| x7 | The End of the World Post Office, Ushuaia (silly) | The Bay of Fires' orange rocks (gem) |
| x8 | Salinas Grandes salt flats (famous) | The Pinnacles Desert (famous) |
| x9 | The Train to the Clouds' La Polvorilla viaduct (gem) | A Rottnest Island quokka (silly) |
| x10 | A southern right whale off the Valdés Peninsula (famous, big) | Remarkable Rocks, Kangaroo Island (famous) |
| x11 | Punta Tombo's penguins crossing the path (silly) | Cape Tribulation, where the rainforest meets the reef (famous) |
| x12 | The Hornocal, the "fourteen colours" hills (gem) | Karijini's gorges (gem) |
| x13 | Tandil's balancing stone, Piedra Movediza (silly) | The Big Banana, Coffs Harbour (silly) |
| x14 | La Payunia's black lava fields (gem) | Cradle Mountain over Dove Lake (gem) |
| x15 | Perito Moreno Glacier (famous, the finale) | The Great Barrier Reef's Heart Reef (famous, the 6×6 finale) |

**Left out by the postcard rules:**

- Uluru (sacred).
- The Sydney Opera House (its owners license its image).
- The Three Sisters (a Dreamtime story site).

**For Art to confirm:**

- the Big Banana's owners, else the Big Pineapple or another of the "Big
  Things";
- the Harbour Bridge without BridgeClimb's branding;
- Ischigualasto, held back as a reserve in case its guided-only entry counts
  as a permit.

## Sources

- [Bugnet: difficulty curves, how to get them right](https://bugnet.io/blog/difficulty-curves-how-to-get-them-right)
- [Revert to Saved: the difficulty wall](https://reverttosaved.com/2012/08/02/bashing-your-head-against-the-difficulty-wall/) (*Where's My Water?*)
- [ELIMINATION from design to analysis (IEEE CoG 2019)](https://paperswithcode.com/paper/elimination-from-design-to-analysis)
- [Gamigion: Royal Match level design insights](https://www.gamigion.com/royal-match-level-design-insights/) (unofficial count)
- [SayGames: difficulty in hybrid puzzles](https://blog.say.games/posts/how-to-work-with-difficulty-in-hybrid-puzzles-so-players-dont-leave--but-stay-and-pay)
- [Liquid and Grit: Candy Crush churn research](https://www.liquidandgrit.com/?p=10891)
