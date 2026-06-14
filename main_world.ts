// Captured in the webpage's MAIN world context to bypass Content Security Policies
window.addEventListener('error', (event) => {
  window.postMessage({ type: 'PET_PAGE_ERROR', message: event.message }, '*');
});

window.addEventListener('unhandledrejection', (event) => {
  window.postMessage({ type: 'PET_PAGE_ERROR', message: event.reason?.message || 'Unhandled rejection' }, '*');
});

window.addEventListener('message', async (event) => {
  if (event.source !== window || !event.data) return;
  
  if (event.data.type === 'PET_AI_AVAILABILITY_CHECK_REQUEST') {
    console.log('[Clawd MAIN] Received AI availability check request');
    const aiGlobal = (globalThis as any).ai || (window as any).ai;
    let availability = 'no';
    if (aiGlobal && (typeof aiGlobal.languageModel !== 'undefined' || typeof aiGlobal.assistant !== 'undefined')) {
      console.log('[Clawd MAIN] window.ai detected!', aiGlobal);
      const modelAPI = aiGlobal.languageModel || aiGlobal.assistant;
      try {
        if (typeof modelAPI.availability === 'function') {
          availability = await modelAPI.availability();
        } else if (typeof modelAPI.capabilities === 'function') {
          const caps = await modelAPI.capabilities();
          availability = caps.available || 'no';
        }
        console.log('[Clawd MAIN] AI availability:', availability);
      } catch (e) {
        console.error('[Clawd Local AI] Availability check failed:', e);
      }
    } else {
      console.log('[Clawd MAIN] window.ai is undefined or missing languageModel/assistant in MAIN world');
    }
    window.postMessage({ type: 'PET_AI_AVAILABILITY_CHECK_RESPONSE', id: event.data.id, availability }, '*');
  }

  if (event.data.type === 'PET_AI_PROMPT_REQUEST') {
    const { id, systemPrompt, prompt } = event.data;
    const aiGlobal = (globalThis as any).ai || (window as any).ai;
    
    if (!aiGlobal || (typeof aiGlobal.languageModel === 'undefined' && typeof aiGlobal.assistant === 'undefined')) {
      window.postMessage({ type: 'PET_AI_PROMPT_RESPONSE', id, error: 'built-in Prompt API is not defined in this context' }, '*');
      return;
    }

    const modelAPI = aiGlobal.languageModel || aiGlobal.assistant;
    let session: any = null;
    try {
      const availability = typeof modelAPI.availability === 'function'
        ? await modelAPI.availability()
        : (await modelAPI.capabilities?.())?.available || 'no';

      if (availability !== 'readily' && availability !== 'after-download') {
        window.postMessage({ type: 'PET_AI_PROMPT_RESPONSE', id, error: 'Gemini Nano model is not ready: ' + availability }, '*');
        return;
      }

      session = await modelAPI.create({
        systemPrompt: systemPrompt
      });

      const resultText = await session.prompt(prompt);
      window.postMessage({ type: 'PET_AI_PROMPT_RESPONSE', id, resultText }, '*');

    } catch (error: any) {
      window.postMessage({ type: 'PET_AI_PROMPT_RESPONSE', id, error: error.message || String(error) }, '*');
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
