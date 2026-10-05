// scripts/broll.js
// B-roll, meme and screen-recording inserts (spec item 6) — "show, don't tell".
//
// Reads data/broll.json (written by the broll-curator agent):
//   {
//     "inserts": [
//       { "file": "assets/broll/vscode-typing.mp4", "start": 10.0, "end": 12.5, "mode": "full" },
//       { "file": "assets/broll/venkatesh-lakshmi.mp4", "start": 4.2, "end": 6.0, "mode": "pip", "clipIn": 1.5 },
//       { "file": "assets/broll/yc-logo.png", "start": 14.0, "end": 15.5, "mode": "card" }
//     ]
//   }
// Times are MASTER time. The speaker's voice always stays underneath; b-roll
// audio is dropped (add "keepAudio": true + "gainDb": -12 to mix a meme's
// own sound under the voice).
//
// Modes:
//   full  covers the whole frame (scale-to-fill + center crop)
//   pip   rounded-ish box in the upper half, ~82% width (keeps the face visible
//         below and stays out of the caption zone)
//   card  same as pip but a still image gets a slow 6% zoom so it's not dead
//
// Images (.png/.jpg/.webp) and videos both work. clipIn = seconds into the
// b-roll file to start from.
//
// Usage:  npm run broll
// Reads the current master, writes output/broll.mp4, advances the chain.

import fs from 'node:fs';
import path from 'node:path';
import { getMaster, setMaster, run, ENC, probe, hasAudio } from './lib/master.js';

const PATH = 'data/broll.json';
if (!fs.existsSync(PATH)) {
  console.error(`Missing ${PATH}. Ask Claude Code: /broll (the broll-curator agent writes it).`);
  process.exit(1);
}
const { inserts = [] } = JSON.parse(fs.readFileSync(PATH, 'utf8'));
if (!inserts.length) { console.log('No b-roll inserts planned — nothing to do.'); process.exit(0); }

const input = getMaster('broll');
const { w: W, h: H, fps } = probe(input);
const out = 'output/broll.mp4';
const isImage = (f) => /\.(png|jpe?g|webp)$/i.test(f);

for (const ins of inserts) {
  if (!fs.existsSync(ins.file)) { console.error(`B-roll file not found: ${ins.file}`); process.exit(1); }
  if (!(ins.end > ins.start)) { console.error(`Bad timing on ${ins.file}`); process.exit(1); }
}

const ffIn = ['-i', input];
let graph = '';
let prev = '0:v';
const audioMix = [];

inserts.forEach((ins, k) => {
  const idx = k + 1;
  const dur = +(ins.end - ins.start).toFixed(3);
  if (isImage(ins.file)) ffIn.push('-loop', '1', '-t', String(dur), '-i', ins.file);
  else ffIn.push('-ss', String(ins.clipIn ?? 0), '-t', String(dur), '-i', ins.file);

  const mode = ins.mode ?? 'full';
  const shift = `setpts=PTS-STARTPTS+${ins.start}/TB`;
  let f;
  if (mode === 'full') {
    f = `[${idx}:v]fps=${fps.toFixed(3)},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,format=yuv420p,${shift}[b${k}];`;
    graph += f + `[${prev}][b${k}]overlay=0:0:enable='between(t,${ins.start},${ins.end})':eof_action=pass[o${k}];`;
  } else {
    const bw = Math.round((W * 0.82) / 2) * 2;
    const bh = Math.round((bw * 9) / 16 / 2) * 2; // 16:9 window
    const zoom = mode === 'card' && isImage(ins.file)
      ? `,scale=w='${bw}*(1+0.06*t/${dur})':h=-2:eval=frame,crop=${bw}:${bh}`
      : '';
    // White 8px frame + soft drop shadow box behind.
    f = `[${idx}:v]fps=${fps.toFixed(3)},scale=${bw}:${bh}:force_original_aspect_ratio=increase,crop=${bw}:${bh}${zoom},setsar=1,`
      + `pad=${bw + 16}:${bh + 16}:8:8:white,format=yuv420p,${shift}[b${k}];`;
    const x = Math.round((W - (bw + 16)) / 2);
    const y = Math.round(H * 0.12);
    graph += f + `[${prev}][b${k}]overlay=${x}:${y}:enable='between(t,${ins.start},${ins.end})':eof_action=pass[o${k}];`;
  }
  prev = `o${k}`;
  if (ins.keepAudio && !isImage(ins.file) && hasAudio(ins.file)) {
    const ms = Math.round(ins.start * 1000);
    graph += `[${idx}:a]volume=${ins.gainDb ?? -12}dB,adelay=${ms}|${ms}[ba${k}];`;
    audioMix.push(`[ba${k}]`);
  }
});

let maps;
if (audioMix.length) {
  graph += `[0:a]${audioMix.join('')}amix=inputs=${audioMix.length + 1}:duration=first:normalize=0[aout]`;
  maps = ['-map', `[${prev}]`, '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k'];
} else {
  graph = graph.replace(/;$/, '');
  maps = ['-map', `[${prev}]`, '-map', '0:a?', '-c:a', 'copy'];
}

console.log(`Input: ${input}`);
inserts.forEach((i) => console.log(`  ${i.start.toFixed(2)}-${i.end.toFixed(2)}s  ${i.mode ?? 'full'}  ${path.basename(i.file)}`));
run('ffmpeg', ['-y', ...ffIn, '-filter_complex', graph, ...maps, ...ENC, out], 'ffmpeg b-roll');

setMaster(out, 'broll');
console.log(`\nDone: ${out}`);
