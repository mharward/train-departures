/**
 * Settings panel - manages stations and app configuration
 */

import { useState, useCallback } from 'react'
import {
  Modal,
  Stack,
  Group,
  Text,
  Title,
  Button,
  Checkbox,
  NumberInput,
  Select,
  Divider,
} from '@mantine/core'
import { getFilterSummary } from '../utils/stationDisplay'
import { TransportIcon } from './TransportIcon'
import { StationSearchBox, StationEditForm } from './settings/index'
import type { AppConfig, Station, StationSearchResult } from '../types'

interface SettingsProps {
  config: AppConfig
  onAddStation: (station: StationSearchResult) => void
  onUpdateStation: (stationId: string, updates: Partial<Station>) => void
  onRemoveStation: (stationId: string) => void
  onUpdateSettings: (updates: Partial<AppConfig>) => void
  onClose: () => void
}

export function Settings({
  config,
  onAddStation,
  onUpdateStation,
  onRemoveStation,
  onUpdateSettings,
  onClose,
}: SettingsProps) {
  const [editingStation, setEditingStation] = useState<string | null>(null)

  const handleSaveEdit = useCallback(
    (stationId: string, updates: Partial<Station>) => {
      onUpdateStation(stationId, updates)
      setEditingStation(null)
    },
    [onUpdateStation]
  )

  const isStationAdded = useCallback(
    (stationId: string): boolean => {
      return config.stations.some((s) => s.id === stationId)
    },
    [config.stations]
  )

  return (
    <Modal
      opened={true}
      onClose={onClose}
      title={<Title order={3}>Settings</Title>}
      size="lg"
      styles={{
        body: { padding: 'var(--mantine-spacing-md)' },
        header: { backgroundColor: 'var(--mantine-color-default)' },
        content: { backgroundColor: 'var(--mantine-color-body)' },
      }}
    >
      <Stack gap="lg">
        <StationSearchBox onAddStation={onAddStation} isStationAdded={isStationAdded} />

        <Divider />

        {/* Configured Stations */}
        <Stack gap="sm">
          <Title order={5}>Your Stations</Title>
          {config.stations.length === 0 ? (
            <Text c="dimmed">No stations configured. Search above to add one.</Text>
          ) : (
            <Stack gap="sm">
              {config.stations.map((station) => (
                <div key={station.id}>
                  {editingStation === station.id ? (
                    <StationEditForm
                      station={station}
                      onSave={(updates) => handleSaveEdit(station.id, updates)}
                      onCancel={() => setEditingStation(null)}
                    />
                  ) : (
                    <Group
                      gap="sm"
                      wrap="nowrap"
                      p="sm"
                      style={{
                        backgroundColor: 'var(--mantine-color-default)',
                        borderRadius: 'var(--mantine-radius-sm)',
                      }}
                    >
                      <TransportIcon type={station.type} size={24} />
                      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={500} truncate title={station.name}>
                          {station.name}
                        </Text>
                        {getFilterSummary(station, { includeSchedule: true }) && (
                          <Text
                            size="xs"
                            c="dimmed"
                            truncate
                            title={getFilterSummary(station, { includeSchedule: true }) || undefined}
                          >
                            {getFilterSummary(station, { includeSchedule: true })}
                          </Text>
                        )}
                      </Stack>
                      <Group gap="xs">
                        <Button
                          variant="default"
                          size="xs"
                          onClick={() => setEditingStation(station.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="default"
                          size="xs"
                          color="red"
                          onClick={() => onRemoveStation(station.id)}
                        >
                          Remove
                        </Button>
                      </Group>
                    </Group>
                  )}
                </div>
              ))}
            </Stack>
          )}
        </Stack>

        <Divider />

        {/* General Settings */}
        <Stack gap="sm">
          <Title order={5}>Display Settings</Title>

          <Checkbox
            label="Auto-refresh departures"
            checked={config.autoRefresh}
            onChange={(e) => onUpdateSettings({ autoRefresh: e.currentTarget.checked })}
          />

          {config.autoRefresh && (
            <NumberInput
              label="Refresh interval (seconds)"
              min={10}
              max={120}
              value={config.refreshInterval}
              onChange={(value) =>
                onUpdateSettings({
                  refreshInterval: typeof value === 'number' ? value : 30,
                })
              }
              size="sm"
              style={{ maxWidth: 200 }}
            />
          )}

          <Checkbox
            label="Show platform numbers"
            checked={config.showPlatform}
            onChange={(e) => onUpdateSettings({ showPlatform: e.currentTarget.checked })}
          />

          <Select
            label="Theme"
            value={config.theme}
            onChange={(value) =>
              onUpdateSettings({ theme: (value as AppConfig['theme']) || 'system' })
            }
            data={[
              { value: 'system', label: 'System' },
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
            size="sm"
            style={{ maxWidth: 200 }}
          />
        </Stack>
      </Stack>
    </Modal>
  )
}
