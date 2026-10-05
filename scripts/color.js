// scripts/color.js
// Consistent look pass (spec item 12) + HDR->SDR fix + optional 1080p downscale.
//
// iPhone footage is usually HDR (HLG / Dolby Vision, 10-bit). Instagram and
// most players show un-tonemapped HDR as washed-out grey. This pass detects
// HDR and tonemaps it to normal SDR first, then applies a subtle look.
//
// Usage:
//   npm run color -- --look punchy             (default look: natural)
//   npm run color -- --look warm --size 1080   (also downscale to 1080 wide; 4x faster later stages)
//
// Looks (keep them subtle — the spec's rule is "don't over-grade"):
//   natural  tiny contrast + saturation lift
//   punchy   more contrast + saturation, light vignette (talking-head default for reels)
//   warm     natural + warmer mids/highs
//   cool     natural + cooler shadows
//   bw       black and white with contrast
//   none     only the HDR fix / resize
//
// Reads the current master, writes output/colored.mp4, advances the chain.

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { getMaster, setMaster, args, run, ENC, probe } from './lib/master.js';

const a = args();
const look = a.flag('--look', 'natural');
const size = a.flag('--size', null); // e.g. 1080 -> width 1080, height kept to aspect

const LOOKS = {
  natural: 'eq=contrast=1.04:saturation=1.08',
  punchy: 'eq=contrast=1.10:saturation=1.18:brightness=0.01,vignette=PI/5',
  warm: 'eq=contrast=1.05:saturation=1.10,colorbalance=rm=0.04:gm=0.0:bm=-0.04:rh=0.03:bh=-0.03',
  cool: 'eq=contrast=1.05:saturation=1.06,colorbalance=rs=-0.03:bs=0.04:bm=0.02',
  bw: 'hue=s=0,eq=contrast=1.18',
  none: null,
};
if (!(look in LOOKS)) {
  console.error(`Unknown look "${look}". Choose: ${Object.keys(LOOKS).join(', ')}`);
  process.exit(1);
}

const input = getMaster('color');
const out = 'output/colored.mp4';

// Detect HDR transfer (HLG = arib-std-b67, PQ = smpte2084).
const pr = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_transfer,pix_fmt', '-of', 'csv=p=0', input], { encoding: 'utf8' });
const isHDR = /arib-std-b67|smpte2084/.test(pr.stdout);

const chain = [];
if (isHDR && !a.has('--keep-hdr')) {
  // HDR -> SDR: linearize, tonemap (hable keeps skin natural), back to bt709.
  chain.push(
    'zscale=t=linear:npl=100',
    'format=gbrpf32le',
    'zscale=p=bt709',
    'tonemap=tonemap=hable:desat=0',
    'zscale=t=bt709:m=bt709:r=tv',
  );
}
if (size) {
  const { w, h } = probe(input);
  const W = parseInt(size, 10);
  const H = Math.round((h * W) / w / 2) * 2;
  chain.push(`scale=${W}:${H}:flags=lanczos`);
}
if (LOOKS[look]) chain.push(LOOKS[look]);
chain.push('format=yuv420p');

console.log(`Input: ${input}${isHDR ? '  (HDR detected -> tonemapping to SDR)' : ''}`);
console.log(`Look: ${look}${size ? `, resize to ${size}w` : ''}`);
run('ffmpeg', ['-y', '-i', input, '-vf', chain.join(','), ...ENC,
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-c:a', 'copy', out], 'ffmpeg color');

if (!fs.existsSync(out)) process.exit(1);
setMaster(out, `color:${look}`);
console.log(`\nDone: ${out}`);
