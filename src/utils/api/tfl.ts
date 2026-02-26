/**
 * TfL API integration for Tube, DLR, Overground, and Elizabeth Line
 */

import type { Arrival, StationSearchResult, TflArrival, TflStopPoint, TflSearchResponse } from '../../types'
import { fetchWithRetry } from './retry'
import { withCache } from './cache'
import { fetchRouteSequence, getCallingPoints, type ParsedRouteData } from './tflRoutes'

// Edge function proxies to TfL API and adds the API key server-side
const TFL_BASE_URL = '/api/tfl'

// TfL API modes that support real-time arrivals
const TFL_MODES = ['tube', 'dlr', 'overground', 'elizabeth-line']

// Cache for hub station -> child station IDs mapping
const hubChildrenCache = new Map<string, string[]>()

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
 * Get child station IDs for a hub station (with caching)
 */
async function getHubChildren(stationId: string): Promise<string[]> {
  // Check cache first
  const cached = hubChildrenCache.get(stationId)
  if (cached) {
    return cached
  }

  const response = await fetchWithRetry(`${TFL_BASE_URL}/StopPoint/${stationId}`)

  if (!response.ok) {
    return []
  }

  const stationData: TflStopPoint = await response.json()
  const childIds = findRailChildStops(stationData)

  // Cache the result (hub structure doesn't change often)
  if (childIds.length > 0) {
    hubChildrenCache.set(stationId, childIds)
  }

  return childIds
}

/**
 * Fetch TfL arrivals for a station (handles hub stations)
 */
export async function fetchTflArrivals(stationId: string): Promise<Arrival[]> {
  const cacheKey = `tfl-arrivals-${stationId}`

  return withCache(cacheKey, async () => {
    const url = `${TFL_BASE_URL}/StopPoint/${stationId}/Arrivals`
    const response = await fetchWithRetry(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch arrivals: ${response.status}`)
    }

    let data: TflArrival[] = await response.json()

    // If empty, this might be a hub station - get child stops
    if (data.length === 0) {
      const childIds = await getHubChildren(stationId)

      if (childIds.length > 0) {
        const childArrivals = await Promise.all(
          childIds.map(async (childId) => {
            try {
              const childUrl = `${TFL_BASE_URL}/StopPoint/${childId}/Arrivals`
              const childResponse = await fetchWithRetry(childUrl)
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

    // Filter out arrivals with no destination info — these are incomplete predictions
    // (e.g. Circle line at Paddington Bakerloo stop returns entries with no destinationName
    // or destinationNaptanId, just a platform name like "Inner Rail")
    data = data.filter((arrival) => arrival.destinationName || arrival.destinationNaptanId)

    // Fetch route sequences for computing calling points.
    // For arrivals without direction (e.g. Circle line at terminus), fetch both directions.
    const routeKeys = new Set<string>()
    for (const arrival of data) {
      if (arrival.lineId) {
        if (arrival.direction) {
          routeKeys.add(`${arrival.lineId}|${arrival.direction}`)
        } else {
          routeKeys.add(`${arrival.lineId}|outbound`)
          routeKeys.add(`${arrival.lineId}|inbound`)
        }
      }
    }

    const routeMap = new Map<string, ParsedRouteData | null>()
    const routeEntries = await Promise.all(
      Array.from(routeKeys).map(async (key) => {
        const [lineId, direction] = key.split('|')
        const seq = await fetchRouteSequence(lineId, direction)
        return [key, seq] as const
      })
    )
    for (const [key, seq] of routeEntries) {
      routeMap.set(key, seq)
    }

    /**
     * Try to compute calling points using a given route dataset,
     * first with the arrival's naptanId, then falling back to the configured stationId.
     */
    function tryCallingPoints(
      arrival: TflArrival,
      routeData: ParsedRouteData
    ): string[] | undefined {
      let result = getCallingPoints(
        arrival.naptanId || stationId,
        arrival.destinationNaptanId!,
        routeData
      )
      if (!result && arrival.naptanId && arrival.naptanId !== stationId) {
        result = getCallingPoints(stationId, arrival.destinationNaptanId!, routeData)
      }
      return result
    }

    // Normalize to common format, deduplicate, and sort
    const now = Date.now()
    const normalized = data
      .map((arrival) => {
        let callingPoints: string[] | undefined
        if (arrival.destinationNaptanId && arrival.lineId) {
          if (arrival.direction) {
            // Known direction — use that route
            const routeData = routeMap.get(`${arrival.lineId}|${arrival.direction}`)
            if (routeData) {
              callingPoints = tryCallingPoints(arrival, routeData)
            }
          } else {
            // No direction (e.g. Circle line at terminus) — try both
            for (const dir of ['outbound', 'inbound']) {
              const routeData = routeMap.get(`${arrival.lineId}|${dir}`)
              if (routeData) {
                callingPoints = tryCallingPoints(arrival, routeData)
                if (callingPoints) break
              }
            }
          }
        }

        // Filter out trains terminating at this station with no onward journey.
        // Destination === origin is valid on circular routes (e.g. Circle line) where
        // there are intermediate calling points, but not for terminus arrivals (e.g. DLR at Bank).
        if (
          arrival.destinationNaptanId &&
          arrival.destinationNaptanId === arrival.naptanId &&
          (!callingPoints || callingPoints.length === 0)
        ) {
          return null
        }

        return {
          id: arrival.vehicleId || arrival.id,
          expectedDeparture: now + arrival.timeToStation * 1000,
          destinationName: arrival.destinationName || arrival.towards || '',
          callingPoints,
          lineName: arrival.lineName,
          lineId: arrival.lineId,
          modeName: arrival.modeName,
          platformName: arrival.platformName,
          status: null,
          operator: null,
          source: 'tfl' as const,
        }
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)

    // Deduplicate by ID (same train can appear from multiple child stops)
    const seen = new Set<string>()
    const deduplicated = normalized.filter((arrival) => {
      if (seen.has(arrival.id)) {
        return false
      }
      seen.add(arrival.id)
      return true
    })

    return deduplicated.sort((a, b) => a.expectedDeparture - b.expectedDeparture)
  })
}

/**
 * Search TfL stations
 */
export async function searchTflStations(query: string): Promise<StationSearchResult[]> {
  const response = await fetchWithRetry(
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
