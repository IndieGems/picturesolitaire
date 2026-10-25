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

**Open, for the creator:**

- **Labels:** whether the game tells the player a board is "Hard" or "Super
  hard", as Royal Match does.
- **Coins:** whether peaks pay more than the usual Coins per move.

## Sources

- [Bugnet: difficulty curves, how to get them right](https://bugnet.io/blog/difficulty-curves-how-to-get-them-right)
- [Revert to Saved: the difficulty wall](https://reverttosaved.com/2012/08/02/bashing-your-head-against-the-difficulty-wall/) (*Where's My Water?*)
- [ELIMINATION from design to analysis (IEEE CoG 2019)](https://paperswithcode.com/paper/elimination-from-design-to-analysis)
- [Gamigion: Royal Match level design insights](https://www.gamigion.com/royal-match-level-design-insights/) (unofficial count)
- [SayGames: difficulty in hybrid puzzles](https://blog.say.games/posts/how-to-work-with-difficulty-in-hybrid-puzzles-so-players-dont-leave--but-stay-and-pay)
- [Liquid and Grit: Candy Crush churn research](https://www.liquidandgrit.com/?p=10891)
