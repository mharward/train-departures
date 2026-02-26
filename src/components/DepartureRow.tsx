import { useState } from 'react'
import { Group, Stack, Text, Badge, Box, Collapse } from '@mantine/core'
import { LineIndicator } from './LineIndicator'
import { formatMinutes, timeToSeconds } from '../utils/api'
import type { FilteredArrival, Destination, CallingPoint } from '../types'

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Get the display time for a calling point.
 * - et is a time like "10:45" → show that
 * - et is "On time" → show st
 * - et is "Delayed" → show st with delayed indicator
 * - No timing → undefined
 */
function getCallingPointTime(point: CallingPoint): { time: string; delayed: boolean } | undefined {
  if (!point.st && !point.et) return undefined

  if (point.et && /^\d{2}:\d{2}$/.test(point.et)) {
    return { time: point.et, delayed: false }
  }

  if (point.et === 'On time' && point.st) {
    return { time: point.st, delayed: false }
  }

  if (point.et === 'Delayed' && point.st) {
    return { time: point.st, delayed: true }
  }

  if (point.st) {
    return { time: point.st, delayed: false }
  }

  return undefined
}

type RouteDisplayItem =
  | { type: 'stop'; point: CallingPoint; isFirst: boolean; isLast: boolean; isMatch: boolean }
  | { type: 'collapsed'; count: number; points: CallingPoint[]; index: number }

/**
 * Build the route display, collapsing runs of 3+ uninteresting intermediate stops.
 * "Interesting" = first stop (index 0), last stop, or destination-filter-matched stop.
 */
export function buildRouteDisplay(
  callingPoints: CallingPoint[],
  destinations: Destination[]
): RouteDisplayItem[] {
  const isInteresting = (point: CallingPoint, index: number): boolean => {
    if (index === 0) return true
    if (index === callingPoints.length - 1) return true
    if (destinations.length === 0) return false

    const pointLower = point.name.toLowerCase()
    return destinations.some((dest) => {
      const destName = dest.name.toLowerCase()
      const destCrs = dest.crs?.toLowerCase()
      return pointLower.includes(destName) || (destCrs && pointLower.includes(destCrs))
    })
  }

  const items: RouteDisplayItem[] = []
  let i = 0

  while (i < callingPoints.length) {
    const point = callingPoints[i]
    const isLast = i === callingPoints.length - 1
    const interesting = isInteresting(point, i)

    if (interesting) {
      items.push({
        type: 'stop',
        point,
        isFirst: i === 0,
        isLast,
        isMatch: !isLast && i !== 0 && interesting,
      })
      i++
    } else {
      // Collect consecutive uninteresting stops
      const runStart = i
      while (i < callingPoints.length && !isInteresting(callingPoints[i], i)) {
        i++
      }
      const runLength = i - runStart
      const runPoints = callingPoints.slice(runStart, i)

      if (runLength >= 3) {
        items.push({ type: 'collapsed', count: runLength, points: runPoints, index: runStart })
      } else {
        for (const p of runPoints) {
          items.push({ type: 'stop', point: p, isFirst: false, isLast: false, isMatch: false })
        }
      }
    }
  }

  return items
}

/**
 * Find the calling point that matched the destination filter (not the final destination).
 * Returns the calling point name if the match was via an intermediate stop, null otherwise.
 */
function findViaMatch(
  departure: FilteredArrival,
  destinations: Destination[]
): string | null {
  if (!destinations.length) return null

  const finalDest = (departure.destinationName || '').toLowerCase()
  const callingPoints = departure.callingPoints || []

  for (const dest of destinations) {
    const destName = dest.name.toLowerCase()
    const destCrs = dest.crs?.toLowerCase()

    // If the final destination matches, no "via" needed
    if (finalDest.includes(destName) || (destCrs && finalDest.includes(destCrs))) {
      return null
    }

    // Check calling points for a match
    for (const point of callingPoints) {
      const pointLower = point.name.toLowerCase()
      if (pointLower.includes(destName) || (destCrs && pointLower.includes(destCrs))) {
        return point.name
      }
    }
  }

  return null
}

interface DepartureRowProps {
  departure: FilteredArrival
  showPlatform: boolean
  destinations?: Destination[]
  stationName?: string
  expanded?: boolean
  onToggle?: () => void
}

export function DepartureRow({ departure, showPlatform, destinations, stationName, expanded, onToggle }: DepartureRowProps) {
  const minutes = formatMinutes(departure.timeToStation)
  const isDue = minutes === 'Due'
  const viaStop = destinations?.length ? findViaMatch(departure, destinations) : null
  const hasCallingPoints = departure.callingPoints && departure.callingPoints.length > 0
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => new Set())

  const toggleGroup = (index: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const fullRoute = hasCallingPoints
    ? [
        ...(stationName
          ? [{ name: stationName, st: formatTime(departure.expectedDeparture), et: 'On time' }]
          : []),
        ...departure.callingPoints!,
      ]
    : []
  const routeItems = fullRoute.length > 0
    ? buildRouteDisplay(fullRoute, destinations || [])
    : []

  return (
    <Box>
      <Group
        gap="md"
        py="xs"
        px="md"
        wrap="nowrap"
        className="departure-row"
        onClick={onToggle}
        style={{
          borderBottom: 'light-dark(1px solid rgba(0, 0, 0, 0.1), 1px solid rgba(255, 255, 255, 0.06))',
          backgroundColor: isDue ? 'rgba(34, 197, 94, 0.08)' : undefined,
          borderLeft: isDue ? '3px solid rgba(34, 197, 94, 0.6)' : '3px solid transparent',
          cursor: onToggle ? 'pointer' : undefined,
          userSelect: onToggle ? 'none' : undefined,
        }}
      >
        {/* Time */}
        <Stack gap={0} align="flex-end" style={{ minWidth: 70 }}>
          <Text
            fw={700}
            size="lg"
            c={isDue ? 'green.5' : undefined}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {minutes}
          </Text>
          <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(departure.expectedDeparture)}
          </Text>
        </Stack>

        {/* Destination and Line */}
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text
              fw={500}
              size="lg"
              truncate
              title={departure.destinationName || 'Unknown'}
            >
              {departure.destinationName || 'Unknown'}
            </Text>
            {departure.status === 'Delayed' && (
              <Badge size="xs" color="yellow" variant="outline">
                Delayed
              </Badge>
            )}
          </Group>
          <Group gap="xs" wrap="nowrap">
            <LineIndicator
              lineId={departure.lineId}
              lineName={departure.lineName}
              modeName={departure.modeName}
            />
            {viaStop && (
              <Text size="xs" c="dimmed" truncate title={`via ${viaStop}`}>
                via {viaStop}
              </Text>
            )}
          </Group>
        </Stack>

        {/* Platform */}
        {showPlatform && departure.platformName && (
          <Box ta="right" style={{ minWidth: 60 }}>
            <Text size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.05em' }}>
              Platform
            </Text>
            <Text size="sm" fw={500}>
              {departure.platformName}
            </Text>
          </Box>
        )}
      </Group>

      {/* Route Details */}
      <Collapse in={!!expanded}>
        <Box className="route-details" py="sm" pr="md" style={{ paddingLeft: 89 + 16 }}>
          {hasCallingPoints ? (
            <Stack gap={0} className="calling-points-list">
              {routeItems.map((item, idx) => {
                if (item.type === 'stop') {
                  const timing = getCallingPointTime(item.point)
                  const isEndpoint = item.isFirst || item.isLast
                  const dotClass = `calling-point-dot${item.isMatch ? ' matched' : isEndpoint ? ' final' : ''}`
                  const MAX_DURATION = 20 * 3600 // 20 hours — beyond this it's a wraparound artifact
                  const durationSecs = item.isFirst
                    ? departure.timeToStation
                    : timing ? timeToSeconds(timing.time) : null
                  const duration = durationSecs !== null && durationSecs > 0 && durationSecs < MAX_DURATION ? formatMinutes(durationSecs) : null
                  return (
                    <Group key={`${item.point.name}-${idx}`} gap="xs" wrap="nowrap" className="calling-point">
                      <Box className={dotClass} />
                      <Text size="xs" c={item.isMatch || isEndpoint ? undefined : 'dimmed'} fw={item.isMatch || isEndpoint ? 500 : undefined}>
                        {item.point.name}
                      </Text>
                      {timing && (
                        <Text size="xs" c={timing.delayed ? 'yellow' : 'dimmed'} className="calling-point-time">
                          {timing.time}{timing.delayed ? ' *' : ''}
                        </Text>
                      )}
                      <Text size="xs" c="dimmed" className="calling-point-duration">
                        {duration || ''}
                      </Text>
                    </Group>
                  )
                }

                // Collapsed group
                const isGroupExpanded = expandedGroups.has(item.index)
                return (
                  <Box key={`collapsed-${item.index}`} className={isGroupExpanded ? 'calling-point-group expanded' : 'calling-point-group'}>
                    <Group
                      gap="xs"
                      wrap="nowrap"
                      className="calling-point calling-point-collapsed"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        toggleGroup(item.index)
                      }}
                    >
                      <Text size="xs" c="dimmed">
                        ⋮ {item.count} stops {isGroupExpanded ? '▴' : '▾'}
                      </Text>
                    </Group>
                    {isGroupExpanded && item.points.map((point, pi) => {
                      const timing = getCallingPointTime(point)
                      const MAX_DURATION = 20 * 3600
                      const durationSecs = timing ? timeToSeconds(timing.time) : null
                      const duration = durationSecs !== null && durationSecs > 0 && durationSecs < MAX_DURATION ? formatMinutes(durationSecs) : null
                      return (
                        <Group key={`${point.name}-${item.index}-${pi}`} gap="xs" wrap="nowrap" className="calling-point">
                          <Box className="calling-point-dot" />
                          <Text size="xs" c="dimmed">
                            {point.name}
                          </Text>
                          {timing && (
                            <Text size="xs" c={timing.delayed ? 'yellow' : 'dimmed'} className="calling-point-time">
                              {timing.time}{timing.delayed ? ' *' : ''}
                            </Text>
                          )}
                          <Text size="xs" c="dimmed" className="calling-point-duration">
                            {duration || ''}
                          </Text>
                        </Group>
                      )
                    })}
                  </Box>
                )
              })}
            </Stack>
          ) : (
            <Text size="xs" c="dimmed" fs="italic">
              No route information available
            </Text>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}
