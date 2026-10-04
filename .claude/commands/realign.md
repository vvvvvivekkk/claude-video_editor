---
description: Rebuild caption timings against the cut master — fixes drift on heavy cuts
argument-hint: data/<name>.transcript.json
---

Re-align the word-level transcript to the cut master, so captions don't drift.

## Steps

1. **Verify prerequisites.** `data/cuts.json` must exist. If not, stop and tell the user to run `/cuts` first.

2. **Run the realigner.** `node scripts/realign.js $ARGUMENTS`. This writes `data/<name>.cut-transcript.json`.

3. **Report.** Tell the user:
   - How many words landed in the master (and how many were dropped in cuts).
   - The master duration from this transcript — should match the cut master's duration within 0.5s.
   - The next command: `npm run caption -- data/<name>.cut-transcript.json --style pop`.
