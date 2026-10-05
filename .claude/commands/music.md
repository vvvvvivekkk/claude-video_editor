---
description: Add a music bed that ducks under the voice
argument-hint: [assets/music/<track>] [--gain -18] [--start 0]
---
1. If no track given: list `assets/music/` and ask the sound-designer subagent (or the user) which fits. Empty folder → tell the user to add 2–3 royalty-free tracks (YouTube Audio Library) and stop.
2. Optional: if the BPM is known, run `/beats` first so cuts land on the beat (needs a re-cut).
3. `npm run music -- --track <file> $ARGUMENTS`. Report the level used.
