import { describe, it, expect } from 'vitest';
import { analyzeLyrics } from '../src/classifier/lyrics-analyzer.js';

describe('sentiment analysis', () => {
  describe('strong positive words', () => {
    it('should recognize strong positive words', () => {
      const words = ['ecstatic', 'euphoric', 'glorious', 'triumphant', 'paradise'];
      for (const word of words) {
        const result = analyzeLyrics(word);
        expect(result.sentiment).toBeGreaterThan(0);
      }
    });

    it('should weight strong positive higher than medium', () => {
      const strongResult = analyzeLyrics('euphoric and also bored');
      const mediumResult = analyzeLyrics('happy and also bored');
      // euphoric (1.5) vs happy (1.0), both with bored (0.5 neg)
      expect(strongResult.sentiment).toBeGreaterThan(mediumResult.sentiment);
    });
  });

  describe('medium positive words', () => {
    it('should recognize medium positive words', () => {
      const words = ['happy', 'joy', 'love', 'beautiful', 'amazing'];
      for (const word of words) {
        const result = analyzeLyrics(word);
        expect(result.sentiment).toBeGreaterThan(0);
      }
    });
  });

  describe('mild positive words', () => {
    it('should recognize mild positive words', () => {
      const words = ['nice', 'fine', 'okay', 'decent', 'pleasant'];
      for (const word of words) {
        const result = analyzeLyrics(word);
        expect(result.sentiment).toBeGreaterThan(0);
      }
    });
  });

  describe('strong negative words', () => {
    it('should recognize strong negative words', () => {
      const words = ['devastated', 'agonizing', 'tormented', 'horrifying', 'nightmarish'];
      for (const word of words) {
        const result = analyzeLyrics(word);
        expect(result.sentiment).toBeLessThan(0);
      }
    });
  });

  describe('medium negative words', () => {
    it('should recognize medium negative words', () => {
      const words = ['sad', 'pain', 'hurt', 'cry', 'dark'];
      for (const word of words) {
        const result = analyzeLyrics(word);
        expect(result.sentiment).toBeLessThan(0);
      }
    });
  });

  describe('mild negative words', () => {
    it('should recognize mild negative words', () => {
      const words = ['bored', 'tired', 'dull', 'bland', 'flat'];
      for (const word of words) {
        const result = analyzeLyrics(word);
        expect(result.sentiment).toBeLessThan(0);
      }
    });
  });

  describe('slang handling', () => {
    it('should handle positive slang', () => {
      const slangWords = ['bussin', 'goated', 'slay', 'fire', 'vibing'];
      for (const word of slangWords) {
        const result = analyzeLyrics(word);
        expect(result.sentiment).toBeGreaterThan(0);
      }
    });

    it('should handle negative slang', () => {
      const slangWords = ['mid', 'cringe', 'trash', 'flop'];
      for (const word of slangWords) {
        const result = analyzeLyrics(word);
        expect(result.sentiment).toBeLessThan(0);
      }
    });

    it('should handle multi-word slang "down bad"', () => {
      const result = analyzeLyrics("I'm down bad for real");
      expect(result.sentiment).toBeLessThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = analyzeLyrics('');
      expect(result.sentiment).toBe(0);
    });

    it('should handle single word', () => {
      const result = analyzeLyrics('hello');
      expect(result.sentiment).toBe(0);
    });

    it('should handle all caps', () => {
      const result = analyzeLyrics('HAPPY JOY AMAZING');
      expect(result.sentiment).toBeGreaterThan(0);
    });

    it('should handle mixed positive and negative', () => {
      const result = analyzeLyrics('happy sad happy sad happy');
      // 3 positive (1.0 each) vs 2 negative (1.0 each) → slightly positive
      expect(result.sentiment).toBeGreaterThan(0);
    });

    it('should handle repeated words', () => {
      const result = analyzeLyrics('happy happy happy happy happy');
      expect(result.sentiment).toBeGreaterThan(0);
    });
  });
});
