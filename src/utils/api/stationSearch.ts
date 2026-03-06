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
 * Compute how many rows to request from Darwin.
 * Always fetches generously so extra trains beyond maxDepartures are available
 * to slide in as earlier trains depart, without waiting for a refresh.
 */
function computeNumRows(station: Station): number {
  return Math.min((30 + (station.minMinutes || 0)) * 2, 149)
}

/**
 * Unified fetch function - determines which API to use based on station type.
 * For National Rail with CRS-based destinations, uses Darwin's filterCrs for
 * server-side filtering. Multiple CRS destinations trigger parallel requests
 * that are merged (OR logic).
 */
export async function fetchArrivals(station: Station): Promise<Arrival[]> {
  if (station.type === 'national-rail') {
    const crsDestinations = (station.destinations || []).filter((d) => d.crs)
    const hasTextDestinations = (station.destinations || []).some((d) => !d.crs)

    if (crsDestinations.length === 0) {
      const numRows = hasTextDestinations ? 149 : computeNumRows(station)
      return fetchNationalRailDepartures(station.crs, undefined, numRows)
    }

    // Fetch with filterCrs for each CRS destination (parallel)
    const numRows = computeNumRows(station)
    const fetches = crsDestinations.map((d) =>
      fetchNationalRailDepartures(station.crs, d.crs!, numRows)
    )

    // Also fetch unfiltered if there are text-only destinations (needs full list)
    if (hasTextDestinations) {
      fetches.push(fetchNationalRailDepartures(station.crs, undefined, 149))
    }

    const results = await Promise.all(fetches)

    // Merge and deduplicate by service ID
    const seen = new Set<string>()
    const merged: Arrival[] = []
    for (const arrivals of results) {
      for (const arrival of arrivals) {
        if (!seen.has(arrival.id)) {
          seen.add(arrival.id)
          merged.push(arrival)
        }
      }
    }
    return merged.sort((a, b) => a.expectedDeparture - b.expectedDeparture)
  }
  return fetchTflArrivals(station.id)
}
