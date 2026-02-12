import { existsSync } from 'fs';
import type { TrackClassification } from '../types.js';
import { fetchLyrics } from '../lyrics/index.js';
import { analyzeLyrics } from './lyrics-analyzer.js';
import { analyzeSpectralFeatures, mapSpectralToMood } from './spectral-mood.js';
import { classifyMood } from './mood-rules.js';

export async function classifyTrack(
  artist: string,
  title: string,
  audioPath?: string
): Promise<TrackClassification> {
  // Fetch lyrics
  const lyricsResult = await fetchLyrics(artist, title);

  // Analyze lyrics if available
  const lyricsAnalysis = lyricsResult.lyrics
    ? analyzeLyrics(lyricsResult.lyrics)
    : null;

  // Analyze audio if path provided and file exists
  let spectralMood: string | null = null;
  let audioAnalyzed = false;

  if (audioPath && existsSync(audioPath)) {
    try {
      const features = analyzeSpectralFeatures(audioPath);
      spectralMood = mapSpectralToMood(features);
      audioAnalyzed = true;
    } catch (err: unknown) {
      process.stderr.write(`Audio analysis failed: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  return classifyMood({
    lyricsAnalysis,
    spectralMood,
    lyricsSource: lyricsResult.source,
    lyricsFound: lyricsResult.lyrics !== null,
    audioAnalyzed,
  });
}
