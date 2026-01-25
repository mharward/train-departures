import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchArrivals, filterArrivals } from '../utils/api'

export function useDepartures(stations, { autoRefresh = false, refreshInterval = 30 } = {}) {
  const [departures, setDepartures] = useState({})
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [lastUpdated, setLastUpdated] = useState(null)
  const [countdown, setCountdown] = useState(refreshInterval)

  const intervalRef = useRef(null)
  const tickRef = useRef(null)
  const rawArrivalsRef = useRef({})
  const stationsRef = useRef(stations)

  // Keep stations ref updated for use in tick interval
  useEffect(() => {
    stationsRef.current = stations
  }, [stations])

  // Re-filter raw arrivals to update timeToStation and remove departed trains
  const updateDepartures = useCallback(() => {
    const stations = stationsRef.current
    if (!stations || stations.length === 0) return

    const newDepartures = {}
    for (const station of stations) {
      const raw = rawArrivalsRef.current[station.id]
      if (raw) {
        newDepartures[station.id] = filterArrivals(raw, {
          minMinutes: station.minMinutes || 0,
          maxMinutes: station.maxMinutes || 60,
          destinationFilter: station.destinationFilter || '',
          destinations: station.destinations || null,
        })
      }
    }
    setDepartures(newDepartures)
  }, [])

  // Fetch departures for all stations
  const fetchAllDepartures = useCallback(async () => {
    if (!stations || stations.length === 0) {
      rawArrivalsRef.current = {}
      setDepartures({})
      setLoading(false)
      return
    }

    const newRawArrivals = {}
    const newErrors = {}

    await Promise.all(
      stations.map(async (station) => {
        try {
          const arrivals = await fetchArrivals(station)
          newRawArrivals[station.id] = arrivals
          newErrors[station.id] = null
        } catch (error) {
          console.error(`Error fetching departures for ${station.name}:`, error)
          newErrors[station.id] = error.message
          // Keep old raw data if available
          if (rawArrivalsRef.current[station.id]) {
            newRawArrivals[station.id] = rawArrivalsRef.current[station.id]
          }
        }
      })
    )

    rawArrivalsRef.current = newRawArrivals
    setErrors(newErrors)
    setLastUpdated(new Date())
    setLoading(false)
    setCountdown(refreshInterval)

    // Immediately update departures with fresh data
    updateDepartures()
  }, [stations, refreshInterval, updateDepartures])

  // Manual refresh
  const refresh = useCallback(() => {
    setLoading(true)
    fetchAllDepartures()
  }, [fetchAllDepartures])

  // Initial fetch and auto-refresh polling
  useEffect(() => {
    fetchAllDepartures()

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAllDepartures, refreshInterval * 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchAllDepartures, autoRefresh, refreshInterval])

  // Tick every second to update countdowns and filter departed trains
  useEffect(() => {
    tickRef.current = setInterval(() => {
      updateDepartures()
      if (autoRefresh) {
        setCountdown((prev) => (prev > 0 ? prev - 1 : refreshInterval))
      }
    }, 1000)

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current)
      }
    }
  }, [updateDepartures, autoRefresh, refreshInterval])

  return {
    departures,
    loading,
    errors,
    lastUpdated,
    countdown,
    refresh,
  }
}
