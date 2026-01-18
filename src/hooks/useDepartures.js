import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchArrivals, filterArrivals } from '../utils/api'

export function useDepartures(stations, refreshInterval = 30) {
  const [departures, setDepartures] = useState({})
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [lastUpdated, setLastUpdated] = useState(null)
  const [countdown, setCountdown] = useState(refreshInterval)

  const intervalRef = useRef(null)
  const countdownRef = useRef(null)

  // Fetch departures for all stations
  const fetchAllDepartures = useCallback(async () => {
    if (!stations || stations.length === 0) {
      setDepartures({})
      setLoading(false)
      return
    }

    const newDepartures = {}
    const newErrors = {}

    await Promise.all(
      stations.map(async (station) => {
        try {
          // Pass full station object (needed to determine TfL vs National Rail)
          const arrivals = await fetchArrivals(station)
          const filtered = filterArrivals(arrivals, {
            minMinutes: station.minMinutes || 0,
            maxMinutes: station.maxMinutes || 60,
            destinationFilter: station.destinationFilter || '',
          })
          newDepartures[station.id] = filtered
          newErrors[station.id] = null
        } catch (error) {
          console.error(`Error fetching departures for ${station.name}:`, error)
          newErrors[station.id] = error.message
          // Keep old data if available
          if (departures[station.id]) {
            newDepartures[station.id] = departures[station.id]
          }
        }
      })
    )

    setDepartures(newDepartures)
    setErrors(newErrors)
    setLastUpdated(new Date())
    setLoading(false)
    setCountdown(refreshInterval)
  }, [stations, refreshInterval])

  // Manual refresh
  const refresh = useCallback(() => {
    setLoading(true)
    fetchAllDepartures()
  }, [fetchAllDepartures])

  // Initial fetch and polling setup
  useEffect(() => {
    fetchAllDepartures()

    // Set up polling interval
    intervalRef.current = setInterval(fetchAllDepartures, refreshInterval * 1000)

    // Set up countdown
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : refreshInterval))
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [fetchAllDepartures, refreshInterval])

  return {
    departures,
    loading,
    errors,
    lastUpdated,
    countdown,
    refresh,
  }
}
