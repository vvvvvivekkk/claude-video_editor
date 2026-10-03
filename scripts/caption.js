// scripts/caption.js
// Turns data/*.transcript.json (word-level) into an .ass subtitle file and
// burns it onto the latest master.
//
// Prefers output/with-graphics.mp4 (motion stage ran) over
// output/edited-master.mp4 (motion stage skipped). Writes output/final.mp4.
//
// Usage:
//   node scripts/caption.js data/my-video.transcript.json                  # default: pop
//   node scripts/caption.js data/my-video.transcript.json --style pop      # one word at a time, big, scales up
//   node scripts/caption.js data/my-video.transcript.json --style highlight # 3-word chunks, current word colored
//   node scripts/caption.js data/my-video.transcript.json --style plain    # v1 behavior
//
// Note: captions are drawn from the ORIGINAL transcript timings. If your cuts
// are heavy this will drift. v3 rebuilds timings from the cut master.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const transcriptPath = args[0];
if (!transcriptPath) {
  console.error('Usage: node scripts/caption.js <path-to-transcript.json> [--style pop|highlight|plain]');
  process.exit(1);
}
function getFlag(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const style = getFlag('--style', 'pop');
if (!['pop', 'highlight', 'plain'].includes(style)) {
  console.error(`Unknown style: ${style}. Choose pop, highlight, or plain.`);
  process.exit(1);
}

const t = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
const words = t.words ?? [];
if (!words.length) {
  console.error('Transcript has no word-level timings.');
  process.exit(1);
}

// --- Vertical by default (1080x1920). Change here for 16:9. ---
const PLAY_X = 1080;
const PLAY_Y = 1920;
const MARGIN_V = 300;

// --- Shared ASS header. ---
function assHeader(styles) {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${PLAY_X}
PlayResY: ${PLAY_Y}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styles.join('\n')}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
}

function toAssTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(2);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(5, '0')}`;
}

// --- Build events per style. ---
let events = [];
let styles = [];

if (style === 'plain') {
  // v1: 3-word chunks, static.
  styles = [
    `Style: Cap,Impact,90,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,2,2,60,60,${MARGIN_V},1`,
  ];
  const CHUNK_SIZE = 3;
  const PAUSE_BREAK = 0.35;
  let current = [];
  for (let i = 0; i < words.length; i++) {
    current.push(words[i]);
    const nextGap = words[i + 1] ? words[i + 1].start - words[i].end : Infinity;
    if (current.length >= CHUNK_SIZE || nextGap > PAUSE_BREAK || i === words.length - 1) {
      const text = current.map((x) => x.word.trim()).join(' ').toUpperCase();
      events.push(
        `Dialogue: 0,${toAssTime(current[0].start)},${toAssTime(current[current.length - 1].end)},Cap,,0,0,0,,${text}`
      );
      current = [];
    }
  }
} else if (style === 'pop') {
  // One word at a time, scale-up on entry. White with thick black outline.
  styles = [
    `Style: Pop,Impact,120,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,8,3,2,60,60,${MARGIN_V},1`,
  ];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const text = w.word.trim().toUpperCase();
    if (!text) continue;
    const nextStart = words[i + 1] ? words[i + 1].start : w.end + 0.1;
    // Each word is visible from its own start to the next word's start (gap-free).
    const start = w.start;
    const end = Math.max(nextStart - 0.01, start + 0.08);
    // \t(start,end,\fscxN\fscyN) animates scale from 60% up to 100% in 90ms.
    const popIn = `{\\fscx60\\fscy60\\t(0,90,\\fscx100\\fscy100)}`;
    events.push(
      `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Pop,,0,0,0,,${popIn}${text}`
    );
  }
} else if (style === 'highlight') {
  // 3-word chunk visible, current word highlighted in bright yellow.
  // Two styles: Base (white) and the current-word highlight is inline via \c&HRRGGBB&.
  const CHUNK_SIZE = 3;
  const PAUSE_BREAK = 0.35;
  const HIGHLIGHT_HEX = '&H0000F0FF&'; // ASS color = &HBBGGRR& — this is yellow (R=255,G=240,B=0 approx)
  styles = [
    `Style: Hl,Impact,100,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,2,2,60,60,${MARGIN_V},1`,
  ];
  // Group into chunks first.
  const chunks = [];
  let current = [];
  for (let i = 0; i < words.length; i++) {
    current.push(words[i]);
    const nextGap = words[i + 1] ? words[i + 1].start - words[i].end : Infinity;
    if (current.length >= CHUNK_SIZE || nextGap > PAUSE_BREAK || i === words.length - 1) {
      chunks.push(current);
      current = [];
    }
  }
  // For each chunk, emit one Dialogue line per word WITH that word highlighted.
  for (const chunk of chunks) {
    for (let j = 0; j < chunk.length; j++) {
      const activeWord = chunk[j];
      const activeStart = activeWord.start;
      const activeEnd = chunk[j + 1] ? chunk[j + 1].start : activeWord.end;
      // Rebuild the chunk text with the active word wrapped in a color tag.
      const rendered = chunk
        .map((w, k) => {
          const txt = w.word.trim().toUpperCase();
          if (k === j) return `{\\c${HIGHLIGHT_HEX}}${txt}{\\c&HFFFFFF&}`;
          return txt;
        })
        .join(' ');
      events.push(
        `Dialogue: 0,${toAssTime(activeStart)},${toAssTime(activeEnd)},Hl,,0,0,0,,${rendered}`
      );
    }
  }
}

const ass = `${assHeader(styles)}\n${events.join('\n')}\n`;
const assPath = path.join('data', 'captions.ass');
fs.writeFileSync(assPath, ass);
console.log(`Style: ${style} — wrote ${events.length} caption events -> ${assPath}`);

// Pick the base video: motion graphics compositing wins if present.
const withGraphics = path.join('output', 'with-graphics.mp4');
const bareMaster = path.join('output', 'edited-master.mp4');
const master = fs.existsSync(withGraphics) ? withGraphics : bareMaster;
const finalOut = path.join('output', 'final.mp4');
if (!fs.existsSync(master)) {
  console.error(`Missing ${bareMaster}. Run: node scripts/cut.js <input> first.`);
  process.exit(1);
}
console.log(`Base video: ${master}`);

console.log(`Burning captions -> ${finalOut}`);
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
