import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'http';
import { classifyTrack } from './classifier/index.js';
import type { TrackClassification, Mood } from './types.js';
import { searchByMood, getCachedTrackCount } from './db/cache.js';

interface ClassifyBody {
  artist: string;
  title: string;
  audio_path?: string;
}

interface BatchBody {
  tracks: ClassifyBody[];
}

interface MoodProfileBody {
  tracks: Array<{ artist: string; title: string }>;
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  setCorsHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: message });
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

async function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  const body = await readBody(req);
  return JSON.parse(body) as T;
}

async function handleClassify(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await parseJsonBody<ClassifyBody>(req);
  if (!body.artist || !body.title) {
    sendError(res, 400, 'artist and title are required');
    return;
  }
  const classification = await classifyTrack(body.artist, body.title, body.audio_path);
  sendJson(res, 200, classification);
}

async function handleBatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await parseJsonBody<BatchBody>(req);
  if (!body.tracks || !Array.isArray(body.tracks)) {
    sendError(res, 400, 'tracks array is required');
    return;
  }
  const results: TrackClassification[] = [];
  for (const track of body.tracks) {
    const classification = await classifyTrack(track.artist, track.title, track.audio_path);
    results.push(classification);
  }
  sendJson(res, 200, results);
}

async function handleMoodProfile(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await parseJsonBody<MoodProfileBody>(req);
  if (!body.tracks || !Array.isArray(body.tracks)) {
    sendError(res, 400, 'tracks array is required');
    return;
  }

  const classifications: TrackClassification[] = [];
  for (const track of body.tracks) {
    const classification = await classifyTrack(track.artist, track.title);
    classifications.push(classification);
  }

  const moodCounts: Record<string, number> = {};
  let energySum = 0;
  const vibes: string[] = [];

  for (const c of classifications) {
    moodCounts[c.mood] = (moodCounts[c.mood] ?? 0) + 1;
    energySum += c.energy;
    if (c.subgenre_vibe !== 'general' && c.subgenre_vibe !== 'unknown') {
      vibes.push(c.subgenre_vibe);
    }
  }

  let dominantMood = 'chill';
  let maxCount = 0;
  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantMood = mood;
    }
  }

  const total = classifications.length;
  const moodDistribution: Record<string, number> = {};
  for (const [mood, count] of Object.entries(moodCounts)) {
    moodDistribution[mood] = Math.round((count / total) * 100);
  }

  const uniqueVibes = [...new Set(vibes)];
  const vibeSummary = uniqueVibes.length > 0
    ? uniqueVibes.slice(0, 5).join(', ')
    : `${dominantMood} mix`;

  sendJson(res, 200, {
    dominant_mood: dominantMood,
    mood_distribution: moodDistribution,
    avg_energy: Math.round(energySum / total),
    vibe_summary: vibeSummary,
  });
}

function handleSearch(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', `http://localhost`);
  const mood = url.searchParams.get('mood');
  if (!mood) {
    sendError(res, 400, 'mood query parameter is required');
    return;
  }

  const energyMin = url.searchParams.get('energy_min');
  const energyMax = url.searchParams.get('energy_max');

  const results = searchByMood(
    mood as Mood,
    energyMin ? parseInt(energyMin, 10) : undefined,
    energyMax ? parseInt(energyMax, 10) : undefined,
  );
  sendJson(res, 200, results);
}

function handleHealth(res: ServerResponse): void {
  sendJson(res, 200, {
    status: 'ok',
    tracks_cached: getCachedTrackCount(),
  });
}

export function startHttpServer(port: number): void {
  const server = createHttpServer(async (req, res) => {
    const method = req.method ?? 'GET';
    const pathname = new URL(req.url ?? '/', `http://localhost`).pathname;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (method === 'POST' && pathname === '/classify') {
        await handleClassify(req, res);
      } else if (method === 'POST' && pathname === '/batch') {
        await handleBatch(req, res);
      } else if (method === 'POST' && pathname === '/mood-profile') {
        await handleMoodProfile(req, res);
      } else if (method === 'GET' && pathname === '/search') {
        handleSearch(req, res);
      } else if (method === 'GET' && pathname === '/health') {
        handleHealth(res);
      } else {
        sendError(res, 404, 'Not found');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`HTTP error: ${message}\n`);
      sendError(res, 500, message);
    }
  });

  server.listen(port, () => {
    process.stderr.write(`Crate Digger HTTP server listening on port ${port}\n`);
  });
}
