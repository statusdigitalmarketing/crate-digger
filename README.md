# Crate Digger

MCP server that classifies music tracks by mood, energy, and subgenre vibe using lyrics analysis + spectral audio features.

## Setup

```bash
npm install
npm run build
```

## Usage

Add to your MCP client config:

```json
{
  "mcpServers": {
    "crate-digger": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "GENIUS_API_KEY": "your-key-here",
        "MUSIXMATCH_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Tools

- `classify_track` — Classify a single track by mood, energy, and subgenre vibe
- `batch_classify` — Classify multiple tracks
- `get_mood_profile` — Get mood breakdown for a playlist
- `search_by_mood` — Find tracks matching a mood from cached classifications

## Environment Variables

- `GENIUS_API_KEY` — Genius API key for lyrics fetching (optional)
- `MUSIXMATCH_API_KEY` — Musixmatch API key for lyrics fetching (optional)

Both are optional. Without API keys, the system falls back to LLM-based classification.
