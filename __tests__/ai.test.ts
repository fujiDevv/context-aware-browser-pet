import { describe, it, expect, vi } from 'vitest';
import { promptGeminiNano, ILanguageModel } from '../src/ai';

describe('AI Orchestration', () => {
  it('uses injected LanguageModel provider and returns immediate result', async () => {
    const mockLmProvider: ILanguageModel = {
      create: vi.fn().mockResolvedValue({
        prompt: vi.fn().mockResolvedValue("This is a deterministic test response."),
        destroy: vi.fn().mockResolvedValue(undefined)
      })
    };

    const result = await promptGeminiNano(
      "System prompt here",
      "Hello test",
      "TestPet",
      mockLmProvider
    );

    expect(result).toBe("This is a deterministic test response.");
    expect(mockLmProvider.create).toHaveBeenCalledOnce();
  });

  it('times out if the model hangs', async () => {
    vi.useFakeTimers();
    
    const mockLmProvider: ILanguageModel = {
      create: vi.fn().mockResolvedValue({
        prompt: vi.fn().mockImplementation(() => new Promise(() => {})),
        destroy: vi.fn().mockResolvedValue(undefined)
      })
    };

    const resultPromise = promptGeminiNano(
      "System prompt here",
      "Hello test",
      "TestPet",
      mockLmProvider
    );

    await vi.advanceTimersByTimeAsync(25000);
    const result = await resultPromise;

    expect(result).toBeNull();
    
    vi.useRealTimers();
  });
});
