---
description: Punch-in zooms on the key word of every 5–8 seconds
---
1. Make sure `data/<name>.cut-transcript.json` exists (else `npm run realign -- data/<name>.transcript.json`).
2. Subagent `focus-director` (Agent tool, `subagent_type: focus-director`) writes `data/punches.json`.
3. `npm run punch`. Report the punches (time, word, scale). Offer `/review` to eyeball them.
