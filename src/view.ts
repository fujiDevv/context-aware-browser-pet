import { PetSettings } from './types';
import viewStyles from './view.css';

export interface ViewManagerOptions {
  onPetClick: (e: MouseEvent) => void;
  onPetDoubleClick: (e: MouseEvent) => void;
  onPetContextMenu: (e: MouseEvent) => void;
  onPetMouseDown: (e: MouseEvent) => void;
  onPetMouseEnter: (e: MouseEvent) => void;
  onPetMouseLeave: (e: MouseEvent) => void;
}

export class ViewManager {
  private shadowHost: HTMLElement;
  private shadowRoot: ShadowRoot;
  private container: HTMLElement;
  private petImg: HTMLImageElement;
  private bubble: HTMLElement;
  private bubbleTimeout: ReturnType<typeof setTimeout> | null = null;
  private options: ViewManagerOptions;

  constructor(options: ViewManagerOptions) {
    this.options = options;

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'clawd-companion-host';

    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = viewStyles;
    this.shadowRoot.appendChild(style);

    this.container = document.createElement('div');
    this.container.id = 'browser-pet-root';
    this.shadowRoot.appendChild(this.container);

    this.petImg = document.createElement('img');
    this.petImg.id = 'browser-pet-img';
    this.container.appendChild(this.petImg);

    this.bubble = document.createElement('div');
    this.bubble.className = 'pet-speech-bubble';
    this.container.appendChild(this.bubble);

    this.bindEvents();
    this.injectHost();
  }

  private injectHost() {
    this.shadowHost.style.display = 'contents';
    const target = document.documentElement;
    if (target) {
      target.appendChild(this.shadowHost);
    } else {
      const observer = new MutationObserver((_, obs) => {
        if (document.documentElement) {
          document.documentElement.appendChild(this.shadowHost);
          obs.disconnect();
        }
      });
      observer.observe(document, { childList: true, subtree: true });
    }
  }

  private bindEvents() {
    this.petImg.addEventListener('click', (e) => this.options.onPetClick(e));
    this.petImg.addEventListener('dblclick', (e) => this.options.onPetDoubleClick(e));
    this.petImg.addEventListener('contextmenu', (e) => this.options.onPetContextMenu(e));
    this.petImg.addEventListener('mousedown', (e) => this.options.onPetMouseDown(e));
    this.petImg.addEventListener('mouseenter', (e) => this.options.onPetMouseEnter(e));
    this.petImg.addEventListener('mouseleave', (e) => this.options.onPetMouseLeave(e));
  }

  public getContainer(): HTMLElement {
    return this.container;
  }

  public getPetImg(): HTMLImageElement {
    return this.petImg;
  }

  public addItem(el: HTMLElement) {
    this.container.appendChild(el);
  }

  public setEmotion(assetName: string) {
    this.petImg.src = chrome.runtime.getURL(`assets/pets/clawd-${assetName}.svg`);
  }

  public showBubble(text: string, duration = 3000) {
    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
    this.bubble.textContent = text;
    this.bubble.classList.add('show');
    this.bubbleTimeout = setTimeout(() => {
      this.bubble.classList.remove('show');
    }, duration);
  }

  public hideBubble() {
    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
    this.bubble.classList.remove('show');
  }

  public showLevelUpBanner(level: number, petName: string) {
    const existing = this.shadowRoot.querySelector('#browser-pet-levelup');
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

    this.shadowRoot.appendChild(banner);

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
      if (this.shadowRoot.contains(banner)) {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 600);
      }
    }, 7000);
  }

  public applyCostume(costume: string | undefined) {
    this.petImg.classList.remove('costume-detective', 'costume-wizard', 'costume-party');
    if (costume && ['detective', 'wizard', 'party'].includes(costume)) {
      this.petImg.classList.add(`costume-${costume}`);
    }
  }

  public hide() {
    this.container.style.display = 'none';
    this.bubble.classList.remove('show');
  }

  public show() {
    this.container.style.display = 'block';
  }

  public destroy() {
    this.shadowHost.remove();
  }

  public preloadAssets() {
    const criticalAssets = [
      'happy', 'sad', 'working-thinking', 'sleeping', 'waving', 'smile', 'love', 'cool', 'celebrating', 'dancing'
    ];
    criticalAssets.forEach(name => {
      const img = new Image();
      img.src = chrome.runtime.getURL(`assets/pets/clawd-${name}.svg`);
    });
  }
}
