import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchArrivals, filterArrivals } from '../utils/api'
import type { Station, Arrival, DeparturesMap, ErrorsMap } from '../types'

interface UseDeparturesOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseDeparturesReturn {
  departures: DeparturesMap
  loading: boolean
  errors: ErrorsMap
  lastUpdated: Date | null
  countdown: number
  refresh: () => void
}

export function useDepartures(
  stations: Station[],
  { autoRefresh = false, refreshInterval = 30 }: UseDeparturesOptions = {}
): UseDeparturesReturn {
  const [departures, setDepartures] = useState<DeparturesMap>({})
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<ErrorsMap>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(refreshInterval)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rawArrivalsRef = useRef<Record<string, Arrival[]>>({})
  const stationsRef = useRef(stations)

  // Keep stations ref updated for use in tick interval
  useEffect(() => {
    stationsRef.current = stations
  }, [stations])

  // Re-filter raw arrivals to update timeToStation and remove departed trains
  const updateDepartures = useCallback(() => {
    const currentStations = stationsRef.current
    if (!currentStations || currentStations.length === 0) return

    const newDepartures: DeparturesMap = {}
    for (const station of currentStations) {
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

    const newRawArrivals: Record<string, Arrival[]> = {}
    const newErrors: ErrorsMap = {}

    await Promise.all(
      stations.map(async (station) => {
        try {
          const arrivals = await fetchArrivals(station)
          newRawArrivals[station.id] = arrivals
          newErrors[station.id] = null
        } catch (error) {
          console.error(`Error fetching departures for ${station.name}:`, error)
          newErrors[station.id] = error instanceof Error ? error.message : 'Unknown error'
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
