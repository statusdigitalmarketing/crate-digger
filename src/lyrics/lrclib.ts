import type { LyricsResult } from '../types.js';

// LRCLIB (https://lrclib.net) is a free, open lyrics database: no API key, full lyrics.
// It is tried first so Crate Digger finds lyrics without any key set up.
const BASE_URL = 'https://lrclib.net/api';
const USER_AGENT = 'crate-digger (https://dobepros.com/cratedigger)';
const TIMEOUT_MS = 5000;

export interface LrclibRecord {
  trackName?: string;
  artistName?: string;
  instrumental?: boolean;
  plainLyrics?: string | null;
}

function normalize(value: string): string {
  // Strip accents (Beyoncé = Beyonce) but keep letters from any script (Japanese, Arabic, ...).
  return value
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Loose artist match so a search hit by a different artist is not used ("Daft Punk" vs "Daft Punk feat. X" is fine). */
export function artistMatches(wanted: string, found: string | undefined): boolean {
  if (!found) return false;
  const a = normalize(wanted);
  const b = normalize(found);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

/** Returns usable lyrics from one LRCLIB record, or null for instrumentals and empty records. */
export function lyricsFromRecord(record: LrclibRecord | null | undefined): string | null {
  if (!record || record.instrumental) return null;
  const lyrics = record.plainLyrics?.trim();
  return lyrics ? lyrics : null;
}

async function getJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      process.stderr.write(`LRCLIB request failed: ${response.status}\n`);
      return null;
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFromLrclib(artist: string, title: string): Promise<LyricsResult | null> {
  try {
    const params = new URLSearchParams({ artist_name: artist, track_name: title });

    // 1. Exact lookup.
    const exact = (await getJson(`${BASE_URL}/get?${params}`)) as LrclibRecord | null;
    let lyrics = lyricsFromRecord(exact);

    // 2. Fuzzy search, keeping only hits by the same artist.
    if (!lyrics) {
      const hits = await getJson(`${BASE_URL}/search?${params}`);
      if (Array.isArray(hits)) {
        for (const hit of hits as LrclibRecord[]) {
          if (!artistMatches(artist, hit.artistName)) continue;
          lyrics = lyricsFromRecord(hit);
          if (lyrics) break;
        }
      }
    }

    if (!lyrics) return null;
    return { lyrics, source: 'lrclib', themes: [], mood_hint: null };
  } catch (err: unknown) {
    const message = err instanceof Error && err.name === 'AbortError'
      ? 'LRCLIB request timed out'
      : `LRCLIB error: ${err instanceof Error ? err.message : String(err)}`;
    process.stderr.write(`${message}\n`);
    return null;
  }
}
