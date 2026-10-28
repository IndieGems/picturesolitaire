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

Write player-facing text in English while the game is built. Keeping
it in one catalogue (i18next, `locales/en.json`) is welcome when it
costs nothing now, because it makes the release pass cheaper, but
nothing needs a second language before release.
**Translate only at the `release` promotion, or when the developer
asks for a translation.** Otherwise do not translate, or offer to,
while building the game or for an upload, a `dev` or a `test`
promote: those are iteration. When asked to promote to `release`,
including through `gemctl:publish-game`, bring every Arcade locale
of the game and its store page up to date with `gemctl:localization`;
the `gemctl:release-checklist` skill checks them. Translate only what
is new or changed since each locale was last written.
At that promotion, check store copy with `gemctl store upload --dry-run`,
rebuild the game, and have the creator inspect a translated locale.

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
draws the button, top-right, and the screen it opens. The
Arcade's menu never opens them, so never hide that button. Each
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

- **Art follows the chosen look.** `design/concepts/game-l.png` is the style reference for every piece of art, however it is made (an image generator, sprites drawn in code, three.js materials, Blender): open it before making any. For a generated image pass it as the reference and draw only the new subject from it; for a pose or variant of an existing sprite, use that sprite instead. `style.visual` in `design.json` says the look in words, and where they disagree with the picture the words win.
- **Except the puzzle pictures themselves.** game-l.png governs the table and the chrome only. Each picture on the cards is a photograph or a painted illustration in its own medium, at full fidelity: never generate one from game-l.png, and never tint, filter or frame-colour it.
- **Pictures are clear, close and varied** (creator, 2026-10-24, comparing ours with Jigsaw Drop: `design/references/ours-level-3-too-busy.png` vs `jigsaw-drop-level-1[34]*.png`). One readable subject, framed close, on a calm background, so every card shows a recognisable part. **About 1 in 6 to 1 in 8 pictures, about one per board, are atmospheric** (creator, 2026-10-28: a landscape, a distant scene, impressionistic or busier, for variety; the early pictures failed only because ALL were like that): the early square ones are back for it, Art makes more in that style to swap into boards 1–150 (deals unchanged), and the clear pictures they displace stock the next trips. Mix art styles (photo, 3D render, flat and retro illustration, low-poly, painting) and vary subjects within a board. This overrides design.json's "pictures on one board share colours and subjects on purpose": no look-alike families on a board. Never colour-code pictures either. Art's `docs/picture-direction.md` has the detail. **Pictures rarely repeat** (creator, 2026-10-25; JD players notice repeats only after 200+ levels): no picture on two of boards 1–13, then none back within ~15 boards, unseen pictures first; the generator enforces it. **People never look AI-made** (creator, 2026-10-25: the chef, the cowboy and the painter all tilt the head and smile the same way): candid, at work, in profile, from behind or looking away, never the posed camera smile. Style references: `design/references/jigsaw-drop-level-1[67]*.png`. **A picture ships at the size it is drawn** (creator, 2026-10-25, now and ongoing): the board draws a board-sized copy picked for the screen, and only the enlarged view fetches the full picture.
- **Moves never get refused** (creator, 2026-10-23). A move is done whenever the moved piece fits on the board. The cards it covers go to where it came from, shifted back by the move: a merged piece it covers fully moves whole, one it covers partly splits and only the covered part moves. Merges are not stored: cards are joined whenever correct neighbours touch, so pieces split and rejoin by themselves.
- **Gravity is per column and ignores merges**; after a clear, cards fall first, then the stacks refill column by column, left to right (creator's provisional choice; keep the stagger short and tunable).
- **Helpers are the player's own stock, carried from board to board** (creator, 2026-10-27, after the mahjong-solitaire game's model): Hint, Undo and Shuffle are Arcade-held game currencies, capped at 10 each, never in the save. The guided first board ends with 3 of each, free; a hard board's first win pays 1 Hint and 1 Undo, and a passport stamp 1 of each; more are bought with Coins (prices in config: Undo 100, Hint 150, Shuffle 250). Restart is always free, with no lives or energy. Board 2 teaches Undo and a staged practice board after board 3 teaches Shuffle, both free. Every board stays winnable with no helper; dev-menu practice spends nothing. Also (creator, 2026-10-27, from Match3Mahjong): the daily's first win each day gives one helper; packs of 3 sell at a small saving, from a shop on home too; after repeated stuck tries on one board the next try starts with a free, announced helper (mercy help, never a quietly easier board).
- **The daily puzzle fills the monthly event's suitcase** (creator, 2026-10-27): each month a themed suitcase of 10 items, each daily board hiding the day's item (the same for everyone, about 3 showings a month on hidden days); duplicates count, 3 spares swap for a missing item, and a full suitcase unlocks that month's table plus a few helpers. The design is `docs/daily-suitcase.md`. Home's tile for it replaced Challenges (creator, 2026-10-27: the challenge route is off home, its code kept, until the creator decides).
- **Friend challenges play the same board** (creator, 2026-10-28, after WordSnakes): after any trip board or daily, the win card offers Challenge a friend (the Arcade's inbox) and Share (a link for anyone); the friend plays that board as a one-off to beat the sender's moves, even one they haven't reached (a sneak peek, unlocking nothing). It pays nothing and moves no progress. The design is `docs/friend-challenges.md`.
- **A Souvenir after every trip** (creator, 2026-10-28, after Jigsaw Drop's Specials): an optional bonus board opened by each trip's stamp, themed on that trip, all long pictures, relief difficulty. It's the one exception to the picture rules: one style and one theme, so each picture gets its own bold background colour to stay tellable. Public-domain works only. The design and the copyright rules are in `docs/souvenirs.md`.
- **Cards are seen straight-on** (creator, 2026-10-23): the concept's tilt shrank and softened the top row, which hurts comparing look-alikes. The tilt stays a switch, off.
- **Play is about finding matches, not admiring pictures** (creator, 2026-10-24, after JD): a dragged piece follows the finger 1:1 with no lift and no stickiness; a finished picture leaves quickly (a slight grow, twinkles, a fast shrink to nothing). Players see pictures on the win card, tap to enlarge. The destination's unfolding postcard (below) and the daily's suitcase item (creator, 2026-10-27: lifted off the board, big, with a starburst and its name, then shrunk into the suitcase) are the two deliberate pauses.
- **The game is a travelogue, "Picture Passport"** (creator, 2026-10-25). The campaign is trips of 15 boards (`src/content/levels/trips.json`); finishing a trip stamps the passport, which replaces the albums. Each board has one destination, a real place as a board-sized postcard (`destinations` in `pictures.json`), whose chosen 2×2 window (a long one on an all-long board) is dealt as an ordinary picture; finishing it unfolds the postcard and names the place, then play goes on. A trip is about 8 famous places, 4 hidden gems and 3 silly ones. Postcards are generated and fact-checked against real photos, described in words, never made from someone's photo; no sacred or permit-restricted sites, modern art, trademarked signs or buildings whose owners license their image (`docs/destinations-america.md`). **No mystery in this game** (creator, 2026-10-26): the Traveling Detective pilot is set aside to become its own game, kept on the git branch `mystery-pilot`; this game doubles down on travel.
- **Shuffle is a rescue mix** (creator, 2026-10-23): it mixes the loose cards, and when the board is stuck it swaps in cards from the stacks too, always choosing a mix the solver proves winnable.
- **The creator tests on the phone through "the Pit"** (2026-10-24): the website's Dev "Latest/Unstable" list shows the newest web upload of every org game to the whole team, with no promote or store page, and plays it on Dev's config, function and saves. So an upload (`gemctl build upload … --version next-minor`) is the phone build and the team can see it. The game is listed on the Dev catalog (creator, 2026-10-25, build 0.12.0): the Pit has the newest upload, and Dev has the build last promoted there, so promote one to dev when the creator wants it there. Keep a store page on Dev: without one the Pit's tile sticks on a loading page on the phone.
- **A release is built with `npm run build:release`**, never `npm run build`: the plain build carries the creator's dev menu (shown only on the dev channel, every board in it practice: no claim, no Coins, no progress), and `build:release` drops it at build time and fails if any of it is left (`tools/no-dev-menu.mjs`).
- **The store page declares the game portrait-only**, so a PC or TV letterboxes it with the `portrait_borders` art. A phone held sideways is covered by a "turn upright" message, with no sideways layout, and home waits (capped) to appear whole (creator, 2026-10-26, as Untangled does).
- **Picture frames are thin** (creator, 2026-10-23: "about half as thick"). This overrides "thick" in `style.visual` and the concept art; the frames stay pale, frosted and fully rounded, and the same goes for every framed picture (board, win card, passport).
- **Every file name in the build is unique, folders included**: the platform refuses a bundle in which two files share a name. Name an asset with its owner in it (`<id>-thumb.webp`, `autumn-study-table.webp`); `tools/unique-names.mjs` fails `npm run build` on a clash.
- **Long pictures get boards of their own** (creator, 2026-10-25, after Jigsaw Drop levels 16 and 17): a board is all 2×2, or all 1×2 and 2×1 (tall and wide mixed), never both. One board per trip is all long, in a relief slot, as a change of pace (boards 11, 21…). New pictures are made mostly square (2×2).
- **The stacks' next card is face up again, on trial** (creator, 2026-10-25, after getting stuck on boards 9 and 10 with card backs: "it would be pure luck to not get into this situation"). A board-tuning switch shows it; card backs (`peek` 0, each table with its own back) stay available behind the switch until the creator decides.
- **Being stuck is shown the moment it happens** (creator, 2026-10-25): when the solver proves the board can't be won, `board:stuck` brings up a notice pointing at Shuffle (the rescue mix), Undo or Restart. A solver "unknown" never counts as stuck.
- **Difficulty is a sawtooth, not a ramp** (creator, 2026-10-25): spikes, then relief, then a higher spike, with a bite as early as board 3. The plan and its measured targets are in `docs/difficulty-curve.md`. Harder than the genre's tries targets is fine (creator, 2026-10-27: far fewer levels than Royal Match, and a different kind of game). Hard and super hard boards are marked for the player (creator, 2026-10-25): a board's `mark` in its level data, shown on home, as a short banner on opening, in the top row and on the win card. **About 65% of the hard and finale boards from board 10 are 5×5** (creator, 2026-10-27, after Jigsaw Drop's level 18: a frequent variation, never a rule): two per trip from trip 2, in different slots each trip, keeping each board's difficulty target; and every other finale (30, 60, 90) is 6×6 (creator, 2026-10-27, after Jigsaw Drop's level 21). The list is in `docs/difficulty-curve.md`.
- **Cards are portrait cells, 3:4 (width:height)** (creator, 2026-10-24, after Jigsaw Drop: "a portrait image is usually nicer"). A picture of `cols × rows` cells has the aspect `cols·3 : rows·4` (a 2×2 picture is a 3:4 portrait) and is cut into one card per cell. The aspect is one board tuning value; pictures made for square cells are centre-cropped until they are replaced. The rules and the checker count logical cells only.
- **Two materials (the standard's "Only buttons look like buttons").** A button is opaque frosted white (or amber for the main action) raised on a thick blue-grey lip with a drop shadow; information is flat see-through frosted glass with no lip and no shadow (`src/ui/style.css`, `.btn` and `.glass`). Never dress a label, count or status as a `.btn`.
- **Levels are proved data.** Every deal in `src/content/levels/` is written by a `tools/levels/make-*.mts` script and re-proved by `tools/levels/check.mts` in the build; never hand-edit one. A solver "unknown" (out of budget) proves nothing, and such a deal never ships. A relief or lesson board starts safe: any picture finishable from the opening can be finished first, anywhere, and no first move leaves the board stuck (`safeFirstMove`, generate.ts); a hard board may trap from its first move, but every board stays winnable with no helper. An unmarked board is also READABLE (creator, 2026-10-27, after boards 18–19 felt rigged): a player who draws by the face-up stack cards wins it 85%+ of the time, while careless play keeps its target; only hard and super hard boards may hide the way behind a stack's second card, and even there a careful player wins about 1 in 4 or more (creator, 2026-10-27, after board 60 at 1 in 10). Hint sees the hidden cards, so it is the tool for "I can't tell where to match". The makers keep every shipped board; a picture flagged in `src/content/picture-flags.json` fails check.mts, and `tools/levels/redeal.mts` re-deals only the boards that use it.
- **Every win is replayed by the server before it pays, and progress is the server's.** `functions/checker` (a Rust serverless function) replays a claimed line on a Rust port of `src/game/rules.ts` against level data compiled into it, and only it writes the player's `progress` save slot (the game reads it through `src/net/progress.ts` and never writes progress itself): a rules change must keep `node tools/server/check.mts` green, and a level-file change needs `node tools/server/build.mts` and `tools/server/upload.mts` before the build, or `npm run build` stops at `levels-check`. Coins per board are in `docs/coins.md`.

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
