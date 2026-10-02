// scripts/reference.js
// Downloads a video from any public URL (YouTube, IG Reel, TikTok, Twitter,
// etc.) with yt-dlp, transcribes it with Groq Whisper, and saves both to
// reference/<name>/. Claude Code reads these when you ask it to edit "like"
// a specific reel.
//
// Usage:
//   npm run reference -- <url>                        # name inferred from title
//   npm run reference -- <url> --name damiano-reel-7  # custom folder name
//   npm run reference -- <url> --no-transcribe        # download only, skip Whisper
//
// Prereq: yt-dlp installed and on PATH.
//   macOS:   brew install yt-dlp
//   Windows: winget install yt-dlp
//   Linux:   pip install -U yt-dlp
//
// Writes:
//   reference/<name>/video.mp4
//   reference/<name>/transcript.json   (word-level, from Groq Whisper)
//   reference/<name>/info.json         (yt-dlp metadata: title, uploader, url, duration)

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Groq from 'groq-sdk';

const args = process.argv.slice(2);
const url = args[0];
if (!url || url.startsWith('--')) {
  console.error('Usage: npm run reference -- <url> [--name NAME] [--no-transcribe]');
  console.error('Supported: anything yt-dlp supports (YouTube, IG, TikTok, Twitter, ...).');
  process.exit(1);
}

function getFlag(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
}
const customName = getFlag('--name');
const skipTranscribe = args.includes('--no-transcribe');

// 1. Check yt-dlp is installed.
const ytdlpVersion = spawnSync('yt-dlp', ['--version'], { encoding: 'utf8' });
if (ytdlpVersion.status !== 0) {
  console.error('yt-dlp not found on PATH. Install it:');
  console.error('  macOS:   brew install yt-dlp');
  console.error('  Windows: winget install yt-dlp');
  console.error('  Linux:   pip install -U yt-dlp');
  process.exit(1);
}

// 2. Fetch metadata first so we can name the folder deterministically.
console.log('Fetching metadata...');
const meta = spawnSync('yt-dlp', ['--dump-single-json', '--no-warnings', url], { encoding: 'utf8' });
if (meta.status !== 0) {
  console.error('yt-dlp metadata fetch failed:');
  console.error(meta.stderr);
  process.exit(1);
}
let info;
try {
  info = JSON.parse(meta.stdout);
} catch (e) {
  console.error('Could not parse yt-dlp output as JSON.');
  process.exit(1);
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

const name = customName || `${slug(info.uploader || 'unknown')}-${slug(info.title || info.id || 'video')}`;
const refDir = path.join('reference', name);
if (fs.existsSync(refDir)) {
  console.error(`Reference already exists: ${refDir}`);
  console.error('Delete it or pass --name to use another folder.');
  process.exit(1);
}
fs.mkdirSync(refDir, { recursive: true });

// 3. Save metadata.
fs.writeFileSync(
  path.join(refDir, 'info.json'),
  JSON.stringify(
    {
      url,
      title: info.title,
      uploader: info.uploader,
      duration: info.duration,
      upload_date: info.upload_date,
      description: info.description?.slice(0, 2000),
      view_count: info.view_count,
      like_count: info.like_count,
      fetched_at: new Date().toISOString(),
    },
    null,
    2,
  ),
);

// 4. Download the video itself.
const videoPath = path.join(refDir, 'video.mp4');
console.log(`Downloading -> ${videoPath}`);
const dl = spawnSync(
  'yt-dlp',
  [
    '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b', // best mp4
    '--merge-output-format', 'mp4',
    '-o', videoPath,
    '--no-warnings',
    '--no-playlist',
    url,
  ],
  { stdio: 'inherit' },
);
if (dl.status !== 0) {
  console.error('yt-dlp download failed.');
  process.exit(1);
}

// 5. Transcribe (unless --no-transcribe).
if (skipTranscribe) {
  console.log(`\nDone (download only): ${refDir}`);
  process.exit(0);
}

if (!process.env.GROQ_API_KEY) {
  console.error('\nDownloaded, but GROQ_API_KEY missing — skipping transcribe.');
  console.error(`Run later: node scripts/transcribe.js ${videoPath}`);
  process.exit(0);
}

// Extract audio (same shape as scripts/transcribe.js).
const audioPath = path.join(refDir, 'audio.mp3');
console.log(`\nExtracting audio -> ${audioPath}`);
const ff = spawnSync(
  'ffmpeg',
  ['-y', '-i', videoPath, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k', audioPath],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);
if (ff.status !== 0) {
  console.error('ffmpeg failed.');
  process.exit(1);
}

console.log('Sending to Groq Whisper...');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const result = await groq.audio.transcriptions.create({
  file: fs.createReadStream(audioPath),
  model: 'whisper-large-v3',
  response_format: 'verbose_json',
  timestamp_granularities: ['word', 'segment'],
  // Note: no language hint — references may be in any language.
});

const transcriptPath = path.join(refDir, 'transcript.json');
fs.writeFileSync(transcriptPath, JSON.stringify(result, null, 2));
fs.rmSync(audioPath, { force: true }); // audio.mp3 is intermediate

console.log(`\nDone: ${refDir}`);
console.log(`  video.mp4         ${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(1)} MB`);
console.log(`  transcript.json   ${result.words?.length ?? 0} words, ${result.duration}s`);
console.log(`  info.json         ${info.title}`);
console.log(`\nNext: in Claude Code, say something like:`);
console.log(`  "Edit input/myreel.mp4 to feel like reference/${name}/ — same hook pattern, same pacing."`);
