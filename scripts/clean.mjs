import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const zipFile = path.resolve(rootDir, 'dist-package.zip');

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
if (fs.existsSync(zipFile)) {
  fs.rmSync(zipFile, { force: true });
}

// Clean any root duplicate folders/files created by macOS Finder (e.g. dist 2, dist 3, etc.)
for (const item of fs.readdirSync(rootDir)) {
  if (/\s\d+/i.test(item) || item.toLowerCase().includes('copy')) {
    const fullPath = path.resolve(rootDir, item);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

console.log('[Clean Script] Cleaned dist/ and all macOS duplicate files successfully.');
