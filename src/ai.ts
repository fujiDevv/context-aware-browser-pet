import { detectPageCategory, mapActivityToEmotion, AI_COMMENTS } from './rules';

interface AiEmotionResponse {
  success: boolean;
  emotion: string;
  comment?: string;
  category?: string;
  sentiment?: string;
  error?: string;
}

export async function getAiEmotion(
  pageTitle: string,
  metaDescription: string | undefined,
  apiKey: string,
  persona: string,
  statsContext?: string,
  sentimentSensitivity: number = 50
): Promise<{ emotion: string; comment?: string; category?: string; sentiment?: string }> {
  try {
    // 1. Try Gemini Nano (Built-in Prompt API) first if available
    const geminiNanoAvailable = await checkGeminiNanoAvailability();
    if (geminiNanoAvailable === 'readily' || geminiNanoAvailable === 'after-download') {
      try {
        const result = await runGeminiNanoInference(pageTitle, metaDescription, persona, statsContext);
        if (result) return result;
      } catch (e) {
        console.warn('[Clawd AI] Gemini Nano inference failed, falling back to DistilBERT:', e);
      }
    }

    // 2. Fallback to Local DistilBERT (via Offscreen document)
    const response = await new Promise<AiEmotionResponse>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'get-local-ai-emotion',
          pageTitle,
          metaDescription,
          persona,
          statsContext,
          sentimentSensitivity
        },
        (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (res && res.success) {
            resolve(res);
          } else {
            reject(new Error(res?.error || 'Unknown error'));
          }
        }
      );
    });

    return {
      emotion: response.emotion || 'happy',
      comment: response.comment,
      category: response.category,
      sentiment: response.sentiment
    };
  } catch (error) {
    console.warn('[Clawd Local AI] All AI paths failed, falling back to happy:', error);
    return { emotion: 'happy' };
  }
}

async function checkGeminiNanoAvailability(): Promise<'readily' | 'after-download' | 'no'> {
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).substring(7);
    const handler = (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.type !== 'PET_AI_AVAILABILITY_CHECK_RESPONSE' || event.data.id !== requestId) return;
      window.removeEventListener('message', handler);
      resolve(event.data.availability);
    };
    window.addEventListener('message', handler);
    window.postMessage({ type: 'PET_AI_AVAILABILITY_CHECK_REQUEST', id: requestId }, '*');
    
    // Timeout fallback
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve('no');
    }, 2000);
  });
}

async function runGeminiNanoInference(
  pageTitle: string,
  metaDescription: string | undefined,
  persona: string,
  statsContext: string | undefined
): Promise<{ emotion: string; comment: string; category: string; sentiment: string } | null> {
  const systemPrompt = `You are a browser pet companion. Analyze the user's current webpage and provide a reaction.
Respond ONLY with a JSON object: { "emotion": "...", "comment": "...", "category": "...", "sentiment": "..." }.
Possible emotions: happy, sad, angry, crying, working-thinking, reading, yoga, eating, coding, working-typing, dancing, cool, love, celebrating, mindblown, gaming, working-debugger.
Possible categories: coding, reading, music, video, social, gaming, shopping, search, general.
Possible sentiments: POSITIVE, NEGATIVE, NEUTRAL.
Current Pet Stats: ${statsContext || 'Normal'}.
Persona: ${persona}.`;

  const prompt = `Page Title: ${pageTitle}
Meta Description: ${metaDescription || 'None'}`;

  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).substring(7);
    const handler = (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.type !== 'PET_AI_PROMPT_RESPONSE' || event.data.id !== requestId) return;
      window.removeEventListener('message', handler);
      if (event.data.error) {
        resolve(null);
      } else {
        try {
          const parsed = JSON.parse(event.data.resultText);
          resolve(parsed);
        } catch (e) {
          resolve(null);
        }
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({ type: 'PET_AI_PROMPT_REQUEST', id: requestId, systemPrompt, prompt }, '*');

    // Timeout fallback
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(null);
    }, 10000);
  });
}
