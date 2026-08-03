/**
 * Merges a speech translation map into a locale catalog.
 *
 * Usage:
 *   node scripts/merge-speech.mjs <lang>
 *
 * Reads `scripts/speech-translations/<lang>.json` — a flat map of
 * `{ "speech_xxxx": "translated text" }` — and writes it into
 * `public/_locales/<lang>/messages.json`. Keys not present in the map keep
 * their existing (English placeholder) message.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lang = process.argv[2];
if (!lang) {
  console.error('Usage: node scripts/merge-speech.mjs <lang>');
  process.exit(1);
}

const mapPath = join(root, 'scripts/speech-translations', `${lang}.json`);
if (!existsSync(mapPath)) {
  console.error(`Missing translation map: ${mapPath}`);
  process.exit(1);
}

const catalogPath = join(root, 'public/_locales', lang, 'messages.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const map = JSON.parse(readFileSync(mapPath, 'utf8'));

let merged = 0;
let missing = 0;
for (const [key, text] of Object.entries(map)) {
  if (typeof text !== 'string' || !text.trim()) {
    console.error(`Empty translation for ${key}`);
    process.exit(1);
  }
  catalog[key] = { message: text };
  merged++;
}
for (const key of Object.keys(catalog)) {
  if (key.startsWith('speech_') && !map[key]) missing++;
}

writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`${lang}: merged ${merged} speech translations; ${missing} speech keys still in English.`);
