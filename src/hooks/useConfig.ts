import { useState, useEffect, useCallback } from 'react'
import type { AppConfig, Station, Destination } from '../types'

const STORAGE_KEY = 'train-departures-config'

const defaultConfig: AppConfig = {
  stations: [],
  autoRefresh: false,
  refreshInterval: 60,
  showPlatform: true,
  theme: 'system',
}

interface LegacyStation {
  id: string
  name: string
  type?: 'tfl' | 'national-rail'
  crs?: string
  minMinutes?: number
  maxMinutes?: number
  destinationFilter?: string
  destinations?: Destination[]
  schedule?: Station['schedule']
  modes?: string[]
}

// Migrate station config from old format to new format
export function migrateStation(station: LegacyStation): Station {
  const migrated = { ...station } as LegacyStation & { destinations: Destination[] }

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

  // Ensure required fields have defaults
  const base = {
    id: migrated.id,
    name: migrated.name,
    minMinutes: migrated.minMinutes ?? 0,
    maxMinutes: migrated.maxMinutes ?? 60,
    destinations: migrated.destinations,
    destinationFilter: migrated.destinationFilter,
    schedule: migrated.schedule ?? null,
  }

  if (migrated.type === 'national-rail') {
    return {
      ...base,
      type: 'national-rail',
      crs: migrated.crs!,
      modes: migrated.modes,
    }
  }

  return {
    ...base,
    type: 'tfl',
    modes: migrated.modes as Station['modes'],
  }
}

interface UseConfigReturn {
  config: AppConfig
  addStation: (station: LegacyStation) => void
  updateStation: (stationId: string, updates: Partial<Station>) => void
  removeStation: (stationId: string) => void
  reorderStations: (fromIndex: number, toIndex: number) => void
  updateSettings: (updates: Partial<AppConfig>) => void
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppConfig> & { stations?: LegacyStation[] }
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
  const addStation = useCallback((station: LegacyStation) => {
    setConfig((prev) => {
      const newStation: Station = station.type === 'national-rail'
        ? {
            id: station.id,
            name: station.name,
            type: 'national-rail',
            crs: station.crs!,
            minMinutes: station.minMinutes || 0,
            maxMinutes: station.maxMinutes || 60,
            destinationFilter: station.destinationFilter || '',
            destinations: station.destinations || [],
            schedule: null,
          }
        : {
            id: station.id,
            name: station.name,
            type: 'tfl',
            minMinutes: station.minMinutes || 0,
            maxMinutes: station.maxMinutes || 60,
            destinationFilter: station.destinationFilter || '',
            destinations: station.destinations || [],
            schedule: null,
          }

      return {
        ...prev,
        stations: [...prev.stations, newStation],
      }
    })
  }, [])

  // Update a station
  const updateStation = useCallback((stationId: string, updates: Partial<Station>) => {
    setConfig((prev) => ({
      ...prev,
      stations: prev.stations.map((s) => (s.id === stationId ? { ...s, ...updates } : s)),
    }))
  }, [])

  // Remove a station
  const removeStation = useCallback((stationId: string) => {
    setConfig((prev) => ({
      ...prev,
      stations: prev.stations.filter((s) => s.id !== stationId),
    }))
  }, [])

  // Reorder stations
  const reorderStations = useCallback((fromIndex: number, toIndex: number) => {
    setConfig((prev) => {
      const stations = [...prev.stations]
      const [removed] = stations.splice(fromIndex, 1)
      if (removed) {
        stations.splice(toIndex, 0, removed)
      }
      return { ...prev, stations }
    })
  }, [])

  // Update general settings
  const updateSettings = useCallback((updates: Partial<AppConfig>) => {
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
