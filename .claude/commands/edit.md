---
description: Full edit — raw video to a posted-ready reel. Runs the whole editor team stage by stage.
argument-hint: input/<file>.mp4 [reel|short|youtube]
---

Edit `$ARGUMENTS` end to end. You are the producer: run deterministic scripts yourself, delegate every creative decision to the right subagent (Agent tool, `subagent_type: <name>`). Keep a task list so the user can see progress. Between stages give a one-line status, not a recap.

**Step 0 — context.** Read `channel/CHANNEL.md`, `channel/glossary.txt` and `briefs/<name>.md`. If there is no brief, run the `/brief` flow first (transcribe, pre-fill, ask ≤4 questions) — it's the single biggest quality lever. Pass the brief path to every subagent. The brief's §9 Vibe answers the questions below; only ask what it leaves open.

Ask the user ONCE at the start (AskUserQuestion if available, else plain text), then don't stop again unless something fails:
- Format: Reel/Short (default) or long-form YouTube
- Motion graphics (pop-ups/counters/cards via HyperFrames)? default: no on the first pass — it's the slowest stage
- Music: which file in `assets/music/` (or none)
- Look: natural / punchy (default) / warm / cool / bw

## Stages (skip any whose output already exists and is newer than its input, unless the user asked to redo it)

1. **Transcribe** — `npm run transcribe -- <input>` → `data/<name>.transcript.json`
2. **Story + cuts** — subagent `editor` → `data/story.json`, `data/cuts.json`, `data/transitions.json`. Relay its report (hook, durations, flags).
3. **Cut** — `npm run cut -- <input>` (uses `lcut` from cuts.json) → `output/edited-master.mp4`
4. **Realign** — `npm run realign -- data/<name>.transcript.json` → `data/<name>.cut-transcript.json` (everything below uses master time; applies `data/<name>.corrections.json` spelling fixes so captions are right)
5. **Color** — `npm run color -- --look <look> --size 1080` (also fixes iPhone HDR and makes every later stage ~4x faster)
6. **Punch-ins** — subagent `focus-director` → `data/punches.json`; then `npm run punch`
7. **B-roll** — subagent `broll-curator` → `data/broll.json`; then `npm run broll`. If `assets/broll/` is empty, skip and tell the user what to add (the agent's wishlist).
8. **Motion graphics** (only if chosen) — `/motion <name>` flow → `npm run compose -- <name>`
9. **Transitions** — `npm run transitions` (no-op if the editor chose none)
10. **Sound** — if `assets/sfx/` is empty: `npm run sfx:gen`. Subagent `sound-designer` → `data/sfx.json` + music advice. Then `npm run sfx`
11. **Music** — if a track was chosen: `npm run music -- --track <file> --gain <dB>` (optionally `/beats` first)
12. **Captions** — `npm run caption -- data/<name>.cut-transcript.json --style highlight` (or `pop` if the user prefers one-word)
13. **Export** — `npm run export -- --platform <reels|shorts|youtube> --name <name>`
14. **Review** — `npm run review -- output/export/<name>.mp4`, then subagent `reviewer`. Show its notes. If its verdict is "one more pass", offer to apply the top 3 fixes (re-run only the affected stages — every stage re-runs cleanly from its own input).

## Rules
- **Re-running any stage drops every stage after it from the chain** (that's how effects never stack). So after ANY re-run — including reviewer fixes — re-run all later stages in canonical order: compose → transitions → sfx → music → caption → export. Never export without sfx and caption in the chain.
- Before the final message, run `npm run status` and check it says READY. If it lists missing stages, run them, then export again.
- Every render script reads the newest master from `data/master.json` and advances it. Re-running a stage rewinds to just before it automatically — you never need to manage filenames.
- Order matters for video stages: cut → color → punch → broll → compose → transitions → sfx → music → caption. Audio stages can be redone any time after.
- If a script fails, stop and show the last lines of the error. Don't retry blindly; don't edit render scripts mid-edit.
- Final message: path of the export, length, the `npm run status` stage line, and the reviewer's verdict. Nothing else.
