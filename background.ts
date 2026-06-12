import { SharedPetState } from './src/types';

let sharedPetState: SharedPetState = {
  x: 200,
  y: 0,
  state: 'walk-bottom',
  direction: 1,
  paused: false,
  emotion: 'happy'
};

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.statusCode >= 400 && details.frameId === 0) {
      chrome.tabs.sendMessage(details.tabId, {
        type: 'http-error',
        code: details.statusCode,
      }).catch(() => {
      });
    }
  },
  { urls: ['<all_urls>'], types: ['main_frame'] }
);

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    chrome.tabs.sendMessage(details.tabId, { type: 'navigation' }).catch(() => {
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    const { pageTitle, metaDescription, apiKey } = message;
    
    fetchAiEmotion(pageTitle, metaDescription, apiKey)
      .then((emotion) => sendResponse({ success: true, emotion }))
      .catch((err) => {
        console.error('Error fetching AI emotion in background:', err);
        sendResponse({ success: false, error: err.message });
      });
      
    return true;
  }
});

async function fetchAiEmotion(pageTitle: string, metaDescription: string | undefined, apiKey: string): Promise<string> {
  const PET_EMOTIONS = [
    'happy', 'sad', 'angry', 'working-thinking', 'sleeping', 'coding', 'dancing',
    'cool', 'love', 'celebrating', 'mindblown', 'shrug', 'crying', 'waving',
    'working-wizard', 'ninja', 'working-typing', 'working-debugger', 'working-building', 'working-juggling',
  ];

  const prompt = `You are deciding which emotion a small cute browser mascot should display.
Given the webpage info below, select the single best emotion from this list: ${PET_EMOTIONS.join(', ')}.

Page Title: ${pageTitle}
Page Description: ${metaDescription || '(none)'}

Reply with ONLY the emotion name (in lowercase), nothing else.`;

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
        max_tokens: 10,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const resultText = data?.content?.[0]?.text?.trim().toLowerCase();
    
    if (PET_EMOTIONS.includes(resultText)) {
      return resultText;
    }
    
    for (const em of PET_EMOTIONS) {
      if (resultText && resultText.includes(em)) {
        return em;
      }
    }
    
    return 'happy';
  } catch (error) {
    console.error('Claude API call failed:', error);
    throw error;
  }
}
