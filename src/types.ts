export type LyricsSource = 'lrclib' | 'genius' | 'musixmatch' | 'llm' | 'none';

export type Mood = 'happy' | 'sad' | 'angry' | 'chill' | 'dark' | 'hype' | 'romantic' | 'anxious';

export interface TrackClassification {
  mood: Mood;
  energy: number; // 0-100
  subgenre_vibe: string;
  lyric_themes: string[];
  spectral_mood: string;
  confidence: number; // 0-1
  mood_arc?: MoodArc;
  source: {
    lyrics_found: boolean;
    lyrics_source: LyricsSource;
    audio_analyzed: boolean;
  };
}

export interface LyricsResult {
  lyrics: string | null;
  source: LyricsSource;
  themes: string[];
  mood_hint: string | null;
  /** True when no lyrics were found only because a source was unreachable; such results must not be cached. */
  transient?: boolean;
}

export interface SpectralFeatures {
  rms: number;
  spectralCentroid: number; // in Hz
  spectralFlatness: number;
  spectralRolloff: number;
  zcr: number;
  mfcc: number[];
}

export interface SpotifyFeatures {
  valence: number; // 0-1, happiness
  danceability: number;
  energy: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  loudness: number;
  key: number;
  mode: number; // 0=minor, 1=major
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

export interface MoodArc {
  sections: Array<{ label: string; sentiment: number; mood: Mood }>;
  arc_type: 'steady' | 'build' | 'drop' | 'contrast' | 'climax';
  variance: number; // 0 = monotone, 1 = wild swings
}
