export function getRuntimeUrl(path: string = ''): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL(path);
    }
  } catch (e) {
    // Runtime can disappear while extension pages are being unloaded.
  }

  return '';
}

export function isFirefoxRuntime(): boolean {
  const runtimeUrl = getRuntimeUrl();
  if (runtimeUrl) {
    return runtimeUrl.startsWith('moz-extension://');
  }

  return typeof navigator !== 'undefined' && /\bFirefox\//.test(navigator.userAgent);
}

export function supportsOffscreenDocuments(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.offscreen !== 'undefined' &&
    typeof chrome.offscreen.createDocument === 'function'
  );
}
