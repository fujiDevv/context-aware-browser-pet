import { PetStats, PetSettings } from '../src/types';
import { EMOTIONS_METADATA, getDominantTrait } from '../src/shared-ui';
import { STORAGE_KEYS } from '../src/constants';

async function init(): Promise<void> {
  let blockedDomains: string[] = [];

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
  };

  const aiStatusBadge = document.getElementById('ai-status-badge');
  const aiStatusText = document.getElementById('ai-status-text');
  const activeTabsText = document.getElementById('active-tabs-text');

  const updateStatusIndicators = () => {
    // 1. Update Active Tabs Count
    chrome.tabs.query({}, (tabs) => {
      const count = tabs.length;
      if (activeTabsText) {
        activeTabsText.textContent = `${count} Tab${count === 1 ? '' : 's'} Active`;
      }
    });

    // 2. Update AI Status
    chrome.runtime.sendMessage({ type: 'check-local-ai-status' }, (response: any) => {
      if (!aiStatusBadge || !aiStatusText) return;

      if (chrome.runtime.lastError || !response || !response.success) {
        aiStatusBadge.className = 'ai-status-badge status-unsupported';
        aiStatusText.textContent = 'AI: Offline';
        return;
      }

      const { state, progress } = response;
      if (state === 'ready') {
        aiStatusBadge.className = 'ai-status-badge status-ready';
        aiStatusText.textContent = 'AI: Ready';
      } else if (state === 'loading') {
        aiStatusBadge.className = 'ai-status-badge status-downloading';
        aiStatusText.textContent = `AI: ${progress}%`;
      } else if (state === 'error') {
        aiStatusBadge.className = 'ai-status-badge status-unsupported';
        aiStatusText.textContent = 'AI: Error';
      } else {
        aiStatusBadge.className = 'ai-status-badge status-checking';
        aiStatusText.textContent = 'AI: Checking';
      }
    });
  };

  // Initial update and then every 5 seconds
  updateStatusIndicators();
  const statusInterval = setInterval(updateStatusIndicators, 5000);

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

  const setupDashboardLink = () => {
    const btnOpen = document.getElementById('btn-open-dashboard');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }
  };
  setupDashboardLink();

  const data = await chrome.storage.local.get([STORAGE_KEYS.STATS, STORAGE_KEYS.SETTINGS, STORAGE_KEYS.MOOD]);
  blockedDomains = data[STORAGE_KEYS.SETTINGS]?.blockedDomains || [];
  
  if (data[STORAGE_KEYS.SETTINGS]?.name) {
    (document.getElementById('pet-name') as HTMLElement).textContent = data[STORAGE_KEYS.SETTINGS].name;
  }
  updateUIStats(data[STORAGE_KEYS.STATS]);
  updateUIMood(data[STORAGE_KEYS.MOOD] || 'happy');

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
      }).catch((e) => { console.warn('[Clawd Popup] executeScript error:', e); });
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
      
      // Save updated blocked domains
      chrome.storage.local.get(STORAGE_KEYS.SETTINGS, (res) => {
        const settings = res[STORAGE_KEYS.SETTINGS] || {};
        settings.blockedDomains = blockedDomains;
        chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
      });
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEYS.STATS]) {
      updateUIStats(changes[STORAGE_KEYS.STATS].newValue);
    }
    if (changes[STORAGE_KEYS.MOOD]) {
      updateUIMood(changes[STORAGE_KEYS.MOOD].newValue);
    }
    if (changes[STORAGE_KEYS.SETTINGS]) {
      const newSettings = changes[STORAGE_KEYS.SETTINGS].newValue;
      if (newSettings?.name) {
        (document.getElementById('pet-name') as HTMLElement).textContent = newSettings.name;
      }
    }
  });

  const sendToActiveTab = (type: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type }).catch((e) => { console.warn('[Clawd Popup] sendMessage error:', e); });
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

  function updateUIStats(stats: PetStats | undefined): void {
    if (!stats) return;

    const trait = getDominantTrait(stats);
    const traitBadge = document.getElementById('pet-trait') as HTMLElement;
    const traitText = document.getElementById('trait-text') as HTMLElement;
    if (traitBadge && traitText) {
      traitText.textContent = trait;
      traitBadge.className = `badge badge-trait trait-${trait}`;
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

    statsEl.level.textContent = String(stats.level);
    const xpNeeded = Math.floor(Math.pow(stats.level, 1.5) * 150);
    statsEl.xpText.textContent = `${stats.xp} / ${xpNeeded} XP`;
    statsEl.xpBar.style.width = `${Math.min(100, (stats.xp / xpNeeded) * 100)}%`;

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
}

document.addEventListener('DOMContentLoaded', init);
