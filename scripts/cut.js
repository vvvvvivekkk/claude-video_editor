// scripts/cut.js
// Reads data/cuts.json and cuts the original video into a single clean master.
// Uses ffmpeg's concat demuxer with re-encoding to guarantee frame-accurate cuts.
//
// Usage:
//   node scripts/cut.js input/my-video.mp4
//
// Expects data/cuts.json shaped like:
//   {
//     "source": "input/my-video.mp4",
//     "clips": [
//       { "start": 3.24, "end": 18.90, "reason": "hook" },
//       { "start": 22.10, "end": 47.55, "reason": "point 1" }
//     ]
//   }

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const inputVideo = process.argv[2];
if (!inputVideo) {
  console.error('Usage: node scripts/cut.js <path-to-video>');
  process.exit(1);
}

const cutsPath = path.join('data', 'cuts.json');
if (!fs.existsSync(cutsPath)) {
  console.error(`Missing ${cutsPath}. Ask Claude to write it from data/*.transcript.json.`);
  process.exit(1);
}

const cuts = JSON.parse(fs.readFileSync(cutsPath, 'utf8'));
if (!cuts.clips?.length) {
  console.error('cuts.json has no clips[]');
  process.exit(1);
}

const tmpDir = path.join('data', 'tmp-clips');
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

// 1. Extract each clip as its own re-encoded file (frame-accurate).
console.log(`Cutting ${cuts.clips.length} clips...`);
const listLines = [];
cuts.clips.forEach((clip, i) => {
  const out = path.join(tmpDir, `clip_${String(i).padStart(3, '0')}.mp4`);
  const duration = (clip.end - clip.start).toFixed(3);
  console.log(`  [${i + 1}/${cuts.clips.length}] ${clip.start.toFixed(2)}s -> ${clip.end.toFixed(2)}s  (${duration}s)  ${clip.reason ?? ''}`);
  const r = spawnSync('ffmpeg', [
    '-y',
    '-ss', String(clip.start),
    '-i', inputVideo,
    '-t', String(duration),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '20',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-avoid_negative_ts', 'make_zero',
    out,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (r.status !== 0) {
    console.error(`Clip ${i} failed`);
    process.exit(1);
  }
  listLines.push(`file '${path.resolve(out).replace(/'/g, "'\\''")}'`);
});

// 2. Concat.
const listFile = path.join(tmpDir, 'concat.txt');
fs.writeFileSync(listFile, listLines.join('\n'));
const finalOut = path.join('output', 'edited-master.mp4');
console.log(`\nConcatenating -> ${finalOut}`);
const cat = spawnSync('ffmpeg', [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', listFile,
  '-c', 'copy',
  finalOut,
], { stdio: 'inherit' });
if (cat.status !== 0) {
  console.error('Concat failed');
  process.exit(1);
}

console.log(`\nDone: ${finalOut}`);
console.log(`Next: node scripts/caption.js  (adds burned-in captions)`);
