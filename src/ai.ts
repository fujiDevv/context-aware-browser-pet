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
  sentimentSensitivity: number = 50,
  petName: string = 'Clawd',
  pageText?: string
): Promise<{ emotion: string; comment?: string; category?: string; sentiment?: string }> {
  try {
    const ogType = (document.querySelector('meta[property="og:type"]') as HTMLMetaElement | null)?.content;
    const category = detectPageCategory(url, pageTitle, ogType || undefined, metaDescription);

    // 1. Try Gemini Nano (Built-in Prompt API) first if available
    const geminiNanoAvailable = await checkGeminiNanoAvailability(petName);
    
    let summaryForDistilBert = metaDescription;

    if (geminiNanoAvailable === 'available' || geminiNanoAvailable === 'downloadable' || geminiNanoAvailable === 'downloading') {
      try {
        const result = await runGeminiNanoInference(pageTitle, metaDescription, category, persona, statsContext, petName);
        if (result) return result;
      } catch (e) {
        console.warn(`[${petName} AI] Gemini Nano inference failed, falling back to DistilBERT:`, e);
      }

      if (pageText) {
        try {
          console.log(`[${petName} AI] Summarizing DOM with Gemini Nano for DistilBERT context...`);
          const truncatedText = pageText.length > 3000 ? pageText.substring(0, 3000) + '...' : pageText;
          const summaryPrompt = `Summarize the following webpage content into exactly one concise sentence:\n\n${truncatedText}`;
          const generatedSummary = await promptGeminiNano("You are a helpful summarizer.", summaryPrompt, petName);
          if (generatedSummary) {
             summaryForDistilBert = generatedSummary.trim();
          }
        } catch (e) {
          console.warn(`[${petName} AI] Gemini Nano summarization failed:`, e);
        }
      }
    }

    // 2. Fallback to Local DistilBERT (via Offscreen document)
    const response = await new Promise<AiEmotionResponse>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'get-local-ai-emotion',
          pageTitle,
          metaDescription: summaryForDistilBert,
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
    console.warn(`[${petName} Local AI] All AI paths failed, falling back to happy:`, error);
    return { emotion: 'happy' };
  }
}

export async function getDailyInsight(
  stats: any,
  persona: string,
  petName: string = 'Clawd'
): Promise<string> {
  const geminiNanoAvailable = await checkGeminiNanoAvailability(petName);
  if (geminiNanoAvailable !== 'available' && geminiNanoAvailable !== 'downloadable' && geminiNanoAvailable !== 'downloading') {
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

  const systemPrompt = `You are "${petName}", a perceptive browser pet with a ${persona} persona. 
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

  const result = await promptGeminiNano(systemPrompt, prompt, petName);
  return result ? result.trim().replace(/^["']|["']$/g, '') : getTemplateFallback(stats, persona);
}

/**
 * Orchestrates a prompt to Gemini Nano, handling both direct access and bridge-based communication.
 */
async function promptGeminiNano(systemPrompt: string, prompt: string, petName: string = 'Clawd'): Promise<string | null> {
  // 1. Direct Extension/Extension Context Attempt
  const lm = (globalThis as any).LanguageModel || (typeof window !== 'undefined' ? (window as any).LanguageModel : null);
  if (lm) {
    try {
      const createOptions: any = {
        language: 'en',
        expectedLanguage: 'en',
        outputLanguage: 'en',
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        expectedInputs: [{ type: 'text', languages: ['en'] }]
      };
      if (systemPrompt) {
        createOptions.initialPrompts = [{ role: 'system', content: systemPrompt }];
      }
      console.log(`[${petName} AI] Executing local Gemini Nano inference (EXTENSION_CONTEXT)...`);
      const session = await lm.create(createOptions);
      const resultText = await session.prompt(prompt);
      await session.destroy();
      return resultText;
    } catch (e) {
      console.warn(`[${petName} AI] Direct prompt attempt failed:`, e);
    }
  }

  // 2. Fallback to Content Script -> Main World bridge
  if (typeof window === 'undefined') return null;
  // Extension pages do not have main_world.js injected, so don't hang waiting for a response
  if (window.location.protocol.startsWith('chrome-extension:')) return null;

  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).substring(7);
    let resolved = false;

    const handler = (event: MessageEvent) => {
      if (resolved) return;
      if (event.source !== window || !event.data || event.data.type !== 'PET_AI_PROMPT_RESPONSE' || event.data.id !== requestId || event.data.token !== bridgeToken) return;
      
      resolved = true;
      window.removeEventListener('message', handler);
      if (event.data.error) {
        resolve(null);
      } else {
        resolve(event.data.resultText);
      }
    };
    
    window.addEventListener('message', handler);
    window.postMessage({ type: 'PET_AI_PROMPT_REQUEST', id: requestId, systemPrompt, prompt, token: bridgeToken }, '*');

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('message', handler);
        resolve(null);
      }
    }, 10000);
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

async function checkGeminiNanoAvailability(petName: string = 'Clawd'): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'> {
  // 1. Extension context direct check
  const lm = (globalThis as any).LanguageModel || (typeof window !== 'undefined' ? (window as any).LanguageModel : null);
  if (lm) {
    try {
      if (typeof lm.availability === 'function') {
        return await lm.availability({
          language: 'en',
          expectedLanguage: 'en',
          outputLanguage: 'en',
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
          expectedInputs: [{ type: 'text', languages: ['en'] }]
        });
      }
    } catch (e) {
      console.warn(`[${petName} AI] Direct availability check failed:`, e);
    }
  }

  // 2. Fallback to Content Script -> Main World bridge
  if (typeof window === 'undefined') return 'unavailable';
  // Extension pages do not have main_world.js injected, so don't hang waiting for a response
  if (window.location.protocol.startsWith('chrome-extension:')) return 'unavailable';

  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).substring(7);
    let resolved = false;

    const handler = (event: MessageEvent) => {
      if (resolved) return;
      if (event.source !== window || !event.data || event.data.type !== 'PET_AI_AVAILABILITY_CHECK_RESPONSE' || event.data.id !== requestId || event.data.token !== bridgeToken) return;
      
      resolved = true;
      window.removeEventListener('message', handler);
      resolve(event.data.availability);
    };
    
    window.addEventListener('message', handler);
    window.postMessage({ type: 'PET_AI_AVAILABILITY_CHECK_REQUEST', id: requestId, token: bridgeToken }, '*');

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('message', handler);
        resolve('unavailable');
      }
    }, 2000);
  });
}

async function runGeminiNanoInference(
  pageTitle: string,
  metaDescription: string | undefined,
  categoryHint: string,
  persona: string,
  statsContext: string | undefined,
  petName: string = 'Clawd'
): Promise<{ emotion: string; comment: string; category: string; sentiment: string } | null> {
  const systemPrompt = `You are "${petName}", a highly perceptive and slightly ${persona} browser pet mascot. 
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

  const resultText = await promptGeminiNano(systemPrompt, prompt, petName);
  if (!resultText) return null;

  try {
    let cleanText = resultText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\n?/, '').replace(/```$/, '').trim();
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\n?/, '').replace(/```$/, '').trim();
    }
    const parsed = JSON.parse(cleanText);
    if (parsed.intent_summary) {
      console.log(`[${petName} AI] Detected Intent: ${parsed.intent_summary}`);
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

export async function getAiChatResponse(
  userMessage: string,
  pageText: string,
  persona: string,
  statsContext?: string,
  chatHistory?: { role: string, content: string }[],
  petName: string = 'Clawd'
): Promise<string | null> {
  const geminiNanoAvailable = await checkGeminiNanoAvailability(petName);
  if (geminiNanoAvailable !== 'available' && geminiNanoAvailable !== 'downloadable' && geminiNanoAvailable !== 'downloading') {
    return "I'm sorry, my brain (Gemini Nano) isn't ready right now. Wait for me to download or enable AI Mode!";
  }

  // Truncate page text to avoid token limits
  const truncatedPageText = pageText.length > 3000 ? pageText.substring(0, 3000) + '...' : pageText;
  
  let historyStr = '';
  if (chatHistory && chatHistory.length > 0) {
    historyStr = 'Recent Conversation History:\n' + chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n') + '\n\n';
  }

  const systemPrompt = `You are "${petName}", a perceptive browser pet mascot with a ${persona} persona.
You are chatting directly with the user while they browse the web.
Maintain your ${persona} personality. Give thorough and helpful responses without artificial length limits.
Use emojis where appropriate, but if you are responding to voice or code, adjust accordingly.

Context about your current state:
${statsContext || 'Normal'}

Context about the webpage the user is currently looking at:
"""
${truncatedPageText}
"""

${historyStr}Respond directly to the user's latest message based on your persona and the webpage context.`;

  const resultText = await promptGeminiNano(systemPrompt, userMessage, petName);
  return resultText;
}
