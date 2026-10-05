---
description: Burn kinetic word-by-word captions (TikTok/Reels style) onto the latest master
---

Burn captions onto the latest master.

## Steps

1. **Find the transcript.** List `data/*.transcript.json` and pick the one matching the current cut's source. If multiple, ask the user.

2. **Pick a style.** Ask the user (default to `pop` if they don't answer):
   - `pop` — one word at a time, large, white with black outline, scales up on each word (TikTok default)
   - `highlight` — 3-word chunks with the current word highlighted in bright color
   - `plain` — v1 behavior, 3-word static chunks

3. **Run the burn.** `npm run caption -- data/<name>.cut-transcript.json --style <style>` (prefer the realigned cut-transcript; create it with `npm run realign -- data/<name>.transcript.json`). The script auto-detects whether `output/with-graphics.mp4` exists (motion ran) or only `output/edited-master.mp4` (no motion), and burns onto the newer one.

4. **Report.** Tell the user `output/final.mp4` is ready, and roughly how many caption events were drawn.

## Rules

- If the transcript has no word-level timings, say so and stop — kinetic styles require them.
- If the caption burn fails on Windows with a subtitle path error, fall back to writing the .ass file into a `./tmp` subfolder relative to the ffmpeg call and retry once.
