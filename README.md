# Claude Video Editor

Raw video in → Claude authors the cuts → ffmpeg renders → Claude authors motion graphics (HyperFrames) → ffmpeg composites → captions burn in. English talking-head, IG Reels / YouTube.

Three stages, with two optional pre-cut inputs that make the cuts smarter:

0. **Reference** *(optional)* — download a reel you want to edit *like*, so Claude has structure to pattern-match against
0. **Watch** *(optional)* — sample frames from your raw so Claude can SEE what's on screen, not just read the transcript
1. **Cut** — transcribe + Claude writes `cuts.json` + ffmpeg renders `edited-master.mp4`
2. **Motion** *(optional)* — HyperFrames overlay authored in Claude Code, composited onto the master
3. **Caption** — TikTok-style burned-in captions on whatever's at `output/with-graphics.mp4` or `output/edited-master.mp4`

The motion stage is adapted from Damiano Caudullo's [*Motion Graphics with Claude Code*](https://damianodesu.com) PDF — 4 reusable style blocks, 10 named motion moves, transcript-anchored timing, strict safe zones, generated SFX.

---

## One-time setup

### 1. Install ffmpeg

**Windows (PowerShell as Admin):**

```powershell
winget install "FFmpeg (Essentials Build)"
```

**macOS:**

```bash
brew install ffmpeg
```

Verify with `ffmpeg -version`. Restart your terminal if "not recognized".

### 2. Get a free Groq API key

1. https://console.groq.com/keys → sign in with Google
2. Create API Key → copy (starts with `gsk_...`)

Free tier: ~14,400 transcription seconds/day (~4 hours of raw footage).

### 3. Install project deps

```bash
npm install
```

### 4. Add your key

Create `.env` in the project root:

```
GROQ_API_KEY=gsk_your_key_here
```

### 5. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Then in this folder:

```bash
claude
```

Claude Code reads `CLAUDE.md` automatically and will know how to drive both the cut stage and the motion stage.

### 6. (Optional) Set up the motion stage

Only needed if you want HyperFrames motion graphics on your videos:

```bash
npm run motion:setup
```

Checks Node 22+, ffmpeg, whisper-cpp, then installs the HyperFrames Claude Code skills and runs `npx hyperframes doctor`. One-time per machine. **Restart Claude Code after** — the new skills only load on a fresh start.

Then grab the fonts (Inter, Archivo Black, Instrument Serif, Bricolage Grotesque — all free) and drop the `.woff2` files into `motion/fonts/`. See `motion/fonts/README.md`.

### 7. (Optional) Install yt-dlp for the reference stage

Only needed if you want to download reels to edit *like*:

```bash
# macOS
brew install yt-dlp

# Windows
winget install yt-dlp

# Linux
pip install -U yt-dlp
```

---

## Editing a video — the fast path

### Stage 0 (optional): grab a reference and sample frames

```bash
# Grab a reel to edit like
npm run reference -- https://www.instagram.com/reel/XXXX/
# → reference/<auto-name>/{video.mp4, transcript.json, info.json}

# After you drop your raw in input/, let Claude see it too
npm run watch -- input/reel1.mp4
# → data/reel1-frames/*.jpg + data/reel1.watch.json  (one frame every 2s)

# Or one frame per spoken word, for tight work:
npm run watch -- input/reel1.mp4 --at-words
```

### Stage 1: cut

```bash
# 1. Drop your raw recording into input/
cp ~/Downloads/reel1.mp4 input/

# 2. Transcribe
npm run transcribe -- input/reel1.mp4

# 3. In Claude Code, say:
#    "Read data/reel1.transcript.json and write cuts.json. 60-second
#     IG Reel — hook in the first 3 seconds, tight pacing, no filler."
#
#    If you ran `watch` and/or `reference`, say that too:
#    "Use data/reel1.watch.json for the frames. Edit it like
#     reference/damianodesu-this-is-how-i-edit/."
#
#    Claude writes data/cuts.json and reports what it cut.

# 4. Render the cut
npm run cut -- input/reel1.mp4
# → output/edited-master.mp4
```

If you don't want graphics, skip to **Stage 3**.

### Stage 2: motion graphics (optional)

```bash
# 1. Scaffold a motion project (pick a style)
npm run motion -- reel1 --style liquid-glass
# Styles: liquid-glass (default), kinetic-type, editorial-grain, pop-bold

# 2. Open Claude Code INSIDE the project folder
cd motion/projects/reel1
claude
# Say: "Follow PROMPT.md."
# Claude transcribes the cut master, authors HTML with GSAP animations
# anchored to the exact words, renders renders/overlay.mov (transparent).
# Preview renders/overlay-preview.mp4 — iterate until happy.

# 3. Back in the repo root, composite
cd ../../..
npm run compose -- reel1
# → output/with-graphics.mp4
```

### Stage 3: captions

```bash
npm run caption -- data/reel1.transcript.json
# → output/final.mp4   (motion graphics + burned-in captions)
```

Captions auto-prefer `with-graphics.mp4` over `edited-master.mp4`, so this works whether or not you ran the motion stage.

---

## Iteration

- **Editorial change** ("cut clip 4, keep the joke at 32s"): tell Claude Code, it rewrites `data/cuts.json`. Re-run `cut` → `compose` → `caption`.
- **Motion change** ("pop the stat a word earlier", "use reframe here instead"): tell Claude Code inside the project folder. It edits the HyperFrames source and re-renders `overlay.mov`. Then re-run `compose` → `caption`.
- **Different style**: scaffold a new project with `--style <other>` and author again. Old projects stay around; they're small.

Say the moment in **words**, not seconds — *"when I say forty a week"* works better than *"at 16.8s"*. Claude finds it in the transcript.

---

## Folder layout

```
input/              raw .mp4 files (git-ignored)
reference/          downloaded reels you want to edit *like* (git-ignored)
data/               transcripts, cuts.json, captions.ass, frame samples (intermediates)
output/             edited-master.mp4, with-graphics.mp4, final.mp4
scripts/            the pipeline (reference, transcribe, watch, cut, motion-setup, motion, compose, caption)
motion/
  BASE_PROMPT.md    the overlay-on-video prompt
  MOVES.md          the 10 named motion moves
  styles/           4 reusable style blocks
  fonts/            drop .woff2 files here (git-ignored except README)
  sfx/              9 click/pop sounds (git-ignored except README)
  projects/         one subfolder per video (git-ignored)
CLAUDE.md           full instructions Claude Code follows
```

## Aspect ratio

`scripts/caption.js` defaults to **1080x1920 vertical** (Reels / Shorts). For YouTube 16:9, edit the top of `caption.js`:

```
PlayResX: 1920
PlayResY: 1080
```

and change `MarginV: 300` to `MarginV: 100`.

If you also want horizontal motion graphics, pass `--master` to `compose` and tell Claude in the motion project the master is 1920x1080 so it builds the overlay at that size.

## The styles at a glance

| Style             | Vibe                        | Use for                               |
|-------------------|-----------------------------|---------------------------------------|
| `liquid-glass`    | Apple, frosted, calm        | Default. Designed. Your usual reels.  |
| `kinetic-type`    | Huge type, all caps, slam   | Hooks, ad-style scripts.              |
| `editorial-grain` | Serif + paper + film grain  | Stories, opinions, essays.            |
| `pop-bold`        | Neon flat, chunky, bouncy   | Ads, promos, scroll-stoppers.         |

See `motion/styles/*.md` for each full block.

## The 10 moves

**rise** · **pop** · **count-up** · **checklist tick** · **typewriter** · **slide-in** · **blur-in** · **punch-in** · **reframe** · **bar fill**

Name any of them and Claude knows what to do. Mix moves within a video — don't mix styles. Full reference in `motion/MOVES.md`.

## Common issues

- **`'ffmpeg' is not recognized`** — restart your terminal after installing.
- **`Missing GROQ_API_KEY`** — `.env` file isn't in the project root, or the key name is misspelled.
- **Captions run off-screen** — you're on a horizontal video with the default vertical settings. Change `PlayResX/Y` in `caption.js`.
- **First transcription fails** — Groq caps uploads at 25MB. `scripts/transcribe.js` already downsamples to mono 16kHz mp3, so a 30-minute talking-head fits.
- **Overlay looks transparent on top of transparent** — frosted-glass cards have nothing to blur against on an alpha export. If you're using `liquid-glass` for the overlay, tell Claude *"use solid cards for the overlay, not frosted"*. The style file already notes this.
- **`compose` fails** — overlay.mov and master are different resolutions, or overlay isn't ProRes 4444 alpha. Ask Claude in the project folder: *"re-render overlay.mov with the master's exact size and ProRes 4444 alpha"*.
- **Overlay file is huge** (>200MB) — Editorial Grain's film-grain layer makes big files. Tell Claude *"render again with `--crf 23`"*.

## What Claude Code does vs what you do

- **Claude authors `cuts.json`** (editorial, from transcript + optional frames + optional reference) and **the motion overlay HTML** (visual) — the hard parts.
- **You run** `npm run reference`, `npm run watch`, `npm run cut`, `npm run compose`, `npm run caption` — deterministic.
- **You give Claude feedback** — "cut clip 6, false start" / "pop the stat on *forty*, not *week*" — and Claude rewrites the file.

Nothing here uses Claude to render pixels. The judgment is Claude's; the rendering is ffmpeg's and HyperFrames'. That's what makes it reliable.
