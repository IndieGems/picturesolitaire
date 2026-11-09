# PC layout mockups (2026-11-09)

The creator asked for mockups that make the PC version "feel more like its meant for pc", with the phone untouched. These are pictures only: no game code, store page or phone screen changed. `index.html` shows them all with a line on each direction.

- **Today**, as the Arcade letterboxes it (`0-today-arcade-*`), and what the game draws when handed the whole window (`0-today-wide-window-*`).
- **(a) Side columns** (`a-side-columns-*`): the board centred and full height, the trip and its postcards on the left, the tools on the right as labelled buttons with their keys. Home is a hub. Dialogs are centred windows over the dimmed screen.
- **(b) Toolbar** (`b-toolbar-*`): a slim toolbar of labelled commands, with the board under it and a foldable postcard drawer. Home is the trip map. The win card is wide and shows the level's pictures big.
- **(c) Hybrid** (`c-hybrid-*`): today's column untouched in the middle, with wide panels either side.
- **(d) Box, polished** (`d-box-polished-*`): today's letterbox kept, with mouse and keyboard polish (hover, tooltips, keys, smaller tools).

The level screens are also shot at 1366x768 (`*-1366`).

**How they're made.** `render.mts` opens the real game in the play-test tool's hidden Chrome (on the GPU), and `mock.js` and `mock.css` lay its own screens out per direction. Every card, postcard, stamp, button and font is the game's. Run `node design/pc-mockups/render.mts`, or `RUNS=a,b-1366 node design/pc-mockups/render.mts` for some runs. It takes about two minutes a run, one browser at a time.

**Stand-ins**, since the play-test tool has no Arcade, player or config:

- The Gem button and wallet are drawn where the SDK places them: a 44 px Gem top-left, 8 px in, with Gems and Coins beside it.
- The wins up to Level 249 (or 254) are pretend.
- The shop's Coin prices are the config's, from `docs/coins.md`.
- A friend is faked so Challenge a friend shows.

The words a mockup adds are English stand-ins: key names, panel titles, tooltips. A chosen direction would put them in `locales/`.

**One deliberate change from the brief:** the stacks stay on top of their columns in every direction. Docking them in a tray would hide which column each stack refills.
