import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchFromLrclib, artistMatches, lyricsFromRecord } from '../src/lyrics/lrclib.js';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Routes /api/get and /api/search to the given responses and records the URLs requested. */
function stubFetch(get: Response, search?: Response): string[] {
  const urls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    urls.push(url);
    if (url.includes('/api/get?')) return get;
    if (url.includes('/api/search?') && search) return search;
    return jsonResponse(404, {});
  }));
  return urls;
}

describe('lrclib', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns lyrics from an exact match without searching', async () => {
    const urls = stubFetch(jsonResponse(200, { artistName: 'Daft Punk', plainLyrics: 'One more time\nWe gonna celebrate' }));
    const result = await fetchFromLrclib('Daft Punk', 'One More Time');
    expect(result).toEqual({ lyrics: 'One more time\nWe gonna celebrate', source: 'lrclib', themes: [], mood_hint: null });
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://lrclib.net/api/get?artist_name=Daft+Punk&track_name=One+More+Time');
  });

  it('falls back to search and skips hits by a different artist', async () => {
    stubFetch(
      jsonResponse(404, { message: 'not found' }),
      jsonResponse(200, [
        { artistName: 'Some Cover Band', plainLyrics: 'wrong song' },
        { artistName: 'Daft Punk feat. Romanthony', plainLyrics: 'right song' },
      ]),
    );
    const result = await fetchFromLrclib('Daft Punk', 'One More Time');
    expect(result?.lyrics).toBe('right song');
  });

  it('returns null when only instrumental or wrong-artist hits exist', async () => {
    stubFetch(
      jsonResponse(200, { artistName: 'Burial', instrumental: true, plainLyrics: null }),
      jsonResponse(200, [{ artistName: 'Someone Else', plainLyrics: 'nope' }]),
    );
    expect(await fetchFromLrclib('Burial', 'Archangel')).toBe(null);
  });

  it('returns null on server errors and network failures instead of throwing', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    stubFetch(jsonResponse(500, {}), jsonResponse(500, {}));
    expect(await fetchFromLrclib('A', 'B')).toBe(null);

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    expect(await fetchFromLrclib('A', 'B')).toBe(null);
  });

  it('matches artists loosely but not unrelated names', () => {
    expect(artistMatches('Daft Punk', 'daft punk')).toBe(true);
    expect(artistMatches('Daft Punk', 'Daft Punk feat. Romanthony')).toBe(true);
    expect(artistMatches('Beyoncé', 'Beyonce')).toBe(true);
    expect(artistMatches('宇多田ヒカル', '宇多田ヒカル')).toBe(true);
    expect(artistMatches('宇多田ヒカル', 'Justice')).toBe(false);
    expect(artistMatches('Daft Punk', 'Justice')).toBe(false);
    expect(artistMatches('Daft Punk', undefined)).toBe(false);
  });

  it('ignores empty and instrumental records', () => {
    expect(lyricsFromRecord({ plainLyrics: '   ' })).toBe(null);
    expect(lyricsFromRecord({ instrumental: true, plainLyrics: 'la la' })).toBe(null);
    expect(lyricsFromRecord(null)).toBe(null);
    expect(lyricsFromRecord({ plainLyrics: ' hello ' })).toBe('hello');
  });
});
