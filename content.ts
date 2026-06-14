import { MovementEngine } from './src/movement';
import { EmotionEngine } from './src/emotion';
import { TriggerDetector } from './src/triggers';
import { PersonalitySystem } from './src/personality';
import { getAiEmotion } from './src/ai';
import { PetSettings, SharedPetState } from './src/types';
import { springAnimate, keyframeAnimate } from './src/animate';
import { PERSONA_AUTONOMOUS_DIALOGUES } from './src/dialogues';

let syncInterval: ReturnType<typeof setInterval> | null = null;
let emotionInterval: ReturnType<typeof setInterval> | null = null;

let audioCtx: AudioContext | null = null;
let resumePromise: Promise<void> | null = null;

function unlockAudio(e?: Event): void {
  if (e) {
    if (!e.isTrusted) return;
    if (e.type === 'click' && (e as MouseEvent).button !== 0) return;
  }
  if (typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.isActive) {
    return;
  }
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      resumePromise = audioCtx.resume().then(() => {
        resumePromise = null;
        cleanUpListeners();
      }).catch(() => {
        resumePromise = null;
      });
    } else {
      cleanUpListeners();
    }
  } catch (err) { console.warn('[Clawd Content] checkContextOrCleanup error:', err); }
}

function cleanUpListeners(): void {
  window.removeEventListener('click', unlockAudio, { capture: true });
}

window.addEventListener('click', unlockAudio, { capture: true, passive: true });

async function playSound(type: string): Promise<void> {
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

  if (currentSettings.soundEnabled === false) {
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) {
    return;
  }

  if (!audioCtx) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioContextClass();
    } catch (err) {
      console.warn("Failed to create AudioContext:", err);
      return;
    }
  }

  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (err) { console.warn('[Clawd Content] audioCtx.resume error:', err); }
  }

  if (audioCtx.state === 'suspended' && resumePromise) {
    await resumePromise;
  }

  if (audioCtx.state === 'suspended') {
    return;
  }

  try {
    const soundUrl = chrome.runtime.getURL(`assets/${encodeURIComponent(filename)}`);
    const response = await fetch(soundUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = currentSettings.soundVolume !== undefined ? currentSettings.soundVolume : 0.5;

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
  } catch (e: any) {
    if (e.name !== 'NotAllowedError') {
      console.warn("Failed to play sound:", e);
    }
  }
}

function cleanupOrphanedScript(): void {
  if (syncInterval) clearInterval(syncInterval);
  if (emotionInterval) clearInterval(emotionInterval);
  
  try {
    movement.stop();
  } catch (e) { console.warn('[Clawd Content] movement.stop error:', e); }

  try {
    triggers.cleanup();
  } catch (e) { console.warn('[Clawd Content] triggers.cleanup error:', e); }

  window.removeEventListener('click', unlockAudio, { capture: true });
  window.removeEventListener('dragover', handleDragOver);
  window.removeEventListener('drop', handleDrop);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('pet-console-error', handleConsoleError);

  try {
    chrome.storage.onChanged.removeListener(handleStorageChanged);
  } catch (e) { console.warn('[Clawd Content] storage.onChanged removal error:', e); }

  try {
    chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
  } catch (e) { console.warn('[Clawd Content] runtime.onMessage removal error:', e); }

  try {
    petImg.removeEventListener('contextmenu', handleContextMenu);
    petImg.removeEventListener('mousedown', handleMouseDown);
    petImg.removeEventListener('mouseenter', handleMouseEnter);
    petImg.removeEventListener('mouseleave', handleMouseLeave);
  } catch (e) { console.warn('[Clawd Content] petImg listener removal error:', e); }

  try {
    container.remove();
  } catch (e) { console.warn('[Clawd Content] container removal error:', e); }
  
  console.log("Browser Pet: Old extension context invalidated. Injected mascot cleaned up.");
}

function checkContextOrCleanup(): boolean {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    cleanupOrphanedScript();
    return false;
  }
  return true;
}

function safeSendMessage(message: any, callback?: (response: any) => void): void {
  try {
    if (!checkContextOrCleanup()) return;
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message && chrome.runtime.lastError.message.includes('context invalidated')) {
          cleanupOrphanedScript();
        }
        return;
      }
      if (callback) callback(response);
    });
  } catch (e: any) {
    if (e.message && e.message.includes('context invalidated')) {
      cleanupOrphanedScript();
    } else {
      console.warn("safeSendMessage error:", e);
    }
  }
}

const style = document.createElement('style');
style.textContent = `
  #browser-pet-root {
    position: fixed;
    z-index: 2147483647;
    pointer-events: none;
    user-select: none;
    bottom: 0px;
    left: 200px;
  }
  #browser-pet-img {
    pointer-events: auto;
    cursor: pointer;
    image-rendering: pixelated;
    transition: filter 0.2s ease;
    will-change: transform, filter;
  }
  #browser-pet-img:hover {
    filter: drop-shadow(0px 2px 8px rgba(255, 105, 180, 0.4));
  }
  .pet-speech-bubble {
    position: absolute;
    bottom: 75px;
    left: 50%;
    transform: translateX(-50%) scale(0.8);
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(8px);
    color: #f8fafc;
    padding: 6px 12px;
    border-radius: 10px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.1);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    z-index: 2147483647;
  }
  .pet-speech-bubble.show {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
  .pet-speech-bubble::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px 5px 0;
    border-style: solid;
    border-color: rgba(15, 23, 42, 0.92) transparent;
    display: block;
    width: 0;
  }

  /* ── Costume Glows & Shaders ── */
  .costume-detective {
    filter: drop-shadow(0px 0px 6px rgba(59, 130, 246, 0.75)) !important;
    animation: detective-pulse 2s infinite alternate ease-in-out;
  }
  .costume-wizard {
    filter: drop-shadow(0px 0px 8px rgba(139, 92, 246, 0.85)) drop-shadow(0px 0px 2px rgba(139, 92, 246, 0.4)) !important;
    animation: wizard-float 3s infinite alternate ease-in-out;
  }
  .costume-party {
    animation: party-rainbow 5s infinite linear;
  }

  @keyframes detective-pulse {
    0% { filter: drop-shadow(0px 0px 4px rgba(59, 130, 246, 0.5)) !important; }
    100% { filter: drop-shadow(0px 0px 10px rgba(59, 130, 246, 0.95)) !important; }
  }
  @keyframes wizard-float {
    0% { filter: drop-shadow(0px 0px 5px rgba(139, 92, 246, 0.6)) !important; }
    100% { filter: drop-shadow(0px 0px 14px rgba(167, 139, 250, 0.95)) !important; }
  }
  @keyframes party-rainbow {
    0% { filter: hue-rotate(0deg) drop-shadow(0px 0px 8px rgba(236, 72, 153, 0.8)) !important; }
    100% { filter: hue-rotate(360deg) drop-shadow(0px 0px 8px rgba(236, 72, 153, 0.8)) !important; }
  }

  /* ── Level-Up Achievement Banner CSS ── */
  .pet-levelup-banner {
    position: fixed;
    top: -180px;
    left: 50%;
    transform: translateX(-50%);
    width: 320px;
    background: #ffffff;
    border: 2px solid #1e293b;
    border-radius: 12px;
    padding: 16px;
    color: #1e293b;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    z-index: 2147483647;
    pointer-events: auto;
    transition: top 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease;
    opacity: 0;
    box-shadow: none;
  }
  .pet-levelup-banner.show {
    top: 24px;
    opacity: 1;
  }
  .pet-levelup-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .pet-levelup-badge {
    background: rgba(199, 93, 63, 0.08);
    color: #C75D3F;
    border: 1px solid rgba(199, 93, 63, 0.25);
    font-weight: 700;
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .pet-levelup-title {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
  }
  .pet-levelup-details {
    font-size: 12px;
    line-height: 1.5;
    color: #475569;
  }
  .pet-levelup-unlocked {
    margin-top: 10px;
    border-top: 1px solid #e2e8f0;
    padding-top: 10px;
    font-size: 11px;
    color: #C75D3F;
    font-weight: 600;
  }
  .pet-levelup-close {
    position: absolute;
    top: 10px;
    right: 12px;
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    font-weight: 400;
    transition: color 0.2s ease;
  }
  .pet-levelup-close:hover {
    color: #1e293b;
  }
`;
const shadowHost = document.createElement('div');
shadowHost.id = 'clawd-companion-host';

if (document.body) {
  document.body.appendChild(shadowHost);
} else {
  const observer = new MutationObserver((mutations, obs) => {
    if (document.body) {
      document.body.appendChild(shadowHost);
      obs.disconnect();
    }
  });
  observer.observe(document.documentElement, { childList: true });
}

const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

shadowRoot.appendChild(style);

const container = document.createElement('div');
container.id = 'browser-pet-root';
shadowRoot.appendChild(container);

const petImg = document.createElement('img');
petImg.id = 'browser-pet-img';
container.appendChild(petImg);

const bubble = document.createElement('div');
bubble.className = 'pet-speech-bubble';
container.appendChild(bubble);

let currentSettings: PetSettings = { size: 100, speed: 1.2, aiMode: false, apiKey: '', soundEnabled: true, soundVolume: 0.5, scheduleEnabled: true };
let hasEvaluatedPageAi = false;
let currentAiCategory: string | undefined = undefined;
let currentAiSentiment: string | undefined = undefined;
let isTemporarilyInteracting = false;
let interactionTimeout: ReturnType<typeof setTimeout> | null = null;
let bubbleTimeout: ReturnType<typeof setTimeout> | null = null;
let customReactionPlayCount = 0;

let isCurrentlyHidden = false;

function isPetHidden(): boolean {
  const isBlockedDomain = currentSettings.blockedDomains?.includes(window.location.hostname);
  const isHiddenInTab = sessionStorage.getItem('pet-hidden-in-tab') === 'true';
  return !!(isBlockedDomain || isHiddenInTab);
}

function hidePet(): void {
  isCurrentlyHidden = true;
  container.style.display = 'none';
  movement.stop();
  bubble.classList.remove('show');
}

function showPet(): void {
  isCurrentlyHidden = false;
  container.style.display = 'block';
  movement.start();
}

const triggers = new TriggerDetector();
const personality = new PersonalitySystem(() => {});
const emotion = new EmotionEngine(personality);
const movement = new MovementEngine(container, {
  size: currentSettings.size,
  speed: currentSettings.speed
});

async function loadPet(name: string): Promise<void> {
  let assetName = name;
  const idleStates = ['happy', 'waving', 'smile', 'idle-living'];
  
  if (idleStates.includes(name)) {
    const costumeMap: Record<string, string> = {
      christmas: 'christmas',
      halloween: 'halloween',
      summer: 'summer',
      detective: 'detective',
      wizard: 'magic',
      party: 'rainbow'
    };
    if (currentSettings.costume && costumeMap[currentSettings.costume]) {
      assetName = costumeMap[currentSettings.costume];
    }
  }

  petImg.src = chrome.runtime.getURL(`assets/pets/clawd-${assetName}.svg`);
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ 'pet-mood': name }).catch((e) => { console.warn('[Clawd Content] storage.set error:', e); });
    }
  } catch (e) { console.warn('[Clawd Content] error:', e); }
}

function showBubble(text: string, duration = 3000): void {
  if (bubbleTimeout) clearTimeout(bubbleTimeout);
  bubble.textContent = text;
  bubble.classList.add('show');
  bubbleTimeout = setTimeout(() => {
    bubble.classList.remove('show');
  }, duration);
}

function showLevelUpBanner(level: number): void {
  const petName = currentSettings.name || 'Clawd';
  
  const existing = shadowRoot.querySelector('#browser-pet-levelup');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'browser-pet-levelup';
  banner.className = 'pet-levelup-banner';

  let unlockedText = "";
  if (level === 3) {
    unlockedText = "🔓 Unlocked: Coding, Typing, Dancing, Cool, Love, Celebrating, Mindblown emotes!";
  } else if (level === 5) {
    unlockedText = "🔓 Unlocked: Blue Detective Aura, Ninja, Wizard, Astronaut, Debugger emotes!";
  } else if (level === 8) {
    unlockedText = "🔓 Unlocked: Rocket, Pirate, Juggling, Gaming emotes!";
  } else if (level === 10) {
    unlockedText = "🔓 Unlocked: Magic Purple Aura, Ultimate Pet Status (All emotes unlocked)!";
  } else if (level === 15) {
    unlockedText = "🔓 Unlocked: Neon Rainbow Costume Shader!";
  } else {
    unlockedText = "⭐ XP Boosted! Keep leveling to unlock new costume shaders & emotes!";
  }

  banner.innerHTML = `
    <button class="pet-levelup-close" id="btn-close-levelup">×</button>
    <div class="pet-levelup-header">
      <span class="pet-levelup-badge">LVL ${level}</span>
      <span class="pet-levelup-title">Level Up Achievement!</span>
    </div>
    <div class="pet-levelup-details">
      Congratulations! <strong id="safe-pet-name"></strong> has grown stronger. Stats and attributes have been upgraded!
    </div>
    <div class="pet-levelup-unlocked" id="safe-unlocked-text">
    </div>
  `;

  const nameEl = banner.querySelector('#safe-pet-name');
  if (nameEl) nameEl.textContent = petName;
  
  const unlockedEl = banner.querySelector('#safe-unlocked-text');
  if (unlockedEl) unlockedEl.textContent = unlockedText;

  shadowRoot.appendChild(banner);

  const closeBtn = banner.querySelector('#btn-close-levelup');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 400);
    });
  }

  banner.getBoundingClientRect();
  banner.classList.add('show');

  setTimeout(() => {
    if (shadowRoot.contains(banner)) {
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 600);
    }
  }, 7000);
}

async function updateEmotion(): Promise<void> {
  if (!checkContextOrCleanup()) return;
  if (isPetHidden()) return;
  if (isTemporarilyInteracting) return;

  const context = triggers.snapshot();
  const scheduleEnabled = currentSettings.scheduleEnabled !== false;
  
  if (scheduleEnabled && !currentSettings.aiMode) {
    const siteCategory = emotion._classifySite(context.hostname);
    if (siteCategory !== 'default') {
      personality.recordSiteVisit(siteCategory);
    }
  } else if (scheduleEnabled && currentSettings.aiMode && currentAiCategory) {
    personality.recordSiteVisit(currentAiCategory, currentAiSentiment);
  }

  let nextEmotion = 'happy';
  let aiComment: string | undefined = undefined;

  const trait = personality.getDominantTrait();
  const prestige = personality.stats.prestige || 0;
  const baseSpeed = currentSettings.speed || 1.2;
  const energyFactor = Math.max(0.4, Math.min(1.2, personality.stats.energy / 100));
  let traitFactor = 1.0;
  if (trait === 'gamer') {
    traitFactor = 1.35 + (prestige * 0.15);
  } else if (trait === 'developer') {
    traitFactor = 0.85 / (1 + prestige * 0.1);
  }

  movement.updateSettings({
    speed: baseSpeed * energyFactor * traitFactor
  });

  let isFocusActive = currentSettings.focusActive || false;
  const currentHour = new Date().getHours();
  if (!isFocusActive && currentSettings.focusStartHour !== undefined && currentSettings.focusEndHour !== undefined) {
    const start = currentSettings.focusStartHour;
    const end = currentSettings.focusEndHour;
    if (start < end) {
      isFocusActive = currentHour >= start && currentHour < end;
    } else {
      isFocusActive = currentHour >= start || currentHour < end;
    }
  }

  let customReaction = undefined;
  if (currentSettings.domainReactions) {
    const currentDomain = window.location.hostname.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    customReaction = currentSettings.domainReactions.find(r => r.domain === currentDomain);
  }

  if (customReaction && !isFocusActive) {
    nextEmotion = customReaction.emotion;
    if (customReaction.dialogue) {
      aiComment = customReaction.dialogue;
    }
  } else if (isFocusActive) {
    nextEmotion = await emotion.evaluate(context, scheduleEnabled, currentSettings.seasonalEnabled !== false, currentSettings);
  } else if (scheduleEnabled && currentSettings.aiMode && !context.lastHttpError && context.idleSeconds < 60) {
    if (!hasEvaluatedPageAi) {
      const storedTime = await chrome.storage.local.get('last-ai-comment-time');
      const lastCommentTime = storedTime['last-ai-comment-time'] || 0;
      const freqSec = currentSettings.commentFrequency ?? 60;
      const now = Date.now();
      
      if (now - lastCommentTime >= freqSec * 1000) {
        await chrome.storage.local.set({ 'last-ai-comment-time': now });
        
        const metaDesc = (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content;
        const statsContext = `Happiness: ${personality.stats.happiness}%, Energy: ${personality.stats.energy}%, Focus: ${personality.stats.focus}%, Personality Trait: ${trait}`;
        const result = await getAiEmotion(context.pageTitle, metaDesc, currentSettings.apiKey, currentSettings.persona || 'default', statsContext, currentSettings.sentimentSensitivity);
        nextEmotion = result.emotion;
        aiComment = result.comment;
        currentAiCategory = result.category;
        currentAiSentiment = result.sentiment;
        hasEvaluatedPageAi = true;
        
        if (scheduleEnabled && currentAiCategory) {
          personality.recordSiteVisit(currentAiCategory, currentAiSentiment);
        }
      } else {
        hasEvaluatedPageAi = true;
        nextEmotion = await emotion.evaluate(context, scheduleEnabled, currentSettings.seasonalEnabled !== false, currentSettings);
      }
    } else {
      nextEmotion = await emotion.evaluate(context, scheduleEnabled, currentSettings.seasonalEnabled !== false, currentSettings);
    }
  } else {
    nextEmotion = await emotion.evaluate(context, scheduleEnabled, currentSettings.seasonalEnabled !== false, currentSettings);
  }

  if (nextEmotion !== emotion.current || aiComment || !petImg.src) {
    emotion.current = nextEmotion;
    loadPet(nextEmotion);
    
    if (aiComment) {
      showBubble(aiComment);
    } else {
      triggerContextDialogue(nextEmotion);
    }

    if (customReaction && customReaction.sound && customReaction.sound !== 'none' && !isFocusActive) {
      if (customReactionPlayCount < 2) {
        playSound(customReaction.sound);
        customReactionPlayCount++;
      }
    } else if (nextEmotion === 'waving' || nextEmotion === 'yoga') {
      playSound('greeting');
    } else if (['sad', 'crying'].includes(nextEmotion)) {
      playSound('sad');
    } else if (nextEmotion === 'sleeping') {
      playSound('sleeping');
    } else if (['working-thinking', 'coding', 'working-typing', 'reading', 'working-debugger'].includes(nextEmotion)) {
      playSound('thinking');
    }
  }
}

function triggerContextDialogue(mood: string): void {
  let isFocusActive = currentSettings.focusActive || false;
  const currentHour = new Date().getHours();
  if (!isFocusActive && currentSettings.focusStartHour !== undefined && currentSettings.focusEndHour !== undefined) {
    const start = currentSettings.focusStartHour;
    const end = currentSettings.focusEndHour;
    if (start < end) {
      isFocusActive = currentHour >= start && currentHour < end;
    } else {
      isFocusActive = currentHour >= start || currentHour < end;
    }
  }

  if (isFocusActive) {
    return;
  }

  const scheduleEnabled = currentSettings.scheduleEnabled !== false;
  const persona = currentSettings.persona || 'default';
  const personaDialogs = PERSONA_AUTONOMOUS_DIALOGUES[persona] || PERSONA_AUTONOMOUS_DIALOGUES.default;

  if (scheduleEnabled) {
    const stats = personality.stats;
    const trait = personality.getDominantTrait();
    
    if (stats.energy < 30 && Math.random() < 0.5) {
      const options = personaDialogs.lowEnergy || PERSONA_AUTONOMOUS_DIALOGUES.default.lowEnergy;
      showBubble(options[Math.floor(Math.random() * options.length)]);
      return;
    }
    
    if (stats.focus > 80 && Math.random() < 0.4) {
      const options = personaDialogs.highFocus || PERSONA_AUTONOMOUS_DIALOGUES.default.highFocus;
      showBubble(options[Math.floor(Math.random() * options.length)]);
      return;
    }

    if (mood === 'working-thinking' || mood === 'happy' || mood === 'love' || mood === 'cool' || mood === 'reading') {
      const traitOptions = personaDialogs[trait] || PERSONA_AUTONOMOUS_DIALOGUES.default[trait];
      if (traitOptions) {
        showBubble(traitOptions[Math.floor(Math.random() * traitOptions.length)]);
        return;
      }
    }
  }

  if (!scheduleEnabled) {
    const options = personaDialogs[mood];
    if (options) {
      showBubble(options[Math.floor(Math.random() * options.length)]);
      return;
    }
  }

  const dialogs: Record<string, string> = {
    '404': "Whoops! This page doesn't exist (404)!",
    '500': "Ouch! The server is broken (500)!",
    '403': "Stop! Access denied (403)!",
    '429': "Too fast! Calm down (429)!",
    'sleeping': "Zzz... sleeping...",
    'working-thinking': "Hmm... let me think...",
    'coding': "Let's write some code! 💻",
    'working-typing': "Keep typing! You've got this!",
    'celebrating': "Success! Form sent! 🎉",
    'love': "What a lovely page! ❤️",
    'gaming': "Game time! Let's play! 🎮",
    'mindblown': "Oh wow! Look at those items! 😮",
    'working-wizard': "Exploring the docs... 🧙‍♂️",
    'working-debugger': Math.random() < 0.5 ? "Oh no! Something crashed! 💥" : "Found a bug! Let me debug! 🔍",
    'crying': "I'm so sad... please pet me! 😢",
    'sad': "Feeling a bit down... 🥺",
    'reading': Math.random() < 0.5 ? "Reading is fun! 📚" : "So much knowledge here! 📖",
    'yoga': Math.random() < 0.5 ? "Time for some morning stretches! 🧘‍♂️" : "Inhale, exhale... stretch! 🧘‍♀️"
  };

  if (dialogs[mood]) {
    showBubble(dialogs[mood]);
  }
}

petImg.addEventListener('click', (e) => {
  e.stopPropagation();
  if (movement.wasDragged) {
    movement.wasDragged = false;
    return;
  }
  triggerInteraction('pet', 'love', 2000, "Ah, thank you! ❤️");
});

petImg.addEventListener('dblclick', (e) => {
  e.stopPropagation();
  triggerInteraction('feed', 'celebrating', 2500, "Yum! That was delicious! 🍖");
});

let lastShooTime = 0;
function handleShoo(e: Event) {
  e.preventDefault();
  e.stopPropagation();

  const now = Date.now();
  if (now - lastShooTime < 500) return;
  lastShooTime = now;

  try {
    petImg.getAnimations().forEach(anim => anim.cancel());
  } catch (err) { console.warn('[Clawd Content] error:', err); }

  personality.recordInteraction('shoo');
  movement.shoo();
  showBubble("Okay, okay, moving! 🏃‍♂️");
  playSound('shoo');
}

function triggerInteraction(action: string, temporaryMood: string, duration: number, message: string): void {
  isTemporarilyInteracting = true;
  if (interactionTimeout) clearTimeout(interactionTimeout);
  
  try {
    petImg.getAnimations().forEach(anim => anim.cancel());
  } catch (err) { console.warn('[Clawd Content] error:', err); }

  personality.recordInteraction(action);
  loadPet(temporaryMood);
  showBubble(message);

  if (action === 'pet') {
    playSound('petting');
    petImg.animate([
      { transform: 'scale(1) rotate(0deg)' },
      { transform: 'scale(0.8) rotate(-8deg)' },
      { transform: 'scale(1.25) rotate(8deg)' },
      { transform: 'scale(0.95) rotate(-4deg)' },
      { transform: 'scale(1.05) rotate(4deg)' },
      { transform: 'scale(1) rotate(0deg)' }
    ], { duration: 600, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' });
  } else if (action === 'feed') {
    playSound('feeding');
    petImg.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.3)' },
      { transform: 'scale(0.85)' },
      { transform: 'scale(1.15)' },
      { transform: 'scale(0.95)' },
      { transform: 'scale(1)' }
    ], { duration: 650, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' });
  }
  
  interactionTimeout = setTimeout(() => {
    isTemporarilyInteracting = false;
    loadPet(emotion.current);
  }, duration);
}

function handleContextMenu(e: MouseEvent) {
  handleShoo(e);
}

function handleMouseDown(e: MouseEvent) {
  if (e.button === 2) {
    handleShoo(e);
  }
}

function handleMouseEnter() {
  if (isPetHidden()) return;
  petImg.animate([
    { transform: 'scale(1) rotate(0deg)' },
    { transform: 'scale(1.2) rotate(6deg)' },
    { transform: 'scale(1.12) rotate(4deg)' },
    { transform: 'scale(1.15) rotate(5deg)' }
  ], { duration: 300, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', fill: 'forwards' });
}

function handleMouseLeave() {
  if (isPetHidden()) return;
  petImg.animate([
    { transform: 'scale(1.15) rotate(5deg)' },
    { transform: 'scale(0.97) rotate(-1deg)' },
    { transform: 'scale(1) rotate(0deg)' }
  ], { duration: 300, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', fill: 'forwards' });
}

petImg.addEventListener('contextmenu', handleContextMenu);
petImg.addEventListener('mousedown', handleMouseDown);
petImg.addEventListener('mouseenter', handleMouseEnter);
petImg.addEventListener('mouseleave', handleMouseLeave);

function applyCostume(): void {
  const existingHat = container.querySelector('#browser-pet-hat');
  if (existingHat) {
    existingHat.remove();
  }

  petImg.classList.remove('costume-detective', 'costume-wizard', 'costume-party');

  if (currentSettings.costume && ['detective', 'wizard', 'party'].includes(currentSettings.costume)) {
    petImg.classList.add(`costume-${currentSettings.costume}`);
  }

  if (emotion && emotion.current) {
    loadPet(emotion.current);
  }
}

function handleToyDrop(dropX: number, dropY: number, toyType: string): void {
  const toyEl = document.createElement('div');
  toyEl.className = 'browser-pet-toy';
  const emojis: Record<string, string> = { ball: '⚽', fish: '🐟', laser: '🔴', yarn: '🧶', duck: '🦆', box: '📦' };
  toyEl.textContent = emojis[toyType] || '🧸';
  toyEl.style.position = 'fixed';
  toyEl.style.left = `${dropX - 15}px`;
  toyEl.style.top = `${dropY - 15}px`;
  toyEl.style.fontSize = '24px';
  toyEl.style.pointerEvents = 'none';
  toyEl.style.zIndex = '2147483646';
  document.body.appendChild(toyEl);

  const floorY = window.innerHeight - 32;
  springAnimate(toyEl, {
    top: `${floorY}px`
  }, {
    stiffness: 150,
    damping: 10
  });

  movement.addToyTarget(dropX - currentSettings.size / 2, toyEl, toyType, () => {
    playWithToy(toyType, toyEl);
  });
}

function playWithToy(toyType: string, toyEl: HTMLElement): void {
  isTemporarilyInteracting = true;

  keyframeAnimate(toyEl, [
    { opacity: '1' },
    { opacity: '0' }
  ], { duration: 0.35 }).then(() => toyEl.remove());

  const dialogs: Record<string, string> = {
    ball: `Wow! A ball! Roll roll roll! ⚽`,
    fish: `Yum! That fish was delicious! 🐟`,
    laser: `Got the red dot! Rawr! 🔴`,
    yarn: `Ooh, a ball of yarn! Unraveling time! 🧶`,
    duck: `Squeak squeak! Squeaky toy ducky! 🦆`,
    box: `If it fits, I sits! Best box ever! 📦`
  };

  showBubble(dialogs[toyType] || "Yay, a toy! 🎉");
  
  const playMood = toyType === 'fish' ? 'celebrating' : 'dancing';
  loadPet(playMood);

  if (toyType === 'fish') {
    playSound('feeding');
    personality.recordInteraction('feed');
    petImg.animate([
      { transform: 'scale(1) translateY(0)' },
      { transform: 'scale(1.4) translateY(-20px)' },
      { transform: 'scale(0.9) translateY(0)' },
      { transform: 'scale(1.2) translateY(-5px)' },
      { transform: 'scale(1) translateY(0)' }
    ], { duration: 600, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' });
  } else {
    playSound('petting');
    personality.recordInteraction('pet');
    petImg.animate([
      { transform: 'scale(1) translateY(0)' },
      { transform: 'scale(1.25) translateY(-35px)' },
      { transform: 'scale(0.85) translateY(5px)' },
      { transform: 'scale(1.15) translateY(-10px)' },
      { transform: 'scale(1) translateY(0)' }
    ], { duration: 800, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' });
  }

  setTimeout(() => {
    isTemporarilyInteracting = false;
    loadPet(emotion.current);
  }, 2000);
}

function handleDragOver(e: DragEvent) {
  if (e.dataTransfer && e.dataTransfer.types.includes('text/plain')) {
    e.preventDefault();
  }
}

function handleDrop(e: DragEvent) {
  if (!e.dataTransfer) return;
  const data = e.dataTransfer.getData('text/plain');
  if (data && data.startsWith('toy-')) {
    e.preventDefault();
    const toyType = data.substring(4);
    handleToyDrop(e.clientX, e.clientY, toyType);
  }
}

window.addEventListener('dragover', handleDragOver);
window.addEventListener('drop', handleDrop);

async function loadAndApplySettings(): Promise<void> {
  const saved = await chrome.storage.local.get('pet-settings');
  if (saved['pet-settings']) {
    currentSettings = { ...currentSettings, ...saved['pet-settings'] };
    personality.disabledEmotions = currentSettings.disabledEmotions || [];
    movement.updateSettings({
      size: currentSettings.size,
      speed: currentSettings.speed
    });
    applyCostume();
  }
}

function handleStorageChanged(changes: Record<string, chrome.storage.StorageChange>) {
  if (!checkContextOrCleanup()) return;
  if (changes['pet-settings']) {
    const newSettings = changes['pet-settings'].newValue;
    if (newSettings) {
      currentSettings = { ...currentSettings, ...newSettings };
      personality.disabledEmotions = currentSettings.disabledEmotions || [];
      movement.updateSettings({
        size: currentSettings.size,
        speed: currentSettings.speed
      });
      applyCostume();
      if (changes['pet-settings'].oldValue?.aiMode !== newSettings.aiMode) {
        hasEvaluatedPageAi = false;
      }
      if (isPetHidden()) {
        hidePet();
      } else {
        showPet();
      }
    }
  }
  if (changes['pet-stats']) {
    const newStats = changes['pet-stats'].newValue;
    const oldStats = changes['pet-stats'].oldValue;
    if (newStats) {
      const oldLevel = oldStats ? oldStats.level : 1;
      if (document.visibilityState === 'visible' && !isPetHidden() && newStats.level > oldLevel) {
        showLevelUpBanner(newStats.level);
        loadPet('celebrating');
        playSound('levelUp');
        isTemporarilyInteracting = true;
        setTimeout(() => {
          isTemporarilyInteracting = false;
          loadPet(emotion.current);
        }, 3000);
      }
    }
  }
}

chrome.storage.onChanged.addListener(handleStorageChanged);

function handleRuntimeMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  if (!checkContextOrCleanup()) return;

  if (message.type === 'get-tab-visibility') {
    const isHidden = sessionStorage.getItem('pet-hidden-in-tab') === 'true';
    sendResponse({ isHidden });
    return false;
  }

  if (message.type === 'toggle-tab-visibility') {
    const hide = message.hide;
    sessionStorage.setItem('pet-hidden-in-tab', hide ? 'true' : 'false');
    if (isPetHidden()) {
      hidePet();
    } else {
      showPet();
    }
    sendResponse({ success: true, isHidden: hide });
    return false;
  }

  if (isPetHidden()) {
    return false;
  }

  if (message.type === 'pet') {
    triggerInteraction('pet', 'love', 2000, "Love it! ❤️");
  } else if (message.type === 'feed') {
    triggerInteraction('feed', 'celebrating', 2500, "Nom nom nom! 🍖");
  } else if (message.type === 'shoo') {
    try {
      petImg.getAnimations().forEach(anim => anim.cancel());
    } catch (err) { console.warn('[Clawd Content] error:', err); }
    personality.recordInteraction('shoo');
    movement.shoo();
    showBubble("Running away! 🏃‍♂️");
    playSound('shoo');
  } else if (message.type === 'http-error') {
    triggers.setHttpError(message.code);
    updateEmotion();
  } else if (message.type === 'navigation') {
    triggers.clearHttpError();
    triggers.clearConsoleError();
    hasEvaluatedPageAi = false;
    currentAiCategory = undefined;
    currentAiSentiment = undefined;
    updateEmotion();
  } else if (message.type === 'sync-pet-state') {
    if (document.visibilityState === 'visible' && !document.hasFocus() && !movement.isDragging) {
      movement.syncState(message.state);
    }
  } else if (message.type === 'check-tab-ai-availability') {
    checkTabAiAvailability()
      .then((availability) => sendResponse({ success: true, availability }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
  return false;
}

chrome.runtime.onMessage.addListener(handleRuntimeMessage);

function handleVisibilityChange() {
  if (!checkContextOrCleanup()) return;
  if (isPetHidden()) return;
  if (document.visibilityState === 'visible') {
    movement.resumeTick();
    safeSendMessage({ type: 'get-pet-state' }, (state: SharedPetState | undefined) => {
      if (state) {
        movement.syncState(state);
      }
    });
  }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

function handleConsoleError() {
  if (checkContextOrCleanup() && !isPetHidden()) {
    updateEmotion();
  }
}

async function init(): Promise<void> {
  await loadAndApplySettings();
  await personality.isLoaded;
  
  if (!checkContextOrCleanup()) return;

  const savedMood = (await chrome.storage.local.get('pet-mood').catch(() => ({}))) as Record<string, any>;
  const initialMood = savedMood['pet-mood'] || 'happy';
  await loadPet(initialMood);

  window.addEventListener('pet-console-error', handleConsoleError);

  if (isPetHidden()) {
    hidePet();
  } else {
    showPet();
  }

  safeSendMessage({ type: 'get-tab-http-error' }, (response: { errorCode?: number } | undefined) => {
    if (response && response.errorCode) {
      triggers.setHttpError(response.errorCode);
    }

    safeSendMessage({ type: 'get-pet-state' }, (sharedState: SharedPetState | undefined) => {
      if (sharedState && sharedState.y !== 0) {
        movement.syncState(sharedState);
      }
      updateEmotion();
      
      if (isPetHidden()) {
        hidePet();
      } else {
        movement.start();
        if (!sessionStorage.getItem('clawd-has-greeted')) {
          const petName = currentSettings.name || 'Clawd';
          showBubble(`Hello! I'm ${petName}! Let's browse together! 🐾`);
          playSound('greeting');
          sessionStorage.setItem('clawd-has-greeted', 'true');
        }
      }
    });
  });
  
  emotionInterval = setInterval(() => {
    if (checkContextOrCleanup() && !isPetHidden()) {
      updateEmotion();

      const context = triggers.snapshot();
      const scheduleEnabled = currentSettings.scheduleEnabled !== false;

      if (!scheduleEnabled) {
        if (Math.random() < 0.15 && !isTemporarilyInteracting) {
          const decisions = [
            () => {
              movement.shoo();
              showBubble("Let's go explore this side! 🏃‍♂️");
            },
            () => {
              movement.chaseCursor(context.mouseX - currentSettings.size / 2);
              showBubble("I'm following you! 👀");
            },
            () => {
              const pageTitle = document.title || 'this page';
              const truncatedTitle = pageTitle.length > 25 ? pageTitle.substring(0, 22) + '...' : pageTitle;
              showBubble(`Analyzing "${truncatedTitle}"... looks cool! 🧐`);
              loadPet('working-thinking');
              isTemporarilyInteracting = true;
              setTimeout(() => {
                isTemporarilyInteracting = false;
                loadPet(emotion.current);
              }, 2500);
            }
          ];
          const chosenDecision = decisions[Math.floor(Math.random() * decisions.length)];
          chosenDecision();
        }
      } else {
        let isFocusActive = currentSettings.focusActive || false;
        const currentHour = new Date().getHours();
        if (!isFocusActive && currentSettings.focusStartHour !== undefined && currentSettings.focusEndHour !== undefined) {
          const start = currentSettings.focusStartHour;
          const end = currentSettings.focusEndHour;
          if (start < end) {
            isFocusActive = currentHour >= start && currentHour < end;
          } else {
            isFocusActive = currentHour >= start || currentHour < end;
          }
        }

        if (!isFocusActive && context.idleSeconds >= 10 && Math.random() < 0.15 && !isTemporarilyInteracting) {
          movement.chaseCursor(context.mouseX - currentSettings.size / 2);
          const dialogs = ["Whatcha doing over there? 👀", "Let me see! 🧐", "Watchu looking at? 👁️"];
          showBubble(dialogs[Math.floor(Math.random() * dialogs.length)]);
        }
      }
    }
  }, 3000);
}

async function checkTabAiAvailability(): Promise<'readily' | 'after-download' | 'no'> {
  try {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'check-local-ai-status' }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success) {
          resolve('no');
        } else {
          const state = res.state;
          if (state === 'ready') {
            resolve('readily');
          } else if (state === 'loading') {
            resolve('after-download');
          } else {
            resolve('no');
          }
        }
      });
    });
  } catch (err) {
    console.error('[Clawd AI] Failed to check local AI availability:', err);
    return 'no';
  }
}

init();
