import type { Mood, TrackClassification, LyricsAnalysis } from '../types.js';

interface MoodSignals {
  lyricsAnalysis: LyricsAnalysis | null;
  spectralMood: string | null;
  lyricsSource: 'genius' | 'musixmatch' | 'llm' | 'none';
  lyricsFound: boolean;
  audioAnalyzed: boolean;
}

const SPECTRAL_MOOD_MAP: Record<string, { mood: Mood; energy: number }> = {
  bright_energetic: { mood: 'happy', energy: 80 },
  dark_heavy: { mood: 'dark', energy: 40 },
  warm_mellow: { mood: 'chill', energy: 45 },
  harsh_aggressive: { mood: 'angry', energy: 90 },
  ethereal_ambient: { mood: 'chill', energy: 25 },
};

const THEME_MOOD_MAP: Record<string, { mood: Mood; energy: number }> = {
  romance: { mood: 'romantic', energy: 40 },
  heartbreak: { mood: 'sad', energy: 35 },
  wealth: { mood: 'hype', energy: 75 },
  aggression: { mood: 'angry', energy: 85 },
  party: { mood: 'hype', energy: 85 },
  sadness: { mood: 'sad', energy: 25 },
  freedom: { mood: 'happy', energy: 65 },
  nostalgia: { mood: 'sad', energy: 35 },
  spirituality: { mood: 'chill', energy: 40 },
  anxiety: { mood: 'anxious', energy: 70 },
  empowerment: { mood: 'hype', energy: 80 },
  drugs: { mood: 'dark', energy: 50 },
};

function moodFromSentiment(sentiment: number): Mood {
  if (sentiment > 0.3) return 'happy';
  if (sentiment < -0.3) return 'sad';
  return 'chill';
}

function energyFromSentiment(sentiment: number): number {
  return Math.round(50 + sentiment * 30);
}

export function classifyMood(signals: MoodSignals): TrackClassification {
  const hasLyrics = signals.lyricsAnalysis !== null;
  const hasAudio = signals.spectralMood !== null;

  // Determine weights
  let lyricsWeight: number;
  let spectralWeight: number;

  if (hasLyrics && hasAudio) {
    lyricsWeight = 0.6;
    spectralWeight = 0.4;
  } else if (hasLyrics) {
    lyricsWeight = 1.0;
    spectralWeight = 0;
  } else if (hasAudio) {
    lyricsWeight = 0;
    spectralWeight = 1.0;
  } else {
    // No data at all — return defaults
    return {
      mood: 'chill',
      energy: 50,
      subgenre_vibe: 'unknown',
      lyric_themes: [],
      spectral_mood: 'none',
      confidence: 0.1,
      source: {
        lyrics_found: false,
        lyrics_source: signals.lyricsSource,
        audio_analyzed: false,
      },
    };
  }

  // Compute mood candidates from lyrics
  const moodVotes: Record<Mood, number> = {
    happy: 0, sad: 0, angry: 0, chill: 0,
    dark: 0, hype: 0, romantic: 0, anxious: 0,
  };
  let energySum = 0;
  let energyCount = 0;

  if (hasLyrics && signals.lyricsAnalysis) {
    const la = signals.lyricsAnalysis;

    // Votes from themes
    for (const theme of la.themes) {
      const mapping = THEME_MOOD_MAP[theme];
      if (mapping) {
        moodVotes[mapping.mood] += lyricsWeight;
        energySum += mapping.energy * lyricsWeight;
        energyCount++;
      }
    }

    // Vote from sentiment
    const sentimentMood = moodFromSentiment(la.sentiment);
    moodVotes[sentimentMood] += lyricsWeight * 0.5;
    energySum += energyFromSentiment(la.sentiment) * lyricsWeight * 0.5;
    energyCount += 0.5;
  }

  // Votes from spectral mood
  if (hasAudio && signals.spectralMood) {
    const mapping = SPECTRAL_MOOD_MAP[signals.spectralMood] ?? { mood: 'chill' as Mood, energy: 50 };
    moodVotes[mapping.mood] += spectralWeight;
    energySum += mapping.energy * spectralWeight;
    energyCount++;
  }

  // Find dominant mood
  let dominantMood: Mood = 'chill';
  let maxVotes = 0;
  for (const [mood, votes] of Object.entries(moodVotes)) {
    if (votes > maxVotes) {
      maxVotes = votes;
      dominantMood = mood as Mood;
    }
  }

  // Compute energy
  const energy = energyCount > 0 ? Math.round(energySum / energyCount) : 50;

  // Determine subgenre vibe
  let subgenreVibe = 'general';
  if (hasLyrics && signals.lyricsAnalysis && signals.lyricsAnalysis.vibe_hints.length > 0) {
    subgenreVibe = signals.lyricsAnalysis.vibe_hints[0];
  } else {
    // Generate vibe from mood + spectral
    const vibePrefix = dominantMood === 'happy' ? 'upbeat' :
      dominantMood === 'sad' ? 'melancholic' :
      dominantMood === 'angry' ? 'aggressive' :
      dominantMood === 'chill' ? 'laid-back' :
      dominantMood === 'dark' ? 'dark' :
      dominantMood === 'hype' ? 'energetic' :
      dominantMood === 'romantic' ? 'smooth' :
      'restless';
    const vibeSuffix = signals.spectralMood === 'bright_energetic' ? 'pop' :
      signals.spectralMood === 'dark_heavy' ? 'bass' :
      signals.spectralMood === 'harsh_aggressive' ? 'rock' :
      signals.spectralMood === 'ethereal_ambient' ? 'ambient' :
      'groove';
    subgenreVibe = `${vibePrefix} ${vibeSuffix}`;
  }

  // Confidence
  let confidence = 0.3;
  if (hasLyrics) confidence += 0.35;
  if (hasAudio) confidence += 0.25;
  if (maxVotes > 1) confidence += 0.1;
  confidence = Math.min(confidence, 1.0);

  return {
    mood: dominantMood,
    energy: Math.max(0, Math.min(100, energy)),
    subgenre_vibe: subgenreVibe,
    lyric_themes: signals.lyricsAnalysis?.themes ?? [],
    spectral_mood: signals.spectralMood ?? 'none',
    confidence,
    source: {
      lyrics_found: signals.lyricsFound,
      lyrics_source: signals.lyricsSource,
      audio_analyzed: signals.audioAnalyzed,
    },
  };
}
