import { describe, it, expect } from 'vitest'
import { migrateStation } from '../hooks/useConfig'

describe('migrateStation', () => {
  it('returns station unchanged if destinations array exists', () => {
    const station = {
      id: 'test-1',
      name: 'Test Station',
      destinations: [{ id: 'dest-1', name: 'Victoria', crs: 'VIC' }],
      destinationFilter: 'ignored', // Should be ignored since destinations exists
    }
    const result = migrateStation(station)
    expect(result.destinations).toEqual(station.destinations)
  })

  it('migrates destinationFilter string to destinations array', () => {
    const station = {
      id: 'test-1',
      name: 'Test Station',
      destinationFilter: 'Victoria',
    }
    const result = migrateStation(station)
    expect(result.destinations).toHaveLength(1)
    expect(result.destinations[0].name).toBe('Victoria')
    expect(result.destinations[0].crs).toBeNull()
    expect(result.destinations[0].id).toBe('text-Victoria')
  })

  it('trims whitespace from destinationFilter', () => {
    const station = {
      id: 'test-1',
      name: 'Test Station',
      destinationFilter: '  Victoria  ',
    }
    const result = migrateStation(station)
    expect(result.destinations[0].name).toBe('Victoria')
  })

  it('sets empty destinations array for empty destinationFilter', () => {
    const station = {
      id: 'test-1',
      name: 'Test Station',
      destinationFilter: '',
    }
    const result = migrateStation(station)
    expect(result.destinations).toEqual([])
  })

  it('sets empty destinations array for whitespace-only destinationFilter', () => {
    const station = {
      id: 'test-1',
      name: 'Test Station',
      destinationFilter: '   ',
    }
    const result = migrateStation(station)
    expect(result.destinations).toEqual([])
  })

  it('sets empty destinations array when no destinationFilter exists', () => {
    const station = {
      id: 'test-1',
      name: 'Test Station',
    }
    const result = migrateStation(station)
    expect(result.destinations).toEqual([])
  })

  it('preserves all other station properties', () => {
    const station = {
      id: 'test-1',
      name: 'Test Station',
      type: 'national-rail',
      crs: 'VIC',
      minMinutes: 5,
      maxMinutes: 30,
      schedule: { enabled: true },
      destinationFilter: 'Brighton',
    }
    const result = migrateStation(station)
    expect(result.id).toBe('test-1')
    expect(result.name).toBe('Test Station')
    expect(result.type).toBe('national-rail')
    expect(result.crs).toBe('VIC')
    expect(result.minMinutes).toBe(5)
    expect(result.maxMinutes).toBe(30)
    expect(result.schedule).toEqual({ enabled: true })
  })

  it('does not mutate the original station object', () => {
    const station = {
      id: 'test-1',
      name: 'Test Station',
      destinationFilter: 'Victoria',
    }
    const result = migrateStation(station)
    expect(station.destinations).toBeUndefined()
    expect(result).not.toBe(station)
  })

  it('handles null destinationFilter', () => {
    const station = {
      id: 'test-1',
      name: 'Test Station',
      destinationFilter: null,
    }
    const result = migrateStation(station)
    expect(result.destinations).toEqual([])
  })

  it('handles undefined destinationFilter', () => {
    const station = {
      id: 'test-1',
      name: 'Test Station',
      destinationFilter: undefined,
    }
    const result = migrateStation(station)
    expect(result.destinations).toEqual([])
  })
})
