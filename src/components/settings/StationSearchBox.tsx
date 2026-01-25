/**
 * Station search box for adding new stations
 */

import { useState, useEffect, useCallback } from 'react'
import { searchStations } from '../../utils/api'
import { formatModes } from '../../utils/stationDisplay'
import { TransportIcon } from '../TransportIcon'
import type { StationSearchResult } from '../../types'

interface StationSearchBoxProps {
  onAddStation: (station: StationSearchResult) => void
  isStationAdded: (stationId: string) => boolean
}

export function StationSearchBox({ onAddStation, isStationAdded }: StationSearchBoxProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StationSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const searchResults = await searchStations(query)
        setResults(searchResults)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      }
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleAddStation = useCallback(
    (station: StationSearchResult) => {
      onAddStation(station)
      setQuery('')
      setResults([])
    },
    [onAddStation]
  )

  return (
    <section className="settings-section">
      <h3>Add Station</h3>
      <div className="search-box">
        <input
          type="text"
          placeholder="Search for a station..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        {searching && <span className="search-loading">Searching...</span>}
      </div>

      {results.length > 0 && (
        <ul className="search-results">
          {results.map((station) => (
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
  )
}
