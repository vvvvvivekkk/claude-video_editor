// scripts/transcribe.js
// Extracts audio from input video, sends to Groq's Whisper (whisper-large-v3),
// saves word-level transcript to data/transcript.json.
//
// Usage:
//   node scripts/transcribe.js input/my-video.mp4
//
// Requires GROQ_API_KEY in .env (free tier: https://console.groq.com/keys)

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Groq from 'groq-sdk';

const inputVideo = process.argv[2];
if (!inputVideo) {
  console.error('Usage: node scripts/transcribe.js <path-to-video>');
  process.exit(1);
}
if (!fs.existsSync(inputVideo)) {
  console.error(`File not found: ${inputVideo}`);
  process.exit(1);
}
if (!process.env.GROQ_API_KEY) {
  console.error('Missing GROQ_API_KEY. Add it to .env');
  process.exit(1);
}

const base = path.basename(inputVideo, path.extname(inputVideo));
const audioPath = path.join('data', `${base}.mp3`);
const transcriptPath = path.join('data', `${base}.transcript.json`);

// 1. Extract audio (mono, 16kHz, mp3) — small file, fast upload.
console.log('Extracting audio ->', audioPath);
const ff = spawnSync('ffmpeg', [
  '-y',
  '-i', inputVideo,
  '-vn',
  '-ac', '1',
  '-ar', '16000',
  '-b:a', '64k',
  audioPath,
], { stdio: 'inherit' });
if (ff.status !== 0) {
  console.error('ffmpeg failed. Is it installed and on PATH?');
  process.exit(1);
}

// 2. Send to Groq Whisper with word timestamps.
console.log('Sending to Groq Whisper...');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const result = await groq.audio.transcriptions.create({
  file: fs.createReadStream(audioPath),
  model: 'whisper-large-v3',
  response_format: 'verbose_json',
  timestamp_granularities: ['word', 'segment'],
  language: 'en',
});

// 3. Save the word-level transcript.
fs.writeFileSync(transcriptPath, JSON.stringify(result, null, 2));
console.log(`\nSaved: ${transcriptPath}`);
console.log(`Words: ${result.words?.length ?? 0}`);
console.log(`Duration: ${result.duration}s`);
console.log(`\nNext: open ${transcriptPath} in Claude Code and say "make cuts.json"`);
