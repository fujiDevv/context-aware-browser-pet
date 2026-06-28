import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmotionEngine } from '../src/emotion';
import { PersonalitySystem } from '../src/personality';
import { TriggerSnapshot } from '../src/types';

vi.mock('../src/platform', () => ({
  extensionApi: {
    runtime: { id: 'test-id' },
    storage: {
      onChanged: { addListener: vi.fn() },
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue({})
      }
    }
  }
}));

describe('EmotionEngine', () => {
  let personality: PersonalitySystem;
  let engine: EmotionEngine;

  beforeEach(async () => {
    personality = new PersonalitySystem();
    await personality.isLoaded;
    personality.stats.level = 10;
    engine = new EmotionEngine(personality);
  });

  it('should return working-debugger for console errors', async () => {
    const ctx: TriggerSnapshot = {
      hostname: 'example.com',
      pageTitle: 'Test Page',
      hasConsoleError: true,
      lastHttpError: 0,
      idleSeconds: 0,
      isTypingHeavy: false,
      isFormSubmitting: false,
      isVideoPlaying: false,
      scrollDepth: 0,
      mouseX: 0,
      isCursorActive: false
    };

    const emotion = await engine.evaluate(ctx, true, true);
    expect(emotion).toBe('working-debugger');
  });

  it('should return sleeping when idle for a long time', async () => {
    const ctx: TriggerSnapshot = {
      hostname: 'example.com',
      pageTitle: 'Test Page',
      hasConsoleError: false,
      lastHttpError: 0,
      idleSeconds: 301,
      isTypingHeavy: false,
      isFormSubmitting: false,
      isVideoPlaying: false,
      scrollDepth: 0,
      mouseX: 0,
      isCursorActive: false
    };

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 24, 14, 0, 0)); 

    const emotion = await engine.evaluate(ctx, true, true);
    expect(emotion).toBe('sleeping');

    vi.useRealTimers();
  });
});
