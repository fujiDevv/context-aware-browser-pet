import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS } from '../../src/shared/constants';

describe('constants', () => {
  it('should export correct STORAGE_KEYS', () => {
    expect(STORAGE_KEYS.SETTINGS).toBe('pet-settings');
    expect(STORAGE_KEYS.STATS).toBe('pet-stats');
    expect(STORAGE_KEYS.MOOD).toBe('pet-mood');
    expect(STORAGE_KEYS.SHARED_STATE).toBe('shared-pet-state');
    expect(STORAGE_KEYS.MODEL_LOADING_STATE).toBe('modelLoadingState');
    expect(STORAGE_KEYS.MODEL_DOWNLOAD_PROGRESS).toBe('modelDownloadProgress');
    expect(STORAGE_KEYS.LAST_AI_COMMENT_TIME).toBe('last-ai-comment-time');
  });
});
