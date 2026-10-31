# Memory and crash check, 2026-10-30 (QA)

Code tested: main at fe773f59 (UI's 53865f31 and later, the same code as dev 0.80.0). It was a milestone pass at the
lead's request: one focused soak, not a replay of every level.

## Verdict

- **Leaks found: yes, one slow one.** Every real win card from level 3 on stays in memory for the rest of the
  session, about one card a level, pictures included. Nothing else climbs: the heap levels off, sound nodes and
  object URLs are released, and the pack cache evicts as designed.
- **Crashes found: no new crash, hang or error in play** (59 levels won over three runs: 0 uncaught errors, 0
  unhandled rejections, 0 stuck screens). One bug turned up along the way, not a crash: **the event page's item pictures break
  for the rest of the session once about six levels have been opened**.
- **One crash from the log is still open:** "board 16 is not loaded yet" (once, 28 Oct, at a Play's start-up). It
  did not reproduce on main, and the code that throws it is unchanged since, so it remains a live risk.

## Findings

| # | Finding | How bad | Evidence | Owner |
|---|---|---|---|---|
| 1 | **Every real win card stays in memory.** The card's Challenge/Share row listens for the friends list and stops listening only when the list is next read. In the Arcade that happens only when the player comes back from a pause or opens the challenge sheet, and never where challenges are not offered. A player with no friends who plays on keeps every card. | About 1 card a level (~30 page elements, ~12 pictures and ~9 listeners each). JS heap: under 0.05 MB a level. Renderer memory: +1.8 MB a level in the dev soak, against flat in the practice run, which has no such row. 100 levels ≈ +150–200 MB. | Heap snapshots at levels 10 and 37: `friendsHeard` held 7 listeners, then 30; detached elements 210, then 882. Retainer: `friendsHeard` (src/net/friends.ts) → the closure from `onFriendState` in `socialRow` (src/ui/friend-cards.ts ~227) → `say` → the whole old card (`.gallery`, `button.pic`, `img`). Listeners on home: 159 at start, 616 after 37 levels. | **UI** (friend-cards.ts: unsubscribe when the card closes, not only on the next read) |
| 2 | **Event page item pictures break after ~6 levels.** In a build, the pack cache lets go of an event's item pictures like an old board's (it keeps the newest 6 boards and every trip, but suitcases are not exempt). `ensureSuitcase` then never reads them again, because it remembers them as loaded. The suitcase slots show broken pictures for the rest of the session. | Every time, after 7 levels opened (built game). All 10 item pictures go to plain paths, which 404. 150 console 404s in the 21-level built soak. | Built run: first visit 11 blob pictures, 0 broken; after 7 levels 10 broken (`/pictures/items/item-2026-11-0N-cutout.webp`); the same on the next visit. Screenshots sent to the creator (before/after). src/packs.ts `remember()` `going()` exempts only `trip:` owners; `ensureSuitcase()` returns early on `suitcasesIn`. | **UI** (src/packs.ts, by its history; Art for the packs themselves) |
| 3 | **Start-up crash "board 16 is not loaded yet"** (game log). Something read board 16 before its trip had loaded, about 2 s after the play token: an uncaught error. | Once in 157 logged sessions (28 Oct 19:42, a Play of build `app-DMPkeR92.js`). Not reproduced. | Repro on main: the progress record landing at boards 16, 31 and 61 after home is drawn, then Play: no error; the level opens. The throwing reads (`level()` via `levelOfPlay`, `bannersFor`, `drawPill`, the win handler in app.ts) are the same call sites as at 43c7b45c. The log keeps one stack frame only. | **UI** (app.ts; a guard at those reads, or the full stack from a source-mapped build next time it fires) |
| 4 | The helper prices read fails with a TypeError (`"" is not a usable path segment`) when the bridge token is refused. | Once (28 Oct 20:05, the session whose token was refused 5 times). Caught and warned, not a crash; prices stay unknown for that session. | Game log, `[helpers] the prices could not be read`. | Server (net code; possibly the SDK's `gameConfig.load` with no identity) |
| 5 | Not a bug: a tap within 300 ms of a screen change is dropped (the ghost-tap guard). After ten quick open/close cycles of the enlarged view, Next tapped 150 ms later did nothing; tapped again, it worked. | By design; noted because it stopped my script once. | src/ui/browser.ts `GHOST_MS`; repro: the first tap was dropped, the second opened level 3. | none |

### From the evidence we already had

- **Player reports:** 0 for this game, on any date (`gemctl feedback list`, two calls).
- **Game log** (`.gem/log/console.jsonl`, 23–30 Oct, 2,146 lines, 157 sessions; the Editor's Play and agents'
  hosts only: the Pit plays from the Arcade on the creator's phone, and its console never reaches this machine's
  log):

| Entry | Count | Newest | Live? |
|---|---|---|---|
| Uncaught: `[levels] board 16 is not loaded yet` | 1 | 28 Oct 19:42 | possibly (finding 3) |
| Save storm: `[in-hand] … save did not finish within 10000ms` | 211 | 29 Oct 15:18 | no: the 29 Oct throttling, fixed by src/net/pace.ts and the 3-minute resume save; none since |
| `rate_limited` (in-hand upload and save) | 13 | 29 Oct 15:10 | no (the same storm) |
| `[claims] could not keep the unanswered claims` (timeouts) | 3 | 29 Oct 14:26 | no (the same storm) |
| Save CORS failure (`payload could not reach storage`) | 1 | 29 Oct 14:04 | no (the same storm) |
| A refused bridge token, then auth timeouts on every read | 1 session | 28 Oct 20:05 | handled: each read warns and backs off |
| `[helpers] prices … TypeError` | 1 | 28 Oct 20:05 | yes, low (finding 4) |
| `[keepsake] … not_found`, `[cosmetics] … insufficient_funds`, `[claims] … refused` | 7 | 30 Oct 00:42 | expected answers, not errors |

The paper-balloon win-card picture (fixed in 53865f31) left no line in this log.

## The soak

Three runs, one hidden Chrome at a time, on the GPU (RTX 4070 SUPER, D3D11), at below-normal priority, 390×844 at
2× with touch. A forced GC came before every checkpoint.

1. **Dev server** (the play-test tool with the dev hooks), 37 levels in one page, as a real player (not practice):
   - **the guided start replay**; levels 2–30 through the win card's Next (level 14 skipped, see finding 5);
   - **a Souvenir, the daily and an event level** (Ski Trip, from the stand-in events as of 5 Nov);
   - **the big boards and revisits:** 60 (6×6), 1, 10 (5×5), 11 (long pictures) and 45 (5×5);
   - **the enlarged view** opened and closed 2–3 times on each win card, and 10 times quickly on level 13;
   - **two tours:** Passport (pages and tabs), Achievements (a mix, then as the platform says), the Daily page and
     its calendar, and the event page and its past events, each twice;
   - **12 hides**, mid-deal, mid-clear, mid-postcard and mid-win, plus on home;
   - **stress:** a double-tapped Next, Back 120 ms after Next, and Home as the win card arrived.
2. **The built game**: a clean build of fe773f59 in a temp folder, served as static files with HTTP Range, so the
   picture packs, their blob URLs and their eviction run as on the platform. 21 levels through the dev menu, in
   practice:
   - the guided start, then 2–12;
   - revisits of 1 (twice), 10, 11 and 2, the big boards 30 and 60, plus the event and the daily;
   - the enlarged view 2–10 times on each card, two tours and 5 hides.
   - Then a targeted check of the event page before and after 7 levels (finding 2).
3. **Cosmetics**: 12 table changes and 12 soundtrack changes as a VIP, with 4 hides on the screen; then the
   ghost-tap repro.

### What was measured

Dev run, at the checkpoints (each on a win card, except start and end, which are on home):

| | start | L5 | L10 | L15 | L20 | L25 | L30 | L35 | end (37) |
|---|---|---|---|---|---|---|---|---|---|
| JS heap used (MB) | 6.8 | 8.5 | 8.9 | 14.2 | 14.3 | 14.5 | 14.5 | 15.1 | 15.1 |
| DOM nodes | 640 | 1,740 | 2,015 | 3,237 | 3,546 | 3,743 | 4,038 | 3,323 | 3,572 |
| JS event listeners | 159 | 331 | 379 | 522 | 584 | 641 | 714 | 587 | 616 |
| Documents / frames | 7/6 | 15/14 | 15/14 | 18/17 | 18/17 | 18/17 | 18/17 | 19/18 | 19/18 |
| Audio nodes alive (made) | 10 (10) | 12 (1.4k) | 12 (3.3k) | 12 (5.2k) | 12 (7.4k) | 12 (9.8k) | 12 (12.7k) | 14 (15.1k) | 14 (16.1k) |
| Renderer private (MB) | 176 | 177 | 182 | 209 | 211 | 215 | 218 | 224 | 230 |
| GPU process private (MB) | 151 | 212 | 228 | 220 | 271 | 248 | 251 | 240 | 212 |

Built run (practice: no Challenge/Share row on its cards):

| | start | L5 | L10 | L15 | L20 | end (21) |
|---|---|---|---|---|---|---|
| JS heap used (MB) | 3.3 | 4.6 | 6.7 | 6.6 | 7.2 | 7.1 |
| DOM nodes / listeners | 1,475 / 312 | 1,627 / 324 | 2,634 / 416 | 2,662 / 417 | 2,738 / 427 | 2,823 / 409 |
| Blob URLs alive (MB), made / revoked | 16 (0.4), 16/0 | 56 (3.1), 56/0 | 82 (4.5), 138/56 | 82 (4.2), 167/85 | 80 (4.2), 255/175 | 77 (4.3), 271/194 |
| Renderer / GPU private (MB) | 159 / 159 | 167 / 237 | 177 / 247 | 172 / 243 | 181 / 239 | 176 / 206 |

- **The heap's rise to level 15 is one-off:** level data loaded once and kept (the event levels, the Souvenirs and
  the daily: the heap diff's new objects are rooted in `eventLevels`), plus each screen built on its first visit.
  After that it is flat: +0.9 MB over 22 levels.
- **Documents and frames stop at 19/18.** These are the SVG pictures' own documents; they level off.
- **Sound:** one AudioContext the whole session. 16,000 nodes made and only 12–14 alive, so every played sound is
  released. No `<audio>` elements. 24 table and soundtrack changes: heap +0.5 MB, listeners flat at 170, sound nodes
  flat at 12.
- **Object URLs (built):** they level off at about 80 (4.2–4.5 MB) while 271 were made, so eviction works. Revisited
  boards (level 1 after 11 and then 8 other levels) drew every picture from fresh blobs, and their win cards and
  enlarged views decoded every picture. The 53865f31 fix holds.
- **Timers:** one interval only (vite's own). ResizeObservers 28 → 35 over 37 levels in the dev run, flat in the
  built one; small, and probably the retained cards of finding 1.
- **Hidden (21 times):** 0 animation frames while hidden every time, the AudioContext suspended and resumed on
  show, and at most 2 timers fired in 3 s. Each board resumed and finished after its hide: no stuck or broken board.
- **At rest:** a still board asked for 0 frames in 3 s, and home 0 in 3 s, in both the dev and built runs.
- **Platform retries with no platform (the play-test frame):** the progress, guide, claims and daily reads back off
  2 → 4 → 8 → 18 → 34 → 57 → 131 s. Paced, no storm.
- **Stress:** a double-tapped Next opened one level. Back 120 ms after Next and Home as the win card arrived both
  went home cleanly. A level opened afterwards played normally.

**Peak memory** (desktop Chrome, so a guide, not a phone figure): JS heap 15.1 MB; renderer 230 MB private and
385 MB working set (dev, still rising because of finding 1); built-game renderer 181 MB; GPU process up to 271 MB;
the whole browser up to 582 MB.

## Not tested

- **Real phones:** they stay a person's check on the release list.
- **The Arcade frame's own pause** (`gem.onPause`): only the page's visibility was simulated.
- **The friends list arriving** (no platform here), so finding 1's leak is shown for the no-read case. With
  friends, the first read clears the cards that were waiting.
- **The soundtrack preview ("Listen")**: my selector missed it. Using a track was tested.
- **The real CDN**, and a Souvenir in the built game.

## What I'd want watched on a phone

1. **A long session in the Arcade app on an iPhone and a mid-range Android:** 40+ levels without leaving. Watch for
   the game reloading itself (the OS killing a tab short of memory) and for slowing late in the session. Finding 1
   makes this worse the longer they play.
2. **The event page after six or more levels** (finding 2): it shows on every phone, every time.
3. **Ten minutes on a 6×6 level and the enlarged view:** warm, not hot, and as smooth at minute ten as at minute one.

## Method, in one line

`tools/playtest.mts` driven over CDP: HeapProfiler.collectGarbage, Performance.getMetrics, Memory.getDOMCounters,
WebAudio node events, a preload hooking createObjectURL/revokeObjectURL, timers and observers, OS private bytes per
Chrome process, and two heap snapshots diffed for detached DOM and retainer paths. The scripts, snapshots and the
clean build lived in a temp folder and are deleted.

## Re-check on 0.81.0 (f6e982a5, the dev build), 2026-10-30

**Findings 1 and 2: fixed.** One built soak in one page with no reload, of the main tree's dist (the dev menu's
Build line: commit f6e982a5), served read-only by the play-test tool. 15 levels won:
- **7 real dailies**, played by touch from their stored moves; each card has the Challenge/Share row, which is
  finding 1's path. The dev menu's levels are practice and have no row.
- **7 campaign levels in practice** (2–8), which make the pack cache let go.
- **1 past event's level** (Haunted Holiday 1, from the stand-in events as of 5 Nov).
- **The event page three times:** early, after 10 levels (8 other boards since the first visit) and at the end.

| | L5 | L10 | L15 | Before the fix |
|---|---|---|---|---|
| Real win cards so far | 2 | 4 | 7 | |
| Detached DOM (heap snapshot) | 44 | | 22 (−2 a level) | +25 a level |
| DOM nodes / listeners | 2,037 / 370 | 2,037 / 370 | 2,013 / 367 | +40 / +9 a level |
| Renderer private (MB) | 170.1 | 185.2 | 185.4 (+0.04 a level after L10) | +1.8 a level |
| JS heap (MB) | 6.0 | 6.2 | 6.4 | |
| Blob URLs alive (made / revoked) | 74 (74/0) | 79 (105/26) | 79 (131/52) | |

- **Renderer memory:** its rise to level 10 is the picture cache warming. The earlier practice run, which had no
  rows, rose the same way, then went flat.
- **Detached elements left at the end:** only the last board's stacks, held through the board in hand (bounded).
  No old win card is held.
- **Event page:** 15 pictures shown each time (11 from the event's pack), **0 broken, 0 404s**, on all three
  visits.
- **Console:** 0 errors, 0 unhandled rejections, 0 page errors. Every card picture decoded on all 15 win cards.

The scripts, snapshots and served config were in a temp folder and are deleted. The main tree's dist was only read.
