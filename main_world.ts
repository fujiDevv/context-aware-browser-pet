// Captured in the webpage's MAIN world context to bypass Content Security Policies
const currentScript = document.currentScript as HTMLScriptElement;
const BRIDGE_TOKEN = currentScript?.dataset.token;

window.addEventListener('error', (event) => {
  window.postMessage({ type: 'PET_PAGE_ERROR', message: event.message, token: BRIDGE_TOKEN }, '*');
});

window.addEventListener('unhandledrejection', (event) => {
  window.postMessage({ type: 'PET_PAGE_ERROR', message: event.reason?.message || 'Unhandled rejection', token: BRIDGE_TOKEN }, '*');
});

window.addEventListener('message', async (event) => {
  if (event.source !== window || !event.data || event.data.token !== BRIDGE_TOKEN) return;

  if (event.data.type === 'PET_AI_AVAILABILITY_CHECK_REQUEST') {
    const lm = (globalThis as any).ai?.languageModel || (globalThis as any).LanguageModel || (window as any).ai?.languageModel || (window as any).LanguageModel;
    let availability = 'unavailable';
    
    if (lm) {
      try {
        if (typeof lm.availability === 'function') {
          availability = await lm.availability();
        } else if (typeof lm.capabilities === 'function') {
          const caps = await lm.capabilities();
          availability = caps.available;
        }
      } catch (e) {
        console.error('[Clawd Local AI] Availability check failed:', e);
      }
    }
    
    // In the new API, availability is "unavailable" | "downloadable" | "downloading" | "available"
    window.postMessage({ type: 'PET_AI_AVAILABILITY_CHECK_RESPONSE', id: event.data.id, availability, token: BRIDGE_TOKEN }, '*');
  }

  if (event.data.type === 'PET_AI_PROMPT_REQUEST') {
    const { id, systemPrompt, prompt } = event.data;
    const lm = (globalThis as any).ai?.languageModel || (globalThis as any).LanguageModel || (window as any).ai?.languageModel || (window as any).LanguageModel;

    if (!lm) {
      window.postMessage({ type: 'PET_AI_PROMPT_RESPONSE', id, error: 'built-in Prompt API (LanguageModel) is not defined in this context', token: BRIDGE_TOKEN }, '*');
      return;
    }

    let session: any = null;
    try {
      let availability = 'unavailable';
      if (typeof lm.availability === 'function') {
        availability = await lm.availability();
      } else if (typeof lm.capabilities === 'function') {
        const caps = await lm.capabilities();
        availability = caps.available;
      }

      if (availability !== 'available' && availability !== 'downloadable' && availability !== 'downloading') {
        window.postMessage({ type: 'PET_AI_PROMPT_RESPONSE', id, error: 'Gemini Nano model is not ready: ' + availability, token: BRIDGE_TOKEN }, '*');
        return;
      }

      const createOptions: any = {};
      if (systemPrompt) {
        createOptions.systemPrompt = systemPrompt;
        createOptions.initialPrompts = [{ role: 'system', content: systemPrompt }];
      }

      console.log('[Clawd AI] Executing local Gemini Nano inference (MAIN_WORLD)...');
      session = await lm.create(createOptions);

      const resultText = await session.prompt(prompt);
      window.postMessage({ type: 'PET_AI_PROMPT_RESPONSE', id, resultText, token: BRIDGE_TOKEN }, '*');

    } catch (error: any) {
      window.postMessage({ type: 'PET_AI_PROMPT_RESPONSE', id, error: error.message || String(error), token: BRIDGE_TOKEN }, '*');
    } finally {
      if (session) {
        try {
          if (typeof session.destroy === 'function') {
            await session.destroy();
          } else if (typeof session.close === 'function') {
            await session.close();
          }
        } catch (err) { console.warn('[Clawd Main World] WAAPI cancellation error:', err); }
      }
    }
  }
});
