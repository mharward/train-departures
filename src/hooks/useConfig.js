import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'train-departures-config'

const defaultConfig = {
  stations: [],
  autoRefresh: false,
  refreshInterval: 60,
  showPlatform: true,
  theme: 'system',
}

// Migrate station config from old format to new format
function migrateStation(station) {
  const migrated = { ...station }

  // Migrate old destinationFilter string to destinations array
  if (!migrated.destinations) {
    if (migrated.destinationFilter && migrated.destinationFilter.trim()) {
      migrated.destinations = [
        {
          id: `text-${migrated.destinationFilter}`,
          name: migrated.destinationFilter.trim(),
          crs: null,
        },
      ]
    } else {
      migrated.destinations = []
    }
  }

  return migrated
}

export function useConfig() {
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Migrate stations to new format
        const stations = (parsed.stations || []).map(migrateStation)
        return { ...defaultConfig, ...parsed, stations }
      }
    } catch (e) {
      console.error('Failed to load config from localStorage:', e)
    }
    return defaultConfig
  })

  // Persist config changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch (e) {
      console.error('Failed to save config to localStorage:', e)
    }
  }, [config])

  // Add a station
  const addStation = useCallback((station) => {
    setConfig((prev) => ({
      ...prev,
      stations: [
        ...prev.stations,
        {
          id: station.id,
          name: station.name,
          type: station.type || 'tfl',
          crs: station.crs || null, // CRS code for National Rail
          minMinutes: station.minMinutes || 0, // Minimum minutes to departure
          maxMinutes: station.maxMinutes || 60, // Maximum minutes to departure
          destinationFilter: station.destinationFilter || '', // Legacy: filter by destination name
          destinations: station.destinations || [], // Array of destination stations to filter by
        },
      ],
    }))
  }, [])

  // Update a station
  const updateStation = useCallback((stationId, updates) => {
    setConfig((prev) => ({
      ...prev,
      stations: prev.stations.map((s) => (s.id === stationId ? { ...s, ...updates } : s)),
    }))
  }, [])

  // Remove a station
  const removeStation = useCallback((stationId) => {
    setConfig((prev) => ({
      ...prev,
      stations: prev.stations.filter((s) => s.id !== stationId),
    }))
  }, [])

  // Reorder stations
  const reorderStations = useCallback((fromIndex, toIndex) => {
    setConfig((prev) => {
      const stations = [...prev.stations]
      const [removed] = stations.splice(fromIndex, 1)
      stations.splice(toIndex, 0, removed)
      return { ...prev, stations }
    })
  }, [])

  // Update general settings
  const updateSettings = useCallback((updates) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }, [])

  return {
    config,
    addStation,
    updateStation,
    removeStation,
    reorderStations,
    updateSettings,
  }
}
