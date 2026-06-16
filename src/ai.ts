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
  url: string,
  apiKey: string,
  persona: string,
  statsContext?: string,
  sentimentSensitivity: number = 50
): Promise<{ emotion: string; comment?: string; category?: string; sentiment?: string }> {
  try {
    const ogType = (document.querySelector('meta[property="og:type"]') as HTMLMetaElement | null)?.content;
    const category = detectPageCategory(url, pageTitle, ogType || undefined, metaDescription);

    // 1. Try Gemini Nano (Built-in Prompt API) first if available
    const geminiNanoAvailable = await checkGeminiNanoAvailability();
    if (geminiNanoAvailable === 'readily' || geminiNanoAvailable === 'after-download') {
      try {
        const result = await runGeminiNanoInference(pageTitle, metaDescription, category, persona, statsContext);
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
          category,
          persona,
          statsContext,
          sentimentSensitivity,
          url
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

export async function getDailyInsight(
  stats: any,
  persona: string
): Promise<string> {
  const geminiNanoAvailable = await checkGeminiNanoAvailability();
  if (geminiNanoAvailable !== 'readily' && geminiNanoAvailable !== 'after-download') {
    return getTemplateFallback(stats, persona);
  }

  const history = stats.siteCategoryHistory || {};
  const today = new Date().toISOString().split('T')[0];
  const todayCounts = history[today] || {};
  const categories = Object.entries(todayCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => `${cat} (${count} visits)`)
    .join(', ');

  const systemPrompt = `You are "Clawd", a perceptive browser pet with a ${persona} persona. 
Analyze the user's browsing day and provide a 1-2 sentence reflection.

DATA CONTEXT:
- Persona: ${persona}
- Level: ${stats.level}
- Top Categories Today: ${categories || 'None yet'}
- Total Pets: ${stats.totalPets}
- Total Feeds: ${stats.totalFeeds}

RULE:
- Speak directly to the user.
- Reflect your ${persona} personality perfectly.
- Keep it under 180 characters.
- Do not use placeholders like [User].`;

  const prompt = `Write our daily reflection for today based on these habits.`;

  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).substring(7);
    const handler = (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.type !== 'PET_AI_PROMPT_RESPONSE' || event.data.id !== requestId || event.data.token !== bridgeToken) return;
      window.removeEventListener('message', handler);
      if (event.data.error) {
        resolve(getTemplateFallback(stats, persona));
      } else {
        resolve(event.data.resultText.trim().replace(/^["']|["']$/g, ''));
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({ type: 'PET_AI_PROMPT_REQUEST', id: requestId, systemPrompt, prompt, token: bridgeToken }, '*');

    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(getTemplateFallback(stats, persona));
    }, 15000);
  });
}

function getTemplateFallback(stats: any, persona: string): string {
  const history = stats.siteCategoryHistory || {};
  const today = new Date().toISOString().split('T')[0];
  const todayCounts = history[today] || {};
  const topCategory = Object.entries(todayCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'general';

  const templates: Record<string, Record<string, string[]>> = {
    default: {
      coding: ["We spent a lot of time in the code today. Great progress!", "You were in the zone with that development work!"],
      social: ["It was a very social day! Hope you had some good chats.", "Caught up with the world today, didn't we?"],
      docs: ["So much learning today! Your curiosity is inspiring.", "We dove deep into the documentation. Knowledge is power!"],
      general: ["Another day of exploring the web together. I enjoyed the journey!", "Just chilling and browsing. It's been a pleasant day!"]
    },
    sarcastic: {
      coding: ["Oh look, more spaghetti code. My circuits are weeping.", "Compiling... still? Maybe try writing better logic next time."],
      social: ["Four hours of doomscrolling? Groundbreaking. Truly.", "Congratulations on keeping up with people who don't know you exist."],
      docs: ["Reading the manual? I'm shocked you actually found it.", "Absorbing information you'll forget in ten minutes. Nice."],
      general: ["We survived another day on the internet. Barely.", "Riveting session. I'm literally on the edge of my seat. Not."]
    },
    encouraging: {
      coding: ["You're building something amazing! Keep that momentum going.", "Every line of code today is a step toward greatness!"],
      social: ["Connecting with others is so important. Hope it was a bright spot!", "Sharing vibes and staying connected. You're doing great!"],
      docs: ["Your dedication to learning is beautiful. Wisdom looks good on you.", "Exploring and growing—that's the spirit!"],
      general: ["I love seeing the world through your tabs. Let's keep it up!", "Whatever we're doing, I'm just happy to be by your side."]
    },
    genz: {
      coding: ["The code is giving main character energy today. No cap.", "Secure the bag, write the script. It's a whole vibe."],
      social: ["Spilling the tea in the tabs today. Iconic.", "Scrolling was lowkey valid. 10/10 session."],
      docs: ["Gaining knowledge era is so back. Very demure.", "Inspecting the plot. We love to see it."],
      general: ["Just existing in your browser era. Valid.", "Today was a mood. Let's do it again tomorrow."]
    },
    kid: {
      coding: ["You're literally building the best map ever! OP!", "That code is cracked! Massive W!"],
      social: ["The lobby was super full today! Epic hangs.", "So many people chatting, it was wild!"],
      docs: ["Big brain plays today! You read so much lore.", "Leveling up your IRL intelligence stat! Epic!"],
      general: ["We had a massive W of a day exploring the internet!", "Best server ever. Let's play again tomorrow!"]
    },
    snarky: {
      coding: ["Found more bugs than features today. Classic you.", "I hope that code works better than your life choices."],
      social: ["If scrolling was a sport, you'd be an Olympic gold medalist.", "The internet is mostly ads, but you seem to love them."],
      docs: ["Wow, documentation. I didn't know you could read.", "Big brain energy? Or just clicking links randomly?"],
      general: ["Another day, another digital wasteland explored.", "I'm just here for the free WiFi, honestly."]
    }
  };

  const personaPool = templates[persona] || templates.default;
  const categoryPool = personaPool[topCategory] || personaPool.general;
  return categoryPool[Math.floor(Math.random() * categoryPool.length)];
}

let bridgeToken: string | null = null;

export function setBridgeToken(token: string): void {
  bridgeToken = token;
}

async function checkGeminiNanoAvailability(): Promise<'readily' | 'after-download' | 'no'> {
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).substring(7);
    const handler = (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.type !== 'PET_AI_AVAILABILITY_CHECK_RESPONSE' || event.data.id !== requestId || event.data.token !== bridgeToken) return;
      window.removeEventListener('message', handler);
      resolve(event.data.availability);
    };
    window.addEventListener('message', handler);
    window.postMessage({ type: 'PET_AI_AVAILABILITY_CHECK_REQUEST', id: requestId, token: bridgeToken }, '*');

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
  categoryHint: string,
  persona: string,
  statsContext: string | undefined
): Promise<{ emotion: string; comment: string; category: string; sentiment: string } | null> {
  const systemPrompt = `You are "Clawd", a highly perceptive and slightly ${persona} browser pet mascot. 
Your goal is to deeply analyze the user's intent on the current webpage and react accordingly.

Respond ONLY with a JSON object: 
{ 
  "emotion": "...", 
  "comment": "...", 
  "category": "...", 
  "sentiment": "...",
  "intent_summary": "..."
}

CRITICAL RULES:
1. Analyze if the user is working, learning, chilling, shopping, or struggling.
2. Choose from these emotions: happy, sad, angry, crying, working-thinking, reading, yoga, eating, coding, working-typing, dancing, cool, love, celebrating, mindblown, gaming, working-debugger, money, studying.
3. Categorize as: coding, reading, music, video, social, gaming, shopping, search, docs, ai, finance, general.
4. Sentiment must be: POSITIVE, NEGATIVE, or NEUTRAL.
5. The "intent_summary" should be a 5-10 word description of what the user is actually doing (e.g., "Debugging a tricky React hook", "Comparing prices for mechanical keyboards").
6. The "comment" must reflect your persona (${persona}) and specifically reference the intent.

Current Heuristic Hint: ${categoryHint}.
Pet Stats: ${statsContext || 'Normal'}.`;

  const prompt = `User is on this page:
Title: ${pageTitle}
Description: ${metaDescription || 'None'}`;

  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).substring(7);
    const handler = (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.type !== 'PET_AI_PROMPT_RESPONSE' || event.data.id !== requestId || event.data.token !== bridgeToken) return;
      window.removeEventListener('message', handler);
      if (event.data.error) {
        resolve(null);
      } else {
        try {
          const parsed = JSON.parse(event.data.resultText);
          if (parsed.intent_summary) {
            console.log(`[Clawd AI] Detected Intent: ${parsed.intent_summary}`);
          }
          resolve(parsed);
        } catch (e) {
          resolve(null);
        }
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({ type: 'PET_AI_PROMPT_REQUEST', id: requestId, systemPrompt, prompt, token: bridgeToken }, '*');

    // Timeout fallback
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(null);
    }, 10000);
  });
}
