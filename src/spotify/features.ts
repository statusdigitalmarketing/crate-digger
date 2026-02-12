import type { SpotifyFeatures } from '../types.js';
import { getSpotifyToken } from './auth.js';

interface SpotifySearchResponse {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
    }>;
  };
}

interface SpotifyAudioFeaturesResponse {
  valence: number;
  danceability: number;
  energy: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  loudness: number;
  key: number;
  mode: number;
}

export async function getSpotifyFeatures(artist: string, title: string): Promise<SpotifyFeatures | null> {
  const token = await getSpotifyToken();
  if (!token) return null;

  try {
    // Search for the track
    const query = encodeURIComponent(`artist:${artist} track:${title}`);
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!searchResponse.ok) {
      process.stderr.write(`Spotify search failed: ${searchResponse.status}\n`);
      return null;
    }

    const searchData = await searchResponse.json() as SpotifySearchResponse;
    if (!searchData.tracks.items.length) {
      process.stderr.write(`Spotify: no results for "${artist} - ${title}"\n`);
      return null;
    }

    const trackId = searchData.tracks.items[0].id;

    // Get audio features
    const featuresResponse = await fetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!featuresResponse.ok) {
      process.stderr.write(`Spotify audio features failed: ${featuresResponse.status}\n`);
      return null;
    }

    const features = await featuresResponse.json() as SpotifyAudioFeaturesResponse;

    return {
      valence: features.valence,
      danceability: features.danceability,
      energy: features.energy,
      tempo: features.tempo,
      acousticness: features.acousticness,
      instrumentalness: features.instrumentalness,
      speechiness: features.speechiness,
      liveness: features.liveness,
      loudness: features.loudness,
      key: features.key,
      mode: features.mode,
    };
  } catch (err: unknown) {
    process.stderr.write(`Spotify features error: ${err instanceof Error ? err.message : String(err)}\n`);
    return null;
  }
}
