# Audio sources (not shipped)

The originals as gemforge generated them (gen-audio). Nothing imports this
folder, so Vite never ships it; the game plays compressed copies from
`public/audio/`, encoded from these.

## Status

Encoded into public/audio/ by `encode.mjs` (its header says how to run it;
the trims below are in it) and played by src/audio/. The table is what each
original holds.

| file | for | main event (trim to) | notes |
| --- | --- | --- | --- |
| land.wav | a move lands; also a column landing (settle) | 0.48-0.66 s | quiet (peak -23 dB); settle is its first knock alone (0.485-0.57 s), low-passed at 3 kHz |
| lift.wav | card/piece picked up | 1.26-1.40 s | |
| slide.wav | displaced cards slide back | 0.62-0.85 s | weak (peak -30 dB) |
| merge.wav | correct neighbours join | 0.71-0.80 s | weak (peak -33 dB) |
| split.wav | merged piece comes apart | 1.71-1.85 s | |
| complete.wav | a picture is whole (the flourish) | 0.3-4.4 s | rising harp, fade out; starts on its first clear note to fit the quick exit |
| fall.wav | cards fall into gaps | 1.13-2.10 s | three taps |
| deal.wav | a stack deals one card (tick); also "nope" | 0.87-0.96 s | file ends mid-tail: fade 10 ms; nope (BUILT) is this tick twice, lower, softened |
| undo.wav | undo | 0.75-1.27 s | swish into a tap |
| hint.wav | hint | 0.03-1.2 s | glass chime |
| shuffle.wav | shuffle | 2.6-3.8 s | quiet riffle |
| restart.wav | restart | 2.0-2.62 s | weak (peak -31 dB) |
| ui.wav | interface button | 0.10-0.30 s | |
| won.mp3 | board won (music cue, 8 s) | 0-7.8 s | also the win sting |
| milestone.mp3 | milestone card (music cue, 10 s) | 0.5-9.9 s | orchestral swell, bell sparkles; -15 LUFS |
| mark-marimba.wav | hard board sting: notes for the "uh-oh" | 0-0.29 s and 0.695-1.35 s | the take played C, B, C; encode.mjs (BUILT) makes hardmark/supermark from its first and last notes |
| mark-thump.wav | super hard board sting: the low thump | 0-0.66 s | one soft C2 thump, under supermark's second note |
| stamp.wav | passport stamp lands | 0.525-0.82 s | rubber hit then its body; low-passed at 5 kHz (a first take was silent, regenerated) |
| fanfare.mp3 | destination postcard opens (music cue, 4 s) | 0-2.6 s | D major horns and strings, glockenspiel sparkle; -16 LUFS |
| latch.wav | the Daily Suitcase's case closing (packed) | 1.575-1.8 s | lid thud then two latch clicks (1.585, 1.66), boom thinned at 180 Hz; packed adds the hint chime an octave up; suitcase is built from mark-marimba, mark-thump and hint; sticker (a Souvenir's) from land, mark-marimba and hint |
| found-fanfare.mp3 | the Daily Suitcase's found-it moment (music cue, 6 s) | 0.02-0.94 s, then 2.976-5.2 s | xylophone, glockenspiel, pizzicato in C, beats every 0.455 s; the cut skips to the pickup note before the last beat and final chord (3.66), which lands at 1.59 s |
| bed.mp3 | background music on the Winter Dusk table, 90 s (snowy evening: felt piano, string pad, celesta) | 0-86.5 s | loop: crossfade last ~4 s into the start at run time |
| bed-day.mp3 | background music on every other table, 90 s (sunny afternoon: guitar, felt piano, airy strings, flute) | 0-90 s | generated in G major (a second take asked harder for C and came out keyless, discarded); encode re-keys it up a fourth to C, tempo kept (rubberband); same loop as bed. Also encoded unshifted to audio/takes/bed-day-g (not shipped) for Sound Tuning's "Music: original key" row |

Shipped: Ogg Opus (effects mono 40 kbps, music stereo 48 kbps), plus an MP3
fallback for a browser that cannot decode Opus. A player fetches one of the
two beds (about 600 KB), the one their table plays.
The bed is real stereo (side only 4 dB under mid): keep it stereo.
slide, merge and restart came out faint in the originals and are lifted by
normalising; regenerate them if they sound thin in play.

## Remakes (Sound Tuning)

The creator marks sounds Keep or Remake in the Sound Tuning tool
(tools/sound-tuning/); the choices and notes are in its choices.json. For a
Remake, generate two or three takes (only for those sounds) into `takes/`
here as `<sound>-a`, `-b`, `-c`, add each to TAKES in encode.mjs with its
trim, and run `encode.mjs <sound>-a <sound>-b ...`. The encoded takes land
in `audio/takes/` at the project root (not shipped) and show in the tool as
Take A, B, C; the tool copies the picked one into the game on Save
(public/audio/takes/, and the mix in public/sound-mix.json).
