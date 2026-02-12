import type { LyricsResult } from '../types.js';

interface GeniusSearchHit {
  result: {
    id: number;
    url: string;
    title: string;
    primary_artist: {
      name: string;
    };
  };
}

interface GeniusSearchResponse {
  response: {
    hits: GeniusSearchHit[];
  };
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .trim();
}

function extractLyricsFromHtml(html: string): string | null {
  // Genius stores lyrics in <div data-lyrics-container="true"> elements
  const containerRegex = /<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = containerRegex.exec(html)) !== null) {
    matches.push(match[1]);
  }

  if (matches.length === 0) return null;

  const lyrics = matches
    .map(stripHtmlTags)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return lyrics.length > 0 ? lyrics : null;
}

export async function fetchFromGenius(artist: string, title: string): Promise<LyricsResult | null> {
  const apiKey = process.env['GENIUS_API_KEY'];
  if (!apiKey) {
    process.stderr.write('Warning: GENIUS_API_KEY not set, skipping Genius\n');
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const query = encodeURIComponent(`${artist} ${title}`);
    const searchUrl = `https://api.genius.com/search?q=${query}`;

    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });

    if (!searchResponse.ok) return null;

    const searchData = (await searchResponse.json()) as GeniusSearchResponse;
    const hits = searchData.response.hits;

    if (hits.length === 0) return null;

    const songUrl = hits[0].result.url;

    // Fetch the song page to extract lyrics
    const pageController = new AbortController();
    const pageTimeout = setTimeout(() => pageController.abort(), 5000);

    try {
      const pageResponse = await fetch(songUrl, {
        signal: pageController.signal,
      });

      if (!pageResponse.ok) return null;

      const html = await pageResponse.text();
      const lyrics = extractLyricsFromHtml(html);

      if (!lyrics) return null;

      return {
        lyrics,
        source: 'genius',
        themes: [],
        mood_hint: null,
      };
    } finally {
      clearTimeout(pageTimeout);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      process.stderr.write('Genius API request timed out\n');
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
