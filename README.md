# Train Departures Dashboard

A React + Vite app showing real-time train departures from nearby stations. Designed for wall-mounted kitchen dashboards.

## Supported Services

- **National Rail** - All UK train operators via Darwin/Huxley 2
- London Underground (Tube)
- DLR (Docklands Light Railway)
- London Overground
- Elizabeth Line

## Features

- Real-time departure information with auto-refresh
- Walk time buffer (hide trains you can't reach in time)
- Destination filtering
- Official line/operator colors
- Dark theme (default) for display-friendly viewing
- Configuration persisted to localStorage
- Responsive design for various screen sizes

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

Click the "Settings" button to:

1. **Add stations** - Search for stations by name (supports both National Rail and TfL stations)
2. **Set walk time** - Minutes it takes you to reach the station (departures sooner than this are hidden)
3. **Filter destinations** - Show only trains going to a specific destination
4. **Adjust refresh interval** - How often to fetch new data (default: 30 seconds)
5. **Toggle platform display** - Show/hide platform numbers
6. **Switch theme** - Dark or light mode

Configuration is saved to localStorage and persists across page refreshes.

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

- React 18
- Vite
- Plain CSS
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

## Project Structure

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Main app container
├── App.css               # Component styles
├── index.css             # Base styles
├── components/
│   ├── Dashboard.jsx     # Main departure board display
│   ├── StationCard.jsx   # Single station's departures
│   ├── DepartureRow.jsx  # Individual departure row
│   ├── Settings.jsx      # Configuration modal
│   └── LineIndicator.jsx # Line color badge
├── hooks/
│   ├── useConfig.js      # localStorage config management
│   └── useDepartures.js  # API fetching + polling
└── utils/
    ├── api.js            # TfL + National Rail API wrapper
    └── modeColors.js     # Line/operator color mapping
```
