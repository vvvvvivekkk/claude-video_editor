// scripts/export.js
// Final polish + platform export (spec item 13).
//
// Usage:
//   npm run export                       (default: reels)
//   npm run export -- --platform shorts
//   npm run export -- --platform youtube (16:9 1920x1080)
//   npm run export -- --name my-reel     (output/export/my-reel.mp4)
//
// Presets: 1080x1920 (or 1920x1080), 30fps, H.264 High, ~10 Mbps VBR,
// AAC 192k 48kHz, +faststart so it starts playing instantly when uploaded.
// Letterboxes (blurred background) if the master isn't the target aspect.
//
// Reads the current master. Does NOT advance the chain (export is a copy).

import fs from 'node:fs';
import path from 'node:path';
import { getMaster, args, run, probe } from './lib/master.js';

const a = args();
const platform = a.flag('--platform', 'reels');
const P = {
  reels: { W: 1080, H: 1920, fps: 30, vb: '10M' },
  shorts: { W: 1080, H: 1920, fps: 30, vb: '12M' },
  tiktok: { W: 1080, H: 1920, fps: 30, vb: '10M' },
  youtube: { W: 1920, H: 1080, fps: 30, vb: '12M' },
}[platform];
if (!P) { console.error('platform: reels | shorts | tiktok | youtube'); process.exit(1); }

const input = getMaster();
const { w, h } = probe(input);
const name = a.flag('--name', `${path.basename(input, '.mp4')}-${platform}`);
fs.mkdirSync(path.join('output', 'export'), { recursive: true });
const out = path.join('output', 'export', `${name}.mp4`);

const sameAspect = Math.abs(w / h - P.W / P.H) < 0.01;
const vf = sameAspect
  ? `scale=${P.W}:${P.H}:flags=lanczos,fps=${P.fps},format=yuv420p`
  : `split[a][b];[a]scale=${P.W}:${P.H}:force_original_aspect_ratio=increase,crop=${P.W}:${P.H},gblur=sigma=30,eq=brightness=-0.08[bg];`
    + `[b]scale=${P.W}:${P.H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=${P.fps},format=yuv420p`;

console.log(`Input: ${input} (${w}x${h})  ->  ${platform} ${P.W}x${P.H}${sameAspect ? '' : '  (blur-letterboxed)'}`);
run('ffmpeg', ['-y', '-i', input,
  ...(sameAspect ? ['-vf', vf] : ['-filter_complex', `[0:v]${vf}[v]`, '-map', '[v]', '-map', '0:a?']),
  '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium',
  '-b:v', P.vb, '-maxrate', P.vb.replace('M', '') * 1.25 + 'M', '-bufsize', P.vb.replace('M', '') * 2 + 'M',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-movflags', '+faststart', out], 'ffmpeg export');

console.log(`\nExported: ${out}`);
console.log('Before posting: run /review — re-watch the first 3 seconds alone. If the hook does not land, nothing else matters.');
