import { PetSettings } from './types';
import viewStyles from './view.css';

export interface ViewManagerOptions {
  onPetClick: (e: MouseEvent) => void;
  onPetDoubleClick: (e: MouseEvent) => void;
  onPetContextMenu: (e: MouseEvent) => void;
  onPetMouseDown: (e: MouseEvent) => void;
  onPetMouseEnter: (e: MouseEvent) => void;
  onPetMouseLeave: (e: MouseEvent) => void;
  onChatToggle?: (isOpen: boolean) => void;
}

export class ViewManager {
  private shadowHost: HTMLElement;
  private shadowRoot: ShadowRoot;
  private canvas: HTMLElement;
  private container: HTMLElement;
  private petImg: HTMLImageElement;
  private bubble: HTMLElement;
  private bubbleTimeout: ReturnType<typeof setTimeout> | null = null;
  private options: ViewManagerOptions;
  private activeCostume: string | undefined = 'none';
  private lastAssetName: string = 'happy';

  // Chat UI Elements
  private chatPanel: HTMLElement;
  private chatMessages: HTMLElement;
  private chatInput: HTMLInputElement;
  private chatSend: HTMLButtonElement;
  public onChatSubmit: ((message: string) => void) | null = null;

  constructor(options: ViewManagerOptions) {
    this.options = options;

    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'clawd-companion-host';

    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = viewStyles;
    this.shadowRoot.appendChild(style);

    this.canvas = document.createElement('div');
    this.canvas.id = 'browser-pet-canvas';
    this.shadowRoot.appendChild(this.canvas);

    this.container = document.createElement('div');
    this.container.id = 'browser-pet-root';
    this.canvas.appendChild(this.container);

    this.petImg = document.createElement('img');
    this.petImg.id = 'browser-pet-img';
    this.container.appendChild(this.petImg);

    this.bubble = document.createElement('div');
    this.bubble.className = 'pet-speech-bubble';
    this.container.appendChild(this.bubble);

    // Initialize Chat Panel
    this.chatPanel = document.createElement('div');
    this.chatPanel.id = 'clawd-chat-panel';
    this.chatPanel.innerHTML = `
      <div class="clawd-chat-header">
        <span>Chat with Clawd</span>
        <button class="clawd-chat-close">×</button>
      </div>
      <div class="clawd-chat-messages">
        <div class="clawd-chat-msg clawd">Hi there! Click me if you want to chat.</div>
      </div>
      <div class="clawd-chat-input-container">
        <input type="text" id="clawd-chat-input" placeholder="Ask me anything..." autocomplete="off">
        <button id="clawd-chat-send">Send</button>
      </div>
    `;
    this.container.appendChild(this.chatPanel);

    this.chatMessages = this.chatPanel.querySelector('.clawd-chat-messages') as HTMLElement;
    this.chatInput = this.chatPanel.querySelector('#clawd-chat-input') as HTMLInputElement;
    this.chatSend = this.chatPanel.querySelector('#clawd-chat-send') as HTMLButtonElement;

    this.chatPanel.querySelector('.clawd-chat-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleChat(false);
    });

    const submitChat = () => {
      const text = this.chatInput.value.trim();
      if (text && this.onChatSubmit) {
        this.addChatMessage('user', text);
        this.chatInput.value = '';
        this.setChatLoading(true);
        this.onChatSubmit(text);
      }
    };

    this.chatSend.addEventListener('click', submitChat);
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitChat();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.chatPanel.classList.contains('show')) {
        this.toggleChat(false);
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (this.chatPanel.classList.contains('show')) {
        const path = e.composedPath();
        if (!path.includes(this.chatPanel) && !path.includes(this.petImg)) {
          this.toggleChat(false);
        }
      }
    });

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
    this.canvas.appendChild(el);
  }

  private colorCache: Map<string, any> = new Map();
  private baseColors = ['#DE886D', '#CF7B61', '#C77A5E', '#C9745A', '#A85B45', '#C75D3F'];

  private _syncAura(currentAsset: string) {
    const costume = this.activeCostume;

    // Magical Auras only apply to their specific costume assets.
    // If the pet switches to an 'action' asset (like coding.svg), the aura is suppressed.
    const supportsAura = (
      (costume === 'detective' && currentAsset === 'detective') ||
      (costume === 'wizard' && currentAsset === 'magic') ||
      (costume === 'party' && currentAsset === 'rainbow')
    );

    this.petImg.classList.remove('costume-detective', 'costume-wizard', 'costume-party');
    if (supportsAura && costume && ['detective', 'wizard', 'party'].includes(costume)) {
      this.petImg.classList.add(`costume-${costume}`);
    }
  }

  public async setEmotion(assetName: string, customColor?: string) {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      return;
    }

    const url = chrome.runtime.getURL(`assets/pets/clawd-${assetName}.svg`);

    this.lastAssetName = assetName;
    this._syncAura(assetName);

    const cacheKey = `${assetName}-${customColor || 'default'}`;
    if (this.colorCache.has(cacheKey)) {
      const cached = this.colorCache.get(cacheKey)!;
      this.petImg.src = cached.dataUri;
      this.container.style.setProperty('--crop-w', cached.cropW.toString());
      this.container.style.setProperty('--crop-h', cached.cropH.toString());
      this.container.style.setProperty('--crop-x', cached.cropX.toString());
      this.container.style.setProperty('--crop-y', cached.cropY.toString());
      return;
    }

    try {
      let svgText = '';
      try {
        const resp = await fetch(url);
        svgText = await resp.text();
      } catch (fetchErr) {
        // CSP on strict sites (e.g., GitHub, Twitter) blocks fetch() to chrome-extension://
        // Fallback to background service worker which has no such CSP restrictions
        const bgRes = await new Promise<any>((resolve) => {
          chrome.runtime.sendMessage({ type: 'fetch-svg', url }, resolve);
        });
        if (bgRes && bgRes.success) {
          svgText = bgRes.text;
        } else {
          throw new Error(bgRes?.error || 'Background SVG fetch failed');
        }
      }

      // Inline SVG optimizer to remove unused bounding box space while exporting crop offsets
      let cropW = 1, cropH = 1, cropX = 0, cropY = 0;
      function optimizeSvgStr(content: string): string {
          const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
          const styles = styleMatch ? styleMatch[1] : '';
          
          const keyframes: any = {};
          const keyframeRegex = /@keyframes\s+([\w-]+)\s*{([\s\S]*?)}/g;
          let m;
          while ((m = keyframeRegex.exec(styles)) !== null) {
              const name = m[1];
              const body = m[2];
              const frames = [];
              const frameRegex = /([\d%]+|from|to)\s*{([\s\S]*?)}/g;
              let fm;
              while ((fm = frameRegex.exec(body)) !== null) {
                  const props = fm[2];
                  const transformMatch = props.match(/transform:\s*([^;]+)/);
                  frames.push({
                      transform: transformMatch ? transformMatch[1] : ''
                  });
              }
              keyframes[name] = frames;
          }

          const classes: any = {};
          const classRegex = /\.([\w-]+)\s*{([\s\S]*?)}/g;
          while ((m = classRegex.exec(styles)) !== null) {
              const name = m[1];
              const body = m[2];
              const animMatch = body.match(/animation:\s*([\w-]+)/);
              const transMatch = body.match(/transform:\s*([^;]+)/);
              const originMatch = body.match(/transform-origin:\s*([^;]+)/);
              classes[name] = {
                  animation: animMatch ? animMatch[1] : null,
                  transform: transMatch ? transMatch[1] : null,
                  origin: originMatch ? originMatch[1] : null
              };
          }

          function parseTransform(str: string) {
              if (!str) return { tx: 0, ty: 0, sx: 1, sy: 1, ra: 0 };
              let tx = 0, ty = 0, sx = 1, sy = 1, ra = 0;
              const translateMatch = str.match(/translate(?:X|Y|Z)?\(([^)]+)\)/);
              if (translateMatch) {
                  const parts = translateMatch[1].split(/,\s*|\s+/).map(parseFloat);
                  if (str.includes('translateX')) tx = parts[0];
                  else if (str.includes('translateY')) ty = parts[0];
                  else { tx = parts[0]; ty = parts[1] || 0; }
              }
              const scaleMatch = str.match(/scale(?:X|Y|Z)?\(([^)]+)\)/);
              if (scaleMatch) {
                  const parts = scaleMatch[1].split(/,\s*|\s+/).map(parseFloat);
                  if (str.includes('scaleX')) sx = parts[0];
                  else if (str.includes('scaleY')) sy = parts[0];
                  else { sx = parts[0]; sy = parts[1] !== undefined ? parts[1] : parts[0]; }
              }
              const rotateMatch = str.match(/rotate\(([^)]+)\)/);
              if (rotateMatch) {
                  ra = parseFloat(rotateMatch[1]);
              }
              return { tx, ty, sx, sy, ra };
          }

          function getAnimationRange(animName: string) {
              if (!animName || !keyframes[animName]) return [{ tx: 0, ty: 0, sx: 1, sy: 1, ra: 0 }];
              return keyframes[animName].map((f: any) => parseTransform(f.transform));
          }

          function getElements(svgStr: string) {
              const elements = [];
              const tagRegex = /<(rect|circle|path|g|use|text)\b([^>]*?)(?:\/?>|>(.*?)<\/\1>)/gs;
              let match;
              while ((match = tagRegex.exec(svgStr)) !== null) {
                  const type = match[1];
                  const attrsStr = match[2];
                  const children = match[3];
                  const attrs: any = {};
                  const attrRegex = /([\w-]+)="([^"]*)"/g;
                  let am;
                  while ((am = attrRegex.exec(attrsStr)) !== null) {
                      attrs[am[1]] = am[2];
                  }
                  elements.push({ type, attrs, children });
              }
              return elements;
          }

          function applyTransform(x: number, y: number, t: any, ox: number, oy: number) {
              let nx = x - ox;
              let ny = y - oy;
              nx *= t.sx;
              ny *= t.sy;
              if (t.ra) {
                  const rad = t.ra * Math.PI / 180;
                  const rx = nx * Math.cos(rad) - ny * Math.sin(rad);
                  const ry = nx * Math.sin(rad) + ny * Math.cos(rad);
                  nx = rx; ny = ry;
              }
              nx += ox + t.tx;
              ny += oy + t.ty;
              return { x: nx, y: ny };
          }

          function getBBoxRecursive(elements: any[], context = { tx: 0, ty: 0, sx: 1, sy: 1, ra: 0 }): any {
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

              for (const el of elements) {
                  const elClass = el.attrs.class;
                  const classInfo = classes[elClass] || {};
                  const elTransform = parseTransform(el.attrs.transform || classInfo.transform);
                  const animStates = getAnimationRange(classInfo.animation);
                  
                  let elMinX = Infinity, elMinY = Infinity, elMaxX = -Infinity, elMaxY = -Infinity;

                  if (el.type === 'rect') {
                      const x = parseFloat(el.attrs.x || 0);
                      const y = parseFloat(el.attrs.y || 0);
                      const w = parseFloat(el.attrs.width || 0);
                      const h = parseFloat(el.attrs.height || 0);
                      elMinX = x; elMaxX = x + w;
                      elMinY = y; elMaxY = y + h;
                  } else if (el.type === 'circle') {
                      const cx = parseFloat(el.attrs.cx || 0);
                      const cy = parseFloat(el.attrs.cy || 0);
                      const r = parseFloat(el.attrs.r || 0);
                      elMinX = cx - r; elMaxX = cx + r;
                      elMinY = cy - r; elMaxY = cy + r;
                  } else if (el.type === 'path') {
                      const d = el.attrs.d || '';
                      const coords = d.match(/-?\d+\.?\d*/g);
                      if (coords) {
                          const pts = coords.map(parseFloat);
                          for (let i = 0; i < pts.length; i += 2) {
                              if (isNaN(pts[i])) continue;
                              elMinX = Math.min(elMinX, pts[i]);
                              elMaxX = Math.max(elMaxX, pts[i]);
                              if (pts[i+1] !== undefined) {
                                  elMinY = Math.min(elMinY, pts[i+1]);
                                  elMaxY = Math.max(elMaxY, pts[i+1]);
                              }
                          }
                      }
                  } else if (el.type === 'use') {
                      const href = el.attrs['href'] || el.attrs['xlink:href'];
                      if (href && href.startsWith('#')) {
                          const id = href.slice(1);
                          const defMatch = content.match(new RegExp(`<g id="${id}"[^>]*>([\\s\\S]*?)<\\/g>`));
                          if (defMatch) {
                              const subBBox = getBBoxRecursive(getElements(defMatch[1]), { tx: parseFloat(el.attrs.x || 0), ty: parseFloat(el.attrs.y || 0), sx: 1, sy: 1, ra: 0 });
                              elMinX = subBBox.minX; elMaxX = subBBox.maxX; elMinY = subBBox.minY; elMaxY = subBBox.maxY;
                          }
                      }
                  } else if (el.type === 'g') {
                      const subBBox = getBBoxRecursive(getElements(el.children));
                      elMinX = subBBox.minX; elMaxX = subBBox.maxX; elMinY = subBBox.minY; elMaxY = subBBox.maxY;
                  }

                  if (elMinX === Infinity) continue;

                  let ox = 0, oy = 0;
                  if (classInfo.origin) {
                      const parts = classInfo.origin.split(/\s+/);
                      if (parts[0].endsWith('%')) ox = elMinX + (parseFloat(parts[0]) / 100) * (elMaxX - elMinX);
                      else ox = parseFloat(parts[0]) || 0;
                      if (parts[1] && parts[1].endsWith('%')) oy = elMinY + (parseFloat(parts[1]) / 100) * (elMaxY - elMinY);
                      else if (parts[1]) oy = parseFloat(parts[1]) || 0;
                      else oy = ox;
                  }

                  const corners = [
                      {x: elMinX, y: elMinY}, {x: elMaxX, y: elMinY},
                      {x: elMinX, y: elMaxY}, {x: elMaxX, y: elMaxY}
                  ];

                  const states = animStates.length > 0 ? animStates : [{tx:0, ty:0, sx:1, sy:1, ra:0}];
                  
                  for (const state of states) {
                      for (const corner of corners) {
                          let p = applyTransform(corner.x, corner.y, {
                              tx: elTransform.tx + state.tx,
                              ty: elTransform.ty + state.ty,
                              sx: elTransform.sx * state.sx,
                              sy: elTransform.sy * state.sy,
                              ra: elTransform.ra + state.ra
                          }, ox, oy);
                          
                          let pFinal = applyTransform(p.x, p.y, context, 0, 0);

                          minX = Math.min(minX, pFinal.x);
                          maxX = Math.max(maxX, pFinal.x);
                          minY = Math.min(minY, pFinal.y);
                          maxY = Math.max(maxY, pFinal.y);
                      }
                  }
              }
              return { minX, minY, maxX, maxY };
          }

          const visualElements = getElements(content).filter(el => el.type !== 'defs');
          let { minX, minY, maxX, maxY } = getBBoxRecursive(visualElements);

          if (minX === Infinity) return content;

          minX = Math.floor(minX - 0.5);
          minY = Math.floor(minY - 0.5);
          maxX = Math.ceil(maxX + 0.5);
          maxY = Math.ceil(maxY + 0.5);
          
          const width = maxX - minX;
          const height = maxY - minY;
          
          let origW = width, origH = height, origX = 0, origY = 0;
          const vbMatch = content.match(/viewBox="([-0-9.]+)\s+([-0-9.]+)\s+([-0-9.]+)\s+([-0-9.]+)"/);
          if (vbMatch) {
              origX = parseFloat(vbMatch[1]);
              origY = parseFloat(vbMatch[2]);
              origW = parseFloat(vbMatch[3]);
              origH = parseFloat(vbMatch[4]);
          }

          cropW = width / origW;
          cropH = height / origH;
          cropX = (minX - origX) / origW;
          cropY = (minY - origY) / origH;
          
          let formattedContent = content.replace(/<svg[^>]*>/, (match) => {
              let updated = match.replace(/viewBox="[^"]*"/, `viewBox="${minX} ${minY} ${width} ${height}"`);
              if (!updated.includes('viewBox=')) updated = updated.replace('<svg', `<svg viewBox="${minX} ${minY} ${width} ${height}"`);
              updated = updated.replace(/width="[^"]*"/, `width="${width}"`);
              updated = updated.replace(/height="[^"]*"/, `height="${height}"`);
              return updated;
          });

          return formattedContent;
      }

      svgText = optimizeSvgStr(svgText);

      // Architectural Fix: Instead of fragile string replacement of exact hex codes,
      // we inject a style block into the SVG that targets our base colors.
      if (customColor && customColor !== '#DE886D') {
        const styleBlock = `<style>
          :root { --pet-core-color: ${customColor}; }
          [fill^="#DE886D" i], [fill^="#CF7B61" i], [fill^="#C77A5E" i], [fill^="#C9745A" i], [fill^="#A85B45" i], [fill^="#C75D3F" i] { 
            fill: var(--pet-core-color) !important; 
          }
        </style>`;

        // Inject right after the opening <svg> tag
        svgText = svgText.replace(/<svg([^>]*)>/i, `<svg$1>${styleBlock}`);
      }

      const dataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;
      
      const cacheObj = { dataUri, cropW, cropH, cropX, cropY };
      this.colorCache.set(cacheKey, cacheObj);
      
      this.petImg.src = dataUri;
      this.container.style.setProperty('--crop-w', cropW.toString());
      this.container.style.setProperty('--crop-h', cropH.toString());
      this.container.style.setProperty('--crop-x', cropX.toString());
      this.container.style.setProperty('--crop-y', cropY.toString());
    } catch (e) {
      console.warn('[Clawd View] Failed to apply custom color/formatter:', e);
      this.petImg.src = url;
    }
  }

  public toggleChat(force?: boolean) {
    const isShowing = this.chatPanel.classList.contains('show');
    let willShow = false;
    if (force === true || (force === undefined && !isShowing)) {
      willShow = true;
      this.chatPanel.classList.add('show');
      this.chatInput.focus();
    } else {
      this.chatPanel.classList.remove('show');
    }
    
    if (this.options.onChatToggle) {
      this.options.onChatToggle(willShow);
    }
  }

  public addChatMessage(role: 'user' | 'clawd', text: string) {
    const msg = document.createElement('div');
    msg.className = `clawd-chat-msg ${role}`;
    msg.textContent = text;
    this.chatMessages.appendChild(msg);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  public setChatLoading(isLoading: boolean) {
    this.chatSend.disabled = isLoading;
    this.chatInput.disabled = isLoading;
    if (isLoading) {
      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'clawd-chat-msg clawd loading-indicator';
      loadingMsg.textContent = '...';
      this.chatMessages.appendChild(loadingMsg);
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    } else {
      const loadingIndicator = this.chatMessages.querySelector('.loading-indicator');
      if (loadingIndicator) loadingIndicator.remove();
      this.chatInput.focus();
    }
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
    this.activeCostume = costume;
    this._syncAura(this.lastAssetName);
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
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      return;
    }
    const criticalAssets = [
      'happy', 'sad', 'working-thinking', 'sleeping', 'waving', 'smile', 'love', 'cool', 'celebrating', 'dancing'
    ];
    criticalAssets.forEach(name => {
      const img = new Image();
      img.src = chrome.runtime.getURL(`assets/pets/clawd-${name}.svg`);
    });
  }
}
