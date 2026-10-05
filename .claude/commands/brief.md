---
description: Write the per-video brief — what the transcript can't tell the editor (point, hook, must-keep lines, visuals, spellings)
argument-hint: input/<file>.mp4
---

Create or update `briefs/<name>.md` for `$ARGUMENTS` (`<name>` = the input filename without extension).

1. Read `channel/CHANNEL.md` and `channel/glossary.txt` so you don't ask what's already known.
2. If `data/<name>.transcript.json` exists, read it and pre-fill a draft from `briefs/_TEMPLATE.md`: your best guess at the topic, audience, hook line, CTA, candidate "when I say X, show Y" moments, and any words that look mis-transcribed. Mark every guess with `(guess)`.
   If there's no transcript yet, run `npm run transcribe -- $ARGUMENTS` first — it takes seconds and makes the questions much better.
3. Ask the user only what you can't infer — at most 4 questions in one go (AskUserQuestion if available): the point of the video, the CTA, which visuals/memes they had in mind, anything to avoid. Offer your guesses as options.
4. Write `briefs/<name>.md`. Remove `(guess)` markers the user confirmed; keep the ones they didn't answer.
5. If you spotted mis-transcriptions, also write `data/<name>.corrections.json` (`{ "cloud code": "Claude Code" }`) and add any new proper nouns to `channel/glossary.txt` so the next video is transcribed right.
6. One-line summary of the brief, then: "Run /edit $ARGUMENTS when ready."
