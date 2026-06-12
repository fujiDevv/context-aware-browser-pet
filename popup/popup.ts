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
  'dj': { name: 'DJ', emoji: '🎧' }
};

function getAvailableEmotions(level: number): string[] {
  const freePass = [
    'happy', 'sad', 'waving', 'sleeping', 'eating',
    'battery-low', 'christmas', 'winter', 'halloween', 'summer', 'ice-cream', 'surfing', 'skateboard',
    'telescope', 'meditating', 'working-rubber-duck', 'coffee', 'mail', 'notification', 'flexing',
    'lifting', 'singing', 'music', 'dj'
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
    volumeContainer: document.getElementById('volume-container') as HTMLElement,
    volumeSlider: document.getElementById('volume-slider') as HTMLInputElement,
    volumeVal: document.getElementById('volume-val') as HTMLElement,
    aiToggle: document.getElementById('ai-toggle') as HTMLInputElement,
    apiKeyContainer: document.getElementById('api-key-container') as HTMLElement,
    apiKeyInput: document.getElementById('api-key-input') as HTMLInputElement,
    btnToggleKey: document.getElementById('btn-toggle-key') as HTMLElement,
    nameInput: document.getElementById('pet-name-input') as HTMLInputElement,
    costumeSelect: document.getElementById('costume-select') as HTMLSelectElement,
    optDetective: document.getElementById('opt-detective') as HTMLOptionElement,
    optWizard: document.getElementById('opt-wizard') as HTMLOptionElement,
    optParty: document.getElementById('opt-party') as HTMLOptionElement,
    apiPersonaContainer: document.getElementById('api-persona-container') as HTMLElement,
    personaSelect: document.getElementById('persona-select') as HTMLSelectElement
  };

  // ── Drag-and-Drop Toy setup ──────────────────────────────────────────────
  const setupToyDrags = () => {
    ['ball', 'fish', 'laser'].forEach((toy) => {
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

  // ── Tab Switching setup ──────────────────────────────────────────────────
  const setupTabSwitching = () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (!targetTab) return;

        // Update active class on buttons
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle visibility of panels
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

  // ── Sound Board Preview setup ─────────────────────────────────────────────
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

  // ── 1. Load Stats and Settings ──────────────────────────────────────────
  const data = await chrome.storage.local.get(['pet-stats', 'pet-settings', 'pet-mood']);
  
  applySettings(data['pet-settings']);
  updateUIStats(data['pet-stats']);
  updateUIMood(data['pet-mood'] || 'happy');

  // ── Visibility Setup ───────────────────────────────────────────────────
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
          // Content script not loaded (e.g. chrome:// page or extension disabled)
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

  // ── 2. Listen for Real-Time Stats Updates (e.g. from active page walking) ──
  chrome.storage.onChanged.addListener((changes) => {
    if (changes['pet-stats']) {
      updateUIStats(changes['pet-stats'].newValue);
    }
    if (changes['pet-mood']) {
      updateUIMood(changes['pet-mood'].newValue);
    }
  });

  // ── 3. Action Button Message Routing ──────────────────────────────────────
  const sendToActiveTab = (type: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type }).catch(() => {
          // Tab does not have the extension content script loaded
        });
      }
    });
  };

  (document.getElementById('btn-pet') as HTMLElement).addEventListener('click', () => sendToActiveTab('pet'));
  (document.getElementById('btn-feed') as HTMLElement).addEventListener('click', () => sendToActiveTab('feed'));
  (document.getElementById('btn-shoo') as HTMLElement).addEventListener('click', () => sendToActiveTab('shoo'));

  // ── 4. Settings Input Handlers ──────────────────────────────────────────
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
      settingsEl.apiKeyContainer.classList.remove('hidden');
      settingsEl.apiPersonaContainer.classList.remove('hidden');
    } else {
      settingsEl.apiKeyContainer.classList.add('hidden');
      settingsEl.apiPersonaContainer.classList.add('hidden');
    }
    saveSettings();
  });

  settingsEl.apiKeyInput.addEventListener('input', () => {
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

  // Toggle API Key password visibility
  settingsEl.btnToggleKey.addEventListener('click', () => {
    if (settingsEl.apiKeyInput.type === 'password') {
      settingsEl.apiKeyInput.type = 'text';
      settingsEl.btnToggleKey.textContent = '🙈';
    } else {
      settingsEl.apiKeyInput.type = 'password';
      settingsEl.btnToggleKey.textContent = '👁️';
    }
  });

  // ── Helper: Save Settings to Storage ──────────────────────────────────────
  function saveSettings(): void {
    chrome.storage.local.set({
      'pet-settings': {
        size: Number(settingsEl.sizeSlider.value),
        speed: Number(settingsEl.speedSlider.value) / 10,
        soundEnabled: settingsEl.soundToggle.checked,
        soundVolume: Number(settingsEl.volumeSlider.value) / 100,
        aiMode: settingsEl.aiToggle.checked,
        apiKey: settingsEl.apiKeyInput.value.trim(),
        name: settingsEl.nameInput.value.trim() || 'Clawd',
        costume: settingsEl.costumeSelect.value,
        persona: settingsEl.personaSelect.value,
        blockedDomains: blockedDomains,
        disabledEmotions: disabledEmotions
      }
    });
  }



  function renderEmotionsGrid(level: number): void {
    const gridEl = document.getElementById('emotions-grid');
    if (!gridEl) return;

    gridEl.innerHTML = '';

    const availableEmotions = getAvailableEmotions(level);

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

      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'emotion-checkbox-emoji';
      emojiSpan.textContent = meta.emoji;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'emotion-checkbox-label';
      labelSpan.textContent = meta.name;

      card.appendChild(checkbox);
      card.appendChild(emojiSpan);
      card.appendChild(labelSpan);
      gridEl.appendChild(card);
    });
  }

  // ── Helper: Populate Stats ───────────────────────────────────────────────
  function updateUIStats(stats: PetStats | undefined): void {
    if (!stats) return;
    
    // Level & XP
    statsEl.level.textContent = String(stats.level);
    const xpNeeded = stats.level * 100;
    statsEl.xpText.textContent = `${stats.xp} / ${xpNeeded} XP`;
    statsEl.xpBar.style.width = `${Math.min(100, (stats.xp / xpNeeded) * 100)}%`;

    // Unlock costume selections based on level
    settingsEl.optDetective.disabled = stats.level < 5;
    if (stats.level < 5) {
      settingsEl.optDetective.textContent = '🕵️ Blue Detective Aura (Locked - LVL 5)';
    } else {
      settingsEl.optDetective.textContent = '🕵️ Blue Detective Aura';
    }

    settingsEl.optWizard.disabled = stats.level < 10;
    if (stats.level < 10) {
      settingsEl.optWizard.textContent = '🧙 Magic Purple Aura (Locked - LVL 10)';
    } else {
      settingsEl.optWizard.textContent = '🧙 Magic Purple Aura';
    }

    settingsEl.optParty.disabled = stats.level < 15;
    if (stats.level < 15) {
      settingsEl.optParty.textContent = '🎉 Neon Rainbow Shader (Locked - LVL 15)';
    } else {
      settingsEl.optParty.textContent = '🎉 Neon Rainbow Shader';
    }

    // Core attributes
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

    // Preview Image Avatar Reaction
    let previewMood = 'happy';
    if (stats.happiness >= 80) previewMood = 'happy';
    else if (stats.happiness >= 50) previewMood = 'waving';
    else if (stats.happiness >= 25) previewMood = 'sad';
    else previewMood = 'crying';
    
    statsEl.preview.src = `../assets/pets/clawd-${previewMood}.svg`;

    // Analytics Counter Mapping
    if (statsEl.valTotalPets) {
      statsEl.valTotalPets.textContent = String(stats.totalPets || 0);
    }
    if (statsEl.valTotalFeeds) {
      statsEl.valTotalFeeds.textContent = String(stats.totalFeeds || 0);
    }

    // Dynamic Browsing Interests Category Rendering
    if (statsEl.categoriesList) {
      statsEl.categoriesList.innerHTML = '';
      const counts = stats.siteCategoryCounts || {};
      const totalVisits = Object.values(counts).reduce((a, b) => a + b, 0);

      const CATEGORY_METADATA: Record<string, { name: string; emoji: string; colorClass: string }> = {
        code: { name: 'Coding', emoji: '🖥️', colorClass: 'fill-blue' },
        social: { name: 'Social', emoji: '💬', colorClass: 'fill-pink' },
        gaming: { name: 'Gaming', emoji: '🎮', colorClass: 'fill-yellow' },
        news: { name: 'News', emoji: '📰', colorClass: 'fill-green' },
        shopping: { name: 'Shopping', emoji: '🛍️', colorClass: 'fill-indigo' },
        docs: { name: 'Documentation', emoji: '📄', colorClass: 'fill-blue' },
        mail: { name: 'Email', emoji: '✉️', colorClass: 'fill-green' },
        fitness: { name: 'Fitness', emoji: '🏋️', colorClass: 'fill-pink' }
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
            const meta = CATEGORY_METADATA[cat] || { name: cat, emoji: '🌐', colorClass: 'fill-blue' };
            const percentage = Math.round((val / totalVisits) * 100);

            const row = document.createElement('div');
            row.className = 'category-row';
            row.innerHTML = `
              <div class="category-meta">
                <span>${meta.emoji} ${meta.name}</span>
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

    // Dynamic Recent Activity Timeline Rendering
    if (statsEl.timelineList) {
      statsEl.timelineList.innerHTML = '';
      const history = stats.moodHistory || [];

      const EVENT_FORMATTERS: Record<string, { label: string; emoji: string }> = {
        pet: { label: 'You petted Clawd', emoji: '🫶' },
        feed: { label: 'You fed Clawd', emoji: '🍖' },
        shoo: { label: 'Shooed Clawd away', emoji: '🏃‍♂️' },
        'visit-code': { label: 'Browsed Coding pages', emoji: '🖥️' },
        'visit-social': { label: 'Browsed Social media', emoji: '💬' },
        'visit-gaming': { label: 'Browsed Gaming sites', emoji: '🎮' },
        'visit-news': { label: 'Browsed News pages', emoji: '📰' },
        'visit-shopping': { label: 'Browsed Shopping sites', emoji: '🛍️' },
        'visit-docs': { label: 'Browsed Documentation', emoji: '📄' },
        'visit-mail': { label: 'Checked Email', emoji: '✉️' },
        'visit-fitness': { label: 'Browsed Fitness sites', emoji: '🏋️' }
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
          const fmt = EVENT_FORMATTERS[item.action] || { label: item.action, emoji: '🐾' };
          const timelineItem = document.createElement('div');
          timelineItem.className = 'timeline-item';
          timelineItem.innerHTML = `
            <span class="timeline-icon">${fmt.emoji}</span>
            <span class="timeline-content">${fmt.label}</span>
            <span class="timeline-time">${item.time}</span>
          `;
          statsEl.timelineList.appendChild(timelineItem);
        });
      }
    }

    if (stats.level !== lastRenderedLevel) {
      renderEmotionsGrid(stats.level);
      lastRenderedLevel = stats.level;
    }
  }

  function updateUIMood(mood: string): void {
    const moodEmojiEl = document.getElementById('mood-emoji');
    const moodTextEl = document.getElementById('mood-text');
    if (!moodEmojiEl || !moodTextEl) return;

    const meta = EMOTIONS_METADATA[mood] || { name: mood, emoji: '😊' };
    moodEmojiEl.textContent = meta.emoji;
    moodTextEl.textContent = meta.name;
  }

  // ── Helper: Populate Settings ─────────────────────────────────────────────
  function applySettings(settings: PetSettings | undefined): void {
    if (!settings) return;

    // Size
    const size = settings.size ?? 64;
    settingsEl.sizeSlider.value = String(size);
    settingsEl.sizeVal.textContent = `${size}px`;

    // Speed
    const speed = settings.speed ?? 1.2;
    settingsEl.speedSlider.value = String(Math.round(speed * 10));
    settingsEl.speedVal.textContent = `${speed.toFixed(1)}x`;

    // Sound Toggle & Volume
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

    // AI Mode
    const aiMode = settings.aiMode ?? false;
    settingsEl.aiToggle.checked = aiMode;
    if (aiMode) {
      settingsEl.apiKeyContainer.classList.remove('hidden');
      settingsEl.apiPersonaContainer.classList.remove('hidden');
    } else {
      settingsEl.apiKeyContainer.classList.add('hidden');
      settingsEl.apiPersonaContainer.classList.add('hidden');
    }

    // API Key
    settingsEl.apiKeyInput.value = settings.apiKey ?? '';

    // Name
    const name = settings.name ?? 'Clawd';
    settingsEl.nameInput.value = name;
    (document.getElementById('pet-name') as HTMLElement).textContent = name;

    // Costume
    settingsEl.costumeSelect.value = settings.costume ?? 'none';

    // Persona
    settingsEl.personaSelect.value = settings.persona ?? 'default';

    // Blocked Domains
    blockedDomains = settings.blockedDomains || [];

    // Disabled Emotions
    disabledEmotions = settings.disabledEmotions || [];
  }
}

document.addEventListener('DOMContentLoaded', init);
