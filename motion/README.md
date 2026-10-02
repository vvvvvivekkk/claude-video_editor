# The motion stage

This is the second stage of the pipeline. It adds animated graphics (cards,
counters, checklists, stat reveals) to the cut master before captions burn
in. Rendering is done by [HyperFrames](https://github.com/HeyGen-Official/hyperframes),
HeyGen's open-source HTML-to-video tool. Claude authors the HTML; HyperFrames
turns it into a transparent `.mov`; `scripts/compose.js` overlays it onto
the cut master.

Approach adapted from Damiano Caudullo's *Motion Graphics with Claude Code*
PDF (every prompt in that guide was tested before publication).

## What's in here

```
motion/
  BASE_PROMPT.md      the overlay-on-video prompt Claude feeds HyperFrames
  MOVES.md            the 10 named motion moves (rise, pop, count-up, ...)
  styles/             4 reusable style blocks you paste under BASE_PROMPT
    kinetic-type.md
    liquid-glass.md
    editorial-grain.md
    pop-bold.md
  fonts/              drop .woff2 files in here; styles reference them by path
  sfx/                9 click/pop sounds (see sfx/README.md to generate them)
  projects/           one subfolder per video — HyperFrames project lives here
```

## The workflow

Once per machine (installs Node 22+, ffmpeg, whisper-cpp, HyperFrames skills):

```powershell
npm run motion:setup
```

Per video, after `npm run cut` has produced `output/edited-master.mp4`:

```powershell
npm run motion -- reel1
```

That scaffolds `motion/projects/reel1/`, drops the base prompt and the style
you pick into `motion/projects/reel1/PROMPT.md`, and prints the one-liner to
hand Claude Code. Then open Claude Code *inside* `motion/projects/reel1/`
and tell it:

> Follow PROMPT.md.

Claude transcribes the cut master, authors `index.html` with GSAP animations
on the exact words, renders the transparent `renders/overlay.mov`, and
reports back. Preview it, iterate ("make the stat pop at *forty a week*,
not *week*"), re-render.

When happy, back in the repo root:

```powershell
npm run compose -- reel1
```

This overlays `motion/projects/reel1/renders/overlay.mov` onto
`output/edited-master.mp4` and writes `output/with-graphics.mp4`. Then run
the usual caption step on that:

```powershell
npm run caption -- data/reel1.transcript.json
```

(Captions still burn into `output/with-graphics.mp4` → `output/final.mp4`.)

## Fonts

The style blocks reference specific free fonts. Download the `.woff2` files
once and drop them in `motion/fonts/`:

- **Inter** (400, 700) — rsms.me/inter
- **Archivo Black** (400) — Google Fonts
- **Instrument Serif** (400, 400-italic) — Google Fonts
- **Bricolage Grotesque** (800) — Google Fonts

Each HyperFrames project copies the fonts folder it needs. The PDF guide
ships a ready-to-use fonts folder — grab it from the kit if you have it.

## SFX

See `sfx/README.md` for the convention (9 generated clicks, no whooshes,
quiet under voice).

## Styles — quick reference

| Style           | Use for                               |
|-----------------|---------------------------------------|
| Kinetic Type    | Hooks, ad-style scripts.              |
| Liquid Glass    | Default. Closest to Damiano's reels.  |
| Editorial Grain | Stories, opinions, personal essays.   |
| Pop Bold        | Ads, promos, scroll-stoppers.         |

See each file in `styles/` for the full block, including overlay-specific
notes (frosted glass loses its blur on transparent exports — switch to solid
cards for Liquid Glass overlays).
