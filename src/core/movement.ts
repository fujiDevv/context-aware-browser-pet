import { SharedPetState, PetMessage } from '../shared/types';
import { springAnimate, SpringAnimation } from '../ui/animate';
import { extensionApi } from '../shared/platform';

export class MovementEngine {
  elRef: WeakRef<HTMLElement>;
  containerRef?: WeakRef<HTMLElement>;
  imgRef?: WeakRef<HTMLImageElement>;
  bubbleRef?: WeakRef<HTMLElement>;
  isSandbox: boolean;
  state: string;
  size: number;
  speed: number;
  flightSpeed: number;
  performanceMode: boolean;
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
  onFlightStart?: () => void;
  onFlightEnd?: () => void;
  private _isResizeBound = false;

  _handleResize = () => {
    const container = this.containerRef?.deref();
    const W = (container ? container.offsetWidth : window.innerWidth) - this.size;
    const H = (container ? container.offsetHeight : window.innerHeight) - this.size;
    this.x = Math.max(0, Math.min(this.x, W));
    this.y = Math.max(0, Math.min(this.y, H));

    if (this.state === 'walk-top') {
      this.y = 0;
    } else {
      this.y = H;
      this.state = 'walk-bottom';
    }

    this._apply();
  };

  constructor(el: HTMLElement, initialSettings: { size?: number; speed?: number; container?: HTMLElement; isSandbox?: boolean; performanceMode?: boolean } = {}) {
    this.elRef = new WeakRef(el);
    if (initialSettings.container) {
      this.containerRef = new WeakRef(initialSettings.container);
    }
    this.isSandbox = initialSettings.isSandbox || false;
    this.state = 'walk-bottom';

    this.size = initialSettings.size || 100;
    this.speed = initialSettings.speed || 1.2;
    this.flightSpeed = 1.0;
    this.performanceMode = initialSettings.performanceMode || false;

    const container = initialSettings.container;
    const W = (container ? container.offsetWidth : window.innerWidth) - this.size;
    const H = (container ? container.offsetHeight : window.innerHeight) - this.size;

    this.x = Math.random() * W;
    this.y = H;
    this.direction = 1;

    this._paused = false;
    this.isDragging = false;
    this.wasDragged = false;
    this.hasFallen = false;
    this._raf = null;
    this.lastTime = 0;

    this._setupDrag();
  }

  get el(): HTMLElement | null {
    return this.elRef.deref() || null;
  }

  start(): void {
    const el = this.el;
    if (!el) return;

    if (!this._isResizeBound) {
      window.addEventListener('resize', this._handleResize);
      document.addEventListener('visibilitychange', this._handleVisibilityChange);
      this._isResizeBound = true;
    }

    if (!this.hasFallen) {
      this.hasFallen = true;
      const container = this.containerRef?.deref();
      const H = (container ? container.offsetHeight : window.innerHeight) - this.size;

      // Always Ground for initial spawn
      const targetY = H;
      const startY = H - 150;
      const startState = 'walk-bottom';

      this.y = startY;
      this.state = startState;
      this.paused = true;
      this._apply();

      this._posAnimation = springAnimate(el, {
        '--pet-x': `${this.x}px`,
        '--pet-y': `${targetY}px`
      }, {
        stiffness: 200,
        damping: 15,
        mass: 1
      });

      this._posAnimation.then(() => {
        this.y = targetY;
        this.paused = false;
        if (this.onLanding) this.onLanding();
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
    document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    this._isResizeBound = false;
  }

  private _handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.resumeTick();
    }
  };

  _stopPosAnimation(): void {
    if (this._posAnimation) {
      try {
        this._posAnimation.stop();
      } catch (e) { console.warn('[Arcrawls Movement] handleWindowResize error:', e); }
      this._posAnimation = null;
    }
  }

  public isFlying(): boolean {
    const container = this.containerRef?.deref();
    const H = (container ? container.offsetHeight : window.innerHeight) - this.size;
    return this.y < H - 5;
  }

  _triggerFall(edgeX?: number): void {
    const el = this.el;
    if (!el) return;

    this._stopPosAnimation();
    this.paused = true;

    if (edgeX !== undefined) {
      this.x = edgeX;
    }

    const container = this.containerRef?.deref();
    const H = (container ? container.offsetHeight : window.innerHeight) - this.size;

    // Reset rotation immediately so the pet drops upright
    this.state = 'walk-bottom';
    this._apply();

    this._safeSendMessage({
      type: 'update-pet-state',
      state: { x: this.x, y: H, state: this.state, direction: this.direction, paused: this.paused }
    });

    this._posAnimation = springAnimate(el, {
      '--pet-x': `${this.x}px`,
      '--pet-y': `${H}px`
    }, {
      stiffness: 150,
      damping: 15,
      mass: 1.5
    });

    this._posAnimation.then(() => {
      this.y = H;
      this.paused = false;
      if (this.onLanding) this.onLanding();
      this._safeSendMessage({
        type: 'update-pet-state',
        state: { x: this.x, y: this.y, state: this.state, direction: this.direction, paused: this.paused }
      });
    });
  }

  _triggerRocketFlight(): void {
    const el = this.el;
    if (!el) return;

    this._stopPosAnimation();
    this.paused = true;

    if (this.onFlightStart) this.onFlightStart();

    // 1. Preparation Phase (Engine Charging)
    setTimeout(() => {
      const el = this.el;
      if (!el || !this.hasFallen || this.isDragging) {
        if (this.onFlightEnd) this.onFlightEnd(); // abort safely
        this.paused = false;
        return;
      }

      this._safeSendMessage({
        type: 'update-pet-state',
        state: { x: this.x, y: 0, state: 'walk-top', direction: this.direction, paused: this.paused }
      });

      // 2. Vertical Ascent Phase (Smooth lift-off to ceiling)
      this._posAnimation = springAnimate(el, {
        '--pet-y': '0px',
        '--pet-rotation': '0deg'
      }, {
        stiffness: 18 * this.flightSpeed,
        damping: 14 * Math.sqrt(this.flightSpeed),
        mass: 4.0 // Very heavy, steady ascent
      });

      this._posAnimation.then(() => {
        // 3. Landing Maneuver Phase (Smooth flip to orient to ceiling)
        this._posAnimation = springAnimate(el, {
          '--pet-rotation': '180deg'
        }, {
          stiffness: 150,
          damping: 12,
          mass: 0.8 // Light, quick flip
        });

        this._posAnimation.then(() => {
          this.y = 0;
          this.state = 'walk-top';
          this.paused = false;
          if (this.onFlightEnd) this.onFlightEnd();
          this._apply();
          this._safeSendMessage({
            type: 'update-pet-state',
            state: { x: this.x, y: this.y, state: this.state, direction: this.direction, paused: this.paused }
          });
        });
      });
    }, 1000);
  }

  shoo(onComplete?: () => void): Promise<void> {
    const el = this.el;
    if (!el) return Promise.resolve();

    this._stopPosAnimation();
    this.clearToyTargets();

    const container = this.containerRef?.deref();
    const W = (container ? container.offsetWidth : window.innerWidth) - this.size;
    const H = (container ? container.offsetHeight : window.innerHeight) - this.size;

    // Shoo exclusively to Top or Bottom
    const edges = ['bottom', 'top'];
    const targetEdge = edges[Math.floor(Math.random() * edges.length)];

    if (targetEdge === 'bottom') {
      this.x = Math.random() * W;
      this.y = H;
      this.state = 'walk-bottom';
      this.direction = Math.random() < 0.5 ? 1 : -1;
    } else {
      this.x = Math.random() * W;
      this.y = 0;
      this.state = 'walk-top';
      this.direction = Math.random() < 0.5 ? 1 : -1;
    }

    this.paused = true;
    
    this._safeSendMessage({
      type: 'update-pet-state',
      state: { x: this.x, y: this.y, state: this.state, direction: this.direction, paused: this.paused }
    });

    this._posAnimation = springAnimate(el, {
      '--pet-x': `${this.x}px`,
      '--pet-y': `${this.y}px`
    }, {
      stiffness: 120,
      damping: 12
    });

    const promise = new Promise<void>((resolve) => {
      this._posAnimation!.then(() => {
        this.paused = false;
        if (onComplete) onComplete();
        this._safeSendMessage({
          type: 'update-pet-state',
          state: { x: this.x, y: this.y, state: this.state, direction: this.direction, paused: this.paused }
        });
        resolve();
      });
    });

    this._apply();
    return promise;
  }

  updateSettings(settings: { size?: number; speed?: number; flightSpeed?: number; performanceMode?: boolean }): void {
    if (settings.speed !== undefined) {
      this.speed = settings.speed;
    }
    if (settings.flightSpeed !== undefined) {
      this.flightSpeed = settings.flightSpeed;
    }
    if (settings.performanceMode !== undefined) {
      this.performanceMode = settings.performanceMode;
    }
    const el = this.el;
    if (settings.size !== undefined) {
      this.size = settings.size;

      if (el) {
        el.style.width = `${this.size}px`;
        el.style.height = `auto`;
      }

      const container = this.containerRef?.deref();
      const W = (container ? container.offsetWidth : window.innerWidth) - this.size;
      const H = (container ? container.offsetHeight : window.innerHeight) - this.size;
      this.x = Math.max(0, Math.min(this.x, W));
      this.y = Math.max(0, Math.min(this.y, H));

      if (this.state === 'walk-top') {
        this.y = 0;
      } else if (this.state === 'walk-bottom') {
        this.y = H;
      }
    }
    this._apply();
  }

  _tick(currentTime?: number): void {
    if (this._paused || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
      this._raf = null; // Completely halt the loop to save CPU/Battery
      return;
    }

    const el = this.el;
    if (!el) {
      this._raf = null;
      return;
    }

    if (!currentTime) {
      currentTime = performance.now();
    }

    if (!this.lastTime) {
      this.lastTime = currentTime;
    }

    const deltaTime = currentTime - this.lastTime;
    let timeMultiplier = 1;

    if (deltaTime > 0) {
      // Cap at 30fps in performance mode (skip frames if < 33ms)
      if (this.performanceMode && deltaTime < 33) {
        this._raf = requestAnimationFrame((time) => this._tick(time));
        return;
      }

      this.lastTime = currentTime;
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
    const container = this.containerRef?.deref();
    const W = (container ? container.offsetWidth : window.innerWidth) - this.size;
    const H = (container ? container.offsetHeight : window.innerHeight) - this.size;

    // Hardcoded night speed removed. Rely on content.ts to set this.speed via updateSettings
    const currentSpeed = this.speed * timeMultiplier;

    let targetX: number | null = null;
    let targetY: number | null = null;
    let onReach: (() => void) | null = null;

    if (this.toyTargets.length > 0) {
      targetX = this.toyTargets[0].x;
      targetY = H;
      onReach = () => {
        const t = this.toyTargets.shift();
        if (t) t.onReach();
      };
    } else if (this.cursorTargetX !== null) {
      targetX = this.cursorTargetX;
      targetY = H;
    }

    if (targetX !== null && targetY !== null) {
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
        // Triggers immediate drop if chasing on the ceiling
        this._triggerFall();
      }
    } else {
      // Autonomous movement 
      if (this.state === 'walk-bottom') {
        this.x += currentSpeed * this.direction;
        // Flip direction dynamically when hitting the Left/Right boundaries
        if (this.x >= W) { this.x = W; this.direction = -1; }
        else if (this.x <= 0) { this.x = 0; this.direction = 1; }

        if (Math.random() < 0.0005) {
          this._idlePause();
        } else if (Math.random() < 0.0001) {
          this._triggerRocketFlight();
        }
      } else if (this.state === 'walk-top') {
        this.x += currentSpeed * this.direction;
        // Fall down when walking off the Left/Right edge of the ceiling
        if (this.x >= W) {
          this._triggerFall(W);
        } else if (this.x <= 0) {
          this._triggerFall(0);
        } else if (Math.random() < 0.0005) {
          this._idlePause();
        }
      } else {
        // Fallback for errant states
        this._triggerFall();
      }
    }
  }

  addToyTarget(x: number, element: HTMLElement, type: string, onReach: () => void): void {
    this._stopPosAnimation();
    this.toyTargets.push({ x, elementRef: new WeakRef(element), type, onReach });
    this.cursorTargetX = null;
    this.paused = false;
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
        } catch (e) { console.warn('[Arcrawls Movement] toy removal error:', e); }
      }
    });
    this.toyTargets = [];
  }

  chaseCursor(x: number): void {
    this._stopPosAnimation();
    this.cursorTargetX = x;
    this.paused = false;
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
    } else if (this.state === 'walk-bottom') {
      flipValue = -this.direction;
    } else {
      // Legacy catch-all handling in the event a network sync forces a left/right edge
      if (this.state === 'walk-left') {
        rotate = '90deg';
        flipValue = -this.direction;
      } else if (this.state === 'walk-right') {
        rotate = '-90deg';
        flipValue = this.direction;
      }
    }

    const flip = (flipValue === -1) ? 'scaleX(-1)' : 'scaleX(1)';

    // Ensure the container exactly matches this.size so it anchors perfectly to the screen bounds
    el.style.width = `${this.size}px`;
    el.style.height = `${this.size}px`;
    el.style.setProperty('--pet-x', `${this.x}px`);
    el.style.setProperty('--pet-y', `${this.y}px`);
    el.style.setProperty('--pet-offset-y', `0px`);
    
    // Only set rotation and flip if we are NOT in an active flight/fall animation
    // The posAnimation sets its own rotation to animate smoothly.
    if (!this.paused || this.isDragging) {
      el.style.setProperty('--pet-rotation', rotate);
      el.style.setProperty('--pet-flip', flip);
    }

    // A single DOM write per frame using GPU-composited translate3d reading from CSS variables
    el.style.transform = `translate3d(var(--pet-x), var(--pet-y), 0)`;

    // Position resets (Should only be set once during init, not every frame)
    if (!this.wasDragged) {
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.bottom = 'auto';
      el.style.position = 'absolute';
    }

    const img = this.imgRef?.deref() || (el.querySelector('#browser-pet-img') as HTMLImageElement | null);
    if (img && !this.imgRef) this.imgRef = new WeakRef(img);
    if (img) {
      // Apply internal rotation directly to the image using the variables so animations can tweak it
      img.style.transformOrigin = 'center center';
      img.style.transform = `var(--pet-flip) rotate(var(--pet-rotation))`;
      img.style.width = `calc(${this.size}px * var(--crop-w, 1))`;
      img.style.height = `auto`;
      img.style.left = `calc(${this.size}px * var(--crop-x, 0))`;
      
      // Pin the cropped image directly to the edges of the container for pixel-perfect ground/ceiling contact
      if (this.state === 'walk-top') {
        img.style.top = '0px';
        img.style.bottom = 'auto';
      } else {
        img.style.top = 'auto';
        img.style.bottom = '0px';
      }
    }

    // Speech bubble positioning
    const bubble = this.bubbleRef?.deref() || (el.parentElement?.querySelector('.pet-speech-bubble') as HTMLElement | null);
    if (bubble && !this.bubbleRef) this.bubbleRef = new WeakRef(bubble);
    if (bubble) {
      const isShowing = bubble.classList.contains('show') || (bubble as any)._isShowing;
      bubble.className = `pet-speech-bubble state-${this.state}${isShowing ? ' show' : ''}`;
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
        const container = this.containerRef?.deref();
        const W = (container ? container.offsetWidth : window.innerWidth) - this.size;
        const H = (container ? container.offsetHeight : window.innerHeight) - this.size;

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
        }, true);
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

    const container = this.containerRef?.deref();
    const W = (container ? container.offsetWidth : window.innerWidth) - this.size;

    const dragRotate = '0deg';
    const dragFlip = this.x >= W / 2 ? 'scaleX(1)' : 'scaleX(-1)';

    el.style.width = `${this.size}px`;
    el.style.height = `${this.size}px`;
    el.style.setProperty('--pet-x', `${this.x}px`);
    el.style.setProperty('--pet-y', `${this.y}px`);
    el.style.setProperty('--pet-rotation', dragRotate);
    el.style.setProperty('--pet-flip', dragFlip);
    el.style.setProperty('--pet-offset-y', `0px`);
    el.style.transform = `translate3d(var(--pet-x), var(--pet-y), 0)`;
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.bottom = 'auto';

    const img = el.querySelector('#browser-pet-img') as HTMLImageElement | null;
    if (img) {
      img.style.transformOrigin = 'center center';
      img.style.transform = `var(--pet-flip) rotate(var(--pet-rotation))`;
      
      // Update image anchor based on current drag state
      if (this.state === 'walk-top') {
        img.style.top = '0px';
        img.style.bottom = 'auto';
      } else {
        img.style.top = 'auto';
        img.style.bottom = '0px';
      }
    }
  }

  _snapToNearestEdge(): void {
    const el = this.el;
    if (!el) return;

    this._stopPosAnimation();

    const container = this.containerRef?.deref();
    const W = (container ? container.offsetWidth : window.innerWidth) - this.size;
    const H = (container ? container.offsetHeight : window.innerHeight) - this.size;

    const distTop = this.y;
    const distBottom = H - this.y;

    // Forces snapping exclusively to the ceiling or the floor
    if (distTop <= distBottom) {
      this.y = 0;
      this.state = 'walk-top';
      this.direction = this.x >= W / 2 ? -1 : 1;
    } else {
      this.y = H;
      this.state = 'walk-bottom';
      this.direction = this.x >= W / 2 ? -1 : 1;
    }

    this.paused = true;

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

    const newX = state.x ?? this.x;
    const newY = state.y ?? this.y;

    // Jitter Reduction: Only stop animations and jump if distance delta is significant (> 60px)
    // or if the state (floor/ceiling) has changed.
    const dx = newX - this.x;
    const dy = newY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const stateChanged = state.state && state.state !== this.state;

    if (distance < 60 && !stateChanged) {
      // Small update: update internal coordinates but don't stop current spring animation
      this.x = newX;
      this.y = newY;
      if (state.direction !== undefined) this.direction = state.direction;
      if (state.paused !== undefined) this.paused = state.paused;
      this._apply();
      return;
    }

    this._stopPosAnimation();
    this.hasFallen = true;

    const container = this.containerRef?.deref();
    const W = (container ? container.offsetWidth : window.innerWidth) - this.size;
    const H = (container ? container.offsetHeight : window.innerHeight) - this.size;

    this.x = Math.max(0, Math.min(newX, W));
    this.y = Math.max(0, Math.min(newY, H));
    this.state = state.state || 'walk-bottom';
    this.direction = state.direction || 1;
    this.paused = state.paused ?? false;
    this._apply();
  }

  private _lastIpcSyncTime: number = 0;

  _safeSendMessage(msg: PetMessage, force: boolean = false): void {
    if (this.isSandbox) return;
    if (this.performanceMode && msg.type === 'update-pet-state') return;

    // Throttle IPC messages to prevent massive overhead during drag/frequent updates
    if (msg.type === 'update-pet-state' && !force) {
      const now = Date.now();
      if (now - this._lastIpcSyncTime < 100) return;
      this._lastIpcSyncTime = now;
    }

    try {
      if (extensionApi.runtime.id) {
        extensionApi.runtime.sendMessage(msg).catch((e) => { console.warn('[Arcrawls Movement] runtime.sendMessage error:', e); });
      }
    } catch (e) { }
  }
}
