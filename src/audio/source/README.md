# Audio sources (not shipped)

The originals as gemforge generated them (gen-audio). Nothing imports this
folder, so Vite never ships it; the game plays compressed copies from
`public/audio/`, encoded from these.

## Status (2026-10-23, WIP)

All generated, none encoded or wired yet.

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
| bed.mp3 | background music, 90 s | 0-86.5 s | loop: crossfade last ~4 s into the start at run time |

## Next

1. Encode each: trim as above, 3 ms fade in, short fade out, high-pass 60 Hz,
   peak-normalise to about -2 dBFS (music: loudness-normalise to about
   -20 LUFS). Ship Ogg Opus (effects mono ~40 kbps, won/bed stereo ~48 kbps)
   plus an MP3 fallback for browsers that cannot decode Opus.
   ffmpeg is not installed: `npm i ffmpeg-static` in a scratch folder.
2. src/audio/: one AudioContext after createGem, master gain from
   masterGain() (src/sound.ts) on mute/settings change, music and effects
   buses following onAudioChannels (src/gem.ts), suspend on onArcadePause
   and page hidden, resume on the first lift only if suspended. Load after
   the first screen. Listen to src/events.ts; stack:deal pans by column and
   rises in pitch left to right; music ducks under board:won.
3. startSound() in src/sound.ts starts it (no main.ts line needed).
