# BrowseVerse - Browsing Knowledge OS

A local-first Chrome extension that passively observes your browsing behavior and transforms it into a structured, explorable personal knowledge system.

## Features

- **BrowseVerse**: Your personal Browsing Knowledge OS — capture, organize, and explore everything you learn on the web
- **Passive Capture**: Automatically tracks pages, dwell time, and sessions
- **Knowledge Engine**: Deterministic topic inference, category building, and relationship mapping
- **Knowledge Boxes**: Goal-oriented tracking spaces for research and learning
- **Dashboard**: Clean, AlignUI-inspired interface with timeline, categories, graph view
- **Privacy First**: All data stays on your device; domain exclusions, retroactive deletion, data export
- **Optional AI**: Bring your own API key for enhanced clustering, summarization, and brainstorming

## Tech Stack

- [WXT](https://wxt.dev/) - Web Extension Framework (Manifest V3)
- React 18 + TypeScript
- Tailwind CSS
- Dexie.js (IndexedDB)
- Canvas-based force-directed graph

## Getting Started

```bash
# Install dependencies
npm install

# Start development (loads extension with HMR)
npm run dev

# Build for production
npm run build

# Package as .zip
npm run zip
```

### Loading in Chrome

1. Run `npm run dev`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `output/chrome-mv3` directory

## Architecture

```
entrypoints/          # WXT file-based entrypoints
  background.ts       # Service worker (capture + engine)
  content.ts          # Metadata extraction + highlights
  popup/              # Browser action popup
  dashboard.html      # Full dashboard SPA

src/
  capture/            # Page tracking, session detection
  db/                 # Dexie schema + repositories
  engine/             # Topic inference, categories, relationships
  ai/                 # Optional AI provider interface
  privacy/            # Exclusions, deletion, export
  dashboard/          # React dashboard app
    pages/            # Overview, Timeline, Categories, etc.
    components/       # Layout, shared UI components
    hooks/            # Dexie live query hooks
  shared/             # Types, constants, messaging
```

## Privacy

- All data stored locally in IndexedDB
- No telemetry, tracking, or cloud dependency
- Domain-level exclusions
- Full data export (JSON/CSV)
- Retroactive deletion
- Optional dashboard password lock

## License

MIT
