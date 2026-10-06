// scripts/status.js
// What's actually in your final video? Prints the edit chain, the plan files,
// and whether the newest export has sound effects and captions in it.
//
// Usage:  npm run status

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ORDER } from './lib/master.js';

const read = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const m = read('data/master.json');
if (!m) { console.log('No edit yet (data/master.json missing). Run /edit or npm run cut first.'); process.exit(0); }

const base = (s) => String(s).split(':')[0];
const ran = (m.history ?? []).map((h) => base(h.stage));
console.log('Edit chain (in order):');
(m.history ?? []).forEach((h, i) => console.log(`  ${i + 1}. ${h.stage.padEnd(18)} ${h.file}`));
console.log(`Current master: ${m.current}\n`);

const plan = [
  ['punch', 'data/punches.json', 'punches'],
  ['broll', 'data/broll.json', 'inserts'],
  ['transitions', 'data/transitions.json', 'transitions'],
  ['sfx', 'data/sfx.json', 'events'],
];
console.log('Plan files:');
for (const [stage, file, key] of plan) {
  const j = read(file);
  const n = j?.[key]?.length ?? 0;
  const inChain = ran.includes(stage);
  console.log(`  ${stage.padEnd(12)} ${j ? `${n} planned` : 'no plan file'}${j && n && !inChain ? '   <-- planned but NOT in the chain' : ''}`);
}
const motion = fs.existsSync('motion/projects') ? fs.readdirSync('motion/projects').filter((d) => fs.existsSync(path.join('motion/projects', d, 'renders'))) : [];
if (motion.length) console.log(`  motion       projects: ${motion.join(', ')}${ran.includes('compose') ? '' : '   <-- overlay NOT composited (run npm run compose -- <name>)'}`);

const missing = [];
if (!ran.includes('sfx')) missing.push('sfx (no sound effects in the video!)');
if (!ran.includes('caption')) missing.push('caption');
if (ran.length && ORDER.indexOf(ran[ran.length - 1]) < ORDER.indexOf('caption')) missing.push('caption must be the last stage');

// Newest export
const exp = fs.existsSync('output/export') ? fs.readdirSync('output/export').filter((f) => f.endsWith('.mp4')).map((f) => path.join('output/export', f)) : [];
exp.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
if (exp[0]) {
  const stale = fs.existsSync(m.current) && fs.statSync(m.current).mtimeMs > fs.statSync(exp[0]).mtimeMs;
  console.log(`\nNewest export: ${exp[0]}${stale ? '   <-- OLDER than the current master: re-run npm run export' : ''}`);
  const r = spawnSync('ffmpeg', ['-i', exp[0], '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  const mx = (r.stderr.match(/max_volume: (-?[\d.]+) dB/) || [])[1];
  if (mx) console.log(`  audio peak ${mx} dB`);
  if (stale) missing.push('export is stale');
} else {
  missing.push('no export yet');
}

console.log(missing.length ? `\nNOT READY: ${missing.join('; ')}` : '\nREADY: every stage is in the chain and the export is current.');
