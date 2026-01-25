import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  timeToSeconds,
  filterArrivals,
  extractCallingPoints,
  findRailChildStops,
  formatMinutes,
} from '../utils/api'
import type { Arrival, TflStopPoint, NationalRailService } from '../types'

describe('timeToSeconds', () => {
  beforeEach(() => {
    // Mock current time to 10:00:00
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns Infinity for null/undefined input', () => {
    expect(timeToSeconds(null)).toBe(Infinity)
    expect(timeToSeconds(undefined)).toBe(Infinity)
    expect(timeToSeconds('')).toBe(Infinity)
  })

  it('calculates seconds for a future time today', () => {
    // 10:30 is 30 minutes (1800 seconds) from 10:00
    expect(timeToSeconds('10:30')).toBe(1800)
  })

  it('calculates seconds for a time later today', () => {
    // 12:00 is 2 hours (7200 seconds) from 10:00
    expect(timeToSeconds('12:00')).toBe(7200)
  })

  it('handles time exactly now as due (0 seconds)', () => {
    // 10:00 when current time is 10:00:00 means the train is due now
    const result = timeToSeconds('10:00')
    expect(result).toBe(0)
  })

  it('handles past time as tomorrow', () => {
    // 09:00 is in the past, so should be tomorrow
    // Tomorrow at 09:00 is 23 hours from now (82800 seconds)
    expect(timeToSeconds('09:00')).toBe(82800)
  })

  it('handles midnight correctly', () => {
    // 00:00 is 14 hours from 10:00 (50400 seconds)
    expect(timeToSeconds('00:00')).toBe(50400)
  })

  it('handles times near midnight', () => {
    // 23:59 is 13 hours 59 minutes from 10:00 (50340 seconds)
    expect(timeToSeconds('23:59')).toBe(50340)
  })
})

describe('formatMinutes', () => {
  it('returns "Due" for zero seconds', () => {
    expect(formatMinutes(0)).toBe('Due')
  })

  it('returns "Due" for negative seconds', () => {
    expect(formatMinutes(-30)).toBe('Due')
    expect(formatMinutes(-60)).toBe('Due')
  })

  it('returns "Due" for less than a minute', () => {
    expect(formatMinutes(30)).toBe('Due')
    expect(formatMinutes(59)).toBe('Due')
  })

  it('formats whole minutes correctly', () => {
    expect(formatMinutes(60)).toBe('1 min')
    expect(formatMinutes(120)).toBe('2 min')
    expect(formatMinutes(600)).toBe('10 min')
  })

  it('floors partial minutes', () => {
    expect(formatMinutes(90)).toBe('1 min')
    expect(formatMinutes(119)).toBe('1 min')
    expect(formatMinutes(150)).toBe('2 min')
  })
})

describe('extractCallingPoints', () => {
  it('returns empty array for service with no calling points', () => {
    expect(extractCallingPoints({} as NationalRailService)).toEqual([])
    expect(extractCallingPoints({ subsequentCallingPoints: undefined } as unknown as NationalRailService)).toEqual([])
    expect(extractCallingPoints({ subsequentCallingPoints: [] } as unknown as NationalRailService)).toEqual([])
  })

  it('extracts calling points from a single group', () => {
    const service: NationalRailService = {
      serviceID: '1',
      std: '10:00',
      etd: 'On time',
      subsequentCallingPoints: [
        {
          callingPoint: [
            { locationName: 'Station A' },
            { locationName: 'Station B' },
            { locationName: 'Station C' },
          ],
        },
      ],
    }
    expect(extractCallingPoints(service)).toEqual(['Station A', 'Station B', 'Station C'])
  })

  it('extracts calling points from multiple groups', () => {
    const service: NationalRailService = {
      serviceID: '1',
      std: '10:00',
      etd: 'On time',
      subsequentCallingPoints: [
        {
          callingPoint: [{ locationName: 'Station A' }, { locationName: 'Station B' }],
        },
        {
          callingPoint: [{ locationName: 'Station C' }, { locationName: 'Station D' }],
        },
      ],
    }
    expect(extractCallingPoints(service)).toEqual([
      'Station A',
      'Station B',
      'Station C',
      'Station D',
    ])
  })

  it('filters out empty location names', () => {
    const service: NationalRailService = {
      serviceID: '1',
      std: '10:00',
      etd: 'On time',
      subsequentCallingPoints: [
        {
          callingPoint: [{ locationName: 'Station A' }, { locationName: '' }, { locationName: undefined }],
        },
      ],
    }
    expect(extractCallingPoints(service)).toEqual(['Station A'])
  })

  it('handles missing callingPoint array in group', () => {
    const service: NationalRailService = {
      serviceID: '1',
      std: '10:00',
      etd: 'On time',
      subsequentCallingPoints: [{ callingPoint: undefined }, { callingPoint: [{ locationName: 'Station A' }] }],
    }
    expect(extractCallingPoints(service)).toEqual(['Station A'])
  })
})

describe('findRailChildStops', () => {
  it('returns empty array for null/undefined input', () => {
    expect(findRailChildStops(null)).toEqual([])
    expect(findRailChildStops(undefined)).toEqual([])
  })

  it('returns empty array for station with no children', () => {
    const station: TflStopPoint = {
      naptanId: 'HUB123',
      stopType: 'TransportInterchange',
      modes: ['tube'],
    }
    expect(findRailChildStops(station)).toEqual([])
  })

  it('finds rail child stops with TfL modes', () => {
    const station: TflStopPoint = {
      naptanId: 'HUB123',
      stopType: 'TransportInterchange',
      modes: ['tube'],
      children: [
        { naptanId: 'CHILD1', stopType: 'NaptanMetroStation', modes: ['tube'] },
        { naptanId: 'CHILD2', stopType: 'NaptanMetroStation', modes: ['dlr'] },
      ],
    }
    const result = findRailChildStops(station)
    expect(result).toContain('CHILD1')
    expect(result).toContain('CHILD2')
    expect(result).toHaveLength(2)
  })

  it('excludes TransportInterchange stops', () => {
    const station: TflStopPoint = {
      naptanId: 'HUB123',
      stopType: 'TransportInterchange',
      modes: ['tube'],
      children: [
        { naptanId: 'CHILD1', stopType: 'TransportInterchange', modes: ['tube'] },
        { naptanId: 'CHILD2', stopType: 'NaptanMetroStation', modes: ['tube'] },
      ],
    }
    const result = findRailChildStops(station)
    expect(result).not.toContain('CHILD1')
    expect(result).toContain('CHILD2')
  })

  it('excludes non-rail modes', () => {
    const station: TflStopPoint = {
      naptanId: 'HUB123',
      stopType: 'TransportInterchange',
      modes: ['bus', 'tube'],
      children: [
        { naptanId: 'CHILD1', stopType: 'NaptanOnStreetBusCoachStopPair', modes: ['bus'] },
        { naptanId: 'CHILD2', stopType: 'NaptanMetroStation', modes: ['tube'] },
      ],
    }
    const result = findRailChildStops(station)
    expect(result).not.toContain('CHILD1')
    expect(result).toContain('CHILD2')
  })

  it('finds nested children recursively', () => {
    const station: TflStopPoint = {
      naptanId: 'HUB123',
      stopType: 'TransportInterchange',
      modes: ['tube'],
      children: [
        {
          naptanId: 'LEVEL1',
          stopType: 'TransportInterchange',
          modes: ['tube'],
          children: [
            { naptanId: 'LEVEL2', stopType: 'NaptanMetroStation', modes: ['tube'] },
          ],
        },
      ],
    }
    const result = findRailChildStops(station)
    expect(result).toContain('LEVEL2')
  })

  it('deduplicates child IDs', () => {
    const station: TflStopPoint = {
      naptanId: 'HUB123',
      stopType: 'TransportInterchange',
      modes: ['tube'],
      children: [
        { naptanId: 'CHILD1', stopType: 'NaptanMetroStation', modes: ['tube'] },
        {
          naptanId: 'LEVEL1',
          stopType: 'TransportInterchange',
          modes: ['tube'],
          children: [{ naptanId: 'CHILD1', stopType: 'NaptanMetroStation', modes: ['tube'] }],
        },
      ],
    }
    const result = findRailChildStops(station)
    expect(result.filter((id) => id === 'CHILD1')).toHaveLength(1)
  })
})

describe('filterArrivals', () => {
  const now = Date.now()

  const createArrival = (overrides: Partial<Arrival> = {}): Arrival => ({
    id: 'test-1',
    expectedDeparture: now + 5 * 60 * 1000, // 5 minutes from now
    destinationName: 'Test Station',
    callingPoints: [],
    lineName: 'Test Line',
    lineId: 'test',
    modeName: 'tube',
    status: null,
    source: 'tfl',
    ...overrides,
  })

  it('returns empty array for empty input', () => {
    expect(filterArrivals([], {})).toEqual([])
  })

  it('calculates timeToStation for each arrival', () => {
    const arrivals = [createArrival({ expectedDeparture: now + 300 * 1000 })]
    const result = filterArrivals(arrivals, {})
    expect(result[0]?.timeToStation).toBeCloseTo(300, -1)
  })

  it('filters out departed trains (negative timeToStation)', () => {
    const arrivals = [
      createArrival({ id: 'past', expectedDeparture: now - 60 * 1000 }),
      createArrival({ id: 'future', expectedDeparture: now + 60 * 1000 }),
    ]
    const result = filterArrivals(arrivals, {})
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('future')
  })

  it('filters by minMinutes', () => {
    const arrivals = [
      createArrival({ id: 'too-soon', expectedDeparture: now + 2 * 60 * 1000 }), // 2 min
      createArrival({ id: 'ok', expectedDeparture: now + 10 * 60 * 1000 }), // 10 min
    ]
    const result = filterArrivals(arrivals, { minMinutes: 5 })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('ok')
  })

  it('filters by maxMinutes', () => {
    const arrivals = [
      createArrival({ id: 'ok', expectedDeparture: now + 30 * 60 * 1000 }), // 30 min
      createArrival({ id: 'too-far', expectedDeparture: now + 90 * 60 * 1000 }), // 90 min
    ]
    const result = filterArrivals(arrivals, { maxMinutes: 60 })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('ok')
  })

  it('applies both min and max filters', () => {
    const arrivals = [
      createArrival({ id: 'too-soon', expectedDeparture: now + 2 * 60 * 1000 }),
      createArrival({ id: 'ok', expectedDeparture: now + 15 * 60 * 1000 }),
      createArrival({ id: 'too-far', expectedDeparture: now + 45 * 60 * 1000 }),
    ]
    const result = filterArrivals(arrivals, { minMinutes: 5, maxMinutes: 30 })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('ok')
  })

  describe('destination filtering with destinations array', () => {
    it('filters by destination name (case-insensitive)', () => {
      const arrivals = [
        createArrival({ id: 'match', destinationName: 'London Victoria' }),
        createArrival({ id: 'no-match', destinationName: 'Brighton' }),
      ]
      const result = filterArrivals(arrivals, {
        destinations: [{ id: '1', name: 'victoria', crs: null }],
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('match')
    })

    it('filters by CRS code', () => {
      const arrivals = [
        createArrival({ id: 'match', destinationName: 'London VIC' }),
        createArrival({ id: 'no-match', destinationName: 'Brighton' }),
      ]
      const result = filterArrivals(arrivals, {
        destinations: [{ id: '1', name: 'Victoria', crs: 'VIC' }],
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('match')
    })

    it('matches calling points for National Rail', () => {
      const arrivals = [
        createArrival({
          id: 'match',
          destinationName: 'Brighton',
          callingPoints: ['Gatwick Airport', 'Three Bridges', 'Haywards Heath'],
        }),
        createArrival({
          id: 'no-match',
          destinationName: 'Brighton',
          callingPoints: ['Croydon', 'Redhill'],
        }),
      ]
      const result = filterArrivals(arrivals, {
        destinations: [{ id: '1', name: 'Gatwick', crs: null }],
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('match')
    })

    it('uses OR logic for multiple destinations', () => {
      const arrivals = [
        createArrival({ id: 'victoria', destinationName: 'London Victoria' }),
        createArrival({ id: 'bridge', destinationName: 'London Bridge' }),
        createArrival({ id: 'other', destinationName: 'Brighton' }),
      ]
      const result = filterArrivals(arrivals, {
        destinations: [
          { id: '1', name: 'Victoria', crs: null },
          { id: '2', name: 'Bridge', crs: null },
        ],
      })
      expect(result).toHaveLength(2)
      expect(result.map((r) => r.id)).toContain('victoria')
      expect(result.map((r) => r.id)).toContain('bridge')
    })

    it('handles empty destinations array (no filtering)', () => {
      const arrivals = [createArrival({ destinationName: 'Any Station' })]
      const result = filterArrivals(arrivals, { destinations: [] })
      expect(result).toHaveLength(1)
    })
  })

  describe('legacy destination filtering with destinationFilter string', () => {
    it('filters by destination string (case-insensitive partial match)', () => {
      const arrivals = [
        createArrival({ id: 'match', destinationName: 'London Victoria' }),
        createArrival({ id: 'no-match', destinationName: 'Brighton' }),
      ]
      const result = filterArrivals(arrivals, { destinationFilter: 'victoria' })
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('match')
    })

    it('matches calling points with legacy filter', () => {
      const arrivals = [
        createArrival({
          id: 'match',
          destinationName: 'Brighton',
          callingPoints: ['Gatwick Airport'],
        }),
      ]
      const result = filterArrivals(arrivals, { destinationFilter: 'gatwick' })
      expect(result).toHaveLength(1)
    })

    it('ignores empty/whitespace destinationFilter', () => {
      const arrivals = [createArrival()]
      expect(filterArrivals(arrivals, { destinationFilter: '' })).toHaveLength(1)
      expect(filterArrivals(arrivals, { destinationFilter: '   ' })).toHaveLength(1)
    })

    it('destinations array takes precedence over destinationFilter', () => {
      const arrivals = [
        createArrival({ id: 'victoria', destinationName: 'London Victoria' }),
        createArrival({ id: 'bridge', destinationName: 'London Bridge' }),
      ]
      // destinations filters for Bridge, destinationFilter would match Victoria
      const result = filterArrivals(arrivals, {
        destinations: [{ id: '1', name: 'Bridge', crs: null }],
        destinationFilter: 'Victoria',
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('bridge')
    })
  })

  it('handles null/undefined callingPoints gracefully', () => {
    const arrivals = [
      createArrival({ destinationName: 'Test', callingPoints: undefined }),
    ]
    // Should not throw
    expect(() => filterArrivals(arrivals, { destinationFilter: 'test' })).not.toThrow()
  })
})
