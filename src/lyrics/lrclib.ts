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

/** Thrown when LRCLIB could not answer (outage, rate limit, timeout, network), as opposed to "song not found". */
export class LrclibUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LrclibUnavailableError';
  }
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

// "Daft Punk feat. Romanthony", "Jay-Z & Kanye West", "Skrillex x Diplo", "A, B and C"
const COLLAB_SPLIT = /\s*(?:,|&|\+|\/|\bfeat\.?|\bft\.?|\bfeaturing\b|\bwith\b|\band\b|\bx\b|\bvs\.?)\s*/i;

function artistNames(value: string): string[] {
  return value.split(COLLAB_SPLIT).map(normalize).filter(Boolean);
}

/**
 * True when the two artist credits share a whole artist name. Collaborations are split first,
 * so "Daft Punk" matches "Daft Punk feat. Romanthony", but "Dio" never matches "Radiohead"
 * and "Air" never matches "Air Supply".
 */
export function artistMatches(wanted: string, found: string | undefined): boolean {
  if (!found) return false;
  const wantedNames = artistNames(wanted);
  const foundNames = new Set(artistNames(found));
  // A band name containing "and" ("Florence and the Machine") is also compared whole.
  const wholeWanted = normalize(wanted);
  if (wholeWanted && wholeWanted === normalize(found)) return true;
  return wantedNames.some(name => foundNames.has(name));
}

/** Title without version suffixes: "Song (Remastered 2011)", "Song - Radio Edit", "Song [Live]". */
function baseTitle(value: string): string {
  return normalize(value.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, ''));
}

/** True when the record is the requested song, ignoring case, punctuation and version suffixes. */
export function titleMatches(wanted: string, found: string | undefined): boolean {
  if (!found) return false;
  const a = baseTitle(wanted);
  return a !== '' && a === baseTitle(found);
}

/** Returns usable lyrics from one LRCLIB record, or null for instrumentals and empty records. */
export function lyricsFromRecord(record: LrclibRecord | null | undefined): string | null {
  if (!record || record.instrumental) return null;
  const lyrics = record.plainLyrics?.trim();
  return lyrics ? lyrics : null;
}

/** null means "not found" (404); anything LRCLIB could not answer throws LrclibUnavailableError. */
async function getJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new LrclibUnavailableError(`LRCLIB request failed: ${response.status}`);
    return await response.json();
  } catch (err: unknown) {
    if (err instanceof LrclibUnavailableError) throw err;
    const reason = err instanceof Error && err.name === 'AbortError'
      ? 'timed out'
      : err instanceof Error ? err.message : String(err);
    throw new LrclibUnavailableError(`LRCLIB request ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
}

function pick(record: LrclibRecord | null | undefined, artist: string, title: string): string | null {
  if (!record) return null;
  if (!artistMatches(artist, record.artistName) || !titleMatches(title, record.trackName)) return null;
  return lyricsFromRecord(record);
}

/**
 * Lyrics for the song, or null when LRCLIB has no lyrics for it.
 * Throws LrclibUnavailableError when LRCLIB could not be asked, so callers do not cache an outage as "no lyrics".
 */
export async function fetchFromLrclib(artist: string, title: string): Promise<LyricsResult | null> {
  const params = new URLSearchParams({ artist_name: artist, track_name: title });

  // 1. Exact lookup.
  let lyrics = pick((await getJson(`${BASE_URL}/get?${params}`)) as LrclibRecord | null, artist, title);

  // 2. Search, keeping only hits that are the same song by the same artist.
  if (!lyrics) {
    const hits = await getJson(`${BASE_URL}/search?${params}`);
    if (Array.isArray(hits)) {
      for (const hit of hits as LrclibRecord[]) {
        lyrics = pick(hit, artist, title);
        if (lyrics) break;
      }
    }
  }

  return lyrics ? { lyrics, source: 'lrclib', themes: [], mood_hint: null } : null;
}
