import { SharedPetState, OriginPetState } from './src/types';
import { STORAGE_KEYS } from './src/constants';
import { PersonalitySystem } from './src/personality';
import { extensionApi, supportsOffscreenDocuments } from './src/platform';

let sharedPetState: SharedPetState = {
  x: 200,
  y: 0,
  state: 'walk-bottom',
  direction: 1,
  paused: false,
  emotion: 'happy'
};

// Initialize sharedPetState from storage to survive SW suspension
extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SHARED_STATE).then((data) => {
  if (data[STORAGE_KEYS.SHARED_STATE]) {
    sharedPetState = data[STORAGE_KEYS.SHARED_STATE];
  }
});

const originPetStates: Record<string, OriginPetState> = {};
const tabHttpErrors: Record<number, number> = {};
const backgroundPersonality = new PersonalitySystem();
const supportsOffscreen = supportsOffscreenDocuments();
const unsupportedOffscreenMessage = 'Local AI and centralized audio require Chrome offscreen documents and are not available in this Firefox build yet.';

function applyRuntimeFeatureSupport(settings: any = {}) {
  if (supportsOffscreen) {
    return settings;
  }

  return {
    ...settings,
    soundEnabled: false,
    aiMode: false,
    advancedAiEnabled: false
  };
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize default settings with local AI disabled (off by default)
    extensionApi.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: applyRuntimeFeatureSupport({
        size: 128,
        speed: 1.2,
        soundEnabled: true,
        soundVolume: 0.5,
        aiMode: false,
        advancedAiEnabled: false,
        apiKey: '',
        name: 'Clawd',
        costume: 'none',
        persona: 'default',
        blockedDomains: [],
        disabledEmotions: [],
        scheduleEnabled: true,
        seasonalEnabled: true
      }),
      [STORAGE_KEYS.SHARED_STATE]: sharedPetState
    }).catch((e) => { console.warn('[Clawd Background] chrome.storage.local.set init error:', e); });
  }

  if (details.reason === 'install' || details.reason === 'update') {
    const version = extensionApi.runtime.getManifest()?.version || 'unknown';
    extensionApi.tabs.create({
      url: `onboarding/onboarding.html?version=v${version}&reason=${details.reason}`
    });
  }

  chrome.alarms.create('pet-decay', { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.get('pet-decay', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('pet-decay', { periodInMinutes: 1 });
    }
  });

  if (!supportsOffscreen) {
    extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS).then((data) => {
      const currentSettings = data[STORAGE_KEYS.SETTINGS] || {};
      if (currentSettings.soundEnabled || currentSettings.aiMode || currentSettings.advancedAiEnabled) {
        extensionApi.storage.local.set({
          [STORAGE_KEYS.SETTINGS]: applyRuntimeFeatureSupport(currentSettings)
        }).catch((e) => { console.warn('[Clawd Background] chrome.storage.local.set runtime support error:', e); });
      }
    });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'pet-decay') {
    try {
      const data = await extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS);
      await backgroundPersonality._periodicDecay(data[STORAGE_KEYS.SETTINGS]);
    } catch (e) {
      console.warn('[Clawd Background] Failed to apply periodic decay:', e);
    }
  }
});

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.statusCode >= 400 && details.frameId === 0) {
      tabHttpErrors[details.tabId] = details.statusCode;
      extensionApi.tabs.sendMessage(details.tabId, {
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
    extensionApi.tabs.sendMessage(details.tabId, { type: 'navigation' }).catch((e) => {
      console.debug('[Clawd Background] navigation message failed:', e);
    });
  }
});

// Add a simple throttle to prevent dragging from spamming messages
let lastSyncTime = 0;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

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
    extensionApi.storage.local.set({ [STORAGE_KEYS.SHARED_STATE]: sharedPetState })
      .catch((e) => { console.warn('[Clawd Background] storage.set shared-pet-state error:', e); });

    const broadcast = () => {
      extensionApi.tabs.query({}).then((tabs) => {
        tabs.forEach((tab) => {
          if (sender.tab && tab.id !== sender.tab.id && tab.id !== undefined) {
            extensionApi.tabs.sendMessage(tab.id, {
              type: 'sync-pet-state',
              state: sharedPetState
            }).catch((e) => {
              console.debug('[Clawd Background] sync-pet-state broadcast failed:', e);
            });
          }
        });
      });
    };

    const now = Date.now();
    if (now - lastSyncTime > 500) { // Only broadcast max twice a second
      lastSyncTime = now;
      if (syncTimeout) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
      }
      broadcast();
    } else {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        lastSyncTime = Date.now();
        broadcast();
        syncTimeout = null;
      }, 500 - (now - lastSyncTime));
    }

    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'fetch-svg') {
    let fetchUrl = message.url;
    
    // Workaround for Chromium Service Worker fetch bug on chrome-extension:// URLs
    try {
      const parsedUrl = new URL(fetchUrl);
      if (parsedUrl.protocol === 'chrome-extension:') {
        fetchUrl = parsedUrl.pathname;
      }
    } catch (e) {}

    fetch(fetchUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(text => sendResponse({ success: true, text }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'play-sound') {
    if (!supportsOffscreen) {
      sendResponse({ success: false, error: unsupportedOffscreenMessage });
      return false;
    }

    const { filename, volume } = message;
    setupOffscreen()
      .then(() => {
        extensionApi.runtime.sendMessage({ type: 'play-sound-offscreen', filename, volume })
          .then((res) => sendResponse(res))
          .catch((err) => sendResponse({ success: false, error: err.message }));
      })
      .catch((err) => {
        console.error('Failed to setup offscreen context for audio:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
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

      // Memory Management: Prune originPetStates if it exceeds 200 domains
      const keys = Object.keys(originPetStates);
      if (keys.length > 200) {
        // Prune the 50 oldest entries
        const sortedKeys = keys.sort((a, b) => originPetStates[a].lastUpdateTime - originPetStates[b].lastUpdateTime);
        for (let i = 0; i < 50; i++) {
          delete originPetStates[sortedKeys[i]];
        }
      }

      // Broadcast to other tabs with the same hostname
      extensionApi.tabs.query({}).then((tabs) => {
        tabs.forEach((tab) => {
          if (tab.url) {
            try {
              const tabHostname = new URL(tab.url).hostname;
              if (tabHostname === hostname && sender.tab && tab.id !== sender.tab.id && tab.id !== undefined) {
                extensionApi.tabs.sendMessage(tab.id, {
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

  if (message.type === 'check-tab-ai-availability') {
    const tryTab = (tabId: number): Promise<any> => {
      return extensionApi.tabs.sendMessage(tabId, { type: 'check-tab-ai-availability' }).catch(() => null);
    };

    extensionApi.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      let activeTab = tabs[0];
      let res = activeTab?.id ? await tryTab(activeTab.id) : null;
      
      if (!res) {
        // Fallback: Check any other HTTP/HTTPS tab if the active one failed (e.g. options page)
        const allTabs = await extensionApi.tabs.query({ url: ['http://*/*', 'https://*/*'] });
        for (const t of allTabs) {
          if (t.id && t.id !== activeTab?.id) {
            res = await tryTab(t.id);
            if (res) break;
          }
        }
      }

      if (res) {
        sendResponse(res);
      } else {
        sendResponse({ success: false, error: 'No compatible tab found to check AI availability' });
      }
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (message.type === 'get-local-ai-emotion') {
    if (!supportsOffscreen) {
      sendResponse({ success: false, error: unsupportedOffscreenMessage });
      return false;
    }

    const { pageTitle, metaDescription, category, persona, statsContext, sentimentSensitivity } = message;
    const tabUrl = sender.tab?.url || '';

    extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS).then((data) => {
      const settings = data[STORAGE_KEYS.SETTINGS] || {};
      if (!settings.aiMode) {
        sendResponse({ success: false, error: 'AI Mode is disabled' });
        return;
      }

      setupOffscreen()
        .then(() => {
          extensionApi.runtime.sendMessage({
            type: 'run-local-ai-inference',
            pageTitle,
            metaDescription,
            category,
            persona,
            statsContext,
            sentimentSensitivity,
            url: tabUrl
          })
            .then((res) => sendResponse(res))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        })
        .catch((err) => {
          console.error('Failed to setup offscreen context for emotion:', err);
          sendResponse({ success: false, error: err.message });
        });
    }).catch((err) => sendResponse({ success: false, error: err.message }));

    return true;
  }

  if (message.type === 'check-local-ai-status') {
    if (!supportsOffscreen) {
      sendResponse({ success: true, state: 'unsupported', progress: 0 });
      return false;
    }

    extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS).then((data) => {
      const settings = data[STORAGE_KEYS.SETTINGS] || {};
      if (!settings.aiMode) {
        sendResponse({ success: true, state: 'idle', progress: 0 });
        return;
      }

      setupOffscreen()
        .then(() => {
          extensionApi.runtime.sendMessage({ type: 'check-offscreen-ai-status' })
            .then((res) => sendResponse(res))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        })
        .catch((err) => {
          console.error('Failed to setup offscreen context for status:', err);
          sendResponse({ success: false, error: err.message });
        });
    }).catch((err) => sendResponse({ success: false, error: err.message }));

    return true;
  }

  if (message.type === 'update-ai-progress') {
    extensionApi.storage.local.set({
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
  if (!supportsOffscreen) {
    throw new Error(unsupportedOffscreenMessage);
  }

  const contexts = await chrome.runtime.getContexts?.({
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
    reasons: [chrome.offscreen.Reason.DOM_PARSER, chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: 'Run local machine learning models and handle centralized audio playback for the pet companion'
  });

  try {
    await creatingOffscreen;
  } catch (err: any) {
    if (!err.message.includes('Only a single offscreen document may be created')) {
      throw err;
    }
  } finally {
    creatingOffscreen = null;
  }
}

async function closeOffscreen(): Promise<void> {
  if (!supportsOffscreen) {
    return;
  }

  const contexts = await chrome.runtime.getContexts?.({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (contexts && contexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

// Pre-load the offscreen document (which pre-loads the classifier) if AI Mode or Sound is enabled
extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS).then((data) => {
  if (!supportsOffscreen) {
    return;
  }

  const settings = data[STORAGE_KEYS.SETTINGS] || {};
  if ((settings.aiMode && settings.advancedAiEnabled) || settings.soundEnabled) {
    setupOffscreen().catch((e) => { console.warn('[Clawd Background] setupOffscreen initial call error:', e); });
  }
});

// Watch for settings changes to boot offscreen context in real time
extensionApi.storage.onChanged?.addListener((changes) => {
  if (!supportsOffscreen) {
    return;
  }

  if (changes[STORAGE_KEYS.SETTINGS]) {
    const settings = changes[STORAGE_KEYS.SETTINGS].newValue || {};
    if ((settings.aiMode && settings.advancedAiEnabled) || settings.soundEnabled) {
      setupOffscreen().catch((e) => { console.warn('[Clawd Background] setupOffscreen re-call error:', e); });
    } else {
      closeOffscreen().catch((e) => { console.warn('[Clawd Background] closeOffscreen re-call error:', e); });
    }
  }
});
