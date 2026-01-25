/**
 * Arrival filtering logic
 */

import type { Arrival, FilteredArrival, FilterOptions } from '../../types'

/**
 * Filter arrivals based on configuration and calculate current timeToStation
 */
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
