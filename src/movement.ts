import { SharedPetState, PetMessage } from './types';
import { springAnimate, SpringAnimation } from './animate';

export class MovementEngine {
  elRef: WeakRef<HTMLElement>;
  state: string;
  size: number;
  speed: number;
  x: number;
  y: number;
  direction: number;
  _paused: boolean;
  get paused(): boolean { return this._paused; }
  set paused(value: boolean) {
    this._paused = value;
    if (!value && !this._raf && this.hasFallen) {
      this.lastTime = 0;
      this._raf = requestAnimationFrame((time) => this._tick(time));
    }
  }
  isDragging: boolean;
  wasDragged: boolean;
  _raf: number | null;
  lastTime: number = 0;
  hasFallen: boolean;
  toyTargets: { x: number; elementRef: WeakRef<HTMLElement>; type: string; onReach: () => void }[] = [];
  cursorTargetX: number | null = null;
  _posAnimation: SpringAnimation | null = null;
  onLanding?: () => void;

  _handleResize = () => {
    const W = window.innerWidth - this.size;
    const H = window.innerHeight - this.size;
    this.x = Math.max(0, Math.min(this.x, W));
    this.y = Math.max(0, Math.min(this.y, H));

    if (this.state === 'walk-bottom') this.y = H;
    else if (this.state === 'walk-right') this.x = W;
    else if (this.state === 'walk-top') this.y = 0;
    else if (this.state === 'walk-left') this.x = 0;

    this._apply();
  };

  constructor(el: HTMLElement, initialSettings: { size?: number; speed?: number } = {}) {
    this.elRef = new WeakRef(el);
    this.state = 'walk-bottom';
    
    this.size = initialSettings.size || 100;
    this.speed = initialSettings.speed || 1.2;
    
    this.x = Math.random() * (window.innerWidth - this.size);
    this.y = window.innerHeight - this.size;
    this.direction = 1;
    
    this._paused = false;
    this.isDragging = false;
    this.wasDragged = false;
    this.hasFallen = false;
    this._raf = null;
    this.lastTime = 0;
    
    this._setupDrag();
    window.addEventListener('resize', this._handleResize);
  }

  get el(): HTMLElement | null {
    return this.elRef.deref() || null;
  }

  start(): void {
    const el = this.el;
    if (!el) return;

    if (!this.hasFallen) {
      this.hasFallen = true;
      const targetY = window.innerHeight - this.size;
      this.y = -this.size;
      this.paused = true;
      this.state = 'falling';
      this._apply();

      this._posAnimation = springAnimate(el, {
        '--pet-x': `${this.x}px`,
        '--pet-y': `${targetY}px`
      }, {
        stiffness: 180,
        damping: 15,
        mass: 1.2
      });

      this._posAnimation.then(() => {
        this.y = targetY;
        this.state = 'walk-bottom';
        this.paused = false;
      });
    } else {
      this.paused = false;
    }
  }

  stop(): void {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    window.removeEventListener('resize', this._handleResize);
  }

  _stopPosAnimation(): void {
    if (this._posAnimation) {
      try {
        this._posAnimation.stop();
      } catch (e) { console.warn('[Clawd Movement] handleWindowResize error:', e); }
      this._posAnimation = null;
    }
  }

  shoo(): void {
    const el = this.el;
    if (!el) return;

    this._stopPosAnimation();
    this.clearToyTargets();

    const W = window.innerWidth - this.size;
    const H = window.innerHeight - this.size;
    this.x = Math.random() * W;
    this.y = H;
    this.state = 'walk-bottom';
    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.paused = true;

    // Smoothly spring to the new location
    this._posAnimation = springAnimate(el, {
      '--pet-x': `${this.x}px`,
      '--pet-y': `${this.y}px`
    }, {
      stiffness: 120,
      damping: 12
    });

    this._posAnimation.then(() => {
      this.paused = false;
    });

    const flip = (this.direction === -1) ? 'scaleX(-1)' : 'scaleX(1)';
    const img = el.querySelector('#browser-pet-img') as HTMLImageElement | null;
    if (img) {
      img.style.transform = `${flip} rotate(0deg)`;
    }
  }

  updateSettings(settings: { size?: number; speed?: number }): void {
    if (settings.speed !== undefined) {
      this.speed = settings.speed;
    }
    const el = this.el;
    if (settings.size !== undefined) {
      this.size = settings.size;
      
      if (el) {
        el.style.width = `${this.size}px`;
        el.style.height = `${this.size}px`;
      }
      
      const W = window.innerWidth - this.size;
      const H = window.innerHeight - this.size;
      this.x = Math.max(0, Math.min(this.x, W));
      this.y = Math.max(0, Math.min(this.y, H));
    }
    this._apply();
  }

  _tick(currentTime?: number): void {
    if (this._paused || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
      this._raf = null;
      this.lastTime = 0;
      return;
    }
    const el = this.el;
    if (!el) {
      this._raf = null;
      this.lastTime = 0;
      return;
    }

    let timeMultiplier = 1;
    if (currentTime) {
      if (!this.lastTime) this.lastTime = currentTime;
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;
      // Cap at 3x (approx 50ms) to prevent teleportation during lag spikes
      timeMultiplier = Math.min(deltaTime / 16.66, 3);
    }

    this._step(timeMultiplier);
    this._apply();
    this._raf = requestAnimationFrame((time) => this._tick(time));
  }

  resumeTick(): void {
    if (!this._raf && !this._paused && this.hasFallen) {
      this.lastTime = 0;
      this._raf = requestAnimationFrame((time) => this._tick(time));
    }
  }

  _step(timeMultiplier: number = 1): void {
    if (this._paused || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
      return;
    }

    const W = window.innerWidth - this.size;
    const H = window.innerHeight - this.size;

    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 6;
    const currentSpeed = (isNight ? this.speed * 0.5 : this.speed) * timeMultiplier;

    // Determine target location (toys or cursor)
    let targetX: number | null = null;
    let targetY: number | null = null;
    let onReach: (() => void) | null = null;

    if (this.toyTargets.length > 0) {
      targetX = this.toyTargets[0].x;
      targetY = H; // Toys are always on the floor
      onReach = () => {
        const t = this.toyTargets.shift();
        if (t) t.onReach();
      };
    } else if (this.cursorTargetX !== null) {
      targetX = this.cursorTargetX;
      targetY = H; // Cursor chasing usually stays on floor
    }

    if (targetX !== null && targetY !== null) {
      // Pathfinding along edges towards target
      if (this.state === 'walk-bottom') {
        if (Math.abs(this.x - targetX) <= Math.max(currentSpeed, 2)) {
          this.x = targetX;
          if (onReach) onReach();
          else this.cursorTargetX = null;
        } else {
          this.direction = targetX > this.x ? 1 : -1;
          this.x += currentSpeed * this.direction;
        }
      } else {
        // Move towards bottom edge
        if (this.state === 'walk-left') {
          this.direction = 1; // Down
          this.y += currentSpeed;
          if (this.y >= H) { this.y = H; this.state = 'walk-bottom'; this.direction = 1; }
        } else if (this.state === 'walk-right') {
          this.direction = 1; // Down
          this.y += currentSpeed;
          if (this.y >= H) { this.y = H; this.state = 'walk-bottom'; this.direction = -1; }
        } else if (this.state === 'walk-top') {
          this.direction = targetX > this.x ? 1 : -1;
          this.x += currentSpeed * this.direction;
          if (this.x >= W) { this.x = W; this.state = 'walk-right'; this.direction = 1; }
          else if (this.x <= 0) { this.x = 0; this.state = 'walk-left'; this.direction = 1; }
        }
      }
    } else {
      // Autonomous movement along edges
      if (this.state === 'walk-bottom') {
        this.x += currentSpeed * this.direction;
        if (this.x >= W) { this.x = W; this.state = 'walk-right'; this.direction = -1; }
        else if (this.x <= 0) { this.x = 0; this.state = 'walk-left'; this.direction = -1; }
      } else if (this.state === 'walk-top') {
        this.x += currentSpeed * this.direction;
        if (this.x >= W) { this.x = W; this.state = 'walk-right'; this.direction = 1; }
        else if (this.x <= 0) { this.x = 0; this.state = 'walk-left'; this.direction = 1; }
      } else if (this.state === 'walk-left') {
        this.y += currentSpeed * this.direction;
        if (this.y >= H) { this.y = H; this.state = 'walk-bottom'; this.direction = 1; }
        else if (this.y <= 0) { this.y = 0; this.state = 'walk-top'; this.direction = 1; }
      } else if (this.state === 'walk-right') {
        this.y += currentSpeed * this.direction;
        if (this.y >= H) { this.y = H; this.state = 'walk-bottom'; this.direction = -1; }
        else if (this.y <= 0) { this.y = 0; this.state = 'walk-top'; this.direction = -1; }
      }

      if (Math.random() < 0.0005) {
        this._idlePause();
      }
    }
  }

  addToyTarget(x: number, element: HTMLElement, type: string, onReach: () => void): void {
    this._stopPosAnimation();
    this.toyTargets.push({ x, elementRef: new WeakRef(element), type, onReach });
    this.cursorTargetX = null; // Clear cursor chase if a toy is dropped
    this.paused = false; // Resume if pet is currently paused
  }

  setToyTarget(x: number, element: HTMLElement, type: string, onReach: () => void): void {
    this._stopPosAnimation();
    this.clearToyTargets();
    this.addToyTarget(x, element, type, onReach);
  }

  clearToyTargets(): void {
    this.toyTargets.forEach((target) => {
      const element = target.elementRef.deref();
      if (element) {
        try {
          element.remove();
        } catch (e) { console.warn('[Clawd Movement] WAAPI posAnimation.stop error:', e); }
      }
    });
    this.toyTargets = [];
  }

  chaseCursor(x: number): void {
    this._stopPosAnimation();
    this.cursorTargetX = x;
    this.paused = false; // Resume if pet is currently paused
  }

  _idlePause(): void {
    this.paused = true;
    const pauseDuration = 2000 + Math.random() * 3000;
    setTimeout(() => {
      this.paused = false;
    }, pauseDuration);
  }

  _apply(): void {
    const el = this.el;
    if (!el) return;

    let rotate = '0deg';
    let flipValue = this.direction;

    if (this.state === 'walk-top') {
      rotate = '180deg';
      flipValue = -this.direction;
    } else if (this.state === 'walk-left') {
      rotate = '90deg';
      flipValue = -this.direction;
    } else if (this.state === 'walk-right') {
      rotate = '-90deg';
      flipValue = this.direction;
    }

    const flip = (flipValue === -1) ? 'scaleX(-1)' : 'scaleX(1)';

    el.style.setProperty('--pet-x', `${this.x}px`);
    el.style.setProperty('--pet-y', `${this.y}px`);
    el.style.transform = `translate(var(--pet-x), var(--pet-y))`;
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.bottom = 'auto';
    
    const img = el.querySelector('#browser-pet-img') as HTMLImageElement | null;
    if (img) {
      img.style.transform = `${flip} rotate(${rotate})`;
      img.style.width = `${this.size}px`;
      img.style.height = `${this.size}px`;
    }
  }

  _setupDrag(): void {
    const el = this.el;
    if (!el) return;

    const img = el.querySelector('img');
    if (!img) return;

    let startX = 0, startY = 0;
    let startPetX = 0, startPetY = 0;
    const dragThreshold = 5;
    let hasMoved = false;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      
      this.clearToyTargets();
      this.isDragging = true;
      this.wasDragged = false;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      startPetX = this.x;
      startPetY = this.y;
      
      this.paused = true;
      
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      if (!hasMoved && (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)) {
        hasMoved = true;
      }
      
      if (hasMoved) {
        const W = window.innerWidth - this.size;
        const H = window.innerHeight - this.size;
        
        this.x = Math.max(0, Math.min(startPetX + dx, W));
        this.y = Math.max(0, Math.min(startPetY + dy, H));
        this._applyDragStyle();

        this._safeSendMessage({
          type: 'update-pet-state',
          state: {
            x: this.x,
            y: this.y,
            state: this.state,
            direction: this.direction,
            paused: this.paused
          }
        });
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      if (hasMoved) {
        this.wasDragged = true;
        this._snapToNearestEdge();

        this._safeSendMessage({
          type: 'update-pet-state',
          state: {
            x: this.x,
            y: this.y,
            state: this.state,
            direction: this.direction,
            paused: this.paused
          }
        });
      } else {
        this.paused = false;
        this.wasDragged = false;
      }
    };

    img.addEventListener('mousedown', onMouseDown);
  }

  _applyDragStyle(): void {
    const el = this.el;
    if (!el) return;

    this._stopPosAnimation();

    el.style.setProperty('--pet-x', `${this.x}px`);
    el.style.setProperty('--pet-y', `${this.y}px`);
    el.style.transform = `translate(var(--pet-x), var(--pet-y))`;
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.bottom = 'auto';
    
    const img = el.querySelector('#browser-pet-img') as HTMLImageElement | null;
    if (img) {
      img.style.transform = 'scaleX(1) rotate(0deg)';
    }
  }

  _snapToNearestEdge(): void {
    const el = this.el;
    if (!el) return;

    this._stopPosAnimation();

    const W = window.innerWidth - this.size;
    const H = window.innerHeight - this.size;
    
    const distLeft = this.x;
    const distRight = W - this.x;
    const distTop = this.y;
    const distBottom = H - this.y;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist === distBottom) {
      this.y = H;
      this.state = 'walk-bottom';
      this.direction = this.x >= W / 2 ? -1 : 1;
    } else if (minDist === distTop) {
      this.y = 0;
      this.state = 'walk-top';
      this.direction = this.x >= W / 2 ? -1 : 1;
    } else if (minDist === distLeft) {
      this.x = 0;
      this.state = 'walk-left';
      this.direction = this.y >= H / 2 ? -1 : 1;
    } else {
      this.x = W;
      this.state = 'walk-right';
      this.direction = this.y >= H / 2 ? -1 : 1;
    }
    
    this.paused = true;
    
    // Spring snap to the nearest edge with more "weight" and less magnetism
    this._posAnimation = springAnimate(el, {
      '--pet-x': `${this.x}px`,
      '--pet-y': `${this.y}px`
    }, {
      stiffness: 150,
      damping: 12,
      mass: 1.5
    });

    this._posAnimation.then(() => {
      this.paused = false;
      if (this.onLanding) this.onLanding();
    });

    this._apply();
  }

  syncState(state: Partial<SharedPetState>): void {
    if (this.isDragging) return;
    
    this._stopPosAnimation();
    this.hasFallen = true;

    const W = window.innerWidth - this.size;
    const H = window.innerHeight - this.size;
    
    this.x = Math.max(0, Math.min(state.x ?? this.x, W));
    this.y = Math.max(0, Math.min(state.y ?? this.y, H));
    this.state = state.state || 'walk-bottom';
    this.direction = state.direction || 1;
    this.paused = state.paused ?? false;
    this._apply();
  }

  _safeSendMessage(msg: PetMessage): void {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage(msg).catch((e) => { console.warn('[Clawd Movement] runtime.sendMessage error:', e); });
      }
    } catch (e) {
    }
  }
}
