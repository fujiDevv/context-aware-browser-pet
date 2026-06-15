import { SharedPetState, OriginPetState } from './src/types';
import { STORAGE_KEYS } from './src/constants';

let sharedPetState: SharedPetState = {
  x: 200,
  y: 0,
  state: 'walk-bottom',
  direction: 1,
  paused: false,
  emotion: 'happy'
};

// Initialize sharedPetState from storage to survive SW suspension
chrome.storage.local.get(STORAGE_KEYS.SHARED_STATE, (data) => {
  if (data[STORAGE_KEYS.SHARED_STATE]) {
    sharedPetState = data[STORAGE_KEYS.SHARED_STATE];
  }
});

const originPetStates: Record<string, OriginPetState> = {};
const tabHttpErrors: Record<number, number> = {};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize default settings with local AI disabled (off by default)
    chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: {
        size: 128,
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
      },
      [STORAGE_KEYS.SHARED_STATE]: sharedPetState
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
      }).catch((e) => {
        console.debug('[Clawd Background] http-error message failed:', e);
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
    chrome.tabs.sendMessage(details.tabId, { type: 'navigation' }).catch((e) => {
      console.debug('[Clawd Background] navigation message failed:', e);
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
    
    // Persist shared state to storage
    chrome.storage.local.set({ [STORAGE_KEYS.SHARED_STATE]: sharedPetState })
      .catch((e) => { console.warn('[Clawd Background] storage.set shared-pet-state error:', e); });

    const now = Date.now();
    if (now - lastSyncTime > 500) { // Only broadcast max twice a second
      lastSyncTime = now;
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (sender.tab && tab.id !== sender.tab.id && tab.id !== undefined) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'sync-pet-state',
              state: sharedPetState
            }).catch((e) => {
              console.debug('[Clawd Background] sync-pet-state broadcast failed:', e);
            });
          }
        });
      });
    }

    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'get-origin-pet-state') {
    const hostname = message.hostname;
    if (hostname && originPetStates[hostname]) {
      sendResponse(originPetStates[hostname]);
    } else {
      sendResponse(null);
    }
    return false;
  }

  if (message.type === 'update-origin-pet-state') {
    const { hostname, emotion, dialogue } = message;
    if (hostname) {
      const newState: OriginPetState = {
        emotion,
        dialogue,
        lastUpdateTime: Date.now()
      };
      originPetStates[hostname] = newState;

      // Broadcast to other tabs with the same hostname
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.url) {
            try {
              const tabHostname = new URL(tab.url).hostname;
              if (tabHostname === hostname && sender.tab && tab.id !== sender.tab.id && tab.id !== undefined) {
                chrome.tabs.sendMessage(tab.id, {
                  type: 'sync-origin-pet-state',
                  state: newState
                }).catch((e) => {
                  console.debug('[Clawd Background] sync-origin-pet-state broadcast failed:', e);
                });
              }
            } catch (e) { }
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
      [STORAGE_KEYS.MODEL_LOADING_STATE]: message.state,
      [STORAGE_KEYS.MODEL_DOWNLOAD_PROGRESS]: message.progress
    }).catch((e) => { console.warn('[Clawd Background] chrome.storage.local.set update-ai-progress error:', e); });

    if (message.state === 'error') {
      closeOffscreen().catch((e) => { console.warn('[Clawd Background] closeOffscreen on error failed:', e); });
    }
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

async function closeOffscreen(): Promise<void> {
  const contexts = await (chrome.runtime as any).getContexts?.({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (contexts && contexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

// Pre-load the offscreen document (which pre-loads the classifier) if AI Mode is enabled
chrome.storage.local.get(STORAGE_KEYS.SETTINGS, (data) => {
  const settings = data[STORAGE_KEYS.SETTINGS] || {};
  if (settings.aiMode) {
    setupOffscreen().catch((e) => { console.warn('[Clawd Background] setupOffscreen initial call error:', e); });
  }
});

// Watch for settings changes to boot offscreen context in real time
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEYS.SETTINGS]) {
    const settings = changes[STORAGE_KEYS.SETTINGS].newValue || {};
    if (settings.aiMode) {
      setupOffscreen().catch((e) => { console.warn('[Clawd Background] setupOffscreen re-call error:', e); });
    } else {
      closeOffscreen().catch((e) => { console.warn('[Clawd Background] closeOffscreen re-call error:', e); });
    }
  }
});
