---
description: Snap editorial cuts to a music grid — provide BPM or an audio track
argument-hint: --bpm 120 [--downbeat 0.4] | --audio input/<track>.mp3
---

Snap the current `data/cuts.json` to a music beat grid.

## Steps

1. **Build the grid.** Run `npm run beats -- $ARGUMENTS` (or `node scripts/beats.js $ARGUMENTS`). This writes `data/beats.json`.
   - Prefer manual `--bpm X --downbeat Y` on known tracks — more accurate.
   - `--audio path` as a fallback; the output is rough and should be reviewed.

2. **Delegate the snap.** Launch the `beat-syncer` subagent via the Agent tool, `subagent_type: beat-syncer`. It reads beats.json and cuts.json, writes `data/cuts.beat-synced.json`, and emits motion anchors.

3. **Report.** Relay the agent's one-paragraph summary. Do NOT overwrite `data/cuts.json`. Tell the user to compare the two files and, if happy, replace cuts.json manually (`mv data/cuts.beat-synced.json data/cuts.json`) and re-run `npm run cut`.
