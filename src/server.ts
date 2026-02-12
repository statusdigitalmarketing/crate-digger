import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { classifyTrack } from './classifier/index.js';
import type { CachedClassification, Mood, TrackClassification } from './types.js';

const classificationCache: CachedClassification[] = [];

function cacheClassification(artist: string, title: string, classification: TrackClassification): void {
  const existing = classificationCache.find(
    c => c.artist.toLowerCase() === artist.toLowerCase() && c.title.toLowerCase() === title.toLowerCase()
  );
  if (!existing) {
    classificationCache.push({ artist, title, classification });
  }
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'crate-digger',
    version: '1.0.0',
  });

  server.tool(
    'classify_track',
    'Classify a single track by mood, energy, and subgenre vibe using lyrics + spectral analysis',
    {
      artist: z.string().describe('Artist name'),
      title: z.string().describe('Track title'),
      audio_path: z.string().optional().describe('Path to WAV audio file for spectral analysis'),
    },
    async ({ artist, title, audio_path }) => {
      const classification = await classifyTrack(artist, title, audio_path);
      cacheClassification(artist, title, classification);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(classification, null, 2) }],
      };
    }
  );

  server.tool(
    'batch_classify',
    'Classify multiple tracks by mood, energy, and subgenre vibe',
    {
      tracks: z.array(z.object({
        artist: z.string(),
        title: z.string(),
        audio_path: z.string().optional(),
      })).describe('Array of tracks to classify'),
    },
    async ({ tracks }) => {
      const results: TrackClassification[] = [];
      for (const track of tracks) {
        const classification = await classifyTrack(track.artist, track.title, track.audio_path);
        cacheClassification(track.artist, track.title, classification);
        results.push(classification);
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  server.tool(
    'get_mood_profile',
    'Get mood breakdown for a playlist/set of tracks',
    {
      tracks: z.array(z.object({
        artist: z.string(),
        title: z.string(),
      })).describe('Array of tracks to analyze'),
    },
    async ({ tracks }) => {
      const classifications: TrackClassification[] = [];
      for (const track of tracks) {
        const classification = await classifyTrack(track.artist, track.title);
        cacheClassification(track.artist, track.title, classification);
        classifications.push(classification);
      }

      const moodCounts: Record<string, number> = {};
      let energySum = 0;
      const vibes: string[] = [];

      for (const c of classifications) {
        moodCounts[c.mood] = (moodCounts[c.mood] ?? 0) + 1;
        energySum += c.energy;
        if (c.subgenre_vibe !== 'general' && c.subgenre_vibe !== 'unknown') {
          vibes.push(c.subgenre_vibe);
        }
      }

      // Find dominant mood
      let dominantMood = 'chill';
      let maxCount = 0;
      for (const [mood, count] of Object.entries(moodCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantMood = mood;
        }
      }

      // Build distribution as percentages
      const total = classifications.length;
      const moodDistribution: Record<string, number> = {};
      for (const [mood, count] of Object.entries(moodCounts)) {
        moodDistribution[mood] = Math.round((count / total) * 100);
      }

      // Unique vibes for summary
      const uniqueVibes = [...new Set(vibes)];
      const vibeSummary = uniqueVibes.length > 0
        ? uniqueVibes.slice(0, 5).join(', ')
        : `${dominantMood} mix`;

      const profile = {
        dominant_mood: dominantMood,
        mood_distribution: moodDistribution,
        avg_energy: Math.round(energySum / total),
        vibe_summary: vibeSummary,
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(profile, null, 2) }],
      };
    }
  );

  server.tool(
    'search_by_mood',
    'Find tracks matching a mood from cached classifications',
    {
      mood: z.string().describe('Mood to search for (happy, sad, angry, chill, dark, hype, romantic, anxious)'),
      energy_min: z.number().min(0).max(100).optional().describe('Minimum energy level (0-100)'),
      energy_max: z.number().min(0).max(100).optional().describe('Maximum energy level (0-100)'),
    },
    async ({ mood, energy_min, energy_max }) => {
      const results = classificationCache.filter(c => {
        if (c.classification.mood !== mood as Mood) return false;
        if (energy_min !== undefined && c.classification.energy < energy_min) return false;
        if (energy_max !== undefined && c.classification.energy > energy_max) return false;
        return true;
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  return server;
}
