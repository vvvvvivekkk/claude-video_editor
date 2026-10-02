# The base prompt — motion graphics on your cut master

This is the prompt Claude feeds HyperFrames when adding motion graphics to a
cut talking-head video (step after `npm run cut`, before `npm run caption`).

The pipeline writes it for you, but if you need to run it by hand, copy from
here and swap the paths. Based on Prompt 11 of Damiano Caudullo's "Motion
Graphics with Claude Code" guide, adapted to this repo's folder layout.

---

```
You're a top motion graphics designer. Add motion graphics to the video at
../../output/edited-master.mp4 with HyperFrames, in this folder.

Export TRANSPARENT so I can composite it over the master in ffmpeg:
    renders/overlay.mov  (ProRes 4444 with alpha)

1. Really analyse the video first. Transcribe it with
   `npx hyperframes transcribe ../../output/edited-master.mp4`, check the
   word timings against the audio, and work out what the video is about and
   which moments matter most. If whisper isn't installed, stop and tell me
   to run `npm run motion:setup` in the project root.

2. Keep the base video exactly as it is: same size, frame rate, audio and
   cut. You only produce the overlay. The compose step adds it to the
   master.

3. At each important moment, add an animation made for what I'm saying
   right then: a number becomes a counter, a list becomes a checklist, a
   before/after becomes a comparison. Each one starts on the exact word.

4. Keep one style across the whole video — look under STYLE below.

5. Nothing in the first 3 seconds. That's the hook.

6. Safe zones: keep graphics OFF the speaker's face, OUT of the bottom
   third (where captions burn in at MarginV: 300 for vertical, 100 for
   horizontal), and away from the left and right 10% of the frame.

7. Use the moves vocabulary from ../../motion/MOVES.md when I name a move
   ("add a count-up here", "pop the stat in"). The named moves are rise,
   pop, count-up, checklist tick, typewriter, slide-in, blur-in, punch-in,
   reframe, bar fill.

8. Fonts live in ../../motion/fonts — reference them with relative paths
   from this project folder (fonts/Inter-700.woff2 after copying them in).

STYLE:
<<<PASTE ONE STYLE BLOCK HERE from ../../motion/styles/*.md>>>

Render transparent to renders/overlay.mov (ProRes 4444 with alpha). Also
render a preview at renders/overlay-preview.mp4 so I can eyeball it before
compositing.
```

---

## When to use a solid background instead

Frosted-glass cards lose their blur when exported transparent — there's
nothing behind them to blur. If you're using **Liquid Glass** style and need
a transparent overlay, tell Claude: *"use solid cards for the overlay, not
frosted — frosted has nothing to blur against."*

The other three styles (Kinetic Type, Editorial Grain, Pop Bold) composite
cleanly as-is.
