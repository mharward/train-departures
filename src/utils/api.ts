import type {
  Station,
  Arrival,
  FilteredArrival,
  FilterOptions,
  StationSearchResult,
  TflArrival,
  TflStopPoint,
  TflSearchResponse,
  NationalRailService,
  NationalRailDeparturesResponse,
  NationalRailStationResponse,
} from '../types'

const TFL_BASE_URL = 'https://api.tfl.gov.uk'
const HUXLEY_BASE_URL = 'https://huxley2.azurewebsites.net'

// TfL API modes that support real-time arrivals
const TFL_MODES = ['tube', 'dlr', 'overground', 'elizabeth-line']

// Find child stop IDs for rail modes from a hub station
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

// Convert time string (HH:MM) to seconds from now
export function timeToSeconds(timeStr: string | null | undefined): number {
  if (!timeStr) return Infinity

  const now = new Date()
  const parts = timeStr.split(':').map(Number)
  const hours = parts[0] ?? 0
  const minutes = parts[1] ?? 0

  const target = new Date()
  target.setHours(hours, minutes, 0, 0)

  // If the time is earlier than now, assume it's tomorrow
  if (target < now) {
    target.setDate(target.getDate() + 1)
  }

  return Math.floor((target.getTime() - now.getTime()) / 1000)
}

// Fetch TfL arrivals for a station (handles hub stations)
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

// Extract calling points from a service
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

// Fetch National Rail departures via Huxley 2
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
      let timeToStation: number
      if (etd === 'On time' || etd === 'Delayed') {
        timeToStation = timeToSeconds(std)
      } else if (etd && /^\d{2}:\d{2}$/.test(etd)) {
        timeToStation = timeToSeconds(etd)
      } else {
        timeToStation = timeToSeconds(std)
      }

      // Get all calling points for intermediate station filtering
      const callingPoints = extractCallingPoints(service)

      return {
        id: service.serviceID,
        expectedDeparture: Date.now() + timeToStation * 1000,
        destinationName: destination,
        callingPoints, // Include intermediate stops
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

// Unified fetch function - determines which API to use based on station type
export async function fetchArrivals(station: Station): Promise<Arrival[]> {
  if (station.type === 'national-rail') {
    return fetchNationalRailDepartures(station.crs)
  }
  return fetchTflArrivals(station.id)
}

// Search TfL stations
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

// Search National Rail stations via Huxley 2
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

// Combined station search
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

// Filter arrivals based on configuration and calculate current timeToStation
export function filterArrivals(
  arrivals: Arrival[],
  { minMinutes = 0, maxMinutes = 60, destinationFilter = '', destinations = null }: FilterOptions
): FilteredArrival[] {
  const minSeconds = minMinutes * 60
  const maxSeconds = maxMinutes * 60
  const now = Date.now()

  return arrivals
    .map((arrival) => ({
      ...arrival,
      timeToStation: Math.floor((arrival.expectedDeparture - now) / 1000),
    }))
    .filter((arrival) => {
      // Filter out departed trains (negative timeToStation)
      if (arrival.timeToStation < 0) {
        return false
      }

      // Must be at least minMinutes away
      if (arrival.timeToStation < minSeconds) {
        return false
      }

      // Must be at most maxMinutes away
      if (arrival.timeToStation > maxSeconds) {
        return false
      }

      // Filter by destinations array (new format) - takes precedence
      if (destinations && destinations.length > 0) {
        const matchesAny = destinations.some((dest) => {
          const destName = dest.name.toLowerCase()
          const destCrs = dest.crs?.toLowerCase()

          // Check final destination (name or CRS)
          const destination = (arrival.destinationName || '').toLowerCase()
          if (destination.includes(destName) || (destCrs && destination.includes(destCrs))) {
            return true
          }

          // Check calling points (National Rail only)
          const callingPoints = arrival.callingPoints || []
          return callingPoints.some(
            (point) =>
              point.toLowerCase().includes(destName) ||
              (destCrs && point.toLowerCase().includes(destCrs))
          )
        })

        if (!matchesAny) return false
      }
      // Legacy: filter by destination string (case-insensitive partial match)
      else if (destinationFilter && destinationFilter.trim()) {
        const filter = destinationFilter.toLowerCase().trim()

        // Check final destination
        const destination = (arrival.destinationName || '').toLowerCase()
        const matchesDestination = destination.includes(filter)

        // Check calling points (intermediate stations)
        const callingPoints = arrival.callingPoints || []
        const matchesCallingPoint = callingPoints.some((point) =>
          point.toLowerCase().includes(filter)
        )

        if (!matchesDestination && !matchesCallingPoint) {
          return false
        }
      }

      return true
    })
}

// Format arrival time to minutes
export function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes <= 0) {
    return 'Due'
  }
  return `${minutes} min`
}
