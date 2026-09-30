# Claude Video Editor — Windows quickstart

Raw video in, Claude decides the cuts, ffmpeg renders. English talking-head, IG Reels / YouTube.

## One-time setup (15 minutes)

### 1. Install ffmpeg on Windows

The easiest way — open **PowerShell as Administrator** and run:

```powershell
winget install "FFmpeg (Essentials Build)"
```

Close and reopen PowerShell, then verify:

```powershell
ffmpeg -version
```

You should see a version banner. If "not recognized", restart your terminal or reboot.

### 2. Get a free Groq API key

1. Go to https://console.groq.com/keys
2. Sign in (Google works).
3. Click "Create API Key" — copy it (starts with `gsk_...`).

Groq's free tier gives you ~14,400 transcription seconds/day. That's ~4 hours of raw footage per day, free.

### 3. Install project deps

In this folder:

```powershell
npm install
```

### 4. Add your key

Create a file called `.env` in this folder (same level as `package.json`) with:

```
GROQ_API_KEY=gsk_your_key_here
```

### 5. Install Claude Code

If you don't have it yet:

```powershell
npm install -g @anthropic-ai/claude-code
```

Then in this folder:

```powershell
claude
```

Claude Code will read `CLAUDE.md` automatically and know how to edit your videos.

---

## Editing your first video

1. Drop your raw recording into `input/` — e.g. `input/reel1.mp4`.

2. **Transcribe:**
   ```powershell
   npm run transcribe -- input/reel1.mp4
   ```
   Produces `data/reel1.transcript.json` with word-level timestamps.

3. **Ask Claude Code to author the cuts.** In Claude Code, say:
   > "Read data/reel1.transcript.json and write cuts.json. This is for a 60-second IG Reel — hook in the first 3 seconds, tight pacing, no filler."

   Claude will read the transcript, decide what to cut, write `data/cuts.json`, and tell you what it removed and why.

4. **Render the cut:**
   ```powershell
   npm run cut -- input/reel1.mp4
   ```
   Produces `output/edited-master.mp4`.

5. **Add captions:**
   ```powershell
   npm run caption -- data/reel1.transcript.json
   ```
   Produces `output/final.mp4` with burned-in TikTok-style captions.

6. Watch it. If something's off, tell Claude what to change ("clip 4 is dead — cut it", "keep the joke at 32s"), and Claude will rewrite `cuts.json`. Then re-run steps 4 and 5.

---

## Folder layout

```
input/    -> your raw .mp4 files (git-ignored)
data/     -> transcripts, cuts.json, captions.ass (intermediates)
output/   -> edited-master.mp4, final.mp4
scripts/  -> the pipeline (transcribe, cut, caption)
CLAUDE.md -> instructions Claude Code follows to make cut decisions
```

## Aspect ratio

`scripts/caption.js` defaults to **1080x1920 vertical** (Reels / Shorts). For YouTube 16:9, change these lines in `caption.js`:

```
PlayResX: 1920
PlayResY: 1080
```

and change `MarginV: 300` (bottom margin) to `MarginV: 100`.

## Common issues

- **`'ffmpeg' is not recognized`** — restart PowerShell after installing.
- **`Missing GROQ_API_KEY`** — `.env` file isn't in the project root, or the key name is misspelled.
- **Captions run off-screen** — you're on a horizontal video with the default vertical settings. Change `PlayResX/Y` in `caption.js`.
- **First transcription fails** — the file might be too big. Groq caps at 25MB per upload. `scripts/transcribe.js` already downsamples to mono 16kHz mp3, so a 30-minute talking-head fits fine.

## What Claude Code does vs what you do

- **Claude authors `cuts.json`** — the editorial decisions. That's the hard part.
- **You run `npm run cut` and `npm run caption`** — the deterministic render.
- **You give Claude feedback** — "cut clip 6, it's a false start" — and Claude rewrites `cuts.json`.

Nothing here uses Claude to render pixels. The judgment is Claude's; the rendering is ffmpeg's. That's what makes it reliable.
