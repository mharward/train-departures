import { describe, it, expect } from 'vitest'
import {
  getCallingPoints,
  buildRoutes,
  type RouteStop,
  type ParsedRouteData,
  type RawBranch,
  type RawStopPoint,
} from '../utils/api/tflRoutes'

function makeRouteData(routes: RouteStop[][]): ParsedRouteData {
  const nameMap = new Map<string, string>()
  for (const route of routes) {
    for (const stop of route) {
      nameMap.set(stop.stationId, stop.name)
      if (stop.parentId !== stop.stationId) {
        nameMap.set(stop.parentId, stop.name)
      }
    }
  }
  return { routes, nameMap }
}

function stop(stationId: string, name: string, parentId?: string): RouteStop {
  return { stationId, parentId: parentId || stationId, name }
}

function sp(stationId: string, name: string): RawStopPoint {
  return { stationId, name }
}

function branch(
  branchId: number,
  stopPoints: RawStopPoint[],
  opts: { next?: number[]; prev?: number[]; serviceType?: string } = {}
): RawBranch {
  return {
    branchId,
    stopPoint: stopPoints,
    nextBranchIds: opts.next || [],
    prevBranchIds: opts.prev || [],
    serviceType: opts.serviceType || 'Regular',
  }
}

describe('buildRoutes', () => {
  it('builds a single linear route', () => {
    const branches = [branch(1, [sp('A', 'Station A'), sp('B', 'Station B'), sp('C', 'Station C')])]
    const routes = buildRoutes(branches)
    expect(routes).toHaveLength(1)
    expect(routes[0].map((s) => s.stationId)).toEqual(['A', 'B', 'C'])
  })

  it('chains two branches with boundary deduplication', () => {
    const branches = [
      branch(1, [sp('A', 'A'), sp('B', 'B')], { next: [2] }),
      branch(2, [sp('B', 'B'), sp('C', 'C')], { prev: [1] }),
    ]
    const routes = buildRoutes(branches)
    expect(routes).toHaveLength(1)
    expect(routes[0].map((s) => s.stationId)).toEqual(['A', 'B', 'C'])
  })

  it('builds multiple routes for branching lines', () => {
    const branches = [
      branch(1, [sp('A', 'A'), sp('B', 'B')], { next: [2, 3] }),
      branch(2, [sp('B', 'B'), sp('C', 'C')], { prev: [1] }),
      branch(3, [sp('B', 'B'), sp('D', 'D')], { prev: [1] }),
    ]
    const routes = buildRoutes(branches)
    expect(routes).toHaveLength(2)
    const ids = routes.map((r) => r.map((s) => s.stationId))
    expect(ids).toContainEqual(['A', 'B', 'C'])
    expect(ids).toContainEqual(['A', 'B', 'D'])
  })

  it('handles Circle line self-loop (branch points to itself)', () => {
    // Circle line outbound: branch 2 (tail) → branch 3 (loop, self-referencing)
    const branches = [
      branch(2, [sp('H', 'Hammersmith'), sp('E', 'Edgware Road')], { next: [3] }),
      branch(3, [sp('E', 'Edgware Road'), sp('B', 'Baker St'), sp('K', 'Kings Cross'), sp('E', 'Edgware Road')], {
        next: [3],
        prev: [2, 3],
      }),
    ]
    const routes = buildRoutes(branches)
    expect(routes).toHaveLength(1)
    const ids = routes[0].map((s) => s.stationId)
    expect(ids).toEqual(['H', 'E', 'B', 'K', 'E'])
    expect(ids[0]).toBe('H') // starts at Hammersmith
  })

  it('handles pure self-loop (Circle line inbound has only a looping branch)', () => {
    // Circle line inbound: single branch that references itself
    const branches = [
      branch(1, [sp('E', 'Edgware Road'), sp('V', 'Victoria'), sp('B', 'Baker St'), sp('E', 'Edgware Road')], {
        next: [1, 0],
        prev: [1],
      }),
    ]
    const routes = buildRoutes(branches)
    expect(routes).toHaveLength(1)
    expect(routes[0].map((s) => s.stationId)).toEqual(['E', 'V', 'B', 'E'])
  })

  it('includes branches with missing serviceType', () => {
    const branches = [
      branch(1, [sp('A', 'A'), sp('B', 'B')], { serviceType: undefined as unknown as string }),
    ]
    const routes = buildRoutes(branches)
    expect(routes).toHaveLength(1)
  })

  it('excludes branches with non-Regular serviceType', () => {
    const branches = [
      branch(1, [sp('A', 'A'), sp('B', 'B')], { serviceType: 'Night' }),
    ]
    const routes = buildRoutes(branches)
    expect(routes).toHaveLength(0)
  })
})

describe('getCallingPoints', () => {
  const tubeRoute = makeRouteData([
    [
      stop('940GZZLUOXC', 'Oxford Circus'),
      stop('940GZZLUBND', 'Bond Street'),
      stop('940GZZLUMBA', 'Marble Arch'),
      stop('940GZZLULCA', 'Lancaster Gate'),
      stop('940GZZLUQWY', 'Queensway'),
      stop('940GZZLUNHG', 'Notting Hill Gate'),
    ],
  ])

  it('returns calling points between current station and destination', () => {
    const result = getCallingPoints('940GZZLUOXC', '940GZZLUNHG', tubeRoute)
    expect(result).toEqual([
      'Bond Street',
      'Marble Arch',
      'Lancaster Gate',
      'Queensway',
      'Notting Hill Gate',
    ])
  })

  it('returns single stop for adjacent stations', () => {
    const result = getCallingPoints('940GZZLUOXC', '940GZZLUBND', tubeRoute)
    expect(result).toEqual(['Bond Street'])
  })

  it('returns undefined when current station is not in route', () => {
    expect(getCallingPoints('940GZZLU_UNKNOWN', '940GZZLUNHG', tubeRoute)).toBeUndefined()
  })

  it('returns undefined when destination is not in route', () => {
    expect(getCallingPoints('940GZZLUOXC', '940GZZLU_UNKNOWN', tubeRoute)).toBeUndefined()
  })

  it('returns undefined when destination comes before current station', () => {
    expect(getCallingPoints('940GZZLUNHG', '940GZZLUOXC', tubeRoute)).toBeUndefined()
  })

  it('returns undefined for empty inputs', () => {
    expect(getCallingPoints('', '940GZZLUNHG', tubeRoute)).toBeUndefined()
    expect(getCallingPoints('940GZZLUOXC', '', tubeRoute)).toBeUndefined()
  })

  it('picks the route variant containing both stations', () => {
    const branchingRoute = makeRouteData([
      [stop('940GZZLUOXC', 'Oxford Circus'), stop('940GZZLUEAC', 'East Acton')],
      [
        stop('940GZZLUOXC', 'Oxford Circus'),
        stop('940GZZLUBND', 'Bond Street'),
        stop('940GZZLUMBA', 'Marble Arch'),
        stop('940GZZLUNHG', 'Notting Hill Gate'),
      ],
    ])

    const result = getCallingPoints('940GZZLUOXC', '940GZZLUNHG', branchingRoute)
    expect(result).toEqual(['Bond Street', 'Marble Arch', 'Notting Hill Gate'])
  })

  describe('hub station matching', () => {
    const elizRoute = makeRouteData([
      [
        stop('910GPADTLL', 'Paddington', 'HUBPAD'),
        stop('910GACTONML', 'Acton Main Line'),
        stop('910GHAYESAH', 'Hayes & Harlington'),
        stop('910GHTRWAPT', 'Heathrow Airport'),
        stop('910GHTRWTM4', 'Heathrow Terminal 4', 'HUBHX4'),
      ],
    ])

    it('matches origin by hub parentId when direct ID fails', () => {
      const result = getCallingPoints('HUBPAD', '910GHTRWTM4', elizRoute)
      expect(result).toEqual([
        'Acton Main Line',
        'Hayes & Harlington',
        'Heathrow Airport',
        'Heathrow Terminal 4',
      ])
    })

    it('matches destination by hub parentId', () => {
      const result = getCallingPoints('910GACTONML', 'HUBHX4', elizRoute)
      expect(result).toEqual(['Hayes & Harlington', 'Heathrow Airport', 'Heathrow Terminal 4'])
    })

    it('matches both origin and destination by hub parentId', () => {
      const result = getCallingPoints('HUBPAD', 'HUBHX4', elizRoute)
      expect(result).toEqual([
        'Acton Main Line',
        'Hayes & Harlington',
        'Heathrow Airport',
        'Heathrow Terminal 4',
      ])
    })

    it('direct stationId match still works for non-hub stops', () => {
      const result = getCallingPoints('910GACTONML', '910GHTRWAPT', elizRoute)
      expect(result).toEqual(['Hayes & Harlington', 'Heathrow Airport'])
    })
  })

  describe('circular route (Circle line)', () => {
    // Simplified Circle line: tail + loop
    const circleRoute = makeRouteData([
      [
        stop('H', 'Hammersmith'),
        stop('E', 'Edgware Road'),
        stop('B', 'Baker Street'),
        stop('K', 'Kings Cross'),
        stop('L', 'Liverpool Street'),
        stop('W', 'Westminster'),
        stop('V', 'Victoria'),
        stop('S', 'South Kensington'),
        stop('E', 'Edgware Road'), // circle closes
      ],
    ])

    it('finds calling points within the circular section', () => {
      const result = getCallingPoints('B', 'L', circleRoute)
      expect(result).toEqual(['Kings Cross', 'Liverpool Street'])
    })

    it('finds calling points spanning tail into circle', () => {
      const result = getCallingPoints('H', 'K', circleRoute)
      expect(result).toEqual(['Edgware Road', 'Baker Street', 'Kings Cross'])
    })

    it('finds destination at second occurrence of duplicated station', () => {
      // Baker Street to Edgware Road: Edgware Road appears at index 1 (before Baker St)
      // AND at the end of the loop (index 8). Must find the second occurrence.
      const result = getCallingPoints('B', 'E', circleRoute)
      expect(result).toEqual([
        'Kings Cross',
        'Liverpool Street',
        'Westminster',
        'Victoria',
        'South Kensington',
        'Edgware Road',
      ])
    })

    it('finds calling points from first Edgware Road into the loop', () => {
      // From Edgware Road (first occurrence) to Victoria — goes through the circle
      const result = getCallingPoints('E', 'V', circleRoute)
      expect(result).toEqual([
        'Baker Street',
        'Kings Cross',
        'Liverpool Street',
        'Westminster',
        'Victoria',
      ])
    })

    it('returns undefined for reverse direction on circle', () => {
      // Baker Street to Hammersmith is backwards on this outbound route
      expect(getCallingPoints('B', 'H', circleRoute)).toBeUndefined()
    })
  })

  it('returns undefined when routeData has no routes', () => {
    const emptyData = makeRouteData([])
    expect(getCallingPoints('A', 'B', emptyData)).toBeUndefined()
  })
})
