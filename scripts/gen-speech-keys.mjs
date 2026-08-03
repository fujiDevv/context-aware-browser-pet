/**
 * Generates `speech_<fnv1a32hex>` message keys for every unique speech
 * string emitted by the pet (content-script bubbles, persona dialogues,
 * AI reaction comments, daily-insight fallbacks).
 *
 * Extraction sources:
 *  - src/core/personas/*.ts   → every string-array value (dialogue lines)
 *  - src/core/rules.ts        → every string inside the AI_COMMENTS const
 *  - src/content/content.ts, src/offscreen/offscreen.ts, src/core/ai.ts
 *                              → the first argument of every `speech(...)` call
 *
 * Usage:
 *   node scripts/gen-speech-keys.mjs              # append keys to en catalog
 *   node scripts/gen-speech-keys.mjs --dry-run    # print stats only
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(text) {
  let h = FNV_OFFSET >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h;
}

function speechKey(text) {
  return 'speech_' + fnv1a(text).toString(16).padStart(8, '0');
}

/** Extract all quoted string literals from `src` (single/double/backtick). */
function quotedStrings(src) {
  const out = [];
  const re = /(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g;
  let m;
  while ((m = re.exec(src))) out.push(m[2]);
  return out;
}

/** Strings in a `Record<string, string[]>` that are array values (skip keys). */
function stringArrayValues(src) {
  const out = [];
  const re = /(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g;
  let m;
  while ((m = re.exec(src))) {
    const s = m[2];
    // Positional check: the char right after this exact token decides key vs value
    const after = src.slice(m.index + m[0].length);
    const next = after.replace(/^\s*/, '')[0];
    if (next !== ':') out.push(s);
  }
  return out;
}

function extractSpeech() {
  const set = new Map(); // string -> source

  // 1. Persona dialogue files (all array values are speech)
  const personaDir = join(root, 'src/core/personas');
  for (const f of readdirSync(personaDir).filter((f) => f.endsWith('.ts'))) {
    const src = readFileSync(join(personaDir, f), 'utf8');
    for (const s of stringArrayValues(src)) set.set(s, `personas/${f}`);
  }

  // 2. AI_COMMENTS region of rules.ts
  const rulesSrc = readFileSync(join(root, 'src/core/rules.ts'), 'utf8');
  const aiStart = rulesSrc.indexOf('export const AI_COMMENTS');
  const aiEnd = rulesSrc.indexOf('export const EMOTION_FALLBACKS');
  if (aiStart === -1 || aiEnd === -1) throw new Error('Could not locate AI_COMMENTS region in rules.ts');
  for (const s of quotedStrings(rulesSrc.slice(aiStart, aiEnd))) set.set(s, 'rules.ts AI_COMMENTS');

  // 3. speech(...) first-arg literals in the wrapped emission files
  for (const rel of ['src/content/content.ts', 'src/offscreen/offscreen.ts', 'src/core/ai.ts']) {
    const src = readFileSync(join(root, rel), 'utf8');
    const re = /\bspeech\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;
    let m;
    while ((m = re.exec(src))) set.set(m[2], rel);
  }

  // Exclude non-speech artifacts (shouldn't exist, but stay safe)
  for (const bad of ['src/shared/speech-i18n.ts', 'import', 'return']) {
    set.delete(bad);
  }

  return set;
}

const strings = extractSpeech();
const byKey = new Map();
const collisions = [];
for (const [text, source] of strings) {
  const key = speechKey(text);
  if (byKey.has(key) && byKey.get(key) !== text) {
    collisions.push([key, byKey.get(key), text]);
  } else {
    byKey.set(key, text);
  }
}

console.log(`Unique speech strings: ${strings.size}`);
console.log(`Speech keys: ${byKey.size}`);
if (collisions.length) {
  console.error('HASH COLLISIONS:', collisions);
  process.exit(1);
}

// Write the key -> english map for the translation step
const mapPath = join(root, 'scripts/.speech-keys.json');
mkdirSync(join(root, 'scripts'), { recursive: true });
writeFileSync(mapPath, JSON.stringify([...byKey.entries()].sort(), null, 2));
console.log(`Wrote ${mapPath}`);

const dryRun = process.argv.includes('--dry-run');
if (dryRun) process.exit(0);

/** Removes every `speech_*` key from a catalog (rebuild semantics). */
function stripSpeechKeys(data) {
  for (const key of Object.keys(data)) {
    if (key.startsWith('speech_')) delete data[key];
  }
}

const localesDir = join(root, 'public/_locales');
for (const loc of readdirSync(localesDir)) {
  const p = join(localesDir, loc, 'messages.json');
  if (!existsSync(p)) continue;
  const data = JSON.parse(readFileSync(p, 'utf8'));
  const before = Object.keys(data).filter((k) => k.startsWith('speech_')).length;
  stripSpeechKeys(data);
  let added = 0;
  for (const [key, text] of [...byKey.entries()].sort()) {
    data[key] = { message: text };
    added++;
  }
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
  console.log(`Locale ${loc}: removed ${before} stale speech keys, wrote ${added} speech keys (total: ${Object.keys(data).length})`);
}
