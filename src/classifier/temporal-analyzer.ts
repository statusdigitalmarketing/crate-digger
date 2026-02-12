import type { Mood, MoodArc } from '../types.js';
import { analyzeLyrics } from './lyrics-analyzer.js';

const SECTION_MARKERS = /^\[(?:Verse|Chorus|Bridge|Hook|Pre-Chorus|Outro|Intro|Interlude|Refrain|Post-Chorus)(?:\s*\d*)?\]/im;

function moodFromSentiment(sentiment: number): Mood {
  if (sentiment > 0.3) return 'happy';
  if (sentiment < -0.3) return 'sad';
  return 'chill';
}

function splitIntoSections(lyrics: string): Array<{ label: string; text: string }> {
  const lines = lyrics.split('\n');
  const sections: Array<{ label: string; text: string }> = [];
  let currentLabel = 'intro';
  let currentLines: string[] = [];
  let sectionIndex = 0;

  for (const line of lines) {
    const markerMatch = line.match(/^\[([^\]]+)\]/);
    if (markerMatch) {
      // Save previous section if it has content
      if (currentLines.length > 0) {
        const text = currentLines.join('\n').trim();
        if (text) {
          sections.push({ label: currentLabel, text });
        }
      }
      currentLabel = markerMatch[1].toLowerCase();
      currentLines = [];
      sectionIndex++;
    } else if (line.trim() === '' && currentLines.length > 0) {
      // Blank line could be a section break (for lyrics without markers)
      const hasMarkers = lyrics.match(SECTION_MARKERS);
      if (!hasMarkers) {
        const text = currentLines.join('\n').trim();
        if (text) {
          sectionIndex++;
          sections.push({ label: `section ${sectionIndex}`, text });
        }
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    } else {
      currentLines.push(line);
    }
  }

  // Don't forget the last section
  if (currentLines.length > 0) {
    const text = currentLines.join('\n').trim();
    if (text) {
      if (sections.length === 0) sectionIndex++;
      sections.push({ label: currentLabel || `section ${sectionIndex}`, text });
    }
  }

  return sections;
}

function determineArcType(sentiments: number[]): MoodArc['arc_type'] {
  if (sentiments.length <= 1) return 'steady';

  const firstHalf = sentiments.slice(0, Math.ceil(sentiments.length / 2));
  const secondHalf = sentiments.slice(Math.ceil(sentiments.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const min = Math.min(...sentiments);
  const max = Math.max(...sentiments);
  const range = max - min;

  // Low variance = steady
  if (range < 0.2) return 'steady';

  // Check for alternating pattern (contrast)
  let alternations = 0;
  for (let i = 1; i < sentiments.length; i++) {
    if (Math.abs(sentiments[i] - sentiments[i - 1]) > 0.3) {
      alternations++;
    }
  }
  if (alternations >= sentiments.length * 0.6) return 'contrast';

  // Check for climax (peaks in the middle-to-late portion)
  const peakIndex = sentiments.indexOf(max);
  if (peakIndex > 0 && peakIndex < sentiments.length - 1 && range > 0.3) return 'climax';

  // Build vs drop
  if (avgSecond > avgFirst + 0.15) return 'build';
  if (avgFirst > avgSecond + 0.15) return 'drop';

  return 'steady';
}

export function analyzeTemporalMood(lyrics: string): MoodArc {
  const sections = splitIntoSections(lyrics);

  if (sections.length === 0) {
    return {
      sections: [],
      arc_type: 'steady',
      variance: 0,
    };
  }

  const analyzedSections = sections.map(section => {
    const analysis = analyzeLyrics(section.text);
    return {
      label: section.label,
      sentiment: analysis.sentiment,
      mood: moodFromSentiment(analysis.sentiment),
    };
  });

  const sentiments = analyzedSections.map(s => s.sentiment);
  const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  const variance = sentiments.length > 1
    ? sentiments.reduce((sum, s) => sum + (s - mean) ** 2, 0) / sentiments.length
    : 0;
  // Normalize variance to 0-1 range (max possible variance is 1 for sentiment range -1 to 1)
  const normalizedVariance = Math.min(Math.sqrt(variance), 1);

  return {
    sections: analyzedSections,
    arc_type: determineArcType(sentiments),
    variance: Math.round(normalizedVariance * 100) / 100,
  };
}
