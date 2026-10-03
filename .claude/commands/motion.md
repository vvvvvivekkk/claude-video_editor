---
description: Scaffold a motion-graphics project (pop-ups, counters, badges) for an existing cut master
argument-hint: <project-name> [--style liquid-glass|kinetic-type|editorial-grain|pop-bold]
---

Set up and author the motion-graphics overlay for the current cut master.

## Steps

1. **Verify prerequisites.** Confirm `output/edited-master.mp4` exists and `data/cuts.json` is current. If either is missing, stop and tell the user to run `/edit` or `/cuts` first.

2. **Install HyperFrames if needed.** If `node_modules/hyperframes` does not exist, run `npm run motion:setup`.

3. **Scaffold the project.** Run `npm run motion -- $ARGUMENTS`. Parse the project name and style from `$ARGUMENTS`. Confirm `motion/projects/<name>/PROMPT.md` exists.

4. **Delegate the overlay authoring.** Launch the `motion-director` subagent (Agent tool, `subagent_type: motion-director`) with the project path. It:
   - Reads `PROMPT.md` for the style brief and source-time → master-time mapping
   - Reads `data/<name>.transcript.json` for word timings on the cut master
   - Writes the HyperFrames HTML/CSS/JS to animate pop-ups, counters, cards, and badges word-anchored to the speech
   - Invokes `npx hyperframes render` to produce `renders/overlay.mov` (transparent ProRes 4444; or `renders/overlay-black.mp4` + the screen-blend fallback if alpha is unavailable)
   - Reports back with event count, biggest moments, and file size

5. **Compose onto the master.** Run `npm run compose -- <project-name>`. Confirm `output/with-graphics.mp4` exists.

6. **Report.** Tell the user what landed where, and remind them to re-run `/caption` or `npm run caption` to burn kinetic captions on top.

## Rules

- Never author the overlay yourself in this orchestrating session. Always delegate to `motion-director` so the editorial decisions and the content assembly are kept apart.
- If HyperFrames fails to produce alpha output, do not try to patch the renderer. Fall back to the black-background render + screen blend in compose.js, which already has that path.
