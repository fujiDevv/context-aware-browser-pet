import { TriggerSnapshot } from './types';

export class TriggerDetector {
  _lastInput: number;
  _keyCount: number;
  _keyTimer: ReturnType<typeof setTimeout> | undefined;
  _lastError: number | null;
  _isVideo: boolean;
  _isSubmitting: boolean;
  _hasConsoleError: boolean;
  _mouseX: number;
  _lastMouseMove: number;
  _onStateChange?: () => void;

  private _bridgeToken: string | null = null;

  constructor(onStateChange?: () => void, bridgeToken?: string) {
    this._lastInput = Date.now();
    this._keyCount = 0;
    this._keyTimer = undefined;
    this._lastError = null;
    this._isVideo = false;
    this._isSubmitting = false;
    this._hasConsoleError = false;
    this._mouseX = window.innerWidth / 2;
    this._lastMouseMove = Date.now();
    this._onStateChange = onStateChange;
    this._bridgeToken = bridgeToken || null;

    this._bindEvents();
    this._watchVideo();
  }

  setBridgeToken(token: string): void {
    this._bridgeToken = token;
  }

  snapshot(): TriggerSnapshot {
    return {
      hostname: location.hostname,
      pageTitle: document.title,
      idleSeconds: Math.floor((Date.now() - this._lastInput) / 1000),
      isTypingHeavy: this._keyCount > 5,
      isVideoPlaying: this._isVideo,
      isFormSubmitting: this._isSubmitting,
      lastHttpError: this._lastError,
      scrollDepth: this._scrollDepth(),
      hasConsoleError: this._hasConsoleError,
      mouseX: this._mouseX,
      isCursorActive: (Date.now() - this._lastMouseMove) < 5000,
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

  private _resetIdle = (): void => {
    this._lastInput = Date.now();
  };

  private _onMouseMove = (e: MouseEvent): void => {
    this._resetIdle();
    this._mouseX = e.clientX;
    this._lastMouseMove = Date.now();
  };

  private _onKeyDown = (): void => {
    this._resetIdle();
  };

  private _onScroll = (): void => {
    this._resetIdle();
  };

  private _onClick = (): void => {
    this._resetIdle();
  };

  private _onKeyDownHeavy = (): void => {
    const wasTypingHeavy = this._keyCount > 5;
    this._keyCount++;
    clearTimeout(this._keyTimer);
    this._keyTimer = setTimeout(() => {
      this._keyCount = 0;
      if (this._onStateChange) this._onStateChange();
    }, 5000);

    if (!wasTypingHeavy && this._keyCount > 5 && this._onStateChange) {
      this._onStateChange();
    }
  };

  private _onSubmit = (): void => {
    this._isSubmitting = true;
    if (this._onStateChange) this._onStateChange();
    setTimeout(() => {
      this._isSubmitting = false;
      if (this._onStateChange) this._onStateChange();
    }, 3000);
  };

  private _onMessage = (event: MessageEvent): void => {
    if (event.data && event.data.type === 'PET_PAGE_ERROR' && event.data.token === this._bridgeToken) {
      this._hasConsoleError = true;
      window.dispatchEvent(new CustomEvent('pet-console-error'));
    }
  };

  private _onError = (): void => {
    this._hasConsoleError = true;
    window.dispatchEvent(new CustomEvent('pet-console-error'));
  };

  private _updateVideoState = (e?: Event): void => {
    const target = e?.target as HTMLVideoElement;
    if (target && target.tagName === 'VIDEO') {
      if (e?.type === 'play' || e?.type === 'playing') {
        this._isVideo = true;
        if (this._onStateChange) this._onStateChange();
        return;
      }
    }
    const videos = document.querySelectorAll('video');
    const newState = Array.from(videos).some(video => {
      return !video.paused && !video.ended && video.readyState > 2;
    });

    if (newState !== this._isVideo) {
      this._isVideo = newState;
      if (this._onStateChange) this._onStateChange();
    }
  };

  _bindEvents(): void {
    document.addEventListener('mousemove', this._onMouseMove, { passive: true });
    document.addEventListener('keydown', this._onKeyDown, { passive: true });
    document.addEventListener('scroll', this._onScroll, { passive: true });
    document.addEventListener('click', this._onClick, { passive: true });
    document.addEventListener('keydown', this._onKeyDownHeavy, { passive: true });
    document.addEventListener('submit', this._onSubmit, { passive: true });
    window.addEventListener('message', this._onMessage);
    window.addEventListener('error', this._onError);
  }

  _watchVideo(): void {
    document.addEventListener('play', this._updateVideoState, true);
    document.addEventListener('playing', this._updateVideoState, true);
    document.addEventListener('pause', this._updateVideoState, true);
    document.addEventListener('ended', this._updateVideoState, true);
  }

  _scrollDepth(): number {
    const doc = document.documentElement;
    const totalHeight = doc.scrollHeight - window.innerHeight;
    if (totalHeight <= 0) return 0;
    return doc.scrollTop / totalHeight;
  }

  cleanup(): void {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('scroll', this._onScroll);
    document.removeEventListener('click', this._onClick);
    document.removeEventListener('keydown', this._onKeyDownHeavy);
    document.removeEventListener('submit', this._onSubmit);
    window.removeEventListener('message', this._onMessage);
    window.removeEventListener('error', this._onError);

    document.removeEventListener('play', this._updateVideoState, true);
    document.removeEventListener('playing', this._updateVideoState, true);
    document.removeEventListener('pause', this._updateVideoState, true);
    document.removeEventListener('ended', this._updateVideoState, true);

    clearTimeout(this._keyTimer);
  }
}
