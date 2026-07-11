import { MovementEngine } from '../core/movement';
import { EmotionEngine } from '../core/emotion';
import { TriggerDetector } from '../core/triggers';
import { PersonalitySystem } from '../core/personality';
import { getAiEmotion, setBridgeToken, getAiChatResponse, getAutonomousGenerativeDialogue } from '../core/ai';
import { PetSettings, SharedPetState, PetMessage, StorageChange } from '../shared/types';
import { springAnimate, keyframeAnimate } from '../ui/animate';
import { PERSONA_AUTONOMOUS_DIALOGUES } from '../core/dialogues';
import { ViewManager } from '../ui/view';
import { STORAGE_KEYS } from '../shared/constants';
import { getDominantTrait, detectPageCategory } from '../core/rules';
import { getResolvedCostumeName } from '../ui/shared-ui';
import { isFocusActive, isSleeping } from '../core/schedule';
import { extensionApi, getRuntimeUrl } from '../shared/platform';

const BRIDGE_TOKEN = Math.random().toString(36).substring(2) + Date.now().toString(36);
setBridgeToken(BRIDGE_TOKEN);

let currentSettings: PetSettings = { size: 128, speed: 1.2, aiMode: false, apiKey: '', soundEnabled: true, soundVolume: 0.5, scheduleEnabled: true };

(function injectMainWorld() {
  try {
    if (!extensionApi.runtime.id) return;
    if (window !== window.top) return;
    if (document.documentElement.tagName.toLowerCase() !== 'html') return;
    const script = document.createElement('script');
    script.src = getRuntimeUrl('main_world.js');
    script.dataset.token = BRIDGE_TOKEN;
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (e) {
    console.warn(`[${currentSettings.name || "Arcrawls"} Content] Main world injection failed:`, e);
  }
})();

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
let pokeInterval: ReturnType<typeof setInterval> | null = null;
let cachedAiAvailability: 'readily' | 'after-download' | 'no' | null = null;

async function playSound(type: string): Promise<void> {
  const sounds: Record<string, string> = {
    greeting: 'sounds/greeting.mp3',
    levelUp: 'sounds/level-up.mp3',
    petting: 'sounds/petting-love.mp3',
    sad: 'sounds/sad-crying.mp3',
    shoo: 'sounds/shoo-run.mp3',
    sleeping: 'sounds/sleeping.mp3',
    thinking: 'sounds/thinking-coding-work.mp3',
    feeding: 'sounds/feeding-celebrating.mp3',
    chat: 'sounds/chat-message.mp3'
  };

  const filename = sounds[type];
  if (!filename) return;

  if (currentSettings.soundEnabled === false) {
    return;
  }

  // Mute during Focus Blocks
  if (isFocusActive(currentSettings)) {
    return;
  }

  const volume = currentSettings.soundVolume !== undefined ? currentSettings.soundVolume : 0.5;

  safeSendMessage({
    type: 'play-sound',
    filename,
    volume
  }, (response) => {
    if (response && response.success === false) {
      // Fallback: Play audio directly in the content script if background/offscreen fails
      try {
        // Only attempt fallback playback if the user has interacted with the page to avoid console spam
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
          return;
        }
        const audio = new Audio(getRuntimeUrl(`assets/${filename}`));
        audio.volume = volume;
        audio.play().catch(e => {
          if (e.name !== 'NotAllowedError') {
            console.warn(`[${currentSettings.name || "Arcrawls"}] Content script audio fallback blocked:`, e);
          }
        });
      } catch (e) {
        console.warn(`[${currentSettings.name || "Arcrawls"}] Content script audio fallback failed:`, e);
      }
    }
  });
}

let isOrphaned = false;

function cleanupOrphanedScript(): void {
  if (isOrphaned) return;
  isOrphaned = true;

  if (idleTimer) clearTimeout(idleTimer);
  if (debounceTimeout) clearTimeout(debounceTimeout);
  if (pokeInterval) clearInterval(pokeInterval);
  if (interactionTimeout) clearTimeout(interactionTimeout);
  if (ghostModeTimeout) clearTimeout(ghostModeTimeout);

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
  window.removeEventListener('focus', handleWindowFocus);
  window.removeEventListener('pet-console-error', handleConsoleError);
  window.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('keydown', handleGhostModeActivity);
  document.removeEventListener('scroll', handleGhostModeActivity);

  try {
    extensionApi.storage.onChanged?.removeListener(handleStorageChanged);
  } catch (e) { /* ignore */ }

  try {
    extensionApi.runtime.onMessage?.removeListener(handleRuntimeMessage);
  } catch (e) { /* ignore */ }

  console.log("Browser Pet: Old extension context invalidated. Injected mascot cleaned up.");
}

function checkContextOrCleanup(): boolean {
  if (isOrphaned) return false;
  if (!extensionApi.runtime.id) {
    cleanupOrphanedScript();
    return false;
  }
  return true;
}

function safeSendMessage(message: PetMessage, callback?: (response: any) => void): void {
  try {
    if (!checkContextOrCleanup()) return;
    extensionApi.runtime.sendMessage(message).then((response) => {
      if (callback) callback(response);
    }).catch((e: any) => {
      if (e.message && e.message.includes('context invalidated')) {
        cleanupOrphanedScript();
      }
    });
  } catch (e: any) {
    if (e.message && e.message.includes('context invalidated')) {
      cleanupOrphanedScript();
    } else {
      console.warn("safeSendMessage error:", e);
    }
  }
}

let hasEvaluatedPageAi = false;
let currentAiCategory: string | undefined = undefined;
let currentAiSentiment: string | undefined = undefined;
let isTemporarilyInteracting = false;
let interactionTimeout: ReturnType<typeof setTimeout> | null = null;
let customReactionPlayCount = 0;

let lastSentOriginEmotion = '';
let lastSentOriginDialogue = '';

let isCurrentlyHidden = false;

// Safe wrapper for sessionStorage to prevent SecurityError in sandboxed iframes
const memoryStorage: Record<string, string> = {};
function getSessionItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key) ?? memoryStorage[key] ?? null;
  } catch (e) {
    return memoryStorage[key] ?? null;
  }
}
function setSessionItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch (e) {
    memoryStorage[key] = value;
  }
}

function getSemanticPageText(): string {
  if (isPetHidden()) return ''; // Domain blocklist check

  // Prioritize actual content over navigation/footers
  const rootElement = document.querySelector('main, article, [role="main"], #content') as HTMLElement || document.body;
  
  // Clone to avoid mutating the actual DOM while sanitizing
  const clonedRoot = rootElement.cloneNode(true) as HTMLElement;
  
  // Sanitize PII
  const sensitiveSelectors = [
    'input[type="password"]',
    'input[name*="password" i]',
    'input[name*="card" i]',
    'input[name*="ssn" i]',
    '[data-sensitive="true"]',
    '.sensitive-data'
  ];
  const sensitiveNodes = clonedRoot.querySelectorAll(sensitiveSelectors.join(','));
  sensitiveNodes.forEach(node => node.remove());

  // Use textContent instead of innerText to prevent massive forced synchronous layout (layout thrashing)
  const text = clonedRoot.textContent || '';
  // Strip excessive whitespace/newlines to maximize token density
  return text.replace(/\s+/g, ' ').trim().substring(0, 3000);
}

function isPetHidden(): boolean {
  const isBlockedDomain = currentSettings.blockedDomains?.includes(window.location.hostname);
  const isHiddenInTab = getSessionItem('pet-hidden-in-tab') === 'true';
  return !!(isBlockedDomain || isHiddenInTab);
}

function hidePet(): void {
  if (isCurrentlyHidden) return;
  isCurrentlyHidden = true;
  if (isInitialized) {
    view.hide();
    movement.stop();
  }
}

function showPet(): void {
  if (!isCurrentlyHidden) return;
  isCurrentlyHidden = false;
  if (!isInitialized) {
    actuallyInit();
  } else {
    view.show();
    movement.start();
  }
}

function showBubbleWithSound(text: string, duration?: number): void {
  if (document.visibilityState === 'visible' && !isPetHidden()) {
    playSound('chat');
  }
  // Calculate dynamic duration based on text length (assume ~60ms per character for reading speed)
  // Give at least 3 seconds, up to a max of 8 seconds.
  const calcDuration = duration || Math.max(3000, Math.min(text.length * 60 + 1000, 8000));
  
  // Even if focus blocks sound, it still shows the bubble
  view.showBubble(text, calcDuration);
}

function debouncedUpdateEmotion(delay = 500): void {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    updateEmotion();
    resetIdleTimer();
  }, delay);
}

function resetIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  idleTimer = setTimeout(() => {
    handleIdleBehavior();
  }, 10_000); // Check for minor idle behaviors every 10s
}

function handleIdleBehavior(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }

  if (!checkContextOrCleanup()) return;
  if (!isInitialized) return;
  if (isPetHidden()) return;
  if (isTemporarilyInteracting) return;

  const context = triggers.snapshot();
  const scheduleEnabled = currentSettings.scheduleEnabled !== false;

  // Enforce Focus Mode silence even in Autonomous Mode
  if (isFocusActive(currentSettings)) {
    if (context.idleSeconds >= 45) {
      updateEmotion(); // Allows transition to idle focus like 'studying'
    }
    // Continue checking if still idle
    if (context.idleSeconds >= 10) {
      resetIdleTimer();
    }
    return;
  }

  if (!scheduleEnabled) {
    if (Math.random() < 0.4) {
      const decisions = [
        () => {
          isTemporarilyInteracting = true;
          loadPet(Math.random() < 0.5 ? 'running' : 'flying');
          movement.shoo(() => {
            isTemporarilyInteracting = false;
            loadPet(emotion.current);
          });
          showBubbleWithSound("Let's go explore this side! 🏃‍♂️");
        },
        () => {
          movement.chaseCursor(context.mouseX - currentSettings.size / 2);
          showBubbleWithSound("I'm following you! 👀");
        },
        () => {
          const pageTitle = document.title || 'this page';
          const truncatedTitle = pageTitle.length > 25 ? pageTitle.substring(0, 22) + '...' : pageTitle;
          showBubbleWithSound(`Analyzing "${truncatedTitle}"... looks cool! 🧐`);
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
    if (context.idleSeconds >= 10 && context.idleSeconds < 45 && Math.random() < 0.3) {
      movement.chaseCursor(context.mouseX - currentSettings.size / 2);
      const dialogs = ["Whatcha doing over there? 👀", "Let me see! 🧐", "Watchu looking at? 👁️"];
      showBubbleWithSound(dialogs[Math.floor(Math.random() * dialogs.length)]);
    } else if (context.idleSeconds >= 45) {
      updateEmotion(); // Let engine pick deep idle (skateboard, sleeping, etc)
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

  let chatHistory: { role: string; content: string; }[] = [];
  
  const saveChatHistory = () => {
    // Keep max 20 messages to avoid token bloat
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
    try {
      sessionStorage.setItem('arcrawlsChatHistory', JSON.stringify(chatHistory));
    } catch(e) {}
  };

  view = new ViewManager({
    petName: currentSettings.name,
    onPetClick: (e) => {
      e.stopPropagation();
      if (movement.wasDragged) {
        movement.wasDragged = false;
        return;
      }
      if (movement.isFlying()) return;
      view.toggleChat();
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
        { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1)' },
        { transform: 'var(--pet-flip) rotate(calc(var(--pet-rotation) + 6deg)) scale(1.2)' },
        { transform: 'var(--pet-flip) rotate(calc(var(--pet-rotation) + 4deg)) scale(1.12)' },
        { transform: 'var(--pet-flip) rotate(calc(var(--pet-rotation) + 5deg)) scale(1.15)' }
      ], { duration: 300, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', fill: 'forwards' });
    },
    onPetMouseLeave: () => {
      if (isPetHidden()) return;
      view.getPetImg().animate([
        { transform: 'var(--pet-flip) rotate(calc(var(--pet-rotation) + 5deg)) scale(1.15)' },
        { transform: 'var(--pet-flip) rotate(calc(var(--pet-rotation) - 1deg)) scale(0.97)' },
        { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1)' }
      ], { duration: 300, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', fill: 'forwards' });
    },
    onChatToggle: (isOpen) => {
      isTemporarilyInteracting = isOpen;
      movement.paused = isOpen;
      const container = view.getContainer();
      if (isOpen) {
        try {
          view.getPetImg().getAnimations().forEach(anim => anim.cancel());
        } catch (err) {}
        movement.hasFallen = true;
        movement.state = 'walk-bottom'; // Ensure pet knows it is at the bottom
        const bottomY = window.innerHeight - movement.size;
        movement.y = bottomY;
        container.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        movement._apply(); // Applies new position and upright rotation
        loadPet('working-typing');
      } else {
        container.style.transition = 'none';
        loadPet(emotion.current);
      }
    }
  });

  // Load saved history and populate UI
  try {
    const saved = sessionStorage.getItem('arcrawlsChatHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        chatHistory = parsed;
        chatHistory.forEach(msg => {
          view.addChatMessage(msg.role === 'user' ? 'user' : 'arcrawls', msg.content);
        });
      }
    }
  } catch(e) {}

  view.onPlayVoice = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any current speech
      
      const spokenResponse = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
      const utterance = new SpeechSynthesisUtterance(spokenResponse);
      
      // Prevent Chrome garbage collection bug
      (window as any).__currentUtterance = utterance;
      
      const voices = window.speechSynthesis.getVoices();
      let preferredVoice;
      if (currentSettings.chatVoice) {
        preferredVoice = voices.find(v => v.name === currentSettings.chatVoice);
      }
      if (!preferredVoice) {
        preferredVoice = voices.find(v => 
          v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')
        );
      }
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.volume = currentSettings.soundVolume !== undefined ? currentSettings.soundVolume : 0.5;
      utterance.pitch = 1.2;
      
      utterance.onend = () => {
        (window as any).__currentUtterance = null;
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  view.onChatSubmit = async (text: string) => {
    chatHistory.push({ role: 'user', content: text });
    saveChatHistory();
    
    const pageText = document.body.innerText || '';
    const trait = getDominantTrait(personality.stats.siteCategoryCounts);
    const statsContext = `Happiness: ${personality.stats.happiness}%, Energy: ${personality.stats.energy}%, Focus: ${personality.stats.focus}%, Personality Trait: ${trait}`;
    const persona = currentSettings.persona || 'default';
    
    try {
      const response = await getAiChatResponse(text, pageText, persona, statsContext, chatHistory, currentSettings.name);
      
      view.setChatLoading(false);
      
      if (response) {
        chatHistory.push({ role: 'assistant', content: response });
        saveChatHistory();
        view.addChatMessage('arcrawls', response);
        // Play chatting sound and animation
        playSound('chat');
        loadPet('working-typing');

        // Send random initial dialogue to say hello (only once per session per tab)
        if (currentSettings.aiMode && currentSettings.commentFrequency! > 0) {
          if (!getSessionItem('arcrawls-ai-has-greeted')) {
            setTimeout(() => {
              if (isOrphaned) return;
              const greetings = [
                "Hi there! Whatcha lookin' at?",
                "I'm here to help you browse! Or just look cute. Probably the latter.",
                "Sniff sniff... smells like a good webpage.",
                "If you need me, just give me a pet!"
              ];
              const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
              view.addChatMessage('arcrawls', randomGreeting);
              if (currentSettings.soundEnabled) playSound('chat');

              setSessionItem('arcrawls-ai-has-greeted', 'true');
            }, 5000);
          }
        }
      } else {
        view.addChatMessage('arcrawls', "Oops! My brain froze. Could you repeat that?");
      }
    } catch (e) {
      console.error(`[${currentSettings.name || "Arcrawls"} Chat] Error:`, e);
      view.setChatLoading(false);
      view.addChatMessage('arcrawls', "Oops! Something went wrong connecting to my brain.");
    }
  };

  view.onChatRedo = async (oldMsgEl: HTMLElement, lastUserMsg: string) => {
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'assistant') {
      chatHistory.pop();
      saveChatHistory();
    }
    
    const textNode = oldMsgEl.querySelector('div:not(.arcrawls-control-btn)') as HTMLElement;
    const controlsRow = oldMsgEl.querySelector('div[style*="flex"]') as HTMLElement;
    const originalText = textNode ? textNode.textContent : "";
    if (textNode) {
      textNode.innerHTML = '<div class="ld-dots"><i></i><i></i><i></i></div>';
    }
    if (controlsRow) {
      controlsRow.style.display = 'none';
    }
    
    view.setChatLoading(true, false);
    
    const pageText = getSemanticPageText();
    const trait = getDominantTrait(personality.stats.siteCategoryCounts);
    const statsContext = `Happiness: ${personality.stats.happiness}%, Energy: ${personality.stats.energy}%, Focus: ${personality.stats.focus}%, Personality Trait: ${trait}`;
    const persona = currentSettings.persona || 'default';
    
    try {
      const response = await getAiChatResponse(lastUserMsg, pageText, persona, statsContext, chatHistory, currentSettings.name);
      
      view.setChatLoading(false);
      
      if (response) {
        chatHistory.push({ role: 'assistant', content: response });
        saveChatHistory();
        view.addChatMessage('arcrawls', response, oldMsgEl);
        oldMsgEl.remove();
        if (currentSettings.soundEnabled) playSound('chat');
        loadPet('working-typing');
      } else {
        if (textNode) textNode.textContent = originalText;
        if (controlsRow) controlsRow.style.display = 'flex';
        view.addChatMessage('arcrawls', "Oops! My brain froze. Could you repeat that?");
      }
    } catch (e) {
      console.error(`[${currentSettings.name || "Arcrawls"} Chat] Error:`, e);
      view.setChatLoading(false);
      if (textNode) textNode.textContent = originalText;
      if (controlsRow) controlsRow.style.display = 'flex';
      view.addChatMessage('arcrawls', "Oops! Something went wrong connecting to my brain.");
    }
  };

  movement = new MovementEngine(view.getContainer(), {
    size: currentSettings.size,
    speed: currentSettings.speed,
    performanceMode: currentSettings.performanceMode
  });

  personality.disabledEmotions = currentSettings.disabledEmotions || [];
  view.applyCostume(currentSettings.costume);
  view.getContainer().classList.toggle('performance-mode', !!currentSettings.performanceMode);

  movement.onLanding = () => {
    if (isPetHidden()) return;

    if (view.isChatOpen()) {
      movement.paused = true;
      return;
    }

    if (interactionTimeout) clearTimeout(interactionTimeout);
    isTemporarilyInteracting = false;
    loadPet(emotion.current);

    const petImg = view.getPetImg();
    // Physical landing squash/stretch
    petImg.animate([
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1.3, 0.7)', offset: 0 },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(0.8, 1.2)', offset: 0.3 },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1.1, 0.9)', offset: 0.6 },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1, 1)', offset: 1 }
    ], { duration: 500, easing: 'ease-out' });
  };

  movement.onFlightStart = () => {
    if (isPetHidden()) return;
    isTemporarilyInteracting = true;
    if (interactionTimeout) clearTimeout(interactionTimeout);
    loadPet('rocket');
    
    const petImg = view.getPetImg();
    // Preparation animation: crouch and shake before takeoff
    petImg.animate([
      { transform: 'var(--pet-flip) translateY(0) scale(1)', offset: 0 },
      { transform: 'var(--pet-flip) translateY(4px) scale(1.1, 0.9)', offset: 0.3 }, // Crouch
      { transform: 'var(--pet-flip) translateY(4px) scale(1.1, 0.9) translateX(-2px)', offset: 0.4 }, // Shake start
      { transform: 'var(--pet-flip) translateY(4px) scale(1.1, 0.9) translateX(2px)', offset: 0.5 },
      { transform: 'var(--pet-flip) translateY(4px) scale(1.1, 0.9) translateX(-2px)', offset: 0.6 },
      { transform: 'var(--pet-flip) translateY(4px) scale(1.1, 0.9) translateX(2px)', offset: 0.7 },
      { transform: 'var(--pet-flip) translateY(4px) scale(1.1, 0.9) translateX(-2px)', offset: 0.8 },
      { transform: 'var(--pet-flip) translateY(0) scale(0.9, 1.3)', offset: 1 } // Takeoff stretch
    ], { duration: 1000, easing: 'ease-in-out' });

    playSound('thinking'); // Using thinking sound as a placeholder for engine noise
  };

  movement.onFlightEnd = () => {
    if (isPetHidden()) return;

    const petImg = view.getPetImg();
    // Ceiling landing squash/stretch impact
    petImg.animate([
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1.1, 0.9)', offset: 0 },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(0.97, 1.03)', offset: 0.5 },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1, 1)', offset: 1 }
    ], { duration: 400, easing: 'ease-out' });

    isTemporarilyInteracting = false;
    loadPet(emotion.current);
  };
}

async function loadPet(name: string): Promise<void> {
  if (!isInitialized || isOrphaned) return;
  const assetName = getResolvedCostumeName(name, currentSettings.costume, currentSettings.seasonalEnabled);
  view.setEmotion(assetName, currentSettings.customColor);

  if (!checkContextOrCleanup()) return;

  try {
    extensionApi.storage.local.set({ [STORAGE_KEYS.MOOD]: name }).catch((e) => {
      if (e.message && e.message.includes('context invalidated')) {
        cleanupOrphanedScript();
      } else {
        console.warn(`[${currentSettings.name || "Arcrawls"} Content] storage.set error:`, e);
      }
    });
  } catch (e: any) {
    if (e.message && e.message.includes('context invalidated')) {
      cleanupOrphanedScript();
    } else {
      console.warn(`[${currentSettings.name || "Arcrawls"} Content] error:`, e);
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
      safeSendMessage({ type: 'record-site-visit', category: siteCategory });
    }
  } else if (scheduleEnabled && currentSettings.aiMode && currentAiCategory) {
    safeSendMessage({ type: 'record-site-visit', category: currentAiCategory, sentiment: currentAiSentiment });
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

  let finalSpeed = baseSpeed * energyFactor * traitFactor;
  if (scheduleEnabled && isSleeping(currentSettings)) {
    finalSpeed *= 0.5;
  }

  movement.updateSettings({
    speed: finalSpeed
  });

  const focusActive = isFocusActive(currentSettings);

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

  if (customReaction && !focusActive) {
    nextEmotion = customReaction.emotion;
    if (customReaction.dialogue) {
      aiComment = customReaction.dialogue;
    }
  } else if (focusActive) {
    nextEmotion = await emotion.evaluate(context, scheduleEnabled, currentSettings.seasonalEnabled !== false, currentSettings);
  } else if (scheduleEnabled && currentSettings.aiMode && !useLiteMode && !context.lastHttpError && context.idleSeconds < 60) {
    if (!hasEvaluatedPageAi) {
      if (!checkContextOrCleanup()) return;

      try {
        const storedTime = await extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.LAST_AI_COMMENT_TIME);
        const lastCommentTime = storedTime[STORAGE_KEYS.LAST_AI_COMMENT_TIME] || 0;
        const freqSec = currentSettings.commentFrequency ?? 60;
        const now = Date.now();

        if (now - lastCommentTime >= freqSec * 1000) {
          if (!checkContextOrCleanup()) return;
          await extensionApi.storage.local.set({ [STORAGE_KEYS.LAST_AI_COMMENT_TIME]: now });

          const metaDesc = (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content;
          const pageText = getSemanticPageText();
          const lastSemanticText = getSessionItem('arcrawls-last-semantic-text') || '';
          
          // DOM Diffing: Avoid unnecessary LLM calls if text hasn't meaningfully changed
          const lengthDiff = Math.abs(lastSemanticText.length - pageText.length);
          const isContentSimilar = lengthDiff < 50 && lastSemanticText.slice(0, 200) === pageText.slice(0, 200);

          if (isContentSimilar && lastSemanticText !== '') {
            hasEvaluatedPageAi = true;
            nextEmotion = await emotion.evaluate(context, scheduleEnabled, currentSettings.seasonalEnabled !== false, currentSettings);
          } else {
            setSessionItem('arcrawls-last-semantic-text', pageText);
            const statsContext = `Happiness: ${personality.stats.happiness}%, Energy: ${personality.stats.energy}%, Focus: ${personality.stats.focus}%, Personality Trait: ${trait}`;
            const result = await getAiEmotion(context.pageTitle, metaDesc, window.location.href, currentSettings.apiKey, currentSettings.persona || 'default', statsContext, currentSettings.sentimentSensitivity, currentSettings.name, pageText);
            nextEmotion = result.emotion;
            aiComment = result.comment;
            currentAiCategory = result.category;
            currentAiSentiment = result.sentiment;
            hasEvaluatedPageAi = true;
          }

          if (scheduleEnabled && currentAiCategory) {
            safeSendMessage({ type: 'record-site-visit', category: currentAiCategory, sentiment: currentAiSentiment });
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
        console.warn(`[${currentSettings.name || "Arcrawls"} Content] updateEmotion AI error:`, e);
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
    if (currentSettings.aiMode && useLiteMode && !hasEvaluatedPageAi && !getSessionItem('arcrawls-lite-mode-notified')) {
      const reason = isMetered ? "on a metered connection" : "still loading my big brain";
      console.log(`[${currentSettings.name || "Arcrawls"}] Lite Mode active because you are ${reason}. Using regex-based detection instead!`);
      setSessionItem('arcrawls-lite-mode-notified', 'true');
    }
  }
  if (nextEmotion !== emotion.current || aiComment || !view.getPetImg().src) {
    emotion.current = nextEmotion;
    loadPet(nextEmotion);

    if (aiComment) {
      showBubbleWithSound(aiComment);
    } else {
      triggerContextDialogue(nextEmotion);
    }
  } else {
    // If emotion hasn't changed, still allow a small chance for ambient dialogue
    if (Math.random() < 0.15) {
      triggerContextDialogue(nextEmotion);
    }
  }

  // Unified Consciousness: Broadcast state to other tabs of the same origin
  // In Performance Mode, we disable this to save CPU cycles and message passing overhead
  if (!currentSettings.performanceMode) {
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
  }

  if (nextEmotion !== emotion.current || aiComment) {
    if (customReaction && customReaction.sound && customReaction.sound !== 'none' && !focusActive) {
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

async function triggerContextDialogue(mood: string): Promise<void> {
  if (isFocusActive(currentSettings)) {
    return;
  }

  const persona = currentSettings.persona || 'default';

  // 1. Try Gemini Nano Generative Dialogue First
  try {
    const metaDesc = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content;
    let pageText: string | undefined = undefined;
    
    // Instead of document.body.innerText which triggers heavy layout recalculation on social media,
    // we quickly grab textContent from relevant semantic tags up to 3000 chars.
    const contentTags = document.querySelectorAll('h1, h2, h3, p, article');
    let extracted = '';
    for (let i = 0; i < contentTags.length; i++) {
      const text = contentTags[i].textContent?.trim() || '';
      if (text) extracted += text + ' ';
      if (extracted.length > 3000) break;
    }
    
    if (extracted.trim().length > 0) {
      pageText = extracted.trim().substring(0, 3000);
    }
    
    const statsContext = `Level: ${personality.stats.level}, Energy: ${Math.round(personality.stats.energy)}%, Focus: ${Math.round(personality.stats.focus)}%`;
    const genDialogue = await getAutonomousGenerativeDialogue(
      persona,
      statsContext,
      mood,
      document.title,
      metaDesc,
      currentSettings.name,
      pageText
    );
    
    if (genDialogue) {
      showBubbleWithSound(genDialogue);
      return;
    }
  } catch (e) {
    console.warn(`[${currentSettings.name || 'Arcrawls'} AI] Generative autonomous dialogue failed, falling back to hardcoded.`, e);
  }

  // 2. Fallback to Hardcoded Dialogues
  const scheduleEnabled = currentSettings.scheduleEnabled !== false;
  const personaDialogs = PERSONA_AUTONOMOUS_DIALOGUES[persona] || PERSONA_AUTONOMOUS_DIALOGUES.default;

  if (scheduleEnabled) {
    const stats = personality.stats;
    const trait = getDominantTrait(personality.stats.siteCategoryCounts);

    if (stats.energy < 30 && Math.random() < 0.5) {
      const options = personaDialogs.lowEnergy || PERSONA_AUTONOMOUS_DIALOGUES.default.lowEnergy;
      showBubbleWithSound(options[Math.floor(Math.random() * options.length)]);
      return;
    }

    if (stats.focus > 80 && Math.random() < 0.4) {
      const options = personaDialogs.highFocus || PERSONA_AUTONOMOUS_DIALOGUES.default.highFocus;
      showBubbleWithSound(options[Math.floor(Math.random() * options.length)]);
      return;
    }

    if (mood === 'working-thinking' || mood === 'happy' || mood === 'love' || mood === 'cool' || mood === 'reading') {
      const traitOptions = personaDialogs[trait] || PERSONA_AUTONOMOUS_DIALOGUES.default[trait];
      if (traitOptions) {
        showBubbleWithSound(traitOptions[Math.floor(Math.random() * traitOptions.length)]);
        return;
      }
    }
  }

  if (!scheduleEnabled) {
    const options = personaDialogs[mood];
    if (options) {
      showBubbleWithSound(options[Math.floor(Math.random() * options.length)]);
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
    'yoga': Math.random() < 0.5 ? "Time for some morning stretches! 🧘‍♂️" : "Inhale, exhale... stretch! 🧘‍♀️",
    'happy': Math.random() < 0.5 ? "Just wandering around! 😊" : "Hope you're having a good day! 🌟",
    'waving': "Hello there! 👋",
    'shrug': "Not sure what to make of this page... 🤷",
    'smile': "Nice to see you! 😊"
  };

  if (dialogs[mood]) {
    showBubbleWithSound(dialogs[mood]);
  }
}

let lastShooTime = 0;
function handleShoo(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  if (view && view.isChatOpen()) return;

  const now = Date.now();
  if (now - lastShooTime < 3000) return; // Cooldown
  lastShooTime = now;

  try {
    view.getPetImg().getAnimations().forEach(anim => anim.cancel());
  } catch (err) { console.warn(`[${currentSettings.name || "Arcrawls"} Content] handleShoo animations cancel error:`, err); }

  isTemporarilyInteracting = true;
  personality.recordInteraction('shoo');

  const r = Math.random();
  const shooEmotion = r < 0.33 ? 'running' : (r < 0.66 ? 'flying' : 'rocket');
  loadPet(shooEmotion);

  movement.shoo(() => {
    isTemporarilyInteracting = false;
    loadPet(emotion.current);
  });

  showBubbleWithSound("Okay, okay, moving! 🏃‍♂️");
  playSound('shoo');
}

function triggerInteraction(action: string, temporaryMood: string, duration: number, message: string): void {
  isTemporarilyInteracting = true;
  if (interactionTimeout) clearTimeout(interactionTimeout);

  try {
    view.getPetImg().getAnimations().forEach(anim => anim.cancel());
  } catch (err) { console.warn(`[${currentSettings.name || "Arcrawls"} Content] triggerInteraction animations cancel error:`, err); }

  personality.recordInteraction(action);
  loadPet(temporaryMood);
  showBubbleWithSound(message);

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
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1)' },
      { transform: 'var(--pet-flip) rotate(calc(var(--pet-rotation) - 8deg)) scale(0.8)' },
      { transform: 'var(--pet-flip) rotate(calc(var(--pet-rotation) + 8deg)) scale(1.25)' },
      { transform: 'var(--pet-flip) rotate(calc(var(--pet-rotation) - 4deg)) scale(0.95)' },
      { transform: 'var(--pet-flip) rotate(calc(var(--pet-rotation) + 4deg)) scale(1.05)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1)' }
    ], { duration: 600, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' });
  } else if (action === 'feed') {
    playSound('feeding');
    petImg.animate([
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1.3)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(0.85)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1.15)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(0.95)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1)' }
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
  movement.paused = true;

  if (interactionTimeout) clearTimeout(interactionTimeout);

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

  showBubbleWithSound(dialogs[toyType] || "Yay, a toy! 🎉");

  const playMood = toyType === 'fish' ? 'celebrating' : 'dancing';
  loadPet(playMood);

  const petImg = view.getPetImg();
  if (toyType === 'fish') {
    playSound('feeding');
    personality.recordInteraction('feed');
    petImg.animate([
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1) translateY(0)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1.4) translateY(-20px)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(0.9) translateY(0)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1.2) translateY(-5px)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1) translateY(0)' }
    ], { duration: 600, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' });
  } else {
    playSound('petting');
    personality.recordInteraction('pet');
    petImg.animate([
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1) translateY(0)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1.25) translateY(-35px)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(0.85) translateY(5px)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1.15) translateY(-10px)' },
      { transform: 'var(--pet-flip) rotate(var(--pet-rotation)) scale(1) translateY(0)' }
    ], { duration: 800, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' });
  }

  interactionTimeout = setTimeout(() => {
    isTemporarilyInteracting = false;
    movement.paused = false;
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
    const saved = await extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS);
    if (saved[STORAGE_KEYS.SETTINGS]) {
      currentSettings = { ...currentSettings, ...saved[STORAGE_KEYS.SETTINGS] };
      if (isInitialized) {
        personality.disabledEmotions = currentSettings.disabledEmotions || [];
        movement.updateSettings({
          size: currentSettings.size,
          speed: currentSettings.speed,
          flightSpeed: currentSettings.flightSpeed
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

function handleStorageChanged(changes: Record<string, StorageChange>) {
  if (!checkContextOrCleanup()) return;
  if (changes['consentAccepted']) {
    const accepted = changes['consentAccepted'].newValue;
    if (accepted && !isInitialized) {
      if (document.visibilityState === 'visible') {
        actuallyInit();
      }
    }
  }
  if (changes[STORAGE_KEYS.SETTINGS]) {
    const newSettings = changes[STORAGE_KEYS.SETTINGS].newValue;
    if (newSettings) {
      currentSettings = { ...currentSettings, ...newSettings };
      if (isInitialized) {
        personality.disabledEmotions = currentSettings.disabledEmotions || [];
        movement.updateSettings({
          size: currentSettings.size,
          speed: currentSettings.speed,
          flightSpeed: currentSettings.flightSpeed,
          performanceMode: currentSettings.performanceMode
        });
        view.applyCostume(currentSettings.costume);
        view.getContainer().classList.toggle('performance-mode', !!currentSettings.performanceMode);
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
        view.showLevelUpBanner(newStats.level, currentSettings.name || 'Arcrawls');
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

extensionApi.storage.onChanged?.addListener(handleStorageChanged);

extensionApi.runtime.onMessage?.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'PING') {
    sendResponse({ status: 'OK' });
  } else if (msg.action === 'GET_STATUS') {
    const isHidden = getSessionItem('pet-hidden-in-tab') === 'true';
    sendResponse({
      active: true,
      hidden: isHidden
    });
  } else if (msg.action === 'TOGGLE_PET_VISIBILITY') {
    const hide = msg.hide;
    setSessionItem('pet-hidden-in-tab', hide ? 'true' : 'false');
    if (isPetHidden()) hidePet(); else showPet();
    sendResponse({ success: true, isHidden: hide });
  } else {
    return handleRuntimeMessage(msg, sender, sendResponse);
  }
  return false;
});

function handleRuntimeMessage(message: PetMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  if (!checkContextOrCleanup()) return;

  if (message.type === 'get-tab-visibility') {
    const isHidden = getSessionItem('pet-hidden-in-tab') === 'true';
    sendResponse({ isHidden });
    return false;
  }

  if (message.type === 'toggle-tab-visibility') {
    const hide = message.hide;
    setSessionItem('pet-hidden-in-tab', hide ? 'true' : 'false');
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
      } catch (err) { console.warn(`[${currentSettings.name || "Arcrawls"} Content] handleRuntimeMessage shoo animations cancel error:`, err); }

      isTemporarilyInteracting = true;
      personality.recordInteraction('shoo');

      const r = Math.random();
      const shooEmotion = r < 0.33 ? 'running' : (r < 0.66 ? 'flying' : 'rocket');
      loadPet(shooEmotion);

      movement.shoo(() => {
        isTemporarilyInteracting = false;
        loadPet(emotion.current);
      });

      showBubbleWithSound("Running away! 🏃‍♂️");
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
    if (isInitialized && document.visibilityState === 'visible' && !document.hasFocus() && !movement.isDragging && !currentSettings.performanceMode) {
      movement.syncState(message.state);
    }
  } else if (message.type === 'sync-origin-pet-state') {
    if (isInitialized && !currentSettings.performanceMode) {
      const { emotion: syncedEmotion, dialogue: syncedDialogue } = message.state;
      if (syncedEmotion !== emotion.current) {
        emotion.current = syncedEmotion;
        loadPet(syncedEmotion);
      }
      if (syncedDialogue) {
        showBubbleWithSound(syncedDialogue);
      }
    }
  } else if (message.type === 'check-tab-ai-availability') {
    checkTabAiAvailability()
      .then((availability) => sendResponse({ success: true, availability }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  } else if (message.type === 'toggle-chat') {
    if (isInitialized && view) {
      view.toggleChat();
    }
  }
  return false;
}

// Ensure the listener is properly cleared if the script is orphaned.

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

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
    if (view) {
      if (movement.isFlying()) return;
      view.toggleChat();
    }
  }
}

let ghostModeTimeout: ReturnType<typeof setTimeout> | null = null;
function handleGhostModeActivity() {
  if (!currentSettings.ghostMode || !isInitialized || isPetHidden()) return;
  view.getContainer().classList.add('ghost-mode-active');
  if (ghostModeTimeout) clearTimeout(ghostModeTimeout);
  ghostModeTimeout = setTimeout(() => {
    view.getContainer().classList.remove('ghost-mode-active');
  }, 2000);
}

async function init(): Promise<void> {
  await loadAndApplySettings();

  if (!checkContextOrCleanup()) return;

  const savedConsent = await extensionApi.storage.local.get<{ consentAccepted?: boolean }>('consentAccepted').catch(() => ({ consentAccepted: false }));
  const settingsExist = await extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS).then(data => !!data[STORAGE_KEYS.SETTINGS]).catch(() => false);
  const consentAccepted = !!(savedConsent.consentAccepted || settingsExist);

  if (!consentAccepted) {
    console.log(`[${currentSettings.name || "Arcrawls"} Content] User has not accepted privacy consent yet. Mascot is disabled.`);
    return;
  }

  if (document.visibilityState === 'visible') {
    actuallyInit();
  } else {
    // Basic setup so we can still receive messages or handle visibility changes
    console.log(`[${currentSettings.name || "Arcrawls"} Content] Tab is backgrounded. Delaying mascot initialization.`);
  }
}

async function actuallyInit(): Promise<void> {
  if (isInitialized || isOrphaned) return;
  ensureInitialized();

  await personality.isLoaded;

  if (!checkContextOrCleanup()) return;

  view.preloadAssets();

  try {
    const savedMood = (await extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.MOOD).catch(() => ({}))) as Record<string, any>;
    const initialMood = savedMood[STORAGE_KEYS.MOOD] || 'happy';
    await loadPet(initialMood);
  } catch (e: any) {
    if (e.message && e.message.includes('context invalidated')) {
      cleanupOrphanedScript();
      return;
    }
  }

  window.addEventListener('pet-console-error', handleConsoleError);

  window.addEventListener('keydown', handleKeydown);
  
  document.addEventListener('keydown', handleGhostModeActivity, { passive: true });
  document.addEventListener('scroll', handleGhostModeActivity, { passive: true });

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
        showBubbleWithSound(originState.dialogue);
      }
    }

    safeSendMessage({ type: 'get-tab-http-error' }, (response: { errorCode?: number } | undefined) => {
      if (isOrphaned) return;
      if (response && response.errorCode) {
        triggers.setHttpError(response.errorCode);
      }

      safeSendMessage({ type: 'get-pet-state' }, (sharedState: SharedPetState | undefined) => {
        if (isOrphaned) return;
        if (sharedState && sharedState.y !== undefined) {
          movement.syncState(sharedState);
        }
        updateEmotion();

        if (isPetHidden()) {
          hidePet();
        } else {
          movement.start();
          if (!sessionStorage.getItem('arcrawls-has-greeted')) {
            const petName = currentSettings.name || 'Arcrawls';
            const greetings = [
              `Hi, I'm ${petName}! Let's explore!`,
              `Meet ${petName}, your guide!`,
              `${petName} here! Let's look around.`,
              `Let's explore together with ${petName}!`,
              `Browse with ${petName}!`,
              `Ready to explore with ${petName}?`,
              `Explore with ${petName}!`,
              `Hi! I'm ${petName}.`,
              `${petName}: Let's explore!`
            ];
            const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
            view.showBubble(randomGreeting);
            sessionStorage.setItem('arcrawls-has-greeted', 'true');

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

  if (pokeInterval) clearInterval(pokeInterval);
  pokeInterval = setInterval(() => {
    if (!checkContextOrCleanup() || !isInitialized || isPetHidden() || isTemporarilyInteracting) return;

    // Check if we should say something ambiently
    if (Math.random() < 0.25) { // 25% chance every 30s to say something even if nothing happened
      triggerContextDialogue(emotion.current);
    }
  }, 30_000);
}

async function checkTabAiAvailability(): Promise<'readily' | 'after-download' | 'no'> {
  if (cachedAiAvailability !== null) {
    return cachedAiAvailability;
  }
  const status = await getAiEmotionAvailability();
  cachedAiAvailability = status;
  return status;
}

async function getAiEmotionAvailability(): Promise<'readily' | 'after-download' | 'no'> {
  // Use the existing logic from src/ai.ts via bridge
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).substring(7);
    let resolved = false;

    const handler = (event: MessageEvent) => {
      if (resolved) return;
      if (event.source !== window || !event.data || event.data.type !== 'PET_AI_AVAILABILITY_CHECK_RESPONSE' || event.data.id !== requestId || event.data.token !== BRIDGE_TOKEN) return;
      resolved = true;
      window.removeEventListener('message', handler);
      resolve(event.data.availability);
    };

    window.addEventListener('message', handler);
    window.postMessage({ type: 'PET_AI_AVAILABILITY_CHECK_REQUEST', id: requestId, token: BRIDGE_TOKEN }, '*');

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('message', handler);
        resolve('no');
      }
    }, 2000);
  });
}

if (document.documentElement.tagName.toLowerCase() === 'html' && window === window.top) {
  init();
}
