import { describe, it, expect } from 'vitest';
import { analyzeTemporalMood } from '../src/classifier/temporal-analyzer.js';

describe('analyzeTemporalMood', () => {
  it('should detect steady arc for uniform mood', () => {
    const lyrics = `happy joy wonderful sunshine
bright light beautiful amazing

happy joy wonderful sunshine
bright light beautiful amazing`;
    const result = analyzeTemporalMood(lyrics);
    expect(result.arc_type).toBe('steady');
    expect(result.variance).toBeLessThan(0.3);
  });

  it('should split lyrics by section markers', () => {
    const lyrics = `[Verse 1]
happy joy sunshine bright

[Chorus]
love beautiful amazing wonderful`;
    const result = analyzeTemporalMood(lyrics);
    expect(result.sections.length).toBeGreaterThanOrEqual(2);
  });

  it('should split plain text by blank lines', () => {
    const lyrics = `happy joy sunshine bright

dark pain hurt cry`;
    const result = analyzeTemporalMood(lyrics);
    expect(result.sections.length).toBeGreaterThanOrEqual(2);
  });

  it('should detect contrast arc for alternating moods', () => {
    const lyrics = `[Verse 1]
happy joy sunshine bright beautiful love

[Chorus]
pain dark hurt broken death cry

[Verse 2]
happy joy sunshine bright beautiful love

[Chorus]
pain dark hurt broken death cry`;
    const result = analyzeTemporalMood(lyrics);
    expect(result.variance).toBeGreaterThan(0);
    expect(result.sections.length).toBe(4);
  });

  it('should detect build arc for increasing intensity', () => {
    const lyrics = `[Verse 1]
tired bored dull gray worn weary sad pain

[Verse 2]
okay fine calm gentle nice pleasant

[Chorus]
amazing incredible euphoric paradise legendary triumphant ecstatic glorious`;
    const result = analyzeTemporalMood(lyrics);
    expect(['build', 'climax']).toContain(result.arc_type);
  });

  it('should handle empty lyrics', () => {
    const result = analyzeTemporalMood('');
    expect(result.sections).toEqual([]);
    expect(result.arc_type).toBe('steady');
    expect(result.variance).toBe(0);
  });

  it('should handle lyrics with only one section', () => {
    const result = analyzeTemporalMood('happy joy sunshine bright');
    expect(result.sections.length).toBe(1);
    expect(result.arc_type).toBe('steady');
  });

  it('should assign section labels from markers', () => {
    const lyrics = `[Verse 1]
some words here

[Chorus]
more words there`;
    const result = analyzeTemporalMood(lyrics);
    expect(result.sections.some(s => s.label.includes('verse'))).toBe(true);
    expect(result.sections.some(s => s.label.includes('chorus'))).toBe(true);
  });

  it('should calculate variance as 0 for single section', () => {
    const result = analyzeTemporalMood('just one line of lyrics');
    expect(result.variance).toBe(0);
  });

  it('should keep variance between 0 and 1', () => {
    const lyrics = `[Verse]
ecstatic euphoric triumphant legendary

[Chorus]
devastated agonizing tormented horrifying`;
    const result = analyzeTemporalMood(lyrics);
    expect(result.variance).toBeGreaterThanOrEqual(0);
    expect(result.variance).toBeLessThanOrEqual(1);
  });
});
