// scripts/sfx.js
// Sound design layer (spec item 8) — the biggest free upgrade.
//
// Automatic events (turn off with --no-auto):
//   whoosh  on every hard cut           (from data/cuts.json)
//   swoosh  on every punch-in           (from data/punches.json)
//   riser   on every b-roll / meme       (from data/broll.json)
// Plus any hand-placed / agent-placed events in data/sfx.json:
//   { "events": [ { "sound": "pop", "at": 3.2, "gainDb": -16 }, { "sound": "ding", "at": 28.9 } ] }
// `sound` = a filename in assets/sfx/ without .wav (or a full path).
//
// Levels follow the spec: −18 to −12 dB under the voice. Defaults per sound
// below; override per event with gainDb or globally with --gain-offset -3.
//
// Usage:  npm run sfx                 (needs assets/sfx/*.wav — run npm run sfx:gen once)
//         npm run sfx -- --no-auto    (only data/sfx.json events)
// Audio-only pass: video is stream-copied (fast). Writes output/sfx.mp4.

import fs from 'node:fs';
import path from 'node:path';
import { getMaster, setMaster, args, run, cutBoundaries, probe } from './lib/master.js';

const a = args();
// Levels in dB applied to the kit files. Phone voice usually peaks near -3 dBFS,
// so these land roughly 10–14 dB under it: clearly audible, never on top.
const DEFAULT_DB = { whoosh: -9, swoosh: -10, pop: -8, tick: -10, ding: -9, boom: -8, riser: -11 };
const offset = parseFloat(a.flag('--gain-offset', '0')) || 0;
const input = getMaster('sfx');
const { duration } = probe(input);

const events = [];
if (!a.has('--no-auto')) {
  // whoosh lands slightly BEFORE the cut so its peak hits the join
  for (const t of cutBoundaries()) events.push({ sound: 'whoosh', at: t - 0.2, src: 'cut' });
  if (fs.existsSync('data/punches.json')) {
    for (const p of JSON.parse(fs.readFileSync('data/punches.json', 'utf8')).punches ?? []) {
      events.push({ sound: 'swoosh', at: p.start - 0.08, src: 'punch' });
    }
  }
  if (fs.existsSync('data/broll.json')) {
    for (const b of JSON.parse(fs.readFileSync('data/broll.json', 'utf8')).inserts ?? []) {
      events.push({ sound: 'riser', at: b.start - 0.5, src: 'broll' });
    }
  }
}
if (fs.existsSync('data/sfx.json')) {
  for (const e of JSON.parse(fs.readFileSync('data/sfx.json', 'utf8')).events ?? []) events.push({ ...e, src: 'sfx.json' });
}

// De-dupe: drop an auto event if another event sits within 150ms of it.
events.sort((x, y) => x.at - y.at);
const kept = [];
for (const e of events) {
  const clash = kept.find((k) => Math.abs(k.at - e.at) < 0.15);
  if (clash && e.src !== 'sfx.json') continue;
  kept.push(e);
}
const final = kept.filter((e) => e.at < duration).map((e) => ({ ...e, at: Math.max(0, e.at) }));
if (!final.length) { console.error('No SFX events. Add data/sfx.json or make sure cuts/punches/broll exist.'); process.exit(1); }

const fileOf = (s) => (s.includes('/') || s.includes('\\') ? s : path.join('assets', 'sfx', `${s}.wav`));
const files = [...new Set(final.map((e) => fileOf(e.sound)))];
for (const f of files) {
  if (!fs.existsSync(f)) { console.error(`Missing sound: ${f}\n  Run: npm run sfx:gen`); process.exit(1); }
}

const ffIn = ['-i', input];
files.forEach((f) => ffIn.push('-i', f));
let graph = '';
const labels = [];
files.forEach((f, fi) => {
  const uses = final.filter((e) => fileOf(e.sound) === f);
  graph += `[${fi + 1}:a]asplit=${uses.length}${uses.map((_, u) => `[f${fi}u${u}]`).join('')};`;
  uses.forEach((e, u) => {
    const ms = Math.round(e.at * 1000);
    const name = path.basename(f, '.wav');
    const db = (e.gainDb ?? DEFAULT_DB[name] ?? -15) + offset;
    graph += `[f${fi}u${u}]volume=${db}dB,adelay=${ms}|${ms}[e${fi}_${u}];`;
    labels.push(`[e${fi}_${u}]`);
  });
});
graph += `[0:a]${labels.join('')}amix=inputs=${labels.length + 1}:duration=first:normalize=0[aout]`;

console.log(`Input: ${input}`);
const counts = final.reduce((m, e) => ((m[e.sound] = (m[e.sound] ?? 0) + 1), m), {});
console.log(`SFX events: ${final.length}  ${JSON.stringify(counts)}`);
const out = 'output/sfx.mp4';
run('ffmpeg', ['-y', ...ffIn, '-filter_complex', graph, '-map', '0:v', '-map', '[aout]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', out], 'ffmpeg sfx mix');

setMaster(out, 'sfx');
console.log(`\nDone: ${out}`);
