// scripts/review.js
// Samples frames from the current master (or a given file) so Claude can
// LOOK at the edit and critique it (spec Step 5 — review loop).
//
//   - every 0.5s for the first 3 seconds (the hook)
//   - every 2s after that
//   - one frame just after every cut, punch-in, b-roll and transition
//
// Writes data/review/*.jpg + data/review/index.json  { frames: [{t, file, why}] }
//
// Usage:  npm run review              (current master)
//         npm run review -- output/export/x.mp4

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getMaster, probe, cutBoundaries } from './lib/master.js';

const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : getMaster();
const { duration } = probe(file);
const DIR = path.join('data', 'review');
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });

const marks = new Map();
const add = (t, why) => { t = +Math.min(Math.max(t, 0), duration - 0.05).toFixed(2); if (!marks.has(t)) marks.set(t, why); };
for (let t = 0; t <= 3; t += 0.5) add(t, 'hook');
for (let t = 4; t < duration; t += 2) add(t, 'pacing');
cutBoundaries().forEach((t) => add(t + 0.1, 'after cut'));
const j = (p, k) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8'))[k] ?? [] : []);
j('data/punches.json', 'punches').forEach((p) => add(p.start + 0.2, `punch "${p.word ?? ''}"`));
j('data/broll.json', 'inserts').forEach((b) => add((b.start + b.end) / 2, `b-roll ${path.basename(b.file)}`));
j('data/transitions.json', 'transitions').forEach((tr) => add(tr.at + 0.05, `transition ${tr.type}`));
add(duration - 0.3, 'end frame / CTA');

const frames = [];
for (const [t, why] of [...marks.entries()].sort((x, y) => x[0] - y[0])) {
  const out = path.join(DIR, `t${t.toFixed(2).padStart(6, '0')}.jpg`);
  const r = spawnSync('ffmpeg', ['-y', '-ss', String(t), '-i', file, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '4', out], { stdio: 'ignore' });
  if (r.status === 0) frames.push({ t, file: out, why });
}
fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify({ source: file, duration, frames }, null, 2));
console.log(`Sampled ${frames.length} frames from ${file} -> ${DIR}/`);
console.log('Next: in Claude Code, /review reads them and critiques the edit.');
