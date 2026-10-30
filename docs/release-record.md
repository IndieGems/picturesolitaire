# Release record

What people have checked or decided for the first public release, so the
release checklist can record it as attested rather than untested. The
checklist's own reports go to `release-readiness/` (not committed).

## Attestations

| Date | Who | What |
| --- | --- | --- |
| 2026-10-29 | the creator | Both music beds (`audio/bed-day.mp3`, the sunny default, and `audio/bed.mp3`, Winter Dusk's) have no sung or spoken words. The creator heard both in Sound Tuning on 2026-10-28. (GSR-008, item 1) |
| 2026-10-29 | the creator | All six soundtracks have no words (second review). Paris Café was then remade as a vibraphone waltz, Take B, picked by the creator in Sound Tuning (3440890); the creator confirmed the new track has no words either. |

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

## From the second release review (GSR-2026-10-29-c9c2218: NO-GO, 5 blockers, no product defect)

- GSR-013: SDK 16.1.0 (a56cd1e), types only. 16.2.0 and later change save refusals, so they wait for after the release candidate (`TODO.md`).
- GSR-008, the translated names and titles: **QA's content pass**, 2026-10-29, at e835606. QA read all 20,372 strings of `locales/names-*.json` and `titles-*.json` (1,852 per locale, in de, es, fr, it, ja, ko, pl, pt-BR, ru, tr and zh-Hans), line by line against the English, with four readers. A script also checked every string for missing or empty entries, broken characters and the wrong script, and 52 titles with two-meaning English words were checked against their pictures. Found:
  - one wrong meaning, the toy Red Kite named as the bird in 10 languages;
  - 18 possible double meanings or misreadings, among them zh 大香蕉 and 奥特曼, ru Сосати, ko 벙어리장갑 and 난쟁이, ja ホットサイダー, pt-BR Perereca, and es Conchas;
  - one English word left in German.
  UI fixed 26 strings in 0c26f3e; three standard words with a faint second meaning stay (es Papaya, pl Samochodzik na pedały, de Blasloch). A native read is still owed at release (`TODO.md`).
- GSR-007: the creator chose to put the release build (`npm run build:release`, no dev menu) on dev now, so the phone and new-player checks play what ships. On dev: web build 0.65.0 (3440890, all 517 boards proved afresh), store page 14, config 45, checker 0.1.34.
- On test (the creator, 2026-10-30): checker 0.1.34, config 45, store page 14, then web build 0.65.0, in that order. Test is listed; release serves nothing.
- After the second review (2026-10-30): **achievements**, 22 with six avatar icons, the unlock card, and the Passport's Achievements tab (`docs/achievements.md`). Dev has build 0.67.0 (2967aa6), config 48 and checker 0.1.35; test still has the candidate without them. Nothing unlocks before release, so the release review re-checks this feature.
- GSR-018: the creator bought a soundtrack on dev; cosmetic_bought was counted, and the cosmetics funnel reached every step (the release reviewer read it).
- Russian "монет" for Coins is correct: it is only ever read after a price. A price ending in 1, or in 2–4 outside 11–14, would need another form.

## Still owed by people, not agents

- **Pictures at full size** (GSR-008, item 2): the review saw all 1,683 unique pictures at thumbnail size and found nothing near the content bar. A full-size pass, or the checklist reading the picture packs, is still owed. The rights pass in `TODO.md` covers the same pictures.
- **Physical phones** (GSR-009): one iPhone (Safari and the Gem Arcade app) and one Android phone, using the device sheet in the review.
- **Fresh players** (GSR-010): two or three people new to the game, the first ten minutes on their own phones, with no help.
