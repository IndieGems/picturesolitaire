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
| achievement.wav | an achievement's unlock card (sound effect, 2.5 s, stereo) | 0.05-1.65 s | soft synth bells C4 G4 C5 E5 G5 up to a ringing C6 (0.4 s); -16 LUFS, encoded as a music cue. The creator's pick (2026-10-30) of three takes: this, a steel pan run and a ukulele "ta-da" built from one strum. Short music-generator cues (5-6 s asked) came back as fragments (one bell chord, one strum, a looping pluck pattern) and a "shimmer" prompt as shaker hiss; the sound-effect generator made whole jingles. Say "no sparkle hiss" |
| latch.wav | the Daily Suitcase's case closing (packed) | 1.575-1.8 s | lid thud then two latch clicks (1.585, 1.66), boom thinned at 180 Hz; packed adds the hint chime an octave up; suitcase is built from mark-marimba, mark-thump and hint; sticker (a Souvenir's) from land, mark-marimba and hint |
| found-fanfare.mp3 | the Daily Suitcase's found-it moment (music cue, 6 s) | 0.02-0.94 s, then 2.976-5.2 s | xylophone, glockenspiel, pizzicato in C, beats every 0.455 s; the cut skips to the pickup note before the last beat and final chord (3.66), which lands at 1.59 s |
| bed.mp3 | the Winter Dusk soundtrack (owned with that table), 90 s (snowy evening: felt piano, string pad, celesta) | 0-86.5 s | loop: crossfade last ~4 s into the start at run time |
| bed-day.mp3 | the Sunny Day soundtrack, every player's and the default, 90 s (sunny afternoon: guitar, felt piano, airy strings, flute) | 0-90 s | generated in G major (a second take asked harder for C and came out keyless, discarded); ships in G, the creator's choice (2026-10-28), accepting a slight rub between its F sharp and the picture harp's F; same loop as bed. Also encoded re-keyed up a fourth to C, tempo kept (rubberband), to audio/takes/bed-day-c (not shipped) for Sound Tuning's listen-only "Music moved to C" row |
| track-paris-cafe.mp3 | Cosmetics soundtrack, France (bought, 500 Coins), 90 s: slow French waltz, vibraphone over nylon guitar and upright bass, 80 bpm | 0.72-85.723 s | C major; the second Paris take (2026-10-29), see below; first note at 0.72 s, ending falls away from 86.5 s; cut for a loop of 81 s (36 bars) whose last 4 s match its first in rhythm and harmony |
| track-japanese-garden.mp3 | Cosmetics soundtrack, Japan, 90 s: koto, shakuhachi, soft pad | 16.3-79 s | pentatonic on A and D; the first 16 s are sparse phrases with near-silent gaps (8-10 dB under), so the loop starts at the phrase after the last gap: 63 s, even; ending falls away from 79 s |
| track-buenos-aires-tango.mp3 | Cosmetics soundtrack, Argentina, 90 s: bandoneon, violin, piano, pizzicato bass, laid-back tango | 0-88 s | C minor; very even (LRA 2 LU) |
| track-celtic-folk.mp3 | Cosmetics soundtrack, UK & Ireland, 90 s: tin whistle, fiddle, fingerpicked guitar, harp | 0-89.5 s | C major; its first 24 s about 4 dB softer, kept as a gentle swell each loop |

The four soundtracks are one take each (2026-10-29, 1,355 units of the shared
audio pool apiece), at the beds' -20 LUFS, except Paris, remade the same day:
the first take's café accordion took the tune at ~30 s high and buzzy (its 2-5
kHz share went from -36 to -16 dB, about 11 dB over Sunny Day's, with a flat,
reedy run of harmonics and no vibrato), which the creator found "hard to listen
to". Three accordion-free takes (a jazz trio, this vibraphone waltz, a guitar
and piano duet; 4 x 1,355 units, a musette-waltz take with a mellow accordion
was dropped unheard when it brightened the same way past 50 s) were heard in
Sound Tuning, and the creator picked the waltz. Keep reeds, bowed strings and
anything nasal out of a remake's prompt. Like the sunny bed, the tango's E flat
rubs a little against the picture harp (E, B, C, F), under the duck the harp
brings; Paris is now in C, as the harp is.

A loop's cut is chosen so its last 4 s (crossfaded into its first at run time)
match its first 4 s in rhythm and harmony: the first Paris cut scored 0.04 on
rhythm, a flam every loop. Sound Tuning's "as generated" rows play each
original untouched (byte copies in audio/takes/, never shipped), to hear what
the trim, levelling and encode change: they measure within about 1 dB of the
original's tone; the originals are 2-8 dB louder.

Shipped: Ogg Opus (effects mono 40 kbps, music stereo 48 kbps), plus an MP3
fallback for a browser that cannot decode Opus. A player fetches one music
track at a time (400-630 KB): the one chosen, or the one tried.
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

A NEW sound has no game file for takes to hang on: encode its takes into
`audio/takes/` under names that are not a take's (`achievement-chime`), show
each as a listen-only row (`file`, `dir: "takes"`, `preview`, and `gain`, the
level it plays at), and on a pick add the original here, its entry above and
its level in sounds.ts, then drop the rows and the takes.
