# Next Train

**Live at [nexttrain.uk](https://nexttrain.uk)**

A React + Vite app showing real-time train departures from nearby stations. Designed for wall-mounted kitchen dashboards. Installable as a PWA.

## Supported Services

- **National Rail** - All UK train operators via Darwin/Huxley 2
- London Underground (Tube)
- DLR (Docklands Light Railway)
- London Overground
- Elizabeth Line

## Features

- Live countdown timers that update every second
- Expandable route details showing all calling points with timing
- Walk time buffer (hide trains you can't reach in time)
- Multi-destination filtering with station search (trains to ANY selected destination)
- Schedule-based station visibility (show stations only at certain times/days)
- Delayed train indicators
- Add the same station multiple times with different filters
- Reorder stations via up/down buttons
- Installable as a PWA with offline support
- Online/offline detection with network error banner and retry
- TfL roundel and National Rail icons with official line/operator colors
- Dark, light, or system theme
- Auto-refresh with configurable interval and countdown display
- Configuration persisted to localStorage
- Responsive design for mobile and desktop

## User Guide

### Adding Stations

1. Open **Settings** (gear icon)
2. Search for a station by name in the search box
3. Click a result to add it - the edit form opens automatically so you can configure it
4. You can add the same station multiple times with different filters (e.g., one for eastbound, one for westbound)

### Viewing Departures

Each station card shows upcoming departures with:
- **Countdown** - minutes until departure (shows "Due" when imminent)
- **Departure time** - actual scheduled time
- **Destination** - final station name (shows "via X" if your filtered destination is an intermediate stop)
- **Platform** - platform number (toggleable in settings)
- **Delayed badge** - yellow indicator when a train is running late

Tap/click a departure row to expand it and see the **full route** with all calling points, scheduled and estimated times, and journey duration between stops.

As trains depart, the next ones in the buffer automatically slide into view without waiting for a refresh.

### Walk Time

Set the walk time to your station (in minutes) to hide trains you can't catch. For example, if it takes 10 minutes to walk to the station, departures sooner than 10 minutes away are hidden.

### Destination Filtering

Filter to only show trains going to specific destinations:
1. In the station edit form, search for destination stations
2. Add one or more destinations - trains to ANY of them will show
3. For National Rail, this matches both the final destination and intermediate calling points

### Schedule

Show a station only during certain times and days:
1. Enable "Only show during scheduled times"
2. Set a time window (e.g., 07:00-09:00)
3. Select which days of the week (supports overnight windows like 22:00-06:00)

Useful for commute stations you only need on weekday mornings.

### Reordering Stations

Use the up/down arrow buttons in Settings to change the order stations appear on the dashboard.

### Installing as an App

Next Train is a Progressive Web App. On supported browsers, you can install it to your home screen for a full-screen, app-like experience.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Format code with Prettier
npm run format

# Preview production build
npm run preview
```

## Deployment

This is a pure frontend app that can be deployed to any static hosting service.

### Netlify

1. Connect your repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`

Or deploy manually:

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Mantine UI
- TfL Unified API (Tube, DLR, Overground, Elizabeth Line)
- Huxley 2 / Darwin API (National Rail)

## APIs

### TfL Unified API

The [TfL Unified API](https://api.tfl.gov.uk/) provides real-time arrival data for TfL-operated services:
- No API key required for low-volume usage
- Generous rate limit (~500 requests/min)

### National Rail (Huxley 2)

National Rail data is provided via [Huxley 2](https://github.com/jpsingleton/Huxley2), a JSON proxy for the Darwin SOAP API:
- Uses the public demo instance (no registration required)
- Covers all UK train operators
