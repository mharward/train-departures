/**
 * TfL Route Sequence data for computing calling points on Tube/DLR/Overground/Elizabeth Line.
 *
 * The Route Sequence endpoint returns stopPointSequences — a directed graph of branches,
 * each with ordered stops plus nextBranchIds/prevBranchIds. We chain branches into complete
 * routes (one per terminal branch) and match arrivals to the correct route variant.
 *
 * Hub stations (e.g. Paddington) have different NaPTAN IDs in arrivals vs route sequences.
 * Route stops expose `topMostParentId` (the hub ID), so we fall back to hub-based matching
 * when direct ID matching fails.
 */

import { fetchWithRetry } from './retry'
import { withCache } from './cache'

const TFL_BASE_URL = '/api/tfl'
const ROUTE_CACHE_TTL = 60 * 60 * 1000 // 1 hour — route data is static infrastructure

const STATION_SUFFIXES = [' Underground Station', ' DLR Station', ' Rail Station', ' Station']

// -- Types matching TfL Route Sequence API response --

export interface RawStopPoint {
  stationId: string
  topMostParentId?: string
  name: string
}

export interface RawBranch {
  branchId: number
  nextBranchIds: number[]
  prevBranchIds: number[]
  stopPoint: RawStopPoint[]
  serviceType: string
}

// -- Processed types --

export interface RouteStop {
  stationId: string
  parentId: string // topMostParentId, or stationId if none
  name: string
}

export interface ParsedRouteData {
  routes: RouteStop[][] // complete root→leaf paths
  nameMap: Map<string, string> // stationId → clean name
}

function cleanStationName(name: string): string {
  let cleaned = name
  for (const suffix of STATION_SUFFIXES) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.slice(0, -suffix.length)
      break
    }
  }
  return cleaned
}

/**
 * Build complete routes by traversing the branch DAG from roots to leaves.
 * Each branch's stops overlap with the next (last stop = first stop of successor),
 * so we deduplicate at boundaries.
 */
export function buildRoutes(branches: RawBranch[]): RouteStop[][] {
  // Accept branches with serviceType "Regular" or missing/unset (some Circle line
  // branches omit it). Exclude known non-regular types like "Night".
  const usableBranches = branches.filter(
    (b) => !b.serviceType || b.serviceType === 'Regular'
  )
  const branchMap = new Map<number, RawBranch>()
  for (const b of usableBranches) {
    branchMap.set(b.branchId, b)
  }

  // Roots: branches not referenced as a successor by any other branch
  const allNextIds = new Set<number>()
  for (const b of usableBranches) {
    for (const id of b.nextBranchIds) {
      if (id !== b.branchId) allNextIds.add(id) // ignore self-loops
    }
  }
  const roots = usableBranches.filter((b) => !allNextIds.has(b.branchId))

  // Fallback: if no roots found (pure self-loop like Circle line inbound),
  // use branches whose only prev references are themselves
  if (roots.length === 0) {
    const selfOnlyPrev = usableBranches.filter((b) =>
      b.prevBranchIds.every((id) => id === b.branchId)
    )
    roots.push(...selfOnlyPrev)
  }

  const routes: RouteStop[][] = []

  function toRouteStop(sp: RawStopPoint): RouteStop {
    return {
      stationId: sp.stationId,
      parentId: sp.topMostParentId || sp.stationId,
      name: cleanStationName(sp.name),
    }
  }

  function dfs(branchId: number, path: RouteStop[], visited: Set<number>): void {
    if (visited.has(branchId)) return
    const branch = branchMap.get(branchId)
    if (!branch || branch.stopPoint.length === 0) return

    visited.add(branchId)

    const stops = branch.stopPoint.map(toRouteStop)

    // Skip first stop if it duplicates the last in the current path
    const startIdx =
      path.length > 0 && stops.length > 0 && path[path.length - 1].stationId === stops[0].stationId
        ? 1
        : 0
    const newPath = [...path, ...stops.slice(startIdx)]

    // Exclude already-visited branches (handles self-loops like Circle line)
    const validNextIds = branch.nextBranchIds.filter(
      (id) => branchMap.has(id) && !visited.has(id)
    )

    if (validNextIds.length === 0) {
      routes.push(newPath)
    } else {
      for (const nextId of validNextIds) {
        dfs(nextId, newPath, new Set(visited))
      }
    }
  }

  for (const root of roots) {
    dfs(root.branchId, [], new Set())
  }

  return routes
}

/**
 * Test whether a route stop matches a NaPTAN ID (direct or hub-based).
 */
function stopMatches(stop: RouteStop, naptanId: string): boolean {
  return stop.stationId === naptanId || stop.parentId === naptanId
}

/**
 * Find a station's index in a route, trying direct stationId then hub-based (parentId) match.
 * Searches from `startFrom` index (default 0) to support finding later occurrences of
 * duplicated stations (e.g. Edgware Road appears twice on the Circle line).
 */
function findStopIndex(route: RouteStop[], naptanId: string, startFrom = 0): number {
  for (let i = startFrom; i < route.length; i++) {
    if (stopMatches(route[i], naptanId)) return i
  }
  return -1
}

/**
 * Fetch and parse route sequence for a line+direction, cached for 1 hour.
 */
export async function fetchRouteSequence(
  lineId: string,
  direction: string
): Promise<ParsedRouteData | null> {
  const cacheKey = `tfl-route-${lineId}-${direction}`

  return withCache(
    cacheKey,
    async () => {
      try {
        const url = `${TFL_BASE_URL}/Line/${lineId}/Route/Sequence/${direction}`
        const response = await fetchWithRetry(url)

        if (!response.ok) {
          console.warn(`Failed to fetch route sequence for ${lineId}/${direction}: ${response.status}`)
          return null
        }

        const data = await response.json()
        const branches: RawBranch[] = data.stopPointSequences || []
        const routes = buildRoutes(branches)

        // Build name map from route stops (more accurate than top-level stations)
        const nameMap = new Map<string, string>()
        for (const route of routes) {
          for (const stop of route) {
            if (!nameMap.has(stop.stationId)) {
              nameMap.set(stop.stationId, stop.name)
            }
            // Also map parentId to the same name for hub stations
            if (stop.parentId !== stop.stationId && !nameMap.has(stop.parentId)) {
              nameMap.set(stop.parentId, stop.name)
            }
          }
        }

        return { routes, nameMap }
      } catch (e) {
        console.warn(`Error fetching route sequence for ${lineId}/${direction}:`, e)
        return null
      }
    },
    ROUTE_CACHE_TTL
  )
}

/**
 * Compute calling points between a station and destination using route data.
 * Returns station names between current (exclusive) and destination (inclusive),
 * or undefined if the route can't be determined.
 *
 * `originId` is the configured station ID (may be a hub like "HUBPAD"), used as
 * fallback when the arrival's naptanId doesn't directly match route stop IDs.
 */
export function getCallingPoints(
  originId: string,
  destinationNaptanId: string,
  routeData: ParsedRouteData
): string[] | undefined {
  if (!originId || !destinationNaptanId) return undefined

  for (const route of routeData.routes) {
    const currentIdx = findStopIndex(route, originId)
    if (currentIdx === -1) continue

    // Search for destination AFTER origin — handles duplicated stations on circular
    // routes (e.g. Edgware Road appears at both start and end of Circle line loop)
    const destIdx = findStopIndex(route, destinationNaptanId, currentIdx + 1)
    if (destIdx === -1) continue

    const names = route.slice(currentIdx + 1, destIdx + 1).map((s) => s.name)
    if (names.length > 0) return names
  }

  return undefined
}
