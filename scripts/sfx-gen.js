// scripts/sfx-gen.js
// Generates a starter SFX kit into assets/sfx/ with pure ffmpeg synthesis —
// no downloads, no licensing questions. Replace any file with a better one
// (same name) whenever you like; sfx.js just reads assets/sfx/<name>.wav.
//
// Usage:  npm run sfx:gen            (skips files that already exist)
//         npm run sfx:gen -- --force (overwrite)

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DIR = path.join('assets', 'sfx');
fs.mkdirSync(DIR, { recursive: true });
const force = process.argv.includes('--force');

const KIT = {
  // hard cut
  whoosh: { src: 'anoisesrc=d=0.45:c=pink:a=0.7', fx: 'highpass=f=300,lowpass=f=5000,afade=t=in:d=0.28:curve=exp,afade=t=out:st=0.28:d=0.17' },
  // punch-in zoom
  swoosh: { src: 'anoisesrc=d=0.25:c=white:a=0.5', fx: 'highpass=f=1500,lowpass=f=9000,afade=t=in:d=0.12,afade=t=out:st=0.12:d=0.13' },
  // text / pop-up appears
  pop: { src: "aevalsrc='0.8*sin(2*PI*(1400-4500*t)*t)*exp(-40*t)':d=0.12" },
  // list item / caption keyword
  tick: { src: "aevalsrc='0.7*sin(2*PI*2500*t)*exp(-120*t)':d=0.05" },
  // final beat / CTA
  ding: { src: "aevalsrc='0.45*(sin(2*PI*1760*t)+0.5*sin(2*PI*2640*t))*exp(-6*t)':d=0.9" },
  // big reveal / punchline
  boom: { src: "aevalsrc='0.9*sin(2*PI*(70-35*t)*t)*exp(-4*t)':d=0.8" },
  // meme / b-roll entrance
  riser: { src: 'anoisesrc=d=0.6:c=pink:a=0.5', fx: 'highpass=f=800,afade=t=in:d=0.55:curve=exp,afade=t=out:st=0.55:d=0.05' },
};

for (const [name, { src, fx }] of Object.entries(KIT)) {
  const out = path.join(DIR, `${name}.wav`);
  if (fs.existsSync(out) && !force) { console.log(`  skip ${out} (exists)`); continue; }
  const r = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', src, ...(fx ? ['-af', fx] : []),
    '-ac', '2', '-ar', '48000', out], { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
  if (r.status !== 0) { console.error(`  FAILED ${name}\n${r.stderr.split('\n').slice(-4).join('\n')}`); process.exit(1); }
  console.log(`  made ${out}`);
}
console.log('\nSFX kit ready. Swap in better sounds any time — keep the filenames.');
