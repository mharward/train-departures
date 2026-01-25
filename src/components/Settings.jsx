import { useState, useEffect, useCallback } from 'react'
import { searchStations } from '../utils/api'

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

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      minMinutes: parseInt(minMinutes, 10) || 0,
      destinationFilter: destinationFilter.trim(),
    })
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
