/**
 * Schedule picker for setting station visibility times
 */

import { Checkbox, Group, Text, Stack, Button, TextInput, Alert } from '@mantine/core'
import { getDefaultSchedule } from '../../utils/schedule'
import type { Schedule } from '../../types'

interface SchedulePickerProps {
  stationId: string
  enabled: boolean
  startTime: string
  endTime: string
  days: number[]
  onEnabledChange: (enabled: boolean) => void
  onStartTimeChange: (time: string) => void
  onEndTimeChange: (time: string) => void
  onDaysChange: (days: number[]) => void
  hasExistingSchedule: boolean
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function SchedulePicker({
  stationId,
  enabled,
  startTime,
  endTime,
  days,
  onEnabledChange,
  onStartTimeChange,
  onEndTimeChange,
  onDaysChange,
  hasExistingSchedule,
}: SchedulePickerProps) {
  const handleEnableSchedule = (newEnabled: boolean) => {
    onEnabledChange(newEnabled)
    if (newEnabled && !hasExistingSchedule) {
      // Apply defaults when first enabling
      const defaults = getDefaultSchedule()
      onStartTimeChange(defaults.startTime)
      onEndTimeChange(defaults.endTime)
      onDaysChange(defaults.days)
    }
  }

  const toggleDay = (dayIndex: number) => {
    if (days.includes(dayIndex)) {
      onDaysChange(days.filter((d) => d !== dayIndex))
    } else {
      onDaysChange([...days, dayIndex].sort((a, b) => a - b))
    }
  }

  return (
    <Stack gap="sm">
      <Checkbox
        label="Only show during scheduled times"
        checked={enabled}
        onChange={(e) => handleEnableSchedule(e.currentTarget.checked)}
      />

      {enabled && (
        <Stack gap="sm" pl="md">
          <Group gap="md">
            <TextInput
              type="time"
              label="From"
              id={`start-${stationId}`}
              value={startTime}
              onChange={(e) => onStartTimeChange(e.currentTarget.value)}
              size="sm"
              style={{ width: 120 }}
            />
            <TextInput
              type="time"
              label="To"
              id={`end-${stationId}`}
              value={endTime}
              onChange={(e) => onEndTimeChange(e.currentTarget.value)}
              size="sm"
              style={{ width: 120 }}
            />
          </Group>

          <Group gap="xs">
            {DAY_LABELS.map((label, index) => (
              <Button
                key={index}
                size="xs"
                variant={days.includes(index) ? 'filled' : 'default'}
                onClick={() => toggleDay(index)}
                style={{ minWidth: 42 }}
              >
                {label}
              </Button>
            ))}
          </Group>

          {days.length === 0 && (
            <Alert color="yellow" variant="light" p="xs">
              <Text size="sm">No days selected - station will never be visible</Text>
            </Alert>
          )}
        </Stack>
      )}
    </Stack>
  )
}

/**
 * Build a Schedule object from the picker state
 */
export function buildSchedule(
  enabled: boolean,
  startTime: string,
  endTime: string,
  days: number[]
): Schedule | null {
  if (!enabled) {
    return null
  }
  return {
    enabled: true,
    startTime,
    endTime,
    days,
  }
}
