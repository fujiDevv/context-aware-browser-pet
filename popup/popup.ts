import { PetStats, PetSettings } from '../src/types';
import { EMOTIONS_METADATA, getDominantTrait, getResolvedCostumeName } from '../src/shared-ui';
import { STORAGE_KEYS } from '../src/constants';
import { extensionApi, getRuntimeUrl, isFirefoxRuntime, supportsOffscreenDocuments } from '../src/platform';

const supportsLocalAiRuntime = supportsOffscreenDocuments();
const isFirefoxBuild = isFirefoxRuntime();

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

  const updateStatusIndicators = async () => {
    // 1. Update Active Tabs Count
    extensionApi.tabs.query({}).then((tabs) => {
      const count = tabs.length;
      if (activeTabsText) {
        activeTabsText.textContent = `${count} Tab${count === 1 ? '' : 's'} Active`;
      }
    }).catch((e) => {
      console.warn('[Clawd Popup] tabs.query status error:', e);
    });

    // 2. Update AI Status
    if (!supportsLocalAiRuntime) {
      if (aiStatusBadge && aiStatusText) {
        aiStatusBadge.className = 'ai-status-badge status-unsupported';
        aiStatusText.textContent = isFirefoxBuild ? 'Brain: Firefox Lite' : 'Brain: Lite';
      }

      const nanoBadge = document.getElementById('nano-status-badge');
      const nanoText = document.getElementById('nano-status-text');
      if (nanoBadge && nanoText) {
        nanoBadge.className = 'ai-status-badge status-unsupported';
        nanoText.textContent = 'Nano: Unsupported';
      }
      return;
    }

    const res = await extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS).catch((e): Record<string, any> => {
      console.warn('[Clawd Popup] storage.get settings error:', e);
      return {};
    });
      const settings = res[STORAGE_KEYS.SETTINGS] || {};
      if (!settings.aiMode) {
        if (aiStatusBadge && aiStatusText) {
          aiStatusBadge.className = 'ai-status-badge status-checking';
          aiStatusText.textContent = 'Brain: Lite';
        }
        return;
      }

      extensionApi.runtime.sendMessage<any>({ type: 'check-local-ai-status' }).then((response) => {
        if (!aiStatusBadge || !aiStatusText) return;

        if (!response || !response.success) {
          aiStatusBadge.className = 'ai-status-badge status-unsupported';
          aiStatusText.textContent = 'BERT: Offline';
        } else {
          const { state, progress } = response;
          if (state === 'ready') {
            aiStatusBadge.className = 'ai-status-badge status-ready';
            aiStatusText.textContent = 'BERT: Ready';
          } else if (state === 'loading') {
            aiStatusBadge.className = 'ai-status-badge status-downloading';
            aiStatusText.textContent = `BERT: ${progress}%`;
          } else if (state === 'error') {
            aiStatusBadge.className = 'ai-status-badge status-unsupported';
            aiStatusText.textContent = 'BERT: Error';
          } else {
            aiStatusBadge.className = 'ai-status-badge status-checking';
            aiStatusText.textContent = 'BERT: Checking';
          }
        }
      }).catch(() => {
        if (aiStatusBadge && aiStatusText) {
          aiStatusBadge.className = 'ai-status-badge status-unsupported';
          aiStatusText.textContent = 'BERT: Offline';
        }
      });

      extensionApi.runtime.sendMessage<any>({ type: 'check-tab-ai-availability' }).then((response) => {
        const nanoBadge = document.getElementById('nano-status-badge');
        const nanoText = document.getElementById('nano-status-text');
        if (!nanoBadge || !nanoText) return;

        let availability = response?.availability;

        const applyAvailability = (avail: string | undefined) => {
          if (!avail || avail === 'no' || avail === 'unavailable') {
            nanoBadge.className = 'ai-status-badge status-unsupported';
            nanoText.textContent = 'Nano: Unsupported';
          } else if (avail === 'after-download' || avail === 'downloadable' || avail === 'downloading') {
            nanoBadge.className = 'ai-status-badge status-downloading';
            nanoText.textContent = 'Nano: Downloading';
          } else if (avail === 'readily' || avail === 'available') {
            nanoBadge.className = 'ai-status-badge status-ready';
            nanoText.textContent = 'Nano: Ready';
          } else {
            nanoBadge.className = 'ai-status-badge status-checking';
            nanoText.textContent = 'Nano: Waiting';
          }
        };

        if (!response || availability === 'no') {
          if ('ai' in window && (window as any).ai?.languageModel) {
            (window as any).ai.languageModel.capabilities().then((cap: any) => {
              applyAvailability(cap.available);
            }).catch(() => {
              applyAvailability('no');
            });
          } else {
            applyAvailability(availability || 'no');
          }
        } else {
          applyAvailability(availability);
        }
      }).catch(() => {
        const nanoBadge = document.getElementById('nano-status-badge');
        const nanoText = document.getElementById('nano-status-text');
        if (nanoBadge && nanoText) {
          nanoBadge.className = 'ai-status-badge status-unsupported';
          nanoText.textContent = 'Nano: Unsupported';
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
        el.setAttribute('draggable', 'true');
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
        extensionApi.runtime.openOptionsPage().catch((e) => {
          console.warn('[Clawd Popup] openOptionsPage error:', e);
        });
      });
    }

    const btnChat = document.getElementById('btn-open-chat');
    if (btnChat) {
      btnChat.addEventListener('click', async () => {
        const [tab] = await extensionApi.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          try {
            await extensionApi.tabs.sendMessage(tab.id, { type: 'toggle-chat' });
            window.close(); // Close popup
          } catch (e) {
            console.info('No content script in tab. Falling back to options page chat.');
            await extensionApi.tabs.create({ url: getRuntimeUrl('options/options.html#chat') });
            window.close();
          }
        }
      });
    }

    const versionEl = document.getElementById('version-display');
    const manifest = extensionApi.runtime.getManifest();
    if (versionEl && manifest) {
      versionEl.textContent = `v${manifest.version}`;
    }
  };
  setupDashboardLink();

  // Inline SVG optimizer to remove unused bounding box space
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
      
      let formattedContent = content.replace(/<svg[^>]*>/, (match) => {
          let updated = match.replace(/viewBox="[^"]*"/, `viewBox="${minX} ${minY} ${width} ${height}"`);
          if (!updated.includes('viewBox=')) updated = updated.replace('<svg', `<svg viewBox="${minX} ${minY} ${width} ${height}"`);
          updated = updated.replace(/width="[^"]*"/, `width="${width}"`);
          updated = updated.replace(/height="[^"]*"/, `height="${height}"`);
          return updated;
      });

      return formattedContent;
  }

  // Optimize static stat-icon SVGs
  const statIcons = document.querySelectorAll('.stat-icon') as NodeListOf<HTMLImageElement>;
  statIcons.forEach(icon => {
    const src = icon.getAttribute('src');
    if (src && src.endsWith('.svg')) {
      fetch(src).then(r => r.text()).then(svgText => {
        const optimizedSvg = optimizeSvgStr(svgText);
        const dataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(optimizedSvg)))}`;
        icon.src = dataUri;
      }).catch(e => {
        console.warn('[Clawd Popup] Failed to optimize stat icon:', e);
      });
    }
  });

  const data = await extensionApi.storage.local.get<Record<string, any>>([STORAGE_KEYS.STATS, STORAGE_KEYS.SETTINGS, STORAGE_KEYS.MOOD]);
  blockedDomains = data[STORAGE_KEYS.SETTINGS]?.blockedDomains || [];
  
  if (data[STORAGE_KEYS.SETTINGS]?.name) {
    (document.getElementById('pet-name') as HTMLElement).textContent = data[STORAGE_KEYS.SETTINGS].name;
  }
  
  let currentCostume = data[STORAGE_KEYS.SETTINGS]?.costume;
  let customColor: string | undefined = undefined;
  
  // Custom Color is only active if level >= 15 or Prestige > 0
  const stats = data[STORAGE_KEYS.STATS];
  if (stats && (stats.level >= 15 || (stats.prestige && stats.prestige > 0))) {
    customColor = data[STORAGE_KEYS.SETTINGS]?.customColor;
  }

  updateUIStats(stats);
  updateUIMood(data[STORAGE_KEYS.MOOD] || 'happy', currentCostume, customColor);

  const tabHideToggle = document.getElementById('tab-hide-toggle') as HTMLInputElement;
  const siteHideToggle = document.getElementById('site-hide-toggle') as HTMLInputElement;
  const performanceModeToggle = document.getElementById('performance-mode-toggle') as HTMLInputElement;
  const ghostModeToggle = document.getElementById('ghost-mode-toggle') as HTMLInputElement;
  const siteSubtitle = document.getElementById('site-visibility-subtitle') as HTMLElement;

  if (data[STORAGE_KEYS.SETTINGS]) {
    performanceModeToggle.checked = !!data[STORAGE_KEYS.SETTINGS].performanceMode;
    ghostModeToggle.checked = !!data[STORAGE_KEYS.SETTINGS].ghostMode;
  }
  
  let currentTabId: number | undefined = undefined;
  let currentHostname = '';

  extensionApi.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
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

      extensionApi.tabs.sendMessage<any>(tab.id, { type: 'get-tab-visibility' }).then((response) => {
        if (response && typeof response.isHidden === 'boolean') {
          tabHideToggle.checked = response.isHidden;
          tabHideToggle.disabled = false;
        }
      }).catch(() => {
          tabHideToggle.disabled = true;
          siteHideToggle.disabled = true;
      });
    } else {
      tabHideToggle.disabled = true;
      siteHideToggle.disabled = true;
    }
  }).catch(() => {
    tabHideToggle.disabled = true;
    siteHideToggle.disabled = true;
  });

  tabHideToggle.addEventListener('change', () => {
    if (currentTabId !== undefined) {
      extensionApi.tabs.sendMessage(currentTabId, {
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
      extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS).then((res) => {
        const settings = res[STORAGE_KEYS.SETTINGS] || {};
        settings.blockedDomains = blockedDomains;
        extensionApi.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
      });
    }
  });

  performanceModeToggle.addEventListener('change', () => {
    extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS).then((res) => {
      const settings = res[STORAGE_KEYS.SETTINGS] || {};
      settings.performanceMode = performanceModeToggle.checked;
      extensionApi.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    });
  });

  ghostModeToggle.addEventListener('change', () => {
    extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.SETTINGS).then((res) => {
      const settings = res[STORAGE_KEYS.SETTINGS] || {};
      settings.ghostMode = ghostModeToggle.checked;
      extensionApi.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    });
  });

  extensionApi.storage.onChanged?.addListener((changes) => {
    let newStats = undefined;
    
    if (changes[STORAGE_KEYS.STATS]) {
      newStats = changes[STORAGE_KEYS.STATS].newValue;
      updateUIStats(newStats);
    }

    if (changes[STORAGE_KEYS.SETTINGS]) {
      const newSettings = changes[STORAGE_KEYS.SETTINGS].newValue;
      if (newSettings?.name) {
        (document.getElementById('pet-name') as HTMLElement).textContent = newSettings.name;
      }
      currentCostume = newSettings?.costume;
      
      // Re-evaluate color on settings change
      extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.STATS).then((res) => {
        const latestStats = newStats || res[STORAGE_KEYS.STATS];
        if (latestStats && (latestStats.level >= 15 || (latestStats.prestige && latestStats.prestige > 0))) {
          customColor = newSettings?.customColor;
        } else {
          customColor = undefined;
        }
        // Force mood update to apply new visual settings
        extensionApi.storage.local.get<Record<string, any>>(STORAGE_KEYS.MOOD).then((moodRes) => {
          updateUIMood(moodRes[STORAGE_KEYS.MOOD] || 'happy', currentCostume, customColor);
        });
      });
    }

    if (changes[STORAGE_KEYS.MOOD]) {
      updateUIMood(changes[STORAGE_KEYS.MOOD].newValue, currentCostume, customColor);
    }
  });

  const sendToActiveTab = (type: string) => {
    extensionApi.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab && tab.id) {
        extensionApi.tabs.sendMessage(tab.id, { type }).catch((e) => { console.warn('[Clawd Popup] sendMessage error:', e); });
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
    statsEl.xpText.textContent = `${Math.round(stats.xp)} / ${xpNeeded} XP`;
    statsEl.xpBar.style.width = `${Math.min(100, (stats.xp / xpNeeded) * 100)}%`;

    const roundedHappiness = Math.round(stats.happiness);
    const roundedEnergy = Math.round(stats.energy);
    const roundedCuriosity = Math.round(stats.curiosity);
    const roundedFocus = Math.round(stats.focus ?? 50);
    const roundedLeisure = Math.round(stats.leisure ?? 50);

    statsEl.happinessText.textContent = `${roundedHappiness}%`;
    statsEl.happinessBar.style.width = `${roundedHappiness}%`;

    statsEl.energyText.textContent = `${roundedEnergy}%`;
    statsEl.energyBar.style.width = `${roundedEnergy}%`;

    statsEl.curiosityText.textContent = `${roundedCuriosity}%`;
    statsEl.curiosityBar.style.width = `${roundedCuriosity}%`;

    statsEl.focusText.textContent = `${roundedFocus}%`;
    statsEl.focusBar.style.width = `${roundedFocus}%`;

    statsEl.leisureText.textContent = `${roundedLeisure}%`;
    statsEl.leisureBar.style.width = `${roundedLeisure}%`;
  }

  function updateUIMood(mood: string, costume?: string, customColor?: string): void {
    const moodEmojiEl = document.getElementById('mood-emoji');
    const moodTextEl = document.getElementById('mood-text');
    if (!moodEmojiEl || !moodTextEl) return;

    const meta = EMOTIONS_METADATA[mood] || { name: mood, emoji: '😊' };
    moodEmojiEl.textContent = meta.emoji;
    moodTextEl.textContent = meta.name;

    if (statsEl && statsEl.preview) {
      const svgName = getResolvedCostumeName(mood, costume);
      const url = getRuntimeUrl(`assets/pets/clawd-${svgName}.svg`);

      fetch(url).then(r => r.text()).then(svgText => {
        svgText = optimizeSvgStr(svgText);

        if (customColor && customColor !== '#DE886D') {
          const styleBlock = `<style>
            :root { --pet-core-color: ${customColor}; }
            [fill^="#DE886D" i], [fill^="#CF7B61" i], [fill^="#C77A5E" i], [fill^="#C9745A" i], [fill^="#A85B45" i], [fill^="#C75D3F" i] { 
              fill: var(--pet-core-color) !important; 
            }
          </style>`;
          svgText = svgText.replace(/<svg([^>]*)>/i, `<svg$1>${styleBlock}`);
        }
        
        const dataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;
        statsEl.preview.src = dataUri;
      }).catch(e => {
        console.warn('[Clawd Popup] Failed to apply SVG formatter/color:', e);
        statsEl.preview.src = url;
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
