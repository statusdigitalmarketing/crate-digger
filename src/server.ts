import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { classifyTrack } from './classifier/index.js';
import type { Mood, TrackClassification } from './types.js';
import { searchByMood } from './db/cache.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'crate-digger',
    version: '2.0.0',
  });

  server.tool(
    'classify_track',
    'Classify a single track by mood, energy, and subgenre vibe using lyrics + spectral analysis + Spotify',
    {
      artist: z.string().describe('Artist name'),
      title: z.string().describe('Track title'),
      audio_path: z.string().optional().describe('Path to WAV audio file for spectral analysis'),
    },
    async ({ artist, title, audio_path }) => {
      const classification = await classifyTrack(artist, title, audio_path);
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

      let dominantMood = 'chill';
      let maxCount = 0;
      for (const [mood, count] of Object.entries(moodCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantMood = mood;
        }
      }

      const total = classifications.length;
      const moodDistribution: Record<string, number> = {};
      for (const [mood, count] of Object.entries(moodCounts)) {
        moodDistribution[mood] = Math.round((count / total) * 100);
      }

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
      const results = searchByMood(mood as Mood, energy_min, energy_max);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  return server;
}
