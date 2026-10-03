---
description: Author data/cuts.json from the newest transcript — Claude decides what's a false start, filler, retake, or dead air
---

Author `data/cuts.json` from the newest `data/*.transcript.json` in this repo.

Follow all cut rules in `CLAUDE.md` → "Stage A — Write data/cuts.json". Then:

1. Delegate the actual cut authoring to the `editor` subagent via the Agent tool with `subagent_type: editor`. Pass the transcript path.
2. When the agent returns `cuts.json` and its report, relay the one-line summary to the user verbatim: clip count, kept duration vs original, 2–3 biggest cuts with reasons.
3. Wait — do NOT run `npm run cut` unless the user explicitly says so.
