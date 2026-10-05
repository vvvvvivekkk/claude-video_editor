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
//
// Options:
//   --lcut 0.12   L-cut: each clip's audio runs 0.12s past its picture and
//                 crossfades into the next clip. Smooths every jump cut and
//                 kills clicks at the joins. Default 0 (hard audio cuts).
//                 The editor agent may also set "lcut" at the top of cuts.json.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { setMaster } from './lib/master.js';

const inputVideo = process.argv[2];
if (!inputVideo) {
  console.error('Usage: node scripts/cut.js <path-to-video> [--lcut 0.12]');
  process.exit(1);
}
const argv = process.argv.slice(2);
const lcutFlag = argv.indexOf('--lcut');

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

const L = Math.max(0, parseFloat(lcutFlag >= 0 ? argv[lcutFlag + 1] : (cuts.lcut ?? 0)) || 0);
if (L > 0) console.log(`L-cut: ${L}s audio overlap at every join`);

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
    ...(L > 0 ? ['-an'] : ['-c:a', 'aac', '-b:a', '192k']),
    '-avoid_negative_ts', 'make_zero',
    out,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (r.status !== 0) {
    console.error(`Clip ${i} failed`);
    process.exit(1);
  }
  if (L > 0) {
    // Audio for this clip, with an L-second tail (except the last clip).
    const tail = i < cuts.clips.length - 1 ? L : 0;
    const a = spawnSync('ffmpeg', [
      '-y', '-ss', String(clip.start), '-i', inputVideo,
      '-t', (clip.end - clip.start + tail).toFixed(3),
      '-vn', '-ar', '48000', '-c:a', 'pcm_s16le',
      path.join(tmpDir, `audio_${String(i).padStart(3, '0')}.wav`),
    ], { stdio: ['ignore', 'ignore', 'inherit'] });
    if (a.status !== 0) { console.error(`Audio ${i} failed`); process.exit(1); }
  }
  listLines.push(`file '${path.resolve(out).replace(/'/g, "'\\''")}'`);
});

// 2. Concat.
const listFile = path.join(tmpDir, 'concat.txt');
fs.writeFileSync(listFile, listLines.join('\n'));
const finalOut = path.join('output', 'edited-master.mp4');
console.log(`\nConcatenating -> ${finalOut}`);
const catOut = L > 0 ? path.join(tmpDir, 'video-only.mp4') : finalOut;
const cat = spawnSync('ffmpeg', [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', listFile,
  '-c', 'copy',
  catOut,
], { stdio: 'inherit' });
if (cat.status !== 0) {
  console.error('Concat failed');
  process.exit(1);
}

if (L > 0) {
  // Chain acrossfades: each join overlaps by L, so total audio length equals
  // the sum of the picture durations.
  const n = cuts.clips.length;
  const inputs = [];
  for (let i = 0; i < n; i++) inputs.push('-i', path.join(tmpDir, `audio_${String(i).padStart(3, '0')}.wav`));
  let graph = '';
  // Input 0 is the video; audio clips are inputs 1..n.
  let prev = '1:a';
  for (let i = 1; i < n; i++) {
    const outLbl = i === n - 1 ? 'aout' : `x${i}`;
    graph += `[${prev}][${i + 1}:a]acrossfade=d=${L}:c1=tri:c2=tri[${outLbl}];`;
    prev = outLbl;
  }
  if (n === 1) graph = '[1:a]anull[aout];';
  const mux = spawnSync('ffmpeg', [
    '-y', '-i', catOut, ...inputs,
    '-filter_complex', graph.replace(/;$/, ''),
    '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
    finalOut,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (mux.status !== 0) { console.error('L-cut audio mux failed'); process.exit(1); }
}

setMaster(finalOut, 'cut', true);
console.log(`\nDone: ${finalOut}`);
console.log(`Next: npm run color / punch / broll / sfx / music / caption (any order you need; each reads the newest master)`);
