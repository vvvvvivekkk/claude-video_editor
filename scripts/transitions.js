// scripts/transitions.js
// Sparing transitions at real topic changes (spec item 11).
// Hard cut stays the default everywhere else — max 1–2 per reel.
//
// These are timing-preserving: they happen ON a cut point without shortening
// the video, so captions, SFX and motion graphics stay in sync.
//
// Reads data/transitions.json:
//   { "transitions": [ { "at": 12.4, "type": "flash" }, { "at": 21.0, "type": "zoom" } ] }
// `at` is master time — normally one of the cut boundaries from cuts.json.
//
// Types:
//   flash  quick white flash (≈0.2s) — energetic topic switch
//   dip    dip to black (≈0.35s) — calmer section break
//   zoom   0.25s zoom-blast into the cut and settle — "whip" feel
//   shake  0.3s camera shake — punchline / impact
//
// Usage:  npm run transitions
// Reads the current master, writes output/transitions.mp4, advances the chain.

import fs from 'node:fs';
import { getMaster, setMaster, run, ENC, probe } from './lib/master.js';

const PATH = 'data/transitions.json';
if (!fs.existsSync(PATH)) {
  console.error(`Missing ${PATH}. Ask Claude Code: /transitions — or write it by hand.`);
  process.exit(1);
}
const { transitions = [] } = JSON.parse(fs.readFileSync(PATH, 'utf8'));
if (!transitions.length) { console.log('No transitions planned (hard cuts only) — nothing to do.'); process.exit(0); }
if (transitions.length > 3) console.warn(`Warning: ${transitions.length} transitions. The rule is 1–2 per reel — consider cutting some.`);

const input = getMaster('transitions');
const { w: W, h: H } = probe(input);
const out = 'output/transitions.mp4';

const filters = [];
for (const tr of transitions) {
  const t = +tr.at;
  switch (tr.type) {
    case 'flash': {
      const a = (t - 0.04).toFixed(3), b = (t + 0.16).toFixed(3);
      // brightness peaks at the cut and decays
      filters.push(`eq=brightness='0.9*max(0\\,1-abs(t-${t})/0.12)':eval=frame:enable='between(t,${a},${b})'`);
      break;
    }
    case 'dip': {
      const a = (t - 0.18).toFixed(3), b = (t + 0.18).toFixed(3);
      filters.push(`eq=brightness='-1*max(0\\,1-abs(t-${t})/0.18)':eval=frame:enable='between(t,${a},${b})'`);
      break;
    }
    case 'zoom': {
      const b = (t + 0.25).toFixed(3);
      // Zoom from 1.3x down to 1.0x over 0.25s after the cut.
      const z = `(1+0.3*max(0\\,1-(t-${t})/0.25))`;
      filters.push(`scale=w='iw*if(between(t\\,${t}\\,${b})\\,${z}\\,1)':h='ih*if(between(t\\,${t}\\,${b})\\,${z}\\,1)':eval=frame,crop=${W}:${H}`);
      break;
    }
    case 'shake': {
      const b = (t + 0.3).toFixed(3);
      const amp = Math.round(W * 0.012);
      filters.push(`scale=${W + amp * 2}:${H + amp * 2},crop=${W}:${H}:'${amp}+if(between(t\\,${t}\\,${b})\\,${amp}*sin(t*90)\\,0)':'${amp}+if(between(t\\,${t}\\,${b})\\,${amp}*cos(t*77)\\,0)'`);
      break;
    }
    default:
      console.error(`Unknown transition type "${tr.type}" (flash | dip | zoom | shake)`);
      process.exit(1);
  }
}
filters.push('format=yuv420p');

console.log(`Input: ${input}`);
transitions.forEach((tr) => console.log(`  ${(+tr.at).toFixed(2)}s  ${tr.type}`));
run('ffmpeg', ['-y', '-i', input, '-vf', filters.join(','), ...ENC, '-c:a', 'copy', out], 'ffmpeg transitions');

setMaster(out, 'transitions');
console.log(`\nDone: ${out}`);
