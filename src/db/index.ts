import { createRequire } from 'module';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const require = createRequire(import.meta.url);

interface BetterSqlite3Database {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  close(): void;
}

interface Statement {
  run(...params: unknown[]): RunResult;
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

let db: BetterSqlite3Database | null = null;

function getDbPath(): string {
  const dir = join(homedir(), '.crate-digger');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, 'crate-digger.db');
}

export function getDb(): BetterSqlite3Database {
  if (db) return db;

  try {
    // node:sqlite is built into Node 22.13+ / 23.4+, so the download has no native
    // module to compile (better-sqlite3 had no prebuilt binary for newer Node).
    const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => BetterSqlite3Database };
    const conn = new DatabaseSync(getDbPath());
    try {
      // Wait up to 5s for another process's write lock instead of failing at once.
      conn.exec('PRAGMA busy_timeout = 5000');
      initSchema(conn);
    } catch (initErr: unknown) {
      // Do not cache a connection whose schema setup failed: the next call retries.
      conn.close();
      throw initErr;
    }
    db = conn;
    return db;
  } catch (err: unknown) {
    process.stderr.write(`SQLite init error: ${err instanceof Error ? err.message : String(err)}\n`);
    throw err;
  }
}

function initSchema(database: BetterSqlite3Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS classifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artist TEXT NOT NULL,
      title TEXT NOT NULL,
      mood TEXT NOT NULL,
      energy INTEGER NOT NULL,
      subgenre_vibe TEXT NOT NULL,
      lyric_themes TEXT NOT NULL DEFAULT '[]',
      spectral_mood TEXT,
      confidence REAL NOT NULL,
      lyrics_found INTEGER NOT NULL DEFAULT 0,
      lyrics_source TEXT NOT NULL DEFAULT 'none',
      audio_analyzed INTEGER NOT NULL DEFAULT 0,
      spotify_valence REAL,
      spotify_energy REAL,
      spotify_danceability REAL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(artist, title)
    );
    CREATE INDEX IF NOT EXISTS idx_classifications_mood ON classifications(mood);
    CREATE INDEX IF NOT EXISTS idx_classifications_energy ON classifications(energy);

    CREATE TABLE IF NOT EXISTS lyrics_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artist TEXT NOT NULL,
      title TEXT NOT NULL,
      lyrics TEXT,
      source TEXT NOT NULL,
      themes TEXT DEFAULT '[]',
      cached_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(artist, title)
    );
  `);

  // Added after v2.0.0: databases created earlier lack this column.
  const columns = database.prepare('PRAGMA table_info(classifications)').all();
  if (!columns.some(c => c['name'] === 'mood_arc')) {
    database.exec('ALTER TABLE classifications ADD COLUMN mood_arc TEXT');
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export type { BetterSqlite3Database };
