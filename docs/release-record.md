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
- After the second review (2026-10-30): **achievements**, 22 with six avatar icons, the unlock card, and the Passport's Achievements tab (`docs/achievements.md`). Dev and test (the creator, 2026-10-30) have build 0.67.0 (2967aa6), config 48, checker 0.1.35 and store page 14; the points budget is still unspent (0 of 1,000). Nothing unlocks before release, so the release review re-checks this feature.
- 2026-10-30: dev went back to a plain build with the dev menu (0.68.0, f65934f: the VIP perks behind their switch, Haunted Holiday, settings in the Gem menu, the Arcade's wallet; config 50, checker 0.1.37, store page 15), so the creator can try VIP with Pretend I'm VIP. Test keeps the release candidate 0.67.0 for the phone and new-player checks; a new candidate goes to test only on the creator's word.
- 2026-10-30 (late): on the creator's word, test has the new release candidate: 0.83.0, a release build (`build:release`, no dev menu, all 697 boards proved afresh) of 42017bf3, the same code as dev's 0.82.0, with checker 0.1.46, config 55 and store page 16, promoted in that order. It carries QA's memory and crash fixes (f6e982a5, re-checked on 0.81.0: 806525ec), the creator's flags mended (8674455e), the Daily page, Cosmetics rows and navy Back, and the 190 new picture titles in all 11 languages. The people's checks below are owed on this candidate.
- 2026-11-01: on the creator's word, test has 0.85.0, VIP live: a release build (no dev menu, all 697 proved afresh) of 798056aa on Gem Web SDK 19.0.0, with checker 0.1.47 (reads the platform's `vip` pass), config 55 and store page 16; dev has 0.84.0, the plain build of 9965c2e1 (the same code but Gameplay's needsLoad tidy-up). It carries Get VIP on the Arcade's own sheet, doors that follow the server's word, a lapsed VIP's stamps, and SDK 16.2's save rules in every save. Not in it, following in the next build: QA's two fixes (the event door's entry when VIP arrives, a stalled first fetch stranding "Opening…") and the red Back. QA's two-tab save check was still running at promotion. The VIP holder's side is untested live.
- 2026-11-01 (later): test has 0.87.0, a release build of 2e3a999b (VIP live plus QA's two fixes, 7ef5f668, and the red Back, 2e3a999b), with checker 0.1.47, config 55 and store page 16; dev has 0.86.0, its plain build. QA's two-tab save check passed on 798056aa: "Carry on?" keeps the board touched last, a win pays once, a helper spend counts once, no retry loops. Found: the Undo lesson's free Undo can carry to another board (UI). The Gem bundles (config 56, cap 20) are not on test.
- 2026-11-01 (evening): on the creator's word, test has 0.90.0, a release build of 89032685 (all 697 proved afresh), with config 56 (the Gem bundles, helper cap 20), checker 0.1.47 and store page 16, promoted config first; dev has 0.89.0, its plain build. New since 0.87.0: the Gem bundles of helpers (fe64bc82, 12d4fc89, Art 3bfbc855), 3 tries for our own files (23514f53), a lesson's free use kept to its own board (89032685). Owed by a tester: a real bundle purchase, and that a bundle passing the cap is refused whole with no Gems taken (TODO.md).
- 2026-11-01 (night): on the creator's word, test has 0.92.0, a release build of 703b1090 (all 697 proved afresh), with checker 0.1.48, config 57 and store page 16, promoted in that order; dev has 0.91.0, its plain build. New: VIP's helpers are spent like anyone's, and VIP gives a daily gift of 2 helpers and a welcome of 8 once a membership instead (the creator, after Jade Match; d115d235, 703b1090). The checker's not-VIP path was checked live on dev (nothing paid); QA's Pretend VIP check of the gifts was still running at promotion.
- 2026-11-01 (night, later): QA found a reopened session would re-list the day's gift with nothing landed (a "full" card); the platform answers a reused order key with an empty success, not a 409. Server's fix, 42b47cb6 (day mark `vip_gift_day`, a reused key told by its empty receipt): checker 0.1.49 with config 58, promoted to test config first, no new build. Live on dev: a second ask and a fresh session list nothing.
- 2026-11-02: dev has 0.93.0, the plain build of c505fd67: VIP no longer lends every table and soundtrack (the creator; UI fe7b1ed5, kept behind `VIP_WEARS_ALL`, off). On the creator's word the same day, test has 0.94.0, its release build (no dev menu, all 697 proved afresh), with checker 0.1.49, config 58 and store page 16 unchanged.
- 2026-11-02 (afternoon): on the creator's word, dev has 0.95.0 (plain) and test 0.96.0 (release build, no dev menu, all 697 proved afresh) of b63470e1, with checker 0.1.49, config 58 and store page 16 unchanged. New: home's VIP badge and the VIP boarding pass (e9e325a3, cc6a2e42, perks best first fbc37a5a), the event door's archived events (64fcf0c3), the event stamps' outlines for a player without VIP (a32955bb), home whole on a 360x640 phone (38ecf0cd), the edge stops' tags kept inside (2b45851c), and no sample players on the Daily page (b63470e1). New lines are English only until the release's translation.
- 2026-11-02 (evening): on the creator's word, test has 0.97.0, a release build of 66b9bc96 (no dev menu, all 697 proved afresh): everything since the last translation in all 12 languages (UI, e39e8fcd; 72 new lines, i18n check clean, fit measured at 360x640 in all 12), Polish and Russian Coins and Gems forms after a number (66b9bc96), with config 59 (the daily challenge's text in all 12, Server fab29149), checker 0.1.49 and store page 16. Dev keeps 0.95.0 with config 59. The creator held the release review: some of its checks need testers on test. The native read's list is in TODO.md.
- 2026-11-02 (late): on the creator's word, test has 0.98.0, a release build of 35498fa5 (no dev menu, all 697 proved afresh), config 59, checker 0.1.49, store page 16. New since 0.97.0, all in 12 languages: Back as a "← Back" pill returning to its opener (197add4a, 0f57e86c), the Daily page's promoted archive card once today is played and the player's own row from the record (709765ab), VIP shown to members everywhere (c94d3345), the VIP welcome card (35498fa5), Level 1's table note pointing at Cosmetics. Known, fixed in the next build: an item's found moment is skipped when the winning move finishes the item (QA, 2026-11-02; Ski Trip 8, Winter Market 12, Northern Lights 24, Carnival 2, 14, 24). Dev keeps 0.95.0.
- 2026-10-30: a bug found after the candidate. A revisited level's own picture could break on its win card or enlarged view (the pack let it go while on screen), fixed in 53865f31 (dev 0.80.0). Test's 0.67.0 still has it, so the next release candidate must include the fix.
- GSR-018: the creator bought a soundtrack on dev; cosmetic_bought was counted, and the cosmetics funnel reached every step (the release reviewer read it).
- Russian "монет" for Coins is correct: it is only ever read after a price. A price ending in 1, or in 2–4 outside 11–14, would need another form.

## Still owed by people, not agents

- **Pictures at full size** (GSR-008, item 2): the review saw all 1,683 unique pictures at thumbnail size and found nothing near the content bar. A full-size pass, or the checklist reading the picture packs, is still owed. The rights pass in `TODO.md` covers the same pictures.
- **Physical phones** (GSR-009): one iPhone (Safari and the Gem Arcade app) and one Android phone, using the device sheet in the review. Also watch, from QA's memory and crash check (2026-10-30, `docs/qa-memory-crash-2026-10-30.md`): a 40+ level session in the Arcade app on an iPhone and a mid-range Android for a reload or late slowdown; the event page after six or more levels; ten minutes on a 6×6 level for heat and smoothness. The next release candidate also needs UI's fixes for that check's findings 1 and 2 (the win-card listener leak, the event item pictures).
- **Fresh players** (GSR-010): two or three people new to the game, the first ten minutes on their own phones, with no help.
