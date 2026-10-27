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

## 5×5 boards (creator, 2026-10-27)

After Jigsaw Drop's level 18, the creator asked for 5×5 boards as a frequent
variation on hard boards and finales, never a rule. About 65% of the marked
boards from board 10 are 5×5: 11 of 17. Board 10 is first, then two a trip
from trip 2, in different slots each trip. The bigger board is the change of
feel, not an extra spike: each keeps its role, mark and careless-win target.

| Trip | 5×5 boards (slot in the trip) |
|---|---|
| 1, Travel America | 10 (the peak, at trip 1's gentler target) |
| 2, Japan | 20 (x5, super hard), 30 (x15, the finale) |
| 3, Italy | 40 (x10), 45 (x15, the finale) |
| 4, American West | 50 (x5), 55 (x10) |
| 5, France | 65 (x5), 75 (x15, the finale) |
| 6, Canada | 85 (x10), 90 (x15, the finale) |

- **Hard and finale boards that stay 4×5 or 4×4:** 15, 25, 35, 60, 70 and 80.
- **How they were made:** each board was re-dealt at 5×5. It keeps all its
  pictures and its destination, and Art's new pictures, met nowhere else,
  bring it up to the row's count.
- **Counts:** board 10 takes 11 pictures. The hard boards take 13. The
  finales take 13, or 14 where four traps are allowed (75 and 90).
- **The postcard:** it is a 5×5 postcard with a 2×2 window. It opens
  mid-board on the proved line, never as the first or last clear.

## Sources

- [Bugnet: difficulty curves, how to get them right](https://bugnet.io/blog/difficulty-curves-how-to-get-them-right)
- [Revert to Saved: the difficulty wall](https://reverttosaved.com/2012/08/02/bashing-your-head-against-the-difficulty-wall/) (*Where's My Water?*)
- [ELIMINATION from design to analysis (IEEE CoG 2019)](https://paperswithcode.com/paper/elimination-from-design-to-analysis)
- [Gamigion: Royal Match level design insights](https://www.gamigion.com/royal-match-level-design-insights/) (unofficial count)
- [SayGames: difficulty in hybrid puzzles](https://blog.say.games/posts/how-to-work-with-difficulty-in-hybrid-puzzles-so-players-dont-leave--but-stay-and-pay)
- [Liquid and Grit: Candy Crush churn research](https://www.liquidandgrit.com/?p=10891)
