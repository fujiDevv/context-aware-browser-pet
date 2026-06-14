import { PetSettings } from './types';

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
    style.textContent = this.getCss();
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
    if (document.body) {
      document.body.appendChild(this.shadowHost);
    } else {
      const observer = new MutationObserver((_, obs) => {
        if (document.body) {
          document.body.appendChild(this.shadowHost);
          obs.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
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

  private getCss(): string {
    return `
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
  }
}
