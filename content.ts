import { MovementEngine } from './src/movement';
import { EmotionEngine } from './src/emotion';
import { TriggerDetector } from './src/triggers';
import { PersonalitySystem } from './src/personality';
import { getAiEmotion } from './src/ai';
import { PetSettings, SharedPetState } from './src/types';

let syncInterval: any = null;
let emotionInterval: any = null;

let audioCtx: AudioContext | null = null;
let resumePromise: Promise<void> | null = null;

function unlockAudio(): void {
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
  } catch (e) {}
}

function cleanUpListeners(): void {
  window.removeEventListener('click', unlockAudio, { capture: true });
  window.removeEventListener('keydown', unlockAudio, { capture: true });
  window.removeEventListener('touchstart', unlockAudio, { capture: true });
}

window.addEventListener('click', unlockAudio, { capture: true, passive: true });
window.addEventListener('keydown', unlockAudio, { capture: true, passive: true });
window.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });

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

  if (resumePromise) {
    await resumePromise;
  }

  if (!audioCtx || audioCtx.state === 'suspended') {
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
  clearInterval(syncInterval);
  clearInterval(emotionInterval);
  movement.stop();
  try {
    container.remove();
  } catch (e) {}
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
    transition: left 0.1s linear, top 0.1s linear;
  }
  #browser-pet-img {
    pointer-events: auto;
    cursor: pointer;
    image-rendering: pixelated;
    transition: filter 0.2s ease;
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
`;
document.head.appendChild(style);

const container = document.createElement('div');
container.id = 'browser-pet-root';
document.body.appendChild(container);

const petImg = document.createElement('img');
petImg.id = 'browser-pet-img';
container.appendChild(petImg);

const bubble = document.createElement('div');
bubble.className = 'pet-speech-bubble';
container.appendChild(bubble);

let currentSettings: PetSettings = { size: 64, speed: 1.2, aiMode: false, apiKey: '', soundEnabled: true, soundVolume: 0.5 };
let hasEvaluatedPageAi = false;
let isTemporarilyInteracting = false;
let interactionTimeout: any = null;
let bubbleTimeout: any = null;

const triggers = new TriggerDetector();
const personality = new PersonalitySystem(() => {});
const emotion = new EmotionEngine(personality);
const movement = new MovementEngine(container, {
  size: currentSettings.size,
  speed: currentSettings.speed
});

async function loadPet(name: string): Promise<void> {
  petImg.src = chrome.runtime.getURL(`assets/pets/clawd-${name}.svg`);
}

function showBubble(text: string, duration = 3000): void {
  clearTimeout(bubbleTimeout);
  bubble.textContent = text;
  bubble.classList.add('show');
  bubbleTimeout = setTimeout(() => {
    bubble.classList.remove('show');
  }, duration);
}

async function updateEmotion(): Promise<void> {
  if (!checkContextOrCleanup()) return;
  if (isTemporarilyInteracting) return;

  const context = triggers.snapshot();
  
  const siteCategory = emotion._classifySite(context.hostname);
  if (siteCategory !== 'default') {
    personality.recordSiteVisit(siteCategory);
  }

  let nextEmotion = 'happy';

  if (currentSettings.aiMode && currentSettings.apiKey && !context.lastHttpError && context.idleSeconds < 60) {
    if (!hasEvaluatedPageAi) {
      const metaDesc = (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content;
      nextEmotion = await getAiEmotion(context.pageTitle, metaDesc, currentSettings.apiKey);
      hasEvaluatedPageAi = true;
    } else {
      nextEmotion = await emotion.evaluate(context);
    }
  } else {
    nextEmotion = await emotion.evaluate(context);
  }

  if (nextEmotion !== emotion.current || !petImg.src) {
    emotion.current = nextEmotion;
    loadPet(nextEmotion);
    
    triggerContextDialogue(nextEmotion);

    if (nextEmotion === 'waving') {
      playSound('greeting');
    } else if (['sad', 'crying'].includes(nextEmotion)) {
      playSound('sad');
    } else if (nextEmotion === 'sleeping') {
      playSound('sleeping');
    } else if (['working-thinking', 'coding', 'working-typing'].includes(nextEmotion)) {
      playSound('thinking');
    }
  }
}

function triggerContextDialogue(mood: string): void {
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
    'working-debugger': "Finding those sneaky bugs! 🐛",
    'crying': "I'm so sad... please pet me! 😢",
    'sad': "Feeling a bit down... 🥺"
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

petImg.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  personality.recordInteraction('shoo');
  movement.shoo();
  showBubble("Okay, okay, moving! 🏃‍♂️");
  playSound('shoo');
});

function triggerInteraction(action: string, temporaryMood: string, duration: number, message: string): void {
  isTemporarilyInteracting = true;
  clearTimeout(interactionTimeout);
  
  personality.recordInteraction(action);
  loadPet(temporaryMood);
  showBubble(message);

  if (action === 'pet') {
    playSound('petting');
  } else if (action === 'feed') {
    playSound('feeding');
  }
  
  interactionTimeout = setTimeout(() => {
    isTemporarilyInteracting = false;
    loadPet(emotion.current);
  }, duration);
}

function applyCostume(): void {
  const existingHat = container.querySelector('#browser-pet-hat') as HTMLImageElement | null;
  if (!currentSettings.costume || currentSettings.costume === 'none') {
    if (existingHat) {
      existingHat.remove();
    }
    return;
  }

  let hat = existingHat;
  if (!hat) {
    hat = document.createElement('img');
    hat.id = 'browser-pet-hat';
    container.appendChild(hat);
  }
  hat.src = chrome.runtime.getURL(`assets/pets/hat-${currentSettings.costume}.svg`);
  movement._apply();
}

function handleToyDrop(dropX: number, dropY: number, toyType: string): void {
  if (movement.toyTarget) {
    try {
      movement.toyTarget.element.remove();
    } catch (e) {}
  }

  const toyEl = document.createElement('div');
  toyEl.className = 'browser-pet-toy';
  const emojis: Record<string, string> = { ball: '⚽', fish: '🐟', laser: '🔴' };
  toyEl.textContent = emojis[toyType] || '🧸';
  toyEl.style.position = 'fixed';
  toyEl.style.left = `${dropX - 15}px`;
  toyEl.style.top = `${dropY - 15}px`;
  toyEl.style.fontSize = '24px';
  toyEl.style.pointerEvents = 'none';
  toyEl.style.zIndex = '2147483646';
  toyEl.style.transition = 'top 0.8s cubic-bezier(0.55, 0.055, 0.675, 0.19)';
  document.body.appendChild(toyEl);

  // Force reflow and animate fall
  toyEl.getBoundingClientRect();
  const floorY = window.innerHeight - 32;
  toyEl.style.top = `${floorY}px`;

  movement.setToyTarget(dropX - currentSettings.size / 2, toyEl, toyType, () => {
    playWithToy(toyType, toyEl);
  });
}

function playWithToy(toyType: string, toyEl: HTMLElement): void {
  isTemporarilyInteracting = true;

  toyEl.style.opacity = '0';
  toyEl.style.transition = 'opacity 0.3s ease';
  setTimeout(() => toyEl.remove(), 300);

  const dialogs: Record<string, string> = {
    ball: `Wow! A ball! Roll roll roll! ⚽`,
    fish: `Yum! That fish was delicious! 🐟`,
    laser: `Got the red dot! Rawr! 🔴`
  };

  showBubble(dialogs[toyType] || "Yay, a toy! 🎉");
  
  const playMood = toyType === 'fish' ? 'celebrating' : 'dancing';
  loadPet(playMood);

  if (toyType === 'fish') {
    playSound('feeding');
    personality.recordInteraction('feed');
  } else {
    playSound('petting');
    personality.recordInteraction('pet');
  }

  setTimeout(() => {
    isTemporarilyInteracting = false;
    loadPet(emotion.current);
  }, 2000);
}

// Window Drag and Drop Listeners for Toys
window.addEventListener('dragover', (e: DragEvent) => {
  if (e.dataTransfer && e.dataTransfer.types.includes('text/plain')) {
    e.preventDefault();
  }
});

window.addEventListener('drop', (e: DragEvent) => {
  if (!e.dataTransfer) return;
  const data = e.dataTransfer.getData('text/plain');
  if (data && data.startsWith('toy-')) {
    e.preventDefault();
    const toyType = data.substring(4);
    handleToyDrop(e.clientX, e.clientY, toyType);
  }
});

async function loadAndApplySettings(): Promise<void> {
  const saved = await chrome.storage.local.get('pet-settings');
  if (saved['pet-settings']) {
    currentSettings = { ...currentSettings, ...saved['pet-settings'] };
    movement.updateSettings({
      size: currentSettings.size,
      speed: currentSettings.speed
    });
    applyCostume();
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (!checkContextOrCleanup()) return;
  if (changes['pet-settings']) {
    const newSettings = changes['pet-settings'].newValue;
    if (newSettings) {
      currentSettings = { ...currentSettings, ...newSettings };
      movement.updateSettings({
        size: currentSettings.size,
        speed: currentSettings.speed
      });
      applyCostume();
      if (changes['pet-settings'].oldValue?.aiMode !== newSettings.aiMode) {
        hasEvaluatedPageAi = false;
      }
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (!checkContextOrCleanup()) return;
  if (message.type === 'pet') {
    triggerInteraction('pet', 'love', 2000, "Love it! ❤️");
  } else if (message.type === 'feed') {
    triggerInteraction('feed', 'celebrating', 2500, "Nom nom nom! 🍖");
  } else if (message.type === 'shoo') {
    personality.recordInteraction('shoo');
    movement.shoo();
    showBubble("Running away! 🏃‍♂️");
    playSound('shoo');
  } else if (message.type === 'http-error') {
    triggers.setHttpError(message.code);
    updateEmotion();
  } else if (message.type === 'navigation') {
    triggers.clearHttpError();
    hasEvaluatedPageAi = false;
    updateEmotion();
  } else if (message.type === 'sync-pet-state') {
    if (document.visibilityState === 'visible' && !document.hasFocus() && !movement.isDragging) {
      movement.syncState(message.state);
      if (message.state.emotion && message.state.emotion !== emotion.current) {
        emotion.current = message.state.emotion;
        loadPet(message.state.emotion);
      }
    }
  }
});

window.addEventListener('pet-level-up', (e: Event) => {
  const customEvent = e as CustomEvent<{ level: number }>;
  const petName = currentSettings.name || 'Clawd';
  showBubble(`Level UP! ${petName} is now level ${customEvent.detail.level}! 🎉`, 5000);
  loadPet('celebrating');
  playSound('levelUp');
  isTemporarilyInteracting = true;
  setTimeout(() => {
    isTemporarilyInteracting = false;
    loadPet(emotion.current);
  }, 3000);
});

document.addEventListener('visibilitychange', () => {
  if (!checkContextOrCleanup()) return;
  if (document.visibilityState === 'visible') {
    safeSendMessage({ type: 'get-pet-state' }, (state: SharedPetState | undefined) => {
      if (state) {
        movement.syncState(state);
        if (state.emotion && state.emotion !== emotion.current) {
          emotion.current = state.emotion;
          loadPet(state.emotion);
        }
      }
    });
  }
});

syncInterval = setInterval(() => {
  if (!checkContextOrCleanup()) return;
  if (document.visibilityState === 'visible' && document.hasFocus() && !movement.isDragging) {
    safeSendMessage({
      type: 'update-pet-state',
      state: {
        x: movement.x,
        y: movement.y,
        state: movement.state,
        direction: movement.direction,
        paused: movement.paused,
        emotion: emotion.current
      }
    });
  }
}, 150);

async function init(): Promise<void> {
  await loadAndApplySettings();
  await personality.isLoaded;
  
  if (!checkContextOrCleanup()) return;

  safeSendMessage({ type: 'get-pet-state' }, (sharedState: SharedPetState | undefined) => {
    if (sharedState && sharedState.y !== 0) {
      movement.syncState(sharedState);
      const startEmotion = sharedState.emotion || 'happy';
      emotion.current = startEmotion;
      loadPet(startEmotion);
    } else {
      const startEmotion = 'happy';
      emotion.current = startEmotion;
      loadPet(startEmotion);
    }
    movement.start();
    const petName = currentSettings.name || 'Clawd';
    showBubble(`Hello! I'm ${petName}! Let's browse together! 🐾`);
    playSound('greeting');
  });
  
  emotionInterval = setInterval(() => {
    if (checkContextOrCleanup()) {
      updateEmotion();
    }
  }, 10_000);
}

init();
