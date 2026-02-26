import { useState } from 'react'
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
  index?: number
}

export function StationCard({ station, departures, error, loading, showPlatform, maxDepartures, index = 0 }: StationCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const hasDepartures = departures && departures.length > 0
  const isInitialLoad = loading && departures === undefined
  const filterSummary = getFilterSummary(station)

  return (
    <Card
      padding={0}
      radius="lg"
      style={{
        animationDelay: `${index * 0.08}s`,
        background: 'light-dark(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.05))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: 'light-dark(1px solid rgba(0, 0, 0, 0.12), 1px solid rgba(255, 255, 255, 0.08))',
        boxShadow: 'light-dark(0 2px 12px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.2))',
      }}
    >
      {/* Header */}
      <Card.Section
        p="sm"
        style={{
          backgroundColor: 'light-dark(rgba(0, 0, 0, 0.04), rgba(255, 255, 255, 0.03))',
          borderBottom: 'light-dark(1px solid rgba(0, 0, 0, 0.1), 1px solid rgba(255, 255, 255, 0.06))',
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
                destinations={station.destinations}
                stationName={station.name}
                expanded={expandedId === (departure.id || `${departure.destinationName}-${index}`)}
                onToggle={() => {
                  const id = departure.id || `${departure.destinationName}-${index}`
                  setExpandedId((prev) => (prev === id ? null : id))
                }}
              />
            ))}
      </Stack>
    </Card>
  )
}
