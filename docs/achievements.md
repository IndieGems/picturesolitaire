# Achievements

The creator's list (2026-10-30). These are platform achievements: a name, a description and
points, listed on the store page, with the points added to the player's Arcade-wide Achievement
Score. Six of them also award an Arcade avatar icon, a portrait or badge the player can wear
anywhere on the Arcade. The SDK's `docs/achievements.md` is the how-to.

**The points budget is lifetime.** The game may award 1,000 points in all, removed achievements
included, and 20 icon-awarding achievements (`gemctl achievement limits`). This list spends 450
points and 6 icons. The rest is kept for future trips and events, so never change a released
achievement's points or rewards; add a new achievement instead.

| Group | Achievement | Earned by | Points | Icon |
| --- | --- | --- | --- | --- |
| Journey | First Steps | Finish your first level | 5 | `ach-first-steps`: the Statue of Liberty at sunrise |
| Journey | Finding Your Feet | Finish 10 levels | 10 | |
| Journey | Seasoned Traveller | Finish 50 levels | 25 | `ach-seasoned-traveller`: a Venice gondola |
| Journey | Globetrotter | Finish 150 levels | 75 | `ach-globetrotter`: a globe circled by a plane, landmarks on its rim |
| Stamps | Stamped: Travel America, Japan, Italy, American West, France, Canada, Argentina, Australia, South Africa, UK & Ireland (10) | Finish that trip (its passport stamp) | 15 each | |
| Souvenirs | Something to Remember | Finish your first Souvenir level | 5 | |
| Souvenirs | Full Suitcase | Finish 10 Souvenir levels | 40 | `ach-full-suitcase`: a suitcase bursting with a journey |
| Hard | Up for a Challenge | Win a hard level | 10 | |
| Hard | Nerves of Steel | Win a super hard level | 20 | |
| Hard | Fearless | Win 10 super hard levels | 50 | `ach-fearless`: a storm-struck Rockies summit, red flag |
| Daily | Daily Habit | Win your first daily puzzle | 5 | |
| Daily | Week of Dailies | Win 7 daily puzzles | 15 | |
| Daily | Daily Devotee | Win 30 daily puzzles | 40 | `ach-daily-devotee`: Fuji at sunrise |

How each is counted:
- **Levels** are campaign levels (the trips), each counted once, however often it's replayed. A practice
  run counts nothing.
- **The descriptions name a count, never "all".** Future trips add levels, Souvenirs and super hard
  levels, so "all 10" would stop being true.
- **A daily counts once per day**, on its first win.
- **Every counter is moved by the win checker, on a verified win.** The client never moves one. A player
  who earned some before achievements existed gets them on their next verified win: the checker counts
  from the player's progress.
- **Each achievement's id is stable forever.** Server keeps the ids in the config's source.

Who builds what (2026-10-30):
- **Server:** the counter progressions and the achievement entries, written by make-config; the checker
  moving the counters, with the backfill.
- **Art:** the six icons, glossy enamel landmark pins (the creator's pick, 2026-10-30), uploaded as the game's own items (f990c21).
- **UI:** the unlock card (the game standard's big celebration), and the names and descriptions in all
  12 locales.
- **Audio:** the unlock sound.
