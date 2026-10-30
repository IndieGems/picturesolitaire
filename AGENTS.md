# picturesolitaire — agent guide

The instructions for agents in this repository, whichever harness
reads them. `CLAUDE.md` is one line, `@AGENTS.md`, which loads this
file: keep it that way, and keep the single copy of anything
operational here.

## Speaking with the creator

The person you work with is the game's CREATOR: a game designer, not
a programmer. In every update, problem and choice:

- **Plain terms.** Name things by what the creator sees in the game
("the player", "the shop screen", "the camera"), never by file,
function, class or system names.
- **Options come with what-it-means**, one sentence of consequence
each ("faster to try, but the camera may clip the ground"), and
say which you would pick.
- **Updates say what changed in the GAME**, not in the code: "The
round now ends when one racer is left", not the diff.
- Technical detail is one line at the end. The depth goes in commits
and code comments, where the next agent looks.

## Asking the creator

When a decision is the creator's (visual taste, game feel, which
direction), ask: one question at a time, multiple choice, your
recommendation marked. **Ask FIRST, in the first minute or two**,
before building anything, then start on the work common to every
option. They walk away soon after sending a request, so words now
beat pictures later.

- With a question tool (`AskUserQuestion`), use it and write no
files.
- Without one, load the `ask-the-creator` skill and follow it. The
Gem project Editor ships it and keeps it current.
- With neither (an unattended run outside the Editor), use
`.gem/ask.json`. Read it first and wait if it holds someone else's
question. Write
`{"id":"q1","question":"...","timeoutSeconds":300,"options":[{"id":"a","label":"...","recommended":true}]}`
with 2 to 4 options and exactly one recommended; an option's
`image` is a PNG in `.gem/ask/`, by bare filename. Poll
`.gem/ask-answer.json` about every 5s: when its `questionId` is
yours, `optionId` is the answer. Past the timeout, go with your
recommendation and say so. Delete all three when settled.

## Showing the creator

To hand over a render, a screenshot or a capture, load the
`notify-the-creator` skill: it puts the picture in the Editor beside
your tab and keeps it. ⚠️ Do that instead of publishing an artifact
or a hosted link, which sends the creator out of the window they are
in. Outside the Editor there is no such channel: say where the file
is and carry on.

## Serving this project

Run the game through the Gem host (the Editor's Play, or `gemctl
serve`), never directly. Stop any background shell you started
before your turn ends, unless asked not to.

- `npm run dev` is the edit loop (`gemctl serve start . --dev`): vite
with hot reload, framed, and signed in once the project is linked.
- `npm run preview` (`gemctl serve start .`) serves the BUILT output,
so `npm run build` first.
- A host you start ends with your agent session;
`npm run preview -- --keep` leaves it serving (in the Editor on
Windows, until the tab closes).
- Open the link `serve` prints. ⚠️ Never open vite's own address:
unframed, the game has no identity.
- Ports are ASSIGNED by the host, never pinned.
- An unlinked project plays anonymous; `gemctl project bind` links
it to a game when it needs saves, config or rooms.

The `gemctl:serve-local-game` skill has the rest, `gemctl serve log`
(the game's console) included.

## Play-testing

**Test in proportion to the change** (creator, 2026-10-24: be sensible with tokens). Check what the change touches, plus one smoke run of the main loop; never replay every board or every size for a small change. Full passes are for milestones and release, and only when the lead asks.

Play-test with `tools/playtest.mts` (usage in its header): each run gets its
own vite, hidden Chrome and temp folder. Never launch your own browser for a
check it can make, and never stop processes by name, port or pattern.

- It frames vite itself, the one exception to never opening vite's
  address. It has no player and no saves: check those on the page
  `gemctl serve start . --dev` prints.
- Its console is in its own output, not `gemctl serve log`.
- ⚠️ A signed-in check plays as a test guest or test account, never the creator: under `gemctl serve run --as …` never `page.reload()` (the one-load token is spent and the page silently becomes the developer's account, 2026-10-29); open the serve link again, and check the player id before any move. Never attach a `serve run` to the Editor's own host (the creator's Play): one stopped it on 2026-10-30. Use a host of your own, or wait.
- Screenshots go in an OS temp scratch folder; delete it when done.

A script driving its own headless Chromium launches it through
`tools/chromium-gpu.mjs`: `launchOnGpu(chromium)`, or `gpuLaunch()` for the
options. It logs the renderer; `SwiftShader` or `llvmpipe` is the CPU.
Install Playwright in a scratch folder, never in the game.

- **SwiftShader is for pixel-identical comparisons only**
  (`softwareLaunch()`).
- **A wrong-looking GPU render gets one SwiftShader pass**: the same
  picture is a game bug, a different one a real driver artifact.
- **Several GPU browsers share the one card**: keep them to a handful.
- **The machine is shared by every project's task force** (creator, 2026-10-27, after CPU sat at 100%): one CPU-heavy run at a time per session (two processes at most), level and seed searches at below-normal priority, play-test browsers on the GPU and one at a time, and nothing left running in the background after a check.

## ⚠️ Where the build lands is DECLARED, in `package.json`

The Gem tools read `gem.out` (the directory the build writes into)
and `gem.buildScript` (the npm script that builds, needed only when
it is not `build` or `bundle`) from `package.json`. Nothing can infer
either. **If you change where the build writes, change it in the same
edit:** `npm pkg set gem.out=<path, relative to this directory>`.
When it is wrong or missing, the Editor serves the SOURCE and says
nothing is built, and publishing is refused. `gemctl project doctor`
shows what the tools believe.

## Tools of this project's own

This project can register its own tooling (a visualizer, a tuning
panel, an inspector) as two declarations in
`gem-game.json`. `gemctl serve` starts it with the game, with no
Editor needed, and the Editor opens it in the rail. Read
`docs/custom-labs.md` before building tooling that needs a window or
a port.

## The gem CLI (`gemctl`)

`gemctl` is the Gem Arcade backend CLI, built to be driven by agents;
`gemctl --help` shows the command tree. When the harness lists
`gemctl:*` skills, load the one for the task instead of improvising:

- **Account** (`gemctl:gem-auth`): `gemctl auth login` signs in. The
game this project is linked to is `gem.gameId` in `package.json`.
- **Publish** (`gemctl:publish-game`): `npm run build`, then
`gemctl build upload --dir dist --version <v> --platform web` and
`gemctl build promote <v> --channel dev --platform web`.
`gemctl game status` shows what each channel serves. A game appears
in a channel only when BOTH a build and a store page are assigned.
- **Store page** (`gemctl:store-page`): `gemctl store ...`.
- **Player reports** (`gemctl:player-feedback`): `gemctl feedback ...`.

## Translation

Write player-facing text in English, in `locales/en.json`. The game
text, store copy and friend-challenge lines are in all 12 Arcade
locales (creator, 2026-10-29): a new or changed line shows in English
until the next translation. **Translate only when the lead or the
creator asks, or at the `release` promotion**, never for an upload or a
dev or test promote, and only what is new or changed since each locale
was written (`gemctl:localization`; `gemctl:release-checklist` checks
them). At release also dry-run the store copy (`gemctl store upload
--dry-run`), rebuild, and have the creator inspect a translated locale.

## The Gem Web SDK (platform bridge)

`src/gem.ts` joins the platform through the `./sdk` entry of
`@indiegems/gem-web-sdk`: `createGem()` performs the handshake with
whatever frames the game. Wire identity, save data and
rooms/multiplayer through the exported `gem` handle and, where the
installed SDK has `docs/platform-moments.md`, call
`gem.moments.signal({ kind })` from each press leaving a break
(none in the tutorial); the release checklist audits both.

- Unframed it never connects; anything sent before the bridge is
`connected` is dropped silently.
- **The SDK ships inside this game**, as a `dependencies` entry in
`package.json` pinned to one exact version: a bare number, never
a `^`/`~` range. To upgrade, change the number, install, and
commit the lockfile. A project set up before 5.9.0 carries the
published tarball URL instead, and the number replaces it.
- **Nothing about the SDK goes in `index.html`**; a script tag
there would run a second copy that nothing imports.
- The build script runs `gem-sdk-stamp` on the output, so a
published build records its SDK version. Keep that step.
- `src/gem.ts` names no embedders, deliberately: the SDK always
allows the Gem Arcade's website and app. `allowedEmbedders` is
only for a site of this game's own, and adds to those.
- Leaving the game is the Arcade frame's: it draws Return to
Arcade itself, so the game needs no exit control.
- The game's settings are its own: `src/settings-screen.ts`
draws the gear, top-right, and the screen it opens. **Inside the
Arcade the gear goes** (the platform's ask, via the creator,
2026-10-30, as in Untangled): every setting is mirrored into the
Gem menu (`src/menu-settings.ts`), mute and vibration are its quick
row, and the gear hides only while `gem.setMenu` answers true. In a
plain tab or under another embedder it stays. The game asks the Arcade
to draw the player's Gems and Coins (`gem.setWalletVisible`, the
creator, 2026-10-30) and never draws a balance of its own. Each
setting starts from the player's Arcade-wide default
(`gem.prefs.recommended`) until they change it there, and their
choice wins (`src/settings.ts`).

## Where the game keeps what it remembers

⚠️ **Never in the browser's own storage**: no `localStorage`,
`sessionStorage`, IndexedDB or cookies, not even for a volume
level. Every build runs on its own web address, so the next publish
starts it empty, and one build serves every channel it is promoted
to, so a value written while testing on dev is read by the released
game. `src/storage.ts` has the right call for each case:

| the value | where it goes | follows the player? |
| --- | --- | --- |
| volume, quality, a dismissed tip | `gem.deviceSettings` | no |
| difficulty, a level counter, a best score | `gem.me.settings` | yes |
| a world, a run, an inventory snapshot | `gem.me.saves`, in a slot declared in game config | yes |
| currency, items, rewards | `gem.me.inventory` (the `inventory-and-catalogs` skill) | yes |

Whether a reward or a daily is still owed is the platform's answer
(`gem.me.progressions.get`), read each session: never keep a
"claimed" or "reported" flag of your own. `gemctl project doctor`
reports any browser storage it finds in the sources.

## Version control

This repository is plain git — commit early and often. Do not create
a second version-control layer, and do not push unless asked.

## Rulings go here too

Decisions and their reasons (the rulings a reader cannot re-derive
from the code, and the traps that would otherwise be walked into
twice) belong in this file beside the how-to, so there is one copy
and one place to look.

- **Art follows the chosen look, but the game is sunny** (creator, 2026-10-28). `design/concepts/game-l.png` is the reference for the table and the chrome (frosted glass, the button materials, the type): pass it as the reference and draw only the new subject; `style.visual` in `design.json` wins where words and picture disagree. The default table is a bright travel scene in the store art's colours (`.gemarcade/hero/`); game-l.png's snowy desk is the Winter Dusk table.
- **The puzzle pictures are not chrome**: each is a photo or painting in its own medium, never generated from game-l.png, never tinted, filtered or frame-coloured.
- **Pictures are clear, close and varied** (creator, 2026-10-24 on; the detail, references and why are in `docs/picture-direction.md` and `docs/design-notes.md`): one readable subject framed close on a calm ground; **at most one atmospheric picture per level** (not in the Souvenirs); mixed styles and subjects, no look-alike families and no colour-coding on a board; **new pictures lean clean**: flat colour blocks and smooth colour and value transitions, never halftone, screentone, hatching or stipple shading (creator, 2026-10-30, `design/references/ours-ink-halftone-gritty.png`), and little texture; **no new flower-only pictures**; a style and its subject share a culture and period; **people vary** in facing and framing, with many more people of colour, particularly African Americans, and never the AI look (the same tilted head and posed smile); no picture twice on boards 1–13, then none back within ~15 boards (the generator enforces it); a picture ships at the size drawn, and only the enlarged view fetches the full one.
- **Moves never get refused** (creator, 2026-10-23). A move is done whenever the moved piece fits on the board. The cards it covers go to where it came from, shifted back by the move: a merged piece it covers fully moves whole, one it covers partly splits and only the covered part moves. Merges are not stored: cards are joined whenever correct neighbours touch, so pieces split and rejoin by themselves.
- **Gravity is per column and ignores merges**; after a clear, cards fall first, then the stacks refill column by column, left to right (creator's provisional choice; keep the stagger short and tunable).
- **Helpers are the player's own stock** (creator, 2026-10-27): Hint, Undo and Shuffle are Arcade-held game currencies capped at 10, never in the save; earned (3 of each from the guided board, a hard board's first win, a stamp, the daily's first win) or bought with Coins (config prices; packs of 3, also from home's shop). Restart is free, with no lives. Board 2 and the practice after board 3 teach Undo and Shuffle for free. Repeated stuck tries earn an announced free helper (mercy help), never a quietly easier board. Every board stays winnable with no helper.
- **VIP perks, behind one switch** (creator, 2026-10-30, `docs/vip.md`): free helpers with a short rest per button, a daily archive, the two-week event and its archive, and every Cosmetic to wear; non-VIPs see locked doors. The server decides who is VIP (`functions/checker` `vip.rs`, client `src/net/vip.ts`): nobody on test and release until the platform says (gem-development#2119), plus a dev-only Pretend toggle. Ski Lodge and Winter Dusk show only to their owners. The challenge route is off home, its code kept.
- **Cosmetics, a button on home** (creator, 2026-10-29): 4 new tables for sale at 2,000 Coins and 4 trip soundtracks at 500 (tried before buying), on the standard's 500 Coins to a dollar; the player sets the table and the track there, not in Settings, and the music follows the chosen track, not the table. Event tables are never sold.
- **Achievements** (creator, 2026-10-30): 22 platform achievements, six awarding Arcade avatar icons, moved only by the win checker. The points budget is lifetime, so a released achievement never changes: add a new one instead (`docs/achievements.md`).
- **Friend challenges play the same board** (creator, 2026-10-28, after WordSnakes): after any trip board or daily, the win card offers Challenge a friend (the Arcade's inbox) and Share (a link for anyone); the friend plays that board as a one-off to beat the sender's moves, even one they haven't reached (a sneak peek, unlocking nothing). It pays nothing and moves no progress. The design is `docs/friend-challenges.md`.
- **A Souvenir after every trip** (creator, 2026-10-28, after Jigsaw Drop's Specials): an optional bonus board opened by each trip's stamp, themed on that trip, all long pictures, relief difficulty. It's the one exception to the picture rules: one style and one theme, so each picture gets its own bold background colour to stay tellable. Public-domain works only. The design and the copyright rules are in `docs/souvenirs.md`.
- **Cards are seen straight-on** (creator, 2026-10-23): the concept's tilt shrank and softened the top row, which hurts comparing look-alikes. The tilt stays a switch, off.
- **Play is about finding matches, not admiring pictures** (creator, 2026-10-24): a dragged piece follows the finger 1:1, a finished picture leaves fast, and pictures are seen on the win card. The destination's postcard and the event's item are the two deliberate pauses. The table's weather shows on home and the menus only (`src/ui/particles.ts`).
- **A travelogue, "Picture Passport"** (creator, 2026-10-25): trips of 15 boards (`trips.json`), a passport stamp per trip, and on each board one destination postcard (`destinations` in `pictures.json`) whose window is dealt as a picture and unfolds when finished. Postcards, and any real landmark, are **always obviously painted, never photoreal**, described in words and fact-checked, never from someone's photo, and never a sacred or permit-restricted site, modern art, a trademarked sign or a building that licenses its image (`docs/destinations-america.md`). No mystery: its pilot is the branch `mystery-pilot`. **Players read "Level", never "Board"**; code and docs say board.
- **Shuffle is a rescue mix** (creator, 2026-10-23): it mixes the loose cards, and when the board is stuck it swaps in cards from the stacks too, always choosing a mix the solver proves winnable.
- **The creator's phone build is "the Pit"** (2026-10-24): Dev's Latest/Unstable list plays the newest upload, with no promote, on Dev's config, function and saves; the Dev catalog plays the build last promoted there. Keep a store page on Dev, or the Pit's tile sticks loading.
- **A release is built with `npm run build:release`**, never `npm run build`: the plain build carries the creator's dev menu (shown only on the dev channel, every board in it practice: no claim, no Coins, no progress), and `build:release` drops it at build time and fails if any of it is left (`tools/no-dev-menu.mjs`).
- **The store page declares the game portrait-only**, so a PC or TV letterboxes it with the `portrait_borders` art. A phone held sideways gets the Arcade's own turn-upright panel, with no sideways layout and no card of the game's (creator, 2026-10-29), and home waits (capped) to appear whole.
- **The board is flat and fills the width** (creator, 2026-10-29, after Jigsaw Drop's 6×6): cards are the picture with a hairline light edge and small corners, no frosted frame, lip or shadow; gaps and side margins close as columns grow (4 px to 2 px); joined pieces read as one picture; the board sits centred on a calm panel in the table's colour. The stacks' cards stay smaller than a column card (80%, never full) so face-up cards don't look grabbable (`src/board/tuning.ts`). The win card, passport and postcard keep thin pale frosted frames, overriding "thick" in `style.visual`.
- **Every file name in the build is unique, folders included**: the platform refuses a bundle in which two files share a name. Name an asset with its owner in it (`<id>-thumb.webp`, `autumn-study-table.webp`); `tools/unique-names.mjs` fails `npm run build` on a clash.
- **Long pictures get boards of their own** (creator, 2026-10-25, after Jigsaw Drop levels 16 and 17): a board is all 2×2, or all 1×2 and 2×1 (tall and wide mixed), never both. One board per trip is all long, in a relief slot, as a change of pace (boards 11, 21…). New pictures are made mostly square (2×2).
- **The stacks' next card is face up** (creator, 2026-10-25, on trial): card backs (`peek` 0) stay behind a board-tuning switch.
- **Being stuck is shown the moment it happens** (creator, 2026-10-25): when the solver proves the board can't be won, `board:stuck` brings up a notice pointing at Shuffle (the rescue mix), Undo or Restart. A solver "unknown" never counts as stuck.
- **Difficulty is a sawtooth, not a ramp** (creator, 2026-10-25; the plan and targets are in `docs/difficulty-curve.md`): spikes, relief, higher spikes, with a bite by board 3, and harder than the genre is fine. Hard and super hard boards carry a `mark`, shown on home, in the opening banner, the top row and the win card. About 65% of hard and finale boards from board 10 are 5×5, and every other finale is 6×6.
- **Cards are portrait cells, 3:4 (width:height)** (creator, 2026-10-24, after Jigsaw Drop: "a portrait image is usually nicer"). A picture of `cols × rows` cells has the aspect `cols·3 : rows·4` (a 2×2 picture is a 3:4 portrait) and is cut into one card per cell. The aspect is one board tuning value; pictures made for square cells are centre-cropped until they are replaced. The rules and the checker count logical cells only.
- **Two materials (the standard's "Only buttons look like buttons").** A button is opaque frosted white (or amber for the main action) raised on a thick blue-grey lip with a drop shadow; information is flat see-through frosted glass with no lip and no shadow (`src/ui/style.css`, `.btn` and `.glass`). Never dress a label, count or status as a `.btn`.
- **Levels are proved data.** Every deal in `src/content/levels/` is written by a `tools/levels/make-*.mts` and re-proved by `tools/levels/check.mts` in the build (cached; a release build re-proves all, `--full`): never hand-edit one, and a solver "unknown" never ships. Relief and lesson boards start safe (`safeFirstMove`); every board is winnable with no helper. Unmarked boards are READABLE (creator, 2026-10-27): drawing by the face-up stack cards wins 85%+, and only hard and super hard boards may hide the way behind a second stack card, where a careful player still wins about 1 in 4. A picture flagged in `src/content/picture-flags.json` fails check.mts, and `redeal.mts` re-deals only its boards.
- **Every win is replayed by the server before it pays, and progress is the server's.** `functions/checker` (a Rust serverless function) replays a claimed line on a Rust port of `src/game/rules.ts` against level data compiled into it, and only it writes the player's `progress` save slot (the game reads it through `src/net/progress.ts` and never writes progress itself): a rules change must keep `node tools/server/check.mts` green, and a level-file change needs `node tools/server/build.mts` and `tools/server/upload.mts` before the build, or `npm run build` stops at `levels-check`. Coins per board are in `docs/coins.md`.
- **Platform calls are paced** (2026-10-29: the resume save's and claims' retries throttled the whole company, because the platform's per-minute budget is per network address and the office shares one). Every retry loop goes through `src/net/pace.ts`: growing waits up to a cap, a retry-after or a 429 holds every loop, nothing while hidden, and one call in flight. The resume save writes at most once a minute (`src/game/in-hand.ts`). Agents keep live dev runs and gemctl polling few and slow.

## Keeping this file small

Every session loads this file in full before any work starts, so its
size is a tax on every task. It has to be pruned, not only appended
to.

- **The bar for a new line is "an agent decides wrong without it"**,
which is far stricter than "true and hard-won".
- **Budget: ~8,000 tokens.** When an edit would push it past
that, the edit is a PRUNE, not an append. `gemctl project doctor`
measures it (the `docs.agent_docs_size` row) and warns past the
budget. The measure is characters of content divided by four, so
blank lines and re-wrapping change nothing.
- **A prune goes down to ~6,000 tokens**, not to just under the
budget, so the next edits have room.
- **Replace, never stack.** Rewrite a superseded ruling in place and
delete what it replaced: the history is in `git log` already.
- **A ruling is a sentence or two**, naming the code that carries it.
Keep a dead end only when someone would otherwise retry it.
- **Move the argument, do not keep it here.** Long-form reasoning
belongs in `docs/design-notes.md`, read on demand.
- **Delete what stopped being true.** A stale rule costs more than a
missing one, because it gets followed.

| this | belongs in |
| --- | --- |
| benchmarks, balance tables, measurements | `docs/` |
| what is still owed, or wanted next | issues, or `TODO.md` |
| how one module works | a comment in that module |
| what changed and when | `git log` |
