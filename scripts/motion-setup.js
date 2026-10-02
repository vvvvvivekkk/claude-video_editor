// scripts/motion-setup.js
// One-shot prereq check for the motion stage. Based on PROMPT 01 of
// Damiano Caudullo's "Motion Graphics with Claude Code" PDF.
//
// Checks: Node 22+, ffmpeg, whisper-cpp. Then installs the HyperFrames
// skills for Claude Code and runs `npx hyperframes doctor`.
//
// Usage:
//   npm run motion:setup
//
// If something needs admin rights, we stop and print the exact command for
// you to run. We never try to sudo on your behalf.

import { spawnSync } from 'node:child_process';
import os from 'node:os';

const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';

function which(cmd) {
  const r = spawnSync(isWindows ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim().split(/\r?\n/)[0] : null;
}

function version(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || r.stderr).trim().split(/\r?\n/)[0] : null;
}

function heading(s) {
  console.log(`\n${s}\n${'-'.repeat(s.length)}`);
}

const installHints = {
  node: isMac
    ? 'brew install node'
    : isWindows
      ? 'winget install OpenJS.NodeJS.LTS'
      : 'see https://nodejs.org/en/download',
  ffmpeg: isMac
    ? 'brew install ffmpeg'
    : isWindows
      ? 'winget install "FFmpeg (Essentials Build)"'
      : 'sudo apt install ffmpeg  (or your distro equivalent)',
  'whisper-cpp': isMac
    ? 'brew install whisper-cpp'
    : isWindows
      ? 'Download the latest release from https://github.com/ggml-org/whisper.cpp/releases and add it to PATH'
      : 'see https://github.com/ggml-org/whisper.cpp#quick-start',
};

const problems = [];
const alreadyThere = [];

heading('Motion stage prereq check');

// 1. Node 22+
{
  const v = version('node', ['--version']); // like "v22.3.0"
  if (!v) {
    problems.push({ tool: 'node', fix: installHints.node });
    console.log('  node        MISSING');
  } else {
    const major = parseInt(v.replace(/^v/, '').split('.')[0], 10);
    if (major < 22) {
      problems.push({ tool: `node (have ${v}, need v22+)`, fix: installHints.node });
      console.log(`  node        ${v}  (too old, need v22+)`);
    } else {
      alreadyThere.push(`node ${v}`);
      console.log(`  node        ${v}  OK`);
    }
  }
}

// 2. ffmpeg
{
  const v = version('ffmpeg', ['-version']);
  if (!v) {
    problems.push({ tool: 'ffmpeg', fix: installHints.ffmpeg });
    console.log('  ffmpeg      MISSING');
  } else {
    alreadyThere.push(v);
    console.log(`  ffmpeg      ${v}  OK`);
  }
}

// 3. whisper-cpp (binary name is `whisper-cli` on most installs; the
// `whisper-cpp` wrapper is also common. Accept either.)
{
  const bin = which('whisper-cli') || which('whisper-cpp') || which('whisper');
  if (!bin) {
    problems.push({ tool: 'whisper-cpp', fix: installHints['whisper-cpp'] });
    console.log('  whisper-cpp MISSING');
  } else {
    alreadyThere.push(`whisper-cpp at ${bin}`);
    console.log(`  whisper-cpp ${bin}  OK`);
  }
}

if (problems.length) {
  heading('What you need to install');
  for (const p of problems) {
    console.log(`\n  ${p.tool}`);
    console.log(`    ${p.fix}`);
  }
  console.log('\nRun those, then re-run `npm run motion:setup`.');
  process.exit(1);
}

// 4. HyperFrames skills for Claude Code.
heading('Installing HyperFrames skills');
const skills = spawnSync('npx', ['-y', 'hyperframes', 'skills'], { stdio: 'inherit' });
if (skills.status !== 0) {
  console.error('\nhyperframes skills install failed. Try running it by hand:');
  console.error('  npx hyperframes skills');
  process.exit(1);
}

// 5. hyperframes doctor.
heading('Running hyperframes doctor');
const doctor = spawnSync('npx', ['-y', 'hyperframes', 'doctor'], { stdio: 'inherit' });
if (doctor.status !== 0) {
  console.error('\nhyperframes doctor reported errors. Fix the required items; ignore anything it calls optional (Docker, Kokoro, MusicGen).');
  process.exit(1);
}

heading('Done');
console.log(`\nAlready here: ${alreadyThere.join(', ')}`);
console.log('\nRestart Claude Code before using the new skills — they only load on a fresh start.');
console.log('\nNext: `npm run motion -- <project-name>` to scaffold a motion project for your cut video.');
