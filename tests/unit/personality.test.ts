import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonalitySystem } from '../../src/core/personality';

vi.mock('../../src/shared/platform', () => ({
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

describe('PersonalitySystem', () => {
  let personality: PersonalitySystem;

  beforeEach(() => {
    personality = new PersonalitySystem();
  });

  it('should initialize with default stats', async () => {
    await personality.isLoaded;
    expect(personality.stats.level).toBe(1);
    expect(personality.stats.xp).toBe(0);
    expect(personality.stats.happiness).toBe(50);
  });

  it('should correctly calculate XP and level ups', async () => {
    await personality.isLoaded;
    personality._addXp(150);
    expect(personality.stats.level).toBe(2);
    expect(personality.stats.xp).toBe(0);

    personality._addXp(424);
    expect(personality.stats.level).toBe(3);
  });

  it('should unlock basic emotions at level 1', async () => {
    await personality.isLoaded;
    expect(personality.isEmotionUnlocked('happy')).toBe(true);
    expect(personality.isEmotionUnlocked('ninja')).toBe(false);
  });
});
