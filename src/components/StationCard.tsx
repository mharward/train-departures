import { Card, Group, Text, Stack, Center, Loader } from '@mantine/core'
import { DepartureRow } from './DepartureRow'
import { TransportIcon } from './TransportIcon'
import { getFilterSummary } from '../utils/stationDisplay'
import type { Station, FilteredArrival } from '../types'

interface StationCardProps {
  station: Station
  departures: FilteredArrival[] | undefined
  error: string | null | undefined
  loading: boolean
  showPlatform: boolean
  maxDepartures: number
}

export function StationCard({ station, departures, error, loading, showPlatform, maxDepartures }: StationCardProps) {
  const hasDepartures = departures && departures.length > 0
  const isInitialLoad = loading && departures === undefined
  const filterSummary = getFilterSummary(station)

  return (
    <Card padding={0} radius="md" withBorder>
      {/* Header */}
      <Card.Section
        p="sm"
        style={{
          backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Group gap="xs" wrap="nowrap">
          <TransportIcon type={station.type} size={24} />
          <Text fw={600} truncate title={station.name}>
            {station.name}
          </Text>
          {filterSummary && (
            <Text size="xs" c="dimmed" truncate title={filterSummary} style={{ flexShrink: 1 }}>
              {filterSummary}
            </Text>
          )}
        </Group>
      </Card.Section>

      {/* Departures List */}
      <Stack gap={0}>
        {error && !hasDepartures && (
          <Text c="red" ta="center" py="xl" px="md">
            Unable to load departures
          </Text>
        )}

        {!error && isInitialLoad && (
          <Center py="xl" px="md">
            <Loader size="sm" />
          </Center>
        )}

        {!error && !isInitialLoad && !hasDepartures && (
          <Text c="dimmed" ta="center" py="xl" px="md">
            No upcoming departures
          </Text>
        )}

        {hasDepartures &&
          departures
            .slice(0, maxDepartures)
            .map((departure, index) => (
              <DepartureRow
                key={departure.id || `${departure.destinationName}-${index}`}
                departure={departure}
                showPlatform={showPlatform}
              />
            ))}
      </Stack>
    </Card>
  )
}
