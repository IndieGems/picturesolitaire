# What is still owed

- **Before 30 Jun 2027: extend the daily puzzle** (it now runs to 2027-06-30). Levels
  runs `make-daily.mts` for the new months, then Server rebuilds the checker.
- **The monthly event, after release** (on hold, creator 2026-10-29): it may return for
  the Gem Arcade's VIP members once that system exists. As of SDK 17.0.0 (2026-10-30), VIP is an Arcade Store pass: a game may show a "Get VIP" button that opens the Arcade's own offer sheet (`gem.store.showOffer`, the SDK's `docs/arcade-and-store.md` §10), but it **cannot tell whether a player holds VIP**, so a VIP-only event waits until the platform exposes that. Then: the switch back on behind
  the VIP check, each month's suitcase art a month ahead (Art; none is made while it is
  held), and a framed check of the first live suitcase.
- **Gem Web SDK 16.2.0 or later, after the release candidate.** The game is on 16.1.0. From 16.2.0, a save write that collides with newer saved data is refused as `save_conflict` unless it passes `overwrite`, a load can fail as `load_failed`, and writes get the SDK's own spacing (`minWriteIntervalMs`). Before the pin moves, Server and Gameplay handle both in every save path, `src/net/pace.ts`'s loops included.
- **When VIP goes live: a lapsed VIP keeps what they earned.** Their event stamps still show on the Passport's Event stamps page and their won tables stay theirs, even though the events themselves lock (Server adds a read of earned stamps that doesn't need VIP; UI shows it).
- **Before the "Get VIP" button goes on** (`VIP_SKU` in `src/ui/vip-view.ts`): move to SDK 17+ and call `gem.store.showOffer`, the Arcade's VIP sheet, not `purchase()`, which goes straight to checkout (gem-development#2119); that upgrade brings 16.2's save changes above. Also ask the platform whether a game may say "free" with VIP (Cosmetics' banner says it, the creator's ask).
- **Build size:** 0.75.0 is 556 MB of the 1 GiB limit (860 of 2,000 files), with six VIP events at about
  13 MB each. Before more trips or months, Art de-duplicates pictures
  that repeat across packs, or ships a month's dailies only near their month.

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
  the long Super hard badge in pl, fr and it.
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
