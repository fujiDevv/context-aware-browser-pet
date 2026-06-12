import { SharedPetState } from './types';

export class MovementEngine {
  el: HTMLElement;
  state: string;
  size: number;
  speed: number;
  x: number;
  y: number;
  direction: number;
  paused: boolean;
  isDragging: boolean;
  wasDragged: boolean;
  _raf: number | null;

  constructor(el: HTMLElement, initialSettings: { size?: number; speed?: number } = {}) {
    this.el = el;
    this.state = 'walk-bottom';
    
    this.size = initialSettings.size || 64;
    this.speed = initialSettings.speed || 1.2;
    
    this.x = Math.random() * (window.innerWidth - this.size);
    this.y = window.innerHeight - this.size;
    this.direction = 1;
    
    this.paused = false;
    this.isDragging = false;
    this.wasDragged = false;
    this._raf = null;
    
    this._setupDrag();
  }

  start(): void {
    if (!this._raf) {
      this._tick();
    }
  }

  stop(): void {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  shoo(): void {
    const W = window.innerWidth - this.size;
    const H = window.innerHeight - this.size;
    this.x = Math.random() * W;
    this.y = H;
    this.state = 'walk-bottom';
    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.paused = false;
    this._apply();
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
    if (!this.paused) {
      this._step();
    }
    this._apply();
    this._raf = requestAnimationFrame(() => this._tick());
  }

  _step(): void {
    const W = window.innerWidth - this.size;
    const H = window.innerHeight - this.size;

    this.y = H;

    this.x += this.speed * this.direction;

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

    this.el.style.left = `${this.x}px`;
    this.el.style.top = `${this.y}px`;
    this.el.style.bottom = 'auto';
    
    const img = this.el.querySelector('img');
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
    this.el.style.left = `${this.x}px`;
    this.el.style.top = `${this.y}px`;
    this.el.style.bottom = 'auto';
    
    const img = this.el.querySelector('img');
    if (img) {
      img.style.transform = 'scaleX(1) rotate(0deg)';
    }
  }

  _snapToNearestEdge(): void {
    const W = window.innerWidth - this.size;
    
    this.y = window.innerHeight - this.size;
    this.state = 'walk-bottom';
    
    if (this.x >= W / 2) {
      this.direction = -1;
    } else {
      this.direction = 1;
    }
    
    this.paused = false;
    this._apply();
  }

  syncState(state: Partial<SharedPetState>): void {
    if (this.isDragging) return;
    
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
