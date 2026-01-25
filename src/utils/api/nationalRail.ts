/**
 * National Rail API integration via Huxley 2 (Darwin proxy)
 */

import type {
  Arrival,
  StationSearchResult,
  NationalRailService,
  NationalRailDeparturesResponse,
  NationalRailStationResponse,
} from '../../types'
import { timeToSeconds } from './time'

const HUXLEY_BASE_URL = 'https://huxley2.azurewebsites.net'

/**
 * Extract calling points from a National Rail service
 */
export function extractCallingPoints(service: NationalRailService): string[] {
  const points: string[] = []
  const callingPointsList = service.subsequentCallingPoints || []

  for (const group of callingPointsList) {
    const callingPoints = group.callingPoint || []
    for (const point of callingPoints) {
      if (point.locationName) {
        points.push(point.locationName)
      }
    }
  }

  return points
}

/**
 * Fetch National Rail departures via Huxley 2
 */
export async function fetchNationalRailDepartures(crsCode: string): Promise<Arrival[]> {
  // Use expand=true to get calling points for intermediate station filtering
  const response = await fetch(`${HUXLEY_BASE_URL}/departures/${crsCode}/20?expand=true`)

  if (!response.ok) {
    throw new Error(`Failed to fetch National Rail departures: ${response.status}`)
  }

  const data: NationalRailDeparturesResponse = await response.json()
  const services = data.trainServices || []

  // Normalize to common format
  return services
    .filter((service) => !service.isCancelled)
    .map((service) => {
      const destination = service.destination?.[0]?.locationName || 'Unknown'
      const std = service.std // Scheduled time
      const etd = service.etd // Estimated time ("On time", "Delayed", or time)

      // Calculate time to station
      let departureSeconds: number
      if (etd === 'On time' || etd === 'Delayed') {
        departureSeconds = timeToSeconds(std)
      } else if (etd && /^\d{2}:\d{2}$/.test(etd)) {
        departureSeconds = timeToSeconds(etd)
      } else {
        departureSeconds = timeToSeconds(std)
      }

      // Get all calling points for intermediate station filtering
      const callingPoints = extractCallingPoints(service)

      return {
        id: service.serviceID,
        expectedDeparture: Date.now() + departureSeconds * 1000,
        destinationName: destination,
        callingPoints,
        lineName: service.operator || '',
        lineId: service.operatorCode?.toLowerCase() || '',
        modeName: 'national-rail',
        platformName: service.platform,
        status: etd === 'Delayed' ? ('Delayed' as const) : null,
        operator: service.operator || null,
        source: 'national-rail' as const,
      }
    })
    .sort((a, b) => a.expectedDeparture - b.expectedDeparture)
}

/**
 * Search National Rail stations via Huxley 2
 */
export async function searchNationalRailStations(query: string): Promise<StationSearchResult[]> {
  const response = await fetch(`${HUXLEY_BASE_URL}/crs/${encodeURIComponent(query)}`)

  if (!response.ok) {
    // Huxley returns 404 for no matches
    if (response.status === 404) {
      return []
    }
    throw new Error(`Failed to search National Rail stations: ${response.status}`)
  }

  const data: NationalRailStationResponse | NationalRailStationResponse[] = await response.json()

  // Huxley returns either a single station or an array
  const stations = Array.isArray(data) ? data : [data]

  return stations.map((station) => ({
    id: `nr-${station.crsCode}`,
    crs: station.crsCode,
    name: station.stationName,
    modes: ['national-rail'],
    type: 'national-rail' as const,
  }))
}
