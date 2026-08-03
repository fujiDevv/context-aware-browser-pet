import { t } from './i18n';

/**
 * Localized speech for the pet's in-page dialogue (content script bubbles,
 * reaction comments, persona dialogues and daily-insight fallbacks).
 *
 * Speech strings stay authored in English in code and are used as the
 * fallback text. Each unique English string is looked up in
 * `_locales/<lang>/messages.json` under a deterministic hash-derived key
 * (`speech_<fnv1a32hex>`), so identical English strings share one key and
 * one translation across personas, categories and locales.
 *
 * The hash must match `scripts/gen-speech-keys.mjs` exactly.
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Deterministic FNV-1a 32-bit hash of `text` (must match the generator script). */
export function speechKey(text: string): string {
  let h = FNV_OFFSET >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return 'speech_' + h.toString(16).padStart(8, '0');
}

/** Applies `$N` substitutions to a plain string (fallback when the lookup misses). */
function applySubstitutions(text: string, substitutions?: string | string[]): string {
  if (!substitutions) return text;
  const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
  return text.replace(/\$(\d)/g, (match, index: string) => subs[Number(index) - 1] ?? match);
}

/**
 * Returns the localized line for an English speech string, substituting
 * `$1`/`$2` placeholders. Falls back to the (substituted) English text when
 * no translation exists (e.g. brand-new strings not yet shipped to locales).
 */
export function speech(text: string, substitutions?: string | string[]): string {
  const localized = t(speechKey(text), substitutions);
  if (localized) return localized;
  return applySubstitutions(text, substitutions);
}
