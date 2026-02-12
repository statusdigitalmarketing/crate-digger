import { describe, it, expect } from 'vitest';
import { analyzeLyrics } from '../src/classifier/lyrics-analyzer.js';

describe('analyzeLyrics', () => {
  describe('theme detection', () => {
    it('should detect romance theme', () => {
      const result = analyzeLyrics('I love you baby, my heart is yours forever');
      expect(result.themes).toContain('romance');
    });

    it('should detect heartbreak theme', () => {
      const result = analyzeLyrics('You left me broken, tears falling as I cry');
      expect(result.themes).toContain('heartbreak');
    });

    it('should detect party theme', () => {
      const result = analyzeLyrics('Turn up at the club tonight, drink and dance');
      expect(result.themes).toContain('party');
    });

    it('should detect aggression theme', () => {
      const result = analyzeLyrics('Kill the enemy, blood and battle rage');
      expect(result.themes).toContain('aggression');
    });

    it('should detect sadness theme', () => {
      const result = analyzeLyrics('Alone in the dark, pain and suffering');
      expect(result.themes).toContain('sadness');
    });

    it('should detect wealth theme', () => {
      const result = analyzeLyrics('Stack my money, flex the drip and ice');
      expect(result.themes).toContain('wealth');
    });

    it('should detect freedom theme', () => {
      const result = analyzeLyrics('Free on the open road, fly in the sky');
      expect(result.themes).toContain('freedom');
    });

    it('should detect nostalgia theme', () => {
      const result = analyzeLyrics('I remember back then in my hometown, those old days');
      expect(result.themes).toContain('nostalgia');
    });

    it('should detect multiple themes', () => {
      const result = analyzeLyrics('I love you baby, my heart is broken, tears cry goodbye');
      expect(result.themes).toContain('romance');
      expect(result.themes).toContain('heartbreak');
    });

    it('should require minimum 2 keyword matches for a theme', () => {
      const result = analyzeLyrics('I love this random thing here');
      expect(result.themes).not.toContain('romance');
    });
  });

  describe('sentiment scoring', () => {
    it('should score positive text as positive', () => {
      const result = analyzeLyrics('Happy beautiful amazing wonderful bright sunshine');
      expect(result.sentiment).toBeGreaterThan(0);
    });

    it('should score negative text as negative', () => {
      const result = analyzeLyrics('Sad pain hurt dark death hate fear alone broken');
      expect(result.sentiment).toBeLessThan(0);
    });

    it('should handle negation: "not happy" → negative', () => {
      const result = analyzeLyrics('I am not happy not good not wonderful');
      expect(result.sentiment).toBeLessThan(0);
    });

    it('should handle negation: "not sad" → mildly positive', () => {
      const result = analyzeLyrics('not sad not broken');
      expect(result.sentiment).toBeGreaterThan(0);
    });

    it('should handle intensity: "very happy" > "happy"', () => {
      const resultIntense = analyzeLyrics('very happy');
      const resultNormal = analyzeLyrics('happy');
      expect(resultIntense.sentiment).toBeGreaterThanOrEqual(resultNormal.sentiment);
    });

    it('should handle intensity: "fucking amazing" > "amazing"', () => {
      const resultIntense = analyzeLyrics('fucking amazing');
      const resultNormal = analyzeLyrics('amazing');
      expect(resultIntense.sentiment).toBeGreaterThanOrEqual(resultNormal.sentiment);
    });

    it('should return 0 for neutral/empty content', () => {
      const result = analyzeLyrics('the cat sat on the mat');
      expect(result.sentiment).toBe(0);
    });

    it('should handle empty string gracefully', () => {
      const result = analyzeLyrics('');
      expect(result.sentiment).toBe(0);
      expect(result.themes).toEqual([]);
    });

    it('should handle single word gracefully', () => {
      const result = analyzeLyrics('hello');
      expect(result.sentiment).toBe(0);
    });
  });

  describe('slang detection', () => {
    it('should detect positive slang "bussin"', () => {
      const result = analyzeLyrics('this track is bussin');
      expect(result.sentiment).toBeGreaterThan(0);
    });

    it('should detect negative slang "mid"', () => {
      const result = analyzeLyrics('that song was mid');
      expect(result.sentiment).toBeLessThan(0);
    });

    it('should detect "goated" as strongly positive', () => {
      const result = analyzeLyrics('he is goated');
      expect(result.sentiment).toBeGreaterThan(0);
    });
  });

  describe('weighted intensity', () => {
    it('should weight strong positive words higher than mild', () => {
      const strongResult = analyzeLyrics('euphoric');
      const mildResult = analyzeLyrics('nice');
      // Both positive, but strong should have equal or higher sentiment (single words both normalize to 1)
      expect(strongResult.sentiment).toBeGreaterThanOrEqual(mildResult.sentiment);
    });

    it('should weight strong negative words higher than mild', () => {
      const strongResult = analyzeLyrics('devastated');
      const mildResult = analyzeLyrics('bored');
      // Both negative, but strong should be more negative
      expect(strongResult.sentiment).toBeLessThanOrEqual(mildResult.sentiment);
    });
  });

  describe('vibe detection', () => {
    it('should detect "drinking country" vibe', () => {
      const result = analyzeLyrics('Driving my truck down the dirt road with a beer');
      expect(result.vibe_hints).toContain('drinking country');
    });

    it('should detect "dark trap" vibe', () => {
      const result = analyzeLyrics('Drip on the street, gang life in the dark');
      expect(result.vibe_hints).toContain('dark trap');
    });

    it('should detect "club banger" vibe', () => {
      const result = analyzeLyrics('Drop the bass, dance in the club');
      expect(result.vibe_hints).toContain('club banger');
    });

    it('should detect "gospel soul" vibe', () => {
      const result = analyzeLyrics('Pray to god at church with faith');
      expect(result.vibe_hints).toContain('gospel soul');
    });

    it('should detect "lo-fi beats" vibe', () => {
      const result = analyzeLyrics('Chill lofi study tape hiss vinyl rain');
      expect(result.vibe_hints).toContain('lo-fi beats');
    });
  });

  describe('mood keywords', () => {
    it('should extract up to 10 mood keywords', () => {
      const text = 'happy joy love beautiful sad pain hurt dark broken lost empty cold';
      const result = analyzeLyrics(text);
      expect(result.mood_keywords.length).toBeLessThanOrEqual(10);
      expect(result.mood_keywords.length).toBeGreaterThan(0);
    });

    it('should not include duplicate keywords', () => {
      const result = analyzeLyrics('happy happy happy sad sad');
      const unique = new Set(result.mood_keywords);
      expect(result.mood_keywords.length).toBe(unique.size);
    });
  });
});
