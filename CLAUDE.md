# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (hot reload)
npm run build    # Production build to dist/
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
npm run preview  # Preview production build
```

## Architecture

This is a React + Vite frontend app that displays real-time train departures from UK rail services. No backend - it calls public APIs directly from the browser.

### Data Flow

1. **useConfig** hook manages user settings (stations, filters, theme) persisted to localStorage
2. **useDepartures** hook fetches from APIs and stores raw arrivals with absolute `expectedDeparture` timestamps
3. Every second, a tick interval re-filters the raw data to calculate live `timeToStation` countdowns and remove departed trains
4. Dashboard renders StationCards which render DepartureRows

### APIs

- **TfL Unified API** (`api.tfl.gov.uk`) - Tube, DLR, Overground, Elizabeth Line arrivals
- **Huxley 2** (`huxley2.azurewebsites.net`) - National Rail departures via Darwin proxy

Both are public APIs requiring no authentication.

### Key Files

- `src/utils/api.js` - API fetching, normalization, and filtering logic. Arrivals store `expectedDeparture` (absolute timestamp) rather than relative seconds so countdowns work without re-fetching.
- `src/hooks/useConfig.js` - User settings with migration support for schema changes
- `src/hooks/useDepartures.js` - Manages raw arrivals in a ref, re-filters every second to update countdowns
- `src/utils/modeColors.js` - Official TfL line colors and National Rail operator colors
- `src/components/TransportIcon.jsx` - TfL roundel and National Rail double-arrow SVG icons

### Destination Filtering

Stations have a `destinations` array for filtering trains:
- Each destination has `id`, `name`, and optional `crs` code
- Multiple destinations use OR logic (trains to ANY selected destination)
- For National Rail, matches final destination AND calling points
- Legacy `destinationFilter` string is migrated to `destinations` array on load
