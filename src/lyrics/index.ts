import type { LyricsResult } from '../types.js';
import { LyricsCache } from './cache.js';
import { fetchFromLrclib } from './lrclib.js';
import { fetchFromGenius } from './genius.js';
import { fetchFromMusixmatch } from './musixmatch.js';
import { llmFallback } from './llm-fallback.js';

const cache = new LyricsCache(500);

export async function fetchLyrics(artist: string, title: string): Promise<LyricsResult> {
  // Check cache first
  const cached = cache.get(artist, title);
  if (cached) return cached;

  // Try LRCLIB first: free, no key, full lyrics
  const lrclibResult = await fetchFromLrclib(artist, title);
  if (lrclibResult) {
    cache.set(artist, title, lrclibResult);
    return lrclibResult;
  }

  // Try Genius
  const geniusResult = await fetchFromGenius(artist, title);
  if (geniusResult) {
    cache.set(artist, title, geniusResult);
    return geniusResult;
  }

  // Try Musixmatch
  const musixmatchResult = await fetchFromMusixmatch(artist, title);
  if (musixmatchResult) {
    cache.set(artist, title, musixmatchResult);
    return musixmatchResult;
  }

  // LLM fallback
  const fallbackResult = llmFallback(artist, title);
  cache.set(artist, title, fallbackResult);
  return fallbackResult;
}
