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
| land.wav | a move lands | 0.48-0.66 s | quiet (peak -23 dB) |
| lift.wav | card/piece picked up | 1.26-1.40 s | |
| slide.wav | displaced cards slide back | 0.62-0.85 s | weak (peak -30 dB) |
| merge.wav | correct neighbours join | 0.71-0.80 s | weak (peak -33 dB) |
| split.wav | merged piece comes apart | 1.71-1.85 s | |
| complete.wav | a picture is whole (the flourish) | 0.2-4.6 s | rising harp, fade out |
| fall.wav | cards fall into gaps | 1.13-2.10 s | three taps |
| deal.wav | a stack deals one card (tick) | 0.87-0.96 s | file ends mid-tail: fade 10 ms |
| undo.wav | undo | 0.75-1.27 s | swish into a tap |
| hint.wav | hint | 0.03-1.2 s | glass chime |
| shuffle.wav | shuffle | 2.6-3.8 s | quiet riffle |
| restart.wav | restart | 2.0-2.62 s | weak (peak -31 dB) |
| ui.wav | interface button | 0.10-0.30 s | |
| won.mp3 | board won (music cue, 8 s) | 0-7.8 s | also the win sting |
| milestone.mp3 | milestone card (music cue, 10 s) | 0.5-9.9 s | orchestral swell, bell sparkles; -15 LUFS |
| bed.mp3 | background music, 90 s | 0-86.5 s | loop: crossfade last ~4 s into the start at run time |

Shipped: Ogg Opus (effects mono 40 kbps, won/bed stereo 48 kbps), about
690 KB in all, plus an MP3 fallback for a browser that cannot decode Opus.
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
