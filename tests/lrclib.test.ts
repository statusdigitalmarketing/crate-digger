import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchFromLrclib, artistMatches, titleMatches, lyricsFromRecord, LrclibUnavailableError } from '../src/lyrics/lrclib.js';
import { fetchLyrics } from '../src/lyrics/index.js';

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
    const urls = stubFetch(jsonResponse(200, { artistName: 'Daft Punk', trackName: 'One More Time', plainLyrics: 'One more time\nWe gonna celebrate' }));
    const result = await fetchFromLrclib('Daft Punk', 'One More Time');
    expect(result).toEqual({ lyrics: 'One more time\nWe gonna celebrate', source: 'lrclib', themes: [], mood_hint: null });
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe('https://lrclib.net/api/get?artist_name=Daft+Punk&track_name=One+More+Time');
  });

  it('falls back to search and skips hits by a different artist', async () => {
    stubFetch(
      jsonResponse(404, { message: 'not found' }),
      jsonResponse(200, [
        { artistName: 'Some Cover Band', trackName: 'One More Time', plainLyrics: 'wrong artist' },
        { artistName: 'Daft Punk', trackName: 'One More Time (Live)', instrumental: true, plainLyrics: null },
        { artistName: 'Daft Punk feat. Romanthony', trackName: 'One More Time (Radio Edit)', plainLyrics: 'right song' },
      ]),
    );
    const result = await fetchFromLrclib('Daft Punk', 'One More Time');
    expect(result?.lyrics).toBe('right song');
  });

  it('returns null when only instrumental or wrong-artist hits exist', async () => {
    stubFetch(
      jsonResponse(200, { artistName: 'Burial', trackName: 'Archangel', instrumental: true, plainLyrics: null }),
      jsonResponse(200, [{ artistName: 'Someone Else', trackName: 'Archangel', plainLyrics: 'nope' }]),
    );
    expect(await fetchFromLrclib('Burial', 'Archangel')).toBe(null);
  });

  it('rejects a search hit that is a different song by the same artist', async () => {
    stubFetch(
      jsonResponse(404, {}),
      jsonResponse(200, [
        { artistName: 'Lana Del Rey', trackName: 'Love song', plainLyrics: 'wrong song lyrics' },
        { artistName: 'Lana Del Rey', trackName: 'Love', plainLyrics: 'right song lyrics' },
      ]),
    );
    expect((await fetchFromLrclib('Lana Del Rey', 'Love'))?.lyrics).toBe('right song lyrics');
  });

  it('rejects an artist whose name merely contains the requested one', async () => {
    stubFetch(jsonResponse(404, {}), jsonResponse(200, [{ artistName: 'Radiohead', trackName: 'Creep', plainLyrics: 'Radiohead lyrics' }]));
    expect(await fetchFromLrclib('Dio', 'Creep')).toBe(null);
  });

  it('throws LrclibUnavailableError on server errors and network failures', async () => {
    stubFetch(jsonResponse(503, {}), jsonResponse(503, {}));
    await expect(fetchFromLrclib('A', 'B')).rejects.toBeInstanceOf(LrclibUnavailableError);

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    await expect(fetchFromLrclib('A', 'B')).rejects.toBeInstanceOf(LrclibUnavailableError);
  });

  it('does not cache an LRCLIB outage as "no lyrics" and retries on the next call', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    delete process.env['GENIUS_API_KEY'];
    delete process.env['MUSIXMATCH_API_KEY'];
    const urls = stubFetch(jsonResponse(503, {}));
    const first = await fetchLyrics('Adele', 'Hello');
    expect(first.lyrics).toBe(null);
    expect(first.transient).toBe(true);

    urls.length = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(url);
      return jsonResponse(200, { artistName: 'Adele', trackName: 'Hello', plainLyrics: "Hello, it's me" });
    }));
    const second = await fetchLyrics('Adele', 'Hello');
    expect(second.lyrics).toBe("Hello, it's me");
    expect(second.transient).toBe(undefined);
    expect(urls.length).toBe(1);
  });

  it('matches whole artist names, including collaborations', () => {
    expect(artistMatches('Daft Punk', 'daft punk')).toBe(true);
    expect(artistMatches('Daft Punk', 'Daft Punk feat. Romanthony')).toBe(true);
    expect(artistMatches('Beyoncé', 'Beyonce')).toBe(true);
    expect(artistMatches('宇多田ヒカル', '宇多田ヒカル')).toBe(true);
    expect(artistMatches('宇多田ヒカル', 'Justice')).toBe(false);
    expect(artistMatches('Daft Punk', 'Justice')).toBe(false);
    expect(artistMatches('Daft Punk', undefined)).toBe(false);
    expect(artistMatches('Dio', 'Radiohead')).toBe(false);
    expect(artistMatches('Air', 'Air Supply')).toBe(false);
    expect(artistMatches('Kanye West', 'JAY-Z & Kanye West')).toBe(true);
    expect(artistMatches('Florence and the Machine', 'Florence and the Machine')).toBe(true);
  });

  it('matches titles across case, punctuation and version suffixes only', () => {
    expect(titleMatches('HUMBLE.', 'Humble')).toBe(true);
    expect(titleMatches('Here Comes the Sun', 'Here Comes the Sun (Remastered 2019)')).toBe(true);
    expect(titleMatches('Song', 'Song - Radio Edit')).toBe(true);
    expect(titleMatches('Love', 'Love song')).toBe(false);
    expect(titleMatches('Love', undefined)).toBe(false);
  });

  it('ignores empty and instrumental records', () => {
    expect(lyricsFromRecord({ plainLyrics: '   ' })).toBe(null);
    expect(lyricsFromRecord({ instrumental: true, plainLyrics: 'la la' })).toBe(null);
    expect(lyricsFromRecord(null)).toBe(null);
    expect(lyricsFromRecord({ plainLyrics: ' hello ' })).toBe('hello');
  });
});
