/**
 * Settings panel - manages stations and app configuration
 */

import { useState, useCallback } from 'react'
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
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="settings-content">
          <StationSearchBox onAddStation={onAddStation} isStationAdded={isStationAdded} />

          {/* Configured Stations */}
          <section className="settings-section">
            <h3>Your Stations</h3>
            {config.stations.length === 0 ? (
              <p className="no-stations">No stations configured. Search above to add one.</p>
            ) : (
              <ul className="station-list">
                {config.stations.map((station) => (
                  <li key={station.id} className="station-item">
                    {editingStation === station.id ? (
                      <StationEditForm
                        station={station}
                        onSave={(updates) => handleSaveEdit(station.id, updates)}
                        onCancel={() => setEditingStation(null)}
                      />
                    ) : (
                      <div className="station-display">
                        <TransportIcon type={station.type} size={24} />
                        <div className="station-info">
                          <span className="station-name" title={station.name}>
                            {station.name}
                          </span>
                          {getFilterSummary(station, { includeSchedule: true }) && (
                            <span
                              className="station-filter-summary"
                              title={getFilterSummary(station, { includeSchedule: true }) || undefined}
                            >
                              {getFilterSummary(station, { includeSchedule: true })}
                            </span>
                          )}
                        </div>
                        <div className="station-actions">
                          <button
                            className="edit-button"
                            onClick={() => setEditingStation(station.id)}
                          >
                            Edit
                          </button>
                          <button
                            className="remove-button"
                            onClick={() => onRemoveStation(station.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* General Settings */}
          <section className="settings-section">
            <h3>Display Settings</h3>

            <div className="setting-row">
              <label htmlFor="autoRefresh">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={config.autoRefresh}
                  onChange={(e) => onUpdateSettings({ autoRefresh: e.target.checked })}
                />
                Auto-refresh departures
              </label>
            </div>

            {config.autoRefresh && (
              <div className="setting-row">
                <label htmlFor="refreshInterval">Refresh interval (seconds)</label>
                <input
                  type="number"
                  id="refreshInterval"
                  min="10"
                  max="120"
                  value={config.refreshInterval}
                  onChange={(e) =>
                    onUpdateSettings({
                      refreshInterval: parseInt(e.target.value, 10) || 30,
                    })
                  }
                />
              </div>
            )}

            <div className="setting-row">
              <label htmlFor="showPlatform">
                <input
                  type="checkbox"
                  id="showPlatform"
                  checked={config.showPlatform}
                  onChange={(e) => onUpdateSettings({ showPlatform: e.target.checked })}
                />
                Show platform numbers
              </label>
            </div>

            <div className="setting-row">
              <label htmlFor="theme">Theme</label>
              <select
                id="theme"
                value={config.theme}
                onChange={(e) => onUpdateSettings({ theme: e.target.value as AppConfig['theme'] })}
              >
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
