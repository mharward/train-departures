/**
 * Edit form for configuring a station's filters and schedule
 */

import { useState, FormEvent } from 'react'
import { Stack, Group, Text, NumberInput, Button, Box } from '@mantine/core'
import { TransportIcon } from '../TransportIcon'
import { DestinationPicker } from './DestinationPicker'
import { SchedulePicker, buildSchedule } from './SchedulePicker'
import type { Station, Destination } from '../../types'

interface StationEditFormProps {
  station: Station
  onSave: (updates: Partial<Station>) => void
  onCancel: () => void
}

export function StationEditForm({ station, onSave, onCancel }: StationEditFormProps) {
  const [minMinutes, setMinMinutes] = useState<number | string>(station.minMinutes || 0)
  const [destinations, setDestinations] = useState<Destination[]>(station.destinations || [])

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(station.schedule?.enabled || false)
  const [startTime, setStartTime] = useState(station.schedule?.startTime || '04:00')
  const [endTime, setEndTime] = useState(station.schedule?.endTime || '12:00')
  const [days, setDays] = useState<number[]>(station.schedule?.days || [1, 2, 3, 4, 5])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const updates: Partial<Station> = {
      minMinutes: typeof minMinutes === 'number' ? minMinutes : 0,
      destinations,
      destinationFilter: '', // Clear legacy field when saving
      schedule: buildSchedule(scheduleEnabled, startTime, endTime, days),
    }
    onSave(updates)
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      p="md"
      style={{
        backgroundColor: 'var(--mantine-color-default)',
        borderRadius: 'var(--mantine-radius-sm)',
      }}
    >
      <Stack gap="md">
        <Group gap="xs" wrap="nowrap">
          <TransportIcon type={station.type} size={20} />
          <Text fw={600} truncate title={station.name}>
            {station.name}
          </Text>
        </Group>

        <DestinationPicker
          stationType={station.type}
          destinations={destinations}
          onChange={setDestinations}
        />

        <Stack gap={4}>
          <NumberInput
            label="Walk time (minutes)"
            min={0}
            max={60}
            value={minMinutes}
            onChange={setMinMinutes}
            size="sm"
            style={{ maxWidth: 150 }}
          />
          <Text size="xs" c="dimmed">
            Hide departures sooner than this
          </Text>
        </Stack>

        <SchedulePicker
          stationId={station.id}
          enabled={scheduleEnabled}
          startTime={startTime}
          endTime={endTime}
          days={days}
          onEnabledChange={setScheduleEnabled}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onDaysChange={setDays}
          hasExistingSchedule={!!station.schedule}
        />

        <Group gap="sm" justify="flex-end">
          <Button type="button" variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </Group>
      </Stack>
    </Box>
  )
}
