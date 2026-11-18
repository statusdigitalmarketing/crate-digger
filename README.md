# Crate Digger

Crate Digger is an MCP server: a small tool you plug into Claude (Claude Desktop or Claude Code). Once it is connected you can ask Claude things like "what's the mood of Frank Ocean, Pink + White?" or "give me a mood profile of this playlist", and Claude calls Crate Digger to work it out.

For each track it returns:

- **mood**: one of happy, sad, angry, chill, dark, hype, romantic, anxious
- **energy**: 0 to 100
- **subgenre vibe**: a short label like "neo-soul", "chopped and screwed" or "laid-back groove", picked from keywords in the lyrics and the mood
- **lyric themes** and a **mood arc** (how the mood moves through the song), when lyrics are found
- **confidence** and which sources it actually used

It works from two inputs:

1. **Lyrics**, looked up for free on [LRCLIB](https://lrclib.net) (no account or API key needed) and scored against a built-in sentiment word list.
2. **Audio**, if you give it the path to a **WAV** file on your computer. It measures loudness, brightness and texture of the sound and maps that to a mood. Only WAV is supported (convert MP3s first).

If a song is not on LRCLIB and you pass no audio, it can only make a low-confidence neutral guess.

Everything runs on your own computer. Results are cached in `~/.crate-digger/crate-digger.db` so repeat lookups are instant and `search_by_mood` can find tracks you have already classified.

## Tools Claude gets

| Tool | What it does |
|------|--------------|
| `classify_track` | Mood, energy, vibe, themes for one track (artist + title, optional WAV path) |
| `batch_classify` | The same for a list of tracks |
| `get_mood_profile` | Mood breakdown, average energy and vibe summary for a playlist |
| `search_by_mood` | Find tracks you have already classified by mood and energy range |

## Requirements

- **Node.js 22.13 or newer** (it uses Node's built-in SQLite). Check with `node -v`. Get it from https://nodejs.org (the LTS download is fine).
- That's it. No API keys are needed. Internet access is used to look up lyrics.

## Optional extra lyrics sources

LRCLIB covers most songs. If a track is missing there, Crate Digger also tries these, but only when you add their keys (never share yours; none ship with this download):

- **Musixmatch**: `MUSIXMATCH_API_KEY`. Musixmatch no longer offers a free developer key; its API plans are paid (https://www.musixmatch.com/pro/api/pricing).
- **Genius**: `GENIUS_API_KEY`. Create an API client at https://genius.com/api-clients and click "Generate Access Token". Genius usually blocks automated requests to its lyrics pages, so expect this to find little.
- **Spotify** (optional, most people can skip it): `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` add Spotify's audio features, but Spotify closed that endpoint to new apps in late 2024, so a new Spotify app will not get any data from it.

## Install

1. Unzip `crate-digger.zip` somewhere permanent, for example your home folder. You get a `crate-digger` folder with `crate-digger.mjs` in it.
2. Find the full paths you will need:
   - macOS / Linux: run `which node` and note the path (for example `/opt/homebrew/bin/node`). The server file is wherever you unzipped it, for example `/Users/you/crate-digger/crate-digger.mjs`.
   - Windows: run `where node` (for example `C:\Program Files\nodejs\node.exe`); in JSON, write backslashes as `\\`.

### Claude Desktop

Open Claude Desktop, go to Settings, Developer, Edit Config. That opens `claude_desktop_config.json`. Add this (merge it into `mcpServers` if you already have one), using your real paths:

```json
{
  "mcpServers": {
    "crate-digger": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/Users/you/crate-digger/crate-digger.mjs"]
    }
  }
}
```

If you have optional keys, add an `"env": { "GENIUS_API_KEY": "..." }` block next to `args`. Quit and reopen Claude Desktop. Crate Digger shows up under the tools icon in a new chat.

Use the full path to `node` rather than just `node`: Claude Desktop does not always see the same PATH as your terminal.

### Claude Code

```bash
claude mcp add crate-digger -- node /Users/you/crate-digger/crate-digger.mjs
```

Then start `claude` and run `/mcp` to check it is connected.

## Try it

- "Use crate digger to classify Daft Punk, One More Time"
- "Classify the track at /Users/you/Music/demo.wav, artist Me, title Demo"
- "Get a mood profile for: Kendrick Lamar - HUMBLE., Sade - No Ordinary Love, Burial - Archangel"
- "Search my crate for chill tracks with energy under 40"

## Good to know

- `lyrics_source: "llm"` in a result means no lyrics were found; there is no LLM call behind it, the result is based on audio (if given) or a neutral default.
- Lookups are cached for 30 days. Delete `~/.crate-digger/crate-digger.db` to start fresh.
- Optional: set `CRATE_DIGGER_PORT=3890` to also expose a small HTTP API on that port. It only listens on your own computer (127.0.0.1).

## Building from source

```bash
npm install
npm test           # vitest
npm run build      # tsc to dist/, run with: node dist/index.js
npm run bundle     # single-file release/crate-digger/crate-digger.mjs
./scripts/package-release.sh   # release/crate-digger.zip (bundle + this README)
```
