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

// Matching work is bounded: inputs come from MCP tool arguments and LRCLIB responses of any length.
// Longer names are rejected (a miss), never truncated, since a truncated name can equal a different one.
const MAX_NAME_LENGTH = 200;

function tooLong(...values: string[]): boolean {
  return values.some(v => v.length > MAX_NAME_LENGTH);
}

/** Lowercased word tokens. The only regexes used are single-class and linear, so no backtracking blowup. */
function tokens(value: string): string[] {
  const n = normalize(value);
  return n ? n.split(' ') : [];
}

// Only explicit featuring credits are split off. "&", "," and "and" stay, because they are part of real
// band names ("Earth, Wind & Fire", "Simon & Garfunkel"), and splitting them causes wrong-artist matches.
const FEATURING_WORDS = new Set(['feat', 'ft', 'featuring']);

function primaryArtist(value: string): string {
  // "&" and "and" are the same word in a band name (Simon & Garfunkel = Simon and Garfunkel).
  const words = tokens(value.replace(/&/g, ' and '));
  // Split only on a real credit: a lead artist before the word and a featured artist after it,
  // so band names like "Little Feat" stay whole.
  // "Little Feat feat. Bonnie Raitt": the first "feat" is part of the band name, the second is the credit.
  const cut = words.findIndex((w, i) =>
    FEATURING_WORDS.has(w) && i > 0 && i < words.length - 1 && !FEATURING_WORDS.has(words[i + 1]));
  return (cut === -1 ? words : words.slice(0, cut)).join(' ');
}

/**
 * True when both credits name the same lead artist: "Daft Punk" matches "Daft Punk feat. Romanthony",
 * but "Dio" never matches "Radiohead", "Air" never matches "Air Supply", and "Earth" never
 * matches "Earth, Wind & Fire". A miss only means no lyrics; a false match means the wrong song.
 */
export function artistMatches(wanted: string, found: string | undefined): boolean {
  if (!found || tooLong(wanted, found)) return false;
  const a = primaryArtist(wanted);
  return a !== '' && a === primaryArtist(found);
}

// A trailing "(...)", "[...]" or " - ..." is dropped only when it is a version tag, so
// "(Part 1)" and "- Part 2" stay part of the song's identity.
const VERSION_WORDS = new Set([
  'remaster', 'remastered', 'live', 'edit', 'version', 'mix', 'remix', 'explicit', 'clean', 'mono',
  'stereo', 'demo', 'single', 'deluxe', 'bonus', 'extended', 'acoustic', 'unplugged', 'radio',
  'feat', 'ft', 'featuring',
]);

function isVersionTag(text: string): boolean {
  return tokens(text).some(w => VERSION_WORDS.has(w));
}

function stripVersion(value: string): string {
  let out = value.trim();
  // Each pass removes one tag or stops, and the string only shrinks, so this ends quickly.
  for (;;) {
    const last = out.charAt(out.length - 1);
    if (last === ')' || last === ']') {
      const open = out.lastIndexOf(last === ')' ? '(' : '[');
      if (open > 0 && isVersionTag(out.slice(open + 1, -1))) {
        out = out.slice(0, open).trim();
        continue;
      }
    }
    const dash = out.lastIndexOf(' - ');
    if (dash > 0 && isVersionTag(out.slice(dash + 3))) {
      out = out.slice(0, dash).trim();
      continue;
    }
    return tokens(out).join(' ');
  }
}

/** True when the record is the requested song: same title, or same title once trailing version tags are removed. */
export function titleMatches(wanted: string, found: string | undefined): boolean {
  if (!found || tooLong(wanted, found)) return false;
  const a = tokens(wanted).join(' ');
  if (a !== '' && a === tokens(found).join(' ')) return true;
  const baseA = stripVersion(wanted);
  return baseA !== '' && baseA === stripVersion(found);
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
