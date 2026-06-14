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
  if (details.reason === 'install') {
    // Initialize default settings with local AI disabled (off by default)
    chrome.storage.local.set({
      'pet-settings': {
        size: 100,
        speed: 1.2,
        soundEnabled: true,
        soundVolume: 0.5,
        aiMode: false,
        apiKey: '',
        name: 'Clawd',
        costume: 'none',
        persona: 'default',
        blockedDomains: [],
        disabledEmotions: [],
        scheduleEnabled: true,
        seasonalEnabled: true
      }
    }).catch((e) => { console.warn('[Clawd Background] chrome.storage.local.set init error:', e); });
  }

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

// Add a simple throttle to prevent dragging from spamming messages
let lastSyncTime = 0;

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

    const now = Date.now();
    if (now - lastSyncTime > 500) { // Only broadcast max twice a second
      lastSyncTime = now;
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
    }

    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'get-local-ai-emotion') {
    const { pageTitle, metaDescription, persona, statsContext, sentimentSensitivity } = message;
    const tabUrl = sender.tab?.url || '';

    setupOffscreen()
      .then(() => {
        chrome.runtime.sendMessage(
          {
            type: 'run-local-ai-inference',
            pageTitle,
            metaDescription,
            persona,
            statsContext,
            sentimentSensitivity,
            url: tabUrl
          },
          (res) => {
            if (chrome.runtime.lastError) {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              sendResponse(res);
            }
          }
        );
      })
      .catch((err) => {
        console.error('Failed to setup offscreen context for emotion:', err);
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }

  if (message.type === 'check-local-ai-status') {
    setupOffscreen()
      .then(() => {
        chrome.runtime.sendMessage({ type: 'check-local-ai-status' }, (res) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse(res);
          }
        });
      })
      .catch((err) => {
        console.error('Failed to setup offscreen context for status:', err);
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }

  if (message.type === 'update-ai-progress') {
    chrome.storage.local.set({
      modelLoadingState: message.state,
      modelDownloadProgress: message.progress
    }).catch((e) => { console.warn('[Clawd Background] chrome.storage.local.set update-ai-progress error:', e); });
    return false;
  }
});

let creatingOffscreen: Promise<void> | null = null;
async function setupOffscreen(): Promise<void> {
  const contexts = await (chrome.runtime as any).getContexts?.({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (contexts && contexts.length > 0) {
    return;
  }

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: 'Run local machine learning models for pet behavior analysis'
  });

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

// Pre-load the offscreen document (which pre-loads the classifier) if AI Mode is enabled
chrome.storage.local.get('pet-settings', (data) => {
  const settings = data['pet-settings'] || {};
  if (settings.aiMode) {
    setupOffscreen().catch((e) => { console.warn('[Clawd Background] setupOffscreen initial call error:', e); });
  }
});

// Watch for settings changes to boot offscreen context in real time
chrome.storage.onChanged.addListener((changes) => {
  if (changes['pet-settings']) {
    const settings = changes['pet-settings'].newValue || {};
    if (settings.aiMode) {
      setupOffscreen().catch((e) => { console.warn('[Clawd Background] setupOffscreen re-call error:', e); });
    }
  }
});
