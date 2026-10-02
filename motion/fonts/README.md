# fonts/

Drop `.woff2` files in here. The motion style blocks reference them by
relative path (e.g. `fonts/Inter-700.woff2`). When `npm run motion -- NAME`
scaffolds a project folder, it copies this folder into the project so the
font paths resolve.

What the four style blocks need:

- **Inter** (400, 700) — Liquid Glass, Editorial Grain small text
- **Archivo Black** (400) — Kinetic Type
- **Instrument Serif** (400 + 400 italic) — Editorial Grain headlines
- **Bricolage Grotesque** (800) — Pop Bold

Grab them free from:
- Inter: https://rsms.me/inter
- Archivo Black / Instrument Serif / Bricolage Grotesque: Google Fonts

If a font is missing, HyperFrames falls back to the system default and the
look breaks. Say in the prompt: *"use the font file in fonts/"*.
