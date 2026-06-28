import { describe, it, expect } from 'vitest';
import { detectPageCategory, mapActivityToEmotion } from '../src/rules';

describe('Rules & Knowledge Logic', () => {
  describe('detectPageCategory', () => {
    it('classifies Github correctly based on hardcoded domain rules', () => {
      const category = detectPageCategory('https://github.com/pulls', 'Pull Requests', undefined, undefined);
      expect(category).toBe('coding');
    });

    it('infers category from OpenGraph meta tags', () => {
      const category = detectPageCategory('https://unknown-blog.com', 'My Life', 'article', 'A personal story');
      expect(category).toBe('reading');
    });

    it('infers category from Keywords in title', () => {
      const category = detectPageCategory('https://unknown-site.com', 'How to write python code', undefined, undefined);
      expect(category).toBe('coding');
    });
  });

  describe('mapActivityToEmotion', () => {
    it('puts the pet to sleep if energy is critically low, regardless of sentiment', () => {
      const emotion = mapActivityToEmotion('gaming', 'POSITIVE', 10);
      expect(emotion).toBe('sleeping');
    });

    it('returns working-debugger when frustrated while coding', () => {
      const emotion = mapActivityToEmotion('coding', 'NEGATIVE', 80);
      expect(emotion).toBe('working-debugger');
    });

    it('returns celebrating when successful while coding', () => {
      const emotion = mapActivityToEmotion('coding', 'POSITIVE', 80);
      expect(emotion).toBe('celebrating');
    });
    
    it('returns sad when reading a negative article', () => {
      const emotion = mapActivityToEmotion('reading', 'NEGATIVE', 80);
      expect(emotion).toBe('sad');
    });
  });
});
