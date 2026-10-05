---
description: Sound design — whooshes on cuts, swooshes on zooms, pops/ticks/booms on the right words
---
1. If `assets/sfx/` has no .wav files: `npm run sfx:gen` (synthesized starter kit; user can swap in better sounds with the same names).
2. Subagent `sound-designer` writes `data/sfx.json` (extra hits beyond the automatic ones).
3. `npm run sfx`. Report the event counts per sound.
