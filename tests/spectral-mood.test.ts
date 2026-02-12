import { describe, it, expect } from 'vitest';
import { mapSpectralToMood } from '../src/classifier/spectral-mood.js';
import type { SpectralFeatures } from '../src/types.js';

function makeFeatures(overrides: Partial<SpectralFeatures> = {}): SpectralFeatures {
  return {
    rms: 0.1,
    spectralCentroid: 3000,
    spectralFlatness: 0.15,
    spectralRolloff: 5000,
    zcr: 0.05,
    mfcc: new Array(13).fill(0),
    ...overrides,
  };
}

describe('mapSpectralToMood', () => {
  it('should classify high energy + high centroid + high zcr as bright_energetic', () => {
    const result = mapSpectralToMood(makeFeatures({
      rms: 0.2,
      spectralCentroid: 5000,
      zcr: 0.12,
    }));
    expect(result).toBe('bright_energetic');
  });

  it('should classify high energy + high flatness + high zcr as harsh_aggressive', () => {
    const result = mapSpectralToMood(makeFeatures({
      rms: 0.2,
      spectralFlatness: 0.4,
      zcr: 0.2,
    }));
    expect(result).toBe('harsh_aggressive');
  });

  it('should classify low energy + low centroid + low zcr as dark_heavy', () => {
    const result = mapSpectralToMood(makeFeatures({
      rms: 0.05,
      spectralCentroid: 1000,
      zcr: 0.03,
    }));
    expect(result).toBe('dark_heavy');
  });

  it('should classify low energy + high centroid + low flatness as ethereal_ambient', () => {
    const result = mapSpectralToMood(makeFeatures({
      rms: 0.05,
      spectralCentroid: 4000,
      spectralFlatness: 0.1,
    }));
    expect(result).toBe('ethereal_ambient');
  });

  it('should classify medium flatness + medium centroid as warm_mellow', () => {
    const result = mapSpectralToMood(makeFeatures({
      rms: 0.12,
      spectralCentroid: 3000,
      spectralFlatness: 0.15,
      zcr: 0.05,
    }));
    expect(result).toBe('warm_mellow');
  });

  it('should default to warm_mellow for ambiguous features', () => {
    const result = mapSpectralToMood(makeFeatures({
      rms: 0.12,
      spectralCentroid: 3500,
      spectralFlatness: 0.18,
      zcr: 0.06,
    }));
    expect(result).toBe('warm_mellow');
  });

  it('should handle zero-value features', () => {
    const result = mapSpectralToMood(makeFeatures({
      rms: 0,
      spectralCentroid: 0,
      spectralFlatness: 0,
      spectralRolloff: 0,
      zcr: 0,
    }));
    expect(result).toBe('dark_heavy');
  });

  it('should handle extreme high values', () => {
    const result = mapSpectralToMood(makeFeatures({
      rms: 1.0,
      spectralCentroid: 20000,
      spectralFlatness: 1.0,
      zcr: 1.0,
    }));
    // Should be either bright_energetic or harsh_aggressive
    expect(['bright_energetic', 'harsh_aggressive']).toContain(result);
  });

  it('should return a valid spectral mood string', () => {
    const validMoods = ['bright_energetic', 'dark_heavy', 'warm_mellow', 'harsh_aggressive', 'ethereal_ambient'];
    const result = mapSpectralToMood(makeFeatures());
    expect(validMoods).toContain(result);
  });

  it('should handle boundary condition: rms exactly 0.15', () => {
    const result = mapSpectralToMood(makeFeatures({
      rms: 0.15,
      spectralCentroid: 3000,
      spectralFlatness: 0.15,
      zcr: 0.08,
    }));
    expect(typeof result).toBe('string');
  });
});
