import { useState, useEffect } from 'react'
import { AppShell, Group, Title, Text, Button, ActionIcon, SimpleGrid, Stack, Center } from '@mantine/core'
import { StationCard } from './StationCard'
import type { Station, DeparturesMap, ErrorsMap } from '../types'

interface DashboardProps {
  stations: Station[]
  departures: DeparturesMap
  errors: ErrorsMap
  loading: boolean
  lastUpdated: Date | null
  countdown: number
  autoRefresh: boolean
  showPlatform: boolean
  onRefresh: () => void
  onOpenSettings: () => void
}

export function Dashboard({
  stations,
  departures,
  errors,
  loading,
  lastUpdated,
  countdown,
  autoRefresh,
  showPlatform,
  onRefresh,
  onOpenSettings,
}: DashboardProps) {
  const [elapsed, setElapsed] = useState(0)

  // Update elapsed time every second
  useEffect(() => {
    if (!lastUpdated) return

    const updateElapsed = () => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
      setElapsed(seconds)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  const formatElapsed = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  const formatTime = (date: Date | null): string => {
    if (!date) return ''
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
      styles={{
        main: {
          backgroundColor: 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-9))',
          minHeight: '100vh',
        },
        header: {
          backgroundColor: 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        },
      }}
    >
      <AppShell.Header p="sm">
        <Group justify="space-between" h="100%" wrap="nowrap">
          <Title order={3}>Train Departures</Title>

          <Group gap="sm" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ overflow: 'hidden' }}>
              <Text size="lg" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(lastUpdated)}
              </Text>
              <Text
                size="xs"
                c="dimmed"
                visibleFrom="xs"
                style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
              >
                {loading ? 'Updating...' : (
                  <>
                    {formatElapsed(elapsed)}
                    {autoRefresh && ` · next in ${countdown}s`}
                  </>
                )}
              </Text>
            </Group>

            {/* Mobile: icon buttons */}
            <ActionIcon
              variant="default"
              size="lg"
              onClick={onRefresh}
              disabled={loading}
              hiddenFrom="xs"
              aria-label="Refresh"
            >
              ↻
            </ActionIcon>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={onOpenSettings}
              hiddenFrom="xs"
              aria-label="Settings"
            >
              ⚙
            </ActionIcon>

            {/* Desktop: text buttons */}
            <Button
              variant="default"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              visibleFrom="xs"
            >
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onOpenSettings}
              visibleFrom="xs"
            >
              Settings
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {stations.length === 0 ? (
          <Center h="50vh">
            <Stack align="center" gap="md">
              <Text c="dimmed">No stations configured.</Text>
              <Button onClick={onOpenSettings}>Add a Station</Button>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {stations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                departures={departures[station.id]}
                error={errors[station.id]}
                showPlatform={showPlatform}
              />
            ))}
          </SimpleGrid>
        )}
      </AppShell.Main>
    </AppShell>
  )
}
