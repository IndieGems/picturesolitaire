// Sound Tuning's rows: every sound, in the order a board meets them, with the
// moment it belongs to. server.mjs loads this file afresh whenever it changes,
// so a new row shows on the next reload of the page, with no restart of the
// process the Editor started.
//
// A row's file is the game's (src/audio/sounds.ts) unless it names its own:
// `file`, in public/audio/, or with `dir: "takes"` in audio/takes/ (never
// shipped). A `preview` row is for listening only: the game never plays it,
// and it has no Mute; Keep on it says the creator prefers it. A `raw` row plays
// its file once, as it is (no loop crossfade), and `ext` fixes the file type
// it fetches (the as-generated rows: the generator's untouched MP3).

export const SOUNDS = [
  { name: "music", label: "Sunny Day music (in the game)", moment: "The background music every player has, looping under the whole game until they choose another soundtrack: a sunny afternoon. In its original key (G), the one the game plays.", kind: "music" },
  { name: "music-c", label: "Music moved to C (listen only, not in the game)", moment: "The same sunny track moved up to C, so it never rubs against the picture harp. You chose the original key instead; this one is kept only to listen to, and the game never plays it.", kind: "music", file: "bed-day-c", dir: "takes", preview: true },
  { name: "music-as-generated", label: "Sunny Day, as generated (listen only)", moment: "The generator's file exactly as it came, to compare with the Sunny Day music row: no trim, no loop, no levelling, the original MP3 rather than the game's compressed copy. It plays once to its own ending, about 5 dB louder than the game plays it, which on its own makes music sound brighter and more forward.", kind: "music", file: "sunny-day-as-generated", dir: "takes", ext: "mp3", raw: true, preview: true },
  { name: "winter", label: "Winter Dusk soundtrack", moment: "A soundtrack that comes with the Winter Dusk table (December's suitcase prize): the snowy evening. Once chosen on the Cosmetics screen it plays under the whole game.", kind: "music" },
  { name: "winter-as-generated", label: "Winter Dusk, as generated (listen only)", moment: "The generator's file exactly as it came, to compare with the Winter Dusk soundtrack row: no trim, no loop, no levelling, the original MP3 rather than the game's compressed copy. It plays once to its own ending, about 2 dB louder than the game plays it, which on its own makes music sound brighter and more forward.", kind: "music", file: "winter-dusk-as-generated", dir: "takes", ext: "mp3", raw: true, preview: true },
  { name: "paris-cafe", label: "Paris Café soundtrack", moment: "A soundtrack the player buys on the Cosmetics screen (500 Coins), from the France trip: a slow French waltz, a soft vibraphone tune over nylon guitar and upright bass. Once chosen it plays under the whole game. (It replaced a café accordion version whose high, buzzy accordion tune was hard to listen to.)", kind: "music" },
  { name: "paris-cafe-as-generated", label: "Paris Café, as generated (listen only)", moment: "The generator's file exactly as it came, to compare with the Paris Café soundtrack row: no trim, no loop, no levelling, the original MP3 rather than the game's compressed copy. It plays once to its own ending, about 6 dB louder than the game plays it, which on its own makes music sound brighter and more forward.", kind: "music", file: "paris-cafe-as-generated", dir: "takes", ext: "mp3", raw: true, preview: true },
  { name: "japanese-garden", label: "Japanese Garden soundtrack", moment: "A soundtrack the player buys on the Cosmetics screen (500 Coins), from the Japan trip: koto and shakuhachi flute over a soft pad, a sunlit garden. Once chosen it plays under the whole game.", kind: "music" },
  { name: "japanese-garden-as-generated", label: "Japanese Garden, as generated (listen only)", moment: "The generator's file exactly as it came, to compare with the Japanese Garden soundtrack row: no trim, no loop, no levelling, the original MP3 rather than the game's compressed copy. It plays once to its own ending, about 7 dB louder than the game plays it, which on its own makes music sound brighter and more forward.", kind: "music", file: "japanese-garden-as-generated", dir: "takes", ext: "mp3", raw: true, preview: true },
  { name: "buenos-aires-tango", label: "Buenos Aires Tango soundtrack", moment: "A soundtrack the player buys on the Cosmetics screen (500 Coins), from the Argentina trip: bandoneon and violin over piano and plucked bass, a gentle tango. Once chosen it plays under the whole game.", kind: "music" },
  { name: "buenos-aires-tango-as-generated", label: "Buenos Aires Tango, as generated (listen only)", moment: "The generator's file exactly as it came, to compare with the Buenos Aires Tango soundtrack row: no trim, no loop, no levelling, the original MP3 rather than the game's compressed copy. It plays once to its own ending, about 6 dB louder than the game plays it, which on its own makes music sound brighter and more forward.", kind: "music", file: "buenos-aires-tango-as-generated", dir: "takes", ext: "mp3", raw: true, preview: true },
  { name: "celtic-folk", label: "Celtic Folk soundtrack", moment: "A soundtrack the player buys on the Cosmetics screen (500 Coins), from the UK & Ireland trip: tin whistle and fiddle over guitar and harp, green hills. Once chosen it plays under the whole game.", kind: "music" },
  { name: "celtic-folk-as-generated", label: "Celtic Folk, as generated (listen only)", moment: "The generator's file exactly as it came, to compare with the Celtic Folk soundtrack row: no trim, no loop, no levelling, the original MP3 rather than the game's compressed copy. It plays once to its own ending, about 5 dB louder than the game plays it, which on its own makes music sound brighter and more forward.", kind: "music", file: "celtic-folk-as-generated", dir: "takes", ext: "mp3", raw: true, preview: true },
  { name: "hardmark", label: "Hard board", moment: "A hard board opens, under its \"Hard board\" banner: a playful uh-oh." },
  { name: "supermark", label: "Super hard board", moment: "A super hard board opens, under its \"Super hard board\" banner: the uh-oh, deeper and weightier." },
  { name: "lift", label: "Pick up", moment: "Picking up a card or a joined piece." },
  { name: "land", label: "Put down", moment: "A move lands. Also plays softer when a piece is put back where it was." },
  { name: "slide", label: "Slide back", moment: "Cards the move pushed aside slide back to where it came from." },
  { name: "merge", label: "Join", moment: "Two correct neighbours touch and join. A little brighter the bigger the joined piece." },
  { name: "split", label: "Come apart", moment: "A joined piece is split by a move or by cards falling." },
  { name: "complete", label: "Picture whole", moment: "A picture is complete: the flourish, the best sound in the game." },
  { name: "fanfare", label: "Destination fanfare", moment: "A board's destination picture is finished and unfolds into its postcard: plays under the place's name. Nothing on a repeat after Undo or a restart." },
  { name: "fall", label: "Cards fall", moment: "Cards drop into a gap after a picture clears, under the column ticks." },
  { name: "settle", label: "Column lands", moment: "After a picture clears, each column's cards touch down: one soft tick per column, a little higher further right. Plays here as five columns landing, left to right." },
  { name: "deal", label: "Stack deals", moment: "A stack deals a card into its column. Plays here as a refill rippling across five stacks, left to right." },
  { name: "nope", label: "Stack says no", moment: "A press on a stack, which can't be picked up: the stack gives a little sideways shake. Players repeat it, so it stays quiet." },
  { name: "undo", label: "Undo", moment: "The Undo helper." },
  { name: "hint", label: "Hint", moment: "The Hint helper." },
  { name: "shuffle", label: "Shuffle", moment: "The Shuffle helper." },
  { name: "restart", label: "Restart", moment: "The board is started over." },
  { name: "ui", label: "Button", moment: "Any button in the menus and screens." },
  { name: "stuck", label: "Stuck", moment: "The player is stuck: a dead end, or Hint finds no way. Also a Shuffle that can't help. The hint chime, lower and softer." },
  { name: "won", label: "Board won", moment: "Every picture restored: the board is won. It is the win sting too." },
  { name: "found", label: "Found it", moment: "The Daily Suitcase: the day's item picture is finished on the daily board and gets its big moment (it lifts with a starburst and its name, then flies into a suitcase). Plays here with its latch, as in the game." },
  { name: "stow", label: "Into the suitcase", moment: "The Daily Suitcase: the found item lands in the little suitcase on the board screen, at the end of its big moment. The same latch as Packed, with a level of its own." },
  { name: "packed", label: "Packed", moment: "The Daily Suitcase: the item flies into the suitcase on the daily win card and the case latches. A little softer for a spare copy." },
  { name: "suitcase", label: "Suitcase full", moment: "The Daily Suitcase: the 10th item is in and the month's suitcase is full, on the win card (just after its latch) or after a swap." },
  { name: "stamp", label: "Passport stamp", moment: "A trip's last board is won and the player stamps the passport: the stamp lands on the trip's page." },
  { name: "sticker", label: "Souvenir sticker", moment: "A trip's Souvenir board is won and the player adds its sticker: it presses down onto the trip's passport page." },
  { name: "milestone", label: "Milestone", moment: "A milestone card with fireworks: today, finishing the guided start. Bigger than a board win, and plays instead of it." },
];
