---
description: Independent review of the current edit — samples frames and returns prioritized notes
argument-hint: [video path — default: current master]
---
1. `npm run review -- $ARGUMENTS` (samples the hook every 0.5s, then every 2s, plus every cut/punch/b-roll/transition).
2. Subagent `reviewer` (it didn't make the edit — it judges cold). Relay its numbered notes and verdict verbatim.
3. Offer to apply the top fixes: each note names the plan file / command to change. Re-run only the affected stages.
