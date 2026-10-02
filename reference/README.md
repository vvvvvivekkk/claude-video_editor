# reference/

Downloaded videos you want to edit *like*. Not source footage, not final
output — just examples. One subfolder per reference:

```
reference/
  damianodesu-this-is-how-i-edit/
    video.mp4          the downloaded clip
    transcript.json    word-level, from Groq Whisper
    info.json          title, uploader, duration, url, upload date
```

## Adding one

```bash
npm run reference -- https://www.instagram.com/reel/XXXX/
```

Works on anything yt-dlp supports: YouTube, Instagram Reels, TikTok, Twitter,
Vimeo, etc. The folder name is auto-generated from uploader + title. Pass
`--name my-name` to override, or `--no-transcribe` to skip the Whisper step.

## Using one

In Claude Code, when you ask it to make cuts, name the reference:

> "Make cuts for input/reel1.mp4 — I want it to feel like
> reference/damianodesu-this-is-how-i-edit/. Match the hook pattern and the
> rhythm of the cuts."

Claude reads the reference transcript (and can watch frames if you also ran
`npm run watch -- reference/.../video.mp4`), extracts the structural pattern,
and applies it to your raw.

## Why not just paste a URL into chat?

Because Claude needs the actual word timings and (optionally) the frames to
reason about pacing. A URL alone is a vibe; a transcript is structure. The
reference folder also stays local, so Claude Code reads it instantly without
burning turns on web fetching.
