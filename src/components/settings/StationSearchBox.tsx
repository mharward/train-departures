/**
 * Station search box for adding new stations
 */

import { useState, useEffect, useCallback } from 'react'
import { Stack, TextInput, Group, Text, Button, Title, Loader } from '@mantine/core'
import { searchStations } from '../../utils/api'
import { formatModes } from '../../utils/stationDisplay'
import { TransportIcon } from '../TransportIcon'
import type { StationSearchResult } from '../../types'

interface StationSearchBoxProps {
  onAddStation: (station: StationSearchResult) => void
  isStationAdded: (stationId: string) => boolean
}

export function StationSearchBox({ onAddStation, isStationAdded }: StationSearchBoxProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StationSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const searchResults = await searchStations(query)
        setResults(searchResults)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      }
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleAddStation = useCallback(
    (station: StationSearchResult) => {
      onAddStation(station)
      setQuery('')
      setResults([])
    },
    [onAddStation]
  )

  return (
    <Stack gap="sm">
      <Title order={5}>Add Station</Title>
      <TextInput
        placeholder="Search for a station..."
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        rightSection={searching ? <Loader size="xs" /> : null}
      />

      {results.length > 0 && (
        <Stack
          gap={0}
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-sm)',
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {results.map((station) => (
            <Group
              key={station.id}
              gap="sm"
              p="sm"
              wrap="nowrap"
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
              <TransportIcon type={station.type} size={24} />
              <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                <Text fw={500} truncate title={station.name}>
                  {station.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {formatModes(station)}
                </Text>
              </Stack>
              <Button
                size="xs"
                onClick={() => handleAddStation(station)}
                disabled={isStationAdded(station.id)}
              >
                {isStationAdded(station.id) ? 'Added' : 'Add'}
              </Button>
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
