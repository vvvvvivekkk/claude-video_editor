# SFX folder

Drop short click/pop sound files in here. The HyperFrames motion stage
references them by name when it attaches sounds to animation events.

## The 9 the PDF guide uses

| File        | What it's for                                      |
|-------------|----------------------------------------------------|
| pop.wav     | Pop entrance                                        |
| tick.wav    | Checklist item appears                              |
| counter.wav | While a count-up number is rolling                  |
| chime.wav   | End card, success beat                              |
| snap.wav    | Hard cut, scene change                              |
| star.wav    | A sticker lands                                     |
| switch.wav  | Toggle, state change                                |
| fill.wav    | Progress bar fills                                  |
| success.wav | Positive affirm (use sparingly)                     |

The guide generated these in code (no licensing issue). To regenerate your
own set in the same spirit, ask Claude Code in this folder:

> Generate 9 short UI sound effects as .wav files in this folder: pop, tick,
> counter, chime, snap, star, switch, fill, success. All under 400ms, mono,
> 48kHz, 16-bit. Keep them clean and quiet — they'll sit about 20 dB under
> a voiceover.

Or copy them from Damiano Caudullo's kit if you have the PDF's starter kit.

## Rules of taste

- No whooshes. No sound when a card slides in or leaves.
- Only sound the things that MATTER: a tick when a check appears, a counter
  while a number rolls, a chime on the final beat.
- All SFX sit about 20 dB under the voice track.

(Those three rules come straight from page 17 of the Damiano Caudullo PDF.)
