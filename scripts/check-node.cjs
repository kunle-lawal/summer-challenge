/**
 * Fails fast when Node is too old for Vite 5 (needs 18+).
 * Run via npm predev/prebuild — works on Node 10+ (no ESM/top-level await).
 */
var major = parseInt(process.versions.node.split('.')[0], 10);
if (major < 18) {
  console.error('');
  console.error('  This project needs Node.js 18 or newer (recommended: 20 — see .nvmrc).');
  console.error('  Current version: ' + process.version);
  console.error('');
  console.error('  Fix: install Node 20, then in this repo run:');
  console.error('    nvm use          # if you use nvm');
  console.error('    # or: https://nodejs.org/');
  console.error('');
  process.exit(1);
}
