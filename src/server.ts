import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

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
      void audio_path;
      return {
        content: [{ type: 'text' as const, text: `classify_track not implemented yet: ${artist} - ${title}` }],
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
      return {
        content: [{ type: 'text' as const, text: `batch_classify not implemented yet: ${tracks.length} tracks` }],
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
      return {
        content: [{ type: 'text' as const, text: `get_mood_profile not implemented yet: ${tracks.length} tracks` }],
      };
    }
  );

  server.tool(
    'search_by_mood',
    'Find tracks matching a mood from cached classifications',
    {
      mood: z.string().describe('Mood to search for'),
      energy_min: z.number().min(0).max(100).optional().describe('Minimum energy level (0-100)'),
      energy_max: z.number().min(0).max(100).optional().describe('Maximum energy level (0-100)'),
    },
    async ({ mood, energy_min, energy_max }) => {
      void energy_min;
      void energy_max;
      return {
        content: [{ type: 'text' as const, text: `search_by_mood not implemented yet: mood=${mood}` }],
      };
    }
  );

  return server;
}
