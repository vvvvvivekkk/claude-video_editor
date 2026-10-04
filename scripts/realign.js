// scripts/realign.js
// Maps word-level timings from the RAW transcript through data/cuts.json
// to produce master-time timings aligned to the cut video.
//
// Why: caption.js uses raw timings. On heavy cuts those drift against the
// edited master. Running this before caption fixes the drift.
//
// Usage:
//   node scripts/realign.js data/raw.transcript.json
//     -> writes data/raw.cut-transcript.json
//
// Shape is the same as the raw transcript (duration + words[]), but every
// word.start/word.end has been shifted into the cut master's timeline. Words
// that fall inside dropped sections (dead air, false starts) are OMITTED.

import fs from 'node:fs';
import path from 'node:path';

const transcriptPath = process.argv[2];
if (!transcriptPath) {
  console.error('Usage: node scripts/realign.js <path-to-transcript.json>');
  process.exit(1);
}
if (!fs.existsSync(transcriptPath)) {
  console.error(`File not found: ${transcriptPath}`);
  process.exit(1);
}
const cutsPath = path.join('data', 'cuts.json');
if (!fs.existsSync(cutsPath)) {
  console.error(`Missing ${cutsPath}. Author it first.`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
const cuts = JSON.parse(fs.readFileSync(cutsPath, 'utf8'));
const clips = cuts.clips ?? [];
if (!clips.length) {
  console.error('cuts.json has no clips[]');
  process.exit(1);
}

// Build a mapping: for each clip, compute its master-time offset.
// masterStart[i] = sum of (clips[0..i-1] durations)
let acc = 0;
const mapped = clips.map((clip) => {
  const entry = { srcStart: clip.start, srcEnd: clip.end, masterStart: acc };
  acc += clip.end - clip.start;
  entry.masterEnd = acc;
  return entry;
});
const masterDuration = acc;

// For each word: find which clip (if any) contains it, and shift timings.
// A word that straddles a boundary is clipped to the boundary.
function shift(timeSrc, clip) {
  const inClip = timeSrc - clip.srcStart;
  return clip.masterStart + Math.max(0, Math.min(inClip, clip.srcEnd - clip.srcStart));
}

const words = raw.words ?? [];
const outWords = [];
let dropped = 0;

for (const w of words) {
  // Find the clip whose src range contains the word's midpoint.
  const mid = (w.start + w.end) / 2;
  const clip = mapped.find((c) => mid >= c.srcStart && mid <= c.srcEnd);
  if (!clip) {
    dropped++;
    continue;
  }
  // Clamp word timings to the clip's bounds in SOURCE time, then shift to master.
  const srcStart = Math.max(w.start, clip.srcStart);
  const srcEnd = Math.min(w.end, clip.srcEnd);
  outWords.push({
    word: w.word,
    start: +shift(srcStart, clip).toFixed(3),
    end: +shift(srcEnd, clip).toFixed(3),
  });
}

// Also segment-level if the raw has them (optional).
const outSegments = (raw.segments ?? [])
  .map((s) => {
    const mid = (s.start + s.end) / 2;
    const clip = mapped.find((c) => mid >= c.srcStart && mid <= c.srcEnd);
    if (!clip) return null;
    return {
      ...s,
      start: +shift(Math.max(s.start, clip.srcStart), clip).toFixed(3),
      end: +shift(Math.min(s.end, clip.srcEnd), clip).toFixed(3),
    };
  })
  .filter(Boolean);

const out = {
  duration: +masterDuration.toFixed(3),
  words: outWords,
  segments: outSegments,
  _source: transcriptPath,
  _cuts: cutsPath,
};

const base = path.basename(transcriptPath).replace(/\.transcript\.json$/, '');
const outPath = path.join('data', `${base}.cut-transcript.json`);
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Realigned ${outWords.length} words (dropped ${dropped} in cuts).`);
console.log(`Master duration: ${masterDuration.toFixed(2)}s across ${clips.length} clips.`);
console.log(`Wrote: ${outPath}`);
console.log(`\nNext: node scripts/caption.js ${outPath} --style pop`);
