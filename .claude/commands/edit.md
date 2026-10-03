---
description: Full pipeline — raw video to finished reel with motion graphics and kinetic captions
argument-hint: input/<file>.mp4
---

End-to-end edit of the raw video at `$ARGUMENTS`. Run every stage in order, pausing only where editorial judgment is yours.

## Pipeline

1. **Transcribe.** Run `npm run transcribe -- $ARGUMENTS`. Confirm `data/<name>.transcript.json` exists.

2. **Author cuts.** Delegate to the `editor` subagent (via Agent tool, `subagent_type: editor`). Pass it the transcript path and the target format (ask the user: Reel/Short vs long-form YouTube). The agent writes `data/cuts.json` and reports back.

3. **Render the cut master.** Run `npm run cut -- $ARGUMENTS`. Confirm `output/edited-master.mp4` exists.

4. **Ask the user:** "Add motion graphics (pop-ups, counters, badges)? [y/N]". If no, skip to step 7.

5. **Scaffold motion project.** Run `npm run motion -- <project-name> --style <style>`. Ask the user for the project name (default: the input filename stem) and style (default: liquid-glass). Styles available: liquid-glass, kinetic-type, editorial-grain, pop-bold.

6. **Author the overlay.** Delegate to the `motion-director` subagent. It reads `motion/projects/<project-name>/PROMPT.md`, writes the overlay HTML, invokes HyperFrames to render `overlay.mov`, and reports back. Then run `npm run compose -- <project-name>`.

7. **Burn kinetic captions.** Run `npm run caption -- data/<name>.transcript.json`. The caption script auto-detects whether motion ran and burns onto the right master.

8. **Report.** Tell the user the final file is `output/final.mp4` and what each stage produced (durations, counts). Offer to iterate on any stage.

## Rules

- Do not run `npm run cut` or `npm run compose` before their inputs exist. Check.
- Do not re-run a stage that already succeeded unless the user asks.
- At each pause, give the user a one-line summary of what just happened before asking for input.
- If any ffmpeg or node call fails, stop and show the error — do not retry blindly.
