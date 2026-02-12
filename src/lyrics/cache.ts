import type { LyricsResult } from '../types.js';

interface CacheEntry {
  result: LyricsResult;
  accessedAt: number;
}

export class LyricsCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  private makeKey(artist: string, title: string): string {
    return `${artist.toLowerCase().trim()}|${title.toLowerCase().trim()}`;
  }

  get(artist: string, title: string): LyricsResult | null {
    const key = this.makeKey(artist, title);
    const entry = this.cache.get(key);
    if (!entry) return null;
    entry.accessedAt = Date.now();
    return entry.result;
  }

  set(artist: string, title: string, result: LyricsResult): void {
    const key = this.makeKey(artist, title);

    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, { result, accessedAt: Date.now() });
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  get size(): number {
    return this.cache.size;
  }
}
