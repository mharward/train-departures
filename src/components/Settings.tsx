import { useState, useEffect, useCallback, FormEvent } from 'react'
import { searchStations } from '../utils/api'
import { getDefaultSchedule } from '../utils/schedule'
import { TransportIcon } from './TransportIcon'
import type { AppConfig, Station, Destination, StationSearchResult, Schedule } from '../types'

// Format modes for display - only show modes we can provide data for
function formatModes(station: StationSearchResult | Station): string {
  if (station.type === 'national-rail') {
    return 'National Rail'
  }

  // For TfL stations, filter to only TfL-operated modes
  const tflModes = ['tube', 'dlr', 'overground', 'elizabeth-line']
  const displayModes = (station.modes || [])
    .filter((mode) => tflModes.includes(mode))
    .map((mode) => {
      const names: Record<string, string> = {
        tube: 'Tube',
        dlr: 'DLR',
        overground: 'Overground',
        'elizabeth-line': 'Elizabeth Line',
      }
      return names[mode] || mode
    })

  return displayModes.join(', ') || 'TfL'
}

// Format days for display
function formatDays(days: number[]): string {
  if (!days || days.length === 0) return ''
  if (days.length === 7) return 'every day'

  const weekdays = [1, 2, 3, 4, 5]
  const weekend = [0, 6]

  const isWeekdays =
    weekdays.every((d) => days.includes(d)) && !days.includes(0) && !days.includes(6)
  const isWeekend = weekend.every((d) => days.includes(d)) && days.length === 2

  if (isWeekdays) return 'Mon-Fri'
  if (isWeekend) return 'Sat-Sun'

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days
    .sort((a, b) => a - b)
    .map((d) => dayNames[d])
    .join(', ')
}

// Generate filter summary for display
function getFilterSummary(station: Station): string | null {
  const parts: string[] = []

  // Show destinations from new array format
  if (station.destinations && station.destinations.length > 0) {
    const names = station.destinations.map((d) => d.name)
    if (names.length <= 2) {
      parts.push(`to ${names.join(', ')}`)
    } else {
      parts.push(`to ${names[0]} +${names.length - 1} more`)
    }
  }
  // Legacy: show old destination filter
  else if (station.destinationFilter && station.destinationFilter.trim()) {
    parts.push(`to ${station.destinationFilter}`)
  }

  const min = station.minMinutes || 0
  if (min > 0) {
    parts.push(`>${min} min`)
  }

  // Add schedule info
  if (station.schedule && station.schedule.enabled) {
    const { startTime, endTime, days } = station.schedule
    const daysStr = formatDays(days)
    parts.push(`${startTime}-${endTime} ${daysStr}`)
  }

  return parts.length > 0 ? parts.join(', ') : null
}

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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StationSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [editingStation, setEditingStation] = useState<string | null>(null)

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchStations(searchQuery)
        setSearchResults(results)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      }
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleAddStation = useCallback(
    (station: StationSearchResult) => {
      onAddStation(station)
      setSearchQuery('')
      setSearchResults([])
    },
    [onAddStation]
  )

  const handleSaveEdit = useCallback(
    (stationId: string, updates: Partial<Station>) => {
      onUpdateStation(stationId, updates)
      setEditingStation(null)
    },
    [onUpdateStation]
  )

  const isStationAdded = (stationId: string): boolean => {
    return config.stations.some((s) => s.id === stationId)
  }

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
          {/* Add Station Section */}
          <section className="settings-section">
            <h3>Add Station</h3>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search for a station..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searching && <span className="search-loading">Searching...</span>}
            </div>

            {searchResults.length > 0 && (
              <ul className="search-results">
                {searchResults.map((station) => (
                  <li key={station.id} className="search-result-item">
                    <TransportIcon type={station.type} size={24} />
                    <div className="station-result-info">
                      <span className="station-result-name" title={station.name}>
                        {station.name}
                      </span>
                      <span className="station-result-modes">{formatModes(station)}</span>
                    </div>
                    <button
                      className="add-station-button"
                      onClick={() => handleAddStation(station)}
                      disabled={isStationAdded(station.id)}
                    >
                      {isStationAdded(station.id) ? 'Added' : 'Add'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

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
                          {getFilterSummary(station) && (
                            <span
                              className="station-filter-summary"
                              title={getFilterSummary(station) || undefined}
                            >
                              {getFilterSummary(station)}
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

interface StationEditFormProps {
  station: Station
  onSave: (updates: Partial<Station>) => void
  onCancel: () => void
}

function StationEditForm({ station, onSave, onCancel }: StationEditFormProps) {
  const [minMinutes, setMinMinutes] = useState(station.minMinutes || 0)
  const [scheduleEnabled, setScheduleEnabled] = useState(station.schedule?.enabled || false)
  const [startTime, setStartTime] = useState(station.schedule?.startTime || '04:00')
  const [endTime, setEndTime] = useState(station.schedule?.endTime || '12:00')
  const [days, setDays] = useState<number[]>(station.schedule?.days || [1, 2, 3, 4, 5])

  // Destination picker state
  const [destinations, setDestinations] = useState<Destination[]>(station.destinations || [])
  const [destQuery, setDestQuery] = useState('')
  const [destResults, setDestResults] = useState<StationSearchResult[]>([])
  const [destSearching, setDestSearching] = useState(false)

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Debounced destination search
  useEffect(() => {
    if (!destQuery || destQuery.length < 2) {
      setDestResults([])
      return
    }

    const timer = setTimeout(async () => {
      setDestSearching(true)
      try {
        const results = await searchStations(destQuery)
        setDestResults(results)
      } catch (error) {
        console.error('Destination search error:', error)
        setDestResults([])
      }
      setDestSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [destQuery])

  const toggleDay = (dayIndex: number) => {
    if (days.includes(dayIndex)) {
      setDays(days.filter((d) => d !== dayIndex))
    } else {
      setDays([...days, dayIndex].sort((a, b) => a - b))
    }
  }

  const handleEnableSchedule = (enabled: boolean) => {
    setScheduleEnabled(enabled)
    if (enabled && !station.schedule) {
      // Apply defaults when first enabling
      const defaults = getDefaultSchedule()
      setStartTime(defaults.startTime)
      setEndTime(defaults.endTime)
      setDays(defaults.days)
    }
  }

  const addDestination = (result: StationSearchResult) => {
    // Check if already added
    if (destinations.some((d) => d.id === result.id)) {
      return
    }
    setDestinations([
      ...destinations,
      {
        id: result.id,
        name: result.name,
        crs: result.crs || null,
      },
    ])
    setDestQuery('')
    setDestResults([])
  }

  const removeDestination = (destId: string) => {
    setDestinations(destinations.filter((d) => d.id !== destId))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const updates: Partial<Station> = {
      minMinutes: minMinutes || 0,
      destinations,
      destinationFilter: '', // Clear legacy field when saving
    }

    if (scheduleEnabled) {
      updates.schedule = {
        enabled: true,
        startTime,
        endTime,
        days,
      } satisfies Schedule
    } else {
      updates.schedule = null
    }

    onSave(updates)
  }

  return (
    <form className="station-edit-form" onSubmit={handleSubmit}>
      <div className="edit-form-header">
        <TransportIcon type={station.type} size={20} />
        <span className="edit-form-station-name" title={station.name}>
          {station.name}
        </span>
      </div>

      <div className="edit-field destination-picker">
        <label>Filter by destination (optional)</label>

        {/* Selected destinations */}
        {destinations.length > 0 ? (
          <div className="destination-chips">
            {destinations.map((dest) => (
              <span key={dest.id} className="destination-chip">
                {dest.name}
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => removeDestination(dest.id)}
                  aria-label={`Remove ${dest.name}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="destination-empty">Any destination</div>
        )}

        {/* Destination search */}
        <div className="destination-search">
          <input
            type="text"
            placeholder="Search for a destination..."
            value={destQuery}
            onChange={(e) => setDestQuery(e.target.value)}
          />
          {destSearching && <span className="search-loading">Searching...</span>}
        </div>

        {/* Search results */}
        {destResults.length > 0 && (
          <ul className="destination-results">
            {destResults.map((result) => (
              <li key={result.id} className="destination-result-item">
                <TransportIcon type={result.type} size={18} />
                <div className="destination-result-info">
                  <span className="destination-result-name" title={result.name}>
                    {result.name}
                  </span>
                  {result.crs && <span className="destination-result-crs">{result.crs}</span>}
                </div>
                <button
                  type="button"
                  className="add-destination-button"
                  onClick={() => addDestination(result)}
                  disabled={destinations.some((d) => d.id === result.id)}
                >
                  {destinations.some((d) => d.id === result.id) ? 'Added' : 'Add'}
                </button>
              </li>
            ))}
          </ul>
        )}

        <span className="field-hint">
          {station.type === 'national-rail'
            ? 'Matches final destination or any stop along the route'
            : 'Matches final destination only'}
        </span>
      </div>

      <div className="edit-field">
        <label htmlFor={`min-${station.id}`}>Walk time (minutes)</label>
        <input
          type="number"
          id={`min-${station.id}`}
          min="0"
          max="60"
          value={minMinutes}
          onChange={(e) => setMinMinutes(parseInt(e.target.value, 10) || 0)}
        />
        <span className="field-hint">Hide departures sooner than this</span>
      </div>

      {/* Schedule Section */}
      <div className="schedule-section">
        <label className="schedule-enable">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) => handleEnableSchedule(e.target.checked)}
          />
          Only show during scheduled times
        </label>

        {scheduleEnabled && (
          <div className="schedule-options">
            <div className="schedule-times">
              <div className="time-field">
                <label htmlFor={`start-${station.id}`}>From</label>
                <input
                  type="time"
                  id={`start-${station.id}`}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="time-field">
                <label htmlFor={`end-${station.id}`}>To</label>
                <input
                  type="time"
                  id={`end-${station.id}`}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="day-picker">
              {dayLabels.map((label, index) => (
                <button
                  key={index}
                  type="button"
                  className={`day-button ${days.includes(index) ? 'active' : ''}`}
                  onClick={() => toggleDay(index)}
                >
                  {label}
                </button>
              ))}
            </div>

            {days.length === 0 && (
              <span className="schedule-warning">
                No days selected - station will never be visible
              </span>
            )}
          </div>
        )}
      </div>

      <div className="edit-actions">
        <button type="submit" className="save-button">
          Save
        </button>
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
