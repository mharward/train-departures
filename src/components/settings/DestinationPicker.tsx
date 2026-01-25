/**
 * Destination picker for filtering trains by destination
 */

import { useState, useEffect } from 'react'
import { Stack, TextInput, Group, Badge, Button, Text, Loader, CloseButton } from '@mantine/core'
import { searchStations } from '../../utils/api'
import { TransportIcon } from '../TransportIcon'
import type { Destination, StationSearchResult, Station } from '../../types'

interface DestinationPickerProps {
  stationType: Station['type']
  destinations: Destination[]
  onChange: (destinations: Destination[]) => void
}

export function DestinationPicker({ stationType, destinations, onChange }: DestinationPickerProps) {
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
        console.error('Destination search error:', error)
        setResults([])
      }
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const addDestination = (result: StationSearchResult) => {
    if (destinations.some((d) => d.id === result.id)) {
      return
    }
    onChange([
      ...destinations,
      {
        id: result.id,
        name: result.name,
        crs: result.crs || null,
      },
    ])
    setQuery('')
    setResults([])
  }

  const removeDestination = (destId: string) => {
    onChange(destinations.filter((d) => d.id !== destId))
  }

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Filter by destination (optional)
      </Text>

      {/* Selected destinations */}
      {destinations.length > 0 ? (
        <Group gap="xs">
          {destinations.map((dest) => (
            <Badge
              key={dest.id}
              variant="light"
              rightSection={
                <CloseButton
                  size="xs"
                  onClick={() => removeDestination(dest.id)}
                  aria-label={`Remove ${dest.name}`}
                />
              }
              styles={{ root: { paddingRight: 4 } }}
            >
              {dest.name}
            </Badge>
          ))}
        </Group>
      ) : (
        <Text size="sm" c="dimmed">
          Any destination
        </Text>
      )}

      {/* Destination search */}
      <TextInput
        placeholder="Search for a destination..."
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        size="sm"
        rightSection={searching ? <Loader size="xs" /> : null}
      />

      {/* Search results */}
      {results.length > 0 && (
        <Stack
          gap={0}
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-sm)',
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {results.map((result) => (
            <Group
              key={result.id}
              gap="sm"
              p="xs"
              wrap="nowrap"
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
              <TransportIcon type={result.type} size={18} />
              <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" truncate title={result.name}>
                  {result.name}
                </Text>
                {result.crs && (
                  <Text size="xs" c="dimmed">
                    {result.crs}
                  </Text>
                )}
              </Stack>
              <Button
                size="xs"
                variant="light"
                onClick={() => addDestination(result)}
                disabled={destinations.some((d) => d.id === result.id)}
              >
                {destinations.some((d) => d.id === result.id) ? 'Added' : 'Add'}
              </Button>
            </Group>
          ))}
        </Stack>
      )}

      <Text size="xs" c="dimmed">
        {stationType === 'national-rail'
          ? 'Matches final destination or any stop along the route'
          : 'Matches final destination only'}
      </Text>
    </Stack>
  )
}
