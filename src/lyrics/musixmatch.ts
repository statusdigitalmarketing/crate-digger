import type { LyricsResult } from '../types.js';

interface MusixmatchTrackSearchResponse {
  message: {
    body: {
      track_list: Array<{
        track: {
          track_id: number;
          track_name: string;
          artist_name: string;
          primary_genres: {
            music_genre_list: Array<{
              music_genre: {
                music_genre_name: string;
              };
            }>;
          };
        };
      }>;
    };
  };
}

interface MusixmatchLyricsResponse {
  message: {
    body: {
      lyrics: {
        lyrics_body: string;
      };
    };
  };
}

export async function fetchFromMusixmatch(artist: string, title: string): Promise<LyricsResult | null> {
  const apiKey = process.env['MUSIXMATCH_API_KEY'];
  if (!apiKey) {
    process.stderr.write('Warning: MUSIXMATCH_API_KEY not set, skipping Musixmatch\n');
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const trackParam = encodeURIComponent(title);
    const artistParam = encodeURIComponent(artist);
    const searchUrl = `https://api.musixmatch.com/ws/1.1/track.search?q_track=${trackParam}&q_artist=${artistParam}&apikey=${apiKey}&page_size=1&s_track_rating=desc`;

    const searchResponse = await fetch(searchUrl, { signal: controller.signal });
    if (!searchResponse.ok) return null;

    const searchData = (await searchResponse.json()) as MusixmatchTrackSearchResponse;
    const trackList = searchData.message.body.track_list;

    if (trackList.length === 0) return null;

    const trackId = trackList[0].track.track_id;

    // Fetch lyrics
    const lyricsController = new AbortController();
    const lyricsTimeout = setTimeout(() => lyricsController.abort(), 5000);

    try {
      const lyricsUrl = `https://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=${trackId}&apikey=${apiKey}`;
      const lyricsResponse = await fetch(lyricsUrl, { signal: lyricsController.signal });

      if (!lyricsResponse.ok) return null;

      const lyricsData = (await lyricsResponse.json()) as MusixmatchLyricsResponse;
      const lyricsBody = lyricsData.message.body.lyrics?.lyrics_body;

      if (!lyricsBody) return null;

      // Musixmatch often appends a disclaimer — remove it
      const cleanLyrics = lyricsBody
        .replace(/\*{7}.*$/s, '')
        .trim();

      if (cleanLyrics.length === 0) return null;

      return {
        lyrics: cleanLyrics,
        source: 'musixmatch',
        themes: [],
        mood_hint: null,
      };
    } finally {
      clearTimeout(lyricsTimeout);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      process.stderr.write('Musixmatch API request timed out\n');
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
