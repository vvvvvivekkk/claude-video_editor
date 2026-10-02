// scripts/motion.js
// Scaffolds a HyperFrames project folder for one video. Composes the base
// prompt + the chosen style block into motion/projects/<name>/PROMPT.md,
// copies the fonts and sfx folders in, and tells you what to say to Claude
// Code next.
//
// Usage:
//   npm run motion -- <name>                      # defaults to liquid-glass
//   npm run motion -- <name> --style pop-bold
//   npm run motion -- <name> --style kinetic-type --master output/other.mp4
//
// Styles available: liquid-glass (default), kinetic-type, editorial-grain, pop-bold.
//
// What this script does NOT do: it does not run HyperFrames. HyperFrames is
// driven by Claude Code from inside the project folder, because the model
// authors the HTML. The scaffold is the hand-off.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const name = args[0];
if (!name || name.startsWith('--')) {
  console.error('Usage: npm run motion -- <project-name> [--style NAME] [--master PATH]');
  console.error('Styles: liquid-glass (default), kinetic-type, editorial-grain, pop-bold');
  process.exit(1);
}

function getFlag(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const style = getFlag('--style', 'liquid-glass');
const master = getFlag('--master', 'output/edited-master.mp4');

const stylePath = path.join('motion', 'styles', `${style}.md`);
if (!fs.existsSync(stylePath)) {
  console.error(`Unknown style: ${style}`);
  console.error('Available: liquid-glass, kinetic-type, editorial-grain, pop-bold');
  process.exit(1);
}

if (!fs.existsSync(master)) {
  console.error(`Master video not found: ${master}`);
  console.error('Run `npm run cut -- input/<your-video>.mp4` first.');
  process.exit(1);
}

const projectDir = path.join('motion', 'projects', name);
if (fs.existsSync(projectDir)) {
  console.error(`Project already exists: ${projectDir}`);
  console.error('Delete it or pick another name.');
  process.exit(1);
}

fs.mkdirSync(projectDir, { recursive: true });
fs.mkdirSync(path.join(projectDir, 'renders'), { recursive: true });

// Copy fonts/ and sfx/ into the project so relative paths resolve.
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(path.join('motion', 'fonts'), path.join(projectDir, 'fonts'));
copyDir(path.join('motion', 'sfx'), path.join(projectDir, 'sfx'));

// Assemble PROMPT.md = BASE_PROMPT.md with the <<<STYLE>>> block substituted
// and the master path pointed at the real file.
const base = fs.readFileSync(path.join('motion', 'BASE_PROMPT.md'), 'utf8');
const styleBlock = fs.readFileSync(stylePath, 'utf8').trim();

// The master is referenced in BASE_PROMPT.md as a relative path from
// motion/projects/<name>/, which resolves to ../../<master>.
const relMaster = path.posix.join('..', '..', '..', master.split(path.sep).join('/'));

const prompt = base
  .replace(/\.\.\/\.\.\/output\/edited-master\.mp4/g, relMaster)
  .replace(/<<<PASTE ONE STYLE BLOCK HERE[^>]*>>>/, styleBlock);

fs.writeFileSync(path.join(projectDir, 'PROMPT.md'), prompt);

// A tiny README inside the project.
fs.writeFileSync(
  path.join(projectDir, 'README.md'),
  `# Motion project: ${name}\n\nStyle: ${style}\nMaster: ${master}\n\nOpen Claude Code in this folder and say: **Follow PROMPT.md.**\n\nWhen it finishes, you'll have renders/overlay.mov (ProRes 4444 with alpha). Then from the repo root:\n\n    npm run compose -- ${name}\n\nto overlay it onto the master.\n`
);

console.log(`\nScaffolded: ${projectDir}`);
console.log(`  PROMPT.md   base + ${style} style block, master path resolved`);
console.log(`  fonts/      copied from motion/fonts/`);
console.log(`  sfx/        copied from motion/sfx/`);
console.log(`  renders/    (empty; HyperFrames will write renders/overlay.mov here)`);
console.log('\nNext:');
console.log(`  1. cd ${projectDir}`);
console.log('  2. claude');
console.log('  3. Say: Follow PROMPT.md.');
console.log(`  4. When overlay.mov is rendered, from the repo root:  npm run compose -- ${name}`);
