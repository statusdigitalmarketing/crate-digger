export type Mood = 'happy' | 'sad' | 'angry' | 'chill' | 'dark' | 'hype' | 'romantic' | 'anxious';

export interface TrackClassification {
  mood: Mood;
  energy: number; // 0-100
  subgenre_vibe: string;
  lyric_themes: string[];
  spectral_mood: string;
  confidence: number; // 0-1
  source: {
    lyrics_found: boolean;
    lyrics_source: 'genius' | 'musixmatch' | 'llm' | 'none';
    audio_analyzed: boolean;
  };
}

export interface LyricsResult {
  lyrics: string | null;
  source: 'genius' | 'musixmatch' | 'llm' | 'none';
  themes: string[];
  mood_hint: string | null;
}

export interface SpectralFeatures {
  rms: number;
  spectralCentroid: number; // in Hz
  spectralFlatness: number;
  spectralRolloff: number;
  zcr: number;
  mfcc: number[];
}

export interface LyricsAnalysis {
  themes: string[];
  sentiment: number; // -1 to 1
  mood_keywords: string[];
  vibe_hints: string[];
}

export interface MoodProfile {
  dominant_mood: string;
  mood_distribution: Record<string, number>;
  avg_energy: number;
  vibe_summary: string;
}

export interface CachedClassification {
  artist: string;
  title: string;
  classification: TrackClassification;
}
