// scripts/music.js
// Music bed with automatic ducking under the voice (spec item 9).
//
// The track loops if it's shorter than the video, fades in/out, and is
// sidechain-compressed by the voice: it dips whenever you talk and swells in
// the gaps. Base level ~ −18 dB under the voice.
//
// Usage:
//   npm run music -- --track assets/music/upbeat.mp3
//   npm run music -- --track assets/music/lofi.mp3 --gain -22 --start 12.5
//   npm run music -- --track assets/music/x.mp3 --no-duck
//
// Options:
//   --gain   music level in dB (default -18; spec range -22 .. -16)
//   --start  seconds into the track to begin (skip a slow intro)
//   --no-duck  constant level, no sidechain
//
// Tip: if you know the track's BPM, run /beats too so cuts land on the beat.
// Audio-only pass: video is stream-copied. Writes output/music.mp4.

import fs from 'node:fs';
import { getMaster, setMaster, args, run, probe } from './lib/master.js';

const a = args();
const track = a.flag('--track');
if (!track) { console.error('Usage: npm run music -- --track assets/music/<file>.mp3 [--gain -18] [--start 0]'); process.exit(1); }
if (!fs.existsSync(track)) { console.error(`Track not found: ${track}`); process.exit(1); }

const gain = parseFloat(a.flag('--gain', '-18'));
const start = parseFloat(a.flag('--start', '0')) || 0;
const duck = !a.has('--no-duck');

const input = getMaster('music');
const { duration } = probe(input);
const fadeOutStart = Math.max(0, duration - 1.5).toFixed(3);

let graph = `[1:a]atrim=0:${duration.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,`
  + `volume=${gain}dB,afade=t=in:d=0.6,afade=t=out:st=${fadeOutStart}:d=1.5[m];`;
if (duck) {
  graph += `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[voice][sc];`
    + `[m][sc]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=350[md];`
    + `[voice][md]amix=inputs=2:duration=first:normalize=0[aout]`;
} else {
  graph += `[0:a][m]amix=inputs=2:duration=first:normalize=0[aout]`;
}

console.log(`Input: ${input}`);
console.log(`Music: ${track}  gain ${gain}dB  start ${start}s  ${duck ? 'ducked under voice' : 'no ducking'}`);
const out = 'output/music.mp4';
run('ffmpeg', ['-y', '-i', input, '-stream_loop', '-1', '-ss', String(start), '-i', track,
  '-filter_complex', graph, '-map', '0:v', '-map', '[aout]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', duration.toFixed(3), out], 'ffmpeg music + ducking');

setMaster(out, 'music');
console.log(`\nDone: ${out}`);
