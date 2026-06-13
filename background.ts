import { SharedPetState } from './src/types';

let sharedPetState: SharedPetState = {
  x: 200,
  y: 0,
  state: 'walk-bottom',
  direction: 1,
  paused: false,
  emotion: 'happy'
};

const tabHttpErrors: Record<number, number> = {};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    const version = chrome.runtime.getManifest().version;
    chrome.tabs.create({
      url: `onboarding/onboarding.html?version=v${version}&reason=${details.reason}`
    });
  }
});

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.statusCode >= 400 && details.frameId === 0) {
      tabHttpErrors[details.tabId] = details.statusCode;
      chrome.tabs.sendMessage(details.tabId, {
        type: 'http-error',
        code: details.statusCode,
      }).catch(() => {
      });
    }
  },
  { urls: ['<all_urls>'], types: ['main_frame'] }
);

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabHttpErrors[tabId];
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) {
    delete tabHttpErrors[details.tabId];
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    chrome.tabs.sendMessage(details.tabId, { type: 'navigation' }).catch(() => {
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'get-tab-http-error') {
    const tabId = sender.tab?.id;
    const errorCode = tabId ? tabHttpErrors[tabId] : undefined;
    sendResponse({ errorCode });
    return false;
  }

  if (message.type === 'get-pet-state') {
    sendResponse(sharedPetState);
    return false;
  }

  if (message.type === 'update-pet-state') {
    sharedPetState = { ...sharedPetState, ...message.state };

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (sender.tab && tab.id !== sender.tab.id && tab.id !== undefined) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'sync-pet-state',
            state: sharedPetState
          }).catch(() => {
          });
        }
      });
    });

    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'get-ai-emotion') {
    const { pageTitle, metaDescription, apiKey, persona, statsContext } = message;

    fetchAiEmotion(pageTitle, metaDescription, apiKey, persona || 'default', statsContext)
      .then((result) => sendResponse({ success: true, emotion: result.emotion, comment: result.comment }))
      .catch((err) => {
        console.error('Error fetching AI emotion in background:', err);
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }
});

async function fetchAiEmotion(
  pageTitle: string,
  metaDescription: string | undefined,
  apiKey: string,
  persona: string,
  statsContext?: string
): Promise<{ emotion: string; comment?: string }> {
  const PET_EMOTIONS = [
    'happy', 'sad', 'angry', 'working-thinking', 'sleeping', 'coding', 'dancing',
    'cool', 'love', 'celebrating', 'mindblown', 'shrug', 'crying', 'waving',
    'working-wizard', 'ninja', 'working-typing', 'working-debugger', 'working-building', 'working-juggling',
    'eating', 'reading', 'yoga'
  ];

  const personas: Record<string, string> = {
    default: "You are Clawd, a helpful and friendly browser pet mascot. You are happy to browse the web with the user.",
    sarcastic: "You are Clawd, a highly sarcastic, dry-witted browser pet mascot. You make witty, slightly cynical comments about the pages the user is visiting.",
    encouraging: "You are Clawd, a highly encouraging, positive browser pet mascot. You make sweet, cheerful, and motivating remarks.",
    poetic: "You are Clawd, a poetic browser pet mascot. You write short, whimsical 1-line rhymes about the pages the user is visiting.",
    snarky: "You are Clawd, a snarky, sassy browser pet mascot. You make sassy, humorous, and sharp remarks about the web pages."
  };

  const personaInstruction = personas[persona] || personas.default;

  let systemPrompt = `${personaInstruction}
You decide which emotion to display and what short comment to make.
You MUST respond with a valid JSON object matching this schema, and nothing else:
{
  "emotion": "one of the allowed emotions",
  "comment": "your short comment about the page"
}

Allowed emotions: ${PET_EMOTIONS.join(', ')}`;

  if (statsContext) {
    systemPrompt += `\n\nClawd's current stats & personality trait context is: ${statsContext}. Adjust your choice of emotion and the tone of your commentary to match these stats (e.g. if he has low energy, Clawd's comment should sound sleepy/tired; if he's highly focused, his comment should be short and productivity-oriented; if he is a 'developer', he might make geeky coding references).`;
  }

  const prompt = `Page Title: ${pageTitle}
Page Description: ${metaDescription || '(none)'}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const resultText = data?.content?.[0]?.text?.trim();

    let parsed: { emotion: string; comment?: string } = { emotion: 'happy' };
    if (resultText) {
      const start = resultText.indexOf('{');
      const end = resultText.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        try {
          parsed = JSON.parse(resultText.substring(start, end + 1));
        } catch (e) {
          console.warn("Failed to parse JSON response from Claude:", e);
          for (const em of PET_EMOTIONS) {
            if (resultText.toLowerCase().includes(em)) {
              parsed.emotion = em;
              break;
            }
          }
        }
      } else {
        for (const em of PET_EMOTIONS) {
          if (resultText.toLowerCase().includes(em)) {
            parsed.emotion = em;
            break;
          }
        }
      }
    }

    if (!PET_EMOTIONS.includes(parsed.emotion)) {
      parsed.emotion = 'happy';
    }

    return parsed;
  } catch (error) {
    console.error('Claude API call failed:', error);
    throw error;
  }
}
