// scripts/beats.js
// Build data/beats.json — a timeline of beat moments to anchor cuts, pops,
// and SFX to a music bed.
//
// Two modes:
//
//  (A) Manual tempo (recommended — most accurate on short reels):
//      node scripts/beats.js --bpm 120 --downbeat 0.42 --duration 29.9
//
//      Produces an exact grid: beats every 60/bpm seconds, starting at
//      --downbeat, continuing until --duration. Also emits every 4th beat as
//      a "bar" marker for stronger emphasis moments.
//
//  (B) Auto-detect from an audio file (crude; use for a reference check):
//      node scripts/beats.js --audio input/track.mp3
//
//      Uses ffmpeg's astats filter to find RMS peaks on short windows.
//      Not a real beat tracker — treat the output as "loud moments" and
//      hand-correct in Claude Code. For real beat tracking install aubio.
//
// Output shape:
//   {
//     "source": "manual bpm=120 downbeat=0.42 duration=29.9",
//     "bpm": 120,
//     "beats":   [{ "t": 0.42, "bar": true }, { "t": 0.92, "bar": false }, ...],
//     "bars":    [0.42, 2.42, 4.42, ...]
//   }

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
function getFlag(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : undefined;
}
function hasFlag(flag) {
  return args.includes(flag);
}

const bpm = getFlag('--bpm');
const audio = getFlag('--audio');
if (!bpm && !audio) {
  console.error('Usage:');
  console.error('  node scripts/beats.js --bpm 120 --downbeat 0.4 --duration 30');
  console.error('  node scripts/beats.js --audio input/track.mp3');
  process.exit(1);
}

const beats = [];
let bpmOut = null;
let srcLabel;

if (bpm) {
  const bpmN = parseFloat(bpm);
  const downbeat = parseFloat(getFlag('--downbeat') ?? '0');
  const duration = parseFloat(
    getFlag('--duration') ?? (() => {
      // Try to infer from cuts.json
      const cutsPath = path.join('data', 'cuts.json');
      if (fs.existsSync(cutsPath)) {
        const c = JSON.parse(fs.readFileSync(cutsPath, 'utf8'));
        return (c.clips ?? []).reduce((s, cl) => s + (cl.end - cl.start), 0);
      }
      return 30;
    })()
  );
  if (!bpmN || bpmN < 40 || bpmN > 220) {
    console.error('BPM out of plausible range (40–220).');
    process.exit(1);
  }
  const interval = 60 / bpmN;
  let t = downbeat;
  let i = 0;
  while (t <= duration + 1e-6) {
    beats.push({ t: +t.toFixed(3), bar: i % 4 === 0 });
    t += interval;
    i += 1;
  }
  bpmOut = bpmN;
  srcLabel = `manual bpm=${bpmN} downbeat=${downbeat} duration=${duration}`;
} else {
  // Audio peak detection. Simple RMS over 100ms windows → pick top N% peaks.
  const audioPath = audio;
  if (!fs.existsSync(audioPath)) {
    console.error(`Audio file not found: ${audioPath}`);
    process.exit(1);
  }
  const WIN_MS = 100;
  const tmpOut = path.join('data', '.beats-astats.txt');
  const r = spawnSync('ffmpeg', [
    '-y',
    '-i', audioPath,
    '-af', `astats=metadata=1:reset=${WIN_MS / 1000},ametadata=print:key=lavfi.astats.Overall.RMS_level:file=${tmpOut}`,
    '-f', 'null', '-',
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (r.status !== 0 || !fs.existsSync(tmpOut)) {
    console.error('ffmpeg astats failed');
    process.exit(1);
  }
  // Parse: alternating lines "frame:N pts:M pts_time:T" and "lavfi.astats.Overall.RMS_level=X"
  const lines = fs.readFileSync(tmpOut, 'utf8').split('\n');
  const samples = [];
  for (let i = 0; i < lines.length; i++) {
    const mT = lines[i].match(/pts_time:([\d.]+)/);
    const mV = lines[i + 1]?.match(/RMS_level=(-?[\d.]+)/);
    if (mT && mV) samples.push({ t: parseFloat(mT[1]), db: parseFloat(mV[1]) });
  }
  fs.unlinkSync(tmpOut);
  // Pick local peaks: louder than its neighbours and above 90th percentile.
  const dbs = samples.map((s) => s.db).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const thresh = dbs[Math.floor(dbs.length * 0.9)] ?? -40;
  for (let i = 1; i < samples.length - 1; i++) {
    const s = samples[i];
    if (s.db >= thresh && s.db >= samples[i - 1].db && s.db >= samples[i + 1].db) {
      beats.push({ t: +s.t.toFixed(3), bar: false });
    }
  }
  // Pack: merge peaks within 150ms
  const packed = [];
  for (const b of beats) {
    if (!packed.length || b.t - packed[packed.length - 1].t > 0.15) packed.push(b);
  }
  beats.length = 0;
  beats.push(...packed);
  // Infer bars every 4
  for (let i = 0; i < beats.length; i += 4) beats[i].bar = true;
  srcLabel = `audio ${audioPath}`;
}

const bars = beats.filter((b) => b.bar).map((b) => b.t);
const out = { source: srcLabel, bpm: bpmOut, beats, bars };
const outPath = path.join('data', 'beats.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${beats.length} beats (${bars.length} bars) -> ${outPath}`);
console.log(`\nUse in Claude Code: ask the beat-syncer agent to snap cuts.json clip ends to the nearest bar.`);
