import { PetStats, PetSettings } from '../src/types';

async function init(): Promise<void> {
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
    preview: document.getElementById('pet-preview') as HTMLImageElement
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
    btnToggleKey: document.getElementById('btn-toggle-key') as HTMLElement
  };

  // ── 1. Load Stats and Settings ──────────────────────────────────────────
  const data = await chrome.storage.local.get(['pet-stats', 'pet-settings']);
  
  updateUIStats(data['pet-stats']);
  applySettings(data['pet-settings']);

  // ── 2. Listen for Real-Time Stats Updates (e.g. from active page walking) ──
  chrome.storage.onChanged.addListener((changes) => {
    if (changes['pet-stats']) {
      updateUIStats(changes['pet-stats'].newValue);
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
    } else {
      settingsEl.apiKeyContainer.classList.add('hidden');
    }
    saveSettings();
  });

  settingsEl.apiKeyInput.addEventListener('input', () => {
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
        apiKey: settingsEl.apiKeyInput.value.trim()
      }
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

    // Core attributes
    statsEl.happinessText.textContent = `${stats.happiness}%`;
    statsEl.happinessBar.style.width = `${stats.happiness}%`;

    statsEl.energyText.textContent = `${stats.energy}%`;
    statsEl.energyBar.style.width = `${stats.energy}%`;

    statsEl.curiosityText.textContent = `${stats.curiosity}%`;
    statsEl.curiosityBar.style.width = `${stats.curiosity}%`;

    // Preview Image Avatar Reaction
    let previewMood = 'happy';
    if (stats.happiness >= 80) previewMood = 'happy';
    else if (stats.happiness >= 50) previewMood = 'waving';
    else if (stats.happiness >= 20) previewMood = 'sad';
    else previewMood = 'crying';
    
    statsEl.preview.src = `../assets/pets/clawd-${previewMood}.svg`;
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
    } else {
      settingsEl.apiKeyContainer.classList.add('hidden');
    }

    // API Key
    settingsEl.apiKeyInput.value = settings.apiKey ?? '';
  }
}

document.addEventListener('DOMContentLoaded', init);
