import { TriggerSnapshot } from './types';

export class TriggerDetector {
  _lastInput: number;
  _keyCount: number;
  _keyTimer: any;
  _lastError: number | null;
  _isVideo: boolean;
  _isSubmitting: boolean;
  _hasConsoleError: boolean;
  _mouseX: number;
  _lastMouseMove: number;

  constructor() {
    this._lastInput = Date.now();
    this._keyCount = 0;
    this._keyTimer = null;
    this._lastError = null;
    this._isVideo = false;
    this._isSubmitting = false;
    this._hasConsoleError = false;
    this._mouseX = window.innerWidth / 2;
    this._lastMouseMove = Date.now();

    this._bindEvents();
    this._watchVideo();
  }

  snapshot(): TriggerSnapshot {
    return {
      hostname:         location.hostname,
      pageTitle:        document.title,
      idleSeconds:      Math.floor((Date.now() - this._lastInput) / 1000),
      isTypingHeavy:    this._keyCount > 5,
      isVideoPlaying:   this._isVideo,
      isFormSubmitting: this._isSubmitting,
      lastHttpError:    this._lastError,
      scrollDepth:      this._scrollDepth(),
      hasConsoleError:  this._hasConsoleError,
      mouseX:           this._mouseX,
      isCursorActive:   (Date.now() - this._lastMouseMove) < 5000,
    };
  }

  setHttpError(code: number): void {
    this._lastError = code;
    setTimeout(() => {
      if (this._lastError === code) {
        this._lastError = null;
      }
    }, 20_000);
  }

  clearHttpError(): void {
    this._lastError = null;
  }

  clearConsoleError(): void {
    this._hasConsoleError = false;
  }

  _bindEvents(): void {
    const resetIdle = () => {
      this._lastInput = Date.now();
    };
    
    document.addEventListener('mousemove', (e: MouseEvent) => {
      resetIdle();
      this._mouseX = e.clientX;
      this._lastMouseMove = Date.now();
    }, { passive: true });

    document.addEventListener('keydown', resetIdle, { passive: true });
    document.addEventListener('scroll', resetIdle, { passive: true });
    document.addEventListener('click', resetIdle, { passive: true });

    document.addEventListener('keydown', () => {
      this._keyCount++;
      clearTimeout(this._keyTimer);
      this._keyTimer = setTimeout(() => {
        this._keyCount = 0;
      }, 5000);
    }, { passive: true });

    document.addEventListener('submit', () => {
      this._isSubmitting = true;
      setTimeout(() => {
        this._isSubmitting = false;
      }, 3000);
    }, { passive: true });

    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'PET_PAGE_ERROR') {
        this._hasConsoleError = true;
        window.dispatchEvent(new CustomEvent('pet-console-error'));
      }
    });

    window.addEventListener('error', () => {
      this._hasConsoleError = true;
      window.dispatchEvent(new CustomEvent('pet-console-error'));
    });
  }

  _watchVideo(): void {
    const checkVideoState = () => {
      const videos = document.querySelectorAll('video');
      this._isVideo = Array.from(videos).some(video => {
        return !video.paused && !video.ended && video.readyState > 2;
      });
    };
    
    setInterval(checkVideoState, 2000);
  }

  _scrollDepth(): number {
    const doc = document.documentElement;
    const totalHeight = doc.scrollHeight - window.innerHeight;
    if (totalHeight <= 0) return 0;
    return doc.scrollTop / totalHeight;
  }
}
