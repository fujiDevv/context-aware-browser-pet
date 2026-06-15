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
    const aiGlobal = (globalThis as any).ai || window.ai;
    let availability = 'no';
    if (aiGlobal && (typeof aiGlobal.languageModel !== 'undefined' || typeof aiGlobal.assistant !== 'undefined')) {
      const modelAPI = aiGlobal.languageModel || aiGlobal.assistant;
      try {
        if (typeof modelAPI.availability === 'function') {
          availability = await modelAPI.availability();
        } else if (typeof modelAPI.capabilities === 'function') {
          const caps = await modelAPI.capabilities();
          availability = caps.available || 'no';
        }
      } catch (e) {
        console.error('[Clawd Local AI] Availability check failed:', e);
      }
    }
    window.postMessage({ type: 'PET_AI_AVAILABILITY_CHECK_RESPONSE', id: event.data.id, availability, token: BRIDGE_TOKEN }, '*');
  }

  if (event.data.type === 'PET_AI_PROMPT_REQUEST') {
    const { id, systemPrompt, prompt } = event.data;
    const aiGlobal = (globalThis as any).ai || window.ai;

    if (!aiGlobal || (typeof aiGlobal.languageModel === 'undefined' && typeof aiGlobal.assistant === 'undefined')) {
      window.postMessage({ type: 'PET_AI_PROMPT_RESPONSE', id, error: 'built-in Prompt API is not defined in this context', token: BRIDGE_TOKEN }, '*');
      return;
    }

    const modelAPI = aiGlobal.languageModel || aiGlobal.assistant;
    let session: any = null;
    try {
      const availability = typeof modelAPI.availability === 'function'
        ? await modelAPI.availability()
        : (await modelAPI.capabilities?.())?.available || 'no';

      if (availability !== 'readily' && availability !== 'after-download') {
        window.postMessage({ type: 'PET_AI_PROMPT_RESPONSE', id, error: 'Gemini Nano model is not ready: ' + availability, token: BRIDGE_TOKEN }, '*');
        return;
      }

      session = await modelAPI.create({
        systemPrompt: systemPrompt
      });

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
