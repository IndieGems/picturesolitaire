# Release record

What people have checked or decided for the first public release, so the
release checklist can record it as attested rather than untested. The
checklist's own reports go to `release-readiness/` (not committed).

## Attestations

| Date | Who | What |
| --- | --- | --- |
| 2026-10-29 | the creator | Both music beds (`audio/bed-day.mp3`, the sunny default, and `audio/bed.mp3`, Winter Dusk's) have no sung or spoken words. The creator heard both in Sound Tuning on 2026-10-28. (GSR-008, item 1) |

## Decisions from the first release review (GSR-2026-10-29-43c7b45)

- Web address `picture-passport`: gemarcade.com/games/picture-passport (GSR-001, set 2026-10-29).
- Players see "Level", not "Board" (GSR-016).
- Translate now: game text, store copy and friend-challenge lines in all 12 Arcade locales (GSR-002/003/004).
- The Arcade's own turn-upright panel replaces the game's card (GSR-011).

## Fixed and retested on dev (2026-10-29)

Dev: build 0.56.0 (9849bcb, Gem Web SDK 16.0.0), store page 11, config 42, checker 0.1.28.
- GSR-006: a save the player writes never becomes progress (checker 0.1.28). QA PASS: a forged campaign save, then board 1's win, gives next 2.
- GSR-005: shop, purchase and daily events, plus the buying, first-session and daily_try funnels. QA PASS on the "Picture Passport QA" test account: two buys, both counted.
- GSR-017, the cheap part: a time-zone change keeps the day. QA PASS. Crossing midnight was not tested.
- GSR-002/003/004: 12 locales for the game text, the store copy and the friend-challenge lines.
- GSR-011: the game's own rotate card is removed. GSR-016: "Level" everywhere.
- GSR-014: "Carry on?" resumes a level left mid-play. Server PASS live: the level was paid once.
- GSR-013: SDK 16.0.0. The project doctor says ready, with no warnings.

## Still owed by people, not agents

- **Pictures at full size** (GSR-008, item 2): the review saw all 1,683 unique pictures at thumbnail size and found nothing near the content bar. A full-size pass, or the checklist reading the picture packs, is still owed. The rights pass in `TODO.md` covers the same pictures.
- **Physical phones** (GSR-009): one iPhone (Safari and the Gem Arcade app) and one Android phone, using the device sheet in the review.
- **Fresh players** (GSR-010): two or three people new to the game, the first ten minutes on their own phones, with no help.
