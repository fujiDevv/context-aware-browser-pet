import { PersonalitySystem } from '../src/personality';
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

let personality: PersonalitySystem;
let blockedDomains: string[] = [];
let activeCostume: string = 'none';
let domainReactions: any[] = [];

// Elements
const previewImg = document.getElementById('pet-preview') as HTMLImageElement;
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

// Inputs
const nameInput = document.getElementById('pet-name-input') as HTMLInputElement;
const sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
const sizeVal = document.getElementById('size-val') as HTMLElement;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedVal = document.getElementById('speed-val') as HTMLElement;
const personaSelect = document.getElementById('persona-select') as HTMLSelectElement;
const soundToggle = document.getElementById('sound-toggle') as HTMLInputElement;
const aiToggle = document.getElementById('ai-toggle') as HTMLInputElement;
const scheduleToggle = document.getElementById('schedule-toggle') as HTMLInputElement;
const seasonalToggle = document.getElementById('seasonal-toggle') as HTMLInputElement;
const volumeContainer = document.getElementById('volume-container') as HTMLElement;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
const volumeVal = document.getElementById('volume-val') as HTMLElement;

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

  menuButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (!target) return;

      menuButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      pagePanes.forEach((pane) => {
        if (pane.id === `page-${target}`) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });

  // Load Settings and Stats from local storage
  const storageData = await chrome.storage.local.get(['pet-stats', 'pet-settings', 'pet-mood']);
  blockedDomains = storageData['pet-settings']?.blockedDomains || [];
  domainReactions = storageData['pet-settings']?.domainReactions || [];
  
  populateHourSelects();
  applySettings(storageData['pet-settings']);

  // Initializing the Personality System
  personality = new PersonalitySystem((updatedStats) => {
    updateUIStats(updatedStats);
    renderWardrobe(updatedStats, activeCostume);
  });

  await personality.isLoaded;
  updateUIStats(personality.stats);
  updateUIMood(storageData['pet-mood'] || 'happy');
  updateLocalAiStatus();

  // Initial Wardrobe rendering
  renderWardrobe(personality.stats, storageData['pet-settings']?.costume || 'none');

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

  // Setting bindings
  nameInput.addEventListener('input', () => {
    const name = nameInput.value.trim() || 'Clawd';
    petNameEl.textContent = name;
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

  personaSelect.addEventListener('change', saveSettings);

  // Planner change listeners
  sleepStartSelect.addEventListener('change', saveSettings);
  sleepEndSelect.addEventListener('change', saveSettings);
  workStartSelect.addEventListener('change', saveSettings);
  workEndSelect.addEventListener('change', saveSettings);
  focusActiveToggle.addEventListener('change', saveSettings);
  focusStartSelect.addEventListener('change', saveSettings);
  focusEndSelect.addEventListener('change', saveSettings);

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
    saveSettings();
    updateLocalAiStatus();
  });

  scheduleToggle.addEventListener('change', saveSettings);
  seasonalToggle.addEventListener('change', saveSettings);

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
    btn.addEventListener('click', () => {
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

    await chrome.storage.local.remove('pet-stats');
    window.location.reload();
  });

  btnHardReset.addEventListener('click', async () => {
    const confirmed = confirm("CRITICAL WARNING: This will completely wipe all local extension data, options, and history for Clawd. This action is irreversible. Continue?");
    if (!confirmed) return;

    await chrome.storage.local.clear();
    window.location.reload();
  });

  // Clear Logs UI button
  const btnClearLogs = document.getElementById('btn-clear-logs-ui');
  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', async () => {
      const confirmed = confirm("Are you sure you want to clear Clawd's history timeline?");
      if (!confirmed) return;

      const data = await chrome.storage.local.get('pet-stats');
      const stats = data['pet-stats'] || {};
      stats.moodHistory = [];
      await chrome.storage.local.set({ 'pet-stats': stats });
    });
  }

  // Storage listener to update UI in real time
  chrome.storage.onChanged.addListener((changes) => {
    if (changes['pet-stats']) {
      updateUIStats(changes['pet-stats'].newValue);
    }
    if (changes['pet-mood']) {
      updateUIMood(changes['pet-mood'].newValue);
    }
    if (changes['pet-settings'] && !document.hasFocus()) {
      applySettings(changes['pet-settings'].newValue);
    }
    if (changes['modelLoadingState'] || changes['modelDownloadProgress']) {
      updateLocalAiStatus();
    }
  });
}

async function triggerPetAction(action: string, temporaryMood: string, soundName: string, textBubble: string) {
  if (soundToggle.checked) {
    const vol = Number(volumeSlider.value) / 100;
    playPreviewSound(soundName, vol);
  }

  const bubble = document.getElementById('sandbox-speech-bubble');
  if (bubble) {
    bubble.textContent = textBubble;
    bubble.classList.add('show');
    setTimeout(() => bubble.classList.remove('show'), 2500);
  }

  // Visual mood preview
  previewImg.src = `../assets/pets/clawd-${temporaryMood}.svg`;
  
  // Jump animation WAAPI
  previewImg.animate([
    { transform: 'translateY(0)' },
    { transform: 'translateY(-30px)' },
    { transform: 'translateY(0)' }
  ], { duration: 400, easing: 'ease-out' });

  await personality.recordInteraction(action);

  setTimeout(async () => {
    const currentMood = await chrome.storage.local.get('pet-mood');
    updateUIMood(currentMood['pet-mood'] || 'happy');
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

function updateUIMood(mood: string): void {
  const meta = EMOTIONS_METADATA[mood] || { name: mood, emoji: '😊' };
  petMoodBadge.textContent = `${meta.emoji} ${meta.name}`;
  previewImg.src = `../assets/pets/clawd-${mood}.svg`;
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

  // Level & XP
  petLevelEl.textContent = String(stats.level);
  const xpNeeded = Math.floor(Math.pow(stats.level, 1.5) * 150);
  xpText.textContent = `${stats.xp} / ${xpNeeded} XP`;
  barXp.style.width = `${Math.min(100, (stats.xp / xpNeeded) * 100)}%`;

  // Prestige status
  const hasPrestige = stats.prestige && stats.prestige > 0;
  lblAdminPrestige.textContent = String(stats.prestige || 0);
  if (hasPrestige) {
    prestigeLevelEl.textContent = String(stats.prestige);
    prestigeBadge.classList.remove('hidden');
  } else {
    prestigeBadge.classList.add('hidden');
  }

  // Toggle Rebirth buttons
  if (stats.level >= 50) {
    btnPrestige.removeAttribute('disabled');
  } else {
    btnPrestige.setAttribute('disabled', 'true');
  }



  // Dominant trait
  const trait = getDominantTrait(stats);
  petTraitBadge.textContent = trait.toUpperCase();
  petTraitBadge.className = `badge badge-trait trait-${trait}`;
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

  // Default behaviors
  let behaviorDesc = 'Standard';
  if (trait === 'developer') behaviorDesc = 'Analytical (Thinking)';
  else if (trait === 'gamer') behaviorDesc = 'Playful (Cool)';
  else if (trait === 'scholar') behaviorDesc = 'Focused (Reading)';
  else if (trait === 'socialite') behaviorDesc = 'Affectionate (Love)';
  lblHabitBehavior.textContent = behaviorDesc;

  // Update core gauges
  gauges.happinessVal.textContent = `${stats.happiness}%`;
  gauges.happinessBar.style.width = `${stats.happiness}%`;

  gauges.energyVal.textContent = `${stats.energy}%`;
  gauges.energyBar.style.width = `${stats.energy}%`;

  gauges.curiosityVal.textContent = `${stats.curiosity}%`;
  gauges.curiosityBar.style.width = `${stats.curiosity}%`;

  gauges.focusVal.textContent = `${stats.focus ?? 50}%`;
  gauges.focusBar.style.width = `${stats.focus ?? 50}%`;

  gauges.leisureVal.textContent = `${stats.leisure ?? 50}%`;
  gauges.leisureBar.style.width = `${stats.leisure ?? 50}%`;

  // Lifetime counts
  valTotalPets.textContent = String(stats.totalPets || 0);
  valTotalFeeds.textContent = String(stats.totalFeeds || 0);

  // Interest breakdown
  renderCategoriesChart(stats.siteCategoryCounts);

  // Timeline list
  renderTimeline(stats.moodHistory);
}

function renderCategoriesChart(counts: Record<string, number> | undefined) {
  if (!categoriesList) return;
  categoriesList.innerHTML = '';

  const dataCounts = counts || {};
  const total = Object.values(dataCounts).reduce((a, b) => a + b, 0);

  const CATEGORY_METADATA: Record<string, { name: string; colorClass: string }> = {
    code: { name: 'Coding', colorClass: 'fill-blue' },
    social: { name: 'Social Media', colorClass: 'fill-pink' },
    gaming: { name: 'Gaming', colorClass: 'fill-yellow' },
    news: { name: 'News & Media', colorClass: 'fill-green' },
    shopping: { name: 'Shopping', colorClass: 'fill-indigo' },
    docs: { name: 'Documentation', colorClass: 'fill-blue' },
    mail: { name: 'Email & Messages', colorClass: 'fill-green' },
    fitness: { name: 'Fitness & Sports', colorClass: 'fill-pink' }
  };

  if (total === 0) {
    categoriesList.innerHTML = `<p class="empty-blocklist">No categories evaluated yet. Clawd will learn as you browse!</p>`;
    return;
  }

  Object.entries(dataCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, val]) => {
      const meta = CATEGORY_METADATA[cat] || { name: cat, colorClass: 'fill-blue' };
      const pct = Math.round((val / total) * 100);

      const row = document.createElement('div');
      row.className = 'category-row';
      row.innerHTML = `
        <div class="category-meta">
          <span>${meta.name}</span>
          <span class="category-pct">${val} (${pct}%)</span>
        </div>
        <div class="category-bar-wrapper">
          <div class="category-bar ${meta.colorClass}" style="width: ${pct}%"></div>
        </div>
      `;
      categoriesList.appendChild(row);
    });
}

function renderTimeline(history: any[] | undefined) {
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

  list.slice().reverse().forEach((item: any) => {
    const meta = TIMELINE_METADATA[item.action] || { label: item.action, icon: '🐾' };
    const date = new Date(item.time);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString();

    const row = document.createElement('div');
    row.className = 'timeline-item';
    row.innerHTML = `
      <div class="timeline-icon">${meta.icon}</div>
      <div class="timeline-body">
        <span class="timeline-text">${meta.label}</span>
        <span class="timeline-time">${timeStr}</span>
      </div>
    `;
    timelineList.appendChild(row);
  });
}

function applySettings(settings: PetSettings | undefined) {
  const defaults: PetSettings = {
    size: 100,
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
  petNameEl.textContent = nameInput.value;

  const size = activeSettings.size ?? 100;
  sizeSlider.value = String(size);
  sizeVal.textContent = `${size}px`;

  const speed = activeSettings.speed ?? 1.0;
  speedSlider.value = String(Math.round(speed * 10));
  speedVal.textContent = `${speed.toFixed(1)}x`;

  activeCostume = activeSettings.costume || 'none';
  
  // Apply costume glows to the preview image in the sanctuary stage
  previewImg.classList.remove('costume-detective', 'costume-wizard', 'costume-party');
  if (activeCostume !== 'none' && ['detective', 'wizard', 'party'].includes(activeCostume)) {
    previewImg.classList.add(`costume-${activeCostume}`);
  }

  personaSelect.value = activeSettings.persona || 'default';

  const sound = activeSettings.soundEnabled ?? true;
  soundToggle.checked = sound;
  if (sound) {
    volumeContainer.classList.remove('hidden');
  } else {
    volumeContainer.classList.add('hidden');
  }

  const volume = activeSettings.soundVolume ?? 0.8;
  volumeSlider.value = String(Math.round(volume * 100));
  volumeVal.textContent = `${Math.round(volume * 100)}%`;

  aiToggle.checked = activeSettings.aiMode ?? false;
  scheduleToggle.checked = activeSettings.scheduleEnabled ?? true;
  seasonalToggle.checked = activeSettings.seasonalEnabled ?? true;

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
}

function saveSettings() {
  chrome.storage.local.set({
    'pet-settings': {
      size: Number(sizeSlider.value),
      speed: Number(speedSlider.value) / 10,
      soundEnabled: soundToggle.checked,
      soundVolume: Number(volumeSlider.value) / 100,
      aiMode: aiToggle.checked,
      apiKey: '',
      name: nameInput.value.trim() || 'Clawd',
      costume: activeCostume,
      persona: personaSelect.value,
      blockedDomains: blockedDomains,
      scheduleEnabled: scheduleToggle.checked,
      seasonalEnabled: seasonalToggle.checked,
      sleepStartHour: sleepStartSelect.value !== '' ? Number(sleepStartSelect.value) : undefined,
      sleepEndHour: sleepEndSelect.value !== '' ? Number(sleepEndSelect.value) : undefined,
      workStartHour: workStartSelect.value !== '' ? Number(workStartSelect.value) : undefined,
      workEndHour: workEndSelect.value !== '' ? Number(workEndSelect.value) : undefined,
      focusActive: focusActiveToggle.checked,
      focusStartHour: focusStartSelect.value !== '' ? Number(focusStartSelect.value) : undefined,
      focusEndHour: focusEndSelect.value !== '' ? Number(focusEndSelect.value) : undefined,
      domainReactions: domainReactions
    }
  });
}

// AI status update helper
function updateLocalAiStatus() {
  if (!aiToggle.checked) {
    aiStatusBadge.className = 'status-indicator status-unsupported';
    aiStatusText.textContent = 'Inactive';
    aiStatusSubtitle.textContent = 'Enable Local AI Mode to initialize';
    return;
  }

  aiStatusBadge.className = 'status-indicator status-checking';
  aiStatusText.textContent = 'Checking...';
  aiStatusSubtitle.textContent = 'Querying local model layer...';

  chrome.runtime.sendMessage({ type: 'check-local-ai-status' }, (response: any) => {
    aiStatusBadge.className = 'status-indicator';

    if (chrome.runtime.lastError || !response || !response.success) {
      aiStatusBadge.classList.add('status-unsupported');
      aiStatusText.textContent = 'Offline';
      aiStatusSubtitle.textContent = 'Failed to connect to background AI layer';
      return;
    }

    const { state, progress } = response;
    if (state === 'ready') {
      aiStatusBadge.classList.add('status-ready');
      aiStatusText.textContent = 'Ready';
      aiStatusSubtitle.textContent = 'Local DistilBERT model active and running';
    } else if (state === 'loading') {
      aiStatusBadge.classList.add('status-downloading');
      aiStatusText.textContent = `Downloading (${progress}%)`;
      aiStatusSubtitle.textContent = 'Downloading weights (~67MB) to browser storage';
    } else if (state === 'error') {
      aiStatusBadge.classList.add('status-unsupported');
      aiStatusText.textContent = 'Error';
      aiStatusSubtitle.textContent = 'Failed to compile model weights';
    } else {
      aiStatusBadge.classList.add('status-checking');
      aiStatusText.textContent = 'Inactive';
      aiStatusSubtitle.textContent = 'Turn on Local AI Mode to initialize';
    }
  });
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
  chrome.storage.local.get(['pet-stats', 'pet-settings'], (data) => {
    const exportData = {
      version: 'v1.2.0',
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

function getMascotSvgName(mood: string, costume: string): string {
  const idleStates = ['happy', 'waving', 'smile', 'idle-living'];
  if (costume === 'christmas' && idleStates.includes(mood)) {
    return 'christmas';
  }
  if (costume === 'halloween' && idleStates.includes(mood)) {
    return 'halloween';
  }
  if (costume === 'summer' && idleStates.includes(mood)) {
    return 'summer';
  }
  return mood;
}

function renderWardrobe(stats: PetStats | undefined, activeCostumeId: string) {
  const wardrobeGrid = document.getElementById('wardrobe-grid') as HTMLElement;
  if (!wardrobeGrid) return;
  wardrobeGrid.innerHTML = '';

  const level = stats?.level || 1;
  const hasPrestige = stats?.prestige && stats.prestige > 0;

  COSTUMES_METADATA.forEach(item => {
    const isUnlocked = level >= item.unlockLevel || !!hasPrestige;
    const isWearing = activeCostumeId === item.id;

    const card = document.createElement('div');
    card.className = `wardrobe-card ${isWearing ? 'wearing' : ''} ${!isUnlocked ? 'locked' : ''}`;
    
    let badgeHtml = '';
    if (!isUnlocked) {
      badgeHtml = `<span class="badge locked">LVL ${item.unlockLevel}</span>`;
    } else if (item.seasonal) {
      badgeHtml = `<span class="badge seasonal">Seasonal</span>`;
    } else if (isWearing) {
      badgeHtml = `<span class="badge wearing-badge">Active</span>`;
    }

    card.innerHTML = `
      <div class="wardrobe-thumbnail-container">
        <img class="wardrobe-thumbnail ${item.id !== 'none' && ['detective', 'wizard', 'party'].includes(item.id) ? 'costume-' + item.id : ''}" src="../assets/pets/clawd-${item.image}.svg" alt="${item.name}">
        ${badgeHtml}
      </div>
      <div class="wardrobe-info">
        <h3>${item.name}</h3>
        <p>${item.desc}</p>
      </div>
      <button class="wardrobe-wear-btn" ${!isUnlocked ? 'disabled' : ''} data-costume="${item.id}">
        ${isWearing ? 'Wearing' : isUnlocked ? 'Wear' : 'Locked'}
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
        previewImg.classList.remove('costume-detective', 'costume-wizard', 'costume-party');
        if (costumeId !== 'none' && ['detective', 'wizard', 'party'].includes(costumeId)) {
          previewImg.classList.add(`costume-${costumeId}`);
        }
        
        // Update preview image src based on active costume
        const currentMoodBadge = document.getElementById('pet-mood') as HTMLElement;
        const currentMood = currentMoodBadge.textContent?.split(' ').slice(1).join(' ').toLowerCase() || 'happy';
        const svgName = getMascotSvgName(currentMood, costumeId);
        previewImg.src = `../assets/pets/clawd-${svgName}.svg`;

        renderWardrobe(stats, costumeId);
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

document.addEventListener('DOMContentLoaded', init);
