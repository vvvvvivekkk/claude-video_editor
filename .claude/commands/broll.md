---
description: Insert b-roll, memes, screenshots and screen recordings from assets/broll/ on the words they match
---
1. List `assets/broll/`. If empty: stop, explain that filenames are the description (e.g. `venkatesh-mistake.mp4`, `yc-logo.png`) and ask the user to add a few.
2. Make sure the master-time transcript exists (`npm run realign -- ...`).
3. Subagent `broll-curator` writes `data/broll.json`.
4. `npm run broll`. Report inserts + the agent's wishlist of clips worth adding to the library.
