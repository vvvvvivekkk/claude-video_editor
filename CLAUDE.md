# Claude Code instructions for this repo

This repo is a video editor. You (Claude) are the editor. The user records a raw talking-head video; you decide what to cut and what to keep.

## The pipeline

```
input/raw.mp4
   -> npm run transcribe -- input/raw.mp4
   -> data/raw.transcript.json   (word-level, from Groq Whisper)
   -> YOU WRITE: data/cuts.json  (list of good clips)
   -> npm run cut -- input/raw.mp4
   -> output/edited-master.mp4
   -> npm run caption -- data/raw.transcript.json
   -> output/final.mp4  (with burned-in captions)
```

## Your job: write `data/cuts.json`

When the user says "make cuts" or "author cuts.json", read the newest `data/*.transcript.json`, decide what's in and what's out, and write `data/cuts.json` in this shape:

```json
{
  "source": "input/raw.mp4",
  "clips": [
    { "start": 3.24, "end": 18.90, "reason": "hook — the AI-edited-this claim" },
    { "start": 22.10, "end": 47.55, "reason": "point 1: what claude does" }
  ]
}
```

### Cut rules

Cut these OUT (don't include in clips):
- **False starts** — sentences the user restarts (e.g. "So the — actually let me start again").
- **Filler** — long "um", "uh", "like", "you know" that stall the flow. Keep them if they read as natural pacing.
- **Retakes** — when the user says the same thing twice, keep the better take (usually the second, more confident one). Judge from wording, not just order.
- **Dead air** — pauses longer than ~0.8s where nothing is being said.
- **Off-topic tangents** — asides that don't serve the video's point.

Keep these IN:
- The hook (usually the first strong sentence — often after 1–3 false starts).
- Clear points that make it to a full sentence.
- Small breaths and short pauses (<0.5s) — cutting them makes the video feel unnatural.

### Timing rules

- `start` and `end` are seconds (floats). Use the word timings from the transcript directly.
- Add ~150ms of padding at the start of each clip and ~200ms at the end, so cuts don't clip the first/last consonant. Don't overlap clips.
- Never cut mid-word.
- Prefer cutting on a natural pause boundary over cutting on an exact word boundary — it sounds better.

### Report back

When you're done writing `cuts.json`, tell the user in one line:
- How many clips
- Total kept duration vs original duration
- The 2–3 biggest cuts and why (so they can override if you were wrong)

Then wait — don't run `npm run cut` yourself unless they say so.

## v2 (later)

- Rebuild caption timings from the cut master, not the original transcript.
- Auto-zoom on the speaker's face during emphasis moments.
- B-roll injection at points where you have a matching stock clip.
- Sound-effect placement on specific words ("boom", "wait", etc.).
