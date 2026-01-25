/**
 * API module - re-exports for backward compatibility
 */

// Time utilities
export { timeToSeconds, formatMinutes } from './time'

// TfL API
export { findRailChildStops, fetchTflArrivals, searchTflStations } from './tfl'

// National Rail API
export { extractCallingPoints, fetchNationalRailDepartures, searchNationalRailStations } from './nationalRail'

// Combined search and fetch
export { searchStations, fetchArrivals } from './stationSearch'

// Filters
export { filterArrivals } from './filters'
