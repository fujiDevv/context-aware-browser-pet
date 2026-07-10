import { SharedPetState, OriginPetState } from '../shared/types';
import { STORAGE_KEYS } from '../shared/constants';
import { PersonalitySystem } from '../core/personality';
import { extensionApi, supportsOffscreenDocuments, isFirefoxRuntime } from '../shared/platform';

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
}).catch((e) => { console.warn('[Arcrawls Background] storage.get shared-pet-state error:', e); });

let originPetStates: Record<string, OriginPetState> = {};
const tabHttpErrors: Record<number, number> = {};

// Load origin states from session storage to survive Service Worker suspension
try {
  extensionApi.storage.session?.get<Record<string, any>>('originPetStates').then((data) => {
    if (data && data.originPetStates) {
      originPetStates = data.originPetStates;
    }
  }).catch(() => { /* Ignore session storage errors */ });
} catch (e) { /* Ignore */ }
const backgroundPersonality = new PersonalitySystem();
const supportsOffscreen = supportsOffscreenDocuments();
const supportsAudioInBackground = typeof Audio !== 'undefined';
const unsupportedOffscreenMessage = 'Local AI and centralized audio require Chrome offscreen documents and are not available in this Firefox build yet.';

function applyRuntimeFeatureSupport(settings: any = {}) {
  const canPlaySound = supportsOffscreen || supportsAudioInBackground;
  if (supportsOffscreen) {
    return settings;
  }

  return {
    ...settings,
    soundEnabled: canPlaySound ? settings.soundEnabled : false,
    aiMode: false,
    advancedAiEnabled: false
  };
}

extensionApi.runtime.onInstalled?.addListener((details) => {
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
        name: 'Arcrawls',
        costume: 'none',
        persona: 'default',
        blockedDomains: [],
        disabledEmotions: [],
        scheduleEnabled: true,
        seasonalEnabled: true
      }),
      [STORAGE_KEYS.SHARED_STATE]: sharedPetState
    }).catch((e) => { console.warn('[Arcrawls Background] chrome.storage.local.set init error:', e); });
  }

  // Set the survey/feedback URL that opens when the user uninstalls the extension
  if (extensionApi.runtime.setUninstallURL) {
    const manifest = extensionApi.runtime.getManifest();
    const version = manifest?.version || 'unknown';
    const browser = isFirefoxRuntime() ? 'firefox' : 'chrome';
    extensionApi.runtime.setUninstallURL(`https://arcrawls.com/uninstall?version=${version}&browser=${browser}`);
  }

  if (details.reason === 'install' || details.reason === 'update') {
    const version = extensionApi.runtime.getManifest()?.version || 'unknown';
    extensionApi.tabs.create({
      url: `onboarding/onboarding.html?version=v${version}&reason=${details.reason}`
    });
  }

  extensionApi.alarms.create('pet-decay', { periodInMinutes: 1 });
});

extensionApi.runtime.onStartup?.addListener(() => {
  extensionApi.alarms.get('pet-decay').then((alarm) => {
    if (!alarm) {
      extensionApi.alarms.create('pet-decay', { periodInMinutes: 1 });
    }
  }).catch((e) => { console.warn('[Arcrawls Background] alarms.get pet-decay error:', e); });

  if (!supportsOffscreen) {
    extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS).then((data) => {
      const currentSettings = data[STORAGE_KEYS.SETTINGS] || {};
      if (currentSettings.soundEnabled || currentSettings.aiMode || currentSettings.advancedAiEnabled) {
        extensionApi.storage.local.set({
          [STORAGE_KEYS.SETTINGS]: applyRuntimeFeatureSupport(currentSettings)
        }).catch((e) => { console.warn('[Arcrawls Background] chrome.storage.local.set runtime support error:', e); });
      }
    }).catch((e) => {
      console.warn('[Arcrawls Background] Failed to get settings on startup:', e);
    });
  }
});

extensionApi.alarms.onAlarm?.addListener(async (alarm) => {
  if (alarm.name === 'pet-decay') {
    try {
      const data = await extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS);
      await backgroundPersonality._periodicDecay(data[STORAGE_KEYS.SETTINGS]);
    } catch (e) {
      console.warn('[Arcrawls Background] Failed to apply periodic decay:', e);
    }
  }
});

extensionApi.webRequest.onCompleted?.addListener(
  (details) => {
    if (details.statusCode >= 400 && details.frameId === 0) {
      tabHttpErrors[details.tabId] = details.statusCode;
      extensionApi.tabs.sendMessage(details.tabId, {
        type: 'http-error',
        code: details.statusCode,
      }).catch((e) => {
        // Silently catch to avoid console spam
      });
    }
  },
  { urls: ['http://*/*', 'https://*/*'], types: ['main_frame'] }
);

extensionApi.tabs.onRemoved?.addListener((tabId) => {
  delete tabHttpErrors[tabId];
});

extensionApi.webNavigation.onBeforeNavigate?.addListener((details) => {
  if (details.frameId === 0) {
    delete tabHttpErrors[details.tabId];
  }
});

extensionApi.webNavigation.onCommitted?.addListener(
  (details) => {
    if (details.frameId === 0) {
      extensionApi.tabs.sendMessage(details.tabId, { type: 'navigation' }).catch((e) => {
        // Silently catch to avoid console spam
      });
    }
  },
  { url: [{ schemes: ['http', 'https'] }] }
);

// Add a simple throttle to prevent dragging from spamming messages
let lastSyncTime = 0;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

extensionApi.runtime.onMessage?.addListener((message, sender, sendResponse) => {
  if (message.type === 'record-site-visit') {
    backgroundPersonality.recordSiteVisit(message.category, message.sentiment).catch(e => {
      console.warn('[Arcrawls Background] Failed to record site visit:', e);
    });
    if (sendResponse) sendResponse({ success: true });
    return false;
  }

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
    const newState = { ...sharedPetState, ...message.state };
    sharedPetState = newState;

    // Persist shared state to storage
    extensionApi.storage.local.set({ [STORAGE_KEYS.SHARED_STATE]: sharedPetState })
      .catch((e) => { console.warn('[Arcrawls Background] storage.set shared-pet-state error:', e); });

    const broadcast = (stateToBroadcast: SharedPetState) => {
      extensionApi.tabs.query({ url: ['http://*/*', 'https://*/*'] }).then((tabs) => {
        tabs.forEach((tab) => {
          if (sender.tab && tab.id !== sender.tab.id && tab.id !== undefined) {
            extensionApi.tabs.sendMessage(tab.id, {
              type: 'sync-pet-state',
              state: stateToBroadcast
            }).catch((e) => {
              console.debug('[Arcrawls Background] sync-pet-state broadcast failed:', e);
            });
          }
        });
      }).catch((e) => {
        console.debug('[Arcrawls Background] sync-pet-state tab query failed:', e);
      });
    };

    const now = Date.now();
    if (now - lastSyncTime > 500) { // Only broadcast max twice a second
      lastSyncTime = now;
      if (syncTimeout) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
      }
      broadcast(newState);
    } else {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        lastSyncTime = Date.now();
        broadcast(sharedPetState);
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
        // Must use leading slash for absolute path from extension root
        fetchUrl = '/' + parsedUrl.pathname.replace(/^\//, '');
      }
    } catch (e) { }

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
      if (supportsAudioInBackground) {
        try {
          const audio = new Audio(extensionApi.runtime.getURL(`assets/${message.filename}`));
          audio.volume = message.volume;
          audio.play().catch(e => console.warn('[Arcrawls Background] Audio playback failed', e));
          sendResponse({ success: true });
        } catch (e: any) {
          sendResponse({ success: false, error: e.message });
        }
        return false;
      }
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

      // Persist to session storage
      try {
        extensionApi.storage.session?.set({ originPetStates }).catch(() => {});
      } catch (e) { /* ignore */ }

      // Broadcast to other tabs with the same hostname
      extensionApi.tabs.query({ url: ['http://*/*', 'https://*/*'] }).then((tabs) => {
        tabs.forEach((tab) => {
          if (tab.url) {
            try {
              const tabHostname = new URL(tab.url).hostname;
              if (tabHostname === hostname && sender.tab && tab.id !== sender.tab.id && tab.id !== undefined) {
                extensionApi.tabs.sendMessage(tab.id, {
                  type: 'sync-origin-pet-state',
                  state: newState
                }).catch((e) => {
                  console.debug('[Arcrawls Background] sync-origin-pet-state broadcast failed:', e);
                });
              }
            } catch (e) { }
          }
        });
      }).catch((e) => {
        console.debug('[Arcrawls Background] sync-origin-pet-state tab query failed:', e);
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
      const brainUpgradeEnabled = settings.aiMode && (settings.advancedAiEnabled ?? settings.aiMode);
      if (!brainUpgradeEnabled) {
        sendResponse({ success: false, error: 'Brain Upgrade is disabled' });
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
            url: tabUrl,
            advancedAiEnabled: settings.advancedAiEnabled ?? settings.aiMode,
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
      const brainUpgradeEnabled = settings.aiMode && (settings.advancedAiEnabled ?? settings.aiMode);
      if (!brainUpgradeEnabled) {
        sendResponse({ success: true, state: 'idle', progress: 0 });
        return;
      }

      setupOffscreen()
        .then(() => {
          extensionApi.runtime.sendMessage({
            type: 'check-offscreen-ai-status',
            advancedAiEnabled: true,
          })
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
    }).catch((e) => { console.warn('[Arcrawls Background] chrome.storage.local.set update-ai-progress error:', e); });

    // Keep the offscreen document open on error so status stays "error" instead of
    // resetting to idle and re-triggering a load loop on the next status poll.
    return false;
  }
});

let creatingOffscreen: Promise<void> | null = null;
async function setupOffscreen(): Promise<void> {
  if (!supportsOffscreen) {
    throw new Error(unsupportedOffscreenMessage);
  }

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = (async () => {
    const contexts = await extensionApi.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    if (contexts && contexts.length > 0) {
      return;
    }

    const offscreenReason = extensionApi.offscreen.Reason;
    if (!offscreenReason) {
      throw new Error(unsupportedOffscreenMessage);
    }

    try {
      await extensionApi.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [offscreenReason.DOM_PARSER, offscreenReason.AUDIO_PLAYBACK],
        justification: 'Run local machine learning models and handle centralized audio playback for the pet companion'
      });
    } catch (err: any) {
      if (!err.message.includes('Only a single offscreen document may be created')) {
        throw err;
      }
    }
  })();

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

async function closeOffscreen(): Promise<void> {
  if (!supportsOffscreen) {
    return;
  }

  const contexts = await extensionApi.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (contexts && contexts.length > 0) {
    await extensionApi.offscreen.closeDocument();
  }
}

// Pre-load the offscreen document (which pre-loads the classifier) if AI Mode or Sound is enabled
extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS).then((data) => {
  if (!supportsOffscreen) {
    return;
  }

  const settings = data[STORAGE_KEYS.SETTINGS] || {};
  if ((settings.aiMode && (settings.advancedAiEnabled ?? settings.aiMode)) || settings.soundEnabled) {
    setupOffscreen().catch((e) => { console.warn('[Arcrawls Background] setupOffscreen initial call error:', e); });
  }
}).catch((e) => { console.warn('[Arcrawls Background] Failed to load initial settings:', e); });

// Watch for settings changes to boot offscreen context in real time
extensionApi.storage.onChanged?.addListener((changes) => {
  if (!supportsOffscreen) {
    return;
  }

  if (changes[STORAGE_KEYS.SETTINGS]) {
    const settings = changes[STORAGE_KEYS.SETTINGS].newValue || {};
    if ((settings.aiMode && (settings.advancedAiEnabled ?? settings.aiMode)) || settings.soundEnabled) {
      setupOffscreen().catch((e) => { console.warn('[Arcrawls Background] setupOffscreen re-call error:', e); });
    } else {
      closeOffscreen().catch((e) => { console.warn('[Arcrawls Background] closeOffscreen re-call error:', e); });
    }
  }
});
