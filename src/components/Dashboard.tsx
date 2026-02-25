import { useState, useEffect } from 'react'
import { AppShell, Group, Title, Text, Button, ActionIcon, SimpleGrid, Stack, Center, useComputedColorScheme } from '@mantine/core'
import { StationCard } from './StationCard'
import { NetworkBanner } from './NetworkBanner'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
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
  maxDepartures: number
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
  maxDepartures,
  onRefresh,
  onOpenSettings,
}: DashboardProps) {
  const colorScheme = useComputedColorScheme()
  const dark = colorScheme === 'dark'
  const online = useOnlineStatus()
  const hasErrors = Object.values(errors).some((e) => e !== null)
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
          background: dark
            ? 'linear-gradient(165deg, #0f0f1a 0%, #1a1025 35%, #0f1a1a 100%)'
            : 'linear-gradient(165deg, #e0e8f5 0%, #e8e0f5 35%, #e0f5e8 100%)',
          minHeight: '100vh',
        },
        header: {
          backgroundColor: 'light-dark(rgba(255, 255, 255, 0.7), rgba(26, 27, 30, 0.7))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: 'light-dark(1px solid rgba(0, 0, 0, 0.08), none)',
        },
      }}
    >
      <AppShell.Header p="sm">
        <Group justify="space-between" h="100%" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <img src="/logo.svg" alt="" width={28} height={28} />
            <Title order={3}>Next Train</Title>
          </Group>

          <Group gap="sm" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ overflow: 'hidden' }}>
              <Text size="lg" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(lastUpdated)}
              </Text>
              <Text
                size="xs"
                c="dimmed"
                className={loading ? 'updating-pulse' : undefined}
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
        <NetworkBanner online={online} hasErrors={hasErrors} loading={loading} onRetry={onRefresh} />
        {stations.length === 0 ? (
          <Center h="50vh">
            <Stack align="center" gap="md">
              <Text c="dimmed">No stations configured.</Text>
              <Button onClick={onOpenSettings}>Add a Station</Button>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {stations.map((station, index) => (
              <StationCard
                key={station.id}
                station={station}
                index={index}
                departures={departures[station.id]}
                error={errors[station.id]}
                loading={loading}
                showPlatform={showPlatform}
                maxDepartures={maxDepartures}
              />
            ))}
          </SimpleGrid>
        )}
      </AppShell.Main>
    </AppShell>
  )
}
