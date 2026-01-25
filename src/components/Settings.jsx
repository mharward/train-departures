import { useState, useEffect, useCallback } from 'react'
import { searchStations } from '../utils/api'
import { getDefaultSchedule } from '../utils/schedule'

// Format modes for display - only show modes we can provide data for
function formatModes(station) {
  if (station.type === 'national-rail') {
    return 'National Rail'
  }

  // For TfL stations, filter to only TfL-operated modes
  const tflModes = ['tube', 'dlr', 'overground', 'elizabeth-line']
  const displayModes = (station.modes || [])
    .filter((mode) => tflModes.includes(mode))
    .map((mode) => {
      const names = {
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
function formatDays(days) {
  if (!days || days.length === 0) return ''
  if (days.length === 7) return 'every day'

  const weekdays = [1, 2, 3, 4, 5]
  const weekend = [0, 6]

  const isWeekdays = weekdays.every(d => days.includes(d)) && !days.includes(0) && !days.includes(6)
  const isWeekend = weekend.every(d => days.includes(d)) && days.length === 2

  if (isWeekdays) return 'Mon-Fri'
  if (isWeekend) return 'Sat-Sun'

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days.sort((a, b) => a - b).map(d => dayNames[d]).join(', ')
}

// Generate filter summary for display
function getFilterSummary(station) {
  const parts = []

  if (station.destinationFilter && station.destinationFilter.trim()) {
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

export function Settings({
  config,
  onAddStation,
  onUpdateStation,
  onRemoveStation,
  onUpdateSettings,
  onClose,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [editingStation, setEditingStation] = useState(null)

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
    (station) => {
      onAddStation({
        id: station.id,
        name: station.name,
        type: station.type || 'tfl',
        crs: station.crs || null,
        minMinutes: 0,
        maxMinutes: 60,
        destinationFilter: '',
      })
      setSearchQuery('')
      setSearchResults([])
    },
    [onAddStation]
  )

  const handleSaveEdit = useCallback(
    (stationId, updates) => {
      onUpdateStation(stationId, updates)
      setEditingStation(null)
    },
    [onUpdateStation]
  )

  const isStationAdded = (stationId) => {
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
                    <div className="station-result-info">
                      <span className="station-result-name">{station.name}</span>
                      <span className="station-result-modes">
                        {formatModes(station)}
                      </span>
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
                        <div className="station-info">
                          <span className="station-name">{station.name}</span>
                          {getFilterSummary(station) && (
                            <span className="station-filter-summary">
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
                  onChange={(e) =>
                    onUpdateSettings({ autoRefresh: e.target.checked })
                  }
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
                  onChange={(e) =>
                    onUpdateSettings({ showPlatform: e.target.checked })
                  }
                />
                Show platform numbers
              </label>
            </div>

            <div className="setting-row">
              <label htmlFor="theme">Theme</label>
              <select
                id="theme"
                value={config.theme}
                onChange={(e) => onUpdateSettings({ theme: e.target.value })}
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

function StationEditForm({ station, onSave, onCancel }) {
  const [minMinutes, setMinMinutes] = useState(station.minMinutes || 0)
  const [destinationFilter, setDestinationFilter] = useState(
    station.destinationFilter || ''
  )
  const [scheduleEnabled, setScheduleEnabled] = useState(
    station.schedule?.enabled || false
  )
  const [startTime, setStartTime] = useState(
    station.schedule?.startTime || '04:00'
  )
  const [endTime, setEndTime] = useState(
    station.schedule?.endTime || '12:00'
  )
  const [days, setDays] = useState(
    station.schedule?.days || [1, 2, 3, 4, 5]
  )

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const toggleDay = (dayIndex) => {
    if (days.includes(dayIndex)) {
      setDays(days.filter(d => d !== dayIndex))
    } else {
      setDays([...days, dayIndex].sort((a, b) => a - b))
    }
  }

  const handleEnableSchedule = (enabled) => {
    setScheduleEnabled(enabled)
    if (enabled && !station.schedule) {
      // Apply defaults when first enabling
      const defaults = getDefaultSchedule()
      setStartTime(defaults.startTime)
      setEndTime(defaults.endTime)
      setDays(defaults.days)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const updates = {
      minMinutes: parseInt(minMinutes, 10) || 0,
      destinationFilter: destinationFilter.trim(),
    }

    if (scheduleEnabled) {
      updates.schedule = {
        enabled: true,
        startTime,
        endTime,
        days,
      }
    } else {
      updates.schedule = null
    }

    onSave(updates)
  }

  return (
    <form className="station-edit-form" onSubmit={handleSubmit}>
      <div className="edit-field">
        <label htmlFor={`dest-${station.id}`}>
          Destination filter
        </label>
        <input
          type="text"
          id={`dest-${station.id}`}
          placeholder="e.g., London Bridge"
          value={destinationFilter}
          onChange={(e) => setDestinationFilter(e.target.value)}
        />
        <span className="field-hint">
          {station.type === 'national-rail'
            ? 'Matches final destination or any stop along the route'
            : 'Matches final destination only (Tube lines only match terminus)'}
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
          onChange={(e) => setMinMinutes(e.target.value)}
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
