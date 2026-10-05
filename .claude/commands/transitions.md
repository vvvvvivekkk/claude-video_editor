---
description: Add 1–2 transitions at real topic changes (hard cut stays the default)
---
1. If `data/transitions.json` is missing, read `data/story.json` + `data/cuts.json`, pick at most 2 section changes, compute their MASTER times (sum of clip durations before the join), and write `{ "transitions": [ { "at": t, "type": "flash|dip|zoom|shake", "why": "..." } ] }`. Zero is a fine answer.
2. `npm run transitions`.
