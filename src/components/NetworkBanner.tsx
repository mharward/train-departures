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
      <Alert color="red" mb="md">
        You are offline. Departures may be outdated.
      </Alert>
    )
  }

  if (hasErrors) {
    return (
      <Alert color="orange" mb="md">
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
