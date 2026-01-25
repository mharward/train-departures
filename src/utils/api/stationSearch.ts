/**
 * Combined station search across TfL and National Rail
 */

import type { Station, Arrival, StationSearchResult } from '../../types'
import { fetchTflArrivals, searchTflStations } from './tfl'
import { fetchNationalRailDepartures, searchNationalRailStations } from './nationalRail'

/**
 * Combined station search - searches both TfL and National Rail APIs
 */
export async function searchStations(query: string): Promise<StationSearchResult[]> {
  if (!query || query.length < 2) {
    return []
  }

  // Search both APIs in parallel
  const [tflResults, nrResults] = await Promise.all([
    searchTflStations(query).catch(() => []),
    searchNationalRailStations(query).catch(() => []),
  ])

  // Combine results, National Rail first (user preference)
  return [...nrResults, ...tflResults]
}

/**
 * Unified fetch function - determines which API to use based on station type
 */
export async function fetchArrivals(station: Station): Promise<Arrival[]> {
  if (station.type === 'national-rail') {
    return fetchNationalRailDepartures(station.crs)
  }
  return fetchTflArrivals(station.id)
}
