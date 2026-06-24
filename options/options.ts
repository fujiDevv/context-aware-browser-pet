import { PersonalitySystem } from '../src/personality';
import { PetStats, PetSettings, DomainReaction, DailyMoodRecord, MoodHistoryItem } from '../src/types';
import { STORAGE_KEYS } from '../src/constants';
import { EMOTIONS_METADATA, getDominantTrait, getResolvedCostumeName, parseMarkdown } from '../src/shared-ui';
import { getDailyInsight, getAiChatResponse } from '../src/ai';
import { MovementEngine } from '../src/movement';
import { extensionApi, getRuntimeUrl, isFirefoxRuntime, supportsOffscreenDocuments } from '../src/platform';

let personality: PersonalitySystem;
let playgroundMovement: MovementEngine;
let blockedDomains: string[] = [];
let activeCostume: string = 'none';
let domainReactions: DomainReaction[] = [];
let currentMoodState: string = 'happy';
const supportsLocalAiRuntime = supportsOffscreenDocuments();
const isFirefoxBuild = isFirefoxRuntime();

function escapeHtml(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function updatePetNameDisplays(name: string) {
  const safeName = name || 'Clawd';
  document.querySelectorAll('.pet-name-display').forEach(el => {
    el.textContent = safeName;
  });
}

// Elements
const petImg = document.getElementById('browser-pet-img') as HTMLImageElement;
const playgroundStage = document.getElementById('playground-stage') as HTMLElement;
const playgroundPetRoot = document.getElementById('playground-pet-root') as HTMLElement;
const petNameEl = document.getElementById('pet-name') as HTMLElement;
const petLevelEl = document.getElementById('pet-level') as HTMLElement;
const prestigeBadge = document.getElementById('prestige-badge') as HTMLElement;
const prestigeLevelEl = document.getElementById('prestige-level') as HTMLElement;
const petMoodBadge = document.getElementById('pet-mood') as HTMLElement;
const petTraitBadge = document.getElementById('pet-trait') as HTMLElement;

const xpText = document.getElementById('xp-text') as HTMLElement;
const barXp = document.getElementById('bar-xp') as HTMLElement;

const lblHabitTrait = document.getElementById('lbl-habit-trait') as HTMLElement;
const lblHabitSpeed = document.getElementById('lbl-habit-speed') as HTMLElement;
const lblHabitBehavior = document.getElementById('lbl-habit-behavior') as HTMLElement;

const aiStatusBadge = document.getElementById('ai-status-badge') as HTMLElement;
const aiStatusText = document.getElementById('ai-status-text') as HTMLElement;
const aiStatusSubtitle = document.getElementById('ai-status-subtitle') as HTMLElement;
const activeTabsText = document.getElementById('active-tabs-text');

// Synapse Elements
const synapseChargingContainer = document.getElementById('synapse-charging-container') as HTMLElement;
const synapseReadyContainer = document.getElementById('synapse-ready-container') as HTMLElement;
const barSynapse = document.getElementById('bar-synapse') as HTMLElement;
const synapsePct = document.getElementById('synapse-pct') as HTMLElement;
const synapseLabel = document.getElementById('synapse-label') as HTMLElement;
const synapseStatusBadge = document.getElementById('synapse-status-badge') as HTMLElement;
const btnViewInsight = document.getElementById('btn-view-insight') as HTMLButtonElement;
const synapsePreviewText = document.getElementById('synapse-preview-text') as HTMLElement;

// Gauges
const gauges = {
  happinessVal: document.getElementById('txt-happiness') as HTMLElement,
  happinessBar: document.getElementById('bar-happiness') as HTMLElement,
  energyVal: document.getElementById('txt-energy') as HTMLElement,
  energyBar: document.getElementById('bar-energy') as HTMLElement,
  curiosityVal: document.getElementById('txt-curiosity') as HTMLElement,
  curiosityBar: document.getElementById('bar-curiosity') as HTMLElement,
  focusVal: document.getElementById('txt-focus') as HTMLElement,
  focusBar: document.getElementById('bar-focus') as HTMLElement,
  leisureVal: document.getElementById('txt-leisure') as HTMLElement,
  leisureBar: document.getElementById('bar-leisure') as HTMLElement,
};

// Counter metrics
const valTotalPets = document.getElementById('val-total-pets') as HTMLElement;
const valTotalFeeds = document.getElementById('val-total-feeds') as HTMLElement;
const categoriesList = document.getElementById('categories-list') as HTMLElement;
const timelineList = document.getElementById('timeline-list') as HTMLElement;
const milestonesList = document.getElementById('milestones-list') as HTMLElement;

// Inputs
const nameInput = document.getElementById('pet-name-input') as HTMLInputElement;
const sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
const sizeVal = document.getElementById('size-val') as HTMLElement;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedVal = document.getElementById('speed-val') as HTMLElement;
const flightSpeedSlider = document.getElementById('flight-speed-slider') as HTMLInputElement;
const flightSpeedVal = document.getElementById('flight-speed-val') as HTMLElement;
const personaSelect = document.getElementById('persona-select') as HTMLSelectElement;
const chatVoiceSelect = document.getElementById('chat-voice-select') as HTMLSelectElement;
const soundToggle = document.getElementById('sound-toggle') as HTMLInputElement;
const aiToggle = document.getElementById('ai-toggle') as HTMLInputElement;
const scheduleToggle = document.getElementById('schedule-toggle') as HTMLInputElement;
const seasonalToggle = document.getElementById('seasonal-toggle') as HTMLInputElement;
const performanceModeToggle = document.getElementById('performance-mode-toggle') as HTMLInputElement;
const ghostModeToggle = document.getElementById('ghost-mode-toggle') as HTMLInputElement;
const volumeContainer = document.getElementById('volume-container') as HTMLElement;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
const volumeVal = document.getElementById('volume-val') as HTMLElement;

// Color Picker Elements
const petColorInput = document.getElementById('pet-color-input') as HTMLInputElement;
const btnResetColor = document.getElementById('btn-reset-color') as HTMLButtonElement;

// AI Tuning
const aiTuningContainer = document.getElementById('ai-tuning-container') as HTMLElement;
const aiSensitivitySlider = document.getElementById('ai-sensitivity-slider') as HTMLInputElement;
const aiSensitivityVal = document.getElementById('ai-sensitivity-val') as HTMLElement;
const aiFrequencySlider = document.getElementById('ai-frequency-slider') as HTMLInputElement;
const aiFrequencyVal = document.getElementById('ai-frequency-val') as HTMLElement;

// AI Status Elements
const statusBert = document.getElementById('status-bert') as HTMLElement;
const statusNano = document.getElementById('status-nano') as HTMLElement;
const sancNanoBadge = document.getElementById('sanc-nano-status-badge') as HTMLElement;
const sancNanoText = document.getElementById('sanc-nano-status-text') as HTMLElement;
const sancNanoSubtitle = document.getElementById('sanc-nano-status-subtitle') as HTMLElement;

// Sleep/Wake & Focus Planner Inputs
const sleepStartSelect = document.getElementById('sleep-start-select') as HTMLSelectElement;
const sleepEndSelect = document.getElementById('sleep-end-select') as HTMLSelectElement;
const workStartSelect = document.getElementById('work-start-select') as HTMLSelectElement;
const workEndSelect = document.getElementById('work-end-select') as HTMLSelectElement;
const focusActiveToggle = document.getElementById('focus-active-toggle') as HTMLInputElement;
const focusStartSelect = document.getElementById('focus-start-select') as HTMLSelectElement;
const focusEndSelect = document.getElementById('focus-end-select') as HTMLSelectElement;

// Blocklist inputs
const inputBlockDomain = document.getElementById('input-block-domain') as HTMLInputElement;
const btnAddBlock = document.getElementById('btn-add-block') as HTMLButtonElement;
const inputSearchBlocklist = document.getElementById('input-search-blocklist') as HTMLInputElement;
const blocklistTbody = document.getElementById('blocklist-tbody') as HTMLElement;
const emptyBlocklistMsg = document.getElementById('empty-blocklist-msg') as HTMLElement;

// Domain Reactions inputs
const inputReactionDomain = document.getElementById('reaction-domain-input') as HTMLInputElement;
const selectReactionEmotion = document.getElementById('reaction-emotion-select') as HTMLSelectElement;
const inputReactionDialogue = document.getElementById('reaction-dialogue-input') as HTMLInputElement;
const selectReactionSound = document.getElementById('reaction-sound-select') as HTMLSelectElement;
const btnAddReaction = document.getElementById('btn-add-reaction') as HTMLButtonElement;
const reactionsTbody = document.getElementById('reactions-tbody') as HTMLElement;
const emptyReactionsMsg = document.getElementById('empty-reactions-msg') as HTMLElement;

// Admin
const btnPrestige = document.getElementById('btn-prestige') as HTMLButtonElement;
const lblAdminPrestige = document.getElementById('lbl-admin-prestige') as HTMLElement;
const btnExport = document.getElementById('btn-export') as HTMLButtonElement;
const btnImport = document.getElementById('btn-import') as HTMLButtonElement;
const fileImport = document.getElementById('file-import') as HTMLInputElement;
const btnResetStats = document.getElementById('btn-reset-stats') as HTMLButtonElement;
const btnHardReset = document.getElementById('btn-hard-reset') as HTMLButtonElement;


async function init() {
  // Navigation Tabs Switching
  const menuButtons = document.querySelectorAll('.menu-btn');
  const pagePanes = document.querySelectorAll('.page-pane');

  const switchTab = (target: string) => {
    menuButtons.forEach(b => {
      if (b.getAttribute('data-target') === target) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    pagePanes.forEach((pane) => {
      if (pane.id === `page-${target}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
  };

  menuButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (!target) return;
      switchTab(target);
      window.location.hash = target;
    });
  });

  // Handle initial hash
  if (window.location.hash) {
    const target = window.location.hash.substring(1);
    const validTarget = Array.from(menuButtons).some(b => b.getAttribute('data-target') === target);
    if (validTarget) {
      switchTab(target);
    }
  }

  // Load Settings and Stats from local storage
  let storageData: Record<string, any> = {};
  try {
    storageData = await extensionApi.storage.local.get<Record<string, any>>([STORAGE_KEYS.STATS, STORAGE_KEYS.SETTINGS, STORAGE_KEYS.MOOD]);
  } catch (e) {
    console.error('[Clawd Options] Failed to load initial storage data:', e);
  }
  blockedDomains = storageData[STORAGE_KEYS.SETTINGS]?.blockedDomains || [];
  domainReactions = storageData[STORAGE_KEYS.SETTINGS]?.domainReactions || [];

  populateHourSelects();
  applySettings(storageData[STORAGE_KEYS.SETTINGS]);

  // Initializing the Movement Engine for the Playground
  playgroundMovement = new MovementEngine(playgroundPetRoot, {
    size: storageData[STORAGE_KEYS.SETTINGS]?.size || 128,
    speed: storageData[STORAGE_KEYS.SETTINGS]?.speed || 1.0,
    container: playgroundStage,
    isSandbox: true
  });
  playgroundMovement.start();

  petImg.addEventListener('mouseenter', () => {
    petImg.animate([
      { transform: 'scale(1) rotate(0deg)' },
      { transform: 'scale(1.2) rotate(6deg)' }
    ], { duration: 200, fill: 'forwards' });
  });
  petImg.addEventListener('mouseleave', () => {
    petImg.animate([
      { transform: 'scale(1.2) rotate(6deg)' },
      { transform: 'scale(1) rotate(0deg)' }
    ], { duration: 200, fill: 'forwards' });
  });

  // Initializing the Personality System
  personality = new PersonalitySystem((updatedStats) => {
    updateUIStats(updatedStats);
    renderWardrobe(updatedStats, activeCostume, seasonalToggle.checked);
  });

  await personality.isLoaded;
  updateUIStats(personality.stats);
  updateUIMood(storageData[STORAGE_KEYS.MOOD] || 'happy');
  updateLocalAiStatus();
  updatePresence();

  // Inject version
  const versionEl = document.getElementById('version-display');
  const manifest = extensionApi.runtime.getManifest();
  if (versionEl && manifest) {
    const runtimeMode = supportsLocalAiRuntime ? 'Local AI' : 'Lite';
    versionEl.textContent = `Version ${manifest.version} (${runtimeMode})`;
  }

  // Polling for real-time indicators
  setInterval(() => {
    updatePresence();
    updateLocalAiStatus();
  }, 5000);

  // Initial Wardrobe rendering
  renderWardrobe(personality.stats, storageData[STORAGE_KEYS.SETTINGS]?.costume || 'none', storageData[STORAGE_KEYS.SETTINGS]?.seasonalEnabled ?? true);

  // Interaction buttons
  const btnPet = document.getElementById('btn-pet') as HTMLButtonElement;
  const btnFeed = document.getElementById('btn-feed') as HTMLButtonElement;
  const btnShoo = document.getElementById('btn-shoo') as HTMLButtonElement;

  btnPet?.addEventListener('click', () => {
    if (btnPet.hasAttribute('disabled')) return;
    triggerPetAction('pet', 'love', 'petting', 'Purrrr... ❤️');
  });

  btnFeed?.addEventListener('click', () => {
    if (btnFeed.hasAttribute('disabled')) return;
    triggerPetAction('feed', 'eating', 'feeding', 'Munch munch! 🍕');
  });

  btnShoo?.addEventListener('click', () => {
    if (btnShoo.hasAttribute('disabled')) return;
    triggerPetAction('shoo', 'cool', 'shoo', 'Shoo! 🏃‍♂️');
  });

  // Chat Panel Logic
  const chatPanel = document.getElementById('options-chat-panel') as HTMLElement;
  const chatInput = document.getElementById('options-chat-input') as HTMLInputElement;
  const chatSend = document.getElementById('options-chat-send') as HTMLButtonElement;
  const chatMic = document.getElementById('options-chat-mic') as HTMLButtonElement;
  const chatMessages = document.getElementById('options-chat-messages') as HTMLElement;

  let chatHistory: { role: string; content: string }[] = [];
  
  const saveChatHistory = () => {
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
    extensionApi.storage.local.set({ clawdDashboardHistory: chatHistory })
      .catch((e) => { console.warn('[Clawd Options] Failed to save chat history:', e); });
  };
  
  extensionApi.storage.local.get<Record<string, any>>(['clawdDashboardHistory']).then((result) => {
    if (result.clawdDashboardHistory && Array.isArray(result.clawdDashboardHistory)) {
      chatHistory = result.clawdDashboardHistory;
      chatHistory.forEach(msg => {
        addChatMessage(msg.role === 'user' ? 'user' : 'clawd', msg.content);
      });
    }
  }).catch((e) => { console.warn('[Clawd Options] Failed to load chat history:', e); });

  const addChatMessage = (role: 'user' | 'clawd', text: string, insertBeforeEl?: Element | null) => {
    const el = document.createElement('div');
    el.className = `options-chat-msg ${role}`;
    
    // Remove emojis for Clawd's responses
    const displayText = role === 'clawd' 
      ? text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim() 
      : text;

    const textNode = document.createElement('div');
    textNode.innerHTML = parseMarkdown(displayText);
    el.appendChild(textNode);

    if (role === 'clawd') {
      const controlsRow = document.createElement('div');
      controlsRow.style.marginTop = '6px';
      controlsRow.style.display = 'flex';
      controlsRow.style.justifyContent = 'flex-end';
      controlsRow.style.gap = '8px';

      const playBtn = document.createElement('button');
      playBtn.className = 'clawd-control-btn';
      playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume-2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
      playBtn.title = 'Play voice';
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const soundEnabled = soundToggle.checked;
        if (soundEnabled && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(displayText);
          
          (window as any).__currentUtterance = utterance;

          const voices = window.speechSynthesis.getVoices();
          let preferredVoice;
          if (chatVoiceSelect.value) {
            preferredVoice = voices.find(v => v.name === chatVoiceSelect.value);
          }
          if (!preferredVoice) {
            preferredVoice = voices.find(v => 
              v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')
            );
          }
          if (preferredVoice) utterance.voice = preferredVoice;
          utterance.volume = Number(volumeSlider.value) / 100;
          utterance.pitch = 1.2;

          utterance.onend = () => {
            (window as any).__currentUtterance = null;
          };

          window.speechSynthesis.speak(utterance);
        }
      });
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'clawd-control-btn';
      copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
      copyBtn.title = 'Copy Response';
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(displayText);
        } catch (err) {
          console.error('Failed to copy', err);
        }
      });

      const redoBtn = document.createElement('button');
      redoBtn.className = 'clawd-control-btn';
      redoBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
      redoBtn.title = 'Redo';
      redoBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const allMsgs = Array.from(chatMessages.children);
        const myIndex = allMsgs.indexOf(el);
        let lastUserMsg = "";
        for(let i = myIndex - 1; i >= 0; i--) {
          if (allMsgs[i].classList.contains('user')) {
            lastUserMsg = allMsgs[i].textContent || "";
            break;
          }
        }
        if (lastUserMsg) {
          if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'model') {
            chatHistory.pop();
            saveChatHistory();
          }
          const originalText = textNode.textContent;
          textNode.innerHTML = '<div class="ld-dots"><i></i><i></i><i></i></div>';
          controlsRow.style.display = 'none';

          setChatLoading(true, false);
          try {
            const persona = personaSelect.value || 'default';
            const statsContext = `Happiness: ${personality.stats.happiness}%, Energy: ${personality.stats.energy}%, Focus: ${personality.stats.focus}%, Personality Trait: ${getDominantTrait(personality.stats)}`;
            const response = await getAiChatResponse(lastUserMsg, "User is currently looking at the Sanctuary Dashboard.", persona, statsContext, chatHistory);
            
            setChatLoading(false);

            if (response) {
              addChatMessage('clawd', response, el);
              chatHistory.push({ role: 'model', content: response });
              saveChatHistory();
              el.remove();
            } else {
              textNode.textContent = originalText;
              controlsRow.style.display = 'flex';
            }
          } catch (e) {
            setChatLoading(false);
            textNode.textContent = originalText;
            controlsRow.style.display = 'flex';
            addChatMessage('clawd', "Oops! Something went wrong connecting to my brain.");
          }
        }
      });

      controlsRow.appendChild(playBtn);
      controlsRow.appendChild(copyBtn);
      controlsRow.appendChild(redoBtn);
      el.appendChild(controlsRow);
    }

    if (insertBeforeEl && insertBeforeEl.parentNode === chatMessages) {
      chatMessages.insertBefore(el, insertBeforeEl);
    } else {
      chatMessages.appendChild(el);
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  // Focus the input when the chat tab is selected
  const chatMenuBtn = document.querySelector('.menu-btn[data-target="chat"]');
  chatMenuBtn?.addEventListener('click', () => {
    setTimeout(() => chatInput.focus(), 50);
  });

  const setChatLoading = (isLoading: boolean, appendIndicator = true) => {
    chatSend.disabled = isLoading;
    chatInput.disabled = isLoading;
    if (isLoading) {
      if (appendIndicator) {
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'options-chat-msg clawd loading-indicator';
        loadingMsg.innerHTML = '<div class="ld-dots"><i></i><i></i><i></i></div>';
        chatMessages.appendChild(loadingMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    } else {
      const loadingIndicator = chatMessages.querySelector('.loading-indicator');
      if (loadingIndicator) loadingIndicator.remove();
      chatInput.focus();
    }
  };

  const submitOptionsChat = async () => {
    const text = chatInput.value.trim();
    if (!text) return;
    
    addChatMessage('user', text);
    chatInput.value = '';
    
    setChatLoading(true);
    chatHistory.push({ role: 'user', content: text });
    saveChatHistory();
    
    try {
      const persona = personaSelect.value || 'default';
      const statsContext = `Happiness: ${personality.stats.happiness}%, Energy: ${personality.stats.energy}%, Focus: ${personality.stats.focus}%, Personality Trait: ${getDominantTrait(personality.stats)}`;
      // Passing a dummy page context since we are in the dashboard
      const response = await getAiChatResponse(text, "User is currently looking at the Sanctuary Dashboard.", persona, statsContext, chatHistory);
      
      setChatLoading(false);

      if (response) {
        addChatMessage('clawd', response);
        chatHistory.push({ role: 'assistant', content: response });
        saveChatHistory();
      } else {
        addChatMessage('clawd', "Oops! My brain froze. Could you repeat that?");
      }
    } catch (e) {
      console.error('[Clawd Dashboard Chat] Error:', e);
      addChatMessage('clawd', "Oops! Something went wrong connecting to my brain.");
    } finally {
      chatInput.disabled = false;
      chatInput.focus();
    }
  };

  chatSend?.addEventListener('click', submitOptionsChat);
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !chatInput.disabled) submitOptionsChat();
  });
  chatInput?.addEventListener('input', () => {
    chatSend.disabled = chatInput.value.trim().length === 0;
  });

  // Speech Recognition
  let recognition: any = null;
  let isListening = false;
  if ('webkitSpeechRecognition' in window) {
    recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isListening = true;
      chatMic.classList.add('listening-pulse');
      chatInput.placeholder = "Listening...";
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      chatInput.value = finalTranscript + interimTranscript;
      chatSend.disabled = chatInput.value.trim().length === 0;
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error", event.error);
      stopListening();
    };

    recognition.onend = () => {
      stopListening();
    };
  }

  const stopListening = () => {
    isListening = false;
    chatMic?.classList.remove('listening-pulse');
    if (chatInput) chatInput.placeholder = "Type a message...";
    if (recognition) recognition.stop();
  };

  chatMic?.addEventListener('click', () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      chatInput.value = '';
      recognition.start();
    }
  });

  // Setting bindings
  nameInput.addEventListener('input', () => {
    const name = nameInput.value.trim() || 'Clawd';
    if (petNameEl) petNameEl.textContent = name;
    updatePetNameDisplays(name);
    saveSettings();
  });

  sizeSlider.addEventListener('input', () => {
    sizeVal.textContent = `${sizeSlider.value}px`;
    saveSettings();
  });

  speedSlider.addEventListener('input', () => {
    const speed = (Number(speedSlider.value) / 10).toFixed(1);
    speedVal.textContent = `${speed}x`;
    saveSettings();
  });

  flightSpeedSlider.addEventListener('input', () => {
    const flightSpeed = (Number(flightSpeedSlider.value) / 10).toFixed(1);
    flightSpeedVal.textContent = `${flightSpeed}x`;
    saveSettings();
  });

  petColorInput.addEventListener('change', () => {
    saveSettings();
    updateUIMood(currentMoodState);
  });

  btnResetColor.addEventListener('click', () => {
    petColorInput.value = '#DE886D';
    saveSettings();
    updateUIMood(currentMoodState);
  });

  personaSelect.addEventListener('change', saveSettings);
  chatVoiceSelect.addEventListener('change', saveSettings);

  // Planner change listeners
  sleepStartSelect.addEventListener('change', saveSettings);
  sleepEndSelect.addEventListener('change', saveSettings);
  workStartSelect.addEventListener('change', saveSettings);
  workEndSelect.addEventListener('change', saveSettings);
  focusActiveToggle.addEventListener('change', saveSettings);
  focusStartSelect.addEventListener('change', saveSettings);
  focusEndSelect.addEventListener('change', saveSettings);
  performanceModeToggle.addEventListener('change', saveSettings);
  ghostModeToggle.addEventListener('change', saveSettings);

  soundToggle.addEventListener('change', () => {
    if (soundToggle.checked) {
      volumeContainer.classList.remove('hidden');
    } else {
      volumeContainer.classList.add('hidden');
    }
    saveSettings();
  });

  volumeSlider.addEventListener('input', () => {
    volumeVal.textContent = `${volumeSlider.value}%`;
    saveSettings();
  });

  aiToggle.addEventListener('change', () => {
    if (aiToggle.checked) {
      aiTuningContainer.classList.remove('hidden');
    } else {
      aiTuningContainer.classList.add('hidden');
    }
    saveSettings();
    updateLocalAiStatus();
  });

  aiSensitivitySlider.addEventListener('input', () => {
    aiSensitivityVal.textContent = `${aiSensitivitySlider.value}%`;
    saveSettings();
  });

  aiFrequencySlider.addEventListener('input', () => {
    aiFrequencyVal.textContent = `${aiFrequencySlider.value}s`;
    saveSettings();
  });

  scheduleToggle.addEventListener('change', saveSettings);
  seasonalToggle.addEventListener('change', () => {
    saveSettings();
    renderWardrobe(personality.stats, activeCostume, seasonalToggle.checked);
    // Force mood update to apply seasonal fallback if needed
    updateUIMood(currentMoodState);
  });

  // Blocklist listeners
  btnAddBlock.addEventListener('click', addBlockedDomain);
  inputBlockDomain.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBlockedDomain();
  });
  inputSearchBlocklist.addEventListener('input', renderBlocklist);

  // Domain Reactions listeners
  btnAddReaction.addEventListener('click', addDomainReaction);
  inputReactionDomain.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addDomainReaction();
  });

  // Rebirth Prestige
  btnPrestige.addEventListener('click', async () => {
    const confirmed = confirm("Are you sure you want to rebirth Clawd? This resets his level to 1, but increases his prestige rank. You'll unlock permanent rewards!");
    if (!confirmed) return;

    if (personality.stats.level >= 50) {
      personality.stats.prestige = (personality.stats.prestige || 0) + 1;
      personality.stats.level = 1;
      personality.stats.xp = 0;
      await personality._save();
      updateUIStats(personality.stats);
      alert(`Clawd has reborn! He is now Prestige ${personality.stats.prestige}! 🎉`);
    }
  });

  // Backup actions
  btnExport.addEventListener('click', exportProfile);
  btnImport.addEventListener('click', () => fileImport.click());
  fileImport.addEventListener('change', importProfile);

  // Sound board preview listeners
  const soundPlayButtons = document.querySelectorAll('.sound-play-btn') as NodeListOf<HTMLButtonElement>;
  soundPlayButtons.forEach(btn => {
    btn.disabled = !supportsLocalAiRuntime;
    if (!supportsLocalAiRuntime) {
      btn.title = 'Sound playback is unavailable in this Firefox build.';
    }
    btn.addEventListener('click', () => {
      if (!supportsLocalAiRuntime) return;
      const soundType = btn.getAttribute('data-sound');
      if (soundType) {
        const vol = Number(volumeSlider.value) / 100;
        playPreviewSound(soundType, vol);
      }
    });
  });

  // Resets
  btnResetStats.addEventListener('click', async () => {
    const confirmed = confirm("WARNING: This will reset Clawd's stats, level, prestige, and activity history to defaults. Settings will not be touched. Continue?");
    if (!confirmed) return;

    await extensionApi.storage.local.remove(STORAGE_KEYS.STATS);
    window.location.reload();
  });

  btnHardReset.addEventListener('click', async () => {
    const confirmed = confirm("CRITICAL WARNING: This will completely wipe all local extension data, options, and history for Clawd. This action is irreversible. Continue?");
    if (!confirmed) return;

    await extensionApi.storage.local.clear();
    window.location.reload();
  });

  // 24-Hour Synapse Viewer
  btnViewInsight?.addEventListener('click', async () => {
    if (!personality.stats.aiInsight?.content) return;

    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;
    modal.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px; padding: 32px; max-width: 450px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
        <div style="font-size: 40px; margin-bottom: 16px;">🧠</div>
        <h2 style="font-size: 20px; margin-bottom: 12px; font-weight: 700;">Daily Synapse Reflection</h2>
        <p style="font-size: 15px; line-height: 1.6; color: var(--text-primary); font-style: italic; margin-bottom: 24px;">
          "${escapeHtml(personality.stats.aiInsight.content)}"
        </p>
        <button id="close-insight-modal" class="btn btn-primary" style="width: 100%;">Got it, Clawd!</button>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#close-insight-modal');
    closeBtn?.addEventListener('click', async () => {
      modal.remove();
      if (personality.stats.aiInsight) {
        personality.stats.aiInsight.isNew = false;
        await personality._save();
      }
    });
  });

  // Clear Logs UI button
  const btnClearLogs = document.getElementById('btn-clear-logs-ui');
  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', async () => {
      const confirmed = confirm("Are you sure you want to clear Clawd's history timeline?");
      if (!confirmed) return;

      const data = await extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.STATS);
      const stats = data[STORAGE_KEYS.STATS] || {};
      stats.moodHistory = [];
      await extensionApi.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
    });
  }

  // Storage listener to update UI in real time
  extensionApi.storage.onChanged?.addListener((changes) => {
    if (changes[STORAGE_KEYS.STATS]) {
      updateUIStats(changes[STORAGE_KEYS.STATS].newValue);
    }
    if (changes[STORAGE_KEYS.MOOD]) {
      updateUIMood(changes[STORAGE_KEYS.MOOD].newValue);
    }
    if (changes[STORAGE_KEYS.SETTINGS] && !document.hasFocus()) {
      applySettings(changes[STORAGE_KEYS.SETTINGS].newValue);
    }
    if (changes[STORAGE_KEYS.MODEL_LOADING_STATE] || changes[STORAGE_KEYS.MODEL_DOWNLOAD_PROGRESS]) {
      updateLocalAiStatus();
    }
  });

  // Real-time State Synchronization for Sanctuary
  extensionApi.runtime.onMessage?.addListener((message) => {
    if (message.type === 'sync-pet-state') {
      if (playgroundMovement && !playgroundMovement.isDragging) {
        playgroundMovement.syncState(message.state);
      }
    } else if (message.type === 'sync-origin-pet-state') {
      const { emotion: syncedEmotion, dialogue: syncedDialogue } = message.state;
      updateUIMood(syncedEmotion);
      if (syncedDialogue) {
        const bubble = document.getElementById('sandbox-speech-bubble');
        if (bubble) {
          bubble.textContent = syncedDialogue;
          bubble.classList.add('show');
          setTimeout(() => bubble.classList.remove('show'), 3000);
        }
      }
    }
  });
}

async function triggerPetAction(action: string, temporaryMood: string, soundName: string, textBubble: string) {
  const btnPet = document.getElementById('btn-pet') as HTMLButtonElement;
  const btnFeed = document.getElementById('btn-feed') as HTMLButtonElement;
  const btnShoo = document.getElementById('btn-shoo') as HTMLButtonElement;

  // Disable buttons and set to waiting cooldown
  let countdown = 3;
  if (btnPet) { btnPet.disabled = true; btnPet.textContent = `Wait ${countdown}s...`; }
  if (btnFeed) { btnFeed.disabled = true; btnFeed.textContent = `Wait ${countdown}s...`; }
  if (btnShoo) { btnShoo.disabled = true; btnShoo.textContent = `Wait ${countdown}s...`; }

  const interval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      if (btnPet) btnPet.textContent = `Wait ${countdown}s...`;
      if (btnFeed) btnFeed.textContent = `Wait ${countdown}s...`;
      if (btnShoo) btnShoo.textContent = `Wait ${countdown}s...`;
    } else {
      clearInterval(interval);
    }
  }, 1000);

  if (soundToggle.checked) {
    const vol = Number(volumeSlider.value) / 100;
    playPreviewSound(soundName, vol);
    setTimeout(() => { playPreviewSound('chat', vol); }, 100); // slight delay so the chat sound follows the action sound
  }

  const bubble = document.getElementById('sandbox-speech-bubble');
  if (bubble) {
    bubble.textContent = textBubble;
    bubble.classList.add('show');
    setTimeout(() => bubble.classList.remove('show'), 2500);
  }

  // Visual mood preview
  updateUIMood(temporaryMood);

  // Jump animation WAAPI
  if (petImg) {
    petImg.animate([
      { transform: 'translateY(0)' },
      { transform: 'translateY(-30px)' },
      { transform: 'translateY(0)' }
    ], { duration: 400, easing: 'ease-out' });
  }

  if (action === 'shoo') {
    playgroundMovement.shoo();
  }

  await personality.recordInteraction(action);

  setTimeout(async () => {
    const currentMood = await extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.MOOD);
    updateUIMood(currentMood[STORAGE_KEYS.MOOD] || 'happy');

    // Restore buttons after 3 seconds
    if (btnPet) {
      btnPet.disabled = false;
      btnPet.textContent = 'Pet Clawd';
    }
    if (btnFeed) {
      btnFeed.disabled = false;
      btnFeed.textContent = 'Feed Snack';
    }
    if (btnShoo) {
      btnShoo.disabled = false;
      btnShoo.textContent = 'Shoo Away';
    }
  }, 3000);
}


async function playPreviewSound(type: string, volume: number): Promise<void> {
  const sounds: Record<string, string> = {
    greeting: 'greeting.mp3',
    levelUp: 'level-up.mp3',
    petting: 'petting-love.mp3',
    sad: 'sad-crying.mp3',
    shoo: 'shoo-run.mp3',
    sleeping: 'sleeping.mp3',
    thinking: 'thinking-coding-work.mp3',
    feeding: 'feeding-celebrating.mp3',
    chat: 'chat-message.mp3'
  };

  const filename = sounds[type];
  if (!filename) return;

  try {
    extensionApi.runtime.sendMessage({
      type: 'play-sound',
      filename,
      volume
    });
  } catch (e) {
    console.warn("Failed to play sound preview:", e);
  }
}

function updateUIMood(mood: string): void {
  currentMoodState = mood;
  const meta = EMOTIONS_METADATA[mood] || { name: mood, emoji: '😊' };
  if (petMoodBadge) petMoodBadge.textContent = `${meta.emoji} ${meta.name}`;
  const svgName = getResolvedCostumeName(mood, activeCostume);
  
  // Apply custom color if set
  const color = petColorInput.value;
  personality.isLoaded.then(() => {
    const isUnlocked = personality.stats.level >= 15 || (personality.stats.prestige && personality.stats.prestige > 0);
    const activeColor = isUnlocked ? color : undefined;
    
    const url = getRuntimeUrl(`assets/pets/clawd-${svgName}.svg`);
    if (!activeColor || activeColor === '#DE886D') {
      if (petImg) petImg.src = url;
      return;
    }

    fetch(url).then(r => r.text()).then(svgText => {
      // Architectural Fix: Instead of fragile string replacement of exact hex codes,
      // we inject a style block into the SVG that targets our base colors.
      if (activeColor && activeColor !== '#DE886D') {
        const styleBlock = `<style>
          :root { --pet-core-color: ${activeColor}; }
          [fill^="#DE886D" i], [fill^="#CF7B61" i], [fill^="#C77A5E" i], [fill^="#C9745A" i], [fill^="#A85B45" i], [fill^="#C75D3F" i] { 
            fill: var(--pet-core-color) !important; 
          }
        </style>`;
        svgText = svgText.replace(/<svg([^>]*)>/i, `<svg$1>${styleBlock}`);
      }
      
      const dataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;
      if (petImg) petImg.src = dataUri;
    }).catch(e => {
      console.warn('[Clawd Dashboard] Failed to apply custom color/formatter:', e);
      if (petImg) petImg.src = getRuntimeUrl('assets/pets/clawd-happy.svg');
    });
  });
}

function updateUIStats(stats: PetStats | undefined): void {
  if (!stats) return;

  // Level & XP
  if (petLevelEl) petLevelEl.textContent = String(stats.level);
  const xpNeeded = Math.floor(Math.pow(stats.level, 1.5) * 150);
  if (xpText) xpText.textContent = `${stats.xp} / ${xpNeeded} XP`;
  if (barXp) barXp.style.width = `${Math.min(100, (stats.xp / xpNeeded) * 100)}%`;

  // Color Picker unlock check
  const colorUnlocked = stats.level >= 15 || (stats.prestige && stats.prestige > 0);
  if (petColorInput) {
    petColorInput.disabled = !colorUnlocked;
    const label = document.querySelector('label[for="pet-color-input"]');
    if (label) {
      label.textContent = colorUnlocked ? 'Custom Mascot Color' : 'Custom Mascot Color (Unlocked at LVL 15)';
    }
  }
  if (btnResetColor) btnResetColor.disabled = !colorUnlocked;

  // Prestige status
  const hasPrestige = stats.prestige && stats.prestige > 0;
  if (lblAdminPrestige) lblAdminPrestige.textContent = String(stats.prestige || 0);
  if (prestigeBadge) {
    if (hasPrestige) {
      prestigeBadge.classList.remove('hidden');
    } else {
      prestigeBadge.classList.add('hidden');
    }
  }
  if (prestigeLevelEl) prestigeLevelEl.textContent = String(stats.prestige || 0);

  // Toggle Rebirth buttons
  if (stats.level >= 50) {
    btnPrestige.removeAttribute('disabled');
  } else {
    btnPrestige.setAttribute('disabled', 'true');
  }

  // Dominant trait
  const trait = getDominantTrait(stats);
  if (petTraitBadge) {
    petTraitBadge.textContent = trait.toUpperCase();
    petTraitBadge.className = `badge badge-trait trait-${trait}`;
  }
  lblHabitTrait.textContent = trait;

  // Calculations for speed
  const baseSpeed = 1.0;
  const energyFactor = Math.max(0.4, Math.min(1.2, stats.energy / 100));
  let traitFactor = 1.0;
  if (trait === 'gamer') {
    traitFactor = 1.35 + ((stats.prestige || 0) * 0.15);
  } else if (trait === 'developer') {
    traitFactor = 0.85 / (1 + (stats.prestige || 0) * 0.1);
  }
  const speedMod = baseSpeed * energyFactor * traitFactor;
  let speedDesc = 'Normal';
  if (speedMod > 1.2) speedDesc = 'Hyper';
  else if (speedMod > 1.05) speedDesc = 'Fast';
  else if (speedMod < 0.6) speedDesc = 'Exhausted';
  else if (speedMod < 0.9) speedDesc = 'Calm';

  lblHabitSpeed.textContent = `${speedMod.toFixed(2)}x (${speedDesc})`;

  if (playgroundMovement) {
    playgroundMovement.updateSettings({
      speed: speedMod
    });
  }

  // Default behaviors
  let behaviorDesc = 'Standard';
  if (trait === 'developer') behaviorDesc = 'Analytical (Thinking)';
  else if (trait === 'gamer') behaviorDesc = 'Playful (Cool)';
  else if (trait === 'scholar') behaviorDesc = 'Focused (Reading)';
  else if (trait === 'socialite') behaviorDesc = 'Affectionate (Love)';
  lblHabitBehavior.textContent = behaviorDesc;

  // Update core gauges
  const roundedHappiness = Math.round(stats.happiness);
  const roundedEnergy = Math.round(stats.energy);
  const roundedCuriosity = Math.round(stats.curiosity);
  const roundedFocus = Math.round(stats.focus ?? 50);
  const roundedLeisure = Math.round(stats.leisure ?? 50);

  gauges.happinessVal.textContent = `${roundedHappiness}%`;
  gauges.happinessBar.style.width = `${roundedHappiness}%`;

  gauges.energyVal.textContent = `${roundedEnergy}%`;
  gauges.energyBar.style.width = `${roundedEnergy}%`;

  gauges.curiosityVal.textContent = `${roundedCuriosity}%`;
  gauges.curiosityBar.style.width = `${roundedCuriosity}%`;

  gauges.focusVal.textContent = `${roundedFocus}%`;
  gauges.focusBar.style.width = `${roundedFocus}%`;

  gauges.leisureVal.textContent = `${roundedLeisure}%`;
  gauges.leisureBar.style.width = `${roundedLeisure}%`;

  // Lifetime counts
  valTotalPets.textContent = String(stats.totalPets || 0);
  valTotalFeeds.textContent = String(stats.totalFeeds || 0);

  // Interest breakdown
  renderCategoriesChart(stats.siteCategoryCounts);
  renderAnalyticsCharts(stats);

  // Timeline list
  renderTimeline(stats.moodHistory);

  // Milestones list
  renderMilestones(stats);

  // 24-Hour Synapse Progress
  updateSynapseUI(stats);
}

async function updateSynapseUI(stats: PetStats) {
  if (!synapseChargingContainer || !synapseReadyContainer) return;

  const lastGen = stats.aiInsight?.lastGeneratedTimestamp || Date.now();
  const now = Date.now();
  const msInDay = 24 * 60 * 60 * 1000;
  const elapsed = now - lastGen;
  const progress = Math.min(100, Math.floor((elapsed / msInDay) * 100));

  const remainingHours = Math.max(0, 24 - Math.floor(elapsed / (60 * 60 * 1000)));

  if (progress < 100) {
    synapseChargingContainer.classList.remove('hidden');
    synapseReadyContainer.classList.add('hidden');
    synapsePct.textContent = `${progress}%`;
    barSynapse.style.width = `${progress}%`;
    synapseLabel.textContent = `Gathering Memories...`;
    synapseStatusBadge.textContent = 'Syncing';
    synapseStatusBadge.className = 'badge badge-mood';
  } else {
    // Synapse is ready!
    synapseChargingContainer.classList.add('hidden');
    synapseReadyContainer.classList.remove('hidden');
    synapseStatusBadge.textContent = 'Ready';
    synapseStatusBadge.className = 'badge badge-lvl';

    // If there's no content or it's been more than 24 hours since the last one, generate it
    if (!stats.aiInsight?.content || !stats.aiInsight.isNew) {
      // Trigger AI generation
      const settingsData = await extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS);
      const persona = settingsData[STORAGE_KEYS.SETTINGS]?.persona || 'default';

      if (synapsePreviewText) synapsePreviewText.textContent = "Clawd is concentrating on your day...";

      const insight = await getDailyInsight(stats, persona);

      personality.stats.aiInsight = {
        lastGeneratedTimestamp: now,
        content: insight,
        isNew: true
      };
      await personality._save();

      if (synapsePreviewText) synapsePreviewText.textContent = `"${insight.substring(0, 60)}..."`;
    } else {
      if (synapsePreviewText) synapsePreviewText.textContent = `"${stats.aiInsight.content.substring(0, 60)}..."`;
    }
  }
}

function renderMilestones(stats: PetStats) {
  if (!milestonesList) return;
  milestonesList.innerHTML = '';

  const milestones = [];

  // Level Milestones
  if (stats.level >= 1) milestones.push({ title: 'New Beginning', desc: 'Clawd has entered your browser sanctuary.', icon: '🐾', date: 'Level 1' });
  if (stats.level >= 3) milestones.push({ title: 'Expressive Mind', desc: 'Unlocked Advanced Emotions (Coding, Dancing, etc).', icon: '🧠', date: 'Level 3' });
  if (stats.level >= 5) milestones.push({ title: 'Aura of Mystery', desc: 'Unlocked Detective Costume & Blue Aura.', icon: '🕵️', date: 'Level 5' });
  if (stats.level >= 10) milestones.push({ title: 'Ultimate Companion', desc: 'All standard emotions and Magic Purple Aura unlocked.', icon: '✨', date: 'Level 10' });
  if (stats.level >= 15) milestones.push({ title: 'Neon Dreamer', desc: 'Unlocked the Rainbow Shader and Custom Mascot Color Picker.', icon: '🌈', date: 'Level 15' });
  if (stats.level >= 50) milestones.push({ title: 'Mascot Sage', desc: 'Reached the peak of standard growth.', icon: '🎓', date: 'Level 50' });

  // Interaction Milestones
  if (stats.totalPets >= 10) milestones.push({ title: 'Well Loved', desc: 'Received more than 10 head pats.', icon: '❤️', date: `${stats.totalPets} Pets` });
  if (stats.totalPets >= 100) milestones.push({ title: 'Heart of Gold', desc: 'A truly pampered mascot!', icon: '💖', date: `${stats.totalPets} Pets` });
  if (stats.totalFeeds >= 10) milestones.push({ title: 'Happy Tummy', desc: 'Successfully enjoyed 10 snacks.', icon: '🍕', date: `${stats.totalFeeds} Feeds` });
  if (stats.totalFeeds >= 100) milestones.push({ title: 'Gourmet Eater', desc: 'A professional browser snacker.', icon: '🍗', date: `${stats.totalFeeds} Feeds` });

  // Prestige Milestones
  if (stats.prestige && stats.prestige > 0) {
    milestones.push({ title: 'Ethereal Rebirth', desc: `Reborn into a higher state of being (${stats.prestige}x).`, icon: '🌟', date: `Prestige ${stats.prestige}` });
  }

  // AI Milestones
  if (stats.aiInsight?.content) {
    milestones.push({ title: 'Daily Enlightenment', desc: 'Successfully processed a 24-hour behavioral synapse.', icon: '🧠', date: 'Daily' });
  }

  // Trait Milestones
  const trait = getDominantTrait(stats);
  if (trait !== 'normal') {
    const traitMeta = {
      developer: { title: 'Code Architect', desc: 'Developed a permanent passion for documentation and code.', icon: '💻' },
      gamer: { title: 'Epic Gamer', desc: 'Preferred leisure activities over everything else.', icon: '🎮' },
      scholar: { title: 'Deep Researcher', desc: 'Became an expert in browsing news and articles.', icon: '📖' },
      socialite: { title: 'Social Butterfly', desc: 'Loves spending time on social boards and mail.', icon: '💬' }
    }[trait];
    if (traitMeta) milestones.push({ ...traitMeta, date: 'Trait Evolved' });
  }

  if (milestones.length === 0) {
    milestonesList.innerHTML = `<p class="empty-blocklist">No milestones reached yet. Keep interacting to unlock achievements!</p>`;
    return;
  }

  // Show only last 6 milestones to keep it clean, or all? Let's show all but reverse so newest is first
  milestones.reverse().forEach(m => {
    const card = document.createElement('div');
    card.className = 'milestone-item';
    card.innerHTML = `
      <div class="milestone-header">
        <div class="milestone-icon">${escapeHtml(m.icon)}</div>
        <span class="milestone-title">${escapeHtml(m.title)}</span>
      </div>
      <p class="milestone-desc">${escapeHtml(m.desc)}</p>
      <span class="milestone-date">${escapeHtml(m.date)}</span>
    `;
    milestonesList.appendChild(card);
  });
}

function renderCategoriesChart(counts: Record<string, number> | undefined) {
  if (!categoriesList) return;
  categoriesList.innerHTML = '';

  const CATEGORY_METADATA: Record<string, { name: string; colorClass: string }> = {
    code: { name: 'Coding', colorClass: 'fill-blue' },
    coding: { name: 'Coding', colorClass: 'fill-blue' },
    social: { name: 'Social Media', colorClass: 'fill-pink' },
    gaming: { name: 'Gaming', colorClass: 'fill-yellow' },
    news: { name: 'News & Media', colorClass: 'fill-green' },
    shopping: { name: 'Shopping', colorClass: 'fill-indigo' },
    docs: { name: 'Documentation', colorClass: 'fill-blue' },
    mail: { name: 'Email & Messages', colorClass: 'fill-green' },
    fitness: { name: 'Fitness & Sports', colorClass: 'fill-pink' }
  };

  // Merge counts into normalized keys
  const mergedCounts: Record<string, number> = {};
  if (counts) {
    Object.entries(counts).forEach(([cat, val]) => {
      let normalized = cat.toLowerCase();
      if (normalized === 'code') normalized = 'coding'; // Consolidate aliases
      mergedCounts[normalized] = (mergedCounts[normalized] || 0) + val;
    });
  }

  const total = Object.values(mergedCounts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    categoriesList.innerHTML = `<p class="empty-blocklist">No categories evaluated yet. Clawd will learn as you browse!</p>`;
    return;
  }

  Object.entries(mergedCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, val]) => {
      const meta = CATEGORY_METADATA[cat] || {
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        colorClass: 'fill-blue'
      };
      const pct = Math.round((val / total) * 100);

      const row = document.createElement('div');
      row.className = 'category-row';
      row.innerHTML = `
        <div class="category-meta">
          <span>${escapeHtml(meta.name)}</span>
          <span class="category-pct">${Math.round(val)} (${pct}%)</span>
        </div>
        <div class="category-bar-wrapper">
          <div class="category-bar ${escapeHtml(meta.colorClass)}" style="width: ${pct}%"></div>
        </div>
      `;
      categoriesList.appendChild(row);
    });
}

function renderTimeline(history: MoodHistoryItem[] | undefined) {
  if (!timelineList) return;
  timelineList.innerHTML = '';

  const list = history || [];

  const TIMELINE_METADATA: Record<string, { label: string; icon: string }> = {
    pet: { label: 'Petting received', icon: '👋' },
    feed: { label: 'Feasting on snack', icon: '🍖' },
    shoo: { label: 'Shooed away', icon: '💨' },
    decay: { label: 'Stat decay tick', icon: '⏳' },
    category_code: { label: 'Analyzed Coding workspace', icon: '💻' },
    category_docs: { label: 'Read Technical documentation', icon: '📖' },
    category_gaming: { label: 'Watched gaming streams', icon: '🎮' },
    category_social: { label: 'Scrolled social boards', icon: '❤️' },
    category_news: { label: 'Browsed current news', icon: '📰' },
    category_shopping: { label: 'Looked at shopping lists', icon: '🛍️' },
    category_mail: { label: 'Checked inbox folders', icon: '✉️' },
    category_fitness: { label: 'Examined workout plan', icon: '🧘' }
  };

  if (list.length === 0) {
    timelineList.innerHTML = `<p class="empty-blocklist">No timeline entries yet. Spend some time browsing with Clawd!</p>`;
    return;
  }

  list.slice().reverse().forEach((item: MoodHistoryItem) => {
    const meta = TIMELINE_METADATA[item.action] || { label: item.action, icon: '🐾' };

    let timeStr = 'Recent';
    try {
      const date = new Date(item.time);
      if (!isNaN(date.getTime())) {
        timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString();
      } else if (typeof item.time === 'string') {
        // Fallback for legacy already-localized strings
        timeStr = item.time;
      }
    } catch (e) {
      if (typeof item.time === 'string') timeStr = item.time;
    }

    const row = document.createElement('div');
    row.className = 'timeline-item';
    row.innerHTML = `
      <div class="timeline-icon">${escapeHtml(meta.icon)}</div>
      <div class="timeline-body">
        <span class="timeline-text">${escapeHtml(meta.label)}</span>
        <span class="timeline-time">${escapeHtml(timeStr)}</span>
      </div>
    `;
    timelineList.appendChild(row);
  });
}

function applySettings(settings: PetSettings | undefined) {
  const defaults: PetSettings = {
    size: 128,
    speed: 1.0,
    soundEnabled: true,
    soundVolume: 0.8,
    aiMode: false,
    apiKey: '',
    name: 'Clawd',
    costume: 'none',
    persona: 'default',
    blockedDomains: [],
    scheduleEnabled: true,
    seasonalEnabled: true,
    sleepStartHour: 22,
    sleepEndHour: 6,
    workStartHour: 9,
    workEndHour: 17,
    focusActive: false
  };
  const activeSettings = { ...defaults, ...settings };

  nameInput.value = activeSettings.name || 'Clawd';
  if (petNameEl) petNameEl.textContent = nameInput.value;
  updatePetNameDisplays(nameInput.value);

  const size = activeSettings.size ?? 128;
  sizeSlider.value = String(size);
  sizeVal.textContent = `${size}px`;

  const speed = activeSettings.speed ?? 1.0;
  speedSlider.value = String(Math.round(speed * 10));
  speedVal.textContent = `${speed.toFixed(1)}x`;

  const flightSpeed = activeSettings.flightSpeed ?? 1.0;
  flightSpeedSlider.value = String(Math.round(flightSpeed * 10));
  flightSpeedVal.textContent = `${flightSpeed.toFixed(1)}x`;

  activeCostume = activeSettings.costume || 'none';

  // Apply dynamic times to the Schedule Guide
  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour} ${ampm}`;
  };
  
  const uiScheduleSleep = document.getElementById('ui-schedule-sleep');
  const uiScheduleYoga = document.getElementById('ui-schedule-yoga');
  const sleepStart = activeSettings.sleepStartHour ?? 22;
  const sleepEnd = activeSettings.sleepEndHour ?? 6;
  const workStart = activeSettings.workStartHour ?? 9;

  if (uiScheduleSleep) {
    uiScheduleSleep.textContent = `${formatHour(sleepStart)} - ${formatHour(sleepEnd)}`;
  }
  if (uiScheduleYoga) {
    // Yoga is typically the hour after waking up until work starts (or just a 1-3 hr block)
    uiScheduleYoga.textContent = `${formatHour(sleepEnd)} - ${formatHour(workStart)}`;
  }

  // Apply costume glows to the preview image in the sanctuary stage
  if (petImg) {
    petImg.classList.remove('costume-detective', 'costume-wizard', 'costume-party');
    if (activeCostume !== 'none' && ['detective', 'wizard', 'party'].includes(activeCostume)) {
      petImg.classList.add(`costume-${activeCostume}`);
    }
  }

  // Ensure preview image reflects costume on load
  const lastKnownMood = petMoodBadge?.textContent?.split(' ').slice(1).join(' ').toLowerCase() || 'happy';
  const svgName = getResolvedCostumeName(lastKnownMood, activeCostume);
  if (petImg) petImg.src = `../assets/pets/clawd-${svgName}.svg`;

  // Update playground movement settings
  if (playgroundMovement) {
    playgroundMovement.updateSettings({
      size: size,
      speed: speed,
      flightSpeed: flightSpeed
    });
  }

  personaSelect.value = activeSettings.persona || 'default';
  if (activeSettings.chatVoice) {
    chatVoiceSelect.value = activeSettings.chatVoice;
  } else {
    chatVoiceSelect.value = '';
  }

  const sound = supportsLocalAiRuntime && (activeSettings.soundEnabled ?? true);
  soundToggle.checked = sound;
  soundToggle.disabled = !supportsLocalAiRuntime;
  soundToggle.title = supportsLocalAiRuntime ? '' : 'Sound playback requires Chrome offscreen documents.';
  if (sound) {
    volumeContainer.classList.remove('hidden');
  } else {
    volumeContainer.classList.add('hidden');
  }

  const volume = activeSettings.soundVolume ?? 0.8;
  volumeSlider.value = String(Math.round(volume * 100));
  volumeVal.textContent = `${Math.round(volume * 100)}%`;

  if (petColorInput) {
    petColorInput.value = activeSettings.customColor || '#DE886D';
  }

  aiToggle.checked = supportsLocalAiRuntime && (activeSettings.aiMode ?? false);
  aiToggle.disabled = !supportsLocalAiRuntime;
  aiToggle.title = supportsLocalAiRuntime ? '' : 'Local AI requires Chrome offscreen documents.';
  if (aiToggle.checked) {
    aiTuningContainer.classList.remove('hidden');
  } else {
    aiTuningContainer.classList.add('hidden');
  }

  aiSensitivitySlider.value = String(activeSettings.sentimentSensitivity ?? 50);
  aiSensitivityVal.textContent = `${aiSensitivitySlider.value}%`;

  aiFrequencySlider.value = String(activeSettings.commentFrequency ?? 60);
  aiFrequencyVal.textContent = `${aiFrequencySlider.value}s`;

  scheduleToggle.checked = activeSettings.scheduleEnabled ?? true;
  seasonalToggle.checked = activeSettings.seasonalEnabled ?? true;
  performanceModeToggle.checked = activeSettings.performanceMode ?? false;
  ghostModeToggle.checked = activeSettings.ghostMode ?? false;

  // Apply planner settings to selectors
  sleepStartSelect.value = activeSettings.sleepStartHour !== undefined ? String(activeSettings.sleepStartHour) : '22';
  sleepEndSelect.value = activeSettings.sleepEndHour !== undefined ? String(activeSettings.sleepEndHour) : '6';
  workStartSelect.value = activeSettings.workStartHour !== undefined ? String(activeSettings.workStartHour) : '9';
  workEndSelect.value = activeSettings.workEndHour !== undefined ? String(activeSettings.workEndHour) : '17';
  focusActiveToggle.checked = activeSettings.focusActive ?? false;
  focusStartSelect.value = activeSettings.focusStartHour !== undefined ? String(activeSettings.focusStartHour) : '';
  focusEndSelect.value = activeSettings.focusEndHour !== undefined ? String(activeSettings.focusEndHour) : '';

  domainReactions = activeSettings.domainReactions || [];
  renderDomainReactions();

  renderBlocklist();
  renderWardrobe(personality?.stats, activeCostume, seasonalToggle.checked);
}

function saveSettings() {
  extensionApi.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: {
      size: Number(sizeSlider.value),
      speed: Number(speedSlider.value) / 10,
      flightSpeed: Number(flightSpeedSlider.value) / 10,
      soundEnabled: supportsLocalAiRuntime && soundToggle.checked,
      soundVolume: Number(volumeSlider.value) / 100,
      aiMode: supportsLocalAiRuntime && aiToggle.checked,
      apiKey: '',
      name: nameInput.value.trim() || 'Clawd',
      costume: activeCostume,
      persona: personaSelect.value,
      chatVoice: chatVoiceSelect.value,
      blockedDomains: blockedDomains,
      scheduleEnabled: scheduleToggle.checked,
      seasonalEnabled: seasonalToggle.checked,
      performanceMode: performanceModeToggle.checked,
      ghostMode: ghostModeToggle.checked,
      sleepStartHour: sleepStartSelect.value !== '' ? Number(sleepStartSelect.value) : undefined,
      sleepEndHour: sleepEndSelect.value !== '' ? Number(sleepEndSelect.value) : undefined,
      workStartHour: workStartSelect.value !== '' ? Number(workStartSelect.value) : undefined,
      workEndHour: workEndSelect.value !== '' ? Number(workEndSelect.value) : undefined,
      focusActive: focusActiveToggle.checked,
      focusStartHour: focusStartSelect.value !== '' ? Number(focusStartSelect.value) : undefined,
      focusEndHour: focusEndSelect.value !== '' ? Number(focusEndSelect.value) : undefined,
      domainReactions: domainReactions,
      sentimentSensitivity: Number(aiSensitivitySlider.value),
      commentFrequency: Number(aiFrequencySlider.value),
      customColor: petColorInput.value
    }
  });
}

// AI status update helper
function updateLocalAiStatus() {
  const isEnabled = aiToggle.checked;

  if (!supportsLocalAiRuntime) {
    if (aiStatusBadge) aiStatusBadge.className = 'status-indicator status-checking';
    if (aiStatusText) aiStatusText.textContent = isFirefoxBuild ? 'Brain: Firefox Lite' : 'Brain: Lite Mode';
    if (aiStatusSubtitle) aiStatusSubtitle.textContent = 'Rule-based behavior active';
    if (statusBert) {
      statusBert.textContent = 'Firefox Lite Mode';
      statusBert.style.color = 'var(--text-muted)';
    }
    
    const sancNanoRow = document.getElementById('sanc-nano-row');
    if (sancNanoRow) sancNanoRow.style.display = 'none';

    const notice = document.getElementById('ai-privacy-notice');
    if (notice) {
      notice.innerHTML = `<p style="margin-bottom: 8px;"><strong>Mode: Firefox Lite</strong> — Uses rule-based logic and Regex for fast, zero-download behavior analysis. <br><br><em>Note: Brain Upgrade and Generative Reflections are currently not available on Firefox as they require Chrome offscreen document APIs.</em></p>`;
    }

    return;
  }

  if (!isEnabled) {
    if (aiStatusBadge) aiStatusBadge.className = 'status-indicator status-unsupported';
    if (aiStatusText) aiStatusText.textContent = 'Brain: Lite Mode';
    if (aiStatusSubtitle) aiStatusSubtitle.textContent = 'Using backup instincts';
    return;
  }

  const applyBrainStatus = (response: { success: boolean; state: string; progress: number } | undefined) => {
    let text = 'Brain: Checking...';
    let subtitle = 'Querying model...';
    let className = 'status-indicator status-checking';
    let bertLabel = 'Syncing...';
    let bertColor = 'var(--text-muted)';

    if (!response || !response.success) {
      text = 'Brain: Offline';
      subtitle = 'AI Layer Disconnected';
      className = 'status-indicator status-unsupported';
      bertLabel = 'Disconnected';
      bertColor = '#ef4444';
    } else {
      const s = response.state;
      const p = response.progress;
      if (s === 'ready') {
        text = 'Brain: Ready';
        subtitle = 'DistilBERT Model Active';
        className = 'status-indicator status-ready';
        bertLabel = '✅ Ready';
        bertColor = 'var(--green)';
      } else if (s === 'loading') {
        text = `Brain: ${p}%`;
        subtitle = 'Fetching model weights';
        className = 'status-indicator status-downloading';
        bertLabel = `⏳ ${p}% Loading`;
        bertColor = 'var(--yellow)';
      } else if (s === 'error') {
        text = 'Brain: Error';
        subtitle = 'WASM Failure';
        className = 'status-indicator status-unsupported';
        bertLabel = '❌ Error';
        bertColor = '#ef4444';
      }
    }

    if (aiStatusBadge) aiStatusBadge.className = className;
    if (aiStatusText) aiStatusText.textContent = text;
    if (aiStatusSubtitle) aiStatusSubtitle.textContent = subtitle;
    if (statusBert) {
      statusBert.textContent = bertLabel;
      statusBert.style.color = bertColor;
    }
  };

  const applyNanoStatus = (nanoResponse: { success: boolean; availability: string } | undefined) => {
    let sancClass = 'status-indicator status-checking';
    let sancText = 'Nano: Checking...';

    if (!statusNano) return;

    let availability = nanoResponse?.availability;

    const applyAvailability = (avail: string | undefined) => {
      if (!avail || avail === 'no' || avail === 'unavailable') {
        statusNano.textContent = '❌ Unsupported';
        statusNano.style.color = '#ef4444';
        sancClass = 'status-indicator status-unsupported';
        sancText = 'Nano: Offline';
      } else if (avail === 'after-download' || avail === 'downloadable' || avail === 'downloading') {
        statusNano.textContent = '⏳ Downloading...';
        statusNano.style.color = 'var(--yellow)';
        sancClass = 'status-indicator status-downloading';
        sancText = 'Nano: Downloading...';
      } else if (avail === 'readily' || avail === 'available') {
        statusNano.textContent = '✅ Connected (Gemini Nano)';
        statusNano.style.color = 'var(--green)';
        sancClass = 'status-indicator status-ready';
        sancText = 'Nano: Ready';
      } else {
        statusNano.textContent = 'Wait for web tab...';
        statusNano.style.color = 'var(--text-muted)';
        sancText = 'Wait for web tab...';
      }

      if (sancNanoBadge) sancNanoBadge.className = sancClass;
      if (sancNanoText) sancNanoText.textContent = sancText;
    };

    if (!nanoResponse || availability === 'no') {
      // Fallback to local check if the tab doesn't respond or says 'no'
      if ('ai' in window && (window as any).ai?.languageModel) {
        (window as any).ai.languageModel.capabilities({ expectedOutputs: [{ type: 'text', languages: ['en'] }] }).then((cap: any) => {
          applyAvailability(cap.available);
        }).catch(() => {
          applyAvailability('no');
        });
      } else {
        applyAvailability(availability || 'no');
      }
    } else {
      applyAvailability(availability);
    }
  };

  // 1. Check DistilBERT (Offscreen)
  extensionApi.runtime.sendMessage<{ success: boolean; state: string; progress: number }>({ type: 'check-local-ai-status' })
    .then(applyBrainStatus)
    .catch(() => applyBrainStatus(undefined));

  // 2. Check Gemini Nano (Active Tab Bridge)
  extensionApi.runtime.sendMessage<{ success: boolean; availability: string }>({ type: 'check-tab-ai-availability' })
    .then(applyNanoStatus)
    .catch(() => applyNanoStatus(undefined));
}

function updatePresence() {
  extensionApi.tabs.query({}).then((tabs) => {
    if (activeTabsText) {
      const count = tabs.length;
      activeTabsText.textContent = `${count} Tab${count === 1 ? '' : 's'} Active`;
    }
  }).catch((e) => { console.warn('[Clawd Options] Failed to query active tabs:', e); });
}

// Blocklist table render
function renderBlocklist() {
  blocklistTbody.innerHTML = '';
  const searchVal = inputSearchBlocklist.value.toLowerCase().trim();
  const filtered = blockedDomains.filter(d => d.toLowerCase().includes(searchVal));

  if (filtered.length === 0) {
    emptyBlocklistMsg.style.display = 'block';
    return;
  }

  emptyBlocklistMsg.style.display = 'none';
  filtered.forEach((domain) => {
    const tr = document.createElement('tr');

    const tdDomain = document.createElement('td');
    tdDomain.textContent = domain;

    const tdAction = document.createElement('td');
    tdAction.style.textAlign = 'right';

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn btn-secondary btn-small';
    btnDelete.style.color = '#ef4444';
    btnDelete.textContent = 'Unblock';
    btnDelete.addEventListener('click', () => removeBlockedDomain(domain));

    tdAction.appendChild(btnDelete);
    tr.appendChild(tdDomain);
    tr.appendChild(tdAction);
    blocklistTbody.appendChild(tr);
  });
}

function addBlockedDomain() {
  const newDomain = inputBlockDomain.value.trim().toLowerCase();
  if (!newDomain) return;

  try {
    // Basic domain check
    const cleanDomain = newDomain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    if (cleanDomain && !blockedDomains.includes(cleanDomain)) {
      blockedDomains.push(cleanDomain);
      saveSettings();
      renderBlocklist();
      inputBlockDomain.value = '';
    }
  } catch (err) {
    alert("Invalid domain name formatting.");
  }
}

function removeBlockedDomain(domain: string) {
  blockedDomains = blockedDomains.filter(d => d !== domain);
  saveSettings();
  renderBlocklist();
}

// Domain Reactions
function renderDomainReactions() {
  if (!reactionsTbody) return;
  reactionsTbody.innerHTML = '';

  if (domainReactions.length === 0) {
    emptyReactionsMsg.style.display = 'block';
    return;
  }

  emptyReactionsMsg.style.display = 'none';
  domainReactions.forEach((reaction, index) => {
    const tr = document.createElement('tr');

    const tdDomain = document.createElement('td');
    tdDomain.textContent = reaction.domain;

    const tdEmotion = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = EMOTIONS_METADATA[reaction.emotion]?.name || reaction.emotion;
    tdEmotion.appendChild(badge);

    const tdDialogue = document.createElement('td');
    tdDialogue.textContent = reaction.dialogue || '-';

    const tdSound = document.createElement('td');
    tdSound.textContent = reaction.sound || '-';

    const tdBtns = document.createElement('td');
    tdBtns.style.textAlign = 'right';
    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn btn-secondary btn-small';
    btnDelete.style.color = '#ef4444';
    btnDelete.textContent = 'Remove';
    btnDelete.addEventListener('click', () => removeDomainReaction(index));
    tdBtns.appendChild(btnDelete);

    tr.appendChild(tdDomain);
    tr.appendChild(tdEmotion);
    tr.appendChild(tdDialogue);
    tr.appendChild(tdSound);
    tr.appendChild(tdBtns);
    reactionsTbody.appendChild(tr);
  });
}

function addDomainReaction() {
  const domain = inputReactionDomain.value.trim().toLowerCase();
  const emotion = selectReactionEmotion.value;
  const dialogue = inputReactionDialogue.value.trim();
  const sound = selectReactionSound.value;

  if (!domain || !emotion) return;

  try {
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    if (cleanDomain) {
      const existingIdx = domainReactions.findIndex(r => r.domain === cleanDomain);
      const newReaction = {
        domain: cleanDomain,
        emotion: emotion,
        dialogue: dialogue || undefined,
        sound: sound === 'none' ? undefined : sound
      };

      if (existingIdx >= 0) {
        domainReactions[existingIdx] = newReaction;
      } else {
        domainReactions.push(newReaction);
      }

      saveSettings();
      renderDomainReactions();

      inputReactionDomain.value = '';
      inputReactionDialogue.value = '';
      selectReactionEmotion.value = 'happy';
      selectReactionSound.value = 'none';
    }
  } catch (err) {
    alert("Invalid domain name formatting.");
  }
}

function removeDomainReaction(index: number) {
  domainReactions.splice(index, 1);
  saveSettings();
  renderDomainReactions();
}

// Backups
function exportProfile() {
  extensionApi.storage.local.get<Record<string, any>>([STORAGE_KEYS.STATS, STORAGE_KEYS.SETTINGS]).then((data) => {
    const exportData = {
      version: 'v1.2.0',
      stats: data[STORAGE_KEYS.STATS] || {},
      settings: data[STORAGE_KEYS.SETTINGS] || {}
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const petName = exportData.settings.name || 'clawd';
    a.download = `${petName.toLowerCase()}-profile.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }).catch((err) => {
    console.warn('[Clawd Options] Failed to export profile:', err);
    alert('Could not export profile.');
  });
}

function importProfile(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target?.result as string);
      if (imported.stats && imported.settings) {
        const confirmed = confirm("Are you sure you want to import this profile? This will overwrite your current settings, levels, and statistics.");
        if (!confirmed) return;

        await extensionApi.storage.local.set({
          [STORAGE_KEYS.STATS]: imported.stats,
          [STORAGE_KEYS.SETTINGS]: imported.settings
        });

        alert("Profile imported successfully! Reloading...");
        window.location.reload();
      } else {
        alert("Invalid profile file format. The file must contain stats and settings.");
      }
    } catch (err) {
      alert("Failed to parse JSON file.");
    }
  };
  reader.readAsText(file);
}

const COSTUMES_METADATA = [
  { id: 'none', name: 'Default', desc: 'Original Clawd', unlockLevel: 0, seasonal: false, image: 'happy' },
  { id: 'detective', name: 'Detective Blue', desc: 'Blue Detective Aura', unlockLevel: 5, seasonal: false, image: 'detective' },
  { id: 'wizard', name: 'Wizard Purple', desc: 'Magic Purple Aura', unlockLevel: 10, seasonal: false, image: 'magic' },
  { id: 'party', name: 'Rainbow Party', desc: 'Color Shift Aura', unlockLevel: 15, seasonal: false, image: 'rainbow' },
  { id: 'christmas', name: 'Santa Hat', desc: 'Holiday festive hat', unlockLevel: 0, seasonal: true, image: 'christmas' },
  { id: 'halloween', name: 'Spooky Pumpkin', desc: 'Halloween pumpkin mask', unlockLevel: 0, seasonal: true, image: 'halloween' },
  { id: 'summer', name: 'Summer Shades', desc: 'Cool sunglasses outfit', unlockLevel: 0, seasonal: true, image: 'summer' }
];

function renderWardrobe(stats: PetStats | undefined, activeCostumeId: string, seasonalEnabled: boolean = true) {
  const wardrobeGrid = document.getElementById('wardrobe-grid') as HTMLElement;
  if (!wardrobeGrid) return;
  wardrobeGrid.innerHTML = '';

  const level = stats?.level || 1;
  const hasPrestige = stats?.prestige && stats.prestige > 0;

  COSTUMES_METADATA.forEach(item => {
    const isUnlocked = level >= item.unlockLevel || !!hasPrestige;
    const isWearing = activeCostumeId === item.id;
    const isSeasonalDisabled = item.seasonal && !seasonalEnabled;

    const card = document.createElement('div');
    card.className = `wardrobe-card ${isWearing ? 'wearing' : ''} ${!isUnlocked ? 'locked' : ''} ${isSeasonalDisabled ? 'seasonal-disabled' : ''}`;

    let badgeHtml = '';
    if (!isUnlocked) {
      badgeHtml = `<span class="badge locked">LVL ${item.unlockLevel}</span>`;
    } else if (item.seasonal) {
      badgeHtml = `<span class="badge seasonal">${seasonalEnabled ? 'Seasonal' : 'Seasonal (Disabled)'}</span>`;
    } else if (isWearing) {
      badgeHtml = `<span class="badge wearing-badge">Active</span>`;
    }

    const btnText = isWearing ? 'Wearing' : (isSeasonalDisabled ? 'Disabled' : (isUnlocked ? 'Wear' : 'Locked'));
    const btnDisabled = !isUnlocked || isSeasonalDisabled;

    card.innerHTML = `
      <div class="wardrobe-thumbnail-container">
        <img class="wardrobe-thumbnail ${item.id !== 'none' && ['detective', 'wizard', 'party'].includes(item.id) ? 'costume-' + item.id : ''}" src="../assets/pets/clawd-${item.image}.svg" alt="${item.name}">
        ${badgeHtml}
      </div>
      <div class="wardrobe-info">
        <h3>${item.name}</h3>
        <p>${item.desc}</p>
      </div>
      <button class="wardrobe-wear-btn" ${btnDisabled ? 'disabled' : ''} data-costume="${item.id}">
        ${btnText}
      </button>
    `;

    wardrobeGrid.appendChild(card);
  });

  // Attach wear button listeners
  const wearBtns = wardrobeGrid.querySelectorAll('.wardrobe-wear-btn') as NodeListOf<HTMLButtonElement>;
  wearBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const costumeId = btn.getAttribute('data-costume');
      if (costumeId) {
        activeCostume = costumeId;
        saveSettings();

        // Update styling of preview image in real time
        if (petImg) {
          petImg.classList.remove('costume-detective', 'costume-wizard', 'costume-party');
          if (costumeId !== 'none' && ['detective', 'wizard', 'party'].includes(costumeId)) {
            petImg.classList.add(`costume-${costumeId}`);
          }
        }

        // Update preview image src based on active costume
        const currentMoodBadge = document.getElementById('pet-mood') as HTMLElement;
        const currentMood = currentMoodBadge?.textContent?.split(' ').slice(1).join(' ').toLowerCase() || 'happy';
        updateUIMood(currentMood);

        renderWardrobe(stats, costumeId, seasonalEnabled);
      }
    });
  });
}

function populateHourSelects() {
  const selects = [
    'sleep-start-select', 'sleep-end-select',
    'work-start-select', 'work-end-select',
    'focus-start-select', 'focus-end-select'
  ];

  selects.forEach(id => {
    const select = document.getElementById(id) as HTMLSelectElement;
    if (!select) return;

    select.innerHTML = '';

    // Add "Disabled" option for focus start/end scheduler
    if (id.startsWith('focus-')) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Disabled';
      select.appendChild(opt);
    }

    for (let h = 0; h < 24; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const opt = document.createElement('option');
      opt.value = String(h);
      opt.textContent = `${displayHour} ${ampm}`;
      select.appendChild(opt);
    }
  });
}

function renderAnalyticsCharts(stats: PetStats) {
  // 1. Render Interests History Bar Chart (Last 7 Days)
  const historyChartContainer = document.getElementById('interests-history-chart');
  if (historyChartContainer) {
    historyChartContainer.innerHTML = '';
    const history = stats.siteCategoryHistory || {};
    // Sum up categories over the last 7 days
    const categoryTotals: Record<string, number> = {};
    for (const date in history) {
      for (const cat in history[date]) {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + history[date][cat];
      }
    }

    const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const maxVal = entries.length ? entries[0][1] : 0;

    if (entries.length === 0) {
      historyChartContainer.innerHTML = '<div class="empty-msg" style="color: var(--text-muted); padding: 12px 0;">No history data found for the last 7 days.</div>';
    } else {
      entries.forEach(([category, count]) => {
        const pct = Math.round((count / maxVal) * 100);
        const tag = document.createElement('div');
        tag.className = 'fancy-tag';
        tag.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          cursor: default;
        `;

        tag.innerHTML = `
          <div style="position: absolute; left: 0; bottom: 0; height: 3px; background: var(--accent); width: ${pct}%; opacity: 0.8;"></div>
          <span style="font-weight: 500; font-size: 13px; color: var(--text-color); z-index: 1;">${category}</span>
          <span style="font-size: 11px; background: var(--bg-body); padding: 2px 6px; border-radius: 4px; color: var(--text-muted); z-index: 1;">${count}</span>
        `;

        tag.addEventListener('mouseenter', () => {
          tag.style.borderColor = 'var(--accent)';
          tag.style.transform = 'translateY(-2px)';
          tag.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
        tag.addEventListener('mouseleave', () => {
          tag.style.borderColor = 'var(--border-color)';
          tag.style.transform = 'translateY(0)';
          tag.style.boxShadow = 'none';
        });

        historyChartContainer.appendChild(tag);
      });
    }
  }

  // 2. Render Mood Over Time SVG Line Chart
  const moodChartContainer = document.getElementById('mood-history-chart');
  if (moodChartContainer) {
    const dailyMoods = stats.dailyMoodHistory || [];
    if (dailyMoods.length < 2) {
      moodChartContainer.innerHTML = '<div class="empty-msg" style="align-self: center; color: var(--text-muted);">Not enough daily data to chart. Check back tomorrow!</div>';
      return;
    }

    // Sort by date ascending
    const sortedMoods = [...dailyMoods].sort((a, b) => a.date.localeCompare(b.date));

    const width = 500;
    const height = 200;
    const padding = 25; // increased padding to fit labels
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // X axis steps
    const stepX = chartWidth / (Math.max(1, sortedMoods.length - 1));

    let happinessPoints = '';
    let energyPoints = '';
    let curiosityPoints = '';
    let focusPoints = '';
    let leisurePoints = '';

    sortedMoods.forEach((record: DailyMoodRecord, index: number) => {
      const x = padding + index * stepX;
      // y is inverted (100 is at top)
      const yHappiness = padding + chartHeight - (record.happiness / 100) * chartHeight;
      const yEnergy = padding + chartHeight - (record.energy / 100) * chartHeight;
      const yCuriosity = padding + chartHeight - ((record.curiosity || 50) / 100) * chartHeight;
      const yFocus = padding + chartHeight - ((record.focus || 50) / 100) * chartHeight;
      const yLeisure = padding + chartHeight - ((record.leisure || 50) / 100) * chartHeight;

      happinessPoints += `${x},${yHappiness} `;
      energyPoints += `${x},${yEnergy} `;
      curiosityPoints += `${x},${yCuriosity} `;
      focusPoints += `${x},${yFocus} `;
      leisurePoints += `${x},${yLeisure} `;
    });

    moodChartContainer.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="max-width: 100%;">
        <!-- Grid lines -->
        <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="4" />
        <line x1="${padding}" y1="${padding + chartHeight / 2}" x2="${width - padding}" y2="${padding + chartHeight / 2}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="4" />
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="4" />
        
        <!-- Y Axis Labels -->
        <text x="${padding - 5}" y="${padding + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">100</text>
        <text x="${padding - 5}" y="${padding + chartHeight / 2 + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">50</text>
        <text x="${padding - 5}" y="${height - padding + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">0</text>
        
        <!-- Lines -->
        <polyline points="${happinessPoints}" fill="none" stroke="var(--pink)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <polyline points="${energyPoints}" fill="none" stroke="var(--yellow)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <polyline points="${curiosityPoints}" fill="none" stroke="var(--blue)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <polyline points="${focusPoints}" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <polyline points="${leisurePoints}" fill="none" stroke="var(--indigo)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        
        <!-- Legend -->
        <rect x="${width - padding - 85}" y="5" width="80" height="85" rx="4" fill="var(--bg-card)" opacity="0.8" />
        <circle cx="${width - padding - 75}" cy="15" r="4" fill="var(--pink)" />
        <text x="${width - padding - 65}" y="19" fill="var(--text-color)" font-size="10">Happiness</text>
        <circle cx="${width - padding - 75}" cy="31" r="4" fill="var(--yellow)" />
        <text x="${width - padding - 65}" y="35" fill="var(--text-color)" font-size="10">Energy</text>
        <circle cx="${width - padding - 75}" cy="47" r="4" fill="var(--blue)" />
        <text x="${width - padding - 65}" y="51" fill="var(--text-color)" font-size="10">Curiosity</text>
        <circle cx="${width - padding - 75}" cy="63" r="4" fill="var(--green)" />
        <text x="${width - padding - 65}" y="67" fill="var(--text-color)" font-size="10">Focus</text>
        <circle cx="${width - padding - 75}" cy="79" r="4" fill="var(--indigo)" />
        <text x="${width - padding - 65}" y="83" fill="var(--text-color)" font-size="10">Leisure</text>
      </svg>
    `;
  }
}

function populateVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return;
  
  const currentValue = chatVoiceSelect.value;
  chatVoiceSelect.innerHTML = '<option value="">Default (Browser Choice)</option>';
  
  voices.forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    chatVoiceSelect.appendChild(option);
  });
  
  if (currentValue) {
    chatVoiceSelect.value = currentValue;
  }
}

if ('speechSynthesis' in window) {
  populateVoices();
  window.speechSynthesis.onvoiceschanged = populateVoices;
}

document.addEventListener('DOMContentLoaded', init);
