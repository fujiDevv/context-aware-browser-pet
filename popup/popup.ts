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

  const data = await chrome.storage.local.get(['pet-stats', 'pet-settings', 'pet-mood']);
  blockedDomains = data['pet-settings']?.blockedDomains || [];
  
  if (data['pet-settings']?.name) {
    (document.getElementById('pet-name') as HTMLElement).textContent = data['pet-settings'].name;
  }
  updateUIStats(data['pet-stats']);
  updateUIMood(data['pet-mood'] || 'happy');

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
      
      // Save updated blocked domains
      chrome.storage.local.get('pet-settings', (res) => {
        const settings = res['pet-settings'] || {};
        settings.blockedDomains = blockedDomains;
        chrome.storage.local.set({ 'pet-settings': settings });
      });
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes['pet-stats']) {
      updateUIStats(changes['pet-stats'].newValue);
    }
    if (changes['pet-mood']) {
      updateUIMood(changes['pet-mood'].newValue);
    }
    if (changes['pet-settings']) {
      const newSettings = changes['pet-settings'].newValue;
      if (newSettings?.name) {
        (document.getElementById('pet-name') as HTMLElement).textContent = newSettings.name;
      }
    }
  });

  const sendToActiveTab = (type: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type }).catch(() => {});
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
