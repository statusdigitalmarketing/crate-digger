import { describe, it, expect } from 'vitest';
import { classifyMood } from '../src/classifier/mood-rules.js';
import type { MoodSignals } from '../src/classifier/mood-rules.js';

function makeSignals(overrides: Partial<MoodSignals> = {}): MoodSignals {
  return {
    lyricsAnalysis: null,
    spectralMood: null,
    lyricsSource: 'none',
    lyricsFound: false,
    audioAnalyzed: false,
    ...overrides,
  };
}

describe('classifyMood', () => {
  it('should return defaults when no data available', () => {
    const result = classifyMood(makeSignals());
    expect(result.mood).toBe('chill');
    expect(result.energy).toBe(50);
    expect(result.confidence).toBe(0.1);
    expect(result.subgenre_vibe).toBe('unknown');
  });

  it('should use 100% lyrics weight when only lyrics available', () => {
    const result = classifyMood(makeSignals({
      lyricsAnalysis: {
        themes: ['party'],
        sentiment: 0.5,
        mood_keywords: ['party', 'dance'],
        vibe_hints: ['club banger'],
      },
      lyricsFound: true,
      lyricsSource: 'genius',
    }));
    expect(result.mood).toBe('hype');
    expect(result.source.lyrics_found).toBe(true);
    expect(result.subgenre_vibe).toBe('club banger');
  });

  it('should use 100% spectral weight when only audio available', () => {
    const result = classifyMood(makeSignals({
      spectralMood: 'harsh_aggressive',
      audioAnalyzed: true,
    }));
    expect(result.mood).toBe('angry');
    expect(result.source.audio_analyzed).toBe(true);
  });

  it('should use 60/40 lyrics/audio split when both available', () => {
    const result = classifyMood(makeSignals({
      lyricsAnalysis: {
        themes: ['sadness'],
        sentiment: -0.5,
        mood_keywords: ['cry', 'pain'],
        vibe_hints: [],
      },
      lyricsFound: true,
      lyricsSource: 'genius',
      spectralMood: 'dark_heavy',
      audioAnalyzed: true,
    }));
    // Both point to sad/dark, should be one of those
    expect(['sad', 'dark']).toContain(result.mood);
  });

  it('should use 50/30/20 split when Spotify is available', () => {
    const result = classifyMood(makeSignals({
      lyricsAnalysis: {
        themes: ['party'],
        sentiment: 0.5,
        mood_keywords: ['dance'],
        vibe_hints: [],
      },
      lyricsFound: true,
      lyricsSource: 'genius',
      spectralMood: 'bright_energetic',
      audioAnalyzed: true,
      spotifyFeatures: {
        valence: 0.8,
        energy: 0.9,
        danceability: 0.8,
        tempo: 128,
        acousticness: 0.1,
        instrumentalness: 0.0,
        speechiness: 0.1,
        liveness: 0.2,
        loudness: -5,
        key: 5,
        mode: 1,
      },
    }));
    expect(['happy', 'hype']).toContain(result.mood);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should clamp energy between 0 and 100', () => {
    const result = classifyMood(makeSignals({
      lyricsAnalysis: {
        themes: ['party', 'empowerment'],
        sentiment: 0.9,
        mood_keywords: ['strong'],
        vibe_hints: [],
      },
      lyricsFound: true,
      lyricsSource: 'genius',
    }));
    expect(result.energy).toBeGreaterThanOrEqual(0);
    expect(result.energy).toBeLessThanOrEqual(100);
  });

  it('should increase confidence when lyrics are found', () => {
    const noLyrics = classifyMood(makeSignals({
      spectralMood: 'warm_mellow',
      audioAnalyzed: true,
    }));
    const withLyrics = classifyMood(makeSignals({
      lyricsAnalysis: {
        themes: [],
        sentiment: 0,
        mood_keywords: [],
        vibe_hints: [],
      },
      lyricsFound: true,
      lyricsSource: 'genius',
      spectralMood: 'warm_mellow',
      audioAnalyzed: true,
    }));
    expect(withLyrics.confidence).toBeGreaterThan(noLyrics.confidence);
  });

  it('should increase confidence when Spotify is available', () => {
    const withoutSpotify = classifyMood(makeSignals({
      lyricsAnalysis: {
        themes: [],
        sentiment: 0,
        mood_keywords: [],
        vibe_hints: [],
      },
      lyricsFound: true,
      lyricsSource: 'genius',
    }));
    const withSpotify = classifyMood(makeSignals({
      lyricsAnalysis: {
        themes: [],
        sentiment: 0,
        mood_keywords: [],
        vibe_hints: [],
      },
      lyricsFound: true,
      lyricsSource: 'genius',
      spotifyFeatures: {
        valence: 0.5,
        energy: 0.5,
        danceability: 0.5,
        tempo: 120,
        acousticness: 0.3,
        instrumentalness: 0.0,
        speechiness: 0.1,
        liveness: 0.2,
        loudness: -8,
        key: 0,
        mode: 1,
      },
    }));
    expect(withSpotify.confidence).toBeGreaterThan(withoutSpotify.confidence);
  });

  it('should generate vibe prefix/suffix when no vibe hints', () => {
    const result = classifyMood(makeSignals({
      spectralMood: 'bright_energetic',
      audioAnalyzed: true,
    }));
    expect(result.subgenre_vibe).toContain('pop');
  });

  it('should map sad Spotify features to sad mood', () => {
    const result = classifyMood(makeSignals({
      spotifyFeatures: {
        valence: 0.1,
        energy: 0.2,
        danceability: 0.3,
        tempo: 80,
        acousticness: 0.7,
        instrumentalness: 0.0,
        speechiness: 0.1,
        liveness: 0.1,
        loudness: -12,
        key: 2,
        mode: 0,
      },
    }));
    expect(result.mood).toBe('sad');
  });

  it('should map angry Spotify features (low valence, high energy)', () => {
    const result = classifyMood(makeSignals({
      spotifyFeatures: {
        valence: 0.1,
        energy: 0.9,
        danceability: 0.5,
        tempo: 150,
        acousticness: 0.0,
        instrumentalness: 0.0,
        speechiness: 0.2,
        liveness: 0.3,
        loudness: -3,
        key: 7,
        mode: 0,
      },
    }));
    expect(result.mood).toBe('angry');
  });

  it('should cap confidence at 1.0', () => {
    const result = classifyMood(makeSignals({
      lyricsAnalysis: {
        themes: ['party', 'empowerment'],
        sentiment: 0.8,
        mood_keywords: ['strong', 'dance'],
        vibe_hints: ['club banger'],
      },
      lyricsFound: true,
      lyricsSource: 'genius',
      spectralMood: 'bright_energetic',
      audioAnalyzed: true,
      spotifyFeatures: {
        valence: 0.9,
        energy: 0.9,
        danceability: 0.9,
        tempo: 130,
        acousticness: 0.0,
        instrumentalness: 0.0,
        speechiness: 0.1,
        liveness: 0.2,
        loudness: -4,
        key: 5,
        mode: 1,
      },
    }));
    expect(result.confidence).toBeLessThanOrEqual(1.0);
  });
});
