// Official TfL line colors
export const lineColors = {
  // Tube lines
  bakerloo: '#B36305',
  central: '#E32017',
  circle: '#FFD300',
  district: '#00782A',
  'hammersmith-city': '#F3A9BB',
  jubilee: '#A0A5A9',
  metropolitan: '#9B0056',
  northern: '#000000',
  piccadilly: '#003688',
  victoria: '#0098D4',
  'waterloo-city': '#95CDBA',

  // TfL Other modes
  dlr: '#00A4A7',
  'london-overground': '#EE7C0E',
  'elizabeth-line': '#6950A1',
  tram: '#84B817',

  // National Rail operators (official brand colors)
  'national-rail': '#E21836',
  gr: '#C41E3A', // LNER (Great Railway)
  vt: '#004B87', // Avanti West Coast
  tl: '#E91E8C', // Thameslink
  sn: '#00A650', // Southern
  se: '#00AEEF', // Southeastern
  sw: '#F58220', // South Western Railway
  gw: '#0A493E', // Great Western Railway
  xc: '#660F21', // CrossCountry
  gc: '#2D2926', // Grand Central
  ht: '#7B2D81', // Hull Trains
  tp: '#00A1DE', // TransPennine Express
  nt: '#00205B', // Northern Trains
  aw: '#DA291C', // Transport for Wales
  sr: '#1C4074', // ScotRail
  le: '#E31836', // Greater Anglia
  cc: '#B7007C', // c2c
  ch: '#00B2A9', // Chiltern Railways
  em: '#9F5BBD', // East Midlands Railway
  gx: '#ED1B2E', // Gatwick Express
  il: '#00A77E', // Island Line
  lo: '#EE7C0E', // London Overground (same as TfL)
  me: '#FFD200', // Merseyrail
  es: '#F7941D', // Eurostar (limited)
  hx: '#532E63', // Heathrow Express
  ln: '#231F20', // Lumo

  // Fallback
  default: '#666666',
}

// Mode name to display name mapping
export const modeDisplayNames = {
  tube: 'Tube',
  dlr: 'DLR',
  overground: 'Overground',
  'elizabeth-line': 'Elizabeth Line',
  'national-rail': 'National Rail',
  tram: 'Tram',
}

// Get color for a line/mode
export function getLineColor(lineId, modeName) {
  // Try exact line ID match first
  const normalizedLineId = lineId?.toLowerCase().replace(/\s+/g, '-')
  if (lineColors[normalizedLineId]) {
    return lineColors[normalizedLineId]
  }

  // Fall back to mode-based color
  const normalizedMode = modeName?.toLowerCase().replace(/\s+/g, '-')
  if (lineColors[normalizedMode]) {
    return lineColors[normalizedMode]
  }

  return lineColors.default
}

// Get text color (white or black) based on background for contrast
export function getContrastColor(bgColor) {
  // Convert hex to RGB
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}
