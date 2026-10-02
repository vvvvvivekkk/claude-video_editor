// scripts/compose.js
// Overlays the HyperFrames transparent .mov onto the cut master and writes
// output/with-graphics.mp4. Captions still burn on top of that in the next
// stage.
//
// Usage:
//   npm run compose -- <project-name>
//   npm run compose -- reel1 --master output/edited-master.mp4 --out output/with-graphics.mp4
//
// Assumes:
//   motion/projects/<name>/renders/overlay.mov  exists (ProRes 4444 w/ alpha)
//   output/edited-master.mp4                     exists
//
// Takes the audio from the master (overlay has no audio).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const name = args[0];
if (!name || name.startsWith('--')) {
  console.error('Usage: npm run compose -- <project-name> [--master PATH] [--out PATH]');
  process.exit(1);
}

function getFlag(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const master = getFlag('--master', path.join('output', 'edited-master.mp4'));
const out = getFlag('--out', path.join('output', 'with-graphics.mp4'));
const overlay = path.join('motion', 'projects', name, 'renders', 'overlay.mov');

for (const [label, p] of [['master', master], ['overlay', overlay]]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing ${label}: ${p}`);
    if (label === 'master') console.error('  Run `npm run cut -- input/<your-video>.mp4` first.');
    if (label === 'overlay') console.error(`  Open Claude Code in motion/projects/${name}/ and follow PROMPT.md to render it.`);
    process.exit(1);
  }
}

console.log(`Compositing:`);
console.log(`  master:  ${master}`);
console.log(`  overlay: ${overlay}`);
console.log(`  ->       ${out}`);

// Overlay chain:
//   [0:v][1:v] overlay=0:0:format=auto:eof_action=pass  (overlay ends early, keep playing master)
// Audio taken from master (0).
const r = spawnSync('ffmpeg', [
  '-y',
  '-i', master,
  '-i', overlay,
  '-filter_complex', '[0:v][1:v] overlay=0:0:format=auto:eof_action=pass [outv]',
  '-map', '[outv]',
  '-map', '0:a?',
  '-c:v', 'libx264',
  '-preset', 'veryfast',
  '-crf', '20',
  '-c:a', 'copy',
  out,
], { stdio: 'inherit' });

if (r.status !== 0) {
  console.error('\nCompose failed. Common causes:');
  console.error('  - overlay.mov has a different resolution than the master');
  console.error('  - overlay.mov is not ProRes 4444 with alpha (frosted-glass cards look transparent but have no visible pixels)');
  console.error('  - Ask Claude in the project folder: "re-render overlay.mov with the master\'s exact size and ProRes 4444 alpha"');
  process.exit(1);
}

console.log(`\nDone: ${out}`);
console.log(`\nNext: npm run caption -- data/<name>.transcript.json`);
console.log('(The caption step burns onto whatever is at output/with-graphics.mp4 if present, else output/edited-master.mp4.)');
