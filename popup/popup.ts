import { PetStats, PetSettings } from '../src/types';

const EMOTIONS_METADATA: Record<string, { name: string; emoji: string }> = {
  'happy': { name: 'Happy', emoji: '😊' },
  'sad': { name: 'Sad', emoji: '😢' },
  'angry': { name: 'Angry', emoji: '😠' },
  'crying': { name: 'Crying', emoji: '😭' },
  'waving': { name: 'Waving', emoji: '👋' },
  'sleeping': { name: 'Sleeping', emoji: '💤' },
  'working-thinking': { name: 'Thinking', emoji: '🤔' },
  'shrug': { name: 'Shrug', emoji: '🤷' },
  'reading': { name: 'Reading', emoji: '📖' },
  'yoga': { name: 'Yoga', emoji: '🧘' },
  'eating': { name: 'Eating', emoji: '🍕' },
  'coding': { name: 'Coding', emoji: '💻' },
  'working-typing': { name: 'Typing', emoji: '⌨️' },
  'dancing': { name: 'Dancing', emoji: '💃' },
  'cool': { name: 'Cool', emoji: '😎' },
  'love': { name: 'Love', emoji: '❤️' },
  'celebrating': { name: 'Celebrating', emoji: '🎉' },
  'mindblown': { name: 'Mindblown', emoji: '🤯' },
  'ninja': { name: 'Ninja', emoji: '🥷' },
  'working-wizard': { name: 'Wizard', emoji: '🧙' },
  'astronaut': { name: 'Astronaut', emoji: '🧑‍🚀' },
  'working-debugger': { name: 'Debugger', emoji: '🔍' },
  'working-building': { name: 'Building', emoji: '🧱' },
  'rocket': { name: 'Rocket', emoji: '🚀' },
  'pirate': { name: 'Pirate', emoji: '🏴‍☠️' },
  'working-juggling': { name: 'Juggling', emoji: '🤹' },
  'gaming': { name: 'Gaming', emoji: '🎮' },
  'battery-low': { name: 'Low Battery', emoji: '🪫' },
  'christmas': { name: 'Christmas', emoji: '🎄' },
  'winter': { name: 'Winter', emoji: '❄️' },
  'halloween': { name: 'Halloween', emoji: '🎃' },
  'summer': { name: 'Summer', emoji: '☀️' },
  'ice-cream': { name: 'Ice Cream', emoji: '🍦' },
  'surfing': { name: 'Surfing', emoji: '🏄' },
  'skateboard': { name: 'Skateboard', emoji: '🛹' },
  'telescope': { name: 'Telescope', emoji: '🔭' },
  'meditating': { name: 'Meditating', emoji: '🧘' },
  'working-rubber-duck': { name: 'Rubber Duck', emoji: '🦆' },
  'coffee': { name: 'Coffee', emoji: '☕' },
  'mail': { name: 'Mail', emoji: '✉️' },
  'notification': { name: 'Notification', emoji: '🔔' },
  'flexing': { name: 'Flexing', emoji: '💪' },
  'lifting': { name: 'Lifting', emoji: '🏋️' },
  'singing': { name: 'Singing', emoji: '🎤' },
  'music': { name: 'Music', emoji: '🎵' },
  'dj': { name: 'DJ', emoji: '🎧' },
  'money': { name: 'Money', emoji: '💰' }
};

function getAvailableEmotions(level: number, prestige = 0): string[] {
  if (prestige > 0) {
    return Object.keys(EMOTIONS_METADATA);
  }
  const freePass = [
    'happy', 'sad', 'waving', 'sleeping', 'eating',
    'battery-low', 'christmas', 'winter', 'halloween', 'summer', 'ice-cream', 'surfing', 'skateboard',
    'telescope', 'meditating', 'working-rubber-duck', 'coffee', 'mail', 'notification', 'flexing',
    'lifting', 'singing', 'music', 'dj', 'money'
  ];

  const level1 = ['happy', 'sad', 'angry', 'crying', 'waving', 'sleeping', 'working-thinking', 'shrug', 'reading', 'yoga', 'eating'];
  const level3 = [...level1, 'coding', 'working-typing', 'dancing', 'cool', 'love', 'celebrating', 'mindblown'];
  const level5 = [...level3, 'ninja', 'working-wizard', 'astronaut', 'working-debugger', 'working-building'];
  const level8 = [...level5, 'rocket', 'pirate', 'working-juggling', 'gaming'];

  const allEmotions = new Set<string>();
  freePass.forEach(e => allEmotions.add(e));

  const levelSet = level >= 10 ? null : (level >= 8 ? level8 : (level >= 5 ? level5 : (level >= 3 ? level3 : level1)));
  if (levelSet) {
    levelSet.forEach(e => allEmotions.add(e));
  } else {
    level8.forEach(e => allEmotions.add(e));
  }

  return Array.from(allEmotions);
}

async function init(): Promise<void> {
  let blockedDomains: string[] = [];
  let disabledEmotions: string[] = [];
  let lastRenderedLevel = -1;
  let lastRenderedPrestige = -1;

  async function updateLocalAiStatus(): Promise<void> {
    const statusBadge = document.getElementById('ai-status-badge') as HTMLElement;
    const statusText = document.getElementById('ai-status-text') as HTMLElement;
    const statusSubtitle = document.getElementById('ai-status-subtitle') as HTMLElement;

    if (!statusBadge || !statusText) return;

    statusBadge.className = 'ai-status-badge status-checking';
    statusText.textContent = 'Checking...';
    if (statusSubtitle) {
      statusSubtitle.textContent = 'Querying local model status...';
    }

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      statusBadge.className = 'ai-status-badge status-unsupported';
      statusText.textContent = 'Unsupported';
      if (statusSubtitle) {
        statusSubtitle.textContent = 'Chrome extension context unavailable';
      }
      return;
    }

    chrome.runtime.sendMessage({ type: 'check-local-ai-status' }, (response: any) => {
      statusBadge.className = 'ai-status-badge';

      if (chrome.runtime.lastError || !response || !response.success) {
        console.warn('Local AI status query failed:', chrome.runtime.lastError?.message);
        statusBadge.classList.add('status-unsupported');
        statusText.textContent = 'Offline';
        if (statusSubtitle) {
          statusSubtitle.textContent = 'Failed to connect to background AI layer';
        }
        return;
      }

      const { state, progress } = response;
      if (state === 'ready') {
        statusBadge.classList.add('status-ready');
        statusText.textContent = 'Ready';
        if (statusSubtitle) {
          statusSubtitle.textContent = 'Local DistilBERT model active and running';
        }
      } else if (state === 'loading') {
        statusBadge.classList.add('status-downloading');
        statusText.textContent = `Downloading (${progress}%)`;
        if (statusSubtitle) {
          statusSubtitle.textContent = 'Downloading model weights (~67MB) to IndexedDB';
        }
      } else if (state === 'error') {
        statusBadge.classList.add('status-unsupported');
        statusText.textContent = 'Error';
        if (statusSubtitle) {
          statusSubtitle.textContent = 'Failed to load model. Check background console.';
        }
      } else {
        statusBadge.classList.add('status-checking');
        statusText.textContent = 'Inactive';
        if (statusSubtitle) {
          statusSubtitle.textContent = 'Turn on Local AI Mode to initialize the model';
        }
      }
    });
  }

  const statsEl = {
    level: document.getElementById('pet-level') as HTMLElement,
    xpText: document.getElementById('xp-text') as HTMLElement,
    xpBar: document.getElementById('bar-xp') as HTMLElement,
    happinessText: document.getElementById('txt-happiness') as HTMLElement,
    happinessBar: document.getElementById('bar-happiness') as HTMLElement,
    energyText: document.getElementById('txt-energy') as HTMLElement,
    energyBar: document.getElementById('bar-energy') as HTMLElement,
    curiosityText: document.getElementById('txt-curiosity') as HTMLElement,
    curiosityBar: document.getElementById('bar-curiosity') as HTMLElement,
    focusText: document.getElementById('txt-focus') as HTMLElement,
    focusBar: document.getElementById('bar-focus') as HTMLElement,
    leisureText: document.getElementById('txt-leisure') as HTMLElement,
    leisureBar: document.getElementById('bar-leisure') as HTMLElement,
    preview: document.getElementById('pet-preview') as HTMLImageElement,
    valTotalPets: document.getElementById('val-total-pets') as HTMLElement,
    valTotalFeeds: document.getElementById('val-total-feeds') as HTMLElement,
    categoriesList: document.getElementById('categories-list') as HTMLElement,
    timelineList: document.getElementById('timeline-list') as HTMLElement
  };

  const settingsEl = {
    sizeSlider: document.getElementById('size-slider') as HTMLInputElement,
    sizeVal: document.getElementById('size-val') as HTMLElement,
    speedSlider: document.getElementById('speed-slider') as HTMLInputElement,
    speedVal: document.getElementById('speed-val') as HTMLElement,
    soundToggle: document.getElementById('sound-toggle') as HTMLInputElement,
    scheduleToggle: document.getElementById('schedule-toggle') as HTMLInputElement,
    seasonalToggle: document.getElementById('seasonal-toggle') as HTMLInputElement,
    volumeContainer: document.getElementById('volume-container') as HTMLElement,
    volumeSlider: document.getElementById('volume-slider') as HTMLInputElement,
    volumeVal: document.getElementById('volume-val') as HTMLElement,
    aiToggle: document.getElementById('ai-toggle') as HTMLInputElement,
    aiStatusContainer: document.getElementById('ai-status-container') as HTMLElement,
    nameInput: document.getElementById('pet-name-input') as HTMLInputElement,
    costumeSelect: document.getElementById('costume-select') as HTMLSelectElement,
    optDetective: document.getElementById('opt-detective') as HTMLOptionElement,
    optWizard: document.getElementById('opt-wizard') as HTMLOptionElement,
    optParty: document.getElementById('opt-party') as HTMLOptionElement,
    apiPersonaContainer: document.getElementById('api-persona-container') as HTMLElement,
    personaSelect: document.getElementById('persona-select') as HTMLSelectElement
  };

  const setupToyDrags = () => {
    ['ball', 'fish', 'laser', 'yarn', 'duck', 'box'].forEach((toy) => {
      const el = document.getElementById(`toy-${toy}`);
      if (el) {
        el.addEventListener('dragstart', (e) => {
          if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', `toy-${toy}`);
            e.dataTransfer.effectAllowed = 'copy';
          }
        });
      }
    });
  };
  setupToyDrags();

  const setupTabSwitching = () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (!targetTab) return;

        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        tabPanes.forEach((pane) => {
          if (pane.id === `tab-${targetTab}`) {
            pane.classList.remove('hidden');
            pane.classList.add('active');
          } else {
            pane.classList.add('hidden');
            pane.classList.remove('active');
          }
        });
      });
    });
  };
  setupTabSwitching();

  const setupDashboardLink = () => {
    const btnOpen = document.getElementById('btn-open-dashboard');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }
  };
  setupDashboardLink();

  const setupSoundPreview = () => {
    const previewButtons = document.querySelectorAll('.sound-preview-btn');
    previewButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const soundType = btn.getAttribute('data-sound');
        if (soundType) {
          const volume = Number(settingsEl.volumeSlider.value) / 100;
          playPreviewSound(soundType, volume);
        }
      });
    });
  };

  async function playPreviewSound(type: string, volume: number): Promise<void> {
    const sounds: Record<string, string> = {
      greeting: 'greeting.mp3',
      levelUp: 'level-up.mp3',
      petting: 'petting-love.mp3',
      sad: 'sad-crying.mp3',
      shoo: 'shoo-run.mp3',
      sleeping: 'sleeping.mp3',
      thinking: 'thinking-coding-work.mp3',
      feeding: 'feeding-celebrating.mp3'
    };

    const filename = sounds[type];
    if (!filename) return;

    try {
      const soundUrl = chrome.runtime.getURL(`assets/${filename}`);
      const audio = new Audio(soundUrl);
      audio.volume = volume;
      await audio.play();
    } catch (e) {
      console.warn("Failed to play sound preview:", e);
    }
  }

  setupSoundPreview();

  const data = await chrome.storage.local.get(['pet-stats', 'pet-settings', 'pet-mood']);
  
  applySettings(data['pet-settings']);
  updateUIStats(data['pet-stats']);
  updateUIMood(data['pet-mood'] || 'happy');

  const btnPrestige = document.getElementById('btn-prestige');
  if (btnPrestige) {
    btnPrestige.addEventListener('click', async () => {
      const confirmed = confirm("Are you sure you want to rebirth Clawd? This resets his level to 1, but increases his prestige rank. You'll unlock permanent rewards!");
      if (!confirmed) return;
      
      const savedStats = await chrome.storage.local.get('pet-stats');
      const stats = savedStats['pet-stats'] || {};
      if (stats.level >= 50) {
        stats.prestige = (stats.prestige || 0) + 1;
        stats.level = 1;
        stats.xp = 0;
        
        await chrome.storage.local.set({ 'pet-stats': stats });
        alert(`Clawd has reborn! He is now Prestige ${stats.prestige}! 🎉`);
      }
    });
  }

  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      const data = await chrome.storage.local.get(['pet-stats', 'pet-settings']);
      const exportData = {
        version: 'v1.1.0',
        stats: data['pet-stats'] || {},
        settings: data['pet-settings'] || {}
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
    });
  }

  const btnImport = document.getElementById('btn-import');
  const fileImport = document.getElementById('file-import') as HTMLInputElement;
  if (btnImport && fileImport) {
    btnImport.addEventListener('click', () => {
      fileImport.click();
    });

    fileImport.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported.stats && imported.settings) {
            const confirmed = confirm("Are you sure you want to import this profile? This will overwrite your current settings, levels, and stats.");
            if (!confirmed) return;

            await chrome.storage.local.set({
              'pet-stats': imported.stats,
              'pet-settings': imported.settings
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
    });
  }

  const tabHideToggle = document.getElementById('tab-hide-toggle') as HTMLInputElement;
  const siteHideToggle = document.getElementById('site-hide-toggle') as HTMLInputElement;
  const siteSubtitle = document.getElementById('site-visibility-subtitle') as HTMLElement;
  
  let currentTabId: number | undefined = undefined;
  let currentHostname = '';

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab && tab.id) {
      currentTabId = tab.id;
      
      if (tab.url) {
        try {
          const url = new URL(tab.url);
          currentHostname = url.hostname;
          if (currentHostname) {
            siteSubtitle.textContent = `Disable Clawd on ${currentHostname}`;
            siteHideToggle.checked = blockedDomains.includes(currentHostname);
            siteHideToggle.disabled = false;
          } else {
            siteHideToggle.disabled = true;
          }
        } catch (e) {
          siteHideToggle.disabled = true;
        }
      } else {
        siteHideToggle.disabled = true;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'get-tab-visibility' }, (response) => {
        if (chrome.runtime.lastError) {
          
          tabHideToggle.disabled = true;
          siteHideToggle.disabled = true;
          return;
        }
        if (response && typeof response.isHidden === 'boolean') {
          tabHideToggle.checked = response.isHidden;
          tabHideToggle.disabled = false;
        }
      });
    } else {
      tabHideToggle.disabled = true;
      siteHideToggle.disabled = true;
    }
  });

  tabHideToggle.addEventListener('change', () => {
    if (currentTabId !== undefined) {
      chrome.tabs.sendMessage(currentTabId, {
        type: 'toggle-tab-visibility',
        hide: tabHideToggle.checked
      }).catch(() => {});
    }
  });

  siteHideToggle.addEventListener('change', () => {
    if (currentHostname) {
      if (siteHideToggle.checked) {
        if (!blockedDomains.includes(currentHostname)) {
          blockedDomains.push(currentHostname);
        }
      } else {
        blockedDomains = blockedDomains.filter(d => d !== currentHostname);
      }
      saveSettings();
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes['pet-stats']) {
      updateUIStats(changes['pet-stats'].newValue);
    }
    if (changes['pet-mood']) {
      updateUIMood(changes['pet-mood'].newValue);
    }
    if (changes['modelLoadingState'] || changes['modelDownloadProgress'] || changes['pet-settings']) {
      updateLocalAiStatus().catch(() => {});
    }
  });

  const sendToActiveTab = (type: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type }).catch(() => {
          
        });
      }
    });
  };

  const handleActionClick = (btn: HTMLElement, type: string) => {
    if (btn.hasAttribute('disabled')) return;
    
    sendToActiveTab(type);

    btn.setAttribute('disabled', 'true');
    const originalText = btn.textContent;
    btn.textContent = 'Wait...';
    
    setTimeout(() => {
      btn.removeAttribute('disabled');
      btn.textContent = originalText;
    }, 3000);
  };

  const btnPet = document.getElementById('btn-pet') as HTMLElement;
  const btnFeed = document.getElementById('btn-feed') as HTMLElement;
  const btnShoo = document.getElementById('btn-shoo') as HTMLElement;

  btnPet.addEventListener('click', () => handleActionClick(btnPet, 'pet'));
  btnFeed.addEventListener('click', () => handleActionClick(btnFeed, 'feed'));
  btnShoo.addEventListener('click', () => handleActionClick(btnShoo, 'shoo'));

  settingsEl.sizeSlider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const val = target.value;
    settingsEl.sizeVal.textContent = `${val}px`;
    saveSettings();
  });

  settingsEl.speedSlider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const val = (Number(target.value) / 10).toFixed(1);
    settingsEl.speedVal.textContent = `${val}x`;
    saveSettings();
  });

  settingsEl.scheduleToggle.addEventListener('change', () => {
    saveSettings();
  });

  settingsEl.seasonalToggle.addEventListener('change', () => {
    saveSettings();
  });

  settingsEl.soundToggle.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    const enabled = target.checked;
    if (enabled) {
      settingsEl.volumeContainer.classList.remove('hidden');
    } else {
      settingsEl.volumeContainer.classList.add('hidden');
    }
    saveSettings();
  });

  settingsEl.volumeSlider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const val = target.value;
    settingsEl.volumeVal.textContent = `${val}%`;
    saveSettings();
  });

  settingsEl.aiToggle.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    const enabled = target.checked;
    if (enabled) {
      settingsEl.aiStatusContainer.classList.remove('hidden');
      settingsEl.apiPersonaContainer.classList.remove('hidden');
      updateLocalAiStatus();
    } else {
      settingsEl.aiStatusContainer.classList.add('hidden');
      settingsEl.apiPersonaContainer.classList.add('hidden');
    }
    saveSettings();
  });

  settingsEl.nameInput.addEventListener('input', () => {
    const name = settingsEl.nameInput.value.trim() || 'Clawd';
    (document.getElementById('pet-name') as HTMLElement).textContent = name;
    saveSettings();
  });

  settingsEl.costumeSelect.addEventListener('change', () => {
    saveSettings();
  });

  settingsEl.personaSelect.addEventListener('change', () => {
    saveSettings();
  });

  function saveSettings(): void {
    chrome.storage.local.set({
      'pet-settings': {
        size: Number(settingsEl.sizeSlider.value),
        speed: Number(settingsEl.speedSlider.value) / 10,
        soundEnabled: settingsEl.soundToggle.checked,
        soundVolume: Number(settingsEl.volumeSlider.value) / 100,
        aiMode: settingsEl.aiToggle.checked,
        apiKey: '',
        name: settingsEl.nameInput.value.trim() || 'Clawd',
        costume: settingsEl.costumeSelect.value,
        persona: settingsEl.personaSelect.value,
        blockedDomains: blockedDomains,
        disabledEmotions: disabledEmotions,
        scheduleEnabled: settingsEl.scheduleToggle.checked,
        seasonalEnabled: settingsEl.seasonalToggle.checked
      }
    });
  }

  function renderEmotionsGrid(level: number, prestige: number): void {
    const gridEl = document.getElementById('emotions-grid');
    if (!gridEl) return;

    gridEl.innerHTML = '';

    const availableEmotions = getAvailableEmotions(level, prestige);

    availableEmotions.forEach((emotion) => {
      const meta = EMOTIONS_METADATA[emotion] || { name: emotion, emoji: '🐾' };
      const isDisabled = disabledEmotions.includes(emotion);

      const card = document.createElement('label');
      card.className = `emotion-checkbox-card${!isDisabled ? ' checked' : ''}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !isDisabled;
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          card.classList.add('checked');
          disabledEmotions = disabledEmotions.filter(e => e !== emotion);
        } else {
          card.classList.remove('checked');
          if (!disabledEmotions.includes(emotion)) {
            disabledEmotions.push(emotion);
          }
        }
        saveSettings();
      });

      const labelSpan = document.createElement('span');
      labelSpan.className = 'emotion-checkbox-label';
      labelSpan.textContent = meta.name;

      card.appendChild(checkbox);
      card.appendChild(labelSpan);
      gridEl.appendChild(card);
    });
  }

function getDominantTrait(stats: PetStats | undefined): 'developer' | 'gamer' | 'scholar' | 'socialite' | 'normal' {
  if (!stats) return 'normal';
  const counts = stats.siteCategoryCounts || {};
  
  const developerScore = (counts['code'] || 0) + (counts['docs'] || 0);
  const gamerScore = (counts['gaming'] || 0) + (counts['streaming'] || 0);
  const scholarScore = counts['news'] || 0;
  const socialiteScore = (counts['social'] || 0) + (counts['mail'] || 0);
  
  const scores = {
    developer: developerScore,
    gamer: gamerScore,
    scholar: scholarScore,
    socialite: socialiteScore
  };
  
  let maxTrait: 'developer' | 'gamer' | 'scholar' | 'socialite' | 'normal' = 'normal';
  let maxScore = 3;
  
  for (const [trait, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxTrait = trait as any;
    }
  }
  
  return maxTrait;
}

  function updateUIStats(stats: PetStats | undefined): void {
    if (!stats) return;

    const trait = getDominantTrait(stats);
    const traitBadge = document.getElementById('pet-trait') as HTMLElement;
    const traitText = document.getElementById('trait-text') as HTMLElement;
    if (traitBadge && traitText) {
      traitText.textContent = trait;
      traitBadge.className = `trait-badge trait-${trait}`;
    }

    const hasPrestige = stats.prestige && stats.prestige > 0;
    const prestigeBadge = document.getElementById('prestige-badge');
    const prestigeLevelEl = document.getElementById('prestige-level');
    if (prestigeBadge && prestigeLevelEl) {
      if (hasPrestige) {
        prestigeLevelEl.textContent = String(stats.prestige);
        prestigeBadge.classList.remove('hidden');
      } else {
        prestigeBadge.classList.add('hidden');
      }
    }

    const prestigeCard = document.getElementById('prestige-card');
    if (prestigeCard) {
      if (stats.level >= 50) {
        prestigeCard.classList.remove('hidden');
      } else {
        prestigeCard.classList.add('hidden');
      }
    }

    const lblHabitTrait = document.getElementById('lbl-habit-trait') as HTMLElement;
    const lblHabitSpeed = document.getElementById('lbl-habit-speed') as HTMLElement;
    const lblHabitBehavior = document.getElementById('lbl-habit-behavior') as HTMLElement;
    
    if (lblHabitTrait && lblHabitSpeed && lblHabitBehavior) {
      lblHabitTrait.textContent = trait;
      
      const baseSpeed = 1.0;
      const energyFactor = Math.max(0.4, Math.min(1.2, stats.energy / 100));
      const prestige = stats.prestige || 0;
      let traitFactor = 1.0;
      if (trait === 'gamer') {
        traitFactor = 1.35 + (prestige * 0.15);
      } else if (trait === 'developer') {
        traitFactor = 0.85 / (1 + prestige * 0.1);
      }
      const speedMod = baseSpeed * energyFactor * traitFactor;
      
      let speedDesc = 'Normal';
      if (speedMod > 1.2) speedDesc = 'Hyper';
      else if (speedMod > 1.05) speedDesc = 'Fast';
      else if (speedMod < 0.6) speedDesc = 'Exhausted';
      else if (speedMod < 0.9) speedDesc = 'Calm';
      
      lblHabitSpeed.textContent = `${speedMod.toFixed(2)}x (${speedDesc})`;
      
      let behaviorDesc = 'Standard';
      if (trait === 'developer') behaviorDesc = 'Analytical (Thinking)';
      else if (trait === 'gamer') behaviorDesc = 'Playful (Cool)';
      else if (trait === 'scholar') behaviorDesc = 'Focused (Reading)';
      else if (trait === 'socialite') behaviorDesc = 'Affectionate (Love)';
      
      lblHabitBehavior.textContent = behaviorDesc;
    }

    statsEl.level.textContent = String(stats.level);
    const xpNeeded = Math.floor(Math.pow(stats.level, 1.5) * 150);
    statsEl.xpText.textContent = `${stats.xp} / ${xpNeeded} XP`;
    statsEl.xpBar.style.width = `${Math.min(100, (stats.xp / xpNeeded) * 100)}%`;

    settingsEl.optDetective.disabled = stats.level < 5 && !hasPrestige;
    if (stats.level < 5 && !hasPrestige) {
      settingsEl.optDetective.textContent = 'Blue Detective Aura (Locked - LVL 5)';
    } else {
      settingsEl.optDetective.textContent = 'Blue Detective Aura';
    }

    settingsEl.optWizard.disabled = stats.level < 10 && !hasPrestige;
    if (stats.level < 10 && !hasPrestige) {
      settingsEl.optWizard.textContent = 'Magic Purple Aura (Locked - LVL 10)';
    } else {
      settingsEl.optWizard.textContent = 'Magic Purple Aura';
    }

    settingsEl.optParty.disabled = stats.level < 15 && !hasPrestige;
    if (stats.level < 15 && !hasPrestige) {
      settingsEl.optParty.textContent = 'Neon Rainbow Shader (Locked - LVL 15)';
    } else {
      settingsEl.optParty.textContent = 'Neon Rainbow Shader';
    }

    statsEl.happinessText.textContent = `${stats.happiness}%`;
    statsEl.happinessBar.style.width = `${stats.happiness}%`;

    statsEl.energyText.textContent = `${stats.energy}%`;
    statsEl.energyBar.style.width = `${stats.energy}%`;

    statsEl.curiosityText.textContent = `${stats.curiosity}%`;
    statsEl.curiosityBar.style.width = `${stats.curiosity}%`;

    statsEl.focusText.textContent = `${stats.focus ?? 50}%`;
    statsEl.focusBar.style.width = `${stats.focus ?? 50}%`;

    statsEl.leisureText.textContent = `${stats.leisure ?? 50}%`;
    statsEl.leisureBar.style.width = `${stats.leisure ?? 50}%`;

    if (statsEl.valTotalPets) {
      statsEl.valTotalPets.textContent = String(stats.totalPets || 0);
    }
    if (statsEl.valTotalFeeds) {
      statsEl.valTotalFeeds.textContent = String(stats.totalFeeds || 0);
    }

    if (statsEl.categoriesList) {
      statsEl.categoriesList.innerHTML = '';
      const counts = stats.siteCategoryCounts || {};
      const totalVisits = Object.values(counts).reduce((a, b) => a + b, 0);

      const CATEGORY_METADATA: Record<string, { name: string; colorClass: string }> = {
        code: { name: 'Coding', colorClass: 'fill-blue' },
        social: { name: 'Social', colorClass: 'fill-pink' },
        gaming: { name: 'Gaming', colorClass: 'fill-yellow' },
        news: { name: 'News', colorClass: 'fill-green' },
        shopping: { name: 'Shopping', colorClass: 'fill-indigo' },
        docs: { name: 'Documentation', colorClass: 'fill-blue' },
        mail: { name: 'Email', colorClass: 'fill-green' },
        fitness: { name: 'Fitness', colorClass: 'fill-pink' }
      };

      if (totalVisits === 0) {
        const placeholder = document.createElement('p');
        placeholder.style.fontSize = '10px';
        placeholder.style.color = 'var(--text-secondary)';
        placeholder.style.fontStyle = 'italic';
        placeholder.textContent = 'No sites visited yet. Browse around!';
        statsEl.categoriesList.appendChild(placeholder);
      } else {
        Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .forEach(([cat, val]) => {
            const meta = CATEGORY_METADATA[cat] || { name: cat, colorClass: 'fill-blue' };
            const percentage = Math.round((val / totalVisits) * 100);

            const row = document.createElement('div');
            row.className = 'category-row';
            row.innerHTML = `
              <div class="category-meta">
                <span>${meta.name}</span>
                <span class="category-pct">${val} (${percentage}%)</span>
              </div>
              <div class="category-bar-wrapper">
                <div class="category-bar ${meta.colorClass}" style="width: ${percentage}%"></div>
              </div>
            `;
            statsEl.categoriesList.appendChild(row);
          });
      }
    }

    if (statsEl.timelineList) {
      statsEl.timelineList.innerHTML = '';
      const history = stats.moodHistory || [];

      const EVENT_FORMATTERS: Record<string, { label: string }> = {
        pet: { label: 'You petted Clawd' },
        feed: { label: 'You fed Clawd' },
        shoo: { label: 'Shooed Clawd away' },
        'visit-code': { label: 'Browsed Coding pages' },
        'visit-social': { label: 'Browsed Social media' },
        'visit-gaming': { label: 'Browsed Gaming sites' },
        'visit-news': { label: 'Browsed News pages' },
        'visit-shopping': { label: 'Browsed Shopping sites' },
        'visit-docs': { label: 'Browsed Documentation' },
        'visit-mail': { label: 'Checked Email' },
        'visit-fitness': { label: 'Browsed Fitness sites' }
      };

      if (history.length === 0) {
        const placeholder = document.createElement('p');
        placeholder.style.fontSize = '10px';
        placeholder.style.color = 'var(--text-secondary)';
        placeholder.style.fontStyle = 'italic';
        placeholder.textContent = 'No recent activity recorded.';
        statsEl.timelineList.appendChild(placeholder);
      } else {
        history.slice(0, 10).forEach((item) => {
          const fmt = EVENT_FORMATTERS[item.action] || { label: item.action };
          const timelineItem = document.createElement('div');
          timelineItem.className = 'timeline-item';
          timelineItem.innerHTML = `
            <span class="timeline-content">${fmt.label}</span>
            <span class="timeline-time">${item.time}</span>
          `;
          statsEl.timelineList.appendChild(timelineItem);
        });
      }
    }

    if (stats.level !== lastRenderedLevel || (stats.prestige || 0) !== lastRenderedPrestige) {
      renderEmotionsGrid(stats.level, stats.prestige || 0);
      lastRenderedLevel = stats.level;
      lastRenderedPrestige = stats.prestige || 0;
    }
  }

  function updateUIMood(mood: string): void {
    const moodEmojiEl = document.getElementById('mood-emoji');
    const moodTextEl = document.getElementById('mood-text');
    if (!moodEmojiEl || !moodTextEl) return;

    const meta = EMOTIONS_METADATA[mood] || { name: mood, emoji: '😊' };
    moodEmojiEl.textContent = meta.emoji;
    moodTextEl.textContent = meta.name;

    if (statsEl && statsEl.preview) {
      statsEl.preview.src = `../assets/pets/clawd-${mood}.svg`;
    }
  }

  function applySettings(settings: PetSettings | undefined): void {
    if (!settings) return;

    const size = settings.size ?? 64;
    settingsEl.sizeSlider.value = String(size);
    settingsEl.sizeVal.textContent = `${size}px`;

    const speed = settings.speed ?? 1.2;
    settingsEl.speedSlider.value = String(Math.round(speed * 10));
    settingsEl.speedVal.textContent = `${speed.toFixed(1)}x`;

    const scheduleEnabled = settings.scheduleEnabled ?? true;
    settingsEl.scheduleToggle.checked = scheduleEnabled;

    const seasonalEnabled = settings.seasonalEnabled ?? true;
    settingsEl.seasonalToggle.checked = seasonalEnabled;

    const soundEnabled = settings.soundEnabled ?? true;
    settingsEl.soundToggle.checked = soundEnabled;
    if (soundEnabled) {
      settingsEl.volumeContainer.classList.remove('hidden');
    } else {
      settingsEl.volumeContainer.classList.add('hidden');
    }

    const soundVolume = settings.soundVolume ?? 0.5;
    settingsEl.volumeSlider.value = String(Math.round(soundVolume * 100));
    settingsEl.volumeVal.textContent = `${Math.round(soundVolume * 100)}%`;

    const aiMode = settings.aiMode ?? false;
    settingsEl.aiToggle.checked = aiMode;
    if (aiMode) {
      settingsEl.aiStatusContainer.classList.remove('hidden');
      settingsEl.apiPersonaContainer.classList.remove('hidden');
      updateLocalAiStatus();
    } else {
      settingsEl.aiStatusContainer.classList.add('hidden');
      settingsEl.apiPersonaContainer.classList.add('hidden');
    }

    const name = settings.name ?? 'Clawd';
    settingsEl.nameInput.value = name;
    (document.getElementById('pet-name') as HTMLElement).textContent = name;

    settingsEl.costumeSelect.value = settings.costume ?? 'none';

    settingsEl.personaSelect.value = settings.persona ?? 'default';

    blockedDomains = settings.blockedDomains || [];

    disabledEmotions = settings.disabledEmotions || [];
  }
}

document.addEventListener('DOMContentLoaded', init);
