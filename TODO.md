# What is still owed

- **Before 30 Jun 2027: extend the daily puzzle** (it now runs to 2027-06-30). Levels
  runs `make-daily.mts` for the new months, then Server rebuilds the checker.
- **The monthly event, after release** (on hold, creator 2026-10-29): it may return for
  the Gem Arcade's VIP members. The platform now says who holds VIP (SDK 19 `gem.me.passes`, read by checker 0.1.47, 2026-11-01). Then: the switch back on behind
  the VIP check, each month's suitcase art a month ahead (Art; none is made while it is
  held), and a framed check of the first live suitcase.
- **VIP, before release:** the holder's side is untested live (no test account holds VIP; a real one costs $6.99, or the platform's support can grant one to the QA account with the creator's OK). (The "free" question went with the Cosmetics banner, off since 2026-11-02; ask the platform before the VIP Cosmetics switch comes back on.)
- **After the VIP gifts (703b1090), small:** Gameplay drops the unused `vipRest*Ms` values in `src/board/tuning.ts`; Audio may give the welcome card a cue of its own (it uses the shared milestone cue) and the daily gift card a small chime (silent now). Ask the creator whether event prizes should now pay helpers (docs/vip.md perk 3 says none, because "helpers mean nothing to a VIP", which stopped being true).
- **Gem bundles, before release: a tester's check** (the creator, 2026-11-01: skipped for now, "a tester will test this later"). Buy bundles from the game's Bundles row (the Arcade's sheet opens, the stock lands), then confirm a bundle that would pass the 20 cap is refused WHOLE by the platform, with no Gems taken and no part granted. The platform's docs don't promise the three grants land together; the game's fit check hides such bundles, so only a stale stock read could reach it. Agents here can't create a test account (refused as a shared-resource change), and "Picture Passport QA"'s sign-in is spent.
- **Stalled loads, the rest** (UI, 7ef5f668, after QA saw a first fetch never answer in 2 of 10 loads): our own files go through `src/ui/own-file.ts` (time limits, retries, "Couldn't load" with Try again). Still without it: Gameplay's level loads (`loadTrip`, `loadDaily`, the events' boards, build chunks the browser imports itself: a hung first import rejoins on Try again; a retry would re-import with a fresh query) and Audio's fetches in `src/audio/engine.ts` (not on the way to a board; can use own-file.ts). Also plain pictures the browser fetches itself (`<img>`, CSS backgrounds such as `/art/cosmetics-tile.webp`, QA 2026-11-01): a stalled one stays blank until the next load; low, a retry on `error` or a load timeout would do.
- **Tell the platform: bundle names are English only** (Server, config 59, 2026-11-02): an item's or recipe's `display_name` takes no `localized` map, so if the Arcade's purchase sheet or receipts show a bundle's name (Starter Kit, Small/Medium/Large Bundle) it is English in every language. Check the sheet on a buyer's account when the bundle purchase is tested.
- **Tell the platform (SDK 16.1.0):** `gem.gameConfig.load()` before an identity exists builds `/v1/games//config/...` and throws `TypeError: "" is not a usable path segment` instead of a typed refusal (`unavailable`). Our reads now wait for an identity (Server, 08000ca9); the SDK should still answer with a GemApiError. Check whether 19.0.0 (the game's pin since 2026-11-01) fixed it before filing.
- **Build size:** 0.93.0 is 563 MB of the 1 GiB limit (877 of 2,000 files), and an upload takes ~8 minutes. 1,199 board copies sit in more than one pack (most in 5: the trips, the dailies' weeks and the VIP event levels share pictures), ~218 MB of repeats; full pictures are stored once. The creator, 2026-11-02: leave it for now. Before more trips, events or months: board copies stored once in shared chunks read by Range (~200 MB less; a board's first load becomes several reads, check on a phone), or a month's dailies shipped only near their month (~100 MB less, a build each month).

## The travelogue (2026-10-25)

- **Trip 11 and on.** Ten trips ship (boards 1–150, to the UK & Ireland); New Zealand is in reserve. The creator picks where. Their pictures come first from the clear pictures the atmospheric swap takes out of boards 1–150 (creator, 2026-10-28; Levels keeps the list), then new ones. Art's cap is $105 (creator, 2026-10-30, for ~200 new clean pictures for the upcoming VIP events, after the library ran out of unseen ones; $90 earlier the same day for the redraw passes), with about $78.39 spent by 2026-10-30. Later trips grow through 5×5 and 6×6 boards, within the readable and careful-player rules (`docs/difficulty-curve.md`).
- **The challenge route and daily** still deal some landmark pictures (`"landmark": true`). Swap them out when those are redone under the new picture rules.
- **The old albums' code** is unreachable from home; remove it, and the albums' catalogue fields, when the passport has settled.

## From the Untangled review (2026-10-25)

Untangled (`IndieGems/yarn`, cloned beside this game) is the standard's
reference game. In hand now: the settings mirror (`gem.settings.declare`,
UI), cards as keyboard dialogs (UI), held wins trimmed in order
(`src/net/claims.ts`, Server), pictures at the size drawn (Art, Gameplay, UI).
Still owed:

- **Before release: the people's checks** in `docs/release-record.md` (an
  iPhone and an Android phone, two or three fresh players, the pictures at full
  size), then re-run the release checklist (first review: NO-GO, 2026-10-29).
- **After launch, from the numbers** (shop, purchase and daily events and the
  buying and first-session funnels since 2026-10-29): Levels re-deals a level
  one picture lighter past ~2 tries (hard 3, super hard 5).
- **At release, the languages** (all 12 since 2026-10-29): bring each up to
  date with what changed since; a native read of what the translators flagged
  (ko/zh place spellings, "Arcade" per language, the postcard greetings, Russian
  Coins wording) and of
  the long Super hard badge in pl, fr and it. Also the 190 new picture titles (UI, baa4e037): pl Archeolożka and Geolożka; poutine in ru and ko (worded away from Putin); zh dish and boat names described rather than transliterated (croque monsieur, khachapuri, gulab jamun, halva, basket boat, coracle, lowrider); ko transliterations (beignet, semla, suya, gulab jamun, manakish); ja シンクロ, 振り子時計, 椅子かご; tr Shakshuka (şakşuka is another dish), Pabuçgagalı, Yol koşucusu; it Madonnaro.
  Also the 2026-11-02 pass (UI, e39e8fcd: the bundles, the VIP gifts, the VIP badge and boarding pass, the archive list, the stamps' outlines): **the word for Gems must match the Arcade's own** in each language (ours: de Edelsteine, es/pt-BR Gemas, fr Gemmes, it Gemme, ja ジェム, ko 젬, pl klejnoty, ru самоцветы, tr Mücevher, zh 宝石; ask the platform, the glossary has no Gems row); "Gem Arcade" kept in Latin script in ja/ko/zh beside アーケード/아케이드 elsewhere; the pass's playful lines ("Get VIP: board now!", "You!", "Valid in: All of Gem Arcade", which must not read as the Arcade's perks); zh 礼包 for bundles; ru "Отмен уже был максимум." and siblings; the thank-you lines' tone (ru, pl, pt-BR "Valeu", ja); bundle names (fr Lot / Kit de départ, tr Başlangıç Seti); de "Event".
- **At release: a rights pass on the pictures** (creator, 2026-10-28; QA and Art, about half an hour):
  - flag any generated picture with lettering or logo-like marks (team jerseys, signs, rinds);
  - reverse-image-search the most iconic-looking pictures for near-copies of famous photos or characters;
  - confirm the image tool's terms allow commercial use (ask the platform);
  - check whether Gem Arcade asks for an AI-art disclosure on the store page;
  - re-read the postcards' borderline notes (Japan's temples and shrines, Dog Bark Park, Paul Bunyan, the Big Banana's name) and the Souvenirs' museum credits (`docs/credits.md`).
  Record the result in `docs/credits.md`.
- **At release: check the first load on the real server** (QA, 2026-10-28): signed in on Dev, DevTools → Network: the scripts come compressed (`content-encoding`), a second visit answers from cache (304s), and the enlarged view's chunk reads use Range. The local host can't show any of these. On 4G, home took ~4.4 s and ~1.05 MB from the frame starting (0.51.0).
- **Effects on WebGL, the next time they are worked on** (the standard,
  2026-10-25; QA's second pass, 2026-10-26): the milestone fireworks (a 2D
  canvas on the page's thread, UI) and the finished picture's twinkles (page
  elements, Gameplay) move to one WebGL layer drawn from its own worker. Jade
  Hands' fx layer is the model. The weather's CSS sprites can stay.

- **The challenge route and the daily under the new picture rules** (after
  campaign boards 14–26 and the creator's review): today they mix long and
  square pictures and use the older, busier pictures. Levels counts the
  pictures needed; the batch is the creator's call.
- **The upload's 2,000-file cap, before the library passes ~450 pictures.**
  Every picture ships three files (full, board copy, thumb): 290 pictures are
  870 files on 2026-10-25. Ship only pictures a shipped board or album uses,
  and/or drop the thumb or pack thumbs into sheets, before a batch would
  push the build past the cap (`gemctl build upload --dry-run` counts it).
