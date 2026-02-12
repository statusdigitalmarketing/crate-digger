import { existsSync } from 'fs';
import type { TrackClassification, SpotifyFeatures } from '../types.js';
import { fetchLyrics } from '../lyrics/index.js';
import { analyzeLyrics } from './lyrics-analyzer.js';
import { analyzeSpectralFeatures, mapSpectralToMood } from './spectral-mood.js';
import { classifyMood } from './mood-rules.js';
import { analyzeTemporalMood } from './temporal-analyzer.js';
import { isSpotifyConfigured, getSpotifyFeatures } from '../spotify/index.js';
import { getCachedClassification, upsertClassification } from '../db/cache.js';

export async function classifyTrack(
  artist: string,
  title: string,
  audioPath?: string
): Promise<TrackClassification> {
  // Check DB cache first
  try {
    const cached = getCachedClassification(artist, title);
    if (cached) return cached.classification;
  } catch {
    // DB not available, continue without cache
  }

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

  // Try Spotify features
  let spotifyFeatures: SpotifyFeatures | null = null;
  if (isSpotifyConfigured()) {
    try {
      spotifyFeatures = await getSpotifyFeatures(artist, title);
    } catch (err: unknown) {
      process.stderr.write(`Spotify analysis failed: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  const classification = classifyMood({
    lyricsAnalysis,
    spectralMood,
    lyricsSource: lyricsResult.source,
    lyricsFound: lyricsResult.lyrics !== null,
    audioAnalyzed,
    spotifyFeatures,
  });

  // Add temporal mood arc if lyrics available
  if (lyricsResult.lyrics) {
    classification.mood_arc = analyzeTemporalMood(lyricsResult.lyrics);
  }

  // Persist to DB
  try {
    upsertClassification(artist, title, classification, spotifyFeatures);
  } catch {
    // DB not available, continue without persistence
  }

  return classification;
}
