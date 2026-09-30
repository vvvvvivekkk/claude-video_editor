// scripts/caption.js
// Turns data/*.transcript.json (word-level) into an .ass subtitle file with
// short 2-4 word chunks (TikTok/Reels style), then burns them into
// output/edited-master.mp4 -> output/final.mp4.
//
// Usage:
//   node scripts/caption.js data/my-video.transcript.json
//
// Note: for v1 we caption from the ORIGINAL transcript. In v2 we'll rebuild
// timings from the cuts to keep captions in sync after cutting.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const transcriptPath = process.argv[2];
if (!transcriptPath) {
  console.error('Usage: node scripts/caption.js <path-to-transcript.json>');
  process.exit(1);
}

const t = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
const words = t.words ?? [];
if (!words.length) {
  console.error('Transcript has no word-level timings.');
  process.exit(1);
}

// Group into chunks of ~3 words, breaking on longer pauses.
const CHUNK_SIZE = 3;
const PAUSE_BREAK = 0.35; // seconds
const chunks = [];
let current = [];
for (let i = 0; i < words.length; i++) {
  const w = words[i];
  current.push(w);
  const nextGap = words[i + 1] ? words[i + 1].start - w.end : Infinity;
  if (current.length >= CHUNK_SIZE || nextGap > PAUSE_BREAK || i === words.length - 1) {
    chunks.push({
      start: current[0].start,
      end: current[current.length - 1].end,
      text: current.map((x) => x.word.trim()).join(' ').toUpperCase(),
    });
    current = [];
  }
}

function toAssTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(2);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(5, '0')}`;
}

// ASS style: bold white with black outline, bottom-center, for 1080x1920 vertical.
// Change PlayResX/PlayResY to 1920x1080 for horizontal.
const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Impact,90,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,2,2,60,60,300,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${chunks.map((c) => `Dialogue: 0,${toAssTime(c.start)},${toAssTime(c.end)},Cap,,0,0,0,,${c.text}`).join('\n')}
`;

const assPath = path.join('data', 'captions.ass');
fs.writeFileSync(assPath, ass);
console.log(`Wrote ${chunks.length} caption chunks -> ${assPath}`);

// Burn into video.
const master = path.join('output', 'edited-master.mp4');
const finalOut = path.join('output', 'final.mp4');
if (!fs.existsSync(master)) {
  console.error(`Missing ${master}. Run: node scripts/cut.js <input> first.`);
  process.exit(1);
}

console.log(`Burning captions -> ${finalOut}`);
// ffmpeg subtitles filter needs forward slashes and escaped colon on Windows.
const filterPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
const r = spawnSync('ffmpeg', [
  '-y',
  '-i', master,
  '-vf', `subtitles=${filterPath}`,
  '-c:v', 'libx264',
  '-preset', 'veryfast',
  '-crf', '20',
  '-c:a', 'copy',
  finalOut,
], { stdio: 'inherit' });
if (r.status !== 0) {
  console.error('Caption burn failed');
  process.exit(1);
}
console.log(`\nDone: ${finalOut}`);
