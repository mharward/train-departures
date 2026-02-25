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
  ActionIcon,
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
  onReorderStations: (fromIndex: number, toIndex: number) => void
  onUpdateSettings: (updates: Partial<AppConfig>) => void
  onClose: () => void
}

export function Settings({
  config,
  onAddStation,
  onUpdateStation,
  onRemoveStation,
  onReorderStations,
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
      title={<Text fw={700} size="lg">Settings</Text>}
      size="lg"
      styles={{
        body: { padding: 'var(--mantine-spacing-md)' },
        header: {
          backgroundColor: 'light-dark(rgba(255, 255, 255, 0.85), rgba(30, 30, 40, 0.8))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: 'light-dark(1px solid rgba(0, 0, 0, 0.08), 1px solid rgba(255, 255, 255, 0.06))',
        },
        content: {
          background: 'light-dark(rgba(245, 245, 250, 0.95), rgba(22, 22, 32, 0.95))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: 'light-dark(1px solid rgba(0, 0, 0, 0.1), 1px solid rgba(255, 255, 255, 0.08))',
        },
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
              {config.stations.map((station, index) => (
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
                        backgroundColor: 'light-dark(rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.04))',
                        borderRadius: 'var(--mantine-radius-md)',
                        border: 'light-dark(1px solid rgba(0, 0, 0, 0.08), 1px solid rgba(255, 255, 255, 0.06))',
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
                        {config.stations.length > 1 && !editingStation && (
                          <>
                            <ActionIcon
                              variant="default"
                              size="sm"
                              aria-label={`Move ${station.name} up`}
                              disabled={index === 0}
                              onClick={() => onReorderStations(index, index - 1)}
                            >
                              ▲
                            </ActionIcon>
                            <ActionIcon
                              variant="default"
                              size="sm"
                              aria-label={`Move ${station.name} down`}
                              disabled={index === config.stations.length - 1}
                              onClick={() => onReorderStations(index, index + 1)}
                            >
                              ▼
                            </ActionIcon>
                          </>
                        )}
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

          <NumberInput
            label="Max departures per station"
            min={1}
            max={12}
            value={config.maxDepartures}
            onChange={(value) =>
              onUpdateSettings({
                maxDepartures: typeof value === 'number' ? value : 8,
              })
            }
            size="sm"
            style={{ maxWidth: 200 }}
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
