import { Group, Stack, Text, Badge, Box, Collapse } from '@mantine/core'
import { LineIndicator } from './LineIndicator'
import { formatMinutes } from '../utils/api'
import type { FilteredArrival, Destination } from '../types'

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      const pointLower = point.toLowerCase()
      if (pointLower.includes(destName) || (destCrs && pointLower.includes(destCrs))) {
        return point
      }
    }
  }

  return null
}

interface DepartureRowProps {
  departure: FilteredArrival
  showPlatform: boolean
  destinations?: Destination[]
  expanded?: boolean
  onToggle?: () => void
}

export function DepartureRow({ departure, showPlatform, destinations, expanded, onToggle }: DepartureRowProps) {
  const minutes = formatMinutes(departure.timeToStation)
  const isDue = minutes === 'Due'
  const viaStop = destinations?.length ? findViaMatch(departure, destinations) : null
  const hasCallingPoints = departure.callingPoints && departure.callingPoints.length > 0

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
              {departure.callingPoints!.map((point, i) => {
                const isLast = i === departure.callingPoints!.length - 1
                const isMatch = destinations?.some((dest) => {
                  const destName = dest.name.toLowerCase()
                  const destCrs = dest.crs?.toLowerCase()
                  const pointLower = point.toLowerCase()
                  return pointLower.includes(destName) || (destCrs && pointLower.includes(destCrs))
                })
                const dotClass = `calling-point-dot${isMatch ? ' matched' : isLast ? ' final' : ''}`
                return (
                  <Group key={`${point}-${i}`} gap="xs" wrap="nowrap" className="calling-point">
                    <Box className={dotClass} />
                    <Text size="xs" c={isMatch || isLast ? undefined : 'dimmed'} fw={isMatch || isLast ? 500 : undefined}>
                      {point}
                    </Text>
                  </Group>
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
