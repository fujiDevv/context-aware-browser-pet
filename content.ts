import { MovementEngine } from './src/movement';
import { EmotionEngine } from './src/emotion';
import { TriggerDetector } from './src/triggers';
import { PersonalitySystem } from './src/personality';
import { getAiEmotion, setBridgeToken } from './src/ai';
import { PetSettings, SharedPetState, PetMessage } from './src/types';
import { springAnimate, keyframeAnimate } from './src/animate';
import { PERSONA_AUTONOMOUS_DIALOGUES } from './src/dialogues';
import { ViewManager } from './src/view';
import { STORAGE_KEYS } from './src/constants';
import { getDominantTrait, detectPageCategory } from './src/rules';

const BRIDGE_TOKEN = Math.random().toString(36).substring(2) + Date.now().toString(36);
setBridgeToken(BRIDGE_TOKEN);

(function injectMainWorld() {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('main_world.js');
    script.dataset.token = BRIDGE_TOKEN;
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (e) {
    console.warn('[Clawd Content] Main world injection failed:', e);
  }
})();

let syncInterval: ReturnType<typeof setInterval> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

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

  const volume = currentSettings.soundVolume !== undefined ? currentSettings.soundVolume : 0.5;

  safeSendMessage({
    type: 'play-sound',
    filename,
    volume
  });
}

let isOrphaned = false;

function cleanupOrphanedScript(): void {
  if (isOrphaned) return;
  isOrphaned = true;

  if (syncInterval) clearInterval(syncInterval);
  if (idleTimer) clearTimeout(idleTimer);
  if (debounceTimeout) clearTimeout(debounceTimeout);

  if (isInitialized) {
    try {
      movement.stop();
    } catch (e) { /* ignore */ }

    try {
      triggers.cleanup();
    } catch (e) { /* ignore */ }

    try {
      personality.destroy();
    } catch (e) { /* ignore */ }

    try {
      view.destroy();
    } catch (e) { /* ignore */ }
  }

  window.removeEventListener('dragover', handleDragOver);
  window.removeEventListener('drop', handleDrop);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('pet-console-error', handleConsoleError);

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.removeListener(handleStorageChanged);
    }
  } catch (e) { /* ignore */ }

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
    }
  } catch (e) { /* ignore */ }

  console.log("Browser Pet: Old extension context invalidated. Injected mascot cleaned up.");
}

function checkContextOrCleanup(): boolean {
  if (isOrphaned) return false;
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    cleanupOrphanedScript();
    return false;
  }
  return true;
}

function safeSendMessage(message: PetMessage, callback?: (response: any) => void): void {
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

let currentSettings: PetSettings = { size: 128, speed: 1.2, aiMode: false, apiKey: '', soundEnabled: true, soundVolume: 0.5, scheduleEnabled: true };
let hasEvaluatedPageAi = false;
let currentAiCategory: string | undefined = undefined;
let currentAiSentiment: string | undefined = undefined;
let isTemporarilyInteracting = false;
let interactionTimeout: ReturnType<typeof setTimeout> | null = null;
let customReactionPlayCount = 0;

let lastSentOriginEmotion = '';
let lastSentOriginDialogue = '';

let isCurrentlyHidden = false;

function isPetHidden(): boolean {
  const isBlockedDomain = currentSettings.blockedDomains?.includes(window.location.hostname);
  const isHiddenInTab = sessionStorage.getItem('pet-hidden-in-tab') === 'true';
  return !!(isBlockedDomain || isHiddenInTab);
}

function hidePet(): void {
  isCurrentlyHidden = true;
  if (isInitialized) {
    view.hide();
    movement.stop();
  }
}

function showPet(): void {
  isCurrentlyHidden = false;
  if (!isInitialized) {
    actuallyInit();
  } else {
    view.show();
    movement.start();
  }
}

function debouncedUpdateEmotion(delay = 500): void {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    updateEmotion();
    resetIdleTimer();
  }, delay);
}

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    handleIdleBehavior();
  }, 10_000); // Check for minor idle behaviors every 10s
}

function handleIdleBehavior(): void {
  if (!checkContextOrCleanup()) return;
  if (!isInitialized) return;
  if (isPetHidden()) return;
  if (isTemporarilyInteracting) return;

  const context = triggers.snapshot();
  const scheduleEnabled = currentSettings.scheduleEnabled !== false;

  if (!scheduleEnabled) {
    if (Math.random() < 0.2) {
      const decisions = [
        () => {
          isTemporarilyInteracting = true;
          loadPet(Math.random() < 0.5 ? 'running' : 'flying');
          movement.shoo(() => {
            isTemporarilyInteracting = false;
            loadPet(emotion.current);
          });
          view.showBubble("Let's go explore this side! 🏃‍♂️");
        },
        () => {
          movement.chaseCursor(context.mouseX - currentSettings.size / 2);
          view.showBubble("I'm following you! 👀");
        },
        () => {
          const pageTitle = document.title || 'this page';
          const truncatedTitle = pageTitle.length > 25 ? pageTitle.substring(0, 22) + '...' : pageTitle;
          view.showBubble(`Analyzing "${truncatedTitle}"... looks cool! 🧐`);
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

    if (!isFocusActive) {
      if (context.idleSeconds >= 10 && context.idleSeconds < 45 && Math.random() < 0.15) {
        movement.chaseCursor(context.mouseX - currentSettings.size / 2);
        const dialogs = ["Whatcha doing over there? 👀", "Let me see! 🧐", "Watchu looking at? 👁️"];
        view.showBubble(dialogs[Math.floor(Math.random() * dialogs.length)]);
      } else if (context.idleSeconds >= 45) {
        updateEmotion(); // Let engine pick deep idle (skateboard, sleeping, etc)
      }
    }
  }

  // Continue checking if still idle
  if (context.idleSeconds >= 10) {
    resetIdleTimer();
  }
}

let isInitialized = false;
let triggers: TriggerDetector;
let personality: PersonalitySystem;
let emotion: EmotionEngine;
let view: ViewManager;
let movement: MovementEngine;

function ensureInitialized(): void {
  if (isInitialized) return;
  isInitialized = true;

  personality = new PersonalitySystem(() => { });
  emotion = new EmotionEngine(personality);
  triggers = new TriggerDetector(() => {
    debouncedUpdateEmotion();
  }, BRIDGE_TOKEN);

  view = new ViewManager({
    onPetClick: (e) => {
      e.stopPropagation();
      if (movement.wasDragged) {
        movement.wasDragged = false;
        return;
      }
      triggerInteraction('pet', 'love', 2000, "Ah, thank you! ❤️");
    },
    onPetDoubleClick: (e) => {
      e.stopPropagation();
      triggerInteraction('feed', 'celebrating', 2500, "Yum! That was delicious! 🍖");
    },
    onPetContextMenu: (e) => {
      handleShoo(e);
    },
    onPetMouseDown: (e) => {
      if (e.button === 2) {
        handleShoo(e);
      }
    },
    onPetMouseEnter: () => {
      if (isPetHidden()) return;
      view.getPetImg().animate([
        { transform: 'scale(1) rotate(0deg)' },
        { transform: 'scale(1.2) rotate(6deg)' },
        { transform: 'scale(1.12) rotate(4deg)' },
        { transform: 'scale(1.15) rotate(5deg)' }
      ], { duration: 300, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', fill: 'forwards' });
    },
    onPetMouseLeave: () => {
      if (isPetHidden()) return;
      view.getPetImg().animate([
        { transform: 'scale(1.15) rotate(5deg)' },
        { transform: 'scale(0.97) rotate(-1deg)' },
        { transform: 'scale(1) rotate(0deg)' }
      ], { duration: 300, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', fill: 'forwards' });
    }
  });

  movement = new MovementEngine(view.getContainer(), {
    size: currentSettings.size,
    speed: currentSettings.speed
  });

  personality.disabledEmotions = currentSettings.disabledEmotions || [];
  view.applyCostume(currentSettings.costume);

  movement.onLanding = () => {
    if (isPetHidden()) return;

    isTemporarilyInteracting = true;
    if (interactionTimeout) clearTimeout(interactionTimeout);

    // Play impact/crying sound and show initial "ouch" face
    playSound('sad');
    loadPet('sad');

    const petImg = view.getPetImg();
    // Physical landing squash/stretch
    petImg.animate([
      { transform: 'scale(1.3, 0.7)', offset: 0 },
      { transform: 'scale(0.8, 1.2)', offset: 0.3 },
      { transform: 'scale(1.1, 0.9)', offset: 0.6 },
      { transform: 'scale(1, 1)', offset: 1 }
    ], { duration: 500, easing: 'ease-out' });

    // Daze for 1 second, then "dust off" (sweep)
    interactionTimeout = setTimeout(() => {
      loadPet('working-sweeping');

      // Reset after sweep duration
      interactionTimeout = setTimeout(() => {
        isTemporarilyInteracting = false;
        loadPet(emotion.current);
      }, 1500);
    }, 1000);
  };
}

async function loadPet(name: string): Promise<void> {
  if (!isInitialized || isOrphaned) return;
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

  view.setEmotion(assetName);
  
  if (!checkContextOrCleanup()) return;

  try {
    chrome.storage.local.set({ [STORAGE_KEYS.MOOD]: name }).catch((e) => {
      if (e.message && e.message.includes('context invalidated')) {
        cleanupOrphanedScript();
      } else {
        console.warn('[Clawd Content] storage.set error:', e);
      }
    });
  } catch (e: any) {
    if (e.message && e.message.includes('context invalidated')) {
      cleanupOrphanedScript();
    } else {
      console.warn('[Clawd Content] error:', e);
    }
  }
}

async function updateEmotion(): Promise<void> {
  if (!checkContextOrCleanup()) return;
  if (!isInitialized) return;
  if (isPetHidden()) return;
  if (isTemporarilyInteracting) return;

  const context = triggers.snapshot();
  const scheduleEnabled = currentSettings.scheduleEnabled !== false;

  if (scheduleEnabled && !currentSettings.aiMode) {
    const metaDesc = (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content;
    const ogType = (document.querySelector('meta[property="og:type"]') as HTMLMetaElement | null)?.content;
    const siteCategory = detectPageCategory(window.location.href, context.pageTitle, ogType || undefined, metaDesc || undefined);
    if (siteCategory !== 'general') {
      personality.recordSiteVisit(siteCategory);
    }
  } else if (scheduleEnabled && currentSettings.aiMode && currentAiCategory) {
    personality.recordSiteVisit(currentAiCategory, currentAiSentiment);
  }

  let nextEmotion = 'happy';
  let aiComment: string | undefined = undefined;

  const trait = getDominantTrait(personality.stats.siteCategoryCounts);
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

  // Detect metered connection or slow network for "Lite Mode" fallback
  const isMetered = navigator.connection?.saveData === true;
  let aiStatus = 'no';
  if (currentSettings.aiMode) {
    aiStatus = await checkTabAiAvailability();
  }
  const useLiteMode = !currentSettings.aiMode || isMetered || aiStatus !== 'readily';

  if (customReaction && !isFocusActive) {
    nextEmotion = customReaction.emotion;
    if (customReaction.dialogue) {
      aiComment = customReaction.dialogue;
    }
  } else if (isFocusActive) {
    nextEmotion = await emotion.evaluate(context, scheduleEnabled, currentSettings.seasonalEnabled !== false, currentSettings);
  } else if (scheduleEnabled && currentSettings.aiMode && !useLiteMode && !context.lastHttpError && context.idleSeconds < 60) {
    if (!hasEvaluatedPageAi) {
      if (!checkContextOrCleanup()) return;

      try {
        const storedTime = await chrome.storage.local.get(STORAGE_KEYS.LAST_AI_COMMENT_TIME);
        const lastCommentTime = storedTime[STORAGE_KEYS.LAST_AI_COMMENT_TIME] || 0;
        const freqSec = currentSettings.commentFrequency ?? 60;
        const now = Date.now();

        if (now - lastCommentTime >= freqSec * 1000) {
          if (!checkContextOrCleanup()) return;
          await chrome.storage.local.set({ [STORAGE_KEYS.LAST_AI_COMMENT_TIME]: now });

          const metaDesc = (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content;
          const statsContext = `Happiness: ${personality.stats.happiness}%, Energy: ${personality.stats.energy}%, Focus: ${personality.stats.focus}%, Personality Trait: ${trait}`;
          const result = await getAiEmotion(context.pageTitle, metaDesc, window.location.href, currentSettings.apiKey, currentSettings.persona || 'default', statsContext, currentSettings.sentimentSensitivity);
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
      } catch (e: any) {
        if (e.message && e.message.includes('context invalidated')) {
          cleanupOrphanedScript();
          return;
        }
        console.warn('[Clawd Content] updateEmotion AI error:', e);
        hasEvaluatedPageAi = true;
        nextEmotion = await emotion.evaluate(context, scheduleEnabled, currentSettings.seasonalEnabled !== false, currentSettings);
      }
    } else {
      nextEmotion = await emotion.evaluate(context, scheduleEnabled, currentSettings.seasonalEnabled !== false, currentSettings);
    }
  } else {
    // Falls back to Regex-based classifier (Lite Mode) automatically
    nextEmotion = await emotion.evaluate(context, scheduleEnabled, currentSettings.seasonalEnabled !== false, currentSettings);

    // Optional: Add a subtle notification bubble if AI was intended but bypassed due to Lite Mode
    if (currentSettings.aiMode && useLiteMode && !hasEvaluatedPageAi && !sessionStorage.getItem('clawd-lite-mode-notified')) {
      const reason = isMetered ? "on a metered connection" : "still loading my big brain";
      console.log(`[Clawd] Lite Mode active because you are ${reason}. Using regex-based detection instead!`);
      sessionStorage.setItem('clawd-lite-mode-notified', 'true');
    }
  }
  if (nextEmotion !== emotion.current || aiComment || !view.getPetImg().src) {
    emotion.current = nextEmotion;
    loadPet(nextEmotion);

    if (aiComment) {
      view.showBubble(aiComment);
    } else {
      triggerContextDialogue(nextEmotion);
    }
  } else {
    // If emotion hasn't changed, still allow a small chance for ambient dialogue
    if (Math.random() < 0.05) {
      triggerContextDialogue(nextEmotion);
    }
  }

  // Unified Consciousness: Broadcast state to other tabs of the same origin
  const hostname = window.location.hostname;
  if (nextEmotion !== lastSentOriginEmotion || (aiComment && aiComment !== lastSentOriginDialogue)) {
    lastSentOriginEmotion = nextEmotion;
    lastSentOriginDialogue = aiComment || '';
    safeSendMessage({
      type: 'update-origin-pet-state',
      hostname,
      emotion: nextEmotion,
      dialogue: aiComment
    });
  }

  if (nextEmotion !== emotion.current || aiComment) {
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
    const trait = getDominantTrait(personality.stats.siteCategoryCounts);

    if (stats.energy < 30 && Math.random() < 0.5) {
      const options = personaDialogs.lowEnergy || PERSONA_AUTONOMOUS_DIALOGUES.default.lowEnergy;
      view.showBubble(options[Math.floor(Math.random() * options.length)]);
      return;
    }

    if (stats.focus > 80 && Math.random() < 0.4) {
      const options = personaDialogs.highFocus || PERSONA_AUTONOMOUS_DIALOGUES.default.highFocus;
      view.showBubble(options[Math.floor(Math.random() * options.length)]);
      return;
    }

    if (mood === 'working-thinking' || mood === 'happy' || mood === 'love' || mood === 'cool' || mood === 'reading') {
      const traitOptions = personaDialogs[trait] || PERSONA_AUTONOMOUS_DIALOGUES.default[trait];
      if (traitOptions) {
        view.showBubble(traitOptions[Math.floor(Math.random() * traitOptions.length)]);
        return;
      }
    }
  }

  if (!scheduleEnabled) {
    const options = personaDialogs[mood];
    if (options) {
      view.showBubble(options[Math.floor(Math.random() * options.length)]);
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
    view.showBubble(dialogs[mood]);
  }
}

let lastShooTime = 0;
function handleShoo(e: Event) {
  e.preventDefault();
  e.stopPropagation();

  const now = Date.now();
  if (now - lastShooTime < 500) return;
  lastShooTime = now;

  try {
    view.getPetImg().getAnimations().forEach(anim => anim.cancel());
  } catch (err) { console.warn('[Clawd Content] handleShoo animations cancel error:', err); }

  isTemporarilyInteracting = true;
  personality.recordInteraction('shoo');
  
  const shooEmotion = Math.random() < 0.5 ? 'running' : 'flying';
  loadPet(shooEmotion);
  
  movement.shoo(() => {
    isTemporarilyInteracting = false;
    loadPet(emotion.current);
  });

  view.showBubble("Okay, okay, moving! 🏃‍♂️");
  playSound('shoo');
}

function triggerInteraction(action: string, temporaryMood: string, duration: number, message: string): void {
  isTemporarilyInteracting = true;
  if (interactionTimeout) clearTimeout(interactionTimeout);

  try {
    view.getPetImg().getAnimations().forEach(anim => anim.cancel());
  } catch (err) { console.warn('[Clawd Content] triggerInteraction animations cancel error:', err); }

  personality.recordInteraction(action);
  loadPet(temporaryMood);
  view.showBubble(message);

  // Unified Consciousness: Sync interaction to same-origin tabs
  const hostname = window.location.hostname;
  safeSendMessage({
    type: 'update-origin-pet-state',
    hostname,
    emotion: temporaryMood,
    dialogue: message
  });

  const petImg = view.getPetImg();
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

function handleToyDrop(dropX: number, dropY: number, toyType: string): void {
  const toyEl = document.createElement('div');
  toyEl.className = 'browser-pet-toy';
  const emojis: Record<string, string> = { ball: '⚽', fish: '🐟', laser: '🔴', yarn: '🧶', duck: '🦆', box: '📦' };
  toyEl.textContent = emojis[toyType] || '🧸';
  toyEl.style.left = `${dropX - 15}px`;
  toyEl.style.top = `${dropY - 15}px`;
  view.addItem(toyEl);

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

  view.showBubble(dialogs[toyType] || "Yay, a toy! 🎉");

  const playMood = toyType === 'fish' ? 'celebrating' : 'dancing';
  loadPet(playMood);

  const petImg = view.getPetImg();
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
    e.dataTransfer.dropEffect = 'copy';
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
  if (!checkContextOrCleanup()) return;
  try {
    const saved = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    if (saved[STORAGE_KEYS.SETTINGS]) {
      currentSettings = { ...currentSettings, ...saved[STORAGE_KEYS.SETTINGS] };
      if (isInitialized) {
        personality.disabledEmotions = currentSettings.disabledEmotions || [];
        movement.updateSettings({
          size: currentSettings.size,
          speed: currentSettings.speed
        });
        view.applyCostume(currentSettings.costume);
      }
    }
  } catch (e: any) {
    if (e.message && e.message.includes('context invalidated')) {
      cleanupOrphanedScript();
    }
  }
}

function handleStorageChanged(changes: Record<string, chrome.storage.StorageChange>) {
  if (!checkContextOrCleanup()) return;
  if (changes[STORAGE_KEYS.SETTINGS]) {
    const newSettings = changes[STORAGE_KEYS.SETTINGS].newValue;
    if (newSettings) {
      currentSettings = { ...currentSettings, ...newSettings };
      if (isInitialized) {
        personality.disabledEmotions = currentSettings.disabledEmotions || [];
        movement.updateSettings({
          size: currentSettings.size,
          speed: currentSettings.speed
        });
        view.applyCostume(currentSettings.costume);
      }
      if (changes[STORAGE_KEYS.SETTINGS].oldValue?.aiMode !== newSettings.aiMode) {
        hasEvaluatedPageAi = false;
      }
      if (isPetHidden()) {
        hidePet();
      } else {
        showPet();
      }
    }
  }
  if (changes[STORAGE_KEYS.STATS]) {
    const newStats = changes[STORAGE_KEYS.STATS].newValue;
    const oldStats = changes[STORAGE_KEYS.STATS].oldValue;
    if (newStats) {
      const oldLevel = oldStats ? oldStats.level : 1;
      if (isInitialized && document.visibilityState === 'visible' && !isPetHidden() && newStats.level > oldLevel) {
        view.showLevelUpBanner(newStats.level, currentSettings.name || 'Clawd');
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

function handleRuntimeMessage(message: PetMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
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

  // Visual/Interactive messages below this line require initialization
  if (!isInitialized && ['pet', 'feed', 'shoo', 'sync-pet-state', 'sync-origin-pet-state'].includes(message.type)) {
     actuallyInit();
  }

  if (message.type === 'pet') {
    if (isInitialized) triggerInteraction('pet', 'love', 2000, "Love it! ❤️");
  } else if (message.type === 'feed') {
    if (isInitialized) triggerInteraction('feed', 'celebrating', 2500, "Nom nom nom! 🍖");
  } else if (message.type === 'shoo') {
    if (isInitialized) {
      try {
        view.getPetImg().getAnimations().forEach(anim => anim.cancel());
      } catch (err) { console.warn('[Clawd Content] handleRuntimeMessage shoo animations cancel error:', err); }

      isTemporarilyInteracting = true;
      personality.recordInteraction('shoo');

      const shooEmotion = Math.random() < 0.5 ? 'running' : 'flying';
      loadPet(shooEmotion);

      movement.shoo(() => {
        isTemporarilyInteracting = false;
        loadPet(emotion.current);
      });

      view.showBubble("Running away! 🏃‍♂️");
      playSound('shoo');
    }
  }
 else if (message.type === 'http-error') {
    if (isInitialized) {
      triggers.setHttpError(message.code);
      updateEmotion();
    }
  } else if (message.type === 'navigation') {
    if (isInitialized) {
      triggers.clearHttpError();
      triggers.clearConsoleError();
      hasEvaluatedPageAi = false;
      currentAiCategory = undefined;
      currentAiSentiment = undefined;
      updateEmotion();
    }
  } else if (message.type === 'sync-pet-state') {
    if (isInitialized && document.visibilityState === 'visible' && !document.hasFocus() && !movement.isDragging) {
      movement.syncState(message.state);
    }
  } else if (message.type === 'sync-origin-pet-state') {
    if (isInitialized) {
      const { emotion: syncedEmotion, dialogue: syncedDialogue } = message.state;
      if (syncedEmotion !== emotion.current) {
        emotion.current = syncedEmotion;
        loadPet(syncedEmotion);
      }
      if (syncedDialogue) {
        view.showBubble(syncedDialogue);
      }
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
    if (!isInitialized) {
      actuallyInit();
    } else {
      movement.resumeTick();
      resetIdleTimer();
      debouncedUpdateEmotion(100);
      safeSendMessage({ type: 'get-pet-state' }, (state: SharedPetState | undefined) => {
        if (state) {
          movement.syncState(state);
        }
      });
    }
  }
}

function handleWindowFocus() {
  if (!checkContextOrCleanup()) return;
  if (isPetHidden()) return;
  resetIdleTimer();
  debouncedUpdateEmotion(100);
}

document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('focus', handleWindowFocus);

function handleConsoleError() {
  if (checkContextOrCleanup() && !isPetHidden()) {
    updateEmotion();
  }
}

async function init(): Promise<void> {
  await loadAndApplySettings();
  
  if (!checkContextOrCleanup()) return;

  if (document.visibilityState === 'visible') {
    actuallyInit();
  } else {
    // Basic setup so we can still receive messages or handle visibility changes
    console.log("[Clawd Content] Tab is backgrounded. Delaying mascot initialization.");
  }
}

async function actuallyInit(): Promise<void> {
  if (isInitialized || isOrphaned) return;
  ensureInitialized();

  await personality.isLoaded;
  
  if (!checkContextOrCleanup()) return;

  view.preloadAssets();

  try {
    const savedMood = (await chrome.storage.local.get(STORAGE_KEYS.MOOD).catch(() => ({}))) as Record<string, any>;
    const initialMood = savedMood[STORAGE_KEYS.MOOD] || 'happy';
    await loadPet(initialMood);
  } catch (e: any) {
    if (e.message && e.message.includes('context invalidated')) {
      cleanupOrphanedScript();
      return;
    }
  }

  window.addEventListener('pet-console-error', handleConsoleError);

  if (isPetHidden()) {
    hidePet();
  } else {
    showPet();
  }

  // Unified Consciousness: Fetch initial origin state
  safeSendMessage({ type: 'get-origin-pet-state', hostname: window.location.hostname }, (originState) => {
    if (isOrphaned) return;
    if (originState && (Date.now() - originState.lastUpdateTime < 30000)) {
      emotion.current = originState.emotion;
      loadPet(originState.emotion);
      if (originState.dialogue) {
        view.showBubble(originState.dialogue);
      }
    }

    safeSendMessage({ type: 'get-tab-http-error' }, (response: { errorCode?: number } | undefined) => {
      if (isOrphaned) return;
      if (response && response.errorCode) {
        triggers.setHttpError(response.errorCode);
      }

      safeSendMessage({ type: 'get-pet-state' }, (sharedState: SharedPetState | undefined) => {
        if (isOrphaned) return;
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
            view.showBubble(`Hello! I'm ${petName}! Let's browse together! 🐾`);
            playSound('greeting');
            sessionStorage.setItem('clawd-has-greeted', 'true');

            // Lite Mode Notification (AI Downloading)
            if (currentSettings.aiMode) {
              checkTabAiAvailability().then(status => {
                if (isOrphaned) return;
                if (status === 'after-download') {
                  setTimeout(() => {
                    if (isOrphaned) return;
                    view.showBubble("I'm still downloading my high-tech brain, using my backup instincts for now! 🧠", 5000);
                  }, 4000);
                }
              });
            }
          }
        }
      });
    });
  });

  // Initial check
  updateEmotion();
  resetIdleTimer();
}

async function checkTabAiAvailability(): Promise<'readily' | 'after-download' | 'no'> {
  if (!checkContextOrCleanup()) return 'no';
  try {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'check-local-ai-status' }, (res) => {
        if (chrome.runtime.lastError) {
          if (chrome.runtime.lastError.message && chrome.runtime.lastError.message.includes('context invalidated')) {
            cleanupOrphanedScript();
          }
          resolve('no');
          return;
        }
        if (!res || !res.success) {
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
  } catch (err: any) {
    if (err.message && err.message.includes('context invalidated')) {
      cleanupOrphanedScript();
    } else {
      console.error('[Clawd AI] Failed to check local AI availability:', err);
    }
    return 'no';
  }
}

init();
