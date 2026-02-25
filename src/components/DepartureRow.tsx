import { Group, Stack, Text, Badge, Box } from '@mantine/core'
import { LineIndicator } from './LineIndicator'
import { formatMinutes } from '../utils/api'
import type { FilteredArrival } from '../types'

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface DepartureRowProps {
  departure: FilteredArrival
  showPlatform: boolean
}

export function DepartureRow({ departure, showPlatform }: DepartureRowProps) {
  const minutes = formatMinutes(departure.timeToStation)
  const isDue = minutes === 'Due'

  return (
    <Group
      gap="md"
      py="xs"
      px="md"
      wrap="nowrap"
      className="departure-row"
      style={{
        borderBottom: 'light-dark(1px solid rgba(0, 0, 0, 0.1), 1px solid rgba(255, 255, 255, 0.06))',
        backgroundColor: isDue ? 'rgba(34, 197, 94, 0.08)' : undefined,
        borderLeft: isDue ? '3px solid rgba(34, 197, 94, 0.6)' : '3px solid transparent',
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
        <LineIndicator
          lineId={departure.lineId}
          lineName={departure.lineName}
          modeName={departure.modeName}
        />
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
  )
}
