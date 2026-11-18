import type { TrackClassification, CachedClassification, LyricsResult, SpotifyFeatures } from '../types.js';
import { getDb } from './index.js';

const CACHE_MAX_AGE_DAYS = 30;

export function getCachedClassification(artist: string, title: string): CachedClassification | null {
  try {
    const db = getDb();
    const row = db.prepare(
      `SELECT * FROM classifications
       WHERE lower(artist) = lower(?) AND lower(title) = lower(?)
       AND updated_at > unixepoch() - ?`
    ).get(artist, title, CACHE_MAX_AGE_DAYS * 86400) as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      artist: row['artist'] as string,
      title: row['title'] as string,
      classification: rowToClassification(row),
    };
  } catch {
    return null;
  }
}

export function upsertClassification(
  artist: string,
  title: string,
  classification: TrackClassification,
  spotifyFeatures?: SpotifyFeatures | null,
): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO classifications (
        artist, title, mood, energy, subgenre_vibe, lyric_themes,
        spectral_mood, confidence, lyrics_found, lyrics_source,
        audio_analyzed, spotify_valence, spotify_energy, spotify_danceability, mood_arc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(artist, title) DO UPDATE SET
        mood = excluded.mood,
        energy = excluded.energy,
        subgenre_vibe = excluded.subgenre_vibe,
        lyric_themes = excluded.lyric_themes,
        spectral_mood = excluded.spectral_mood,
        confidence = excluded.confidence,
        lyrics_found = excluded.lyrics_found,
        lyrics_source = excluded.lyrics_source,
        audio_analyzed = excluded.audio_analyzed,
        spotify_valence = excluded.spotify_valence,
        spotify_energy = excluded.spotify_energy,
        spotify_danceability = excluded.spotify_danceability,
        mood_arc = excluded.mood_arc,
        updated_at = unixepoch()
    `).run(
      artist,
      title,
      classification.mood,
      classification.energy,
      classification.subgenre_vibe,
      JSON.stringify(classification.lyric_themes),
      classification.spectral_mood,
      classification.confidence,
      classification.source.lyrics_found ? 1 : 0,
      classification.source.lyrics_source,
      classification.source.audio_analyzed ? 1 : 0,
      spotifyFeatures?.valence ?? null,
      spotifyFeatures?.energy ?? null,
      spotifyFeatures?.danceability ?? null,
      classification.mood_arc ? JSON.stringify(classification.mood_arc) : null,
    );
  } catch (err: unknown) {
    process.stderr.write(`DB upsert error: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

export function searchByMood(
  mood: string,
  energyMin?: number,
  energyMax?: number,
): CachedClassification[] {
  try {
    const db = getDb();
    let sql = 'SELECT * FROM classifications WHERE mood = ?';
    const params: unknown[] = [mood];

    if (energyMin !== undefined) {
      sql += ' AND energy >= ?';
      params.push(energyMin);
    }
    if (energyMax !== undefined) {
      sql += ' AND energy <= ?';
      params.push(energyMax);
    }

    const rows = db.prepare(sql).all(...params);
    return rows.map(row => ({
      artist: row['artist'] as string,
      title: row['title'] as string,
      classification: rowToClassification(row),
    }));
  } catch {
    return [];
  }
}

export function getCachedTrackCount(): number {
  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM classifications').get() as Record<string, unknown> | undefined;
    return (row?.['count'] as number) ?? 0;
  } catch {
    return 0;
  }
}

export function getCachedLyrics(artist: string, title: string): LyricsResult | null {
  try {
    const db = getDb();
    const row = db.prepare(
      'SELECT * FROM lyrics_cache WHERE lower(artist) = lower(?) AND lower(title) = lower(?)'
    ).get(artist, title) as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      lyrics: row['lyrics'] as string | null,
      source: row['source'] as LyricsResult['source'],
      themes: JSON.parse(row['themes'] as string || '[]') as string[],
      mood_hint: null,
    };
  } catch {
    return null;
  }
}

export function cacheLyrics(artist: string, title: string, result: LyricsResult): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO lyrics_cache (artist, title, lyrics, source, themes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(artist, title) DO UPDATE SET
        lyrics = excluded.lyrics,
        source = excluded.source,
        themes = excluded.themes,
        cached_at = unixepoch()
    `).run(artist, title, result.lyrics, result.source, JSON.stringify(result.themes));
  } catch (err: unknown) {
    process.stderr.write(`DB lyrics cache error: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

function rowToClassification(row: Record<string, unknown>): TrackClassification {
  const moodArc = typeof row['mood_arc'] === 'string'
    ? JSON.parse(row['mood_arc']) as TrackClassification['mood_arc']
    : undefined;
  return {
    ...(moodArc ? { mood_arc: moodArc } : {}),
    mood: row['mood'] as TrackClassification['mood'],
    energy: row['energy'] as number,
    subgenre_vibe: row['subgenre_vibe'] as string,
    lyric_themes: JSON.parse(row['lyric_themes'] as string || '[]') as string[],
    spectral_mood: (row['spectral_mood'] as string) ?? 'none',
    confidence: row['confidence'] as number,
    source: {
      lyrics_found: (row['lyrics_found'] as number) === 1,
      lyrics_source: row['lyrics_source'] as TrackClassification['source']['lyrics_source'],
      audio_analyzed: (row['audio_analyzed'] as number) === 1,
    },
  };
}
