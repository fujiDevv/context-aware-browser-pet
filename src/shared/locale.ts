import { extensionApi, getRuntimeUrl } from './platform';

/**
 * Forced-language support.
 *
 * `chrome.i18n.getMessage` always resolves against the browser's UI language,
 * so a user-forced language needs its own catalog. We fetch the flattened
 * `messages.json` of the chosen locale and route `t()` lookups through it.
 *
 * Extension pages (options, popup, onboarding) and the offscreen document are
 * extension contexts and can `fetch()` packaged `_locales/*` files directly.
 * Content scripts cannot (Chrome does not serve `_locales` to content scripts
 * even via `web_accessible_resources`), so they request the catalog from the
 * background service worker with a `get-locale-catalog` message.
 */

export interface SupportedLocale {
  code: string;
  /** Display name in its own language (no translation needed). */
  nativeName: string;
}

/** The 10 locales shipped in `public/_locales`. */
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'es', nativeName: 'Español' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'pt_BR', nativeName: 'Português (Brasil)' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'zh_CN', nativeName: '中文（简体）' },
  { code: 'ko', nativeName: '한국어' },
  { code: 'hi', nativeName: 'हिन्दी' },
] as const;

export const LOCALE_CODES: readonly string[] = SUPPORTED_LOCALES.map((l) => l.code);

/** Select value meaning "follow the browser's UI language". */
export const AUTO_LOCALE = 'auto';

let forcedLocale: string | null = null;
let forcedCatalog: Record<string, string> | null = null;

/** BCP-47 code of the active forced locale, or null when following the browser. */
export function getForcedLocale(): string | null {
  return forcedLocale;
}

/** Message catalog of the active forced locale, or null. */
export function getForcedCatalog(): Record<string, string> | null {
  return forcedCatalog;
}

/** Effective UI language: forced locale if set, else the browser UI language. */
export function getEffectiveUILanguage(): string {
  return forcedLocale ?? extensionApi.i18n.getUILanguage();
}

function flattenCatalog(raw: Record<string, { message?: string } | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value.message === 'string') out[key] = value.message;
  }
  return out;
}

/** Fetches + flattens `_locales/<code>/messages.json` (extension contexts only). */
export async function fetchLocaleCatalog(localeCode: string): Promise<Record<string, string> | null> {
  try {
    const url = getRuntimeUrl(`_locales/${localeCode}/messages.json`);
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    return flattenCatalog(await res.json());
  } catch {
    return null;
  }
}

/** Swaps the active forced locale + catalog (null/null restores browser language). */
export function setForcedCatalog(localeCode: string | null, catalog: Record<string, string> | null): void {
  forcedLocale = localeCode;
  forcedCatalog = catalog;
}

function resolveLocale(localeCode: string | undefined | null): string | null {
  const code = localeCode && localeCode !== AUTO_LOCALE ? localeCode : null;
  if (!code || !LOCALE_CODES.includes(code)) return null;
  return code;
}

/**
 * Applies a forced locale from an extension context (direct fetch).
 * Call during page/offscreen init, and again when settings change.
 */
export async function applyForcedLocale(localeCode: string | undefined | null): Promise<void> {
  const code = resolveLocale(localeCode);
  if (!code) {
    setForcedCatalog(null, null);
    return;
  }
  const catalog = await fetchLocaleCatalog(code);
  setForcedCatalog(code, catalog);
}

/**
 * Applies a forced locale from a content script by asking the background
 * service worker for the catalog (content scripts cannot fetch `_locales`).
 */
export async function applyForcedLocaleViaMessage(localeCode: string | undefined | null): Promise<void> {
  const code = resolveLocale(localeCode);
  if (!code) {
    setForcedCatalog(null, null);
    return;
  }
  try {
    const res = await extensionApi.runtime.sendMessage<{ catalog: Record<string, string> | null }>({
      type: 'get-locale-catalog',
      locale: code,
    });
    setForcedCatalog(code, res?.catalog ?? null);
  } catch {
    setForcedCatalog(null, null);
  }
}
