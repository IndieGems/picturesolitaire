# QA report: Picture Mend, 2026-10-23/24

These are QA's play-tests of the Game task force's build, in three passes. A finding names
its owner, and "fixed" means it was re-checked after the owner's fix. Screenshots were kept
in a scratch folder outside the project and are not in the repository. The tree moved from
e0baaf3 to 1bbbd22 while this ran.

How it was played:
- `tools/playtest.mts` at 360x640, 390x844 (3x as well) and desktop 1280x800, on the working tree.
- The built game in the Arcade's own play page (`gemctl serve run . --as new-guest`), each run
  as a fresh **test guest** (no Coins land for a guest). The creator's account and named test
  accounts were not used.

## Pass 1: what was stable

All of it is stable after fixes. All 30 campaign boards and challenge 1 were won with real
taps and drags, about 700 moves, and after every move the board equalled `rules.move()`. The
drawn pieces matched the rules' pieces. Falls came first, then the refill column by column,
left to right.

| finding | owner | state |
|---|---|---|
| A board won offline was hidden behind "No connection" at once | UI | fixed (71c7bb6) |
| Picture titles cut off in the full-screen view (26 of 40 with the Gem corner at 360 px) | UI | fixed |
| The stuck line never named Shuffle | UI | fixed |
| Next arrow and table thumbs failed to load during a connection drop | UI | fixed |
| Finish card showed no prize until the server answered | UI | fixed |
| Taps ignored for about 1.3 s while a hint played | Gameplay | fixed (107ad41) |
| Board 20: 2 first moves dead-ended the board | Levels | fixed (4f7f784, then 33b9c3b) |

Checked and passing:
- **Undo, Restart and Hint:** Undo x3 is exact and the 4th is refused. Restart deals the
  opening again. 18 of 18 hints off the line led to a solver-proved winnable board.
- **Shuffle:** on dead ends on boards 20, 25 and 30 it gave a winnable mix and spent 1.
- **Guided start:** one thing lit, the rest locked, 18 px text, and a milestone card with
  fireworks capped at 2x.
- **Albums:** pinch, double-tap and wheel zoom, with the page never zooming.
- **Settings:** mute takes the master gain to 0, the volume follows its curve, and vibration
  is hidden where there is none.
- **Hidden page:** a hidden page suspends the sound and asks for 0 frames.
- **"No connection":** shows at home, on a board and with ?offline=1.
- **Phone rules:** 44 px targets, 12 px text, no zoom, long-press menu or text selection, and
  one finger owns a drag.
- **At rest:** 0 frames on every still screen. The weather is CSS transform and opacity only,
  and off under less motion and battery saver.
- **Top row:** right with and without the Gem.
- **Merged pieces:** seamless with the thin frames, in 3x close-ups of 8 shapes.

After 33b9c3b: none of the 30 campaign boards has a first move that leaves it unwinnable (56
first moves finish a picture, and none is doomed). The six re-dealt boards were replayed.

## Pass 2: the new parts, as a new player (test guests, Arcade page)

| finding | owner | state |
|---|---|---|
| The keepsake read logged a warning and poked the connection check for every new player | Server | fixed (91000c8) |

Checked and passing:
- **Guided start:** shows for a new player. Its finish card shows "+100 Coins" and Autumn
  Study from the start, and the table is owned after board 1.
- **Win checks:** board 1, board 2, challenge 1 and the daily were all verified by the
  checker in 53 to 163 ms (7 to 8 ms CPU). A guest's grants are suppressed, and no Coins chip
  shows.
- **Replays:** a challenge replay pays nothing new. A second daily finish is "just for fun",
  and the first result stays on the day's board.
- **Daily:** the date is the platform's. The results show the player and their friends.
- **Cloud save:** level, albums and the table survive a game restart.
- **Platform moments:** fire at win-next, daily-results and challenge-route, and none fire in
  the guided start.
- **Top row:** level with the real Gem (top-left, 52 px).

Left to re-check, with the creator's OK: Coins landing for a real account. Server proved it
with throwaway accounts.

## Pass 3: release checklist, dry run

Verdict: **NO-GO**, as expected, since nothing is being released. Here is what blocks it.

| # | blocks release | check | owner (lead routes) |
|---|---|---|---|
| 1 | **The platform refuses the build**: 43 duplicate file names across folders (`pictures/<album>/X.webp` vs `pictures/thumbs/X.webp`, and three table art files). This blocks even a dev upload | RC-00 / RC-04 | Art + UI |
| 2 | No store page on any channel: no `storepage.yaml` (the art in `.gemarcade/hero` and `borders` is ready), no `media.preview` tile loop, no portrait-only declaration. The Arcade page calls the game "picturesolitaire" | RC-03 | store page |
| 3 | No build on any channel (after 1) | RC-04 | publish |
| 4 | The checker and config v8 are on dev only; test and release have neither | RC-11 | Server |
| 5 | Game text in 1 of 12 Arcade locales (en). Missing: de, es, fr, it, ja, ko, pl, pt-BR, ru, tr, zh-Hans. Store copy 0 of 12. Config display names are English. Translating waits for the release promotion (AGENTS.md) | LANG / LOC-* | UI (localization) |
| 6 | No analytics: no `gem.analytics.track` anywhere, and no `analytics_events` or `analytics_funnels` in the config (tutorial done, level won and quit, daily played, first-session funnel) | AN-01..03 | UI / Server |
| 7 | Campaign progress (boards unlocked, pictures restored, challenge bests, guide step) is written by the client to the cloud save. Coins, the table and the daily board are the server's: tampering can reorder boards and fill albums, but cannot mint Coins. The checklist counts client-written progress as a P1. Whether the checker should own progress, or the creator accepts the risk, is a decision | DATA-02 | decision: lead/creator |
| 8 | The content-policy review was not run in this dry run. Nothing concerning was seen in play (the 40 pictures are flowers, food, landscapes, people and travel scenes) | POLICY-01 | QA at release |

Advisory, not blocking:
- SDK 15.2.0 to 15.3.0 (doctor `sdk.upgrade`): adds `colorHelp`, and a recompile is enough.
- Coins per hour: 390 to 780 at 2 to 4 minutes a board (docs/coins.md), in range. Earning ends
  once the 50 boards are done, leaving only the daily's 50 a day.
- Pictures, audio and art keep unhashed names in `public/`, so they are revalidated rather
  than cached for good.
- First play in the dev host page: bridge at about 2.0 s, game engaged at about 4.6 s. The
  boot chunk is small and `main` is 353 KB.
- Not tested: a real phone (10 minutes for heat) and a TV (not claimed).

Passing:
- **SDK:** `project doctor`'s rows are all ok, including mute both ways, moments,
  long-press, no browser storage, minified build, legal header, no source maps and no
  secrets.
- **Settings (SET-01..03):** the settings button sits top-right on every screen, and mute
  silences everything.
- **PLAT-INFO-01:** no Credits or Privacy screen.
- **Player data (DATA-01/03/04):** the cloud save is authoritative across a restart, and
  every Coin is paid after the server's replay.
- **Checker speed (RC-09):** every call ok, at most 163 ms.
- **Economy:** the game draws no balances and grants no Gems.
