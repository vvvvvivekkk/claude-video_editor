---
description: Consistent color look + iPhone HDR fix + optional 1080p downscale
argument-hint: [natural|punchy|warm|cool|bw|none]
---
Run `npm run color -- --look <look> --size 1080`, where <look> is "$ARGUMENTS" (default punchy if empty). Say whether HDR was detected and tonemapped. Keep looks subtle — if the user asks for "more", step natural → punchy, never stack passes (re-running rewinds automatically).
