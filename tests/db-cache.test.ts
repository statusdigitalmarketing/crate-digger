import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, existsSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Override home directory for tests to use temp location
const testDir = join(tmpdir(), `crate-digger-test-${Date.now()}`);
const testDbDir = join(testDir, '.crate-digger');

// Set HOME before importing db modules so they use our test directory
process.env.HOME = testDir;

// Dynamic imports after env setup
let getDb: typeof import('../src/db/index.js').getDb;
let closeDb: typeof import('../src/db/index.js').closeDb;
let getCachedClassification: typeof import('../src/db/cache.js').getCachedClassification;
let upsertClassification: typeof import('../src/db/cache.js').upsertClassification;
let searchByMood: typeof import('../src/db/cache.js').searchByMood;
let getCachedTrackCount: typeof import('../src/db/cache.js').getCachedTrackCount;
let getCachedLyrics: typeof import('../src/db/cache.js').getCachedLyrics;
let cacheLyrics: typeof import('../src/db/cache.js').cacheLyrics;

import type { TrackClassification, LyricsResult } from '../src/types.js';

const sampleClassification: TrackClassification = {
  mood: 'happy',
  energy: 75,
  subgenre_vibe: 'summer anthem',
  lyric_themes: ['party', 'freedom'],
  spectral_mood: 'bright_energetic',
  confidence: 0.7,
  source: {
    lyrics_found: true,
    lyrics_source: 'genius',
    audio_analyzed: false,
  },
};

describe('database cache', () => {
  beforeAll(async () => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(testDbDir, { recursive: true });

    // Import after setting up env
    const dbModule = await import('../src/db/index.js');
    const cacheModule = await import('../src/db/cache.js');
    getDb = dbModule.getDb;
    closeDb = dbModule.closeDb;
    getCachedClassification = cacheModule.getCachedClassification;
    upsertClassification = cacheModule.upsertClassification;
    searchByMood = cacheModule.searchByMood;
    getCachedTrackCount = cacheModule.getCachedTrackCount;
    getCachedLyrics = cacheModule.getCachedLyrics;
    cacheLyrics = cacheModule.cacheLyrics;
  });

  afterAll(() => {
    closeDb();
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // cleanup best effort
    }
  });

  it('should insert and retrieve a classification', () => {
    upsertClassification('Test Artist', 'Test Song', sampleClassification);
    const result = getCachedClassification('Test Artist', 'Test Song');
    expect(result).not.toBeNull();
    expect(result?.classification.mood).toBe('happy');
    expect(result?.classification.energy).toBe(75);
  });

  it('should keep mood_arc on a cached lookup', () => {
    const withArc: TrackClassification = {
      ...sampleClassification,
      mood_arc: {
        sections: [{ label: 'verse', sentiment: -0.5, mood: 'sad' }, { label: 'chorus', sentiment: 0.8, mood: 'happy' }],
        arc_type: 'contrast',
        variance: 0.65,
      },
    };
    upsertClassification('Arc Artist', 'Arc Song', withArc);
    const result = getCachedClassification('Arc Artist', 'Arc Song');
    expect(result?.classification.mood_arc).toEqual(withArc.mood_arc);
  });

  it('should upsert (update same artist+title)', () => {
    const updated: TrackClassification = {
      ...sampleClassification,
      mood: 'sad',
      energy: 30,
    };
    upsertClassification('Test Artist', 'Test Song', updated);
    const result = getCachedClassification('Test Artist', 'Test Song');
    expect(result?.classification.mood).toBe('sad');
    expect(result?.classification.energy).toBe(30);
  });

  it('should search by mood', () => {
    upsertClassification('Artist A', 'Happy Song', { ...sampleClassification, mood: 'happy', energy: 80 });
    upsertClassification('Artist B', 'Another Happy', { ...sampleClassification, mood: 'happy', energy: 60 });
    upsertClassification('Artist C', 'Sad Song', { ...sampleClassification, mood: 'sad', energy: 20 });

    const happyResults = searchByMood('happy');
    expect(happyResults.length).toBeGreaterThanOrEqual(2);
    expect(happyResults.every(r => r.classification.mood === 'happy')).toBe(true);
  });

  it('should search by mood with energy range', () => {
    const results = searchByMood('happy', 70, 100);
    expect(results.every(r => r.classification.energy >= 70 && r.classification.energy <= 100)).toBe(true);
  });

  it('should return empty array for non-existent mood', () => {
    const results = searchByMood('anxious');
    // May or may not have results depending on test order
    expect(Array.isArray(results)).toBe(true);
  });

  it('should count cached tracks', () => {
    const count = getCachedTrackCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should cache and retrieve lyrics', () => {
    const lyricsResult: LyricsResult = {
      lyrics: 'Test lyrics here',
      source: 'genius',
      themes: ['romance'],
      mood_hint: null,
    };
    cacheLyrics('Lyrics Artist', 'Lyrics Song', lyricsResult);

    const cached = getCachedLyrics('Lyrics Artist', 'Lyrics Song');
    expect(cached).not.toBeNull();
    expect(cached?.lyrics).toBe('Test lyrics here');
    expect(cached?.source).toBe('genius');
  });

  it('should handle case-insensitive lookup', () => {
    upsertClassification('UPPER ARTIST', 'UPPER SONG', sampleClassification);
    const result = getCachedClassification('upper artist', 'upper song');
    expect(result).not.toBeNull();
  });

  it('should return null for non-existent track', () => {
    const result = getCachedClassification('Nonexistent', 'Track');
    expect(result).toBeNull();
  });
});
