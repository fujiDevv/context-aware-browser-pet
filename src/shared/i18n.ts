import { extensionApi } from './platform';

/**
 * Localized string helpers built on chrome.i18n / browser.i18n.
 *
 * Message keys live in `_locales/<lang>/messages.json` and use underscores
 * (dots are not permitted in Chrome i18n message key names).
 */

/** Returns the localized message for `key`, or '' if missing. */
export function t(key: string, substitutions?: string | string[]): string {
  try {
    return extensionApi.i18n.getMessage(key, substitutions) || '';
  } catch {
    return '';
  }
}

/** Returns the localized message for `key`, falling back to `fallback`. */
export function tOr(key: string, fallback: string, substitutions?: string | string[]): string {
  const msg = t(key, substitutions);
  return msg || fallback;
}

/** Maps an internal mood id (EMOTIONS_METADATA key) to a `mood_*` message key. */
const MOOD_KEY_MAP: Record<string, string> = {
  'working-thinking': 'mood_thinking',
  'working-typing': 'mood_typing',
  'working-wizard': 'mood_wizard',
  'working-debugger': 'mood_debugger',
  'working-building': 'mood_building',
  'working-juggling': 'mood_juggling',
  'working-rubber-duck': 'mood_rubberDuck',
  'working-merging': 'mood_merging',
  'working-deploying': 'mood_deploying',
  'working-firefighting': 'mood_firefighting',
  'working-sweeping': 'mood_sweeping',
  'battery-low': 'mood_lowBattery',
  'ice-cream': 'mood_iceCream',
};

/** Localized display name for a mood id (e.g. 'happy' -> "Happy"), falling back to `fallback`. */
export function getMoodName(mood: string, fallback: string): string {
  const key = MOOD_KEY_MAP[mood] || `mood_${mood}`;
  return tOr(key, fallback);
}

/** Localized display name for a dominant trait id, falling back to `fallback`. */
export function getTraitName(trait: string, fallback: string): string {
  return tOr(`trait_${trait}`, fallback);
}

/**
 * Localizes the current document in place:
 *  - `data-i18n`            -> element text content
 *  - `data-i18n-html`       -> element inner HTML (message may include markup)
 *  - `data-i18n-placeholder`-> input placeholder
 *  - `data-i18n-title`      -> element title attribute
 *  - `data-i18n-alt`        -> element alt attribute
 * Also sets <html lang> to the UI language.
 */
export function localizePage(): void {
  try {
    const uiLang = extensionApi.i18n.getUILanguage();
    if (uiLang) document.documentElement.lang = uiLang;
  } catch {
    // keep default
  }

  const apply = (selector: string, setter: (el: HTMLElement, msg: string) => void): void => {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      const key = el.getAttribute(selector.slice(1));
      if (!key) return;
      const msg = t(key);
      if (msg) setter(el, msg);
    });
  };

  apply('[data-i18n]', (el, msg) => { el.textContent = msg; });
  apply('[data-i18n-html]', (el, msg) => { el.innerHTML = msg; });
  apply('[data-i18n-placeholder]', (el, msg) => { el.setAttribute('placeholder', msg); });
  apply('[data-i18n-title]', (el, msg) => { el.setAttribute('title', msg); });
  apply('[data-i18n-alt]', (el, msg) => { el.setAttribute('alt', msg); });
}
