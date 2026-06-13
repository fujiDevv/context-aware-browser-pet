import { SharedPetState } from './types';
import { springAnimate, SpringAnimation } from './animate';

export class MovementEngine {
  el: HTMLElement;
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
      this._tick();
    }
  }
  isDragging: boolean;
  wasDragged: boolean;
  _raf: number | null;
  hasFallen: boolean;
  toyTargets: { x: number; element: HTMLElement; type: string; onReach: () => void }[] = [];
  cursorTargetX: number | null = null;
  _posAnimation: SpringAnimation | null = null;

  constructor(el: HTMLElement, initialSettings: { size?: number; speed?: number } = {}) {
    this.el = el;
    this.state = 'walk-bottom';
    
    this.size = initialSettings.size || 64;
    this.speed = initialSettings.speed || 1.2;
    
    this.x = Math.random() * (window.innerWidth - this.size);
    this.y = window.innerHeight - this.size;
    this.direction = 1;
    
    this._paused = false;
    this.isDragging = false;
    this.wasDragged = false;
    this.hasFallen = false;
    this._raf = null;
    
    this._setupDrag();
  }

  start(): void {
    if (!this.hasFallen) {
      this.hasFallen = true;
      const targetY = window.innerHeight - this.size;
      this.y = -this.size;
      this.paused = true;
      this.state = 'falling';
      this._apply();

      this._posAnimation = springAnimate(this.el, {
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
  }

  _stopPosAnimation(): void {
    if (this._posAnimation) {
      try {
        this._posAnimation.stop();
      } catch (e) {}
      this._posAnimation = null;
    }
  }

  shoo(): void {
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
    this._posAnimation = springAnimate(this.el, {
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
    const img = this.el.querySelector('#browser-pet-img') as HTMLImageElement | null;
    if (img) {
      img.style.transform = `${flip} rotate(0deg)`;
    }
  }

  updateSettings(settings: { size?: number; speed?: number }): void {
    if (settings.speed !== undefined) {
      this.speed = settings.speed;
    }
    if (settings.size !== undefined) {
      this.size = settings.size;
      
      this.el.style.width = `${this.size}px`;
      this.el.style.height = `${this.size}px`;
      
      const W = window.innerWidth - this.size;
      const H = window.innerHeight - this.size;
      this.x = Math.max(0, Math.min(this.x, W));
      this.y = Math.max(0, Math.min(this.y, H));
    }
    this._apply();
  }

  _tick(): void {
    if (this._paused) {
      this._raf = null;
      return;
    }
    this._step();
    this._apply();
    this._raf = requestAnimationFrame(() => this._tick());
  }

  _step(): void {
    const W = window.innerWidth - this.size;
    const H = window.innerHeight - this.size;

    this.y = H;

    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 6;
    const currentSpeed = isNight ? this.speed * 0.5 : this.speed;

    if (this.toyTargets.length > 0) {
      const currentTarget = this.toyTargets[0];
      const targetX = currentTarget.x;
      if (Math.abs(this.x - targetX) <= Math.max(currentSpeed, 2)) {
        this.x = targetX;
        this.toyTargets.shift();
        currentTarget.onReach();
      } else {
        this.direction = targetX > this.x ? 1 : -1;
        this.x += currentSpeed * this.direction;
      }
    } else if (this.cursorTargetX !== null) {
      const targetX = this.cursorTargetX;
      if (Math.abs(this.x - targetX) <= Math.max(currentSpeed, 2)) {
        this.x = targetX;
        this.cursorTargetX = null;
      } else {
        this.direction = targetX > this.x ? 1 : -1;
        this.x += currentSpeed * this.direction;
      }
    } else {
      this.x += currentSpeed * this.direction;

      if (this.x >= W) {
        this.x = W;
        this.direction = -1;
      } else if (this.x <= 0) {
        this.x = 0;
        this.direction = 1;
      }

      if (Math.random() < 0.0005) {
        this._idlePause();
      }
    }
  }

  addToyTarget(x: number, element: HTMLElement, type: string, onReach: () => void): void {
    this._stopPosAnimation();
    this.toyTargets.push({ x, element, type, onReach });
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
      try {
        target.element.remove();
      } catch (e) {}
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
    const flip = (this.direction === -1) ? 'scaleX(-1)' : 'scaleX(1)';
    const rotate = 'rotate(0deg)';

    this.el.style.setProperty('--pet-x', `${this.x}px`);
    this.el.style.setProperty('--pet-y', `${this.y}px`);
    this.el.style.transform = `translate(var(--pet-x), var(--pet-y))`;
    this.el.style.left = '0px';
    this.el.style.top = '0px';
    this.el.style.bottom = 'auto';
    
    const img = this.el.querySelector('#browser-pet-img') as HTMLImageElement | null;
    if (img) {
      img.style.transform = `${flip} ${rotate}`;
      img.style.width = `${this.size}px`;
      img.style.height = `${this.size}px`;
    }
  }

  _setupDrag(): void {
    const img = this.el.querySelector('img');
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
    this._stopPosAnimation();

    this.el.style.setProperty('--pet-x', `${this.x}px`);
    this.el.style.setProperty('--pet-y', `${this.y}px`);
    this.el.style.transform = `translate(var(--pet-x), var(--pet-y))`;
    this.el.style.left = '0px';
    this.el.style.top = '0px';
    this.el.style.bottom = 'auto';
    
    const img = this.el.querySelector('#browser-pet-img') as HTMLImageElement | null;
    if (img) {
      img.style.transform = 'scaleX(1) rotate(0deg)';
    }
  }

  _snapToNearestEdge(): void {
    this._stopPosAnimation();

    const W = window.innerWidth - this.size;
    const H = window.innerHeight - this.size;
    
    this.y = H;
    this.state = 'walk-bottom';
    
    if (this.x >= W / 2) {
      this.direction = -1;
    } else {
      this.direction = 1;
    }
    
    this.paused = true;
    
    // Spring snap to the bottom floor
    this._posAnimation = springAnimate(this.el, {
      '--pet-x': `${this.x}px`,
      '--pet-y': `${this.y}px`
    }, {
      stiffness: 250,
      damping: 16
    });

    this._posAnimation.then(() => {
      this.paused = false;
    });

    const flip = (this.direction === -1) ? 'scaleX(-1)' : 'scaleX(1)';
    const img = this.el.querySelector('#browser-pet-img') as HTMLImageElement | null;
    if (img) {
      img.style.transform = `${flip} rotate(0deg)`;
      img.style.width = `${this.size}px`;
      img.style.height = `${this.size}px`;
    }
  }

  syncState(state: Partial<SharedPetState>): void {
    if (this.isDragging) return;
    
    this._stopPosAnimation();
    this.hasFallen = true;

    const W = window.innerWidth - this.size;
    
    this.x = Math.max(0, Math.min(state.x ?? this.x, W));
    this.y = window.innerHeight - this.size;
    this.state = 'walk-bottom';
    this.direction = state.direction || 1;
    this.paused = state.paused ?? false;
    this._apply();
  }

  _safeSendMessage(msg: any): void {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage(msg).catch(() => {});
      }
    } catch (e) {
    }
  }
}
