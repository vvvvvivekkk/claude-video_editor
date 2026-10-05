// scripts/lib/master.js
// Tracks "the current master" — the newest video in the edit chain — in
// data/master.json, so every stage reads the previous stage's output without
// hardcoded filenames.
//
// Chain (each stage optional):
//   cut -> color -> punch -> broll -> compose(motion) -> transitions
//       -> sfx -> music -> caption -> export
//
// cut.js resets the chain. Every later stage calls getMaster() for its input
// and setMaster(out) after writing.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PTR = path.join('data', 'master.json');
export const ORDER = ['cut', 'color', 'punch', 'broll', 'compose', 'transitions', 'sfx', 'music', 'caption'];

// getMaster(stage): the input a stage should read.
// Re-running a stage that is already in the chain rewinds to just before it
// (so you never punch an already-punched video or caption twice) and drops
// the later stages from the chain — they need re-running on the new result.
export function getMaster(stage) {
  if (fs.existsSync(PTR)) {
    try {
      const state = JSON.parse(fs.readFileSync(PTR, 'utf8'));
      const hist = state.history ?? [];
      if (stage) {
        const base = (x) => String(x).split(':')[0];
        let idx = -1;
        hist.forEach((h, i) => { if (base(h.stage) === stage) idx = i; });
        if (idx > 0) {
          const dropped = hist.slice(idx + 1).map((h) => base(h.stage));
          state.history = hist.slice(0, idx);
          state.current = hist[idx - 1].file;
          fs.writeFileSync(PTR, JSON.stringify(state, null, 2));
          console.log(`Re-running "${stage}": starting from ${state.current}` + (dropped.length ? `  (re-run after: ${dropped.join(', ')})` : ''));
          return state.current;
        }
      }
      if (stage && ORDER.includes(stage)) {
        const later = hist.map((h) => String(h.stage).split(':')[0]).filter((b) => ORDER.indexOf(b) > ORDER.indexOf(stage));
        if (later.length) console.warn(`Note: "${stage}" is running after ${[...new Set(later)].join(', ')}. Usual order: ${ORDER.join(' -> ')}`);
      }
      if (state.current && fs.existsSync(state.current)) return state.current;
    } catch {}
  }
  for (const p of ['output/with-graphics.mp4', 'output/edited-master.mp4']) {
    if (fs.existsSync(p)) return p;
  }
  console.error('No master video found. Run `npm run cut -- input/<video>` first.');
  process.exit(1);
}

export function setMaster(p, stage, reset = false) {
  let state = { current: p, history: [] };
  if (!reset && fs.existsSync(PTR)) {
    try { state = JSON.parse(fs.readFileSync(PTR, 'utf8')); } catch {}
  }
  state.history = reset ? [] : (state.history ?? []);
  state.history.push({ stage, file: p, at: new Date().toISOString() });
  state.current = p;
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(PTR, JSON.stringify(state, null, 2));
}

export function probe(file) {
  const r = spawnSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate:format=duration',
    '-of', 'json', file,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe failed on ${file}`);
  const j = JSON.parse(r.stdout);
  const s = j.streams[0];
  const [n, d] = s.r_frame_rate.split('/').map(Number);
  return { w: s.width, h: s.height, fps: n / (d || 1), duration: parseFloat(j.format.duration) };
}

export function hasAudio(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return r.stdout.trim().length > 0;
}

export function args() {
  const a = process.argv.slice(2);
  return {
    list: a,
    flag(name, fallback) { const i = a.indexOf(name); return i >= 0 && a[i + 1] !== undefined ? a[i + 1] : fallback; },
    has(name) { return a.includes(name); },
  };
}

export function run(cmd, argv, label) {
  console.log(`> ${label ?? cmd}`);
  const r = spawnSync(cmd, argv, { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) { console.error(`${label ?? cmd} failed`); process.exit(1); }
}

// Master-time cut boundaries from data/cuts.json (where one clip joins the next).
export function cutBoundaries() {
  const p = path.join('data', 'cuts.json');
  if (!fs.existsSync(p)) return [];
  const { clips = [] } = JSON.parse(fs.readFileSync(p, 'utf8'));
  const out = []; let acc = 0;
  clips.forEach((c, i) => { acc += c.end - c.start; if (i < clips.length - 1) out.push(+acc.toFixed(3)); });
  return out;
}

export const ENC = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p'];
