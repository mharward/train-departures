/**
 * TfL API integration for Tube, DLR, Overground, and Elizabeth Line
 */

import type { Arrival, StationSearchResult, TflArrival, TflStopPoint, TflSearchResponse } from '../../types'

const TFL_BASE_URL = 'https://api.tfl.gov.uk'

// TfL API modes that support real-time arrivals
const TFL_MODES = ['tube', 'dlr', 'overground', 'elizabeth-line']

/**
 * Find child stop IDs for rail modes from a hub station
 */
export function findRailChildStops(stationData: TflStopPoint | null | undefined): string[] {
  const childIds = new Set<string>()

  function findChildren(stop: TflStopPoint | null | undefined): void {
    if (!stop) return

    const modes = stop.modes || []
    const hasRailMode = modes.some((m) => TFL_MODES.includes(m))

    if (hasRailMode && stop.naptanId && stop.stopType !== 'TransportInterchange') {
      childIds.add(stop.naptanId)
    }

    if (stop.children && Array.isArray(stop.children)) {
      for (const child of stop.children) {
        findChildren(child)
      }
    }
  }

  findChildren(stationData)
  return Array.from(childIds)
}

/**
 * Fetch TfL arrivals for a station (handles hub stations)
 */
export async function fetchTflArrivals(stationId: string): Promise<Arrival[]> {
  const response = await fetch(`${TFL_BASE_URL}/StopPoint/${stationId}/Arrivals`)

  if (!response.ok) {
    throw new Error(`Failed to fetch arrivals: ${response.status}`)
  }

  let data: TflArrival[] = await response.json()

  // If empty, this might be a hub station - get child stops
  if (data.length === 0) {
    const detailsResponse = await fetch(`${TFL_BASE_URL}/StopPoint/${stationId}`)
    if (detailsResponse.ok) {
      const stationData: TflStopPoint = await detailsResponse.json()
      const childIds = findRailChildStops(stationData)

      if (childIds.length > 0) {
        const childArrivals = await Promise.all(
          childIds.map(async (childId) => {
            try {
              const childResponse = await fetch(`${TFL_BASE_URL}/StopPoint/${childId}/Arrivals`)
              if (childResponse.ok) {
                return childResponse.json() as Promise<TflArrival[]>
              }
            } catch (e) {
              console.warn(`Failed to fetch arrivals for ${childId}:`, e)
            }
            return []
          })
        )
        data = childArrivals.flat()
      }
    }
  }

  // Normalize to common format and sort
  const now = Date.now()
  return data
    .map((arrival) => ({
      id: arrival.vehicleId || arrival.id,
      expectedDeparture: now + arrival.timeToStation * 1000,
      destinationName: arrival.destinationName || arrival.towards || '',
      lineName: arrival.lineName,
      lineId: arrival.lineId,
      modeName: arrival.modeName,
      platformName: arrival.platformName,
      status: null,
      operator: null,
      source: 'tfl' as const,
    }))
    .sort((a, b) => a.expectedDeparture - b.expectedDeparture)
}

/**
 * Search TfL stations
 */
export async function searchTflStations(query: string): Promise<StationSearchResult[]> {
  const response = await fetch(
    `${TFL_BASE_URL}/StopPoint/Search?query=${encodeURIComponent(query)}&modes=tube,dlr,overground,elizabeth-line`
  )

  if (!response.ok) {
    throw new Error(`Failed to search stations: ${response.status}`)
  }

  const data: TflSearchResponse = await response.json()

  return (data.matches || []).map((match) => ({
    id: match.id,
    name: match.name,
    modes: match.modes || [],
    type: 'tfl' as const,
  }))
}
