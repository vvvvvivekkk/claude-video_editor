// scripts/punch.js
// Punch-in zooms on emphasis moments (spec item 4).
//
// Reads data/punches.json (written by the focus-director agent):
//   {
//     "punches": [
//       { "start": 4.10, "end": 6.20, "scale": 1.15, "focusY": 0.38, "word": "shipped" },
//       { "start": 9.80, "end": 11.0, "scale": 1.25, "focusY": 0.35, "word": "500" }
//     ]
//   }
// Times are MASTER time (after cuts). focusY is where the face sits vertically
// (0 = top, 1 = bottom); 0.35–0.45 for a normal talking-head frame. Optional
// focusX defaults to 0.5.
//
// Style: hard-cut punch-in (the standard jump-cut zoom on reels). The frame
// snaps to the zoomed framing at `start` and snaps back at `end`. Add
// "ease": true on a punch for a smooth 250ms push-in instead.
//
// Usage:  npm run punch
// Reads the current master, writes output/punched.mp4, advances the chain.

import fs from 'node:fs';
import { getMaster, setMaster, run, ENC, probe } from './lib/master.js';

const PATH = 'data/punches.json';
if (!fs.existsSync(PATH)) {
  console.error(`Missing ${PATH}. Ask Claude Code: /punch (the focus-director agent writes it).`);
  process.exit(1);
}
const { punches = [] } = JSON.parse(fs.readFileSync(PATH, 'utf8'));
if (!punches.length) { console.log('No punch-ins planned — nothing to do.'); process.exit(0); }

const input = getMaster('punch');
const { w: W, h: H, duration } = probe(input);
const out = 'output/punched.mp4';

// Sort, validate, clamp.
const ps = punches
  .map((p) => ({ ...p, start: Math.max(0, +p.start), end: Math.min(duration, +p.end) }))
  .filter((p) => p.end - p.start >= 0.2)
  .sort((x, y) => x.start - y.start);
for (let i = 1; i < ps.length; i++) {
  if (ps[i].start < ps[i - 1].end) {
    console.error(`Punches overlap: ${ps[i - 1].start}-${ps[i - 1].end} and ${ps[i].start}-${ps[i].end}`);
    process.exit(1);
  }
}

// Build segments: normal / zoomed alternating, covering the whole video.
const segs = [];
let t = 0;
for (const p of ps) {
  if (p.start > t + 0.001) segs.push({ start: t, end: p.start, zoom: null });
  segs.push({ start: p.start, end: p.end, zoom: p });
  t = p.end;
}
if (t < duration - 0.001) segs.push({ start: t, end: duration, zoom: null });

const even = (n) => Math.round(n / 2) * 2;
let graph = `[0:v]split=${segs.length}${segs.map((_, i) => `[s${i}]`).join('')};`;
segs.forEach((s, i) => {
  let f = `[s${i}]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS`;
  if (s.zoom) {
    const sc = Math.min(Math.max(+s.zoom.scale || 1.15, 1.03), 1.6);
    const cw = even(W / sc), ch = even(H / sc);
    const fx = s.zoom.focusX ?? 0.5, fy = s.zoom.focusY ?? 0.4;
    const x = Math.round(Math.min(Math.max(fx * W - cw / 2, 0), W - cw));
    const y = Math.round(Math.min(Math.max(fy * H - ch / 2, 0), H - ch));
    if (s.zoom.ease) {
      // Smooth push: scale ramps 1 -> sc over 0.25s, then holds.
      const z = `(1+(${sc}-1)*min(t/0.25\\,1))`;
      f += `,scale=w='iw*${z}':h='ih*${z}':eval=frame,crop=${W}:${H}:'(iw-${W})*${fx}':'(ih-${H})*${fy}'`;
    } else {
      f += `,crop=${cw}:${ch}:${x}:${y},scale=${W}:${H}:flags=lanczos`;
    }
  }
  f += `,setsar=1[v${i}];`;
  graph += f;
});
graph += `${segs.map((_, i) => `[v${i}]`).join('')}concat=n=${segs.length}:v=1:a=0[outv]`;

console.log(`Input: ${input}  (${W}x${H}, ${duration.toFixed(2)}s)`);
console.log(`Punch-ins: ${ps.length}`);
ps.forEach((p) => console.log(`  ${p.start.toFixed(2)}-${p.end.toFixed(2)}s  x${p.scale}  "${p.word ?? ''}"`));
run('ffmpeg', ['-y', '-i', input, '-filter_complex', graph, '-map', '[outv]', '-map', '0:a?',
  ...ENC, '-c:a', 'copy', out], 'ffmpeg punch-in');

setMaster(out, 'punch');
console.log(`\nDone: ${out}`);
