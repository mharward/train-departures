import { Alert, Button, Group, Text } from '@mantine/core'

interface NetworkBannerProps {
  online: boolean
  hasErrors: boolean
  loading: boolean
  onRetry: () => void
}

export function NetworkBanner({ online, hasErrors, loading, onRetry }: NetworkBannerProps) {
  if (!online) {
    return (
      <Alert
        color="red"
        mb="md"
        styles={{
          root: {
            backgroundColor: 'light-dark(rgba(255, 200, 200, 0.5), rgba(200, 50, 50, 0.15))',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: 'light-dark(1px solid rgba(200, 50, 50, 0.2), 1px solid rgba(200, 50, 50, 0.25))',
          },
        }}
      >
        You are offline. Departures may be outdated.
      </Alert>
    )
  }

  if (hasErrors) {
    return (
      <Alert
        color="orange"
        mb="md"
        styles={{
          root: {
            backgroundColor: 'light-dark(rgba(255, 230, 200, 0.5), rgba(200, 120, 30, 0.15))',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: 'light-dark(1px solid rgba(200, 120, 30, 0.2), 1px solid rgba(200, 120, 30, 0.25))',
          },
        }}
      >
        <Group gap="sm">
          <Text size="sm">Some stations could not be reached.</Text>
          <Button size="xs" variant="outline" color="orange" loading={loading} onClick={onRetry}>
            Retry
          </Button>
        </Group>
      </Alert>
    )
  }

  return null
}
