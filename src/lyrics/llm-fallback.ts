import type { LyricsResult } from '../types.js';

export function llmFallback(_artist: string, _title: string): LyricsResult {
  return {
    lyrics: null,
    source: 'llm',
    themes: [],
    mood_hint: null,
  };
}
