// scripts/watch.js
// Samples frames from a video at a chosen cadence (default: every 2s) so
// Claude Code can actually SEE what's on screen when it writes cuts.json.
// Pairs with the word-level transcript — Claude cross-references the frame
// at each word to catch dead eyes, bad gestures, mid-blink moments, b-roll
// gaps, etc. The transcript alone can't catch any of that.
//
// Usage:
//   npm run watch -- input/reel1.mp4                     # every 2s (default)
//   npm run watch -- input/reel1.mp4 --every 1           # every 1s
//   npm run watch -- input/reel1.mp4 --at-words          # one frame per word
//                                                           (uses existing transcript)
//
// Writes:
//   data/<name>-frames/f_000000.00.jpg      (filename is the timestamp)
//   data/<name>-frames/f_000002.00.jpg
//   ...
//   data/<name>.watch.json                   (index: [{t, path}, ...])
//
// Claude Code can read individual frames with the Read tool when authoring
// cuts.json — see CLAUDE.md "Stage A, pre-cut watch" section.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const inputVideo = args[0];
if (!inputVideo || inputVideo.startsWith('--')) {
  console.error('Usage: npm run watch -- <path-to-video> [--every SECONDS] [--at-words]');
  process.exit(1);
}
if (!fs.existsSync(inputVideo)) {
  console.error(`File not found: ${inputVideo}`);
  process.exit(1);
}

function getFlag(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
}
const everyRaw = getFlag('--every');
const every = everyRaw ? parseFloat(everyRaw) : 2;
if (!Number.isFinite(every) || every <= 0) {
  console.error('--every must be a positive number (seconds between frames).');
  process.exit(1);
}
const atWords = args.includes('--at-words');

const base = path.basename(inputVideo, path.extname(inputVideo));
const framesDir = path.join('data', `${base}-frames`);
const indexPath = path.join('data', `${base}.watch.json`);

fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

// Get video duration via ffprobe.
const probe = spawnSync(
  'ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', inputVideo],
  { encoding: 'utf8' },
);
if (probe.status !== 0) {
  console.error('ffprobe failed. Is ffmpeg (which includes ffprobe) installed?');
  process.exit(1);
}
const duration = parseFloat(probe.stdout.trim());

// Build the list of timestamps to sample.
let timestamps;
if (atWords) {
  const transcriptPath = path.join('data', `${base}.transcript.json`);
  if (!fs.existsSync(transcriptPath)) {
    console.error(`--at-words needs an existing transcript at ${transcriptPath}`);
    console.error(`Run: npm run transcribe -- ${inputVideo}`);
    process.exit(1);
  }
  const t = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
  const words = t.words ?? [];
  if (!words.length) {
    console.error('Transcript has no word-level timings.');
    process.exit(1);
  }
  // One frame per word, at the mid-point of the word. De-dupe to >=0.3s apart.
  const raw = words.map((w) => (w.start + w.end) / 2);
  timestamps = [];
  let last = -Infinity;
  for (const t of raw) {
    if (t - last >= 0.3) {
      timestamps.push(t);
      last = t;
    }
  }
} else {
  timestamps = [];
  for (let t = 0; t < duration; t += every) timestamps.push(t);
}

console.log(
  `Sampling ${timestamps.length} frames from ${inputVideo} ` +
    `(${duration.toFixed(1)}s, ${atWords ? 'at-words mode' : `every ${every}s`}) -> ${framesDir}`,
);

const index = [];
let okCount = 0;
for (const t of timestamps) {
  const name = `f_${t.toFixed(2).padStart(9, '0')}.jpg`;
  const out = path.join(framesDir, name);
  // -ss BEFORE -i for fast seek; -vframes 1 for a single frame; scale to a
  // reasonable size for a vision model (long edge 960px) to keep file sizes
  // small while staying legible.
  const r = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-ss', String(t),
      '-i', inputVideo,
      '-vframes', '1',
      '-vf', "scale='min(960,iw)':'-2'",
      '-q:v', '4',
      '-loglevel', 'error',
      out,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  if (r.status === 0 && fs.existsSync(out)) {
    index.push({ t: parseFloat(t.toFixed(2)), path: out.split(path.sep).join('/') });
    okCount++;
  }
}

fs.writeFileSync(
  indexPath,
  JSON.stringify(
    {
      source: inputVideo.split(path.sep).join('/'),
      duration,
      mode: atWords ? 'at-words' : `every-${every}s`,
      frame_count: index.length,
      frames: index,
    },
    null,
    2,
  ),
);

console.log(`\nDone.`);
console.log(`  frames:  ${okCount} written to ${framesDir}`);
console.log(`  index:   ${indexPath}`);
console.log(`\nIn Claude Code: when writing cuts.json, open ${indexPath}, pick a few`);
console.log(`timestamps near candidate cut boundaries, and Read those jpgs with the`);
console.log(`Read tool. Catches dead eyes, mid-gesture freezes, and b-roll gaps the`);
console.log(`transcript can't see.`);
