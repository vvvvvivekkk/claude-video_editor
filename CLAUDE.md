# Claude Code instructions for this repo

This repo is a video editor. You (Claude) are the editor. The user records a raw talking-head video; you decide what to cut, what to animate, and how it looks.

## The pipeline

```
input/raw.mp4
   -> npm run transcribe -- input/raw.mp4
   -> data/raw.transcript.json             (word-level, from Groq Whisper)

   -> YOU WRITE: data/cuts.json            (list of good clips)
   -> npm run cut -- input/raw.mp4
   -> output/edited-master.mp4

   -> npm run motion -- raw                (scaffolds motion/projects/raw/)
   -> YOU AUTHOR HyperFrames HTML          (from inside the project folder)
   -> motion/projects/raw/renders/overlay.mov  (transparent, ProRes 4444)
   -> npm run compose -- raw
   -> output/with-graphics.mp4

   -> npm run caption -- data/raw.transcript.json
   -> output/final.mp4                     (motion + burned-in captions)
```

Stages 2 (cuts) and 4 (motion) are **yours** — editorial judgment. Stages 1, 3, 5, 6 (transcribe, cut, compose, caption) are deterministic — the user runs them.

The motion stage is **optional**. If the user doesn't want graphics, skip it; `caption.js` auto-detects whether `with-graphics.mp4` exists and burns onto whichever is newer.

---

## Stage A — Write `data/cuts.json`

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

---

## Stage B — Motion graphics (optional)

When the user says "add motion graphics", "animate this", "put cards on it", "make it an edited reel", or similar, this is the HyperFrames stage.

### 1. Pick the style

Look at the four blocks in `motion/styles/`:

| Style             | Use for                                               |
|-------------------|-------------------------------------------------------|
| `liquid-glass`    | Default. Calm, designed, closest to Damiano's reels.  |
| `kinetic-type`    | Hooks and ad scripts. Text IS the video.              |
| `editorial-grain` | Stories, opinions, personal essays. Serif + grain.    |
| `pop-bold`        | Ads, promos, scroll-stoppers. Loud, flat neon.        |

If the user has a vibe but no name, pick one and say which; let them override. If they say "like my usual reels" and nothing else, use `liquid-glass`.

### 2. Scaffold the project

Tell the user to run:

```powershell
npm run motion -- <project-name> --style <style>
```

That creates `motion/projects/<project-name>/` with:
- `PROMPT.md` — the base overlay prompt with the chosen style block baked in
- `fonts/` — copied from `motion/fonts/`
- `sfx/` — copied from `motion/sfx/`
- `renders/` — empty, HyperFrames will write `overlay.mov` here

### 3. Author the overlay (inside the project folder)

The user opens Claude Code **inside the project folder**. You (that fresh Claude Code session) then:

1. Follow `PROMPT.md`. The base prompt tells you to transcribe the cut master with `npx hyperframes transcribe`, work out which moments matter, and animate on the exact word.

2. Export **transparent** — `renders/overlay.mov` as ProRes 4444 with alpha. Frosted-glass cards (Liquid Glass style) have nothing to blur against on a transparent background — switch them to solid white at ~95% opacity. The style file notes this.

3. Also render `renders/overlay-preview.mp4` (a flat preview over black, or over a still from the master) so the user can eyeball the timing before compositing.

### 4. Safe zones — strict

Where graphics must NOT go:
- First 3 seconds (the hook, don't cover it).
- The speaker's face.
- Bottom third (reserved for burned-in captions — the caption step uses `MarginV: 300` for vertical, `MarginV: 100` for horizontal; see `scripts/caption.js`).
- Left and right 10% of the frame (phone crops).

### 5. The 10 moves

When the user names a move ("add a count-up here", "pop that stat in", "reframe into a card"), use the vocabulary from `motion/MOVES.md`: **rise, pop, count-up, checklist tick, typewriter, slide-in, blur-in, punch-in, reframe, bar fill**. Mix moves within a video; don't mix styles.

### 6. Say the moment in words

When the user tells you where to put a graphic, they say *"when I say forty a week"*, not *"at 16.8s"*. Find it in the transcript. The PDF guide calls this out explicitly — speech-to-text drifts by up to a second, so word-anchoring is more reliable than timecode.

### 7. Report back

When `overlay.mov` is rendered, tell the user:
- How many motion events (counters, cards, ticks, etc.)
- The 2–3 most important moments and the move used
- File size — if the overlay is >200MB (common with Editorial Grain's grain layer), suggest re-rendering the composite with `--crf 23`

Then wait. The user runs `npm run compose -- <project-name>` from the repo root to overlay it onto the master.

### 8. SFX

If sound effects are wanted, add them INSIDE the HyperFrames project, following the rules in `motion/sfx/README.md`:
- A tick when each list item or check appears
- The counter sound while a number rolls
- A chime on the final beat
- **No whooshes. No sound when a card slides in or leaves.**
- All SFX ~20 dB under the voice

If `motion/sfx/` is empty, generate the 9 sounds in code first (prompt is in `motion/sfx/README.md`) or tell the user how.

---

## Stage C — Compose and caption

The user runs these — you don't need to do anything beyond having the overlay ready. For reference:

```powershell
npm run compose -- <project-name>   # overlays overlay.mov onto edited-master.mp4
npm run caption -- data/<name>.transcript.json   # burns captions on top
```

`caption.js` auto-prefers `output/with-graphics.mp4` over `output/edited-master.mp4` if the motion step ran, so captions always land on top of the graphics.

---

## Feedback loop

The point of this repo is iteration. The user sees the final cut, says what's wrong, you rewrite the right file.

- **Editorial feedback** ("clip 4 is dead — cut it", "keep the joke at 32s") → rewrite `data/cuts.json`, user re-runs cut → compose → caption.
- **Motion feedback** ("the stat pops a word too early", "use the reframe here instead of a card") → from inside the project folder, edit the HyperFrames source, re-render → user re-runs compose.
- **Style change** ("try this in editorial grain instead") → scaffold a new project with `--style editorial-grain`, author again. Keep old projects around — they're small.

Never redo everything. The cut rarely changes once it's good; the motion is where most iteration happens.

---

## v3 (later)

- Rebuild caption timings from the cut master, not the original transcript (fixes drift when cuts are heavy).
- Auto-zoom on the speaker's face during emphasis moments.
- B-roll injection at points where you have a matching stock clip.
- A per-project `BRAND.md` with the user's own colour palette and font picks that overrides the chosen style block.
